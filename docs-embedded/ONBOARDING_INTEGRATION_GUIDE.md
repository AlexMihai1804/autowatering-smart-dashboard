# Onboarding Components Integration Guide

This document describes how to integrate the new onboarding components into `OnboardingWizard.tsx`.

## New Components Created

All components are in `src/components/onboarding/`:

1. **SoilSelector.tsx** - Auto-detect soil from GPS with manual override
2. **IrrigationMethodSelector.tsx** - Visual cards with emojis and smart sorting
3. **PlantSelector.tsx** - Category chips with search
4. **CycleSoakConfig.tsx** - Auto-enable based on soil infiltration
5. **MaxVolumeConfig.tsx** - Auto-calculation from soil/coverage
6. **WhatsThisTooltip.tsx** - Reusable tooltip component

## New Services

- **SoilGridsService.ts** - ISRIC SoilGrids API integration for auto-detecting soil

## Integration Steps

### Step 1: Add Imports

At the top of `OnboardingWizard.tsx`, add:

```tsx
import {
    SoilSelector,
    IrrigationMethodSelector,
    PlantSelector,
    CycleSoakConfig,
    MaxVolumeConfig,
    WhatsThisTooltip
} from './onboarding';
import { SoilGridsService, SoilDetectionResult } from '../services/SoilGridsService';
import { WIZARD_TOOLTIPS } from '../utils/onboardingHelpers';
```

### Step 2: Add State for Soil Detection

In the component, add state:

```tsx
const [soilDetectionResult, setSoilDetectionResult] = useState<SoilDetectionResult | null>(null);
const [isDetectingSoil, setIsDetectingSoil] = useState(false);
```

### Step 3: Replace Plant Selection (zoneSubStep === 1)

Replace the current plant selection card with:

```tsx
<PlantSelector
    plants={filteredPlants}
    selectedPlant={currentZone.plant}
    onSelectPlant={(plant) => {
        updateCurrentZone({ plant });
        // Auto-select recommended irrigation method
        if (plant.typ_irrig_method && irrigationMethodDb.length > 0) {
            const methodMap: Record<string, string> = {
                'DRIP': 'IRRIG_DRIP_SURFACE',
                'SPRINKLER': 'IRRIG_SPRINKLER_SET',
                'SURFACE': 'IRRIG_SURFACE_FURROW',
                'MANUAL': 'IRRIG_DRIP_SURFACE',
                'RAINFED': 'IRRIG_SPRINKLER_SET'
            };
            const code = methodMap[plant.typ_irrig_method];
            const method = irrigationMethodDb.find(m => m.code_enum === code);
            if (method) {
                updateCurrentZone({ irrigationMethod: method });
            }
        }
    }}
    searchText={searchText}
    onSearchChange={setSearchText}
    selectedCategory={selectedCategory}
    onCategoryChange={setSelectedCategory}
/>
```

### Step 4: Replace Soil Selection (zoneSubStep === 2)

Replace the current soil card with:

```tsx
<SoilSelector
    soils={soilDb}
    selectedSoil={currentZone.soil}
    onSelectSoil={(soil) => updateCurrentZone({ soil })}
    location={currentZone.location}
    autoDetected={currentZone.soilAutoDetected}
    detectionConfidence={currentZone.soilDetectionConfidence}
    onAutoDetect={async () => {
        if (!currentZone.location) return;
        setIsDetectingSoil(true);
        try {
            const result = await SoilGridsService.detectSoilFromLocation(
                currentZone.location.latitude,
                currentZone.location.longitude
            );
            if (result && result.matchedSoil) {
                updateCurrentZone({
                    soil: result.matchedSoil,
                    soilAutoDetected: true,
                    soilDetectionConfidence: result.confidence
                });
                setSoilDetectionResult(result);
            }
        } finally {
            setIsDetectingSoil(false);
        }
    }}
    isDetecting={isDetectingSoil}
/>
```

### Step 5: Replace Irrigation Method Selection

Replace the current irrigation method list with:

```tsx
<IrrigationMethodSelector
    methods={irrigationMethodDb}
    selectedMethod={currentZone.irrigationMethod}
    onSelectMethod={(method) => updateCurrentZone({ irrigationMethod: method })}
    selectedPlant={currentZone.plant}
    coverageType={currentZone.coverageType}
    coverageValue={currentZone.coverageValue}
/>
```

### Step 6: Add Cycle & Soak Configuration

After soil/irrigation selection, add:

```tsx
<CycleSoakConfig
    enabled={currentZone.enableCycleSoak}
    onEnabledChange={(enabled) => updateCurrentZone({ enableCycleSoak: enabled })}
    cycleMinutes={currentZone.cycleMinutes}
    onCycleMinutesChange={(minutes) => updateCurrentZone({ cycleMinutes: minutes })}
    soakMinutes={currentZone.soakMinutes}
    onSoakMinutesChange={(minutes) => updateCurrentZone({ soakMinutes: minutes })}
    autoEnabled={currentZone.cycleSoakAutoEnabled}
    selectedSoil={currentZone.soil}
    onAutoApply={() => {
        if (currentZone.soil) {
            const shouldEnable = SoilGridsService.shouldEnableCycleSoak(currentZone.soil);
            const timing = SoilGridsService.calculateCycleSoakTiming(currentZone.soil);
            updateCurrentZone({
                enableCycleSoak: shouldEnable,
                cycleSoakAutoEnabled: true,
                cycleMinutes: timing.cycleMinutes,
                soakMinutes: timing.soakMinutes
            });
        }
    }}
/>
```

### Step 7: Add Max Volume Configuration

After coverage configuration, add:

```tsx
<MaxVolumeConfig
    maxVolume={currentZone.maxVolumeLimit}
    onMaxVolumeChange={(volume) => updateCurrentZone({ maxVolumeLimit: volume })}
    selectedSoil={currentZone.soil}
    coverageType={currentZone.coverageType}
    coverageValue={currentZone.coverageValue}
    onAutoCalculate={() => {
        if (currentZone.soil) {
            const recommended = SoilGridsService.calculateRecommendedMaxVolume(
                currentZone.coverageType,
                currentZone.coverageValue,
                currentZone.soil
            );
            updateCurrentZone({ maxVolumeLimit: recommended });
        }
    }}
/>
```

### Step 8: Add Tooltips Where Needed

Use the `WhatsThisTooltip` component for technical terms:

```tsx
<div className="flex items-center gap-2">
    <IonLabel>Field Capacity</IonLabel>
    <WhatsThisTooltip term="fieldCapacity" />
</div>
```

Available tooltip terms (from `WIZARD_TOOLTIPS`):
- kc, kcIni, kcMid, kcEnd
- et0
- fieldCapacity, wiltingPoint
- infiltrationRate
- cycleSoak
- mad (Management Allowable Depletion)
- coverageArea, coveragePlants
- sunExposure
- droughtTolerance
- efficiency

## Step Order Changes

The FAO-56 wizard steps have been reordered for better UX:

**Old order:** mode → plant → soil/irrigation → coverage → location → summary → schedule

**New order:** mode → plant → location → soil → irrigation → environment → schedule → summary

This allows:
1. Location to be captured before soil (enables auto-detection)
2. Soil to be auto-detected from GPS
3. Smart sorting of irrigation methods based on plant

## New Type Fields

The following fields were added to `UnifiedZoneConfig` in `src/types/wizard.ts`:

```typescript
// Soil auto-detection
soilAutoDetected: boolean;
soilDetectionConfidence: number | null;

// Cycle & Soak
enableCycleSoak: boolean;
cycleSoakAutoEnabled: boolean;
cycleMinutes: number;
soakMinutes: number;
```

## Testing

After integration:
1. Run `npm run build` to check for TypeScript errors
2. Run `npm test` to verify all tests pass
3. Test the wizard flow manually in the app

## Notes

- The SoilGridsService caches results in localStorage
- Soil detection requires GPS coordinates
- Auto-calculations are recommendations, user can always override
- All "What's This" tooltips are accessible via IonPopover
