// src/components/ThemeToggleButton.tsx

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/styles/colors';

export const ThemeToggleButton: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const COLORS = colors[theme];

    return (
        <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
            <Ionicons
                name={theme === 'light' ? 'moon' : 'sunny'}
                size={24}
                color={COLORS.icon}
            />
        </TouchableOpacity>
    );
};