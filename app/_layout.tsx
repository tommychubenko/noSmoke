import { AppColors, ThemeName, DEFAULT_THEME } from "@/src/constants/Colors"; 
import { ROUTES } from "@/src/constants/Routes";
// Додаємо імпорт storageService, оскільки він використовується в useEffect
import * as storageService from "@/src/services/storageService";
import { SetupData } from "@/src/services/storageService";
import { Stack, router, usePathname } from "expo-router"; // <-- ДОДАНО usePathname
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { ThemeProvider } from "../src/context/ThemeContext";
import { StatusBar } from "expo-status-bar"; // Компонент для керування статус-баром
import { useTheme } from "@/src/hooks/useTheme"; // Ваш хук для отримання поточної теми
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { AppTheme, getThemeByName } from "@/src/constants/Themes"; 


// --- ДОПОМІЖНІ КОМПОНЕНТИ ---

/**
 * Custom component to manage the StatusBar style based on the current theme.
 * Must be rendered inside ThemeProvider.
 */
const ThemeStatusBar: React.FC = () => {
    const { currentTheme } = useTheme();

    const isDark = currentTheme.isDark;
    
    // Визначаємо стиль статус-бару: 'light' для темних тем, 'dark' для світлих
    const statusBarStyle = isDark ? 'light' : 'dark';

    // На Android явно встановлюємо колір фону статус-бару
    const backgroundColor = currentTheme.colors.backgroundPrimary;

    return (
        // Встановлюємо стиль статус-бару
        <StatusBar 
            style={statusBarStyle} 
            backgroundColor={Platform.OS === 'android' ? backgroundColor : 'transparent'} 
            animated={true}
        />
    );
};


// --- ІНТЕРФЕЙСИ ---

/**
 * Defines the state for application initialization.
 */
interface InitializationState {
  // Якщо процес завантаження даних завершено.
  isReady: boolean;
  // Дані налаштування користувача. Null означає, що налаштування не завершено.
  setupData: storageService.SetupData | null;
  // Збережена назва теми зі сховища.
  savedThemeName: ThemeName; 
  // Збережений статус Premium зі сховища.
  savedIsPremium: boolean;
}

// --- КОМПОНЕНТ КОРЕНЕВОГО МАКЕТА ---

/**
 * The Root Layout component handles initial data loading,
 * authentication, and sets up the global theme provider and navigation.
 */
const RootLayout = () => {
  // 1. Стан ініціалізації
  const [initialization, setInitialization] = useState<InitializationState>({
    isReady: false,
    setupData: null,
    // Використовуємо DEFAULT_THEME, який є типом ThemeName
    savedThemeName: DEFAULT_THEME, 
    savedIsPremium: false,
  });
  
  // Отримуємо поточний шлях за допомогою хука usePathname()
  const currentPathname = usePathname(); // <-- ВИКЛИК НОВОГО ХУКА

  // --- ЕФЕКТ 1: Первинне завантаження даних та навігація (Запускається 1 раз) ---
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [setupData, appSettings] = await Promise.all([
          storageService.getSetupData(),
          storageService.getAppSettings(),
        ]);

        // Оновлюємо стан і позначаємо, що готово
        setInitialization({
          isReady: true,
          setupData: setupData,
          savedThemeName: appSettings.themeName,
          savedIsPremium: appSettings.isPremium,
        });

        // ПЕРВИННЕ ПЕРЕНАПРАВЛЕННЯ
        if (setupData) {
          router.replace(ROUTES.TABS_GROUP);
        } else {
          router.replace(ROUTES.SETUP);
        }

      } catch (e) {
        console.error("Initialization failed:", e);
        // Якщо помилка, все одно позначаємо, що готово, щоб уникнути зациклення завантаження
        setInitialization(prev => ({ ...prev, isReady: true }));
        router.replace(ROUTES.SETUP); // У випадку помилки переходимо на екран налаштування
      }
    };

    loadInitialData();
  }, []); // Пустий масив залежностей: запускається лише при монтуванні

  // --- ЕФЕКТ 2: Слухач змін SetupData (Запускається, коли isReady = true) ---
  useEffect(() => {
    // Активація лише після завершення первинного завантаження
    if (!initialization.isReady) return;

    const unsubscribe = storageService.onSetupDataChange((data) => {
      
        // 1. Оновлюємо setupData у стані (важливо для відображення UI та інших компонентів)
        setInitialization(prev => ({ ...prev, setupData: data }));

        // 2. ЛОГІКА ДИНАМІЧНОЇ НАВІГАЦІЇ
        // Використовуємо currentPathname замість router.pathname
        if (data && currentPathname === ROUTES.SETUP) { // <-- ВИПРАВЛЕНО
            // Налаштування було щойно завершено. Переходимо до вкладок.
            console.log("[Setup] Setup complete. Navigating to tabs.");
            router.replace(ROUTES.TABS_GROUP);
        } else if (!data && currentPathname !== ROUTES.SETUP) { // <-- ВИПРАВЛЕНО
            // Дані налаштування були видалені (наприклад, через скидання). Переходимо до налаштування.
            console.log("[Setup] Setup data cleared. Navigating to setup.");
            router.replace(ROUTES.SETUP);
        }
    });

    // Очищення слухача при демонтажі компонента або зміні залежностей
    return () => unsubscribe();
    // Додаємо currentPathname в залежності, щоб useEffect бачив його зміни
  }, [initialization.isReady, currentPathname]); // <-- ДОДАНО currentPathname

  // 4. Екран завантаження
  if (!initialization.isReady) {
    // Використовуємо Theme3 для завантаження, оскільки тема ще не застосована
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AppColors.Theme3.backgroundPrimary }}>
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


  // 5. Основна структура додатку, обгорнута в ThemeProvider
  return (
    // ThemeProvider має бути ініціалізований зі збереженими налаштуваннями
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
              gestureEnabled: true, // Дозволяємо жести закриття на iOS
            }}
          />
        </Stack>
    </ThemeProvider>
  );
};

export default RootLayout;