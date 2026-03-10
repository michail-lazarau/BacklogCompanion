# Development Guide

## Prerequisites

- **Node.js**: Required (LTS recommended).
- **Ruby**: Version `>= 2.6.10` (for CocoaPods).
- **Package Manager**: `npm` or `yarn`.
- **Mobile SDKs**:
    - **iOS**: Xcode (latest recommended), CocoaPods (`>= 1.13`).
    - **Android**: Android Studio, JDK (likely 17 or 11), Android SDK.

## Installation

1.  **Install Dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

2.  **iOS Setup**:
    ```bash
    cd ios
    bundle install # Install Ruby gems
    bundle exec pod install # Install CocoaPods
    cd ..
    ```

## Running the App

- **Start Metro Bundler**:
    ```bash
    npm start
    ```

- **Run on iOS**:
    ```bash
    npm run ios
    # or
    npx react-native run-ios
    ```

- **Run on Android**:
    ```bash
    npm run android
    # or
    npx react-native run-android
    ```

## Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | Starts the Metro bundler. |
| `npm run android` | Builds and runs the Android app. |
| `npm run ios` | Builds and runs the iOS app. |
| `npm run lint` | Runs ESLint. |
| `npm test` | Runs Jest tests. |

## Configuration

- The project uses `react-native-config`.
- Configuration variables are likely managed via `.env` files (e.g., `.env`, `.env.staging`, `.env.production`).
- **Note**: No `.env` files were found in the repository, you may need to create one based on `Config.debug.xcconfig` or ask the team for a template.

## Testing

- **Framework**: Jest
- **Run Tests**:
    ```bash
    npm test
    ```

## Corporate Network / SSL Proxy (Symantec WSS)

If your machine has **Symantec Web Security Service (WSS)** installed (common in corporate environments), it performs HTTPS inspection by injecting its own root certificate into all TLS connections. React Native's JS runtime uses its own TLS stack, which does **not** trust the macOS system keychain by default — so all `fetch` / `XMLHttpRequest` calls will fail with:

```
Network request failed  (error 61: Connection refused)
```

Safari and WebKit-based views work fine because they use the system keychain. Only the Metro-bundled JS runtime is affected.

### Fix: install the proxy cert into the simulator's trust store

Run this **once per simulator** (after first boot, before testing any network calls):

```bash
xcrun simctl keychain booted add-root-cert ~/Downloads/CertEmulationCA.crt
```

> **Note:** Replace `~/Downloads/CertEmulationCA.crt` with the actual path to your corporate root certificate if it was saved elsewhere.

After adding the cert, **relaunch the simulator** (Simulator → Device → Restart). The cert takes effect on the next boot.

### When this must be repeated

- Every time you create or reset a simulator (the keychain is wiped)
- After upgrading to a new iOS simulator runtime (e.g. iOS 26.x creates a new device)
- After `xcrun simctl erase` or "Erase All Content and Settings"

### Physical device

On a physical device enrolled in MDM, the corporate cert is typically pushed automatically. If you see the same error on device, check **Settings → General → VPN & Device Management** and verify the root certificate is listed and trusted.
