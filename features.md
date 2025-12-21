# AutoWatering App - Implemented Features (cod verificat)
---

## Future (Roadmap)

Roadmap-ul comun (firmware + app) este tinut in GitHub Project:
- https://github.com/users/AlexMihai1804/projects/2

Task-uri app (legate de marketplace/packs + UI/AI):
- Marketplace MVP: https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/1, https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/2, https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/3, https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/4
- Update installed packs/plants: https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/5
- Design & UI refactor (Stitch): https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/6, https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/7
- AI: https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/8, https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/9
- Cycle & Soak auto-tuning (app-side): https://github.com/AlexMihai1804/autowatering-smart-dashboard/issues/10

Dependente firmware cheie pentru features noi:
- Packs pe LittleFS + BLE install/list: https://github.com/AlexMihai1804/AutoWatering/issues/10, https://github.com/AlexMihai1804/AutoWatering/issues/6, https://github.com/AlexMihai1804/AutoWatering/issues/7, https://github.com/AlexMihai1804/AutoWatering/issues/8
- Update packs/plants (atomic replace): https://github.com/AlexMihai1804/AutoWatering/issues/13
- Cycle & Soak settings + BLE (pentru auto-tuning din app): https://github.com/AlexMihai1804/AutoWatering/issues/14
*Raport detaliat al functionalitatilor livrate in aplicatia mobil/Web, aliniate la firmware-ul embedded. Toate punctele fac referire la implementari din codul sursa (Ionic/React/TypeScript).*

## Feature map (where in code)

Scop: pentru fiecare zona majora din aplicatie, lista de mai jos indica ce face si unde este implementarea principala.

- BLE connect/sync + fragmentation: `src/services/BleService.ts`, `src/services/BleFragmentationManager.ts`, `src/types/firmware_structs.ts`
- Global state (single source of truth): `src/store/useAppStore.ts`
- DB local (plante/soluri/metode) + cautare/filtre: `src/services/DatabaseService.ts`
- SoilGrids (REST + WCS) + cache + mapare in soil/custom-soil: `src/services/SoilGridsService.ts`
- Onboarding wizard (desktop + modal): `src/components/OnboardingWizard.tsx`, `src/components/onboarding/*`
- Zone config (desktop): `src/components/ZoneConfigModal.tsx`
- Mobile connection/onboarding flow: `src/pages/mobile/MobileWelcome.tsx`, `src/pages/mobile/MobilePermissions.tsx`, `src/pages/mobile/MobileDeviceScan.tsx`, `src/pages/mobile/MobileConnectionSuccess.tsx`, `src/pages/mobile/MobileNoDevices.tsx`, `src/pages/mobile/MobileManageDevices.tsx`, `src/pages/mobile/MobileOnboardingWizard.tsx`
- Mobile zone flows: `src/pages/mobile/MobileZones.tsx`, `src/pages/mobile/MobileZoneAddWizard.tsx`, `src/pages/mobile/MobileZoneDetailsFull.tsx`, `src/pages/mobile/MobileZoneConfig.tsx`
- Desktop pages: `src/pages/Dashboard.tsx`, `src/pages/Zones.tsx`, `src/pages/HistoryDashboard.tsx`, `src/pages/Analytics.tsx`, `src/pages/Settings.tsx`
- Mobile pages: `src/pages/mobile/MobileDashboard.tsx`, `src/pages/mobile/MobileHistory.tsx`, `src/pages/mobile/MobileSettings.tsx`, `src/pages/mobile/MobileDeviceSettings.tsx`
- History + cache: `src/services/HistoryService.ts`, `src/components/*HistoryCard.tsx`
- Calibration/Reset: `src/services/CalibrationService.ts`, `src/components/CalibrationWizard.tsx`, `src/services/ResetService.ts`, `src/components/ResetModal.tsx`
- Settings/preferences: `src/hooks/useSettings.ts`, `src/hooks/useTheme.ts`, `src/hooks/useKnownDevices.ts`, `src/i18n/*`
- Dev tooling: `src/utils/consoleForwarder.ts`, `scripts/run_android_live_reload.py`

---
## Conectivitate & sincronizare BLE
- Scanare si selectare device via `BleClient.requestDevice`, auto-connect dupa selectie.
- Conectare cu priority HIGH pe Android, bonding (Android) + fallback de pairing (read initial + retry).
- Subscrieri notificari pentru system status, valve control, calibration, reset, current task, flow sensor, task queue, statistics, alarms, diagnostics, onboarding status, env, rain, system config, rain config, timezone config, auto-calc, compensation status, channel compensation config (daca FW suporta), history (watering/rain/env).
- Fragmentare pentru WRITE-uri si reassembly pentru notificari cu unified header (history), cu pacing intre fragmente.
- Initial sync secvential cu delay-uri; foloseste Bulk Sync Snapshot (char #28) cand este disponibil pentru a scurta lectura.
- CRUD pentru Custom Soil in custom config service (read/create/update/delete).
- Principiu "read/notify as truth": store-ul se actualizeaza doar pe READ/NOTIFY, nu dupa WRITE.

## Stare globala & baze de date
- Store Zustand cu state pentru zones, RTC, calibrare/reset, current task, onboarding flags, env/rain data, system/rain/timezone configs, rain integration, compensation status, auto-calc status, schedules, growing env, statistics, alarms, diagnostics, task queue, history caches.
- DB locale incarcate din `/assets` prin `DatabaseService`: 223 plante, 15 soluri, 15 metode de irigare; search + filtre; sortare metode dupa popularitate.

## Onboarding & configurare sistem
- Wizard multi-faza (system, zones, schedules) in `OnboardingWizard.tsx`, auto-lansat cand `INITIAL_SETUP` lipseste.
- Sync RTC + drift check; scrie system config (power mode, flow calibration, master valve) si rain sensor config.
- Skip logic pe flag-uri firmware (system/channel/schedule) + detectie a primei zone necompletate.
- SoilGrids pentru detectie sol, recomandari cycle & soak, optional custom soil create.
- UI: progress, validari, keyboard nav, help tooltips, i18n.

## Configurare zone (FAO-56 si moduri manuale)
- Moduri: FAO-56 Auto (100%), FAO-56 Eco (70%), Duration, Volume.
- Selectoare plant/soil/irrigation cu categorie + cautare; coverage area/plant count; sun exposure; planting date; location.
- Cycle & Soak cu recomandare automata din sol + toggle manual; max volume per job; water need factor pentru Eco.
- Salvare: `writeChannelConfigObject` + `writeGrowingEnvironment` + `writeScheduleConfig` cu retry/pacing.
- Custom soil: detectie SoilGrids + estimare parametri + BLE custom soil create/update/delete.
- Mobile Zone Add Wizard: setup pas cu pas, schedule daily/periodic/auto, solar timing, GPS soil detection + custom soil, scrie channel config + schedule.
- Mobile Zone Details Full: edit watering mode, schedule, plant/soil/irrigation, coverage, sun; manual start/stop; stats + history pe canal.
- ZoneConfigModal (desktop) pentru edit/quick watering.

## Programari & automatizare
- Tipuri: AUTO (FAO-56), DAILY (bitmask), PERIODIC (interval zile).
- Solar timing: sunrise/sunset cu offset (-120..120) si fallback la ora fixa.
- Auto-calc status per canal + global (FFh) citit si afisat in dashboard/zone details.
- Flags firmware pentru schedule/config complete integrate in wizard.

## Control manual & coada de executie
- Task queue: start-next, pause, resume, cancel, clear (via `writeTaskQueueCommand`).
- Manual watering (start/stop) din dashboard/zones/zone details (desktop + mobile).
- Emergency Stop prin `stopCurrentWatering`.
- TaskQueueData si CurrentTaskData in store pentru UI live.

## Senzori & telemetrie live
- Environmental data (temp/humidity/pressure), rain gauge, flow sensor, system status.
- Alarme si diagnostic live din caracteristici dedicate.
- Bulk Sync Snapshot folosit pentru status rapid (cand FW suporta).

## Istoric, analitice & statistici
- BLE history: watering detailed, rain hourly/daily, env detailed/hourly/daily; env history paged.
- HistoryService cu cache IndexedDB (localforage) si TTL 5m; agregari pe ora/zi/saptamana/luna; calcule statistice.
- Desktop HistoryDashboard + Analytics (Recharts).
- MobileHistory cu day/week/month, date navigation si guard pentru fetch concurent.
- StatisticsData per canal (char #8) afisat in MobileZoneDetailsFull.

## Alerte & diagnostic
- AlarmCard: cod alarma, timestamp, clear/ack via BLE.
- DiagnosticsCard: uptime, error count, last error, valve bitmask, battery/mains, flow, task queue; refresh manual.

## Calibrare & reset
- CalibrationWizard + CalibrationService (start/finish/apply/reset, validari, error mapping).
- ResetModal + ResetService (confirmare in 2 pasi, toate opcode-urile).
- Mobile Flow Calibration / Device Reset sunt UI-only (vezi Gap-uri).

## Setari & utilitare
- Settings (desktop): RTC, master valve, rain sensor config, CalibrationWizard, ResetModal.
- Mobile Settings: theme (useTheme), units/locale (useSettings), language (i18n), device switch/rename (useKnownDevices).
- LocationPicker: GPS (Capacitor + browser fallback), Leaflet map, input manual.
- QRCodeSharing: export pe canvas + clipboard/share fallback (placeholder).
- Dev: console forwarder in DEV (`src/utils/consoleForwarder.ts`), script live reload Android (`scripts/run_android_live_reload.py`).

## Persistenta & robustete
- BLE write retry/backoff in wizard flows; pacing intre fragmente.
- SoilGrids cache 7 zile + API cooldown + fallback WCS/Loam.
- History cache in IndexedDB; store reset la disconnect.

## Paritate vs firmware (gata in app)
- FAO-56 auto/eco, max volume limit, cycle & soak, auto-calc status live.
- Master valve delays, flow/rain/env senzori, statistics, alarms, diagnostics.
- Manual watering + task queue, reseturi, calibrare, history (watering/rain/env).

## Gap-uri ramase (pentru roadmap)
- UI wiring pentru Channel Compensation Config (char #27): exista read/write in `BleService`, dar nu este folosit in UI; wizard-ul si mobile zone add colecteaza optiuni fara persistenta.
- Timezone/DST config: `writeTimezoneConfig` exista, dar nu este expus in UI; `MobileTimeLocation` este UI-only.
- Mobile device subpages (Device Info, Master Valve, Flow Calibration, Power Mode, Device Reset) sunt mock UI fara BLE reads/writes.
- Mobile dashboard: "Pause Schedule" este placeholder; soil moisture si unele tile-uri meteo/next-run sunt mock.
- Mobile Zones: weather summary/next run/status labels sunt hard-coded (nu vin din BLE).
- Mobile Zone Add Wizard: camera plant identification (TODO) + weather adjustments toggles nu sunt mapate in firmware.
- QR sharing real (encode/decode + import aplicat) lipseste.
- Offline mode hooks (`useOfflineMode`) si map tile cache (`mapOffline`) nu sunt integrate in UI.
- Watering history daily/monthly/annual parsing lipseste; env trends nu sunt salvate.
- ConfigWizard/ConfigWizardNew si hooks (useConfigExport/useVoiceInput/useHaptics/useSmartDefaults) nu sunt folosite.

## Ecrane principale (UX confirmat in cod)
- Desktop: Dashboard, Zones, HistoryDashboard, Analytics, Settings.
- Mobile connection flow: Welcome, Permissions, Device Scan, Connection Success, No Devices, Manage Devices, Onboarding (UI-only).
- Mobile main app: Dashboard, Zones, Zone Add Wizard, Zone Details Full, History, Settings, Weather Details, Notifications, Device Settings.

## Componente & wizards
- OnboardingWizard (desktop/modal), ZoneConfigModal, CalibrationWizard, ResetModal, QRCodeSharing, LocationPicker.
- Mobile UI: MobileBottomNav, MobileHeader, MobileBottomSheet, MobileConfirmModal, MobileDeviceSelector.

## Servicii & date
- BleService (+ BleFragmentationManager), BleServiceMock (test/dev).
- HistoryService, DatabaseService, SoilGridsService.
- CalibrationService, ResetService.

## Stare & persistenta
- `useAppStore.ts` acopera connection, devices, zones, valve status, rtc/calib/reset, current task, onboarding flags + extended flags, env/rain/system/timezone configs, rain integration, compensation, auto-calc, growing env, schedules, statistics, alarms, diagnostics, history caches.

## UX, accesibilitate & erori
- Validari si feedback in wizard (zone name, required fields).
- Tooltips/help, skeleton loaders, keyboard navigation, toasts.
- I18n partial pentru wizard si selectoare.

## Offline & cache
- History cache TTL 5m (IndexedDB), SoilGrids cache 7 zile (localStorage).
- mapOffline util existent, dar UI foloseste inca tiles live (OSM).

## Localizare & harta
- GPS via Capacitor + browser fallback, Leaflet map cu marker drag si input manual.
- Offline tiles nu sunt integrate (doar utilitati).

## Internationalizare
- I18nProvider + LanguageSelector; limbi expuse in mobile settings.

## Tema & layout
- Desktop: Ionic shell + Tailwind.
- Mobile: theme custom (Manrope), Tailwind + framer-motion, bottom nav + safe area.

