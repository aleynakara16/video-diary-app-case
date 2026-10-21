import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideos, useDeleteVideo } from '@/hooks/useVideos';
import { VideoCard } from '@/components/videos/VideoCard';
import { EmptyState } from '@/components/videos/EmptyState';
import { DeleteConfirmModal } from '@/components/videos/DeleteConfirmModal';
import { PlusIcon } from '@/components/crop/CropIcons';
import { SheetBackdrop, useSheetBackdrop } from '@/components/common/SheetBackdrop';
import type { VideoEntry } from '@/types/video.types';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVideos();
  const videos = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const deleteMutation = useDeleteVideo();
  const { visible: isBackdropVisible, show: showBackdrop } = useSheetBackdrop();

  const [selectedToDelete, setSelectedToDelete] = useState<VideoEntry | null>(null);

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch]);

  const handleCreateNew = useCallback(() => {
    showBackdrop();
    router.push('/crop');
  }, [router, showBackdrop]);

  const handleCardPress = useCallback(
    (id: string) => {
      router.push(`/videos/${id}`);
    },
    [router]
  );

  const handleDeleteConfirm = async () => {
    if (!selectedToDelete) return;
    try {
      await deleteMutation.mutateAsync({
        id: selectedToDelete.id,
        videoUri: selectedToDelete.videoUri,
        thumbnailUri: selectedToDelete.thumbnailUri,
      });
      setSelectedToDelete(null);
    } catch (err) {
      console.error('[HomeScreen] Delete error:', err);
    }
  };

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: VideoEntry; index: number }) => (
      <VideoCard
        item={item}
        index={index}
        onPress={handleCardPress}
        onDeletePress={setSelectedToDelete}
      />
    ),
    [handleCardPress]
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-stone-200 bg-[#FAFAFA]">
        <View>
          <Text className="text-2xl font-black tracking-tight text-stone-900">
            Video Diary
          </Text>
          <Text className="text-xs text-stone-500 font-medium">
            5-second memorable moments
          </Text>
        </View>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#a1d783" />
          <Text className="text-stone-500 text-sm mt-3">Loading your entries...</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-500 text-base font-semibold mb-2">
            Failed to load video diary
          </Text>
          <Text className="text-stone-500 text-xs text-center mb-6">
            {error?.message || 'An unexpected error occurred while loading SQLite data.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: '#FFFFFF' }}
            className="bg-white px-5 py-2.5 rounded-xl border border-stone-300 shadow-sm">
            <Text className="text-stone-700 text-sm font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : videos.length === 0 ? (
        <EmptyState onImportPress={handleCreateNew} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerClassName="p-5 pb-32"
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={handlePullRefresh}
              tintColor="#a1d783"
            />
          }
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#a1d783" />
              </View>
            ) : undefined
          }
        />
      )}

      {/* Floating Action Button (thumb-reachable, bottom-right) */}
      <TouchableOpacity
        onPress={handleCreateNew}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create new video diary entry"
        style={{
          position: 'absolute',
          right: 20,
          bottom: Math.max(insets.bottom, 16) + 8,
          backgroundColor: '#a1d783',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
        className="w-16 h-16 rounded-full bg-[#a1d783] items-center justify-center">
        <PlusIcon color="#142e12" size={24} />
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={Boolean(selectedToDelete)}
        videoTitle={selectedToDelete?.name}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSelectedToDelete(null)}
      />

      {/* Dim backdrop while the crop formSheet is presented */}
      <SheetBackdrop visible={isBackdropVisible} />
    </SafeAreaView>
  );
}
