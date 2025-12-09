# Plan: Onboarding FAO-56 Inteligent - UX Redesign

## Obiectiv
Transformarea procesului de configurare FAO-56 într-o experiență intuitivă pentru utilizatorii începători, cu auto-detectare sol bazată pe GPS, sortare inteligentă a metodelor de irigare, și păstrarea funcționalităților avansate pentru experți.

---

## Steps

### 1. Creează `SoilGridsService.ts`
- API call la `rest.isric.org/soilgrids/v2.0/properties/query` cu lat/lon
- Returnează clay%, sand%, silt% și mapează la `SoilDBEntry` din baza locală folosind triunghiul textural USDA
- Cache în localStorage per locație pentru zone multiple pe aceeași proprietate
- Fallback la selecție manuală dacă API fail

### 2. Modifică flow-ul FAO-56
Ordine nouă în `src/types/wizard.ts`:
```
mode → plant → location → soil (auto) → irrigation (smart sorted) → environment → schedule → summary
```
Mută Location ÎNAINTE de Soil pentru a permite auto-detect.

### 3. Soil Step cu Auto-Detect by Default
- După setare locație, apelează SoilGrids API automat
- Afișează rezultatul cu badge "🔍 Detectat din GPS"
- Buton mic jos: "Alege alt tip de sol" pentru override manual
- Fallback: Soil Quiz vizual ("Cum arată solul tău când îl uzi?") sau selecție manuală

### 4. Irrigation Method cu Imagini + Sortare Inteligentă
Afișează metode cu poze/iconuri. Sortare dinamică:
- `plant.typ_irrig_method` (prima = recomandată de plantă)
- Context coverage: <20m² → drip/micro-spray; >50m² gazon → sprinkler
- Badge "⭐ Recomandat" pe prima opțiune

| Context | Primele afișate |
|---------|-----------------|
| Legume/Grădină mică | 💧 Drip, 🌫️ Micro-spray, 🔌 Soaker |
| Gazon/Suprafață mare | 🌀 Sprinkler, 💧 Drip, 🌫️ Micro-spray |
| Pomi fructiferi | 💧 Drip, 🌊 Basin, 🌫️ Micro-spray |
| Flori ornamentale | 🌫️ Micro-spray, 💧 Drip, 🌀 Sprinkler |

### 5. Auto-Calculate Cycle & Soak
- Enable automat când `soil.infiltration_rate_mm_h < 10` (clay-like)
- Durate calculate din infiltration rate
- Toggle pre-setat cu explicație: "Recomandat pentru soluri argiloase"

### 6. Auto-Calculate Max Volume
Formula:
- Area: `coverage_m2 × soil.available_water_mm_m × 0.5 / 1000`
- Plants: `plant_count × 2L`
Pre-populează cu "Recomandat: X L" + opțiune ajustare

### 7. Plant Selection cu Categorii Vizuale
- Chips cu emoji FIRST: [🍅 Legume] [🌸 Flori] [🌿 Gazon] [🌳 Pomi] [🌵 Suculente]
- După selectare categorie: "⚡ Populare" primele
- Search disponibil pentru power users

### 8. Accordion "Mod Expert"
Grupează în `IonAccordion` collapsed:
- Custom Soil Parameters (FC/WP/Infiltration manual → BLE custom soil)
- Planting Date
- Sun Exposure % fine-tuning
- Override Cycle & Soak timing
- Override Max Volume

### 9. "Folosește locația pentru toate zonele"
- Checkbox la prima zonă în Location step
- Dacă bifat, zonele 2-8 primesc auto GPS + soil detectat
- Quick Clone popup: "Zona 2 are aceeași configurație? [Da, copiază] [Nu, configurez diferit]"

### 10. "What's This?" Tooltips
Iconițe `(?)` lângă termeni tehnici cu explicații simple:

| Termen | Explicație |
|--------|------------|
| FAO-56 | Metodă științifică pentru calculul nevoilor de apă |
| Field Capacity | Cât de multă apă poate ține solul (ca un burete) |
| Wilting Point | Nivelul la care plantele se ofilesc |
| Infiltration Rate | Cât de repede absoarbe solul apa |
| Cycle & Soak | Udă puțin, pauză, repetă - previne bălțile |
| Kc | Coeficient cultură - cât consumă planta vs gazon |

---

## Smart Defaults Summary

| Parametru | Calcul/Sursă | Fallback |
|-----------|--------------|----------|
| Soil | SoilGrids API → texture class | Quiz sau manual |
| Irrigation | Sorted by plant match + context | Prima din listă |
| Cycle & Soak | Auto ON dacă infiltration < 10mm/h | OFF |
| Max Volume | coverage × AWC × 0.5 | 50L |
| Sun Exposure | 70% default | Ajustabil în Expert |
| Planting Date | Today | Expert mode |

---

## UI Flow Simplificat

```
STEP 1: MODE
┌─────────────┐ ┌─────────────┐ ┌─────────┐ ┌─────────┐
│ FAO-56 Auto │ │ FAO-56 Eco  │ │Duration │ │ Volume  │
│ ⭐ Recom.   │ │ 💧 Eco      │ │ ⏱️ Rapid│ │ 🚿 Rapid│
└─────────────┘ └─────────────┘ └─────────┘ └─────────┘

STEP 2: PLANT
[🍅 Legume] [🌸 Flori] [🌿 Gazon] [🌳 Pomi] [🌵 Suculente]
⚡ Populare: Tomate, Ardei, Roșii...
🔍 [Caută plantă]

STEP 3: LOCATION
[📍 Obține GPS]  sau  [🗺️ Hartă]
☑️ Folosește pentru toate zonele

STEP 4: SOIL (Auto!)
┌──────────────────────────────────────┐
│ 🔍 Detectat: LOAM                    │
│    FC: 35% • Infiltration: 11mm/h   │
└──────────────────────────────────────┘
[Alege alt sol ↓]

STEP 5: IRRIGATION (Smart sorted!)
⭐ Recomandat pentru Tomate:
[IMG] 💧 Drip Surface ← FIRST
[IMG] 🌫️ Micro-spray
[IMG] 🔌 Soaker Hose

STEP 6: ENVIRONMENT
Coverage: [Area m²] / [Nr. plante]
✅ Cycle & Soak (recomandat)
Max Volume: Recomandat 27L

▼ Mod Expert (collapsed)
  └─ Sun %, Planting Date, Custom Soil...

STEP 7: SCHEDULE
[Zilnic] [Periodic] [Auto FAO-56]
Ora: 06:00 (recomandat dimineața)

STEP 8: SUMMARY
Review & Save
```

---

## Păstrate din planul original
- Duration și Volume modes rămân vizibile (label "Setup rapid")
- Location poate fi GPS, hartă, sau manual
- Schedule suportă Daily/Periodic/Auto

---

## De implementat ulterior (Water Budget)
- Estimare consum lunar cu range sezonier
- Open-Meteo API pentru ET₀ real
- Disclaimer despre variabilitate

---

## Fișiere de modificat
1. `src/services/SoilGridsService.ts` - NOU
2. `src/types/wizard.ts` - reordonare steps
3. `src/components/OnboardingWizard.tsx` - UI changes
4. `src/services/DatabaseService.ts` - add soil matching logic
5. `src/components/` - componente noi pentru tooltips, irrigation cards
