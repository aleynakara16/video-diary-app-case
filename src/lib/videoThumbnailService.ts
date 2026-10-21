import { createVideoPlayer } from 'expo-video';

const THUMBNAIL_MAX_WIDTH = 720;
const THUMBNAIL_JPEG_QUALITY = 0.8;
const PLAYER_READY_TIMEOUT_MS = 8000;

/**
 * Generates a JPEG thumbnail file (in the cache directory) for a local video.
 * expo-video returns native image refs, so we encode them to a real JPEG file
 * that can be persisted and displayed later without ever regenerating it.
 */
export async function generateThumbnailFile(
  videoUri: string,
  atSeconds = 1.0
): Promise<string> {
  // Lazy-loaded: if the native module isn't in the installed dev build yet, this rejects
  // here (and is handled by the caller) instead of crashing the app at import time.
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');

  const player = createVideoPlayer(videoUri);

  try {
    await waitUntilReady(player);

    const [thumbnail] = await player.generateThumbnailsAsync(atSeconds, {
      maxWidth: THUMBNAIL_MAX_WIDTH,
    });
    if (!thumbnail) {
      throw new Error('No thumbnail frame was generated.');
    }

    const context = ImageManipulator.manipulate(thumbnail);
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: THUMBNAIL_JPEG_QUALITY,
    });
    return saved.uri;
  } finally {
    player.release();
  }
}

function waitUntilReady(player: ReturnType<typeof createVideoPlayer>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (player.status === 'readyToPlay') {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      subscription.remove();
      reject(new Error('Timed out while loading video for thumbnail generation.'));
    }, PLAYER_READY_TIMEOUT_MS);

    const subscription = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      } else if (status === 'error') {
        clearTimeout(timeout);
        subscription.remove();
        reject(new Error(error?.message ?? 'Video failed to load for thumbnail generation.'));
      }
    });
  });
}

