import { useState, useEffect, useCallback } from "react";
import * as storageService from "../services/storageService";
import { SetupData, SmokingLogEntry } from "../services/storageService";
import { Vibration, Platform } from "react-native";
// 1. Імпорт сповіщень
import * as Notifications from 'expo-notifications';
// Імпортуємо обидва типи тригерів, хоча використовуємо date
import { TimeIntervalTriggerInput, DateTriggerInput } from 'expo-notifications' 

// --- CONSTANTS ---
const MS_PER_SECOND = 1000;
const ACTIVE_HOURS_PER_DAY = 16;
const ACTIVE_SECONDS_PER_DAY = ACTIVE_HOURS_PER_DAY * 3600; 
const MAX_INTERVAL = 24 * 3600; 

// 🔴 ТЕСТУВАННЯ ВИМКНЕНО: Встановлено на 0.
const TEST_OVERRIDE_INTERVAL = 0; 

// 🟢 ФІКС: КОМПЕНСАЦІЯ ЗАТРИМКИ ОС.
// Зменшуємо буфер до 27 секунд (35 - 8 = 27), щоб сповіщення прийшло
// приблизно за 2-3 секунди до завершення таймера, компенсуючи лаг OS (~25 сек).
const NOTIFICATION_EARLY_BUFFER_SECONDS = 27; 

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
    
    const targetDays = TARGET_DAYS[planType as keyof typeof TARGET_DAYS] || TARGET_DAYS.balanced;
    
    // 🔴 ПОМИЛКА була тут: const reductionPerDay = Math.ceil(cigarettesPerDay / targetDays);
    
    // 🟢 ВИПРАВЛЕННЯ ПОМИЛКИ: Розраховуємо загальну накопичену суму зменшення, 
    // а потім округлюємо її, щоб зберегти плавне зменшення протягом усього плану.
    const dailyReductionRate = cigarettesPerDay / targetDays;
    
    // Розраховуємо загальне зменшення та округлюємо до найближчого цілого.
    const reductionAmount = Math.round(dailyReductionRate * daysPassed); 
    
    let newTargetCPD = cigarettesPerDay - reductionAmount;
    
    if (daysPassed >= targetDays) {
        newTargetCPD = 0;
    } else {
        // Гарантуємо, що ціль не опуститься нижче 1 сигарети, поки план не закінчиться.
        newTargetCPD = Math.max(1, newTargetCPD); 
    }
    const finalTargetCPD = newTargetCPD;

    let derivedInterval;
    if (finalTargetCPD === 0) {
        derivedInterval = MAX_INTERVAL;
    } else {
        derivedInterval = ACTIVE_SECONDS_PER_DAY / finalTargetCPD;
    }

    let finalInterval = Math.floor(Math.min(derivedInterval, MAX_INTERVAL));
    
    // Перевірка на тестовий режим
    if (TEST_OVERRIDE_INTERVAL > 0) {
        console.log(`[TEST MODE] Overriding interval to ${TEST_OVERRIDE_INTERVAL} seconds.`);
        finalInterval = TEST_OVERRIDE_INTERVAL;
    }

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

    // 🟢 ФІКС: Функція планування тепер приймає ТОЧНИЙ МІЛІСЕКУНДНИЙ ЧАС (timestamp)
    const scheduleSmokeNotification = useCallback(async (notificationTimeMs: number) => {
        // 🟢 ПОТІК: Лог на початку функції
        console.log("[FLOW] Attempting to schedule notification.");
        
        // 🟢 ДІАГНОСТИКА: Перевіряємо, чи є вже заплановані сповіщення перед плануванням нового
        try {
             const scheduledBefore = await Notifications.getAllScheduledNotificationsAsync();
             console.log(`[DIAGNOSTIC] Before scheduling, found ${scheduledBefore.length} notification(s).`);
        } catch (e) {
            console.error("Error checking scheduled notifications before planning:", e);
        }
       

        const now = Date.now();
        // Якщо час вже минув, не плануємо
        if (notificationTimeMs <= now) {
            console.log("[Notification] Scheduling skipped (Time is in the past).");
            return;
        }

        const secondsFromNow = Math.ceil((notificationTimeMs - now) / MS_PER_SECOND);

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Час вийшов! 🚬",
                    body: "Ви можете записати паління або продовжити чекати.",
                    sound: true,
                    vibrate: [0, 250, 250, 250],
                },
                // 🟢 ВИКОРИСТОВУЄМО ТРИГЕР ЗА ТОЧНОЮ ДАТОЮ (DateTriggerInput)
                trigger: {
                    type: 'date', // <--- ФІКС: Обов'язкове поле для DateTriggerInput
                    date: new Date(notificationTimeMs), // Плануємо на точний час
                    repeats: false, 
                } as DateTriggerInput, // Вказуємо тип тригера
            });
            console.log("Notification scheduled successfully for", secondsFromNow, "seconds from now (at time:", new Date(notificationTimeMs).toLocaleTimeString(), ").");
            
            // 🟢 ДІАГНОСТИКА: Перевіряємо, чи є тепер 1 заплановане сповіщення
            const scheduledAfter = await Notifications.getAllScheduledNotificationsAsync();
            console.log(`[DIAGNOSTIC] After scheduling, found ${scheduledAfter.length} notification(s).`);

        } catch (error) {
            console.error("Failed to schedule notification:", error);
        }
    }, []);

    // 🟢 ФУНКЦІЯ РОЗРАХУНКУ: determineNextAllowedTime тепер лише розраховує та оновлює стан React UI.
    // Вона повертає кількість секунд, що залишилася, для зовнішнього планування сповіщення.
    const determineNextAllowedTime = useCallback(
        (setup: SetupData, logs: SmokingLogEntry[], duration: number): number => {
            const now = Date.now();
            setIsPaused(false);
            
            // Визначаємо, чи був лог створений менше 500 мс тому
            const isFreshlyLogged = logs.length > 0 && (now - logs[logs.length - 1].timestamp < 500);
            let finalSeconds = 0;


            if (logs.length === 0) {
                setNextAllowedSmokeTime(now);
                setRemainingSeconds(0);
                // Скасування для початкового стану без логів
                Notifications.cancelAllScheduledNotificationsAsync(); 
            } else {
                const lastLog = logs[logs.length - 1];
                const nextTime = lastLog.timestamp + duration * MS_PER_SECOND;
                setNextAllowedSmokeTime(nextTime);

                const difference = nextTime - now;
                
                let secondsRemaining = Math.max(
                    0,
                    // Використовуємо Math.ceil для UI
                    Math.ceil(difference / MS_PER_SECOND) 
                );
                
                // 🟢 ФІКС: Запобігання миттєвому спрацьовуванню (race condition)
                if (secondsRemaining === 0 && duration > 0 && isFreshlyLogged) {
                    secondsRemaining = 1; 
                }
                
                finalSeconds = secondsRemaining;

                setRemainingSeconds(finalSeconds);

                // --- ДІАГНОСТИКА ---
                console.log(`[Timer] Calculated next time: ${new Date(nextTime).toLocaleTimeString()}`);
                console.log(`[Timer] Time difference: ${difference}ms. Final seconds for UI: ${finalSeconds}`);
            }
            
            return finalSeconds; // Повертаємо, скільки секунд залишилося
        },
        [] 
    );

    // --- 3. Core Function: Load/Refresh Data ---

    const loadInitialData = useCallback(async () => {
        // 🟢 ПОТІК: Лог на початку функції
        console.log("[FLOW] Starting loadInitialData (Refresh Data)");

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
            // Залишаємо скасування, якщо налаштування відсутні (очищення)
            Notifications.cancelAllScheduledNotificationsAsync(); 
        }

        setIsLoading(false);

        // 🟢 ДОДАТКОВА ПЕРЕВІРКА ДОЗВОЛІВ
        const { status } = await Notifications.getPermissionsAsync();

        if (status === 'granted') {
             // 🟢 ДІАГНОСТИКА: Перевіряємо, чи залишилися заплановані сповіщення після завантаження/оновлення
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            if (scheduled.length > 0) {
                console.log(`[DIAGNOSTIC] SUCCESS: Found ${scheduled.length} scheduled notification(s) after refresh/focus.`);
            } else {
                console.warn("[DIAGNOSTIC] FAILURE: No scheduled notifications found after refresh/focus!");
            }
        } else {
            console.warn("[DIAGNOSTIC] Cannot check scheduled status - Permissions not granted!");
        }


    }, [determineNextAllowedTime]); 

    // --- 4. Effects ---
    
    useEffect(() => {
        loadInitialData();
        
        // Запит дозволів на iOS/Android при першому завантаженні хука
        const requestPermissions = async () => {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                 const finalStatus = await Notifications.requestPermissionsAsync();
                 console.log("Notification permission status after request:", finalStatus.status);
            } else {
                console.log("Notification permissions already granted.");
            }
        };
        requestPermissions();

    }, [loadInitialData]);

    // Таймер зворотного відліку (тільки для UI)
    useEffect(() => {
        // Умова зупинки/вихіду, якщо немає даних або час вийшов
        if (
            isLoading ||
            !setupData ||
            intervalDuration <= 0 ||
            nextAllowedSmokeTime === null ||
            remainingSeconds <= 0
        ) {
            // Цей блок лише гарантує, що при виході з таймера remainingSeconds === 0
            if (remainingSeconds <= 0 && nextAllowedSmokeTime !== null) {
                 setRemainingSeconds(0);
            }
            return;
        }

        const timerInterval = setInterval(() => {
            const now = Date.now();
            const difference = nextAllowedSmokeTime - now;
            
            // Використовуємо Math.ceil для UI, щоб показати повну секунду
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

    // --- 5. Action: Record Cigarette ---

    const recordCigarette = useCallback(async () => {
        // 🟢 ПОТІК: Лог на початку функції
        console.log("[FLOW] Starting recordCigarette (New Log)");

        if (!setupData || intervalDuration <= 0) {
            console.warn(
                "Attempted to record cigarette before setup or while loading."
            );
            return;
        }
        
        // 🟢 ЯВНЕ СКАСУВАННЯ: Агресивно вбиваємо старий таймер
        // ЦЕЙ БЛОК ПОВИНЕН ЗАЛИШАТИСЯ, бо ми плануємо НОВЕ сповіщення.
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync();
        
        // Re-calculate metrics 
        const { intervalDuration: currentDuration, targetCigarettesPerDay: targetCPD } = calculatePlanMetrics(setupData);
        setIntervalDuration(currentDuration);
        setTargetCigarettesPerDay(targetCPD);

        // 1. 🟢 ФІКС: Фіксуємо ТОЧНИЙ час початку та створюємо лог
        const logTimestamp = Date.now();
        const newLogEntry: SmokingLogEntry = { timestamp: logTimestamp };
        await storageService.addSmokingLog(newLogEntry);

        // Update local state logs
        const newLogs = [...smokingLogs, newLogEntry];
        setSmokingLogs(newLogs);

        // 2. 🟢 РОЗРАХУНОК: Визначаємо точний час завершення таймера (T_end)
        const nextAllowedTimeMs = logTimestamp + currentDuration * MS_PER_SECOND;
        
        // Оновлюємо UI, повертаючи залишок секунд (для UI)
        const secondsRemaining = determineNextAllowedTime(setupData, newLogs, currentDuration);
        Vibration.vibrate(5);

        // 3. 🟢 ЯВНЕ ПЛАНУВАННЯ: Визначаємо точний час для сповіщення
        // Встановлюємо на (T_end - 27 секунд), щоб компенсувати 25-секундний лаг OS і прийти за ~2с до 0.
        const notificationTimeMs = nextAllowedTimeMs - NOTIFICATION_EARLY_BUFFER_SECONDS * MS_PER_SECOND;
        
        // Цей показник лише для логіки, чи варто планувати взагалі
        const notificationSeconds = Math.max(0, secondsRemaining - NOTIFICATION_EARLY_BUFFER_SECONDS); 

        // 🟢 ФІКС: Плануємо, використовуючи ТОЧНУ МІЛІСЕКУНДНУ ДАТУ
        if (notificationSeconds > 1) { 
             // Передаємо точний час спрацювання (T_notify)
             scheduleSmokeNotification(notificationTimeMs);
        } else {
            console.log("[Timer] Notification not scheduled (Interval too short/passed or is 0).");
        }
        
    }, [setupData, smokingLogs, determineNextAllowedTime, scheduleSmokeNotification]);

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