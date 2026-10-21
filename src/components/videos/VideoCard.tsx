import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { VideoEntry } from '@/types/video.types';
import { formatDate, formatDuration } from '@/utils/formatDuration';
import { PlayIcon, TrashIcon } from '@/components/crop/CropIcons';

interface VideoCardProps {
  item: VideoEntry;
  index?: number;
  onPress: (id: string) => void;
  onDeletePress: (item: VideoEntry) => void;
}

// Only the first few cards animate in; later (paginated / recycled) rows mount instantly
const MAX_ANIMATED_INDEX = 6;

export const VideoCard = React.memo(function VideoCard({
  item,
  index = 0,
  onPress,
  onDeletePress,
}: VideoCardProps) {
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);
  const handleDelete = useCallback(() => onDeletePress(item), [onDeletePress, item]);

  return (
    <Animated.View
      entering={
        index < MAX_ANIMATED_INDEX
          ? FadeInDown.delay(index * 60).duration(350)
          : undefined
      }>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Video: ${item.name}, duration ${formatDuration(item.duration)}`}
        accessibilityHint="Opens playback and full details for this video"
        className="bg-white border border-stone-200 rounded-2xl overflow-hidden mb-3">
        {/* Thumbnail Hero */}
        <View className="w-full aspect-[21/9] bg-[#1c1917]">
          {item.thumbnailUri ? (
            <Image
              source={{ uri: item.thumbnailUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={item.id}
              accessible={false}
            />
          ) : null}

          {/* Date Pill */}
          <View className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70">
            <Text className="text-white text-xs font-semibold">
              {formatDate(item.createdAt)}
            </Text>
          </View>

          {/* Centered Play Button */}
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center">
            <View
              className="w-10 h-10 rounded-full bg-[#a1d783] items-center justify-center"
              style={{
                backgroundColor: '#a1d783',
                shadowColor: '#a1d783',
                shadowOpacity: 0.6,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              }}>
              <PlayIcon color="#142e12" size={14} />
            </View>
          </View>

          {/* Duration Pill */}
          <View className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/80">
            <Text className="text-white font-mono text-xs font-semibold tracking-widest">
              {formatDuration(item.duration)}
            </Text>
          </View>
        </View>

        {/* Title, Description & Delete */}
        <View className="flex-row items-center px-3.5 py-2.5">
          <View className="flex-1 mr-3">
            <Text
              className="text-stone-900 font-extrabold text-sm mb-0.5"
              numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-stone-500 text-xs" numberOfLines={1}>
              {item.description || 'A 5-second memory saved in your diary.'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`Delete video ${item.name}`}
            className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 items-center justify-center">
            <TrashIcon color="#57534E" size={14} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});
