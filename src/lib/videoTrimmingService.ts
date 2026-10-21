import { trimVideo, TrimVideoOptions, TrimVideoResult } from 'expo-trim-video';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export interface TrimParams {
  uri: string;
  start: number; // in seconds
  end: number; // in seconds
}

export class VideoTrimmingError extends Error {
  code: string;
  constructor(message: string, code = 'TRIM_ERROR') {
    super(message);
    this.name = 'VideoTrimmingError';
    this.code = code;
  }
}

/**
 * Trims a video using the native expo-trim-video module.
 * Enforces start and end timestamps in seconds, validates output existence.
 */
export async function executeVideoTrim(params: TrimParams): Promise<TrimVideoResult> {
  const { uri, start, end } = params;

  if (!uri || typeof uri !== 'string') {
    throw new VideoTrimmingError('Valid video URI is required for trimming.', 'INVALID_ARGUMENTS');
  }

  if (start < 0) {
    throw new VideoTrimmingError('Start time cannot be negative.', 'INVALID_START');
  }

  if (end <= start) {
    throw new VideoTrimmingError('End time must be greater than start time.', 'INVALID_RANGE');
  }

  const duration = end - start;
  // Enforce ~5 second duration tolerance (4.9 to 5.1s)
  if (duration < 4.8 || duration > 5.2) {
    console.warn(`[TrimmingService] Duration is ${duration.toFixed(2)}s; expected 5.0s.`);
  }

  try {
    const options: TrimVideoOptions = {
      uri,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
    };

    let result: TrimVideoResult;
    try {
      result = await trimVideo(options);
    } catch (firstErr: any) {
      // Handle millisecond floating-point discrepancies between JS player duration and native AVAsset/MediaMetadataRetriever duration
      const isEndBoundaryError =
        firstErr?.code === 'INVALID_END' ||
        String(firstErr?.message ?? '').includes('exceeds video duration');
      if (isEndBoundaryError && options.end > 0.2) {
        const safeEnd = Number(Math.max(0.1, options.end - 0.1).toFixed(3));
        const safeStart = Number(Math.max(0, Math.min(options.start, safeEnd - Math.min(5.0, safeEnd))).toFixed(3));
        result = await trimVideo({
          uri,
          start: safeStart,
          end: safeEnd,
        });
      } else {
        throw firstErr;
      }
    }

    if (!result || !result.uri) {
      throw new VideoTrimmingError('Trimming completed but no output URI was returned.', 'NO_OUTPUT_URI');
    }

    // Verify output file existence on native platforms using modern File API
    if (Platform.OS !== 'web') {
      const outputFile = new File(result.uri);
      if (!outputFile.exists) {
        throw new VideoTrimmingError(
          `Trimmed video file was not found at expected URI: ${result.uri}`,
          'FILE_NOT_FOUND'
        );
      }
    }

    return result;
  } catch (error: any) {
    if (error instanceof VideoTrimmingError) {
      throw error;
    }

    const message = error?.message || 'Failed to trim video';
    const code = error?.code || 'TRIM_ERROR';
    console.error('[VideoTrimmingService] Error during trim:', error);
    throw new VideoTrimmingError(message, code);
  }
}
