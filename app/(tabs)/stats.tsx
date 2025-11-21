import React, { useMemo } from 'react';
import { ActivityIndicator, Dimensions, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import ThemedButton from '../../src/components/ThemedButton'; // FIX: Added 'src/' to the path
import { useTheme } from '../../src/hooks/useTheme';
import { useTimerLogic } from '../../src/hooks/useTimerLogic';
import { ROUTES } from '@/src/constants/Routes';
import { router } from 'expo-router';
import { SmokingLogEntry } from '@/src/services/storageService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

// --- UTILITY FUNCTIONS ---

/**
 * Filters logs to only include entries from today.
 * @param logs All smoking log entries.
 * @returns Array of today's smoking log entries.
 */
const getTodayLogs = (logs: SmokingLogEntry[]): SmokingLogEntry[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    return logs.filter(log => log.timestamp >= todayTimestamp);
};

/**
 * Calculates the average interval between today's smoked cigarettes in seconds.
 * @param todayLogs Log entries for today.
 * @returns Average interval in seconds, or 0 if less than 2 entries.
 */
const calculateAverageInterval = (todayLogs: SmokingLogEntry[]): number => {
    if (todayLogs.length < 2) return 0;

    let totalInterval = 0;
    // Sort just in case, though they should be logged chronologically
    const sortedLogs = [...todayLogs].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < sortedLogs.length; i++) {
        const intervalMs = sortedLogs[i].timestamp - sortedLogs[i - 1].timestamp;
        totalInterval += intervalMs / 1000; // Convert to seconds
    }

    return totalInterval / (sortedLogs.length - 1);
};


/**
 * Formats seconds into a human-readable string (e.g., "1h 30m").
 * @param totalSeconds The total number of seconds.
 * @returns Formatted string.
 */
const formatDuration = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '—';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    let parts = [];
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    
    return parts.length > 0 ? parts.join(' ') : '< 1m';
};

// --- STATS SCREEN COMPONENT ---

const StatsScreen = () => {
    const { colors } = useTheme();
    const { 
        setupData, 
        isLoading, 
        smokingLogs,
        intervalDuration,
        formatRemainingTime // Re-using the time formatter from the hook
    } = useTimerLogic();

    // Memoized statistical calculations
    const stats = useMemo(() => {
        const todayLogs = getTodayLogs(smokingLogs);
        const totalLogs = smokingLogs.length;
        
        const averageIntervalToday = calculateAverageInterval(todayLogs);
        
        // Target interval from setupData, converted to MM:SS string
        const targetIntervalFormatted = intervalDuration > 0 
            ? formatRemainingTime(intervalDuration) 
            : '—';

        const averageIntervalTodayFormatted = formatDuration(averageIntervalToday);

        // Calculate saved amount (using a placeholder price of $0.50 per cigarette)
        const CIGARETTE_COST_USD = 0.50; // Placeholder value
        const totalSaved = totalLogs * CIGARETTE_COST_USD;
        
        // Calculate reduction goal (Daily reduction compared to goal)
        const dailyGoal = setupData?.cigarettesPerDay || 15;
        const currentDailySmoked = todayLogs.length;
        const remainingGoal = dailyGoal - currentDailySmoked;

        return {
            todayCount: currentDailySmoked,
            totalCount: totalLogs,
            targetIntervalFormatted,
            averageIntervalTodayFormatted,
            totalSaved: totalSaved.toFixed(2),
            remainingGoal,
        };
    }, [smokingLogs, intervalDuration, setupData, formatRemainingTime]);


    // Loading state display
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
                <ActivityIndicator size="large" color={colors.accentPrimary} />
                <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Loading stats...</Text>
            </View>
        );
    }
    
    // Ensure setup is complete
    if (!setupData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
                 <View style={styles.errorContainer}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Setup Required</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        Please complete the initial setup to begin tracking your progress and view statistics.
                    </Text>
                    <View style={{ marginTop: 20 }}>
                        <ThemedButton 
                            title="Go to Setup"
                            onPress={() => { /* Navigation placeholder */ }}
                            containerStyle={{ minWidth: 200 }}
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // --- RENDER ---
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                
                {/* Overview Header Card */}
                <View style={[styles.overviewCard, { backgroundColor: colors.accentPrimary }]}>
                    <Text style={styles.overviewTitle}>Today's Progress</Text>
                    <Text style={styles.overviewText}>
                        {stats.todayCount} / {setupData.cigarettesPerDay}
                    </Text>
                    
                    {stats.remainingGoal > 0 ? (
                        <Text style={[styles.overviewStatus, { color: colors.backgroundPrimary }]}>
                            {stats.remainingGoal} remaining for goal!
                        </Text>
                    ) : (
                        <Text style={[styles.overviewStatus, { color: colors.backgroundSecondary }]}>
                            Daily goal met/exceeded. Keep pushing!
                        </Text>
                    )}
                    
                    <Text style={styles.overviewDetail}>
                        {`Plan: ${setupData.planType.charAt(0).toUpperCase() + setupData.planType.slice(1)} | Started: ${setupData.startDate}`}
                    </Text>
                </View>

                {/* Metrics Grid */}
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Key Metrics</Text>
                <View style={styles.metricsGrid}>
                    
                    {/* Card 1: Today's Smokes */}
                    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.separator }]}>
                        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Today's Smokes</Text>
                        <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{stats.todayCount}</Text>
                        <Text style={[styles.cardUnit, { color: colors.textSecondary }]}>/ {setupData.cigarettesPerDay} goal</Text>
                    </View>
                    
                    {/* Card 2: Avg. Interval Today */}
                    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.separator }]}>
                        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Avg. Interval Today</Text>
                        <Text style={[styles.cardValue, { color: colors.accentSecondary }]}>
                            {stats.averageIntervalTodayFormatted}
                        </Text>
                        <Text style={[styles.cardUnit, { color: colors.textSecondary }]}>Target: {stats.targetIntervalFormatted}</Text>
                    </View>
                    
                    {/* Card 3: Total Smokes Logged */}
                    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.separator }]}>
                        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Total Smokes Logged</Text>
                        <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{stats.totalCount}</Text>
                        <Text style={[styles.cardUnit, { color: colors.textSecondary }]}>Since start date</Text>
                    </View>

                    {/* Card 4: Estimated Saved Money (Placeholder) */}
                    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.separator }]}>
                        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Money Saved (Est.)</Text>
                        <Text style={[styles.cardValue, { color: colors.accentPrimary }]}>${stats.totalSaved}</Text>
                        <Text style={[styles.cardUnit, { color: colors.textSecondary }]}>Based on $0.50/cig</Text>
                    </View>
                </View>

                {/* Placeholder for future detailed analysis (Premium feature) */}
                <View style={[styles.premiumTeaser, { borderColor: colors.separator }]}>
                    <Text style={[styles.premiumTeaserTitle, { color: colors.textPrimary }]}>Unlock Detailed Analytics</Text>
                    <Text style={[styles.premiumTeaserText, { color: colors.textSecondary }]}>
                        Get weekly charts, streak tracking, and personalized insights with Premium.
                    </Text>
                    <ThemedButton 
                        title="Go Premium"
                        onPress={() => {  router.push(ROUTES.PREMIUM_MODAL) }}
                        useSecondaryColor={true}
                        containerStyle={{ marginTop: 15 }}
                        textStyle={{ fontSize: 14 }}
                    />
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
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 0 : 20, // Adjust bottom padding for safe area
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 15,
        marginTop: 10,
    },
    // Overview Card
    overviewCard: {
        borderRadius: 15,
        padding: 25,
        marginTop: 20,
        marginBottom: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 6,
    },
    overviewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255, 0.9)',
        marginBottom: 5,
    },
    overviewText: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
        marginVertical: 5,
    },
    overviewStatus: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 5,
    },
    overviewDetail: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255, 0.8)',
        marginTop: 10,
    },
    // Metrics Grid
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    // Individual Stat Card
    card: {
        width: (CARD_WIDTH / 2) - 10, // Two cards per row with padding
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
    // Error state
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
    // Premium Teaser
    premiumTeaser: {
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        marginBottom: 40,
    },
    premiumTeaserTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 5,
    },
    premiumTeaserText: {
        fontSize: 14,
        textAlign: 'center',
    }
});

export default StatsScreen;