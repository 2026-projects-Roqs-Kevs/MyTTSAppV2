import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import TTSScreen from './src/screens/TTSScreen';
import STTScreen from './src/screens/STTScreen';
import TranscribeScreen from './src/screens/TranscribeScreen';
import Icon from 'react-native-vector-icons/Ionicons';

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
          }}>
          <Tab.Screen
            name="Speech to Text"
            component={STTScreen}
            options={{
              tabBarLabel: 'Speech',
              tabBarIcon: ({color, size}) => (
                <Icon name="volume-high-sharp" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Saved Transcribed"
            component={TranscribeScreen}
            options={{
              tabBarLabel: 'Transcribe',
              tabBarIcon: ({color, size}) => (
                <Icon name="list-circle-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Text to Speech"
            component={TTSScreen}
            options={{
              tabBarLabel: 'Text',
              tabBarIcon: ({color, size}) => (
                <Icon name="pencil-outline" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
