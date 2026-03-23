// src/screens/auth/LoginScreen.tsx

import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/context/ThemeContext';
import { auth } from '@/config/firebaseConfig';
import { colors } from '@/styles/colors';

const LoginScreen = () => {
    const { theme } = useTheme();
    const { goBack } = useNavigation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [seePassword, setSeePassword] = useState(false);
    const [isResetPasswordModalVisible, setIsResetPasswordModalVisible] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const themeColors = colors[theme];

    const getFriendlyAuthErrorMessage = (errorCode: string): string => {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'Este e-mail já está em uso. Tente fazer login ou use outro e-mail.';
            case 'auth/invalid-email':
                return 'O formato do e-mail é inválido.';
            case 'auth/operation-not-allowed':
                return 'A autenticação por e-mail/senha não está ativada. Entre em contato com o suporte.';
            case 'auth/weak-password':
                return 'A senha deve ter pelo menos 6 caracteres.';
            case 'auth/user-not-found':
                return 'Nenhum usuário encontrado com este e-mail.';
            case 'auth/wrong-password':
                return 'Senha incorreta.';
            case 'auth/too-many-requests':
                return 'Muitas tentativas falhas de login/criação. Tente novamente mais tarde.';
            case 'auth/missing-email':
                return 'Por favor, digite um e-mail válido.';
            default:
                return 'Ocorreu um erro inesperado. Verifique os dados e tente novamente.';
        }
    };

    const handleSignUp = async () => {
        if (email === '' || password === '') {
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: 'Por favor, preencha o e-mail e/ou a senha.'
            });
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            Toast.show({
                type: 'success',
                text1: 'Sucesso',
                text2: 'Conta criada com sucesso!'
            });
            goBack();
        } catch (error: any) {
            const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
            Toast.show({
                type: 'error',
                text1: 'Erro ao criar conta',
                text2: friendlyMessage
            });
            console.error("Erro completo ao criar conta:", error);
        }
    };

    const handleLogin = async () => {
        if (email === '' || password === '') {
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: 'Por favor, preencha o e-mail e/ou a senha.'
            });
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password)
            Toast.show({
                type: 'success',
                text1: 'Login bem-sucedido',
                text2: 'Bem-vindo(a) de volta!'
            });
            goBack();
        } catch (error: any) {
            const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
            Toast.show({
                type: 'error',
                text1: 'Erro ao entrar',
                text2: friendlyMessage
            });
            console.error("Erro completo ao fazer login:", error);
        }
    }

    const sendResetEmail = async () => {
        if (resetEmail.trim() === '') {
            Toast.show({
                type: 'info',
                text1: 'Aviso',
                text2: 'Por favor, digite um e-mail válido.'
            });
            return;
        }

        try {
            await sendPasswordResetEmail(auth, resetEmail.trim());
            Toast.show({
                type: 'success',
                text1: 'E-mail Enviado!',
                text2: `Verifique sua caixa de entrada (${resetEmail}) para o link de redefinição de senha.`
            });
            setIsResetPasswordModalVisible(false);
            setResetEmail('');
        } catch (error: any) {
            const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
            Toast.show({
                type: 'error',
                text1: 'Erro ao redefinir senha',
                text2: friendlyMessage
            });
            console.error("Erro completo ao redefinir senha:", error);
        }
    };

    const styles = getStyle(theme);
    
    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => goBack()} style={styles.backButton}>
                <AntDesign name="arrow-left" size={24} color={theme === 'dark' ? '#fff' : '#000'} />
            </TouchableOpacity>

            <Text style={styles.title}>Minhas Leituras</Text>
            <TextInput
                style={styles.input}
                placeholder='E-mail'
                placeholderTextColor={theme === 'dark' ? '#888888' : '#aaaaaa'}
                value={email}
                onChangeText={setEmail}
                keyboardType='email-address'
                autoCapitalize='none'
            />
            <View style={styles.passwordInputContainer}>
                <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder='Senha'
                    placeholderTextColor={theme === 'dark' ? '#ffffff' : '#000000'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!seePassword}
                />
                <TouchableOpacity
                    onPress={() => setSeePassword(!seePassword)}
                    style={styles.togglePasswordVisibilityButton}
                >
                    <Ionicons
                        name={seePassword ? 'eye-off' : 'eye'}
                        size={24}
                        color={themeColors.textSecondary}
                    />
                </TouchableOpacity>
            </View>
            <TouchableOpacity
                onPress={() => {
                    setResetEmail(email);
                    setIsResetPasswordModalVisible(true);
                }}
                style={styles.forgotPasswordButton}
            >
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
                <Button
                    title='Entrar'
                    onPress={handleLogin}
                    color={theme === 'dark' ? '#6200ee' : '#1e90ff'} />
            </View>
            <View style={styles.buttonContainer}>
                <Button
                    title='Criar Conta'
                    onPress={handleSignUp}
                    color={theme === 'dark' ? '#03dac6' : '#28a745'} />
            </View>

            <Modal
                transparent={true}
                visible={isResetPasswordModalVisible}
                onRequestClose={() => setIsResetPasswordModalVisible(false)}
                animationType="fade"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPressOut={() => setIsResetPasswordModalVisible(false)}
                >
                    <View style={styles.resetPasswordModalContainer}>
                        <Text style={styles.resetPasswordModalTitle}>Redefinir Senha</Text>
                        <Text style={styles.resetPasswordModalMessage}>
                            Digite seu e-mail para receber o link de redefinição de senha:
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Seu e-mail"
                            placeholderTextColor={theme === 'dark' ? '#888' : '#aaa'}
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.resetPasswordModalButtonContainer}>
                            <Button
                                title="Cancelar"
                                onPress={() => setIsResetPasswordModalVisible(false)}
                                color={themeColors.textSecondary}
                            />
                            <Button
                                title="Enviar"
                                onPress={sendResetEmail}
                                color={themeColors.primary}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );

}

const getStyle = (theme: 'light' | 'dark') => {
    const themeColors = colors[theme];
    return StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            padding: 20,
            backgroundColor: themeColors.background,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: themeColors.text,
            textAlign: 'center',
            marginBottom: 24,
        },
        input: {
            height: 50,
            borderColor: themeColors.border,
            borderWidth: 1,
            borderRadius: 8,
            marginBottom: 12,
            paddingHorizontal: 15,
            fontSize: 16,
            color: themeColors.text,
            backgroundColor: themeColors.card, // Usei themeColors.card para o input background
        },
        buttonContainer: {
            marginTop: 10,
        },
        backButton: {
            position: 'absolute',
            top: 40,
            left: 20,
            zIndex: 1,
        },
        passwordInputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            borderColor: themeColors.border,
            borderWidth: 1,
            borderRadius: 8,
            marginBottom: 12,
            backgroundColor: themeColors.card, // Usei themeColors.card para o password input container background
        },
        passwordInput: {
            flex: 1,
            height: 50,
            paddingHorizontal: 15,
            fontSize: 16,
            color: themeColors.text,
            borderWidth: 0,
            backgroundColor: 'transparent',
            marginBottom: 0,
        },
        togglePasswordVisibilityButton: {
            padding: 10,
            marginRight: 5,
        },
        forgotPasswordButton: {
            alignSelf: 'flex-end',
            marginBottom: 20,
            marginTop: -5,
        },
        forgotPasswordText: {
            color: themeColors.primary,
            fontSize: 14,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        resetPasswordModalContainer: {
            width: '80%',
            backgroundColor: themeColors.card,
            borderRadius: 10,
            padding: 20,
            alignItems: 'center',
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
        },
        resetPasswordModalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 10,
        },
        resetPasswordModalMessage: {
            fontSize: 16,
            color: themeColors.textSecondary,
            textAlign: 'center',
            marginBottom: 20,
        },
        resetPasswordModalButtonContainer: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: '100%',
            marginTop: 20,
        },
    });
};

export default LoginScreen;