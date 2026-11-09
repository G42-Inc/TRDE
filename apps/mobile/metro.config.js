const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Load environment variables BEFORE Metro config is processed
// This ensures EXPO_PUBLIC_* vars are available for inlining
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const equalsIndex = trimmed.indexOf('=');
          if (equalsIndex > 0) {
            const key = trimmed.substring(0, equalsIndex);
            const value = trimmed.substring(equalsIndex + 1);
            // Only set if not already defined
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  } catch (e) {
    // Silently ignore errors
  }
}

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Load env files - mobile first, then web fallback
loadEnvFile(path.resolve(projectRoot, '.env'));
loadEnvFile(path.resolve(projectRoot, '../web/.env.local'));

// Map NEXT_PUBLIC_ to EXPO_PUBLIC_ if needed
if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

const config = getDefaultConfig(projectRoot);

// For pnpm workspaces, Metro needs to resolve from multiple node_modules
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure TypeScript files are resolved correctly
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

// Suppress TypeScript/Flow type errors in node_modules
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

module.exports = config;
