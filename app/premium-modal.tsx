import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router'; 
import React, { useState, useEffect, createContext, useContext } from 'react'; 
import { ScrollView, StyleSheet, Text, TouchableOpacity, Platform, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =================================================================
// --- MOCK/PLACEHOLDER: Interfaces and Color Constants (FIXED) ---
// =================================================================

// 1. Типізація ColorSet - відповідає структурі користувача
interface ColorSet { 
    backgroundPrimary: string;
    backgroundSecondary: string;
    textPrimary: string;
    textSecondary: string;
    accentPrimary: string; 
    accentSecondary: string; 
    separator: string;
}

// 2. Статичні кольори (DefaultColors) - відповідає структурі користувача
const DefaultColors = {
    white: '#FFFFFF',
    black: '#000000',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
};

// 3. Мокові кольори теми (Theme1 style)
const MockThemeColors: ColorSet = {
    backgroundPrimary: '#FAFAFA', 
    backgroundSecondary: '#FFFFFF', 
    textPrimary: '#1E293B', 
    textSecondary: '#64748B', 
    accentPrimary: '#F97316', // Яскраво-помаранчевий
    accentSecondary: '#FDBA74', // Світло-помаранчевий
    separator: '#E2E8F0', // Використовуватиметься для неактивних кнопок
};


// 4. Типізація для мокового хука
interface UseThemeResult {
    // textOnAccent додається тут, оскільки він потрібен, але не є частиною ColorSet
    colors: ColorSet & { textOnAccent: string }; 
    isUserPremium: boolean;
    setUserPremiumStatus: (isPremium: boolean) => Promise<void>; 
}

// 5. Моковий useTheme
const useTheme = (): UseThemeResult => {
    const [isPremium, setIsPremium] = useState(false); 

    const setUserPremiumStatus = async (status: boolean): Promise<void> => {
        setIsPremium(status);
        console.log(`[ThemeContext] Premium status set to: ${status}`);
    };

    return {
        colors: {
            ...MockThemeColors,
            textOnAccent: DefaultColors.white, 
        },
        isUserPremium: isPremium,
        setUserPremiumStatus: setUserPremiumStatus, 
    };
};


// =================================================================
// --- MOCK API: RevenueCat ---
// =================================================================

interface Product {
    identifier: string;
    price: number;
    title: string;
    description: string;
    period: string;
}

interface Offerings {
    packages: Product[];
}

const MockPurchases = {
    getOfferings: async (): Promise<Offerings> => {
        await new Promise(resolve => setTimeout(resolve, 500)); 
        return {
            packages: [
                {
                    identifier: 'premium_annual',
                    price: 999.00,
                    title: 'Річна підписка',
                    description: 'Економія 50% при річній оплаті.',
                    period: '999 UAH /рік (Знижка 50%)',
                },
                {
                    identifier: 'premium_monthly',
                    price: 199.00,
                    title: 'Щомісячна підписка',
                    description: 'Повний доступ на місяць.',
                    period: '199 UAH /місяць',
                },
            ]
        };
    },
    purchasePackage: async (product: Product): Promise<{ success: boolean }> => {
        console.log(`[RC] Purchasing product: ${product.identifier}`);
        const success = Math.random() > 0.1; 
        return new Promise(resolve => 
            setTimeout(() => resolve({ success }), 2000)
        );
    },
    restorePurchases: async (): Promise<{ success: boolean }> => {
        console.log('[RC] Restoring purchases...');
        return new Promise(resolve => 
            setTimeout(() => resolve({ success: Math.random() > 0.1 }), 1500)
        ); 
    },
};


// --- MOCK/PLACEHOLDER: ThemedButton (FIXED accentFaded usage) ---
interface ThemedButtonProps {
    title: string;
    onPress: () => void;
    containerStyle?: any;
    textStyle?: any;
    disabled?: boolean;
    loading?: boolean; 
}

const ThemedButton: React.FC<ThemedButtonProps> = ({ title, onPress, containerStyle, textStyle, disabled, loading }) => {
    const { colors } = useTheme();

    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            style={[
                {
                    // ВИПРАВЛЕНО: Використовуємо colors.separator для вимкненого стану
                    backgroundColor: isDisabled ? colors.separator : colors.accentPrimary,
                    padding: 15,
                    borderRadius: 12,
                    alignItems: 'center',
                },
                containerStyle
            ]}
        >
            {loading ? (
                <ActivityIndicator color={colors.textOnAccent} />
            ) : (
                <Text style={[
                    {
                        color: colors.textOnAccent,
                        fontSize: 18,
                        fontWeight: '700'
                    },
                    textStyle
                ]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};


// Список преміум-функцій для відображення
const premiumFeatures = [
    { name: "Детальна Аналітика", icon: "chart-bar", description: "Глибоке розуміння ваших звичок і прогресу." },
    { name: "Спеціальні Теми", icon: "palette-outline", description: "Персоналізуйте зовнішній вигляд програми за допомогою ексклюзивних тем." },
    { name: "Хмарна Синхронізація", icon: "cloud-check-outline", description: "Безпечне резервне копіювання та синхронізація на всіх ваших пристроях." },
    { name: "Необмежена Історія", icon: "history", description: "Доступ до всіх ваших записів куріння без обмежень." },
    { name: "Ексклюзивні Досягнення", icon: "trophy-outline", description: "Додаткові нагороди та мотиваційні значки." },
];

// --- COMPONENT ---

const PremiumModalScreen = () => {
    const { colors, isUserPremium, setUserPremiumStatus } = useTheme(); 
    const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    
    const [packages, setPackages] = useState<Product[]>([]);
    const [packagesLoading, setPackagesLoading] = useState(true);

    // 1. Завантаження пропозицій при монтуванні
    useEffect(() => {
        const loadPackages = async () => {
            setPackagesLoading(true);
            try {
                const offerings = await MockPurchases.getOfferings();
                setPackages(offerings.packages);
            } catch (error) {
                console.error("Failed to load offerings:", error);
                setStatusMessage('Помилка завантаження пропозицій.');
            } finally {
                setPackagesLoading(false);
            }
        };
        loadPackages();
    }, []);

    const resetStatus = () => {
        setTimeout(() => {
            setPurchaseStatus('idle');
            setStatusMessage('');
        }, 4000);
    };

    // --- Handlers ---
    
    const handleMainAction = async (product: Product | undefined) => {
        if (isUserPremium) {
            router.back();
            return;
        }
        if (purchaseStatus === 'loading' || !product) return;

        setPurchaseStatus('loading');
        setStatusMessage(`Ініціалізація покупки ${product.title}...`);

        try {
            const result = await MockPurchases.purchasePackage(product); 
            
            if (result.success) {
                await setUserPremiumStatus(true); 
                
                setPurchaseStatus('success');
                setStatusMessage('🎉 Успіх! Ваш Premium-доступ активовано.');

                setTimeout(() => {
                    router.back();
                }, 3000);

            } else {
                setPurchaseStatus('error');
                setStatusMessage('Помилка платежу. Будь ласка, спробуйте ще раз.');
                resetStatus();
            }

        } catch (e) {
            console.error("Purchase failed:", e);
            setPurchaseStatus('error');
            setStatusMessage('Помилка покупки. Будь ласка, перевірте ваше з\'єднання.');
            resetStatus();
        } 
    };
    
    const handleRestorePurchase = async () => {
        if (purchaseStatus === 'loading') return;
        
        setPurchaseStatus('loading');
        setStatusMessage('Відновлення покупки... Будь ласка, зачекайте.');
        
        try {
            const result = await MockPurchases.restorePurchases();
            
            if (result.success) {
                await setUserPremiumStatus(true); 

                setPurchaseStatus('success');
                setStatusMessage('✅ Покупку відновлено. Premium-доступ активовано.');
                
                setTimeout(() => {
                    router.back();
                }, 3000);
            } else {
                 setPurchaseStatus('error');
                setStatusMessage('Не знайдено активних покупок для відновлення.');
                 resetStatus();
            }

        } catch (e) {
            console.error("Restore failed:", e);
            setPurchaseStatus('error');
            setStatusMessage('Помилка відновлення. Спробуйте пізніше.');
            resetStatus();
        } 
    };


    // Dynamic Text Content
    const headerTitle = isUserPremium ? "Дякуємо, Premium!" : "Перейдіть на Premium";
    const headerSubtitle = isUserPremium 
        ? "Ваш повний доступ активовано. Насолоджуйтесь усіма функціями!"
        : "Розблокуйте повну потужність додатку та досягайте своїх цілей швидше.";
    
    const mainProduct = packages.find(p => p.identifier === 'premium_annual');
    
    const buttonTitle = isUserPremium 
        ? "Продовжити" 
        : packagesLoading 
        ? "Завантаження цін..."
        : purchaseStatus === 'loading' 
        ? "Обробка..." 
        : mainProduct ? `Придбати за ${Math.round(mainProduct.price)} UAH` : "Немає пропозицій";
    
    const messageBgColor = purchaseStatus === 'error' ? DefaultColors.error : DefaultColors.success;

    return (
        <SafeAreaView 
            style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
            edges={['top', 'bottom']}
        >
            {/* Close Button */}
            <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => router.back()}
                disabled={purchaseStatus === 'loading'}
            >
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Header Section */}
                <View style={styles.headerContainer}>
                    <MaterialCommunityIcons 
                        name="crown" 
                        size={60} 
                        color={DefaultColors.success} 
                        style={styles.crownIcon} 
                    />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{headerTitle}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{headerSubtitle}</Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                    {premiumFeatures.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <MaterialCommunityIcons 
                                name={feature.icon as any} 
                                size={30} 
                                color={colors.accentPrimary} 
                                style={styles.featureIcon}
                            />
                            <View style={styles.featureTextContainer}>
                                <Text style={[styles.featureName, { color: colors.textPrimary }]}>
                                    {feature.name}
                                </Text>
                                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                                    {feature.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
                
                {/* Ціни (Динамічно завантажуються з packages) */}
                {!isUserPremium && packagesLoading && (
                    <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginBottom: 30 }}/>
                )}
                
                {!isUserPremium && !packagesLoading && packages.length > 0 && (
                    <View style={styles.priceContainer}>
                        {packages.map((product) => (
                            <TouchableOpacity 
                                key={product.identifier}
                                style={[
                                    styles.priceBox, 
                                    { 
                                        backgroundColor: colors.backgroundSecondary, 
                                        borderWidth: product.identifier === 'premium_annual' ? 3 : 1, 
                                        borderColor: product.identifier === 'premium_annual' ? colors.accentPrimary : colors.separator 
                                    }
                                ]}
                                onPress={() => handleMainAction(product)}
                                disabled={purchaseStatus === 'loading'}
                            >
                                <Text style={[styles.priceText, { color: colors.textPrimary }]}>
                                    {Math.round(product.price)} UAH
                                </Text>
                                <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                                    {product.period}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}


            </ScrollView>
            
            {/* Секція повідомлення */}
            {statusMessage && (
                <View style={[styles.messageBar, { backgroundColor: messageBgColor }]}>
                    <Text style={[styles.messageText, { color: DefaultColors.white }]}>{statusMessage}</Text>
                </View>
            )}

            {/* Footer with Main Action Button */}
            <View style={[styles.footer, { backgroundColor: colors.backgroundPrimary, borderTopColor: colors.separator }]}>
                <ThemedButton
                    title={buttonTitle}
                    onPress={() => handleMainAction(mainProduct)} 
                    containerStyle={styles.mainButton}
                    loading={purchaseStatus === 'loading' || packagesLoading}
                    disabled={isUserPremium || purchaseStatus === 'loading' || packagesLoading || !mainProduct}
                />
                {!isUserPremium && (
                    <TouchableOpacity onPress={handleRestorePurchase} disabled={purchaseStatus === 'loading'}>
                        <Text style={[styles.restoreText, { color: colors.textSecondary }]}>Відновити Покупку</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

// --- STYLES ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 120 }, 
    closeButton: { 
        position: 'absolute', 
        top: Platform.OS === 'android' ? 10 : 20, 
        right: 20, 
        zIndex: 999,
        padding: 10, 
        borderRadius: 25, 
        elevation: 5,
    },
    headerContainer: { alignItems: 'center', paddingTop: 80, paddingBottom: 40, paddingHorizontal: 20 },
    crownIcon: { marginBottom: 15 },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 10 },
    featuresList: { marginBottom: 30, paddingHorizontal: 25 },
    featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    featureIcon: { marginRight: 15, minWidth: 30 },
    featureTextContainer: { flex: 1 },
    featureName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
    featureDescription: { fontSize: 14, lineHeight: 20 },
    priceContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        paddingHorizontal: 10, 
        marginBottom: 30 
    },
    priceBox: {
        width: '45%',
        padding: 15,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
    },
    priceText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    pricePeriod: {
        fontSize: 14,
        marginTop: 5,
    },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center', borderTopWidth: 1 },
    mainButton: { width: '100%', marginBottom: 10 },
    restoreText: { fontSize: 14, fontWeight: '500', padding: 5 },
    messageBar: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 0 : 50, 
        left: 10,
        right: 10,
        padding: 15,
        borderRadius: 10,
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    messageText: {
        color: '#FFFFFF',
        fontWeight: '600',
        textAlign: 'center',
    }
});

export default PremiumModalScreen;