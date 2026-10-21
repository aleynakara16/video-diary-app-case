import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeVideoTrim } from '@/lib/videoTrimmingService';
import { persistVideoFile, persistThumbnailFile, resolveStoredMediaUri } from '@/utils/fileSystem';
import { generateThumbnailFile } from '@/lib/videoThumbnailService';
import { videoRepository } from '@/lib/videoRepository';
import { videoQueryKeys } from '@/lib/queryClient';
import type { VideoEntry } from '@/types/video.types';

export interface TrimAndSaveInput {
  sourceUri: string;
  startTime: number;
  endTime: number;
  name: string;
  description?: string;
}

export function useTrimVideoMutation() {
  const queryClient = useQueryClient();

  return useMutation<VideoEntry, Error, TrimAndSaveInput>({
    mutationFn: async ({ sourceUri, startTime, endTime, name, description }) => {
      // 1. Perform native trimming via expo-trim-video
      const trimResult = await executeVideoTrim({
        uri: sourceUri,
        start: startTime,
        end: endTime,
      });

      // 2. Persist trimmed file to durable application storage (returns relative path)
      const permanentVideoPath = await persistVideoFile(trimResult.uri);

      // 3. Generate + persist a thumbnail once, so listing never has to regenerate it.
      //    A thumbnail failure must not block saving the video itself.
      let permanentThumbnailPath: string | null = null;
      try {
        const persistedVideoUri = resolveStoredMediaUri(permanentVideoPath);
        if (persistedVideoUri) {
          const tempThumbUri = await generateThumbnailFile(persistedVideoUri);
          permanentThumbnailPath = await persistThumbnailFile(tempThumbUri);
        }
      } catch (err) {
        console.warn('[TrimMutation] Thumbnail generation failed:', err);
      }

      // 4. Save entry to SQLite database
      const entry = await videoRepository.create({
        name: name.trim(),
        description: (description ?? '').trim(),
        videoUri: permanentVideoPath,
        thumbnailUri: permanentThumbnailPath,
        duration: 5.0,
      });

      return entry;
    },
    onSuccess: (newEntry) => {
      queryClient.invalidateQueries({ queryKey: videoQueryKeys.lists() });
      queryClient.setQueryData(videoQueryKeys.detail(newEntry.id), newEntry);
    },
  });
}
