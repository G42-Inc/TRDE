# Testing the Mobile App

## 🎯 Best Method for Feature Parity Testing

**Recommended: iOS Simulator (macOS) or Android Emulator**

For ensuring **full feature parity** between web and mobile, use a **simulator/emulator**:

### Why Simulator/Emulator is Best:
✅ **Full native functionality** - All features work exactly as in production  
✅ **Production-like performance** - Real device performance characteristics  
✅ **Easy debugging** - Native debugging tools and console access  
✅ **Side-by-side testing** - Run web and mobile simultaneously  
✅ **No device limitations** - Test all screen sizes and orientations  
✅ **Consistent environment** - Same setup every time  

### Quick Start (iOS Simulator - macOS):
```bash
cd apps/mobile
pnpm ios
```

### Quick Start (Android Emulator):
```bash
cd apps/mobile
pnpm android
```

### Complete Parity Testing Workflow:
1. **Start web app** in one terminal: `pnpm dev:web`
2. **Start mobile app** in another terminal: `pnpm dev:mobile` → press `i` (iOS) or `a` (Android)
3. **Test features side-by-side** to ensure identical functionality

---

## Prerequisites

1. **Install dependencies** (if not already done):
   ```bash
   pnpm install
   ```

2. **Install Expo CLI globally** (optional, but helpful):
   ```bash
   npm install -g expo-cli
   ```

## Testing Methods

### Method 1: Expo Go (Recommended for Quick Testing)

**Best for**: Quick testing on real devices without building

1. **Install Expo Go app** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start the development server**:
   ```bash
   # From project root
   pnpm dev:mobile
   
   # Or from mobile directory
   cd apps/mobile
   pnpm start
   ```

3. **Connect your device**:
   - **iOS**: Open Camera app, scan the QR code
   - **Android**: Open Expo Go app, tap "Scan QR code"
   - Make sure your phone and computer are on the same WiFi network

4. **Hot Reload**: Changes will automatically reload on your device

**Note**: Some native features may be limited in Expo Go. For full functionality, use a development build.

---

### Method 2: iOS Simulator (macOS only)

**Best for**: Testing on iOS without a physical device

1. **Install Xcode** from the Mac App Store (includes iOS Simulator)

2. **Start the simulator**:
   ```bash
   cd apps/mobile
   pnpm ios
   ```
   
   Or:
   ```bash
   pnpm dev:mobile
   # Then press 'i' in the terminal
   ```

3. **Select a simulator** when prompted (e.g., iPhone 15 Pro)

---

### Method 3: Android Emulator

**Best for**: Testing on Android without a physical device

1. **Install Android Studio**:
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install Android SDK and create an Android Virtual Device (AVD)

2. **Start the emulator**:
   ```bash
   cd apps/mobile
   pnpm android
   ```
   
   Or:
   ```bash
   pnpm dev:mobile
   # Then press 'a' in the terminal
   ```

3. **First time setup**: You may need to accept Android SDK licenses:
   ```bash
   # On macOS/Linux
   ~/Library/Android/sdk/tools/bin/sdkmanager --licenses
   
   # Accept all licenses when prompted
   ```

---

### Method 4: Web Browser (Limited)

**Best for**: Quick UI testing (some React Native features won't work)

```bash
cd apps/mobile
pnpm web
```

Opens in your default browser. Note: Some features like AsyncStorage work differently on web.

---

## Feature Parity Testing Checklist

Use this checklist to ensure web and mobile have identical functionality:

### ✅ Dashboard Features
- [ ] **Metrics Display**
  - [ ] All 4 metric cards render correctly
  - [ ] Values match web app exactly
  - [ ] Colors (green/red) match web
  - [ ] Subtitle text matches web
  
- [ ] **Customizable Metrics** (Settings → Dashboard Metrics)
  - [ ] All 12 metrics available in selector
  - [ ] Can change each of the 4 slots
  - [ ] Duplicate prevention works (swaps positions)
  - [ ] Changes save automatically
  - [ ] Changes reflect immediately on dashboard
  - [ ] Persists after app restart
  - [ ] Matches web app behavior exactly

- [ ] **Recent Trades**
  - [ ] List displays correctly
  - [ ] Trade details match web
  - [ ] Navigation works

### ✅ Analytics Features
- [ ] **Metric Cards**
  - [ ] All 8 metric cards display
  - [ ] Values match web app
  - [ ] Info modals work (tap info icon)

- [ ] **Dynamic Chart System**
  - [ ] Chart selector displays (8 options)
  - [ ] Can switch between all chart types
  - [ ] **Rolling Expectancy** - Line chart, 20-trade window
  - [ ] **Rolling Win Rate** - Line chart, 20-trade window
  - [ ] **Rolling Profit Factor** - Line chart, 20-trade window
  - [ ] **Rolling Avg Win R** - Line chart, 20-trade window
  - [ ] **Rolling Avg Loss R** - Line chart, 20-trade window
  - [ ] **Rolling Consistency** - Line chart, 20-trade window
  - [ ] **R Distribution** - Bar chart, histogram
  - [ ] **Day of Week** - Bar chart, performance by day
  - [ ] Chart data matches web app exactly
  - [ ] Chart styling matches web (colors, labels)

### ✅ Settings Features
- [ ] **Dashboard Metrics Customization**
  - [ ] Section appears in settings
  - [ ] 4 slot selectors work
  - [ ] All 12 metrics available
  - [ ] Auto-save on selection
  - [ ] Duplicate handling (swaps)
  - [ ] Help text displays
  - [ ] Matches web app UI/UX

- [ ] **Theme Toggle**
  - [ ] Dark/light mode works
  - [ ] Persists across app restarts
  - [ ] Matches web theme

- [ ] **Data Management**
  - [ ] Export CSV works
  - [ ] Reset data works
  - [ ] Confirmations display

### ✅ Violations Feature (Critical for Parity)
- [ ] **Violations Display**
  - [ ] Unreviewed violations show
  - [ ] Reviewed violations show
  - [ ] Can review violations
  - [ ] **CRITICAL: Reviewed violations persist after app restart**
  - [ ] Violations don't reappear after restart (if reviewed)
  - [ ] Matches web app behavior exactly

### ✅ Core Features to Test

- [ ] **Dashboard**
  - [ ] Metrics display correctly
  - [ ] Customizable metrics work (Settings → Dashboard Metrics)
  - [ ] Recent trades list
  - [ ] Dark/light theme toggle

- [ ] **Trades**
  - [ ] View trades list
  - [ ] Create new trade
  - [ ] Edit existing trade
  - [ ] View trade details
  - [ ] Delete trade

- [ ] **Analytics**
  - [ ] Metrics cards display
  - [ ] Dynamic chart selector works
  - [ ] All chart types render (Rolling Expectancy, Win Rate, etc.)
  - [ ] Chart data is accurate
  - [ ] Metric info modals work

- [ ] **Settings**
  - [ ] Dashboard metrics customization
  - [ ] Theme toggle
  - [ ] Export CSV
  - [ ] Reset data

- [ ] **Risk Management**
  - [ ] Violations display correctly
  - [ ] Review violations
  - [ ] Reviewed violations persist after app restart

- [ ] **Journal**
  - [ ] Daily biases
  - [ ] Quick journals
  - [ ] Create/edit entries

---

## Troubleshooting

### "Unable to resolve module" errors
```bash
# Clear cache and reinstall
cd apps/mobile
rm -rf node_modules
pnpm install
expo start -c  # -c clears cache
```

### Metro bundler issues
```bash
# Reset Metro bundler cache
cd apps/mobile
expo start --clear
```

### Port already in use
```bash
# Kill process on port 8081 (default Expo port)
# macOS/Linux:
lsof -ti:8081 | xargs kill -9

# Or change port:
expo start --port 8082
```

### Can't connect device to Expo Go
- Ensure phone and computer are on the same WiFi network
- Try using tunnel mode: `expo start --tunnel` (slower but works across networks)
- Check firewall settings

### iOS Simulator won't start
- Ensure Xcode Command Line Tools are installed:
  ```bash
  xcode-select --install
  ```
- Open Xcode at least once to accept license agreements

### Android Emulator issues
- Ensure Android SDK is properly installed
- Check that an AVD is created in Android Studio
- Verify `ANDROID_HOME` environment variable is set

---

## Development Tips

1. **Enable Fast Refresh**: Enabled by default - saves your app state on reload
2. **Debugging**: Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android) to open developer menu
3. **Reload**: Press `r` in terminal or shake device → "Reload"
4. **Performance**: Use `expo start --no-dev` for production-like performance

---

## Building for Production

### Development Build (Recommended)
```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Production Build
```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

**Note**: Requires Expo Application Services (EAS) account setup.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm dev:mobile` | Start Expo dev server |
| `pnpm ios` | Open iOS simulator |
| `pnpm android` | Open Android emulator |
| `pnpm web` | Open in web browser |
| `expo start --clear` | Clear cache and start |
| `expo start --tunnel` | Use tunnel mode (slower, works across networks) |
