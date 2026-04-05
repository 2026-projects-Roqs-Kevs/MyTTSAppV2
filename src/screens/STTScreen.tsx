import React, {useState, useEffect, useCallback} from 'react';
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

const STTScreen = () => {
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [isInitialized, setIsInitialized] = useState(
    sttService.getIsInitialized(),
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [topPanelFlex, setTopPanelFlex] = useState(1);
  const [bottomPanelFlex, setBottomPanelFlex] = useState(1);
  const dividerY = React.useRef(0);
  const containerHeight = React.useRef(0);
  const {settings, effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';
  const lastSpeechTime = React.useRef<number>(Date.now());
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'tl'>('tl');
  const navigation = useNavigation();
  const singleSpeakerModeRef = React.useRef(settings.singleSpeakerMode);
  const activeModelRef = React.useRef<'tl' | 'en'>(
    settings.language as 'tl' | 'en',
  );
  const isSwitchingModelRef = React.useRef(false);
  const [replyText, setReplyText] = useState('');
  const amplitude = useAmplitude(!hasStartedOnce);
  const [isKeyboard, setKeyboard] = useState(false);
  const [transcriptFontSize, setTranscriptFontSize] = useState(
    settings.textSize,
  );
  const lastTapRef = React.useRef(0);

  useEffect(() => {
    singleSpeakerModeRef.current = settings.singleSpeakerMode;
  }, [settings.singleSpeakerMode]);

  const panResponder = React.useRef(
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

    return () => {
      // removed cleanup here — App.tsx manages Vosk lifecycle now
    };
  }, []);

  useEffect(() => {
    // Switch language model when settings change
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
            message:
              'This app needs access to your microphone for speech recognition.',
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

  const handleClearReply = () => {
    setReplyText('');
  };

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
      setHasStartedOnce(true);
      setIsListening(true);
      setPartialText('');
      speakerDetectionService.reset();
      activeModelRef.current = settings.language as 'tl' | 'en';
      isSwitchingModelRef.current = false;
      taglishCorrectionService.resetLanguageDetection();
      lastSpeechTime.current = Date.now();
      await sttService.startListening(
        text => {
          const correctedText = taglishCorrectionService.correct(text);
          const now = Date.now();
          const pauseSecs = (now - lastSpeechTime.current) / 1000;
          const punct = pauseSecs > 2 ? '. ' : pauseSecs > 1 ? ', ' : ' ';

          // Reset to TL on period
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
            const isSameSpeaker =
              speakerDetectionService.isSameAsReferenceSpeaker();
            if (isSameSpeaker) {
              setTranscribedText(prev =>
                prev ? `${prev}${punct}${correctedText}` : correctedText,
              );
            }
          } else {
            const detection =
              speakerDetectionService.detectSpeakerChange(correctedText);
            const labeledText = `[Person ${detection.speaker}] ${correctedText}`;
            setTranscribedText(prev => {
              if (!prev) return labeledText;
              if (detection.changed) {
                return `${prev}\n\n${labeledText}`;
              } else {
                return `${prev}${punct}${correctedText}`;
              }
            });
          }
          setPartialText('');
          lastSpeechTime.current = now;
        },
        async text => {
          taglishCorrectionService.trackPartial(text);
          setPartialText(text);

          // Language detection — check if we need to switch model
          const suggestedLang = taglishCorrectionService.detectLanguage(
            text,
            activeModelRef.current,
          );
          if (
            suggestedLang &&
            suggestedLang !== activeModelRef.current &&
            !isSwitchingModelRef.current // guard against concurrent switches
          ) {
            isSwitchingModelRef.current = true;
            try {
              await sttService.switchLanguage(suggestedLang);
              activeModelRef.current = suggestedLang;
              taglishCorrectionService.resetLanguageDetection(); // reset counters after switch
              console.log(
                `>>> [STTScreen] Switched to model: ${suggestedLang}`,
              );
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
          // NEW — feed real pitch data to speaker detection
          speakerDetectionService.receivePitch(pitch);
        },
        async () => {
          console.log('>>> Timeout — restarting recognition...');
          try {
            try {
              await Vosk.stop();
            } catch (_) {}
            await new Promise(resolve => setTimeout(resolve, 300));

            // Reset to TL on pause
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
  }, [
    settings.autoStartRecording,
    isInitialized,
    isListening,
    handleStartListening,
  ]);

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
  };

  const handleCopy = () => {
    if (transcribedText) {
      Clipboard.setString(transcribedText);
      Alert.alert('Success', 'Text copied to clipboard!');
    }
  };

  const handleKeyboard = () => {
    if (!isKeyboard) {
      setKeyboard(true);
    } else {
      setKeyboard(false);
    }
  };

  const handleViewTouch = (evt: any) => {
    if (evt.nativeEvent.touches.length === 0) {
      const now = Date.now();
      const delta = now - lastTapRef.current;

      if (delta < 300) {
        // Double tap detected
        setTranscriptFontSize(prev =>
          prev === settings.textSize
            ? settings.textSize + 4
            : settings.textSize,
        );
      }
      lastTapRef.current = now;
    }
  };

  const pinchRef = React.useRef({
    initialDistance: 0,
    initialFontSize: transcriptFontSize,
  });

  const transcriptFontSizeRef = React.useRef(transcriptFontSize);

  useEffect(() => {
    pinchRef.current.initialFontSize = transcriptFontSize;
    transcriptFontSizeRef.current = transcriptFontSize;
  }, [transcriptFontSize]);

  const panResponderSecond = React.useRef(
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
          const scale = currentDistance / pinchRef.current.initialDistance;
          // Clamp scale to 0.9 - 1.1 range (only 10% change per pinch)
          const clampedScale = Math.max(0.98, Math.min(1.02, scale));
          const newSize = Math.max(
            10,
            Math.min(32, pinchRef.current.initialFontSize * clampedScale),
          );
          setTranscriptFontSize(Math.round(newSize));
        }
      },
      onPanResponderRelease: () => {
        pinchRef.current.initialFontSize = transcriptFontSizeRef.current;
      },
    }),
  ).current;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {isListening && <KeepAwake />}

      {/* SCREEN 1 — Idle, only shown before first recording */}
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
            <Icon
              name="settings-outline"
              size={28}
              color={isDarkMode ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* SCREEN 2 — Active, shown after first recording starts */}
      {hasStartedOnce && (
        <View
          style={styles.activeContainer}
          onLayout={e => {
            containerHeight.current = e.nativeEvent.layout.height;
          }}>
          {/* Settings icon */}
          <View>
            <View style={[styles.headerStyle, isDarkMode && styles.headerDark]}>
              <Image
                source={require('../../assets/bglogo.png')}
                style={{width: 40, height: 40, resizeMode: 'contain'}}
              />
              <Text
                style={[
                  styles.headerTitleStyle,
                  isDarkMode && styles.headerTitleDark,
                ]}>
                EchoLink
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsIcon}
              onPress={() => navigation.navigate('Settings' as never)}>
              <Icon
                name="settings-outline"
                size={28}
                color={isDarkMode ? '#fff' : '#333'}
              />
            </TouchableOpacity>
          </View>

          {/* TOP PANEL — partialText */}
          <View style={{flex: isKeyboard ? topPanelFlex : 1}}>
            {/* <Text style={[styles.statusLabel, isDarkMode && styles.textDark]}>
              {isListening ? 'Listening...' : 'Ready'}
            </Text> */}
            <ScrollView
              style={[
                styles.textContainer,
                isDarkMode && styles.textContainerDark,
              ]}
              contentContainerStyle={styles.textContent}>
              <View style={{position: 'relative'}}>
                <View
                  style={{
                    position: 'absolute',
                    right: 1,
                    top: 10,
                    zIndex: 10,
                  }}>
                  {!isListening && transcribedText ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                      }}>
                      <TouchableOpacity
                        style={styles.smallActionBtn}
                        onPress={handleCopy}>
                        <Icon name="copy-outline" size={18} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.smallActionBtn}
                        onPress={handleClear}>
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
                  {partialText ||
                    (isListening ? 'Listening...' : 'Listening...')}
                </Text>
              </View>

              {/* Transcribed text — not editable */}
              <View
                onTouchEnd={handleViewTouch}
                {...panResponderSecond.panHandlers}
                style={{flex: 1}}>
                <TextInput
                  style={[
                    styles.transcribedInput,
                    isDarkMode && styles.transcribedInputDark,
                    {
                      fontSize: transcriptFontSize,
                      flex: 1,
                      borderColor: '#ffffff00',
                      padding: 0,
                      marginTop: 20,
                    },
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

          {/* BOTTOM PANEL — transcribedText (editable) + start/stop button */}
          {isKeyboard ? (
            <View
              style={{
                flex: bottomPanelFlex,
                position: 'relative',
                borderTopColor: isDarkMode ? '#707271' : '#afb3b1',
                borderTopWidth: 2,
              }}>
              <View
                style={{
                  position: 'absolute',
                  top: -8,
                  right: '35%',
                  zIndex: 10,
                }}>
                <View {...panResponder.panHandlers} style={styles.divider}>
                  <View
                    style={{
                      backgroundColor: isDarkMode ? '#0e0e0e' : '#282424',
                      height: 15,
                      width: 100,
                      borderRadius: 5,
                    }}></View>
                </View>
              </View>
              <View
                style={{position: 'absolute', top: 10, right: 10, zIndex: 10}}>
                <TouchableOpacity
                  style={styles.smallActionBtn}
                  onPress={handleClearReply}>
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
          ) : null}

          {/* ACTION BUTTONS — only when stopped and has text */}
          <View
            style={[
              styles.actionButtonsRow,
              isDarkMode && styles.actionButtonsRowDark,
            ]}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity
                style={styles.smallActionBtn}
                onPress={handleKeyboard}>
                <Text
                  style={[
                    {color: '#2c2b2b'},
                    isDarkMode && {color: '#f5f5f5'},
                  ]}>
                  {isKeyboard ? (
                    <Icon name="caret-down-circle" size={24} />
                  ) : (
                    <FontAwesome name="keyboard-o" size={24} />
                  )}
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isListening ? styles.stopButton : styles.startButton,
                  isInitializing && styles.buttonDisabled,
                ]}
                onPress={
                  isListening ? handleStopListening : handleStartListening
                }
                disabled={isInitializing}>
                <Icon
                  name={isListening ? 'stop-circle-outline' : 'mic-outline'}
                  size={22}
                  color="#fff"
                />
                <Text style={styles.toggleButtonText}>
                  {isInitializing
                    ? 'Initializing...'
                    : isListening
                    ? 'Stop'
                    : 'Start'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bottomActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  smallActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  headerDark: {
    backgroundColor: '#535B58',
  },
  headerStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fcf7f7',
    paddingHorizontal: 2,
    paddingVertical: 5,
  },
  headerTitleStyle: {
    color: '#000',
    fontSize: 18,
  },
  headerTitleDark: {
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#999',
  },
  saveButton: {
    borderColor: '#34C759',
  },
  saveButtonText: {
    color: '#34C759',
  },
  settingsIcon: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    bottom: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  textDark: {
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#999',
    marginRight: 8,
  },
  statusIndicatorActive: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 16,
    color: '#827e7e',
  },
  textContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  textContainerDark: {
    backgroundColor: '#2a2a2a',
  },
  textContent: {
    padding: 16,
  },
  transcribedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  partialText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  partialTextDark: {
    color: '#827e7e',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  languageButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  languageButtonDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#007AFF',
  },
  languageButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: '#edfffb',
  },
  actionButtonsRowDark: {
    backgroundColor: '#536D67',
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    padding: 12,
  },
  copyButton: {
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  idleText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  idleSettingsIcon: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    padding: 8,
  },
  micButton: {
    padding: 2,
  },
  activeContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  divider: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    flexDirection: 'row',
  },
  bottomPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  transcribedInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  transcribedInputDark: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
  },
});

export default STTScreen;
