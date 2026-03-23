// src/components/ConfirmationModal.tsx

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../styles/colors';

interface ConfirmationModalProps {
    isVisible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmButtonText?: string;
    cancelButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isVisible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmButtonText = 'Confirmar',
    cancelButtonText = 'Cancelar',
}) => {
    const { theme } = useTheme();
    const themeColors = colors[theme];
    const styles = createStyles(theme, themeColors);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onCancel}
        >
            <TouchableOpacity
                style={styles.centeredView}
                activeOpacity={1}
                onPress={onCancel}
            >
                <View style={styles.modalView}
                    onStartShouldSetResponder={() => true}
                    onResponderRelease={() => { }}
                >
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                        >
                            <Text style={styles.buttonText}>{cancelButtonText}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.buttonText}>{confirmButtonText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const createStyles = (theme: 'light' | 'dark', themeColors: typeof colors.light) =>
    StyleSheet.create({
        centeredView: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
        },
        modalView: {
            margin: 20,
            backgroundColor: themeColors.card,
            borderRadius: 10,
            padding: 35,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
        },
        modalTitle: {
            marginBottom: 15,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 'bold',
            color: themeColors.text,
        },
        modalMessage: {
            marginBottom: 20,
            textAlign: 'center',
            fontSize: 16,
            color: themeColors.text,
        },
        buttonContainer: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: '100%',
        },
        button: {
            borderRadius: 5,
            padding: 10,
            elevation: 2,
            minWidth: 100,
            marginHorizontal: 10,
        },
        confirmButton: {
            backgroundColor: 'red',
        },
        cancelButton: {
            backgroundColor: 'gray',
        },
        buttonText: {
            color: 'white',
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: 16,
        },
    });

export default ConfirmationModal;