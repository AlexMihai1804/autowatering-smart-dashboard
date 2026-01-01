/**
 * Tests for TimePicker component helper functions
 * Tests scroll calculations, value extraction, time formatting
 */
import { describe, it, expect } from 'vitest';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);
const REPEATS = 20;

describe('TimePicker', () => {
    describe('Constants', () => {
        it('should have correct item height', () => {
            expect(ITEM_HEIGHT).toBe(48);
        });

        it('should show 5 visible items', () => {
            expect(VISIBLE_ITEMS).toBe(5);
        });

        it('should center on index 2', () => {
            expect(CENTER_INDEX).toBe(2);
        });

        it('should have 20 repeats', () => {
            expect(REPEATS).toBe(20);
        });
    });

    describe('Hour generation', () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);

        it('should generate 24 hours', () => {
            expect(hours).toHaveLength(24);
        });

        it('should start at 0', () => {
            expect(hours[0]).toBe(0);
        });

        it('should end at 23', () => {
            expect(hours[23]).toBe(23);
        });
    });

    describe('Minute generation', () => {
        const generateMinutes = (step: number): number[] => {
            return Array.from({ length: 60 / step }, (_, i) => i * step);
        };

        it('should generate 12 values for step 5', () => {
            const minutes = generateMinutes(5);
            expect(minutes).toHaveLength(12);
            expect(minutes).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
        });

        it('should generate 4 values for step 15', () => {
            const minutes = generateMinutes(15);
            expect(minutes).toHaveLength(4);
            expect(minutes).toEqual([0, 15, 30, 45]);
        });

        it('should generate 2 values for step 30', () => {
            const minutes = generateMinutes(30);
            expect(minutes).toHaveLength(2);
            expect(minutes).toEqual([0, 30]);
        });

        it('should generate 60 values for step 1', () => {
            const minutes = generateMinutes(1);
            expect(minutes).toHaveLength(60);
        });
    });

    describe('getScrollTop', () => {
        const getScrollTop = (value: number, values: number[]): number => {
            const index = values.indexOf(value);
            const middleRepeat = Math.floor(REPEATS / 2);
            const targetIndex = middleRepeat * values.length + index;
            return (targetIndex - CENTER_INDEX) * ITEM_HEIGHT;
        };

        it('should calculate scroll position for hour 0', () => {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            const scrollTop = getScrollTop(0, hours);
            expect(scrollTop).toBeGreaterThan(0);
        });

        it('should calculate scroll position for hour 12', () => {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            const scrollTop12 = getScrollTop(12, hours);
            const scrollTop0 = getScrollTop(0, hours);
            expect(scrollTop12).toBeGreaterThan(scrollTop0);
        });

        it('should handle minute values', () => {
            const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
            const scrollTop15 = getScrollTop(15, minutes);
            const scrollTop0 = getScrollTop(0, minutes);
            expect(scrollTop15).toBeGreaterThan(scrollTop0);
        });
    });

    describe('getValueFromScroll', () => {
        const getValueFromScroll = (scrollTop: number, values: number[]): number => {
            const centerScrollTop = scrollTop + CENTER_INDEX * ITEM_HEIGHT;
            const rawIndex = Math.round(centerScrollTop / ITEM_HEIGHT);
            const valueIndex = ((rawIndex % values.length) + values.length) % values.length;
            return values[valueIndex];
        };

        it('should extract value from scroll position', () => {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            // Scroll to middle of list (hour 12)
            const middleRepeat = Math.floor(REPEATS / 2);
            const hour12Index = middleRepeat * 24 + 12;
            const scrollTop = (hour12Index - CENTER_INDEX) * ITEM_HEIGHT;
            
            const value = getValueFromScroll(scrollTop, hours);
            expect(value).toBe(12);
        });

        it('should handle wrap-around with modulo', () => {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            // Test that negative modulo works correctly
            const testValues = [0, 1, 23, 12];
            testValues.forEach(expected => {
                const middleRepeat = Math.floor(REPEATS / 2);
                const targetIndex = middleRepeat * 24 + expected;
                const scrollTop = (targetIndex - CENTER_INDEX) * ITEM_HEIGHT;
                const value = getValueFromScroll(scrollTop, hours);
                expect(value).toBe(expected);
            });
        });
    });

    describe('Time formatting', () => {
        const formatTime = (value: number): string => {
            return String(value).padStart(2, '0');
        };

        it('should pad single digit hours', () => {
            expect(formatTime(0)).toBe('00');
            expect(formatTime(1)).toBe('01');
            expect(formatTime(9)).toBe('09');
        });

        it('should not pad double digit hours', () => {
            expect(formatTime(10)).toBe('10');
            expect(formatTime(23)).toBe('23');
        });

        it('should format minutes', () => {
            expect(formatTime(0)).toBe('00');
            expect(formatTime(5)).toBe('05');
            expect(formatTime(30)).toBe('30');
            expect(formatTime(55)).toBe('55');
        });
    });

    describe('Snap calculation', () => {
        const snapToItem = (scrollTop: number): number => {
            return Math.round(scrollTop / ITEM_HEIGHT) * ITEM_HEIGHT;
        };

        it('should snap to exact item position', () => {
            expect(snapToItem(48)).toBe(48);
            expect(snapToItem(96)).toBe(96);
        });

        it('should snap halfway up to next item', () => {
            expect(snapToItem(72)).toBe(96); // 72 is halfway between 48 and 96
        });

        it('should snap halfway down to previous item', () => {
            expect(snapToItem(71)).toBe(48);
        });

        it('should handle non-multiples', () => {
            expect(snapToItem(50)).toBe(48);
            expect(snapToItem(70)).toBe(48);
            expect(snapToItem(75)).toBe(96);
        });
    });

    describe('Repeated items generation', () => {
        const generateRepeatedItems = (values: number[]): number[] => {
            const items: number[] = [];
            for (let r = 0; r < REPEATS; r++) {
                items.push(...values);
            }
            return items;
        };

        it('should repeat hours 20 times', () => {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            const repeated = generateRepeatedItems(hours);
            expect(repeated).toHaveLength(24 * REPEATS);
        });

        it('should repeat minutes correctly', () => {
            const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
            const repeated = generateRepeatedItems(minutes);
            expect(repeated).toHaveLength(12 * REPEATS);
        });

        it('should maintain order in repeats', () => {
            const hours = [0, 1, 2];
            const repeated = generateRepeatedItems(hours);
            expect(repeated.slice(0, 3)).toEqual([0, 1, 2]);
            expect(repeated.slice(3, 6)).toEqual([0, 1, 2]);
        });
    });

    describe('Selection highlight position', () => {
        it('should calculate highlight top position', () => {
            const highlightTop = CENTER_INDEX * ITEM_HEIGHT;
            expect(highlightTop).toBe(96); // 2 * 48
        });

        it('should calculate container height', () => {
            const containerHeight = VISIBLE_ITEMS * ITEM_HEIGHT;
            expect(containerHeight).toBe(240); // 5 * 48
        });
    });

    describe('Fade overlay heights', () => {
        it('should calculate fade height', () => {
            const fadeHeight = CENTER_INDEX * ITEM_HEIGHT;
            expect(fadeHeight).toBe(96);
        });
    });
});
