import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Purchases, {
    LOG_LEVEL,
    PurchasesPackage,
    CustomerInfo,
    PurchasesOfferings,
    PURCHASES_ERROR_CODE,
    PurchasesError
} from 'react-native-purchases';
import { Platform, Alert, LogBox } from 'react-native';
import { useTheme } from '../hooks/useTheme';

// 🛑 АГРЕСИВНИЙ ФІКС ДЛЯ LogBox:
LogBox.ignoreLogs([
    'Error fetching offerings',
    'PurchaseCancelledError',
    '[RevenueCat] 🤖‼️',
    'PurchasesError(code=PurchaseCancelledError',
    'User cancelled',
]);

// --- КОНСТАНТИ ---
const REVENUECAT_API_KEY = Platform.select({
    ios: 'test_fsxTUrPVJaBBwQNyJMhQgafpwRt',
    android: 'goog_AbOlDjaKPZACwHsMRryqWdpAQiI',
    default: 'goog_AbOlDjaKPZACwHsMRryqWdpAQiI',
});
const PRO_ENTITLEMENT_ID = 'tracker_premium_access';

// --- ІНТЕРФЕЙСИ ---\

interface RevenueCatContextData {
    isRcReady: boolean;
    offerings: PurchasesOfferings | null;
    customerInfo: CustomerInfo | null;
    isLoading: boolean;
    handlePurchase: (pkg: PurchasesPackage) => Promise<boolean>;
    restorePurchases: () => Promise<boolean>;
    
    // 🟢 ВИПРАВЛЕННЯ: Змінюємо тип повернення на Promise<CustomerInfo | null>
    loadCustomerData: () => Promise<CustomerInfo | null>; 
}

const RevenueCatContext = createContext<RevenueCatContextData | undefined>(undefined);

// --- HOOK ---\

export const useRevenueCat = () => {
    const context = useContext(RevenueCatContext);
    if (context === undefined) {
        throw new Error('useRevenueCat must be used within a RevenueCatProvider');
    }
    return context;
};

// --- PROVIDER ---\

export interface RevenueCatProviderProps {
    children: ReactNode;
}

export const RevenueCatProvider: React.FC<RevenueCatProviderProps> = ({ children }) => {
    const { setUserPremiumStatus } = useTheme();

    const [isRcReady, setIsRcReady] = useState(false);
    const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // --- ЛОГІКА ПЕРЕВІРКИ ПРАВ ---\

    const checkEntitlements = useCallback((info: CustomerInfo): boolean => {
        // Перевіряємо, чи є активне право з ID 'tracker_premium_access'
        const isPremium = info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
        // Оновлюємо статус в глобальному контексті теми/додатку
        setUserPremiumStatus(isPremium);
        return isPremium;
    }, [setUserPremiumStatus]);

    // --- ЗВАНТАЖЕННЯ ДАНИХ (Offerings & CustomerInfo) ---\

    // 🟢 loadCustomerData: Використовується для первинного завантаження та примусового оновлення
    const loadCustomerData = useCallback(async (): Promise<CustomerInfo | null> => { // 💡 Додано явний тип повернення тут
        console.log("[RevenueCat] Loading customer data...");
        setIsLoading(true);
        try {
            // Отримуємо info
            const info = await Purchases.getCustomerInfo();
            setCustomerInfo(info);
            checkEntitlements(info);

            // Отримуємо offerings
            const offerings = await Purchases.getOfferings();
            setOfferings(offerings);

            setIsRcReady(true);
            console.log("[RevenueCat] SDK initialized and ready.");
            
            // 🟢 ВИПРАВЛЕННЯ: Повертаємо об'єкт CustomerInfo
            return info; 
            
        } catch (e) {
            const error = e as PurchasesError;
            // let resultInfo = null; // Цей рядок можна видалити

            // 🛑 Обробляємо очікувані помилки
            if (
                error.code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR ||
                error.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR ||
                error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
            ) {
                // Тихе попередження в консоль
                console.warn(`[RevenueCat] Expected error/cancellation: ${error.code}.`);
                if(error.code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
                    setOfferings(null);
                    setIsRcReady(true);
                }
            } else {
                // Це реальна помилка (наприклад, мережева)
                console.error("[RevenueCat] Initial load error (non-expected):", e);
                Alert.alert("Error", "Failed to load subscription data. Please check your connection.");
            }
            
            // 🟢 ПОВЕРТАЄМО null при помилці
            return null;
            
        } finally {
            setIsLoading(false);
        }
    }, [checkEntitlements]);


    // --- ЛОГІКА ПОКУПКИ ---\

    const handlePurchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
        setIsLoading(true);
        try {
            console.log(`[RevenueCat] Attempting to purchase: ${pkg.identifier}`);
            const { customerInfo } = await Purchases.purchasePackage(pkg);

            const isEntitled = checkEntitlements(customerInfo);

            if (isEntitled) {
                Alert.alert("Success!", "Thank you for purchasing Premium!");
            }
            return isEntitled;
        } catch (e) {
            const error = e as PurchasesError;
            // Повністю ігноруємо помилку скасування
            if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
                 // No op - LogBox приховає системний тост завдяки фільтру '[RevenueCat] 🤖‼️'
            } else {
                Alert.alert("Purchase Error", "Could not complete the purchase. Please try again later.");
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [checkEntitlements]);

    // --- ЛОГІКА ВІДНОВЛЕННЯ ---\

    const restorePurchases = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            console.log("[RevenueCat] Restoring purchases...");
            const customerInfo = await Purchases.restorePurchases();

            const isEntitled = checkEntitlements(customerInfo);

            if (!isEntitled) {
                Alert.alert("Information", "No active purchases found to restore.");
            } else {
                Alert.alert("Success!", "Your purchases have been successfully restored.");
            }

            return isEntitled;
        } catch (e) {
            const error = e as PurchasesError;
            
            // 🛑 ТИХА ОБРОБКА ПОМИЛКИ СКАСУВАННЯ
            if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
                // Мовчки виходимо. Фільтр LogBox '[RevenueCat] 🤖‼️' має перехопити автоматичний лог SDK.
            } else {
                console.error("[RevenueCat] Restore purchases error (unhandled):", e);
                Alert.alert("Restore Error", "Failed to restore purchases. Please check your network connection.");
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [checkEntitlements]);


    // --- ІНІЦІАЛІЗАЦІЯ SDK ---
    useEffect(() => {
        Purchases.setLogLevel(LOG_LEVEL.ERROR);
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });

        const customerInfoListener = Purchases.addCustomerInfoUpdateListener((info) => {
            setCustomerInfo(info);
            checkEntitlements(info);
        }) as unknown as (() => void);

        loadCustomerData();

        return () => {
            customerInfoListener();
        };
    }, [loadCustomerData, checkEntitlements]);


    // 🟢 ФІКС: loadCustomerData тепер правильно типізовано
    const contextValue: RevenueCatContextData = {
        isRcReady,
        offerings,
        customerInfo,
        isLoading,
        handlePurchase,
        restorePurchases,
        loadCustomerData,
    };

    return (
        <RevenueCatContext.Provider value={contextValue}>
            {children}
        </RevenueCatContext.Provider>
    );
};

export { PurchasesPackage };