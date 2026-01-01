import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('utils', () => {
    describe('cn (className utility)', () => {
        it('should merge class names', () => {
            const result = cn('class1', 'class2');
            expect(result).toContain('class1');
            expect(result).toContain('class2');
        });

        it('should handle single class name', () => {
            const result = cn('single-class');
            expect(result).toBe('single-class');
        });

        it('should handle empty input', () => {
            const result = cn();
            expect(result).toBe('');
        });

        it('should handle undefined values', () => {
            const result = cn('valid', undefined, 'also-valid');
            expect(result).toContain('valid');
            expect(result).toContain('also-valid');
        });

        it('should handle null values', () => {
            const result = cn('valid', null, 'also-valid');
            expect(result).toContain('valid');
            expect(result).toContain('also-valid');
        });

        it('should handle false values', () => {
            const result = cn('valid', false, 'also-valid');
            expect(result).toContain('valid');
            expect(result).toContain('also-valid');
        });

        it('should handle conditional classes', () => {
            const isActive = true;
            const result = cn('base', isActive && 'active');
            expect(result).toContain('base');
            expect(result).toContain('active');
        });

        it('should handle conditional classes when false', () => {
            const isActive = false;
            const result = cn('base', isActive && 'active');
            expect(result).toBe('base');
        });

        it('should merge tailwind conflicting classes', () => {
            // twMerge should handle conflicting tailwind classes
            const result = cn('p-4', 'p-2');
            // The second one should win
            expect(result).toBe('p-2');
        });

        it('should handle object syntax', () => {
            const result = cn({ 'class-a': true, 'class-b': false });
            expect(result).toContain('class-a');
            expect(result).not.toContain('class-b');
        });

        it('should handle array syntax', () => {
            const result = cn(['class-1', 'class-2']);
            expect(result).toContain('class-1');
            expect(result).toContain('class-2');
        });

        it('should handle mixed syntax', () => {
            const result = cn(
                'base-class',
                { conditional: true },
                ['array-class'],
                null,
                undefined
            );
            expect(result).toContain('base-class');
            expect(result).toContain('conditional');
            expect(result).toContain('array-class');
        });

        it('should handle tailwind responsive classes', () => {
            const result = cn('text-sm', 'md:text-lg');
            expect(result).toContain('text-sm');
            expect(result).toContain('md:text-lg');
        });

        it('should handle tailwind state classes', () => {
            const result = cn('bg-blue-500', 'hover:bg-blue-600');
            expect(result).toContain('bg-blue-500');
            expect(result).toContain('hover:bg-blue-600');
        });
    });
});
