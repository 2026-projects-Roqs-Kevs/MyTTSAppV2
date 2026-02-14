import Voice from '@react-native-voice/voice';

class STTService {
  private isInitialized: boolean = false;
  private currentLanguage: string = 'en-US';

  async initialize(language: string = 'en-US') {
    try {
      this.currentLanguage = language;
      
      // Check if speech recognition is available
      const available = await Voice.isAvailable();
      if (!available) {
        throw new Error('Speech recognition is not available on this device');
      }

      this.isInitialized = true;
      console.log('Voice STT initialized successfully with language:', language);
    } catch (error) {
      console.error('Error initializing Voice:', error);
      throw error;
    }
  }

  async switchLanguage(language: string) {
    try {
      this.currentLanguage = language;
      console.log('Switched to language:', language);
    } catch (error) {
      console.error('Error switching language:', error);
      throw error;
    }
  }

  async startListening(
    onResult: (text: string) => void,
    onPartialResult?: (text: string) => void
  ) {
    if (!this.isInitialized) {
      throw new Error('STT Service not initialized. Call initialize() first.');
    }

    try {
      // Set up event handlers
      Voice.onSpeechResults = (e: any) => {
        console.log('>>> onSpeechResults:', e.value);
        if (e.value && e.value.length > 0) {
          onResult(e.value[0]);
        }
      };

      if (onPartialResult) {
        Voice.onSpeechPartialResults = (e: any) => {
          console.log('>>> onSpeechPartialResults:', e.value);
          if (e.value && e.value.length > 0) {
            onPartialResult(e.value[0]);
          }
        };
      }

      Voice.onSpeechError = (e: any) => {
        console.error('>>> Speech recognition error:', e.error);
      };

      Voice.onSpeechEnd = () => {
        console.log('>>> Speech recognition ended');
      };

      console.log('>>> Starting speech recognition...');
      await Voice.start(this.currentLanguage);
      console.log('>>> Speech recognition started!');
    } catch (error) {
      console.error('>>> Error starting recognition:', error);
      throw error;
    }
  }

  async stopListening() {
    try {
      await Voice.stop();
      console.log('Stopped listening');
    } catch (error) {
      console.error('Error stopping recognition:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
      this.isInitialized = false;
      console.log('STT Service cleaned up');
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  }
}

export default new STTService();