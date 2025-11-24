import { useState, useEffect, useCallback } from "react";
import * as storageService from "../services/storageService";
import { SetupData, SmokingLogEntry } from "../services/storageService";
import { Vibration, Platform } from "react-native";
// 1. Імпорт сповіщень
import * as Notifications from 'expo-notifications';
import { TimeIntervalTriggerInput } from 'expo-notifications'

// --- CONSTANTS ---
const MS_PER_SECOND = 1000;
const ACTIVE_HOURS_PER_DAY = 16;
const ACTIVE_SECONDS_PER_DAY = ACTIVE_HOURS_PER_DAY * 3600; 
const MAX_INTERVAL = 24 * 3600; 

const TARGET_DAYS = {
    slow: 30, 
    balanced: 20, 
    aggressive: 10, 
};

// 2. Налаштування поведінки сповіщень (щоб приходили навіть коли додаток відкритий)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        // Використовуйте shouldShowBanner та shouldShowList замість shouldShowAlert
        shouldShowBanner: true,
        shouldShowList: true, 
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// --- INTERFACES ---
interface TimerState {
    remainingSeconds: number;
    intervalDuration: number;
    nextAllowedSmokeTime: number | null;
    isTimeUp: boolean;
    isPaused: boolean;
}

interface UseTimerLogicResult extends TimerState {
    setupData: SetupData | null;
    smokingLogs: SmokingLogEntry[];
    isLoading: boolean;
    recordCigarette: () => Promise<void>;
    formatRemainingTime: (seconds: number) => string;
    refreshData: () => Promise<void>;
    targetCigarettesPerDay: number; 
}

// --- UTILITY FUNCTIONS ---

const getDaysPassed = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

const calculatePlanMetrics = (setup: SetupData): { intervalDuration: number; targetCigarettesPerDay: number } => {
    const { cigarettesPerDay, planType, startDate } = setup;

    if (cigarettesPerDay <= 0) {
        return { intervalDuration: MAX_INTERVAL, targetCigarettesPerDay: 0 };
    }

    const daysPassed = getDaysPassed(startDate);
    const targetDays = TARGET_DAYS[planType] || TARGET_DAYS.balanced;
    const reductionPerDay = Math.ceil(cigarettesPerDay / targetDays);
    const reductionAmount = reductionPerDay * daysPassed;
    
    let newTargetCPD = cigarettesPerDay - reductionAmount;
    
    if (newTargetCPD <= 0) newTargetCPD = 1; 
    
    if (daysPassed >= targetDays) newTargetCPD = 0; 
    
    const finalTargetCPD = Math.max(0, newTargetCPD);

    let derivedInterval;
    if (finalTargetCPD === 0) {
        derivedInterval = MAX_INTERVAL;
    } else {
        derivedInterval = ACTIVE_SECONDS_PER_DAY / finalTargetCPD;
    }

    const finalInterval = Math.floor(Math.min(derivedInterval, MAX_INTERVAL));

    return { 
        intervalDuration: finalInterval, 
        targetCigarettesPerDay: finalTargetCPD
    };
};

// --- HOOK IMPLEMENTATION ---

export const useTimerLogic = (): UseTimerLogicResult => {
    // --- 1. State ---
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [smokingLogs, setSmokingLogs] = useState<SmokingLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [intervalDuration, setIntervalDuration] = useState(0);
    const [targetCigarettesPerDay, setTargetCigarettesPerDay] = useState(0);
    const [nextAllowedSmokeTime, setNextAllowedSmokeTime] = useState<number | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // --- 2. Helper Logic + Notification Scheduler ---

    // Функція для планування сповіщення
    // Функція для планування сповіщення
// Функція для планування сповіщення
// Функція для планування сповіщення
// Функція для планування сповіщення
const scheduleSmokeNotification = async (secondsFromNow: number) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (secondsFromNow <= 1) return; 

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Час вийшов! 🚬",
            body: "Ви можете записати паління або продовжити чекати.",
            sound: true,
            vibrate: [0, 250, 250, 250],
        },
        // --- ФІКС: Приведення типу ---
        trigger: {
            seconds: secondsFromNow,
            repeats: false, 
        } as TimeIntervalTriggerInput, // <--- Використовуємо 'as'
    });
};

    const determineNextAllowedTime = useCallback(
        (setup: SetupData, logs: SmokingLogEntry[], duration: number) => {
            const now = Date.now();
            setIsPaused(false);

            if (logs.length === 0) {
                setNextAllowedSmokeTime(now);
                setRemainingSeconds(0);
                // Якщо логів немає, можна курити відразу - сповіщення не потрібне (або можна відразу)
                Notifications.cancelAllScheduledNotificationsAsync(); 
            } else {
                const lastLog = logs[logs.length - 1];
                const nextTime = lastLog.timestamp + duration * MS_PER_SECOND;
                setNextAllowedSmokeTime(nextTime);

                const difference = nextTime - now;
                const secondsRemaining = Math.max(
                    0,
                    Math.ceil(difference / MS_PER_SECOND)
                );
                
                setRemainingSeconds(secondsRemaining);

                // --- ТУТ ПЛАНУЄМО СПОВІЩЕННЯ ---
                // Якщо залишився час (> 0), плануємо сповіщення
                if (secondsRemaining > 0) {
                    scheduleSmokeNotification(secondsRemaining);
                } else {
                    // Якщо час вже вийшов, переконуємось, що старих сповіщень немає
                    Notifications.cancelAllScheduledNotificationsAsync();
                }
            }
        },
        []
    );

    // --- 3. Core Function: Load/Refresh Data ---

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);

        const logs = await storageService.getSmokingLogs();
        setSmokingLogs(logs);

        const setup = await storageService.getSetupData();
        if (setup) {
            setSetupData(setup);
            const { intervalDuration: duration, targetCigarettesPerDay: targetCPD } = calculatePlanMetrics(setup); 
            setIntervalDuration(duration);
            setTargetCigarettesPerDay(targetCPD); 

            determineNextAllowedTime(setup, logs, duration);
        } else {
            setSetupData(null);
            setIntervalDuration(0);
            setTargetCigarettesPerDay(0);
            setNextAllowedSmokeTime(null);
            setRemainingSeconds(0);
        }

        setIsLoading(false);
    }, [determineNextAllowedTime]);

    // --- 4. Effects ---

    useEffect(() => {
        loadInitialData();
        
        // Запит дозволів на iOS/Android при першому завантаженні хука
        const requestPermissions = async () => {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                await Notifications.requestPermissionsAsync();
            }
        };
        requestPermissions();

    }, [loadInitialData]);

    // Таймер зворотного відліку (тільки для UI)
    useEffect(() => {
        if (
            isLoading ||
            !setupData ||
            intervalDuration <= 0 ||
            nextAllowedSmokeTime === null ||
            remainingSeconds <= 0
        ) {
            if (remainingSeconds <= 0 && nextAllowedSmokeTime !== null) {
                 setRemainingSeconds(0);
            }
            return;
        }

        const timerInterval = setInterval(() => {
            const now = Date.now();
            const difference = nextAllowedSmokeTime - now;
            const secondsRemaining = Math.max(
                0,
                Math.ceil(difference / MS_PER_SECOND)
            );

            if (secondsRemaining === 0) {
                setRemainingSeconds(0);
                clearInterval(timerInterval);
                return;
            }

            setRemainingSeconds(secondsRemaining);
        }, MS_PER_SECOND);

        return () => clearInterval(timerInterval);
    }, [setupData, intervalDuration, nextAllowedSmokeTime, isLoading]); 
    // Примітка: remainingSeconds видалено з deps, щоб уникнути re-render loop, але логіка всередині працює коректно

    // --- 5. Action: Record Cigarette ---

    const recordCigarette = useCallback(async () => {
        if (!setupData || intervalDuration <= 0) {
            console.warn(
                "Attempted to record cigarette before setup or while loading."
            );
            return;
        }

        // Re-calculate metrics 
        const { intervalDuration: currentDuration, targetCigarettesPerDay: targetCPD } = calculatePlanMetrics(setupData);
        setIntervalDuration(currentDuration);
        setTargetCigarettesPerDay(targetCPD);

        // Log the event 
        const newLogEntry: SmokingLogEntry = { timestamp: Date.now() };
        await storageService.addSmokingLog(newLogEntry);

        // Update local state logs
        const newLogs = [...smokingLogs, newLogEntry];
        setSmokingLogs(newLogs);

        // Reset the timer AND Schedule Notification (відбувається всередині determineNextAllowedTime)
        determineNextAllowedTime(setupData, newLogs, currentDuration);
        Vibration.vibrate(5);
    }, [setupData, smokingLogs, determineNextAllowedTime]);

    // --- 6. Final Result ---

    const timerState: TimerState = {
        remainingSeconds,
        intervalDuration,
        nextAllowedSmokeTime,
        isTimeUp: remainingSeconds <= 0 && !isPaused,
        isPaused,
    };

    const formatRemainingTime = (seconds: number): string => {
        const absSeconds = Math.abs(seconds);
        const h = Math.floor(absSeconds / 3600);
        const m = Math.floor((absSeconds % 3600) / 60);
        const s = absSeconds % 60;

        const parts = [h, m, s].map((v) => (v < 10 ? "0" + v : v));
        return parts.join(":");
    };

    const result: UseTimerLogicResult = {
        ...timerState,
        setupData,
        smokingLogs,
        isLoading,
        recordCigarette,
        formatRemainingTime,
        refreshData: loadInitialData,
        targetCigarettesPerDay,
    };

    return result;
};