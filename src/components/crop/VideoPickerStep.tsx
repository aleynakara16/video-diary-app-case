import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEvent } from 'expo';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import type { VideoAsset } from '@/types/video.types';
import { formatDuration } from '@/utils/formatDuration';
import { PauseIcon, PlayIcon } from './CropIcons';

interface VideoPickerStepProps {
  selectedAsset: VideoAsset | null;
  onAssetSelected: (asset: VideoAsset) => void;
  onContinue: () => void;
}

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];

function SIcon({
  name,
  color,
  size,
}: {
  name: SymbolName;
  color: string;
  size: number;
}) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}

export function VideoPickerStep({
  selectedAsset,
  onAssetSelected,
  onContinue,
}: VideoPickerStepProps) {
  const [loading, setLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const player = useVideoPlayer(selectedAsset?.uri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  // Verify real duration once player is ready (handles cases where ImagePicker returns null/0 duration)
  useEffect(() => {
    if (!selectedAsset || status !== 'readyToPlay' || !player) return;
    const realDuration = player.duration > 0 ? player.duration : selectedAsset.duration;
    if (realDuration > 0 && realDuration < 5.0) {
      setPickerError(
        `Selected video is ${realDuration.toFixed(1)}s long. Video must be at least 5.0 seconds.`
      );
    } else if (realDuration >= 5.0 && Math.abs(selectedAsset.duration - realDuration) > 0.05) {
      onAssetSelected({ ...selectedAsset, duration: realDuration });
    }
  }, [selectedAsset, status, player, onAssetSelected]);

  // Generate a single small poster frame once, to use as the timeline placeholder in the crop step
  const posterRequestedUriRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !selectedAsset ||
      selectedAsset.posterFrame ||
      status !== 'readyToPlay' ||
      posterRequestedUriRef.current === selectedAsset.uri
    ) {
      return;
    }
    posterRequestedUriRef.current = selectedAsset.uri;
    const asset = selectedAsset;

    player
      .generateThumbnailsAsync([0], { maxHeight: 96 })
      .then(([poster]) => {
        if (poster) onAssetSelected({ ...asset, posterFrame: poster });
      })
      .catch((err) => {
        console.warn('[VideoPicker] Poster frame generation failed:', err);
      });
  }, [selectedAsset, status, player, onAssetSelected]);

  const handleTogglePreview = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handlePickVideo = async () => {
    setPickerError(null);
    try {
      setLoading(true);

      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setPickerError('Permission to access photos and videos is required.');
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      // ImagePickerAsset.duration is in milliseconds
      const durationSeconds = asset.duration ? asset.duration / 1000 : 0;

      if (durationSeconds > 0 && durationSeconds < 5.0) {
        setPickerError(
          `Selected video is ${durationSeconds.toFixed(1)}s long. Video must be at least 5.0 seconds.`
        );
        setLoading(false);
        return;
      }

      onAssetSelected({
        uri: asset.uri,
        duration: durationSeconds,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
      });
    } catch (err: any) {
      console.error('[VideoPicker] Selection error:', err);
      setPickerError(
        err?.message || 'Failed to select video. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const canContinue =
    Boolean(selectedAsset) &&
    !loading &&
    !pickerError &&
    ((selectedAsset?.duration ?? 0) >= 5.0 || selectedAsset?.duration === 0);

  return (
    <View className="flex-1 bg-white justify-between">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-5 pb-6"
        showsVerticalScrollIndicator={false}>
        {selectedAsset ? (
          /* ================= Selected Video State ================= */
          <Animated.View entering={FadeIn.duration(350)}>
            {/* Video Player Box */}
            <View
              className="w-full aspect-[16/10] rounded-3xl overflow-hidden bg-stone-900 relative border border-stone-200"
              style={{
                backgroundColor: '#1c1917',
                boxShadow: '0px 14px 28px rgba(20, 46, 18, 0.12)',
              }}>
              <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                nativeControls={false}
              />

              {/* Top Badges */}
              <View className="absolute top-3.5 left-3.5 right-3.5 flex-row items-center justify-between pointer-events-none">
                <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md">
                  <SIcon
                    name={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }}
                    color="#a1d783"
                    size={12}
                  />
                  <Text className="text-white text-xs font-bold tracking-tight">
                    {formatDuration(selectedAsset.duration)} ({selectedAsset.duration.toFixed(1)}s)
                  </Text>
                </View>

                {Boolean(selectedAsset.width && selectedAsset.height) && (
                  <View className="px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md">
                    <Text className="text-stone-300 text-[11px] font-semibold">
                      {selectedAsset.width}×{selectedAsset.height}
                    </Text>
                  </View>
                )}
              </View>

              {/* Center Play/Pause Control */}
              <TouchableOpacity
                onPress={handleTogglePreview}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  isPlaying ? 'Pause video preview' : 'Play video preview'
                }
                className="absolute inset-0 items-center justify-center">
                <View
                  style={{ backgroundColor: '#FFFFFF' }}
                  className="w-16 h-16 rounded-full bg-white items-center justify-center shadow-lg">
                  {isPlaying ? (
                    <PauseIcon color="#142e12" size={20} />
                  ) : (
                    <PlayIcon color="#142e12" size={20} />
                  )}
                </View>
              </TouchableOpacity>

            </View>

            {/* Selected Clip Info Card */}
            <View className="mt-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Clip Selected
                  </Text>
                </View>
                <Text className="text-stone-500 text-xs mt-0.5">
                  Ready to trim 5.0 seconds in the next step
                </Text>
              </View>

              <TouchableOpacity
                onPress={handlePickVideo}
                disabled={loading}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Choose a different video"
                style={{ backgroundColor: '#FFFFFF' }}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 shadow-sm flex-row items-center gap-1.5">
                {loading ? (
                  <ActivityIndicator size="small" color="#142e12" />
                ) : (
                  <>
                    <SIcon
                      name={{
                        ios: 'arrow.triangle.2.circlepath',
                        android: 'refresh',
                        web: 'refresh',
                      }}
                      color="#44403C"
                      size={13}
                    />
                    <Text className="text-stone-800 font-bold text-xs">
                      Change
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          /* ================= Empty / No Video State ================= */
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Hero Upload Drop Card */}
            <Pressable
              onPress={handlePickVideo}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Browse videos from library"
              className="w-full rounded-3xl border-2 border-dashed border-[#a1d783]/70 bg-gradient-to-b from-[#f7fbf5] to-stone-50 p-6 items-center justify-center"
              style={{
                backgroundColor: '#f8fbf6',
              }}>
              {/* Animated Floating Icon Container */}
              <View className="relative w-20 h-20 items-center justify-center mb-4">
                <View className="absolute inset-0 rounded-full bg-[#a1d783]/25" />
                <View
                  style={{ backgroundColor: '#a1d783' }}
                  className="w-16 h-16 rounded-2xl bg-[#a1d783] items-center justify-center shadow-md">
                  {loading ? (
                    <ActivityIndicator size="small" color="#142e12" />
                  ) : (
                    <SIcon
                      name={{
                        ios: 'photo.on.rectangle.angled',
                        android: 'video_library',
                        web: 'video_library',
                      }}
                      color="#142e12"
                      size={28}
                    />
                  )}
                </View>
                <View className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-stone-900 items-center justify-center border-2 border-white">
                  <SIcon
                    name={{ ios: 'plus', android: 'add', web: 'add' }}
                    color="#FFFFFF"
                    size={12}
                  />
                </View>
              </View>

              {/* Badge */}
              <View className="px-3 py-1 rounded-full bg-[#eef8e8] border border-[#a1d783]/50 mb-2">
                <Text className="text-[10px] font-black uppercase tracking-widest text-[#142e12]">
                  Camera Roll
                </Text>
              </View>

              <Text className="text-stone-900 font-black text-xl text-center mb-1 tracking-tight">
                {loading ? 'Opening Media Library...' : 'Choose Your Video'}
              </Text>
              <Text className="text-stone-500 text-xs text-center max-w-[270px] leading-relaxed mb-5">
                Pick any memorable clip longer than 5 seconds. You will choose the exact 5s crop next.
              </Text>

              {/* In-Card Action Button */}
              <View
                style={{ backgroundColor: '#142e12' }}
                className="flex-row items-center gap-2 px-5 py-3 rounded-xl bg-[#142e12] shadow-sm">
                <SIcon
                  name={{
                    ios: 'plus.circle.fill',
                    android: 'add_circle',
                    web: 'add_circle',
                  }}
                  color="#a1d783"
                  size={16}
                />
                <Text className="text-white font-bold text-xs tracking-tight">
                  Browse Video Library
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Error notification banner */}
        {pickerError && (
          <Animated.View
            entering={FadeInUp.duration(200)}
            className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex-row items-center gap-2.5">
            <SIcon
              name={{
                ios: 'exclamationmark.circle.fill',
                android: 'error',
                web: 'error',
              }}
              color="#DC2626"
              size={18}
            />
            <Text className="flex-1 text-red-700 text-xs font-medium leading-tight">
              {pickerError}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Persistent Bottom Action Bar */}
      <View
        className="px-6 pt-3 pb-6 border-t border-stone-100 bg-white"
        style={{
          backgroundColor: '#ffffff',
          boxShadow: '0px -4px 16px rgba(0, 0, 0, 0.04)',
        }}>
        <TouchableOpacity
          onPress={canContinue ? onContinue : handlePickVideo}
          disabled={loading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            canContinue ? 'Continue to crop' : 'Select a video from library'
          }
          className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-2 ${
            canContinue
              ? 'bg-[#a1d783]'
              : 'bg-stone-100 border border-stone-200'
          }`}
          style={
            canContinue
              ? {
                  backgroundColor: '#a1d783',
                  boxShadow: '0px 10px 20px rgba(161, 215, 131, 0.45)',
                }
              : undefined
          }>
          {loading ? (
            <ActivityIndicator size="small" color="#142e12" />
          ) : canContinue ? (
            <>
              <Text className="font-extrabold text-base text-[#142e12]">
                Continue to Crop
              </Text>
              <SIcon
                name={{
                  ios: 'arrow.right',
                  android: 'arrow_forward',
                  web: 'arrow_forward',
                }}
                color="#142e12"
                size={16}
              />
            </>
          ) : (
            <>
              <SIcon
                name={{
                  ios: 'photo.on.rectangle',
                  android: 'video_library',
                  web: 'video_library',
                }}
                color="#57534E"
                size={16}
              />
              <Text className="font-bold text-sm text-stone-700">
                Choose Video to Continue
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
