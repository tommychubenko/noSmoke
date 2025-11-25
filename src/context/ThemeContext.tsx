import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { ColorSet, DEFAULT_THEME, ThemeName } from '../constants/Colors';
import * as storageService from '../services/storageService';
import { AppTheme, getThemeByName } from '../constants/Themes';

// --- INTERFACES ---

/**
 * Defines the structure of the theme context data.
 */
interface ThemeContextData {
  /** The currently selected theme object (including colors). */
  currentTheme: AppTheme;
  /** Function to set a new theme by its name. */
  setAppTheme: (themeName: ThemeName) => void;
  /** The full ColorSet object for easy access. */
  colors: ColorSet;
  /** The technical name of the current theme. */
  currentThemeName: ThemeName;
  /** True if the user has an active Premium subscription. */
  isUserPremium: boolean; // ДОДАНО
  /** Function to manually set the Premium status. */
  setUserPremiumStatus: (isPremium: boolean) => Promise<void>; // ДОДАНО
}

// --- INITIAL STATE ---

// Get the default theme colors and structure
const initialTheme = getThemeByName(DEFAULT_THEME);

// Default context value before any state is set
const defaultContextValue: ThemeContextData = {
  currentTheme: initialTheme,
  setAppTheme: () => { }, // Placeholder function
  colors: initialTheme.colors,
  currentThemeName: DEFAULT_THEME,
  isUserPremium: false, // ДОДАНО
  setUserPremiumStatus: async () => { }, // ДОДАНО
};

// --- CONTEXT CREATION ---

export const ThemeContext = createContext<ThemeContextData>(defaultContextValue);

// --- PROVIDER COMPONENT ---

interface ThemeProviderProps {
  children: ReactNode;
  // Ініціалізаційні дані, завантажені в RootLayout
  initialThemeName: ThemeName;
  initialIsPremium: boolean; // ДОДАНО
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialThemeName,
  initialIsPremium // ВИКОРИСТАННЯ
}) => {
  // State to hold the theme name.
  const [themeName, setThemeName] = useState<ThemeName>(initialThemeName);

  // State to hold the full theme object, derived from themeName.
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => getThemeByName(initialThemeName));

  // State to track premium status.
  const [isUserPremium, setIsUserPremium] = useState(initialIsPremium); // ДОДАНО

  // Effect to handle external changes to initialThemeName/initialIsPremium
  useEffect(() => {
    // Sync state if props change (useful during initial load in RootLayout)
    const newTheme = getThemeByName(initialThemeName);
    setThemeName(newTheme.name);
    setCurrentTheme(newTheme);
    setIsUserPremium(initialIsPremium); // СИНХРОНІЗАЦІЯ
  }, [initialThemeName, initialIsPremium]); // ДОДАНО initialIsPremium як залежність


  // Function to change the theme and save it to storage.
  const setAppTheme = useCallback(async (newThemeName: ThemeName) => {
    const newTheme = getThemeByName(newThemeName);

    // 1. Update React State
    setThemeName(newTheme.name);
    setCurrentTheme(newTheme);

    // 2. Save to Storage 
    try {
      const appSettings = await storageService.getAppSettings();
      // Зберігаємо нову тему, зберігаючи поточний статус Premium
      await storageService.saveAppSettings({ ...appSettings, themeName: newTheme.name });
    } catch (e) {
      console.error("Error saving theme setting:", e);
    }
  }, []);

  // Function to set Premium status and save it to storage.
  const setUserPremiumStatus = useCallback(async (isPremium: boolean) => {
    // 1. Update React State
    setIsUserPremium(isPremium);

    // 2. Save to Storage
    try {
      const appSettings = await storageService.getAppSettings();
      // Зберігаємо новий статус Premium, зберігаючи поточну тему
      await storageService.saveAppSettings({ ...appSettings, isPremium: isPremium });
    } catch (e) {
      console.error("Error saving premium status:", e);
    }
  }, []); // ДОДАНО

  const contextValue: ThemeContextData = {
    currentTheme,
    setAppTheme,
    colors: currentTheme.colors,
    currentThemeName: themeName,
    isUserPremium, // ДОДАНО
    setUserPremiumStatus, // ДОДАНО
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};