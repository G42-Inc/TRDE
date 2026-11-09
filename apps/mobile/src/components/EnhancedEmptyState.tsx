import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from './Button'
import { typography, spacing } from '../design/theme'

interface EnhancedEmptyStateProps {
  icon: React.ReactNode
  title: string
  message: string
  bulletPoints?: string[]
  primaryAction: { label: string; onPress: () => void }
  secondaryAction?: { label: string; onPress: () => void }
}

export function EnhancedEmptyState({
  icon,
  title,
  message,
  bulletPoints,
  primaryAction,
  secondaryAction,
}: EnhancedEmptyStateProps) {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceElevated }]}>
        {icon}
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      
      {bulletPoints && bulletPoints.length > 0 && (
        <View style={styles.bulletContainer}>
          {bulletPoints.map((point, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: colors.textTertiary }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{point}</Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.actions}>
        <Button onPress={primaryAction.onPress} fullWidth>
          {primaryAction.label}
        </Button>
        {secondaryAction && (
          <Button onPress={secondaryAction.onPress} variant="secondary" fullWidth>
            {secondaryAction.label}
          </Button>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  bulletContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  bullet: {
    ...typography.body,
    marginRight: spacing.sm,
  },
  bulletText: {
    ...typography.body,
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
})
