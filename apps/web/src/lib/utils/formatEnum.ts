/**
 * Formats enum values to readable title case
 * Examples:
 * - "NEW_YORK" -> "New York"
 * - "FUTURES" -> "Futures"
 * - "WIN" -> "Win"
 * - "mean_reversion" -> "Mean Reversion"
 */
export function formatEnum(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Formats setup tags - capitalizes first letter of each word
 */
export function formatSetupTag(tag: string): string {
  return tag
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
