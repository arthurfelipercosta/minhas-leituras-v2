// src/screens/LoginScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/styles/colors';
import { RootStackParamList } from 'App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FieldErrors {
    email?: string;
    password?: string;
    confirmPassword?: string;
}

const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const LoginScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { theme } = useTheme();
    const themeColors = colors[theme];
    const styles = createStyles(theme, themeColors);

    const { signIn, signUp, resetPassword, user } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [seePassword, setSeePassword] = useState(false);
    const [seeConfirmPassword, setSeeConfirmPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const clearErrors = () => setFieldErrors({});

    React.useEffect(() => {
        if(user) {
            navigation.navigate('Profile' as any);
        }
    }, [user, navigation]);

    const handleLogin = async () => {
        const errors: FieldErrors = {};

        if (!email.trim()) {
            errors.email = 'Email obrigatório';
        } else if (!isValidEmail(email.trim())) {
            errors.email = 'Email inválido';
        }

        if (!password.trim()) {
            errors.password = 'Senha obrigatória';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            Toast.show({
                type: 'error',
                text1: 'Campos obrigatórios',
                text2: 'Preencha os campos corretamente.',
            });
            return;
        }

        try {
            setIsLoading(true);
            clearErrors();
            await signIn(email.trim(), password);
            Toast.show({
                type: 'success',
                text1: 'Login realizado!',
                text2: 'Bem-vindo de volta!',
            });
            navigation.goBack();
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Erro no login',
                text2: error.message || 'Email ou senha incorretos.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async () => {
        const errors: FieldErrors = {};

        if (!email.trim()) {
            errors.email = 'Email obrigatório';
        } else if (!isValidEmail(email.trim())) {
            errors.email = 'Email inválido';
        }

        if (!password.trim()) {
            errors.password = 'Senha obrigatória';
        } else if (password.length < 6) {
            errors.password = 'Mínimo 6 caracteres';
        }

        if (!confirmPassword.trim()) {
            errors.confirmPassword = 'Confirmação obrigatória';
        } else if (password !== confirmPassword) {
            errors.confirmPassword = 'As senhas não coincidem';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            Toast.show({
                type: 'error',
                text1: 'Campos inválidos',
                text2: 'Corrija os campos destacados.',
            });
            return;
        }

        try {
            setIsLoading(true);
            clearErrors();
            await signUp(email.trim(), password);
            Toast.show({
                type: 'success',
                text1: 'Conta criada!',
                text2: 'Bem-vindo!',
            });
            navigation.goBack();
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Erro ao criar conta',
                text2: error.message || 'Não foi possível criar a conta.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const errors: FieldErrors = {};

        if (!email.trim()) {
            errors.email = 'Email obrigatório';
        } else if (!isValidEmail(email.trim())) {
            errors.email = 'Email inválido';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            Toast.show({
                type: 'error',
                text1: 'Email inválido',
                text2: 'Digite um email válido para recuperar a senha.',
            });
            return;
        }

        try {
            setIsLoading(true);
            clearErrors();
            await resetPassword(email.trim());
            Toast.show({
                type: 'success',
                text1: 'Email enviado!',
                text2: 'Verifique sua caixa de entrada.',
            });
            setShowResetPassword(false);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Erro ao enviar email',
                text2: error.message || 'Não foi possível enviar o email.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeSwitch = () => {
        clearErrors();
        setIsLoginMode(!isLoginMode);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formContainer}>
                    <Text style={styles.title}>
                        {showResetPassword
                            ? 'Recuperar Senha'
                            : isLoginMode
                                ? 'Login'
                                : 'Criar Conta'}
                    </Text>

                    {!showResetPassword && (
                        <>
                            <View>
                                <TextInput
                                    style={[styles.input, fieldErrors.email ? styles.inputError : null]}
                                    placeholder="Email"
                                    placeholderTextColor={themeColors.textSecondary}
                                    value={email}
                                    onChangeText={(v) => {
                                        setEmail(v);
                                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                                    }}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoComplete="email"
                                />
                                {fieldErrors.email && (
                                    <Text style={styles.errorText}>{fieldErrors.email}</Text>
                                )}
                            </View>

                            <View>
                                <View style={[styles.passwordContainer, fieldErrors.password ? styles.inputError : null]}>
                                    <TextInput
                                        style={[styles.input, styles.passwordInput]}
                                        placeholder="Senha"
                                        placeholderTextColor={themeColors.textSecondary}
                                        value={password}
                                        onChangeText={(v) => {
                                            setPassword(v);
                                            if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                                        }}
                                        secureTextEntry={!seePassword}
                                        autoCapitalize="none"
                                        autoComplete="password"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setSeePassword(!seePassword)}
                                        style={styles.togglePasswordButton}
                                    >
                                        <MaterialIcons
                                            name={seePassword ? 'visibility-off' : 'visibility'}
                                            size={24}
                                            color={theme === 'dark' ? '#fff' : '#000'}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {fieldErrors.password && (
                                    <Text style={styles.errorText}>{fieldErrors.password}</Text>
                                )}
                            </View>

                            {!isLoginMode && (
                                <View>
                                    <View style={[styles.passwordContainer, fieldErrors.confirmPassword ? styles.inputError : null]}>
                                        <TextInput
                                            style={[styles.input, styles.passwordInput]}
                                            placeholder="Confirmar Senha"
                                            placeholderTextColor={themeColors.textSecondary}
                                            value={confirmPassword}
                                            onChangeText={(v) => {
                                                setConfirmPassword(v);
                                                if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                                            }}
                                            secureTextEntry={!seeConfirmPassword}
                                            autoCapitalize="none"
                                        />
                                        <TouchableOpacity
                                            onPress={() => setSeeConfirmPassword(!seeConfirmPassword)}
                                            style={styles.togglePasswordButton}
                                        >
                                            <MaterialIcons
                                                name={seeConfirmPassword ? 'visibility-off' : 'visibility'}
                                                size={24}
                                                color={theme === 'dark' ? '#fff' : '#000'}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {fieldErrors.confirmPassword && (
                                        <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={isLoginMode ? handleLogin : handleSignUp}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        {isLoginMode ? 'Entrar' : 'Criar Conta'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={handleModeSwitch}
                                disabled={isLoading}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {isLoginMode
                                        ? 'Não tem conta? Criar conta'
                                        : 'Já tem conta? Fazer login'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => { clearErrors(); setShowResetPassword(true); }}
                                disabled={isLoading}
                            >
                                <Text style={styles.linkText}>Esqueci minha senha</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {showResetPassword && (
                        <>
                            <View>
                                <TextInput
                                    style={[styles.input, fieldErrors.email ? styles.inputError : null]}
                                    placeholder="Email"
                                    placeholderTextColor={themeColors.textSecondary}
                                    value={email}
                                    onChangeText={(v) => {
                                        setEmail(v);
                                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                                    }}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoComplete="email"
                                />
                                {fieldErrors.email && (
                                    <Text style={styles.errorText}>{fieldErrors.email}</Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleResetPassword}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Enviar Email</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => { clearErrors(); setShowResetPassword(false); }}
                                disabled={isLoading}
                            >
                                <Text style={styles.linkText}>Voltar ao login</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const createStyles = (theme: 'light' | 'dark', themeColors: typeof colors.light) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        scrollContent: {
            flexGrow: 1,
            justifyContent: 'center',
            padding: 20,
        },
        formContainer: {
            width: '100%',
            maxWidth: 400,
            alignSelf: 'center',
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 30,
            textAlign: 'center',
        },
        input: {
            height: 50,
            backgroundColor: themeColors.card,
            color: themeColors.text,
            borderRadius: 8,
            paddingHorizontal: 15,
            marginBottom: 4,
            borderWidth: 1,
            borderColor: themeColors.border,
            fontSize: 16,
        },
        inputError: {
            borderColor: '#ef4444',
            borderWidth: 1.5,
        },
        errorText: {
            color: '#ef4444',
            fontSize: 12,
            marginBottom: 10,
            marginLeft: 4,
        },
        primaryButton: {
            backgroundColor: themeColors.primary,
            height: 50,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 10,
            marginBottom: 15,
        },
        primaryButtonText: {
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold',
        },
        secondaryButton: {
            height: 50,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
            borderWidth: 1,
            borderColor: themeColors.border,
        },
        secondaryButtonText: {
            color: themeColors.text,
            fontSize: 16,
        },
        linkButton: {
            padding: 10,
            alignItems: 'center',
        },
        linkText: {
            color: themeColors.primary,
            fontSize: 14,
        },
        passwordContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColors.card,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.border,
            marginBottom: 4,
            paddingHorizontal: 10,
        },
        passwordInput: {
            flex: 1,
            height: 50,
            color: themeColors.text,
            fontSize: 16,
            borderWidth: 0,
            backgroundColor: 'transparent',
            marginBottom: 0,
        },
        togglePasswordButton: {
            padding: 10,
        },
    });

export default LoginScreen;