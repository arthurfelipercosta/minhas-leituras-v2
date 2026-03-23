// src/screens/SettingsScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Platform, ScrollView, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import SwitchSelector from 'react-native-switch-selector';

// import de arquivos
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/styles/colors';
import { getSettings, saveSettings, TapAction, UserSettings } from '@/services/storageServices';

import {
    NotificationPreferences,
    saveNotificationPreferences,
    getNotificationPreferences,
    scheduleAllReleaseNotifications,
    requestNotificationPermissions
} from '@/services/notificationService';


const SettingsScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();

    const themeColors = colors[theme];
    const styles = createSettingsStyles(theme, themeColors);

    // ESTADOS TEMPORÁRIOS PARA AS AÇÕES DE TOQUE
    const [tempShortTap, setTempShortTap] = useState<TapAction>('open_url');
    const [tempLongPress, setTempLongPress] = useState<TapAction>('edit');

    // ESTADOS TEMPORÁRIOS PARA AS PREFERÊNCIAS DE NOTIFICAÇÃO
    const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences | null>(null); // Guardará o estado ORIGINAL das notificações
    const [tempIsEnabled, setTempIsEnabled] = useState(false);
    const [tempDate, setTempDate] = useState(new Date(2000, 0, 1, 8, 0));
    const [showPicker, setShowPicker] = useState(false);

    // ESTADO PARA O LOADING DO BOTÃO SALVAR
    const [isSaving, setIsSaving] = useState(false);
    // ESTADO PARA INDICAR SE TODAS AS CONFIGURAÇÕES INICIAIS FORAM CARREGADAS
    const [isLoaded, setIsLoaded] = useState(false);


    // CARREGA TODAS AS CONFIGURAÇÕES (TOQUES E NOTIFICAÇÕES) E INICIALIZA TODOS OS ESTADOS TEMPORÁRIOS
    useEffect(() => {
        async function loadAllInitialSettings() {
            // Carrega configurações de toque
            const loadedSettings = await getSettings();
            setTempShortTap(loadedSettings.shortTapAction);
            setTempLongPress(loadedSettings.longPressAction);

            // Carrega preferências de notificação
            const prefs = await getNotificationPreferences();
            setOriginalPreferences(prefs); // Guarda o estado original das notificações para comparação no 'Confirmar'
            setTempIsEnabled(prefs.enabled);
            const newDate = new Date(2000, 0, 1, prefs.hour, prefs.minute);
            setTempDate(newDate);

            setIsLoaded(true); // Marca que tudo foi carregado
        }
        loadAllInitialSettings();
    }, []); // Executa apenas uma vez ao montar o componente

    // Monitora e configura notificações ao focar na tela (principalmente para agendamentos)
    // A solicitação de permissão agora acontece ao ligar o switch, não no foco, mas ainda pode ser verificada.
    useFocusEffect(
        useCallback(() => {
            // Só executa se o componente já estiver carregado com os dados iniciais
            if (isLoaded) {
                async function setupNotificationsOnFocus() {
                    const prefs = await getNotificationPreferences(); // Puxa as prefs mais recentes do storage
                    if (prefs.enabled) {
                        // Não solicitamos permissão aqui para evitar prompt duplo se já ativou pelo switch
                        // Mas garantimos que os agendamentos estejam corretos
                        await scheduleAllReleaseNotifications();
                    } else {
                        // Se as notificações estão desativadas no storage, cancela tudo.
                        await Notifications.cancelAllScheduledNotificationsAsync();
                    }
                }
                setupNotificationsOnFocus();
            }
        }, [isLoaded]) // Depende de isLoaded para garantir que os dados iniciais já foram carregados
    );

    // Renderiza um loader se as configurações ainda não foram carregadas
    if (!isLoaded) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    const tapOptions = [
        { label: 'Editar', value: 'edit' },
        { label: 'Copiar', value: 'copy_url' },
        { label: 'Abrir', value: 'open_url' },
    ];

    // ATUALIZA APENAS OS ESTADOS TEMPORÁRIOS DAS CONFIGURAÇÕES DE TOQUE
    const handleSettingsChange = (key: 'shortTapAction' | 'longPressAction', value: TapAction) => {
        if (key === 'shortTapAction') {
            setTempShortTap(value);
        } else {
            setTempLongPress(value);
        }
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowPicker(false);
        if (event.type === 'set' && selectedDate) {
            setTempDate(selectedDate);
        }
    };

    const handleConfirm = async () => {
        setIsSaving(true); // Ativa o loading
        try {
            // 1. Salva as configurações de toque (dos estados TEMPORÁRIOS)
            const newSettings: UserSettings = {
                shortTapAction: tempShortTap,
                longPressAction: tempLongPress,
            };
            await saveSettings(newSettings);
            
            // 2. Lógica para notificações
            const hourToSave = tempDate.getHours();
            const minuteToSave = tempDate.getMinutes();

            const newPreferences: NotificationPreferences = {
                enabled: tempIsEnabled, // Usamos o estado ATUAL do switch (que já pode ter sido alterado pelo onValueChange)
                hour: hourToSave,
                minute: minuteToSave,
            };

            await saveNotificationPreferences(newPreferences);
            
            let toastMessageText2 = 'Suas preferências foram atualizadas.'; // Mensagem padrão para o Toast

            // Lógica para agendamento/cancelamento de notificações e mensagens específicas
            if (newPreferences.enabled) {
                // Se o switch está ativado AQUI, significa que a permissão já foi solicitada pelo onValueChange
                // ou já estava concedida. Apenas agendamos.
                await scheduleAllReleaseNotifications();
                toastMessageText2 = 'Suas notificações estão prontas.';
            } else {
                // Se as novas preferências estão desativadas
                await Notifications.cancelAllScheduledNotificationsAsync();
                if (originalPreferences?.enabled) { // Se estava ativada e agora foi desativada
                    toastMessageText2 = 'Notificações desativadas.';
                }
                // Se já estava desativada e continua desativada, a mensagem padrão já serve.
            }
            
            // ATUALIZA O ESTADO 'originalPreferences' APÓS SALVAR, para refletir o estado salvo
            const updatedOriginalPreferences = await getNotificationPreferences();
            setOriginalPreferences(updatedOriginalPreferences);

            // Exibe o toast de sucesso geral
            Toast.show({
                type: 'success',
                text1: 'Configurações salvas!',
                text2: toastMessageText2
            });

        } catch (error) {
            console.error("Erro ao salvar/agendar notificações:", error);
            Toast.show({ type: 'error', text1: 'Erro ao salvar', text2: 'Houve um problema ao salvar as configurações.' });
        } finally {
            setIsSaving(false); // Desativa o loading
            navigation.goBack(); // Volta para a tela anterior
        }
    };

    const handleCancel = () => {
        // AGORA ESTÁ CORRETO: SIMPLESMENTE VOLTA.
        // Como todos os estados da tela são temporários, ao navegar de volta,
        // o componente será reinicializado (ou os estados serão redefinidos),
        // descartando todas as mudanças não confirmadas.
        navigation.goBack();
    };

    const displayHour = tempDate.getHours().toString().padStart(2, '0');
    const displayMinute = tempDate.getMinutes().toString().padStart(2, '0');

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.card}>
                <Text style={styles.title}>Interação com Títulos</Text>

                <Text style={styles.label}>Toque Curto</Text>
                <SwitchSelector
                    options={tapOptions}
                    initial={tapOptions.findIndex(opt => opt.value === tempShortTap)} // Usa o estado TEMPORÁRIO
                    onPress={(value) => handleSettingsChange('shortTapAction', value as TapAction)}
                    buttonColor={themeColors.primary}
                    backgroundColor={themeColors.background}
                    textColor={themeColors.text}
                    style={{ marginBottom: 20 }}
                />

                <Text style={styles.label}>Toque Longo (Segurar)</Text>
                <SwitchSelector
                    options={tapOptions}
                    initial={tapOptions.findIndex(opt => opt.value === tempLongPress)} // Usa o estado TEMPORÁRIO
                    onPress={(value) => handleSettingsChange('longPressAction', value as TapAction)}
                    buttonColor={themeColors.primary}
                    backgroundColor={themeColors.background}
                    textColor={themeColors.text}
                />
            </View>
            
            <View style={styles.clockPlaceholder}>
                <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.timeDisplayWrapper}>
                    <Text style={styles.timeDisplayText}>{displayHour}</Text>
                    <Text style={styles.timeDisplayText}>:</Text>
                    <Text style={styles.timeDisplayText}>{displayMinute}</Text>
                </TouchableOpacity>

                {showPicker && (
                    <DateTimePicker
                        testID="timePicker"
                        value={tempDate}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimeChange}
                    />
                )}
            </View>

            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Receber Avisos Diários</Text>
                <Switch
                    onValueChange={async (value) => { // LÓGICA DE PERMISSÃO AO LIGAR O SWITCH
                        setTempIsEnabled(value); // Atualiza o estado local imediatamente
                        if (value) { // Se o usuário está tentando ATIVAR as notificações
                            const granted = await requestNotificationPermissions(); // Solicita permissão (com Alert.alert)
                            if (!granted) {
                                // Se a permissão for negada, reverte o switch visualmente
                                setTempIsEnabled(false);
                                // A mensagem de erro é tratada pelo Alert.alert no service
                            }
                        }
                    }}
                    value={tempIsEnabled}
                    trackColor={{ false: themeColors.border, true: themeColors.primary }}
                    thumbColor={tempIsEnabled ? themeColors.primary : themeColors.text}
                />
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                    <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.confirmButton]}
                    onPress={handleConfirm}
                    disabled={isSaving} // Desabilitar botão durante o loading
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Confirmar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Text style={styles.infoText}>
                Você receberá uma notificação consolidada nos dias de lançamento, no horário selecionado.
            </Text>
        </ScrollView>
    );
};

const createSettingsStyles = (theme: 'light' | 'dark', themeColors: typeof colors.light) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
            padding: 20,
        },
        contentContainer: {
            padding: 15,
        },
        card: {
            backgroundColor: themeColors.card,
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 20,
        },
        clockPlaceholder: {
            height: 200,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.card,
            borderRadius: 10,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: themeColors.border,
            overflow: 'hidden',
        },
        label: {
            fontSize: 16,
            color: themeColors.textSecondary,
            marginBottom: 10,
        },
        timeDisplayWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
        },
        timeDisplayText: {
            fontSize: 60,
            fontWeight: 'bold',
            color: themeColors.primary,
        },
        settingRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
        },
        settingLabel: {
            fontSize: 18,
            color: themeColors.text,
        },
        buttonContainer: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginTop: 30,
            marginBottom: 20,
        },
        button: {
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 25,
            minWidth: 120,
            alignItems: 'center',
        },
        confirmButton: {
            backgroundColor: themeColors.primary,
        },
        cancelButton: {
            backgroundColor: themeColors.border,
        },
        buttonText: {
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: 16,
        },
        infoText: {
            fontSize: 14,
            color: themeColors.textSecondary,
            textAlign: 'center',
            marginTop: 20,
        },
    });

export default SettingsScreen;