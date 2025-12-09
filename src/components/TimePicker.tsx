import React, { useEffect, useRef, useCallback } from 'react';
import { IonIcon } from '@ionic/react';
import { timeOutline } from 'ionicons/icons';

interface TimePickerProps {
    hour: number;
    minute: number;
    onChange: (hour: number, minute: number) => void;
    minuteStep?: number;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);
const REPEATS = 20; // Number of times to repeat the list

export const TimePicker: React.FC<TimePickerProps> = ({ 
    hour, 
    minute, 
    onChange,
    minuteStep = 5 
}) => {
    const hourRef = useRef<HTMLDivElement>(null);
    const minuteRef = useRef<HTMLDivElement>(null);
    const hourTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const minuteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitializedRef = useRef(false);

    // Generate base values
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minuteValues = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

    // Get scroll position for a value (centered in the middle repeat)
    const getScrollTop = (value: number, values: number[]) => {
        const index = values.indexOf(value);
        const middleRepeat = Math.floor(REPEATS / 2);
        const targetIndex = middleRepeat * values.length + index;
        return (targetIndex - CENTER_INDEX) * ITEM_HEIGHT;
    };

    // Get value from scroll position
    const getValueFromScroll = (scrollTop: number, values: number[]) => {
        const centerScrollTop = scrollTop + CENTER_INDEX * ITEM_HEIGHT;
        const rawIndex = Math.round(centerScrollTop / ITEM_HEIGHT);
        const valueIndex = ((rawIndex % values.length) + values.length) % values.length;
        return values[valueIndex];
    };

    // Initialize scroll positions
    useEffect(() => {
        if (!isInitializedRef.current) {
            if (hourRef.current) {
                hourRef.current.scrollTop = getScrollTop(hour, hours);
            }
            if (minuteRef.current) {
                minuteRef.current.scrollTop = getScrollTop(minute, minuteValues);
            }
            isInitializedRef.current = true;
        }
    }, []);

    // Handle scroll end with snap
    const handleScrollEnd = useCallback((
        ref: React.RefObject<HTMLDivElement>,
        values: number[],
        isHour: boolean,
        timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
    ) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            if (!ref.current) return;

            const scrollTop = ref.current.scrollTop;
            const newValue = getValueFromScroll(scrollTop, values);
            
            // Snap to exact position
            const snappedScrollTop = Math.round(scrollTop / ITEM_HEIGHT) * ITEM_HEIGHT;
            ref.current.scrollTo({ top: snappedScrollTop, behavior: 'smooth' });

            // Update value
            if (isHour && newValue !== hour) {
                onChange(newValue, minute);
            } else if (!isHour && newValue !== minute) {
                onChange(hour, newValue);
            }
        }, 100);
    }, [hour, minute, onChange]);

    // Render a single wheel
    const renderWheel = (
        ref: React.RefObject<HTMLDivElement>,
        values: number[],
        currentValue: number,
        isHour: boolean,
        timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
    ) => {
        // Create repeated list
        const items: number[] = [];
        for (let r = 0; r < REPEATS; r++) {
            items.push(...values);
        }

        return (
            <div style={{ position: 'relative', width: '90px' }}>
                {/* Selection highlight */}
                <div style={{
                    position: 'absolute',
                    top: CENTER_INDEX * ITEM_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT,
                    background: 'rgba(6, 182, 212, 0.25)',
                    borderRadius: '12px',
                    border: '2px solid rgba(6, 182, 212, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 1,
                }} />
                
                {/* Top fade */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: CENTER_INDEX * ITEM_HEIGHT,
                    background: 'linear-gradient(to bottom, #1e293b 20%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 2,
                }} />
                
                {/* Bottom fade */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: CENTER_INDEX * ITEM_HEIGHT,
                    background: 'linear-gradient(to top, #1e293b 20%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 2,
                }} />
                
                {/* Scrollable content */}
                <div
                    ref={ref}
                    onScroll={() => handleScrollEnd(ref, values, isHour, timeoutRef)}
                    style={{
                        height: VISIBLE_ITEMS * ITEM_HEIGHT,
                        overflowY: 'scroll',
                        scrollbarWidth: 'none',
                    }}
                    className="hide-scrollbar"
                >
                    {items.map((value, index) => (
                        <div
                            key={index}
                            style={{
                                height: ITEM_HEIGHT,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'rgba(255,255,255,0.6)',
                                userSelect: 'none',
                            }}
                        >
                            {String(value).padStart(2, '0')}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div style={{ 
            background: '#1e293b', 
            borderRadius: '12px', 
            padding: '16px',
            minWidth: '240px'
        }}>
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <IonIcon icon={timeOutline} style={{ color: 'var(--ion-color-primary)', fontSize: '1.25rem' }} />
                <span style={{ color: 'white', fontWeight: 500 }}>Select Time</span>
            </div>

            {/* Wheels */}
            <div className="flex items-center justify-center gap-3">
                {renderWheel(hourRef, hours, hour, true, hourTimeoutRef)}
                
                <span style={{ 
                    fontSize: '2rem', 
                    fontWeight: 700, 
                    color: 'white',
                    zIndex: 3,
                }}>:</span>

                {renderWheel(minuteRef, minuteValues, minute, false, minuteTimeoutRef)}
            </div>

            {/* Current time display */}
            <div className="text-center mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ 
                    color: 'var(--ion-color-primary)', 
                    fontSize: '1.5rem', 
                    fontWeight: 600,
                    letterSpacing: '2px',
                }}>
                    {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
                </span>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};
