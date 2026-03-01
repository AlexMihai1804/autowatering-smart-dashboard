import type { Language } from '../i18n/translations';

export type SupportedLanguage = Language | 'en' | 'ro';

type MaybeString = string | null | undefined;

type DbPlantLike = {
    common_name_ro?: MaybeString;
    common_name_en?: MaybeString;
    scientific_name?: MaybeString;
    subtype?: MaybeString;
};

type MarketplacePlantLike = {
    commonNameRo?: MaybeString;
    commonNameEn?: MaybeString;
    scientificName?: MaybeString;
    slug?: MaybeString;
};

function pickFirstNonEmpty(...values: MaybeString[]): string {
    for (const value of values) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
        }
    }
    return '';
}

export function getLocalizedDbPlantName(plant: DbPlantLike | null | undefined, language: SupportedLanguage): string {
    if (!plant) return '';

    if (language === 'ro') {
        return pickFirstNonEmpty(
            plant.common_name_ro,
            plant.common_name_en,
            plant.scientific_name,
            plant.subtype,
        );
    }

    return pickFirstNonEmpty(
        plant.common_name_en,
        plant.common_name_ro,
        plant.scientific_name,
        plant.subtype,
    );
}

export function getLocalizedMarketplacePlantName(
    plant: MarketplacePlantLike | null | undefined,
    language: SupportedLanguage,
): string {
    if (!plant) return '';

    if (language === 'ro') {
        return pickFirstNonEmpty(
            plant.commonNameRo,
            plant.commonNameEn,
            plant.scientificName,
            plant.slug,
        );
    }

    return pickFirstNonEmpty(
        plant.commonNameEn,
        plant.commonNameRo,
        plant.scientificName,
        plant.slug,
    );
}
