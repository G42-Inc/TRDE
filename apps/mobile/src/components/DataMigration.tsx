import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useClerkUserId } from '../lib/auth/clerk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenCache } from './ClerkProviderWrapper';
import { API_BASE_URL } from '../lib/config';

/**
 * Data Migration Component for Mobile
 * 
 * Helps users migrate their AsyncStorage data to Supabase database.
 * Should be shown once when user first signs in after database migration.
 */
export function DataMigration() {
  const userId = useClerkUserId();
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [hasLocalData, setHasLocalData] = useState(false);

  // Check if user has AsyncStorage data
  useEffect(() => {
    async function checkLocalData() {
      const keys = [
        'trde_trades',
        'trde_strategies',
        'trde_versions',
        'trde_collections',
        'trde_daily_biases',
        'trde_quick_journals',
      ];
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data && data !== '[]' && data !== 'null') {
          setHasLocalData(true);
          return;
        }
      }
    }
    checkLocalData();
  }, []);

  const handleMigrate = async () => {
    if (!userId) {
      Alert.alert('Error', 'Please sign in to migrate data');
      return;
    }

    setMigrating(true);
    setError(null);
    setMigrationStatus('idle');

    try {
      // Collect all AsyncStorage data
      const data: Record<string, any> = {};
      
      const storageKeys = {
        trades: 'trde_trades',
        strategies: 'trde_strategies',
        versions: 'trde_versions',
        collections: 'trde_collections',
        dailyBiases: 'trde_daily_biases',
        quickJournals: 'trde_quick_journals',
      };

      for (const [key, storageKey] of Object.entries(storageKeys)) {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          try {
            data[key] = JSON.parse(stored);
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Get auth token
      const token = await tokenCache.getToken('__clerk_client_jwt');

      // Send to migration endpoint
      const response = await fetch(`${API_BASE_URL}/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Migration failed');
      }

      setResults(result.results || {});
      setMigrationStatus(result.success ? 'success' : 'error');

      // If successful, optionally clear AsyncStorage (user can do this manually)
      if (result.success) {
        console.log('Migration successful. You can now clear AsyncStorage if desired.');
      }
    } catch (err: any) {
      setError(err.message || 'Migration failed');
      setMigrationStatus('error');
    } finally {
      setMigrating(false);
    }
  };

  if (!hasLocalData || !userId) {
    return null; // No data to migrate or not signed in
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Migrate Your Data to Cloud Storage</Text>
      <Text style={styles.subtitle}>
        We found data in your device storage. Migrate it to your secure cloud account
        to access it from any device and ensure it's backed up.
      </Text>

      {migrationStatus === 'success' && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✓ Migration completed successfully!</Text>
          {Object.entries(results).map(([key, result]: [string, any]) => (
            <Text key={key} style={styles.resultText}>
              {result.success ? '✓' : '✗'} {key}: {result.count || 0} items
            </Text>
          ))}
        </View>
      )}

      {migrationStatus === 'error' && error && (
        <Text style={styles.errorText}>Error: {error}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, (migrating || migrationStatus === 'success') && styles.buttonDisabled]}
        onPress={handleMigrate}
        disabled={migrating || migrationStatus === 'success'}
      >
        {migrating ? (
          <ActivityIndicator color="#fff" />
        ) : migrationStatus === 'success' ? (
          <Text style={styles.buttonText}>Migration Complete</Text>
        ) : (
          <Text style={styles.buttonText}>Start Migration</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 16,
  },
  successContainer: {
    marginBottom: 16,
  },
  successText: {
    color: '#059669',
    fontWeight: '600',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    color: '#1e40af',
    marginTop: 4,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
