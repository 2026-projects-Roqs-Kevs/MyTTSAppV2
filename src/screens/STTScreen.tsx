import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
  Vibration,
  Clipboard,
  PanResponder,
  TextInput,
  Image,
} from 'react-native';
import sttService from '../services/sttService';
import Icon from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {useNavigation} from '@react-navigation/native';
import {useSettings} from '../context/SettingsContext';
import KeepAwake from 'react-native-keep-awake';
import speakerDetectionService from '../services/speakerDetectionService';
import {NativeModules} from 'react-native';
import taglishCorrectionService from '../services/taglishCorrectionService';
import WaveformView from '../components/WaveformView';
import useAmplitude from '../hooks/useAmplitude';
const {Vosk} = NativeModules;

// ─── Metric Types ────────────────────────────────────────────────────────────

interface SessionMetrics {
  estimatedAccuracy: number;
  rtf: number;
  processingLatencyMs: number;
  wordReliabilityScore: number;
  wpm: number;
  signalQuality: number;
  throughputWps: number;
  vocalClarityIndex: number;
  totalWords: number;
  sessionDurationSec: number;
  totalResults: number;
  totalPartials: number;
  resolvedPartials: number;
}

// ─── Metric Helpers ──────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function estimateAccuracy(text: string): number {
  const words = text.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  const shortRatio = words.filter(w => w.length <= 2).length / words.length;
  const base = 80;
  const lenBonus = Math.min((avgLen - 3) * 3, 15);
  const shortPenalty = shortRatio * 25;
  return Math.min(98, Math.max(55, base + lenBonus - shortPenalty));
}

function wordReliabilityScore(text: string): number {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  const reliable = words.filter(w => w.length >= 3).length;
  return (reliable / words.length) * 100;
}

function computeMetrics(data: {
  transcribedText: string;
  sessionStartMs: number;
  sessionEndMs: number;
  firstResultMs: number | null;
  totalPartials: number;
  resolvedPartials: number;
  totalResults: number;
}): SessionMetrics {
  const {
    transcribedText,
    sessionStartMs,
    sessionEndMs,
    firstResultMs,
    totalPartials,
    resolvedPartials,
    totalResults,
  } = data;

  const sessionDurationSec = Math.max((sessionEndMs - sessionStartMs) / 1000, 0.001);
  const totalWords = countWords(transcribedText);
  const estimatedAccuracy = estimateAccuracy(transcribedText);
  const resultsPerSec = totalResults / sessionDurationSec;
  const rtf = resultsPerSec > 0 ? Math.min(1 / resultsPerSec, 5) : 1.0;
  const processingLatencyMs = firstResultMs !== null ? firstResultMs - sessionStartMs : 0;
  const reliability = wordReliabilityScore(transcribedText);
  const wpm = totalWords / (sessionDurationSec / 60);
  const vocalClarityIndex = totalPartials > 0 ? (resolvedPartials / totalPartials) * 100 : 100;
  const wpmScore = wpm > 0 ? Math.min(100, Math.max(0, 100 - Math.abs(wpm - 130) * 0.5)) : 50;
  const signalQuality = vocalClarityIndex * 0.7 + wpmScore * 0.3;
  const throughputWps = totalWords / sessionDurationSec;

  return {
    estimatedAccuracy,
    rtf,
    processingLatencyMs,
    wordReliabilityScore: reliability,
    wpm,
    signalQuality,
    throughputWps,
    vocalClarityIndex,
    totalWords,
    sessionDurationSec,
    totalResults,
    totalPartials,
    resolvedPartials,
  };
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function scoreColor(value: number): string {
  if (value >= 75) return '#34C759';
  if (value >= 45) return '#FF9500';
  return '#FF3B30';
}

function rtfColor(rtf: number): string {
  if (rtf <= 0.5) return '#34C759';
  if (rtf <= 1.5) return '#FF9500';
  return '#FF3B30';
}

function latencyColor(ms: number): string {
  if (ms <= 600) return '#34C759';
  if (ms <= 1500) return '#FF9500';
  return '#FF3B30';
}

function wpmLabel(wpm: number): string {
  if (wpm < 20) return 'Very Slow';
  if (wpm < 80) return 'Slow';
  if (wpm < 160) return 'Normal';
  if (wpm < 220) return 'Fast';
  return 'Very Fast';
}

// ─── MetricTile ──────────────────────────────────────────────────────────────

interface MetricTileProps {
  isDark: boolean;
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
  progress: number;
  progressInverted?: boolean;
}

const MetricTile: React.FC<MetricTileProps> = ({
  isDark,
  icon,
  label,
  value,
  sub,
  color,
  progress,
  progressInverted = false,
}) => {
  const barColor = progressInverted
    ? progress > 0.67 ? '#FF3B30' : progress > 0.33 ? '#FF9500' : '#34C759'
    : color;

  return (
    <View style={[metricStyles.tile, isDark && metricStyles.tileDark]}>
      <View style={metricStyles.tileHeader}>
        <Icon name={icon} size={16} color={color} />
        <Text style={[metricStyles.tileLabel, isDark && metricStyles.subtextDark]}>
          {label}
        </Text>
      </View>
      <Text style={[metricStyles.tileValue, {color}]}>{value}</Text>
      <View style={[metricStyles.progressBg, {backgroundColor: isDark ? '#444' : '#eee'}]}>
        <View
          style={[
            metricStyles.progressFill,
            {
              width: `${Math.min(Math.max(progress, 0), 1) * 100}%` as any,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <Text style={[metricStyles.tileSub, isDark && metricStyles.subtextDark]}>{sub}</Text>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

const STTScreen = () => {
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [isInitialized, setIsInitialized] = useState(sttService.getIsInitialized());
  const [isInitializing, setIsInitializing] = useState(false);
  const [topPanelFlex, setTopPanelFlex] = useState(1);
  const [bottomPanelFlex, setBottomPanelFlex] = useState(1);
  const dividerY = useRef(0);
  const containerHeight = useRef(0);
  const {settings, effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';
  const lastSpeechTime = useRef<number>(Date.now());
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'tl'>('tl');
  const navigation = useNavigation();
  const singleSpeakerModeRef = useRef(settings.singleSpeakerMode);
  const activeModelRef = useRef<'tl' | 'en'>(settings.language as 'tl' | 'en');
  const isSwitchingModelRef = useRef(false);
  const [replyText, setReplyText] = useState('');
  const amplitude = useAmplitude(!hasStartedOnce);
  const [isKeyboard, setKeyboard] = useState(false);
  const [transcriptFontSize, setTranscriptFontSize] = useState(settings.textSize);
  const lastTapRef = useRef(0);

  // ── Session metric tracking refs ─────────────────────────────────────────
  const sessionStartRef = useRef<number>(0);
  const firstResultRef = useRef<number | null>(null);
  const totalPartialsRef = useRef(0);
  const resolvedPartialsRef = useRef(0);
  const totalResultsRef = useRef(0);
  const lastPartialRef = useRef('');

  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    singleSpeakerModeRef.current = settings.singleSpeakerMode;
  }, [settings.singleSpeakerMode]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        dividerY.current = gestureState.y0;
      },
      onPanResponderMove: (_, gestureState) => {
        const totalHeight = containerHeight.current;
        if (!totalHeight) return;
        const newTopFlex = gestureState.moveY / totalHeight;
        const clamped = Math.min(Math.max(newTopFlex, 0.2), 0.8);
        setTopPanelFlex(clamped);
        setBottomPanelFlex(1 - clamped);
      },
    }),
  ).current;

  useEffect(() => {
    const reinitialize = async () => {
      if (!sttService.getIsInitialized()) {
        try {
          setIsInitializing(true);
          await sttService.initialize(settings.language as 'tl' | 'en');
        } catch (error) {
          console.error('Failed to reinitialize STT:', error);
        } finally {
          setIsInitializing(false);
        }
      }
    };
    reinitialize();
  }, []);

  useEffect(() => {
    const switchToSettingsLanguage = async () => {
      if (settings.language !== currentLanguage && !isListening) {
        try {
          setIsInitializing(true);
          await sttService.switchLanguage(settings.language as 'tl' | 'en');
          setCurrentLanguage(settings.language);
        } catch (error) {
          console.error('Error switching language:', error);
        } finally {
          setIsInitializing(false);
        }
      }
    };
    switchToSettingsLanguage();
  }, [settings.language]);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for speech recognition.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleClearReply = () => setReplyText('');

  const handleStartListening = useCallback(async () => {
    if (!isInitialized) {
      Alert.alert('Error', 'Speech recognition is not initialized yet');
      return;
    }
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Microphone permission is required');
      return;
    }
    try {
      // ── Reset session tracking ──
      sessionStartRef.current = Date.now();
      firstResultRef.current = null;
      totalPartialsRef.current = 0;
      resolvedPartialsRef.current = 0;
      totalResultsRef.current = 0;
      lastPartialRef.current = '';

      setHasStartedOnce(true);
      setIsListening(true);
      setPartialText('');
      setMetrics(null);
      setShowMetrics(false);
      speakerDetectionService.reset();
      activeModelRef.current = settings.language as 'tl' | 'en';
      isSwitchingModelRef.current = false;
      taglishCorrectionService.resetLanguageDetection();
      lastSpeechTime.current = Date.now();

      await sttService.startListening(
        text => {
          // ── Final result ──
          if (firstResultRef.current === null) {
            firstResultRef.current = Date.now();
          }
          totalResultsRef.current += 1;

          // Count the pending partial as resolved
          if (lastPartialRef.current.trim()) {
            resolvedPartialsRef.current += 1;
          }
          lastPartialRef.current = '';

          const correctedText = taglishCorrectionService.correct(text);
          const now = Date.now();
          const pauseSecs = (now - lastSpeechTime.current) / 1000;
          const punct = pauseSecs > 2 ? '. ' : pauseSecs > 1 ? ', ' : ' ';

          if (
            pauseSecs > 2 &&
            activeModelRef.current !== 'tl' &&
            !isSwitchingModelRef.current
          ) {
            isSwitchingModelRef.current = true;
            sttService
              .switchLanguage('tl')
              .then(() => {
                activeModelRef.current = 'tl';
                taglishCorrectionService.resetLanguageDetection();
                console.log('>>> Reset to TL after period pause');
              })
              .finally(() => {
                isSwitchingModelRef.current = false;
              });
          }

          if (singleSpeakerModeRef.current) {
            const isSameSpeaker = speakerDetectionService.isSameAsReferenceSpeaker();
            if (isSameSpeaker) {
              setTranscribedText(prev => (prev ? `${prev}${punct}${correctedText}` : correctedText));
            }
          } else {
            const detection = speakerDetectionService.detectSpeakerChange(correctedText);
            const labeledText = `[Person ${detection.speaker}] ${correctedText}`;
            setTranscribedText(prev => {
              if (!prev) return labeledText;
              if (detection.changed) return `${prev}\n\n${labeledText}`;
              return `${prev}${punct}${correctedText}`;
            });
          }

          setPartialText('');
          lastSpeechTime.current = now;
        },
        async text => {
          // ── Partial result ──
          if (text && text !== lastPartialRef.current) {
            totalPartialsRef.current += 1;
            lastPartialRef.current = text;
          }

          taglishCorrectionService.trackPartial(text);
          setPartialText(text);

          const suggestedLang = taglishCorrectionService.detectLanguage(text, activeModelRef.current);
          if (suggestedLang && suggestedLang !== activeModelRef.current && !isSwitchingModelRef.current) {
            isSwitchingModelRef.current = true;
            try {
              await sttService.switchLanguage(suggestedLang);
              activeModelRef.current = suggestedLang;
              taglishCorrectionService.resetLanguageDetection();
              console.log(`>>> [STTScreen] Switched to model: ${suggestedLang}`);
            } catch (e) {
              console.error('>>> [STTScreen] Failed to switch model:', e);
            } finally {
              isSwitchingModelRef.current = false;
            }
          }

          if (settings.vibrateOnSpeech && text) {
            const now = Date.now();
            if (now - lastSpeechTime.current > 5 * 60 * 1000) {
              Vibration.vibrate(200);
            }
            lastSpeechTime.current = now;
          }
        },
        pitch => {
          speakerDetectionService.receivePitch(pitch);
        },
        async () => {
          console.log('>>> Timeout — restarting recognition...');
          try {
            try { await Vosk.stop(); } catch (_) {}
            await new Promise(resolve => setTimeout(resolve, 300));
            if (activeModelRef.current !== 'tl') {
              await sttService.switchLanguage('tl');
              activeModelRef.current = 'tl';
              taglishCorrectionService.resetLanguageDetection();
              console.log('>>> Reset to TL after pause');
            }
            await Vosk.startWithModel(activeModelRef.current, null);
          } catch (e) {
            console.error('>>> Failed to restart after timeout:', e);
            setIsListening(false);
          }
        },
        settings.noiseReduction,
      );
    } catch (error) {
      console.error('Error starting listening:', error);
      Alert.alert('Error', 'Failed to start listening');
      setIsListening(false);
    }
  }, [isInitialized, settings]);

  useEffect(() => {
    if (settings.autoStartRecording && isInitialized && !isListening) {
      handleStartListening();
    }
  }, [settings.autoStartRecording, isInitialized, isListening, handleStartListening]);

  const handleStopListening = async () => {
    try {
      await sttService.stopListening();
      setIsListening(false);
      setPartialText('');
      taglishCorrectionService.resetPartialHistory();
    } catch (error) {
      console.error('Error stopping listening:', error);
      setIsListening(false);
    }
  };

  const handleClear = () => {
    setTranscribedText('');
    setMetrics(null);
    setShowMetrics(false);
  };

  const handleCopy = () => {
    if (transcribedText) {
      Clipboard.setString(transcribedText);
      Alert.alert('Success', 'Text copied to clipboard!');
    }
  };

  const handleKeyboard = () => setKeyboard(prev => !prev);

  // ── Analyze button handler ───────────────────────────────────────────────
  const handleAnalyze = () => {
    if (!transcribedText.trim()) {
      Alert.alert('No Transcript', 'Record something first before analyzing.');
      return;
    }
    const result = computeMetrics({
      transcribedText,
      sessionStartMs: sessionStartRef.current,
      sessionEndMs: Date.now(),
      firstResultMs: firstResultRef.current,
      totalPartials: totalPartialsRef.current,
      resolvedPartials: resolvedPartialsRef.current,
      totalResults: totalResultsRef.current,
    });
    setMetrics(result);
    setShowMetrics(true);
  };

  const handleViewTouch = (evt: any) => {
    if (evt.nativeEvent.touches.length === 0) {
      const now = Date.now();
      const delta = now - lastTapRef.current;
      if (delta < 300) {
        setTranscriptFontSize(prev =>
          prev === settings.textSize ? settings.textSize + 4 : settings.textSize,
        );
      }
      lastTapRef.current = now;
    }
  };

  const pinchRef = useRef({initialDistance: 1, initialFontSize: transcriptFontSize});
  const transcriptFontSizeRef = useRef(transcriptFontSize);

  useEffect(() => {
    pinchRef.current.initialFontSize = transcriptFontSize;
    transcriptFontSizeRef.current = transcriptFontSize;
  }, [transcriptFontSize]);

  const panResponderSecond = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: evt => evt.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponder: evt => evt.nativeEvent.touches.length === 2,
        onPanResponderGrant: evt => {
          const touches = evt.nativeEvent.touches;
          if (touches.length === 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            pinchRef.current.initialDistance = Math.sqrt(dx * dx + dy * dy);
            pinchRef.current.initialFontSize = transcriptFontSizeRef.current;
          }
        },
        onPanResponderMove: evt => {
          const touches = evt.nativeEvent.touches;
          if (touches.length === 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            if (!currentDistance) return;
            const scale = currentDistance / pinchRef.current.initialDistance;
            const dampedScale = 1 + (scale - 1) * 0.3;
            const newSize = Math.max(10, Math.min(32, pinchRef.current.initialFontSize * dampedScale));
            setTranscriptFontSize(Math.round(newSize));
          }
        },
        onPanResponderRelease: () => {
          pinchRef.current.initialFontSize = transcriptFontSizeRef.current;
        },
      }),
    [],
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {isListening && <KeepAwake />}

      {/* SCREEN 1 — Idle */}
      {!hasStartedOnce && (
        <View style={styles.idleContainer}>
          <TouchableOpacity
            onPress={handleStartListening}
            disabled={isInitializing}
            style={styles.micButton}>
            <Icon name="mic" size={72} color="#34C759" />
          </TouchableOpacity>
          <Text style={[styles.idleText, isDarkMode && styles.textDark]}>
            {isInitializing ? 'Initializing...' : 'Ready to transcribe'}
          </Text>
          <WaveformView
            isActive={!hasStartedOnce}
            amplitude={amplitude}
            color="#34C759"
            barCount={20}
            height={60}
          />
          <TouchableOpacity
            style={styles.idleSettingsIcon}
            onPress={() => navigation.navigate('Settings' as never)}>
            <Icon name="settings-outline" size={28} color={isDarkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
        </View>
      )}

      {/* SCREEN 2 — Active */}
      {hasStartedOnce && (
        <View
          style={styles.activeContainer}
          onLayout={e => {
            containerHeight.current = e.nativeEvent.layout.height;
          }}>
          {/* Header */}
          <View>
            <View style={[styles.headerStyle, isDarkMode && styles.headerDark]}>
              <Image
                source={require('../../assets/bglogo.png')}
                style={{width: 40, height: 40, resizeMode: 'contain'}}
              />
              <Text style={[styles.headerTitleStyle, isDarkMode && styles.headerTitleDark]}>
                EchoLink
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsIcon}
              onPress={() => navigation.navigate('Settings' as never)}>
              <Icon name="settings-outline" size={28} color={isDarkMode ? '#fff' : '#333'} />
            </TouchableOpacity>
          </View>

          {/* TOP PANEL */}
          <View style={{flex: isKeyboard ? topPanelFlex : 1}}>
            <ScrollView
              style={[styles.textContainer, isDarkMode && styles.textContainerDark]}
              contentContainerStyle={styles.textContent}>
              <View style={{position: 'relative'}}>
                <View style={{position: 'absolute', right: 1, top: 10, zIndex: 10}}>
                  {!isListening && transcribedText ? (
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 3}}>
                      <TouchableOpacity style={styles.smallActionBtn} onPress={handleCopy}>
                        <Icon name="copy-outline" size={18} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.smallActionBtn} onPress={handleClear}>
                        <Icon name="trash-outline" size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.partialText,
                    isDarkMode && styles.partialTextDark,
                    {fontSize: settings.textSize - 2},
                  ]}>
                  {partialText || (isListening ? 'Listening...' : 'Listening...')}
                </Text>
              </View>

              <View {...panResponderSecond.panHandlers} onTouchEnd={handleViewTouch} style={{flex: 1}}>
                <TextInput
                  pointerEvents="none"
                  style={[
                    styles.transcribedInput,
                    isDarkMode && styles.transcribedInputDark,
                    {fontSize: transcriptFontSize, flex: 1, borderColor: '#ffffff00', padding: 0, marginTop: 20},
                  ]}
                  multiline
                  value={transcribedText}
                  onChangeText={setTranscribedText}
                  editable={false}
                  placeholder=""
                  placeholderTextColor={isDarkMode ? '#827e7e' : '#aaa'}
                />
              </View>
            </ScrollView>
          </View>

          {/* BOTTOM PANEL — reply keyboard */}
          {isKeyboard && (
            <View
              style={{
                flex: bottomPanelFlex,
                position: 'relative',
                borderTopColor: isDarkMode ? '#707271' : '#afb3b1',
                borderTopWidth: 2,
              }}>
              <View style={{position: 'absolute', top: -8, right: '35%', zIndex: 10}}>
                <View {...panResponder.panHandlers} style={styles.divider}>
                  <View
                    style={{
                      backgroundColor: isDarkMode ? '#0e0e0e' : '#282424',
                      height: 15,
                      width: 100,
                      borderRadius: 5,
                    }}
                  />
                </View>
              </View>
              <View style={{position: 'absolute', top: 10, right: 10, zIndex: 10}}>
                <TouchableOpacity style={styles.smallActionBtn} onPress={handleClearReply}>
                  <Icon name="trash-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.transcribedInput,
                  isDarkMode && styles.transcribedInputDark,
                  {fontSize: settings.textSize, flex: 1},
                ]}
                multiline
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Type your reply here..."
                placeholderTextColor={isDarkMode ? '#827e7e' : '#aaa'}
              />
            </View>
          )}

          {/* ACTION BUTTONS */}
          <View style={[styles.actionButtonsRow, isDarkMode && styles.actionButtonsRowDark]}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity style={styles.smallActionBtn} onPress={handleKeyboard}>
                <Text style={[{color: '#2c2b2b'}, isDarkMode && {color: '#f5f5f5'}]}>
                  {isKeyboard ? (
                    <Icon name="caret-down-circle" size={24} />
                  ) : (
                    <FontAwesome name="keyboard-o" size={24} />
                  )}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <TouchableOpacity
                style={[styles.toggleButton, {backgroundColor: '#007AFF'}]}
                onPress={handleAnalyze}>
                <Icon name="stats-chart-outline" size={20} color="#FFF" />
                <Text style={styles.toggleButtonText}>Analyze</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isListening ? styles.stopButton : styles.startButton,
                  isInitializing && styles.buttonDisabled,
                ]}
                onPress={isListening ? handleStopListening : handleStartListening}
                disabled={isInitializing}>
                <Icon
                  name={isListening ? 'stop-circle-outline' : 'mic-outline'}
                  size={22}
                  color="#fff"
                />
                <Text style={styles.toggleButtonText}>
                  {isInitializing ? 'Initializing...' : isListening ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── METRICS CARD ─────────────────────────────────────────────── */}
          {showMetrics && metrics && (
            <ScrollView
              style={[metricStyles.card, isDarkMode && metricStyles.cardDark]}
              nestedScrollEnabled>
              {/* Header row */}
              <View style={metricStyles.cardHeader}>
                <View style={{flex: 1}}>
                  <Text style={[metricStyles.cardTitle, isDarkMode && metricStyles.textDark]}>
                    Session Report
                  </Text>
                  <Text style={[metricStyles.cardMeta, isDarkMode && metricStyles.subtextDark]}>
                    {metrics.totalWords} words · {metrics.sessionDurationSec.toFixed(1)}s
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowMetrics(false)}
                  style={metricStyles.closeBtn}>
                  <Icon name="close-circle-outline" size={22} color={isDarkMode ? '#888' : '#999'} />
                </TouchableOpacity>
              </View>

              {/* Row 1: Estimated Accuracy + Signal Quality */}
              <View style={metricStyles.row}>
                <MetricTile
                  isDark={isDarkMode}
                  icon="checkmark-circle-outline"
                  label="Est. Accuracy"
                  value={`${metrics.estimatedAccuracy.toFixed(1)}%`}
                  sub="word pattern analysis"
                  color={scoreColor(metrics.estimatedAccuracy)}
                  progress={metrics.estimatedAccuracy / 100}
                />
                <MetricTile
                  isDark={isDarkMode}
                  icon="cellular-outline"
                  label="Signal Quality"
                  value={`${metrics.signalQuality.toFixed(1)}%`}
                  sub="audio clarity estimate"
                  color={scoreColor(metrics.signalQuality)}
                  progress={metrics.signalQuality / 100}
                />
              </View>

              {/* Row 2: WPM + Vocal Clarity */}
              <View style={metricStyles.row}>
                <MetricTile
                  isDark={isDarkMode}
                  icon="speedometer-outline"
                  label="Words / Min"
                  value={metrics.wpm.toFixed(0)}
                  sub={wpmLabel(metrics.wpm)}
                  color={scoreColor(Math.min(100, Math.max(0, 100 - Math.abs(metrics.wpm - 130))))}
                  progress={Math.min(metrics.wpm / 200, 1)}
                />
                <MetricTile
                  isDark={isDarkMode}
                  icon="mic-circle-outline"
                  label="Vocal Clarity"
                  value={`${metrics.vocalClarityIndex.toFixed(1)}%`}
                  sub={`${metrics.resolvedPartials}/${metrics.totalPartials} partials resolved`}
                  color={scoreColor(metrics.vocalClarityIndex)}
                  progress={metrics.vocalClarityIndex / 100}
                />
              </View>

              {/* Row 3: RTF + Latency */}
              <View style={metricStyles.row}>
                <MetricTile
                  isDark={isDarkMode}
                  icon="timer-outline"
                  label="Real-Time Factor"
                  value={`${metrics.rtf.toFixed(2)}x`}
                  sub={metrics.rtf <= 1 ? 'faster than real-time' : 'slower than real-time'}
                  color={rtfColor(metrics.rtf)}
                  progress={Math.min(metrics.rtf / 3, 1)}
                  progressInverted
                />
                <MetricTile
                  isDark={isDarkMode}
                  icon="flash-outline"
                  label="1st Result Latency"
                  value={metrics.processingLatencyMs > 0 ? `${metrics.processingLatencyMs}ms` : 'N/A'}
                  sub="time to first result"
                  color={latencyColor(metrics.processingLatencyMs)}
                  progress={Math.min(metrics.processingLatencyMs / 2000, 1)}
                  progressInverted
                />
              </View>

              {/* Row 4: Word Reliability + Throughput */}
              <View style={metricStyles.row}>
                <MetricTile
                  isDark={isDarkMode}
                  icon="shield-checkmark-outline"
                  label="Word Reliability"
                  value={`${metrics.wordReliabilityScore.toFixed(1)}%`}
                  sub="words ≥3 chars (less noise)"
                  color={scoreColor(metrics.wordReliabilityScore)}
                  progress={metrics.wordReliabilityScore / 100}
                />
                <MetricTile
                  isDark={isDarkMode}
                  icon="rocket-outline"
                  label="Throughput"
                  value={`${metrics.throughputWps.toFixed(2)} w/s`}
                  sub="words per second"
                  color={
                    metrics.throughputWps >= 1
                      ? '#34C759'
                      : metrics.throughputWps >= 0.5
                      ? '#FF9500'
                      : '#FF3B30'
                  }
                  progress={Math.min(metrics.throughputWps / 4, 1)}
                />
              </View>

              <Text style={[metricStyles.legend, isDarkMode && metricStyles.subtextDark]}>
                * Metrics estimated from session data — no reference text required
              </Text>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Metric card styles ───────────────────────────────────────────────────────

const metricStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingTop: 10,
    maxHeight: 360,
  },
  cardDark: {
    backgroundColor: '#2a2a2a',
    borderTopColor: '#444',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#333',
  },
  cardMeta: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  closeBtn: {
    padding: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  tileDark: {
    backgroundColor: '#1a1a1a',
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tileSub: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  legend: {
    fontSize: 10,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 4,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
  textDark: {color: '#fff'},
  subtextDark: {color: '#888'},
});

// ─── Main styles (unchanged from original) ───────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  topActionRow: {flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingHorizontal: 12, paddingVertical: 6},
  bottomActionRow: {flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingHorizontal: 12, paddingVertical: 6},
  smallActionBtn: {flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6},
  smallActionText: {fontSize: 14, fontWeight: '600', color: '#007AFF'},
  flexRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5},
  containerDark: {backgroundColor: '#1a1a1a'},
  headerDark: {backgroundColor: '#535B58'},
  headerStyle: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fcf7f7', paddingHorizontal: 2, paddingVertical: 5},
  headerTitleStyle: {color: '#000', fontSize: 18},
  headerTitleDark: {color: '#ffffff'},
  buttonDisabled: {opacity: 0.5, backgroundColor: '#999'},
  saveButton: {borderColor: '#34C759'},
  saveButtonText: {color: '#34C759'},
  settingsIcon: {position: 'absolute', right: 20, zIndex: 10, bottom: 10},
  buttonContent: {flexDirection: 'row', alignItems: 'center', gap: 8},
  title: {fontSize: 16, fontWeight: 'bold', marginBottom: 20, color: '#333'},
  textDark: {color: '#fff'},
  statusContainer: {flexDirection: 'row', alignItems: 'center', marginBottom: 20},
  statusIndicator: {width: 12, height: 12, borderRadius: 6, backgroundColor: '#999', marginRight: 8},
  statusIndicatorActive: {backgroundColor: '#FF3B30'},
  statusText: {fontSize: 16, color: '#827e7e'},
  textContainer: {flex: 1, backgroundColor: '#fff'},
  textContainerDark: {backgroundColor: '#2a2a2a'},
  textContent: {padding: 16},
  transcribedText: {fontSize: 16, lineHeight: 24, color: '#333'},
  partialText: {fontSize: 16, lineHeight: 24, color: '#999', fontStyle: 'italic', marginTop: 8},
  partialTextDark: {color: '#827e7e'},
  buttonContainer: {gap: 12},
  button: {padding: 16, borderRadius: 12, alignItems: 'center'},
  startButton: {backgroundColor: '#34C759'},
  stopButton: {backgroundColor: '#FF3B30'},
  clearButton: {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#007AFF'},
  buttonText: {color: '#fff', fontSize: 18, fontWeight: '600'},
  clearButtonText: {color: '#007AFF', fontSize: 16, fontWeight: '600'},
  languageButton: {backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#007AFF', alignItems: 'center'},
  languageButtonDark: {backgroundColor: '#2a2a2a', borderColor: '#007AFF'},
  languageButtonText: {color: '#007AFF', fontSize: 16, fontWeight: '600'},
  actionButtonsRow: {flexDirection: 'row', alignContent: 'center', justifyContent: 'space-between', paddingVertical: 2, paddingHorizontal: 4, backgroundColor: '#edfffb'},
  actionButtonsRowDark: {backgroundColor: '#536D67'},
  actionButton: {flex: 1, backgroundColor: 'transparent', borderWidth: 1, padding: 12},
  copyButton: {borderColor: '#007AFF'},
  actionButtonText: {fontSize: 16, fontWeight: '600', color: '#007AFF'},
  idleContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16},
  idleText: {fontSize: 18, color: '#333', fontWeight: '500'},
  idleSettingsIcon: {position: 'absolute', bottom: 20, left: 20, padding: 8},
  micButton: {padding: 2},
  activeContainer: {flex: 1},
  statusLabel: {fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 8},
  divider: {alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent', flexDirection: 'row'},
  bottomPanelHeader: {flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4},
  toggleButton: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8},
  toggleButtonText: {color: '#fff', fontWeight: '600', fontSize: 15},
  transcribedInput: {flex: 1, backgroundColor: '#fff', padding: 16, fontSize: 16, color: '#333', textAlignVertical: 'top'},
  transcribedInputDark: {backgroundColor: '#2a2a2a', color: '#fff'},
});

export default STTScreen;