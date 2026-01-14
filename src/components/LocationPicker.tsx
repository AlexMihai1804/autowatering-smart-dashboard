// ============================================================================
// LocationPicker Component
// Leaflet map with GPS button, draggable marker, and manual lat/lng input
// Supports offline tiles via mapOffline utility
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonText,
    IonSpinner,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol
} from '@ionic/react';
import { locateOutline, locationOutline, warningOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationData } from '../types/wizard';
import { useI18n } from '../i18n';

// Fix Leaflet default marker icon issue with bundlers
// We need to manually set the icon URLs since Vite doesn't handle Leaflet's default icons
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// ============================================================================
// Types
// ============================================================================

interface LocationPickerProps {
    value: LocationData | null;
    onChange: (location: LocationData) => void;
    disabled?: boolean;
    /** 1.2: Auto-trigger GPS on mount if no location set */
    autoTrigger?: boolean;
}

interface MapClickHandlerProps {
    onLocationSelect: (lat: number, lng: number) => void;
}

interface MapCenterUpdaterProps {
    center: [number, number];
}

// ============================================================================
// GPS Helper
// ============================================================================

async function getGPSLocation(): Promise<{ lat: number; lng: number }> {
    // Try Capacitor Geolocation first
    try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const permission = await Geolocation.checkPermissions();
        
        if (permission.location === 'denied') {
            throw new Error('GPS_DENIED');
        }
        
        if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
            const requested = await Geolocation.requestPermissions();
            if (requested.location === 'denied') {
                throw new Error('GPS_DENIED');
            }
        }
        
        const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
        });
        
        return {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
    } catch (capacitorError) {
        // Fallback to browser Geolocation API
        if (!navigator.geolocation) {
            throw new Error('GPS_NOT_AVAILABLE');
        }
        
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        reject(new Error('GPS_DENIED'));
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        reject(new Error('GPS_NOT_AVAILABLE'));
                    } else {
                        reject(new Error('GPS_TIMEOUT'));
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }
}

// ============================================================================
// Map Sub-Components
// ============================================================================

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onLocationSelect }) => {
    useMapEvents({
        click: (e) => {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
};

const MapCenterUpdater: React.FC<MapCenterUpdaterProps> = ({ center }) => {
    const map = useMap();
    
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    
    return null;
};

// Invalidate map size when container becomes visible
const MapInvalidator: React.FC = () => {
    const map = useMap();
    
    useEffect(() => {
        // Delay to allow modal/container animation to complete
        const timeoutId = setTimeout(() => {
            map.invalidateSize();
        }, 300);
        
        // Also invalidate on window resize
        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, [map]);
    
    return null;
};

// ============================================================================
// LocationPicker Component
// ============================================================================

export const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onChange,
    disabled = false,
    autoTrigger = false
}) => {
    // State
    const [isGettingGPS, setIsGettingGPS] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');
    const [autoTriggered, setAutoTriggered] = useState(false);
    const { t } = useI18n();
    
    // Default center (Europe - roughly center of coverage area)
    const defaultCenter: [number, number] = [48.8566, 2.3522]; // Paris
    
    // Current marker position
    const markerPosition: [number, number] | null = value 
        ? [value.latitude, value.longitude] 
        : null;
    
    // Map center - follow marker if exists
    const mapCenter = markerPosition || defaultCenter;

    // ========================================================================
    // Handlers
    // ========================================================================
    
    const handleGPSClick = useCallback(async () => {
        if (disabled || isGettingGPS) return;
        
        setIsGettingGPS(true);
        setGpsError(null);
        
        try {
            const coords = await getGPSLocation();
            onChange({
                latitude: coords.lat,
                longitude: coords.lng,
                source: 'gps'
            });
        } catch (error) {
            const errorMessage = (error as Error).message;
            
            if (errorMessage === 'GPS_DENIED') {
                setGpsError(t('errors.gpsDeniedSuggestion'));
                setShowManualInput(true);
            } else if (errorMessage === 'GPS_NOT_AVAILABLE') {
                setGpsError(t('errors.gpsUnavailableSuggestion'));
                setShowManualInput(true);
            } else {
                setGpsError(t('errors.gpsFailed'));
            }
        } finally {
            setIsGettingGPS(false);
        }
    }, [disabled, isGettingGPS, onChange]);
    
    // ========================================================================
    // 1.2: Auto-trigger GPS on mount if enabled and no location
    // ========================================================================
    
    useEffect(() => {
        if (autoTrigger && !autoTriggered && !value && !disabled && !isGettingGPS) {
            setAutoTriggered(true);
            // Small delay to ensure component is mounted
            const timer = setTimeout(() => {
                handleGPSClick();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [autoTrigger, autoTriggered, value, disabled, isGettingGPS, handleGPSClick]);
    
    const handleMapClick = useCallback((lat: number, lng: number) => {
        if (disabled) return;
        
        onChange({
            latitude: lat,
            longitude: lng,
            source: 'map'
        });
        setGpsError(null);
    }, [disabled, onChange]);
    
    const handleManualSubmit = useCallback(() => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        
        if (isNaN(lat) || isNaN(lng)) {
            setGpsError(t('locationPicker.invalidCoordinates'));
            return;
        }
        
        if (lat < -90 || lat > 90) {
            setGpsError(t('locationPicker.latitudeRange'));
            return;
        }
        
        if (lng < -180 || lng > 180) {
            setGpsError(t('locationPicker.longitudeRange'));
            return;
        }
        
        onChange({
            latitude: lat,
            longitude: lng,
            source: 'manual'
        });
        setGpsError(null);
        setShowManualInput(false);
    }, [manualLat, manualLng, onChange]);
    
    // Sync manual inputs when value changes
    useEffect(() => {
        if (value) {
            setManualLat(value.latitude.toFixed(6));
            setManualLng(value.longitude.toFixed(6));
        }
    }, [value]);
    
    // ========================================================================
    // Render
    // ========================================================================
    
    return (
        <div className="location-picker">
            {/* GPS Button */}
            <IonButton
                expand="block"
                color="primary"
                onClick={handleGPSClick}
                disabled={disabled || isGettingGPS}
                style={{ marginBottom: '12px' }}
            >
                {isGettingGPS ? (
                    <IonSpinner name="crescent" slot="start" />
                ) : (
                    <IonIcon slot="start" icon={locateOutline} />
                )}
                {isGettingGPS ? 'Se obține locația...' : 'Obține locația GPS'}
            </IonButton>
            
            {/* Error Message */}
            {gpsError && (
                <IonCard color="warning" style={{ marginBottom: '12px' }}>
                    <IonCardContent>
                        <IonIcon icon={warningOutline} style={{ marginRight: '8px' }} />
                        {gpsError}
                    </IonCardContent>
                </IonCard>
            )}
            
            {/* Map */}
            <div style={{ 
                height: '300px', 
                borderRadius: '8px', 
                overflow: 'hidden',
                marginBottom: '12px',
                border: '1px solid var(--ion-color-medium)'
            }}>
                <MapContainer
                    center={mapCenter}
                    zoom={value ? 13 : 5}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onLocationSelect={handleMapClick} />
                    <MapCenterUpdater center={mapCenter} />
                    <MapInvalidator />
                    {markerPosition && (
                        <Marker 
                            position={markerPosition}
                            draggable={!disabled}
                            eventHandlers={{
                                dragend: (e) => {
                                    const marker = e.target;
                                    const pos = marker.getLatLng();
                                    handleMapClick(pos.lat, pos.lng);
                                }
                            }}
                        />
                    )}
                </MapContainer>
            </div>
            
            <IonText color="medium" style={{ display: 'block', textAlign: 'center', marginBottom: '12px' }}>
                <small>{t('locationPicker.instruction')}</small>
            </IonText>
            
            {/* Current Location Display */}
            {value && (
                <IonCard style={{ marginBottom: '12px' }}>
                    <IonCardContent>
                        <IonGrid>
                            <IonRow className="ion-align-items-center">
                                <IonCol size="auto">
                                    <IonIcon icon={locationOutline} color="primary" style={{ fontSize: '24px' }} />
                                </IonCol>
                                <IonCol>
                                    <div style={{ fontWeight: 'bold' }}>{t('locationPicker.selectedTitle')}</div>
                                    <div style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                                        {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                                        {t('locationPicker.sourceLabel')
                                            .replace('{source}', value.source === 'gps'
                                                ? t('locationPicker.sourceGps')
                                                : value.source === 'map'
                                                    ? t('locationPicker.sourceMap')
                                                    : t('locationPicker.sourceManual'))}
                                    </div>
                                </IonCol>
                            </IonRow>
                        </IonGrid>
                    </IonCardContent>
                </IonCard>
            )}
            
            {/* Manual Input Toggle */}
            <IonButton
                fill="clear"
                expand="block"
                onClick={() => setShowManualInput(!showManualInput)}
                disabled={disabled}
            >
                {showManualInput ? t('locationPicker.hideManual') : t('locationPicker.manualEntry')}
            </IonButton>
            
            {/* Manual Input Form */}
            {showManualInput && (
                <IonCard>
                    <IonCardContent>
                        <IonGrid>
                            <IonRow>
                                <IonCol size="6">
                                    <IonItem>
                                        <IonLabel position="stacked">{t('locationPicker.latitude')}</IonLabel>
                                        <IonInput
                                            type="number"
                                            value={manualLat}
                                            onIonChange={(e) => setManualLat(e.detail.value || '')}
                                            placeholder="44.4268"
                                            disabled={disabled}
                                        />
                                    </IonItem>
                                </IonCol>
                                <IonCol size="6">
                                    <IonItem>
                                        <IonLabel position="stacked">{t('locationPicker.longitude')}</IonLabel>
                                        <IonInput
                                            type="number"
                                            value={manualLng}
                                            onIonChange={(e) => setManualLng(e.detail.value || '')}
                                            placeholder="26.1025"
                                            disabled={disabled}
                                        />
                                    </IonItem>
                                </IonCol>
                            </IonRow>
                            <IonRow>
                                <IonCol>
                                    <IonButton
                                        expand="block"
                                        onClick={handleManualSubmit}
                                        disabled={disabled || !manualLat || !manualLng}
                                    >
                                        {t('locationPicker.setLocation')}
                                    </IonButton>
                                </IonCol>
                            </IonRow>
                        </IonGrid>
                    </IonCardContent>
                </IonCard>
            )}
        </div>
    );
};

export default LocationPicker;
