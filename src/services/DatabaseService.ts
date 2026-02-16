import { useAppStore } from '../store/useAppStore';

function getIrrigationPopularityScore(codeEnum: string): number {
    const c = (codeEnum || '').toUpperCase();

    // Broad heuristic popularity ordering (most common first)
    // Drip > Sprinkler > Micro/Soaker > Pivot/LEPA > Surface/Furrow > Other
    if (c.includes('DRIP')) return 100;
    if (c.includes('SPRINKLER')) return 85;
    if (c.includes('MICRO')) return 80;
    if (c.includes('SOAKER')) return 78;
    if (c.includes('PIVOT') || c.includes('LEPA') || c.includes('LINEAR')) return 70;
    if (c.includes('MANUAL')) return 55;
    if (c.includes('SURFACE')) return 45;
    if (c.includes('FURROW')) return 40;
    if (c.includes('FLOOD') || c.includes('BASIN') || c.includes('BORDER')) return 38;

    return 10;
}

// ============================================================================
// Plant Database Entry - Full FAO-56 compatible structure
// ============================================================================
export interface PlantDBEntry {
    id: number;
    subtype: string;              // e.g., "PLANT_TOMATO"
    category: string;             // Agriculture, Gardening, Landscaping, Indoor, Succulent, Fruit, Herb, Lawn, Shrub, Vegetable
    common_name_ro: string;       // Romanian name
    common_name_en: string;       // English name
    scientific_name: string;      // Latin name
    gbif_key?: number | null;     // Optional stable taxonomy key (GBIF speciesKey/usageKey)
    canonical_name?: string | null; // Optional canonical taxon name (from resolver)
    indoor_ok: boolean;
    toxic_flag: boolean;
    edible_part: string;
    primary_use: string;
    fertility_need: string;       // LOW, MEDIUM, HIGH
    pruning_need: string;         // LOW, MEDIUM, HIGH
    growth_rate: string;          // SLOW, MEDIUM, FAST
    
    // FAO-56 Crop Coefficients
    kc_ini: number | null;        // Initial stage Kc
    kc_mid: number | null;        // Mid-season Kc
    kc_end: number | null;        // End/late season Kc
    kc_dev: number | null;        // Development stage Kc (optional)
    
    // Root depth
    root_depth_min_m: number | null;
    root_depth_max_m: number | null;
    
    // Depletion fraction
    depletion_fraction_p: number | null;
    allowable_depletion_pct: number | null;
    
    // Growth stages (days)
    stage_days_ini: number | null;
    stage_days_dev: number | null;
    stage_days_mid: number | null;
    stage_days_end: number | null;
    
    // Growth cycle info
    growth_cycle: string;         // Annual, Perennial, Biennial
    maturity_days_min: number | null;
    maturity_days_max: number | null;
    juvenile_years_to_bearing: number | null;
    
    // Spacing
    spacing_row_m: number | null;
    spacing_plant_m: number | null;
    default_density_plants_m2: number | null;
    canopy_cover_max_frac: number | null;
    
    // Tolerances
    shade_tolerance: string;      // LOW, MED, HIGH
    drought_tolerance: string;    // NONE, LOW, MED, HIGH
    salinity_tolerance: string;   // LOW, MED, HIGH
    
    // Recommended irrigation
    typ_irrig_method: string;     // DRIP, SPRINKLER, SURFACE, MANUAL, RAINFED
    
    // Source tags
    kc_source_tag: string;
    root_depth_source: string;
    water_stress_sensitive_stage: string;
    
    // pH and temperature
    ph_min: number | null;
    ph_max: number | null;
    frost_tolerance_c: number | null;
    temp_opt_min_c: number | null;
    temp_opt_max_c: number | null;
}

// ============================================================================
// Soil Database Entry
// ============================================================================
export interface SoilDBEntry {
    id: number;
    soil_type: string;            // e.g., "Sand", "Loam", "Clay"
    texture: string;              // Human-readable description
    field_capacity_pct: number | null;    // FC % volume
    wilting_point_pct: number | null;     // PWP % volume
    available_water_mm_m: number | null;  // AWC mm per meter depth
    infiltration_rate_mm_h: number | null;// Infiltration rate mm/h
    p_raw: number | null;         // Raw depletion fraction
}

// ============================================================================
// Irrigation Method Entry
// ============================================================================
export interface IrrigationMethodEntry {
    id: number;
    name: string;                 // e.g., "Drip Surface (Line+Emitters)"
    code_enum: string;            // e.g., "IRRIG_DRIP_SURFACE"
    efficiency_pct: number | null;
    infiltration_style: string;
    wetting_fraction: number | string | null;  // Can be "≈0" for hydroponic
    depth_typical_mm: string;     // Range like "8-20"
    application_rate_mm_h: string;// Range or "Continuous"
    distribution_uniformity_pct: number | null;
    compatible_soil_textures: string;
    recommended_for: string;
    notes: string;
}

// ============================================================================
// Plant Categories for filtering
// ============================================================================
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
    'Shrub'
] as const;

export type PlantCategory = typeof PLANT_CATEGORIES[number];

// ============================================================================
// Database Service Singleton
// ============================================================================
export class DatabaseService {
    private static instance: DatabaseService;

    private constructor() {}

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async initialize(): Promise<void> {
        try {
            console.log('[DB] Loading databases...');
            
            // Load all three databases in parallel from public/assets
            const [plantResponse, soilResponse, irrigationResponse] = await Promise.all([
                fetch('/assets/plants.json'),
                fetch('/assets/soils.json'),
                fetch('/assets/irrigation_methods.json')
            ]);

            if (!plantResponse.ok) throw new Error(`Failed to load plants: ${plantResponse.status}`);
            if (!soilResponse.ok) throw new Error(`Failed to load soils: ${soilResponse.status}`);
            if (!irrigationResponse.ok) throw new Error(`Failed to load irrigation methods: ${irrigationResponse.status}`);

            const plantData: PlantDBEntry[] = await plantResponse.json();
            const soilData: SoilDBEntry[] = await soilResponse.json();
            const irrigationData: IrrigationMethodEntry[] = await irrigationResponse.json();

            // Sort irrigation methods in a user-friendly way (most common first).
            const irrigationSorted = [...irrigationData].sort((a, b) => {
                const sa = getIrrigationPopularityScore(a.code_enum);
                const sb = getIrrigationPopularityScore(b.code_enum);
                if (sb !== sa) return sb - sa;
                // Tie-breakers: higher efficiency first, then name.
                const ea = typeof a.efficiency_pct === 'number' ? a.efficiency_pct : -1;
                const eb = typeof b.efficiency_pct === 'number' ? b.efficiency_pct : -1;
                if (eb !== ea) return eb - ea;
                return (a.name || '').localeCompare(b.name || '');
            });

            useAppStore.getState().setDatabase(plantData, soilData, irrigationSorted);
            
            console.log(`[DB] Loaded: ${plantData.length} plants, ${soilData.length} soils, ${irrigationData.length} irrigation methods`);

        } catch (error) {
            console.error('[DB] Failed to load database', error);
            // Set empty arrays as fallback
            useAppStore.getState().setDatabase([], [], []);
        }
    }

    // ========================================================================
    // Plant queries
    // ========================================================================
    
    public getPlantById(id: number): PlantDBEntry | undefined {
        return useAppStore.getState().plantDb.find((p) => p.id === id);
    }

    public getPlantBySubtype(subtype: string): PlantDBEntry | undefined {
        return useAppStore.getState().plantDb.find((p) => p.subtype === subtype);
    }

    public getPlantsByCategory(category: PlantCategory): PlantDBEntry[] {
        return useAppStore.getState().plantDb.filter((p) => p.category === category);
    }

    public searchPlants(query: string, category?: PlantCategory): PlantDBEntry[] {
        const lowerQuery = query.toLowerCase();
        let plants = useAppStore.getState().plantDb;
        
        if (category) {
            plants = plants.filter((p) => p.category === category);
        }
        
        if (!query) {
            return plants;
        }
        
        return plants.filter((p) => 
            p.common_name_en.toLowerCase().includes(lowerQuery) ||
            p.common_name_ro.toLowerCase().includes(lowerQuery) ||
            p.scientific_name.toLowerCase().includes(lowerQuery) ||
            p.subtype.toLowerCase().includes(lowerQuery)
        );
    }

    public getAllCategories(): string[] {
        const categories = new Set<string>();
        useAppStore.getState().plantDb.forEach((p) => {
            if (p.category) categories.add(p.category);
        });
        return Array.from(categories).sort();
    }

    // ========================================================================
    // Soil queries
    // ========================================================================
    
    public getSoilById(id: number): SoilDBEntry | undefined {
        return useAppStore.getState().soilDb.find((s) => s.id === id);
    }

    public getSoilByType(soilType: string): SoilDBEntry | undefined {
        return useAppStore.getState().soilDb.find((s) => s.soil_type === soilType);
    }

    public getAllSoils(): SoilDBEntry[] {
        return useAppStore.getState().soilDb;
    }

    // ========================================================================
    // Irrigation method queries
    // ========================================================================
    
    public getIrrigationMethodById(id: number): IrrigationMethodEntry | undefined {
        return useAppStore.getState().irrigationMethodDb.find((m) => m.id === id);
    }

    public getIrrigationMethodByCode(code: string): IrrigationMethodEntry | undefined {
        return useAppStore.getState().irrigationMethodDb.find((m) => m.code_enum === code);
    }

    public getAllIrrigationMethods(): IrrigationMethodEntry[] {
        return useAppStore.getState().irrigationMethodDb;
    }

    public getRecommendedIrrigationMethods(plantTypIrrig: string): IrrigationMethodEntry[] {
        // Map plant's typ_irrig_method to actual methods
        const methodMap: Record<string, string[]> = {
            'DRIP': ['IRRIG_DRIP_SURFACE', 'IRRIG_DRIP_SUBSURFACE', 'IRRIG_DRIP_TAPE'],
            'SPRINKLER': ['IRRIG_SPRINKLER_SET', 'IRRIG_SPRINKLER_PIVOT', 'IRRIG_SPRINKLER_LEPA'],
            'SURFACE': ['IRRIG_SURFACE_FLOOD', 'IRRIG_SURFACE_BORDER', 'IRRIG_SURFACE_FURROW'],
            'MANUAL': ['IRRIG_DRIP_SURFACE', 'IRRIG_MICRO_SPRAY'],
            'RAINFED': []
        };
        
        const codes = methodMap[plantTypIrrig] || [];
        return useAppStore.getState().irrigationMethodDb.filter((m) => 
            codes.includes(m.code_enum)
        );
    }
}
