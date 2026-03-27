import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  textSize: number; // 12-24
  theme: 'light' | 'system' | 'dark';
  autoStartRecording: boolean;
  language: 'en' | 'tl';
  vibrateOnSpeech: boolean;
  singleSpeakerMode: boolean;
  noiseReduction: boolean;
}

const SETTINGS_KEY = '@app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  textSize: 16,
  theme: 'system',
  autoStartRecording: false,
  language: 'tl',
  vibrateOnSpeech: false,
  singleSpeakerMode: true,
  noiseReduction: false, 
};

class SettingsService {
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  async resetToDefaults(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }
}

export default new SettingsService();