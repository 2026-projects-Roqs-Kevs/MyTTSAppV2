import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import sttService from '../services/sttService';
import Icon from 'react-native-vector-icons/Ionicons';
import storageService from '../services/storageService';
import {useNavigation} from '@react-navigation/native';
import {useSettings} from '../context/SettingsContext';
import KeepAwake from 'react-native-keep-awake';
import speakerDetectionService from '../services/speakerDetectionService';

const STTScreen = () => {
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [isInitialized, setIsInitialized] = useState(true);
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
    // Initialize Voice on component mount
    const initializeVoice = async () => {
      // try {
      //   setIsInitializing(true);
      //   await sttService.initialize('model-tl-ph');
      //   setIsInitialized(true);
      // } catch (error) {
      //   console.error('Failed to initialize Voice:', error);
      //   Alert.alert(
      //     'Initialization Error',
      //     'Failed to initialize speech recognition.',
      //   );
      // } finally {
      //   setIsInitializing(false);
      // }
    };

    initializeVoice();

    // Cleanup on unmount
    return () => {
      sttService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (settings.autoStartRecording && isInitialized && !isListening) {
      handleStartListening();
    }
  }, [settings.autoStartRecording, isInitialized]);

  useEffect(() => {
    // Switch language model when settings change
    const switchToSettingsLanguage = async () => {
      if (settings.language !== currentLanguage && !isListening) {
        try {
          setIsInitializing(true);
          const modelPath =
            settings.language === 'en' ? 'model-en-us' : 'model-tl-ph';
          await sttService.switchLanguage(modelPath);
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

  const handleStartListening = async () => {
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
      if (!settings.singleSpeakerMode) {
        speakerDetectionService.reset();
      }
      await sttService.startListening(
        text => {
          if (singleSpeakerModeRef.current) {
            const detection = speakerDetectionService.detectSpeakerChange(text);
            // Only transcribe if it's still person 1
            if (detection.speaker === 1) {
              setTranscribedText(prev => (prev ? `${prev} ${text}` : text));
            }
            // silently ignore person 2
          } else {
            // Multi-speaker mode — existing logic
            const detection = speakerDetectionService.detectSpeakerChange(text);
            const labeledText = `[Person ${detection.speaker}] ${text}`;
            setTranscribedText(prev => {
              if (!prev) return labeledText;
              if (detection.changed) {
                return `${prev}\n\n${labeledText}`;
              } else {
                return `${prev} ${text}`;
              }
            });
          }
          setPartialText('');
        },
        text => {
          setPartialText(text);
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
      );
    } catch (error) {
      console.error('Error starting listening:', error);
      Alert.alert('Error', 'Failed to start listening');
      setIsListening(false);
    }
  };

  const handleStopListening = async () => {
    try {
      await sttService.stopListening();
      setIsListening(false);
      setPartialText('');
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

  const handleSave = async () => {
    if (transcribedText) {
      try {
        await storageService.saveText(transcribedText, currentLanguage);
        Alert.alert('Success', 'Text saved successfully!');
        setTranscribedText('');
      } catch (error) {
        Alert.alert('Error', 'Failed to save text');
      }
    }
  };

  const handleSwitchLanguage = async () => {
    if (isListening || isInitializing) return;

    try {
      setIsInitializing(true);
      const newLang = currentLanguage === 'en' ? 'tl' : 'en';
      const modelPath = newLang === 'en' ? 'model-en-us' : 'model-tl-ph';

      await sttService.switchLanguage(modelPath);
      setCurrentLanguage(newLang);
      Alert.alert(
        'Success',
        `Switched to ${newLang === 'en' ? 'English' : 'Tagalog'}`,
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to switch language');
    } finally {
      setIsInitializing(false);
    }
  };

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
            <Icon name="mic" size={64} color="#34C759" />
          </TouchableOpacity>
          <Text style={[styles.idleText, isDarkMode && styles.textDark]}>
            {isInitializing ? 'Initializing...' : 'Ready to transcribe'}
          </Text>
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
          <TouchableOpacity
            style={styles.settingsIcon}
            onPress={() => navigation.navigate('Settings' as never)}>
            <Icon
              name="settings-outline"
              size={28}
              color={isDarkMode ? '#fff' : '#333'}
            />
          </TouchableOpacity>

          {/* TOP PANEL — partialText */}
          <View style={{flex: topPanelFlex}}>
            {/* <Text style={[styles.statusLabel, isDarkMode && styles.textDark]}>
              {isListening ? 'Listening...' : 'Ready'}
            </Text> */}
            <ScrollView
              style={[
                styles.textContainer,
                isDarkMode && styles.textContainerDark,
              ]}
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

          {/* DIVIDER */}
          <View {...panResponder.panHandlers} style={styles.divider}>
            <View style={{width: 100}}></View>
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
                {isInitializing
                  ? 'Initializing...'
                  : isListening
                  ? 'Stop'
                  : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* BOTTOM PANEL — transcribedText (editable) + start/stop button */}
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
              placeholder="Transcribed text will appear here..."
              placeholderTextColor={isDarkMode ? '#827e7e' : '#aaa'}
            />
          </View>

          {/* ACTION BUTTONS — only when stopped and has text */}
          {!isListening && transcribedText ? (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.actionButton, styles.saveButton]}
                onPress={handleSave}>
                <View style={styles.buttonContent}>
                  <Icon name="save-outline" size={20} color="#34C759" />
                  <Text
                    style={[styles.actionButtonText, styles.saveButtonText]}>
                    Save
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.actionButton, styles.copyButton]}
                onPress={handleCopy}>
                <View style={styles.buttonContent}>
                  <Icon name="copy-outline" size={20} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Copy</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.actionButton, styles.clearButton]}
                onPress={handleClear}>
                <View style={styles.buttonContent}>
                  <Icon name="trash-outline" size={20} color="#FF3B30" />
                  <Text
                    style={[styles.actionButtonText, styles.clearButtonText]}>
                    Clear
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textContainerDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
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
    paddingTop: 8,
    gap: 12,
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
    padding: 24,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#34C759',
  },
  activeContainer: {
    flex: 1,
    paddingTop: 35,
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
    marginVertical: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
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
});

export default STTScreen;
