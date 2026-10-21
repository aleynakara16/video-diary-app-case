import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useVideo, useDeleteVideo } from '@/hooks/useVideos';
import { isFilePlayable } from '@/utils/fileSystem';
import { formatDate } from '@/utils/formatDuration';
import { DeleteConfirmModal } from '@/components/videos/DeleteConfirmModal';
import { SheetBackdrop, useSheetBackdrop } from '@/components/common/SheetBackdrop';
import {
  ChevronLeftIcon,
  CalendarIcon,
  WarningIcon,
} from '@/components/crop/CropIcons';

export default function VideoDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: video, isLoading, isError, error } = useVideo(id ?? '');
  const deleteMutation = useDeleteVideo();
  const { visible: isBackdropVisible, show: showBackdrop } = useSheetBackdrop();

  const [fileAvailable, setFileAvailable] = useState<boolean | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Check file availability on disk
  useEffect(() => {
    async function checkFile() {
      if (video?.videoUri) {
        const playable = await isFilePlayable(video.videoUri);
        setFileAvailable(playable);
      }
    }
    checkFile();
  }, [video?.videoUri]);

  // Video player instance
  const player = useVideoPlayer(
    fileAvailable && video?.videoUri ? video.videoUri : null,
    (p) => {
      p.loop = true;
      p.play();
    }
  );

  const handleDelete = async () => {
    if (!video) return;
    try {
      await deleteMutation.mutateAsync({
        id: video.id,
        videoUri: video.videoUri,
        thumbnailUri: video.thumbnailUri,
      });
      setShowDeleteModal(false);
      router.back();
    } catch (err) {
      console.error('[VideoDetails] Delete error:', err);
    }
  };

  const handleEdit = () => {
    if (video) {
      showBackdrop();
      router.push(`/edit/${video.id}`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] items-center justify-center">
        <ActivityIndicator size="large" color="#a1d783" />
        <Text className="text-stone-500 text-sm mt-3">
          Loading video entry...
        </Text>
      </SafeAreaView>
    );
  }

  if (isError || !video) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] items-center justify-center p-6">
        <Text className="text-xl font-bold text-stone-900 mb-2">
          Video Not Found
        </Text>
        <Text className="text-stone-500 text-sm text-center mb-6">
          {error?.message ||
            'This video entry does not exist or may have been deleted.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-[#a1d783] px-6 py-3 rounded-2xl">
          <Text className="text-[#142e12] font-bold">Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      {/* Custom Minimal Top Bar */}
      <View className="px-6 py-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back to video diary list"
          className="flex-row items-center px-3.5 py-2.5 rounded-full bg-white border border-stone-200">
          <ChevronLeftIcon color="#1C1917" size={12} />
          <Text className="text-stone-900 font-bold text-xs ml-1.5">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowDeleteModal(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Delete video"
          className="px-3.5 py-2.5 rounded-full bg-red-50 border border-red-200">
          <Text className="text-red-600 font-bold text-xs">Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-2 pb-12"
        showsVerticalScrollIndicator={false}>
        {/* Video Player Section with Native Controls (Fullscreen, Scrub, Mute, Play/Pause) */}
        <View className="w-full aspect-video rounded-3xl overflow-hidden bg-black border border-stone-200 justify-center items-center">
          {fileAvailable === false ? (
            <View className="p-6 items-center justify-center">
              <View className="mb-2">
                <WarningIcon color="#FBBF24" size={28} />
              </View>
              <Text className="text-white font-semibold text-base mb-1">
                Video File Unavailable
              </Text>
              <Text className="text-stone-400 text-xs text-center max-w-xs">
                The file could not be found at its saved path: {video.videoUri}
              </Text>
            </View>
          ) : (
            <VideoView
              player={player}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              nativeControls
            />
          )}
        </View>

        {/* Editorial Title & Description */}
        <View className="mt-7">
          <Text className="text-[11px] font-bold tracking-[1.8px] text-stone-500 uppercase mb-2.5">
            SAVED MOMENT
          </Text>

          <Text className="text-[32px] leading-[38px] font-black text-stone-900 tracking-tight mb-4">
            {video.name}
          </Text>

          <Text className="text-base leading-[26px] text-stone-600 font-normal">
            {video.description ||
              'A 5-second memory captured in your video diary.'}
          </Text>
        </View>

        {/* Divider Line */}
        <View className="h-[1px] bg-stone-200 my-7" />

        {/* Date Row & Primary Edit Action */}
        <View className="flex-row items-center justify-between mb-7">
          <View className="flex-row items-center">
            <CalendarIcon color="#78716C" size={18} />
            <Text className="text-stone-500 text-base font-medium ml-3">
              Date
            </Text>
          </View>
          <Text className="text-stone-900 text-base font-bold">
            {formatDate(video.createdAt)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleEdit}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Edit moment details"
          className="w-full py-4 rounded-2xl bg-[#a1d783] flex-row items-center justify-center">
          <Text className="text-[#142e12] font-extrabold text-base mr-2">
            Edit Moment Details
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={showDeleteModal}
        videoTitle={video.name}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Dim backdrop while the edit formSheet is presented */}
      <SheetBackdrop visible={isBackdropVisible} />
    </SafeAreaView>
  );
}
