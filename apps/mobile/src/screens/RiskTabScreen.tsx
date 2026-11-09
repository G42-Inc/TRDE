import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { StrategiesScreen } from './StrategiesScreen';
import { RiskScreen } from './RiskScreen';
import { colors as designColors, typography, spacing } from '../design/theme';

export function RiskTabScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'strategies' | 'risk'>('strategies');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Selector */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'strategies' && { borderBottomColor: colors.text, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('strategies')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'strategies' ? colors.text : colors.textSecondary }
          ]}>
            Strategies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'risk' && { borderBottomColor: colors.text, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('risk')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'risk' ? colors.text : colors.textSecondary }
          ]}>
            Risk
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'strategies' ? (
          <StrategiesScreen />
        ) : (
          <RiskScreen navigation={navigation} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
});
