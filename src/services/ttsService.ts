import Tts from 'react-native-tts';

class TTSService {
  constructor() {
    this.initTts();
  }

  async initTts() {
    try {
      // Initialize TTS
      await Tts.getInitStatus();
      
      // Set default language (you can change this)
      await Tts.setDefaultLanguage('en-US');
      
      // Set default speech rate (0.5 = slow, 1.0 = normal, 2.0 = fast)
      await Tts.setDefaultRate(0.5);
      
      // Set default pitch (0.5 = low, 1.0 = normal, 2.0 = high)
      await Tts.setDefaultPitch(1.0);

      console.log('TTS initialized successfully');
    } catch (error) {
      console.error('Error initializing TTS:', error);
    }
  }

  async speak(text: string) {
    try {
      await Tts.speak(text);
    } catch (error) {
      console.error('Error speaking:', error);
      throw error;
    }
  }

  async stop() {
    try {
      await Tts.stop();
    } catch (error) {
      console.error('Error stopping TTS:', error);
      throw error;
    }
  }

  async pause() {
    try {
      await Tts.pause();
    } catch (error) {
      console.error('Error pausing TTS:', error);
      throw error;
    }
  }

  async resume() {
    try {
      await Tts.resume();
    } catch (error) {
      console.error('Error resuming TTS:', error);
      throw error;
    }
  }

  // Get available voices
  async getVoices() {
    try {
      const voices = await Tts.voices();
      return voices;
    } catch (error) {
      console.error('Error getting voices:', error);
      return [];
    }
  }

  // Set speech rate (0.01 to 0.99)
  async setRate(rate: number) {
    try {
      await Tts.setDefaultRate(rate);
    } catch (error) {
      console.error('Error setting rate:', error);
    }
  }

  // Set pitch (0.5 to 2.0)
  async setPitch(pitch: number) {
    try {
      await Tts.setDefaultPitch(pitch);
    } catch (error) {
      console.error('Error setting pitch:', error);
    }
  }

  // Set language
  async setLanguage(language: string) {
    try {
      await Tts.setDefaultLanguage(language);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  }

  // Add event listeners
  addListener(event: string, callback: (event: any) => void) {
    return Tts.addEventListener(event, callback);
  }

  // Remove event listener
  removeListener(subscription: any) {
    if (subscription) {
      subscription.remove();
    }
  }
}

export default new TTSService();