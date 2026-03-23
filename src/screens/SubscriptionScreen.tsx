// src/screens/SubscriptionScreen.tsx

// import de pacotes
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

// import de arquivos
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { colors } from '@/styles/colors';
import { Plan } from '@/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 80; // Largura do card com margens
const CARD_SPACING = 20;

const SubscriptionScreen: React.FC = () => {
    const { theme } = useTheme();
    const { isPremium, currentPlanId, setIsPremium } = useSubscription();
    const navigation = useNavigation();
    const themeColors = colors[theme];
    const styles = createStyles(theme, themeColors);

    // Estado para controlar qual card está selecionado
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [scaleAnim] = useState(new Animated.Value(1));

    // Definição dos planos
    const plans: Plan[] = [
        {
            id: 'free',
            name: 'Grátis',
            price: 0,
            period: 'monthly',
            features: [
                'Acesso completo ao app',
                'Anúncios exibidos',
                'Sincronização básica',
            ],
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 5.00,
            period: 'monthly',
            features: [
                'Tudo do plano Grátis',
                'Sem anúncios',
                'Sincronização avançada',
                'Backup automático',
                'Suporte prioritário',
            ],
            popular: true,
        },
        {
            id: 'premium-yearly',
            name: 'Premium Anual',
            price: 48.00,
            period: 'yearly',
            originalPrice: 60.00,
            features: [
                'Tudo do Premium',
                'Economia de 20%',
                'Backup ilimitado',
                'Temas exclusivos',
                'Suporte 24/7',
            ],
            popular: false,
            savings: 'Economize R$ 12,00',
        },
    ];

    const handlePlanSelect = (planId: string) => {
        setSelectedPlan(planId);

        // Animação sutil ao selecionar
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleSubscribe = async (plan: Plan) => {
        if (plan.id === 'free') {
            // Permite voltar para o plano grátis
            try {
                await setIsPremium(false);
                Toast.show({
                    type: 'success',
                    text1: 'Plano Grátis Ativado',
                    text2: 'Você voltou para o plano grátis.',
                });
                // Não volta para a tela anterior, deixa o usuário ver a mudança
            } catch (error) {
                Toast.show({
                    type: 'error',
                    text1: 'Erro ao alterar plano',
                    text2: 'Tente novamente mais tarde.',
                });
            }
            return;
        }

        try {
            // Aqui você integraria com o sistema de pagamento real
            // Por enquanto, apenas simula a assinatura
            await setIsPremium(true, plan.id);
            Toast.show({
                type: 'success',
                text1: 'Assinatura ativada!',
                text2: `Você agora tem acesso ao ${plan.name}.`,
            });
            navigation.goBack();
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Erro ao processar assinatura',
                text2: 'Tente novamente mais tarde.',
            });
        }
    };

    const handleRestore = async () => {
        Toast.show({
            type: 'info',
            text1: 'Restaurando compras...',
            text2: 'Verificando suas compras anteriores.',
        });
        // Lógica para restaurar compras
    };

    const renderPlanCard = (plan: Plan, index: number) => {
        const isSelected = selectedPlan === plan.id;
        // Corrigido: verifica o plano específico, não apenas se é premium
        const isCurrentPlan = currentPlanId === plan.id;

        const monthlyPrice = plan.period === 'yearly'
            ? (plan.price / 12).toFixed(2)
            : plan.price;

        return (
            <Animated.View
                key={plan.id}
                style={[
                    styles.planCard,
                    plan.popular && styles.planCardPopular,
                    isSelected && styles.planCardSelected,
                    isCurrentPlan && styles.planCardCurrent,
                    { transform: [{ scale: isSelected ? scaleAnim : 1 }] },
                ]}
            >
                {plan.popular && (
                    <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>MAIS POPULAR</Text>
                    </View>
                )}

                {isCurrentPlan && (
                    <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>SEU PLANO</Text>
                    </View>
                )}

                {plan.savings && (
                    <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>{plan.savings}</Text>
                    </View>
                )}

                <View style={styles.planHeader}>
                    <Text style={[
                        styles.planName,
                        plan.popular && styles.planNamePopular
                    ]}>
                        {plan.name}
                    </Text>

                    <View style={styles.priceContainer}>
                        <Text style={[
                            styles.price,
                            plan.popular && styles.pricePopular
                        ]}>
                            R$ {plan.price.toFixed(2).replace('.', ',')}
                        </Text>
                        <Text style={styles.pricePeriod}>
                            /{plan.period === 'yearly' ? 'ano' : 'mês'}
                        </Text>
                    </View>

                    {plan.period === 'yearly' && (
                        <Text style={styles.monthlyEquivalent}>
                            R$ {monthlyPrice}/mês
                        </Text>
                    )}

                    {plan.originalPrice && (
                        <View style={styles.originalPriceContainer}>
                            <Text style={styles.originalPrice}>
                                De R$ {plan.originalPrice.toFixed(2).replace('.', ',')}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.featuresContainer}>
                    {plan.features.map((feature, idx) => (
                        <View key={idx} style={styles.featureRow}>
                            <Text style={[
                                styles.featureIcon,
                                plan.popular && styles.featureIconPopular
                            ]}>
                                ✓
                            </Text>
                            <Text style={[
                                styles.feature,
                                plan.popular && styles.featurePopular
                            ]}>
                                {feature}
                            </Text>
                        </View>
                    ))}
                </View>

                {!isCurrentPlan && (
                    <TouchableOpacity
                        style={[
                            styles.subscribeButton,
                            plan.popular && styles.subscribeButtonPopular,
                            isSelected && styles.subscribeButtonSelected,
                        ]}
                        onPress={() => {
                            handlePlanSelect(plan.id);
                            setTimeout(() => handleSubscribe(plan), 200);
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.subscribeButtonText,
                            plan.popular && styles.subscribeButtonTextPopular
                        ]}>
                            {plan.id === 'free' ? 'Continuar Grátis' : 'Assinar Agora'}
                        </Text>
                    </TouchableOpacity>
                )}

                {isCurrentPlan && (
                    <View style={styles.currentPlanIndicator}>
                        <Text style={styles.currentPlanText}>Plano Ativo</Text>
                    </View>
                )}
            </Animated.View>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Escolha seu Plano</Text>
                <Text style={styles.subtitle}>
                    Desbloqueie recursos exclusivos e aproveite sem interrupções
                </Text>
            </View>

            <View style={styles.plansContainer}>
                {plans.map((plan, index) => renderPlanCard(plan, index))}
            </View>

            {!isPremium && (
                <TouchableOpacity
                    style={styles.restoreButton}
                    onPress={handleRestore}
                >
                    <Text style={styles.restoreButtonText}>
                        Restaurar Compras Anteriores
                    </Text>
                </TouchableOpacity>
            )}

            <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimer}>
                    • A assinatura será renovada automaticamente{'\n'}
                    • Você pode cancelar a qualquer momento{'\n'}
                    • O pagamento será cobrado na sua conta da App Store/Google Play{'\n'}
                    • A renovação automática pode ser desativada nas configurações da sua conta
                </Text>
            </View>
        </ScrollView>
    );
};

const createStyles = (theme: 'light' | 'dark', themeColors: typeof colors.light) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        contentContainer: {
            paddingBottom: 40,
        },
        header: {
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 30,
            alignItems: 'center',
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: themeColors.text,
            textAlign: 'center',
            marginBottom: 12,
        },
        subtitle: {
            fontSize: 16,
            color: themeColors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
        },
        plansContainer: {
            paddingHorizontal: 20,
            gap: 24,
        },
        planCard: {
            backgroundColor: themeColors.card,
            borderRadius: 20,
            padding: 24,
            borderWidth: 2,
            borderColor: themeColors.border,
            minHeight: 400,
            position: 'relative',
            ...(theme === 'light'
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                }
                : {
                    borderWidth: 1,
                }),
        },
        planCardPopular: {
            borderColor: themeColors.primary,
            borderWidth: 3,
            backgroundColor: theme === 'dark'
                ? themeColors.card
                : themeColors.primary + '08',
        },
        planCardSelected: {
            borderColor: themeColors.primary,
            transform: [{ scale: 1.02 }],
        },
        planCardCurrent: {
            opacity: 0.8,
        },
        popularBadge: {
            position: 'absolute',
            top: -12,
            left: '50%',
            marginLeft: -60,
            backgroundColor: themeColors.primary,
            paddingHorizontal: 20,
            paddingVertical: 6,
            borderRadius: 20,
            zIndex: 1,
        },
        popularBadgeText: {
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 'bold',
            letterSpacing: 0.5,
        },
        currentBadge: {
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: themeColors.ongoing,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
        },
        currentBadgeText: {
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
        },
        savingsBadge: {
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: themeColors.warning,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
        },
        savingsBadgeText: {
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
        },
        planHeader: {
            marginTop: 20,
            marginBottom: 24,
            alignItems: 'center',
        },
        planName: {
            fontSize: 28,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 16,
        },
        planNamePopular: {
            color: themeColors.primary,
            fontSize: 32,
        },
        priceContainer: {
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'center',
            marginBottom: 8,
        },
        price: {
            fontSize: 40,
            fontWeight: 'bold',
            color: themeColors.text,
        },
        pricePopular: {
            color: themeColors.primary,
            fontSize: 48,
        },
        pricePeriod: {
            fontSize: 18,
            color: themeColors.textSecondary,
            marginLeft: 6,
        },
        monthlyEquivalent: {
            fontSize: 14,
            color: themeColors.textSecondary,
            fontStyle: 'italic',
            marginTop: 4,
        },
        originalPriceContainer: {
            marginTop: 8,
        },
        originalPrice: {
            fontSize: 14,
            color: themeColors.textSecondary,
            textDecorationLine: 'line-through',
        },
        featuresContainer: {
            flex: 1,
            marginBottom: 24,
        },
        featureRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 14,
        },
        featureIcon: {
            fontSize: 18,
            color: themeColors.primary,
            marginRight: 12,
            fontWeight: 'bold',
        },
        featureIconPopular: {
            fontSize: 20,
        },
        feature: {
            fontSize: 15,
            color: themeColors.text,
            flex: 1,
            lineHeight: 22,
        },
        featurePopular: {
            fontSize: 16,
            fontWeight: '500',
        },
        subscribeButton: {
            backgroundColor: themeColors.border,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 'auto',
        },
        subscribeButtonPopular: {
            backgroundColor: themeColors.primary,
        },
        subscribeButtonSelected: {
            backgroundColor: themeColors.primary,
            opacity: 0.9,
        },
        subscribeButtonText: {
            color: themeColors.text,
            fontSize: 16,
            fontWeight: 'bold',
        },
        subscribeButtonTextPopular: {
            color: '#FFFFFF',
        },
        currentPlanIndicator: {
            backgroundColor: themeColors.ongoing + '20',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 'auto',
            borderWidth: 2,
            borderColor: themeColors.ongoing,
        },
        currentPlanText: {
            color: themeColors.ongoing,
            fontSize: 16,
            fontWeight: 'bold',
        },
        restoreButton: {
            paddingVertical: 16,
            marginHorizontal: 20,
            marginTop: 8,
            marginBottom: 20,
        },
        restoreButtonText: {
            color: themeColors.primary,
            fontSize: 15,
            textAlign: 'center',
            textDecorationLine: 'underline',
            fontWeight: '500',
        },
        disclaimerContainer: {
            marginHorizontal: 20,
            marginTop: 20,
            padding: 16,
            backgroundColor: themeColors.card,
            borderRadius: 12,
        },
        disclaimer: {
            fontSize: 12,
            color: themeColors.textSecondary,
            lineHeight: 18,
            textAlign: 'center',
        },
    });

export default SubscriptionScreen;