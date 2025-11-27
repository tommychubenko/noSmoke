import { AppColors, ThemeName, DEFAULT_THEME } from "@/src/constants/Colors";
import { ROUTES } from "@/src/constants/Routes";
import * as storageService from "@/src/services/storageService";
import { Stack, router, } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View, StyleSheet } from "react-native";
import { ThemeProvider } from "../src/context/ThemeContext";
import { RevenueCatProvider } from "../src/context/RevenueCatContext"; // 🟢 ІМПОРТ REVENUECAT
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/src/hooks/useTheme";

import { Tabs } from 'expo-router';



// --- ІНТЕРФЕЙСИ ТА СТРУКТУРИ ---

interface InitializationResult {
  isLoaded: boolean;
  hasSetupData: boolean;
  savedThemeName: ThemeName;
  savedIsPremium: boolean;
}

// --- ДОПОМІЖНІ КОМПОНЕНТИ ---

/**
 * Custom component to manage the StatusBar style based on the current theme.
 * Must be rendered inside ThemeProvider.
 */
const ThemeStatusBar: React.FC = () => {
  const { currentTheme } = useTheme();

  const isDark = currentTheme.isDark;

  // Визначаємо стиль статус-бару: 'light' для темних тем, 'dark' для світлих
  return (
    <StatusBar
      style={isDark ? 'light' : 'dark'}
      backgroundColor={currentTheme.colors.backgroundPrimary}
    />
  );
};

// Компонент-заглушка для відображення під час завантаження
const LoadingScreen: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundPrimary }]}>
      <ActivityIndicator size="large" color={colors.accentPrimary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 10 }]}>Loading...</Text>
    </View>
  );
};


// --- HOOK FOR ASYNC INITIALIZATION ---

const initialResult: InitializationResult = {
  isLoaded: false,
  hasSetupData: false,
  savedThemeName: DEFAULT_THEME,
  savedIsPremium: false,
};

/**
 * Хук для асинхронного завантаження початкових налаштувань додатку.
 * Визначає, чи потрібне початкове налаштування (Setup) чи можна перейти до вкладок.
 */
const useSetupInitialization = () => {
  const [initialization, setInitialization] = useState<InitializationResult>(initialResult);
  const [isLoading, setIsLoading] = useState(true);

  // 1. АСИНХРОННЕ ЗАВАНТАЖЕННЯ ДАНИХ (Виконується лише один раз)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const setupData = await storageService.getSetupData();
        const appSettings = await storageService.getAppSettings();

        // Оновлюємо стан ініціалізації
        setInitialization({
          isLoaded: true,
          hasSetupData: setupData !== null,
          savedThemeName: appSettings.themeName,
          savedIsPremium: appSettings.isPremium,
        });

      } catch (e) {
        console.error("Initialization error:", e);
        // У разі помилки все одно дозволяємо навігацію (наприклад, на setup)
        setInitialization(s => ({ ...s, isLoaded: true }));
      } finally {
        // Завершуємо завантаження
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 2. ЛОГІКА НАВІГАЦІЇ (Виконується лише після завершення завантаження)
  useEffect(() => {
    // 🟢 ВИПРАВЛЕННЯ: Навігація відбувається, коли isLoading = false
    if (!isLoading && initialization.isLoaded) {
      if (!initialization.hasSetupData) {
        console.log("Navigating to setup...");
        router.replace(ROUTES.SETUP);
      } else {
        console.log("Navigating to tabs...");
        router.replace(ROUTES.TABS_GROUP);
      }
    }
  }, [isLoading, initialization.isLoaded, initialization.hasSetupData]);


  return { initialization, isLoading };
};

// --- КОРЕНЕВИЙ ЛЕЙАУТ ---

const RootLayout = () => {
  const { initialization, isLoading } = useSetupInitialization();

  if (isLoading) {
    // Відображаємо екран завантаження, поки дані не завантажаться
    // та роутер не визначиться з маршрутом
    return (
      <ThemeProvider
        // Використовуємо дефолтну тему для екрану завантаження
        initialThemeName={DEFAULT_THEME}
        initialIsPremium={false}
      >
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  // Після завершення ініціалізації RootLayout відображає Stack,
  // який перенаправить на SETUP або (TABS)
  return (
    // 🟢 ОБГОРТАЄМО ThemeProvider у RevenueCatProvider
    <RevenueCatProvider>
      <ThemeProvider
        // Тепер savedThemeName гарантовано має тип ThemeName
        initialThemeName={initialization.savedThemeName}
        initialIsPremium={initialization.savedIsPremium}
      >
        {/* Статус-бар має бути всередині ThemeProvider */}
        <ThemeStatusBar />

        <Stack
          screenOptions={{
            headerShown: false, // Приховуємо заголовок за замовчуванням
          }}
        >
          {/* Екран 'setup' повинен бути доступний поза групою вкладок */}
          <Stack.Screen
            name="setup"
            options={{ animation: "slide_from_bottom" }}
          />

          {/* Група '(tabs)' містить основну навігацію (Home, Stats, Settings) */}
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />

          {/* Спеціальні модальні екрани */}
          <Stack.Screen
            name="premium-modal"
            options={{
              title: "Отримати Premium",
              // Ця опція примусово використовує модальний стиль презентації для iOS
              presentation: Platform.OS === 'ios' ? 'modal' : 'card',
              headerShown: false, // Приховуємо header для модального вікна
              gestureEnabled: true, // Дозволяємо жести
              // Немає потреби в router.back(), оскільки модальне вікно закривається внутрішньо
            }}
          />
        </Stack>
      </ThemeProvider>
    </RevenueCatProvider>
  );
};

export default RootLayout;

// --- СТИЛІ ---

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  }
});