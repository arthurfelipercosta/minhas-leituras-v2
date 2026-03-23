// src/services/syncService.ts

import { auth } from '@/config/firebaseConfig';
import { syncLocalToCloud, syncCloudToLocal } from './storageServices';

// Upload: envia títulos locais para a nuvem
export const syncTitlesToFirebase = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    await syncLocalToCloud();
};

// Download: baixa títulos da nuvem e mescla com locais
export const syncTitlesFromFirebase = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    await syncCloudToLocal();
};

// Sincronização bidirecional completa
export const fullSync = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    await syncCloudToLocal();
    await syncLocalToCloud();
};