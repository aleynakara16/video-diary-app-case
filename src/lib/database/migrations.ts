import type { SQLiteDatabase } from 'expo-sqlite';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      videoUri TEXT NOT NULL,
      duration REAL NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_videos_createdAt ON videos(createdAt DESC);
  `);

  // Additive migration: thumbnailUri column (for databases created before thumbnails existed)
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(videos);');
  if (!columns.some((c) => c.name === 'thumbnailUri')) {
    await db.execAsync('ALTER TABLE videos ADD COLUMN thumbnailUri TEXT;');
  }
}

