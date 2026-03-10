# Steam Authentication & Deep Linking

## Overview

BacklogCompanion authenticates users via **Steam OpenID 2.0**. Because Steam rejects custom URL schemes (`backlogcompanion://`) in its `return_to` and `realm` parameters, the flow uses an intermediate GitHub Pages page (the "shim") to bridge Steam's HTTPS requirement with iOS's custom-scheme interception.

## Flow

```
App
 │
 │  InAppBrowser.openAuth(STEAM_OPENID_URL, 'backlogcompanion://')
 ▼
Steam login page  (steamcommunity.com/openid/login)
 │
 │  user authenticates → Steam redirects to return_to
 ▼
GitHub Pages shim  (michail-lazarau.github.io/BacklogCompanion/steam-callback)
 │
 │  JS: window.location.replace('backlogcompanion://auth/callback' + search)
 ▼
backlogcompanion://auth/callback?openid.claimed_id=...&openid.mode=id_res&...
 │
 │  ASWebAuthenticationSession detects the custom scheme → closes browser
 │  → resolves openAuth() promise with { type: 'success', url }
 ▼
useSteamAuth.handleAuthCallback(url)
 │
 │  parse openid.claimed_id → extract 17-digit Steam ID via regex
 ▼
Keychain.setGenericPassword('steam', steamId, { service: 'steam_id' })
Redux: setAuthenticated({ isAuthenticated: true, steamId })
```

## Why the Shim Is Needed

Steam OpenID validates that `return_to` and `realm` are reachable HTTPS URLs. A custom scheme like `backlogcompanion://` fails this check and Steam rejects the login attempt. The shim is a publicly hosted HTTPS page that Steam accepts, which then immediately performs a client-side redirect to the custom scheme that iOS intercepts.

## Key Files

| File | Role |
|------|------|
| [src/features/auth/hooks/useSteamAuth.ts](../src/features/auth/hooks/useSteamAuth.ts) | Hook that drives the full auth flow |
| [docs/steam-callback/index.html](steam-callback/index.html) | GitHub Pages shim — forwards OpenID params to the deep link |
| [ios/BacklogCompanion/Info.plist](../ios/BacklogCompanion/Info.plist) | Registers `backlogcompanion` as a URL scheme |

## Constants (`useSteamAuth.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `DEEP_LINK_SCHEME` | `backlogcompanion://` | Scheme `openAuth` watches for to close the browser |
| `CALLBACK_SHIM_URL` | `https://michail-lazarau.github.io/BacklogCompanion/steam-callback` | Steam's `return_to` target |
| `STEAM_OPENID_URL` | Assembled OpenID 2.0 URL | Passed to `InAppBrowser.openAuth` |
| `STEAM_ID_REGEX` | `/https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17,25})/` | Extracts the 64-bit Steam ID from `openid.claimed_id` |

## iOS Configuration

`Info.plist` registers `backlogcompanion` as a custom URL scheme under `CFBundleURLTypes`. This is what causes iOS to route `backlogcompanion://` URLs to the app and what `ASWebAuthenticationSession` uses to detect the final redirect.

## Browser Strategy: InAppBrowser vs Linking

The app uses two different mechanisms to open URLs, and the choice matters for session continuity.

### `InAppBrowser.openAuth` — Steam OpenID login

Used in `useSteamAuth.initiateLogin`. Maps to `ASWebAuthenticationSession` on iOS.

**Why not `Linking.openURL`?**
`Linking.openURL` opens Safari as a standalone app and has no mechanism to capture the redirect back. `ASWebAuthenticationSession` is specifically designed for OAuth flows — it watches for a redirect to a nominated scheme (`backlogcompanion://`) and resolves the promise with the full redirect URL, all without leaving the app.

**Cookie sharing (`ephemeralWebSession: false`)**
When `ephemeralWebSession` is `false`, `ASWebAuthenticationSession` shares the Safari cookie store. This means the Steam session established here persists into subsequent in-app browser views.

### `InAppBrowser.openAuth` — Steam API key page

Used in `ApiKeyScreen.handleOpenLink`. Maps to `ASWebAuthenticationSession` on iOS.

**Why not `InAppBrowser.open` (SFSafariViewController)?**
`SFSafariViewController` does **not** share cookies with `ASWebAuthenticationSession` — they have separate stores (iOS 11+). The Steam session from the login step would not carry over, forcing the user to log in again.

**Why not `Linking.openURL`?**
Opens system Safari as a standalone app. The user would need to navigate back to the app manually after copying the key.

**`openAuth` for a non-OAuth page**
`steamcommunity.com/dev/apikey` requires a Steam login. Since `openAuth` reuses the same `ASWebAuthenticationSession` store as the login step, the Steam session carries over automatically. The `backlogcompanion://` redirect scheme is passed as required by the API but will never be triggered — the user copies the key and taps **Cancel** to return to the app, which is handled gracefully (the `cancel` result is ignored).

### Summary

| Call site | API | iOS primitive | Cookie store shared | Use case |
|-----------|-----|--------------|---------------------|----------|
| `useSteamAuth.initiateLogin` | `openAuth` | `ASWebAuthenticationSession` | Yes (`ephemeralWebSession: false`) | OAuth redirect capture |
| `ApiKeyScreen.handleOpenLink` | `openAuth` | `ASWebAuthenticationSession` | Yes (same store as login) | In-flow authenticated page — user cancels to return |
| Fallback (InAppBrowser unavailable) | `Linking.openURL` | System Safari | Separate process | Last resort only |

## Error Cases

| Condition | Behaviour |
|-----------|-----------|
| User dismisses the browser | `result.type === 'cancel'` — `openAuth` resolves normally, no error shown |
| Shim URL returns malformed params / no `openid.claimed_id` | `handleAuthCallback` finds no Steam ID match, remains on AuthScreen silently |
| `InAppBrowser` unavailable | Falls back to `Linking.openURL` (external browser, no deep-link interception) |
| `openAuth` throws | `InAppBrowser.close()` called in catch, loading state reset |
