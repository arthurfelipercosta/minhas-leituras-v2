// src/screens/StatisticsScreen.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { getTitles } from '@/services/storageServices';
import { Title } from '@/types';
import { colors } from '@/styles/colors';

interface Statistics {
    reading: number;
    completed: number;
    overdue: number;
    byDay: number[];
}

const StatisticsScreen = () => {
    const { theme } = useTheme();
    const themeColors = colors[theme];
    const styles = createStyles(theme, themeColors);
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);

    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    const calculateStatistics = (titles: Title[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDay = today.getDay();

        let reading = 0;
        let completed = 0;
        let overdue = 0;
        const byDay = Array(7).fill(0);

        titles.forEach(title => {
            const isCompleted = title.lastChapter !== undefined && title.currentChapter >= title.lastChapter;

            if (isCompleted) {
                completed++;
            } else {
                reading++;
            }

            const isReleaseDay = title.releaseDay !== undefined && title.releaseDay === currentDay;
            if (isReleaseDay && title.lastUpdate) {
                const lastUpdateDate = new Date(title.lastUpdate);
                lastUpdateDate.setHours(0, 0, 0, 0);
                if (lastUpdateDate.getTime() < today.getTime()) {
                    overdue++;
                }
            }

            if (title.releaseDay !== undefined) {
                byDay[title.releaseDay]++;
            }
        });

        setStats({ reading, completed, overdue, byDay });
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            getTitles().then(calculateStatistics);
        }, [])
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.card}>
                <Text style={styles.title}>Estatísticas Gerais</Text>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Obras lendo:</Text>
                    <Text style={styles.statValue}>{stats?.reading}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Obras concluídas:</Text>
                    <Text style={styles.statValue}>{stats?.completed}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Atrasadas (para hoje):</Text>
                    <Text style={styles.statValue}>{stats?.overdue}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.title}>Lançamentos por Dia</Text>
                {weekDays.map((day, index) => (
                    <View style={styles.statItem} key={index}>
                        <Text style={styles.statLabel}>{day}:</Text>
                        <Text style={styles.statValue}>{stats?.byDay[index]}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const createStyles = (theme: 'light' | 'dark', themeColors: typeof colors.light) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        centered: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        contentContainer: {
            padding: 15,
        },
        card: {
            backgroundColor: themeColors.card,
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1.41,
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
            paddingBottom: 10,
        },
        statItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
        },
        statLabel: {
            fontSize: 16,
            color: themeColors.textSecondary,
        },
        statValue: {
            fontSize: 18,
            fontWeight: '600',
            color: themeColors.text,
        },
    });

export default StatisticsScreen;