import {NativeModules, NativeEventEmitter} from 'react-native';

const {Vosk} = NativeModules;
const voskEmitter = new NativeEventEmitter(Vosk);

type ModelKey = 'tl' | 'en';

class STTService {
  private isInitialized: boolean = false;
  private activeModel: ModelKey = 'tl';
  private listeners: any[] = [];
  private loadedModels: Set<ModelKey> = new Set();

  // ── Initialization ───────────────────────────────────────────────────────────

  /**
   * Load both models into memory at startup.
   * Primary model starts recognition immediately.
   * Secondary model sits in memory ready for fast switching.
   */
  async initialize(primaryModel: ModelKey = 'tl'): Promise<void> {
    try {
      const primaryPath = this.getModelPath(primaryModel);
      const secondaryModel: ModelKey = primaryModel === 'tl' ? 'en' : 'tl';
      const secondaryPath = this.getModelPath(secondaryModel);

      // Load both models in parallel
await this.loadModelByKey(primaryPath, primaryModel);
await this.loadModelByKey(secondaryPath, secondaryModel);

      this.activeModel = primaryModel;
      this.isInitialized = true;
      console.log('STTService: Both models loaded —', primaryModel, '(primary)', secondaryModel, '(secondary)');
    } catch (error) {
      console.error('STTService: Failed to initialize:', error);
      throw error;
    }
  }

  private async loadModelByKey(path: string, key: ModelKey): Promise<void> {
    try {
      await Vosk.loadModel(path, key);
      this.loadedModels.add(key);
      console.log(`STTService: Loaded model '${key}' from ${path}`);
    } catch (error) {
      console.error(`STTService: Failed to load model '${key}':`, error);
      throw error;
    }
  }

  private getModelPath(key: ModelKey): string {
    return key === 'tl' ? 'model-tl-ph' : 'model-en-us';
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getActiveModel(): ModelKey {
    return this.activeModel;
  }

  isModelLoaded(key: ModelKey): boolean {
    return this.loadedModels.has(key);
  }

  // ── Language switching ───────────────────────────────────────────────────────

  /**
   * Fast switch between loaded models (~200ms).
   * No unload/reload needed — both are already in memory.
   */
  async switchLanguage(modelKey: ModelKey): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('STTService not initialized.');
    }
    if (!this.loadedModels.has(modelKey)) {
      throw new Error(`Model '${modelKey}' is not loaded.`);
    }
    if (this.activeModel === modelKey) {
      console.log(`STTService: Already using model '${modelKey}', skipping switch.`);
      return;
    }

    try {
      await Vosk.switchActiveModel(modelKey);
      this.activeModel = modelKey;
      console.log(`STTService: Switched to model '${modelKey}'`);
    } catch (error) {
      console.error(`STTService: Failed to switch to model '${modelKey}':`, error);
      throw error;
    }
  }

  // ── Recognition ──────────────────────────────────────────────────────────────

  async startListening(
    onResult: (text: string) => void,
    onPartialResult?: (text: string) => void,
    onPitchDetected?: (pitch: number) => void,
    onTimeout?: () => void,
    noiseReduction: boolean = false,
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('STTService not initialized. Call initialize() first.');
    }

    try {
      this.removeListeners();

      const resultListener = voskEmitter.addListener(
        'onResult',
        (data: string) => {
          console.log('>>> onResult:', data);
          if (data) onResult(data);
        },
      );

      const finalResultListener = voskEmitter.addListener(
        'onFinalResult',
        (data: string) => {
          console.log('>>> onFinalResult:', data);
          if (data) onResult(data);
        },
      );

      if (onPartialResult) {
        const partialListener = voskEmitter.addListener(
          'onPartialResult',
          (data: string) => {
            if (data) onPartialResult(data);
          },
        );
        this.listeners.push(partialListener);
      }

      if (onPitchDetected) {
        const pitchListener = voskEmitter.addListener(
          'onPitchDetected',
          (data: string) => {
            const pitch = parseFloat(data);
            if (!isNaN(pitch) && pitch > 0) onPitchDetected(pitch);
          },
        );
        this.listeners.push(pitchListener);
      }

      if (onTimeout) {
        const timeoutListener = voskEmitter.addListener('onTimeout', () => {
          console.log('>>> Vosk timeout');
          onTimeout();
        });
        this.listeners.push(timeoutListener);
      }

      const errorListener = voskEmitter.addListener(
        'onError',
        (error: string) => {
          console.error('>>> Vosk error:', error);
        },
      );

      this.listeners.push(resultListener, finalResultListener, errorListener);

      console.log(`>>> Starting recognition with model: ${this.activeModel}`);
      await Vosk.startWithModel(this.activeModel, { noiseReduction });
      console.log('>>> Recognition started!');
    } catch (error) {
      console.error('>>> Error starting recognition:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      await Vosk.stop();
      this.removeListeners();
      console.log('STTService: Stopped listening');
    } catch (error) {
      console.error('STTService: Error stopping recognition:', error);
      throw error;
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  /**
   * Full cleanup — stops recognition and unloads all models.
   * Called on app close.
   */
  async cleanup(): Promise<void> {
    try {
      await Vosk.unload();
      this.removeListeners();
      this.isInitialized = false;
      this.loadedModels.clear();
      console.log('STTService: Full cleanup done');
    } catch (error) {
      console.error('STTService: Error during cleanup:', error);
    }
  }

  private removeListeners(): void {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
  }
}

export default new STTService();