import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
    MarketplacePlant,
    PlantSummary,
    MarketplacePack,
    UserPlant,
    Review,
    Comment,
    MarketplaceNotification,
} from '../types/marketplace';

/** Status of syncing a marketplace plant to a BLE device */
export type DeviceSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/** Tracks a plant's sync state on the connected device */
export interface DevicePlantMapping {
    /** Cloud marketplace plantId (UUID) */
    marketplantId: string;
    /** Device plant_id (≥224 for custom, 1-223 for ROM) */
    devicePlantId: number;
    /** When last synced to device */
    syncedAt: string;
}

interface MarketplaceState {
    // ── Browse ──────────────────────────────────────────────────
    plants: PlantSummary[];
    plantsNextToken: string | null;
    plantsLoading: boolean;
    plantsCategory: string;
    plantsSort: 'newest' | 'top_rated' | 'most_downloaded';
    plantsSearch: string;

    // ── Plant detail ────────────────────────────────────────────
    currentPlant: MarketplacePlant | null;
    currentPlantLoading: boolean;
    currentPlantReviews: Review[];
    currentPlantComments: Comment[];

    // ── Packs ───────────────────────────────────────────────────
    packs: MarketplacePack[];
    packsNextToken: string | null;
    packsLoading: boolean;

    // ── User Library ────────────────────────────────────────────
    library: UserPlant[];
    libraryLoading: boolean;

    // ── My Plants (author) ──────────────────────────────────────
    myPlants: PlantSummary[];
    myPlantsLoading: boolean;

    // ── Notifications ───────────────────────────────────────────
    notifications: MarketplaceNotification[];
    unreadCount: number;

    // ── AI ───────────────────────────────────────────────────────
    aiLoading: boolean;
    aiError: string | null;

    // ── Device Sync ─────────────────────────────────────────────
    /** Maps marketplace plantId → device plantId for synced plants */
    devicePlantMap: Record<string, number>;
    /** Current sync operation status */
    deviceSyncStatus: DeviceSyncStatus;
    /** Error message from last sync failure */
    deviceSyncError: string | null;
    /** Plant IDs currently being synced to device */
    syncingPlantIds: string[];
    /** change_counter from PackStats when devicePlantMap was last reconciled */
    deviceMapChangeCounter: number;

    // ── Actions ─────────────────────────────────────────────────
    setPlants: (plants: PlantSummary[], nextToken: string | null) => void;
    appendPlants: (plants: PlantSummary[], nextToken: string | null) => void;
    setPlantsLoading: (loading: boolean) => void;
    setPlantsCategory: (category: string) => void;
    setPlantsSort: (sort: 'newest' | 'top_rated' | 'most_downloaded') => void;
    setPlantsSearch: (search: string) => void;

    setCurrentPlant: (plant: MarketplacePlant | null) => void;
    setCurrentPlantLoading: (loading: boolean) => void;
    setCurrentPlantReviews: (reviews: Review[]) => void;
    setCurrentPlantComments: (comments: Comment[]) => void;

    setPacks: (packs: MarketplacePack[], nextToken: string | null) => void;
    setPacksLoading: (loading: boolean) => void;

    setLibrary: (library: UserPlant[]) => void;
    setLibraryLoading: (loading: boolean) => void;
    addToLibrary: (plant: UserPlant) => void;
    removeFromLibrary: (plantId: string) => void;

    setMyPlants: (plants: PlantSummary[]) => void;
    setMyPlantsLoading: (loading: boolean) => void;

    setNotifications: (notifications: MarketplaceNotification[]) => void;
    setUnreadCount: (count: number) => void;
    markNotificationRead: (ids: string[]) => void;

    setAiLoading: (loading: boolean) => void;
    setAiError: (error: string | null) => void;

    // Device sync actions
    setDevicePlantMapping: (marketplantId: string, devicePlantId: number) => void;
    removeDevicePlantMapping: (marketplantId: string) => void;
    setDeviceSyncStatus: (status: DeviceSyncStatus) => void;
    setDeviceSyncError: (error: string | null) => void;
    addSyncingPlantId: (plantId: string) => void;
    removeSyncingPlantId: (plantId: string) => void;
    updateLibraryPlantSyncStatus: (plantId: string, synced: boolean, devicePlantId: number | null) => void;
    setDeviceMapChangeCounter: (counter: number) => void;

    resetMarketplace: () => void;
}

const initialState = {
    plants: [] as PlantSummary[],
    plantsNextToken: null as string | null,
    plantsLoading: false,
    plantsCategory: '',
    plantsSort: 'newest' as const,
    plantsSearch: '',
    currentPlant: null as MarketplacePlant | null,
    currentPlantLoading: false,
    currentPlantReviews: [] as Review[],
    currentPlantComments: [] as Comment[],
    packs: [] as MarketplacePack[],
    packsNextToken: null as string | null,
    packsLoading: false,
    library: [] as UserPlant[],
    libraryLoading: false,
    myPlants: [] as PlantSummary[],
    myPlantsLoading: false,
    notifications: [] as MarketplaceNotification[],
    unreadCount: 0,
    aiLoading: false,
    aiError: null as string | null,
    devicePlantMap: {} as Record<string, number>,
    deviceSyncStatus: 'idle' as DeviceSyncStatus,
    deviceSyncError: null as string | null,
    syncingPlantIds: [] as string[],
    deviceMapChangeCounter: 0,
};

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set) => ({
    ...initialState,

    // Browse
    setPlants: (plants, nextToken) => set({ plants, plantsNextToken: nextToken }),
    appendPlants: (plants, nextToken) =>
        set((s) => ({ plants: [...s.plants, ...plants], plantsNextToken: nextToken })),
    setPlantsLoading: (plantsLoading) => set({ plantsLoading }),
    setPlantsCategory: (plantsCategory) => set({ plantsCategory, plants: [], plantsNextToken: null }),
    setPlantsSort: (plantsSort) => set({ plantsSort, plants: [], plantsNextToken: null }),
    setPlantsSearch: (plantsSearch) => set({ plantsSearch }),

    // Plant detail
    setCurrentPlant: (currentPlant) => set({ currentPlant }),
    setCurrentPlantLoading: (currentPlantLoading) => set({ currentPlantLoading }),
    setCurrentPlantReviews: (currentPlantReviews) => set({ currentPlantReviews }),
    setCurrentPlantComments: (currentPlantComments) => set({ currentPlantComments }),

    // Packs
    setPacks: (packs, nextToken) => set({ packs, packsNextToken: nextToken }),
    setPacksLoading: (packsLoading) => set({ packsLoading }),

    // Library
    setLibrary: (library) => set({ library }),
    setLibraryLoading: (libraryLoading) => set({ libraryLoading }),
    addToLibrary: (plant) => set((s) => ({ library: [...s.library, plant] })),
    removeFromLibrary: (plantId) =>
        set((s) => ({ library: s.library.filter((p) => p.plantId !== plantId) })),

    // My Plants
    setMyPlants: (myPlants) => set({ myPlants }),
    setMyPlantsLoading: (myPlantsLoading) => set({ myPlantsLoading }),

    // Notifications
    setNotifications: (notifications) => set({ notifications }),
    setUnreadCount: (unreadCount) => set({ unreadCount }),
    markNotificationRead: (ids) =>
        set((s) => ({
            notifications: s.notifications.map((n) =>
                ids.includes(n.notificationId) ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, s.unreadCount - ids.length),
        })),

    // AI
    setAiLoading: (aiLoading) => set({ aiLoading }),
    setAiError: (aiError) => set({ aiError }),

    // Device sync
    setDevicePlantMapping: (marketplantId, devicePlantId) =>
        set((s) => ({
            devicePlantMap: { ...s.devicePlantMap, [marketplantId]: devicePlantId },
        })),
    removeDevicePlantMapping: (marketplantId) =>
        set((s) => {
            const { [marketplantId]: _, ...rest } = s.devicePlantMap;
            return { devicePlantMap: rest };
        }),
    setDeviceSyncStatus: (deviceSyncStatus) => set({ deviceSyncStatus }),
    setDeviceSyncError: (deviceSyncError) => set({ deviceSyncError }),
    addSyncingPlantId: (plantId) =>
        set((s) => ({ syncingPlantIds: [...s.syncingPlantIds, plantId] })),
    removeSyncingPlantId: (plantId) =>
        set((s) => ({ syncingPlantIds: s.syncingPlantIds.filter((id) => id !== plantId) })),
    updateLibraryPlantSyncStatus: (plantId, synced, devicePlantId) =>
        set((s) => ({
            library: s.library.map((p) =>
                p.plantId === plantId
                    ? { ...p, syncedToDevice: synced, devicePlantId }
                    : p
            ),
        })),
    setDeviceMapChangeCounter: (deviceMapChangeCounter) => set({ deviceMapChangeCounter }),

    resetMarketplace: () => set(initialState),
    }),
    {
      name: 'marketplace-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        library: state.library,
        plants: state.plants.slice(0, 50),  // Cache first 50 plants for offline browse
        unreadCount: state.unreadCount,
        devicePlantMap: state.devicePlantMap,
        deviceMapChangeCounter: state.deviceMapChangeCounter,
      }),
    }
  )
);
