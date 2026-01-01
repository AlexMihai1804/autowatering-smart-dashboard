/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

describe('useMediaQuery', () => {
    let matchMediaMock: ReturnType<typeof vi.fn>;
    let addEventListenerMock: ReturnType<typeof vi.fn>;
    let removeEventListenerMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        addEventListenerMock = vi.fn();
        removeEventListenerMock = vi.fn();
        matchMediaMock = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addEventListener: addEventListenerMock,
            removeEventListener: removeEventListenerMock,
        }));
        window.matchMedia = matchMediaMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return false initially when query does not match', () => {
        const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
        expect(result.current).toBe(false);
    });

    it('should return true initially when query matches', () => {
        matchMediaMock.mockImplementation((query: string) => ({
            matches: true,
            media: query,
            addEventListener: addEventListenerMock,
            removeEventListener: removeEventListenerMock,
        }));

        const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
        expect(result.current).toBe(true);
    });

    it('should add event listener for changes', () => {
        renderHook(() => useMediaQuery('(min-width: 768px)'));
        expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove event listener on unmount', () => {
        const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
        unmount();
        expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update when media query changes', async () => {
        let changeHandler: (() => void) | null = null;
        addEventListenerMock.mockImplementation((event: string, handler: () => void) => {
            if (event === 'change') {
                changeHandler = handler;
            }
        });

        const mediaQueryList = {
            matches: false,
            media: '(min-width: 768px)',
            addEventListener: addEventListenerMock,
            removeEventListener: removeEventListenerMock,
        };
        matchMediaMock.mockReturnValue(mediaQueryList);

        const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
        expect(result.current).toBe(false);

        // Simulate media query change
        (mediaQueryList as any).matches = true;
        act(() => {
            changeHandler && changeHandler();
        });

        await waitFor(() => {
            expect(result.current).toBe(true);
        });
    });

    it('should handle different queries', () => {
        matchMediaMock.mockImplementation((query: string) => ({
            matches: query.includes('768'),
            media: query,
            addEventListener: addEventListenerMock,
            removeEventListener: removeEventListenerMock,
        }));

        const { result: result768 } = renderHook(() => useMediaQuery('(min-width: 768px)'));
        const { result: result1024 } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

        expect(result768.current).toBe(true);
        expect(result1024.current).toBe(false);
    });
});
