import ThemedButton from '@/src/components/ThemedButton';
import { ThemeName, AppColors } from '@/src/constants/Colors';
import { AppTheme, Themes } from '@/src/constants/Themes';
import { ROUTES } from '@/src/constants/Routes';
import { useTheme } from '@/src/hooks/useTheme';
import * as storageService from '@/src/services/storageService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- ДОПОМІЖНІ КОМПОНЕНТИ ---

// Перенесено SettingItem для зручності
interface SettingItemProps {
    title: string;
    description?: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    children?: React.ReactNode;
    isAction?: boolean;
    onPress?: () => void;
}

const SettingItem: React.FC<SettingItemProps> = ({ title, description, icon, children, isAction, onPress }) => {
    const { colors } = useTheme();

    const Content = (
        <View style={[styles.settingItem, { borderBottomColor: colors.separator }]}>
            <MaterialCommunityIcons 
                name={icon} 
                size={24} 
                color={colors.accentPrimary} 
                style={styles.icon}
            />
            <View style={styles.textContainer}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{title}</Text>
                {description && (
                    <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>{description}</Text>
                )}
            </View>
            <View style={styles.actionContainer}>
                {children}
            </View>
        </View>
    );

    if (isAction && onPress) {
        return <TouchableOpacity onPress={onPress}>{Content}</TouchableOpacity>;
    }

    return Content;
};


/**
 * Елемент для відображення та вибору окремої теми.
 */
const ThemeSelectorItem: React.FC<{
    theme: AppTheme;
    onSelect: (name: ThemeName) => void;
    currentThemeName: ThemeName;
    isPremiumUser: boolean;
}> = ({ theme, onSelect, currentThemeName, isPremiumUser }) => {
    const { colors } = useTheme();
    const isSelected = theme.name === currentThemeName;
    const isLocked = theme.isPremium && !isPremiumUser;

    const borderColor = isSelected ? colors.accentPrimary : colors.separator;
    const backgroundColor = isSelected ? colors.accentPrimary + '15' : colors.backgroundSecondary;

    const handlePress = () => {
        if (isLocked) {
            router.push(ROUTES.PREMIUM_MODAL);
        } else {
            onSelect(theme.name);
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.themeItem,
                { borderColor: borderColor, backgroundColor: backgroundColor }
            ]}
            onPress={handlePress}
            disabled={isSelected}
        >
            <View style={styles.themeInfo}>
               
                <View style={styles.themeColorSwatchContainer}>
                    <View style={[styles.themeColorSwatch, { backgroundColor: theme.colors.accentPrimary }]} />
                    <View style={[styles.themeColorSwatch, { backgroundColor: theme.colors.backgroundPrimary }]} />
                    <View style={[styles.themeColorSwatch, { backgroundColor: theme.colors.textPrimary }]} />
                </View>
                 <Text style={[styles.themeTitle, { color: isLocked ? colors.textSecondary : colors.textPrimary }]}>
                    {theme.displayName}
                </Text>
            </View>

            <View style={styles.themeAction}>
                {isLocked ? (
                    <MaterialCommunityIcons name="lock-outline" size={24} color={colors.textSecondary} />
                ) : isSelected ? (
                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.accentPrimary} />
                ) : (
                    <Text style={[styles.selectText, { color: colors.accentPrimary }]}>Вибрати</Text>
                )}
            </View>
        </TouchableOpacity>
    );
};


// --- ОСНОВНИЙ КОМПОНЕНТ ЕКРАНА ---

const SettingsScreen = () => {
    const { 
        colors, 
        currentThemeName, 
        setAppTheme,
        isUserPremium,
        setUserPremiumStatus,
        currentTheme
    } = useTheme(); 
    const [isSaving, setIsSaving] = useState(false);
    
    // --- Handlers ---

    /**
     * Toggles the application theme between Dark (Theme3) and Light (Theme1).
     */
    const handleThemeToggle = async (value: boolean) => {
        setIsSaving(true);
        const newThemeName: ThemeName = value 
            ? AppColors.Theme3.name as ThemeName 
            : AppColors.Theme1.name as ThemeName; 
            
        await setAppTheme(newThemeName);
        setIsSaving(false);
    };

    /**
     * Handles the selection of a theme from the full list.
     */
    const handleThemeSelect = async (newThemeName: ThemeName) => {
        try {
            setIsSaving(true);
            await setAppTheme(newThemeName);
        } catch (error) {
            Alert.alert("Помилка", "Не вдалося зберегти тему.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    /**
     * Handles the manual toggle of the Premium status (для тестування).
     */
    const handlePremiumToggle = async (value: boolean) => {
        setIsSaving(true);
        await setUserPremiumStatus(value);
        setIsSaving(false);
        Alert.alert(
            "Статус оновлено", 
            `Підписка тепер: ${value ? 'Premium' : 'Standard'}`
        );
    };

    /**
     * Prompts the user to confirm data reset.
     */
    const handleResetData = () => {
        Alert.alert(
            "Скинути Всі Дані",
            "Ви впевнені, що хочете скинути всі ваші дані? Цю дію не можна скасувати.",
            [
                { text: "Скасувати", style: "cancel" },
                { 
                    text: "Скинути", 
                    style: "destructive", 
                    onPress: async () => {
                        await storageService.clearAllData();
                        router.replace(ROUTES.SETUP); 
                    } 
                },
            ],
            { cancelable: true }
        );
    };

    // --- RENDER LOGIC ---
    const isCurrentThemeDark = currentTheme.isDark; 

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={[styles.header, { color: colors.textPrimary }]}>Налаштування</Text>

                {/* 1. РОЗДІЛ: НАЛАШТУВАННЯ ПЛАНУ - ЗАЛИШИВСЯ ТІЛЬКИ ЗАГОЛОВОК */}
                {/* <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Мій План</Text> */}

                {/* Елемент "Змінити План" ВИДАЛЕНО, щоб прибрати посилання на setup */}
                {/* ----------------------------------------------------------- */}
                
                {/* 2. РОЗДІЛ: НАЛАШТУВАННЯ ТЕМИ */}
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Зовнішній Вигляд</Text>

                {/* ШВИДКИЙ ПЕРЕМИКАЧ ТЕМНОГО РЕЖИМУ */}
                <SettingItem
                    title="Темний Режим"
                    description="Перемикання поточної палітри на Світлу/Темну за замовчуванням."
                    icon="theme-light-dark"
                >
                    <Switch
                        onValueChange={handleThemeToggle}
                        value={isCurrentThemeDark}
                        trackColor={{ false: colors.separator, true: colors.accentPrimary }}
                        thumbColor={colors.backgroundPrimary}
                        disabled={isSaving}
                    />
                </SettingItem>

                {/* ПОВНИЙ СЕЛЕКТОР КОЛЬОРОВИХ ТЕМ */}
                <View style={styles.themeSelectorContainer}>
                    {Themes.map((theme) => (
                        <ThemeSelectorItem
                            key={theme.name}
                            theme={theme}
                            onSelect={handleThemeSelect}
                            currentThemeName={currentThemeName}
                            isPremiumUser={isUserPremium}
                        />
                    ))}
                </View>

                {/* 3. РОЗДІЛ: ПРЕМІУМ (Включає Тестовий Перемикач) */}
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Преміум</Text>

                {/* ТЕСТОВИЙ ПЕРЕМИКАЧ PREMIUM/NOT PREMIUM */}
                <SettingItem
                    title="Статус Premium (Тест)"
                    description={`Поточний статус: ${isUserPremium ? "АКТИВНО" : "НЕАКТИВНО"}. Для розробки.`}
                    icon="crown-outline"
                >
                    <Switch
                        onValueChange={handlePremiumToggle}
                        value={isUserPremium}
                        trackColor={{ false: colors.separator, true: colors.accentPrimary }}
                        thumbColor={colors.backgroundPrimary}
                        disabled={isSaving}
                    />
                </SettingItem>
                
                {/* КНОПКА КЕРУВАННЯ ПІДПИСКОЮ */}
                 <SettingItem
                    title="Premium Доступ"
                    description={isUserPremium ? "Ви маєте повний доступ до всіх функцій." : "Розблокуйте всі функції та теми."}
                    icon="diamond-stone"
                    isAction={true}
                    onPress={() => router.push(ROUTES.PREMIUM_MODAL)}
                >
                    <TouchableOpacity onPress={() => router.push(ROUTES.PREMIUM_MODAL)}>
                        <View style={[styles.actionButton, { backgroundColor: colors.accentPrimary }]}>
                            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{isUserPremium ? "Керувати" : "Оновити"}</Text>
                        </View>
                    </TouchableOpacity>
                </SettingItem>


                {/* 4. РОЗДІЛ: СКИНУТИ ДАНІ */}
                <View style={[styles.resetSection, { borderTopColor: colors.separator }]}>
                    <Text style={[styles.resetTitle, { color: colors.textPrimary }]}>Скинути Дані</Text>
                    <Text style={[styles.resetDescription, { color: colors.textSecondary }]}>
                        Ця дія видалить всю вашу історію та налаштування, і ви почнете все спочатку.
                    </Text>
                    <ThemedButton 
                        title="Скинути Всі Дані"
                        onPress={handleResetData}
                        useSecondaryColor={true}
                        containerStyle={[styles.resetButton, { backgroundColor: AppColors.DefaultColors.error }]}
                        textStyle={{ color: AppColors.DefaultColors.white }}
                    />
                </View>


            </ScrollView>
        </SafeAreaView>
    );
};

// --- STYLES (УЗГОДЖЕНІ) ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 50,
    },
    header: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 30,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 25,
        marginBottom: 15,
    },
    // Setting Item styles
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    icon: {
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
        marginRight: 15,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    itemDescription: {
        fontSize: 13,
    },
    actionContainer: {
        minWidth: 100,
        alignItems: 'flex-end',
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    // Theme Selector Styles
    themeSelectorContainer: {
        gap: 12,
        marginBottom: 30,
    },
    themeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 12,
        borderWidth: 2,
    },
    themeInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    themeTitle: {
        fontSize: 16,
        fontWeight: '600',
        flexShrink: 1,
    },
    themeColorSwatchContainer: {
        flexDirection: 'row',
        gap: 4,
    },
    themeColorSwatch: {
        width: 15,
        height: 15,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    themeAction: {
        minWidth: 70,
        alignItems: 'flex-end',
    },
    selectText: {
        fontSize: 14,
        fontWeight: '700',
    },
    // Reset Section styles
    resetSection: {
        // marginTop: 50,
        paddingTop: 30,
        // borderTopWidth: 1,
    },
    resetTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    resetDescription: {
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },
    resetButton: {
        minWidth: '100%',
        marginTop: 10,
    },
});


export default SettingsScreen;