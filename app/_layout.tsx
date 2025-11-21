import { AppColors, ThemeName } from "@/src/constants/Colors";
import { ROUTES } from "@/src/constants/Routes";
// Додаємо імпорт storageService, оскільки він використовується в useEffect
import * as storageService from "@/src/services/storageService";
import { SetupData } from "@/src/services/storageService";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ThemeProvider } from "../src/context/ThemeContext";

// --- ІНТЕРФЕЙСИ ---

/**
 * Defines the state for application initialization.
 */
interface InitializationState {
  // Якщо процес завантаження даних завершено.
  isReady: boolean;
  // Дані налаштування користувача. Null означає, що налаштування не завершено.
  setupData: SetupData | null;
  // Збережена назва теми зі сховища.
  savedThemeName: ThemeName;
  // Збережений статус Premium зі сховища. (ДОДАНО)
  savedIsPremium: boolean;
}

// --- КОМПОНЕНТ КОРЕНЕВОГО МАКЕТА ---

/**
 * The Root Layout component handles app initialization, theme context provision,
 * and conditional routing based on whether the initial setup is complete.
 */
const RootLayout = () => {
  const [initialization, setInitialization] = useState<InitializationState>({
    isReady: false,
    setupData: null,
    // Використовуємо тему за замовчуванням, доки не завантажимо збережену
    savedThemeName: AppColors.Theme3.name as ThemeName,
    savedIsPremium: false, // Ініціалізуємо статус Premium як false
  });

  // 1. Логіка ініціалізації: Завантаження даних налаштування та теми
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Завантажуємо всі необхідні початкові дані одночасно
        const [setup, settings] = await Promise.all([
          storageService.getSetupData(),
          storageService.getAppSettings(),
        ]);

        setInitialization({
          isReady: true,
          setupData: setup,
          savedThemeName: settings.themeName,
          savedIsPremium: settings.isPremium, // Зберігаємо статус Premium
        });
      } catch (e) {
        console.error("Помилка ініціалізації:", e);
        // Все одно встановлюємо isReady в true, щоб дозволити навігацію
        setInitialization((prev) => ({ ...prev, isReady: true }));
      }
    };
    initializeApp();
  }, []); // Запускаємо лише один раз при монтуванні

  // 2. Логіка умовної маршрутизації
  useEffect(() => {
    if (initialization.isReady) {
      if (!initialization.setupData) {
        // Якщо немає даних налаштування, переходимо до екрана налаштування
        router.replace(ROUTES.SETUP);
      } else {
        // В іншому випадку, переходимо до головного екрана вкладок
        // ВИПРАВЛЕННЯ: Використовуємо кореневий шлях '/', який тепер відповідає HOME_TAB
        router.replace(ROUTES.HOME_TAB);
      }
    }
  }, [initialization.isReady, initialization.setupData]);

  // 3. Екран завантаження
  if (!initialization.isReady) {
    // Показуємо простий індикатор завантаження, поки чекаємо на дані сховища
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: AppColors.Theme3.backgroundPrimary,
        }}
      >
        <ActivityIndicator
          size="large"
          color={AppColors.Theme3.accentPrimary}
        />
        <Text style={{ marginTop: 10, color: AppColors.Theme3.textPrimary }}>
          Завантаження додатку...
        </Text>
      </View>
    );
  }

  // 4. Основна структура додатку, обгорнута в ThemeProvider
  return (
    // ThemeProvider має бути ініціалізований зі збереженими налаштуваннями
    <ThemeProvider 
        initialThemeName={initialization.savedThemeName}
        initialIsPremium={initialization.savedIsPremium} // ПЕРЕДАЄМО НОВИЙ ПРОПС
    >
      <Stack
        screenOptions={{
          headerShown: false, // Приховуємо заголовок за замовчуванням
          statusBarTranslucent: false,
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
          options={{ presentation: "modal", title: "Отримати Premium" }}
        />
      </Stack>
    </ThemeProvider>
  );
};

export default RootLayout;