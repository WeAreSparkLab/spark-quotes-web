// components/common/Starfield.tsx

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CENTER = { x: width / 2, y: height / 2 };

// Define the types for the props
interface StarProps {
  speed: 'fast' | 'slow';
}

interface StarfieldProps {
  speed?: 'fast' | 'slow';
  starCount?: number;
}

// --- Floating Star Component (Warp Speed Effect) ---
const Star = ({ speed }: StarProps) => {
  const animation = useSharedValue(0);

  const { angle, duration } = useMemo(() => {
    const baseDuration = speed === 'fast' ? 4000 : 20000;
    const randomDuration = speed === 'fast' ? 5000 : 15000;
    return {
      angle: Math.random() * 360,
      duration: Math.random() * randomDuration + baseDuration,
    };
  }, [speed]);

  useEffect(() => {
    animation.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(animation.value, [0, 1], [0, width / 1.5 * Math.cos(angle)]);
    const translateY = interpolate(animation.value, [0, 1], [0, height / 1.5 * Math.sin(angle)]);
    const scale = interpolate(animation.value, [0, 1], [0, 2]);
    const opacity = interpolate(animation.value, [0, 0.8, 1], [1, 1, 0]);

    return {
      transform: [
          { translateX: CENTER.x + translateX },
          { translateY: CENTER.y + translateY },
          { scale }
      ],
      opacity,
      height: 2,
      width: 2,
      backgroundColor: 'white',
      borderRadius: 1,
      position: 'absolute',
    };
  });

  return <Animated.View style={animatedStyle} />;
};

// --- Starfield Container ---
const Starfield = ({ speed = 'fast', starCount = 100 }: StarfieldProps) => {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      {Array.from({ length: starCount }).map((_, i) => (
        <Star key={i} speed={speed} />
      ))}
    </View>
  );
};

export default Starfield;
