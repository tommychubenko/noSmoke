import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
// ВАЖЛИВО: Потрібно встановити 'react-native-svg': npx expo install react-native-svg
import Svg, { Circle } from 'react-native-svg';
import ThemedButton from '../../src/components/ThemedButton'; // FIX: Added 'src/' to the path
import { useTheme } from '../../src/hooks/useTheme';
import { useTimerLogic } from '../../src/hooks/useTimerLogic';
import { ROUTES } from '@/src/constants/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Foundation } from '@expo/vector-icons';
import { BannerAd, BannerAdSize, TestIds, RewardedAd } from 'react-native-google-mobile-ads'; // <-- ДОДАНО
import { AppColors } from '@/src/constants/Colors';
import ResetDataButton from '@/src/components/ResetDataButton';

const ADMOB_BANNER_ID = __DEV__
    ? TestIds.BANNER // 1. Використовуємо тестовий ID в режимі розробки
    : Platform.select({ // 2. Вибираємо ID для релізу
        ios: 'ca-app-pub-6658861467026382~3148246399', // Реальний ID для iOS
        android: 'ca-app-pub-6658861467026382~6565581373', // Реальний ID для Android
        default: TestIds.BANNER, // Запасний варіант (хоча тут не потрібен, але для чистоти)
    });

// NOTE: Components like ThemedButton are assumed to be defined elsewhere in the project
// For a single-file environment, we must mock/define necessary components.
const PlaceholderButton = (props: any) => {
    const { colors } = useTheme();
    return (
        <View style={[{ padding: 10, borderRadius: 10, minWidth: 200 }, props.containerStyle, { backgroundColor: props.useSecondaryColor ? colors.backgroundSecondary : colors.accentPrimary }]}>
            <Text style={[{ textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.textPrimary }, props.textStyle]}>
                {props.title}
            </Text>
        </View>
    );
}




// --- SVG PROGRESS BAR COMPONENT (НОВИЙ КОМПОНЕНТ) ---

interface CircularProgressBarProps {
    progress: number; // 0.0 to 1.0 (заповнення)
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
    // 1. Обчислюємо розміри
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // 2. Обчислюємо зміщення для відображення прогресу (0% -> повне зміщення, 100% -> 0 зміщення)
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg height={size} width={size} style={{ transform: [{ rotateZ: '-90deg' }] }}>
                {/* Background Ring (Статичне кільце) */}
                <Circle
                    stroke={backgroundColor}
                    fill="transparent"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                {/* Progress Ring (Кільце прогресу) */}
                <Circle
                    stroke={progressColor}
                    fill="transparent"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" // Робить кінці лінії закругленими
                />
            </Svg>
            {/* Content (Текст/таймер) позиціонується абсолютно в центрі */}
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
        // Progress is the time spent since the last smoke / total interval duration
        const timeSpent = intervalDuration - remainingSeconds;
        // Ми обмежуємо прогрес 1.0, щоб не було переповнення (хоча remainingSeconds повинен бути >= 0)
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
    // const [mainTime, subTime] = formattedTime.split(':'); // Не використовується, можна прибрати якщо не потрібно

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
                    {/* Використовуємо View для контролю зовнішніх відступів */}
                    <View style={{ marginVertical: 40 }}>
                        <CircularProgressBar
                            progress={progressPercent}
                            size={250}
                            strokeWidth={15} // Збільшена товщина лінії
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

                    {/* Info Text */}
                    {
                        targetCigarettesPerDay === 0 && (
                            <ResetDataButton/>
                        )
                    }



                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Your current target interval is {targetTimeText}.
                    </Text>
                    <Text style={[styles.infoText, { color: colors.textSecondary, marginBottom: 40 }]}>
                        {isPaused ? 'Timer is paused during inactive hours.' : 'Keep waiting to hit your goal!'}
                    </Text>


                    {/* Action Button */}
                    <View style={styles.footer}>
                        <ThemedButton
                            title="I Smoked (Record)"
                            onPress={recordCigarette}
                            disabled={isPaused} // Disable if outside active hours
                            containerStyle={{ minWidth: '80%' }}
                        />
                    </View>

                    {/* Footer Links/Actions */}
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
                            // onPress={() => router.replace(ROUTES.SETTINGS_TAB)}
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
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} // Рекомендований розмір для фіксованого банера
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
        // *** Тут ми додаємо відступ, щоб вміст не перекривався банером знизу ***
        // Приблизна висота банера ANCHORED_ADAPTIVE_BANNER становить 50-90 одиниць. 
        // Додамо запас.
        paddingBottom: 90,
    },
    bannerContainer: {
        position: 'absolute', // Фіксуємо його
        bottom: 0,           // Притискаємо до низу
        width: '100%',       // Розтягуємо на всю ширину
        alignItems: 'center', // Центруємо банер всередині View
        // Додаємо відступи безпечної зони для iOS X/Android S, якщо SafeAreaView не справляється
        paddingBottom: Platform.OS === 'ios' ? 0 : 0,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    // timerCircle - СТАРИЙ СТИЛЬ ВИДАЛЕНО, його функціональність перенесена у CircularProgressBar
    timerValue: {
        fontSize: 45, // Повернуто до більшого розміру
        fontWeight: '800',
    },
    unitText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 5,
    },
    // Text and Status
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
    // Footer and Button
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