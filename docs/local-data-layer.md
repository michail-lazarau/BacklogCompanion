# Local Data Layer

Covers how the three local storage tiers — SQLite, MMKV, and TanStack Query's in-memory cache — are divided and why.

---

## Storage Tiers

| Tier | Technology | Scope | Survives app kill? |
|---|---|---|---|
| Relational store | SQLite via Drizzle + op-sqlite | Game rows, full schema | Yes |
| Key-value store | MMKV | Lightweight flags + cold-start snapshot | Yes |
| In-session cache | TanStack Query (in-memory) | Query results during an active session | No |

---

## SQLite — Source of Truth

All game data lives in SQLite. It supports the full relational model: typed columns, schema migrations via drizzle-kit, batch upserts, and filtered/sorted queries through Drizzle's query builder.

Nothing is read from MMKV or TanStack Query cache for business logic — filtering, sorting, and delta detection all operate on SQLite rows.

**op-sqlite specifics:** op-sqlite executes queries on the JS thread synchronously (no native bridge round-trip). Drizzle wraps this in a Promise interface, so from the application's perspective queries are still async — but the underlying execution is near-instant.

---

## MMKV — Lightweight Flags and Cold-Start Snapshot

MMKV is used for two purposes:

### 1. Sync throttle timestamp

```ts
mmkv.set(MMKV_KEYS.LAST_FULL_SYNC, Date.now().toString());
```

A single integer that records when the last full sync ran. Checked on every `runSync()` call to decide between full sync (`GetOwnedGames`) and incremental sync (`GetRecentlyPlayedGames`). Too lightweight to warrant a SQLite row.

### 2. Library snapshot for cold-start placeholder

```ts
// Written after every full sync (useSteamSync)
mmkv.set(MMKV_KEYS.LIBRARY_SNAPSHOT, JSON.stringify(snapshotRows));

// Read synchronously as TanStack Query placeholderData (useGameLibrary)
placeholderData: () => {
  const raw = mmkv.getString(MMKV_KEYS.LIBRARY_SNAPSHOT);
  if (!raw) return undefined;
  return JSON.parse(raw) as SteamGame[];
}
```

This is the pattern explained in detail below.

---

## TanStack Query — In-Session Cache

TanStack Query holds query results in memory for the duration of an app session. When the user navigates away from LibraryScreen and back, the cached result is served immediately without re-querying SQLite.

This cache is **ephemeral** — it is lost when the app is killed. On the next cold start, TanStack Query starts with no cache and must query SQLite again.

---

## The MMKV Snapshot Pattern

### Why it exists

TanStack Query's `placeholderData` option accepts a function that is called **synchronously** during the first render — it cannot `await`. This means it can only read from synchronous sources.

`db.select()` from Drizzle returns a Promise. Even though op-sqlite resolves that Promise in the same microtask (near-instantly), it cannot be called inside `placeholderData`.

MMKV's `getString()` is truly synchronous — it returns on the same call stack with no async step. This makes it the only practical synchronous persistent store compatible with `placeholderData`.

### What it achieves

Without the snapshot, the rendering sequence on every cold start would be:

```
frame 1  →  skeleton          (TanStack Query: pending, no cache, no placeholder)
frame 2  →  library list      (SQLite query resolved via Promise microtask)
```

With the snapshot:

```
frame 1  →  library list      (placeholderData reads MMKV synchronously)
frame 2  →  library list      (SQLite query resolves, TanStack swaps in fresh data)
```

The skeleton is only seen on the very first launch, before any sync has produced a snapshot.

### Tradeoffs

| Cost | Detail |
|---|---|
| Dual-write after sync | Every full sync writes to both SQLite and MMKV |
| Snapshot staleness | Only updated after full sync — incremental syncs do not update it |
| Partial schema | `Date`-type fields (`lastSyncedAt`, `hltbCachedAt`) excluded to avoid JSON serialization issues |
| Added complexity | `useGameLibrary` must handle both snapshot (placeholder) and real data paths |

### Honest assessment

The benefit is eliminating a skeleton that would last approximately **one Promise microtask** — imperceptible at 60fps on any modern device for a `SELECT * ORDER BY name` query on a local SQLite table.

The pattern is more valuable when the data source has real latency (remote API, slow bridge). For op-sqlite, the complexity cost likely exceeds the UX benefit. It is kept because it was designed before the op-sqlite batching behaviour was fully understood, and removing it is low priority.

---

## Data Flow Summary

```
Steam API
    │
    └─ useSteamSync.runSync()
          │
          ├─ applyDeltaSync()  ──────────────────────► SQLite (source of truth)
          │
          ├─ mmkv.set(LIBRARY_SNAPSHOT)  ────────────► MMKV (cold-start placeholder)
          │
          └─ queryClient.invalidateQueries()
                │
                └─ useGameLibrary.queryFn()
                      │
                      ├─ db.select().from(steamGames)  ◄── SQLite
                      └─ placeholderData()  ◄──────────── MMKV (frame 1 only)
                            │
                            └─ TanStack Query in-memory cache  (in-session)
                                  │
                                  └─ useLibraryFilters()  ──► LibraryScreen
```

---

## Related Files

| File | Role |
|---|---|
| [`src/features/library/hooks/useGameLibrary.ts`](../src/features/library/hooks/useGameLibrary.ts) | TanStack Query hook — reads SQLite, uses MMKV as placeholderData |
| [`src/features/library/hooks/useSteamSync.ts`](../src/features/library/hooks/useSteamSync.ts) | Writes to SQLite and MMKV after sync |
| [`src/data/mmkv.ts`](../src/data/mmkv.ts) | Shared MMKV singleton |
| [`src/db/schema.ts`](../src/db/schema.ts) | SQLite table definitions |
| [`src/shared/constants/index.ts`](../src/shared/constants/index.ts) | `MMKV_KEYS` constants |
| [`docs/steam-library-sync.md`](steam-library-sync.md) | Sync engine detail, syncStatus Redux contract |
