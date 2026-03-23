// src/components/SyncButton.tsx

import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/styles/colors';
import { RootStackParamList } from 'App';
import { fullSync } from '@/services/syncService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SyncButton = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const { theme } = useTheme();
    const themeColors = colors[theme];
    const [isConnected, setIsConnected] = React.useState(true);
    const [isSyncing, setIsSyncing] = React.useState(false);

    // Animação de rotação
    const rotation = useRef(new Animated.Value(0)).current;

    // Verificar conexão
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected ?? false);
        });

        return () => unsubscribe();
    }, []);

    // Animação de rotação quando está sincronizando
    useEffect(() => {
        let animation: any | null = null;

        if (isSyncing) {
            animation = Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            animation.start();
        } else {
            rotation.setValue(0);
        }

        return () => {
            if (animation) {
                animation?.stop();
            }
        };
    }, [isSyncing]);
    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Determinar ícone e cor
    let iconName: 'sync' | 'sync-disabled' = 'sync';
    let iconColor = themeColors.text; // Cor do tema

    if (!isConnected) {
        iconName = 'sync-disabled';
        iconColor = themeColors.textSecondary; // Cinza do tema quando sem conexão
    } else if (user) {
        iconColor = themeColors.primary; // Cor primária do tema quando logado
    }

    // Handler para toque simples
    const handlePress = async () => {
        if (user) {
            // Se está logado, sincronizar
            if (!isConnected) {
                Toast.show({
                    type: 'error',
                    text1: 'Sem conexão',
                    text2: 'Verifique sua conexão com a internet.',
                });
                return;
            }

            try {
                setIsSyncing(true);
                await fullSync();
                Toast.show({
                    type: 'success',
                    text1: 'Sincronização concluída!',
                    text2: 'Seus dados foram sincronizados com sucesso.',
                });
            } catch (error: any) {
                Toast.show({
                    type: 'error',
                    text1: 'Erro na sincronização',
                    text2: error.message || 'Não foi possível sincronizar.',
                });
            } finally {
                setIsSyncing(false);
            }
        } else {
            // Se não está logado, ir para tela de login
            navigation.navigate('Login' as any);
        }
    };

    // Handler para toque longo (sempre vai para login)
    const handleLongPress = () => {
        (user) ? navigation.navigate('Profile' as any) : navigation.navigate('Login' as any);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            onLongPress={handleLongPress}
            style={styles.button}
            disabled={isSyncing}
        >
            <Animated.View
                style={isSyncing ? { transform: [{ rotate: spin }] } : undefined}
            >
                <MaterialIcons name={iconName} size={24} color={iconColor} />
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        marginRight: 15,
        padding: 5,
    },
});