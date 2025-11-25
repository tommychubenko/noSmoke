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
  isUserPremium: boolean; 
  /** Function to manually set the Premium status. ВИКОРИСТОВУЄТЬСЯ ЛИШЕ RC */
  setUserPremiumStatus: (isPremium: boolean) => void; // ЗМІНА: Прибрано Promise<void>
}

// --- INITIAL STATE ---\r\n\r\n// Get the default theme colors and structure
const initialTheme = getThemeByName(DEFAULT_THEME);

// Default context value before any state is set
const defaultContextValue: ThemeContextData = {
  currentTheme: initialTheme,
  setAppTheme: () => { }, // Placeholder function
  colors: initialTheme.colors,
  currentThemeName: DEFAULT_THEME,
  isUserPremium: false, 
  setUserPremiumStatus: () => {}, 
};

// --- СТВОРЕННЯ КОНТЕКСТУ ---
export const ThemeContext = createContext<ThemeContextData | undefined>(defaultContextValue);


// --- КОМПОНЕНТ ПРОВАЙДЕРА ---

/**
 * Defines the props for ThemeProvider.
 */
interface ThemeProviderProps {
  children: ReactNode;
  /** Initial theme name loaded from storage. */
  initialThemeName: ThemeName;
  /** Initial Premium status loaded from storage or set by RC. */
  initialIsPremium: boolean; // Оновлено
}

/**
 * Provides the current theme, colors, and the function to change the theme
 * to the entire application using React Context.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialThemeName, 
  initialIsPremium 
}) => {
  // --- STATE ---
  const [themeName, setThemeName] = useState<ThemeName>(initialThemeName);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getThemeByName(initialThemeName));
  const [isUserPremium, setIsUserPremium] = useState<boolean>(initialIsPremium); // Оновлено

  // --- ЛОГІКА ---

  // Function to set the new theme and save it to storage.
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

  // Function to set Premium status. ВИКЛИКАЄТЬСЯ ТІЛЬКИ З RevenueCatContext.
  const setUserPremiumStatus = useCallback((isPremium: boolean) => {
    // 1. Update React State
    setIsUserPremium(isPremium);

    // 2. ЗБЕРЕЖЕННЯ В СХОВИЩЕ:
    // Хоча RevenueCat є джерелом правди, ми зберігаємо статус локально,
    // щоб запобігти короткочасному мерехтінню "не-преміум" при старті
    // до моменту, поки RevenueCat не завантажить дані.
    try {
      storageService.saveAppSettings({ themeName, isPremium });
    } catch (e) {
      console.error("Error saving premium status (RC update):", e);
    }
  }, [themeName]); // ВИПРАВЛЕНО: залежить від themeName для коректного збереження

  // --- КОНТЕКСТ ---

  const contextValue: ThemeContextData = {
    currentTheme,
    setAppTheme,
    colors: currentTheme.colors,
    currentThemeName: themeName,
    isUserPremium, // ВЖЕ ОНОВЛЕНО ЧЕРЕЗ setIsUserPremium або initialIsPremium
    setUserPremiumStatus, 
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};