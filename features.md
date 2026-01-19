# AutoWatering App - Detailed Features and Settings (code-based)

Last code analysis: 2026-01-18 22:17 (local).
Source of truth: code in /src and routes in src/components/Layout/Shell.tsx.
Note: tests/build not run for this analysis.

## Overview
AutoWatering is a mobile-first (Ionic React + Capacitor) app with a desktop layout at larger widths. It connects to an irrigation controller over BLE, synchronizes device state, and lets you configure zones, schedules, and system settings. The app stores state in a single Zustand store and persists some local preferences in localStorage/IndexedDB.

## Platform and layout behavior
- Desktop UI is used at width >= 1024px. Mobile UI is used below that.
- The Shell routes and guards are in src/components/Layout/Shell.tsx.
- Main app routes are protected and require a BLE connection.

## Core services and data sources
- BLE: connect, bonding, GATT queue, fragmentation, notifications, initial sync phases.
- Store: Zustand single source of truth (zones, configs, telemetry, history, alarms, packs).
- Local DB: plants, soils, irrigation methods loaded from /assets via DatabaseService.
- SoilGrids: GPS-based soil detection with REST + WCS fallback and local cache.
- History: BLE history fetch with IndexedDB caching and aggregation (day/week/month).
- Packs: pack stats, custom plant streaming, and installed packs list.

## Navigation and flows
### Mobile connection flow
- /welcome (MobileWelcome)
  - Auto-connect to lastDevice (useKnownDevices) and list saved devices.
  - Redirect to /onboarding if setup incomplete; otherwise /dashboard.
- /permissions (MobilePermissions)
  - UI only: simulates grant/skip; no native permission calls.
- /scan (MobileDeviceScan)
  - BleService.scan + connect to discovered device.
  - Saves device to known list; redirects to /dashboard or /onboarding.
- /connection-success (MobileConnectionSuccess)
  - Success UI; deviceName/Id from navigation state or fallback.
- /no-devices (MobileNoDevices)
  - CTA to /scan and /help.
- /manage-devices (MobileManageDevices)
  - Mock list only; switch is console.log.

### Mobile main tabs
- /dashboard (MobileDashboard)
  - Device selector + rename (local only).
  - Live telemetry (env/rain/auto-calc) + soil moisture estimate.
  - Manual watering (BLE), emergency stop (BLE).
  - Placeholder: Pause schedule, mini rain chart.
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
  - Placeholder: camera plant ID; weather adjustments are UI only.
- /zones/:channelId (MobileZoneDetailsFull)
  - Tabs: overview, schedule, compensation, history.
  - Edits: watering mode, schedule, plant, soil, irrigation, coverage, sun, compensation, water management.
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
  - Full UI flow; BLE start/stop/calc/apply are stubs.
  - Manual override writes flow_calibration in SystemConfig.
- /device/power-mode (MobilePowerMode)
  - Switch power mode (performance/balanced/eco) -> SystemConfig.
- /device/reset (MobileDeviceReset)
  - Reset settings/schedules/history or factory wipe.
- /device/packs (MobilePacksSettings)
  - Sync custom plants + pack stats; check updates placeholder.
- /device/create-plant (MobileCreatePlant)
  - Custom plant wizard; save is TODO.

### Weather and alerts
- /weather (MobileWeatherDetails)
  - Uses env/rain + soil moisture calc.
  - Placeholder: wind speed, forecast chart, updated timestamp.
- /notifications (MobileNotifications)
  - Fully mock list.
- /alarms (MobileAlarmHistory)
  - Reads alarm history + current active alarm; refresh via BLE.

### App settings and help
- /app-settings (MobileAppSettings)
  - Theme, language, units (real).
  - Notifications toggle local only.
  - Placeholder: Export Data / Clear App Data.
- /help (MobileHelpAbout)
  - Static content; buttons have no real navigation.

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
- Notifications toggle in MobileAppSettings (local state only).
- Export/Clear App Data buttons exist but are placeholders.

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
  - Full calibration workflow exists, but BLE start/stop/calc/apply are stubbed.
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
  - Save is TODO (not written to BLE yet).

## Placeholders and not wired (important limitations)
- MobilePermissions: no native permission requests.
- MobileManageDevices: mock list only.
- MobileDeviceInfo: mock data; update/reboot are placeholders.
- MobileNotifications: mock list.
- MobileWeatherDetails: wind, forecast, updated time are static.
- MobileDashboard: Pause schedule placeholder; mini rain chart static.
- MobileZones: status labels, weather summary, last run text are placeholders.
- MobileZoneConfig: save is UI-only.
- MobileZoneAddWizard: camera plant ID TODO; weather adjustments do not write to BLE.
- MobileSettings: Schedules/Rain Delay/Help/Firmware/About placeholders.
- MobileAppSettings: Export/Clear data placeholders.
- MobileCreatePlant: save TODO.
- Flow calibration BLE methods are stubbed in BleService (start/stop/calc/apply).
- BLE history parsing TODO for daily/monthly/annual and env trends.
- ConfigWizard/ConfigWizardNew and QRCodeSharing exist but are not routed.
- useConfigExport, useVoiceInput, useSmartDefaults, useHaptics, useOfflineMode are not integrated into UI.
- mapOffline utility exists but is not used.

## What is next (directly from the gaps above)
1) Implement real BLE flow calibration + wire MobileFlowCalibration to final methods.
2) Wire schedule pause / skip next watering (mobile dashboard / zone details).
3) Replace mock data in MobileDeviceInfo, MobileNotifications, MobileManageDevices.
4) Weather: real wind + forecast + real timestamp (data source).
5) MobileSettings: real screens for Schedules, Rain Delay, Help/Firmware/About.
6) MobileAppSettings: Export/Clear Data (use useConfigExport + clear cache).
7) Packs: wire MobileCreatePlant to BleService.writePackPlant + update packs (server/backend).
8) Native permissions on /permissions (Capacitor) + persist notifications toggle.
9) Offline mode + map tile cache integrated in UI.
10) Real QR code sharing (generator + import).
