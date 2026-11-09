'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ShieldCheckIcon, CreditCardIcon } from '@heroicons/react/24/outline';

interface AdminLoginSectionProps {
  hidden?: boolean;
  inlineMode?: boolean;
}

export function AdminLoginSection({ hidden = false, inlineMode = false }: AdminLoginSectionProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include', // Ensure cookies are sent
      });

      // Check if response is ok before trying to parse JSON
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Admin login: Failed to parse JSON response:', jsonError);
        setError(`Server error: Invalid response format (${response.status})`);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        console.error('Admin login: API error:', response.status, data);
        setError(data.error || data.details || 'Invalid admin password');
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to admin panel after a brief delay
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);
    } catch (err: any) {
      console.error('Admin login: Network/fetch error:', err);
      setError(`Failed to authenticate: ${err.message || 'Network error'}. Please check the browser console for details.`);
      setLoading(false);
    }
  };

  const handleSetupPaidAccess = async () => {
    setSetupLoading(true);
    setSetupError('');
    setSetupSuccess(false);

    try {
      const response = await fetch('/api/admin/setup-user', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setSetupError(data.error || 'Failed to setup paid access');
        setSetupLoading(false);
        return;
      }

      setSetupSuccess(true);
      // Refresh to update entitlement status
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error('Setup error:', err);
      setSetupError('Failed to setup paid access. Please try again.');
      setSetupLoading(false);
    }
  };

  // If hidden prop is true, don't render anything
  if (hidden) {
    return null;
  }

  // Wait for Clerk to load user data before showing the form
  if (!isLoaded) {
    if (inlineMode) return <p className="text-sm theme-text-secondary">Loading...</p>;
    return (
      <div className="theme-bg-secondary p-6 rounded-lg border theme-border">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheckIcon className="w-5 h-5 theme-text" />
          <h2 className="text-xl font-semibold theme-text">Admin Access</h2>
        </div>
        <p className="text-sm theme-text-secondary">
          Loading user information...
        </p>
      </div>
    );
  }

  // If user is not authenticated, don't show the admin login form
  // (they should sign in via Clerk first)
  if (!user) {
    return null;
  }

  // Only show setup button for authorized email
  const userEmail = user.emailAddresses[0]?.emailAddress;
  const allowedEmail = 'admin@example.com';
  const canSetupAccess = userEmail === allowedEmail;

  // Inline mode: render just the form content without wrapper
  if (inlineMode) {
    return (
      <div className="space-y-4">
        {/* Admin Login Form */}
        <div 
          className="p-5 rounded-xl"
          style={{
            backgroundColor: 'var(--theme-bg-tertiary)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheckIcon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            <h3 className="font-semibold theme-text">Admin Login</h3>
          </div>
          <p className="text-sm theme-text-secondary mb-4">
            Enter your admin password to access the admin panel.
          </p>
          <form onSubmit={handleAdminLogin} className="space-y-3">
            <input
              id="admin-password-inline"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
                setSuccess(false);
              }}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: 'var(--theme-bg)',
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-text)',
              }}
              disabled={loading}
              required
            />
            {error && (
              <p className="text-sm" style={{ color: 'var(--theme-error)' }}>{error}</p>
            )}
            {success && (
              <p className="text-sm" style={{ color: 'var(--theme-success)' }}>
                Admin access granted! Redirecting...
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-accent) 100%)',
              }}
            >
              {loading ? 'Authenticating...' : 'Enable Admin Access'}
            </button>
          </form>
        </div>

        {/* Account Setup - Only for authorized users */}
        {canSetupAccess && (
          <div 
            className="p-5 rounded-xl"
            style={{
              backgroundColor: 'var(--theme-bg-tertiary)',
              border: '1px solid var(--theme-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CreditCardIcon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              <h3 className="font-semibold theme-text">Account Setup</h3>
            </div>
            <p className="text-sm theme-text-secondary mb-4">
              Grant yourself paid access to unlock all features.
            </p>
            {setupError && (
              <p className="text-sm mb-3" style={{ color: 'var(--theme-error)' }}>{setupError}</p>
            )}
            {setupSuccess && (
              <p className="text-sm mb-3" style={{ color: 'var(--theme-success)' }}>
                Paid access granted!
              </p>
            )}
            <button
              onClick={handleSetupPaidAccess}
              disabled={setupLoading || setupSuccess}
              className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--theme-success) 0%, #059669 100%)',
              }}
            >
              {setupLoading ? 'Setting up...' : setupSuccess ? 'Access Granted ✓' : 'Grant Me Paid Access'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Standard mode: render with wrapper container
  return (
    <div className="theme-bg-secondary p-6 rounded-lg border theme-border">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheckIcon className="w-5 h-5 theme-text" />
        <h2 className="text-xl font-semibold theme-text">Admin Access</h2>
      </div>
      <p className="text-sm theme-text-secondary mb-4">
        Enter your admin password to access the admin panel and manage user entitlements.
      </p>

      <form onSubmit={handleAdminLogin} className="space-y-4">
        <div>
          <label
            htmlFor="admin-password-settings"
            className="block text-sm font-medium theme-text mb-2"
          >
            Admin Password
          </label>
          <input
            id="admin-password-settings"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
              setSuccess(false);
            }}
            placeholder="Enter admin password"
            className="w-full px-4 py-2 border theme-border rounded-lg theme-bg theme-text focus:outline-none focus:ring-2 theme-ring"
            disabled={loading}
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-400">
              Admin access granted! Redirecting to admin panel...
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !password}
            className="px-4 py-2 theme-button rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? 'Authenticating...' : 'Enable Admin Access'}
          </button>
          {success && (
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-black/10 dark:bg-white/10 theme-text rounded-lg hover:bg-black/20 dark:hover:bg-white/20 font-medium transition-colors"
            >
              Go to Admin Panel →
            </button>
          )}
        </div>
      </form>

      {canSetupAccess && (
        <div className="mt-8 pt-6 border-t theme-border">
          <div className="flex items-center gap-2 mb-4">
            <CreditCardIcon className="w-5 h-5 theme-text" />
            <h3 className="text-lg font-semibold theme-text">Account Setup</h3>
          </div>
          <p className="text-sm theme-text-secondary mb-4">
            Grant yourself paid access to unlock all features. This will add your account to the database with an active subscription.
          </p>

        {setupError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800 dark:text-red-400">{setupError}</p>
          </div>
        )}

        {setupSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800 dark:text-green-400">
              Paid access granted! Your account now has full access to all features.
            </p>
          </div>
        )}

        <button
          onClick={handleSetupPaidAccess}
          disabled={setupLoading || setupSuccess}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {setupLoading ? 'Setting up...' : setupSuccess ? 'Access Granted ✓' : 'Grant Me Paid Access'}
        </button>
        </div>
      )}
    </div>
  );
}
