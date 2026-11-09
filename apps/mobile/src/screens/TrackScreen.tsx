import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { TradesScreen } from './TradesScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { FAB } from '../components/FAB';
import { colors as designColors, typography, spacing } from '../design/theme';
import { lightHaptic } from '../lib/haptics';

export function TrackScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const initialTab = route?.params?.initialTab || 'trades';
  const [activeTab, setActiveTab] = useState<'trades' | 'analytics'>(initialTab);
  
  // Update tab when navigating with params
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Selector */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'trades' && { borderBottomColor: colors.text, borderBottomWidth: 2 }
          ]}
          onPress={() => { lightHaptic(); setActiveTab('trades'); }}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'trades' ? colors.text : colors.textSecondary }
          ]}>
            Trades
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'analytics' && { borderBottomColor: colors.text, borderBottomWidth: 2 }
          ]}
          onPress={() => { lightHaptic(); setActiveTab('analytics'); }}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'analytics' ? colors.text : colors.textSecondary }
          ]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'trades' ? (
          <TradesScreen navigation={navigation} />
        ) : (
          <AnalyticsScreen navigation={navigation} />
        )}
      </View>

      <FAB onPress={() => navigation.navigate('NewTrade')} />
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
