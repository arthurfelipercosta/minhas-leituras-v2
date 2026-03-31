import React, { useEffect, useState } from 'react';
import {
    InterstitialAd,
    TestIds,
    AdEventType
} from 'react-native-google-mobile-ads';

const AdInterstitial = () => {
    const [loaded, setLoaded] = useState(false);
    const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);

    useEffect(() => {
        // IDs de teste durante desenvolvimento
        const adUnitId = __DEV__
            ? TestIds.INTERSTITIAL
            : process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID;

        const ad = InterstitialAd.createForAdRequest(adUnitId!, {
            requestNonPersonalizedAdsOnly: true,
        });

        const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
            setLoaded(true);
            console.log('Interstitial carregado com sucesso');
        });

        const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            setLoaded(false);
            // Carrega próximo anúncio
            loadAd();
        });

        const loadAd = () => {
            setLoaded(false);
            ad.load();
        };

        loadAd();

        setInterstitial(ad);

        return () => {
            unsubscribeLoaded();
            unsubscribeClosed();
        };
    }, []);

    const showAd = () => {
        if (loaded && interstitial) {
            interstitial.show();
            return true;
        }
        return false;
    };

    return { showAd, loaded };
};

export default AdInterstitial;