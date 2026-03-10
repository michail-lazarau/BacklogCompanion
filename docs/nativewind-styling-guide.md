# NativeWind Styling Guide

Practical notes from real usage in this project. These complement the arch rules in `src/res/tokens.ts`.

## When to use `className=` vs `style=`

### Use `className=` for:
- Layout and spacing on **core RN primitives** (`View`, `Text`, `TouchableOpacity`, `SafeAreaView`)
  - `flex-1`, `flex-row`, `items-center`, `justify-center`
  - `px-4`, `py-2`, `mx-auto`, `gap-2`
  - `rounded-full`, `border-b`
- Colors that are **hyphenated+number** tokens in `tailwind.config.js`
  - `text-text-100`, `text-text-300`, `bg-surface-900`, `bg-surface-800`
- Font family via `font-rubik` (maps to `fontFamily: 'Rubik'`)

### Use `style=` with `tokens.ts` for:
- **Simple non-shaded color names** — `primary`, `success`, `destructive`, `placeholder`
  - `text-primary`, `bg-primary` etc. **do not resolve** in this project even with safelist
  - Use `style={{ color: tokens.colors.primary }}` instead
- **Font weight variants** — `Rubik-Medium`, `Rubik-Bold`
  - NativeWind's `font-medium`/`font-bold` map to CSS `fontWeight`, not distinct RN font files
  - Use `style={{ fontFamily: tokens.fontFamily.medium }}` (or `.bold`)
- **Dynamic values** — anything computed at runtime (`height * 0.6`, viewport-relative sizes)
- **`Animated.View`** — does not accept `className=` reliably; always use `style=`
- **Third-party components** (`@gorhom/bottom-sheet`, `FlashList`, etc.) — `className=` is ignored

## Known limitations in this project

### `text-primary` / `bg-primary` don't work
Custom Tailwind colors with simple non-hyphenated names (e.g. `primary`, `success`) fail to resolve
at runtime in NativeWind v4 — the class generates no style. Adding them to `safelist` in
`tailwind.config.js` does not fix this. Root cause is unclear (possible conflict with NativeWind's
preset or Tailwind's color resolution for un-shaded names).

**Workaround:** Always use `style={{ color: tokens.colors.primary }}` for these tokens.

The safelist entry in `tailwind.config.js` is kept for forward-compatibility but is not currently effective:
```js
safelist: ['text-primary', 'bg-primary', 'text-surface-900', 'bg-surface-900'],
```

### `@gorhom/bottom-sheet` reserves layout space at `index=-1`
A `BottomSheet` component mounted with `index=-1` (closed state) still participates in layout,
pushing sibling content upward. **Never always-mount** a BottomSheet.

**Pattern: mount on first open, keep mounted after:**
```tsx
const sheetEverOpened = useRef(false);
if (isVisible) sheetEverOpened.current = true;

// In JSX:
{sheetEverOpened.current && (
  <MySheet isVisible={isVisible} onClose={onClose} />
)}
```
This avoids the layout-reservation problem on initial render while preserving the slide-in
animation on every subsequent open (since the component stays mounted with `index=-1`).

## StyleSheet.create() vs inline styles

Always prefer `StyleSheet.create()` for **static** style objects:
- Hoisted to module level — allocated once, not per render
- Registered with the native layer — more efficient than plain JS objects
- Only remaining inline `style=` should be for **dynamic** values (e.g. `{ height: height * 0.6 }`)

## Practical rule of thumb

```
className=   → layout, spacing, flex, border, rounded, text size, bg-surface-*, text-text-*
style=       → colors (primary/success/etc), font weights, dynamic values, third-party components
StyleSheet   → all static style objects that need to be referenced by name
```
