// --- INTERFACES ---

/**
 * Визначає повний набір кольорів, необхідних для теми додатку.
 * Ці кольори динамічно змінюватимуться залежно від вибору користувача.
 */
export interface ColorSet {
  // Основний колір фону. Може бути використаний як один з кольорів градієнта.
  backgroundPrimary: string;
  // Вторинний колір фону (наприклад, для карток, полів введення або кінця градієнта).
  backgroundSecondary: string;
  // Колір для основного тексту, заголовків та цифр таймера.
  textPrimary: string;
  // Колір для другорядного тексту, описів, підказок.
  textSecondary: string;
  // Основний акцентний колір (наприклад, для кнопки "Палив(ла)" або вибраних елементів).
  accentPrimary: string;
  // Вторинний акцентний колір (наприклад, для прогресу таймера або іконок).
  accentSecondary: string;
  // Колір для роздільників, фону рекламного банера або неактивних елементів.
  separator: string;
}

// --- DEFAULT COLORS (Для статичних елементів) ---

/**
 * Статичні кольори, які не залежать від вибраної користувачем теми
 * (наприклад, для повідомлень про помилки, успіху).
 */
export const DefaultColors = {
  white: '#FFFFFF',
  black: '#000000',
  success: '#4CAF50', // ВИПРАВЛЕННЯ: Додано статичний колір успіху
  error: '#F44336',   // ВИПРАВЛЕННЯ: Додано статичний колір помилки
  warning: '#FF9800',
};

// --- THEME NAMES ---

// Усі доступні назви тем
export type ThemeName = 'Theme1' | 'Theme2' | 'Theme3' | 'Theme4' | 'Theme5' | 'Theme6';
export const DEFAULT_THEME: ThemeName = 'Theme3'; // Темна тема за замовчуванням

// --- APP COLORS ---

/**
 * Головний об'єкт, який містить усі визначені палітри кольорів та статичні кольори.
 */
export const AppColors = {
  // Статичні кольори (для легшого доступу)
  DefaultColors: DefaultColors, // ВИПРАВЛЕННЯ: Додаємо DefaultColors сюди

  // Палітра 1: "М'який Сутінок" (Soft Twilight) - Світла тема
  Theme1: {
    name: 'Theme1',
    backgroundPrimary: '#FAFAFA', // Дуже світло-сірий
    backgroundSecondary: '#FFFFFF', // Білий
    textPrimary: '#1E293B', // Темно-синій
    textSecondary: '#64748B', // Середньо-сірий
    accentPrimary: '#F97316', // Яскраво-помаранчевий
    accentSecondary: '#FDBA74', // Світло-помаранчевий
    separator: '#E2E8F0',
  },

  // Палітра 2: "Морська Свіжість" (Sea Freshness) - Світла/Денна тема
  Theme2: {
    name: 'Theme2',
    backgroundPrimary: '#E0F7FA', // Дуже світло-блакитний
    backgroundSecondary: '#FFFFFF',
    textPrimary: '#004D40', // Темно-зелений/бірюзовий
    textSecondary: '#4DB6AC', // Середній бірюзовий
    accentPrimary: '#00BCD4', // Яскравий блакитний
    accentSecondary: '#80DEEA',
    separator: '#B2EBF2',
  },

  // Палітра 3: "Ранковий Туман" (Morning Fog) - Темна тема за замовчуванням
  Theme3: {
    name: 'Theme3',
    backgroundPrimary: '#1F2937', // Темно-сірий/сланцевий
    backgroundSecondary: '#374151', // Трохи світліший сірий
    textPrimary: '#F9FAFB', // Білий/дуже світлий
    textSecondary: '#9CA3AF', // Світло-сірий
    accentPrimary: '#10B981', // Яскравий зелений (Тріумф)
    accentSecondary: '#6EE7B7', // Блідо-зелений
    separator: '#4B5563',
  },

  // Палітра 4: "Піщаний Горизонт" (Sandy Horizon)
  Theme4: {
    name: 'Theme4',
    backgroundPrimary: '#F5F5DC', // Бежевий/Крем
    backgroundSecondary: '#EFEAE0',
    textPrimary: '#4B3F3A', // Темно-коричневий
    textSecondary: '#8B8378', // Taupe
    accentPrimary: '#D4AF37', // Золотий/Гірчичний
    accentSecondary: '#A0522D', // Сієна
    separator: '#C8C4B5',
  },

  // Палітра 5: "Нічний Мінімалізм" (Night Minimalism)
  Theme5: {
    name: 'Theme5',
    backgroundPrimary: '#1A1A1A', // Глибокий чорний
    backgroundSecondary: '#2C2C2C', // Темно-сірий
    textPrimary: '#F0F0F0', // Світлий текст
    textSecondary: '#B0B0B0',
    accentPrimary: '#00CC99', // Яскраво-зелений
    accentSecondary: '#8A2BE2', // Синьо-фіолетовий
    separator: '#404040',
  },

  // Палітра 6: "Тропічний Захід" (Tropical Sunset)
  Theme6: {
    name: 'Theme6',
    backgroundPrimary: '#F7FFF7', // Дуже світло-зелений
    backgroundSecondary: '#E0EAE0',
    textPrimary: '#4B0082', // Індіго
    textSecondary: '#8A2BE2', // Синьо-фіолетовий
    accentPrimary: '#FF6347', // Томат
    accentSecondary: '#FFD700', // Золотий
    separator: '#B8C3C8',
  },
};