import AsyncStorage from "@react-native-async-storage/async-storage";

// --- INTERFACES ---

import { DEFAULT_THEME, ThemeName } from "../constants/Colors";
import { Alert } from "react-native";
import { router } from "expo-router";
import { ROUTES } from "../constants/Routes";

/**
 * Defines the structure for user setup data. This data determines
 * if the user has completed the initial setup screen.
 */
export interface SetupData {
  // Time user starts being active (e.g., '07:00')
  activeStartTime: string;
  // Time user finishes being active (e.g., '23:00')
  activeEndTime: string;
  // Average cigarettes per day
  cigarettesPerDay: number;
  // Chosen quit strategy (e.g., 'balanced')
  planType: "slow" | "balanced" | "aggressive";
  // Date when the user started the plan (for calculating future intervals)
  startDate: string;

  packPrice: number;
  cigarettesPerPack: number;
}

/**
 * Defines the structure for a single smoking log entry.
 */
export interface SmokingLogEntry {
  timestamp: number; // Unix timestamp when the cigarette was smoked
}

/**
 * Defines the structure for application settings that don't reset.
 */
export interface AppSettings {
  isPremium: boolean;
  themeName: ThemeName;
}

// --- CONSTANTS ---

// Keys used in local storage (e.g., AsyncStorage)
const STORAGE_KEYS = {
  SETUP_DATA: "user_setup_data",
  APP_SETTINGS: "app_settings",
  LOGS: "smoking_logs",
};

/**
 * Array of all storage keys to be cleared during a data reset. (ДОДАНО)
 */
const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);

// --- HELPER FUNCTIONS ---

// Simplified wrappers for AsyncStorage (assuming it's available)
const getItem = async (key: string) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error(`Error getting item ${key}:`, e);
    return null;
  }
};

const setItem = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.error(`Error setting item ${key}:`, e);
  }
};

/**
 * Wipes all application data from AsyncStorage.
 * FIX: Uses multiRemove for targeted and more reliable key deletion. (ОНОВЛЕНО)
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(ALL_STORAGE_KEYS); // ВИКОРИСТОВУЄМО multiRemove
    console.log("Успішно очищено всі призначені для користувача дані.");
  } catch (e) {
    // Логуємо помилку, але дозволяємо процесу тривати, оскільки ключові дані видалено.
    console.error("Error clearing all data:", e);
  }
};

// --- SETUP DATA FUNCTIONS ---

/**
 * Retrieves user setup data.
 */
export const getSetupData = async (): Promise<SetupData | null> => {
  try {
    const jsonValue = await getItem(STORAGE_KEYS.SETUP_DATA);
    if (jsonValue != null) {
      return JSON.parse(jsonValue) as SetupData;
    }
  } catch (e) {
    console.error("Error loading setup data:", e);
  }
  return null;
};

/**
 * Saves user setup data.
 * @param data The setup data object to save.
 */
export const saveSetupData = async (data: SetupData): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(data);
    await setItem(STORAGE_KEYS.SETUP_DATA, jsonValue);
  } catch (e) {
    console.error("Error saving setup data:", e);
  }
};

// --- APP SETTINGS FUNCTIONS ---

/**
 * Retrieves application settings.
 */
export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const jsonValue = await getItem(STORAGE_KEYS.APP_SETTINGS);
    if (jsonValue != null) {
      return JSON.parse(jsonValue) as AppSettings;
    }
  } catch (e) {
    console.error("Error loading app settings:", e);
  }
  // Default settings if none found or error occurred
  return { isPremium: false, themeName: DEFAULT_THEME };
};

/**
 * Saves application settings.
 * @param settings The settings object to save.
 */
export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(settings);
    await setItem(STORAGE_KEYS.APP_SETTINGS, jsonValue);
  } catch (e) {
    console.error("Error saving app settings:", e);
  }
};

// --- LOGGING FUNCTIONS (Minimal for MVP) ---

/**
 * Logs a new cigarette entry.
 * NOTE: This implementation is basic and should be optimized in a production app.
 * @param entry The log entry to save.
 */
export const addSmokingLog = async (entry: SmokingLogEntry): Promise<void> => {
  try {
    const logs = await getSmokingLogs();
    logs.push(entry);
    await setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error("Error adding smoking log:", e);
  }
};

/**
 * Retrieves all smoking log entries.
 */
export const getSmokingLogs = async (): Promise<SmokingLogEntry[]> => {
  try {
    const jsonValue = await getItem(STORAGE_KEYS.LOGS);
    if (jsonValue != null) {
      return JSON.parse(jsonValue) as SmokingLogEntry[];
    }
  } catch (e) {
    console.error("Error loading smoking logs:", e);
  }
  return [];
};

export     const handleResetData = () => {
        Alert.alert(
            "Скинути Всі Дані",
            "Ви впевнені, що хочете скинути всі ваші дані? Цю дію не можна скасувати.",
            [
                { text: "Скасувати", style: "cancel" },
                { 
                    text: "Скинути", 
                    style: "destructive", 
                    onPress: async () => {
                        await clearAllData();
                        router.replace(ROUTES.SETUP); 
                    } 
                },
            ],
            { cancelable: true }
        );
    };
