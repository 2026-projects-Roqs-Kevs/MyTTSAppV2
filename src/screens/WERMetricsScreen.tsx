import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
  PanResponder,
  TextInput,
} from 'react-native';
import sttService from '../services/sttService';
import speakerDetectionService from '../services/speakerDetectionService';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSettings} from '../context/SettingsContext';
import KeepAwake from 'react-native-keep-awake';

// ─── WER Calculation ───────────────────────────────────────────────────────

function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-–—\/\\]/g, '')  // strip punctuation incl. . ! ?
    .replace(/\s+/g, ' ')                   // collapse extra spaces
    .trim()
    .split(' ')
    .filter(w => w.length > 0);
}

function computeWER(reference: string, hypothesis: string) {
  const ref = normalizeText(reference);
  const hyp = normalizeText(hypothesis);

  if (ref.length === 0) {
    return {wer: 0, wordCount: 0, substitutions: 0, deletions: 0, insertions: 0, errors: 0};
  }

  const m = ref.length;
  const n = hyp.length;
  const dp: number[][] = Array.from({length: m + 1}, (_, i) =>
    Array.from({length: n + 1}, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m, j = n;
  let substitutions = 0, deletions = 0, insertions = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) {
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++; i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      deletions++; i--;
    } else {
      insertions++; j--;
    }
  }

  const errors = substitutions + deletions + insertions;
  return {
    wer: Math.min((errors / ref.length) * 100, 100),
    wordCount: ref.length,
    substitutions,
    deletions,
    insertions,
    errors,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

const WERMetricsScreen = () => {
  const {settings, effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';

  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [referenceText, setReferenceText] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [werResult, setWerResult] = useState<ReturnType<typeof computeWER> | null>(null);

  const [topPanelFlex, setTopPanelFlex] = useState(1);
  const [bottomPanelFlex, setBottomPanelFlex] = useState(1);
  const containerHeight = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const total = containerHeight.current;
        if (!total) return;
        const clamped = Math.min(Math.max(gestureState.moveY / total, 0.2), 0.8);
        setTopPanelFlex(clamped);
        setBottomPanelFlex(1 - clamped);
      },
    }),
  ).current;

  useEffect(() => {
    return () => {
      sttService.stopListening().catch(() => {});
    };
  }, []);

  const requestMicPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Needed for speech recognition.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleStartListening = async () => {
    if (!referenceText.trim()) {
      Alert.alert('Missing Reference', 'Please type the reference text first.');
      return;
    }
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Microphone permission is required.');
      return;
    }
    try {
      setHasStartedOnce(true);
      setIsListening(true);
      setTranscribedText('');
      setPartialText('');
      setWerResult(null);
      speakerDetectionService.reset();

      await sttService.startListening(
        text => {
          setTranscribedText(prev => (prev ? `${prev} ${text}` : text));
          setPartialText('');
        },
        text => {
          setPartialText(text);
        },
        pitch => {
          speakerDetectionService.receivePitch(pitch);
        },
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to start listening.');
      setIsListening(false);
    }
  };

  const handleStopListening = async () => {
    try {
      await sttService.stopListening();
    } catch {}
    setIsListening(false);
    setPartialText('');
  };

  const handleCalculateWER = () => {
    if (!referenceText.trim()) {
      Alert.alert('Missing Reference', 'Please enter reference text.');
      return;
    }
    if (!transcribedText.trim()) {
      Alert.alert('No Transcript', 'Record something first.');
      return;
    }
    setWerResult(computeWER(referenceText, transcribedText));
  };

  const handleClear = () => {
    setTranscribedText('');
    setPartialText('');
    setWerResult(null);
  };

  const handleReset = () => {
    setHasStartedOnce(false);
    setIsListening(false);
    setReferenceText('');
    setTranscribedText('');
    setPartialText('');
    setWerResult(null);
  };

  const getWERColor = (wer: number) => {
    if (wer <= 5) return '#34C759';
    if (wer <= 20) return '#FF9500';
    return '#FF3B30';
  };

  const getWERLabel = (wer: number) => {
    if (wer <= 5) return 'Excellent';
    if (wer <= 15) return 'Good';
    if (wer <= 30) return 'Fair';
    return 'Poor';
  };

  // ── IDLE SCREEN ──────────────────────────────────────────────────────────
  if (!hasStartedOnce) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.idleContainer}>
          <Text style={[styles.refLabel, isDarkMode && styles.textDark]}>
            Reference Text
          </Text>
          <Text style={[styles.refSublabel, isDarkMode && styles.subtextDark]}>
            Type exactly what you will say before recording
          </Text>
          <TextInput
            style={[
              styles.refInput,
              isDarkMode && styles.refInputDark,
              {fontSize: settings.textSize},
            ]}
            value={referenceText}
            onChangeText={setReferenceText}
            placeholder="e.g. Ang bilis ng kulay kahel na lobo"
            placeholderTextColor={isDarkMode ? '#555' : '#bbb'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={handleStartListening}
            disabled={isInitializing}
            style={styles.micButton}>
            <Icon name="mic" size={64} color="#34C759" />
          </TouchableOpacity>
          <Text style={[styles.idleText, isDarkMode && styles.textDark]}>
            {isInitializing ? 'Initializing...' : 'Tap mic to start recording'}
          </Text>
        </View>
      </View>
    );
  }

  // ── ACTIVE SCREEN ─────────────────────────────────────────────────────────
  return (
    <View
      style={[styles.container, isDarkMode && styles.containerDark]}
      onLayout={e => {
        containerHeight.current = e.nativeEvent.layout.height;
      }}>
      {isListening && <KeepAwake />}

      <View style={styles.activeContainer}>

        {/* TOP PANEL — partial text / listening state */}
        <View style={{flex: topPanelFlex}}>
          <ScrollView
            style={[styles.textContainer, isDarkMode && styles.textContainerDark]}
            contentContainerStyle={styles.textContent}>
            <Text
              style={[
                styles.partialText,
                isDarkMode && styles.partialTextDark,
                {fontSize: settings.textSize},
              ]}>
              {partialText || (isListening ? 'Listening...' : '...')}
            </Text>
          </ScrollView>
        </View>

        {/* DIVIDER — draggable */}
        <View {...panResponder.panHandlers} style={styles.divider}>
          <View style={{width: 100}} />
          <View
            style={{
              backgroundColor: isDarkMode ? '#756f6f' : '#ccc1c1',
              borderRadius: 5,
            }}>
            <Icon
              name="reorder-three-outline"
              size={34}
              color={isDarkMode ? '#aaa' : '#555'}
            />
          </View>
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

        {/* BOTTOM PANEL — transcribed text (editable) */}
        <View style={{flex: bottomPanelFlex}}>
          <TextInput
            style={[
              styles.transcribedInput,
              isDarkMode && styles.transcribedInputDark,
              {fontSize: settings.textSize},
            ]}
            multiline
            value={transcribedText}
            onChangeText={setTranscribedText}
            placeholder="Transcription appears here..."
            placeholderTextColor={isDarkMode ? '#827e7e' : '#aaa'}
            textAlignVertical="top"
          />
        </View>

        {/* ACTION BUTTONS — only when stopped */}
        {!isListening && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, {borderColor: '#34C759'}]}
              onPress={handleCalculateWER}>
              <View style={styles.buttonContent}>
                <Icon name="analytics-outline" size={20} color="#34C759" />
                <Text style={[styles.actionButtonText, {color: '#34C759'}]}>
                  Calculate WER
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, {borderColor: '#FF3B30'}]}
              onPress={handleClear}>
              <View style={styles.buttonContent}>
                <Icon name="trash-outline" size={20} color="#FF3B30" />
                <Text style={[styles.actionButtonText, {color: '#FF3B30'}]}>
                  Clear
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, {borderColor: '#999'}]}
              onPress={handleReset}>
              <View style={styles.buttonContent}>
                <Icon name="refresh-outline" size={20} color="#999" />
                <Text style={[styles.actionButtonText, {color: '#999'}]}>
                  Reset
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* WER RESULTS */}
        {werResult && (
          <ScrollView
            style={[styles.werCard, isDarkMode && styles.werCardDark]}
            nestedScrollEnabled>

            {/* Score + label */}
            <View style={styles.werScoreRow}>
              <Text style={[styles.werScoreNum, {color: getWERColor(werResult.wer)}]}>
                {werResult.wer.toFixed(1)}%
              </Text>
              <View
                style={[
                  styles.werBadge,
                  {backgroundColor: getWERColor(werResult.wer) + '22'},
                ]}>
                <Text style={[styles.werBadgeText, {color: getWERColor(werResult.wer)}]}>
                  {getWERLabel(werResult.wer)}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View
              style={[
                styles.progressBg,
                {backgroundColor: isDarkMode ? '#444' : '#eee'},
              ]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(werResult.wer, 100)}%` as any,
                    backgroundColor: getWERColor(werResult.wer),
                  },
                ]}
              />
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                {label: 'Words', value: werResult.wordCount, color: '#007AFF'},
                {label: 'Errors', value: werResult.errors, color: '#FF3B30'},
                {label: 'Sub', value: werResult.substitutions, color: '#FF9500'},
                {label: 'Del', value: werResult.deletions, color: '#FF3B30'},
                {label: 'Ins', value: werResult.insertions, color: '#34C759'},
              ].map(s => (
                <View
                  key={s.label}
                  style={[styles.statBox, isDarkMode && styles.statBoxDark]}>
                  <Text style={[styles.statVal, {color: s.color}]}>{s.value}</Text>
                  <Text style={[styles.statLabel, isDarkMode && styles.subtextDark]}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Reference vs Transcript comparison */}
            <View style={styles.compareBlock}>
              <Text style={[styles.compareTitle, isDarkMode && styles.textDark]}>
                Reference
              </Text>
              <Text style={[styles.compareText, isDarkMode && styles.subtextDark]}>
                {referenceText}
              </Text>
              <Text
                style={[
                  styles.compareTitle,
                  isDarkMode && styles.textDark,
                  {marginTop: 8},
                ]}>
                Transcript
              </Text>
              <Text style={[styles.compareText, isDarkMode && styles.subtextDark]}>
                {transcribedText}
              </Text>
            </View>

            <Text style={[styles.formula, isDarkMode && styles.subtextDark]}>
              WER = (S+D+I) / N × 100{'  '}·{'  '}S=Sub D=Del I=Ins N=Ref words
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#f5f5f5'},
  containerDark: {backgroundColor: '#1a1a1a'},
  textDark: {color: '#fff'},
  subtextDark: {color: '#888'},

  // ── Idle
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  refLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    alignSelf: 'flex-start',
  },
  refSublabel: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-start',
    marginTop: -6,
  },
  refInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    minHeight: 100,
    color: '#333',
  },
  refInputDark: {backgroundColor: '#2a2a2a', borderColor: '#444', color: '#fff'},
  micButton: {
    padding: 24,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#34C759',
    marginTop: 8,
  },
  idleText: {fontSize: 18, color: '#333', fontWeight: '500'},

  // ── Active
  activeContainer: {flex: 1, paddingTop: 8},
  textContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textContainerDark: {backgroundColor: '#2a2a2a', borderColor: '#444'},
  textContent: {padding: 16},
  partialText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  partialTextDark: {color: '#827e7e'},

  divider: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginVertical: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonText: {color: '#fff', fontWeight: '600', fontSize: 15},
  startButton: {backgroundColor: '#34C759'},
  stopButton: {backgroundColor: '#FF3B30'},
  buttonDisabled: {opacity: 0.5, backgroundColor: '#999'},

  transcribedInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  transcribedInputDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    color: '#fff',
  },

  actionButtonsRow: {flexDirection: 'row', paddingTop: 8, gap: 8},
  actionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionButtonText: {fontSize: 13, fontWeight: '600'},

  // ── WER Results
  werCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    maxHeight: 300,
  },
  werCardDark: {backgroundColor: '#2a2a2a', borderColor: '#444'},
  werScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  werScoreNum: {fontSize: 44, fontWeight: '900', letterSpacing: -1},
  werBadge: {paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20},
  werBadgeText: {fontSize: 14, fontWeight: '700'},
  progressBg: {height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden'},
  progressFill: {height: '100%', borderRadius: 4},
  statsRow: {flexDirection: 'row', gap: 6, marginBottom: 12},
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  statBoxDark: {backgroundColor: '#1a1a1a'},
  statVal: {fontSize: 18, fontWeight: '800'},
  statLabel: {fontSize: 10, color: '#666', marginTop: 2},
  compareBlock: {marginBottom: 8},
  compareTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  compareText: {fontSize: 13, color: '#666', lineHeight: 20},
  formula: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    paddingBottom: 4,
  },
});

export default WERMetricsScreen;