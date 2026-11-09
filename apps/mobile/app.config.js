const fs = require('fs');
const path = require('path');

// Manually read .env files without console output
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          if (key && !process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {
    // Silently ignore errors
  }
}

// Load from mobile .env first, then fallback to web's .env.local
loadEnvFile(path.resolve(__dirname, '.env'));
loadEnvFile(path.resolve(__dirname, '../web/.env.local'));

// Get Clerk key from either prefix
const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

module.exports = {
  expo: {
    name: "TRDE",
    slug: "trde",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.trde.mobile"
    },
    android: {
      package: "com.trde.mobile",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    scheme: "trde",
    plugins: [
      [
        "expo-secure-store",
        {
          faceIDPermission: "Allow $(PRODUCT_NAME) to access Face ID biometric data."
        }
      ]
    ],
    extra: {
      // Try both EXPO_PUBLIC_ and NEXT_PUBLIC_ prefixes
      clerkPublishableKey: clerkKey,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000',
    }
  }
};
