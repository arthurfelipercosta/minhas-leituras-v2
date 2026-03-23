// src/services/userServices.ts

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebaseConfig';
import { AdminConfig, UserProfile } from '@/types';

const USERS_COLLECTION = 'users';
const ADMIN_COLLECTION = 'adminConfigs';
const ADMIN_DOC = 'settings';

// ===========================
// Funções auxiliares internas
// ===========================

const getUserRef = (uid: string) => doc(db, USERS_COLLECTION, uid);
const getAdminConfigRef = () => doc(db, ADMIN_COLLECTION, ADMIN_DOC);

// ===========================
// Perfil do usuário
// ===========================

/**
 * Busca o perfil do usuário no Firestore.
 * Retorna null se o documento não existir.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const snap = await getDoc(getUserRef(uid));
        return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (e) {
        console.error('Erro ao buscar perfil do usuário:', e);
        return null;
    }
}

/**
 * Cria o documento do usuário no Firestore após cadastro/login.
 * Se o documento já existir, não sobrescreve — usa merge.
 */
export async function createUserProfileIfNotExists(uid: string, email: string, displayName?: string, photoURL?: string): Promise<void> {
    try {
        const snap = await getDoc(getUserRef(uid));

        if (snap.exists()) return; // já existe, não faz nada

        // Verifica se o usuário está na lista de premium manual antes de criar
        const plan = await checkManualPremium(uid) ? 'premium' : 'free';
        const planSource = plan === 'premium' ? 'manual' : null;

        const newProfile: UserProfile = {
            uid,
            email,
            displayName: displayName ?? '',
            photoURL: photoURL ?? null,
            createdAt: new Date().toISOString(),
            plan,
            planSource,
            planPeriod: null,        // null = sem período (gratuito ou manual)
            planGrantedAt: plan === 'premium' ? new Date().toISOString() : null,
            planExpiresAt: null,     // null = sem expiração
            isPendingDeletion: false,
            deletionScheduledDate: null,
        };

        await setDoc(getUserRef(uid), newProfile);
    } catch (e) {
        console.error('Erro ao criar perfil do usuário:', e);
        throw e;
    }
}

// ===========================
// Plano do usuário
// ===========================

/**
 * Busca o documento adminConfigs/settings e verifica se o UID
 * está na lista de premium manual.
 */
export async function checkManualPremium(uid: string): Promise<boolean> {
    try {
        const snap = await getDoc(getAdminConfigRef());
        if (!snap.exists()) return false;

        const config = snap.data() as AdminConfig;
        return config.manualPremiumUids?.includes(uid) ?? false;
    } catch (e) {
        console.error('Erro ao verificar premium manual:', e);
        return false;
    }
}

/**
 * Verifica se o plano premium do usuário ainda é válido.
 * Premium manual (planExpiresAt = null) nunca expira.
 */
export function isPremiumActive(profile: UserProfile): boolean {
    if (profile.plan !== 'premium') return false;
    if (!profile.planExpiresAt) return true; // sem expiração = manual
    return new Date(profile.planExpiresAt) > new Date();
}

/**
 * Concede premium a um usuário (chamado após pagamento confirmado).
 */
export async function grantPremium(uid: string, period: 'monthly' | 'yearly'): Promise<void> {
    const expiresAt = new Date();
    if (period === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    try {
        await updateDoc(getUserRef(uid), {
            plan: 'premium',
            planSource: 'purchase',
            planPeriod: period,
            planGrantedAt: new Date().toISOString(),
            planExpiresAt: expiresAt.toISOString(),
        });
    } catch (e) {
        console.error('Erro ao conceder premium:', e);
        throw e;
    }
}

/**
 * Revoga o premium do usuário, voltando para o plano gratuito.
 */
export async function revokePremium(uid: string): Promise<void> {
    try {
        await updateDoc(getUserRef(uid), {
            plan: 'free',
            planSource: null,
            planPeriod: null,
            planGrantedAt: null,
            planExpiresAt: null,
        });
    } catch (e) {
        console.error('Erro ao revogar premium:', e);
        throw e;
    }
}

// ===========================
// Exclusão de conta
// ===========================

export async function requestAccountDeletionService(): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('Nenhum usuário logado para solicitar a exclusão!');
    }

    const fifteenDays = new Date();
    fifteenDays.setDate(fifteenDays.getDate() + 15);

    await updateDoc(getUserRef(user.uid), {
        isPendingDeletion: true,
        deletionScheduledDate: fifteenDays.toISOString(),
    });

    await auth.signOut();
}

export async function cancelAccountDeletionService(): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('Nenhum usuário logado para cancelar a exclusão!');
    }

    await updateDoc(getUserRef(user.uid), {
        isPendingDeletion: false,
        deletionScheduledDate: null,
    });
}