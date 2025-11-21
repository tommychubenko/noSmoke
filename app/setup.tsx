import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ThemedButton from '../src/components/ThemedButton';
import { ROUTES } from '../src/constants/Routes';
import { useTheme } from '../src/hooks/useTheme';
import { SetupData, saveSetupData } from '../src/services/storageService';

// Temporary components for the form elements (will be inline for single-file mandate)

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

// Simplified TouchableOpacity for time/number selection
const TouchableOpacity = (props: any) => <View {...props} />; // Mocking TouchableOpacity for brevity

// --- SETUP SCREEN COMPONENT ---

/**
 * The initial setup screen where the user inputs their baseline smoking habits 
 * and selects a quit plan.
 */
const SetupScreen = () => {
  const { colors } = useTheme();

  // 1. State for SetupData
  const [formData, setFormData] = useState<Omit<SetupData, 'startDate'>>({
    activeStartTime: '08:00',
    activeEndTime: '22:00',
    cigarettesPerDay: 15,
    planType: 'balanced', // Default plan
  });
  const [loading, setLoading] = useState(false);

  // 2. Handlers
  
  const handleInputChange = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };
  
  // NOTE: In a full React Native app, we would use a Picker or DatePickerModal here.
  const handleTimeSelect = (key: 'activeStartTime' | 'activeEndTime') => {
    // Mock time selection for the canvas environment
    const newTime = key === 'activeStartTime' ? '09:00' : '20:00';
    handleInputChange(key, newTime);
    
    // In a real app:
    // showDatePicker({
    //     mode: 'time',
    //     value: new Date(),
    //     onChange: (date) => handleInputChange(key, formatTime(date))
    // });
  };
  
  // 3. Form Submission
  const handleSubmit = async () => {
    if (loading) return;

    // Simple validation
    if (formData.cigarettesPerDay < 1) {
        Alert.alert("Error", "Please enter a valid number of cigarettes per day.");
        return;
    }

    setLoading(true);

    try {
      const finalData: SetupData = {
        ...formData,
        // The start date is the moment the user confirms the setup
        startDate: new Date().toISOString(), 
      };

      await saveSetupData(finalData);
      
      // Successfully saved, navigate to the main app (Home tab).
      router.replace(ROUTES.HOME_TAB);
    } catch (error) {
      console.error("Setup save error:", error);
      Alert.alert("Error", "Could not save settings. Please try again.");
      setLoading(false);
    }
  };


  // 4. Render Setup Screen
  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <Text style={[styles.header, { color: colors.textPrimary }]}>
          Welcome to QuitPal
        </Text>
        <Text style={[styles.subHeader, { color: colors.textSecondary }]}>
          Tell us a little about your current habits to start your plan.
        </Text>

        {/* --- SECTION 1: CIGARETTE COUNT --- */}
        <SetupItem label="Cigarettes per Day" value={formData.cigarettesPerDay}>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>
            {formData.cigarettesPerDay}
          </Text>
          {/* Mock increment/decrement buttons for cigarettesPerDay */}
          <View style={styles.stepperContainer}>
              <ThemedButton 
                title="−" 
                containerStyle={styles.stepperButton}
                onPress={() => handleInputChange('cigarettesPerDay', Math.max(1, formData.cigarettesPerDay - 1))}
              />
              <ThemedButton 
                title="+" 
                containerStyle={styles.stepperButton}
                onPress={() => handleInputChange('cigarettesPerDay', formData.cigarettesPerDay + 1)}
              />
          </View>
        </SetupItem>

        {/* --- SECTION 2: ACTIVE TIME --- */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Active Hours</Text>
        <SetupItem label="I wake up around" value={formData.activeStartTime} onPress={() => handleTimeSelect('activeStartTime')}>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{formData.activeStartTime}</Text>
        </SetupItem>

        <SetupItem label="I go to sleep around" value={formData.activeEndTime} onPress={() => handleTimeSelect('activeEndTime')}>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{formData.activeEndTime}</Text>
        </SetupItem>

        {/* --- SECTION 3: QUIT PLAN --- */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Quit Strategy</Text>
        
        {['slow', 'balanced', 'aggressive'].map(plan => (
          <ThemedButton 
            key={plan}
            title={plan.charAt(0).toUpperCase() + plan.slice(1)}
            containerStyle={[
              styles.planButton, 
              formData.planType === plan 
                ? { backgroundColor: colors.accentPrimary } 
                : { backgroundColor: colors.backgroundSecondary }
            ]}
            textStyle={{ color: formData.planType === plan ? colors.textPrimary : colors.textSecondary }}
            onPress={() => handleInputChange('planType', plan)}
            useSecondaryColor={formData.planType !== plan}
          />
        ))}

      </ScrollView>

      {/* --- SUBMIT BUTTON --- */}
      <View style={[styles.footer, { borderTopColor: colors.separator }]}>
        <ThemedButton 
          title={loading ? "Starting Plan..." : "Start My Quit Plan"}
          onPress={handleSubmit}
          disabled={loading}
          containerStyle={styles.submitButton}
        />
      </View>
    </View>
  );
};

// --- STYLES ---

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Status bar padding
  },
  scrollContainer: {
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
    fontWeight: '600',
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
    borderRadius: 8,
  },
  // Plan Buttons
  planButton: {
    marginBottom: 10,
    paddingVertical: 12,
    minWidth: '100%',
    borderColor: '#ccc', // Add temporary border for clarity
    borderWidth: 1,
  },
  // Footer and Submit Button
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    backgroundColor: 'white', // Will be overridden by theme in final assembly
  },
  submitButton: {
    minWidth: '100%',
  }
});

export default SetupScreen;