// src/services/notificationService.ts

import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { getTitles } from "@/services/storageServices";
import { Title } from "@/types";

export interface NotificationPreferences {
    enabled: boolean;
    hour: number;
    minute: number;
}

export async function saveNotificationPreferences(prefs: NotificationPreferences) {
    await AsyncStorage.setItem('notificationPreferences', JSON.stringify(prefs));
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
    const stored = await AsyncStorage.getItem('notificationPreferences');
    return stored ? JSON.parse(stored) : { enabled: false, hour: 8, minute: 0 }; // Padrão 8:00 AM
}

function getNextNotificationTime(weekday: number, hour: number, minute: number): Date {
    const now = new Date();
    const currentWeekday = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let daysUntilNotification = (weekday - currentWeekday + 7) % 7;

    if (daysUntilNotification === 0) {
        if (currentHour > hour || (currentHour === hour && currentMinute >= minute)) {
            daysUntilNotification = 7;
        }
    }

    const nextNotification = new Date(now);
    nextNotification.setDate(nextNotification.getDate() + daysUntilNotification);
    nextNotification.setHours(hour, minute, 0, 0);

    return nextNotification;
}

export async function scheduleAllReleaseNotifications() {
    const { enabled, hour, minute } = await getNotificationPreferences();

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('minhas_leituras_releases', {
            name: 'Lançamentos de Títulos',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            showBadge: true,
            sound: 'default',
        });
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
        if (notification.identifier.startsWith('daily-release-notification-weekday-')) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }

    if (!enabled) {
        return;
    }

    const titles = await getTitles();
    const titlesByWeekday: { [key: number]: string[] } = {};
    titles.forEach((title: Title) => {
        if (typeof title.releaseDay === 'number' && title.releaseDay >= 0 && title.releaseDay <= 6) {
            if (!titlesByWeekday[title.releaseDay]) {
                titlesByWeekday[title.releaseDay] = [];
            }
            titlesByWeekday[title.releaseDay].push(title.name);
        }
    });

    for (const releaseDay in titlesByWeekday) {
        if (titlesByWeekday.hasOwnProperty(releaseDay)) {
            const titlesForDay = titlesByWeekday[releaseDay];
            const count = titlesForDay.length;
            const message = `${count} título(s) tem capítulo(s) novo(s) hoje.`;
            const expoWeekday = parseInt(releaseDay, 10) + 1;

            const now = new Date();
            const nextNotification = getNextNotificationTime(parseInt(releaseDay, 10), hour, minute);
            const secondsUntilNotification = Math.floor((nextNotification.getTime() - now.getTime()) / 1000);

            if (Platform.OS === 'android') {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Novos Lançamentos!',
                        body: message,
                        data: { type: 'release_notification', weekday: expoWeekday },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                        seconds: Math.max(secondsUntilNotification, 60),
                        repeats: true,
                    },
                    identifier: `daily-release-notification-weekday-${expoWeekday}`,
                });
            } else {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Novos Lançamentos!',
                        body: message,
                        data: { type: 'release_notification', weekday: expoWeekday },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                        weekday: expoWeekday,
                        hour: hour,
                        minute: minute,
                        repeats: true,
                    },
                    identifier: `daily-release-notification-weekday-${expoWeekday}`,
                });
            }
        }
    }
}

// --- Função para solicitar permissão de notificação ---
export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        Alert.alert(
            "Permissão de Notificação Necessária",
            "Para receber avisos diários, por favor, conceda a permissão de notificações nas configurações do seu celular.",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Abrir Configurações", onPress: () => Linking.openSettings() }
            ]
        );
        return false;
    }
    return true;
}