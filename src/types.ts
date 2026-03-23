// src/types.ts

// Interface para os títulos presentes no apliactivo
export interface Title {
    id: string;             // Um ID único para cada título
    name: string;           // Nome do título (e.g., "Fullmetal Alchemist")
    currentChapter: number; // Número do capítulo atual, pode ser decimal
    lastChapter?: number;   // Número do último capítulo, pode ser decimal
    siteUrl?: string;       // Campo para a URL do site (opcional)
    releaseDay?: number;    // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    lastUpdate?: string;    // Última atualização
    thumbnailUri?: string;  // Imagem de thumbnail
    coverUri?: string;      // Imagem na tela de detalhes
    isComplete?: boolean;   // Indica se a obra já está finalizada
}

// Tipos auxiliares de plano
export type UserPlan = 'free' | 'premium';
export type PlanSource = 'purchase' | 'manual';
export type PlanPeriod = 'monthly' | 'yearly';

// Interface para o modelo de dados do usuário no Firestore
export interface UserProfile {
    uid: string;                            // ID único do usuário
    email: string;                          // Email do usuário
    displayName?: string;                   // Nome de exibição
    photoURL?: string | null;               // URL da foto de perfil
    createdAt?: string;                     // Data de criação da conta (ISO string)
    // assinatura
    plan: UserPlan;                         // Plano atual do usuário
    planSource: PlanSource | null;          // 'purchase' = pagou, 'manual' = você concedeu
    planPeriod: PlanPeriod | null;          // 'monthly' | 'yearly' | null (null = manual/gratuito)
    planGrantedAt: string | null;           // Data em que o plano foi concedido (ISO string)
    planExpiresAt: string | null;           // Data de expiração (ISO string) | null = sem expiração
    // conta
    isPendingDeletion?: boolean;            // true se a exclusão foi solicitada
    deletionScheduledDate?: string | null;  // Data agendada para exclusão (ISO string) ou null
}

// Interface para configurações de admin (coleção adminConfig/settings no Firestore)
export interface AdminConfig {
    adminUids: string[];            // UIDs com acesso total de administrador
    manualPremiumUids: string[];    // UIDs que recebem premium gratuito
    premiumPriceMonthly: number;    // Preço mensal em reais (ex: 5)
    premiumPriceYearly: number;     // Preço anual em reais (ex: 50)
}

// Interface para os planos exibidos na tela de paywall
export interface Plan {
    id: string;
    name: string;
    price: number;
    period: PlanPeriod;
    features: string[];
    originalPrice?: number; // Para mostrar desconto riscado
    popular?: boolean;      // Destaque para o plano recomendado
    savings?: string;       // Ex: "Economize 20%"
}