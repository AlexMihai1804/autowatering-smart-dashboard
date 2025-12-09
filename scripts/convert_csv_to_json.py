#!/usr/bin/env python3
"""
Convert CSV databases to JSON for the irrigation app.
Processes: plants_full.csv, soil_db_new.csv, irrigation_methods.csv
Outputs to: src/data/
"""

import csv
import json
import os
from pathlib import Path

# Get project root (parent of scripts folder)
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "src" / "data"

def convert_value(value, field_type="auto"):
    """Convert string value to appropriate type."""
    if value == "" or value is None:
        return None
    
    # Boolean fields
    if value.lower() in ("yes", "true", "1"):
        return True
    if value.lower() in ("no", "false", "0"):
        return False
    
    # Try numeric conversion
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value

def convert_plants():
    """Convert plants_full.csv to plants.json"""
    input_file = PROJECT_ROOT / "plants_full.csv"
    output_file = OUTPUT_DIR / "plants.json"
    
    plants = []
    
    with open(input_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            plant = {
                "id": idx,
                "subtype": row.get("subtype", ""),
                "category": row.get("category", ""),
                "common_name_ro": row.get("common_name_ro", ""),
                "common_name_en": row.get("common_name_en", ""),
                "scientific_name": row.get("scientific_name", ""),
                "indoor_ok": row.get("indoor_ok", "No") == "Yes",
                "toxic_flag": row.get("toxic_flag", "No") == "Yes",
                "edible_part": row.get("edible_part", ""),
                "primary_use": row.get("primary_use", ""),
                "fertility_need": row.get("fertility_need", ""),
                "pruning_need": row.get("pruning_need", ""),
                "growth_rate": row.get("growth_rate", ""),
                # FAO-56 Crop Coefficients
                "kc_ini": convert_value(row.get("kc_ini", "")),
                "kc_mid": convert_value(row.get("kc_mid", "")),
                "kc_end": convert_value(row.get("kc_end", "")),
                "kc_dev": convert_value(row.get("kc_dev", "")),
                # Root depth
                "root_depth_min_m": convert_value(row.get("root_depth_min_m", "")),
                "root_depth_max_m": convert_value(row.get("root_depth_max_m", "")),
                # Depletion
                "depletion_fraction_p": convert_value(row.get("depletion_fraction_p", "")),
                "allowable_depletion_pct": convert_value(row.get("allowable_depletion_pct", "")),
                # Growth stages (days)
                "stage_days_ini": convert_value(row.get("stage_days_ini", "")),
                "stage_days_dev": convert_value(row.get("stage_days_dev", "")),
                "stage_days_mid": convert_value(row.get("stage_days_mid", "")),
                "stage_days_end": convert_value(row.get("stage_days_end", "")),
                # Growth cycle info
                "growth_cycle": row.get("growth_cycle", ""),
                "maturity_days_min": convert_value(row.get("maturity_days_min", "")),
                "maturity_days_max": convert_value(row.get("maturity_days_max", "")),
                "juvenile_years_to_bearing": convert_value(row.get("juvenile_years_to_bearing", "")),
                # Spacing
                "spacing_row_m": convert_value(row.get("spacing_row_m", "")),
                "spacing_plant_m": convert_value(row.get("spacing_plant_m", "")),
                "default_density_plants_m2": convert_value(row.get("default_density_plants_m2", "")),
                "canopy_cover_max_frac": convert_value(row.get("canopy_cover_max_frac", "")),
                # Tolerances
                "shade_tolerance": row.get("shade_tolerance", ""),
                "drought_tolerance": row.get("drought_tolerance", ""),
                "salinity_tolerance": row.get("salinity_tolerance", ""),
                # Irrigation
                "typ_irrig_method": row.get("typ_irrig_method", ""),
                # Source tags
                "kc_source_tag": row.get("kc_source_tag", ""),
                "root_depth_source": row.get("root_depth_source", ""),
                "water_stress_sensitive_stage": row.get("water_stress_sensitive_stage", ""),
                # pH and temperature
                "ph_min": convert_value(row.get("ph_min", "")),
                "ph_max": convert_value(row.get("ph_max", "")),
                "frost_tolerance_c": convert_value(row.get("frost_tolerance_c", "")),
                "temp_opt_min_c": convert_value(row.get("temp_opt_min_c", "")),
                "temp_opt_max_c": convert_value(row.get("temp_opt_max_c", "")),
            }
            plants.append(plant)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(plants, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Converted {len(plants)} plants to {output_file}")
    return plants

def convert_soils():
    """Convert soil_db_new.csv to soils.json"""
    input_file = PROJECT_ROOT / "soil_db_new.csv"
    output_file = OUTPUT_DIR / "soils.json"
    
    soils = []
    
    with open(input_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            soil = {
                "id": int(row.get("soil_id", 0)),
                "soil_type": row.get("soil_type", ""),
                "texture": row.get("texture", ""),
                "field_capacity_pct": convert_value(row.get("fc_pctvol", "")),
                "wilting_point_pct": convert_value(row.get("pwp_pctvol", "")),
                "available_water_mm_m": convert_value(row.get("awc_mm_per_m", "")),
                "infiltration_rate_mm_h": convert_value(row.get("infil_mm_h", "")),
                "p_raw": convert_value(row.get("p_raw", "")),
            }
            soils.append(soil)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(soils, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Converted {len(soils)} soils to {output_file}")
    return soils

def convert_irrigation_methods():
    """Convert irrigation_methods.csv to irrigation_methods.json"""
    input_file = PROJECT_ROOT / "irrigation_methods.csv"
    output_file = OUTPUT_DIR / "irrigation_methods.json"
    
    methods = []
    
    with open(input_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            method = {
                "id": int(row.get("method_id", 0)),
                "name": row.get("method_name", ""),
                "code_enum": row.get("code_enum", ""),
                "efficiency_pct": convert_value(row.get("efficiency_pct", "")),
                "infiltration_style": row.get("infiltration_style", ""),
                "wetting_fraction": convert_value(row.get("wetting_fraction", "")),
                "depth_typical_mm": row.get("depth_typical_mm", ""),
                "application_rate_mm_h": row.get("application_rate_mm_h", ""),
                "distribution_uniformity_pct": convert_value(row.get("distribution_uniformity_pct", "")),
                "compatible_soil_textures": row.get("compatible_soil_textures", ""),
                "recommended_for": row.get("recommended_for", ""),
                "notes": row.get("notes", ""),
            }
            methods.append(method)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(methods, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Converted {len(methods)} irrigation methods to {output_file}")
    return methods

def main():
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("Converting CSV databases to JSON...")
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    
    plants = convert_plants()
    soils = convert_soils()
    methods = convert_irrigation_methods()
    
    print()
    print("=" * 50)
    print(f"Summary:")
    print(f"  Plants: {len(plants)} entries")
    print(f"  Soils: {len(soils)} entries")
    print(f"  Irrigation Methods: {len(methods)} entries")
    print("=" * 50)
    print("Done!")

if __name__ == "__main__":
    main()
