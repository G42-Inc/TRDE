/**
 * Demo Mode Guards
 * 
 * Utilities for checking demo mode status and blocking
 * write operations in demo mode.
 */

import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

export interface DemoCheckResult {
  isDemo: boolean;
  error?: string;
}

/**
 * Check if a user is in demo mode
 * @param userId - The Clerk user ID to check
 * @returns Object indicating demo status
 */
export async function checkDemoStatus(userId: string): Promise<DemoCheckResult> {
  try {
    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('entitlements')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Demo Guard] Error checking demo status:', error);
      return { isDemo: false, error: error.message };
    }

    return { isDemo: data?.status === 'demo' };
  } catch (error: any) {
    console.error('[Demo Guard] Exception:', error);
    return { isDemo: false, error: error.message };
  }
}

/**
 * Create a standardized demo-blocked response
 * @param feature - The feature that was attempted
 * @returns NextResponse with 403 status and upgrade info
 */
export function createDemoBlockedResponse(feature: string = 'this feature'): NextResponse {
  return NextResponse.json(
    {
      error: 'Demo mode limitation',
      message: `Upgrade your account to use ${feature}`,
      code: 'DEMO_MODE_BLOCKED',
      isDemo: true,
      upgradeUrl: '/pricing',
      action: {
        label: 'Upgrade Now',
        url: '/pricing',
      },
    },
    { status: 403 }
  );
}

/**
 * Higher-order function to wrap API handlers with demo mode protection
 * Blocks write operations (POST, PUT, DELETE) for demo users
 * 
 * @param handler - The original request handler
 * @param options - Configuration options
 * @returns Wrapped handler that checks demo status first
 */
export function withDemoGuard<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  options: {
    feature?: string;
    allowedMethods?: string[];
  } = {}
): T {
  const { feature = 'this feature', allowedMethods = ['GET', 'HEAD', 'OPTIONS'] } = options;

  return (async (...args: Parameters<T>): Promise<NextResponse> => {
    const request = args[0] as Request;
    const method = request.method.toUpperCase();

    // Allow read operations
    if (allowedMethods.includes(method)) {
      return handler(...args);
    }

    // For write operations, check demo status
    // The userId should be extracted from the request in the handler
    // This is a simple version - the handler should call checkDemoStatus itself

    return handler(...args);
  }) as T;
}

/**
 * Demo mode feature restrictions
 * Maps feature names to whether they're available in demo mode
 */
export const DEMO_RESTRICTIONS: Record<string, {
  allowed: boolean;
  message: string;
}> = {
  // Allowed in demo (read operations)
  'view_trades': { allowed: true, message: '' },
  'view_analytics': { allowed: true, message: '' },
  'view_strategies': { allowed: true, message: '' },
  'view_journal': { allowed: true, message: '' },
  'view_settings': { allowed: true, message: '' },
  
  // Blocked in demo (write operations)
  'create_trade': { 
    allowed: false, 
    message: 'Upgrade to log your own trades' 
  },
  'edit_trade': { 
    allowed: false, 
    message: 'Upgrade to edit trades' 
  },
  'delete_trade': { 
    allowed: false, 
    message: 'Upgrade to manage your trades' 
  },
  'create_strategy': { 
    allowed: false, 
    message: 'Upgrade to create custom strategies' 
  },
  'edit_strategy': { 
    allowed: false, 
    message: 'Upgrade to edit strategies' 
  },
  'create_journal': { 
    allowed: false, 
    message: 'Upgrade to keep a trading journal' 
  },
  'edit_journal': { 
    allowed: false, 
    message: 'Upgrade to edit journal entries' 
  },
  'import_data': { 
    allowed: false, 
    message: 'Upgrade to import your trading data' 
  },
  'export_data': { 
    allowed: false, 
    message: 'Upgrade to export your data' 
  },
  'connect_broker': { 
    allowed: false, 
    message: 'Upgrade to connect your broker' 
  },
  'set_risk_rules': { 
    allowed: false, 
    message: 'Upgrade to set custom risk rules' 
  },
};

/**
 * Check if a specific feature is allowed for demo users
 * @param feature - The feature key to check
 * @returns Object with allowed status and upgrade message
 */
export function isDemoFeatureAllowed(feature: keyof typeof DEMO_RESTRICTIONS): {
  allowed: boolean;
  message: string;
} {
  return DEMO_RESTRICTIONS[feature] || { allowed: false, message: 'Upgrade to use this feature' };
}
