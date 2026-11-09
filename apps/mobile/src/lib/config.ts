/**
 * Mobile App Configuration
 * 
 * Environment variables are inlined at build time by babel-plugin-transform-inline-environment-variables.
 * They are loaded in metro.config.js from:
 * 1. apps/mobile/.env
 * 2. apps/web/.env.local (fallback)
 * 
 * The NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from the web app is automatically
 * mapped to EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in metro.config.js
 */

// These get replaced at build time by babel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: { env: Record<string, string | undefined> };

// Clerk publishable key - inlined at build time
export const CLERK_PUBLISHABLE_KEY = 
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 
  '';

// API URL configuration
const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000';

export const API_BASE_URL = 
  apiUrl || 
  `${webUrl.replace(/\/$/, '')}/api/data`;

// Runtime warning (this runs in the app, not at build time)
if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('⚠️ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY not set. Authentication will not work.');
} else {
  console.log('[Config] Clerk Publishable Key loaded:', CLERK_PUBLISHABLE_KEY.substring(0, 20) + '...');
}
