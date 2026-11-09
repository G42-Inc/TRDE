'use client';

import { exportTradesToCsv, exportWeeklyReportText } from '@trde/mock-db';
import { useAppData } from '@/hooks/useAppData';
import { type DashboardMetricId } from '@/contexts/StorageContext';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ModalDialog } from '@/components/ModalDialog';
import { format } from 'date-fns';
import { 
  XMarkIcon, 
  ShieldCheckIcon,
  PaintBrushIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  SparklesIcon,
  CloudIcon,
  ChartPieIcon,
  UserCircleIcon,
  CreditCardIcon,
  BoltIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { NotificationSettings } from '@/components/settings';
import type { RiskRules } from '@trde/core';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { scenes, type SceneDefinition } from '@/lib/dashboard/dashboardScenes';
import { useDashboardScene } from '@/components/DashboardSceneProvider';
import { AdminLoginSection } from '@/components/AdminLoginSection';
import { SubscriptionSection } from './subscription-section';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { getEdgeAccountScope, isCurrentEdgeAccount } from '@/lib/edge/store/accountScope';
import { getSyncState, getTrades } from '@/lib/edge/store/edgeStore';

type SettingsTab = 'account' | 'billing' | 'appearance' | 'dashboard' | 'risk' | 'data' | 'api' | 'notifications' | 'admin';

function WeeklyReportModal({ report, onClose }: { report: string; onClose: () => void }) {
  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weekly-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <ModalDialog isOpen labelledBy="settings-weekly-report-title"
      className="items-center justify-center overflow-y-auto"
      onClose={onClose}
    >
      <div
        className="theme-bg-secondary p-4 sm:p-6 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border theme-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b theme-border pb-4">
          <h2 id="settings-weekly-report-title" className="text-xl font-bold theme-text">Weekly Report Preview</h2>
          <button aria-label="Close weekly report" onClick={onClose} className="theme-text-secondary hover:theme-text transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-sm theme-bg-tertiary p-4 rounded-lg mb-4 theme-text">{report}</pre>
        <div className="flex space-x-3">
          <button
            onClick={handleDownload}
            className="flex-1 px-4 py-2.5 theme-button rounded-lg font-medium transition-colors text-white"
          >
            Download as Text
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 theme-bg-tertiary theme-text rounded-lg hover:opacity-80 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </ModalDialog>,
    document.body
  );
}

/* ─── Scene Selector (Appearance Tab) ─────────────────────────────────────── */

/** Organized scene groups for the picker UI. */
const SCENE_GROUPS = [
  {
    label: 'Auto',
    description: 'Changes with time of day',
    scenes: [] as string[], // special — handled as Day/Night toggle
    isDayNight: true,
  },
  {
    label: 'Defaults',
    scenes: ['default-light', 'default-dark'],
  },
  {
    label: 'Scenes',
    scenes: ['sunrise', 'daytime', 'sunset', 'night', 'blue', 'light-blue', 'green', 'purple', 'peach', 'yellow', 'rainbow', 'galaxy'],
  },
];

function AppearanceSceneSelector() {
  const { scene, mode, setMode, setSceneId } = useDashboardScene();
  const isDayNight = mode === 'daynight';

  const handleSelectScene = (sceneId: string) => {
    // Switch to default (manual) mode and set the specific scene
    if (mode !== 'default') {
      setMode('default');
    }
    setSceneId(sceneId);
  };

  const handleToggleDayNight = () => {
    if (isDayNight) {
      // Switch to default mode with current scene
      setMode('default');
    } else {
      setMode('daynight');
    }
  };

  return (
    <div className="space-y-8">
      {/* Scene Selector */}
      <div
        className="rounded-2xl p-4 sm:p-8"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: 'rgba(200, 162, 74, 0.12)',
              border: '1px solid rgba(200, 162, 74, 0.2)',
            }}
          >
            <SparklesIcon className="h-5 w-5 theme-text-secondary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold theme-text">Background Scene</h2>
            <p className="theme-text-secondary text-sm">Choose your dashboard backdrop</p>
          </div>
        </div>

        {/* Day/Night Auto Toggle */}
        <div className="mb-6">
          <button
            onClick={handleToggleDayNight}
            className="w-full text-left transition-all duration-200"
            style={{
              padding: '16px 20px',
              borderRadius: 14,
              background: isDayNight
                ? 'rgba(200, 162, 74, 0.10)'
                : 'rgba(255, 255, 255, 0.06)',
              border: isDayNight
                ? '1px solid rgba(200, 162, 74, 0.30)'
                : '1px solid rgba(255, 255, 255, 0.10)',
              boxShadow: isDayNight
                ? '0 2px 12px rgba(200, 162, 74, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.10)'
                : 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Auto cycle icon */}
                <div className="flex items-center gap-1 theme-text-secondary">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-sm theme-text">Day / Night Auto</div>
                  <div className="text-xs theme-text-secondary">
                    Scenes change with your local time of day
                  </div>
                </div>
              </div>
              {/* Toggle indicator */}
              <div
                className="w-11 h-6 rounded-full relative transition-all duration-300"
                style={{
                  background: isDayNight
                    ? 'linear-gradient(135deg, #C9A962, #B89851)'
                    : 'rgba(255, 255, 255, 0.15)',
                  border: isDayNight
                    ? '1px solid rgba(200, 162, 74, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                  style={{
                    left: isDayNight ? 'calc(100% - 22px)' : '2px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            </div>
          </button>
        </div>

        {/* Manual scene grid — only shown when Day/Night is OFF, or always shown for manual picking */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider theme-text-tertiary mb-3">
            {isDayNight ? 'Preview scenes (auto-selected by time)' : 'Choose a scene'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.values(scenes).map((s) => {
              const isActive = scene.id === s.id && !isDayNight;
              const isDayNightScene = isDayNight && scene.id === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectScene(s.id)}
                  className="relative rounded-xl transition-all duration-200 group"
                  style={{
                    padding: 4,
                    background: isActive
                      ? 'rgba(200, 162, 74, 0.15)'
                      : isDayNightScene
                        ? 'rgba(255, 255, 255, 0.10)'
                        : 'rgba(255, 255, 255, 0.04)',
                    border: isActive
                      ? '2px solid rgba(200, 162, 74, 0.50)'
                      : isDayNightScene
                        ? '2px solid rgba(255, 255, 255, 0.25)'
                        : '2px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isActive
                      ? '0 2px 12px rgba(200, 162, 74, 0.15)'
                      : 'none',
                  }}
                >
                  {/* Gradient thumbnail */}
                  <div
                    className="w-full rounded-lg overflow-hidden mb-2"
                    style={{
                      height: 56,
                      background: s.image
                        ? `url(${s.image}) center/cover no-repeat`
                        : s.gradient,
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                    }}
                  />

                  {/* Scene name */}
                  <div className="text-xs font-medium theme-text text-center pb-1">
                    {s.name}
                  </div>

                  {/* Selected badge */}
                  {isActive && (
                    <div className="absolute -top-1.5 -right-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                        style={{
                          background: 'linear-gradient(135deg, #C9A962, #B89851)',
                          border: '1px solid rgba(200, 162, 74, 0.5)',
                        }}
                      >
                        <CheckIcon className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Day/Night active indicator */}
                  {isDayNightScene && isDayNight && (
                    <div className="absolute -top-1.5 -right-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                        }}
                      >
                        <span className="text-xs">⏱</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    trades, 
    strategies,
    journals,
    dailyBiases,
    quickJournals,
    weeklyReviews, 
    todos,
    riskRules, 
    dashboardMetrics: storedDashboardMetrics, 
    saveRiskRules, 
    saveDashboardMetrics,
    saveTrades,
    syncFromCloud,
    isSyncing,
    isLoading,
    collections,
    clearAllData,
    migrateLocalToCloud,
    lastSyncTime,
    syncError,
    needsMigration,
    isDemo
  } = useAppData();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  
  // Handle tab from URL param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['account', 'billing', 'appearance', 'dashboard', 'risk', 'data', 'api', 'notifications', 'admin'].includes(tabParam)) {
      setActiveTab(tabParam as SettingsTab);
    }
  }, [searchParams]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [rules, setRules] = useState<RiskRules | null>(null);
  const [editing, setEditing] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const [metricsSaving, setMetricsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetricId[]>(['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd']);
  
  const isAdmin = isLoaded && user && (
    user.publicMetadata?.role === 'admin' ||
    user.publicMetadata?.isAdmin === true ||
    user.publicMetadata?.admin === true
  );
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<Array<{
    id: string;
    provider: string;
    is_premium: boolean;
    is_enabled: boolean;
    hasKey: boolean;
  }>>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [alphaVantageKey, setAlphaVantageKey] = useState('');
  const [alphaVantagePremium, setAlphaVantagePremium] = useState(false);
  const [apiSaveStatus, setApiSaveStatus] = useState<{ provider: string; status: 'saving' | 'saved' | 'error'; message?: string } | null>(null);
  
  // ProjectX Connection state
  const [projectXConnected, setProjectXConnected] = useState(false);
  const [projectXConnectionInfo, setProjectXConnectionInfo] = useState<{
    accountId?: string | number;
    subId?: string | number;
    live?: boolean;
  } | null>(null);
  const [projectXUserName, setProjectXUserName] = useState('');
  const [projectXApiKey, setProjectXApiKey] = useState('');
  const [projectXSelectedAccount, setProjectXSelectedAccount] = useState<any | null>(null);
  const [projectXLive, setProjectXLive] = useState(false);
  const [projectXShowUpdateForm, setProjectXShowUpdateForm] = useState(false);
  const [projectXSearchingAccounts, setProjectXSearchingAccounts] = useState(false);
  const [projectXAccountOptions, setProjectXAccountOptions] = useState<any[]>([]);
  const [projectXShowAccountDropdown, setProjectXShowAccountDropdown] = useState(false);
  
  // Account settings state
  const [accountFirstName, setAccountFirstName] = useState('');
  const [accountLastName, setAccountLastName] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSaveStatus, setAccountSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [projectXDropdownPosition, setProjectXDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [projectXSyncing, setProjectXSyncing] = useState(false);
  const [projectXSyncState, setProjectXSyncState] = useState(getSyncState());
  const [projectXDateRange, setProjectXDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [projectXConfirmModal, setProjectXConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);
  const [projectXAlertModal, setProjectXAlertModal] = useState<{
    show: boolean;
    message: string;
  } | null>(null);
  
  // Initialize local state from storage context
  useEffect(() => {
    if (!editing) {
      setRules(riskRules);
    }
  }, [riskRules, editing]);

  useEffect(() => {
    setDashboardMetrics(storedDashboardMetrics);
  }, [storedDashboardMetrics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Load user account data from Clerk
  useEffect(() => {
    if (isLoaded && user) {
      setAccountFirstName(user.firstName || '');
      setAccountLastName(user.lastName || '');
    }
  }, [isLoaded, user]);

  // Save account profile changes
  const handleSaveAccount = async () => {
    if (!user) return;
    
    setAccountSaving(true);
    setAccountSaveStatus('saving');
    setAccountError(null);
    
    try {
      await user.update({
        firstName: accountFirstName,
        lastName: accountLastName,
      });
      setAccountSaveStatus('saved');
      setTimeout(() => setAccountSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Error updating account:', error);
      const errorMessage = error.errors?.[0]?.message || error.message || 'Failed to update account';
      setAccountError(errorMessage);
      setAccountSaveStatus('error');
    } finally {
      setAccountSaving(false);
    }
  };

  // Handle password change (Clerk handles this via their UI component or API)
  const handlePasswordChange = async () => {
    if (!user) return;
    
    setPasswordError(null);
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    setPasswordSaving(true);
    
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Show success message
      setAccountSaveStatus('saved');
      setTimeout(() => setAccountSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordError(error.errors?.[0]?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExportCsv = () => {
    const csv = exportTradesToCsv(trades);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportWeeklyReport = () => {
    const lastReview = [...weeklyReviews].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
    const weekStart = lastReview
      ? lastReview.weekStart
      : format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const weekEnd = lastReview
      ? lastReview.weekEnd
      : format(new Date(), 'yyyy-MM-dd');

    const report = exportWeeklyReportText(weekStart, weekEnd, trades, lastReview);
    setReportContent(report);
    setShowReportModal(true);
  };

  const handleReset = () => {
    if (!user) return;
    const prefix = `trde_${user.id}_`;
    Object.keys(localStorage).filter((key) => key.startsWith(prefix)).forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  const handleClearAllData = async () => {
    if (clearAllConfirmText !== 'DELETE JOURNAL DATA') return;
    
    setIsClearing(true);
    setSettingsError(null);
    try {
      await clearAllData();
      setClearAllConfirmText('');
      setShowClearAllModal(false);
      // Redirect to dashboard after clearing
      router.push('/app');
    } catch (error) {
      console.error('Error clearing all data:', error);
      setSettingsError(error instanceof Error ? error.message : 'Could not finish deleting journal data. Refresh and retry.');
    } finally {
      setIsClearing(false);
    }
  };

  // Fetch API keys when tab changes to 'api'
  useEffect(() => {
    if (activeTab === 'api') {
      fetchApiKeys();
    }
  }, [activeTab]);

  const fetchApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const res = await fetch('/api/settings/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
        
        // Update premium checkbox state from existing keys
        const avKey = data.keys?.find((k: any) => k.provider === 'alphavantage');
        if (avKey) {
          setAlphaVantagePremium(avKey.is_premium);
        }
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const handleSaveApiKey = async (provider: string, apiKey: string, isPremium?: boolean) => {
    if (!apiKey.trim()) return;
    
    setApiSaveStatus({ provider, status: 'saving' });
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, isPremium }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setApiSaveStatus({ provider, status: 'saved', message: data.message });
        fetchApiKeys();
        // Clear input after save
        if (provider === 'alphavantage') setAlphaVantageKey('');
        
        setTimeout(() => setApiSaveStatus(null), 3000);
      } else {
        setApiSaveStatus({ provider, status: 'error', message: data.error });
      }
    } catch (error: any) {
      setApiSaveStatus({ provider, status: 'error', message: error.message });
    }
  };

  const handleDeleteApiKey = async (provider: string) => {
    try {
      const res = await fetch(`/api/settings/api-keys?provider=${provider}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchApiKeys();
        setApiSaveStatus({ provider, status: 'saved', message: 'API key removed' });
        setTimeout(() => setApiSaveStatus(null), 3000);
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleTogglePremium = async (provider: string, isPremium: boolean) => {
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, isPremium }),
      });
      
      if (res.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Failed to toggle premium:', error);
    }
  };

  const handleSaveRules = async (newRules: RiskRules) => {
    await saveRiskRules(newRules);
    setRules(newRules);
    setEditing(false);
  };

  // ProjectX Connection handlers
  const checkProjectXConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/edge/projectx/connect');
      const data = await res.json();
      if (data.connected) {
        setProjectXConnected(true);
        setProjectXConnectionInfo(data);
        setProjectXLive(data.live ?? false);
      } else {
        setProjectXConnected(false);
        setProjectXConnectionInfo(null);
        setProjectXSelectedAccount(null);
        setProjectXLive(false);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'api') {
      checkProjectXConnection();
      setProjectXSyncState(getSyncState());
    }
  }, [activeTab, checkProjectXConnection]);

  const handleProjectXSearchAccounts = async () => {
    if (!projectXUserName || !projectXApiKey) {
      setProjectXAlertModal({ show: true, message: 'Please enter your email and API key first' });
      return;
    }
    
    setProjectXSearchingAccounts(true);
    try {
      const authRes = await fetch('/api/edge/projectx/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: projectXUserName, apiKey: projectXApiKey }),
      });
      
      const responseText = await authRes.text();
      let errorData: any;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Authentication failed: ${responseText || 'Unknown error'}`);
      }
      
      if (!authRes.ok) {
        throw new Error(errorData.error || 'Failed to authenticate');
      }
      
      const authData = errorData;
      if (!authData.success || !authData.token) {
        throw new Error('Authentication succeeded but no token received');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const searchRes = await fetch('/api/edge/projectx/accounts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyActiveAccounts: true }),
        credentials: 'include',
      });
      
      if (!searchRes.ok) {
        const searchErrorData = await searchRes.json();
        throw new Error(searchErrorData.error || 'Failed to search accounts');
      }
      
      const data = await searchRes.json();
      
      if (data.errorCode !== undefined && data.errorCode !== 0) {
        throw new Error(data.errorMessage || `ProjectX API error code: ${data.errorCode}`);
      }
      
      if (data.success === false) {
        throw new Error(data.errorMessage || 'Account search failed');
      }
      
      if (data.accounts && data.accounts.length > 0) {
        setProjectXAccountOptions(data.accounts);
        // Position dropdown under the account selector, not the search button
        const accountSelector = document.querySelector('[data-projectx-account-selector]') as HTMLElement;
        if (accountSelector) {
          const rect = accountSelector.getBoundingClientRect();
          setProjectXDropdownPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
        setProjectXShowAccountDropdown(true);
      } else if (data.accounts && data.accounts.length === 0) {
        setProjectXAlertModal({ show: true, message: 'No accounts found. Make sure you have access to at least one account.' });
      } else {
        throw new Error('Invalid response from account search API');
      }
    } catch (error: any) {
      setProjectXAlertModal({ show: true, message: `Failed to search accounts: ${error.message || 'Unknown error'}` });
    } finally {
      setProjectXSearchingAccounts(false);
    }
  };

  const handleProjectXSelectAccount = (account: any) => {
    setProjectXSelectedAccount(account);
    setProjectXShowAccountDropdown(false);
    setProjectXAccountOptions([]);
  };

  const handleProjectXConnect = async () => {
    if (!projectXUserName || !projectXApiKey) {
      setProjectXAlertModal({ show: true, message: 'Please enter your email and API key' });
      return;
    }

    if (!projectXSelectedAccount) {
      setProjectXAlertModal({ show: true, message: 'Please search and select an account' });
      return;
    }

    try {
      const authRes = await fetch('/api/edge/projectx/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: projectXUserName, apiKey: projectXApiKey }),
      });

      if (!authRes.ok) {
        const errorData = await authRes.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const connectRes = await fetch('/api/edge/projectx/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: null,
          accountId: projectXSelectedAccount ? projectXSelectedAccount.id : null,
          live: projectXLive,
        }),
      });
      
      const data = await connectRes.json();
      if (data.success) {
        setProjectXApiKey('');
        setProjectXShowUpdateForm(false);
        await checkProjectXConnection();
      } else {
        setProjectXAlertModal({ show: true, message: data.error || 'Failed to connect' });
      }
    } catch (error: any) {
      setProjectXAlertModal({ show: true, message: `Failed to connect: ${error.message || 'Unknown error'}` });
    }
  };

  const handleProjectXDisconnect = async () => {
    setProjectXConfirmModal({
      show: true,
      title: 'Disconnect from ProjectX',
      message: 'Are you sure you want to disconnect from ProjectX?',
      onConfirm: async () => {
        setProjectXConfirmModal(null);
        try {
          const res = await fetch('/api/edge/projectx/connect', {
            method: 'DELETE',
          });
          if (res.ok) {
            setProjectXConnected(false);
            setProjectXConnectionInfo(null);
            setProjectXUserName('');
            setProjectXApiKey('');
            setProjectXSelectedAccount(null);
            setProjectXLive(false);
            setProjectXShowUpdateForm(false);
          }
        } catch (error) {
          setProjectXAlertModal({ show: true, message: 'Failed to disconnect.' });
        }
      },
      onCancel: () => setProjectXConfirmModal(null),
    });
  };

  const handleProjectXSync = async () => {
    const edgeScope = getEdgeAccountScope();
    if (!isCurrentEdgeAccount(edgeScope)) return;
    if (!projectXConnectionInfo?.accountId) {
      setProjectXAlertModal({ show: true, message: 'Please set Account ID before syncing' });
      return;
    }

    setProjectXSyncing(true);
    try {
      const startTimestamp = new Date(projectXDateRange.start).toISOString();
      const endTimestamp = new Date(projectXDateRange.end + 'T23:59:59').toISOString();

      const res = await fetch('/api/edge/projectx/trades/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: projectXConnectionInfo.accountId,
          startTimestamp,
          endTimestamp,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setProjectXAlertModal({ show: true, message: `Sync failed: ${data.error}` });
        return;
      }

      if (data.trades && Array.isArray(data.trades)) {
        const { normalizeExecution } = await import('@/lib/edge/projectx/normalize');
        const { groupExecutionsIntoRoundTrips } = await import('@/lib/edge/projectx/grouping');
        const { saveExecutions, saveTrades: saveEdgeTrades, saveSyncState } = await import('@/lib/edge/store/edgeStore');

        const executions = data.trades.map(normalizeExecution);
        const roundTrips = groupExecutionsIntoRoundTrips(executions);

        if (!isCurrentEdgeAccount(edgeScope)) return;
        saveExecutions(executions, edgeScope);
        saveEdgeTrades(roundTrips, edgeScope);
        saveSyncState({
          lastSyncTime: new Date().toISOString(),
          totalExecutions: executions.length,
          totalTrades: roundTrips.length,
          dateRange: { start: startTimestamp, end: endTimestamp },
        }, edgeScope);

        setProjectXSyncState(getSyncState());
        
        setProjectXConfirmModal({
          show: true,
          title: 'Sync Complete',
          message: `Synced ${executions.length} executions into ${roundTrips.length} round-trip trades.\n\nDo you want to add all ${roundTrips.length} trades to your trade journal?`,
          onConfirm: async () => {
            setProjectXConfirmModal(null);
            const { importAllEdgeTradesToJournal } = await import('@/lib/edge/utils/tradeMapping');
            const result = await importAllEdgeTradesToJournal(saveTrades, edgeScope).catch((error) => {
              if (isCurrentEdgeAccount(edgeScope)) setProjectXAlertModal({ show: true, message: error instanceof Error ? error.message : 'Could not import trades.' });
              return null;
            });
            if (!result) return;
            
            if (result.imported > 0) {
              setProjectXAlertModal({
                show: true,
                message: `Successfully imported ${result.imported} trades to your journal.\n${result.duplicates > 0 ? `${result.duplicates} duplicate(s) skipped.\n` : ''}${result.skipped > 0 ? `${result.skipped} trade(s) skipped due to errors.` : ''}`.trim(),
              });
            } else if (result.duplicates > 0) {
              setProjectXAlertModal({
                show: true,
                message: `All ${result.duplicates} trades were already imported (duplicates skipped).`,
              });
            }
          },
          onCancel: () => setProjectXConfirmModal(null),
        });
      } else {
        setProjectXAlertModal({ show: true, message: 'No trades found in the selected date range. Please check your Account ID and date range.' });
      }
    } catch (error: any) {
      setProjectXAlertModal({ show: true, message: `Failed to sync trades: ${error.message || 'Unknown error'}` });
    } finally {
      setProjectXSyncing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SkeletonLoader width="300px" height="3rem" />
        <div className="theme-bg-tertiary/50 p-4 sm:p-8 rounded-2xl border theme-border">
          <SkeletonLoader width="150px" height="1.5rem" className="mb-4" />
          <SkeletonLoader width="100%" height="1rem" className="mb-2" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'account' as SettingsTab, label: 'Account', icon: UserCircleIcon, description: 'Profile & security' },
    { id: 'billing' as SettingsTab, label: 'Billing', icon: CreditCardIcon, description: 'Subscription & payments' },
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: PaintBrushIcon, description: 'Colors & fonts' },
    { id: 'dashboard' as SettingsTab, label: 'Dashboard', icon: ChartBarIcon, description: 'Metrics display' },
    { id: 'risk' as SettingsTab, label: 'Risk Rules', icon: ShieldExclamationIcon, description: 'Trading limits' },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: BellIcon, description: 'Email & alerts' },
    { id: 'data' as SettingsTab, label: 'Data', icon: CloudIcon, description: 'Export & sync' },
    { id: 'api' as SettingsTab, label: 'Integrations', icon: KeyIcon, description: 'API connections' },
    ...(isAdmin ? [{ id: 'admin' as SettingsTab, label: 'Admin', icon: ShieldCheckIcon, description: 'Admin panel' }] : []),
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div 
              className="p-3 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <Cog6ToothIcon className="h-8 w-8 theme-text" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold theme-text tracking-tight">Settings</h1>
              <p className="theme-text-secondary text-sm mt-1">Customize your experience</p>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation - Pill Style */}
        <div className="mb-8">
          <div 
            className="inline-flex max-w-full p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    router.replace(`/settings?tab=${tab.id}`, { scroll: false });
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap
                    ${isActive
                      ? 'theme-text shadow-lg'
                      : 'theme-text-secondary hover:theme-text hover:bg-white/5'
                    }
                  `}
                  style={isActive ? {
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                  } : {}}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {settingsError && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">{settingsError}</p>}
        {/* Tab Content */}
        <div className="animate-fade-in">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Profile Section */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                  >
                    <UserCircleIcon className="h-6 w-6 theme-text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Profile</h2>
                    <p className="theme-text-secondary text-sm">Manage your personal information</p>
                  </div>
                </div>

                {/* Profile Picture */}
                <div className="flex items-center gap-6 mb-8 pb-8 border-b theme-border">
                  <div 
                    className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ 
                      backgroundColor: 'var(--theme-bg-tertiary)',
                      border: '3px solid rgba(255,255,255,0.25)',
                    }}
                  >
                    {user?.imageUrl ? (
                      <img 
                        src={user.imageUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="w-16 h-16 theme-text-secondary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold theme-text mb-1">Profile Picture</h3>
                    <p className="text-sm theme-text-secondary mb-3">Your profile picture is managed through Clerk</p>
                    <button
                      onClick={() => clerk.openUserProfile()}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-bg-tertiary)',
                        color: 'var(--theme-text)',
                        border: '1px solid var(--theme-border)',
                      }}
                    >
                      Change Picture
                    </button>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={accountFirstName}
                      onChange={(e) => setAccountFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl theme-text font-medium transition-all duration-200"
                      style={{
                        backgroundColor: 'var(--theme-bg-tertiary)',
                        border: '1px solid var(--theme-border)',
                      }}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={accountLastName}
                      onChange={(e) => setAccountLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl theme-text font-medium transition-all duration-200"
                      style={{
                        backgroundColor: 'var(--theme-bg-tertiary)',
                        border: '1px solid var(--theme-border)',
                      }}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                {/* Email (Read Only) */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div 
                    className="w-full px-4 py-3 rounded-xl font-medium flex items-center justify-between"
                    style={{
                      backgroundColor: 'var(--theme-bg-tertiary)',
                      border: '1px solid var(--theme-border)',
                      color: 'var(--theme-text-secondary)',
                    }}
                  >
                    <span>{user?.primaryEmailAddress?.emailAddress || 'No email'}</span>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--theme-success)', color: 'white' }}>
                      Verified
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {accountError && (
                  <div 
                    className="p-4 rounded-xl mb-6 flex items-center gap-3"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                  >
                    <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-red-500 text-sm">{accountError}</span>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSaveAccount}
                  disabled={accountSaving}
                  className="w-full md:w-auto px-8 py-3 rounded-xl font-semibold theme-text transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                    opacity: accountSaving ? 0.7 : 1,
                  }}
                >
                  {accountSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : accountSaveStatus === 'saved' ? (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Saved!
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>

              {/* Security Section */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                  >
                    <ShieldCheckIcon className="h-6 w-6 theme-text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Security</h2>
                    <p className="theme-text-secondary text-sm">Manage your account security</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Password Change */}
                  <div 
                    className="p-5 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
                  >
                    <div className="flex items-center gap-4">
                      <KeyIcon className="w-6 h-6 theme-text-secondary" />
                      <div>
                        <h3 className="font-semibold theme-text">Password</h3>
                        <p className="text-sm theme-text-secondary">Change your account password</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-bg-secondary)',
                        color: 'var(--theme-text)',
                        border: '1px solid var(--theme-border)',
                      }}
                    >
                      Change Password
                    </button>
                  </div>

                  {/* Two-Factor Auth */}
                  <div 
                    className="p-5 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
                  >
                    <div className="flex items-center gap-4">
                      <ShieldCheckIcon className="w-6 h-6 theme-text-secondary" />
                      <div>
                        <h3 className="font-semibold theme-text">Two-Factor Authentication</h3>
                        <p className="text-sm theme-text-secondary">Add an extra layer of security</p>
                      </div>
                    </div>
                    <button
                      onClick={() => clerk.openUserProfile()}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-bg-secondary)',
                        color: 'var(--theme-text)',
                        border: '1px solid var(--theme-border)',
                      }}
                    >
                      Manage 2FA
                    </button>
                  </div>

                  {/* Active Sessions */}
                  <div 
                    className="p-5 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
                  >
                    <div className="flex items-center gap-4">
                      <Cog6ToothIcon className="w-6 h-6 theme-text-secondary" />
                      <div>
                        <h3 className="font-semibold theme-text">Active Sessions</h3>
                        <p className="text-sm theme-text-secondary">Manage your logged-in devices</p>
                      </div>
                    </div>
                    <button
                      onClick={() => clerk.openUserProfile()}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-bg-secondary)',
                        color: 'var(--theme-text)',
                        border: '1px solid var(--theme-border)',
                      }}
                    >
                      View Sessions
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div 
                className="rounded-2xl p-6"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="theme-text-secondary">Account ID</span>
                  <span className="theme-text font-mono">{user?.id || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-3">
                  <span className="theme-text-secondary">Member Since</span>
                  <span className="theme-text">{user?.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Subscription Status */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                  >
                    <CreditCardIcon className="h-6 w-6 theme-text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Subscription</h2>
                    <p className="theme-text-secondary text-sm">Manage your plan and billing</p>
                  </div>
                </div>
                
                <SubscriptionSection />
              </div>

              {/* Billing Info */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <h3 className="text-lg font-semibold theme-text mb-4">Billing Information</h3>
                <p className="theme-text-secondary text-sm mb-6">
                  Your billing is securely managed through Stripe. Use the &quot;Manage Subscription&quot; button above to:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3 text-sm theme-text-secondary">
                    <CheckCircleIcon className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
                    Update your payment method
                  </li>
                  <li className="flex items-center gap-3 text-sm theme-text-secondary">
                    <CheckCircleIcon className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
                    View billing history and invoices
                  </li>
                  <li className="flex items-center gap-3 text-sm theme-text-secondary">
                    <CheckCircleIcon className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
                    Change or upgrade your plan
                  </li>
                  <li className="flex items-center gap-3 text-sm theme-text-secondary">
                    <CheckCircleIcon className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
                    Cancel your subscription
                  </li>
                </ul>
                <div 
                  className="p-4 rounded-xl text-sm"
                  style={{ 
                    backgroundColor: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <p className="theme-text-secondary">
                    <strong className="theme-text">Need help?</strong> Contact support at{' '}
                    <a href="mailto:support@trde.app" className="underline" style={{ color: 'var(--theme-primary)' }}>
                      support@trde.app
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab — Scene Selector */}
          {activeTab === 'appearance' && (
            <AppearanceSceneSelector />
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div 
              className="rounded-2xl p-4 sm:p-8"
              style={{
                backgroundColor: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="p-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                >
                  <ChartPieIcon className="h-6 w-6 theme-text-secondary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold theme-text">Dashboard Metrics</h2>
                  <p className="theme-text-secondary text-sm">Choose 4 metrics for your dashboard</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((index) => (
                  <div 
                    key={index} 
                    className="group p-6 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      backgroundColor: 'var(--theme-bg-tertiary)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="flex items-center justify-center w-12 h-12 rounded-xl theme-text font-bold text-lg flex-shrink-0"
                        style={{
                          background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wide mb-2 block">
                          Metric Slot {index + 1}
                        </label>
                        <select
                          value={dashboardMetrics[index]}
                          disabled={metricsSaving || isDemo}
                          aria-label={`Metric Slot ${index + 1}`}
                          onChange={async (e) => {
                            const newValue = e.target.value as DashboardMetricId;
                            const newMetrics = [...dashboardMetrics];
                            const otherIndex = newMetrics.findIndex((metric, slot) => metric === newValue && slot !== index);
                            if (otherIndex !== -1) newMetrics[otherIndex] = newMetrics[index];
                            newMetrics[index] = newValue;
                            setMetricsSaving(true);
                            setSettingsError(null);
                            try {
                              await saveDashboardMetrics(newMetrics);
                              setDashboardMetrics(newMetrics);
                            } catch (error) {
                              setSettingsError(error instanceof Error ? error.message : 'Could not save dashboard metrics.');
                            } finally { setMetricsSaving(false); }
                          }}
                          className="w-full px-4 py-3 rounded-xl text-sm theme-text font-medium focus:outline-none focus:ring-2 transition-all"
                          style={{
                            backgroundColor: 'var(--theme-bg)',
                            border: '1px solid var(--theme-border)',
                          }}
                        >
                          <option value="totalPnLUsd">Total PnL (USD)</option>
                          <option value="totalPnLR">Total PnL (R)</option>
                          <option value="winRate">Win Rate</option>
                          <option value="profitFactor">Profit Factor</option>
                          <option value="expectancy">Expectancy</option>
                          <option value="avgWinR">Avg Win (R)</option>
                          <option value="avgLossR">Avg Loss (R)</option>
                          <option value="maxDrawdownUsd">Max Drawdown (USD)</option>
                          <option value="maxDrawdownR">Max Drawdown (R)</option>
                          <option value="consistencyScore">Consistency Score</option>
                          <option value="feeDrag">Fee Drag</option>
                          <option value="mistakeTaxUsd">Mistake Tax</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info Banner */}
              <div 
                className="mt-6 p-4 rounded-xl flex items-start gap-3"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 theme-text-secondary" />
                <p className="text-sm theme-text">
                  <strong>Tip:</strong> Selecting a metric already in use will swap their positions. Changes save automatically.
                </p>
              </div>
            </div>
          )}

          {/* Risk Rules Tab */}
          {activeTab === 'risk' && (
            <div 
              className="rounded-2xl p-4 sm:p-8"
              style={{
                backgroundColor: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: 'var(--theme-error)', opacity: 0.1 }}
                  >
                    <ShieldExclamationIcon className="h-6 w-6" style={{ color: 'var(--theme-error)' }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Risk Management</h2>
                    <p className="theme-text-secondary text-sm">Configure your trading limits</p>
                  </div>
                </div>
                {rules && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-5 py-2.5 rounded-xl font-semibold theme-text transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    Edit Rules
                  </button>
                )}
              </div>

              {!rules ? (
                <div className="text-center py-16">
                  <div 
                    className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                      boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <ShieldExclamationIcon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold theme-text mb-2">No Risk Rules Configured</h3>
                  <p className="theme-text-secondary mb-6 max-w-md mx-auto">
                    Set up your risk management rules to protect your trading capital and maintain discipline.
                  </p>
                  <button
                    onClick={() => {
                      setEditing(true);
                      const defaultRules: RiskRules = {
                        dailyLossLimitUsd: 1000,
                        maxTradesPerDay: 10,
                        maxContractsPerTrade: 10,
                        stopAfterConsecutiveLosses: 3,
                        stopAfterDownR: 5,
                        requirePlannedRisk: true,
                        requireStopDefined: true,
                      };
                      setRules(defaultRules);
                    }}
                    className="px-6 py-3 rounded-xl font-semibold theme-text transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    Create Risk Rules
                  </button>
                </div>
              ) : editing ? (
                <RiskRulesForm rules={rules} onSave={handleSaveRules} onCancel={() => setEditing(false)} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <RiskRuleCard label="Daily Loss Limit" value={`$${rules.dailyLossLimitUsd.toLocaleString()}`} />
                  <RiskRuleCard label="Max Trades/Day" value={rules.maxTradesPerDay.toString()} />
                  <RiskRuleCard label="Max Contracts/Trade" value={rules.maxContractsPerTrade.toString()} />
                  <RiskRuleCard 
                    label="Planned Risk Required" 
                    value={rules.requirePlannedRisk ? 'Yes' : 'No'}
                    positive={rules.requirePlannedRisk}
                  />
                  <RiskRuleCard 
                    label="Stop Loss Required" 
                    value={rules.requireStopDefined ? 'Yes' : 'No'}
                    positive={rules.requireStopDefined}
                  />
                  <RiskRuleCard 
                    label="Stop After Losses" 
                    value={rules.stopAfterConsecutiveLosses?.toString() || 'N/A'}
                  />
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <NotificationSettings />
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Subscription Section */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <SubscriptionSection />
              </div>

              {/* Export Data Section */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: 'var(--theme-success)', opacity: 0.1 }}
                  >
                    <ArrowDownTrayIcon className="h-6 w-6" style={{ color: 'var(--theme-success)' }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Export Data</h2>
                    <p className="theme-text-secondary text-sm">Download your trading data</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleExportCsv}
                    className="group p-6 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: 'var(--theme-bg-tertiary)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: 'var(--theme-success)', opacity: 0.2 }}
                      >
                        <ArrowDownTrayIcon className="h-6 w-6" style={{ color: 'var(--theme-success)' }} />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold theme-text mb-1">Export to CSV</div>
                        <div className="text-xs theme-text-secondary">Download all trades</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportWeeklyReport}
                    className="group p-6 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: 'var(--theme-bg-tertiary)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: 'var(--theme-success)', opacity: 0.2 }}
                      >
                        <ChartBarIcon className="h-6 w-6" style={{ color: 'var(--theme-success)' }} />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold theme-text mb-1">Weekly Report</div>
                        <div className="text-xs theme-text-secondary">Generate a report from your saved trades</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cloud Sync Section */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                  >
                    <CloudIcon className="h-6 w-6 theme-text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Cloud Sync</h2>
                    <p className="theme-text-secondary text-sm">Sync across all your devices</p>
                  </div>
                </div>

                {(dataStatus || syncError) && <p role={syncError ? 'alert' : 'status'} className="mb-4 text-sm theme-text-secondary">{syncError || dataStatus}</p>}
                {/* Data Overview */}
                <div 
                  className="grid grid-cols-3 gap-4 p-6 rounded-xl mb-6"
                  style={{
                    backgroundColor: 'var(--theme-bg-tertiary)',
                  }}
                >
                  <DataStat label="Trades" value={trades.length} />
                  <DataStat label="Journals" value={journals.length} />
                  <DataStat label="Biases" value={dailyBiases.length} />
                  <DataStat label="Notes" value={quickJournals.length} />
                  <DataStat label="Reviews" value={weeklyReviews.length} />
                  <DataStat label="Strategies" value={strategies.length} />
                </div>

                {/* Sync Actions */}
                <div className="space-y-3">
                  {needsMigration && <button
                    onClick={async () => {
                      try {
                        await migrateLocalToCloud();
                        setDataStatus('Local journal data imported.');
                      } catch (error) {
                        console.error('Error migrating:', error);
                        setSettingsError(error instanceof Error ? error.message : 'Import failed. Your local data is retained.');
                      }
                    }}
                    disabled={isSyncing || isLoading || isDemo}
                    className="w-full p-4 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed theme-text"
                    style={{
                      background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                      fontWeight: 600,
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ArrowPathIcon className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Migrating...' : 'Import Local Journal Data'}
                    </div>
                  </button>}

                  <button
                    onClick={async () => {
                      try {
                        setSettingsError(null);
                        setDataStatus(null);
                        await syncFromCloud();
                        setDataStatus('Journal refreshed from the cloud.');
                      } catch (error) {
                        setSettingsError(error instanceof Error ? error.message : 'Could not refresh the journal.');
                      }
                    }}
                    disabled={isSyncing || isLoading}
                    className="w-full p-4 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--theme-bg-tertiary)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
                      >
                        <ArrowPathIcon className={`h-5 w-5 theme-text-secondary ${isSyncing ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold theme-text text-sm">
                          {isSyncing ? 'Refreshing...' : 'Refresh from Cloud'}
                        </div>
                        <div className="text-xs theme-text-secondary">
                          {lastSyncTime 
                            ? `Last synced: ${new Date(lastSyncTime).toLocaleString()}`
                            : 'Refresh to load your latest saved journal'}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Data Management Section */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: 'var(--theme-error)', opacity: 0.1 }}
                  >
                    <TrashIcon className="h-6 w-6" style={{ color: 'var(--theme-error)' }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Data Management</h2>
                    <p className="theme-text-secondary text-sm">Manage or delete your data</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Clear Local Data */}
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      backgroundColor: 'var(--theme-bg-tertiary)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold theme-text mb-1">Clear Local Cache</div>
                        <div className="text-sm theme-text-secondary">Clears this account’s browser cache. Saved cloud records reload; unsynced changes will be lost.</div>
                      </div>
                      {!showResetConfirm ? (
                        <button
                          onClick={() => setShowResetConfirm(true)}
                          className="px-5 py-2.5 rounded-xl font-semibold transition-all hover:opacity-80"
                          style={{ 
                            backgroundColor: 'var(--theme-bg-secondary)',
                            border: '1px solid var(--theme-border)',
                          }}
                        >
                          Clear Cache
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={handleReset}
                            className="px-4 py-2 rounded-lg font-semibold text-white text-sm"
                            style={{ backgroundColor: 'var(--theme-error)' }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setShowResetConfirm(false)}
                            className="px-4 py-2 rounded-lg font-semibold text-sm"
                            style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clear All Data - Danger Zone */}
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold mb-1" style={{ color: 'var(--theme-error)' }}>
                          Delete Journal Data
                        </div>
                        <div className="text-sm theme-text-secondary">
                          Deletes your trades, journals, private strategies, reviews, tasks and risk/dashboard settings from the cloud.
                        </div>
                      </div>
                      <button
                        onClick={() => { setSettingsError(null); setShowClearAllModal(true); }}
                        disabled={isDemo || isLoading || isSyncing}
                        className="px-5 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: 'var(--theme-error)' }}
                      >
                        Delete All
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clear All Data Warning Modal */}
              {showClearAllModal && createPortal(
                <ModalDialog isOpen labelledBy="settings-delete-journal-title"
                  className="items-center justify-center overflow-y-auto"
                  onClose={() => {
                    if (isClearing) return;
                    setShowClearAllModal(false);
                    setClearAllConfirmText('');
                  }}
                >
                  <div
                    className="theme-bg-secondary rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl border theme-border"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Warning Header */}
                    <div 
                      className="p-6"
                      style={{ 
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                          <ExclamationCircleIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h2 id="settings-delete-journal-title" className="text-xl font-bold text-white">Delete Journal Data</h2>
                          <p className="text-white/80 text-sm">This action is permanent</p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5">
                      <div className="space-y-3">
                        <p className="theme-text font-medium">
                          You are about to permanently delete:
                        </p>
                        <ul className="space-y-2 text-sm theme-text-secondary">
                          <li className="flex items-center gap-2">
                            <span style={{ color: 'var(--theme-error)' }}>•</span>
                            All {trades.length} trades
                          </li>
                          <li className="flex items-center gap-2">
                            <span style={{ color: 'var(--theme-error)' }}>•</span>
                            All {journals.length} journal entries
                          </li>
                          <li className="flex items-center gap-2">
                            <span style={{ color: 'var(--theme-error)' }}>•</span>
                            All {strategies.length} strategies
                          </li>
                          <li className="flex items-center gap-2">
                            <span style={{ color: 'var(--theme-error)' }}>•</span>
                            All collections, reviews, tasks, risk rules and dashboard metrics
                          </li>
                        </ul>
                      </div>

                      <div 
                        className="p-4 rounded-xl"
                        style={{ 
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--theme-error)' }}>
                          This action cannot be undone.
                        </p>
                        <p className="text-xs theme-text-secondary">
                          Journal data is removed from this account. Your account, billing, connections and notification preferences are kept.
                        </p>
                      </div>

                      {settingsError && <p role="alert" className="text-sm text-red-300">{settingsError}</p>}
                      {/* Confirmation Input */}
                      <div>
                        <label htmlFor="delete-journal-confirmation" className="block text-sm font-medium theme-text mb-2">
                          Type <span className="font-mono font-bold" style={{ color: 'var(--theme-error)' }}>DELETE JOURNAL DATA</span> to confirm
                        </label>
                        <input
                          id="delete-journal-confirmation"
                          type="text"
                          value={clearAllConfirmText}
                          onChange={(e) => setClearAllConfirmText(e.target.value)}
                          placeholder="DELETE JOURNAL DATA"
                          className="w-full px-4 py-3 rounded-xl theme-bg-tertiary theme-text border theme-border focus:outline-none focus:ring-2"
                          style={{ 
                            borderColor: clearAllConfirmText === 'DELETE JOURNAL DATA' ? 'var(--theme-error)' : undefined,
                          }}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          disabled={isClearing}
                          onClick={() => {
                            setShowClearAllModal(false);
                            setClearAllConfirmText('');
                          }}
                          className="flex-1 px-5 py-3 rounded-xl font-semibold transition-all"
                          style={{
                            backgroundColor: 'var(--theme-bg-tertiary)',
                            border: '1px solid var(--theme-border)',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleClearAllData}
                          disabled={clearAllConfirmText !== 'DELETE JOURNAL DATA' || isClearing}
                          className="flex-1 px-5 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: 'var(--theme-error)' }}
                        >
                          {isClearing ? 'Deleting...' : 'Delete Journal Data'}
                        </button>
                      </div>
                    </div>
                  </div>
                </ModalDialog>,
                document.body
              )}

            </div>
          )}

          {/* API Integrations Tab */}
          {activeTab === 'api' && (
            <div className="space-y-8">
              {/* ProjectX Integration - Premium Card */}
              <div 
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, var(--theme-bg-secondary) 0%, var(--theme-bg) 100%)',
                  border: '1px solid var(--theme-border)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* Decorative gradient accent */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: projectXConnected 
                      ? 'linear-gradient(90deg, var(--theme-success), #10b981, var(--theme-success))'
                      : 'linear-gradient(90deg, var(--theme-primary), var(--theme-accent), var(--theme-primary))',
                  }}
                />
                
                <div className="p-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-5">
                      {/* Status indicator with glow */}
                      <div className="relative">
                        <div 
                          className={`w-4 h-4 rounded-full ${projectXConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ 
                            boxShadow: projectXConnected 
                              ? '0 0 20px rgba(16, 185, 129, 0.6), 0 0 40px rgba(16, 185, 129, 0.3)' 
                              : '0 0 20px rgba(244, 63, 94, 0.6), 0 0 40px rgba(244, 63, 94, 0.3)' 
                          }}
                        />
                        <div 
                          className={`absolute inset-0 w-4 h-4 rounded-full animate-ping ${projectXConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ opacity: 0.4 }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-3xl font-bold theme-text tracking-tight">ProjectX</h2>
                          {projectXConnected && (
                            <span 
                              className="px-4 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider"
                              style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="theme-text-secondary text-sm mt-1">Automated trade syncing & analytics</p>
                      </div>
                    </div>
                    
                    {projectXConnected && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setProjectXShowUpdateForm(!projectXShowUpdateForm)}
                          className="group px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
                          style={{
                            backgroundColor: 'var(--theme-bg-tertiary)',
                            color: 'var(--theme-text)',
                            border: '1px solid var(--theme-border)',
                          }}
                        >
                          <PencilIcon className="h-4 w-4 inline mr-2 transition-transform group-hover:rotate-12" />
                          Edit
                        </button>
                        <button
                          onClick={handleProjectXDisconnect}
                          className="group px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.05) 100%)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                          }}
                        >
                          <TrashIcon className="h-4 w-4 inline mr-2 transition-transform group-hover:scale-110" />
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>

                  {!projectXConnected ? (
                    <div className="space-y-6">
                      {/* Getting started message */}
                      <div 
                        className="p-5 rounded-2xl flex items-center gap-4"
                        style={{
                          background: 'linear-gradient(135deg, rgba(var(--theme-primary-rgb, 180, 152, 88), 0.1) 0%, rgba(var(--theme-primary-rgb, 180, 152, 88), 0.02) 100%)',
                          border: '1px solid rgba(var(--theme-primary-rgb, 180, 152, 88), 0.2)',
                        }}
                      >
                        <SparklesIcon className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                        <p className="text-sm theme-text">
                          <span className="font-semibold">Get Started:</span> Connect your ProjectX account to automatically sync your trades and unlock powerful analytics.
                        </p>
                      </div>

                      {/* Input fields */}
                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-widest">Email Address</label>
                          <input
                            type="email"
                            value={projectXUserName}
                            onChange={(e) => setProjectXUserName(e.target.value)}
                            className="w-full px-5 py-4 rounded-xl text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:scale-[1.01]"
                            style={{
                              backgroundColor: 'var(--theme-bg)',
                              border: '1px solid var(--theme-border)',
                              color: 'var(--theme-text)',
                            }}
                            placeholder="your@email.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-widest">API Key</label>
                          <input
                            type="password"
                            value={projectXApiKey}
                            onChange={(e) => setProjectXApiKey(e.target.value)}
                            className="w-full px-5 py-4 rounded-xl text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:scale-[1.01]"
                            style={{
                              backgroundColor: 'var(--theme-bg)',
                              border: '1px solid var(--theme-border)',
                              color: 'var(--theme-text)',
                            }}
                            placeholder="••••••••••••••••"
                          />
                        </div>
                      </div>

                      {/* Account selector */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-widest">Trading Account</label>
                        <div className="flex gap-4">
                          <div 
                            data-projectx-account-selector
                            className="flex-1 px-5 py-4 rounded-xl flex items-center relative cursor-pointer"
                            style={{
                              backgroundColor: 'var(--theme-bg)',
                              border: '1px solid var(--theme-border)',
                            }}
                          >
                            <span className={projectXSelectedAccount ? 'theme-text font-medium text-sm' : 'theme-text-secondary text-sm'}>
                              {projectXSelectedAccount ? `${projectXSelectedAccount.name} (ID: ${projectXSelectedAccount.id})` : 'No account selected'}
                            </span>
                          </div>
                          <button
                            data-projectx-search-button
                            onClick={handleProjectXSearchAccounts}
                            disabled={!projectXUserName || !projectXApiKey || projectXSearchingAccounts}
                            className="px-8 py-4 rounded-xl font-bold theme-text transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                            style={{
                              background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                              /* shadow handled by glass */
                            }}
                          >
                            {projectXSearchingAccounts ? 'Searching...' : 'Search'}
                          </button>
                        </div>
                        {typeof window !== 'undefined' && projectXShowAccountDropdown && projectXAccountOptions.length > 0 && projectXDropdownPosition && createPortal(
                          <div 
                            className="fixed rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-[9999] backdrop-blur-xl"
                            style={{ 
                              top: `${projectXDropdownPosition.top}px`,
                              left: `${projectXDropdownPosition.left}px`,
                              width: `${projectXDropdownPosition.width}px`,
                              minWidth: '400px',
                              backgroundColor: 'var(--theme-bg-secondary)',
                              border: '2px solid var(--theme-primary)',
                              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            }}
                          >
                            {projectXAccountOptions.map((account, index) => (
                              <button
                                key={account.id}
                                onClick={() => handleProjectXSelectAccount(account)}
                                className="w-full text-left px-5 py-4 transition-all duration-200"
                                style={{
                                  borderBottom: index < projectXAccountOptions.length - 1 ? '1px solid var(--theme-border)' : 'none',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold theme-text break-all">{account.name || `Account ${account.id}`}</div>
                                    <div className="text-xs theme-text-secondary mt-0.5">ID: {account.id}</div>
                                  </div>
                                  <div className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--theme-success)' }}>
                                    ${typeof account.balance === 'number' ? account.balance.toLocaleString() : 'N/A'}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>,
                          document.body
                        )}
                      </div>

                      {/* Live mode toggle */}
                      <label 
                        className="flex items-center gap-4 p-5 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.01]"
                        style={{
                          backgroundColor: 'var(--theme-bg)',
                          border: '1px solid var(--theme-border)',
                        }}
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={projectXLive}
                            onChange={(e) => setProjectXLive(e.target.checked)}
                            className="sr-only"
                          />
                          <div 
                            className="w-12 h-7 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: projectXLive ? 'var(--theme-primary)' : 'var(--theme-bg-tertiary)',
                              border: '1px solid var(--theme-border)',
                            }}
                          >
                            <div 
                              className="absolute top-1 w-5 h-5 rounded-full transition-all duration-300 shadow-md"
                              style={{
                                backgroundColor: 'white',
                                left: projectXLive ? '26px' : '4px',
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-sm theme-text font-semibold">Live Trading Mode</span>
                          <p className="text-xs theme-text-secondary mt-0.5">Turn off for simulation accounts</p>
                        </div>
                      </label>

                      {/* Connect button */}
                      <button
                        onClick={handleProjectXConnect}
                        className="w-full px-8 py-5 rounded-2xl font-bold theme-text text-lg transition-all duration-300 hover:scale-[1.02]"
                        style={{
                          background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                          /* shadow handled by glass */
                        }}
                      >
                        Connect to ProjectX
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Connection Info Cards */}
                      <div 
                        className="grid grid-cols-3 gap-5 p-6 rounded-2xl"
                        style={{
                          backgroundColor: 'var(--theme-bg)',
                          border: '1px solid var(--theme-border)',
                        }}
                      >
                        <div className="text-center p-4">
                          <div className="text-xs theme-text-secondary font-bold uppercase tracking-widest mb-2">Account ID</div>
                          <div className="text-2xl font-bold theme-text tracking-tight">{projectXConnectionInfo?.accountId || 'Not set'}</div>
                        </div>
                        <div className="text-center p-4" style={{ borderLeft: '1px solid var(--theme-border)', borderRight: '1px solid var(--theme-border)' }}>
                          <div className="text-xs theme-text-secondary font-bold uppercase tracking-widest mb-2">Sub ID</div>
                          <div className="text-2xl font-bold theme-text tracking-tight">{projectXConnectionInfo?.subId || 'Not set'}</div>
                        </div>
                        <div className="text-center p-4">
                          <div className="text-xs theme-text-secondary font-bold uppercase tracking-widest mb-2">Mode</div>
                          <span 
                            className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                            style={{
                              background: projectXConnectionInfo?.live 
                                ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(var(--theme-primary-rgb, 180, 152, 88), 0.15) 0%, rgba(var(--theme-primary-rgb, 180, 152, 88), 0.05) 100%)',
                              color: projectXConnectionInfo?.live ? '#f43f5e' : 'var(--theme-primary)',
                              border: `1px solid ${projectXConnectionInfo?.live ? 'rgba(244, 63, 94, 0.3)' : 'rgba(var(--theme-primary-rgb, 180, 152, 88), 0.3)'}`,
                            }}
                          >
                            {projectXConnectionInfo?.live ? 'Live' : 'Simulation'}
                          </span>
                        </div>
                      </div>

                      {/* Update form */}
                      {projectXShowUpdateForm && (
                        <div 
                          className="p-6 rounded-2xl space-y-4"
                          style={{
                            backgroundColor: 'var(--theme-bg)',
                            border: '1px solid var(--theme-border)',
                          }}
                        >
                          <h3 className="text-sm font-bold theme-text uppercase tracking-wide">Update Connection</h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <input
                              type="email"
                              value={projectXUserName}
                              onChange={(e) => setProjectXUserName(e.target.value)}
                              className="px-5 py-4 rounded-xl text-sm font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--theme-bg-tertiary)',
                                border: '1px solid var(--theme-border)',
                                color: 'var(--theme-text)',
                              }}
                              placeholder="Email"
                            />
                            <input
                              type="password"
                              value={projectXApiKey}
                              onChange={(e) => setProjectXApiKey(e.target.value)}
                              className="px-5 py-4 rounded-xl text-sm font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--theme-bg-tertiary)',
                                border: '1px solid var(--theme-border)',
                                color: 'var(--theme-text)',
                              }}
                              placeholder="API Key"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button 
                              onClick={handleProjectXConnect} 
                              className="px-6 py-3 rounded-xl theme-text font-semibold transition-all duration-300 hover:scale-105"
                              style={{
                                background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                              }}
                            >
                              Update
                            </button>
                            <button 
                              onClick={() => setProjectXShowUpdateForm(false)} 
                              className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                              style={{
                                backgroundColor: 'var(--theme-bg-tertiary)',
                                color: 'var(--theme-text)',
                                border: '1px solid var(--theme-border)',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sync Section */}
                      {projectXConnectionInfo?.accountId && (
                        <div 
                          className="rounded-2xl overflow-hidden"
                          style={{
                            backgroundColor: 'var(--theme-bg)',
                            border: '1px solid var(--theme-border)',
                          }}
                        >
                          {/* Sync header with gradient */}
                          <div 
                            className="px-6 py-5 flex items-center gap-3"
                            style={{
                              background: 'linear-gradient(135deg, rgba(var(--theme-primary-rgb, 180, 152, 88), 0.1) 0%, rgba(var(--theme-primary-rgb, 180, 152, 88), 0.02) 100%)',
                              borderBottom: '1px solid var(--theme-border)',
                            }}
                          >
                            <ChartBarIcon className="h-6 w-6 theme-text-secondary" />
                            <div>
                              <h3 className="font-bold theme-text text-lg">Sync Trading Data</h3>
                              <p className="text-xs theme-text-secondary">Account ID: {projectXConnectionInfo.accountId}</p>
                            </div>
                          </div>

                          <div className="p-6 space-y-5">
                            {/* Date range inputs */}
                            <div className="grid grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-widest">Start Date</label>
                                <input
                                  type="date"
                                  value={projectXDateRange.start}
                                  onChange={(e) => setProjectXDateRange({ ...projectXDateRange, start: e.target.value })}
                                  className="w-full px-5 py-4 rounded-xl text-sm font-medium transition-all"
                                  style={{
                                    backgroundColor: 'var(--theme-bg-tertiary)',
                                    border: '1px solid var(--theme-border)',
                                    color: 'var(--theme-text)',
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-widest">End Date</label>
                                <input
                                  type="date"
                                  value={projectXDateRange.end}
                                  onChange={(e) => setProjectXDateRange({ ...projectXDateRange, end: e.target.value })}
                                  className="w-full px-5 py-4 rounded-xl text-sm font-medium transition-all"
                                  style={{
                                    backgroundColor: 'var(--theme-bg-tertiary)',
                                    border: '1px solid var(--theme-border)',
                                    color: 'var(--theme-text)',
                                  }}
                                />
                              </div>
                            </div>

                            {/* Sync button */}
                            <button
                              onClick={handleProjectXSync}
                              disabled={projectXSyncing}
                              className="w-full px-8 py-5 rounded-2xl font-bold theme-text text-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                              style={{
                                background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                              }}
                            >
                              {projectXSyncing ? 'Syncing Trades...' : 'Sync Trades'}
                            </button>

                            {projectXSyncState && projectXSyncState.totalTrades > 0 && (
                              <>
                                {/* Import button */}
                                <button
                                  onClick={async () => {
                                    const edgeScope = getEdgeAccountScope();
                                    const { importAllEdgeTradesToJournal } = await import('@/lib/edge/utils/tradeMapping');
                                    const result = await importAllEdgeTradesToJournal(saveTrades, edgeScope).catch((error) => {
                                      if (isCurrentEdgeAccount(edgeScope)) setProjectXAlertModal({ show: true, message: error instanceof Error ? error.message : 'Could not import trades.' });
                                      return null;
                                    });
                                    if (!result) return;
                                    
                                    if (result.imported > 0) {
                                      setProjectXAlertModal({
                                        show: true,
                                        message: `Successfully imported ${result.imported} trades to your journal.\n${result.duplicates > 0 ? `${result.duplicates} duplicate(s) skipped.` : ''}`.trim(),
                                      });
                                    } else if (result.duplicates > 0) {
                                      setProjectXAlertModal({
                                        show: true,
                                        message: `All ${result.duplicates} trades were already imported.`,
                                      });
                                    } else {
                                      setProjectXAlertModal({ show: true, message: 'No trades available to import.' });
                                    }
                                  }}
                                  className="w-full px-8 py-5 rounded-2xl font-bold text-white text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                                  style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 15px 35px -10px rgba(16, 185, 129, 0.5)',
                                  }}
                                >
                                  Add All {projectXSyncState.totalTrades} Trades to Journal
                                </button>

                                {/* Stats section */}
                                <div 
                                  className="p-5 rounded-2xl space-y-4"
                                  style={{
                                    backgroundColor: 'var(--theme-bg-tertiary)',
                                    border: '1px solid var(--theme-border)',
                                  }}
                                >
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="theme-text-secondary font-medium">Last synced</span>
                                    <span className="font-bold theme-text">
                                      {projectXSyncState.lastSyncTime ? format(new Date(projectXSyncState.lastSyncTime), 'PPp') : 'Never'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div 
                                      className="text-center p-5 rounded-xl"
                                      style={{ 
                                        backgroundColor: 'var(--theme-bg)',
                                        border: '1px solid var(--theme-border)',
                                      }}
                                    >
                                      <div className="text-3xl font-bold theme-text">{projectXSyncState.totalExecutions}</div>
                                      <div className="text-xs theme-text-secondary font-medium uppercase tracking-wide mt-1">Executions</div>
                                    </div>
                                    <div 
                                      className="text-center p-5 rounded-xl"
                                      style={{ 
                                        backgroundColor: 'var(--theme-bg)',
                                        border: '1px solid var(--theme-border)',
                                      }}
                                    >
                                      <div className="text-3xl font-bold theme-text">{projectXSyncState.totalTrades}</div>
                                      <div className="text-xs theme-text-secondary font-medium uppercase tracking-wide mt-1">Round-trips</div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Market Data APIs - Premium Card */}
              <div 
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, var(--theme-bg-secondary) 0%, var(--theme-bg) 100%)',
                  border: '1px solid var(--theme-border)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* Decorative gradient accent */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: 'linear-gradient(90deg, var(--theme-primary), var(--theme-accent), var(--theme-primary))',
                  }}
                />

                <div className="p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div 
                      className="p-3 rounded-2xl"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(var(--theme-primary-rgb, 180, 152, 88), 0.15) 0%, rgba(var(--theme-primary-rgb, 180, 152, 88), 0.05) 100%)',
                        border: '1px solid rgba(var(--theme-primary-rgb, 180, 152, 88), 0.2)',
                      }}
                    >
                      <KeyIcon className="h-7 w-7" style={{ color: 'var(--theme-primary)' }} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold theme-text tracking-tight">Market Data APIs</h2>
                      <p className="theme-text-secondary text-sm mt-1">Connect for real-time quotes and analytics</p>
                    </div>
                  </div>

                  {apiKeysLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div 
                        className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full"
                        style={{
                          borderColor: 'var(--theme-primary)',
                          borderTopColor: 'transparent',
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* AlphaVantage */}
                      <ApiConnectionCard
                        provider="AlphaVantage"
                        description="Stock quotes, technical indicators, and options data"
                        hasKey={apiKeys.find(k => k.provider === 'alphavantage')?.hasKey}
                        isPremium={apiKeys.find(k => k.provider === 'alphavantage')?.is_premium}
                        link="https://www.alphavantage.co/support/#api-key"
                        onDelete={() => handleDeleteApiKey('alphavantage')}
                        onTogglePremium={(checked) => handleTogglePremium('alphavantage', checked)}
                        inputValue={alphaVantageKey}
                        onInputChange={setAlphaVantageKey}
                        onSave={() => handleSaveApiKey('alphavantage', alphaVantageKey, alphaVantagePremium)}
                        premiumChecked={alphaVantagePremium}
                        onPremiumChange={setAlphaVantagePremium}
                        saveStatus={apiSaveStatus?.provider === 'alphavantage' ? apiSaveStatus : null}
                        info={
                          <>
                            <strong>Free:</strong> 25 calls/day - Stock quotes & indicators<br/>
                            <strong>Premium:</strong> Options chains, Greeks, IV, higher limits
                          </>
                        }
                      />

                    </div>
                  )}

                  {/* Security info */}
                  <div 
                    className="mt-8 p-6 rounded-2xl"
                    style={{
                      backgroundColor: 'var(--theme-bg)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <h4 className="font-bold theme-text mb-4 flex items-center gap-3">
                      <ShieldCheckIcon className="h-5 w-5" style={{ color: 'var(--theme-success)' }} />
                      Security & Privacy
                    </h4>
                    <ul className="text-sm theme-text-secondary space-y-3">
                      <li className="flex items-start gap-3">
                        <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--theme-success)' }} />
                        <span>Your API keys are encrypted and stored securely</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--theme-success)' }} />
                        <span>Keys are never exposed to client-side code or other users</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--theme-success)' }} />
                        <span>Flow dashboard uses your keys securely for market data</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Tab - Admin Only */}
          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6">
              {/* Admin Panel Access */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                  >
                    <ShieldCheckIcon className="h-6 w-6 theme-text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Admin Panel</h2>
                    <p className="theme-text-secondary text-sm">Manage users and entitlements</p>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/admin')}
                  className="w-full p-6 rounded-xl transition-all hover:scale-[1.01] group"
                  style={{
                    backgroundColor: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
                    >
                      <ShieldCheckIcon className="h-6 w-6 theme-text-secondary" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold theme-text mb-1">Open Admin Dashboard</div>
                      <div className="text-xs theme-text-secondary">Full admin panel with user management</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Quick Admin Actions */}
              <div 
                className="rounded-2xl p-4 sm:p-8"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: 'var(--theme-warning)', opacity: 0.1 }}
                  >
                    <BoltIcon className="h-6 w-6" style={{ color: 'var(--theme-warning)' }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold theme-text">Quick Actions</h2>
                    <p className="theme-text-secondary text-sm">Common administrative tasks</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <AdminLoginSection inlineMode />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminLoginSection hidden />
      {showReportModal && <WeeklyReportModal report={reportContent} onClose={() => setShowReportModal(false)} />}
      
      {/* ProjectX Modals */}
      {projectXConfirmModal?.show && mounted && createPortal(
        <ModalDialog isOpen labelledBy="settings-projectx-confirm-title"
          className="items-center justify-center overflow-y-auto"
          onClose={() => {
            if (projectXConfirmModal.onCancel) projectXConfirmModal.onCancel();
            else setProjectXConfirmModal(null);
          }}
        >
          <div
            className="rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              backgroundColor: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="p-6 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between">
                <h2 id="settings-projectx-confirm-title" className="text-xl font-bold theme-text">{projectXConfirmModal.title}</h2>
                <button aria-label="Close confirmation"
                  onClick={() => {
                    if (projectXConfirmModal.onCancel) projectXConfirmModal.onCancel();
                    else setProjectXConfirmModal(null);
                  }}
                  className="theme-text-secondary hover:theme-text p-2 rounded-full transition-all"
                  style={{
                    backgroundColor: 'var(--theme-error)',
                    opacity: 0.1,
                  }}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="theme-text whitespace-pre-line mb-6">{projectXConfirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (projectXConfirmModal.onCancel) projectXConfirmModal.onCancel();
                    else setProjectXConfirmModal(null);
                  }}
                  className="flex-1 px-5 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    backgroundColor: 'var(--theme-bg-tertiary)',
                    color: 'var(--theme-text)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => projectXConfirmModal.onConfirm()}
                  className="flex-1 px-5 py-3 rounded-xl font-bold theme-text transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </ModalDialog>,
        document.body
      )}

      {projectXAlertModal?.show && mounted && createPortal(
        <ModalDialog isOpen labelledBy="settings-projectx-alert-title"
          className="items-center justify-center overflow-y-auto"
          onClose={() => setProjectXAlertModal(null)}
        >
          <div
            className="rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              backgroundColor: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="p-6 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between">
                <h2 id="settings-projectx-alert-title" className="text-xl font-bold theme-text">TRDE</h2>
                <button aria-label="Close message"
                  onClick={() => setProjectXAlertModal(null)}
                  className="theme-text-secondary hover:theme-text p-2 rounded-full transition-all"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="theme-text whitespace-pre-line mb-6">{projectXAlertModal.message}</p>
              <button
                onClick={() => setProjectXAlertModal(null)}
                className="w-full px-6 py-3 rounded-xl font-bold theme-text transition-all"
                style={{
                  background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </ModalDialog>,
        document.body
      )}

      {/* Password Change Modal */}
      {showPasswordModal && createPortal(
        <ModalDialog isOpen labelledBy="settings-password-title"
          className="items-center justify-center overflow-y-auto"
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordError(null);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl p-4 sm:p-8"
            style={{
              backgroundColor: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                >
                  <KeyIcon className="h-6 w-6 theme-text-secondary" />
                </div>
                <h2 id="settings-password-title" className="text-xl font-bold theme-text">Change Password</h2>
              </div>
              <button aria-label="Close password dialog"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="theme-text-secondary hover:theme-text transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl theme-text font-medium"
                  style={{
                    backgroundColor: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border)',
                  }}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl theme-text font-medium"
                  style={{
                    backgroundColor: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border)',
                  }}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl theme-text font-medium"
                  style={{
                    backgroundColor: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border)',
                  }}
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <div 
                  className="p-3 rounded-xl flex items-center gap-2"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-500 text-sm">{passwordError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError(null);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--theme-bg-tertiary)',
                    color: 'var(--theme-text)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold theme-text transition-all flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                    opacity: passwordSaving || !currentPassword || !newPassword || !confirmPassword ? 0.5 : 1,
                  }}
                >
                  {passwordSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalDialog>,
        document.body
      )}
    </div>
  );
}

// Helper Components
function RiskRuleCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div 
      className="p-6 rounded-xl transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: 'var(--theme-bg-tertiary)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <div className="text-xs theme-text-secondary font-bold uppercase tracking-wide mb-3">{label}</div>
      <div 
        className={`text-3xl font-bold ${
          positive === true ? 'text-success' : 
          positive === false ? 'text-danger' : 
          'theme-text'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DataStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold theme-text mb-1">{value}</div>
      <div className="text-xs theme-text-secondary uppercase tracking-wide">{label}</div>
    </div>
  );
}

function ApiConnectionCard({
  provider,
  description,
  hasKey,
  isPremium,
  link,
  onDelete,
  onTogglePremium,
  inputValue,
  onInputChange,
  onSave,
  premiumChecked,
  onPremiumChange,
  saveStatus,
  info,
  disabled,
  comingSoon,
}: {
  provider: string;
  description: string;
  hasKey?: boolean;
  isPremium?: boolean;
  link?: string;
  onDelete: () => void;
  onTogglePremium?: (checked: boolean) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSave: () => void;
  premiumChecked?: boolean;
  onPremiumChange?: (checked: boolean) => void;
  saveStatus: { provider: string; status: 'saving' | 'saved' | 'error'; message?: string } | null;
  info?: React.ReactNode;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div 
      className="p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--theme-bg-tertiary)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold theme-text text-lg">{provider}</h3>
          {hasKey && <CheckCircleIcon className="h-5 w-5" style={{ color: 'var(--theme-success)' }} />}
          {comingSoon && (
            <span 
              className="px-2 py-1 text-xs font-bold rounded-full"
              style={{
                backgroundColor: 'var(--theme-text-tertiary)',
                opacity: 0.3,
                color: 'var(--theme-text-tertiary)',
              }}
            >
              Coming Soon
            </span>
          )}
        </div>
        {link && (
          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium transition-all hover:underline"
            style={{ color: 'var(--theme-primary)' }}
          >
            Get API Key →
          </a>
        )}
      </div>
      <p className="text-sm theme-text-secondary mb-4">{description}</p>
      
      {hasKey ? (
        <div className="space-y-3">
          <div 
            className="flex items-center justify-between p-4 rounded-xl"
            style={{
              backgroundColor: 'var(--theme-bg)',
            }}
          >
            <div className="flex items-center gap-3">
              <KeyIcon className="h-5 w-5 theme-text-secondary" />
              <span className="text-sm theme-text font-medium">API Key configured</span>
              {isPremium && (
                <span 
                  className="px-2 py-1 text-xs font-bold rounded-full"
                  style={{
                    backgroundColor: 'var(--theme-warning)',
                    opacity: 0.2,
                    color: 'var(--theme-warning)',
                  }}
                >
                  Premium
                </span>
              )}
            </div>
            <button
              onClick={onDelete}
              className="text-sm font-medium transition-all"
              style={{ color: 'var(--theme-error)' }}
            >
              Remove
            </button>
          </div>
          
          {onTogglePremium && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPremium || false}
                onChange={(e) => onTogglePremium(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{
                  accentColor: 'var(--theme-primary)',
                }}
              />
              <span className="text-sm theme-text font-medium">I have a Premium API key (enables Options Flow data)</span>
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="password"
              placeholder={`Enter your ${provider} API key`}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              disabled={disabled}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: 'var(--theme-bg)',
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            />
            <button
              onClick={onSave}
              disabled={disabled || !inputValue.trim() || (saveStatus?.status === 'saving')}
              className="px-5 py-3 rounded-xl theme-text font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: disabled ? 'var(--theme-bg-tertiary)' : 'rgba(255,255,255,0.10)',
                backdropFilter: disabled ? 'none' : 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: disabled ? 'none' : 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: disabled ? 'none' : '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                color: disabled ? 'var(--theme-text-secondary)' : undefined,
              }}
            >
              {saveStatus?.status === 'saving' ? 'Saving...' : comingSoon ? 'Soon' : 'Save'}
            </button>
          </div>
          
          {onPremiumChange && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={premiumChecked}
                onChange={(e) => onPremiumChange(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{
                  accentColor: 'var(--theme-primary)',
                }}
              />
              <span className="text-sm theme-text font-medium">I have a Premium API key</span>
            </label>
          )}
        </div>
      )}
      
      {saveStatus && (
        <div 
          className="mt-3 p-3 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: saveStatus.status === 'saved' ? 'var(--theme-success)' :
              saveStatus.status === 'error' ? 'var(--theme-error)' : 'transparent',
            opacity: 0.1,
            color: saveStatus.status === 'saved' ? 'var(--theme-success)' :
              saveStatus.status === 'error' ? 'var(--theme-error)' : 'var(--theme-text)',
            border: `1px solid ${saveStatus.status === 'saved' ? 'var(--theme-success)' : 'var(--theme-error)'}`,
          }}
        >
          {saveStatus.message}
        </div>
      )}
      
      {info && (
        <div 
          className="mt-4 p-4 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p className="text-xs theme-text">{info}</p>
        </div>
      )}
    </div>
  );
}

function RiskRulesForm({
  rules,
  onSave,
  onCancel,
}: {
  rules: RiskRules;
  onSave: (rules: RiskRules) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(rules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rules) {
      setFormData(rules);
    }
  }, [rules]);

  const inputStyle = {
    backgroundColor: 'var(--theme-bg)',
    border: '1px solid var(--theme-border)',
    color: 'var(--theme-text)',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-bold theme-text mb-2 uppercase tracking-wide">Daily Loss Limit (USD)</label>
          <input
            type="number"
            aria-label="Daily loss limit (USD)"
            value={formData.dailyLossLimitUsd}
            onChange={(e) => setFormData({ ...formData, dailyLossLimitUsd: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2"
          />
        </div>
        <div>
          <label className="block text-sm font-bold theme-text mb-2 uppercase tracking-wide">Max Trades Per Day</label>
          <input
            type="number"
            aria-label="Max trades per day"
            value={formData.maxTradesPerDay}
            onChange={(e) => setFormData({ ...formData, maxTradesPerDay: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2"
          />
        </div>
        <div>
          <label className="block text-sm font-bold theme-text mb-2 uppercase tracking-wide">Max Contracts Per Trade</label>
          <input
            type="number"
            aria-label="Max contracts per trade"
            value={formData.maxContractsPerTrade}
            onChange={(e) => setFormData({ ...formData, maxContractsPerTrade: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2"
          />
        </div>
      </div>

      <div 
        className="p-5 rounded-xl space-y-4"
        style={{
          backgroundColor: 'var(--theme-bg-tertiary)',
        }}
      >
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.requirePlannedRisk}
            onChange={(e) => setFormData({ ...formData, requirePlannedRisk: e.target.checked })}
            className="w-5 h-5 rounded"
            style={{
              accentColor: 'var(--theme-primary)',
            }}
          />
          <span className="text-sm theme-text font-medium">Require Planned Risk</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.requireStopDefined}
            onChange={(e) => setFormData({ ...formData, requireStopDefined: e.target.checked })}
            className="w-5 h-5 rounded"
            style={{
              accentColor: 'var(--theme-primary)',
            }}
          />
          <span className="text-sm theme-text font-medium">Require Stop Defined</span>
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-3">
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true); setError(null);
            try { await onSave(formData); }
            catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save risk rules.'); }
            finally { setSaving(false); }
          }}
          className="flex-1 px-6 py-3 rounded-xl font-bold theme-text transition-all hover:scale-105"
          style={{
            background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all"
          style={{
            backgroundColor: 'var(--theme-bg-tertiary)',
            color: 'var(--theme-text)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
