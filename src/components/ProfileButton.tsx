// src/components/ProfileButton.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { RootStackParamList } from 'App';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/styles/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileButton = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const { theme } = useTheme();
    const themeColors = colors[theme];

    const handlePress = () => {
        if (user) {
            // Se está logado, vai para tela de perfil
            navigation.navigate('Profile' as any);
        } else {
            // Se não está logado, vai para tela de login
            navigation.navigate('Login' as any);
        }
    };

    // Determinar ícone baseado no estado de autenticação
    const iconName: 'account-circle' | 'no-accounts' = user ? 'account-circle' : 'no-accounts';
    const iconColor = user ? '#4CAF50' : themeColors.text; // Verde quando logado, tema quando deslogado

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.button}
        >
            <MaterialIcons name={iconName} size={24} color={iconColor} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        marginRight: 15,
        padding: 5,
    },
});