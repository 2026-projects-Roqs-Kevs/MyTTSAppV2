import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  useColorScheme,
} from 'react-native';

interface Props {
  onComplete: () => void;
}

const WelcomeScreen: React.FC<Props> = ({onComplete}) => {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Simulate initialization (services are already initializing in background)
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // 2 second minimum display time

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Logo placeholder - replace with actual logo later */}
      <View style={styles.logoContainer}>
        <Text style={[styles.logoText, isDarkMode && styles.textDark]}>🎤</Text>
      </View>

      <Text style={[styles.title, isDarkMode && styles.textDark]}>
        Welcome to EchoLinK
      </Text>

      <ActivityIndicator
        size="large"
        color={isDarkMode ? '#fff' : '#007AFF'}
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoText: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  textDark: {
    color: '#fff',
  },
  loader: {
    marginTop: 20,
  },
});

export default WelcomeScreen;
