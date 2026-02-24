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

const Stack = createNativeStackNavigator();

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // Load saved settings to get the language
      const savedSettings = await settingsService.getSettings();
      const modelPath =
        savedSettings.language === 'en' ? 'model-en-us' : 'model-tl-ph';

      // Initialize STT with saved language
      await sttService.initialize(modelPath);

      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize services:', error);
      setIsReady(true);
    }
  };

  return (
    <SettingsProvider>
      {!isReady ? (
        <WelcomeScreen onComplete={() => setIsReady(true)} />
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
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SettingsProvider>
  );
}

export default App;
