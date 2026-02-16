# AutoWatering App - Detailed Features and Settings (code-based)

Last code analysis: 2026-02-06 23:05 (local).
Source of truth: code in /src and routes in src/components/Layout/Shell.tsx.
Note: `npx vite build` passed on 2026-02-06. Full `npm run build` may still fail from pre-existing typing issues in `src/test/*`.

Related: `docs/APP_UX_GAP_AUDIT.md` (gap audit vs embedded + UX vision + implementation backlog).

## Overview
AutoWatering is a mobile-first (Ionic React + Capacitor) app with a desktop layout at larger widths. It connects to an irrigation controller over BLE, synchronizes device state, and lets you configure zones, schedules, and system settings. The app stores state in a single Zustand store and persists some local preferences in localStorage/IndexedDB.

## Platform and layout behavior
- Desktop UI is used at width >= 1024px. Mobile UI is used below that.
- The Shell routes and guards are in src/components/Layout/Shell.tsx.
- Main app routes are protected and require a BLE connection.
- Account and subscription screens (`/auth`, `/premium`) are available independently of BLE connection state.

## Core services and data sources
- BLE: connect, bonding, GATT queue, fragmentation, notifications, initial sync phases.
- Store: Zustand single source of truth (zones, configs, telemetry, history, alarms, packs).
- Local DB: plants, soils, irrigation methods loaded from /assets via DatabaseService.
- SoilGrids: GPS-based soil detection with REST + WCS fallback and local cache.
- History: BLE history fetch with IndexedDB caching and aggregation (day/week/month).
- Packs: pack stats, custom plant streaming, and installed packs list.
- Auth: AWS Cognito (email/password + Hosted UI Google) + guest mode persisted in localStorage.
- Premium/Billing: Stripe subscription endpoints via AWS Lambda (`createSubscriptionCheckout`, `createBillingPortalSession`, `subscriptionStatus`, `stripeWebhook`).
  - First-time premium checkout includes a 7-day free trial (once per account; enforced in backend).
- AI Doctor: disease detection via backend proxy (`VITE_AI_DOCTOR_API_URL`).
  - AWS backend proxy lives in `backend/aws-autowatering-backend` (Kindwise API key stays server-side).
  - Premium-only enforcement enabled in backend via `REQUIRE_PREMIUM_FOR_AI=true`.
  - Backend enforces Cognito-authenticated access + per-account daily/monthly usage limits (configured in backend env).
- Plant ID: camera-based plant identification via backend proxy `POST /plantId` (Kindwise).
  - Configured via `VITE_PLANT_ID_API_URL` or auto-derived from `VITE_AI_DOCTOR_API_URL` when it ends with `/aiDoctor`.
  - Premium-only enforcement enabled in backend via `REQUIRE_PREMIUM_FOR_PLANT_ID=true`.
  - Backend enforces Cognito-authenticated access + per-account daily/monthly usage limits (configured in backend env).

## Plant identification + AI Doctor provider decision (2026-02-06)
- Recommended API: Kindwise (`plant.id` + `plant.health`) as primary provider.
- Why:
  - Single vendor covers both plant identification and disease detection.
  - Has conversation endpoint usable as an "AI doctor" explanation layer.
  - Fits current mobile flow (image upload + optional symptom text).
- Fallback provider:
  - Pl@ntNet for plant-only identification fallback if Kindwise is unavailable.
- App architecture decision:
  - Prefer backend proxy (`VITE_AI_DOCTOR_API_URL`) for API key safety, request normalization, and provider failover.
  - No direct client-side Kindwise API key support (backend-only).

## Navigation and flows
### Mobile connection flow
- /welcome (MobileWelcome)
  - Auto-connect to lastDevice (useKnownDevices) and list saved devices.
  - Redirect to /onboarding if setup incomplete; otherwise /dashboard.
- /permissions (MobilePermissions)
  - Requests/checks BLE, location, and notification permissions.
  - Persists permission state locally.
- /scan (MobileDeviceScan)
  - BleService.scan + connect to discovered device.
  - Saves device to known list; redirects to /dashboard or /onboarding.
- /connection-success (MobileConnectionSuccess)
  - Success UI; deviceName/Id from navigation state or fallback.
- /no-devices (MobileNoDevices)
  - CTA to /scan and /help.
- /manage-devices (MobileManageDevices)
  - Uses known devices + discovered RSSI and supports real device switching via BLE reconnect.

### Mobile main tabs
- /dashboard (MobileDashboard)
  - Device selector + rename (local only).
  - Live telemetry (env/rain/auto-calc) + soil moisture estimate.
  - Manual watering (BLE), emergency stop (BLE).
  - Pause/resume current watering task via BLE.
  - Mini rain chart is still static UI.
- /zones (MobileZones)
  - Configured zones list and quick watering.
  - Placeholder: status labels, weather summary, last run text.
- /history (MobileHistory)
  - Watering/rain/environment tabs with day/week/month filters.
  - BLE history fetch with in-flight guard.
- /settings (MobileSettings)
  - Device switch/disconnect.
  - Theme, language, units (real).
  - Placeholder: Schedules, Rain Delay, Help, Firmware, About.

### Mobile zone flow
- /zones/add (MobileZoneAddWizard)
  - Multi-step zone creation (mode-dependent).
  - Writes ChannelConfig + GrowingEnv + ScheduleConfig.
  - GPS soil detection + custom soil creation.
  - Camera plant identification is wired via `VITE_PLANT_ID_API_URL` (or derived from `VITE_AI_DOCTOR_API_URL`) and selects best local DB match by ID/scientific name.
  - Weather adjustments are still UI-only.
- /zones/:channelId (MobileZoneDetailsFull)
  - Tabs: overview, schedule, compensation, history.
  - Edits: watering mode, schedule, plant, soil, irrigation, coverage, sun, compensation, water management.
  - Camera plant identification is wired via `VITE_PLANT_ID_API_URL` (or derived from `VITE_AI_DOCTOR_API_URL`).
- /zones/:channelId/config (MobileZoneConfig)
  - UI-only, uses local JSON; Save does not write to BLE.
- MobileZoneDetails (legacy)
  - Not routed; placeholders for skip/open schedule/settings.

### Mobile device settings
- /device (MobileDeviceSettings)
  - Hub for subpages.
- /device/info (MobileDeviceInfo)
  - Fully mock data; update/reboot placeholders.
- /device/time (MobileTimeLocation)
  - Sync time, select timezone preset, set location (lat only).
  - DST is hard-coded off.
- /device/master-valve (MobileMasterValve)
  - Enable master valve and set pre/post delays.
- /device/flow-calibration (MobileFlowCalibration)
  - Full UI flow wired to BLE start/stop/calc/apply.
  - Manual override writes flow_calibration in SystemConfig.
- /device/power-mode (MobilePowerMode)
  - Switch power mode (performance/balanced/eco) -> SystemConfig.
- /device/reset (MobileDeviceReset)
  - Reset settings/schedules/history or factory wipe.
- /device/packs (MobilePacksSettings)
  - Sync custom plants + pack stats; check updates placeholder.
- /device/create-plant (MobileCreatePlant)
  - Custom plant wizard; save writes custom plant to BLE (`writePackPlant`) and refreshes pack cache.

### Weather and alerts
- /weather (MobileWeatherDetails)
  - Uses env/rain + soil moisture calc.
  - Loads hourly rain/environment history for chart and computes real "last updated" timestamp.
- /notifications (MobileNotifications)
  - Aggregates alarm history + current alarm + watering events + connection-loss state.
- /alarms (MobileAlarmHistory)
  - Reads alarm history + current active alarm; refresh via BLE.

### App settings and help
- /app-settings (MobileAppSettings)
  - Theme, language, units (real).
  - Notifications toggle persisted in localStorage and requests browser notification permission.
  - Export Data and Clear App Data are wired (`useConfigExport`, history/offline cache reset).
- /help (MobileHelpAbout)
  - Static content; buttons have no real navigation.
- /auth (MobileAuth)
  - AWS Cognito email/password login + signup.
  - Optional Google sign-in via Cognito Hosted UI (PKCE) when configured.
  - Guest mode toggle persisted locally.
  - Shows current account and basic plan state.
- /profile (MobileProfile)
  - Editable profile fields (display name, phone, company, country).
  - Email verification trigger.
  - Password change flow (reauth + update).
  - Account delete flow (reauth + backend delete endpoint).
- /premium (MobilePremium)
  - Reads subscription status from backend.
  - Starts Stripe checkout session for monthly premium.
  - Opens Stripe billing portal for subscription management.
  - 7-day free trial applies automatically for first-time accounts (backend-enforced).
- /ai-doctor (MobileAiDoctor)
  - Upload/capture plant image + optional symptom notes.
  - Runs disease diagnosis through `AiDoctorService`.
  - Uses backend proxy endpoint (`VITE_AI_DOCTOR_API_URL`) (Kindwise key stays server-side).
  - Access is gated: login + premium required in UI.
  - Shows plant guess, health status, disease candidates, follow-up question, and LLM guidance text.

### Desktop pages
- /dashboard
  - Connection status, emergency stop, alarm card, task control, diagnostics.
  - Auto-launch OnboardingWizard if onboarding incomplete.
- /zones
  - Zone list + ZoneConfigModal (edit FAO-56/Duration/Volume + schedule).
- /history
  - HistoryDashboard with charts (HistoryService + Recharts).
- /settings
  - RTC, master valve, rain sensor config, calibration wizard, reset modal.
- /analytics
  - Exists but not routed in Shell/Sidebar.

## Everything you can configure (full list)

### App preferences (local only)
- Theme: dark or light (MobileSettings, MobileAppSettings).
- Language: EN or RO (MobileSettings, MobileAppSettings).
- Units:
  - Temperature unit: deg C or deg F (useSettings).
  - System: metric (L, m2) or imperial (gal, ft2).
- Notifications toggle in MobileAppSettings (persisted in localStorage + permission prompt).
- Export/Clear App Data are wired (config export + cache/store cleanup).
- Account mode:
  - Guest mode (local-only).
  - Cognito account login/signup (email/password).
- Premium:
  - Monthly Stripe checkout flow.
  - Billing portal management.
  - Premium status sync from backend.
- Profile management:
  - Profile stored in DynamoDB via backend (`getProfile` / `updateProfile`).
  - Cognito token claims supply email/name/picture; editable profile fields live server-side.
  - Email verification + password change + delete account.
- Cloud account backup:
  - Backup/restore of important local app preferences (settings/theme/language/known devices/permissions/notification toggle) in DynamoDB (`getUserState` / `saveUserState`).

### Known devices and connection behavior
- Save and auto-connect to last known device (MobileWelcome, MobileDeviceScan).
- Rename device label (MobileDashboard) - stored locally, not written to firmware.
- Switch to another known device (MobileDashboard, MobileSettings).

### Device and system settings (global controller config)
- Master valve:
  - Enable/disable.
  - Pre-delay and post-delay (seconds).
  - Accessible in OnboardingWizard, MobileMasterValve, and desktop Settings.
- Rain sensor:
  - Enable/disable.
  - Calibration (mm per pulse).
  - Rain skip threshold (mm).
  - Accessible in OnboardingWizard and desktop Settings only.
- Power mode:
  - Performance / Balanced / Eco (mapped to firmware power_mode 0/1/2).
  - Accessible in OnboardingWizard and MobilePowerMode.
- Flow calibration:
  - Manual pulses-per-liter entry (OnboardingWizard, MobileFlowCalibration manual override).
  - Full calibration workflow is wired to BLE start/stop/calc/apply actions.
- Time and timezone:
  - Sync device time now.
  - Choose timezone from presets (writes UTC offset).
  - DST is hard-coded off.
  - Set location (lat only) for channel 0.
- Reset options:
  - Reset settings, schedules, history, or factory wipe (MobileDeviceReset).
- Packs and storage:
  - View flash usage and custom plant count.
  - Refresh/sync custom plants and list installed packs.
  - Check updates is placeholder.

### Zone configuration (per channel)
Configurable during onboarding (desktop OnboardingWizard), zone add (MobileZoneAddWizard), and zone edit (MobileZoneDetailsFull or ZoneConfigModal on desktop).

- Basic:
  - Enable/disable zone (OnboardingWizard zone selection).
  - Zone name.
- Watering mode:
  - FAO-56 Auto (100 percent), FAO-56 Eco (70 percent), Duration, Volume.
- Plant selection:
  - Choose from plant database, with category filters and search.
- Soil selection:
  - Choose from soil database.
  - Optional GPS-based SoilGrids detection that can create a custom soil profile.
  - Custom soil uses computed parameters (field capacity, wilting point, infiltration rate, bulk density, organic matter).
- Irrigation method:
  - Choose from irrigation methods database.
- Coverage:
  - Coverage type: area or plant count.
  - Coverage value: m2 or plants.
- Sun exposure:
  - Sun exposure slider or preset (shade/partial/full).
- Location:
  - Set zone location via GPS/map/manual input (OnboardingWizard/LocationPicker).
- Planting date:
  - Set planting date in OnboardingWizard (FAO-56).
- Water management:
  - Cycle and soak enable.
  - Cycle minutes and soak minutes (desktop wizard and MobileZoneDetailsFull).
  - Max volume limit per watering (FAO-56).
- Manual actions:
  - Start/stop manual watering for a zone (mobile and desktop).
  - Quick duration presets (MobileZoneDetailsFull).

### Scheduling and automation
- Enable/disable schedule.
- Schedule type:
  - Daily: select weekdays.
  - Periodic: set interval in days.
  - Auto (FAO-56): device decides next watering.
- Start time:
  - Set hour and minute.
- Solar timing (for daily/periodic):
  - Toggle solar timing.
  - Choose sunrise or sunset.
  - Set offset minutes (negative or positive).
- Watering value for manual modes:
  - Duration minutes or volume liters.

### Compensation (per zone)
Editable in desktop OnboardingWizard and MobileZoneDetailsFull (compensation tab).
- Rain compensation:
  - Enable/disable.
  - Sensitivity (0.0 to 1.0).
  - Lookback hours.
  - Skip threshold (mm).
  - Reduction factor (0.0 to 1.0).
- Temperature compensation:
  - Enable/disable.
  - Base temperature (deg C).
  - Sensitivity (0.1 to 2.0).
  - Min factor (0.5 to 1.0) and max factor (1.0 to 2.0).
- Note: In OnboardingWizard, compensation is applied for time/volume modes only.

### Task queue and emergency controls (desktop)
- Pause, resume, stop current watering.
- Start next queued task.
- Clear task queue.
- Emergency stop from dashboard.

### History and analytics filters
- MobileHistory:
  - Tab selection (watering/rain/environment).
  - Timeframe: day/week/month.
  - Date navigation.
- Desktop HistoryDashboard/Analytics:
  - Charts for watering, rain, environment, statistics.

### Packs and custom plants
- View ROM plants and custom plants in MobilePacksSettings.
- View installed packs list.
- Custom plant creation (MobileCreatePlant) fields:
  - Name, scientific name, category.
  - Growth cycle (annual/perennial/biennial).
  - Growth stages (initial, development, mid, end days).
  - Kc coefficients (initial, mid, end).
  - Root depth (min/max).
  - Depletion fraction.
  - Irrigation method.
  - Save writes plant to BLE pack service (`writePackPlant`) and refreshes custom-plant cache.

## Placeholders and not wired (important limitations)
- MobileDeviceInfo: update/reboot actions are not exposed in current firmware BLE API.
- MobileWeatherDetails: wind source is missing; chart is built from recent history (not true forecast).
- MobileDashboard: mini rain chart is static.
- MobileZones: status labels, weather summary, last run text are placeholders.
- MobileZoneConfig: save is UI-only.
- MobileZoneAddWizard: weather adjustments do not write to BLE.
- MobileSettings: Schedules/Rain Delay/Help/Firmware/About placeholders.
- MobileZoneDetailsFull: skip-next-watering command is missing from current firmware BLE API.
- AI Doctor premium gate depends on backend deployment + Stripe/AWS secrets.
- Cloud backup currently syncs preferences/device-list keys (not full BLE zone config snapshot yet).
- ConfigWizard/ConfigWizardNew and QRCodeSharing are implemented but not routed in Shell.
- useVoiceInput, useSmartDefaults, useHaptics are not integrated into core UI.
- mapOffline utility exists but is not used.

## What is next (directly from the gaps above)
1) Configure Stripe webhook endpoint in Stripe dashboard and verify DynamoDB premium sync in production.
2) Add automatic cloud sync triggers (on settings/profile changes) and optional multi-device conflict resolution.
3) Add firmware command for skip-next-watering and wire it in MobileZoneDetailsFull.
4) Wire MobileZoneConfig save to BLE writes.
5) Integrate real weather forecast + wind data source in MobileWeatherDetails.
6) Add dedicated mobile screens for Schedules and Rain Delay (instead of generic redirects).
7) Route QRCodeSharing (generator/import UI) from settings/help.
8) Integrate offline map tile cache flow (`mapOffline`) into location picker.
