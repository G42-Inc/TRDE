import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { resetData } from '../lib/init';
import { exportTradesToCsv, exportWeeklyReportText } from '@trde/mock-db';
import { useStorage } from '../contexts/StorageContext';
import { debugApiConnection } from '../lib/storage.db';
import { useTheme } from '../contexts/ThemeContext';
import { Badge } from '../components/Badge';
import { colors as designColors, typography, spacing, borderRadius, shadows } from '../design/theme';

export function SettingsScreen() {
  const { theme, toggleTheme, colors } = useTheme();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { 
    trades, 
    strategies,
    collections,
    dailyBiases,
    quickJournals,
    journals,
    weeklyReviews, 
    todos,
    ruleViolations,
    dashboardMetrics, 
    syncFromCloud, 
    migrateLocalToCloud, 
    isSyncing, 
    lastSyncTime, 
    syncError, 
    needsMigration 
  } = useStorage();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out & Clear Session',
      'This will completely clear your Clerk session. You\'ll need to sign in again with the correct account.\n\nThis fixes user ID mismatches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all possible Clerk keys from SecureStore
              // Clerk Expo uses various keys for session storage
              const clerkKeys = [
                '__clerk_client_jwt',
                '__clerk_db_jwt',
                '__clerk_refresh_token',
                '__clerk_session',
                '__clerk_session_token',
                '__session',
                '__client',
                '__clerk',
              ];
              
              console.log('[SignOut] Clearing Clerk session data...');
              
              // Try to delete all possible Clerk keys
              for (const key of clerkKeys) {
                try {
                  await SecureStore.deleteItemAsync(key);
                  console.log('[SignOut] Deleted key:', key);
                } catch (e) {
                  // Ignore errors for keys that don't exist
                }
              }
              
              // Also try to clear all keys (if SecureStore supports it)
              // Note: SecureStore doesn't have a "getAllKeys" method, so we clear known keys
              
              // Sign out from Clerk (this should also clear the session)
              try {
                await signOut();
                console.log('[SignOut] Clerk signOut() completed');
              } catch (signOutError) {
                console.log('[SignOut] signOut() error (may be expected):', signOutError);
                // Continue anyway - we've cleared SecureStore
              }
              
              Alert.alert(
                'Session Cleared', 
                'All session data has been cleared.\n\nPlease sign in again with your web account email.\n\nAfter signing in, tap Debug to verify the user IDs match.'
              );
            } catch (error: any) {
              console.error('[SignOut] Error:', error);
              Alert.alert('Error', 'Failed to clear session: ' + (error?.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    try {
      await syncFromCloud();
      
      Alert.alert(
        'Sync Complete', 
        `All data has been synced from cloud:\n\n` +
        `• Trades\n` +
        `• Trade Journals (pre/post notes)\n` +
        `• Daily Biases\n` +
        `• Quick Journal Notes\n` +
        `• Weekly Reviews\n` +
        `• Strategies & Collections\n` +
        `• Todos & Settings\n\n` +
        `Check the "Synced Data" counts below to see totals.\n\n` +
        `If data is missing, ensure you're using the same account on web and mobile.`
      );
    } catch (error: any) {
      Alert.alert('Sync Failed', error?.message || syncError || 'Failed to sync with cloud. Check your internet connection and try again.');
    }
  };

  const handleDebug = async () => {
    try {
      const debug = await debugApiConnection();
      const clientId = debug.userId || 'none';
      const serverId = debug.response?.serverUserId || 'none';
      const idsMatch = clientId === serverId ? 'YES' : 'NO';
      const userIdMatches = debug.response?.userIdMatches ?? false;
      const userTradeCounts = debug.response?.userTradeCounts || [];
      
      const tradeCountsText = userTradeCounts.length > 0 
        ? userTradeCounts.slice(0, 5).join('\n') + (userTradeCounts.length > 5 ? '\n...' : '')
        : 'None found';
      
      Alert.alert(
        'API Debug Info',
        `Status: ${debug.status}\n` +
        `Trades Found: ${debug.response?.tradesCount ?? 'error'}\n\n` +
        `Mobile User ID:\n${clientId}\n\n` +
        `Server User ID:\n${serverId}\n\n` +
        `IDs Match: ${idsMatch}\n` +
        `User ID in DB: ${userIdMatches ? 'YES' : 'NO'}\n\n` +
        `User IDs & Trade Counts:\n${tradeCountsText}\n\n` +
        `Your ID ends: ${clientId.slice(-4)}`
      );
      // Also log full details to console
      console.log('[Debug] Full info:', JSON.stringify(debug, null, 2));
    } catch (error: any) {
      Alert.alert('Debug Error', error.message);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const date = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const handleExportCsv = async () => {
    try {
      const csv = exportTradesToCsv(trades);
      Alert.alert('Export CSV', `CSV generated (${trades.length} trades). In production, this would download/share the file.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  const handleExportWeeklyReport = async () => {
    try {
      const lastReview = weeklyReviews[weeklyReviews.length - 1];
      const weekStart = lastReview
        ? lastReview.weekStart
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const weekEnd = lastReview
        ? lastReview.weekEnd
        : new Date().toISOString().split('T')[0];

      const report = exportWeeklyReportText(weekStart, weekEnd, trades, lastReview);
      Alert.alert('Export Weekly Report', 'Weekly report generated. In production, this would download/share the file.');
    } catch (error) {
      Alert.alert('Error', 'Failed to export weekly report');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Data',
      'This will reset all your data and reload the demo dataset. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetData();
              Alert.alert('Success', 'Data has been reset. Restart the app to see changes.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset data');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Account Card */}
        <View style={[styles.accountCard, { backgroundColor: colors.surface }]}>
          {user ? (
            <>
              <View style={[styles.avatar, { backgroundColor: colors.text }]}>
                <Text style={[styles.avatarText, { color: colors.background }]}>
                  {user.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={[styles.accountEmail, { color: colors.text }]}>
                {user.emailAddresses?.[0]?.emailAddress}
              </Text>
              <Badge size="sm" variant="success">Synced</Badge>
              
              <TouchableOpacity
                style={[styles.signOutButton, { backgroundColor: colors.surfaceElevated }]}
                onPress={handleSignOut}
                activeOpacity={0.8}
              >
                <Text style={[styles.signOutText, { color: colors.text }]}>Sign Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.avatarText, { color: colors.textSecondary }]}>?</Text>
              </View>
              <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>Not signed in</Text>
            </>
          )}
        </View>

        {/* Cloud Sync Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>CLOUD SYNC</Text>
          
          <View style={[styles.syncCard, { backgroundColor: colors.surface }]}>
            <View style={styles.syncInfo}>
              <Text style={[styles.syncLabel, { color: colors.text }]}>
                {isSyncing ? 'Syncing...' : 'Sync with trde.app'}
              </Text>
              <Text style={[styles.syncStatus, { color: syncError ? designColors.semantic.error : colors.textTertiary }]}>
                {syncError ? syncError : `Last sync: ${formatLastSync()}`}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.debugButton, { borderColor: colors.border }]}
              onPress={handleDebug}
              activeOpacity={0.8}
            >
              <Text style={[styles.debugButtonText, { color: colors.textSecondary }]}>
                Debug
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: colors.text }]}
              onPress={handleSync}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              <Text style={[styles.syncButtonText, { color: colors.background }]}>
                {isSyncing ? '...' : 'Sync'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Stats Grid */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsTitle, { color: colors.textSecondary }]}>Synced Data</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{trades.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Trades</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{journals.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Journals</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{dailyBiases.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Biases</Text>
            </View>
          </View>
          <View style={[styles.statsGrid, { marginTop: spacing.sm }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{quickJournals.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Notes</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{weeklyReviews.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Reviews</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{strategies.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Strategies</Text>
            </View>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>PREFERENCES</Text>
          
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.surface }]}
            activeOpacity={1}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>
                Use dark color scheme
              </Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.text }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Export Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>EXPORT</Text>
          
          <TouchableOpacity
            style={[styles.actionRow, { backgroundColor: colors.surface }]}
            onPress={handleExportCsv}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: colors.text }]}>Export Trades as CSV</Text>
            <Text style={[styles.actionArrow, { color: colors.textTertiary }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { backgroundColor: colors.surface }]}
            onPress={handleExportWeeklyReport}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: colors.text }]}>Export Weekly Report</Text>
            <Text style={[styles.actionArrow, { color: colors.textTertiary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionHeader, { color: designColors.semantic.error }]}>DANGER ZONE</Text>
          
          <View style={[styles.dangerCard, { backgroundColor: colors.surface, borderColor: designColors.semantic.error }]}>
            <Text style={[styles.dangerTitle, { color: colors.text }]}>Reset All Data</Text>
            <Text style={[styles.dangerDesc, { color: colors.textSecondary }]}>
              Delete all trades, journals, and settings. Reload demo dataset. Cannot be undone.
            </Text>
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: designColors.semantic.error }]}
              onPress={handleReset}
              activeOpacity={0.85}
            >
              <Text style={styles.dangerButtonText}>Reset Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textTertiary }]}>TRDE Mobile v1.0.0</Text>
          <Text style={[styles.appInfoText, { color: colors.textTertiary }]}>© 2026 TRDE</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  accountCard: {
    padding: spacing.xl,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    fontSize: 32,
    color: '#FFFFFF',
  },
  accountEmail: {
    ...typography.body,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  signOutButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  signOutText: {
    ...typography.bodyMedium,
    fontSize: 14,
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: 20,
    ...shadows.lg,
  },
  syncInfo: {
    flex: 1,
  },
  syncLabel: {
    ...typography.bodyMedium,
    fontSize: 15,
    marginBottom: 4,
  },
  syncStatus: {
    ...typography.caption,
    fontSize: 12,
  },
  debugButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  debugButtonText: {
    ...typography.caption,
    fontSize: 12,
  },
  syncButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  syncButtonText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  migrationCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    ...shadows.sm,
  },
  migrationTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  migrationText: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  migrationButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  migrationButtonText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  statsCard: {
    padding: spacing.lg,
    borderRadius: 24,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  statsTitle: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    fontSize: 24,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.micro,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  settingsSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    ...typography.micro,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 20,
    ...shadows.lg,
  },
  settingLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.bodyMedium,
    fontSize: 15,
    marginBottom: 2,
  },
  settingDesc: {
    ...typography.caption,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  actionLabel: {
    ...typography.bodyMedium,
    fontSize: 15,
  },
  actionArrow: {
    ...typography.h4,
    fontSize: 20,
  },
  dangerCard: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    ...shadows.lg,
  },
  dangerTitle: {
    ...typography.h4,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  dangerDesc: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  dangerButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  dangerButtonText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  appInfoText: {
    ...typography.micro,
    fontSize: 10,
  },
});
