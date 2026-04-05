import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Animated} from 'react-native';

interface WaveformViewProps {
  isActive: boolean;
  color?: string;
  amplitude: number;
  barCount?: number;
  height?: number;
}

const WaveformView: React.FC<WaveformViewProps> = ({
  isActive,
  color = '#34C759',
  amplitude,
  barCount = 20,
  height = 60,
}) => {
  const animatedValues = useRef(
    Array.from({length: barCount}, () => new Animated.Value(0.1)),
  ).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const idleAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Idle animation — gentle wave when no sound
  const startIdleAnimation = () => {
    const animations = animatedValues.map((val, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 50),
          Animated.timing(val, {
            toValue: 0.15 + Math.random() * 0.1,
            duration: 800 + index * 40,
            useNativeDriver: false,
          }),
          Animated.timing(val, {
            toValue: 0.05,
            duration: 800 + index * 40,
            useNativeDriver: false,
          }),
        ]),
      );
    });
    idleAnimationRef.current = Animated.parallel(animations);
    idleAnimationRef.current.start();
  };

  const stopIdleAnimation = () => {
    idleAnimationRef.current?.stop();
    idleAnimationRef.current = null;
  };

  // React to real amplitude changes
  useEffect(() => {
    if (!isActive) return;

    stopIdleAnimation();

    // Normalize amplitude (0-100) to bar heights
    const normalizedAmp = amplitude / 100;

    // Animate each bar to a random height proportional to amplitude
    const animations = animatedValues.map(val => {
      const randomFactor = 0.3 + Math.random() * 0.7;
      const targetHeight = Math.max(0.05, normalizedAmp * randomFactor);
      return Animated.timing(val, {
        toValue: targetHeight,
        duration: 80,
        useNativeDriver: false,
      });
    });

    animationRef.current = Animated.parallel(animations);
    animationRef.current.start();
  }, [amplitude, isActive]);

  // Start idle animation when component mounts
  useEffect(() => {
    if (isActive) {
      startIdleAnimation();
    }
    return () => {
      stopIdleAnimation();
      animationRef.current?.stop();
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <View style={[styles.container, {height}]}>
      {animatedValues.map((val, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: val.interpolate({
                inputRange: [0, 1],
                outputRange: [2, height],
              }),
              opacity: val.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 20,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
});

export default WaveformView;
