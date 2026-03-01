import { create } from 'zustand';

const STORAGE_KEY = 'autowater_ux_mode';

type UxMode = 'simple' | 'advanced';

interface UxPrefsState {
    /** 'simple' hides technical details, 'advanced' shows everything */
    mode: UxMode;
    setMode: (mode: UxMode) => void;
    toggleMode: () => void;
    isAdvanced: boolean;
}

function getStoredMode(): UxMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'advanced') return 'advanced';
    } catch { /* ignore */ }
    return 'simple'; // default for casual users
}

export const useUxPrefsStore = create<UxPrefsState>((set, get) => ({
    mode: getStoredMode(),
    isAdvanced: getStoredMode() === 'advanced',

    setMode: (mode: UxMode) => {
        try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
        set({ mode, isAdvanced: mode === 'advanced' });
    },

    toggleMode: () => {
        const next = get().mode === 'simple' ? 'advanced' : 'simple';
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
        set({ mode: next, isAdvanced: next === 'advanced' });
    },
}));
