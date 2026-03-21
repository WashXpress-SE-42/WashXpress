import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function SkeletonLoader({ width, height, borderRadius, style }: SkeletonLoaderProps) {
  const { isDark } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius !== undefined ? borderRadius : 8,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}
