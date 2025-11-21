import { useState, useEffect, useCallback, useMemo } from 'react';
import * as storageService from '../services/storageService';
import { SetupData, SmokingLogEntry } from '../services/storageService';

// --- INTERFACES ---

/**
 * Defines the state of the main timer.
 */
interface TimerState {
  /** Remaining time in seconds until the next allowed cigarette. */
  remainingSeconds: number;
  /** Total duration of the current interval in seconds (used for progress calculation). */
  intervalDuration: number;
  /** The time (timestamp) when the user can next smoke. */
  nextAllowedSmokeTime: number | null;
  /** True if the user can currently smoke (remainingSeconds is 0 or less). */
  isTimeUp: boolean;
  /** True if the timer is currently paused (e.g., due to inactivity time). */
  isPaused: boolean;
}

/**
 * Defines the complete state and actions returned by the hook.
 */
interface UseTimerLogicResult extends TimerState {
  /** The user's loaded setup data. Null during loading. */
  setupData: SetupData | null;
  /** Logs of past smoking events. */
  smokingLogs: SmokingLogEntry[];
  /** Loading status. */
  isLoading: boolean;
  /** Logs a new cigarette and resets the timer. */
  recordCigarette: () => Promise<void>;
  /** Formats the remaining time into HH:MM:SS string. */
  formatRemainingTime: (seconds: number) => string;
}

// --- CONSTANTS & HELPERS ---

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

/**
 * Converts total seconds into a display string (HH:MM:SS).
 */
const formatSeconds = (totalSeconds: number): string => {
  const seconds = Math.max(0, totalSeconds);
  const h = Math.floor(seconds / SECONDS_PER_HOUR);
  const m = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const s = Math.floor(seconds % SECONDS_PER_MINUTE);

  const pad = (num: number) => String(num).padStart(2, '0');

  // Show hours only if non-zero or if the remaining time is large
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
};

/**
 * Calculates the required interval duration based on the plan and daily count.
 * @param data User setup data.
 * @returns Average time in seconds between cigarettes during active hours.
 */
const calculateIntervalDuration = (data: SetupData): number => {
  // Convert 'HH:MM' time strings to minutes from midnight
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const startMinutes = timeToMinutes(data.activeStartTime);
  let endMinutes = timeToMinutes(data.activeEndTime);
  
  // Handle case where end time is the next day (e.g., 23:00 to 01:00)
  if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
  }
  
  const activeTimeMinutes = endMinutes - startMinutes;
  
  // 1. Calculate base seconds per cigarette
  // (Active Time in Minutes * 60) / Cigarettes per Day
  const baseIntervalSeconds = (activeTimeMinutes * 60) / data.cigarettesPerDay;

  // 2. Adjust based on the plan type
  let adjustmentFactor = 1.0;
  switch (data.planType) {
    case 'slow':
      adjustmentFactor = 1.0; // Minimal change for the "slow" plan (acts as baseline)
      break;
    case 'balanced':
      // The goal is to slightly increase the interval length 
      // over the course of the plan (e.g., 10% increase per week).
      // For simplicity in MVP, we just use a fixed slightly longer interval.
      adjustmentFactor = 1.1; // 10% longer interval than baseline
      break;
    case 'aggressive':
      adjustmentFactor = 1.3; // 30% longer interval than baseline
      break;
  }
  
  // In a real app, 'adjustmentFactor' would be calculated dynamically based on 
  // the 'startDate' and the current week/day to provide progressive reduction.

  return Math.round(baseIntervalSeconds * adjustmentFactor);
};

/**
 * Determines if the current time falls within the user's active hours.
 * @param setupData User setup data.
 * @param currentTime Current Date object.
 * @returns True if active, false otherwise.
 */
const isWithinActiveHours = (setupData: SetupData, currentTime: Date): boolean => {
    const timeToMinutes = (time: string): number => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    let startMinutes = timeToMinutes(setupData.activeStartTime);
    let endMinutes = timeToMinutes(setupData.activeEndTime);

    // Normalize to handle overnight periods (e.g., 22:00 to 06:00)
    if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
            return true; // Active in the evening or early morning
        }
    } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            return true; // Active during the day
        }
    }
    
    return false;
};

/**
 * Calculates the seconds remaining until the start of the next active period.
 * @param setupData User setup data.
 * @param currentTime Current Date object.
 * @returns Seconds until the next active period starts.
 */
const calculateTimeUntilActive = (setupData: SetupData, currentTime: Date): number => {
    const timeToMinutes = (time: string): number => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };
    
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMinutes = timeToMinutes(setupData.activeStartTime);
    const endMinutes = timeToMinutes(setupData.activeEndTime);

    let nextStartTimeMinutes;

    if (endMinutes < startMinutes) {
        // Overnight active time (e.g., active 22:00-06:00)
        // If current time is after active end time (06:00), wait until 22:00 today.
        if (currentMinutes >= endMinutes && currentMinutes < startMinutes) {
             // We are in the non-active period (e.g., 07:00 to 21:59). Wait until startMinutes.
             nextStartTimeMinutes = startMinutes;
        } else {
            // We are currently in the active period (or just finished). 
            // The logic here is tricky: if the timer is paused, it should reset 
            // when the non-active period starts, which is handled in the main loop.
            // When calculating 'until active', we only care if we are currently inactive 
            // and need to wait for the next active start.
            // If the current time is 01:00 (active), this function should not be called 
            // as isWithinActiveHours would be true.
            return 0; // Should not happen if called correctly
        }
    } else {
        // Daytime active time (e.g., active 08:00-22:00)
        // If current time is after active end time, wait until the next day's start time.
        if (currentMinutes >= endMinutes) {
            nextStartTimeMinutes = startMinutes + (24 * 60); // Tomorrow's start time
        } else if (currentMinutes < startMinutes) {
            // Wait for today's start time
            nextStartTimeMinutes = startMinutes;
        } else {
            return 0; // We are already active
        }
    }
    
    const minutesToNextStart = nextStartTimeMinutes - currentMinutes;
    return minutesToNextStart * 60;
};


// --- CUSTOM HOOK IMPLEMENTATION ---

export const useTimerLogic = (): UseTimerLogicResult => {
  // State for data
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [smokingLogs, setSmokingLogs] = useState<SmokingLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for timer logic
  const [nextAllowedSmokeTime, setNextAllowedSmokeTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // --- 1. Data Initialization ---
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [setup, logs] = await Promise.all([
      storageService.getSetupData(),
      storageService.getSmokingLogs(),
    ]);
    
    setSetupData(setup);
    setSmokingLogs(logs);
    setIsLoading(false);
    return { setup, logs };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- 2. Core Calculation: Interval and Next Allowed Time ---

  // Calculate the required interval duration only when setupData changes
  const intervalDuration = useMemo(() => {
    if (!setupData) return 0;
    return calculateIntervalDuration(setupData);
  }, [setupData]);

  // Function to determine the starting point for the timer
  const determineNextAllowedTime = useCallback((
    currentSetupData: SetupData, 
    currentLogs: SmokingLogEntry[], 
    duration: number
  ) => {
    const now = Date.now();
    const lastSmokeTime = currentLogs.length > 0 
      ? currentLogs[currentLogs.length - 1].timestamp 
      : Date.parse(currentSetupData.startDate); // Use start date if no logs

    // Next allowed time is Last Smoke Time + Interval Duration
    const calculatedNextTime = lastSmokeTime + (duration * MS_PER_SECOND);
    
    // Set the state
    setNextAllowedSmokeTime(calculatedNextTime);
    
    return calculatedNextTime;
  }, []);


  // --- 3. Effect to Initialize Timer State ---
  useEffect(() => {
    if (setupData && intervalDuration > 0 && !isLoading) {
        determineNextAllowedTime(setupData, smokingLogs, intervalDuration);
    }
  }, [setupData, smokingLogs, intervalDuration, isLoading, determineNextAllowedTime]);


  // --- 4. Main Timer Loop (Interval) ---

  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!setupData || intervalDuration <= 0 || nextAllowedSmokeTime === null) {
      // Nothing to run yet
      setRemainingSeconds(0);
      return;
    }

    // Set up the interval for countdown
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const nowInSeconds = Math.floor(now / MS_PER_SECOND);
      const nextTimeInSeconds = Math.floor(nextAllowedSmokeTime! / MS_PER_SECOND);
      
      const isCurrentlyActive = isWithinActiveHours(setupData, new Date(now));

      if (!isCurrentlyActive) {
          // A. PAUSE LOGIC: If outside active hours, pause the timer
          const secondsUntilActive = calculateTimeUntilActive(setupData, new Date(now));
          setRemainingSeconds(secondsUntilActive); 
          setIsPaused(true);
          return;
      }
      
      // B. RUN LOGIC: If inside active hours
      setIsPaused(false);
      
      const secondsRemaining = nextTimeInSeconds - nowInSeconds;

      if (secondsRemaining <= 0) {
        setRemainingSeconds(0);
        clearInterval(timerInterval); // Stop the countdown when time is up
        return;
      }

      setRemainingSeconds(secondsRemaining);
      
    }, MS_PER_SECOND); // Update every second

    // Cleanup function
    return () => clearInterval(timerInterval);
    
  }, [setupData, intervalDuration, nextAllowedSmokeTime]);


  // --- 5. Action: Record Cigarette ---

  const recordCigarette = useCallback(async () => {
    if (!setupData || intervalDuration <= 0) {
      console.warn("Attempted to record cigarette before setup or while loading.");
      return;
    }

    // 1. Log the event
    const newLogEntry: SmokingLogEntry = { timestamp: Date.now() };
    await storageService.addSmokingLog(newLogEntry);
    
    // 2. Update local state logs (important for immediate reactivity)
    const newLogs = [...smokingLogs, newLogEntry];
    setSmokingLogs(newLogs);
    
    // 3. Reset the timer based on the new log
    determineNextAllowedTime(setupData, newLogs, intervalDuration);
    
  }, [setupData, intervalDuration, smokingLogs, determineNextAllowedTime]);

  // --- 6. Final Result ---

  const timerState: TimerState = {
    remainingSeconds,
    intervalDuration,
    nextAllowedSmokeTime,
    isTimeUp: remainingSeconds <= 0 && !isPaused,
    isPaused,
  };

  return {
    ...timerState,
    setupData,
    smokingLogs,
    isLoading,
    recordCigarette,
    formatRemainingTime: formatSeconds,
  };
};