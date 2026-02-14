import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TTSScreen from './src/screens/TTSScreen';
import STTScreen from './src/screens/STTScreen';

const Tab = createBottomTabNavigator();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
              borderTopColor: isDarkMode ? '#333' : '#ddd',
            },
            headerStyle: {
              backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
            },
            headerTintColor: isDarkMode ? '#fff' : '#000',
          }}
        >
          <Tab.Screen
            name="Text to Speech"
            component={TTSScreen}
            options={{
              tabBarLabel: 'TTS',
              tabBarIcon: () => null, // You can add icons later if you want
            }}
          />
          <Tab.Screen
            name="Speech to Text"
            component={STTScreen}
            options={{
              tabBarLabel: 'STT',
              tabBarIcon: () => null, // You can add icons later if you want
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;