import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ThemedButton from '../../src/components/ThemedButton'; // FIX: Added 'src/' to the path
import { useTheme } from '../../src/hooks/useTheme';
import { useTimerLogic } from '../../src/hooks/useTimerLogic';
import { ROUTES } from '@/src/constants/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Foundation } from '@expo/vector-icons';

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
        intervalDuration
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
    const [mainTime, subTime] = formattedTime.split(':');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
            <ScrollView contentContainerStyle={styles.scrollContainer} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentContainer}>
                    
                    {/* Status Text */}
                    <Text style={[styles.statusText, { color: isTimeUp ? colors.accentPrimary : colors.textPrimary }]}>
                        {statusMessage}
                    </Text>
                    
                    {/* Timer Circle */}
                    {/* NOTE: In a real app, this would be a complex SVG or RN-reanimated component. 
                       Here, it's mocked with a border color change based on progress. */}
                    <View 
                        style={[
                            styles.timerCircle, 
                            { 
                                borderColor: colors.separator,
                                borderWidth: 8,
                                // Mock progress by changing the background color gradually
                                backgroundColor: `rgba(${parseInt(colors.accentSecondary.slice(1, 3), 16)}, ${parseInt(colors.accentSecondary.slice(3, 5), 16)}, ${parseInt(colors.accentSecondary.slice(5, 7), 16)}, ${progressPercent * 0.3})`
                            }
                        ]}
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
                    </View>
                    
                    {/* Info Text */}
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
                       {isUserPremium ?  <ThemedButton 
                            title="Premium activated"
                            disabled={true}
                            // onPress={() => router.replace(ROUTES.SETTINGS_TAB)}
                            useSecondaryColor={true}
                            containerStyle={[styles.secondaryButton, {backgroundColor: "transparent"}] }
                            icon={<Foundation name="crown" size={24} color={colors.textPrimary} />}
                            textStyle={{ fontSize: 14 }} 
                        /> :  <ThemedButton 
                            title="Edit Plan"
                            onPress={() => router.replace(ROUTES.PREMIUM_MODAL)}
                            useSecondaryColor={true}
                            containerStyle={styles.secondaryButton}
                            textStyle={{ fontSize: 14 }}
                        />}
                    </View>

                </View>
            </ScrollView>
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
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    // Timer Circle Mock
    timerCircle: {
        width: 250,
        height: 250,
        borderRadius: 125,
        borderWidth: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 20,
    },
    timerValue: {
        fontSize: 56,
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
    }
});

export default HomeScreen;