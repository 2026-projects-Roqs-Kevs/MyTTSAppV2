import React, {useRef, useEffect} from 'react';
import {View, Text, StyleSheet, Image, Animated, Easing} from 'react-native';
import {useSettings} from '../context/SettingsContext';

const WelcomeScreen: React.FC = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const {effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/bglogo.png')}
          style={styles.logo}
        />
      </View>
      <Text style={[styles.title, isDarkMode && styles.textDark]}>
        Welcome to EchoLink
      </Text>
      <Animated.Image
        source={require('../../assets/loading-el.png')}
        style={[styles.loadingImage, {transform: [{rotate}]}]}
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
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
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
  loadingImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginTop: 20,
  },
});

export default WelcomeScreen;
