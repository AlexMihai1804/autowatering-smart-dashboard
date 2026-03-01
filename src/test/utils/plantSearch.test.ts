import { describe, expect, it } from 'vitest';
import {
    buildCandidateTerms,
    normalizeSearchText,
    scorePlantMatch,
    searchPlantsWithRanking,
} from '../../utils/plantSearch';

describe('plantSearch utils', () => {
    const tomato = {
        id: 101,
        subtype: 'PLANT_TOMATO',
        category: 'Vegetable',
        common_name_ro: 'Ro?ie',
        common_name_en: 'Tomato',
        scientific_name: 'Solanum lycopersicum',
    };

    const pepper = {
        id: 102,
        subtype: 'PLANT_PEPPER',
        category: 'Vegetable',
        common_name_ro: 'Ardei',
        common_name_en: 'Pepper',
        scientific_name: 'Capsicum annuum',
    };

    it('normalizes diacritics and punctuation', () => {
        expect(normalizeSearchText('Ro?ie!')).toBe('rosie');
        expect(normalizeSearchText('Maize (Corn)')).toBe('maize corn');
    });

    it('matches diacritics-insensitive queries (rosie -> Ro?ie)', () => {
        const results = searchPlantsWithRanking([tomato, pepper], {
            query: 'rosie',
            fuzzy: 'balanced',
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].plant.id).toBe(101);
    });

    it('supports cross-language search (EN query finds RO plant and vice versa)', () => {
        const enToRo = searchPlantsWithRanking([tomato], { query: 'tomato' });
        const roToEn = searchPlantsWithRanking([tomato], { query: 'rosie' });

        expect(enToRo[0].plant.id).toBe(101);
        expect(roToEn[0].plant.id).toBe(101);
    });

    it('handles fuzzy typo matching (tomto -> Tomato)', () => {
        const results = searchPlantsWithRanking([tomato, pepper], {
            query: 'tomto',
            fuzzy: 'balanced',
        });

        expect(results[0].plant.id).toBe(101);
    });

    it('ranks exact match above prefix and fuzzy matches', () => {
        const plants = [
            tomato,
            {
                id: 103,
                subtype: 'PLANT_TOMATILLO',
                category: 'Vegetable',
                common_name_ro: 'Tomatillo',
                common_name_en: 'Tomatillo',
                scientific_name: 'Physalis philadelphica',
            },
            {
                id: 104,
                subtype: 'PLANT_POTATO',
                category: 'Vegetable',
                common_name_ro: 'Cartof',
                common_name_en: 'Potato',
                scientific_name: 'Solanum tuberosum',
            },
        ];

        const ranked = searchPlantsWithRanking(plants, {
            query: 'tomato',
            fuzzy: 'balanced',
        });

        expect(ranked[0].plant.id).toBe(101);
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('uses local fallback aliases without network dependency', () => {
        const maizePlant = {
            id: 200,
            subtype: 'PLANT_MAIZE',
            category: 'Agriculture',
            common_name_ro: 'Porumb',
            common_name_en: 'Corn',
            scientific_name: 'Zea mays',
        };

        const results = searchPlantsWithRanking([maizePlant], {
            query: 'maize',
            fuzzy: 'balanced',
        });

        expect(results.length).toBe(1);
        expect(results[0].plant.id).toBe(200);
    });

    it('supports RO and EN alias search for the same plant', () => {
        const maizePlant = {
            id: 2,
            subtype: 'PLANT_MAIZE',
            category: 'Agriculture',
            common_name_ro: '',
            common_name_en: 'Corn',
            scientific_name: 'Zea mays',
        };

        const roResults = searchPlantsWithRanking([maizePlant], {
            query: 'porumb',
            fuzzy: 'balanced',
        });
        const enResults = searchPlantsWithRanking([maizePlant], {
            query: 'maize',
            fuzzy: 'balanced',
        });

        expect(roResults.length).toBe(1);
        expect(roResults[0].plant.id).toBe(2);
        expect(enResults.length).toBe(1);
        expect(enResults[0].plant.id).toBe(2);
    });

    it('scores exact terms above fuzzy candidates', () => {
        const queryTerms = ['tomato'];
        const exact = scorePlantMatch(queryTerms, buildCandidateTerms(tomato), 'balanced');
        const fuzzy = scorePlantMatch(queryTerms, buildCandidateTerms(pepper), 'balanced');

        expect(exact).toBeGreaterThan(fuzzy);
    });
});
