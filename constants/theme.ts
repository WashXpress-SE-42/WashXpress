/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    textPrimary: '#11181C',
    textSecondary: '#687076',
    background: '#F5F5F5',
    cardBackground: '#FFFFFF',
    accent: '#2563eb',
    accentLight: '#EEF2FF',
    border: '#E0E0E0',
    divider: '#F0F0F0',
    error: '#FF3B30',
    errorLight: '#FEF2F2',
    success: '#34C759',
    successLight: '#F0FDF4',
    warning: '#FF9500',
    warningLight: '#FFFBEB',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    inputBackground: '#FFFFFF',
    inputPlaceholder: '#999',
  },
  dark: {
    textPrimary: '#ECEDEE',
    textSecondary: '#94a3b8',
    background: '#0d1629',
    cardBackground: '#1e2d4a',
    accent: '#3b82f6',
    accentLight: 'rgba(37,99,235,0.2)',
    border: 'rgba(255,255,255,0.06)',
    divider: 'rgba(255,255,255,0.06)',
    error: '#EF4444',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.1)',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    inputBackground: '#1e2d4a',
    inputPlaceholder: '#64748b',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
