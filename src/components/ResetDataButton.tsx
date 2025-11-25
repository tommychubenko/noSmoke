// src/components/ResetDataButton.tsx

import React from 'react';
import { Alert, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import ThemedButton from './ThemedButton'; 
import { AppColors, DefaultColors } from '@/src/constants/Colors'; 
import * as storageService from '@/src/services/storageService'; 
import { router } from 'expo-router';
import { ROUTES } from '@/src/constants/Routes';

// --- ІНТЕРФЕЙСИ ---

interface ResetDataButtonProps {
    /** Додатковий стиль для контейнера кнопки (наприклад, для відступів) */
    containerStyle?: StyleProp<ViewStyle>;
}

// --- ЛОГІКА СКИДАННЯ ДАНИХ (Інкапсульована) ---

/**
 * Обробник для повного скидання всіх даних додатку.
 * Включає попередження та перенаправлення на екран налаштування.
 */
const handleResetData = async () => {
    Alert.alert(
        "Скинути Всі Дані",
        "Ви впевнені, що хочете скинути всі ваші дані? Цю дію не можна скасувати.",
        [
            { text: "Скасувати", style: "cancel" },
            { 
                text: "Скинути", 
                style: "destructive", 
                onPress: async () => {
                    // 1. Виклик функції очищення всіх даних
                    await storageService.clearAllData(); 
                    // 2. Перенаправлення на екран Setup, оскільки даних більше немає
                    router.replace(ROUTES.SETUP); 
                } 
            },
        ],
        { cancelable: true }
    );
};

// --- КОМПОНЕНТ ---

const ResetDataButton: React.FC<ResetDataButtonProps> = ({ containerStyle }) => {
    return (
        <ThemedButton 
            title="Скинути Всі Дані"
            onPress={handleResetData}
            useSecondaryColor={true}
            // Використовуємо статичні кольори, оскільки це кнопка помилки/небезпеки
            containerStyle={[
                styles.resetButton, 
                { backgroundColor: DefaultColors.error },
                containerStyle // Додаємо зовнішній стиль
            ]}
            textStyle={styles.resetButtonText}
        />
    );
};

export default ResetDataButton;

// --- СТИЛІ ---

const styles = StyleSheet.create({
    resetButton: {
        // Якщо потрібно перевизначити базові стилі ThemedButton, додайте їх тут
        // Наприклад, для додавання невеликого відступу
        marginTop: 10,
    },
    resetButtonText: {
        color: DefaultColors.white, // Білий текст на червоному фоні
        fontWeight: '700',
    }
});