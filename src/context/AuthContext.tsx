// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { doc, getDoc } from 'firebase/firestore';

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
    User,
    linkWithCredential
} from 'firebase/auth';
import { auth, db } from '@/config/firebaseConfig';
import { cancelAccountDeletionService, createUserProfileIfNotExists } from '@/services/userServices';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

interface AuthContextData {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    linkGoogleToAccount: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        });
    }, []);

    const checkPendingDeletion = async (user: User): Promise<boolean> => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) { return false; }

        const userData = userSnap.data();
        if (!userData.isPendingDeletion) return false;

        const deletionDate = new Date(userData.deletionScheduledDate);
        const now = new Date();

        if (now < deletionDate) {
            await auth.signOut();
            Alert.alert(
                "Conta Marcada para Exclusão",
                `Sua conta está agendada para exclusão em ${deletionDate.toLocaleDateString()}. Deseja cancelar a exclusão e reativá-la?`,
                [
                    {
                        text: "Não", style: "cancel", onPress: async () => {
                            await auth.signOut();
                        }
                    },
                    {
                        text: "Sim", onPress: async () => {
                            await cancelAccountDeletionService();
                            setUser(user);
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
            return true;
        } else {
            await auth.signOut();
            throw new Error("Esta conta deveria ter sido excluída. Entre em contato com o suporte.");
        }
    };

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
            const signInResult = await GoogleSignin.signIn();
            const idToken = signInResult.data?.idToken;

            if (!idToken) throw new Error('Não foi possível obter o token do Google.');

            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            const user = userCredential.user;

            await createUserProfileIfNotExists(
                user.uid,
                user.email!,
                user.displayName ?? undefined,
                user.photoURL ?? undefined,
            );

            const isPending = await checkPendingDeletion(user);
            if (!isPending) setUser(user);
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // usuário cancelou, não faz nada
                return;
            }
            console.error("Erro no Google Sign-In:", error);
            throw error;
        }
    };

    const linkGoogleToAccount = async () => {
        try {
            if (!auth.currentUser) throw new Error('Nenhum usuário logado.');

            await GoogleSignin.hasPlayServices();
            const signInResult = await GoogleSignin.signIn();
            const idToken = signInResult.data?.idToken;

            if (!idToken) throw new Error('Não foi possível obter o token do Google.');

            const credential = GoogleAuthProvider.credential(idToken);
            const linkedUser = await linkWithCredential(auth.currentUser!, credential);

            setUser(linkedUser.user);
            Toast.show({
                type: 'success',
                text1: 'Google vinculado!',
                text2: 'Agora você pode entrar com Google ou email/senha.',
            });
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                return;
            }
            if (error.code === 'auth/credential-already-in-use') {
                throw new Error('Esta conta Google já está vinculada a outro usuário.');
            }
            if (error.code === 'auth/provider-already-linked') {
                throw new Error('Sua conta já possui o Google vinculado.');
            }
            console.error("Erro ao vincular Google:", error);
            throw error;
        }
    }

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
        <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signUp, logout, resetPassword, changePassword, linkGoogleToAccount }}>
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