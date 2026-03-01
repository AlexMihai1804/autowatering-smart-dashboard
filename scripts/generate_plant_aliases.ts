import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type PlantRecord = {
    id: number;
    subtype?: string;
    common_name_ro?: string;
    common_name_en?: string;
    scientific_name?: string;
};

type AliasEntry = {
    id: number;
    subtype: string;
    scientificName: string;
    aliases: string[];
};

const ROOT = resolve(__dirname, '..');
const PLANTS_PATH = resolve(ROOT, 'src/data/plants.json');
const OUTPUT_PATH = resolve(ROOT, 'src/data/plant_aliases_fallback.json');

function normalizeForSearch(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[’'`]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function addValue(set: Set<string>, value: string | undefined | null): void {
    if (!value) return;
    const raw = value.trim();
    if (!raw) return;

    set.add(raw);

    const normalized = normalizeForSearch(raw);
    if (normalized) {
        set.add(normalized);
        const collapsed = normalized.replace(/\s+/g, '');
        if (collapsed && collapsed !== normalized) {
            set.add(collapsed);
        }
    }

    const withoutParens = raw.replace(/[()]/g, ' ');
    const chunks = withoutParens
        .split(/[\/|,;:\-]+/g)
        .map((part) => part.trim())
        .filter(Boolean);

    for (const chunk of chunks) {
        set.add(chunk);
        const chunkNormalized = normalizeForSearch(chunk);
        if (chunkNormalized) set.add(chunkNormalized);

        const tokens = chunkNormalized
            .split(' ')
            .map((token) => token.trim())
            .filter((token) => token.length >= 3);

        for (const token of tokens) {
            set.add(token);
        }
    }
}

function buildAliases(plant: PlantRecord): AliasEntry {
    const aliases = new Set<string>();

    addValue(aliases, plant.common_name_en);
    addValue(aliases, plant.common_name_ro);
    addValue(aliases, plant.scientific_name);

    const subtype = (plant.subtype || '').trim();
    if (subtype) {
        addValue(aliases, subtype);
        addValue(aliases, subtype.replace(/^PLANT_/i, '').replace(/_/g, ' '));
    }

    const cleanedAliases = Array.from(aliases)
        .map((alias) => alias.trim())
        .filter((alias) => alias.length >= 2 && alias.length <= 80)
        .sort((a, b) => a.localeCompare(b));

    return {
        id: plant.id,
        subtype,
        scientificName: (plant.scientific_name || '').trim(),
        aliases: cleanedAliases,
    };
}

function main(): void {
    const plantsRaw = readFileSync(PLANTS_PATH, 'utf-8');
    const plants = JSON.parse(plantsRaw) as PlantRecord[];

    const entries = plants
        .map((plant) => buildAliases(plant))
        .sort((a, b) => a.id - b.id);

    const payload = {
        version: 1,
        generatedAt: new Date().toISOString(),
        sourceFile: 'src/data/plants.json',
        entries,
    };

    writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
    console.log(`[aliases] Generated ${entries.length} entries -> ${OUTPUT_PATH}`);
}

main();
