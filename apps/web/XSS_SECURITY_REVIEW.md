# XSS (Cross-Site Scripting) Security Review

## Executive Summary

**Status**: ⚠️ **VULNERABILITIES FOUND** - Multiple instances of user input rendered without sanitization

**Risk Level**: **MEDIUM-HIGH** - React's default escaping provides some protection, but defense-in-depth is needed

## Vulnerabilities Found

### 🔴 HIGH RISK: User-Generated Content Rendered Directly

#### 1. Trade Notes
**Location**: `apps/web/src/app/trades/[id]/page.tsx:275`
```tsx
<dd className="text-sm text-black/80 dark:text-white/80">{trade.notes || 'No notes'}</dd>
```
**Issue**: User-provided notes rendered directly
**Risk**: If malicious script is stored in notes, it could execute
**Impact**: Medium - Notes are user's own data, but could be exploited if account is compromised

#### 2. Collection Names
**Location**: `apps/web/src/app/trades/[id]/page.tsx:340`
```tsx
<span className="text-sm text-black dark:text-white">{collection.name}</span>
```
**Issue**: User-created collection names rendered directly
**Risk**: Malicious collection names could contain XSS payloads
**Impact**: Medium - Affects user's own collections

#### 3. Attachment Captions
**Location**: `apps/web/src/app/trades/[id]/page.tsx:318`
```tsx
{attachment.caption}
```
**Issue**: User-provided image captions rendered directly
**Risk**: Malicious captions could contain XSS
**Impact**: Medium - Affects user's own attachments

#### 4. Journal Entries
**Location**: `apps/web/src/app/journal/page.tsx`
- Line 238: `{bias.reason}` - Daily bias reason
- Line 243: `{bias.confirmationNotes}` - Confirmation notes
- Line 349: `{journal.shortNote}` - Quick journal notes

**Issue**: Multiple user text fields rendered directly
**Risk**: Malicious journal entries could contain XSS
**Impact**: Medium - Affects user's own journal data

#### 5. Strategy Names and Descriptions
**Location**: Multiple files
- `apps/web/src/app/strategies/page.tsx:170` - `{strategy.name}`
- `apps/web/src/app/strategies/page.tsx:383` - `{strategy.description}`
- `apps/web/src/app/review/page.tsx:385` - `{strategy?.name || strategyId}`

**Issue**: User-created strategy names/descriptions rendered directly
**Risk**: Malicious strategy names could contain XSS
**Impact**: Medium - Affects user's own strategies

#### 6. Todo Descriptions
**Location**: `apps/web/src/components/TodoList.tsx:159`
```tsx
<p className="text-xs text-black/60 dark:text-white/60 mt-1">{todo.description}</p>
```
**Issue**: Todo descriptions rendered directly
**Risk**: Malicious todo descriptions could contain XSS
**Impact**: Low-Medium - Affects user's own todos

### 🟡 MEDIUM RISK: Attribute Injection

#### 7. Image Alt Attributes
**Location**: `apps/web/src/app/trades/[id]/page.tsx:312`
```tsx
<img
  src={attachment.uri}
  alt={attachment.caption || 'Screenshot'}
  ...
/>
```
**Issue**: User-provided caption used in `alt` attribute
**Risk**: If caption contains quotes, could break out of attribute
**Impact**: Low-Medium - React escapes attributes, but should sanitize

### 🟢 LOW RISK: Safe Usage

#### 8. dangerouslySetInnerHTML Usage
**Location**: 
- `apps/web/src/app/layout.tsx:39` - Theme script (static, safe)
- `apps/web/src/app/edge/chart/page.tsx:1219` - CSS styles (static, safe)

**Status**: ✅ **SAFE** - Both instances use static content, not user input

## React's Built-in Protection

React automatically escapes content in JSX by default:
- Text content: `{userInput}` is automatically escaped
- Attributes: React escapes attribute values
- Prevents most XSS attacks

**However**, React's protection can be bypassed if:
1. `dangerouslySetInnerHTML` is used with user input
2. Content is rendered in `href` or `src` attributes without validation
3. Content is used in `eval()` or `Function()` constructors
4. Content is used in `setTimeout`/`setInterval` with string arguments

## Recommended Fixes

### 1. Install DOMPurify
```bash
pnpm add dompurify
pnpm add -D @types/dompurify
```

### 2. Create Sanitization Utility
Create `apps/web/src/lib/security/sanitize.ts`:
```typescript
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS
 * Use for user-generated content that needs HTML rendering
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: return as-is (React will escape it)
    return dirty;
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize plain text (strip all HTML)
 * Use for user input that should be plain text only
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  if (typeof window === 'undefined') {
    return text;
  }
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Escape HTML entities manually (for server-side)
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
```

### 3. Update Components to Use Sanitization

For plain text fields (notes, descriptions, names):
```tsx
import { sanitizeText } from '@/lib/security/sanitize';

// Instead of:
{trade.notes || 'No notes'}

// Use:
{sanitizeText(trade.notes) || 'No notes'}
```

For attributes:
```tsx
<img
  src={attachment.uri}
  alt={sanitizeText(attachment.caption) || 'Screenshot'}
/>
```

## Additional Security Measures

### 1. Content Security Policy (CSP)
Add CSP headers in `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // 'unsafe-inline' needed for theme script
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
    ].join('; '),
  },
];
```

### 2. Input Validation
Add server-side validation for user input:
- Max length limits
- Character restrictions
- Content type validation

### 3. Output Encoding
- Always use React's JSX (automatic escaping)
- Never use `dangerouslySetInnerHTML` with user input
- Sanitize before rendering

## Testing for XSS

### Test Payloads
Try entering these in user input fields:
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
javascript:alert('XSS')
```

### Expected Behavior
- Scripts should NOT execute
- HTML should be escaped/displayed as text
- No JavaScript should run

## Priority Fix Order

1. **URGENT**: Trade notes, collection names, attachment captions
2. **HIGH**: Journal entries (bias reasons, notes)
3. **MEDIUM**: Strategy names/descriptions
4. **LOW**: Todo descriptions
5. **LOW**: Add CSP headers

## Files Requiring Updates

- `apps/web/src/app/trades/[id]/page.tsx`
- `apps/web/src/app/journal/page.tsx`
- `apps/web/src/app/strategies/page.tsx`
- `apps/web/src/components/TodoList.tsx`
- `apps/web/src/app/review/page.tsx`
- `apps/web/src/app/trades/page.tsx` (collection names)
- `apps/web/next.config.js` (CSP headers)

## Conclusion

While React provides good default XSS protection, implementing explicit sanitization provides:
- Defense-in-depth security
- Protection against future React changes
- Clear security intent in code
- Protection against attribute injection
- Better security posture

**Recommendation**: Implement sanitization for all user-generated content before rendering.
