import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import React from 'react';
import {  ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ThemedButton from '../src/components/ThemedButton';

import { DefaultColors } from '@/src/constants/Colors';
import { useTheme } from '@/src/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAppSettings } from '@/src/services/storageService';
import { ROUTES } from '@/src/constants/Routes';


// Список преміум-функцій для відображення
const premiumFeatures = [
    { name: "Детальна Аналітика", icon: "chart-bar", description: "Глибоке розуміння ваших звичок і прогресу." },
    { name: "Спеціальні Теми", icon: "palette-outline", description: "Персоналізуйте зовнішній вигляд програми за допомогою ексклюзивних тем." },
    { name: "Хмарна Синхронізація", icon: "cloud-check-outline", description: "Безпечне резервне копіювання та синхронізація на всіх ваших пристроях." },
    { name: "Необмежена Історія", icon: "history", description: "Доступ до всіх ваших записів куріння без обмежень." },
    { name: "Ексклюзивні Досягнення", icon: "trophy-outline", description: "Додаткові нагороди та мотиваційні значки." },
];

// --- COMPONENT ---

const PremiumModalScreen = () => {
    // --- ЗМІНА: ВИКОРИСТОВУЄМО АВТОРИТЕТНИЙ isUserPremium З ХУКА ---
    const { colors, isUserPremium } = useTheme();
    
    // --- Handlers ---
    
    const handleMainAction = () => {
        if (isUserPremium) {
            // If already premium, just close the modal
            router.back();
        } else {
            // Simulate payment process
            console.log("Initiating purchase...");
            // For now, close after a simulated delay
            setTimeout(() => {
                alert('Покупка ініційована. Успіх буде підтверджено після завершення платежу.');
            }, 1000);
        }
    };

    // Dynamic Text Content
    const headerTitle = isUserPremium ? "Дякуємо, Premium!" : "Перейдіть на Premium";
    const headerSubtitle = isUserPremium 
        ? "Ваш повний доступ активовано. Насолоджуйтесь усіма функціями!"
        : "Розблокуйте повну потужність додатку та досягайте своїх цілей швидше.";
    const buttonTitle = isUserPremium ? "Продовжити" : "Придбати Premium";
    
    return (
        <SafeAreaView 
            style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
            edges={['top', 'bottom']}
        >
            {/* Close Button */}
            <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() =>router.back()}
            >
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Header Section */}
                <View style={styles.headerContainer}>
                    <MaterialCommunityIcons 
                        name="crown" 
                        size={60} 
                        color={DefaultColors.success} // Use a static color for the crown
                        style={styles.crownIcon} 
                    />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{headerTitle}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{headerSubtitle}</Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                    {premiumFeatures.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <MaterialCommunityIcons 
                                name={feature.icon as any} 
                                size={30} 
                                color={colors.accentPrimary} 
                                style={styles.featureIcon}
                            />
                            <View style={styles.featureTextContainer}>
                                <Text style={[styles.featureName, { color: colors.textPrimary }]}>
                                    {feature.name}
                                </Text>
                                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                                    {feature.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

            </ScrollView>
            
            {/* Footer with Main Action Button */}
            <View style={[styles.footer, { backgroundColor: colors.backgroundPrimary, borderTopColor: colors.separator }]}>
                <ThemedButton
                    title={buttonTitle}
                    onPress={handleMainAction}
                    containerStyle={styles.mainButton}
                />
                {!isUserPremium && (
                    <TouchableOpacity>
                        <Text style={[styles.restoreText, { color: colors.textSecondary }]}>Відновити Покупку</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

// --- STYLES (unchanged) ---
const styles = StyleSheet.create({
    // ... (Your original styles)
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 150 },
    closeButton: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 10, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 5 },
    headerContainer: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
    crownIcon: { marginBottom: 15 },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 10 },
    featuresList: { marginBottom: 30, paddingHorizontal: 25 },
    featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    featureIcon: { marginRight: 15, minWidth: 30 },
    featureTextContainer: { flex: 1 },
    featureName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
    featureDescription: { fontSize: 14, lineHeight: 20 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center', borderTopWidth: 1 },
    mainButton: { width: '100%', marginBottom: 10 },
    restoreText: { fontSize: 14, fontWeight: '500', padding: 5 }
});

export default PremiumModalScreen;