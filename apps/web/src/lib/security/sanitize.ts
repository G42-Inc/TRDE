/**
 * XSS Protection Utilities
 * 
 * These functions sanitize user input to prevent Cross-Site Scripting (XSS) attacks.
 * React automatically escapes content in JSX, but explicit sanitization provides
 * defense-in-depth security.
 */

/**
 * Sanitize plain text (strip all HTML)
 * Use for user input that should be plain text only (notes, names, descriptions)
 * 
 * @param text - User-provided text that may contain HTML/script tags
 * @returns Sanitized plain text safe for rendering
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Server-side: Basic HTML entity escaping
  if (typeof window === 'undefined') {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Client-side: Use DOMPurify if available, otherwise basic escaping
  try {
    const DOMPurify = require('isomorphic-dompurify');
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  } catch {
    // Fallback to basic escaping if DOMPurify not available
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Escape HTML entities manually
 * Use for server-side rendering or when DOMPurify is not available
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
  return sanitizeText(text).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
