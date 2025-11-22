// У реальному додатку:
import * as Notifications from 'expo-notifications';
// ✅ Оновлений імпорт: Додаємо TimeIntervalTriggerInput
import { Subscription, NotificationTriggerInput, TimeIntervalTriggerInput } from 'expo-notifications';

// --- НАЛАШТУВАННЯ ---

/**
 * Інтерфейс для даних, що зберігаються у payload сповіщення.
 * Дозволяє додатку обробляти сповіщення в залежності від контексту.
 * * ✅ ВИПРАВЛЕНО: Додано індексний підпис [key: string]: unknown,
 * щоб відповідати типу Record<string, unknown>, очікуваному Expo.
 */
export interface NotificationData {
    /** * Дата закінчення таймера (коли він досягне 0) у форматі UNIX timestamp (число).
     * Змінено з Date на number для серіалізації.
     */
    timerEnd: number;
    /** Ідентифікатор таймера, якщо потрібно керувати кількома таймерами (необов'язково). */
    timerId?: string;
    
    // Індексний підпис для сумісності з Expo's NotificationContentInput['data']
    [key: string]: unknown;
}

// 1. Обов'язково встановіть обробник, щоб сповіщення з'являлися, 
// навіть якщо додаток відкритий (в foreground).
Notifications.setNotificationHandler({
  handleNotification: async (notification: Notifications.Notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, 
    shouldShowList: true,   
  }),
});


/**
 * Планує локальне сповіщення, яке спрацює за 1 секунду до кінця інтервалу.
 * * @param durationInSeconds Загальна тривалість інтервалу в секундах (наприклад, 3600).
 * @returns Проміс, що повертає ID запланованого сповіщення (string).
 */
export const scheduleTimeUpNotification = async (durationInSeconds: number): Promise<string | undefined> => {
    // Спочатку скасуйте всі попередні заплановані сповіщення, щоб уникнути дублювання
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // 1. Розраховуємо затримку: загальний час мінус 1 секунда
    const delay: number = durationInSeconds - 1;

    if (delay <= 0) {
        console.warn("Інтервал надто короткий для планування сповіщення (delay <= 0).");
        return;
    }

    // 2. Запит дозволів (це варто викликати один раз при старті додатка)
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) {
        console.error("Не надано дозвіл на сповіщення!");
        return;
    }

    // 3. Планування сповіщення
    try {
        const notificationData: NotificationData = {
            // Зберігаємо як timestamp (число)
            timerEnd: new Date(Date.now() + durationInSeconds * 1000).getTime(),
        };

        // ✅ КРИТИЧНЕ ВИПРАВЛЕННЯ: Замінюємо строковий літерал 'timeInterval'
        // на константу з Notifications.SchedulableTriggerInputTypes, 
        // як того вимагає поточна типізація Expo.
        const trigger: TimeIntervalTriggerInput = { 
            seconds: delay,
            // Використовуємо константу, оскільки TypeScript не приймає літеральний рядок 'timeInterval'
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
            // repeats: false є значенням за замовчуванням
        };
        
        const notificationId: string = await Notifications.scheduleNotificationAsync({
            content: {
                title: "⏳ Увага! Час майже вийшов!",
                body: "Залишилася лише 1 секунда до кінця вашого інтервалу.",
                data: notificationData, // Тепер повністю типізовано
                sound: 'default', 
            },
            trigger: trigger,
        });
        
        console.log(`Сповіщення заплановано (ID: ${notificationId}) і спрацює через ${delay} секунд.`);
        return notificationId;
    } catch (error) {
        console.error("Помилка при плануванні сповіщення:", error);
        return undefined;
    }
};

/**
 * Скасовує всі заплановані локальні сповіщення.
 */
export const cancelAllScheduledNotifications = async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("Усі заплановані сповіщення скасовано.");
};

// Приклад використання в логіці таймера:
/*
import { scheduleTimeUpNotification } from './path/to/NotificationService';

const handleTimerReset = (newIntervalDuration: number) => {
    // ... логіка скидання таймера ...
    
    // Плануємо сповіщення одразу після встановлення нового інтервалу
    scheduleTimeUpNotification(newIntervalDuration);
}
*/