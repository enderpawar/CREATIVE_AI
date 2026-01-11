/**
 * 테마 색상 유틸리티
 * 다크/라이트 모드에 따른 색상 팔레트를 제공합니다.
 */

export type Theme = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  border: string;
  title: string;
  text: string;
  muted: string;
  mutedLight: string;
  sectionBg: string;
  sectionBorder: string;
  itemBorder: string;
  itemBg: string;
  itemHoverText: string;
  selectedBorder: string;
  selectedBg: string;
}

const darkTheme: ThemeColors = {
  bg: 'bg-neutral-900/60',
  border: 'border-neutral-800/70',
  title: 'text-gray-200',
  text: 'text-gray-300',
  muted: 'text-gray-400',
  mutedLight: 'text-gray-500',
  sectionBg: 'bg-neutral-950',
  sectionBorder: 'border-neutral-800',
  itemBorder: 'border-neutral-700',
  itemBg: 'bg-neutral-800',
  itemHoverText: 'hover:text-white',
  selectedBorder: 'border-cyan-500',
  selectedBg: 'bg-cyan-950/30',
};

const lightTheme: ThemeColors = {
  bg: 'bg-white/80',
  border: 'border-gray-300',
  title: 'text-gray-800',
  text: 'text-gray-700',
  muted: 'text-gray-600',
  mutedLight: 'text-gray-500',
  sectionBg: 'bg-gray-50',
  sectionBorder: 'border-gray-200',
  itemBorder: 'border-gray-300',
  itemBg: 'bg-gray-100',
  itemHoverText: 'hover:text-gray-900',
  selectedBorder: 'border-cyan-600',
  selectedBg: 'bg-cyan-50',
};

/**
 * 테마에 따른 색상 팔레트 반환
 * @param theme - 'dark' 또는 'light'
 * @returns ThemeColors 객체
 */
export function getThemeColors(theme: Theme): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}
