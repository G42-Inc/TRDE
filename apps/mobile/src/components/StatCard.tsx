import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../design/theme';
import { useTheme } from '../contexts/ThemeContext';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  style?: ViewStyle;
}

export function StatCard({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon,
  variant = 'default',
  style,
}: StatCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return colors.success.main;
      case 'error':
        return colors.error.main;
      case 'warning':
        return colors.warning.main;
      case 'info':
        return colors.info.main;
      default:
        return colors.primary[500];
    }
  };

  const getVariantBg = () => {
    switch (variant) {
      case 'success':
        return colors.success.bg;
      case 'error':
        return colors.error.bg;
      case 'warning':
        return colors.warning.bg;
      case 'info':
        return colors.info.bg;
      default:
        return isDark ? themeColors.surfaceElevated : themeColors.surface;
    }
  };

  const getTrendColor = () => {
    if (!trend) return themeColors.textSecondary;
    return trend === 'up' ? colors.success.main : trend === 'down' ? colors.error.main : themeColors.textSecondary;
  };

  return (
    <View style={[styles.container, { backgroundColor: getVariantBg() }, style]}>
      <View style={styles.header}>
        <Text 
          style={[styles.label, { color: themeColors.textSecondary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {label}
        </Text>
        {icon && <View style={styles.icon}>{icon}</View>}
      </View>
      
      <View style={styles.valueContainer}>
        <Text 
          style={[styles.value, { color: themeColors.text }]} 
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
        {subValue && (
          <Text style={[styles.subValue, { color: themeColors.textTertiary }]} numberOfLines={1}>
            {subValue}
          </Text>
        )}
      </View>
      
      {trendValue && (
        <View style={styles.trendContainer}>
          <View style={[styles.trendBadge, { backgroundColor: getTrendColor() + '15' }]}>
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: 20,
    ...shadows.lg,
    minHeight: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    flex: 1,
  },
  label: {
    ...typography.captionBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flex: 1,
  },
  icon: {
    width: 20,
    height: 20,
  },
  valueContainer: {
    marginBottom: spacing.xs,
    flex: 1,
  },
  value: {
    ...typography.h2,
    fontSize: 28,
    marginBottom: spacing.xxs,
  },
  subValue: {
    ...typography.caption,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  trendText: {
    ...typography.captionBold,
  },
});
