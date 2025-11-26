// index.tsx (HomeScreen)

import { router, useFocusEffect } from 'expo-router';
import React, { useMemo, useCallback } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
// ВАЖЛИВО: Потрібно встановити 'react-native-svg': npx expo install react-native-svg
import Svg, { Circle } from 'react-native-svg';
import ThemedButton from '../../src/components/ThemedButton';
import { useTheme } from '../../src/hooks/useTheme';
import { useTimerLogic } from '../../src/hooks/useTimerLogic';
import { useRevenueCat } from '../../src/context/RevenueCatContext'; // 🟢 ТЕПЕР ПРАЦЮЄ: Імпорт useRevenueCat
import { ROUTES } from '@/src/constants/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Foundation } from '@expo/vector-icons';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import ResetDataButton from '@/src/components/ResetDataButton';

const ADMOB_BANNER_ID = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-6658861467026382~3148246399',
        android: 'ca-app-pub-6658861467026382~6565581373',
        default: TestIds.BANNER,
    });

// --- SVG PROGRESS BAR COMPONENT (Без змін) ---

interface CircularProgressBarProps {
    progress: number;
    size: number;
    strokeWidth: number;
    progressColor: string;
    backgroundColor: string;
    children: React.ReactNode;
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
    progress,
    size,
    strokeWidth,
    progressColor,
    backgroundColor,
    children
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg height={size} width={size} style={{ transform: [{ rotateZ: '-90deg' }] }}>
                <Circle
                    stroke={backgroundColor}
                    fill="transparent"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                <Circle
                    stroke={progressColor}
                    fill="transparent"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>
            <View style={{
                position: 'absolute',
                width: size,
                height: size,
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                {children}
            </View>
        </View>
    );
};



const HomeScreen = () => {
    const { colors, isUserPremium } = useTheme();

    // 🟢 ВИПРАВЛЕННЯ 2: Отримання функції loadCustomerData
    const { loadCustomerData } = useRevenueCat();

    // 🟢 ВИПРАВЛЕННЯ 3: ЛОГІКА ПЕРЕВІРКИ ПІДПИСКИ ПРИ ФОКУСІ ЕКРАНА
    useFocusEffect(
        useCallback(() => {
            console.log("[RevenueCat Fix] Forcing Customer Data reload on focus...");
            // Цей виклик тепер коректно знаходить loadCustomerData в контексті
            loadCustomerData();
        }, [loadCustomerData])
    );

    // Use the custom hook to access all timer state and actions
    const {
        setupData,
        isLoading,
        remainingSeconds,
        isTimeUp,
        isPaused,
        recordCigarette,
        formatRemainingTime,
        intervalDuration,
        targetCigarettesPerDay
    } = useTimerLogic();

    // Calculate time remaining in MM:SS format
    const formattedTime = useMemo(() => {
        return formatRemainingTime(remainingSeconds);
    }, [remainingSeconds, formatRemainingTime]);

    // Calculate progress percentage for the ring/bar
    const progressPercent = useMemo(() => {
        if (intervalDuration <= 0) return 0;
        const timeSpent = intervalDuration - remainingSeconds;
        return Math.min(1, timeSpent / intervalDuration);
    }, [remainingSeconds, intervalDuration]);

    // Determine the status message
    const statusMessage = useMemo(() => {
        if (!setupData) return 'Complete setup to start your plan.';
        if (isLoading) return 'Loading your progress...';
        if (isTimeUp) return 'CONGRATULATIONS! You can smoke now, or keep going!';

        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);

        if (hours > 0) return `Just ${hours} more hour${hours > 1 ? 's' : ''} to go!`;
        if (minutes > 0) return `Almost there! Just ${minutes} more minute${minutes > 1 ? 's' : ''}.`;

        return 'Final countdown!';
    }, [setupData, isLoading, isTimeUp, remainingSeconds]);


    // --- RENDER ---

    // 1. Loading State
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
                <View style={styles.contentContainer}>
                    <ActivityIndicator size="large" color={colors.accentPrimary} />
                    <Text style={[styles.statusText, { color: colors.textSecondary, marginTop: 10 }]}>
                        Loading progress...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // 2. Setup Not Complete State
    if (!setupData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
                <View style={styles.contentContainer}>
                    <Text style={[styles.timerValue, { color: colors.textPrimary, fontSize: 40 }]}>Welcome!</Text>
                    <Text style={[styles.statusText, { color: colors.textSecondary, marginTop: 10 }]}>
                        It looks like you haven't completed your quit plan setup yet.
                    </Text>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Please start the setup process to get your personalized timer.
                    </Text>
                    <View style={styles.footer}>
                        <ThemedButton
                            title="Start Setup"
                            onPress={() => router.replace(ROUTES.SETUP)}
                            containerStyle={{ minWidth: 200 }}
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }


    // 3. Main Timer View
    const targetTimeText = formatRemainingTime(intervalDuration);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
            <ScrollView contentContainerStyle={styles.scrollContentAdjusted}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentContainer}>

                    {/* Status Text */}
                    <Text style={[styles.statusText, { color: isTimeUp ? colors.accentPrimary : colors.textPrimary }]}>
                        {statusMessage}
                    </Text>

                    {/* Timer Circle - NEW SVG IMPLEMENTATION */}
                    <View style={{ marginVertical: 40 }}>
                        <CircularProgressBar
                            progress={progressPercent}
                            size={250}
                            strokeWidth={15}
                            progressColor={isTimeUp ? colors.accentSecondary : colors.accentPrimary}
                            backgroundColor={colors.separator}
                        >
                            {isTimeUp ? (
                                <Text style={[styles.timerValue, { color: colors.accentPrimary, fontSize: 50 }]}>
                                    GO!
                                </Text>
                            ) : (
                                <View>
                                    {/* Main time display (MM:SS) */}
                                    <Text style={[styles.timerValue, { color: colors.textPrimary }]}>
                                        {formattedTime}
                                    </Text>
                                </View>
                            )}
                            <Text style={[styles.unitText, { color: colors.textSecondary }]}>
                                {isTimeUp ? 'READY TO RECORD' : 'Remaining until next'}
                            </Text>
                        </CircularProgressBar>
                    </View>

                    {/* Info Text and Main Button */}
                    {
                        targetCigarettesPerDay === 0 ? (
                            <View style={styles.footer}>
                                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                    You should be at your target for today. If not, you can start over.
                                </Text>
                                <ResetDataButton /></View>
                        ) : (<><Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            Your current target interval is {targetTimeText}.
                        </Text>
                            <Text style={[styles.infoText, { color: colors.textSecondary, marginBottom: 40 }]}>
                                {isPaused ? 'Timer is paused during inactive hours.' : 'Keep waiting to hit your goal!'}
                            </Text><View style={styles.footer}>
                                <ThemedButton
                                    title="I Smoked (Record)"
                                    onPress={recordCigarette}
                                    disabled={isPaused}
                                    containerStyle={{ minWidth: '80%' }}
                                />
                            </View></>)
                    }

                    {/* Secondary Actions (Stats and Premium) */}
                    <View style={styles.secondaryActions}>
                        <ThemedButton
                            title="See Stats"
                            onPress={() => router.replace(ROUTES.STATS_TAB)}
                            useSecondaryColor={true}
                            containerStyle={styles.secondaryButton}
                            textStyle={{ fontSize: 14 }}
                        />
                        {isUserPremium ? <ThemedButton
                            title="Premium activated"
                            disabled={true}
                            useSecondaryColor={true}
                            containerStyle={[styles.secondaryButton, { backgroundColor: "transparent", shadowColor: "transparent" }]}
                            icon={<Foundation name="crown" size={24} color={colors.textPrimary} />}
                            textStyle={{ fontSize: 14 }}
                        /> : <ThemedButton
                            title="Get Premium"
                            onPress={() => router.push(ROUTES.PREMIUM_MODAL)}
                            useSecondaryColor={true}
                            containerStyle={styles.secondaryButton}
                            textStyle={{ fontSize: 14 }}
                        />}
                    </View>

                </View>
            </ScrollView>
            <View style={styles.bannerContainer}>
                {!isUserPremium ? <BannerAd
                    unitId={ADMOB_BANNER_ID}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    requestOptions={{
                        requestNonPersonalizedAdsOnly: true,
                    }}
                /> : null}
            </View>
        </SafeAreaView>
    );
};



// --- STYLES ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    scrollContentAdjusted: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 90,
    },
    bannerContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 0 : 0,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    timerValue: {
        fontSize: 45,
        fontWeight: '800',
    },
    unitText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 5,
    },
    statusText: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 5,
    },
    footer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 30,
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 15,
        justifyContent: 'center',
        width: '100%',
        marginBottom: 20,
    },
    secondaryButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    resetButton: {
        minWidth: '100%',
        marginTop: 10,
    },
});

export default HomeScreen;