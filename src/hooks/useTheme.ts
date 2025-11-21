import { useContext } from 'react';
import { ColorSet, ThemeName } from '../constants/Colors';
import { AppTheme } from '../constants/Themes'; 
import { ThemeContext } from '../context/ThemeContext';


// --- INTERFACES ---

/**
 * Defines the complete result structure for the useTheme hook.
 */
interface UseThemeResult {
  /** The full ColorSet object for easy and type-safe access. */
  colors: ColorSet;
  /** The technical name of the current theme (e.g., 'Theme3'). */
  currentThemeName: ThemeName;
  /** Function to set a new theme by its name. */
  setAppTheme: (themeName: ThemeName) => void;
  /** The full current theme object (includes colors, displayName, isPremium). */
  currentTheme: AppTheme; 
  /** True if the user has an active Premium subscription. (ДОДАНО) */
  isUserPremium: boolean; 
  /** Function to manually set the Premium status. (ДОДАНО) */
  setUserPremiumStatus: (isPremium: boolean) => Promise<void>; 
}

// --- HOOK IMPLEMENTATION ---

/**
 * Custom hook to easily access the global theme state (colors, theme setter, and premium status).
 * * Throws an error if used outside of a ThemeProvider.
 * * @returns An object containing the current theme data and functions.
 */
export const useTheme = (): UseThemeResult => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    // Error handling to ensure the hook is only used within the provider
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  // Деструктуризація для отримання всіх значень, включаючи нові
  const { 
    colors, 
    currentThemeName, 
    setAppTheme, 
    currentTheme,
    isUserPremium, // ДОДАНО
    setUserPremiumStatus // ДОДАНО
  } = context;

  return { 
    colors, 
    currentThemeName, 
    setAppTheme, 
    currentTheme,
    isUserPremium, // ДОДАНО
    setUserPremiumStatus // ДОДАНО
  };
};