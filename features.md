# AutoWatering App — Implemented Features (cod verificate)
*Raport detaliat al funcționalităților livrate în aplicația mobilă/Web, aliniate la firmware-ul embedded. Toate punctele fac referire la implementări din codul sursă (Ionic/React/TypeScript).*

## Conectivitate & sincronizare BLE
- Scanare și bonding: `BleService.scan()` folosește `BleClient.requestDevice` cu filtre pe nume și servicii, creează bond automat pe Android și reîncearcă pairing dacă eșuează prima lectură (`BleService.connect`).
- Subscrieri notificări: configurează 15+ caracteristici (status, valve, calibrare, reset, task curent, istoric, onboarding, env, rain, flow, task queue, statistici, alarmă, diagnostic, RTC, configs, timezone, growing env, schedule, auto-calc, compensații) cu pacing și loguri.
- Fragmentare/de-fragmentare: `BleFragmentationManager` + logic custom pentru channel config și environmental data (header unificat, TLV, secvențe).
- Sincronizare inițială: după conectare citește env, ploaie, onboarding, task, valve, RTC (+ drift auto-correct), config sistem, config ploaie, toate zonele (`readChannelConfig` în buclă) cu delay-uri între operații.
- Principiu “read/notify ca adevăr”: store-ul se actualizează doar pe READ/NOTIFY, fără optimistic updates după WRITE (comentariu clar în `BleService.ts`).

## Stare globală & baze de date
- Store unic Zustand (`src/store/useAppStore.ts`) cu stări pentru zone, RTC, calibrare/reset, task curent, onboarding flags, senzori live, configurări sistem/ploaie/timezone, integrare ploaie, compensații, auto-calc, statistici, alarme, diagnostic, istorice (udare/ploaie/env), wizard nou, etc.
- Baze de date plante/soluri/metode încărcate din assets prin `DatabaseService.initialize()`; filtre și căutare; 223 plante, 15 soluri îmbogățite, 15 metode de irigare.
- SoilGrids: serviciu `SoilGridsService` cu WMS (CapacitorHttp) + cache localStorage, backoff, clasificare USDA, mapare în DB soluri, pedotransfer pentru FC/WP/infiltrație/bulk density/OM; recomandări volum maxim și cycle & soak; fallback Loam când API indisponibil.

## Onboarding & configurare sistem
- Wizard multi-fază (`OnboardingWizard.tsx`): auto-lansat când `INITIAL_SETUP` lipsește; poate fi reluat din dashboard.
- Pas de sincronizare timp: scrie RTC cu fus orar curent și verifică drift >60s.
- Setări sistem scrise: power mode (Normal/Energy-Saving/ULP), calibrare debit (pulsuri/L), master valve (enable, pre/post delay, overlap, auto management), senzor ploaie hardware (enable, mm/puls, debounce, integration).
- Skip inteligent: sare peste pașii cu flag-uri deja setate (system_config_flags, channel_config_flags, channel_extended_flags, schedule_flags); detectează prima zonă necompletată.
- UI de progres, validări, navigare tastatură, tooltips, i18n (LanguageSelector), skeleton loaders, confirmare la ieșire.

## Configurare zone (FAO-56 și moduri manuale)
- Mod per zonă: FAO-56 Auto (100%), FAO-56 Eco (70%), Durată, Volum.
- Selectoare noi: PlantSelector cu categorii/căutare, SoilSelector simplu + auto-detect din GPS/hartă/manual (LocationPicker), IrrigationMethodSelector compact (smart sorting pe bază de plantă).
- Date agronomice: coverage area/plant count, expunere soare, dată plantare, limită volum max per job, denumire personalizată.
- Cycle & Soak: recomandare automată din sol (enable + timpi calculați), toggle manual, marcaj “auto enabled”.
- Custom Soil: opțional folosește rezultatele SoilGrids pentru a crea profil custom via BLE (char custom soil CRUD) cu parametri calculați.
- Water need factor pentru Eco (0.7) și auto_mode selectat corespunzător (FAO56_AREA/PLANT_COUNT).
- Salvare robustă: scriere `ChannelConfig` (struct 76B) + `GrowingEnvData` (71B) cu retry și întârzieri între write-uri.

## Programări & automatizare
- Tipuri: AUTO (FAO-56) cu solar timing, DAILY bitmask, PERIODIC (N zile).
- Parametri: oră/minut, offset solar +/-120 min, valoare durată/volum pentru moduri manuale, auto_enabled, watering_mode setat corect.
- Persistență: scrieri `ScheduleConfigData` per canal; folosește flag-urile firmware pentru a marca configurarea.
- FAO auto-calc: store primește `AutoCalcStatusData` (deficit, et0, kc, volume calculat, next irrigation, stage, ciclu) și îl afișează în UI (ex. deficit pe cardul de zonă).

## Control manual & coadă de execuție
- TaskControlCard: pause/resume/stop/start-next/clear queue; afișează progres procent, valori curente țintă (timp sau volum), total volum, stare RUNNING/PAUSED/IDLE.
- Emergency Stop din dashboard: oprește udarea și golește coada.
- Quick Water din ZoneCard/ZoneConfigModal: pornește manual durată/volum.
- Queue vizibil: taskQueue (pending, completed_today, active_task_id) via notificații BLE.

## Senzori & telemetrie live
- Environmental (BME280): temperatură, umiditate, presiune, status live; indicator LIVE/OFFLINE.
- Rain gauge: status activ/inactiv, rata curentă mm/h, totaluri zi/oră; configurabil din Settings.
- Flow sensor: pulses/flow rate live afișate în Diagnostics; calibrare și aplicație valorile din CalibrationWizard.
- System status: OK/NO_FLOW/UNEXPECTED_FLOW/FAULT/RTC_ERROR/LOW_POWER; next run text.
- Deficit FAO per zonă (din AutoCalcStatus) afișat grafic pe ZoneCard.

## Istoric, analitice & statistici
- HistoryDashboard: grafice Recharts pentru udări (stacked, distribuție pe zone), temperatură/umiditate, ploaie; preset 24h/7d/30d, intervale custom, filtre pe canale, pull-to-refresh, toasts.
- Statistici rezumate: volum total, sesiuni, succes %, oră activă, trenduri sparkline pe volum/temp/rain, breakdown pe zone.
- Listă sesiuni recente cu formatări locale (ro-RO).
- Analytics page: carduri rezumat live (volum total, temp/humid live, ploaie 7d, eficiență), plus carduri de istoric (udare, env, ploaie) reutilizând serviciile.
- Persistence cache: `HistoryService` folosește localforage (IndexedDB) cu TTL 5m; agregare pe oră/zi/săptămână/lună; calcul statistici (tot volume, medii, trenduri) în client.
- BLE istoric: suport pentru query detaliat udare, env (detailed/hourly/daily), ploaie (hourly/daily); TODO-uri limitate la parsing daily/monthly/annual watering și env trends (marcate în cod).

## Alerte & diagnostic
- AlarmCard: afișare cod alarmă (flow fault, valve stuck, comm error, low battery, sensor offline, over temp, leak), timestamp, confirmare clear via BLE (clear/ack).
- DiagnosticsCard: uptime, erori totale, last error (mapare WateringError), valve active bitmask, baterie/mains, flow rate, coadă, alarmă; buton refresh citește diag/alarm/task queue/flow.
- Status extins în dashboard: connection uplink, indicator LED, mesaje toast pentru erori BLE.

## Calibrare & reset
- CalibrationWizard + `CalibrationService`: flux start/finish/apply/reset, progres live din store, estimare pulses/L, mesaje în română, verificări volum minim, mapare erori.
- ResetModal + `useReset`: suport pentru toate opcode-urile (reset canal, programe, toate canale, toate programe, sistem, istoric, factory reset) cu confirmare în doi pași și prezentare în română; detectează dacă e necesar canal.

## Setări & utilitare
- Settings page: vizualizare timp dispozitiv (auto-sync la connect), configurare master valve, senzor ploaie (enable, mm/puls, skip threshold), acces la CalibrationWizard și ResetModal.
- LocationPicker: hartă Leaflet cu marker drag, GPS (Capacitor + browser fallback), introducere manuală, auto-trigger GPS, validări coordonate.
- i18n: provider `I18nProvider` + selector de limbă (compact/full); strings pentru onboarding/wizard.
- QRCodeSharing: export date configurări zone (compress) în canvas placeholder + clipboard; share fallback via Web Share API; mod scan placeholder.
- Theme/UI: shell cu layout, “glass” cards, animatii framer-motion, iconografie Ionicons, tailwind utilities.

## Persistență & robustețe
- Retry BLE writes cu backoff în wizard (channel/growing env) pentru stabilitate.
- Debounce/guard timpi între fragmente pentru a nu supraîncărca MCU.
- Cache SoilGrids + API down cooldown; fallback valori implicite.
- Storage cleanup și reset logic expus în UI (factory/system/history).

## Paritate vs firmware (gata în app)
- Programare AUTO FAO-56, volum limit per job, cycle & soak, deficit auto-calc live, master valve delays, flow/rain/env senzori, istoric live, statistici pe canal, alarme, reseturi, calibrare, limită volum și eco factor 0.7, acoperire suprafață/plant count, plant/soil/method DB din embedded, max 8 canale, single task concurrency (coadă 10).

## Gap-uri rămase (pentru roadmap)
- Scriere efectivă a setărilor de compensație per canal (char #27) și UI pentru status compensații.
- UI pentru profil interval watering (water/pause) în modurile TIME/VOLUME.
- Configurare timezone/DST (scriere `TimezoneConfigData` + flag SYSTEM_FLAG.TIMEZONE).
- Expunere setări BME280 (enable/interval/offset) și auto-calc interval/enable control.
- Parsare istoric udare daily/monthly/annual și env trends din BLE (TODO-uri în `BleService.ts`).
- Algoritmi ploaie avansați (simple/proportional/exponential/adaptive) și reduction_factor per canal în UI.
- QR sharing real (encode/decode, import aplicat).

## Ecrane principale (UX confirmat în cod)
- Dashboard (`src/pages/Dashboard.tsx`): connection uplink cu toggle scan/disconnect, Emergency Stop, card status senzori (temp/hum/pressure + rain), task activ cu progres, setup wizard auto-launch pe flagurile firmware, card reconfigure, DiagnosticsCard și AlarmCard integrate.
- Zones (`src/pages/Zones.tsx`): grid de zone vizibile pe flagurile de onboarding (channel_config_flags/ext_flags), indicator configurat/incomplet, Quick Add găsește primul canal liber, deschide ZoneConfigModal în mod setup/edit/job, afișează deficit FAO pe canal.
- History Dashboard (`src/pages/HistoryDashboard.tsx`): taburi watering/environment/rain, preset date ranges, filtre pe canale, grafice volum (stacked), distribuție pe canale, liste sesiuni recente, grafice env și rain, refresher + toasts.
- Analytics (`src/pages/Analytics.tsx`): rezumate live (volum curent, temp/hum live, ploaie 7d, eficiență), carduri istorice (watering, env, rain) și StatisticsCard.
- Settings (`src/pages/Settings.tsx`): status timp (RTC), configurare master valve, senzor ploaie (enable/mm per puls/prag), acces la CalibrationWizard și ResetModal.

## Componente & wizards
- OnboardingWizard (`src/components/OnboardingWizard.tsx`): flux 0-4 faze, stepper FAO-56/manual, auto-skip pe flaguri, auto-lansare, validări, navigare tastatură, tooltips, progress bar, copy zone config, confirm exit, i18n.
- ZoneConfigModal (`src/components/ZoneConfigModal.tsx`): setup/edit/job mod, select plant/soil/irrigation, coverage/sun, cycle & soak, max volume, compensații ploaie/temp pentru moduri manuale, schedule daily/periodic/auto, quick watering job start.
- CalibrationWizard (`src/components/CalibrationWizard.tsx` + service): start/stop/finish/apply/reset, progres live, estimări pulses/L, mesaje de eroare în română, verificare volum minim.
- ResetModal (`src/components/ResetModal.tsx` + hook): select tip reset, confirmare dublă pentru operații periculoase, suport toate opcode-uri, progres/erori.
- QRCodeSharing (`src/components/QRCodeSharing.tsx`): export compress în canvas + clipboard/share, mod scan placeholder, număr zone partajate.
- LocationPicker (`src/components/LocationPicker.tsx`): GPS (Capacitor + browser fallback), hartă Leaflet, marker drag, input manual, auto-trigger, validări.
- Onboarding componente dedicate (`src/components/onboarding/*`): selectoare plant/soil/irrigation, CycleSoakAuto/Config, MaxVolumeConfig, tooltips, wizard enhancements (validări, skeleton, help).
- TaskControlCard, AlarmCard, DiagnosticsCard, History cards (WateringHistoryCard, EnvHistoryCard, RainHistoryCard), Charts set (`src/components/charts`) pentru Recharts.

## Servicii & date
- `BleService.ts`: toate operațiile BLE (read/write/select pentru channel/schedule/growing env/system/rain/timezone/task queue/statistics/alarms/diagnostics/history/env/rain/auto-calc/custom soil), fragmentare custom, retry pe writes în wizard, auto time drift fix, single instance.
- `HistoryService.ts`: fetch+cache IndexedDB, agregări, statistici, trend calc, sync all, suport cache TTL, filtre canale.
- `DatabaseService.ts`: încărcare DB din assets, căutări/filter, expune plant/soil/method entries.
- `SoilGridsService.ts`: WMS fetch (clay/sand/silt), clasificare USDA, mapare DB, pedotransfer, cache/distanta, API cooldown, recomandări volum/cycle-soak, custom soil estimare și decizie.
- `CalibrationService.ts`, `ResetService.ts`: logici complete pentru fluxurile respective, mapare erori, timeouts, subscribe la store.
- `useReset` hook și `services/index.ts` initializer pentru servicii high-level.

## Stare & persistenta
- `useAppStore.ts`: stări pentru connection, devices, zones, valve status, rtc/calib/reset, current task, onboarding flags și extended flags, env/rain data, system/rain/timezone configs, rain integration, compensații, auto-calc, growing env, schedules, channel compensation configs, flow sensor, task queue, statistici, alarme, diagnostic, istorice (watering/rain/env), sistem status, DB încărcate, wizard legacy și channel wizard, acțiuni de update și reset.
- Cache istoric IndexedDB (watering/env/rain + metadata TTL), clear cache helper.
- LocalStorage folosit în SoilGrids (cache + API status) și în wizard (copiere/skip state-uri).

## UX, accesibilitate & erori
- Validări și feedback în wizard (zone name, coverage, required fields), skip step button, help tooltips, skeleton loaders, tastatură next/back/escape, confirm exit.
- Toasters pentru acțiuni BLE, refresh/sync istoric, erori; IonProgressBar pentru onboarding; accesibilitate aria labels în wizard.
- Mesaje în română pentru calibrare, reset, GPS; fallback icons și badges pentru status.

## Offline & cache
- IndexedDB cache 5 minute pentru istorice; SoilGrids cache 7 zile cu distanță 500m; fallback la valori implicite dacă API down; fără optimistic updates pe BLE.

## Localizare & hartă
- GPS via Capacitor Geolocation cu permisiuni și fallback navigator.geolocation; hartă Leaflet cu tile publice, marker drag, invalidare dimensiuni; input manual numeric cu validări.

## Internaționalizare
- `I18nProvider` + `LanguageSelector`; strings pentru wizard și componente; detectare limbă activă în wizard; UI bilingv (en/ro) pe elemente cheie.

## Temă & layout
- Shell Ionic + Tailwind; “glass” cards, gradient backgrounds, framer-motion pentru intrări/tablouri, iconografie Ionicons; layout responsiv grid/stack; state-based badges și culori (danger/warning/success/secondary) pentru status/alarme/conexiune.
