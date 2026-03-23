// src/services/jsonService.ts

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { Title } from '@/types';
import { getTitles, saveTitles } from './storageServices';

/**
 * Importa títulos de um arquivo JSON selecionado pelo usuário.
 * Exibe mensagens de Toast para sucesso, cancelamento ou erro.
 * @returns {Promise<boolean>} Retorna true se a importação foi bem-sucedida, false caso contrário.
 */

export const importTitlesFromTXTFile = async (): Promise<boolean> => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'text/plain',
            copyToCacheDirectory: true,
        });

        if (result.canceled === false && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;

            const response = await fetch(uri);
            const fileContent = await response.text();

            let parsedTitles: Title[];
            try {
                parsedTitles = JSON.parse(fileContent);
            } catch (error) {
                throw new Error('O conteúdo do arquivo não é um JSON válido');
            }

            if (!Array.isArray(parsedTitles)) {
                throw new Error('O arquivo deve conter um array de títulos.');
            }

            const validImportedTitles: Title[] = [];
            const invalidTitlesMessages: string[] = [];

            // Pré-processa os títulos importados: gera IDs e valida o básico
            parsedTitles.forEach(t => {
                if (!t.name || typeof t.currentChapter !== 'number') {
                    invalidTitlesMessages.push(`Título '${t.name || 'Desconhecido'}' está malformado (falta nome ou capítulo atual válido).`);
                    return;
                }

                if (!t.id) { t.id = uuidv4(); }

                validImportedTitles.push(t);
            });

            if (validImportedTitles.length === 0) {
                throw new Error('Nenhum título válido encontrado para importação.');
            }
            const existingTitles = await getTitles();
            const mergedTitles: Title[] = [...existingTitles];
            const existingNamesLower = new Set<string>(existingTitles.map(t => t.name.toLowerCase()));

            let titlesAdded = 0;
            let titlesSkipped = 0;

            // Combina os títulos: adiciona novos, ignora duplicatas
            validImportedTitles.forEach(importedTitle => {
                const normalizedImportedName = importedTitle.name.toLowerCase();

                if (existingNamesLower.has(normalizedImportedName)) {
                    titlesSkipped++;
                    return;
                }

                mergedTitles.push(importedTitle);
                existingNamesLower.add(normalizedImportedName);
                titlesAdded++;
            });

            await saveTitles(mergedTitles);

            let toastText2 = `Importação concluída. ${titlesAdded} novos títulos adicionados.`;
            if (titlesSkipped > 0) {
                toastText2 += ` ${titlesSkipped} títulos já existentes foram ignorados.`;
            }
            if (invalidTitlesMessages.length > 0) {
                toastText2 += ` ${invalidTitlesMessages.length} títulos malformados foram ignorados.`;
            }

            Toast.show({
                type: 'success',
                text1: 'Backup Importado!',
                text2: toastText2,
                visibilityTime: 5000,
            });
            return true;
        }
        else {
            Toast.show({
                type: 'info',
                text1: 'Importação Cancelada',
                text2: 'Nenhum arquivo TXT selecionado.',
            });
            return false;
        }
    } catch (error: any) {
        console.error('Erro ao importar backup:', error);
        Toast.show({
            type: 'error',
            text1: 'Erro ao Importar',
            text2: error.message || 'Não foi possível importar o backup. Tente novamente.',
        });
        return false;
    }
}

/**
 * Exporta todos os títulos para um arquivo JSON e permite ao usuário compartilhá-lo.
 * Exibe mensagens de Toast para sucesso ou erro.
 * @returns {Promise<boolean>} Retorna true se a exportação foi bem-sucedida, false caso contrário.
 */

export const exportTitlesToTXTFile = async (): Promise<boolean> => {
    try {
        const allTitles = await getTitles();
        const jsonString = JSON.stringify(allTitles, null, 2); // Formata para leitura fácil
        const fileName = `ml-backup-${new Date().toISOString().split('T')[0]}.txt`;

        const file = new File(Paths.cache, fileName);
        await file.write(jsonString, { encoding: 'utf8' })

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri, {
                mimeType: 'text/plain',
                dialogTitle: 'Salvar Backup',
                UTI: 'public.plain-text',
            });

            Toast.show({
                type: 'success',
                text1: 'Backup Exportado!',
                text2: 'Selecione onde salvar seu arquivo TXT.',
            });
            return true;
        } else {
            Toast.show({
                type: 'error',
                text1: 'Erro ao Exportar',
                text2: 'Compartilhamento de arquivo não disponível neste dispositivo.',
            });
            return false;
        }
    } catch (error: any) {
        console.error('Erro ao exportar backup:', error);
        Toast.show({
            type: 'error',
            text1: 'Erro ao Exportar',
            text2: error.message || 'Não foi possível exportar o backup. Tente novamente.',
        });
        return false;
    }
};