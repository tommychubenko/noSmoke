import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
// ВИПРАВЛЕННЯ: Прибираємо Package з іменованих імпортів. 
// Замість Purchases.Package використовуємо 'any' для обходу помилки TS(2702),
// оскільки компілятор не розпізнає Purchases як простір імен.
import Purchases, { CustomerInfo, PurchasesError } from 'react-native-purchases'; 

// =================================================================
// КОНФІГУРАЦІЯ
// =================================================================

// ВАЖЛИВО: Замініть ці заглушки на ваші реальні публічні ключі RevenueCat
const RC_API_KEYS = {
    // Ключ для iOS (App Store)
    ios: 'Ваш_Публічний_Ключ_IOS', 
    // Ключ для Android (Google Play)
    android: 'Ваш_Публічний_Ключ_ANDROID', 
};

// ID вашого права доступу, яке ви створили в RevenueCat
const ENTITLEMENT_ID = 'premium_access';

// ID вашої пропозиції, яку ви створили в RevenueCat (зазвичай 'default_offering')
const OFFERING_ID = 'default_offering'; 

// =================================================================
// ІНТЕРФЕЙСИ ДАНИХ
// =================================================================

export interface ProductPackage {
    identifier: string; // premium_annual або premium_monthly
    priceString: string; // "$9.99" або "999 UAH"
    period: string; 
    // Ми зберігаємо повний об'єкт Package, щоб передати його у функцію покупки
    purchasesPackage: any; // Виправлено: Використовуємо 'any' замість Purchases.Package
}

interface SubscriptionState {
    isPremium: boolean;
    offerings: ProductPackage[] | null;
    isLoading: boolean;
    error: string | null;
}

// =================================================================
// ЛОГІКА ХУКА
// =================================================================

/**
 * Хук для керування всією логікою підписок RevenueCat.
 * Має бути викликаний на верхньому рівні (наприклад, у контексті або головному layout).
 */
export const useSubscription = () => {
    const [state, setState] = useState<SubscriptionState>({
        isPremium: false,
        offerings: null,
        isLoading: true,
        error: null,
    });

    // ------------------------------------
    // 1. ІНІЦІАЛІЗАЦІЯ І СТАТУС КОРИСТУВАЧА
    // ------------------------------------
    useEffect(() => {
        const apiKey = Platform.select(RC_API_KEYS);
        if (!apiKey || apiKey.includes('Ваш_Публічний_Ключ')) {
            console.warn("RevenueCat: API ключ не встановлено. Використання мокового режиму.");
            setState(s => ({ ...s, isLoading: false, error: "RC API ключ не встановлено." }));
            return;
        }

        // 1. Конфігурація SDK
        Purchases.configure({ apiKey });

        // 2. Слухач змін статусу
        // ВИПРАВЛЕННЯ: Використовуємо подвійне приведення типу (`as unknown as () => void`),
        // щоб обійти конфлікт типів, коли TS помилково бачить 'void'.
        const unsubscribe: () => void = Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
            updateUserStatus(info);
        }) as unknown as () => void; 

        // 3. Первинне завантаження статусу та пропозицій
        const loadInitialData = async () => {
            try {
                // Отримання статусу користувача
                const info = await Purchases.getCustomerInfo();
                updateUserStatus(info);

                // Отримання пропозицій
                await loadOfferings();
                
            } catch (e) {
                console.error("RC: Initial setup failed:", e);
                const errorMessage = (e as any)?.message || "Помилка ініціалізації RevenueCat.";
                setState(s => ({ ...s, error: errorMessage, isLoading: false }));
            }
        };

        loadInitialData();

        return () => {
            // Викликаємо функцію відписки
            unsubscribe();
        };
    }, []);
    
    // ------------------------------------
    // 2. ДОПОМІЖНІ ФУНКЦІЇ
    // ------------------------------------
    
    /** Перевіряє Entitlement та оновлює стан isPremium */
    const updateUserStatus = (info: CustomerInfo) => {
        // Перевірка, чи активний Entitlement_ID (premium_access)
        const isPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
        setState(s => ({ ...s, isPremium }));
        console.log(`RC: User Premium Status: ${isPremium}`);
    };

    /** Завантажує актуальні ціни та пакети */
    const loadOfferings = async () => {
        setState(s => ({ ...s, isLoading: true, error: null }));
        try {
            const offerings = await Purchases.getOfferings();
            
            // Виправлення: Оскільки getOffering() та getOfferingForIdentifier() можуть бути недоступні,
            // використовуємо прямо доступ через offerings.all (який є мапою)
            const currentOffering = offerings.all[OFFERING_ID] || offerings.current;

            if (currentOffering && currentOffering.availablePackages.length > 0) {
                const packages: ProductPackage[] = currentOffering.availablePackages.map(pkg => ({
                    identifier: pkg.identifier,
                    priceString: pkg.product.priceString,
                    // Використовуємо priceString, якщо subscriptionPeriod не доступний
                    period: pkg.product.subscriptionPeriod || pkg.product.priceString, 
                    purchasesPackage: pkg, 
                }));
                setState(s => ({ ...s, offerings: packages, isLoading: false }));
            } else {
                 setState(s => ({ ...s, offerings: [], isLoading: false, error: 'Пропозиції не знайдені.' }));
            }

        } catch (e) {
             console.error("RC: Failed to load offerings:", e);
             const errorMessage = (e as PurchasesError)?.message || "Помилка завантаження цін.";
             setState(s => ({ ...s, error: errorMessage, isLoading: false }));
        }
    }


    // ------------------------------------
    // 3. ФУНКЦІЇ ДЛЯ КОМПОНЕНТІВ (ПУБЛІЧНІ МЕТОДИ)
    // ------------------------------------
    
    /** Здійснює покупку обраного пакету */
    const purchasePackage = async (pkg: any): Promise<boolean> => { // Виправлено: Використовуємо 'any'
        try {
            setState(s => ({ ...s, error: null }));
            
            // В реальному житті, тут з'явиться вікно Google/Apple Pay
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            
            // Після успішної покупки, статус буде оновлено через listener (updateUserStatus)
            const isEntitled = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
            return isEntitled;

        } catch (e) {
             const error = e as PurchasesError;
             // Порівнюємо з константою з Purchases.PURCHASES_ERROR_CODE
             if (error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
                 console.log("Purchase cancelled by user.");
                 return false;
             }
             console.error("RC: Purchase failed:", error);
             setState(s => ({ ...s, error: error.message }));
             return false;
        }
    };
    
    /** Відновлює покупки */
    const restorePurchases = async (): Promise<boolean> => {
         try {
            setState(s => ({ ...s, error: null }));
            const customerInfo = await Purchases.restorePurchases();
            updateUserStatus(customerInfo);
            
            const isEntitled = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
            
            if (!isEntitled) {
                setState(s => ({ ...s, error: "Не знайдено активних покупок для відновлення." }));
            }
            return isEntitled;
         } catch (e) {
             console.error("RC: Restore failed:", e);
             const errorMessage = (e as PurchasesError)?.message || "Помилка відновлення. Спробуйте пізніше.";
             setState(s => ({ ...s, error: errorMessage }));
             return false;
         }
    };

    return {
        ...state,
        purchasePackage,
        restorePurchases,
        loadOfferings // Може знадобитися для ручного оновлення
    };
};