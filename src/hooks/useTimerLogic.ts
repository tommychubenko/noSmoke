import { useState, useEffect, useCallback } from "react";
import * as storageService from "../services/storageService";
import { SetupData, SmokingLogEntry } from "../services/storageService";
import { Vibration } from "react-native";

// --- CONSTANTS ---
const MS_PER_SECOND = 1000;
const ACTIVE_HOURS_PER_DAY = 16;
const ACTIVE_SECONDS_PER_DAY = ACTIVE_HOURS_PER_DAY * 3600; // 57600 секунд
const MAX_INTERVAL = 24 * 3600; // Обмеження: не більше 24 годин

// Цільова кількість днів для кожного плану
const TARGET_DAYS = {
    slow: 30, // 30 днів до 0 сигарет
    balanced: 20, // 20 днів до 0 сигарет
    aggressive: 10, // 10 днів до 0 сигарет
};

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

/**
 * Calculates the number of full days passed since the plan start date.
 */
const getDaysPassed = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

/**
 * Calculates the CURRENT Target CPD based on linear reduction, 
 * and then derives the required Interval.
 * * ЛОГІКА ЗМІНЕНА: Тепер ми зменшуємо кількість, а потім розраховуємо інтервал.
 */
const calculatePlanMetrics = (setup: SetupData): { intervalDuration: number; targetCigarettesPerDay: number } => {
    const { cigarettesPerDay, planType, startDate } = setup;

    if (cigarettesPerDay <= 0) {
        return { intervalDuration: MAX_INTERVAL, targetCigarettesPerDay: 0 };
    }

    // 1. Дні, що минули
    const daysPassed = getDaysPassed(startDate);

    // 2. Цільова тривалість плану в днях
    const targetDays = TARGET_DAYS[planType] || TARGET_DAYS.balanced;
    
    // 3. Коефіцієнт зменшення (на скільки одиниць зменшується CPD щодня)
    // Якщо 20 шт за 20 днів, то 20/20 = 1 шт/день.
    // Використовуємо Math.ceil, щоб гарантувати, що на останній день CPD буде 1 (або 0).
    const reductionPerDay = Math.ceil(cigarettesPerDay / targetDays);

    // 4. Розрахунок НОВОГО ЦІЛЬОВОГО CPD (Лінійне зменшення)
    const reductionAmount = reductionPerDay * daysPassed;
    
    // Нова ціль: Початкова кількість - (Крок * Кількість днів)
    let newTargetCPD = cigarettesPerDay - reductionAmount;
    
    // Обмеження цілі: мінімум 1 сигарета (якщо тільки початкова не була 0).
    if (newTargetCPD <= 0) {
        newTargetCPD = 1; 
    }
    
    // Обмеження: TargetCPD не може бути менше 1, поки дні не вичерпалися.
    // Якщо ми досягли останнього дня плану, ціль може бути 0.
    if (daysPassed >= targetDays) {
        newTargetCPD = 0; // План завершено, ціль = 0
    }
    
    const finalTargetCPD = Math.max(0, newTargetCPD);

    // 5. РОЗРАХУНОК НОВОГО ІНТЕРВАЛУ (Похідний)
    // Інтервал = Активний час / Нова цільова кількість
    let derivedInterval;
    
    if (finalTargetCPD === 0) {
        // Якщо ціль 0, інтервал - це максимальний час
        derivedInterval = MAX_INTERVAL;
    } else {
        derivedInterval = ACTIVE_SECONDS_PER_DAY / finalTargetCPD;
    }

    // 6. Обмеження інтервалу та округлення
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
    const [nextAllowedSmokeTime, setNextAllowedSmokeTime] = useState<
        number | null
    >(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // --- 2. Helper Logic ---

    const determineNextAllowedTime = useCallback(
        (setup: SetupData, logs: SmokingLogEntry[], duration: number) => {
            const now = Date.now();
            setIsPaused(false);

            if (logs.length === 0) {
                setNextAllowedSmokeTime(now);
                setRemainingSeconds(0);
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

            // Розрахунок обох метрик
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
    }, [loadInitialData]);

    useEffect(() => {
        if (
            isLoading ||
            !setupData ||
            intervalDuration <= 0 ||
            nextAllowedSmokeTime === null ||
            remainingSeconds <= 0
        ) {
            setRemainingSeconds(0);
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

    // --- 5. Action: Record Cigarette ---

    const recordCigarette = useCallback(async () => {
        if (!setupData || intervalDuration <= 0) {
            console.warn(
                "Attempted to record cigarette before setup or while loading."
            );
            return;
        }

        // Re-calculate metrics (in case the day changed)
        const { intervalDuration: currentDuration, targetCigarettesPerDay: targetCPD } = calculatePlanMetrics(setupData);
        setIntervalDuration(currentDuration);
        setTargetCigarettesPerDay(targetCPD);

        // Log the event in storage
        const newLogEntry: SmokingLogEntry = { timestamp: Date.now() };
        await storageService.addSmokingLog(newLogEntry);

        // Update local state logs
        const newLogs = [...smokingLogs, newLogEntry];
        setSmokingLogs(newLogs);

        // Reset the timer based on the new log and the re-calculated duration
        determineNextAllowedTime(setupData, newLogs, currentDuration);
        Vibration.vibrate(5)
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