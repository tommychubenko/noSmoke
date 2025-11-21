import { AppColors, ColorSet, ThemeName, DEFAULT_THEME } from './Colors';

// --- INTERFACES ---

/**
 * Defines the complete structure of a theme, including colors and metadata.
 */
export interface AppTheme {
  /** Unique technical name of the theme (matches the key in AppColors). */
  name: ThemeName;
  /** Display name of the theme for the user interface. */
  displayName: string;
  /** Whether this theme requires Premium status. */
  isPremium: boolean;
  /** НОВЕ: Чи є ця тема темною палітрою. */
  isDark: boolean; 
  /** The ColorSet object imported from Colors.ts. */
  colors: ColorSet;
}

// --- THEME ARRAY ---

/**
 * Array of all available themes used in the application.
 * Used for rendering the theme selector in the settings screen.
 */
export const Themes: AppTheme[] = [
  {
    name: 'Theme3',
    displayName: 'Morning Fog (Default)',
    isPremium: false,
    isDark: true, // ВСТАНОВЛЕНО: Темна
    colors: AppColors.Theme3,
  },
  {
    name: 'Theme2',
    displayName: 'Sea Freshness',
    isPremium: true,
    isDark: false, // ВСТАНОВЛЕНО: Світла
    colors: AppColors.Theme2,
  },
  {
    name: 'Theme1',
    displayName: 'Soft Twilight',
    isPremium: false,
    isDark: false, // ВСТАНОВЛЕНО: Світла
    colors: AppColors.Theme1,
  },
  {
    name: 'Theme4',
    displayName: 'Sandy Horizon',
    isPremium: true,
    isDark: false, // ВСТАНОВЛЕНО: Світла
    colors: AppColors.Theme4,
  },
  {
    name: 'Theme5',
    displayName: 'Night Minimalism',
    isPremium: true,
    isDark: true, // ВСТАНОВЛЕНО: Темна
    colors: AppColors.Theme5,
  },
  {
    name: 'Theme6',
    displayName: 'Tropical Sunset',
    isPremium: true,
    isDark: false, // ВСТАНОВЛЕНО: Світла
    colors: AppColors.Theme6,
  },
];

// --- UTILITY FUNCTION ---

/**
 * Retrieves a theme object by its technical name.
 * @param themeName The technical name of the theme.
 * @returns The matching AppTheme object.
 */
export const getThemeByName = (themeName: ThemeName): AppTheme => {
  const theme = Themes.find(t => t.name === themeName);
  // Завжди повертаємо тему за замовчуванням, якщо задана назва не знайдена
  if (!theme) {
    console.warn(`Theme '${themeName}' not found. Falling back to default: ${DEFAULT_THEME}.`);
  }
  return theme || Themes.find(t => t.name === DEFAULT_THEME)!;
};