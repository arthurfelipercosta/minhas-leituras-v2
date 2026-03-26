// src/services/storageServices.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { Title } from '@/types';
import { auth, db } from '@/config/firebaseConfig';

const LOCAL_STORAGE_KEY = '@mL:titles'; // Chave para o armazenamento local
const SETTING_KEY = '@mL:settings'; // Chave para configurações (mantém local)

export type TapAction = 'edit' | 'copy_url' | 'open_url';

export interface UserSettings {
    shortTapAction: TapAction;
    longPressAction: TapAction;
    showAdultContent: boolean;
}

// ===========================
// Funções para Configurações
// ===========================

export const getSettings = async (): Promise<UserSettings> => {
    try {
        const settingsJson = await AsyncStorage.getItem(SETTING_KEY);
        if (settingsJson) {
            return JSON.parse(settingsJson);
        }
    } catch (e) {
        console.error("Falha ao carregar configurações: ", e);
    }
    return {
        shortTapAction: 'open_url',
        longPressAction: 'edit',
        showAdultContent: false,
    }
};

export const saveSettings = async (settings: UserSettings) => {
    try {
        const settingsJson = JSON.stringify(settings);
        await AsyncStorage.setItem(SETTING_KEY, settingsJson);
    } catch (e) {
        console.error("Falha ao salvar configurações: ", e);
    }
};

// ==============================================
// Funções de Armazenamento LOCAL (AsyncStorage)
// ==============================================

export const getTitles = async (): Promise<Title[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Erro ao buscar títulos locais:', e);
        return [];
    }
}

export const saveTitles = async (titles: Title[]) => {
    try {
        const jsonValue = JSON.stringify(titles);
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY, jsonValue);
    } catch (e) {
        console.error('Erro ao salvar títulos locais:', e);
    }
};

export const addTitle = async (newTitleData: Omit<Title, 'id' | 'thumbnailUri' | 'coverUri'> & { coverUri: string | null }): Promise<void> => {
    const existingTitles = await getTitles();
    const newId = uuidv4();

    const newTitle: Title = {
        id: newId,
        name: newTitleData.name,
        currentChapter: newTitleData.currentChapter,
        siteUrl: newTitleData.siteUrl,
        releaseDay: newTitleData.releaseDay,
        coverUri: newTitleData.coverUri ?? undefined,     // Apenas guarda a URI local/externa
        thumbnailUri: newTitleData.coverUri ?? undefined, // Usa a mesma para thumbnail por enquanto
        lastUpdate: new Date().toISOString(),
    };
    const updatedTitles = [...existingTitles, newTitle];
    await saveTitles(updatedTitles);
};

export const updateTitle = async (updatedTitle: Title): Promise<void> => {
    const existingTitles = await getTitles();
    const updatedTitles = existingTitles.map((t) =>
        t.id === updatedTitle.id ? { ...updatedTitle, lastUpdate: new Date().toISOString() } : t
    );
    await saveTitles(updatedTitles);
};

export const deleteTitle = async (id: string) => { // Removido coverUri, já que é local
    const existingTitles = await getTitles();
    const filteredTitles = existingTitles.filter((title) => title.id !== id);
    await saveTitles(filteredTitles);
};

export const exportTitles = async (): Promise<string> => {
    try {
        const titles = await getTitles(); // Busca os títulos locais
        return JSON.stringify(titles, null, 2);
    } catch (error) {
        console.error('Erro ao exportar títulos locais: ', error);
        return '[]';
    }
}

export const importTitles = async (jsonString: string): Promise<void> => {
    try {
        const titlesToImport: Title[] = JSON.parse(jsonString);
        if (!Array.isArray(titlesToImport)) {
            throw new Error('O JSON importado não é um array.');
        }

        const existingTitles = await getTitles();
        const importedIds = new Set(existingTitles.map(t => t.id));

        // Filtra títulos que já existem para evitar duplicatas, mas ainda permite importação
        const newTitles = titlesToImport.filter(title => !importedIds.has(title.id));

        // Adiciona os novos títulos e mantém os IDs existentes para as imagens se já existirem na nuvem.
        // Se a lógica de addTitle local gerar novos UUIDs, isso será corrigido na próxima fase.
        const mergedTitles = [...existingTitles, ...newTitles];
        await saveTitles(mergedTitles);

    } catch (error) {
        console.error('Erro ao importar títulos locais: ', error);
        throw new Error('Falha na importação. Verifique o formato do arquivo JSON.');
    }
}


// ===============================================
// Funções de Armazenamento em NUVEM (Firebase) - Opcional
// ===============================================

// Funções auxiliares para Firebase (as antigas funções agora com 'Cloud' no nome)
const getUserTitlesCollection = () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado para operação na nuvem.");
    return collection(db, 'users', user.uid, 'titles');
};

export const getTitlesFromCloud = async (): Promise<Title[]> => {
    const user = auth.currentUser;
    if (!user) return []; // Retorna vazio se não houver usuário logado

    try {
        const titlesCollection = getUserTitlesCollection();
        const q = query(titlesCollection, orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Title);
    } catch (e) {
        console.error('Erro ao buscar títulos do Firestore:', e);
        return [];
    }
}

export const addTitleToCloud = async (newTitleData: Omit<Title, 'id' | 'thumbnailUri' | 'coverUri'> & { coverUri: string | null }): Promise<void> => {
    const newId = uuidv4();

    const newTitle: Title = {
        id: newId,
        name: newTitleData.name,
        currentChapter: newTitleData.currentChapter,
        siteUrl: newTitleData.siteUrl,
        releaseDay: newTitleData.releaseDay,
        coverUri: newTitleData.coverUri as string,
        thumbnailUri: newTitleData.coverUri as string,
        lastUpdate: new Date().toISOString(),
    };

    try {
        const titlesCollection = getUserTitlesCollection();
        await setDoc(doc(titlesCollection, newTitle.id), newTitle);
    } catch (e) {
        console.error('Erro ao adicionar título na nuvem:', e);
        throw e; // Propaga o erro para a UI
    }
};

export const updateTitleInCloud = async (updatedTitle: Title): Promise<void> => {
    let coverUrl = updatedTitle.coverUri;

    const titleToUpdate = { ...updatedTitle, coverUri: coverUrl, thumbnailUri: updatedTitle.coverUri };

    try {
        const titleRef = doc(getUserTitlesCollection(), updatedTitle.id);
        await setDoc(titleRef, titleToUpdate, { merge: true });
    } catch (e) {
        console.error('Erro ao atualizar título na nuvem:', e);
        throw e;
    }
};

export const deleteTitleFromCloud = async (id: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado para deletar da nuvem.");

    try {
        const titlesCollection = getUserTitlesCollection();
        const titleRef = doc(titlesCollection, id);
        await deleteDoc(titleRef);
    } catch (e) {
        console.error('Erro ao deletar título da nuvem:', e);
        throw e;
    }
};


// ===============================================
// Funções de Sincronização entre Local e Nuvem
// ===============================================

export const syncLocalToCloud = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("É necessário estar logado para sincronizar com a nuvem.");

    const localTitles = await getTitles();
    const cloudTitles = await getTitlesFromCloud();

    const cloudTitleMap = new Map(cloudTitles.map(t => [t.id, t]));

    for (const localTitle of localTitles) {
        // Verifica se o título já existe na nuvem ou se é um novo
        const existingCloudTitle = cloudTitleMap.get(localTitle.id);

        if (!existingCloudTitle) {
            // Novo título na nuvem, adiciona
            const { id, ...dataToAdd } = localTitle; // Remove o ID para addTitleToCloud gerar um novo UUID
            await addTitleToCloud({ ...dataToAdd, coverUri: localTitle.coverUri || null });
        } else {
            // Título existente: verifica se a versão local é mais recente ou se o coverUri mudou
            const localLastUpdate = new Date(localTitle.lastUpdate || 0);
            const cloudLastUpdate = new Date(existingCloudTitle.lastUpdate || 0);

            if (localLastUpdate > cloudLastUpdate || localTitle.coverUri !== existingCloudTitle.coverUri) {
                // Versão local mais recente ou imagem alterada, atualiza na nuvem
                await updateTitleInCloud(localTitle);
            }
        }
        cloudTitleMap.delete(localTitle.id); // Remove do mapa para identificar os deletados
    }

    // Quaisquer títulos restantes no cloudTitleMap foram deletados localmente
    for (const [id] of cloudTitleMap.entries()) {
        await deleteTitleFromCloud(id);
    }
};

export const syncCloudToLocal = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("É necessário estar logado para baixar da nuvem.");

    const cloudTitles = await getTitlesFromCloud();
    const localTitles = await getTitles();

    const localTitleMap = new Map(localTitles.map(t => [t.id, t]));

    // Para cada título na nuvem
    for (const cloudTitle of cloudTitles) {
        const existingLocalTitle = localTitleMap.get(cloudTitle.id);

        if (!existingLocalTitle) {
            // Novo título localmente, adiciona
            // A função addTitle localmente não gera UUID, apenas adiciona
            // Certifique-se de que os IDs do Cloud são mantidos no local
            const newTitle: Title = {
                ...cloudTitle,
                id: cloudTitle.id, // Mantém o ID do Cloud
            };
            // Adiciona diretamente ao AsyncStorage.
            localTitles.push(newTitle);
        } else {
            // Título existente: verifica se a versão da nuvem é mais recente
            const localLastUpdate = new Date(existingLocalTitle.lastUpdate || 0);
            const cloudLastUpdate = new Date(cloudTitle.lastUpdate || 0);

            if (cloudLastUpdate > localLastUpdate) {
                // Versão da nuvem mais recente, atualiza localmente
                Object.assign(existingLocalTitle, cloudTitle);
            }
        }
        localTitleMap.delete(cloudTitle.id); // Remove do mapa para identificar os deletados localmente
    }

    // Quaisquer títulos restantes no localTitleMap foram deletados na nuvem
    // Remove do local
    const finalLocalTitles = localTitles.filter(t => !localTitleMap.has(t.id));

    await saveTitles(finalLocalTitles); // Salva a lista final no local
};