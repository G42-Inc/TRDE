/**
 * Startup Validation
 * 
 * Validates environment variables and configuration at application startup.
 * This should be imported and called early in the application lifecycle.
 * 
 * For Next.js, this can be called in middleware or in a server-side initialization file.
 */

import { validateEnvironmentVariables } from './env.server';
import { validateStripePriceIds } from './stripe/validate-startup';

/**
 * Validate all application configuration at startup
 * Call this in middleware or server initialization
 */
export function validateApplicationStartup(): void {
  try {
    // Validate environment variables
    validateEnvironmentVariables();
    
    // Validate Stripe price IDs
    validateStripePriceIds();
    
    console.log('✓ Application startup validation passed');
  } catch (error: any) {
    console.error('❌ Application startup validation failed:');
    console.error(error.message);
    
    // In production, we might want to crash the app if validation fails
    // In development, we can continue with warnings
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}
