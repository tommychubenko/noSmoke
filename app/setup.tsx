import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ThemedButton from '../src/components/ThemedButton';
import { ROUTES } from '../src/constants/Routes';
import { useTheme } from '../src/hooks/useTheme';
import { SetupData, saveSetupData } from '../src/services/storageService';

// Використовуємо просту TouchableOpacity для сумісності з React Native
import { TouchableOpacity as RNTouchableOpacity } from 'react-native';
const TouchableOpacity = RNTouchableOpacity; // Забезпечуємо використання базового компонента

// --- ДОПОМІЖНІ КОМПОНЕНТИ ---

// Helper component for styled text input/selection (simplified for MVP)
const SetupItem: React.FC<{ 
  label: string; 
  value: string | number; 
  onPress?: () => void;
  children: React.ReactNode;
}> = ({ label, value, onPress, children }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity 
        style={[styles.valueContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.separator }]}
        onPress={onPress}
        disabled={!onPress} // Disable if no action is provided (e.g., for direct input fields)
      >
        {children}
      </TouchableOpacity>
    </View>
  );
};


// --- ОСНОВНИЙ КОМПОНЕНТ ЕКРАНА ---

const SetupScreen = () => {
  const { colors } = useTheme();

  // --- 1. СТАН ДАНИХ ДЛЯ ФОРМИ ---
  const [activeStartTime, setActiveStartTime] = useState('08:00');
  const [activeEndTime, setActiveEndTime] = useState('23:00');
  const [cigarettesPerDay, setCigarettesPerDay] = useState(20);
  const [planType, setPlanType] = useState<'slow' | 'balanced' | 'aggressive'>('balanced');
  
  // ✅ ДОДАНО СТАНОВІ ЗМІННІ ДЛЯ ФІНАНСІВ:
  const [packPrice, setPackPrice] = useState(100); // Початкова ціна пачки
  const [cigarettesPerPack, setCigarettesPerPack] = useState(20); // Початкова кількість сигарет
  
  const [isSaving, setIsSaving] = useState(false);

  // --- 2. HANDLERS ---
  
  /**
   * Helper function to navigate to the app's main screen (tabs).
   */
  const goToApp = () => {
    router.replace(ROUTES.TABS_GROUP); 
  };
  
  /**
   * Handles the selection of the reduction plan type.
   */
  const handlePlanSelect = (type: 'slow' | 'balanced' | 'aggressive') => {
    setPlanType(type);
  };
  
  /**
   * Saves the setup data and navigates to the main app screen.
   */
  const handleSaveAndGoToApp = async () => {
    if (isSaving) return;
    
    // ✅ Додано перевірку нових полів
    if (cigarettesPerDay <= 0 || packPrice <= 0 || cigarettesPerPack <= 0) {
        Alert.alert(
            "Input error",
"Please make sure all numeric values ​​(cigarettes, pack price, cigarettes in pack) are greater than zero."
        );
        return;
    }

    setIsSaving(true);
const startDateObject = new Date();
// Just for testing - normally should be 0
const testDaysAgo = 0
// --------------------
startDateObject.setDate(startDateObject.getDate() - testDaysAgo);


    const startDateISO = startDateObject.toISOString();; // Створюємо змінну для логування
    console.log("  New Date ISO String:", startDateISO);
    
    
    const setupData: SetupData = {
      activeStartTime,
      activeEndTime,
      cigarettesPerDay,
      planType,
      startDate: startDateISO,
      // ✅ ЗБЕРІГАЄМО НОВІ ФІНАНСОВІ ДАНІ
      packPrice, 
      cigarettesPerPack,
      
    };
    
    try {
        await saveSetupData(setupData)
        
        goToApp();
    } catch (error) {
        Alert.alert("Error", "Failed to save settings. Please try again.");
        console.error("Setup save error:", error);
    } finally {
        setIsSaving(false);
        
    }
  };

  // --- 3. RENDER LOGIC ---

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <Text style={[styles.header, { color: colors.textPrimary }]}>Your quitting plan</Text>
        <Text style={[styles.subHeader, { color: colors.textSecondary }]}>
          Please input your current habits. We will use them to build an effective, personalized quit plan.
        </Text>
        
        {/* СЕКЦІЯ: МОЇ ЗВИЧКИ */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🚬 Your Habits</Text>
        
        {/* КІЛЬКІСТЬ СИГАРЕТ НА ДЕНЬ */}
        <SetupItem label="Average daily cigarettes" value={cigarettesPerDay} onPress={() => { /* Модалка для вводу числа */ }}>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{cigarettesPerDay}</Text>
          <View style={styles.stepperContainer}>
              <ThemedButton title="-" onPress={() => setCigarettesPerDay(Math.max(5, cigarettesPerDay - 1))} containerStyle={styles.stepperButton} useSecondaryColor={true} />
              <ThemedButton title="+" onPress={() => setCigarettesPerDay(cigarettesPerDay + 1)} containerStyle={styles.stepperButton} useSecondaryColor={true} />
          </View>
        </SetupItem>
        
        {/* АКТИВНИЙ ЧАС (ПОЧАТОК) */}
        <SetupItem label="Active Period (Start)" value={activeStartTime} onPress={() => { /* Модалка для вибору часу */ }}>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{activeStartTime}</Text>
        </SetupItem>
        
        {/* АКТИВНИЙ ЧАС (КІНЕЦЬ) */}
        <SetupItem label="End of Active Day" value={activeEndTime} onPress={() => { /* Модалка для вибору часу */ }}>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{activeEndTime}</Text>
        </SetupItem>
        
        {/* ✅ НОВА СЕКЦІЯ: ФІНАНСИ */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>💰 Finances</Text>

        {/* ВВІД ЦІНИ ПАЧКИ */}
        <SetupItem label="Cost per Pack (USD)" value={packPrice} onPress={() => { /* Модалка для вводу числа */ }}>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{packPrice}</Text>
          <View style={styles.stepperContainer}>
              <ThemedButton title="-" onPress={() => setPackPrice(Math.max(10, packPrice - 5))} containerStyle={styles.stepperButton} useSecondaryColor={true} />
              <ThemedButton title="+" onPress={() => setPackPrice(packPrice + 5)} containerStyle={styles.stepperButton} useSecondaryColor={true} />
          </View>
        </SetupItem>

        {/* КІЛЬКІСТЬ СИГАРЕТ У ПАЧЦІ */}
        <SetupItem label="Cigarettes per pack" value={cigarettesPerPack} onPress={() => { /* Модалка для вводу числа */ }}>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{cigarettesPerPack}</Text>
          <View style={styles.stepperContainer}>
              <ThemedButton title="-" onPress={() => setCigarettesPerPack(Math.max(10, cigarettesPerPack - 1))} containerStyle={styles.stepperButton} useSecondaryColor={true} />
              <ThemedButton title="+" onPress={() => setCigarettesPerPack(cigarettesPerPack + 1)} containerStyle={styles.stepperButton} useSecondaryColor={true} />
          </View>
        </SetupItem>
        
        {/* СЕКЦІЯ: ТИП ПЛАНУ */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🎯 Quitting Plan Type</Text>
        
        {/* ВИБІР ТИПУ ПЛАНУ */}
        <View style={[styles.planSelectorContainer, { borderColor: colors.separator }]}>
            <TouchableOpacity 
                style={[styles.planButton, planType === 'slow' && { backgroundColor: colors.accentPrimary + '15', borderColor: colors.accentPrimary }]} 
                onPress={() => handlePlanSelect('slow')}
            >
                <Text style={[styles.planTitle, { color: colors.textPrimary }]}>Slow Reduction</Text>
                <Text style={[styles.planDescription, { color: colors.textSecondary }]}>Gradual Tapering. Perfect for those quitting for the first time.</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.planButton, planType === 'balanced' && { backgroundColor: colors.accentPrimary + '15', borderColor: colors.accentPrimary }]} 
                onPress={() => handlePlanSelect('balanced')}
            >
                <Text style={[styles.planTitle, { color: colors.textPrimary }]}>Balanced</Text>
                <Text style={[styles.planDescription, { color: colors.textSecondary }]}>The standard, moderate pace with a good balance.</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.planButton, planType === 'aggressive' && { backgroundColor: colors.accentPrimary + '15', borderColor: colors.accentPrimary }]} 
                onPress={() => handlePlanSelect('aggressive')}
            >
                <Text style={[styles.planTitle, { color: colors.textPrimary }]}>Intense</Text>
                <Text style={[styles.planDescription, { color: colors.textSecondary }]}>Fast reduction. For determined users.</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>

      {/* КНОПКА ЗБЕРЕЖЕННЯ */}
      <View style={[styles.floatingButtonContainer, { borderTopColor: colors.separator }]}>
        <ThemedButton 
            title={isSaving ? "Save..." : "Begin Plan"}
            onPress={handleSaveAndGoToApp}
            disabled={isSaving}
        />
      </View>
    </SafeAreaView>
  );
};


// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the floating button
  },
  header: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    marginBottom: 30,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 25,
    marginBottom: 15,
  },
  // Input/Selection Item styles
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperButton: {
    minWidth: 50,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  // Plan Selector styles
  planSelectorContainer: {
    gap: 10,
  },
  planButton: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Default separator color
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
  },
  // Floating Button styles
  floatingButtonContainer: {
    // position: 'absolute',
    // bottom: 0,
    // left: 0,
    // right: 0,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 20 : 20,
    // borderTopWidth: 1,
    alignItems: 'center',
  },
});


export default SetupScreen;