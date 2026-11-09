'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import type { PlanTier, EntitlementStatus } from '@/lib/entitlements/types';

interface User {
  user_id: string;
  email: string;
  display_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface Entitlement {
  user_id: string;
  plan: PlanTier;
  status: EntitlementStatus;
  current_period_end: string | null;
  source: 'stripe' | 'manual';
  override_enabled: boolean;
  override_expires_at: string | null;
  notes: string | null;
}

export function AdminPanel({ adminUserId }: { adminUserId: string }) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    userId: '',
  });
  const [searchResults, setSearchResults] = useState<(User & { entitlement: Entitlement | null })[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [entitlementForm, setEntitlementForm] = useState({
    plan: 'basic' as PlanTier,
    status: 'comped' as EntitlementStatus,
    override_enabled: true,
    override_expires_at: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to logout' });
      setLogoutLoading(false);
    }
  };

  const handleSearch = async () => {
    // Check if at least one filter is filled
    const hasFilters = Object.values(searchFilters).some(value => value.trim() !== '');
    
    if (!hasFilters && !searchQuery.trim()) {
      setMessage({ type: 'error', text: 'Please enter at least one search criteria.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      // Build query params from filters
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await fetch(`/api/admin/search?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.details 
          ? `${data.error || 'Failed to search users'}: ${data.details}`
          : data.error || 'Failed to search users';
        setMessage({ type: 'error', text: errorMsg });
        setSearchResults([]);
        console.error('Search API error:', data);
        return;
      }
      
      setSearchResults(data.users || []);
      
      // Show helpful message if no results
      if ((data.users || []).length === 0 && data.message) {
        setMessage({ type: 'error', text: data.message });
      } else if ((data.users || []).length === 0) {
        setMessage({ type: 'error', text: 'No users found. If this is an SSO user, try using "Sync from Clerk" button below.' });
      } else {
        // Clear any previous error messages on success
        setMessage(null);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      const errorMsg = error.message 
        ? `Network error: ${error.message}`
        : 'Failed to search users. Please check your connection and try again.';
      setMessage({ type: 'error', text: errorMsg });
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchFilters({
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      userId: '',
    });
    setSearchQuery('');
    setSearchResults([]);
    setMessage(null);
  };

  const handleManualSync = async () => {
    const emailToSync = searchQuery.trim() || searchFilters.email.trim();
    if (!emailToSync) {
      setMessage({ type: 'error', text: 'Please enter an email address to sync.' });
      return;
    }

    setSyncing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/sync-user-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSync }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to sync user' });
        setSyncing(false);
        return;
      }

      setMessage({ type: 'success', text: `User synced successfully! Profile: ${data.profile?.email || 'N/A'}` });
      // Refresh search after sync
      setTimeout(() => {
        handleSearch();
      }, 500);
      setSyncing(false);
    } catch (error) {
      console.error('Sync error:', error);
      setMessage({ type: 'error', text: 'Failed to sync user. Please try again.' });
      setSyncing(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          ...entitlementForm,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Access granted successfully' });
        // Refresh search results
        handleSearch();
        setSelectedUser(null);
        setEntitlementForm({
          plan: 'basic',
          status: 'comped',
          override_enabled: true,
          override_expires_at: '',
          notes: '',
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to grant access' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to grant access' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke access for this user?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/entitlements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Access revoked successfully' });
        handleSearch();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to revoke access' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke access' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Dashboard Link and Logout */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold theme-text">Admin Panel</h1>
          <p className="text-xs theme-text-secondary mt-1">DEV MODE: Standalone authentication</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app"
            className="px-4 py-2 theme-button rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
          >
            {logoutLoading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Search Filters Card */}
      <div className="theme-bg-secondary p-6 rounded-lg theme-border border shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold theme-text">Search Users</h2>
            <p className="text-sm theme-text-secondary mt-1">
              Fill at least one field to search. All fields are optional.
            </p>
          </div>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm theme-text-secondary hover:theme-text border theme-border rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Quick Search (General) */}
        <div className="mb-6">
          <label className="block text-sm font-medium theme-text mb-2">
            Quick Search (searches all fields)
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter any search term..."
            className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
          />
        </div>

        {/* Filter Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium theme-text mb-2">
              Email
            </label>
            <input
              type="email"
              value={searchFilters.email}
              onChange={(e) => setSearchFilters({ ...searchFilters, email: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="user@example.com"
              className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text mb-2">
              Username
            </label>
            <input
              type="text"
              value={searchFilters.username}
              onChange={(e) => setSearchFilters({ ...searchFilters, username: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="username"
              className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text mb-2">
              User ID
            </label>
            <input
              type="text"
              value={searchFilters.userId}
              onChange={(e) => setSearchFilters({ ...searchFilters, userId: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="user_xxx"
              className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text mb-2">
              First Name
            </label>
            <input
              type="text"
              value={searchFilters.firstName}
              onChange={(e) => setSearchFilters({ ...searchFilters, firstName: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="John"
              className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={searchFilters.lastName}
              onChange={(e) => setSearchFilters({ ...searchFilters, lastName: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Doe"
              className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSearch}
            disabled={loading || (!searchQuery.trim() && !Object.values(searchFilters).some(v => v.trim()))}
            className="px-6 py-2 theme-button rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          
          {/* Manual Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={syncing || loading || (!searchQuery.trim() && !searchFilters.email.trim())}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'Syncing...' : 'Sync from Clerk'}
          </button>
          
          <div className="text-xs theme-text-tertiary ml-auto">
            {Object.values(searchFilters).filter(v => v.trim()).length > 0 || searchQuery.trim() 
              ? `Using ${Object.values(searchFilters).filter(v => v.trim()).length + (searchQuery.trim() ? 1 : 0)} filter(s)`
              : 'At least one filter required'}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="theme-bg-secondary p-6 rounded-lg theme-border border">
          <h2 className="text-xl font-semibold theme-text mb-4">
            Search Results ({searchResults.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((user) => {
              // Parse display name to extract first/last if needed
              const displayNameParts = user.display_name?.split(' ') || [];
              const firstName = user.first_name || (displayNameParts.length > 0 ? displayNameParts[0] : null);
              const lastName = user.last_name || (displayNameParts.length > 1 ? displayNameParts.slice(1).join(' ') : null);
              const hasName = firstName || lastName;
              
              return (
                <div
                  key={user.user_id}
                  className="p-5 theme-bg-tertiary rounded-xl theme-border border hover:border-opacity-60 transition-all shadow-sm hover:shadow-md"
                >
                  {/* User Info Section */}
                  <div className="mb-4">
                    {/* Email (Primary) */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold theme-text-tertiary uppercase tracking-wider mb-1">Email</p>
                      <p className="font-semibold theme-text break-all">{user.email}</p>
                    </div>

                    {/* Name Section */}
                    {hasName && (
                      <div className="mb-3 space-y-1">
                        <p className="text-xs font-semibold theme-text-tertiary uppercase tracking-wider">Name</p>
                        <p className="theme-text font-medium">
                          {firstName && lastName ? `${firstName} ${lastName}` : user.display_name}
                        </p>
                      </div>
                    )}

                    {/* Username/Display Name */}
                    {user.display_name && !hasName && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold theme-text-tertiary uppercase tracking-wider mb-1">Username</p>
                        <p className="theme-text-secondary">{user.display_name}</p>
                      </div>
                    )}

                    {/* User ID */}
                    <div className="mt-3 pt-3 border-t theme-border">
                      <p className="text-xs font-semibold theme-text-tertiary uppercase tracking-wider mb-1">User ID</p>
                      <p className="text-xs theme-text-tertiary font-mono break-all">{user.user_id}</p>
                    </div>
                  </div>

                  {/* Entitlement Status */}
                  {user.entitlement ? (
                    <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg">
                      <p className="text-xs font-semibold theme-text-tertiary uppercase tracking-wider mb-2">Current Plan</p>
                      <div className="space-y-1 text-sm">
                        <p className="theme-text font-semibold capitalize">{user.entitlement.plan}</p>
                        <p className="theme-text-secondary">Status: <span className="capitalize">{user.entitlement.status}</span></p>
                        {user.entitlement.override_enabled && (
                          <p className="text-xs theme-text-tertiary">
                            {user.entitlement.override_expires_at 
                              ? `Expires: ${new Date(user.entitlement.override_expires_at).toLocaleDateString()}`
                              : 'Permanent Access'}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs theme-text-secondary">No active subscription</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedUser(user.user_id)}
                      className="flex-1 px-4 py-2 theme-button rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                      {user.entitlement ? 'Update' : 'Grant Access'}
                    </button>
                    {user.entitlement && (
                      <button
                        onClick={() => handleRevokeAccess(user.user_id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="theme-bg-secondary p-6 rounded-xl max-w-md w-full theme-border border">
            <h3 className="text-xl font-semibold theme-text mb-4">Grant Access</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium theme-text mb-2">Plan</label>
                <select
                  value={entitlementForm.plan}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, plan: e.target.value as PlanTier })}
                  className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
                >
                  <option value="basic">Basic</option>
                  <option value="edge">Edge</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text mb-2">Expires At (optional)</label>
                <input
                  type="date"
                  value={entitlementForm.override_expires_at}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, override_expires_at: e.target.value })}
                  className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
                />
                <p className="text-xs theme-text-secondary mt-1">Leave empty for permanent access</p>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text mb-2">Notes</label>
                <textarea
                  value={entitlementForm.notes}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, notes: e.target.value })}
                  className="w-full px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text focus:outline-none focus:ring-2 theme-ring"
                  rows={3}
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleGrantAccess}
                  disabled={loading}
                  className="flex-1 px-4 py-2 theme-button rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Granting...' : 'Grant Access'}
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-2 theme-bg-tertiary theme-border border rounded-lg theme-text hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
