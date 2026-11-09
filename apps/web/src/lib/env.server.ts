/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at application startup.
 * Throws errors with clear messages if any required variables are missing.
 */

/**
 * Get environment variable with validation
 */
function getEnvVar(name: string, required: boolean = true): string {
  const value = process.env[name];
  
  if (required && (!value || value.trim() === '')) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
      `Please set ${name} in your .env.local file or environment configuration.`
    );
  }
  
  return value || '';
}

/**
 * Get optional environment variable
 */
function getOptionalEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

/**
 * Validate all required environment variables
 * Call this at application startup (e.g., in middleware or a startup script)
 */
export function validateEnvironmentVariables(): void {
  const errors: string[] = [];

  // Stripe configuration
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.trim() === '') {
    errors.push('STRIPE_SECRET_KEY is required');
  } else if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY must start with "sk_" (check if using test vs live key)');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET.trim() === '' || process.env.STRIPE_WEBHOOK_SECRET === '!') {
    errors.push('STRIPE_WEBHOOK_SECRET is required (get from Stripe Dashboard or "stripe listen" for local dev)');
  }

  // Stripe Price IDs
  if (!process.env.STRIPE_PRICE_ID_BASIC || process.env.STRIPE_PRICE_ID_BASIC.trim() === '') {
    errors.push('STRIPE_PRICE_ID_BASIC is required');
  } else if (!process.env.STRIPE_PRICE_ID_BASIC.startsWith('price_')) {
    errors.push('STRIPE_PRICE_ID_BASIC must start with "price_"');
  }

  if (!process.env.STRIPE_PRICE_ID_EDGE || process.env.STRIPE_PRICE_ID_EDGE.trim() === '') {
    errors.push('STRIPE_PRICE_ID_EDGE is required');
  } else if (!process.env.STRIPE_PRICE_ID_EDGE.startsWith('price_')) {
    errors.push('STRIPE_PRICE_ID_EDGE must start with "price_"');
  }

  if (!process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRICE_ID_PRO.trim() === '') {
    errors.push('STRIPE_PRICE_ID_PRO is required');
  } else if (!process.env.STRIPE_PRICE_ID_PRO.startsWith('price_')) {
    errors.push('STRIPE_PRICE_ID_PRO must start with "price_"');
  }

  // Supabase configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.trim() === '') {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.trim() === '') {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() === '') {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  // Clerk configuration
  if (!process.env.CLERK_WEBHOOK_SECRET || process.env.CLERK_WEBHOOK_SECRET.trim() === '') {
    errors.push('CLERK_WEBHOOK_SECRET is required');
  }

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim() === '') {
    errors.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required');
  }

  // Encryption key
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.trim() === '') {
    errors.push('ENCRYPTION_KEY is required (32-byte base64 encoded key)');
  } else {
    try {
      const key = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
      if (key.length !== 32) {
        errors.push('ENCRYPTION_KEY must be 32 bytes when base64 decoded');
      }
    } catch (e) {
      errors.push('ENCRYPTION_KEY must be valid base64');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment variable validation failed:\n\n${errors.join('\n')}\n\n` +
      `Please check your .env.local file or environment configuration.`
    );
  }
}

/**
 * Get validated environment variables (with type safety)
 */
export const env = {
  // Stripe
  STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET'),
  STRIPE_PRICE_ID_BASIC: getEnvVar('STRIPE_PRICE_ID_BASIC'),
  STRIPE_PRICE_ID_EDGE: getEnvVar('STRIPE_PRICE_ID_EDGE'),
  STRIPE_PRICE_ID_PRO: getEnvVar('STRIPE_PRICE_ID_PRO'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // Clerk
  CLERK_WEBHOOK_SECRET: getEnvVar('CLERK_WEBHOOK_SECRET'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: getEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),

  // Encryption
  ENCRYPTION_KEY: getEnvVar('ENCRYPTION_KEY'),

  // Optional
  WEBHOOK_RETRY_API_KEY: getOptionalEnvVar('WEBHOOK_RETRY_API_KEY'),
  ALLOWED_ADMIN_EMAILS: getOptionalEnvVar('ALLOWED_ADMIN_EMAILS', 'admin@example.com'),
  ADMIN_PASSWORD: getOptionalEnvVar('ADMIN_PASSWORD', ''),
  NODE_ENV: getOptionalEnvVar('NODE_ENV', 'development'),
  
  // AlphaVantage (for Flow tab)
  ALPHA_VANTAGE_API_KEY: getOptionalEnvVar('ALPHA_VANTAGE_API_KEY'),
} as const;

/**
 * Check if AlphaVantage API key is configured
 */
export function isAlphaVantageConfigured(): boolean {
  return !!env.ALPHA_VANTAGE_API_KEY && env.ALPHA_VANTAGE_API_KEY.trim() !== '';
}

/**
 * Get allowed admin emails as array
 */
export function getAllowedAdminEmails(): string[] {
  const emails = env.ALLOWED_ADMIN_EMAILS.split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);
  
  return emails.length > 0 ? emails : ['admin@example.com']; // Fallback
}

/**
 * Check if email is in allowed admin list
 */
export function isAllowedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return getAllowedAdminEmails().includes(email);
}
