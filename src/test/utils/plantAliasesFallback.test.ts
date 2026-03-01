import plants from '../../data/plants.json';
import aliasesFallback from '../../data/plant_aliases_fallback.json';
import { describe, expect, it } from 'vitest';

type PlantRecord = {
    id: number;
    common_name_en?: string;
    common_name_ro?: string;
};

type AliasEntry = {
    id: number;
    aliases?: string[];
};

function normalize(text: string): string {
    return (text || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[’'`]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

describe('plant aliases fallback coverage', () => {
    it('covers RO and EN common names for all plants', () => {
        const sourcePlants = plants as PlantRecord[];
        const entries = ((aliasesFallback as { entries?: AliasEntry[] }).entries || []) as AliasEntry[];
        const byId = new Map<number, AliasEntry>(entries.map((entry) => [entry.id, entry]));

        expect(entries.length).toBe(sourcePlants.length);

        const missingEn: number[] = [];
        const missingRo: number[] = [];

        for (const plant of sourcePlants) {
            const entry = byId.get(plant.id);
            if (!entry) {
                missingEn.push(plant.id);
                missingRo.push(plant.id);
                continue;
            }

            const aliases = new Set((entry.aliases || []).map((alias) => normalize(alias)));
            const en = normalize(plant.common_name_en || '');
            const ro = normalize(plant.common_name_ro || '');

            if (en && !aliases.has(en)) missingEn.push(plant.id);
            if (ro && !aliases.has(ro)) missingRo.push(plant.id);
        }

        expect(missingEn).toEqual([]);
        expect(missingRo).toEqual([]);
    });
});

