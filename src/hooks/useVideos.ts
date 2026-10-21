import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { videoRepository, type VideoPage, type VideoPageCursor } from '@/lib/videoRepository';
import { videoQueryKeys } from '@/lib/queryClient';
import { deleteMediaFile } from '@/utils/fileSystem';
import type { VideoEntry, UpdateVideoInput } from '@/types/video.types';

export const VIDEOS_PAGE_SIZE = 10;

/**
 * Paginated (keyset/cursor) video list. Loads PAGE_SIZE items at a time;
 * call fetchNextPage() when the list nears its end.
 */
export function useVideos() {
  return useInfiniteQuery<
    VideoPage,
    Error,
    InfiniteData<VideoPage, VideoPageCursor | null>,
    ReturnType<typeof videoQueryKeys.lists>,
    VideoPageCursor | null
  >({
    queryKey: videoQueryKeys.lists(),
    initialPageParam: null,
    queryFn: ({ pageParam }) => videoRepository.getPage(VIDEOS_PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useVideo(id: string) {
  return useQuery<VideoEntry | null, Error>({
    queryKey: videoQueryKeys.detail(id),
    queryFn: () => videoRepository.getById(id),
    enabled: Boolean(id),
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; videoUri: string; thumbnailUri?: string | null }>({
    mutationFn: async ({ id, videoUri, thumbnailUri }) => {
      // 1. Delete record from database first
      await videoRepository.delete(id);
      // 2. Clean up physical video + thumbnail files
      await deleteMediaFile(videoUri);
      await deleteMediaFile(thumbnailUri);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: videoQueryKeys.lists() });
      queryClient.removeQueries({ queryKey: videoQueryKeys.detail(variables.id) });
    },
  });
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();

  return useMutation<VideoEntry, Error, { id: string; input: UpdateVideoInput }>({
    mutationFn: async ({ id, input }) => {
      return videoRepository.update(id, input);
    },
    onSuccess: (updatedEntry) => {
      queryClient.invalidateQueries({ queryKey: videoQueryKeys.lists() });
      queryClient.setQueryData(videoQueryKeys.detail(updatedEntry.id), updatedEntry);
    },
  });
}
