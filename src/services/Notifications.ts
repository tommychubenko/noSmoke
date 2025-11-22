// УВАГА: Оскільки це не середовище Expo, всі імпорти та функції Expo замінені 
// на заглушки, які виводять повідомлення в консоль.
// Для використання у вашому додатку Expo, замініть ці заглушки на реальні імпорти:
// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import Constants from 'expo-constants';

// --- ЕМУЛЯЦІЯ MODULES ---
const Notifications = {
    setNotificationHandler: (handler: any) => console.log("[Expo] Notification Handler Set (Placeholder)"),
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    scheduleNotificationAsync: async (config: any) => {
        console.log("-----------------------------------------");
        console.log("✅ ЛОКАЛЬНЕ СПОВІЩЕННЯ ЗАПЛАНОВАНО:");
        console.log(`Заголовок: ${config.content.title}`);
        console.log(`Тіло: ${config.content.body}`);
        console.log("-----------------------------------------");
        return "placeholder_id";
    }
};

const Device = { isDevice: true };
const Constants = { expoConfig: { extra: { eas: { projectId: 'placeholder-project-id' } } } };
const Platform = { OS: 'ios' }; // Імітація платформи

/**
 * Налаштовує обробник сповіщень (зазвичай викликається один раз при старті додатку).
 * Це потрібно для відображення сповіщень, коли додаток активний.
 */
export const setupNotificationHandler = () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowAlert: true,
        }),
    });
};

/**
 * Запитує дозвіл на надсилання сповіщень.
 */
export async function registerForNotificationsAsync() {
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            console.error('Failed to get notification permissions!');
            return false;
        }

        // Тут може бути логіка для отримання ExpoPushToken, але для локальних 
        // сповіщень це не є строго обов'язковим.
        return true;
    } else {
        console.log('Must use physical device for Push Notifications (Placeholder)');
        return true;
    }
}

/**
 * Планує локальне сповіщення, яке спрацьовує негайно, коли час закінчився.
 */
export async function scheduleTimerNotification() {
    // Спочатку перевіримо дозвіл (можливо, це робиться в App.tsx)
    const hasPermission = await Notifications.getPermissionsAsync();
    if (hasPermission.status !== 'granted') {
        await registerForNotificationsAsync();
    }
    
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "🚬 Час до наступної сигарети закінчився!",
            body: 'Ваш наступний дозволений інтервал розпочався. Продовжуйте дотримуватися плану.',
            data: { event: 'smoke_time_up' },
        },
        // Trigger: null означає, що сповіщення буде показано негайно.
        trigger: null,
    });
}