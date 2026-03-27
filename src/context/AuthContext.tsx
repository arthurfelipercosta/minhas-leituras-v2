// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
    onAuthStateChanged,
    EmailAuthProvider,
    GoogleAuthProvider,
    signInWithCredential,
    linkWithCredential,
    User
} from 'firebase/auth';
import { auth, db } from '@/config/firebaseConfig';
import { cancelAccountDeletionService, createUserProfileIfNotExists } from '@/services/userServices';

interface AuthContextData {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    linkGoogleAccount: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Configurar o Google Sign-In
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT,
        });

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user) {
                await createUserProfileIfNotExists(
                    user.uid,
                    user.email!,
                    user.displayName ?? undefined,
                    user.photoURL ?? undefined,
                );
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData.isPendingDeletion) {
                        // Se a conta está pendente de exclusão, dê a opção de cancelar
                        const deletionDate = new Date(userData.deletionScheduledDate);
                        const now = new Date();
                        if (now < deletionDate) {
                            // Ainda está no período de 15 dias, perguntar se quer cancelar
                            Alert.alert(
                                "Conta Marcada para Exclusão",
                                `Sua conta está agendada para exclusão em ${deletionDate.toLocaleDateString()}. Deseja cancelar a exclusão e reativá-la?`,
                                [
                                    {
                                        text: "Não", style: "cancel", onPress: async () => {
                                            // Apenas fazer logout novamente para não dar acesso
                                            await auth.signOut();
                                            throw new Error("Conta agendada para exclusão.");
                                        }
                                    },
                                    {
                                        text: "Sim", onPress: async () => {
                                            await cancelAccountDeletionService(); // Chama a função para cancelar
                                            setUser(user); // Define o usuário logado
                                            Toast.show({
                                                type: 'success',
                                                text1: 'Exclusão Cancelada!',
                                                text2: 'Sua conta foi reativada.',
                                            });
                                        }
                                    },
                                ],
                                { cancelable: false }
                            );
                            // O ideal é não deixar o signIn completar aqui se o usuário não cancelar a exclusão
                            await auth.signOut(); // Garante que o usuário não fica logado automaticamente
                            throw new Error("Login bloqueado: conta pendente de exclusão.");
                        } else {
                            // Já passou o período de 15 dias, a conta deveria ter sido excluída
                            // Você pode alertar o usuário e impedir o login
                            await auth.signOut();
                            throw new Error("Esta conta deveria ter sido excluída. Entre em contato com o suporte.");
                        }
                    }
                }
                setUser(user);
            }
        } catch (e: any) {
            console.error("Erro no login: ", e);
            throw e;
        }
    };

    const signInWithGoogle = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();

            // Verificar se o response foi bem-sucedido
            if (response.type === 'success') {
                const userInfo = response.data;

                // O idToken está em userInfo.idToken
                const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
                const userCredential = await signInWithCredential(auth, googleCredential);
                const user = userCredential.user;

                if (user) {
                    await createUserProfileIfNotExists(
                        user.uid,
                        user.email!,
                        user.displayName ?? undefined,
                        user.photoURL ?? undefined,
                    );
                    setUser(user);
                }
            } else {
                throw new Error('Login cancelado');
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                throw new Error('Login cancelado');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                throw new Error('Login já em andamento');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                throw new Error('Google Play Services não disponível');
            } else {
                throw error;
            }
        }
    };

    const linkGoogleAccount = async () => {
        if (!auth.currentUser) {
            throw new Error('Usuário não está logado');
        }

        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();

            // Verificar se o response foi bem-sucedido
            if (response.type === 'success') {
                const userInfo = response.data;

                // O idToken está em userInfo.idToken
                const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
                await linkWithCredential(auth.currentUser, googleCredential);

                Toast.show({
                    type: 'success',
                    text1: 'Conta Google conectada!',
                    text2: 'Sua conta Google foi vinculada com sucesso.',
                });
            } else {
                throw new Error('Login cancelado');
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                throw new Error('Login cancelado');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                throw new Error('Login já em andamento');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                throw new Error('Google Play Services não disponível');
            } else if (error.code === 'auth/provider-already-linked') {
                throw new Error('Esta conta Google já está vinculada');
            } else {
                throw error;
            }
        }
    };

    const signUp = async (email: string, password: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfileIfNotExists(
            userCredential.user.uid,
            userCredential.user.email!,
            userCredential.user.displayName ?? undefined,
            userCredential.user.photoURL ?? undefined,
        );
    };

    const logout = async () => {
        await signOut(auth);
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        if (!auth.currentUser) {
            throw new Error('Usuário não encontrado');
        }

        const credential = EmailAuthProvider.credential(
            auth.currentUser.email!,
            currentPassword
        )
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signUp,
            logout,
            resetPassword,
            changePassword,
            linkGoogleAccount,
            signInWithGoogle
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextData => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
    }
    return context;
};