declare module 'react-native-switch-selector' {
    import React from 'react';
    export interface SwitchSelectorOption {
        label: string;
        value: string | number;
    }
    export interface SwitchSelectorProps {
        options: SwitchSelectorOption[];
        initial?: number;
        onPress?: (value: string | number) => void;
        buttonColor?: string;
        backgroundColor?: string;
        textColor?: string;
        style?: any;
    }
    const SwitchSelector: React.FC<SwitchSelectorProps>;
    export default SwitchSelector;
}