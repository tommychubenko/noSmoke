import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Purchases, {
    LOG_LEVEL,
    PurchasesPackage,
    CustomerInfo, 
    PurchasesOfferings, // 🟢 ВИПРАВЛЕНО: Коректний тип для Offerings
    PURCHASES_ERROR_CODE,
    PurchasesError 
} from 'react-native-purchases';
import { Platform, Alert } from 'react-native';

import { useTheme } from '../hooks/useTheme'; 

// --- КОНСТАНТИ ---\
// ⚠️ ЗАМІНІТЬ ЦЕЙ КЛЮЧ НА ВАШ ПРОДАКШН-КЛЮЧ ПЕРЕД РЕЛІЗОМ
const REVENUECAT_API_KEY = Platform.select({
    // Тимчасово залишаємо Ваш ТЕСТОВИЙ ключ для iOS,
    // оскільки у Вас ще немає appl_ production-ключа.
    ios: 'test_fsxTUrPVJaBBwQNyJMhQgafpwRt', 
    
    // 🟢 ВСТАВТЕ СЮДИ ВАШ РЕАЛЬНИЙ КЛЮЧ 'goog_' для продакшну на Android.
    android: 'goog_AbOlDjaKPZACwHsMRryqWdpAQiI', 
    
    // Якщо не визначено (наприклад, web), використовуємо Android-ключ
    default: 'goog_AbOlDjaKPZACwHsMRryqWdpAQiI', 
});
// Ідентифікатор права, яке надає Premium-доступ
const PRO_ENTITLEMENT_ID = 'tracker_premium_access';

// --- ІНТЕРФЕЙСИ ---\

interface RevenueCatContextData {
    isRcReady: boolean;
    offerings: PurchasesOfferings | null; 
    customerInfo: CustomerInfo | null;
    isLoading: boolean;
    handlePurchase: (pkg: PurchasesPackage) => Promise<boolean>; // 🟢 ВИПРАВЛЕНО: Повертає Promise<boolean>
    restorePurchases: () => Promise<boolean>; // 🟢 ВИПРАВЛЕНО: Повертає Promise<boolean>
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
    // setUserPremiumStatus беремо з ThemeContext
    const { setUserPremiumStatus } = useTheme(); 

    const [isRcReady, setIsRcReady] = useState(false);
    const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null); 
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // --- ЛОГІКА ПЕРЕВІРКИ ПРАВ ---\

    const checkEntitlements = useCallback((info: CustomerInfo): boolean => {
        const isPremium = info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
        // Оновлюємо статус у ThemeContext
        setUserPremiumStatus(isPremium); 
        return isPremium; 
    }, [setUserPremiumStatus]);

    // --- ЗВАНТАЖЕННЯ ДАНИХ (Offerings & CustomerInfo) ---\
    
    const loadCustomerData = useCallback(async () => {
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
        } catch (e) {
            console.error("[RevenueCat] Initial load error:", e);
            Alert.alert("Error", "Failed to load subscription data. Please check your connection.");
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
            if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
                console.log("[RevenueCat] Purchase cancelled by user.");
            } else {
                // console.error("[RevenueCat] Purchase error:", e);
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
            
            // Якщо відновлення не знайшло активних прав
            if (!isEntitled) {
                Alert.alert("Information", "No active purchases found to restore.");
            }
            
            return isEntitled; 
        } catch (e) {
            console.error("[RevenueCat] Restore purchases error:", e);
            Alert.alert("Restore Error", "Failed to restore purchases.");
            return false; 
        } finally {
            setIsLoading(false);
        }
    }, [checkEntitlements]);


    // --- ІНІЦІАЛІЗАЦІЯ SDK ---
    useEffect(() => {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG); 
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        
        // 🟢 ФІКС: Подвійне твердження типу для обходу помилки TypeScript/RevenueCat
        const customerInfoListener = Purchases.addCustomerInfoUpdateListener((info) => {
            setCustomerInfo(info);
            checkEntitlements(info); 
        }) as unknown as (() => void); // Приведення типу до функції відписки

        loadCustomerData();

        return () => {
            // Викликаємо функцію для відписки
            customerInfoListener(); 
        };
    }, [loadCustomerData, checkEntitlements]);


    const contextValue: RevenueCatContextData = {
        isRcReady,
        offerings,
        customerInfo,
        isLoading,
        handlePurchase,
        restorePurchases,
    };

    return (
        <RevenueCatContext.Provider value={contextValue}>
            {children}
        </RevenueCatContext.Provider>
    );
};

export { PurchasesPackage };