/**
 * Wizard Enhancement Components and Hooks
 * 
 * Contains:
 * - 3.1: Input validation feedback
 * - 3.3: Step skip logic
 * - 3.4: Better error messages
 * - 3.5: Undo last action
 * - 3.6: Keyboard navigation
 * - 3.7: Loading states (skeleton loaders)
 * - 4.2: Help tooltips
 * - 4.3: Tutorial mode
 * - 4.4: Accessibility (ARIA)
 * - 4.8: Animations
 */

import React, { useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import {
    IonIcon,
    IonButton,
    IonPopover,
    IonContent,
    IonChip,
    IonSkeletonText,
    IonCard,
    IonCardContent,
} from '@ionic/react';
import {
    helpCircleOutline,
    alertCircleOutline,
    checkmarkCircleOutline,
    warningOutline,
    arrowUndoOutline,
    informationCircleOutline,
    flashOutline,
} from 'ionicons/icons';

// ============================================================================
// 3.1: Input Validation Feedback
// ============================================================================

export interface ValidationRule {
    validate: (value: any) => boolean;
    message: string;
    type: 'error' | 'warning';
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export const useValidation = (rules: ValidationRule[]) => {
    const [touched, setTouched] = useState(false);
    const [result, setResult] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
    
    const validate = useCallback((value: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        rules.forEach(rule => {
            if (!rule.validate(value)) {
                if (rule.type === 'error') {
                    errors.push(rule.message);
                } else {
                    warnings.push(rule.message);
                }
            }
        });
        
        const newResult = {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
        
        setResult(newResult);
        return newResult;
    }, [rules]);
    
    const touch = useCallback(() => setTouched(true), []);
    const reset = useCallback(() => {
        setTouched(false);
        setResult({ isValid: true, errors: [], warnings: [] });
    }, []);
    
    return { validate, result, touched, touch, reset };
};

interface ValidationFeedbackProps {
    errors: string[];
    warnings: string[];
    show: boolean;
}

export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({ errors, warnings, show }) => {
    if (!show || (errors.length === 0 && warnings.length === 0)) return null;
    
    return (
        <div className="mt-2 space-y-1 animate-fade-in">
            {errors.map((error, i) => (
                <div key={`error-${i}`} className="flex items-center gap-2 text-red-400 text-sm">
                    <IonIcon icon={alertCircleOutline} />
                    <span>{error}</span>
                </div>
            ))}
            {warnings.map((warning, i) => (
                <div key={`warning-${i}`} className="flex items-center gap-2 text-yellow-400 text-sm">
                    <IonIcon icon={warningOutline} />
                    <span>{warning}</span>
                </div>
            ))}
        </div>
    );
};

// Zone name validation rules
export const zoneNameRules: ValidationRule[] = [
    {
        validate: (v: string) => Boolean(v && v.trim().length > 0),
        message: 'Zone name is required',
        type: 'error',
    },
    {
        validate: (v: string) => !v || v.trim().length >= 2,
        message: 'Zone name should be at least 2 characters',
        type: 'error',
    },
    {
        validate: (v: string) => !v || v.trim().length <= 30,
        message: 'Zone name is quite long',
        type: 'warning',
    },
];

// Coverage validation rules
export const coverageRules: ValidationRule[] = [
    {
        validate: (v: number) => v !== undefined && v !== null,
        message: 'Coverage value is required',
        type: 'error',
    },
    {
        validate: (v: number) => !v || v > 0,
        message: 'Coverage must be greater than 0',
        type: 'error',
    },
    {
        validate: (v: number) => !v || v <= 10000,
        message: 'Coverage value seems very high',
        type: 'warning',
    },
];

// ============================================================================
// 3.3: Skip Step Button
// ============================================================================

interface SkipStepButtonProps {
    onSkip: () => void;
    label?: string;
    disabled?: boolean;
}

export const SkipStepButton: React.FC<SkipStepButtonProps> = ({ 
    onSkip, 
    label = 'Use Defaults',
    disabled = false 
}) => {
    return (
        <IonButton
            fill="clear"
            size="small"
            color="medium"
            onClick={onSkip}
            disabled={disabled}
            className="text-gray-400"
        >
            <IonIcon icon={flashOutline} slot="start" />
            {label}
        </IonButton>
    );
};

// ============================================================================
// 3.4: Better Error Messages
// ============================================================================

interface ErrorMessageProps {
    error: string;
    suggestion?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
    error, 
    suggestion, 
    onRetry,
    onDismiss 
}) => {
    return (
        <IonCard className="glass-panel border border-red-500/30 bg-red-500/10">
            <IonCardContent className="py-3">
                <div className="flex items-start gap-3">
                    <IonIcon icon={alertCircleOutline} className="text-2xl text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-red-300 font-medium m-0">{error}</p>
                        {suggestion && (
                            <p className="text-gray-400 text-sm mt-1 m-0">{suggestion}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                            {onRetry && (
                                <IonButton size="small" fill="outline" color="danger" onClick={onRetry}>
                                    Try Again
                                </IonButton>
                            )}
                            {onDismiss && (
                                <IonButton size="small" fill="clear" color="medium" onClick={onDismiss}>
                                    Dismiss
                                </IonButton>
                            )}
                        </div>
                    </div>
                </div>
            </IonCardContent>
        </IonCard>
    );
};

// Error message mapping
export const getErrorDetails = (errorCode: string): { message: string; suggestion: string } => {
    const errorMap: Record<string, { message: string; suggestion: string }> = {
        'GPS_DENIED': {
            message: 'GPS permission denied',
            suggestion: 'Enable location permissions in your device settings, or use the map to select a location.',
        },
        'GPS_TIMEOUT': {
            message: 'GPS request timed out',
            suggestion: 'Make sure you\'re in an area with good GPS signal. Try moving outdoors.',
        },
        'GPS_NOT_AVAILABLE': {
            message: 'GPS is not available',
            suggestion: 'Your device may not have GPS capability. Use the map or enter coordinates manually.',
        },
        'BLE_DISCONNECTED': {
            message: 'Device disconnected',
            suggestion: 'Make sure your irrigation controller is powered on and within range.',
        },
        'SAVE_FAILED': {
            message: 'Failed to save configuration',
            suggestion: 'Check your connection to the device and try again.',
        },
        'SOIL_DETECTION_FAILED': {
            message: 'Could not detect soil type',
            suggestion: 'The location may not have soil data coverage. Select a soil type manually.',
        },
    };
    
    return errorMap[errorCode] || {
        message: errorCode,
        suggestion: 'Please try again or contact support if the problem persists.',
    };
};

// ============================================================================
// 3.5: Undo Last Action
// ============================================================================

interface UndoState<T> {
    current: T;
    history: T[];
    canUndo: boolean;
}

export const useUndo = <T,>(initialState: T, maxHistory: number = 10) => {
    const [state, setState] = useState<UndoState<T>>({
        current: initialState,
        history: [],
        canUndo: false,
    });
    
    const update = useCallback((newValue: T) => {
        setState(prev => ({
            current: newValue,
            history: [prev.current, ...prev.history].slice(0, maxHistory),
            canUndo: true,
        }));
    }, [maxHistory]);
    
    const undo = useCallback(() => {
        setState(prev => {
            if (prev.history.length === 0) return prev;
            const [lastValue, ...rest] = prev.history;
            return {
                current: lastValue,
                history: rest,
                canUndo: rest.length > 0,
            };
        });
    }, []);
    
    const reset = useCallback((value: T) => {
        setState({
            current: value,
            history: [],
            canUndo: false,
        });
    }, []);
    
    return {
        value: state.current,
        update,
        undo,
        canUndo: state.canUndo,
        reset,
    };
};

interface UndoButtonProps {
    onUndo: () => void;
    disabled: boolean;
    label?: string;
}

export const UndoButton: React.FC<UndoButtonProps> = ({ onUndo, disabled, label = 'Undo' }) => {
    if (disabled) return null;
    
    return (
        <IonButton
            fill="clear"
            size="small"
            color="medium"
            onClick={onUndo}
            className="animate-fade-in"
        >
            <IonIcon icon={arrowUndoOutline} slot="start" />
            {label}
        </IonButton>
    );
};

// ============================================================================
// 3.6: Keyboard Navigation
// ============================================================================

interface UseKeyboardNavigationOptions {
    onNext?: () => void;
    onBack?: () => void;
    onEscape?: () => void;
    enabled?: boolean;
}

export const useKeyboardNavigation = ({
    onNext,
    onBack,
    onEscape,
    enabled = true,
}: UseKeyboardNavigationOptions) => {
    useEffect(() => {
        if (!enabled) return;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                // Only allow Escape in inputs
                if (e.key === 'Escape' && onEscape) {
                    e.preventDefault();
                    onEscape();
                }
                return;
            }
            
            switch (e.key) {
                case 'Enter':
                    if (onNext && !e.shiftKey) {
                        e.preventDefault();
                        onNext();
                    }
                    break;
                case 'Escape':
                    if (onEscape) {
                        e.preventDefault();
                        onEscape();
                    }
                    break;
                case 'Backspace':
                    if (onBack && e.altKey) {
                        e.preventDefault();
                        onBack();
                    }
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNext, onBack, onEscape, enabled]);
};

// ============================================================================
// 3.7: Loading States (Skeleton Loaders)
// ============================================================================

interface SkeletonCardProps {
    lines?: number;
    showAvatar?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, showAvatar = false }) => {
    return (
        <IonCard className="glass-panel">
            <IonCardContent>
                <div className="flex items-start gap-3">
                    {showAvatar && (
                        <IonSkeletonText 
                            animated 
                            style={{ width: '48px', height: '48px', borderRadius: '12px' }} 
                        />
                    )}
                    <div className="flex-1 space-y-2">
                        {Array.from({ length: lines }).map((_, i) => (
                            <IonSkeletonText 
                                key={i}
                                animated 
                                style={{ 
                                    width: i === lines - 1 ? '60%' : '100%', 
                                    height: '16px',
                                    borderRadius: '4px',
                                }} 
                            />
                        ))}
                    </div>
                </div>
            </IonCardContent>
        </IonCard>
    );
};

interface SkeletonListProps {
    count?: number;
    showAvatar?: boolean;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ count = 3, showAvatar = true }) => {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} lines={2} showAvatar={showAvatar} />
            ))}
        </div>
    );
};

export const SkeletonChips: React.FC<{ count?: number }> = ({ count = 5 }) => {
    return (
        <div className="flex flex-wrap gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <IonSkeletonText 
                    key={i}
                    animated 
                    style={{ 
                        width: `${60 + Math.random() * 40}px`, 
                        height: '32px',
                        borderRadius: '16px',
                    }} 
                />
            ))}
        </div>
    );
};

// ============================================================================
// 4.2: Help Tooltips
// ============================================================================

interface HelpTooltipProps {
    content: string;
    title?: string;
    children?: ReactNode;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ content, title, children }) => {
    const [showPopover, setShowPopover] = useState(false);
    const triggerId = `help-trigger-${Math.random().toString(36).slice(2, 9)}`;
    
    return (
        <>
            <button
                id={triggerId}
                onClick={() => setShowPopover(true)}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Help"
            >
                <IonIcon icon={helpCircleOutline} className="text-gray-400 text-sm" />
            </button>
            
            <IonPopover
                isOpen={showPopover}
                onDidDismiss={() => setShowPopover(false)}
                trigger={triggerId}
                triggerAction="click"
                side="top"
                alignment="center"
            >
                <IonContent className="ion-padding">
                    <div className="max-w-xs">
                        {title && (
                            <h4 className="font-bold text-white mb-2">{title}</h4>
                        )}
                        <p className="text-gray-300 text-sm m-0">{content}</p>
                    </div>
                </IonContent>
            </IonPopover>
            
            {children}
        </>
    );
};

// Predefined help content
export const HELP_CONTENT = {
    kc: {
        title: 'Crop Coefficient (Kc)',
        content: 'The Kc value represents how much water a plant needs relative to a reference grass. Higher Kc means more water needed.',
    },
    fao56: {
        title: 'FAO-56 Method',
        content: 'A scientific approach to irrigation that calculates water needs based on weather, plant type, soil, and growing stage.',
    },
    cycleSoak: {
        title: 'Cycle & Soak',
        content: 'Breaks watering into cycles with pauses (soak time) to allow water to absorb, preventing runoff on clay or compacted soils.',
    },
    coverage: {
        title: 'Coverage Area',
        content: 'The total area or number of plants this zone waters. Used to calculate water volume.',
    },
    sunExposure: {
        title: 'Sun Exposure',
        content: 'How much direct sunlight the zone receives. More sun means more evaporation and higher water needs.',
    },
    soilInfiltration: {
        title: 'Infiltration Rate',
        content: 'How fast water enters the soil. Clay has low infiltration (needs cycle/soak), sand has high infiltration.',
    },
    etZero: {
        title: 'Reference ET (ET₀)',
        content: 'Evapotranspiration for a reference grass surface. Used as a baseline to calculate actual crop water needs.',
    },
};

// ============================================================================
// 4.3: Tutorial Mode
// ============================================================================

interface TutorialStep {
    target: string; // CSS selector
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface UseTutorialOptions {
    steps: TutorialStep[];
    storageKey: string;
    autoStart?: boolean;
}

export const useTutorial = ({ steps, storageKey, autoStart = false }: UseTutorialOptions) => {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasCompleted, setHasCompleted] = useState(false);
    
    // Check if tutorial was completed before
    useEffect(() => {
        try {
            const completed = localStorage.getItem(storageKey);
            if (completed === 'true') {
                setHasCompleted(true);
            } else if (autoStart) {
                setIsActive(true);
            }
        } catch (e) {
            console.warn('[Tutorial] Failed to read storage:', e);
        }
    }, [storageKey, autoStart]);
    
    const start = useCallback(() => {
        setCurrentStep(0);
        setIsActive(true);
    }, []);
    
    const next = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            complete();
        }
    }, [currentStep, steps.length]);
    
    const previous = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);
    
    const complete = useCallback(() => {
        setIsActive(false);
        setHasCompleted(true);
        try {
            localStorage.setItem(storageKey, 'true');
        } catch (e) {
            console.warn('[Tutorial] Failed to save completion:', e);
        }
    }, [storageKey]);
    
    const skip = useCallback(() => {
        complete();
    }, [complete]);
    
    const reset = useCallback(() => {
        setHasCompleted(false);
        try {
            localStorage.removeItem(storageKey);
        } catch (e) {
            console.warn('[Tutorial] Failed to reset:', e);
        }
    }, [storageKey]);
    
    return {
        isActive,
        currentStep,
        step: steps[currentStep],
        totalSteps: steps.length,
        hasCompleted,
        start,
        next,
        previous,
        skip,
        complete,
        reset,
    };
};

interface TutorialOverlayProps {
    step: TutorialStep;
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrevious: () => void;
    onSkip: () => void;
    isFirst: boolean;
    isLast: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    step,
    currentStep,
    totalSteps,
    onNext,
    onPrevious,
    onSkip,
    isFirst,
    isLast,
}) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    
    useEffect(() => {
        const target = document.querySelector(step.target);
        if (target) {
            setTargetRect(target.getBoundingClientRect());
        }
    }, [step.target]);
    
    if (!targetRect) return null;
    
    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop with hole */}
            <div 
                className="absolute inset-0 bg-black/70"
                onClick={onSkip}
            />
            
            {/* Highlight box */}
            <div
                className="absolute border-2 border-cyber-emerald rounded-lg pointer-events-none animate-pulse"
                style={{
                    top: targetRect.top - 4,
                    left: targetRect.left - 4,
                    width: targetRect.width + 8,
                    height: targetRect.height + 8,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
                }}
            />
            
            {/* Tooltip */}
            <div
                className="absolute bg-gray-900 border border-cyber-emerald/30 rounded-lg p-4 max-w-sm animate-fade-in"
                style={{
                    top: targetRect.bottom + 16,
                    left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 300)),
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <IonIcon icon={informationCircleOutline} className="text-cyber-emerald" />
                    <span className="text-xs text-gray-400">
                        Step {currentStep + 1} of {totalSteps}
                    </span>
                </div>
                <h4 className="text-white font-bold mb-2">{step.title}</h4>
                <p className="text-gray-300 text-sm mb-4">{step.content}</p>
                <div className="flex items-center justify-between">
                    <IonButton fill="clear" size="small" color="medium" onClick={onSkip}>
                        Skip Tour
                    </IonButton>
                    <div className="flex gap-2">
                        {!isFirst && (
                            <IonButton fill="outline" size="small" onClick={onPrevious}>
                                Back
                            </IonButton>
                        )}
                        <IonButton fill="solid" size="small" color="success" onClick={onNext}>
                            {isLast ? 'Finish' : 'Next'}
                        </IonButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 4.8: Animations (CSS classes)
// ============================================================================

// Add to index.css or as a style tag
export const ANIMATION_STYLES = `
@keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in-right {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}

@keyframes pulse-success {
    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
}

.animate-fade-in {
    animation: fade-in 0.3s ease-out;
}

.animate-slide-up {
    animation: slide-up 0.3s ease-out;
}

.animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
}

.animate-scale-in {
    animation: scale-in 0.2s ease-out;
}

.animate-pulse-success {
    animation: pulse-success 1.5s ease-in-out infinite;
}

/* Step transition */
.wizard-step-enter {
    opacity: 0;
    transform: translateX(20px);
}

.wizard-step-enter-active {
    opacity: 1;
    transform: translateX(0);
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.wizard-step-exit {
    opacity: 1;
    transform: translateX(0);
}

.wizard-step-exit-active {
    opacity: 0;
    transform: translateX(-20px);
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}
`;
