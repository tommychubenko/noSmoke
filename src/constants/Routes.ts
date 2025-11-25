// --- INTERFACES ---

/**
 * Defines the names and paths for all primary routes in the application.
 * This ensures type safety when navigating with expo-router.
 */
export interface AppRoutes {
  // Routes without tabs (used primarily for setup/auth flow)
  SETUP: '/setup';
  // Tab-based routes (accessible via the bottom navigation bar)
  TABS_GROUP: '/(tabs)'; // ДОДАНО: Шлях до групи вкладок
  HOME_TAB: '/';
  STATS_TAB: '../stats';
  SETTINGS_TAB: '../settings';
  // Routes for modal or dedicated pages (e.g., Premium purchase screen)
  PREMIUM_MODAL: '../premium-modal';
}

// --- CONSTANTS ---

/**
 * Centralized constant for all application routes.
 */
export const ROUTES: AppRoutes = {
  SETUP: '/setup',
  TABS_GROUP: '/(tabs)', // ДОДАНО: Використовується для переходу до головного Tab Navigator
  HOME_TAB: '/',
  STATS_TAB: '../stats',
  SETTINGS_TAB: '../settings',
  PREMIUM_MODAL: '../premium-modal',
};