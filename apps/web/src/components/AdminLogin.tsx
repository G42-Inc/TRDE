'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export function AdminLogin() {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid admin password');
        setLoading(false);
        return;
      }

      // Redirect to admin panel
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError('Failed to authenticate. Please try again.');
      setLoading(false);
    }
  };

  // Only show if user is signed in
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
      <button
        onClick={() => setShowAdminForm(!showAdminForm)}
        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        {showAdminForm ? '▼ Hide' : '▲ Show'} Admin Login
      </button>

      {showAdminForm && (
        <form onSubmit={handleAdminLogin} className="mt-4 space-y-4">
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              disabled={loading}
              required
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Login as Admin'}
          </button>
        </form>
      )}
    </div>
  );
}
