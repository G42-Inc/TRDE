/**
 * Input Validation Utilities
 * 
 * Common validation functions for API routes.
 */

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate Clerk user ID format
 */
export function isValidClerkUserId(str: string): boolean {
  return typeof str === 'string' && str.startsWith('user_') && str.length > 5;
}

/**
 * Sanitize string input - remove potential XSS
 */
export function sanitizeString(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate ISO date string
 */
export function isValidISODate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString();
}

/**
 * Validate date string (less strict than ISO)
 */
export function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validate non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

/**
 * Validate array of specific type
 */
export function isArrayOf<T>(
  value: unknown,
  validator: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(validator);
}

/**
 * Validate string is one of allowed values
 */
export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * Create a validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate object against a schema
 */
export function validateObject(
  obj: Record<string, unknown>,
  schema: Record<string, {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
    validator?: (value: unknown) => boolean;
    message?: string;
  }>
): ValidationResult {
  const errors: string[] = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    
    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(rules.message || `${field} is required`);
      continue;
    }
    
    // Skip validation for optional undefined/null values
    if (value === undefined || value === null) continue;
    
    // Check type
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(rules.message || `${field} must be a ${rules.type}`);
        continue;
      }
    }
    
    // Run custom validator
    if (rules.validator && !rules.validator(value)) {
      errors.push(rules.message || `${field} is invalid`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
