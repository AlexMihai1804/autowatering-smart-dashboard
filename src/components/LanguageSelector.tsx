/**
 * Language Selector Component
 * 
 * Dropdown or button group to switch between languages
 */

import React from 'react';
import {
    IonSelect,
    IonSelectOption,
    IonItem,
    IonLabel,
    IonIcon,
} from '@ionic/react';
import { globeOutline } from 'ionicons/icons';
import { useI18n, Language } from '../i18n';

interface LanguageSelectorProps {
    /** Display mode */
    variant?: 'select' | 'compact';
    /** Show label */
    showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    variant = 'select',
    showLabel = true,
}) => {
    const { language, setLanguage, availableLanguages, t } = useI18n();
    
    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-2">
                <IonIcon icon={globeOutline} className="text-gray-400" />
                <div className="flex gap-1">
                    {availableLanguages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={`px-2 py-1 rounded text-sm transition-colors ${
                                language === lang.code 
                                    ? 'bg-cyber-emerald text-black font-medium' 
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                        >
                            {lang.code.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    
    return (
        <IonItem lines="none" className="bg-transparent">
            {showLabel && (
                <>
                    <IonIcon icon={globeOutline} slot="start" className="text-gray-400" />
                    <IonLabel>{t('settings.language')}</IonLabel>
                </>
            )}
            <IonSelect
                value={language}
                onIonChange={(e) => setLanguage(e.detail.value as Language)}
                interface="popover"
            >
                {availableLanguages.map(lang => (
                    <IonSelectOption key={lang.code} value={lang.code}>
                        {lang.nativeName}
                    </IonSelectOption>
                ))}
            </IonSelect>
        </IonItem>
    );
};

export default LanguageSelector;
