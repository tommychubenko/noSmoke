import { router, useFocusEffect } from 'expo-router';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';
// ВАЖЛИВО: Потрібно встановити 'react-native-svg': npx expo install react-native-svg
import Svg, { Circle } from 'react-native-svg';
import ThemedButton from '../../src/components/ThemedButton';
import { useTheme } from '../../src/hooks/useTheme';
import { useTimerLogic } from '../../src/hooks/useTimerLogic';
import { useRevenueCat } from '../../src/context/RevenueCatContext';
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
    // isUserPremium is read-only here, setUserPremiumStatus is the setter function
    const { colors, isUserPremium, setUserPremiumStatus } = useTheme();

    // 🎁 Стан для відстеження кліків таємного перемикача (Easter Egg)
    const [forcePremiumClicks, setForcePremiumClicks] = useState(0);

    // 🟢 Отримання функції loadCustomerData
    const { loadCustomerData } = useRevenueCat();

    // 🎁 Обробник таємного натискання (Easter Egg): Toggles Premium Status for local testing
    const handleSecretPress = useCallback(() => {
        const newCount = forcePremiumClicks + 1;
        setForcePremiumClicks(newCount);
        console.log(`[Easter Egg] Clicks: ${newCount}`);

        if (newCount === 5) {
            // Click 5: Force Premium ON
            console.log('[Easter Egg] Activating forced premium state (5 clicks)');
            // Примусово вмикаємо преміум-доступ
            setUserPremiumStatus(true);
        } else if (newCount === 6) {
            // Click 6: Force Premium OFF
            console.log('[Easter Egg] Deactivating forced premium state (6 clicks)');
            // Примусово вимикаємо преміум
            setUserPremiumStatus(false);
            setForcePremiumClicks(0)
            // Наступний useFocusEffect завантажить реальний стан
        }
    }, [forcePremiumClicks, setUserPremiumStatus]);


    // 🟢 ОНОВЛЕНА ЛОГІКА ПЕРЕВІРКИ ПІДПИСКИ ПРИ ФОКУСІ ЕКРАНА
 useFocusEffect(
        useCallback(() => {
            const checkPremiumStatus = async () => {
                console.log('[RevenueCat] Checking premium status on focus...');
                
                try {
                    const customerInfo = await loadCustomerData(); 

                    if (customerInfo && forcePremiumClicks !==5 ) {
                        const PRO_ENTITLEMENT_ID = 'tracker_premium_access'; 
                        // Визначаємо актуальний статус з API
                        const isActive = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
                        const statusText = isActive ? 'PREMIUM' : 'STANDARD';
                        
                        // 🎯 ПОКРАЩЕННЯ: Порівнюємо isActive з поточним станом isUserPremium
                        if (isActive !== isUserPremium) {
                            console.log(`[RevenueCat] Status change detected: ${isUserPremium} -> ${isActive}. Updating state...`);
                            // Встановлюємо новий статус
                            setUserPremiumStatus(isActive);
                        } else {
                             console.log(`[RevenueCat] Status unchanged: ${isUserPremium}. No state update.`);
                        }

                        console.log(`[RevenueCat] Current Entitlement Status (from API): ${statusText}`);
                    } else {
                        console.log('[RevenueCat] Focus check: Data load returned null (error/no data).');
                        // Опціонально: Можна встановити false, якщо loadCustomerData не вдалося, 
                        // щоб гарантувати, що статус не залишається застарілим
                        // if (isUserPremium) {
                        //     setUserPremiumStatus(false); 
                        // }
                    }

                } catch (error) {
                    console.error('[RevenueCat Error] Failed to execute loadCustomerData:', error);
                }
            };

            checkPremiumStatus();
            
            return () => {}; 
        }, [loadCustomerData, setUserPremiumStatus, isUserPremium, forcePremiumClicks])
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

                    {/* Timer Circle - SVG IMPLEMENTATION */}
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
                                <ResetDataButton />
                            </View>
                        ) : (<>
                            {/* 🐞 ВИПРАВЛЕНО: Використовуємо View з flexDirection: 'row' для коректного вбудовування Pressable */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', maxWidth: '100%' }}>
                                <Text style={[styles.infoText, { color: colors.textSecondary, marginBottom: 0 }]}>
                                    Your current target{' '}
                                </Text>
                                
                                {/* Інтерактивна частина з Pressable */}
                                <Pressable
                                    onPress={handleSecretPress}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={{ paddingHorizontal: 2 }} // Додаємо невеликий padding, щоб Pressable був помітнішим
                                    // 🔇 ВИПРАВЛЕНО ЗВУК: Вимикаємо звук та ефект "хвилі" для прихованої кнопки
                                    android_disableSound={true} 
                                    android_ripple={{ color: 'transparent' }}
                                >
                                    <Text
                                        style={[
                                            styles.infoText,
                                            {
                                                color: colors.textSecondary,
                                                textDecorationLine: forcePremiumClicks === 5 ? 'underline' : 'none',
                                                // Видалено margin/padding hacks, оскільки Pressable є блочним елементом у View
                                                marginBottom: 0, 
                                            }
                                        ]}
                                    >
                                        interval
                                    </Text>
                                </Pressable>
                                
                                <Text style={[styles.infoText, { color: colors.textSecondary, marginBottom: 0 }]}>
                                    {' '}is {targetTimeText}.
                                </Text>
                            </View>

                            <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 10, marginBottom: 40 }]}>
                                {isPaused ? 'Timer is paused during inactive hours.' : 'Keep waiting to hit your goal!'}
                            </Text>
                            <View style={styles.footer}>
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
                            // 🎨 Оновлено колір іконки та тексту на colors.accentPrimary для кращого візуального підтвердження
                            icon={<Foundation name="crown" size={24} color={colors.accentPrimary} />}
                            textStyle={{ fontSize: 14, color: colors.accentPrimary }}
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
                {/* Ad Banner: visible only if the user is NOT premium */}
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
        // Встановлюємо marginBottom в 0, оскільки ми керуємо цим за допомогою зовнішніх View
        marginBottom: 0, 
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