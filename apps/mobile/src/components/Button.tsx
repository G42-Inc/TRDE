import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../design/theme';
import { useTheme } from '../contexts/ThemeContext';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    };

    // Size
    switch (size) {
      case 'sm':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case 'lg':
        baseStyle.paddingHorizontal = spacing.xxl;
        baseStyle.paddingVertical = spacing.lg;
        baseStyle.minHeight = 52;
        break;
      default:
        baseStyle.paddingHorizontal = spacing.lg;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 44;
    }

    // Variant
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = colors.accent.main;
        break;
      case 'secondary':
        baseStyle.backgroundColor = themeColors.surfaceElevated;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = themeColors.border;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1.5;
        baseStyle.borderColor = colors.accent.main;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.shadowOpacity = 0;
        baseStyle.elevation = 0;
        break;
      case 'danger':
        baseStyle.backgroundColor = colors.error.main;
        break;
    }

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    if (disabled || loading) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...typography.bodyBold,
    };

    switch (size) {
      case 'sm':
        baseTextStyle.fontSize = 13;
        break;
      case 'lg':
        baseTextStyle.fontSize = 16;
        break;
    }

    switch (variant) {
      case 'primary':
      case 'danger':
        baseTextStyle.color = '#FFFFFF';
        break;
      case 'secondary':
        baseTextStyle.color = themeColors.text;
        break;
      case 'outline':
        baseTextStyle.color = colors.primary[600];
        break;
      case 'ghost':
        baseTextStyle.color = colors.primary[600];
        break;
    }

    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.accent.main}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}
