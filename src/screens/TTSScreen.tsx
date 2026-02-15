import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import ttsService from '../services/ttsService';

const TTSScreen = () => {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Set up TTS event listeners
    const startListener = ttsService.addListener('tts-start', () => {
      console.log('TTS started');
      setIsSpeaking(true);
    });

    const finishListener = ttsService.addListener('tts-finish', () => {
      console.log('TTS finished');
      setIsSpeaking(false);
    });

    const cancelListener = ttsService.addListener('tts-cancel', () => {
      console.log('TTS cancelled');
      setIsSpeaking(false);
    });

    // Cleanup listeners on unmount
    return () => {
      ttsService.removeListener(startListener);
      ttsService.removeListener(finishListener);
      ttsService.removeListener(cancelListener);
    };
  }, []);

  const handleSpeak = async () => {
    if (text.trim()) {
      try {
        await ttsService.speak(text);
      } catch (error) {
        console.error('Error speaking:', error);
        Alert.alert('Error', 'Failed to speak text');
        setIsSpeaking(false);
      }
    }
  };

  const handleStop = async () => {
    try {
      await ttsService.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping:', error);
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>      
      <TextInput
        style={[
          styles.textInput,
          isDarkMode && styles.textInputDark,
        ]}
        placeholder="Enter text to speak..."
        placeholderTextColor={isDarkMode ? '#999' : '#666'}
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={20}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.speakButton,
            isSpeaking && styles.buttonDisabled,
          ]}
          onPress={handleSpeak}
          disabled={isSpeaking || !text.trim()}
        >
          <Text style={styles.buttonText}>
            {isSpeaking ? 'Speaking...' : 'Speak'}
          </Text>
        </TouchableOpacity>

        {isSpeaking && (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStop}
          >
            <Text style={styles.buttonText}>Stop</Text>
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
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  textDark: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  textInputDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    color: '#fff',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  speakButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default TTSScreen;