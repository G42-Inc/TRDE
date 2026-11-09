import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useTheme } from '../contexts/ThemeContext';
import { useStorage } from '../contexts/StorageContext';
import { colors as designColors, spacing, shadows, typography, borderRadius } from '../design/theme';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Simple icon components
const ChevronRight = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShieldIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChartIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CogIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CloudIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LogoutIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export function YouScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { trades, syncStatus } = useStorage();
  const isDark = theme === 'dark';
  const colors = isDark ? designColors.dark : designColors.light;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Get user initials
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.emailAddresses?.[0]?.emailAddress) {
      return user.emailAddresses[0].emailAddress[0].toUpperCase();
    }
    return 'U';
  };

  const displayName = user?.firstName 
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.emailAddresses?.[0]?.emailAddress || 'Trader';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.avatarText, { color: colors.text }]}>{getInitials()}</Text>
          </View>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.statsText, { color: colors.textSecondary }]}>
            {trades.length} trades tracked
          </Text>
        </View>

        {/* Main Feature Cards */}
        <View style={styles.cardsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERFORMANCE</Text>
          
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Risk')}
            activeOpacity={0.7}
          >
            <View style={[styles.featureIconContainer, { backgroundColor: designColors.accent.bg }]}>
              <ShieldIcon color={designColors.accent.main} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Risk Dashboard</Text>
              <Text style={[styles.featureSubtitle, { color: colors.textSecondary }]}>
                Monitor discipline & risk metrics
              </Text>
            </View>
            <ChevronRight color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Strategies')}
            activeOpacity={0.7}
          >
            <View style={[styles.featureIconContainer, { backgroundColor: designColors.info.bg }]}>
              <ChartIcon color={designColors.info.main} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Strategies</Text>
              <Text style={[styles.featureSubtitle, { color: colors.textSecondary }]}>
                Analyze performance by strategy
              </Text>
            </View>
            <ChevronRight color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SETTINGS</Text>
          
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <CogIcon color={colors.text} />
                <Text style={[styles.settingsRowText, { color: colors.text }]}>Preferences</Text>
              </View>
              <ChevronRight color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => navigation.navigate('Settings', { scrollTo: 'sync' })}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <CloudIcon color={colors.text} />
                <View>
                  <Text style={[styles.settingsRowText, { color: colors.text }]}>Data & Sync</Text>
                  <Text style={[styles.settingsRowSubtext, { color: colors.textTertiary }]}>
                    {syncStatus === 'synced' ? 'All data synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
                  </Text>
                </View>
              </View>
              <ChevronRight color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.surface }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <LogoutIcon color={designColors.semantic.error} />
          <Text style={[styles.signOutText, { color: designColors.semantic.error }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.textTertiary }]}>
          TRDE v1.0.0
        </Text>
      </ScrollView>
    </View>
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
    paddingBottom: spacing.xl,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  displayName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  statsText: {
    ...typography.bodySmall,
  },
  cardsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.micro,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  featureSubtitle: {
    ...typography.bodySmall,
  },
  settingsSection: {
    marginBottom: spacing.lg,
  },
  settingsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsRowText: {
    ...typography.body,
  },
  settingsRowSubtext: {
    ...typography.caption,
    marginTop: 2,
  },
  settingsDivider: {
    height: 1,
    marginLeft: spacing.md + 24 + spacing.md, // icon width + gaps
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  signOutText: {
    ...typography.bodyBold,
  },
  versionText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
