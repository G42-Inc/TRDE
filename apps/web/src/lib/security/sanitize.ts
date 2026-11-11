/**
 * XSS Protection Utilities
 * 
 * Plain text and HTML escaping utilities. React escapes text children and string
 * attributes automatically; HTML strings need explicit escaping at that boundary.
 */

/**
 * Return plain text for React text children and string attributes.
 * Do not pass the result to innerHTML or dangerouslySetInnerHTML. Keeping the
 * original text avoids double escaping and server/client hydration differences.
 * 
 * @param text - User-provided text that may contain HTML/script tags
 * @returns Plain text for rendering through React
 */
export function sanitizeText(text: string | null | undefined): string {
  return text ?? '';
}

/**
 * Escape HTML entities manually
 * Use only when constructing an HTML string, not React text children.
 * 
 * @param text - Text to escape
 * @returns Escaped text safe for HTML
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitize text for use in HTML attributes
 * Prevents attribute injection attacks
 * 
 * @param text - Text to sanitize for attribute use
 * @returns Sanitized text safe for HTML attributes
 */
export function sanitizeAttribute(text: string | null | undefined): string {
  if (!text) return '';
  return escapeHtml(text);
}
