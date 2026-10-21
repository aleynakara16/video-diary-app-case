import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoThumbnail } from 'expo-video';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { formatDuration } from '@/utils/formatDuration';
import {
  PlayIcon,
  PauseIcon,
  ChevronLeftIcon,
} from './CropIcons';
import type { VideoAsset } from '@/types/video.types';

interface SegmentScrubberProps {
  asset: VideoAsset;
  startTime: number;
  endTime: number;
  onSegmentChange: (startTime: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

const SEGMENT_DURATION = 5.0;
const TIMELINE_BAR_COUNT = 28;
const TIMELINE_FRAME_COUNT = 8;
const TIMELINE_FRAME_BATCH_SIZE = 2;
const TIMELINE_FRAME_MAX_HEIGHT = 64;
const TIMELINE_BAR_HEIGHTS = [
  16, 26, 20, 32, 18, 28, 36, 22, 16, 30, 24, 34, 20, 28,
  18, 32, 24, 16, 30, 36, 20, 26, 18, 32, 22, 28, 20, 16,
];

export function SegmentScrubber({
  asset,
  startTime,
  endTime,
  onSegmentChange,
  onBack,
  onContinue,
}: SegmentScrubberProps) {
  const [resolvedDuration, setResolvedDuration] = useState<number>(
    asset.duration >= SEGMENT_DURATION ? asset.duration : SEGMENT_DURATION
  );
  const [displayStartTime, setDisplayStartTime] = useState(startTime);

  const totalDuration = Math.max(resolvedDuration, SEGMENT_DURATION);
  const maxStart = Math.max(
    0,
    Math.floor((totalDuration - SEGMENT_DURATION) * 100) / 100
  );

  // Reanimated shared values for 60/120fps UI-thread timeline & playhead animations
  const trackWidthSV = useSharedValue(0);
  const totalDurationSV = useSharedValue(totalDuration);
  const maxStartSV = useSharedValue(maxStart);
  const startTimeSV = useSharedValue(startTime);
  const dragGrantStartSV = useSharedValue(startTime);
  const playheadProgressSV = useSharedValue(0); // 0..1 within active 5s window
  const isScrubbingSV = useSharedValue(false);

  useEffect(() => {
    totalDurationSV.value = totalDuration;
    maxStartSV.value = maxStart;
  }, [totalDuration, maxStart, totalDurationSV, maxStartSV]);

  // Video preview player with native timeUpdate events instead of JS setInterval
  const player = useVideoPlayer(asset.uri, (p) => {
    p.loop = false;
    p.muted = false;
    p.timeUpdateEventInterval = 0.05; // 20Hz native time updates
    p.currentTime = startTime;
    // Playback starts after timeline thumbnails are generated (see below)
  });

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });
  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  // Sparse array: index i holds the frame for timeline cell i once generated
  const [timelineFrames, setTimelineFrames] = useState<(VideoThumbnail | undefined)[]>([]);
  const framesRequestedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const lastSeekTimestampRef = useRef(0);
  const lastDisplayedSecondRef = useRef(Math.floor(startTime));

  // Sync external startTime prop changes when not actively scrubbing
  useEffect(() => {
    if (!isScrubbingSV.value) {
      startTimeSV.value = startTime;
      setDisplayStartTime(startTime);
    }
  }, [startTime, isScrubbingSV, startTimeSV]);

  // Sync native player duration when ready
  useEffect(() => {
    if (!player || status !== 'readyToPlay') return;

    const nativeDuration = player.duration;
    const effectiveDuration =
      nativeDuration && nativeDuration > 0
        ? nativeDuration
        : asset.duration > 0
          ? asset.duration
          : SEGMENT_DURATION;

    if (effectiveDuration >= SEGMENT_DURATION) {
      setResolvedDuration(effectiveDuration);
      const computedMaxStart = Math.max(
        0,
        Math.floor((effectiveDuration - SEGMENT_DURATION) * 100) / 100
      );
      if (startTimeSV.value > computedMaxStart) {
        startTimeSV.value = computedMaxStart;
        setDisplayStartTime(computedMaxStart);
        onSegmentChange(computedMaxStart);
      }
    }
  }, [player, status, asset.duration, onSegmentChange, startTimeSV]);

  // Generate evenly-spaced filmstrip frames once the real duration is known
  useEffect(() => {
    if (!player || status !== 'readyToPlay' || framesRequestedRef.current) return;
    framesRequestedRef.current = true;

    const nativeDuration = player.duration > 0 ? player.duration : totalDuration;
    const times = Array.from(
      { length: TIMELINE_FRAME_COUNT },
      (_, i) => ((i + 0.5) * nativeDuration) / TIMELINE_FRAME_COUNT
    );

    // Guarded by framesRequestedRef (runs once). Frames are generated in small
    // groups so the filmstrip fills left-to-right; playback starts only afterwards
    // to avoid decoder contention with the preview.
    const generateProgressively = async () => {
      try {
        for (let i = 0; i < times.length; i += TIMELINE_FRAME_BATCH_SIZE) {
          if (!isMountedRef.current) return;
          const group = times.slice(i, i + TIMELINE_FRAME_BATCH_SIZE);
          const frames = await player.generateThumbnailsAsync(group, {
            maxHeight: TIMELINE_FRAME_MAX_HEIGHT,
          });
          if (!isMountedRef.current) return;
          setTimelineFrames((prev) => {
            const next = [...prev];
            frames.forEach((frame, j) => {
              next[i + j] = frame;
            });
            return next;
          });
        }
      } catch (err) {
        console.warn('[SegmentScrubber] Timeline thumbnail generation failed:', err);
      } finally {
        if (isMountedRef.current) {
          try {
            player.currentTime = startTimeSV.value;
            player.play();
          } catch {
            // Player may have been released
          }
        }
      }
    };

    generateProgressively();
  }, [player, status, totalDuration, startTimeSV]);

  // Native event listener for playback progress & looping strictly within [startTime, startTime + 5s]
  // Updates playheadProgressSV directly without triggering any React re-render!
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (isScrubbingSV.value) return;

    const segStart = startTimeSV.value;
    const segEnd = segStart + SEGMENT_DURATION;

    if (currentTime >= segEnd || currentTime < segStart - 0.15) {
      player.currentTime = segStart;
      playheadProgressSV.value = 0;
      if (player.playing) {
        player.play();
      }
    } else {
      const progress = Math.max(
        0,
        Math.min(1, (currentTime - segStart) / SEGMENT_DURATION)
      );
      playheadProgressSV.value = progress;
    }
  });

  useEventListener(player, 'playToEnd', () => {
    if (isScrubbingSV.value) return;
    player.currentTime = startTimeSV.value;
    playheadProgressSV.value = 0;
    player.play();
  });

  const seekPlayerOnJS = useCallback(
    (targetSeconds: number, commitStore: boolean) => {
      const roundedSecond = Math.floor(targetSeconds);
      if (commitStore || roundedSecond !== lastDisplayedSecondRef.current) {
        lastDisplayedSecondRef.current = roundedSecond;
        setDisplayStartTime(targetSeconds);
      }

      if (commitStore) {
        onSegmentChange(targetSeconds);
      }

      if (!player) return;
      const now = Date.now();
      if (commitStore || now - lastSeekTimestampRef.current >= 45) {
        lastSeekTimestampRef.current = now;
        try {
          player.currentTime = targetSeconds;
        } catch {
          // Ignore transient seek errors while buffering
        }
      }
    },
    [onSegmentChange, player]
  );

  // UI-thread Gesture Handler for 60/120fps scrubbing
  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((evt) => {
      'worklet';
      isScrubbingSV.value = true;
      const width = trackWidthSV.value;
      const total = totalDurationSV.value;
      const max = maxStartSV.value;
      const currentStart = startTimeSV.value;

      if (width <= 0 || max <= 0) {
        dragGrantStartSV.value = currentStart;
        return;
      }

      const touchX = evt.x;
      const windowLeftPx = (currentStart / total) * width;
      const windowWidthPx = (SEGMENT_DURATION / total) * width;
      const windowRightPx = windowLeftPx + windowWidthPx;

      if (touchX >= windowLeftPx - 24 && touchX <= windowRightPx + 24) {
        dragGrantStartSV.value = currentStart;
      } else {
        const rawCentered = (touchX / width) * total - SEGMENT_DURATION / 2;
        const bounded = Math.max(0, Math.min(max, rawCentered));
        const centeredStart = Math.floor(bounded * 100) / 100;
        dragGrantStartSV.value = centeredStart;
        startTimeSV.value = centeredStart;
        playheadProgressSV.value = 0;
        runOnJS(seekPlayerOnJS)(centeredStart, true);
      }
    })
    .onUpdate((evt) => {
      'worklet';
      const width = trackWidthSV.value;
      const total = totalDurationSV.value;
      const max = maxStartSV.value;
      if (width <= 0 || max <= 0) return;

      const deltaSeconds = (evt.translationX / width) * total;
      const bounded = Math.max(
        0,
        Math.min(max, dragGrantStartSV.value + deltaSeconds)
      );
      const nextStart = Math.floor(bounded * 100) / 100;

      if (nextStart !== startTimeSV.value) {
        startTimeSV.value = nextStart;
        playheadProgressSV.value = 0;
        runOnJS(seekPlayerOnJS)(nextStart, false);
      }
    })
    .onFinalize(() => {
      'worklet';
      isScrubbingSV.value = false;
      runOnJS(seekPlayerOnJS)(startTimeSV.value, true);
    });

  // Animated styles driven purely on UI thread
  const leftDimStyle = useAnimatedStyle(() => {
    const total = totalDurationSV.value;
    const width = trackWidthSV.value;
    if (total <= 0 || width <= 0) return { width: 0 };
    const leftPx = Math.max(0, Math.min(width, (startTimeSV.value / total) * width));
    return { width: leftPx };
  });

  const rightDimStyle = useAnimatedStyle(() => {
    const total = totalDurationSV.value;
    const width = trackWidthSV.value;
    if (total <= 0 || width <= 0) return { left: width };
    const leftPx = (startTimeSV.value / total) * width;
    const windowPx = Math.min((SEGMENT_DURATION / total) * width, width - leftPx);
    return { left: Math.min(width, leftPx + windowPx) };
  });

  const activeWindowStyle = useAnimatedStyle(() => {
    const total = totalDurationSV.value;
    const width = trackWidthSV.value;
    if (total <= 0 || width <= 0) return { width: 0, transform: [{ translateX: 0 }] };
    const leftPx = Math.max(0, (startTimeSV.value / total) * width);
    const windowPx = Math.min((SEGMENT_DURATION / total) * width, width - leftPx);
    return {
      width: windowPx,
      transform: [{ translateX: leftPx }],
    };
  });

  const playheadStyle = useAnimatedStyle(() => {
    const total = totalDurationSV.value;
    const width = trackWidthSV.value;
    if (total <= 0 || width <= 0) return { transform: [{ translateX: 0 }] };
    const leftPx = Math.max(0, (startTimeSV.value / total) * width);
    const windowPx = Math.max(8, Math.min((SEGMENT_DURATION / total) * width, width - leftPx));
    const innerRange = Math.max(0, windowPx - 8);
    const offsetPx = 2 + playheadProgressSV.value * innerRange;
    return {
      transform: [{ translateX: offsetPx }],
    };
  });

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    trackWidthSV.value = e.nativeEvent.layout.width;
  };

  const handleTogglePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      const currentStart = startTimeSV.value;
      if (
        player.currentTime < currentStart ||
        player.currentTime >= currentStart + SEGMENT_DURATION
      ) {
        player.currentTime = currentStart;
      }
      player.play();
    }
  };

  const displayEndTime = displayStartTime + SEGMENT_DURATION;

  // 4 evenly-spaced timeline tick labels (0, 1/3, 2/3, 3/3)
  const tickTimestamps = [
    0,
    totalDuration / 3,
    (totalDuration * 2) / 3,
    totalDuration,
  ];

  return (
    <View className="flex-1 justify-between px-6 pt-5 pb-6">
      <View>
        {/* Video Preview with Centered Play/Pause Button */}
        <View className="w-full aspect-[16/10] rounded-3xl overflow-hidden bg-stone-900 relative border border-stone-200">
          <VideoView
            player={player}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            nativeControls={false}
          />

          <TouchableOpacity
            onPress={handleTogglePlayPause}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              isPlaying ? 'Pause segment preview' : 'Play segment preview'
            }
            className="absolute inset-0 items-center justify-center">
            <View
              style={{ backgroundColor: '#FFFFFF' }}
              className="w-16 h-16 rounded-full bg-white items-center justify-center shadow-sm">
              {isPlaying ? (
                <PauseIcon color="#142e12" size={18} />
              ) : (
                <PlayIcon color="#142e12" size={18} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Section Title + Selected Range Pill */}
        <View className="flex-row items-center justify-between mt-5 mb-3.5">
          <View className="flex-1 mr-3">
            <Text className="text-stone-900 font-extrabold text-base">
              Select your 5 seconds
            </Text>
            <Text className="text-stone-400 text-xs font-medium mt-0.5">
              Slide the selection to adjust start time
            </Text>
          </View>

          <View className="px-3.5 py-2 rounded-xl bg-[#eef8e8] border border-[#a1d783]">
            <Text className="text-[#142e12] font-mono text-xs font-extrabold tracking-tight">
              {formatDuration(displayStartTime)} – {formatDuration(displayEndTime)}
            </Text>
          </View>
        </View>

        {/* Interactive Filmstrip Timeline Scrubber (GestureDetector + Reanimated) */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            onLayout={handleTrackLayout}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Five-second segment timeline selector"
            accessibilityValue={{
              text: `${formatDuration(displayStartTime)} to ${formatDuration(displayEndTime)}`,
            }}
            className="h-16 bg-stone-900 rounded-2xl overflow-hidden relative justify-center">
            {asset.posterFrame || timelineFrames.length > 0 ? (
              /* Filmstrip: blurred poster placeholder per cell, real frames fade in on top */
              <View pointerEvents="none" className="absolute inset-0 flex-row">
                {Array.from({ length: TIMELINE_FRAME_COUNT }).map((_, idx) => {
                  const frame = timelineFrames[idx];
                  return (
                    <View key={`frame-${idx}`} style={{ flex: 1, height: '100%' }}>
                      {asset.posterFrame ? (
                        <Image
                          source={asset.posterFrame}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          blurRadius={8}
                          accessible={false}
                        />
                      ) : null}
                      {frame ? (
                        <Image
                          source={frame}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          transition={200}
                          accessible={false}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              /* Placeholder ruler bars while frames are being generated */
              <View
                pointerEvents="none"
                className="absolute inset-0 flex-row items-center justify-between px-4">
                {Array.from({ length: TIMELINE_BAR_COUNT }).map((_, idx) => (
                  <View
                    key={`bar-${idx}`}
                    style={{
                      height: TIMELINE_BAR_HEIGHTS[idx % TIMELINE_BAR_HEIGHTS.length],
                    }}
                    className="w-1 rounded-full bg-stone-500/75"
                  />
                ))}
              </View>
            )}

            {/* Left Unselected Dimmed Overlay */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(12, 10, 9, 0.62)',
                },
                leftDimStyle,
              ]}
            />

            {/* Right Unselected Dimmed Overlay */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(12, 10, 9, 0.62)',
                },
                rightDimStyle,
              ]}
            />

            {/* Active 5-Second Window Frame & Handles */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  borderWidth: 2.5,
                  borderColor: '#a1d783',
                  justifyContent: 'center',
                },
                activeWindowStyle,
              ]}>
              {/* Smooth Reanimated Playhead Inside Active Window */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    top: 2,
                    bottom: 2,
                    width: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    borderRadius: 1,
                  },
                  playheadStyle,
                ]}
              />

              {/* Left Handle Pill */}
              <View className="absolute -left-1 w-2 h-7 rounded bg-[#a1d783]" />

              {/* Right Handle Pill */}
              <View className="absolute -right-1 w-2 h-7 rounded bg-[#a1d783]" />
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* 4 Evenly-Spaced Timestamp Ticks */}
        <View className="flex-row justify-between mt-2.5 px-0.5">
          {tickTimestamps.map((ts, idx) => (
            <Text
              key={`tick-${idx}`}
              className="text-stone-400 text-xs font-mono font-semibold">
              {formatDuration(ts)}
            </Text>
          ))}
        </View>
      </View>

      {/* Bottom Actions */}
      <View className="flex-row items-center gap-3 pt-4">
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back to video selection"
          className="px-5 py-4 rounded-2xl bg-stone-100 border border-stone-200 flex-row items-center justify-center">
          <ChevronLeftIcon color="#1C1917" size={13} />
          <Text className="text-stone-800 font-bold text-sm ml-1.5">
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onContinue}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Confirm 5-second selection"
          className="flex-1 py-4 rounded-2xl bg-[#a1d783] flex-row items-center justify-center">
          <Text className="text-[#142e12] font-extrabold text-base mr-2">
            Confirm selection
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
