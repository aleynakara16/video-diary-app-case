import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

interface EmptyStateProps {
  onImportPress: () => void;
}

const BRAND = '#a1d783';
const BRAND_TEXT = '#142e12';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];

function Icon({ name, color, size }: { name: SymbolName; color: string; size: number }) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}

const STEPS: { title: string; icon: SymbolName }[] = [
  {
    title: 'Pick',
    icon: { ios: 'photo.on.rectangle', android: 'video_library', web: 'video_library' },
  },
  {
    title: 'Trim 5s',
    icon: { ios: 'scissors', android: 'content_cut', web: 'content_cut' },
  },
  {
    title: 'Save',
    icon: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  },
];

/** Floating stack of "polaroid" video cards with a soft pulsing glow. */
function HeroIllustration() {
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    float.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [reduceMotion, float, pulse]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -10]) }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.85, 1.35]) }],
  }));

  return (
    <View className="w-56 h-56 items-center justify-center mb-8">
      {/* Ambient glow */}
      <View className="absolute w-52 h-52 rounded-full bg-primary-light" />
      <Animated.View
        style={pulseStyle}
        className="absolute w-44 h-44 rounded-full border-2 border-primary"
      />

      <Animated.View style={floatStyle} className="items-center justify-center">
        {/* Back card */}
        <View
          className="absolute w-28 h-36 rounded-3xl bg-stone-200"
          style={{ transform: [{ rotate: '-14deg' }, { translateX: -26 }] }}
        />
        {/* Middle card */}
        <View
          className="absolute w-28 h-36 rounded-3xl bg-[#d7ecc9]"
          style={{ transform: [{ rotate: '10deg' }, { translateX: 24 }] }}
        />
        {/* Front card */}
        <View
          className="w-32 h-40 rounded-3xl bg-white p-2.5"
          style={{
            backgroundColor: '#ffffff',
            boxShadow: '0px 18px 32px rgba(20, 46, 18, 0.18)',
          }}>
          <View className="flex-1 rounded-2xl bg-stone-900 items-center justify-center overflow-hidden">
            <View className="w-11 h-11 rounded-full bg-white/15 items-center justify-center">
              <Icon
                name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
                color="#FFFFFF"
                size={20}
              />
            </View>
            {/* Mini timeline */}
            <View className="absolute bottom-2.5 left-2.5 right-2.5 h-1 rounded-full bg-white/20">
              <View className="w-2/5 h-1 rounded-full bg-primary" />
            </View>
          </View>
          <View className="flex-row items-center justify-between mt-2 px-0.5">
            <View className="w-12 h-1.5 rounded-full bg-stone-200" />
            <Text className="text-[10px] font-bold text-stone-400">0:05</Text>
          </View>
        </View>

        {/* Sparkle badge */}
        <Animated.View
          entering={FadeIn.delay(500).springify()}
          className="absolute -top-3 -right-5 w-10 h-10 rounded-2xl bg-primary items-center justify-center"
          style={{
            backgroundColor: '#a1d783',
            transform: [{ rotate: '12deg' }],
            boxShadow: '0px 8px 16px rgba(161, 215, 131, 0.55)',
          }}>
          <Icon
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            color={BRAND_TEXT}
            size={18}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function StepsRow() {
  return (
    <View className="flex-row items-center justify-center mb-10">
      {STEPS.map((step, index) => (
        <React.Fragment key={step.title}>
          <Animated.View
            entering={FadeInUp.delay(350 + index * 90).springify().damping(16)}
            className="items-center"
            accessible
            accessibilityLabel={`Step ${index + 1}: ${step.title}`}>
            <View className="w-12 h-12 rounded-2xl bg-white border border-stone-200 items-center justify-center mb-1.5">
              <Icon name={step.icon} color="#44403C" size={20} />
            </View>
            <Text className="text-[11px] font-semibold text-stone-500">{step.title}</Text>
          </Animated.View>
          {index < STEPS.length - 1 && (
            <View className="w-7 h-[2px] mx-2 mb-5 rounded-full bg-stone-200" />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function PrimaryButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const shine = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    shine.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 2600 }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, [reduceMotion, shine]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.15, 0.85, 1], [0, 0.6, 0.6, 0]),
    transform: [
      { translateX: interpolate(shine.value, [0, 1], [-120, 320]) },
      { rotate: '20deg' },
    ],
  }));

  return (
    <Animated.View
      style={[
        pressStyle,
        {
          backgroundColor: '#a1d783',
          boxShadow: '0px 12px 24px rgba(142, 199, 112, 0.45)',
          borderRadius: 20,
        },
      ]}
      className="w-full">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        android_ripple={{ color: 'rgba(20, 46, 18, 0.12)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel="Create your first entry"
        accessibilityHint="Opens device photo library to choose a video"
        hitSlop={8}
        className="h-14 rounded-[20px] bg-primary flex-row items-center justify-center gap-2.5 overflow-hidden">
        <Animated.View
          pointerEvents="none"
          style={shineStyle}
          className="absolute left-0 top-[-20px] w-10 h-24 bg-white/50"
        />
        <View className="w-7 h-7 rounded-full bg-primary-text items-center justify-center">
          <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} color={BRAND} size={14} />
        </View>
        <Text className="text-primary-text font-bold text-[17px] tracking-tight">
          Create First Entry
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function EmptyState({ onImportPress }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-7 pb-16">
      <Animated.View entering={FadeIn.duration(500)}>
        <HeroIllustration />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(120).springify().damping(18)}
        className="items-center mb-3">
        <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light mb-4">
          <View className="w-1.5 h-1.5 rounded-full bg-primary-dark" />
          <Text className="text-[11px] font-bold uppercase tracking-widest text-primary-text">
            Your diary awaits
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          className="text-[28px] leading-[34px] font-black tracking-tight text-stone-900 text-center">
          Every day deserves{'\n'}five seconds.
        </Text>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(220).springify().damping(18)}
        className="text-[15px] text-stone-500 text-center mb-8 max-w-[300px] leading-[22px]">
        Turn fleeting moments into a timeline of memories. Pick a clip, trim your favorite 5
        seconds, and give it a story.
      </Animated.Text>

      <StepsRow />

      <Animated.View
        entering={FadeInUp.delay(600).springify().damping(16)}
        className="w-full max-w-[360px] items-center">
        <PrimaryButton onPress={onImportPress} />
        <Text className="text-xs text-stone-400 mt-4">
          Stored privately on your device
        </Text>
      </Animated.View>
    </View>
  );
}
