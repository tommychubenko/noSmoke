import React, { useMemo, useCallback } from 'react'; // <-- Додано useCallback
import { ActivityIndicator, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ThemedButton from '../../src/components/ThemedButton';
import { useTheme } from '../../src/hooks/useTheme';
import { useTimerLogic } from '../../src/hooks/useTimerLogic';
import { ROUTES } from '@/src/constants/Routes';
import { router, useFocusEffect } from 'expo-router'; // <-- Додано useFocusEffect
import { SmokingLogEntry } from '@/src/services/storageService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

const ADMOB_BANNER_ID = __DEV__ 
    ? TestIds.BANNER // 1. Використовуємо тестовий ID в режимі розробки
    : Platform.select({ // 2. Вибираємо ID для релізу
        ios: 'ca-app-pub-6658861467026382~3148246399', // Реальний ID для iOS
        android: 'ca-app-pub-6658861467026382~6565581373', // Реальний ID для Android
        default: TestIds.BANNER, // Запасний варіант (хоча тут не потрібен, але для чистоти)
    });


// --- UTILITY FUNCTIONS ---
// ... (Your utility functions for getTodayLogs, calculateAverageInterval, formatTime)

const getTodayLogs = (logs: SmokingLogEntry[]): SmokingLogEntry[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return logs.filter(log => log.timestamp >= todayTimestamp);
};

const calculateAverageInterval = (todayLogs: SmokingLogEntry[]): number => {
    if (todayLogs.length < 2) return 0;

    const sortedLogs = [...todayLogs].sort((a, b) => a.timestamp - b.timestamp);
    let totalInterval = 0;

    for (let i = 1; i < sortedLogs.length; i++) {
        totalInterval += (sortedLogs[i].timestamp - sortedLogs[i - 1].timestamp);
    }

    // Convert average from ms to seconds
    return Math.floor((totalInterval / (sortedLogs.length - 1)) / 1000);
};

const formatTime = (totalSeconds: number): string => {
    if (totalSeconds === 0) return '0с';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}г ${minutes}хв`;
    if (minutes > 0) return `${minutes}хв ${seconds}с`;
    return `${seconds}с`;
};


// --- COMPONENT ---

const StatsScreen = () => {
    const { colors, isUserPremium } = useTheme();

    const {
        setupData,
        isLoading,
        smokingLogs,
        formatRemainingTime, // Not used in stats, but let's keep it here for completeness
        refreshData, // <-- Отримали нову функцію оновлення
    } = useTimerLogic();

    const scrollPaddingBottom = isUserPremium ? 40 : 90;

    // === НОВЕ ВИПРАВЛЕННЯ: Динамічне оновлення даних ===
    useFocusEffect(
        useCallback(() => {
            // Примусово завантажуємо найновіші дані щоразу, коли вкладка отримує фокус
            if (refreshData) {
                refreshData();
            }
        }, [refreshData])
    );
    // ===============================================

    // --- Memoized Calculations ---
    const todayLogs = useMemo(() => getTodayLogs(smokingLogs), [smokingLogs]);
    const averageInterval = useMemo(() => calculateAverageInterval(todayLogs), [todayLogs]);
    const totalCigarettes = smokingLogs.length;
    const todayCount = todayLogs.length;

    // --- Render Loading State ---
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.backgroundPrimary, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accentPrimary} />
            </View>
        );
    }

    // --- Render Setup Required State ---
    if (!setupData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        // ЗАСТОСУВАННЯ ДИНАМІЧНОГО ВІДСТУПУ
                        { paddingBottom: scrollPaddingBottom }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.errorContainer, { backgroundColor: colors.backgroundPrimary }]}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Налаштування потрібне</Text>
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            Будь ласка, заповніть початкове налаштування, щоб почати відстежувати свій прогрес.
                        </Text>
                        <ThemedButton
                            title="Почати Налаштування"
                            onPress={() => router.replace(ROUTES.SETUP)}
                            containerStyle={styles.actionButton}
                        />
                    </View>
                </ScrollView>

            </SafeAreaView>
        );
    }

    // --- Render Main Stats ---

    const StatsCard: React.FC<{ title: string; value: string; unit: string; isPremium?: boolean }> = ({ title, value, unit, isPremium = false }) => {
        const cardStyle = isPremium && !isUserPremium ? { opacity: 0.5 } : {};

        return (
            <View
                style={[
                    styles.card,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.separator },
                    cardStyle
                ]}
            >
                <Text style={[styles.cardTitle, { color: colors.accentPrimary }]}>{title}</Text>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{value}</Text>
                <Text style={[styles.cardUnit, { color: colors.textSecondary }]}>{unit}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    // Застосовуємо динамічний відступ
                    { paddingBottom: scrollPaddingBottom }
                ]}
                showsVerticalScrollIndicator={false}
            >

                <Text style={[styles.header, { color: colors.textPrimary }]}>Ваш Прогрес</Text>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                    <StatsCard
                        title="Сьогодні"
                        value={String(todayCount)}
                        unit={`з ${setupData.cigarettesPerDay} запланованих`}
                    />
                    <StatsCard
                        title="Середній Інтервал"
                        value={formatTime(averageInterval)}
                        unit="між сьогоднішніми"
                    />
                    {/* <StatsCard 
                        title="Всього" 
                        value={String(totalCigarettes)} 
                        unit="записів" 
                    />
                    <StatsCard 
                        title="Зекономлено (П)" 
                        value="~0₴" 
                        unit="завдяки зменшенню" 
                        isPremium 
                    />   */}
                </View>

                {/* Premium Teaser */}
                {!isUserPremium && (
                    <View style={[styles.premiumTeaser, { backgroundColor: colors.backgroundSecondary, borderColor: colors.accentPrimary }]}>
                        <Text style={[styles.teaserTitle, { color: colors.accentPrimary }]}>Отримайте Преміум</Text>
                        <Text style={[styles.teaserDescription, { color: colors.textSecondary }]}>
                            Відкрийте розширену аналітику, повну історію та ексклюзивні теми.
                        </Text>
                        <ThemedButton
                            title="Дізнатись Більше"
                            useSecondaryColor={true}
                            onPress={() => router.push(ROUTES.PREMIUM_MODAL)}
                            containerStyle={styles.teaserButton}
                            textStyle={{ fontSize: 14 }}
                        />
                    </View>
                )}

                {/* History Section (Basic) */}
                <Text style={[styles.historyHeader, { color: colors.textPrimary }]}>Нещодавні Записи ({smokingLogs.length})</Text>

                {smokingLogs.slice().sort((a, b) => b.timestamp - a.timestamp).slice(0, 10).map((log, index) => (
                    <View
                        key={log.timestamp + index}
                        style={[styles.logItem, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.separator }]}
                    >
                        <Text style={[styles.logTime, { color: colors.textPrimary }]}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </Text>
                        <Text style={[styles.logDate, { color: colors.textSecondary }]}>
                            {new Date(log.timestamp).toLocaleDateString()}
                        </Text>
                    </View>
                ))}

                {smokingLogs.length > 10 && !isUserPremium && (
                    <Text style={[styles.historyFooter, { color: colors.textSecondary }]}>
                        ...і ще {smokingLogs.length - 10} записів. Преміум-користувачі бачать всю історію.
                    </Text>
                )}
            </ScrollView>

            {!isUserPremium ? <View style={styles.bannerContainer}><BannerAd
                unitId={ADMOB_BANNER_ID}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            /></View> : null}

        </SafeAreaView>
    );
};

// --- STYLES (unchanged) ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        // *** ВИДАЛИТИ РЯДОК З ФІКСОВАНИМ paddingBottom! ***
        // paddingBottom: Platform.OS === 'android' ? 100 : 40, 
        paddingTop: 20,
    },
    header: {
        fontSize: 30,
        fontWeight: '700',
        marginBottom: 20,
    },
    // Metrics Grid
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    card: {
        width: (CARD_WIDTH / 2) - 10,
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    cardValue: {
        fontSize: 28,
        fontWeight: '800',
    },
    cardUnit: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        textAlign: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
    },
    actionButton: {
        marginTop: 20,
        minWidth: 200,
    },
    // Premium Teaser
    premiumTeaser: {
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        marginBottom: 30,
        alignItems: 'center',
    },
    teaserTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 5,
    },
    teaserDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 15,
    },
    teaserButton: {
        minWidth: 180,
    },
    // History
    historyHeader: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 15,
    },
    logItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
    },
    logTime: {
        fontSize: 16,
        fontWeight: '600',
    },
    logDate: {
        fontSize: 14,
    },
    historyFooter: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 10,
    },
    bannerContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        alignItems: 'center',
        // ВАЖЛИВО: Залишаємо 0, оскільки ми вже використовуємо SafeAreaView
        paddingBottom: Platform.OS === 'ios' ? 0 : 0,
    },
});

export default StatsScreen;