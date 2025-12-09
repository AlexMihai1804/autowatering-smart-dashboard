/**
 * WhatsThisTooltip Component
 * 
 * A help tooltip component that shows explanations for technical terms
 * in the onboarding wizard. Uses IonPopover for touch-friendly interaction.
 */

import React, { useState } from 'react';
import {
    IonIcon,
    IonPopover,
    IonContent,
    IonText,
} from '@ionic/react';
import { helpCircleOutline, closeCircle } from 'ionicons/icons';
import { getTooltipContent, TooltipContent } from '../../utils/onboardingHelpers';

interface WhatsThisTooltipProps {
    /** Key to lookup in WIZARD_TOOLTIPS */
    tooltipKey: string;
    /** Optional custom content (overrides key lookup) */
    content?: TooltipContent;
    /** Size of the help icon */
    size?: 'small' | 'medium' | 'large';
    /** Color of the help icon */
    color?: string;
    /** Additional class names */
    className?: string;
}

const sizeMap = {
    small: '16px',
    medium: '20px',
    large: '24px',
};

export const WhatsThisTooltip: React.FC<WhatsThisTooltipProps> = ({
    tooltipKey,
    content: customContent,
    size = 'medium',
    color = 'var(--ion-color-medium)',
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [popoverEvent, setPopoverEvent] = useState<Event | undefined>();

    const content = customContent || getTooltipContent(tooltipKey);

    if (!content) {
        console.warn(`[WhatsThisTooltip] No content found for key: ${tooltipKey}`);
        return null;
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setPopoverEvent(e.nativeEvent);
        setIsOpen(true);
    };

    return (
        <>
            <IonIcon
                icon={helpCircleOutline}
                onClick={handleClick}
                className={`whats-this-icon cursor-pointer opacity-60 hover:opacity-100 transition-opacity ${className}`}
                style={{
                    fontSize: sizeMap[size],
                    color: color,
                    marginLeft: '4px',
                    verticalAlign: 'middle',
                }}
                aria-label={`Ajutor: ${content.title}`}
            />

            <IonPopover
                isOpen={isOpen}
                event={popoverEvent}
                onDidDismiss={() => setIsOpen(false)}
                className="whats-this-popover"
                alignment="center"
                side="bottom"
            >
                <IonContent className="ion-padding">
                    <div className="whats-this-content">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {content.icon && (
                                    <span className="text-xl">{content.icon}</span>
                                )}
                                <h3 className="text-base font-bold text-white m-0">
                                    {content.title}
                                </h3>
                            </div>
                            <IonIcon
                                icon={closeCircle}
                                onClick={() => setIsOpen(false)}
                                className="text-xl cursor-pointer opacity-60 hover:opacity-100"
                            />
                        </div>

                        {/* Description */}
                        <IonText color="light">
                            <p className="text-sm leading-relaxed m-0 mb-2">
                                {content.description}
                            </p>
                        </IonText>

                        {/* Example (if provided) */}
                        {content.example && (
                            <div className="bg-white/10 rounded-lg p-2 mt-2">
                                <p className="text-xs text-gray-300 m-0">
                                    <span className="font-semibold text-cyber-emerald">Exemplu: </span>
                                    {content.example}
                                </p>
                            </div>
                        )}
                    </div>
                </IonContent>
            </IonPopover>
        </>
    );
};

/**
 * Inline version - shows tooltip inline with text
 */
interface WhatsThisInlineProps {
    tooltipKey: string;
    children: React.ReactNode;
}

export const WhatsThisInline: React.FC<WhatsThisInlineProps> = ({
    tooltipKey,
    children,
}) => {
    return (
        <span className="inline-flex items-center">
            {children}
            <WhatsThisTooltip tooltipKey={tooltipKey} size="small" />
        </span>
    );
};

/**
 * Label with help icon - common pattern in forms
 */
interface LabelWithHelpProps {
    label: string;
    tooltipKey: string;
    required?: boolean;
    className?: string;
}

export const LabelWithHelp: React.FC<LabelWithHelpProps> = ({
    label,
    tooltipKey,
    required = false,
    className = '',
}) => {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <span className="text-white font-medium">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </span>
            <WhatsThisTooltip tooltipKey={tooltipKey} size="small" />
        </div>
    );
};

export default WhatsThisTooltip;
