import plantAliasesFallback from '../data/plant_aliases_fallback.json';
import plantAliasesOverrides from '../data/plant_aliases_overrides.json';

export type FuzzyLevel = 'strict' | 'balanced' | 'loose';

export type SearchLocale = 'en' | 'ro';

export interface RankedPlantResult<T> {
    plant: T;
    score: number;
    matchedTerms: string[];
}

export interface SearchPlantsOptions<T> {
    query: string;
    aliasesByPlantId?: Record<string, string[]>;
    fuzzy?: FuzzyLevel;
    locale?: SearchLocale;
    limit?: number;
    minScore?: number;
    getPlantId?: (plant: T) => string | number | null | undefined;
}

const SEARCH_STOP_WORDS = new Set<string>([
    'plant',
    'plants',
    'the',
    'and',
    'for',
    'with',
    'from',
    'de',
    'si',
    'sau',
    'cu',
    'din',
]);

type AliasFallbackEntry = {
    id: number;
    subtype?: string;
    scientificName?: string;
    aliases?: string[];
};

type AliasFallbackData = {
    entries?: AliasFallbackEntry[];
};

type AliasOverridesData = {
    byId?: Record<string, string[]>;
    bySubtype?: Record<string, string[]>;
    byScientific?: Record<string, string[]>;
};

const fallbackData = plantAliasesFallback as AliasFallbackData;
const overridesData = plantAliasesOverrides as AliasOverridesData;

type FallbackIdentityEntry = {
    aliases: string[];
    subtypeKey: string;
    scientificKey: string;
};

const fallbackById = new Map<string, FallbackIdentityEntry>();
const fallbackBySubtype = new Map<string, string[]>();
const fallbackByScientific = new Map<string, string[]>();

for (const entry of fallbackData.entries || []) {
    if (!entry || !Array.isArray(entry.aliases)) continue;

    const aliases = entry.aliases
        .filter((alias): alias is string => typeof alias === 'string' && alias.trim().length > 0)
        .map((alias) => alias.trim());

    const subtypeKey = normalizeSearchText(entry.subtype || '');
    const scientificKey = normalizeSearchText(entry.scientificName || '');

    fallbackById.set(String(entry.id), {
        aliases,
        subtypeKey,
        scientificKey,
    });

    if (subtypeKey) {
        fallbackBySubtype.set(subtypeKey, aliases);
    }

    if (scientificKey) {
        fallbackByScientific.set(scientificKey, aliases);
    }
}

function uniqNormalized(values: string[]): string[] {
    const out = new Set<string>();
    for (const value of values) {
        const normalized = normalizeSearchText(value);
        if (normalized) out.add(normalized);
    }
    return Array.from(out);
}

function readString(raw: unknown): string {
    return typeof raw === 'string' ? raw.trim() : '';
}

function readStringArray(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
}

function tokenize(normalized: string): string[] {
    return normalized
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token));
}

function addTermVariants(target: Set<string>, rawValue: string): void {
    const value = rawValue.trim();
    if (!value) return;

    const normalized = normalizeSearchText(value);
    if (!normalized) return;
    if (SEARCH_STOP_WORDS.has(normalized)) return;

    target.add(value);

    target.add(normalized);

    const collapsed = normalized.replace(/\s+/g, '');
    if (collapsed && collapsed !== normalized) {
        target.add(collapsed);
    }

    for (const token of tokenize(normalized)) {
        target.add(token);
    }

    const parts = value
        .replace(/[()]/g, ' ')
        .split(/[\/|,;:\-]+/g)
        .map((part) => part.trim())
        .filter(Boolean);

    for (const part of parts) {
        const partNormalized = normalizeSearchText(part);
        if (!partNormalized) continue;
        if (SEARCH_STOP_WORDS.has(partNormalized)) continue;
        target.add(part);
        target.add(partNormalized);
        for (const token of tokenize(partNormalized)) {
            target.add(token);
        }
    }
}

function isFallbackIdEntryCompatible(
    entry: FallbackIdentityEntry,
    subtypeKey: string,
    scientificKey: string,
): boolean {
    let comparableCount = 0;
    let matchedCount = 0;

    if (entry.subtypeKey && subtypeKey) {
        comparableCount += 1;
        if (entry.subtypeKey === subtypeKey) matchedCount += 1;
    }

    if (entry.scientificKey && scientificKey) {
        comparableCount += 1;
        if (entry.scientificKey === scientificKey) matchedCount += 1;
    }

    if (comparableCount === 0) {
        return !entry.subtypeKey && !entry.scientificKey;
    }

    return matchedCount > 0;
}

function getPlantIdentity(plant: unknown): {
    id: string;
    subtype: string;
    scientific: string;
} {
    const candidate = plant as Record<string, unknown>;

    const idRaw = candidate.id ?? candidate.plantId;
    const id = idRaw == null ? '' : String(idRaw);

    const subtype = readString(candidate.subtype);
    const scientific = readString(candidate.scientific_name) || readString(candidate.scientificName);

    return { id, subtype, scientific };
}

function getFallbackAliasesForPlant(plant: unknown): string[] {
    const { id, subtype, scientific } = getPlantIdentity(plant);
    const aliases = new Set<string>();
    const subtypeKey = normalizeSearchText(subtype);
    const scientificKey = normalizeSearchText(scientific);

    if (id && fallbackById.has(id)) {
        const fallbackEntry = fallbackById.get(id);
        if (fallbackEntry && isFallbackIdEntryCompatible(fallbackEntry, subtypeKey, scientificKey)) {
            for (const alias of fallbackEntry.aliases) aliases.add(alias);
        }
    }

    if (subtypeKey) {
        for (const alias of fallbackBySubtype.get(subtypeKey) || []) aliases.add(alias);
        for (const alias of overridesData.bySubtype?.[subtypeKey] || []) aliases.add(alias);
    }

    if (scientificKey) {
        for (const alias of fallbackByScientific.get(scientificKey) || []) aliases.add(alias);
        for (const alias of overridesData.byScientific?.[scientificKey] || []) aliases.add(alias);
    }

    if (id && (subtypeKey || scientificKey)) {
        for (const alias of overridesData.byId?.[id] || []) aliases.add(alias);
    }

    return Array.from(aliases);
}

function getPlantRawTerms(plant: unknown): string[] {
    const candidate = plant as Record<string, unknown>;

    const terms: string[] = [];
    terms.push(
        readString(candidate.common_name_ro),
        readString(candidate.common_name_en),
        readString(candidate.scientific_name),
        readString(candidate.commonNameRo),
        readString(candidate.commonNameEn),
        readString(candidate.scientificName),
        readString(candidate.subtype),
        readString(candidate.category),
        readString(candidate.slug),
    );

    terms.push(...readStringArray(candidate.tags));

    return terms.filter(Boolean);
}

function getMinimumScore(fuzzy: FuzzyLevel): number {
    switch (fuzzy) {
        case 'strict':
            return 78;
        case 'loose':
            return 46;
        case 'balanced':
        default:
            return 56;
    }
}

function limitedLevenshtein(a: string, b: string, maxDistance: number): number {
    if (a === b) return 0;

    const lenA = a.length;
    const lenB = b.length;
    const lengthGap = Math.abs(lenA - lenB);
    if (lengthGap > maxDistance) return maxDistance + 1;

    const prev = new Array<number>(lenB + 1);
    const curr = new Array<number>(lenB + 1);

    for (let j = 0; j <= lenB; j += 1) {
        prev[j] = j;
    }

    for (let i = 1; i <= lenA; i += 1) {
        curr[0] = i;
        let rowMin = curr[0];

        for (let j = 1; j <= lenB; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            const substitution = prev[j - 1] + cost;
            const insertion = curr[j - 1] + 1;
            const deletion = prev[j] + 1;
            const value = Math.min(substitution, insertion, deletion);
            curr[j] = value;
            if (value < rowMin) rowMin = value;
        }

        if (rowMin > maxDistance) {
            return maxDistance + 1;
        }

        for (let j = 0; j <= lenB; j += 1) {
            prev[j] = curr[j];
        }
    }

    return prev[lenB];
}

function trigramSet(value: string): Set<string> {
    const padded = `  ${value} `;
    const set = new Set<string>();
    for (let i = 0; i < padded.length - 2; i += 1) {
        set.add(padded.slice(i, i + 3));
    }
    return set;
}

function trigramSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const aSet = trigramSet(a);
    const bSet = trigramSet(b);

    let intersection = 0;
    for (const gram of aSet) {
        if (bSet.has(gram)) intersection += 1;
    }

    const union = aSet.size + bSet.size - intersection;
    if (union <= 0) return 0;
    return intersection / union;
}

function scoreTermAgainstCandidate(queryTerm: string, candidateTerm: string, fuzzy: FuzzyLevel): number {
    if (!queryTerm || !candidateTerm) return 0;

    if (queryTerm === candidateTerm) return 128;

    if (candidateTerm.startsWith(queryTerm)) {
        return queryTerm.length >= 4 ? 114 : 106;
    }

    if (queryTerm.startsWith(candidateTerm) && candidateTerm.length >= 4) {
        return 94;
    }

    if (candidateTerm.includes(queryTerm)) {
        return queryTerm.length >= 4 ? 88 : 80;
    }

    const fuzzyLengthFloor = fuzzy === 'balanced' ? 5 : 4;
    if (queryTerm.length < fuzzyLengthFloor || candidateTerm.length < fuzzyLengthFloor) {
        return 0;
    }

    if (fuzzy === 'strict') return 0;

    const distanceCap = fuzzy === 'loose' ? 3 : 2;
    const distance = limitedLevenshtein(queryTerm, candidateTerm, distanceCap);

    if (distance === 1) return 74;
    if (distance === 2) return fuzzy === 'balanced' ? 64 : 68;
    if (distance === 3 && fuzzy === 'loose') return 56;

    const similarity = trigramSimilarity(queryTerm, candidateTerm);
    if (similarity >= 0.9) return 72;
    if (similarity >= 0.75) return fuzzy === 'balanced' ? 61 : 67;
    if (similarity >= 0.62 && fuzzy === 'loose') return 52;

    return 0;
}

export function normalizeSearchText(text: string): string {
    const repaired = (text || '')
        // Handle common UTF-8 mojibake sequences found in legacy Romanian datasets.
        .replace(/È™|ș|ş/gi, 's')
        .replace(/È›|ț|ţ/gi, 't')
        .replace(/Äƒ|ă/gi, 'a')
        .replace(/Ã¢|â/gi, 'a')
        .replace(/Ã®|î/gi, 'i')
        // Handle lossy decode where Romanian letters degrade to '?' inside words.
        .replace(/([A-Za-z])\?([A-Za-z])/g, '$1s$2');

    return repaired
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[’'`]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function buildCandidateTerms(plant: unknown, aliases: string[] = []): string[] {
    const terms = new Set<string>();

    for (const rawTerm of getPlantRawTerms(plant)) {
        addTermVariants(terms, rawTerm);
    }

    for (const alias of getFallbackAliasesForPlant(plant)) {
        addTermVariants(terms, alias);
    }

    for (const alias of aliases) {
        addTermVariants(terms, alias);
    }

    return uniqNormalized(Array.from(terms));
}

function buildQueryTerms(query: string): string[] {
    const normalized = normalizeSearchText(query);
    if (!normalized) return [];

    const terms = new Set<string>();
    terms.add(normalized);

    for (const token of tokenize(normalized)) {
        terms.add(token);
    }

    for (const stopWord of SEARCH_STOP_WORDS) {
        terms.delete(stopWord);
    }

    return Array.from(terms);
}

export function scorePlantMatch(
    queryTerms: string[],
    candidateTerms: string[],
    fuzzy: FuzzyLevel = 'balanced',
): number {
    const normalizedQueryTerms = uniqNormalized(queryTerms);
    const normalizedCandidateTerms = uniqNormalized(candidateTerms);

    if (normalizedQueryTerms.length === 0 || normalizedCandidateTerms.length === 0) {
        return 0;
    }

    const matchedTerms: number[] = [];

    for (const queryTerm of normalizedQueryTerms) {
        let bestScore = 0;

        for (const candidateTerm of normalizedCandidateTerms) {
            const score = scoreTermAgainstCandidate(queryTerm, candidateTerm, fuzzy);
            if (score > bestScore) bestScore = score;
            if (bestScore >= 128) break;
        }

        matchedTerms.push(bestScore);
    }

    const matchedCount = matchedTerms.filter((score) => score > 0).length;
    if (matchedCount === 0) return 0;

    const averageScore = matchedTerms.reduce((sum, score) => sum + score, 0) / matchedTerms.length;
    const coverageRatio = matchedCount / matchedTerms.length;
    const coverageBonus = coverageRatio * 22;
    const allMatchedBonus = coverageRatio === 1 ? 8 : 0;

    return averageScore + coverageBonus + allMatchedBonus;
}

export function searchPlantsWithRanking<T>(
    plants: T[],
    options: SearchPlantsOptions<T>,
): RankedPlantResult<T>[] {
    const fuzzy = options.fuzzy || 'balanced';
    const minScore = typeof options.minScore === 'number' ? options.minScore : getMinimumScore(fuzzy);
    const queryTerms = buildQueryTerms(options.query);

    if (!queryTerms.length) {
        return plants.map((plant) => ({
            plant,
            score: 0,
            matchedTerms: [],
        }));
    }

    const results: RankedPlantResult<T>[] = [];

    for (const plant of plants) {
        let externalAliases: string[] = [];

        if (options.aliasesByPlantId) {
            const resolvedId = options.getPlantId
                ? options.getPlantId(plant)
                : ((plant as unknown as Record<string, unknown>).id ?? (plant as unknown as Record<string, unknown>).plantId);

            if (resolvedId != null) {
                externalAliases = options.aliasesByPlantId[String(resolvedId)] || [];
            }
        }

        const candidateTerms = buildCandidateTerms(plant, externalAliases);
        const score = scorePlantMatch(queryTerms, candidateTerms, fuzzy);

        if (score >= minScore) {
            const matchedTerms = queryTerms.filter((term) =>
                candidateTerms.some((candidateTerm) => scoreTermAgainstCandidate(term, candidateTerm, fuzzy) > 0),
            );

            results.push({
                plant,
                score,
                matchedTerms,
            });
        }
    }

    results.sort((a, b) => b.score - a.score);

    if (options.limit && options.limit > 0) {
        return results.slice(0, options.limit);
    }

    return results;
}

