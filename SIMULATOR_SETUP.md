# Complete Simulator Setup Guide

## Table of Contents
1. [iOS Simulator Setup (macOS only)](#ios-simulator-setup-macos-only)
2. [Android Emulator Setup](#android-emulator-setup)
3. [Running the App](#running-the-app)
4. [Verification Steps](#verification-steps)
5. [Troubleshooting](#troubleshooting)

---

## iOS Simulator Setup (macOS only)

### Prerequisites

1. **macOS Computer** (required - iOS Simulator only works on Mac)
2. **Xcode** (free from Mac App Store)
3. **Command Line Tools**

### Step-by-Step Installation

#### Step 1: Install Xcode

1. **Open Mac App Store**
2. **Search for "Xcode"**
3. **Click "Get" or "Install"** (it's free, but large ~15GB)
4. **Wait for download** (this can take 30-60 minutes depending on internet speed)
5. **Open Xcode** after installation
6. **Accept license agreement** when prompted:
   ```bash
   sudo xcodebuild -license accept
   ```

#### Step 2: Install Command Line Tools

1. **Open Terminal** (Applications → Utilities → Terminal)
2. **Run this command:**
   ```bash
   xcode-select --install
   ```
3. **Click "Install"** in the popup dialog
4. **Wait for installation** (5-10 minutes)

#### Step 3: Verify Installation

Run these commands to verify everything is installed:

```bash
# Check Xcode version
xcodebuild -version

# Check if simulators are available
xcrun simctl list devices

# Check iOS Simulator app location
which Simulator
```

**Expected output:**
- Xcode version (e.g., "Xcode 15.0")
- List of available iOS simulators
- Path to Simulator app

#### Step 4: Install CocoaPods (if needed)

Some React Native dependencies require CocoaPods:

```bash
# Install CocoaPods
sudo gem install cocoapods

# Verify installation
pod --version
```

**Note:** If you get permission errors, you may need to use:
```bash
sudo gem install -n /usr/local/bin cocoapods
```

### Step 5: Verify Project Setup

1. **Navigate to project:**
   ```bash
   cd /Users/your-user/TRDE
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Verify mobile app dependencies:**
   ```bash
   cd apps/mobile
   pnpm install
   ```

---

## Android Emulator Setup

### Prerequisites

1. **Any OS** (Windows, macOS, or Linux)
2. **Java Development Kit (JDK)**
3. **Android Studio**

### Step-by-Step Installation

#### Step 1: Install Java Development Kit (JDK)

**macOS:**
```bash
# Install via Homebrew (if you have it)
brew install openjdk@17

# Or download from: https://adoptium.net/
```

**Windows:**
- Download from: https://adoptium.net/
- Install the installer
- Set `JAVA_HOME` environment variable

**Linux:**
```bash
sudo apt-get update
sudo apt-get install openjdk-17-jdk
```

**Verify installation:**
```bash
java -version
# Should show Java version 17 or higher
```

#### Step 2: Install Android Studio

1. **Download Android Studio:**
   - Visit: https://developer.android.com/studio
   - Download for your OS
   - File is large (~1GB)

2. **Install Android Studio:**
   - **macOS:** Open .dmg, drag to Applications
   - **Windows:** Run installer, follow wizard
   - **Linux:** Extract and run `./studio.sh`

3. **First Launch Setup:**
   - Choose "Standard" installation
   - Let it download Android SDK components (this takes 10-30 minutes)
   - Accept all license agreements

#### Step 3: Configure Android SDK

1. **Open Android Studio**
2. **Go to:** Tools → SDK Manager
3. **SDK Platforms tab:**
   - Check "Android 13.0 (Tiramisu)" or latest
   - Check "Show Package Details"
   - Check "Android SDK Platform 33"
   - Click "Apply" and wait for download

4. **SDK Tools tab:**
   - Check "Android SDK Build-Tools"
   - Check "Android Emulator"
   - Check "Android SDK Platform-Tools"
   - Check "Intel x86 Emulator Accelerator (HAXM installer)" (if on Intel Mac/Windows)
   - Click "Apply"

#### Step 4: Create Android Virtual Device (AVD)

1. **In Android Studio:**
   - Go to: Tools → Device Manager
   - Click "Create Device"

2. **Select Device:**
   - Choose "Phone" category
   - Select "Pixel 6" or "Pixel 7" (recommended)
   - Click "Next"

3. **Select System Image:**
   - Choose "Tiramisu" (API 33) or latest
   - Click "Download" if needed (large download ~1GB)
   - Wait for download
   - Click "Next"

4. **Configure AVD:**
   - Name: "Pixel_6_API_33" (or your choice)
   - Click "Finish"

#### Step 5: Set Environment Variables

**macOS/Linux:**
Add to `~/.zshrc` or `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**Windows:**
1. Open "Environment Variables" in System Properties
2. Add new variable:
   - Name: `ANDROID_HOME`
   - Value: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
3. Add to Path:
   - `%ANDROID_HOME%\emulator`
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

**Reload shell:**
```bash
source ~/.zshrc  # or ~/.bash_profile
```

#### Step 6: Accept Android Licenses

```bash
# Navigate to SDK location
cd ~/Library/Android/sdk/tools/bin  # macOS
# or
cd $ANDROID_HOME/tools/bin  # Linux/Windows

# Accept all licenses
yes | sdkmanager --licenses

# Or interactively:
sdkmanager --licenses
# Type 'y' for each license
```

#### Step 7: Verify Installation

```bash
# Check Android SDK location
echo $ANDROID_HOME

# Check adb (Android Debug Bridge)
adb version

# List available emulators
emulator -list-avds

# Check if emulator is in PATH
which emulator
```

---

## Running the App

### Option A: iOS Simulator (macOS)

#### Method 1: Direct Command (Recommended)

```bash
# From project root
cd /Users/your-user/TRDE/apps/mobile

# Start Expo and open iOS simulator
pnpm ios
```

**What happens:**
1. Expo starts Metro bundler
2. Automatically opens iOS Simulator
3. Builds and installs app
4. App launches in simulator

#### Method 2: Manual Start

```bash
# Terminal 1: Start Expo
cd /Users/your-user/TRDE/apps/mobile
pnpm start

# Terminal 2: Open iOS Simulator manually
open -a Simulator

# In Expo terminal, press 'i' to launch on iOS
```

#### Method 3: Select Specific Simulator

```bash
# List available simulators
xcrun simctl list devices available

# Start specific simulator (e.g., iPhone 15 Pro)
xcrun simctl boot "iPhone 15 Pro"

# Then start Expo
cd /Users/your-user/TRDE/apps/mobile
pnpm ios
```

### Option B: Android Emulator

#### Method 1: Direct Command (Recommended)

```bash
# From project root
cd /Users/your-user/TRDE/apps/mobile

# Start Expo and open Android emulator
pnpm android
```

**What happens:**
1. Expo starts Metro bundler
2. Automatically starts Android emulator (if not running)
3. Builds and installs app
4. App launches in emulator

#### Method 2: Manual Start

```bash
# Terminal 1: Start Android Emulator
# Option A: From Android Studio
# - Open Android Studio
# - Tools → Device Manager
# - Click ▶️ (Play) button next to your AVD

# Option B: Command line
emulator -avd Pixel_6_API_33

# Wait for emulator to fully boot (takes 1-2 minutes)

# Terminal 2: Start Expo
cd /Users/your-user/TRDE/apps/mobile
pnpm start

# In Expo terminal, press 'a' to launch on Android
```

#### Method 3: List and Start Specific Emulator

```bash
# List all AVDs
emulator -list-avds

# Start specific emulator
emulator -avd Your_AVD_Name

# Then in another terminal
cd /Users/your-user/TRDE/apps/mobile
pnpm android
```

---

## Verification Steps

### 1. Check App Launches

**iOS:**
- Simulator window opens
- App installs and launches
- You see the TRDE dashboard

**Android:**
- Emulator window opens
- App installs and launches
- You see the TRDE dashboard

### 2. Test Core Features

#### Dashboard
- [ ] 4 metric cards display
- [ ] Values show correctly
- [ ] Recent trades list appears

#### Navigation
- [ ] Bottom tab navigation works
- [ ] Can navigate to all screens:
  - Dashboard
  - Trades
  - Analytics
  - Journal
  - Risk
  - Settings

#### Settings → Dashboard Metrics
- [ ] Can access settings
- [ ] "Dashboard Metrics" section appears
- [ ] Can select different metrics
- [ ] Changes save automatically
- [ ] Dashboard updates immediately

#### Analytics → Dynamic Charts
- [ ] Analytics screen loads
- [ ] Chart selector buttons appear
- [ ] Can switch between chart types
- [ ] Charts render correctly
- [ ] Data displays accurately

### 3. Test Data Persistence

1. **Create/Modify Data:**
   - Change dashboard metrics in Settings
   - Review a violation in Risk screen
   - Add a trade

2. **Restart App:**
   - Close simulator/emulator
   - Restart: `pnpm ios` or `pnpm android`

3. **Verify:**
   - [ ] Dashboard metrics persist
   - [ ] Reviewed violations stay reviewed
   - [ ] Trades persist

### 4. Test Theme Toggle

- [ ] Go to Settings
- [ ] Toggle dark/light mode
- [ ] Theme changes immediately
- [ ] Restart app - theme persists

---

## Troubleshooting

### iOS Simulator Issues

#### Problem: "xcrun: error: unable to find utility 'simctl'"

**Solution:**
```bash
# Reinstall command line tools
sudo xcode-select --reset
xcode-select --install
```

#### Problem: Simulator won't boot

**Solution:**
```bash
# Kill all simulators
killall Simulator

# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all

# Try again
pnpm ios
```

#### Problem: "No devices found"

**Solution:**
```bash
# List available devices
xcrun simctl list devices

# Boot a device manually
xcrun simctl boot "iPhone 15 Pro"

# Then try pnpm ios again
```

#### Problem: Build fails with CocoaPods error

**Solution:**
```bash
cd apps/mobile/ios
pod install
cd ..
pnpm ios
```

### Android Emulator Issues

#### Problem: "ANDROID_HOME not set"

**Solution:**
```bash
# Check if set
echo $ANDROID_HOME

# Set it (macOS/Linux)
export ANDROID_HOME=$HOME/Library/Android/sdk

# Add to ~/.zshrc or ~/.bash_profile permanently
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
source ~/.zshrc
```

#### Problem: "No emulators found"

**Solution:**
```bash
# List AVDs
emulator -list-avds

# If empty, create one in Android Studio:
# Tools → Device Manager → Create Device
```

#### Problem: Emulator is slow

**Solutions:**
1. **Enable Hardware Acceleration:**
   - In Android Studio: Tools → SDK Manager → SDK Tools
   - Install "Intel x86 Emulator Accelerator (HAXM)"

2. **Allocate More RAM:**
   - Edit AVD in Device Manager
   - Increase RAM to 2048MB or 4096MB

3. **Use x86_64 System Image:**
   - When creating AVD, choose x86_64 instead of arm64

#### Problem: "License not accepted"

**Solution:**
```bash
cd $ANDROID_HOME/tools/bin
yes | sdkmanager --licenses
```

#### Problem: Emulator won't start

**Solution:**
```bash
# Check if another emulator is running
adb devices

# Kill all emulators
adb kill-server
adb start-server

# Try starting again
emulator -avd Your_AVD_Name
```

### General Issues

#### Problem: Metro bundler port 8081 in use

**Solution:**
```bash
# Kill process on port 8081
# macOS/Linux:
lsof -ti:8081 | xargs kill -9

# Windows:
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Or use different port
expo start --port 8082
```

#### Problem: "Unable to resolve module"

**Solution:**
```bash
cd apps/mobile

# Clear cache
rm -rf node_modules
rm -rf .expo

# Reinstall
pnpm install

# Clear Metro cache and restart
expo start --clear
```

#### Problem: App crashes on launch

**Solution:**
```bash
# Check logs
# iOS:
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "TRDE"'

# Android:
adb logcat | grep -i error

# Clear and rebuild
cd apps/mobile
rm -rf .expo
expo start --clear
```

#### Problem: Changes not reflecting

**Solution:**
```bash
# Reload app
# iOS Simulator: Cmd+R
# Android Emulator: Press 'r' in Expo terminal
# Or shake device → Reload

# Clear cache
expo start --clear
```

---

## Quick Reference Commands

### iOS Simulator

```bash
# Start app
cd apps/mobile && pnpm ios

# List simulators
xcrun simctl list devices

# Boot specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Reset simulator
xcrun simctl erase all

# Open Simulator app
open -a Simulator
```

### Android Emulator

```bash
# Start app
cd apps/mobile && pnpm android

# List AVDs
emulator -list-avds

# Start emulator
emulator -avd Pixel_6_API_33

# Check connected devices
adb devices

# View logs
adb logcat
```

### General

```bash
# Start Expo (then press i/a)
cd apps/mobile && pnpm start

# Clear cache
expo start --clear

# Check dependencies
pnpm install

# Type check
pnpm typecheck
```

---

## Next Steps

Once simulator is running:

1. **Test all features** using the [Feature Parity Checklist](#verification-steps)
2. **Compare with web app** side-by-side
3. **Verify data persistence** by restarting
4. **Test theme switching**
5. **Verify all new features** (dashboard metrics, dynamic charts, violations)

For detailed feature testing, see `TESTING_MOBILE.md`.
