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

## Error Cases

| Condition | Behaviour |
|-----------|-----------|
| User dismisses the browser | `result.type === 'cancel'` — `openAuth` resolves normally, no error shown |
| Shim URL returns malformed params / no `openid.claimed_id` | `handleAuthCallback` finds no Steam ID match, remains on AuthScreen silently |
| `InAppBrowser` unavailable | Falls back to `Linking.openURL` (external browser, no deep-link interception) |
| `openAuth` throws | `InAppBrowser.close()` called in catch, loading state reset |
