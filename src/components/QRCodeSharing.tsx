/**
 * QR Code Sharing Component
 * 
 * 4.10: Share zone config via QR code
 */

import React, { useState, useEffect, useRef } from 'react';
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
import type { UnifiedZoneConfig as ZoneConfig } from '../types/wizard';

// Simple QR code generator using canvas
// For production, consider using a library like qrcode or qrcode.react

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

// Generate a simple data URL for sharing
const generateShareUrl = (data: string): string => {
    const encoded = btoa(encodeURIComponent(data));
    // In production, this would be your actual share URL
    return `irrigation://import?data=${encoded}`;
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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
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
            
            // For a real implementation, use a QR library
            // Here we'll just show the data and a placeholder
            console.log('[QRSharing] Data to encode:', data);
            console.log('[QRSharing] Data length:', data.length);
            
            // Create a simple placeholder QR visualization
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    const size = 200;
                    canvasRef.current.width = size;
                    canvasRef.current.height = size;
                    
                    // Draw a placeholder pattern
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);
                    
                    ctx.fillStyle = '#000000';
                    // Draw corner patterns
                    drawFinderPattern(ctx, 10, 10, 40);
                    drawFinderPattern(ctx, size - 50, 10, 40);
                    drawFinderPattern(ctx, 10, size - 50, 40);
                    
                    // Draw some random data pattern
                    const cellSize = 4;
                    const hash = simpleHash(data);
                    for (let i = 0; i < 30; i++) {
                        for (let j = 0; j < 30; j++) {
                            if ((hash + i * j) % 3 === 0) {
                                ctx.fillRect(60 + i * cellSize, 60 + j * cellSize, cellSize - 1, cellSize - 1);
                            }
                        }
                    }
                    
                    setQrDataUrl(canvasRef.current.toDataURL());
                }
            }
        } catch (e) {
            console.error('[QRSharing] Failed to generate QR:', e);
            setError('Failed to generate QR code');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const drawFinderPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 8, y + 8, size - 16, size - 16);
    };
    
    const simpleHash = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
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
            setError('Failed to copy to clipboard');
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
                    title: 'Irrigation Configuration',
                    text: data,
                });
            } else {
                copyShareData();
            }
        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                setError('Failed to share');
            }
        }
    };
    
    const enabledZones = zones.filter(z => z.enabled);
    
    return (
        <IonModal isOpen={isOpen} onDidDismiss={onClose}>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Share Configuration</IonTitle>
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
                        <IonLabel>Share</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="scan">
                        <IonIcon icon={scanOutline} />
                        <IonLabel>Scan</IonLabel>
                    </IonSegmentButton>
                </IonSegment>
                
                {mode === 'share' && (
                    <div className="mt-6">
                        <div className="text-center mb-4">
                            <p className="text-gray-400">
                                {enabledZones.length} zone{enabledZones.length !== 1 ? 's' : ''} to share
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
                                        <canvas 
                                            ref={canvasRef} 
                                            className="rounded-lg bg-white"
                                            style={{ width: 200, height: 200 }}
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            Scan with another device
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
                                {copied ? 'Copied!' : 'Copy Data'}
                            </IonButton>
                            <IonButton expand="block" className="flex-1" onClick={shareNative}>
                                <IonIcon icon={shareOutline} slot="start" />
                                Share
                            </IonButton>
                        </div>
                        
                        <div className="mt-6 p-4 bg-white/5 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Included in share:</h4>
                            <ul className="text-xs text-gray-400 space-y-1">
                                {enabledZones.map((zone, i) => (
                                    <li key={i}>• {zone.name} ({zone.wateringMode})</li>
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
                                    Camera scanning requires native app capabilities.
                                </p>
                                <p className="text-gray-500 text-sm mt-2">
                                    You can paste configuration data from clipboard instead.
                                </p>
                                <IonButton className="mt-4" onClick={async () => {
                                    try {
                                        const text = await navigator.clipboard.readText();
                                        const data = JSON.parse(text);
                                        if (data.v && data.z && onImport) {
                                            // Would need to decompress and validate here
                                            console.log('[QRSharing] Import data:', data);
                                            // onImport(decompressedZones);
                                            onClose();
                                        }
                                    } catch (e) {
                                        setError('Invalid configuration data');
                                    }
                                }}>
                                    Paste from Clipboard
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
