# Jest Test Infrastructure

## Known Leaks and Fixes

### Problem: "A worker process has failed to exit gracefully"

Jest workers hold open handles after all tests complete, preventing clean exit. Two sources were identified and fixed.

---

### Fix 1: `redux-persist` — `persistStore` setTimeout

**Symptom:** Any test file that imports `RootNavigator` or `MainTabNavigator` (directly or transitively) causes a worker leak. The import chain is:

```
RootNavigator.tsx
  → src/data/store/index.ts
      → persistStore(store)  ← fires setTimeout internally
```

**Fix:** Mock `redux-persist` so `persistStore` returns a no-op stub with no real timers.

- Mock file: [`__mocks__/redux-persist.ts`](../__mocks__/redux-persist.ts)
- Registered in `jest.config.js` `moduleNameMapper`:
  ```js
  '^redux-persist$': '<rootDir>/__mocks__/redux-persist.ts'
  ```

The mock stubs:
- `persistReducer(config, reducer)` → returns `reducer` directly (no `_persist` key wrapping)
- `persistStore()` → returns a no-op object with `purge`, `flush`, `pause`, `persist`, `dispatch`, `getState`, `subscribe`
- All action type constants (`FLUSH`, `PAUSE`, `PERSIST`, `PURGE`, `REGISTER`, `REHYDRATE`) are re-exported with real values so `serializableCheck.ignoredActions` in the store config remains valid

> **Note:** Store tests in `store.test.ts` still pass because they access `state.auth` and `state.library` which exist in the base `rootReducer` returned by the mocked `persistReducer`.

---

### Fix 2: TanStack Query `notifyManager` — `setTimeout(fn, 0)` batch scheduler

**Symptom:** Any test file that creates a `QueryClient` and runs a query leaves a pending `setTimeout(fn, 0)` in TanStack Query's `notifyManager`. When Jest tells workers to shut down, this timer is still in the event loop queue, blocking clean exit.

**Root cause:** `notifyManager` batches query state notifications via `schedulerFn = setTimeout(fn, 0)`. When a test ends with a pending or just-resolved query, this timer may not have fired yet.

**Fix:** Call `queryClient.clear()` in `afterEach` so the pending notifications are removed before the timer fires.

#### Pattern to apply to every test file that creates a `QueryClient`:

```ts
// 1. Hoist a module-level variable
let currentQueryClient: QueryClient;

// 2. Clear after each test (removes cached queries → timer becomes a no-op)
afterEach(() => currentQueryClient?.clear());

// 3. Assign in createWrapper / makeWrapper
const createWrapper = (...) => {
  currentQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) =>
    React.createElement(QueryClientProvider, { client: currentQueryClient }, children);
};
```

If a test creates its own local `QueryClient` (e.g., for query key inspection), assign it to `currentQueryClient` so `afterEach` cleans it up:

```ts
it('uses correct query key', async () => {
  currentQueryClient = new QueryClient({ ... });  // ← assign to module var
  // ...
  const state = currentQueryClient.getQueryState(key);
});
```

#### Files already patched (as of 2026-03-10):

| File | Pattern |
|------|---------|
| `src/features/gameDetail/hooks/useGameDetail.test.ts` | `currentQueryClient` in `createWrapper` + standalone test |
| `src/features/library/hooks/useLibraryFilters.test.ts` | `currentQueryClient` in `createWrapper` |
| `src/features/library/hooks/useGameLibrary.test.ts` | `currentQueryClient` in `createWrapper` + standalone test |
| `src/features/library/hooks/useSteamSync.test.ts` | `currentQueryClient` in `makeWrapper` |
| `src/features/auth/hooks/useProfileSummary.test.ts` | `currentQueryClient` in `createWrapper` |

#### Approaches that do NOT work

| Approach | Why it fails |
|----------|-------------|
| `notifyManager.setScheduler(fn => fn())` | Synchronous updates outside `act()` → React warns "update not wrapped in act" |
| `notifyManager.setScheduler(fn => Promise.resolve().then(fn))` | Microtask also fires outside `act()` → same warning |
| `queryClient.destroy()` | Method does not exist in TanStack Query v5 — use `clear()` |

---

## Remaining "Force exiting Jest" message

After the above fixes, Jest still prints:

```
Force exiting Jest: Have you considered using --detectOpenHandles...
```

This is **expected and harmless** — it is printed whenever `forceExit: true` is set in `jest.config.js`. The main process calls `process.exit()` to terminate. This is not a bug.

---

## Adding New Test Files With QueryClient

When adding a new hook or component test that creates a `QueryClient`:

1. Declare `let currentQueryClient: QueryClient;` at module scope
2. Add `afterEach(() => currentQueryClient?.clear());` at module scope
3. Assign `currentQueryClient = new QueryClient(...)` inside every wrapper factory
4. Reference `currentQueryClient` for any in-test QueryClient access
