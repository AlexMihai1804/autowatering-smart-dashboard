import type { PlantDBEntry } from '../services/DatabaseService';
import type { PlantIdCandidate } from '../services/PlantIdService';

export type PlantDbIndex = {
  byId: Map<number, PlantDBEntry>;
  byGbifKey: Map<number, PlantDBEntry[]>;
  byScientificNameExact: Map<string, PlantDBEntry[]>;
  byScientificNameCanonical: Map<string, PlantDBEntry[]>;
};

export type PlantDbResolveResult =
  | {
      status: 'match';
      plant: PlantDBEntry;
      matchedBy: 'alias' | 'id' | 'gbif_key' | 'canonical_name' | 'scientific_exact' | 'scientific_canonical';
    }
  | {
      status: 'ambiguous';
      candidates: PlantDBEntry[];
      matchedBy: 'gbif_key' | 'canonical_name' | 'scientific_exact' | 'scientific_canonical';
      query: { gbifKey: number | null; canonicalName: string | null; normalized: string; canonical: string | null };
    }
  | {
      status: 'not_found';
      query: { id: number | null; gbifKey: number | null; canonicalName: string | null; normalized: string; canonical: string | null };
    }
  | { status: 'invalid_candidate' };

export type ResolvePlantDbOptions = {
  aliasPlantIdByLookupKey?: Record<string, number> | null;
};

export function normalizeScientificName(input: string): string {
  const s = (input || '').trim().toLowerCase();
  if (!s) return '';

  // Normalize a few common separators/punctuation without trying to be a full taxonomy parser.
  return s
    .replace(/\u00d7/g, ' x ') // multiplication sign -> 'x'
    .replace(/[()\[\]{}.,;:\/\\_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeScientificName(input: string): string | null {
  const normalized = normalizeScientificName(input);
  if (!normalized) return null;

  const rawTokens = normalized.split(' ').filter(Boolean);
  const tokens = rawTokens
    .map(t => t.replace(/\.$/, '')) // strip trailing dot (ex: "subsp.")
    .filter(t => t !== 'x' && t !== 'sp' && t !== 'spp');

  const skip = new Set([
    'subsp',
    'ssp',
    'var',
    'f',
    'forma',
    'cv',
    'cultivar',
    'group',
    'hybrid',
  ]);

  // Heuristic: pick the first two "latin-ish" tokens that are not rank markers.
  let genus: string | null = null;
  let species: string | null = null;

  for (const token of tokens) {
    if (skip.has(token)) continue;
    if (!/^[a-z][a-z-]+$/.test(token)) continue;
    genus = token;
    break;
  }

  if (!genus) return null;

  let afterGenus = false;
  for (const token of tokens) {
    if (!afterGenus) {
      if (token === genus) afterGenus = true;
      continue;
    }
    if (skip.has(token)) continue;
    if (!/^[a-z][a-z-]+$/.test(token)) continue;
    species = token;
    break;
  }

  if (!species) return null;
  return `${genus} ${species}`;
}

function parseNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePlantGbifKey(plant: PlantDBEntry): number | null {
  return parseNumber((plant as any).gbif_key);
}

export function buildPlantDbIndex(plantDb: PlantDBEntry[]): PlantDbIndex {
  const byId = new Map<number, PlantDBEntry>();
  const byGbifKey = new Map<number, PlantDBEntry[]>();
  const byScientificNameExact = new Map<string, PlantDBEntry[]>();
  const byScientificNameCanonical = new Map<string, PlantDBEntry[]>();

  const push = (map: Map<string | number, PlantDBEntry[]>, key: string | number, plant: PlantDBEntry) => {
    if (typeof key === 'string' && !key) return;
    const existing = map.get(key);
    if (existing) existing.push(plant);
    else map.set(key, [plant]);
  };

  for (const plant of plantDb) {
    if (typeof plant.id === 'number') {
      byId.set(plant.id, plant);
    }

    const gbifKey = parsePlantGbifKey(plant);
    if (gbifKey !== null) {
      push(byGbifKey, gbifKey, plant);
    }

    const exact = normalizeScientificName(plant.scientific_name);
    push(byScientificNameExact, exact, plant);

    const canonical = canonicalizeScientificName((plant as any).canonical_name || plant.scientific_name);
    if (canonical) push(byScientificNameCanonical, canonical, plant);
  }

  return { byId, byGbifKey, byScientificNameExact, byScientificNameCanonical };
}

function parseCandidateId(candidate: PlantIdCandidate): number | null {
  return parseNumber((candidate as any)?.plant_id ?? (candidate as any)?.id);
}

function parseCandidateGbifKey(candidate: PlantIdCandidate): number | null {
  return parseNumber((candidate as any)?.gbif_key ?? (candidate as any)?.gbifKey);
}

function getCandidateScientificName(candidate: PlantIdCandidate): string {
  const raw = (candidate as any)?.scientific_name ?? (candidate as any)?.scientificName ?? '';
  return String(raw || '').trim();
}

function getCandidateCanonicalName(candidate: PlantIdCandidate): string {
  const raw = (candidate as any)?.canonical_name ?? (candidate as any)?.canonicalName ?? '';
  return String(raw || '').trim();
}

export function getPlantIdCandidateLookupKeys(candidate: PlantIdCandidate): string[] {
  const keys = new Set<string>();
  const gbifKey = parseCandidateGbifKey(candidate);
  if (gbifKey !== null) {
    keys.add(`gbif:${gbifKey}`);
  }

  const canonicalName = getCandidateCanonicalName(candidate);
  const canonicalFromCanonical = canonicalizeScientificName(canonicalName);
  if (canonicalFromCanonical) {
    keys.add(`canonical:${canonicalFromCanonical}`);
  }

  const scientificName = getCandidateScientificName(candidate);
  const normalized = normalizeScientificName(scientificName);
  const canonical = canonicalizeScientificName(scientificName);
  if (normalized) {
    keys.add(`scientific:${normalized}`);
  }
  if (canonical) {
    keys.add(`canonical:${canonical}`);
  }

  return Array.from(keys);
}

export function resolvePlantDbEntryFromCandidate(
  candidate: PlantIdCandidate | null | undefined,
  index: PlantDbIndex,
  options?: ResolvePlantDbOptions
): PlantDbResolveResult {
  if (!candidate) return { status: 'invalid_candidate' };

  const candidateId = parseCandidateId(candidate);
  const candidateGbifKey = parseCandidateGbifKey(candidate);
  const scientificName = getCandidateScientificName(candidate);
  const candidateCanonicalName = getCandidateCanonicalName(candidate);

  const normalized = normalizeScientificName(scientificName);
  const canonical = canonicalizeScientificName(scientificName);
  const canonicalName = canonicalizeScientificName(candidateCanonicalName);

  const aliasMap = options?.aliasPlantIdByLookupKey ?? null;
  if (aliasMap) {
    const aliasKeys = getPlantIdCandidateLookupKeys(candidate);
    for (const aliasKey of aliasKeys) {
      const plantId = aliasMap[aliasKey];
      if (typeof plantId !== 'number') continue;
      const aliased = index.byId.get(plantId);
      if (aliased) {
        return { status: 'match', plant: aliased, matchedBy: 'alias' };
      }
    }
  }

  if (candidateId !== null) {
    const byId = index.byId.get(candidateId);
    if (byId) return { status: 'match', plant: byId, matchedBy: 'id' };
  }

  if (candidateGbifKey !== null) {
    const gbifCandidates = index.byGbifKey.get(candidateGbifKey) || [];
    if (gbifCandidates.length === 1) {
      return { status: 'match', plant: gbifCandidates[0], matchedBy: 'gbif_key' };
    }
    if (gbifCandidates.length > 1) {
      const stable = [...gbifCandidates].sort((a, b) => a.id - b.id);
      return {
        status: 'ambiguous',
        candidates: stable,
        matchedBy: 'gbif_key',
        query: { gbifKey: candidateGbifKey, canonicalName, normalized, canonical }
      };
    }
  }

  if (canonicalName) {
    const canonicalNameCandidates = index.byScientificNameCanonical.get(canonicalName) || [];
    if (canonicalNameCandidates.length === 1) {
      return { status: 'match', plant: canonicalNameCandidates[0], matchedBy: 'canonical_name' };
    }
    if (canonicalNameCandidates.length > 1) {
      const stable = [...canonicalNameCandidates].sort((a, b) => a.id - b.id);
      return {
        status: 'ambiguous',
        candidates: stable,
        matchedBy: 'canonical_name',
        query: { gbifKey: candidateGbifKey, canonicalName, normalized, canonical }
      };
    }
  }

  if (normalized) {
    const exactCandidates = index.byScientificNameExact.get(normalized) || [];
    if (exactCandidates.length === 1) {
      return { status: 'match', plant: exactCandidates[0], matchedBy: 'scientific_exact' };
    }
    if (exactCandidates.length > 1) {
      const stable = [...exactCandidates].sort((a, b) => a.id - b.id);
      return {
        status: 'ambiguous',
        candidates: stable,
        matchedBy: 'scientific_exact',
        query: { gbifKey: candidateGbifKey, canonicalName, normalized, canonical }
      };
    }
  }

  if (canonical) {
    const canonCandidates = index.byScientificNameCanonical.get(canonical) || [];
    if (canonCandidates.length === 1) {
      return { status: 'match', plant: canonCandidates[0], matchedBy: 'scientific_canonical' };
    }
    if (canonCandidates.length > 1) {
      const stable = [...canonCandidates].sort((a, b) => a.id - b.id);
      return {
        status: 'ambiguous',
        candidates: stable,
        matchedBy: 'scientific_canonical',
        query: { gbifKey: candidateGbifKey, canonicalName, normalized, canonical }
      };
    }
  }

  return { status: 'not_found', query: { id: candidateId, gbifKey: candidateGbifKey, canonicalName, normalized, canonical } };
}

