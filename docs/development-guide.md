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
