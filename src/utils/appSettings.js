import { getSavedItem, setSavedItem } from './helpers';

export const THEME_MODE_KEY = 'sungdong_theme_mode';
export const BG_GRAY_LEVEL_KEY = 'sungdong_bg_gray_level';
export const ROOM_POPUP_MODE_KEY = 'sungdong_room_popup_mode';

export const DEFAULT_THEME_MODE = 'light';
export const DEFAULT_BG_GRAY_LEVEL = 20;
export const DEFAULT_ROOM_POPUP_MODE = 'once';

const lerp = (start, end, ratio) => Math.round(start + (end - start) * ratio);

const toRgb = (r, g, b) => `rgb(${r}, ${g}, ${b})`;

export const clampBgGrayLevel = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_BG_GRAY_LEVEL;
  return Math.max(0, Math.min(100, Math.round(num)));
};

export const getThemeMode = () => {
  try {
    const saved = getSavedItem(THEME_MODE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  } catch (_) {
    return DEFAULT_THEME_MODE;
  }
};

export const getBgGrayLevel = () => {
  try {
    const raw = getSavedItem(BG_GRAY_LEVEL_KEY);
    if (raw === null || raw === undefined || raw === '') {
      return DEFAULT_BG_GRAY_LEVEL;
    }
    return clampBgGrayLevel(raw);
  } catch (_) {
    return DEFAULT_BG_GRAY_LEVEL;
  }
};

export const getRoomPopupMode = () => {
  try {
    const saved = getSavedItem(ROOM_POPUP_MODE_KEY);
    return saved === 'always' ? 'always' : 'once';
  } catch (_) {
    return DEFAULT_ROOM_POPUP_MODE;
  }
};

export const computeMainBgColors = (level, isDark = false) => {
  const ratio = clampBgGrayLevel(level) / 100;
  if (isDark) {
    return {
      mainBg: toRgb(lerp(9, 51, ratio), lerp(13, 65, ratio), lerp(22, 85, ratio)),
      outerBg: toRgb(lerp(3, 30, ratio), lerp(7, 41, ratio), lerp(18, 59, ratio))
    };
  }
  return {
    mainBg: toRgb(lerp(255, 200, ratio), lerp(255, 210, ratio), lerp(255, 225, ratio)),
    outerBg: toRgb(lerp(252, 197, ratio), lerp(253, 213, ratio), lerp(255, 225, ratio))
  };
};

export const applyAppAppearance = (themeOverride, grayLevelOverride) => {
  if (typeof document === 'undefined') return;
  const theme = themeOverride === 'dark' || themeOverride === 'light' ? themeOverride : getThemeMode();
  const grayLevel = grayLevelOverride !== undefined ? clampBgGrayLevel(grayLevelOverride) : getBgGrayLevel();
  const isDark = theme === 'dark';
  const root = document.documentElement;

  root.classList.toggle('dark', isDark);

  const { mainBg, outerBg } = computeMainBgColors(grayLevel, isDark);
  root.style.setProperty('--main-bg-color', mainBg);
  root.style.setProperty('--main-outer-bg-color', outerBg);

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', isDark ? '#0f172a' : '#2563EB');
  }
};

export const saveThemeMode = (mode) => {
  const normalized = mode === 'dark' ? 'dark' : 'light';
  setSavedItem(THEME_MODE_KEY, normalized);
  applyAppAppearance(normalized, getBgGrayLevel());
  return normalized;
};

export const saveBgGrayLevel = (level) => {
  const clamped = clampBgGrayLevel(level);
  setSavedItem(BG_GRAY_LEVEL_KEY, String(clamped));
  applyAppAppearance(getThemeMode(), clamped);
  return clamped;
};

export const saveRoomPopupMode = (mode) => {
  const normalized = mode === 'always' ? 'always' : 'once';
  setSavedItem(ROOM_POPUP_MODE_KEY, normalized);
  return normalized;
};
