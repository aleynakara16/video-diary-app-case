import { getDatabase } from '@/lib/database/client';
import { resolveStoredMediaUri } from '@/utils/fileSystem';
import type { CreateVideoInput, UpdateVideoInput, VideoEntry } from '@/types/video.types';

export interface VideoPageCursor {
  createdAt: number;
  id: string;
}

export interface VideoPage {
  items: VideoEntry[];
  nextCursor: VideoPageCursor | null;
}

export interface IVideoRepository {
  getAll(): Promise<VideoEntry[]>;
  getPage(limit: number, cursor?: VideoPageCursor | null): Promise<VideoPage>;
  getById(id: string): Promise<VideoEntry | null>;
  create(input: CreateVideoInput): Promise<VideoEntry>;
  update(id: string, input: UpdateVideoInput): Promise<VideoEntry>;
  delete(id: string): Promise<void>;
}

interface VideoRow {
  id: string;
  name: string;
  description: string;
  videoUri: string;
  thumbnailUri: string | null;
  duration: number;
  createdAt: number;
  updatedAt: number;
}

function rowToEntry(row: VideoRow): VideoEntry {
  const resolvedVideoUri = resolveStoredMediaUri(row.videoUri) ?? row.videoUri;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    videoUri: resolvedVideoUri,
    thumbnailUri: resolveStoredMediaUri(row.thumbnailUri),
    duration: Number(row.duration),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

function generateId(): string {
  return `vid_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export class VideoRepository implements IVideoRepository {
  async getAll(): Promise<VideoEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<VideoRow>(
      'SELECT id, name, description, videoUri, thumbnailUri, duration, createdAt, updatedAt FROM videos ORDER BY createdAt DESC;'
    );
    return rows.map(rowToEntry);
  }

  /**
   * Keyset (cursor) pagination: stable under inserts/deletes and O(log n) via the createdAt index,
   * unlike OFFSET which rescans skipped rows and can duplicate/skip items when data changes.
   */
  async getPage(limit: number, cursor?: VideoPageCursor | null): Promise<VideoPage> {
    const db = await getDatabase();
    // Fetch one extra row to know whether another page exists
    const rows = cursor
      ? await db.getAllAsync<VideoRow>(
          `SELECT id, name, description, videoUri, thumbnailUri, duration, createdAt, updatedAt FROM videos
           WHERE createdAt < ? OR (createdAt = ? AND id < ?)
           ORDER BY createdAt DESC, id DESC LIMIT ?;`,
          [cursor.createdAt, cursor.createdAt, cursor.id, limit + 1]
        )
      : await db.getAllAsync<VideoRow>(
          `SELECT id, name, description, videoUri, thumbnailUri, duration, createdAt, updatedAt FROM videos ORDER BY createdAt DESC, id DESC LIMIT ?;`,
          [limit + 1]
        );

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
      items: pageRows.map(rowToEntry),
      nextCursor: hasMore && last ? { createdAt: Number(last.createdAt), id: last.id } : null,
    };
  }

  async getById(id: string): Promise<VideoEntry | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<VideoRow>(
      'SELECT id, name, description, videoUri, thumbnailUri, duration, createdAt, updatedAt FROM videos WHERE id = ?;',
      [id]
    );
    return row ? rowToEntry(row) : null;
  }

  async create(input: CreateVideoInput): Promise<VideoEntry> {
    const db = await getDatabase();
    const id = generateId();
    const now = Date.now();
    const description = input.description ?? '';
    const thumbnailUri = input.thumbnailUri ?? null;

    await db.runAsync(
      `INSERT INTO videos (id, name, description, videoUri, thumbnailUri, duration, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, input.name, description, input.videoUri, thumbnailUri, input.duration, now, now]
    );

    return rowToEntry({
      id,
      name: input.name,
      description,
      videoUri: input.videoUri,
      thumbnailUri,
      duration: input.duration,
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(id: string, input: UpdateVideoInput): Promise<VideoEntry> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Video with id "${id}" not found.`);
    }

    const now = Date.now();
    const name = input.name.trim();
    const description = (input.description ?? '').trim();

    await db.runAsync(
      `UPDATE videos SET name = ?, description = ?, updatedAt = ? WHERE id = ?;`,
      [name, description, now, id]
    );

    return {
      ...existing,
      name,
      description,
      updatedAt: now,
    };
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM videos WHERE id = ?;', [id]);
  }
}

export const videoRepository: IVideoRepository = new VideoRepository();
