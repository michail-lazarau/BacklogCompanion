// Auto-managed: update this file whenever `npx drizzle-kit generate` adds a new migration
// Each entry maps to a generated .sql file — do NOT edit the SQL files manually
//
// CONVENTION: import variable name MUST match the key drizzle-orm's migrator looks up:
//   key = "m" + idx.toString().padStart(4, "0")  → m0000, m0001, m0002, ...
// The idx comes from meta/_journal.json entries[].idx (0-based, increments with each generate).
// When adding a new migration (e.g., Story 4.4):
//   1. Run `npx drizzle-kit generate`
//   2. Import the new file as `m0001` (matching the next journal idx)
//   3. Add `m0001` to the migrations object below
import m0000 from './0000_curvy_starjammers.sql';
import journal from './meta/_journal.json';

export const allMigrations = {
  journal,
  migrations: {
    m0000,
  },
};
