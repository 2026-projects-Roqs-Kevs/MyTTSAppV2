import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import sttService from '../services/sttService';
import Icon from 'react-native-vector-icons/Ionicons';

const STTScreen = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const isDarkMode = useColorScheme() === 'dark';
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'tl'>('tl');

  useEffect(() => {
    // Initialize Voice on component mount
    const initializeVoice = async () => {
      try {
        setIsInitializing(true);
        await sttService.initialize('model-tl-ph');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Voice:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize speech recognition.'
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initializeVoice();

    // Cleanup on unmount
    return () => {
      sttService.cleanup();
    };
  }, []);

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
          }
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
      Alert.alert('Permission Denied', 'Microphone permission is required for speech recognition');
      return;
    }

    try {
      setIsListening(true);
      setTranscribedText('');
      setPartialText('');

      await sttService.startListening(
        // On final result
        (text) => {
          setTranscribedText(prev => prev ? `${prev} ${text}` : text);
          setPartialText('');
        },
        // On partial result
        (text) => {
          setPartialText(text);
        }
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

  const handleSwitchLanguage = async () => {
    if (isListening || isInitializing) return;

    try {
      setIsInitializing(true);
      const newLang = currentLanguage === 'en' ? 'tl' : 'en';
      const modelPath = newLang === 'en' ? 'model-en-us' : 'model-tl-ph';
      
      await sttService.switchLanguage(modelPath);
      setCurrentLanguage(newLang);
      Alert.alert('Success', `Switched to ${newLang === 'en' ? 'English' : 'Tagalog'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch language');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.flexRow]}>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>
          Switch Button:
        </Text>

        <TouchableOpacity
          style={[styles.languageButton, isDarkMode && styles.languageButtonDark]}
          onPress={handleSwitchLanguage}
          disabled={isListening || isInitializing}
        >
          <Text style={[styles.languageButtonText, isDarkMode && styles.textDark]}>
            {isInitializing ? 'Loading...' : `Language: ${currentLanguage === 'en' ? 'English 🇺🇸' : 'Tagalog 🇵🇭'}`}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.flexRow}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            isListening && styles.statusIndicatorActive,
          ]} />
          <Text style={[styles.statusText, isDarkMode && styles.textDark]}>
            {isListening ? 'Listening...' : 'Ready'}
          </Text>
        </View>
        <View style={[styles.statusContainer, {gap: 5}]}>
          <Icon name='information-circle-outline' size={16} color="#3ba7ff" />
          <Text style={[styles.statusText, isDarkMode && styles.textDark, {fontSize: 12}]}>
            Speak loudly and clearly
          </Text>
        </View>
      </View>

      <ScrollView
        style={[styles.textContainer, isDarkMode && styles.textContainerDark]}
        contentContainerStyle={styles.textContent}
      >
        <Text style={[styles.transcribedText, isDarkMode && styles.textDark]}>
          {transcribedText || '...'}
        </Text>
        {partialText && (
          <Text style={[styles.partialText, isDarkMode && styles.partialTextDark]}>
            {partialText}
          </Text>
        )}
      </ScrollView>
      <View style={styles.buttonContainer}>
      {!isListening ? (
        <TouchableOpacity
          style={[
            styles.button, 
            styles.startButton,
            (isInitializing || !isInitialized) && styles.buttonDisabled
          ]}
          onPress={handleStartListening}
          disabled={isInitializing || !isInitialized}
        >
          <View style={styles.buttonContent}>
            <Icon name="mic-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>
              {isInitializing ? 'Initializing...' : 'Start Recording'}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={handleStopListening}
        >
          <View style={styles.buttonContent}>
            <Icon name="stop-circle-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Stop Recording</Text>
          </View>
        </TouchableOpacity>
      )}

        {transcribedText && !isListening && (
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
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
    color: '#666',
  },
  textContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
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
    color: '#666',
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
});

export default STTScreen;