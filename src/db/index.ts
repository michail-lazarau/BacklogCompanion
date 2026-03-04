import { drizzle } from 'drizzle-orm/op-sqlite';
import { open } from '@op-engineering/op-sqlite';
import * as schema from './schema';

// Module-level singleton — opened once, shared across the app
// Database file lives in the app's Documents directory (managed by op-sqlite)
const sqlite = open({ name: 'backlogcompanion.db' });

// Drizzle instance with schema for full type inference on queries
export const db = drizzle(sqlite, { schema });
