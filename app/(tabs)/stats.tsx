import React, { useMemo, useCallback } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ThemedButton from '../../src/components/ThemedButton';
import { useTheme } from '../../src/hooks/useTheme';
// Зверніть увагу: використовуємо useTimerLogic для отримання цільової кількості
import { useTimerLogic } from '../../src/hooks/useTimerLogic';
import { ROUTES } from '@/src/constants/Routes';
import { router, useFocusEffect } from 'expo-router';
import { SmokingLogEntry } from '@/src/services/storageService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

const ADMOB_BANNER_ID = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-6658861467026382~3148246399',
        android: 'ca-app-pub-6658861467026382~6565581373',
        default: TestIds.BANNER,
    });


// --- UTILITY FUNCTIONS (Без змін) ---

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
        refreshData,
        // 🎯 ГОЛОВНА ЗМІНА: Отримуємо цільову кількість сигарет на сьогодні
        targetCigarettesPerDay,
    } = useTimerLogic(); // useTimerLogic тепер повертає всі потрібні дані

    const scrollPaddingBottom = isUserPremium ? 40 : 90;

    // Динамічне оновлення даних при фокусуванні на вкладці
    useFocusEffect(
        useCallback(() => {
            if (refreshData) {
                refreshData();
            }
        }, [refreshData])
    );

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
                        { paddingBottom: scrollPaddingBottom }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.errorContainer, { backgroundColor: colors.backgroundPrimary }]}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Setup Required</Text>
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            Please complete the initial setup to start tracking your progress.
                        </Text>
                        <ThemedButton
                            title="Start Setup"
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
    // How many logs are avaliable even for Premium user
    const premiumLogsAvaliable = 20
    const notPremiumLogsAvaliable = 5

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: scrollPaddingBottom }
                ]}
                showsVerticalScrollIndicator={false}
            >

                <Text style={[styles.header, { color: colors.textPrimary }]}>Your Progress</Text>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                    <StatsCard
                        title="Today"
                        value={String(todayCount)}
                        // ✅ ВИПРАВЛЕНО: Використовуємо targetCigarettesPerDay замість початкової кількості
                        unit={`out of ${targetCigarettesPerDay} planned`}
                    />
                    <StatsCard
                        title="Average Interval"
                        value={formatTime(averageInterval)}
                        unit="between today's cigarettes"
                    />
                    {/* ... (інші картки закоментовані) */}
                </View>

                {/* Premium Teaser */}
                {!isUserPremium && (
                    <View style={[styles.premiumTeaser, { backgroundColor: colors.backgroundSecondary, borderColor: colors.accentPrimary }]}>
                        <Text style={[styles.teaserTitle, { color: colors.accentPrimary }]}>Get Premium</Text>
                        <Text style={[styles.teaserDescription, { color: colors.textSecondary }]}>
                            Unlock advanced analytics, full history, exclusive themes, and ad removal.
                        </Text>
                        <ThemedButton
                            title="Find Out More"
                            useSecondaryColor={true}
                            onPress={() => router.push(ROUTES.PREMIUM_MODAL)}
                            containerStyle={styles.teaserButton}
                            textStyle={{ fontSize: 14 }}
                        />
                    </View>
                )}

                {/* History Section (Basic) */}

                <Text style={[styles.historyHeader, { color: colors.textPrimary }]}>Last {isUserPremium ? smokingLogs.length > premiumLogsAvaliable ? premiumLogsAvaliable : smokingLogs.length : smokingLogs.length < notPremiumLogsAvaliable ? smokingLogs.length : notPremiumLogsAvaliable} of {smokingLogs.length} total logs</Text>

                {smokingLogs.slice().sort((a, b) => b.timestamp - a.timestamp).slice(0, !isUserPremium ? 5 : premiumLogsAvaliable // Виправлена логіка: 10, якщо не Premium, або вся довжина, якщо Premium
                ).map((log, index) => (
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

                {smokingLogs.length > notPremiumLogsAvaliable && !isUserPremium && (
                    <Text style={[styles.historyFooter, { color: colors.textSecondary }]}>
                        ...and {smokingLogs.length - notPremiumLogsAvaliable} more entries. Premium users see almost full history.
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

// --- STYLES (без змін) ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
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
        paddingBottom: Platform.OS === 'ios' ? 0 : 0,
    },
});

export default StatsScreen;