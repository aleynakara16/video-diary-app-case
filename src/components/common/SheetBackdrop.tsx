import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

const FADE_IN_MS = 220;
const FADE_OUT_MS = 180;

/**
 * Controls a dim backdrop on the *presenting* screen while a native `formSheet`
 * is open on top of it.
 *
 * Call `show()` right before navigating to the sheet. The backdrop is hidden
 * automatically when the screen regains focus (sheet dismissed via button,
 * swipe-down or Android back), so no manual cleanup is needed.
 */
export function useSheetBackdrop() {
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setVisible(false);
    }, [])
  );

  const show = useCallback(() => setVisible(true), []);

  return { visible, show };
}

interface SheetBackdropProps {
  visible: boolean;
  /** Max opacity of the dim layer. Defaults to 0.4. */
  opacity?: number;
}

/**
 * Full-screen dim overlay. Uses the core `Animated` API (native driver) so it
 * behaves identically on iOS and Android without extra native dependencies.
 * Must be rendered as the last child of the screen root so it sits above content.
 */
export function SheetBackdrop({ visible, opacity = 0.4 }: SheetBackdropProps) {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? FADE_IN_MS : FADE_OUT_MS,
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: '#000',
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, opacity],
          }),
        },
      ]}
    />
  );
}

