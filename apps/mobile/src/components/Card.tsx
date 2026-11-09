import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../design/theme';
import { useTheme } from '../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', padding = 'lg', style }: CardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: themeColors.surfaceElevated,
          ...shadows.lg,
        };
      case 'outlined':
        return {
          backgroundColor: themeColors.surface,
          borderWidth: 1,
          borderColor: themeColors.border,
        };
      default:
        return {
          backgroundColor: themeColors.surface,
          borderWidth: 1,
          borderColor: themeColors.border,
          ...shadows.md,
        };
    }
  };

  return (
    <View
      style={[
        styles.card,
        getVariantStyle(),
        { padding: spacing[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
  },
});
