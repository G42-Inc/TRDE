/**
 * Currency conversion utilities
 * Converts R values to USD and formats them based on currency preference
 */

import type { Trade } from '@trde/core';

/**
 * Format a value in the selected currency
 */
export function formatCurrency(
  valueR: number,
  valueUsd: number,
  currency: 'R' | 'USD',
  options?: {
    showSign?: boolean;
    decimals?: number;
    prefix?: string;
  }
): string {
  const { showSign = false, decimals = 2, prefix = '' } = options || {};
  const value = currency === 'USD' ? valueUsd : valueR;
  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  
  if (currency === 'USD') {
    return `${sign}${prefix}$${absValue.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })}`;
  } else {
    return `${sign}${prefix}${absValue.toFixed(decimals)}R`;
  }
}

/**
 * Format a simple R value (when USD equivalent not available)
 */
export function formatR(value: number, currency: 'R' | 'USD', options?: {
  showSign?: boolean;
  decimals?: number;
}): string {
  const { showSign = false, decimals = 2 } = options || {};
  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  
  if (currency === 'USD') {
    // Estimate USD: assume 1R = ~$44 (this is a rough estimate, should be configurable)
    // For now, we'll need to calculate from trades or use a conversion rate
    const estimatedUsd = value * 44; // This is a placeholder - should use actual conversion
    return `${sign}$${estimatedUsd.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })}`;
  } else {
    return `${sign}${absValue.toFixed(decimals)}R`;
  }
}

/**
 * Get the value in the selected currency
 */
export function getCurrencyValue(valueR: number, valueUsd: number, currency: 'R' | 'USD'): number {
  return currency === 'USD' ? valueUsd : valueR;
}
