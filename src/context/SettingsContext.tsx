import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import settingsService, {AppSettings} from '../services/settingsService';
import {Appearance} from 'react-native';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
  effectiveTheme: 'light' | 'dark';
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    textSize: 16,
    theme: 'system',
    autoStartRecording: false,
    language: 'tl',
    vibrateOnSpeech: false,
    singleSpeakerMode: true,
    noiseReduction: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      setSettings(prev => ({...prev}));
    });
    return () => sub.remove();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await settingsService.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (settings.theme === 'system') {
      return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    }
    return settings.theme;
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      await settingsService.updateSettings(newSettings);
      setSettings(prev => ({...prev, ...newSettings}));
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  const resetSettings = async () => {
    try {
      await settingsService.resetToDefaults();
      await loadSettings();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        isLoading,
        effectiveTheme: getEffectiveTheme(),
      }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
