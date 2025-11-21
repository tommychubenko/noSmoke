import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, StyleProp, ViewStyle, TextStyle, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';


// --- INTERFACES ---

/**
 * Defines the props for the ThemedButton component.
 */
interface ThemedButtonProps extends TouchableOpacityProps {
  /** Text displayed on the button. */
  title: string;
  /** Optional style for the button's container. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional style for the button's text. */
  textStyle?: StyleProp<TextStyle>;
  /** Optional flag to use the secondary accent color instead of the primary. */
  useSecondaryColor?: boolean;

  icon?: ReactNode;
}

// --- COMPONENT ---

/**
 * A reusable button component that automatically adapts its background 
 * and text color based on the globally selected theme.
 * @param props ThemedButtonProps including title, styles, and color preference.
 */
const ThemedButton: React.FC<ThemedButtonProps> = ({ 
  title, 
  containerStyle, 
  textStyle, 
  useSecondaryColor = false,
  icon,
  ...rest 
}) => {
  const { colors } = useTheme();

  // Determine the primary color for the button background
  const buttonColor = useSecondaryColor ? colors.accentSecondary : colors.accentPrimary;
  // Determine the text color
  const textColor = colors.textPrimary; 

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { backgroundColor: buttonColor }, 
        containerStyle
      ]}
      activeOpacity={0.8}
      {...rest}
    >
      <View style={styles.contentWrapper}>
        {/* Безпечне відображення іконки */}
        {icon ? icon : null} 
        
        <Text 
          style={[
            styles.text, 
            { color: textColor }, 
            textStyle, 
            // ВИПРАВЛЕНО: Використовуємо тернарний оператор, щоб повернути null замість булевого значення false
            icon ? styles.textWithIcon : null
          ]}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentWrapper: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWithIcon: {
    marginLeft: 8, 
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ThemedButton;