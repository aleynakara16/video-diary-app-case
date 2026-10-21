import React from 'react';
import { SymbolView } from 'expo-symbols';

interface IconProps {
  color?: string;
  size?: number;
}

export function CloseIcon({ color = '#57534E', size = 14 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'xmark', android: 'close', web: 'close' }}
      tintColor={color}
      size={size}
    />
  );
}

export function CheckIcon({ color = '#142e12', size = 12 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
      tintColor={color}
      size={size}
    />
  );
}

export function PlayIcon({ color = '#1C1917', size = 18 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
      tintColor={color}
      size={size}
    />
  );
}

export function PauseIcon({ color = '#1C1917', size = 18 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'pause.fill', android: 'pause', web: 'pause' }}
      tintColor={color}
      size={size}
    />
  );
}

export function ChevronLeftIcon({ color = '#57534E', size = 14 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
      tintColor={color}
      size={size}
    />
  );
}

export function CalendarIcon({ color = '#78716C', size = 18 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
      tintColor={color}
      size={size}
    />
  );
}

export function TrashIcon({ color = '#DC2626', size = 18 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'trash', android: 'delete', web: 'delete' }}
      tintColor={color}
      size={size}
    />
  );
}

export function FilmIcon({ color = '#78716C', size = 28 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'film', android: 'movie', web: 'movie' }}
      tintColor={color}
      size={size}
    />
  );
}

export function PlusIcon({ color = '#142e12', size = 15 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'plus', android: 'add', web: 'add' }}
      tintColor={color}
      size={size}
    />
  );
}

export function WarningIcon({ color = '#FBBF24', size = 28 }: IconProps) {
  return (
    <SymbolView
      name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
      tintColor={color}
      size={size}
    />
  );
}
