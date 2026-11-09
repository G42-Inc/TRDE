import React from 'react';
import { View, StyleSheet, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../design/designSystem';

interface GradientViewProps {
  colors?: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
  gradientKey?: keyof typeof gradients;
}

export function GradientView({ 
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style,
  children,
  gradientKey,
}: GradientViewProps) {
  const gradientColors = gradientKey ? gradients[gradientKey] : colors || gradients.primary;

  // Fallback to regular View if LinearGradient not available
  try {
    return (
      <LinearGradient
        colors={gradientColors as [ColorValue, ColorValue, ...ColorValue[]]}
        start={start}
        end={end}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  } catch {
    return (
      <View style={[style, { backgroundColor: gradientColors[0] }]}>
        {children}
      </View>
    );
  }
}
