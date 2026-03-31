import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const AdBanner: React.FC = () => {
    const [isReady, setIsReady] = useState(false);

    const adUnitId = __DEV__
        ? TestIds.BANNER
        : process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID;

    return (
        <View style={styles.container}>
            <BannerAd
                unitId={adUnitId!}
                size={BannerAdSize.BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
                onAdLoaded={() => {
                    console.log('Banner carregado com sucesso');
                    setIsReady(true);
                }}
                onAdFailedToLoad={(error) => {
                    console.error('Erro ao carregar banner:', error);
                }}
            />
        </View>
    );

}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default AdBanner;