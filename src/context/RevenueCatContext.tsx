import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Purchases, {
    LOG_LEVEL,
    PurchasesPackage,
    CustomerInfo, 
    PurchasesOffering,
    PURCHASES_ERROR_CODE,
    PurchasesError 
} from 'react-native-purchases';
import { Platform, Alert } from 'react-native';

// Імпортуємо функцію для оновлення Premium-статусу в ThemeContext
import { useTheme } from '../hooks/useTheme'; 

// --- КОНСТАНТИ ---
// ⚠️ ЗАМІНІТЬ ЦЕЙ КЛЮЧ НА ВАШ ПРОДАКШН-КЛЮЧ ПЕРЕД РЕЛІЗОМ
const REVENUECAT_API_KEY = 'test_fsxTUrPVJaBBwQNyJMhQgafpwRt'; 
// Ідентифікатор права, яке надає Premium-доступ
const PRO_ENTITLEMENT_ID = 'Enterpreneur dev Pro';

// --- ІНТЕРФЕЙСИ ---

interface RevenueCatContextData {
    /** True, якщо SDK ініціалізовано та дані завантажено */
    isRcReady: boolean;
    /** Поточний активний список пропозицій (підписки, покупки) */
    offerings: PurchasesOffering | null;
    /** Інформація про покупця (права, активні підписки) */
    customerInfo: CustomerInfo | null;
    /** Поточний стан завантаження/покупки */
    isLoading: boolean;
    /** Функція для здійснення покупки (використовується в PremiumModal) */
    handlePurchase: (pkg: PurchasesPackage) => Promise<boolean>;
    /** Функція для відновлення покупок */
    restorePurchases: () => Promise<void>;
    /** URL для Customer Center (завжди null, оскільки функція видалена) */
    customerCenterUrl: string | null;
}

// --- СТВОРЕННЯ КОНТЕКСТУ ---
const RevenueCatContext = createContext<RevenueCatContextData | undefined>(undefined);

// --- ХУК ДЛЯ ВИКОРИСТАННЯ КОНТЕКСТУ ---
export const useRevenueCat = () => {
    const context = useContext(RevenueCatContext);
    if (context === undefined) {
        throw new Error('useRevenueCat must be used within a RevenueCatProvider');
    }
    return context;
};

// --- КОМПОНЕНТ ПРОВАЙДЕРА ---
export const RevenueCatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { setUserPremiumStatus } = useTheme(); 
    const [isRcReady, setIsRcReady] = useState(false);
    const [offerings, setOfferings] = useState<PurchasesOffering | null>(null); 
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [customerCenterUrl] = useState<string | null>(null); // Залишаємо null

    /**
     * Перевіряє права користувача та оновлює статус Premium у ThemeContext.
     */
    const checkEntitlements = useCallback((info: CustomerInfo) => {
        // 1. Перевірка наявності активного права "Enterpreneur dev Pro"
        const isPro = info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
        
        // 2. Оновлення статусу Premium у ThemeContext
        setUserPremiumStatus(isPro); 

        return isPro;
    }, [setUserPremiumStatus]);

    /**
     * Основна функція для завантаження даних про пропозиції та статус покупця.
     */
    const loadCustomerData = useCallback(async () => {
        setIsLoading(true);
        try {
            const info = await Purchases.getCustomerInfo();
            setCustomerInfo(info);
            checkEntitlements(info);
            
            const offerings = await Purchases.getOfferings();
            if (offerings.current) {
                setOfferings(offerings.current);
            }
            
        } catch (e) {
            console.error("[RevenueCat] Error loading initial data:", e);
            Alert.alert("Помилка підключення", "Не вдалося завантажити платіжні дані. Перевірте підключення до мережі.");
        } finally {
            setIsLoading(false);
            setIsRcReady(true);
        }
    }, [checkEntitlements]);

    /**
     * Обробник для покупок.
     * @param pkg Пакет (підписка/покупка), який потрібно придбати.
     */
    const handlePurchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
        if (isLoading) return false;
        setIsLoading(true);

        try {
            const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
            
            const isPro = checkEntitlements(newInfo); 
            
            setCustomerInfo(newInfo);
            
            Alert.alert("Успіх!", isPro ? "Premium-доступ активовано!" : "Покупку успішно завершено.");
            
            return isPro;

        } catch (e) {
            const rcError = e as PurchasesError;
            
            if (rcError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
                Alert.alert("Скасовано", "Покупку скасовано користувачем.");
            } else {
                console.error("[RevenueCat] Purchase error:", rcError);
                Alert.alert("Помилка покупки", `Сталася помилка: ${rcError.message}`);
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, checkEntitlements]);
    
    /**
     * Відновлення покупок
     */
    const restorePurchases = useCallback(async () => {
        setIsLoading(true);
        try {
            const restoredInfo = await Purchases.restorePurchases();
            const isPro = checkEntitlements(restoredInfo);

            if (isPro) {
                Alert.alert("Успіх!", "Ваші покупки успішно відновлено. Premium-доступ активовано.");
            } else {
                Alert.alert("Інформація", "Активні покупки для відновлення не знайдено.");
            }
        } catch (e) {
            console.error("[RevenueCat] Restore purchases error:", e);
            Alert.alert("Помилка відновлення", "Не вдалося відновити покупки.");
        } finally {
            setIsLoading(false);
        }
    }, [checkEntitlements]);

    // --- ІНІЦІАЛІЗАЦІЯ SDK ---
    useEffect(() => {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG); 
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        
        // 🟢 ФІНАЛЬНЕ ВИПРАВЛЕННЯ: Подвійне твердження типу (void -> unknown -> () => void)
        // Це обходить строгий контроль TypeScript над невідповідністю типів, коли
        // 'void' використовується як повертаний тип для функції, яка насправді повертає функцію.
        const customerInfoListener = Purchases.addCustomerInfoUpdateListener((info) => {
            setCustomerInfo(info);
            checkEntitlements(info); 
        }) as unknown as (() => void); // <-- ФІКС: Подвійне твердження типу

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
        customerCenterUrl,
    };

    return (
        <RevenueCatContext.Provider value={contextValue}>
            {children}
        </RevenueCatContext.Provider>
    );
};