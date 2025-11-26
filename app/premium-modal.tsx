import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
// 🟢 ІМПОРТ: Додано useSafeAreaInsets
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// 🟢 ІМПОРТИ ДЛЯ ФУНКЦІОНАЛУ
import ThemedButton from '../src/components/ThemedButton';
import { useTheme } from '../src/hooks/useTheme';
import { useRevenueCat, PurchasesPackage } from '../src/context/RevenueCatContext';
import { DefaultColors } from '@/src/constants/Colors';

// =================================================================
// --- ДОПОМІЖНІ КОМПОНЕНТИ ---
// =================================================================

/** Кнопка закриття модального вікна */
const CloseButton: React.FC = () => {
    const { colors } = useTheme();
    // 🟢 ВИКОРИСТАННЯ: Отримуємо верхній відступ безпечної зони
    const insets = useSafeAreaInsets();

    return (
        // 🟢 ВИПРАВЛЕННЯ СТИЛЮ: Встановлюємо динамічний відступ зверху
        <TouchableOpacity
            style={[
                styles.closeButton,
                // Якщо є відступ (наприклад, на iOS), використовуємо його; інакше – стандартний відступ.
                { top: Math.max(insets.top, 20) }
            ]}
            onPress={() => router.back()}
        >
            <MaterialCommunityIcons
                name="close-circle"
                size={30}
                color={colors.textSecondary}
            />
        </TouchableOpacity>
    );
};

/** Елемент-фіча з іконкою */
interface FeatureItemProps {
    text: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    isPremiumOwned?: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ text, icon, isPremiumOwned = false }) => {
    const { colors } = useTheme();

    const displayIcon = isPremiumOwned ? 'check-circle' : icon;
    const displayColor = isPremiumOwned ? DefaultColors.success : colors.accentPrimary;

    return (
        <View style={styles.featureItem}>
            <MaterialCommunityIcons
                name={displayIcon}
                size={24}
                color={displayColor}
            />
            <View style={styles.featureTextContent}>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{text}</Text>
            </View>
        </View>
    );
};

/** Компонент для відображення ціни та вибору пакета */
interface PriceBoxProps {
    pkg: PurchasesPackage;
    onPress: (pkg: PurchasesPackage) => void;
    isLoading: boolean;
    colors: ReturnType<typeof useTheme>['colors'];
}

const PriceBox: React.FC<PriceBoxProps> = ({ pkg, onPress, isLoading, colors }) => {

    const isAnnual = pkg.identifier.includes('annual');

    const title = isAnnual ? 'Annual Subscription' : 'Monthly Subscription';
    const periodText = isAnnual ? 'annual' : 'monthly';

    const borderColor = isAnnual ? colors.accentPrimary : colors.separator;
    const backgroundColor = isAnnual ? colors.backgroundSecondary : colors.backgroundPrimary;
    const priceColor = colors.textPrimary;

    return (
        <TouchableOpacity
            style={[styles.priceBox, { borderColor, backgroundColor }]}
            onPress={() => onPress(pkg)}
            disabled={isLoading}
        >
            <Text style={[styles.priceText, { color: priceColor }]}>
                {pkg.product.priceString}
            </Text>
            <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                {periodText}
            </Text>
            {isLoading && <ActivityIndicator size="small" color={colors.accentPrimary} style={styles.loadingOverlay} />}
        </TouchableOpacity>
    );
};

// --- СПИСОК ПЕРЕВАГ ---
const features = [
    { text: "All Premium Themes & Schemes", icon: "palette" as const },
    { text: "In-depth Usage Statistics", icon: "chart-timeline-variant-shimmer" as const },
    { text: "Remove all advertising", icon: "block-helper" as const },
    { text: "Extra Tools and Customization", icon: "hammer-screwdriver" as const },
];

// =================================================================
// --- ВМІСТ ДЛЯ PREMIUM КОРИСТУВАЧІВ ---
// =================================================================
interface PremiumContentProps {
    colors: ReturnType<typeof useTheme>['colors'];
}

const PremiumContent: React.FC<PremiumContentProps> = ({ colors }) => (
    <>
        <Text style={[styles.mainTitle, { color: DefaultColors.success, fontSize: 38 }]}>
            Hooray! 🎉
        </Text>
        <Text style={[styles.subTitle, { color: colors.textPrimary }]}>
            You already have an active Premium subscription.
        </Text>
        <Text style={[styles.subTitle, { color: colors.textSecondary, marginBottom: 40 }]}>
            Enjoy full access to all app features!
        </Text>

        {/* Список переваг (з іконками-галочками) */}
        <View style={styles.featureList}>
            {features.map((feature, index) => (
                <FeatureItem
                    key={index}
                    text={feature.text}
                    icon={feature.icon}
                    isPremiumOwned={true} // Передаємо статус Premium
                />
            ))}
        </View>

        <ThemedButton
            title="Back to App"
            onPress={() => router.back()}
            containerStyle={{ marginTop: 30 }}
        />
    </>
);

// =================================================================
// --- ВМІСТ ДЛЯ NON-PREMIUM КОРИСТУВАЧІВ ---
// =================================================================
interface NonPremiumContentProps extends PremiumContentProps {
    monthlyPackage: PurchasesPackage | undefined;
    annualPackage: PurchasesPackage | undefined;
    onPurchase: (pkg: PurchasesPackage) => void;
    isRcLoading: boolean;
}

const NonPremiumContent: React.FC<NonPremiumContentProps> = ({
    colors,
    monthlyPackage,
    annualPackage,
    onPurchase,
    isRcLoading
}) => (
    <>
        <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
            Premium Access
        </Text>
        <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
            Unlock extra features and support the app's development.
        </Text>

        {/* Список переваг (з іконками-акцентами) */}
        <View style={styles.featureList}>
            {features.map((feature, index) => (
                <FeatureItem
                    key={index}
                    text={feature.text}
                    icon={feature.icon}
                />
            ))}
        </View>

        {/* Вибір ціни */}
        <View style={styles.priceContainer}>
            {monthlyPackage && (
                <PriceBox
                    pkg={monthlyPackage}
                    onPress={onPurchase}
                    isLoading={isRcLoading}
                    colors={colors}
                />
            )}
            {annualPackage && (
                <PriceBox
                    pkg={annualPackage}
                    onPress={onPurchase}
                    isLoading={isRcLoading}
                    colors={colors}
                />
            )}
            {(!monthlyPackage && !annualPackage) && (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                    No offers are currently available.
                </Text>
            )}
        </View>
    </>
);


// =================================================================
// --- ОСНОВНИЙ КОМПОНЕНТ MODAL ---
// =================================================================

const PremiumModalScreen: React.FC = () => {
    const { colors, isUserPremium } = useTheme();

    const {
        isRcReady,
        offerings,
        isLoading: isRcLoading,
        handlePurchase,
        restorePurchases
    } = useRevenueCat();

    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const isReadyForPurchaseScreen = isRcReady && offerings && offerings.current;

    if (!isUserPremium && !isReadyForPurchaseScreen) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundPrimary }]}>
                <CloseButton />
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={colors.accentPrimary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 15 }}>Завантаження підписок...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const currentOffering = offerings?.current;

    const monthlyPackage = currentOffering?.availablePackages.find(pkg => pkg.identifier.includes('monthly'));
    const annualPackage = currentOffering?.availablePackages.find(pkg => pkg.identifier.includes('annual'));

    // Логіка для обробки покупки
    const onPurchase = useCallback(async (pkg: PurchasesPackage) => {
        const success = await handlePurchase(pkg);
        if (success) {
            setMessage({ text: "Purchase successful! Thank you for your support.", type: 'success' });
            setTimeout(() => router.back(), 2000);
        } else {
            setMessage({ text: "Purchase failed or cancelled.", type: 'error' });
        }
    }, [handlePurchase]);

    // Логіка для відновлення покупок
    const onRestore = useCallback(async () => {
        const success = await restorePurchases();
        if (success) {
            setMessage({ text: "Purchases Restored!", type: 'success' });
            setTimeout(() => router.back(), 2000);
        } else {
            setMessage({ text: "We couldn't find any active purchases.", type: 'error' });
        }
    }, [restorePurchases]);

    if (!isUserPremium && !currentOffering) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundPrimary }]}>
                <CloseButton />
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={50} color={DefaultColors.error} />
                    <Text style={{ color: colors.textPrimary, marginTop: 15, textAlign: 'center' }}>
                        No subscription offers found. Please try again later.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }


    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundPrimary }]}>
            <CloseButton />

            {/* Банер повідомлень */}
            {message && (
                <View style={[
                    styles.messageBar,
                    {
                        backgroundColor: message.type === 'success' ? DefaultColors.success : DefaultColors.error,
                    }
                ]}>
                    <Text style={{ color: DefaultColors.white, fontWeight: 'bold' }}>
                        {message.text}
                    </Text>
                    <TouchableOpacity onPress={() => setMessage(null)}>
                        <MaterialCommunityIcons name="close" size={20} color={DefaultColors.white} />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* УМОВНИЙ РЕНДЕРИНГ ВМІСТУ МОДАЛКИ */}
                {isUserPremium ? (
                    <PremiumContent colors={colors} />
                ) : (
                    <NonPremiumContent
                        colors={colors}
                        monthlyPackage={monthlyPackage}
                        annualPackage={annualPackage}
                        onPurchase={onPurchase}
                        isRcLoading={isRcLoading}
                    />
                )}
            </ScrollView>

            {/* УМОВНИЙ РЕНДЕРИНГ ФУТЕРА: Тільки якщо не Premium */}
            {!isUserPremium && (
                <View style={[styles.footer, { borderColor: colors.separator, backgroundColor: colors.backgroundPrimary }]}>
                    {/* Кнопка "Відновити Покупки" */}
                    <TouchableOpacity
                        onPress={onRestore}
                        disabled={isRcLoading}
                    >
                        <Text style={[styles.restoreText, { color: colors.accentPrimary }]}>
                            {isRcLoading ? 'Restoring...' : 'Restore Purchases'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        The purchase is governed by the App Store / Google Play terms.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
};

export default PremiumModalScreen;

// =================================================================
// --- СТИЛІ ---
// =================================================================

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        paddingHorizontal: 20,
        // 🟢 ВИПРАВЛЕНО: Збільшуємо верхній відступ, щоб контент не заїжджав під CloseButton
        paddingTop: 80,
        paddingBottom: 150,
    },
    closeButton: {
        position: 'absolute',
        // 🟢 ВИПРАВЛЕНО: Видалено Platform.OS перевірку, оскільки тепер використовується useSafeAreaInsets у компоненті.
        // Це забезпечує коректне позиціонування кнопки, незалежно від вирізів екрана.
        right: 20,
        zIndex: 10,
        padding: 5,
    },
    mainTitle: {
        fontSize: 34,
        fontWeight: '900',
        marginBottom: 10,
        textAlign: 'center',
    },
    subTitle: {
        fontSize: 16,
        marginBottom: 30,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    // Feature List Styles
    featureList: {
        paddingHorizontal: 20,
        marginBottom: 40,
        gap: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 15,
    },
    featureTextContent: {
        flex: 1,
    },
    featureDescription: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500',
    },
    // Price Selection Styles
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
        marginBottom: 30
    },
    priceBox: {
        width: '48%',
        padding: 20,
        borderRadius: 15,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    priceText: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    pricePeriod: {
        fontSize: 14,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 15,
    },
    // Footer Styles
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 15,
        alignItems: 'center',
        borderTopWidth: 1
    },
    restoreText: {
        fontSize: 14,
        fontWeight: '700',
        padding: 10,
    },
    infoText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 5,
    },
    // Message Bar
    messageBar: {
        position: 'absolute',
        top: 50, // Залишаємо фіксований відступ для повідомлень
        left: 10,
        right: 10,
        padding: 15,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
    },
});