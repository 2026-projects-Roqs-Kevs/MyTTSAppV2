import { NativeModules, NativeEventEmitter } from 'react-native';

const { Vosk } = NativeModules;
const voskEmitter = new NativeEventEmitter(Vosk);

let currentModel: string = 'model-en-us';

class STTService {
  private isInitialized: boolean = false;
  private listeners: any[] = [];

  async initialize(modelPath: string) {
    try {
      await Vosk.loadModel(modelPath);
      currentModel = modelPath;
      this.isInitialized = true;
      console.log('Vosk STT initialized successfully with model:', modelPath);
    } catch (error) {
      console.error('Error initializing Vosk:', error);
      throw error;
    }
  }

  async switchLanguage(modelPath: string) {
    try {
      await this.cleanup();
      await this.initialize(modelPath);
      console.log('Switched to model:', modelPath);
    } catch (error) {
      console.error('Error switching language:', error);
      throw error;
    }
  }

  async startListening(
    onResult: (text: string) => void,
    onPartialResult?: (text: string) => void,
    onPitchDetected?: (pitch: number) => void  // NEW
  ) {
    if (!this.isInitialized) {
      throw new Error('STT Service not initialized. Call initialize() first.');
    }

    try {
      this.removeListeners();

      const resultListener = voskEmitter.addListener('onResult', (data: string) => {
        console.log('>>> onResult:', data);
        if (data) {
          onResult(data);
        }
      });

      const finalResultListener = voskEmitter.addListener('onFinalResult', (data: string) => {
        console.log('>>> onFinalResult:', data);
        if (data) {
          onResult(data);
        }
      });

      if (onPartialResult) {
        const partialListener = voskEmitter.addListener('onPartialResult', (data: string) => {
          console.log('>>> onPartialResult:', data);
          if (data) {
            onPartialResult(data);
          }
        });
        this.listeners.push(partialListener);
      }

      // NEW — listen to pitch detection events
      if (onPitchDetected) {
        const pitchListener = voskEmitter.addListener('onPitchDetected', (data: string) => {
          console.log('>>> onPitchDetected raw:', data); // ADD THIS
          const pitch = parseFloat(data);
          if (!isNaN(pitch) && pitch > 0) {
            console.log('>>> pitch value:', pitch); // ADD THIS
            onPitchDetected(pitch);
          }
        });
        this.listeners.push(pitchListener);
      }

      const errorListener = voskEmitter.addListener('onError', (error: string) => {
        console.error('>>> Vosk error:', error);
      });

      const timeoutListener = voskEmitter.addListener('onTimeout', () => {
        console.log('>>> Vosk timeout');
      });

      this.listeners.push(
        resultListener,
        finalResultListener,
        errorListener,
        timeoutListener
      );

      console.log('>>> Starting recognition...');
      await Vosk.start(null);
      console.log('>>> Recognition started!');
    } catch (error) {
      console.error('>>> Error starting recognition:', error);
      throw error;
    }
  }

  async stopListening() {
    try {
      await Vosk.stop();
      this.removeListeners();
      console.log('Stopped listening');
    } catch (error) {
      console.error('Error stopping recognition:', error);
      throw error;
    }
  }

  private removeListeners() {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
  }

  async cleanup() {
    try {
      await Vosk.unload();
      this.removeListeners();
      this.isInitialized = false;
      console.log('STT Service cleaned up');
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  }
}

export default new STTService();