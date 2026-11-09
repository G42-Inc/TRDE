import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../design/theme';
import { useTheme } from '../contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', size = 'md', style }: BadgeProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  const getVariantStyle = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: colors.success.bg,
          borderColor: colors.success.main + '40',
          color: colors.success.main,
        };
      case 'error':
        return {
          backgroundColor: colors.error.bg,
          borderColor: colors.error.main + '40',
          color: colors.error.main,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning.bg,
          borderColor: colors.warning.main + '40',
          color: colors.warning.main,
        };
      case 'info':
        return {
          backgroundColor: colors.info.bg,
          borderColor: colors.info.main + '40',
          color: colors.info.main,
        };
      case 'neutral':
        return {
          backgroundColor: themeColors.surfaceElevated,
          borderColor: themeColors.border,
          color: themeColors.textSecondary,
        };
      default:
        return {
          backgroundColor: themeColors.surfaceElevated,
          borderColor: themeColors.border,
          color: themeColors.text,
        };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xxs,
          fontSize: 10,
        };
      case 'lg':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: 14,
        };
      default:
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          fontSize: 12,
        };
    }
  };

  const variantStyle = getVariantStyle();
  const sizeStyle = getSizeStyle();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: variantStyle.color,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
