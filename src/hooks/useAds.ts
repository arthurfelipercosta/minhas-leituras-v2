import { useCallback } from 'react';
import AdInterstitial from '@/components/ads/InterstitialAd';

export const useInterstitial = () => {
    const { showAd, loaded } = AdInterstitial();

    const showInterstitial = useCallback(() => {
        return showAd();
    }, [showAd]);

    return { showInterstitial, loaded };
}