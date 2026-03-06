# Story 3.0: Network HTTP Client

Status: done

## Story

As a **developer**,
I want a typed HTTP client that surfaces status codes as `AppError` subtypes, enforces request timeouts, and routes errors to Sentry,
so that all subsequent API integrations (Steam sync, HLTB, Gemini) have a consistent, debuggable foundation without per-call workarounds.

## Acceptance Criteria

**AC1 — HTTP errors surface as typed `AppError`, not generic `Error`:**
**Given** a fetch response with a non-2xx status code
**When** `apiFetch` processes the response
**Then** it throws a typed error matching the `AppError` discriminated union — callers inspect `.type` and `.code`, not error message strings
**And** specifically: 401/403 → `SteamError { code: 'UNAUTHORIZED' }`, 429 → `SteamError { code: 'RATE_LIMITED' }`, other non-2xx → `NetworkError { code: 'UNKNOWN' }`

**AC2 — Request timeout:**
**Given** a fetch call that does not resolve or reject within 10 seconds
**When** the timeout elapses
**Then** the request is aborted via `AbortController` and a `NetworkError { code: 'TIMEOUT' }` is thrown
**And** no memory leak occurs — abort controller is cleaned up in `finally` whether the request succeeds, fails, or times out

**AC3 — Sentry error capture, no console logging:**
**Given** `apiFetch` catches an unexpected error (non-2xx other than 401/403/429, or network-level failure)
**When** the error is processed
**Then** `Sentry.captureException` is called with the error and request context (url, method, status)
**And** no `console.log` or `console.error` calls remain anywhere in `httpClient.ts`

**AC4 — `body` is typed, no `any`:**
**Given** the `ApiOptions` interface and `geminiFetch` wrapper signature
**When** a caller passes a `body` value
**Then** `body` is typed as `Record<string, unknown> | unknown[]` in both `ApiOptions` and `geminiFetch` (not `any`)
**And** `llm.ts` still compiles — its body objects are plain objects that satisfy `Record<string, unknown>`

**AC5 — `httpClient.types.ts` migrated to canonical location:**
**Given** `src/types/httpClient.types.ts` is the prototype location (no path alias)
**When** this story is complete
**Then** `src/shared/types/httpClient.types.ts` exists as the canonical file reachable via `@shared/types/httpClient.types`
**And** `src/types/httpClient.types.ts` is replaced with a re-export stub for prototype-file compatibility
**And** `src/data/api/httpClient.ts` imports from `@shared/types/httpClient.types`

**AC6 — No regressions:**
**Given** the refactored client and migrated types
**When** the project is compiled and tested
**Then** `npx tsc --noEmit` passes with zero errors
**And** all existing 121 tests pass unchanged

## Tasks / Subtasks

- [x] Task 1: Migrate `httpClient.types.ts` to canonical location (AC: 5)
  - [x] Subtask 1.1: Create `src/shared/types/httpClient.types.ts` — copy content from `src/types/httpClient.types.ts`; change `body?: any` → `body?: Record<string, unknown> | unknown[]` in `ApiOptions`
  - [x] Subtask 1.2: Replace `src/types/httpClient.types.ts` with a re-export stub:
    ```ts
    /** @deprecated Import from @shared/types/httpClient.types instead */
    export { API_BASE_URLS } from '../shared/types/httpClient.types';
    export type { ApiOptions } from '../shared/types/httpClient.types';
    ```
  - [x] Subtask 1.3: Verify all existing importers of `src/types/httpClient.types.ts` (`steam.ts`, `httpClient.ts`) resolve cleanly through the stub — `npx tsc --noEmit`

- [x] Task 2: Rewrite `src/data/api/httpClient.ts` (AC: 1, 2, 3, 4)
  - [x] Subtask 2.1: Update import to `@shared/types/httpClient.types` (canonical path after Task 1)
  - [x] Subtask 2.2: Add imports: `import * as Sentry from '@sentry/react-native'` and `import type { NetworkError, SteamError } from '@shared/types/errors.types'`
  - [x] Subtask 2.3: Add module-level constant: `const REQUEST_TIMEOUT_MS = 10_000`
  - [x] Subtask 2.4: Implement `AbortController` timeout: create `controller` + `setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)`; pass `signal: controller.signal` to `fetch`; call `clearTimeout(timeoutId)` in `finally`
  - [x] Subtask 2.5: Replace `if (!response.ok) throw new Error(...)` with typed throws by status:
    - 401 / 403 → `throw { type: 'SteamError', code: 'UNAUTHORIZED', message: \`HTTP \${response.status}\` } satisfies SteamError`
    - 429 → `throw { type: 'SteamError', code: 'RATE_LIMITED', message: 'Rate limited' } satisfies SteamError`
    - all other non-2xx → build `NetworkError { code: 'UNKNOWN' }`; call `Sentry.captureException`; throw it
  - [x] Subtask 2.6: In the catch block, distinguish and rethrow cleanly:
    - `'type' in err` (already a typed `AppError`) → rethrow as-is, no wrapping
    - `AbortError` (signal aborted) → throw `NetworkError { code: 'TIMEOUT' }`
    - everything else (network failure, DNS error, etc.) → build `NetworkError { code: 'UNKNOWN' }`; call `Sentry.captureException`; throw it
  - [x] Subtask 2.7: Remove all `console.log` and `console.error` calls (3 occurrences in current file)
  - [x] Subtask 2.8: Fix `geminiFetch` signature: `body?: any` → `body?: Record<string, unknown> | unknown[]`

- [x] Task 3: Write tests `src/data/api/httpClient.test.ts` (AC: 1, 2, 3, 6)
  - [x] Subtask 3.1: Create `src/data/api/httpClient.test.ts` — mock `globalThis.fetch` (same pattern as `steam.test.ts`); mock `@sentry/react-native`
  - [x] Subtask 3.2: Test: 200 response → returns parsed JSON; `Sentry.captureException` NOT called
  - [x] Subtask 3.3: Test: 401 → throws `{ type: 'SteamError', code: 'UNAUTHORIZED' }`
  - [x] Subtask 3.4: Test: 403 → throws `{ type: 'SteamError', code: 'UNAUTHORIZED' }`
  - [x] Subtask 3.5: Test: 429 → throws `{ type: 'SteamError', code: 'RATE_LIMITED' }`
  - [x] Subtask 3.6: Test: 500 → throws `{ type: 'NetworkError', code: 'UNKNOWN' }`; `Sentry.captureException` called once
  - [x] Subtask 3.7: Test: fetch throws network error → throws `{ type: 'NetworkError', code: 'UNKNOWN' }`; `Sentry.captureException` called once
  - [x] Subtask 3.8: Test: timeout — `mockFetch` never resolves; advance fake timers past `REQUEST_TIMEOUT_MS`; throws `{ type: 'NetworkError', code: 'TIMEOUT' }`
  - [x] Subtask 3.9: Test each via `steamFetch` wrapper to confirm the wrappers still route through `apiFetch` correctly

- [x] Task 4: Validate (AC: 6)
  - [x] Subtask 4.1: `npx tsc --noEmit` — zero errors
  - [x] Subtask 4.2: `npx jest` — all existing 121 tests pass; new httpClient tests pass on top

## Dev Notes

### What This Story Replaces

The current `src/data/api/httpClient.ts` is a prototype. Its specific problems:

| Problem | Line(s) | Fix |
|---|---|---|
| `new Error(\`STEAM error: \${status}\`)` — unparseable by callers | 28 | Typed `AppError` throws by status code |
| `console.log` on every request — leaks to production | 9, 25 | Remove entirely |
| `console.error` in catch — not routed to Sentry | 33–40 | `Sentry.captureException` |
| No timeout — hung request is permanent | all | `AbortController` + 10s `setTimeout` |
| `body?: any` in `ApiOptions` | types file | `Record<string, unknown> \| unknown[]` |
| `body?: any` in `geminiFetch` signature | 45 | Same fix |
| `import from "../../types/httpClient.types"` — no alias, wrong location | 1 | Migrate file first, then import via `@shared/types/` |

### What Does NOT Change

- `steamFetch(endpoint, params)`, `storeFetch(endpoint, params)` — **signatures unchanged**; callers in `steam.ts` need no edits
- `geminiFetch` — signature changes only for `body` type (`any` → typed); the `endpoint`, `params`, `method` parameters are unchanged; `llm.ts` compiles as-is
- `getPlayerSummaries` in `steam.ts` raw-fetches intentionally — **do NOT touch**; it's a separate function, not a `steamFetch` caller
- `getOwnedGames` in `steam.ts` — prototype; **do NOT touch**; superseded in Story 3-1
- `llm.ts` — **do NOT touch**; its `body` values (`{ contents: [...], generationConfig: {...} }`) are plain objects that satisfy `Record<string, unknown>`
- `steam.ts` imports `API_BASE_URLS` from `../../types/httpClient.types` — after the stub is in place that resolves transparently; **do NOT update `steam.ts` imports** (that import update is Story 3-1's job when it migrates `steam.types.ts`)

### `httpClient.types.ts` Migration

The file currently lives at `src/types/httpClient.types.ts` with no alias. After this story:

```
src/shared/types/httpClient.types.ts   ← canonical (new); @shared/types/httpClient.types
src/types/httpClient.types.ts          ← stub (replaced); re-exports from canonical
```

**Canonical file** (`src/shared/types/httpClient.types.ts`) — same content, `body` typed:
```ts
export const API_BASE_URLS = {
  steam: 'https://api.steampowered.com',
  store: 'https://store.steampowered.com/api',
  googleapis: 'https://generativelanguage.googleapis.com/v1beta',
} as const;

type ApiType = keyof typeof API_BASE_URLS;

export interface ApiOptions {
  api: ApiType;
  endpoint: string;
  params?: URLSearchParams;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  body?: Record<string, unknown> | unknown[]; // was: any
}
```

**Stub** (`src/types/httpClient.types.ts`) — replaces existing content entirely:
```ts
/** @deprecated Import from @shared/types/httpClient.types instead */
export { API_BASE_URLS } from '../shared/types/httpClient.types';
export type { ApiOptions } from '../shared/types/httpClient.types';
```

Existing importers of `src/types/httpClient.types.ts` (`src/data/api/steam.ts` at line 5) resolve through the stub transparently — no changes to `steam.ts` needed in this story.

### Complete Rewritten `httpClient.ts`

```ts
// src/data/api/httpClient.ts
import * as Sentry from '@sentry/react-native';
import type { NetworkError, SteamError } from '@shared/types/errors.types';
import { API_BASE_URLS, ApiOptions } from '@shared/types/httpClient.types';

const REQUEST_TIMEOUT_MS = 10_000;

const apiFetch = async <T>(options: ApiOptions): Promise<T> => {
  const { api, endpoint, params, headers = {}, method = 'GET', body } = options;
  const baseUrl = API_BASE_URLS[api];
  const queryString = params ? `?${params.toString()}` : '';
  const url = `${baseUrl}/${endpoint}${queryString}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body && method !== 'GET' && method !== 'HEAD'
        ? { body: JSON.stringify(body) }
        : {}),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw {
          type: 'SteamError',
          code: 'UNAUTHORIZED',
          message: `HTTP ${response.status}`,
        } satisfies SteamError;
      }
      if (response.status === 429) {
        throw {
          type: 'SteamError',
          code: 'RATE_LIMITED',
          message: 'Rate limited',
        } satisfies SteamError;
      }
      const networkError: NetworkError = {
        type: 'NetworkError',
        code: 'UNKNOWN',
        message: `HTTP ${response.status}`,
      };
      Sentry.captureException(networkError, { data: { url, method, status: response.status } });
      throw networkError;
    }

    return response.json() as Promise<T>;
  } catch (err: unknown) {
    // Already a typed AppError (thrown above or from nested call) — rethrow unchanged
    if (err !== null && typeof err === 'object' && 'type' in err) {
      throw err;
    }
    // AbortController fired — request timed out
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw {
        type: 'NetworkError',
        code: 'TIMEOUT',
        message: 'Request timed out',
      } satisfies NetworkError;
    }
    // Network-level failure (DNS, offline, etc.)
    const networkError: NetworkError = {
      type: 'NetworkError',
      code: 'UNKNOWN',
      message: err instanceof Error ? err.message : String(err),
    };
    Sentry.captureException(networkError, { data: { url, method } });
    throw networkError;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const geminiFetch = <T>(
  endpoint: string,
  params: URLSearchParams,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown> | unknown[],  // was: any
) => apiFetch<T>({ api: 'googleapis', endpoint, params, method, body });

export const steamFetch = <T>(endpoint: string, params: URLSearchParams) =>
  apiFetch<T>({ api: 'steam', endpoint, params, method: 'GET' });

export const storeFetch = <T>(endpoint: string, params: URLSearchParams) =>
  apiFetch<T>({ api: 'store', endpoint, params, method: 'GET' });
```

**Key implementation notes:**
- `'type' in err` guard catches typed `AppError` objects thrown in the `try` block and rethrows them without re-wrapping — the `finally` still runs to clear the timeout
- `AbortError` detection: use `err instanceof DOMException && err.name === 'AbortError'` — Hermes (RN's JS engine) does not expose a top-level `AbortError` class, but `DOMException` with `name === 'AbortError'` works correctly
- `satisfies SteamError` / `satisfies NetworkError` — TypeScript compile-time check that the thrown literal matches the union member; use this, not `as`
- `clearTimeout` in `finally` runs on every path (success, typed throw, timeout, network error) — no leaks

### Testing

**Mock setup** (same pattern as `steam.test.ts`):
```ts
const mockFetch = jest.fn();
beforeAll(() => { globalThis.fetch = mockFetch; });
afterAll(() => { (globalThis as { fetch?: unknown }).fetch = undefined; });
afterEach(() => { jest.clearAllMocks(); });

const mockResponse = (status: number, body: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: () => Promise.resolve(body),
});
```

**Sentry mock** — `@sentry/react-native` is already mocked at `__mocks__/@sentry/react-native.ts`. Before the tests, verify `captureException` is exported as a `jest.fn()`. If it isn't, add it — but read the mock file first:
```ts
// In tests:
import * as Sentry from '@sentry/react-native';
// ...
expect(Sentry.captureException).toHaveBeenCalledTimes(1);
expect(Sentry.captureException).not.toHaveBeenCalled();
```

**Timeout test** (requires Jest fake timers):
```ts
describe('timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('throws NetworkError TIMEOUT when request hangs past 10s', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

    const promise = steamFetch('some/endpoint', new URLSearchParams());
    jest.advanceTimersByTime(10_001);

    await expect(promise).rejects.toMatchObject({
      type: 'NetworkError',
      code: 'TIMEOUT',
    });
  });
});
```

### `@sentry/react-native` Mock — Verify Before Testing

Read `__mocks__/@sentry/react-native.ts` before writing tests. If `captureException` is not a `jest.fn()`, add it. Do not overwrite other exports already there.

### Architecture Compliance Checklist

- ✅ `httpClient.types.ts` migrated to `src/shared/types/` — canonical location, `@shared/types/` alias
- ✅ `src/types/httpClient.types.ts` stub preserves all existing importers (zero changes to `steam.ts`)
- ✅ Named exports only — `export const steamFetch`, `storeFetch`, `geminiFetch`
- ✅ `AppError` discriminated union for all HTTP errors — no `new Error()` with status code strings
- ✅ Sentry for unexpected errors — no `console.log` / `console.error`
- ✅ `body` typed — no `any` in `ApiOptions` or `geminiFetch`
- ✅ `AbortController` + `clearTimeout` in `finally` — no memory leaks
- ✅ `llm.ts` unaffected — `body` objects satisfy `Record<string, unknown>`
- ✅ Tests co-located — `httpClient.test.ts` next to `httpClient.ts`

### Project Structure Notes

**Files to create:**
- `src/shared/types/httpClient.types.ts` — canonical location (migrated from `src/types/`)
- `src/data/api/httpClient.test.ts` — new tests

**Files to rewrite:**
- `src/data/api/httpClient.ts` — full replacement (see implementation above)
- `src/types/httpClient.types.ts` — replace content with re-export stub

**Files NOT to touch:**
- `src/data/api/steam.ts` — its `import { API_BASE_URLS } from "../../types/httpClient.types"` resolves through the stub; leave it; Story 3-1 updates its imports
- `src/data/api/llm.ts` — compiles unchanged
- `src/data/api/steam.test.ts` — existing tests must pass unchanged
- `src/types/steam.types.ts` — not this story; Story 3-1
- `src/utils/`, `src/screens/`, `src/hooks/` — prototype files; not touched

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#3.3 API & Communication — Error Handling Standards]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.4 Infrastructure — Monitoring & Crash Reporting]
- [Source: src/data/api/httpClient.ts — current prototype implementation]
- [Source: src/types/httpClient.types.ts — current prototype types]
- [Source: src/data/api/steam.ts — getPlayerSummaries raw-fetch pattern; API_BASE_URLS import]
- [Source: src/data/api/steam.test.ts — mock pattern to follow]
- [Source: src/data/api/llm.ts — geminiFetch caller; body shape must remain compatible]
- [Source: src/shared/types/errors.types.ts — SteamError, NetworkError, AppError]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-06)

### Debug Log References

- Timeout test: `AbortController.abort()` fires but `mockFetch` (a `jest.fn()` returning a never-resolving Promise) doesn't observe the signal. Fixed by adding `Promise.race([fetch(...), abortPromise(signal)])` in the implementation — `abortPromise` subscribes to `signal.addEventListener('abort', ...)` and rejects directly. This also works correctly in production since the real fetch handles abort natively.
- `DOMException` is not globally typed in RN/Hermes env. Used `(err as { name?: unknown }).name === 'AbortError'` object guard instead of `instanceof DOMException`.

### Completion Notes List

- Migrated `httpClient.types.ts` from `src/types/` to `src/shared/types/` (canonical, `@shared/types/` alias). Replaced old file with re-export stub — zero changes required to `steam.ts`.
- Rewrote `httpClient.ts`: typed `AppError` throws by HTTP status (401/403→`SteamError UNAUTHORIZED`, 429→`SteamError RATE_LIMITED`, other non-2xx→`NetworkError UNKNOWN` + Sentry), `AbortController` timeout via `Promise.race`, `finally` clears timeout, no console calls, `body` typed as `Record<string, unknown> | unknown[]`.
- Added 10 tests covering all ACs: success, 401/403/429/500, network failure, timeout (fake timers), wrapper routing (storeFetch, geminiFetch).
- `npx tsc --noEmit` — zero errors. `npx jest` — 131 tests pass (121 existing + 10 new), zero regressions.

### File List

- `src/shared/types/httpClient.types.ts` — created (canonical types location)
- `src/types/httpClient.types.ts` — replaced with re-export stub
- `src/data/api/httpClient.ts` — rewritten; `type ApiOptions` import fix (code review)
- `src/data/api/httpClient.test.ts` — created; Sentry context assertions + body-on-GET guard + json() rejection tests added (code review)

## Change Log

- 2026-03-06: Implemented story 3-0 — migrated httpClient types, rewrote HTTP client with typed AppError, timeout, Sentry integration; added 10 tests (claude-sonnet-4-6)
- 2026-03-06: Code review fixes — `type ApiOptions` import; added 3 tests: Sentry context args (M1), body-on-GET guard (M2), json() parse failure (M3); total 13 tests (claude-sonnet-4-6)
- 2026-03-06: Low-issue fixes — empty URLSearchParams trailing `?` (L2); abortPromise comment with Promise.race rationale (L4); storeFetch 500 wrapper test (L3); total 14 tests (claude-sonnet-4-6)
