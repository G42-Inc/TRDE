import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import Stripe from 'stripe';

/**
 * Health Check Endpoint
 * 
 * GET /api/health
 * 
 * Returns the health status of the application and its dependencies.
 * Used for monitoring and uptime checks.
 */
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    checks: {
      application: {
        status: 'healthy' as 'healthy' | 'unhealthy',
        message: 'Application is running',
      },
      database: {
        status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown',
        message: '',
        latency: 0,
      },
      stripe: {
        status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown',
        message: '',
      },
    },
  };

  let overallHealthy = true;

  // Check database connectivity
  try {
    const startTime = Date.now();
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from('profiles').select('count').limit(1);
    const latency = Date.now() - startTime;

    if (error) {
      checks.checks.database = {
        status: 'unhealthy',
        message: `Database query failed: ${error.message}`,
        latency,
      };
      overallHealthy = false;
    } else {
      checks.checks.database = {
        status: 'healthy',
        message: 'Database connection successful',
        latency,
      };
    }
  } catch (error: any) {
    checks.checks.database = {
      status: 'unhealthy',
      message: `Database connection error: ${error.message}`,
      latency: 0,
    };
    overallHealthy = false;
  }

  // Check Stripe connectivity (lightweight check - just validate key format)
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.trim() === '') {
      checks.checks.stripe = {
        status: 'unhealthy',
        message: 'STRIPE_SECRET_KEY not configured',
      };
      overallHealthy = false;
    } else if (!stripeKey.startsWith('sk_')) {
      checks.checks.stripe = {
        status: 'unhealthy',
        message: 'STRIPE_SECRET_KEY has invalid format',
      };
      overallHealthy = false;
    } else {
      // Optional: Make a lightweight API call to verify key works
      // For now, just check format to avoid unnecessary API calls
      checks.checks.stripe = {
        status: 'healthy',
        message: 'Stripe key configured (format validated)',
      };
    }
  } catch (error: any) {
    checks.checks.stripe = {
      status: 'unhealthy',
      message: `Stripe check error: ${error.message}`,
    };
    overallHealthy = false;
  }

  // Determine overall status
  if (!overallHealthy) {
    // If any critical check failed, status is unhealthy
    // If only non-critical checks failed, status is degraded
    const criticalFailed = 
      checks.checks.database.status === 'unhealthy' || 
      checks.checks.application.status === 'unhealthy';
    
    checks.status = criticalFailed ? 'unhealthy' : 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
