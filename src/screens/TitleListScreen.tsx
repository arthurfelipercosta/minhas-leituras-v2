// src/screens/TitleListScreen.tsx

import React, { useState, useCallback, useMemo, useLayoutEffect, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AntDesign, FontAwesome6, Entypo } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { RootStackParamList } from 'App';
import {
    getTitles, updateTitle, deleteTitle,
    TapAction, UserSettings, getSettings,
    exportTitles, importTitles, syncLocalToCloud,
    saveSettings
} from '@/services/storageServices';
import { Title } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/styles/colors';
import ConfirmationModal from '@/components/ConfirmationModal';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import TitleListItem from '@/components/TitleListItem';
import { SyncButton } from '@/components/SyncButton';
import { auth } from '@/config/firebaseConfig';
import { signOut, User } from 'firebase/auth';

type TitleListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TitleList'>;

const TitleListScreen: React.FC = () => {
    const { theme } = useTheme();
    const themeColors = colors[theme];
    const styles = createStyles(theme, themeColors);
    const navigation = useNavigation<TitleListScreenNavigationProp>();

    const [user, setUser] = useState<User | null>(auth.currentUser);
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(currentUser => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const [titles, setTitles] = useState<Title[]>([]);
    const [loading, setLoading] = useState(true);
    const [menu, setMenu] = useState(false);
    const [settings, setSettings] = useState<UserSettings | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'alpha-asc' | 'alpha-desc' | 'release-day' | 'today-release'>('alpha-asc');

    const [titleToDeleteId, setTitleToDeleteId] = useState<string | null>(null);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [isImportModalVisible, setIsImportModalVisible] = useState(false);
    const [showAdultContent, setShowAdultContent] = useState(false);

    const [isSyncing, setIsSyncing] = useState(false);


    const loadData = useCallback(async () => {
        setLoading(true);
        const [storedTitles, userSettings] = await Promise.all([
            getTitles(),
            getSettings()
        ]);
        setShowAdultContent(userSettings.showAdultContent || false);
        setTitles(storedTitles);
        setSettings(userSettings);
        setLoading(false);
    }, []);

    const confirmExport = useCallback(async () => {
        try {
            const jsonString = await exportTitles();
            await Clipboard.setStringAsync(jsonString);
            Toast.show({
                type: 'success',
                text1: 'Exportação concluída!',
                text2: 'Títulos copiados para a área de transferência.'
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Erro na Exportação',
                text2: 'Não foi possível exportar os títulos.'
            });
            console.error(error);
        } finally {
            setIsExportModalVisible(false);
        }
    }, []);

    const cancelExport = useCallback(() => {
        setIsExportModalVisible(false);
    }, []);
    const handleExportFile = useCallback(() => {
        setIsExportModalVisible(true);
    }, []);

    const confirmImport = useCallback(async () => {
        try {
            const jsonString = await Clipboard.getStringAsync();
            if (!jsonString) {
                Toast.show({
                    type: 'info',
                    text1: 'Nada para Importar',
                    text2: 'A área de transferência está vazia ou não contém dados.'
                });
                setIsImportModalVisible(false);
                return;
            }
            await importTitles(jsonString);
            await loadData();
            Toast.show({
                type: 'success',
                text1: 'Importação concluída!',
                text2: 'Título(s) importado(s) com sucesso.'
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Erro na Importação',
                text2: (error as Error).message || 'Não foi possível importar os títulos.'
            });
            console.error(error);
        } finally {
            setIsImportModalVisible(false);
        }
    }, [loadData]);

    const cancelImport = useCallback(() => {
        setIsImportModalVisible(false);
    }, []);

    const handleImportFile = useCallback(() => {
        setIsImportModalVisible(true);
    }, []);

    const handleQuickCloudSync = useCallback(async () => {
        if (!user) {
            Toast.show({
                type: 'info',
                text1: 'Login Necessário',
                text2: 'Faça login para sincronizar com a nuvem.'
            });
            return;
        }
        setIsSyncing(true);
        try {
            await syncLocalToCloud();
            await loadData();
            Toast.show({
                type: 'success',
                text1: 'Sincronizado',
                text2: 'Dados locais enviados para a nuvem.'
            });
            await loadData();
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Erro na Sincronização',
                text2: (error as Error).message || 'Não foi possível sincronizar com a nuvem.'
            });
            console.error('Erro de sincronização rápida:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [user, loadData]);

    const handleCloudLoginOrOptions = useCallback(() => {
        navigation.navigate('Login');
    }, [navigation]);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            Toast.show({
                type: 'success',
                text1: 'Logout',
                text2: 'Você foi desconectado com sucesso.'
            });
            await loadData();
            setMenu(false);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Erro ao fazer logout',
                text2: 'Não foi possível desconectar. Tente novamente.'
            });
            console.error("Erro ao fazer logout:", error);
        }
    }, [loadData]);


    useLayoutEffect(() => {
        navigation.setOptions({
            title: `Minhas leituras (${titles.length})`,
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SyncButton />
                    <ThemeToggleButton />
                    <TouchableOpacity onPress={() => setMenu(true)} style={styles.dotsMenuButton}>
                        <Entypo name="dots-three-vertical" size={24} color={themeColors.icon} />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, themeColors, titles.length, isSyncing, handleQuickCloudSync, handleCloudLoginOrOptions]);

    // Carrega os títulos toda vez que a tela foca
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleChapterChange = async (title: Title, delta: number) => {
        const updatedChapter = Math.floor(title.currentChapter + delta);
        const updatedTitle = {
            ...title,
            currentChapter: updatedChapter >= 0 ? updatedChapter : 0,
            lastUpdate: new Date().toISOString()
        };
        await updateTitle(updatedTitle);
        await loadData();
    };

    const handleSortChange = () => {
        if (sortOrder === 'alpha-asc') {
            setSortOrder('alpha-desc');
        } else if (sortOrder === 'alpha-desc') {
            setSortOrder('release-day');
        } else if (sortOrder === 'release-day') {
            setSortOrder('today-release');
        } else { setSortOrder('alpha-asc'); }
    }

    const displayedTitles = useMemo(() => {
        const filteredTitles = titles.filter(title =>
            title.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            (showAdultContent || !title.isAdultContent)
        );
        switch (sortOrder) {
            case 'alpha-asc':
                return filteredTitles.sort((a, b) => a.name.localeCompare(b.name));
            case 'alpha-desc':
                return filteredTitles.sort((a, b) => b.name.localeCompare(a.name));
            case 'release-day':
                return filteredTitles.sort((a, b) => (a.releaseDay ?? 8) - (b.releaseDay ?? 8));
            case 'today-release':
                const currentDay = new Date().getDay();
                return filteredTitles.filter(title => title.releaseDay === currentDay);
            default:
                return filteredTitles;
        }
    }, [titles, searchQuery, sortOrder, showAdultContent])

    const getSortButtonText = () => {
        if (sortOrder === 'alpha-asc') return 'A-Z';
        if (sortOrder === 'alpha-desc') return 'Z-A';
        if (sortOrder === 'release-day') return 'DIA';
        return 'HOJE';
    }
    const confirmDelete = async () => {
        if (titleToDeleteId) {
            await deleteTitle(titleToDeleteId);
            await loadData();
            Toast.show({
                type: 'success',
                text1: 'Título Deletado!',
                text2: 'O título foi removido com sucesso.',
            });
            setTitleToDeleteId(null);
        }
        setIsDeleteModalVisible(false);
    };

    const cancelDelete = () => {
        setIsDeleteModalVisible(false);
        setTitleToDeleteId(null);
    };

    const handleDeletePress = (id: string) => {
        setTitleToDeleteId(id);
        setIsDeleteModalVisible(true);
    };

    const handleCopySiteUrl = async (url: string | undefined) => {
        if (url) {
            await Clipboard.setStringAsync(url);
            Toast.show({
                type: 'success',
                text1: 'Link Copiado!',
                text2: 'O link foi copiado com sucesso para a área de transferência.',
            })
        } else {
            Toast.show({
                type: 'info',
                text1: 'Aviso!',
                text2: 'Nenhum link de site disponível para este título.',
            })
        }
    };
    const performTapAction = async (action: TapAction, item: Title) => {
        switch (action) {
            case 'edit':
                navigation.navigate('TitleDetail', { id: item.id });
                break;
            case 'open_url':
                if (item.siteUrl) await Linking.openURL(item.siteUrl);
                else navigation.navigate('TitleDetail', { id: item.id }); // Fallback
                break;
            case 'copy_url':
                if (item.siteUrl) {
                    await Clipboard.setStringAsync(item.siteUrl);
                    Toast.show({ type: 'success', text1: 'Link Copiado!' });
                } else {
                    Toast.show({ type: 'info', text1: 'Nenhum link para copiar.' });
                }
                break;
        }
    }

    const renderTitleItem = useCallback(({ item }: { item: Title }) => (
        <TitleListItem
            item={item}
            onDelete={handleDeletePress}
            onChapterChange={handleChapterChange}
            onShortPress={() => settings && performTapAction(settings.shortTapAction, item)}
            onLongPress={() => settings && performTapAction(settings.longPressAction, item)}
            onNavigate={(id) => navigation.navigate('TitleDetail', { id })}
        />
    ), [settings, performTapAction, handleDeletePress, handleChapterChange, navigation]);


    if (loading || isSyncing) {
        return (
            <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={{ color: themeColors.text, marginTop: 10 }}>
                    {loading ? 'Carregando títulos...' : 'Sincronizando com a nuvem...'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.controlsContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquisar Títulos..."
                    placeholderTextColor={themeColors.text}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <TouchableOpacity style={styles.sortButton} onPress={handleSortChange}>
                    <Text style={styles.sortButtonText}>{getSortButtonText()}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.adultContentButton, showAdultContent && styles.adultContentButtonActive]}
                    onPress={() => {
                        const newValue = !showAdultContent;
                        setShowAdultContent(newValue);
                        // Salvar nas configurações
                        if (settings) {
                            saveSettings({ ...settings, showAdultContent: newValue });
                        }
                    }}
                >
                    <Text style={[styles.adultContentButtonText, showAdultContent && styles.adultContentButtonTextActive]}>
                        18+
                    </Text>
                </TouchableOpacity>
            </View>
            {displayedTitles.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={{ color: themeColors.text }}>{searchQuery ? 'Nenhum título encontrado.' : 'Nenhum título cadastrado ainda.'}</Text>
                    {!searchQuery && <Text style={{ color: themeColors.text }}>Toque no '+' para adicionar um novo título.</Text>}
                </View>
            ) : (
                <FlatList
                    data={displayedTitles}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTitleItem}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('TitleDetail', undefined)}
            >
                <AntDesign name="plus" size={24} color="white" />
            </TouchableOpacity>

            <Modal
                transparent
                visible={menu}
                onRequestClose={() => setMenu(false)}
                animationType='fade'
            >
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenu(false)}>
                    <View style={styles.menuContainer}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(false); navigation.navigate('Statistics'); }}>
                            <Entypo name='area-graph' size={22} color={themeColors.text} />
                            <Text style={styles.menuItemText}>Estatísticas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(false); navigation.navigate('Settings'); }}>
                            <FontAwesome6 name='gear' size={22} color={themeColors.text} />
                            <Text style={styles.menuItemText}>Configurações</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(false); handleExportFile() }}>
                            <FontAwesome6 name='upload' size={22} color={themeColors.text} />
                            <Text style={styles.menuItemText}>Exportar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(false); handleImportFile(); }}>
                            <FontAwesome6 name='download' size={22} color={themeColors.text} />
                            <Text style={styles.menuItemText}>Importar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(false); navigation.navigate('Subscription'); }}>
                            <FontAwesome6 name='crown' size={22} color={themeColors.text} />
                            <Text style={styles.menuItemText}>Assinatura Premium</Text>
                        </TouchableOpacity>
                        {user && ( // Mostra o botão de logout apenas se o usuário estiver logado
                            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                                <AntDesign name='logout' size={22} color={themeColors.text} />
                                <Text style={styles.menuItemText}>Sair</Text>
                            </TouchableOpacity>
                        )}
                    </View >
                </TouchableOpacity >
            </Modal >

            <ConfirmationModal
                isVisible={isDeleteModalVisible}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja excluir este título?"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmButtonText="Deletar"
                cancelButtonText="Cancelar"
            />

            <ConfirmationModal
                isVisible={isExportModalVisible}
                title="Confirmar Exportação"
                message="Deseja exportar todos os títulos para um arquivo de texto?"
                onConfirm={confirmExport}
                onCancel={cancelExport}
                confirmButtonText="Exportar"
                cancelButtonText="Cancelar"
            />

            <ConfirmationModal
                isVisible={isImportModalVisible}
                title="Confirmar Importação"
                message="Deseja importar todos os títulos para o armazenamento local? Títulos existentes não serão duplicados."
                onConfirm={confirmImport}
                onCancel={cancelImport}
                confirmButtonText="Importar"
                cancelButtonText="Cancelar"
            />
        </View >
    );
};

const createStyles = (theme: 'light' | 'dark', themeColors: typeof colors.light) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        centered: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.background,
        },
        listContent: {
            paddingBottom: 80,
        },
        controlsContainer: {
            flexDirection: 'row',
            paddingHorizontal: 10,
            paddingTop: 10,
            alignItems: 'center',
        },
        fab: {
            position: 'absolute',
            width: 60,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            right: 30,
            bottom: 50,
            backgroundColor: themeColors.primary,
            borderRadius: 30,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
        },
        searchInput: {
            flex: 1,
            height: 40,
            backgroundColor: themeColors.card,
            color: themeColors.text,
            borderRadius: 8,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: themeColors.border,
            marginRight: 10,
        },
        sortButton: {
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: themeColors.primary,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        sortButtonText: {
            color: 'white',
            fontWeight: 'bold',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            paddingTop: 50,
            paddingRight: 10,
        },
        menuContainer: {
            alignItems: 'center',
            backgroundColor: themeColors.card,
            borderRadius: 8,
            padding: 10,
            width: 220,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
        },
        menuItemText: {
            color: themeColors.text,
            fontSize: 16,
            marginLeft: 15,
            width: 120
        },
        headerRightContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        cloudIconContainer: {
            marginRight: 15,
        },
        dotsMenuButton: {
            marginLeft: 15,
        },
        adultContentButton: {
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: themeColors.card,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: themeColors.border,
            marginLeft: 10,
        },
        adultContentButtonActive: {
            backgroundColor: '#e74c3c',
            borderColor: '#e74c3c',
        },
        adultContentButtonText: {
            color: themeColors.text,
            fontWeight: 'bold',
            fontSize: 12,
        },
        adultContentButtonTextActive: {
            color: 'white',
        },
    });

export default TitleListScreen;