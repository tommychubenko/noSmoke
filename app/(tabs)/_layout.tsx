import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import MobileAds  from 'react-native-google-mobile-ads';


/**
 * Цей файл налаштовує нижню панель навігації (Tabs) для основних екранів додатка.
 * * ВАЖЛИВО: Назви 'index', 'stats' та 'settings' посилаються на файли:
 * - app/index.tsx (Головна)
 * - app/stats.tsx (Статистика)
 * - app/settings.tsx (Налаштування)
 * * Вони знаходяться у корені 'app/', а не у вкладеній теці, що є нестандартним способом 
 * використання групи (tabs), але це дозволить негайно запустити ваш додаток.
 */
const TabsLayout = () => {
  const { colors } = useTheme();

  MobileAds().initialize()

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false, // Приховуємо заголовок на всіх екранах вкладок
        tabBarActiveTintColor: colors.accentPrimary, // Активний колір вкладки
        tabBarInactiveTintColor: colors.textSecondary, // Неактивний колір вкладки
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary, // Колір фону панелі
          borderTopColor: colors.separator, // Колір розділювача
          height: 90, 
          paddingTop: 10,
          paddingBottom: 25, 
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. Вкладка: Головна (Таймер) -> посилається на app/index.tsx */}
      <Tabs.Screen
        name="index" 
        options={{
          title: 'Головна',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="timer-sand" size={size} color={color} />
          ),
        }}
      />

      {/* 2. Вкладка: Статистика -> посилається на app/stats.tsx */}
      <Tabs.Screen
        name="stats" 
        options={{
          title: 'Статистика',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
          ),
        }}
      />

      {/* 3. Вкладка: Налаштування -> посилається на app/settings.tsx */}
      <Tabs.Screen
        name="settings" 
        options={{
          title: 'Налаштування',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
      
      {/* ДОДАТКОВЕ ВИПРАВЛЕННЯ: 
        Потрібно приховати екран налаштувань (setup), оскільки він є 
        частиною кореневої навігації, але не має відображатися у вкладках.
      */}
      {/* <Tabs.Screen 
        name="setup" 
        options={{ 
          href: null, // Приховати з нижньої панелі 
          title: 'Налаштування' // Для коректності, якщо його викликано окремо
        }} 
      /> */}
    </Tabs>
    {/* <BannerAd unitId={TestIds.BANNER}
    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    requestOptions={{requestNonPersonalizedAdsOnly: true, networkExtras: {collapsible: "bottom"}}}
    />  */}

    </>
    
  );
};

export default TabsLayout;