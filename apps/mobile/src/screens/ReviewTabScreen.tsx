import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { JournalScreen } from './JournalScreen';
import { ReviewScreen } from './ReviewScreen';
import { colors as designColors, typography, spacing } from '../design/theme';

export function ReviewTabScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'journal' | 'calendar'>('journal');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Selector */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'journal' && { borderBottomColor: colors.text, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('journal')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'journal' ? colors.text : colors.textSecondary }
          ]}>
            Journal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'calendar' && { borderBottomColor: colors.text, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('calendar')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'calendar' ? colors.text : colors.textSecondary }
          ]}>
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'journal' ? (
          <JournalScreen />
        ) : (
          <ReviewScreen navigation={navigation} />
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
