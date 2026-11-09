# Troubleshooting iOS Simulator Connection Issues

## Problem: "Operation timed out" when opening simulator

This happens when Expo tries to automatically open Expo Go in the simulator but can't connect.

## Solutions (try in order):

### Solution 1: Use Tunnel Mode (Recommended)

Tunnel mode works across networks and avoids LAN connection issues:

```bash
cd apps/mobile
expo start --tunnel
```

Then manually:
1. Open iOS Simulator: `open -a Simulator`
2. Wait for simulator to boot
3. In Expo terminal, press `i` to launch on iOS
4. Or scan QR code with Expo Go app

### Solution 2: Manual Simulator Launch

1. **Open Simulator first:**
   ```bash
   open -a Simulator
   ```

2. **Wait for simulator to fully boot** (30-60 seconds)

3. **Start Expo:**
   ```bash
   cd apps/mobile
   pnpm start
   ```

4. **In Expo terminal, press `i`** to launch on iOS

### Solution 3: Use Development Build (Best for React Navigation)

Since you're using React Navigation (not expo-router), you may need a development build:

```bash
# Install EAS CLI (if not installed)
npm install -g eas-cli

# Login to Expo
eas login

# Build development client
eas build --profile development --platform ios --local
```

**Note:** This requires Xcode and takes longer, but gives you full native functionality.

### Solution 4: Test on Web First

For quick testing of functionality:

```bash
cd apps/mobile
pnpm web
```

Opens in browser - good for testing logic, but some React Native features won't work.

### Solution 5: Fix Network Connection

If using LAN mode:

1. **Check your IP address:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Ensure simulator can reach your Mac:**
   - Check firewall settings
   - Try disabling firewall temporarily to test

3. **Use localhost instead:**
   ```bash
   expo start --localhost
   ```

### Solution 6: Reset Simulator

If simulator is stuck:

```bash
# Kill all simulators
killall Simulator

# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all

# Try again
open -a Simulator
cd apps/mobile
pnpm ios
```

## Quick Fix Commands

```bash
# Stop current Expo process (Ctrl+C)

# Clear cache and restart with tunnel
cd apps/mobile
expo start --clear --tunnel

# In another terminal, open simulator
open -a Simulator

# Wait for simulator, then press 'i' in Expo terminal
```

## Verify Setup

1. **Check Xcode is configured:**
   ```bash
   xcode-select -p
   # Should show: /Applications/Xcode.app/Contents/Developer
   ```

2. **Check simulators available:**
   ```bash
   xcrun simctl list devices available
   ```

3. **Check Expo is running:**
   - Should see Metro bundler output
   - Should see QR code and connection info
