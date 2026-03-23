// src/screens/ProfileScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

// import de arquivos
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/styles/colors';
import { RootStackParamList } from 'App';
import { syncTitlesFromFirebase, syncTitlesToFirebase } from '@/services/syncService';
import { requestAccountDeletionService } from '@/services/userServices';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { theme } = useTheme();
    const themeColors = colors[theme];
    const styles = createStyles(theme, themeColors);

    const { user, logout, loading } = useAuth();
    const [isConnected, setIsConnected] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const syncIconName = !isConnected ? 'sync-problem' : 'sync';
    const syncLabel = !isConnected
        ? 'Sem conexão'
        : isSyncing
            ? 'Sincronizando...'
            : 'Sincronizar';

    const rotation = useRef(new Animated.Value(0)).current;
    const uploadTranslation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isSyncing) {
            const loop = Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            loop.start();
            return () => loop.stop();
        } else {
            rotation.setValue(0);
        }
    }, [isSyncing, rotation]);

    useEffect(() => {
        if (isUploading) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(uploadTranslation, {
                        toValue: -15,
                        duration: 3000,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(uploadTranslation, {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.in(Easing.quad),
                        useNativeDriver: true,
                    }),
                ])
            );
            loop.start();
            return () => loop.stop();
        } else {
            uploadTranslation.setValue(0);
        }
    }, [isUploading, uploadTranslation]);

    const uploadAnimatedStyle = { transform: [{ translateY: uploadTranslation }] };

    const rotateStyle = {
        transform: [
            {
                rotate: rotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                }),
            },
        ],
    };

    // Verificar conexão
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsConnected(state.isConnected ?? false);
        });

        return () => unsubscribe();
    }, []);

    const handleSync = async () => {
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
            // Agora: só baixa da nuvem e faz merge; o lastUpdate mais recente ganha
            await syncTitlesFromFirebase();
            Toast.show({
                type: 'success',
                text1: 'Sincronização concluída!',
                text2: 'Seus dados locais foram atualizados a partir da nuvem.',
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
    };

    const handleUpload = async () => {
        if (!isConnected) {
            Toast.show({
                type: 'error',
                text1: 'Sem conexão',
                text2: 'Verifique sua conexão com a internet.',
            });
            return;
        }

        try {
            setIsUploading(true);
            await syncTitlesToFirebase();
            Toast.show({
                type: 'success',
                text1: 'Upload concluído!',
                text2: 'Seus dados locais foram enviados para a nuvem.',
            });
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Erro no upload',
                text2: error.message || 'Não foi possível enviar os dados para a nuvem.',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleChangePassword = () => {
        navigation.navigate('ChangePassword' as any);
    };

    const handleRequestDeletion = async () => {
        Alert.alert('Confirmar Exclusão de Conta',
            'Sua conta será permanentemente excluída em 15 dias. Você pode cancelar a exclusão fazendo login novamente nesse período. Deseja continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: "Deletar",
                    onPress: async () => {
                        try {
                            await requestAccountDeletionService();
                            Toast.show({
                                type: 'success',
                                text1: 'Exclusão Solicitada!',
                                text2: 'Sua conta será excluída em 15 dias. Você foi desconectado.',
                            });
                            navigation.navigate('Login' as any); // Ou para a tela inicial
                        } catch (error: any) {
                            Toast.show({
                                type: 'error',
                                text1: 'Erro',
                                text2: error.message || 'Falha ao solicitar exclusão.',
                            });
                        }
                    },
                }
            ],
            { cancelable: false }
        );
    }

    const handleLogout = () => {
        Alert.alert(
            'Confirmar Logout',
            'Tem certeza que deseja sair?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                            Toast.show({
                                type: 'success',
                                text1: 'Logout realizado!',
                                text2: 'Até logo!',
                            });
                            navigation.goBack();
                        } catch (error: any) {
                            Toast.show({
                                type: 'error',
                                text1: 'Erro ao fazer logout',
                                text2: error.message || 'Não foi possível fazer logout.',
                            });
                        }
                    },
                },
            ]
        );
    };

    useEffect(() => {
        if (!user && !loading) {
            // Se não estiver logado, redireciona para login
            navigation.navigate('Login' as any);
        }
    }, [loading, user, navigation]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size='large' color={themeColors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    <MaterialIcons name='account-circle' size={80} color={themeColors.primary} />
                </View>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            <View style={styles.actionsSection}>
                {/* Botão SINCRONIZAR (baixar da nuvem) */}
                <TouchableOpacity
                    style={[styles.actionButton, !isConnected && styles.actionButtonDisabled]}
                    onPress={handleSync}
                    disabled={isSyncing || !isConnected}
                >
                    <View style={styles.actionButtonContent}>
                        <Animated.View style={rotateStyle}>
                            <MaterialIcons
                                name={syncIconName}
                                size={24}
                                color={themeColors.text}
                            />
                        </Animated.View>
                        <Text style={styles.actionButtonText}>
                            {syncLabel}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Botão UPLOAD (enviar para a nuvem) */}
                <TouchableOpacity
                    style={[styles.actionButton, !isConnected && styles.actionButtonDisabled]}
                    onPress={handleUpload}
                    disabled={isUploading || !isConnected}
                >
                    <View style={styles.actionButtonContent}>
                        <Animated.View style={isUploading ? uploadAnimatedStyle : undefined}>
                            <MaterialIcons name='arrow-upward'
                                size={24}
                                color={themeColors.text}
                            />
                        </Animated.View>
                        <Text style={styles.actionButtonText}>
                            {isUploading ? 'Enviando...' : 'Upload'}
                        </Text>
                        {isUploading && (
                            <ActivityIndicator
                                size='small'
                                color={themeColors.primary}
                                style={styles.syncIndicator}
                            />
                        )}
                    </View>
                </TouchableOpacity>

                {/* Botão TROCAR SENHA */}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleChangePassword}
                >
                    <View style={styles.actionButtonContent}>
                        <MaterialIcons name='lock' size={24} color={themeColors.text} />
                        <Text style={styles.actionButtonText}>Trocar Senha</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleRequestDeletion}
                >
                    <Text style={styles.deleteButtonText}>Deletar Conta</Text>
                </TouchableOpacity>

                {/* Botão SAIR */}
                <TouchableOpacity
                    style={[styles.actionButton, styles.logoutButton]}
                    onPress={handleLogout}
                >
                    <View style={styles.actionButtonContent}>
                        <MaterialIcons name='logout' size={24} color='#FF5252' />
                        <Text style={[styles.actionButtonText, styles.logoutText]}>Sair</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const createStyles = (theme: 'light' | 'dark', themeColors: typeof colors.light) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        content: {
            padding: 20,
        },
        profileSection: {
            alignItems: 'center',
            paddingVertical: 30,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
            marginBottom: 20,
        },
        avatarContainer: {
            marginBottom: 15,
        },
        email: {
            fontSize: 18,
            color: themeColors.text,
            fontWeight: '500',
        },
        actionsSection: {
            gap: 15,
        },
        actionButton: {
            backgroundColor: themeColors.card,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: themeColors.border,
        },
        actionButtonDisabled: {
            opacity: 0.5,
        },
        actionButtonContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 15,
        },
        actionButtonText: {
            fontSize: 16,
            color: themeColors.text,
            flex: 1,
        },
        syncIndicator: {
            marginLeft: 'auto',
        },
        logoutButton: {
            marginTop: 10,
            borderColor: '#FF5252',
        },
        logoutText: {
            color: '#FF5252',
        },
        deleteButton: {
            backgroundColor: 'red',
            padding: 15,
            borderRadius: 5,
            alignItems: 'center',
            marginTop: 30,
        },
        deleteButtonText: {
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold',
        },
    });

export default ProfileScreen;