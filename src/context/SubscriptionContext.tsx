// src/context/SubscriptionContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/config/firebaseConfig';
import { getUserProfile, isPremiumActive, grantPremium, revokePremium } from '@/services/userServices';
import { PlanPeriod } from '@/types';

const SUBSCRIPTION_KEY = '@mL:subscription';
const PLAN_KEY = '@mL:subscriptionPlan';

interface SubscriptionContextType {
    isPremium: boolean;
    currentPlanId: string;
    setIsPremium: (value: boolean, planId?: string) => Promise<void>;
    loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isPremium, setIsPremiumState] = useState(false);
    const [currentPlanId, setCurrentPlanId] = useState<string>('free');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSubscriptionStatus();

        const unsubscribe = auth.onAuthStateChanged(() => {
            loadSubscriptionStatus();
        });

        return () => unsubscribe();
    }, []);

    const loadSubscriptionStatus = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const profile = await getUserProfile(user.uid);

                if (profile) {
                    const active = isPremiumActive(profile);
                    const planId = !active
                        ? 'free'
                        : profile.planPeriod === 'yearly'
                            ? 'premium-yearly'
                            : 'premium';

                    setIsPremiumState(active);
                    setCurrentPlanId(planId);

                    // Atualiza o cache local
                    await Promise.all([
                        AsyncStorage.setItem(SUBSCRIPTION_KEY, active.toString()),
                        AsyncStorage.setItem(PLAN_KEY, planId),
                    ]);
                    return;
                }
            }
            const [value, planId] = await Promise.all([
                AsyncStorage.getItem(SUBSCRIPTION_KEY),
                AsyncStorage.getItem(PLAN_KEY)
            ]);
            setIsPremiumState(value === 'true');
            setCurrentPlanId(planId ?? 'free');
        } catch (error) {
            console.error('Erro ao carregar status de assinatura:', error);
        } finally {
            setLoading(false);
        }
    };

    const setIsPremium = async (value: boolean, planId?: string) => {
        try {
            const user = auth.currentUser;
            const resolvedPlanId = value ? (planId ?? 'premium') : 'free';

            if (user) {
                // Atualiza no Firebase
                if (value && planId) {
                    const period: PlanPeriod = planId === 'premium-yearly' ? 'yearly' : 'monthly';
                    await grantPremium(user.uid, period);
                } else if (!value) {
                    await revokePremium(user.uid);
                }
            }
            await Promise.all([
                AsyncStorage.setItem(SUBSCRIPTION_KEY, value.toString()),
                AsyncStorage.setItem(PLAN_KEY, resolvedPlanId)
            ]);
            setIsPremiumState(value);
            setCurrentPlanId(resolvedPlanId);
        } catch (error) {
            console.error('Erro ao salvar status de assinatura:', error);
            throw error;
        }
    };

    return (
        <SubscriptionContext.Provider value={{ isPremium, currentPlanId, setIsPremium, loading }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription deve ser usado dentro de SubscriptionProvider');
    }
    return context;
};