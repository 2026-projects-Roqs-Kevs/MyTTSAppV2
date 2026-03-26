import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import STTScreen from './src/screens/STTScreen';
import TTSScreen from './src/screens/TTSScreen';
import TranscribeScreen from './src/screens/TranscribeScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import sttService from './src/services/sttService';
import settingsService from './src/services/settingsService';
import {SettingsProvider} from './src/context/SettingsContext';
import WERMetricsScreen from './src/screens/WERMetricsScreen';
import taglishCorrectionService from './src/services/taglishCorrectionService';
import WordListScreen from './src/screens/WordListScreen';

const Stack = createNativeStackNavigator();

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeServices();
    return () => {
      sttService.cleanup();
    };
  }, []);

  const initializeServices = async () => {
    try {
      const savedSettings = await settingsService.getSettings();
      const modelPath =
        savedSettings.language === 'en' ? 'model-en-us' : 'model-tl-ph';

      // Wait for BOTH minimum 2 seconds AND Vosk to initialize
      await Promise.all([
        sttService.initialize(modelPath),
        taglishCorrectionService.initialize(),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);
    } catch (error) {
      console.error('Failed to initialize services:', error);
      // Still wait minimum 2 seconds even on error
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsReady(true);
    }
  };

  return (
    <SettingsProvider>
      {!isReady ? (
        <WelcomeScreen />
      ) : (
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="STT"
            screenOptions={{
              headerShown: false,
            }}>
            <Stack.Screen name="STT" component={STTScreen} />
            <Stack.Screen
              name="Transcriptions"
              component={TranscribeScreen}
              options={{headerShown: true, title: 'Saved Transcriptions'}}
            />
            <Stack.Screen name="TTS" component={TTSScreen} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{headerShown: true, title: 'Settings'}}
            />
            {/* ✅ MOVE IT HERE — inside Stack.Navigator, before the closing tag */}
            <Stack.Screen
              name="WERMetrics"
              component={WERMetricsScreen}
              options={{headerShown: true, title: 'WER Metrics'}}
            />
            <Stack.Screen
              name="WordList"
              component={WordListScreen}
              options={{headerShown: true, title: 'Word List'}}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SettingsProvider>
  );
}

export default App;
