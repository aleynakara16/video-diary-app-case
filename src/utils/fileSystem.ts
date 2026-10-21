import { Directory, File, Paths } from 'expo-file-system';

const VIDEOS_DIR_NAME = 'videos';
const THUMBS_DIR_NAME = 'thumbs';

/**
 * Ensures the persistent videos directory exists.
 */
export function ensureVideosDirectory(): Directory {
  const dir = new Directory(Paths.document, VIDEOS_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Resolves a stored relative path or legacy full URI to the current container's full File URI.
 * Handles iOS container UUID changes across app updates/rebuilds.
 */
export function resolveStoredMediaUri(storedPath: string | null | undefined): string | null {
  if (!storedPath) return null;

  // Already a relative path like "videos/diary_123.mp4"
  if (!storedPath.includes('://')) {
    const cleanRel = storedPath.replace(/^\/+/, '');
    const file = new File(Paths.document, cleanRel);
    return file.uri;
  }

  // Legacy full URI that contains "/Documents/"
  const docsMarker = '/Documents/';
  const markerIdx = storedPath.lastIndexOf(docsMarker);
  if (markerIdx !== -1) {
    const relativePart = storedPath.substring(markerIdx + docsMarker.length);
    if (relativePart) {
      const file = new File(Paths.document, relativePart);
      return file.uri;
    }
  }

  return storedPath;
}

/**
 * Copies a temporary video file to durable application storage.
 * Returns the relative path (e.g. "videos/diary_123.mp4") for database persistence.
 */
export async function persistVideoFile(sourceUri: string): Promise<string> {
  const dir = ensureVideosDirectory();
  const filename = `diary_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`;
  const relativePath = `${VIDEOS_DIR_NAME}/${filename}`;
  const destinationFile = new File(dir, filename);

  const sourceFile = new File(sourceUri);
  await sourceFile.copy(destinationFile);

  if (!destinationFile.exists) {
    throw new Error('Failed to verify persisted video file at destination.');
  }

  // Clean up temporary trimmed source file if it differs from destination
  try {
    if (sourceFile.uri !== destinationFile.uri && sourceFile.exists) {
      sourceFile.delete();
    }
  } catch {
    // Ignore cleanup errors for temporary files
  }

  return relativePath;
}

/**
 * Copies a generated thumbnail image (usually from the cache dir) into durable storage.
 * Returns the relative path (e.g. "thumbs/diary_123.jpg") for database persistence.
 */
export async function persistThumbnailFile(sourceUri: string): Promise<string> {
  const dir = new Directory(Paths.document, THUMBS_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  const filename = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const destinationFile = new File(dir, filename);

  const sourceFile = new File(sourceUri);
  await sourceFile.copy(destinationFile);

  if (!destinationFile.exists) {
    throw new Error('Failed to verify persisted thumbnail file at destination.');
  }

  try {
    if (sourceFile.exists) sourceFile.delete();
  } catch {
    // Ignore cleanup errors for temporary files
  }

  return `${THUMBS_DIR_NAME}/${filename}`;
}

/**
 * Safely removes a stored video file if it exists.
 */
export async function deleteMediaFile(storedOrFullUri: string | null | undefined): Promise<void> {
  if (!storedOrFullUri) return;
  try {
    const resolvedUri = resolveStoredMediaUri(storedOrFullUri);
    if (!resolvedUri) return;
    const file = new File(resolvedUri);
    if (file.exists) {
      file.delete();
    }
  } catch (err) {
    console.warn(`[FileSystem] Could not delete file ${storedOrFullUri}:`, err);
  }
}

/**
 * Backwards-compatible alias for deleting video files.
 */
export const deleteVideoFile = deleteMediaFile;

/**
 * Verifies if a file exists and has positive size.
 */
export async function isFilePlayable(storedOrFullUri: string): Promise<boolean> {
  try {
    const resolvedUri = resolveStoredMediaUri(storedOrFullUri);
    if (!resolvedUri) return false;
    const file = new File(resolvedUri);
    return file.exists && file.size > 0;
  } catch {
    return false;
  }
}
