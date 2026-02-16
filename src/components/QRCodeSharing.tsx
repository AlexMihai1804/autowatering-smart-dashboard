/**
 * QR Code Sharing Component
 * 
 * 4.10: Share zone config via QR code
 */

import React, { useState, useEffect } from 'react';
import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardContent,
    IonSpinner,
} from '@ionic/react';
import { closeOutline, qrCodeOutline, scanOutline, shareOutline, copyOutline, checkmarkOutline } from 'ionicons/icons';
import QRCode from 'qrcode';
import { DEFAULT_ZONE_CONFIG } from '../types/wizard';
import type { UnifiedZoneConfig as ZoneConfig } from '../types/wizard';
import { useI18n } from '../i18n';

interface QRCodeSharingProps {
    isOpen: boolean;
    onClose: () => void;
    zones: ZoneConfig[];
    onImport?: (zones: ZoneConfig[]) => void;
}

const EXPORT_VERSION = '1.0';

// Compress zone config for QR code (remove unnecessary data)
const compressZoneConfig = (zones: ZoneConfig[]) => {
    return zones.map(z => ({
        n: z.name,
        e: z.enabled,
        m: z.wateringMode,
        p: z.plant?.id,
        s: z.soil?.id,
        i: z.irrigationMethod?.id,
        c: z.coverageValue,
        ct: z.coverageType,
        se: z.sunExposure,
        cs: z.enableCycleSoak,
        csw: z.cycleMinutes,
        csp: z.soakMinutes,
        mv: z.maxVolumeLimit,
    }));
};

const decodeImportPayload = (rawInput: string): any => {
    const trimmed = rawInput.trim();

    if (trimmed.startsWith('irrigation://import?data=')) {
        const encoded = trimmed.replace('irrigation://import?data=', '');
        return JSON.parse(decodeURIComponent(atob(encoded)));
    }

    return JSON.parse(trimmed);
};

const toFiniteNumber = (value: unknown, fallback: number): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const isWateringMode = (value: unknown): value is ZoneConfig['wateringMode'] =>
    value === 'fao56_auto' || value === 'fao56_eco' || value === 'duration' || value === 'volume';

const decompressZoneConfig = (rawZones: any[]): ZoneConfig[] => {
    return rawZones.map((raw, index) => {
        const mode = isWateringMode(raw?.m) ? raw.m : DEFAULT_ZONE_CONFIG.wateringMode;
        return {
            ...DEFAULT_ZONE_CONFIG,
            channelId: index,
            name: typeof raw?.n === 'string' && raw.n.trim() ? raw.n.trim() : `Zone ${index + 1}`,
            enabled: raw?.e !== false,
            skipped: false,
            wateringMode: mode,
            coverageType: raw?.ct === 'plants' ? 'plants' : 'area',
            coverageValue: Math.max(1, toFiniteNumber(raw?.c, DEFAULT_ZONE_CONFIG.coverageValue)),
            sunExposure: Math.max(0, Math.min(100, toFiniteNumber(raw?.se, DEFAULT_ZONE_CONFIG.sunExposure))),
            enableCycleSoak: !!raw?.cs,
            cycleMinutes: Math.max(1, Math.round(toFiniteNumber(raw?.csw, DEFAULT_ZONE_CONFIG.cycleMinutes))),
            soakMinutes: Math.max(1, Math.round(toFiniteNumber(raw?.csp, DEFAULT_ZONE_CONFIG.soakMinutes))),
            maxVolumeLimit: Math.max(1, toFiniteNumber(raw?.mv, DEFAULT_ZONE_CONFIG.maxVolumeLimit)),
        };
    });
};

export const QRCodeSharing: React.FC<QRCodeSharingProps> = ({
    isOpen,
    onClose,
    zones,
    onImport,
}) => {
    const [mode, setMode] = useState<'share' | 'scan'>('share');
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t, language } = useI18n();
    
    // Generate QR code when modal opens
    useEffect(() => {
        if (isOpen && mode === 'share') {
            generateQRCode();
        }
    }, [isOpen, mode, zones]);
    
    const generateQRCode = async () => {
        setIsGenerating(true);
        setError(null);
        
        try {
            const compressed = compressZoneConfig(zones.filter(z => z.enabled));
            const data = JSON.stringify({
                v: EXPORT_VERSION,
                z: compressed,
            });

            const qrUrl = await QRCode.toDataURL(data, {
                width: 512,
                margin: 1,
                errorCorrectionLevel: 'M',
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                }
            });
            setQrDataUrl(qrUrl);
        } catch (e) {
            console.error('[QRSharing] Failed to generate QR:', e);
            setError(t('qrSharing.generateFailed'));
        } finally {
            setIsGenerating(false);
        }
    };
    
    const copyShareData = async () => {
        try {
            const compressed = compressZoneConfig(zones.filter(z => z.enabled));
            const data = JSON.stringify({
                v: EXPORT_VERSION,
                z: compressed,
            });
            
            await navigator.clipboard.writeText(data);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            setError(t('qrSharing.copyFailed'));
        }
    };
    
    const shareNative = async () => {
        try {
            const compressed = compressZoneConfig(zones.filter(z => z.enabled));
            const data = JSON.stringify({
                v: EXPORT_VERSION,
                z: compressed,
            }, null, 2);
            
            if (navigator.share) {
                await navigator.share({
                    title: t('qrSharing.shareTitle'),
                    text: data,
                });
            } else {
                copyShareData();
            }
        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                setError(t('qrSharing.shareFailed'));
            }
        }
    };
    
    const enabledZones = zones.filter(z => z.enabled);
    const zonePluralSuffix = language === 'ro'
        ? (enabledZones.length === 1 ? 'a' : 'e')
        : (enabledZones.length !== 1 ? 's' : '');
    
    return (
        <IonModal isOpen={isOpen} onDidDismiss={onClose}>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>{t('qrSharing.title')}</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={onClose}>
                            <IonIcon icon={closeOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            
            <IonContent className="ion-padding">
                <IonSegment value={mode} onIonChange={e => setMode(e.detail.value as 'share' | 'scan')}>
                    <IonSegmentButton value="share">
                        <IonIcon icon={qrCodeOutline} />
                        <IonLabel>{t('qrSharing.share')}</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="scan">
                        <IonIcon icon={scanOutline} />
                        <IonLabel>{t('qrSharing.scan')}</IonLabel>
                    </IonSegmentButton>
                </IonSegment>
                
                {mode === 'share' && (
                    <div className="mt-6">
                        <div className="text-center mb-4">
                            <p className="text-gray-400">
                                {t('qrSharing.zonesToShare')
                                    .replace('{count}', String(enabledZones.length))
                                    .replace('{plural}', zonePluralSuffix)}
                            </p>
                        </div>
                        
                        <IonCard className="glass-panel">
                            <IonCardContent className="flex flex-col items-center py-6">
                                {isGenerating ? (
                                    <div className="w-48 h-48 flex items-center justify-center">
                                        <IonSpinner name="crescent" />
                                    </div>
                                ) : (
                                    <>
                                        {qrDataUrl ? (
                                            <img
                                                src={qrDataUrl}
                                                alt="QR code"
                                                className="rounded-lg bg-white"
                                                style={{ width: 200, height: 200 }}
                                            />
                                        ) : (
                                            <div className="w-48 h-48 flex items-center justify-center rounded-lg bg-white/10 text-gray-400 text-sm">
                                                {t('qrSharing.generateFailed')}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                            {t('qrSharing.scanWithDevice')}
                                        </p>
                                    </>
                                )}
                            </IonCardContent>
                        </IonCard>
                        
                        {error && (
                            <p className="text-red-400 text-center text-sm mt-2">{error}</p>
                        )}
                        
                        <div className="flex gap-2 mt-4">
                            <IonButton expand="block" fill="outline" className="flex-1" onClick={copyShareData}>
                                <IonIcon icon={copied ? checkmarkOutline : copyOutline} slot="start" />
                                {copied ? t('qrSharing.copied') : t('qrSharing.copyData')}
                            </IonButton>
                            <IonButton expand="block" className="flex-1" onClick={shareNative}>
                                <IonIcon icon={shareOutline} slot="start" />
                                {t('qrSharing.share')}
                            </IonButton>
                        </div>
                        
                        <div className="mt-6 p-4 bg-white/5 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">{t('qrSharing.includedTitle')}</h4>
                            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                                {enabledZones.map((zone, i) => (
                                    <li key={i}>
                                        {t('qrSharing.includedItem')
                                            .replace('{name}', zone.name)
                                            .replace('{mode}', zone.wateringMode)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
                
                {mode === 'scan' && (
                    <div className="mt-6">
                        <IonCard className="glass-panel">
                            <IonCardContent className="py-8 text-center">
                                <IonIcon icon={scanOutline} className="text-6xl text-gray-400 mb-4" />
                                <p className="text-gray-400">
                                    {t('qrSharing.scanUnavailable')}
                                </p>
                                <p className="text-gray-500 text-sm mt-2">
                                    {t('qrSharing.scanPasteHint')}
                                </p>
                                <IonButton className="mt-4" onClick={async () => {
                                    try {
                                        const text = await navigator.clipboard.readText();
                                        const data = decodeImportPayload(text);
                                        if (!data?.v || !Array.isArray(data?.z)) {
                                            throw new Error('Invalid import payload');
                                        }
                                        if (onImport) {
                                            const importedZones = decompressZoneConfig(data.z);
                                            onImport(importedZones);
                                        }
                                        onClose();
                                    } catch (e) {
                                        setError(t('qrSharing.invalidData'));
                                    }
                                }}>
                                    {t('qrSharing.pasteFromClipboard')}
                                </IonButton>
                            </IonCardContent>
                        </IonCard>
                    </div>
                )}
            </IonContent>
        </IonModal>
    );
};

export default QRCodeSharing;
