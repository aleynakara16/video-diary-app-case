import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const videoQueryKeys = {
  all: ['videos'] as const,
  lists: () => [...videoQueryKeys.all, 'list'] as const,
  details: () => [...videoQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoQueryKeys.details(), id] as const,
};

