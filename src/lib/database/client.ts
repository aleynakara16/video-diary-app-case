import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('videodiary.db');
      await runMigrations(db);
      dbInstance = db;
      return db;
    } catch (error) {
      initPromise = null;
      console.error('[Database] Initialization error:', error);
      throw error;
    }
  })();

  return initPromise;
}

