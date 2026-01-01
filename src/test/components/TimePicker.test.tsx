/**
 * TimePicker Component Tests
 * 
 * Tests for TimePicker utility functions and component logic
 */
import { describe, it, expect } from 'vitest';

// Component constants (mirrored from source)
const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);
const REPEATS = 20;

// Helper function: getScrollTop (mirrored from component)
const getScrollTop = (value: number, values: number[]): number => {
    const index = values.indexOf(value);
    const middleRepeat = Math.floor(REPEATS / 2);
    const targetIndex = middleRepeat * values.length + index;
    return (targetIndex - CENTER_INDEX) * ITEM_HEIGHT;
};

// Helper function: getValueFromScroll (mirrored from component)
const getValueFromScroll = (scrollTop: number, values: number[]): number => {
    const centerScrollTop = scrollTop + CENTER_INDEX * ITEM_HEIGHT;
    const rawIndex = Math.round(centerScrollTop / ITEM_HEIGHT);
    const valueIndex = ((rawIndex % values.length) + values.length) % values.length;
    return values[valueIndex];
};

describe('TimePicker', () => {
    describe('Constants', () => {
        it('should have correct ITEM_HEIGHT', () => {
            expect(ITEM_HEIGHT).toBe(48);
        });

        it('should have correct VISIBLE_ITEMS', () => {
            expect(VISIBLE_ITEMS).toBe(5);
        });

        it('should have correct CENTER_INDEX', () => {
            expect(CENTER_INDEX).toBe(2);
        });

        it('should have correct REPEATS', () => {
            expect(REPEATS).toBe(20);
        });
    });

    describe('Hour values', () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);

        it('should generate 24 hours', () => {
            expect(hours.length).toBe(24);
        });

        it('should start at 0', () => {
            expect(hours[0]).toBe(0);
        });

        it('should end at 23', () => {
            expect(hours[23]).toBe(23);
        });

        it('should contain all hours 0-23', () => {
            for (let i = 0; i < 24; i++) {
                expect(hours).toContain(i);
            }
        });
    });

    describe('Minute values generation', () => {
        it('should generate correct values for step 5', () => {
            const minuteStep = 5;
            const minuteValues = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
            
            expect(minuteValues.length).toBe(12);
            expect(minuteValues).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
        });

        it('should generate correct values for step 15', () => {
            const minuteStep = 15;
            const minuteValues = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
            
            expect(minuteValues.length).toBe(4);
            expect(minuteValues).toEqual([0, 15, 30, 45]);
        });

        it('should generate correct values for step 1', () => {
            const minuteStep = 1;
            const minuteValues = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
            
            expect(minuteValues.length).toBe(60);
            expect(minuteValues[0]).toBe(0);
            expect(minuteValues[59]).toBe(59);
        });

        it('should generate correct values for step 10', () => {
            const minuteStep = 10;
            const minuteValues = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
            
            expect(minuteValues.length).toBe(6);
            expect(minuteValues).toEqual([0, 10, 20, 30, 40, 50]);
        });

        it('should generate correct values for step 30', () => {
            const minuteStep = 30;
            const minuteValues = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
            
            expect(minuteValues.length).toBe(2);
            expect(minuteValues).toEqual([0, 30]);
        });
    });

    describe('getScrollTop', () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minuteValues = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

        it('should calculate scroll position for hour 0', () => {
            const scrollTop = getScrollTop(0, hours);
            expect(scrollTop).toBeGreaterThan(0);
        });

        it('should calculate scroll position for hour 12', () => {
            const scrollTop0 = getScrollTop(0, hours);
            const scrollTop12 = getScrollTop(12, hours);
            
            // Hour 12 should be 12 * ITEM_HEIGHT further than hour 0
            expect(scrollTop12 - scrollTop0).toBe(12 * ITEM_HEIGHT);
        });

        it('should calculate scroll position for minute 30', () => {
            const scrollTop0 = getScrollTop(0, minuteValues);
            const scrollTop30 = getScrollTop(30, minuteValues);
            
            // Index of 30 in minuteValues is 6
            expect(scrollTop30 - scrollTop0).toBe(6 * ITEM_HEIGHT);
        });

        it('should position value in middle repeat', () => {
            const middleRepeat = Math.floor(REPEATS / 2);
            const scrollTop = getScrollTop(0, hours);
            
            // First value in middle repeat, minus CENTER_INDEX offset
            const expectedTargetIndex = middleRepeat * hours.length + 0;
            const expectedScrollTop = (expectedTargetIndex - CENTER_INDEX) * ITEM_HEIGHT;
            
            expect(scrollTop).toBe(expectedScrollTop);
        });
    });

    describe('getValueFromScroll', () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minuteValues = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

        it('should get value from scroll position for hours', () => {
            // Get scroll position for hour 5, then retrieve it
            const scrollTop = getScrollTop(5, hours);
            const value = getValueFromScroll(scrollTop, hours);
            
            expect(value).toBe(5);
        });

        it('should get value from scroll position for minutes', () => {
            const scrollTop = getScrollTop(30, minuteValues);
            const value = getValueFromScroll(scrollTop, minuteValues);
            
            expect(value).toBe(30);
        });

        it('should handle wrap-around correctly', () => {
            // Test that negative modulo is handled
            const value = getValueFromScroll(0, hours);
            expect(hours).toContain(value);
        });

        it('should return valid values for all hours', () => {
            for (let h = 0; h < 24; h++) {
                const scrollTop = getScrollTop(h, hours);
                const value = getValueFromScroll(scrollTop, hours);
                expect(value).toBe(h);
            }
        });

        it('should return valid values for all minutes', () => {
            for (const m of minuteValues) {
                const scrollTop = getScrollTop(m, minuteValues);
                const value = getValueFromScroll(scrollTop, minuteValues);
                expect(value).toBe(m);
            }
        });
    });

    describe('Time formatting', () => {
        it('should pad single digit hours with zero', () => {
            const hour = 5;
            const formatted = String(hour).padStart(2, '0');
            expect(formatted).toBe('05');
        });

        it('should not pad double digit hours', () => {
            const hour = 12;
            const formatted = String(hour).padStart(2, '0');
            expect(formatted).toBe('12');
        });

        it('should pad zero hour correctly', () => {
            const hour = 0;
            const formatted = String(hour).padStart(2, '0');
            expect(formatted).toBe('00');
        });

        it('should pad single digit minutes with zero', () => {
            const minute = 5;
            const formatted = String(minute).padStart(2, '0');
            expect(formatted).toBe('05');
        });

        it('should format time display correctly', () => {
            const hour = 7;
            const minute = 30;
            const display = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            expect(display).toBe('07:30');
        });

        it('should format midnight correctly', () => {
            const hour = 0;
            const minute = 0;
            const display = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            expect(display).toBe('00:00');
        });

        it('should format last minute of day correctly', () => {
            const hour = 23;
            const minute = 55;
            const display = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            expect(display).toBe('23:55');
        });
    });

    describe('Repeated items generation', () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);

        it('should create correct number of repeated items', () => {
            const items: number[] = [];
            for (let r = 0; r < REPEATS; r++) {
                items.push(...hours);
            }
            
            expect(items.length).toBe(REPEATS * hours.length);
            expect(items.length).toBe(20 * 24);
        });

        it('should contain each hour REPEATS times', () => {
            const items: number[] = [];
            for (let r = 0; r < REPEATS; r++) {
                items.push(...hours);
            }
            
            const count = items.filter(i => i === 12).length;
            expect(count).toBe(REPEATS);
        });
    });

    describe('Component exports', () => {
        it('should export TimePicker component', async () => {
            const module = await import('../../components/TimePicker');
            expect(module.TimePicker).toBeDefined();
            expect(typeof module.TimePicker).toBe('function');
        });
    });
});
