// ── Marketplace Types ──────────────────────────────────────────────

export type PlantStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'ai_flagged';

export interface PlantImage {
    key: string;
    url?: string;
    isPrimary: boolean;
    width?: number;
    height?: number;
    uploadedAt: string;
    caption?: string;
    source?: string;
    phash?: string;
}

export interface PlantStats {
    downloads: number;
    rating: number;
    ratingCount: number;
    reviewCount: number;
    views: number;
    viewCount: number;
    commentCount: number;
}

export interface MarketplacePlant {
    plantId: string;
    authorUid: string;
    status: PlantStatus;
    slug: string;
    commonNameEn: string;
    commonNameRo: string;
    scientificName: string;
    category: string;
    description: string;
    descriptionEn: string;
    descriptionRo: string;
    descriptions?: Record<string, string>;        // { en: "...", ro: "...", fr: "..." }
    availableTranslations?: string[];              // ["ro", "fr", ...]
    careGuide: string;
    tags: string[];
    images: PlantImage[];
    plantData: Record<string, unknown>;
    stats: PlantStats;
    isOfficial: boolean;
    authorType: string;
    ratingSortKey: string;
    downloadsSortKey: string;
    moderationScore?: number;
    moderationNotes?: string;
    moderatedBy?: string;
    moderatedAt?: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    romPlantId?: number;
}

/** Lightweight plant summary for lists */
export interface PlantSummary {
    plantId: string;
    commonNameEn: string;
    commonNameRo: string;
    scientificName: string;
    category: string;
    status?: PlantStatus;
    isOfficial?: boolean;
    romPlantId?: number;
    primaryImage: PlantImage | null;
    stats: PlantStats;
}

export interface MarketplacePack {
    packId: string;
    authorUid: string;
    status: string;
    nameEn: string;
    nameRo: string;
    descriptionEn: string;
    descriptionRo: string;
    coverImageKey: string;
    plantIds: string[];
    plantCount: number;
    tags: string[];
    stats: { downloads: number; rating: number };
    createdAt: string;
    updatedAt: string;
}

export interface PackDetail extends MarketplacePack {
    plants: PlantSummary[];
}

export interface UserPlant {
    plantId: string;
    commonNameEn: string;
    commonNameRo: string;
    scientificName: string;
    category: string;
    primaryImage: PlantImage | null;
    stats: PlantStats;
    installedAt: string;
    syncedToDevice: boolean;
    devicePlantId: number | null;
}

export interface Review {
    reviewId: string;
    plantId: string;
    authorUid: string;
    rating: number;
    title: string;
    body: string;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    commentId: string;
    plantId: string;
    authorUid: string;
    content: string;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
}

export type NotificationType = 'plant_approved' | 'plant_rejected' | 'new_review' | 'new_comment' | 'new_download';

export interface MarketplaceNotification {
    uid: string;
    notificationId: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    nextToken: string | null;
}

// ── AI Types ───────────────────────────────────────────────────────

export interface AiFillGapsResult {
    suggestions: Record<string, unknown>;
    model: string;
    tier: string;
}

export interface AiTranslateResult {
    translations: Record<string, unknown>;
    fromLang: string;
    toLang: string;
}

export interface AiSearchResult {
    answer: string;
    citations: unknown[];
    model: string;
    tier: string;
}

export interface AiChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AiChatResult {
    response: string;
    model: string;
    tier: string;
}

// ── Moderation ─────────────────────────────────────────────────────

export interface ModerationResult {
    overallScore: number;
    scores: {
        scientificAccuracy: number;
        completeness: number;
        quality: number;
        spamRisk: number;
        duplicateRisk: number;
    };
    recommendation: 'approve' | 'reject' | 'needs_review';
    issues: string[];
    suggestions: string[];
}

// ── Plant Editor ───────────────────────────────────────────────────

export interface PlantEditorData {
    commonNameEn: string;
    commonNameRo: string;
    scientificName: string;
    category: string;
    descriptionEn: string;
    descriptionRo: string;
    tags: string[];
    plantData: Record<string, unknown>;
}

export const PLANT_CATEGORIES = [
    'Agriculture',
    'Gardening',
    'Landscaping',
    'Indoor',
    'Succulent',
    'Fruit',
    'Vegetable',
    'Herb',
    'Lawn',
    'Shrub',
] as const;

export type PlantCategory = typeof PLANT_CATEGORIES[number];
