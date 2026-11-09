'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { NotificationPreferences } from '@/lib/engagement/types';
import {
  BellIcon,
  BellAlertIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  FireIcon,
  TrophyIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface NotificationSettingsProps {
  className?: string;
}

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function Toggle({ enabled, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-accent' : 'bg-white/20'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/**
 * Notification Settings Component
 * 
 * Allows users to configure email and push notification preferences.
 */
export function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    isLoading: pushLoading,
  } = usePushNotifications();

  // Fetch preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/notifications/preferences', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
        }
      } catch (err) {
        console.error('[NotificationSettings] Fetch error:', err);
        setError('Failed to load notification settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  // Update a preference
  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    setIsSaving(true);
    setError(null);

    // Optimistic update
    setPreferences({ ...preferences, [key]: value });

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      // Revert on error
      setPreferences({ ...preferences, [key]: !value });
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle push toggle
  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribePush();
      if (success && preferences) {
        setPreferences({ ...preferences, pushEnabled: true });
      }
    } else {
      const success = await unsubscribePush();
      if (success && preferences) {
        setPreferences({ ...preferences, pushEnabled: false });
      }
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 rounded-xl bg-white/[0.02] border border-white/10 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className={`p-6 rounded-xl bg-white/[0.02] border border-white/10 ${className}`}>
        <p className="text-center text-white/40">Failed to load settings</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl bg-white/[0.02] border border-white/10 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5">
            <BellIcon className="w-6 h-6 text-white/60" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
            <p className="text-sm text-white/40">Manage how and when we contact you</p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Email Notifications Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <EnvelopeIcon className="w-5 h-5 text-white/40" />
          <h3 className="font-medium text-white">Email Notifications</h3>
        </div>

        <div className="space-y-4">
          {/* Daily Digest */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChartBarIcon className="w-5 h-5 text-white/30" />
              <div>
                <p className="text-sm font-medium text-white">Daily Digest</p>
                <p className="text-xs text-white/40">Summary of your trading activity each morning</p>
              </div>
            </div>
            <Toggle
              enabled={preferences.dailyDigest}
              onChange={(v) => updatePreference('dailyDigest', v)}
              disabled={isSaving}
            />
          </div>

          {/* Weekly Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChartBarIcon className="w-5 h-5 text-white/30" />
              <div>
                <p className="text-sm font-medium text-white">Weekly Summary</p>
                <p className="text-xs text-white/40">Performance recap and insights every Sunday</p>
              </div>
            </div>
            <Toggle
              enabled={preferences.weeklySummary}
              onChange={(v) => updatePreference('weeklySummary', v)}
              disabled={isSaving}
            />
          </div>

          {/* Achievement Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrophyIcon className="w-5 h-5 text-white/30" />
              <div>
                <p className="text-sm font-medium text-white">Achievement Unlocks</p>
                <p className="text-xs text-white/40">Get notified when you earn new achievements</p>
              </div>
            </div>
            <Toggle
              enabled={preferences.achievementNotifications}
              onChange={(v) => updatePreference('achievementNotifications', v)}
              disabled={isSaving}
            />
          </div>

          {/* Insight Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-5 h-5 text-white/30" />
              <div>
                <p className="text-sm font-medium text-white">Insight Alerts</p>
                <p className="text-xs text-white/40">Important insights about your trading patterns</p>
              </div>
            </div>
            <Toggle
              enabled={preferences.insightAlerts}
              onChange={(v) => updatePreference('insightAlerts', v)}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      {/* Push Notifications Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <DevicePhoneMobileIcon className="w-5 h-5 text-white/40" />
          <h3 className="font-medium text-white">Push Notifications</h3>
        </div>

        {!pushSupported ? (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/40">
              Push notifications are not supported on this device or browser.
            </p>
          </div>
        ) : pushPermission === 'denied' ? (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-400">
              Push notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Master Push Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3">
                <BellAlertIcon className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-sm font-medium text-white">Enable Push Notifications</p>
                  <p className="text-xs text-white/40">Receive real-time updates on your device</p>
                </div>
              </div>
              <Toggle
                enabled={pushSubscribed || preferences.pushEnabled}
                onChange={handlePushToggle}
                disabled={pushLoading}
              />
            </div>

            {(pushSubscribed || preferences.pushEnabled) && (
              <>
                {/* Streak Reminders */}
                <div className="flex items-center justify-between pl-4">
                  <div className="flex items-center gap-3">
                    <FireIcon className="w-5 h-5 text-white/30" />
                    <div>
                      <p className="text-sm font-medium text-white">Streak Reminders</p>
                      <p className="text-xs text-white/40">Don&apos;t lose your logging streak</p>
                    </div>
                  </div>
                  <Toggle
                    enabled={preferences.streakReminders}
                    onChange={(v) => updatePreference('streakReminders', v)}
                    disabled={isSaving}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Marketing Section */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EnvelopeIcon className="w-5 h-5 text-white/30" />
            <div>
              <p className="text-sm font-medium text-white">Marketing & Updates</p>
              <p className="text-xs text-white/40">Product news, tips, and educational content</p>
            </div>
          </div>
          <Toggle
            enabled={preferences.marketingEmails}
            onChange={(v) => updatePreference('marketingEmails', v)}
            disabled={isSaving}
          />
        </div>
      </div>
    </motion.div>
  );
}
