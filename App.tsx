import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import STTScreen from './src/screens/STTScreen';
import TranscribeScreen from './src/screens/TranscribeScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import sttService from './src/services/sttService';
import settingsService from './src/services/settingsService';
import {SettingsProvider, useSettings} from './src/context/SettingsContext';
import WERMetricsScreen from './src/screens/WERMetricsScreen';
import taglishCorrectionService from './src/services/taglishCorrectionService';
import WordListScreen from './src/screens/WordListScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const {effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="STT"
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="STT" component={STTScreen} />
        <Stack.Screen
          name="Transcriptions"
          component={TranscribeScreen}
          options={{headerShown: true, title: 'Saved Transcriptions'}}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            headerShown: true,
            title: 'Settings',
            headerStyle: {
              backgroundColor: isDarkMode ? '#535B58' : '#ffffff',
            },
            headerTintColor: isDarkMode ? '#ffffff' : '#000000',
          }}
        />
        <Stack.Screen
          name="WERMetrics"
          component={WERMetricsScreen}
          options={{headerShown: true, title: 'WER Metrics'}}
        />
        <Stack.Screen
          name="WordList"
          component={WordListScreen}
          options={{
            headerShown: true,
            title: 'Word Lists',
            headerStyle: {
              backgroundColor: isDarkMode ? '#535B58' : '#ffffff',
            },
            headerTintColor: isDarkMode ? '#ffffff' : '#000000',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

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
      const primaryModel = savedSettings.language === 'en' ? 'en' : 'tl';
      await Promise.all([
        sttService.initialize(primaryModel),
        taglishCorrectionService.initialize(),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);
    } catch (error) {
      console.error('Failed to initialize services:', error);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsReady(true);
    }
  };

  return (
    <SettingsProvider>
      {!isReady ? <WelcomeScreen /> : <AppNavigator />}
    </SettingsProvider>
  );
}

export default App;
