// ============================================================================
// ENUMS - BLE Protocol Constants
// ============================================================================

export enum SystemStatus {
    OK = 0,
    NO_FLOW = 1,
    UNEXPECTED_FLOW = 2,
    FAULT = 3,
    RTC_ERROR = 4,
    LOW_POWER = 5
}

export enum TaskStatus {
    IDLE = 0,
    RUNNING = 1,
    PAUSED = 2,
    COMPLETED = 3
}

export enum ScheduleType {
    DAILY = 0x00,
    PERIODIC = 0x01,
    AUTO = 0x02
}

export enum WateringMode {
    DURATION_MINUTES = 0x00,
    VOLUME_LITERS = 0x01
}

export enum AutoMode {
    DISABLED = 0x00,
    FAO56_AREA = 0x01,
    FAO56_PLANT_COUNT = 0x02,
    LEGACY_INTERVAL = 0x03,
    SMART_SOIL = 0x04
}

export enum PhenologicalStage {
    INITIAL = 0,
    DEVELOPMENT = 1,
    MID_SEASON = 2,
    LATE_SEASON = 3
}

export enum SensorStatus {
    OK = 0x00,
    OFFLINE = 0x01,
    ERROR = 0x02,
    CALIBRATING = 0x03,
    INITIALIZING = 0x04
}

export enum DataQuality {
    GOOD = 0x00,
    DEGRADED = 0x01,
    STALE = 0x02,
    INVALID = 0x03
}

/**
 * Alarm codes from firmware - matches BLE alarm characteristic documentation.
 * These are the codes raised by watering_monitor.c and watering_tasks.c.
 */
export enum AlarmCode {
    NONE = 0x00,
    NO_FLOW = 0x01,           // No flow detected when valve is open (after retries)
    UNEXPECTED_FLOW = 0x02,   // Pulses detected with all valves closed
    FREEZE_LOCKOUT = 0x03,    // Freeze safety triggered (temp below threshold)
    HIGH_FLOW = 0x04,         // Flow exceeds learned high limit (burst/leak)
    LOW_FLOW = 0x05,          // Flow below learned limit (warning only)
    MAINLINE_LEAK = 0x06,     // Static test detected pulses with zones off
    CHANNEL_LOCK = 0x07,      // Channel locked after persistent anomalies
    GLOBAL_LOCK = 0x08        // Global lock due to leak/unexpected flow
}

/**
 * Alarm severity classification for UI display
 */
export enum AlarmSeverity {
    INFO = 'info',
    WARNING = 'warning',
    DANGER = 'danger',
    CRITICAL = 'critical'
}

/**
 * Hydraulic lock level from H.H.M. (Hydraulic Health Monitoring)
 */
export enum HydraulicLockLevel {
    NONE = 0,     // No lock - normal operation
    SOFT = 1,     // Soft lock - auto-retry scheduled
    HARD = 2      // Hard lock - manual intervention required
}

/**
 * Hydraulic lock reason from H.H.M.
 */
export enum HydraulicLockReason {
    NONE = 0,
    HIGH_FLOW = 1,      // Flow exceeded learned high limit
    NO_FLOW = 2,        // No flow detected during watering
    UNEXPECTED = 3,     // Flow detected with all valves closed
    MAINLINE_LEAK = 4   // Static test detected leak
}

/**
 * Hydraulic profile type - learned or manually set
 */
export enum HydraulicProfileType {
    AUTO = 0,    // Auto-learning mode
    SPRAY = 1,   // Manual spray profile
    DRIP = 2     // Manual drip profile
}

export enum CalibrationAction {
    STOP = 0x00,
    START = 0x01,
    IN_PROGRESS = 0x02,
    CALCULATED = 0x03,
    APPLY = 0x04,
    RESET = 0x05
}

export enum ResetOpcode {
    RESET_CHANNEL_CONFIG = 0x01,
    RESET_CHANNEL_SCHEDULES = 0x02,
    RESET_ALL_CHANNEL_CONFIGS = 0x10,
    RESET_ALL_SCHEDULES = 0x11,
    RESET_SYSTEM_CONFIG = 0x12,
    RESET_HISTORY = 0x14,
    FACTORY_RESET = 0xFF
}

export enum ResetStatus {
    IDLE = 0x00,             // No operation pending or in progress
    AWAIT_CONFIRM = 0x01,    // Confirmation code is active, waiting for execution
    IN_PROGRESS = 0x02,      // Factory wipe executing step-by-step
    DONE_OK = 0x03,          // Factory wipe completed successfully
    DONE_ERROR = 0x04,       // Factory wipe failed (check last_error)
    /** @deprecated Use AWAIT_CONFIRM instead */
    PENDING = 0x01,          // Alias for backwards compatibility
    LEGACY_IDLE = 0xFF       // Old idle value (for backwards compatibility)
}

/**
 * Factory wipe step identifiers from reset control reserved[1] field
 * @see docs-embedded/ble-api/characteristics/25-reset-control.md
 */
export enum FactoryWipeStep {
    PREPARE = 0,             // Initialize wipe, persist state
    RESET_CHANNELS = 1,      // Reset all 8 channel configurations
    RESET_SYSTEM = 2,        // Reset system configuration
    RESET_CALIBRATION = 3,   // Reset calibration data
    CLEAR_RAIN_HIST = 4,     // Clear rain history (flash erase)
    CLEAR_ENV_HIST = 5,      // Clear environmental history
    CLEAR_ONBOARDING = 6,    // Clear onboarding NVS flags
    VERIFY = 7,              // Verify all data erased
    DONE = 8                 // Cleanup and finalize
}

export enum CalibrationState {
    IDLE = 0,
    IN_PROGRESS = 1,
    COMPLETED = 2,
    FAILED = 3,
    CANCELLED = 4
}

// Watering engine error codes (from firmware docs, signed values)
export enum WateringError {
    SUCCESS = 0,
    INVALID_PARAM = -1,
    NOT_INITIALIZED = -2,
    HARDWARE = -3,
    BUSY = -4,
    QUEUE_FULL = -5,
    TIMEOUT = -6,
    CONFIG = -7,
    RTC_FAILURE = -8,
    STORAGE = -9,
    DATA_CORRUPT = -10,
    INVALID_DATA = -11,
    BUFFER_FULL = -12,
    NO_MEMORY = -13
}

export enum TaskQueueCommand {
    NONE = 0x00,
    START_NEXT = 0x01,
    PAUSE = 0x02,
    RESUME = 0x03,
    CANCEL = 0x04,
    CLEAR_ALL = 0x05
}

export enum HistoryCommand {
    QUERY_COUNT = 0x01,
    QUERY_RANGE = 0x02,
    EXPORT_RANGE = 0x03,
    CLEAR_ALL = 0x04,
    CLEAR_CHANNEL = 0x05
}

export enum RainHistoryCommand {
    GET_HOURLY = 0x01,
    GET_DAILY = 0x02,
    GET_RECENT = 0x03,
    RESET_DATA = 0x10,
    CALIBRATE = 0x20
}

export enum EnvHistoryCommand {
    GET_DETAILED = 0x01,
    GET_HOURLY = 0x02,
    GET_DAILY = 0x03,
    GET_TRENDS = 0x04,
    CLEAR_HISTORY = 0x05
}

// ============================================================================
// STRUCTS - BLE Data Structures
// ============================================================================

export interface ChannelConfigData {
    channel_id: number;      /* 0-7 */
    name_len: number;        /* 0-63 */
    name: string;            /* UTF-8 string */
    auto_enabled: boolean;   /* 1 = schedule auto mode active */
    plant_type: number;      /* 0-7 */
    soil_type: number;       /* 0-7 */
    irrigation_method: number; /* 0-5 */
    coverage_type: number;   /* 0=area (m^2), 1=plant count */
    coverage: {
        area_m2?: number;    /* float, little-endian */
        plant_count?: number;/* uint16 */
    };
    sun_percentage: number;  /* 0-100 */
}

export interface ValveControlData {
    channel_id: number;      /* 0-7 or 0xFF for master */
    task_type: number;       /* 0=duration/inactive, 1=volume/active */
    value: number;           /* minutes or liters */
}

export interface RtcData {
    year: number;            /* Year - 2000 */
    month: number;           /* 1-12 */
    day: number;             /* 1-31 */
    hour: number;            /* 0-23 */
    minute: number;          /* 0-59 */
    second: number;          /* 0-59 */
    day_of_week: number;     /* 0=Sunday (read-only) */
    utc_offset_minutes: number; /* +/- minutes */
    dst_active: boolean;     /* 1=DST active */
}

export interface CalibrationData {
    action: number;          /* 0=STOP, 1=START, 2=IN_PROGRESS, 3=CALCULATED, 4=APPLY, 5=RESET */
    pulses: number;          /* uint32 */
    volume_ml: number;       /* uint32 */
    pulses_per_liter: number;/* uint32 */
}

/**
 * Reset Control Data (16 bytes)
 * @see docs-embedded/ble-api/characteristics/25-reset-control.md
 */
export interface ResetControlData {
    reset_type: number;       /* uint8, offset 0 - Opcode */
    channel_id: number;       /* uint8, offset 1 - 0-7 or 0xFF */
    confirmation_code: number; /* uint32 LE, offset 2 */
    status: number;           /* uint8, offset 6 - ResetStatus */
    timestamp: number;        /* uint32 LE, offset 7 - Generation time (s since boot) */
    // Factory wipe progress fields from reserved bytes (only set when status=IN_PROGRESS)
    progress_pct?: number;    /* uint8, offset 11 - Progress percentage (0-100) */
    wipe_step?: number;       /* uint8, offset 12 - Current FactoryWipeStep */
    retry_count?: number;     /* uint8, offset 13 - Retry attempts for current step */
    last_error?: number;      /* uint16 LE, offset 14 - Last error code (0=none) */
}

// ============================================================================
// Flow Sensor Data (Characteristic #2) - 4 bytes
// ============================================================================
export interface FlowSensorData {
    flow_rate_or_pulses: number;  /* uint32: smoothed pps (normal) or raw pulses (calibration) */
}

// ============================================================================
// Task Queue Data (Characteristic #7) - 9 bytes
// ============================================================================
export interface TaskQueueData {
    pending_count: number;       /* uint8: tasks waiting in queue */
    completed_tasks: number;     /* uint8: completed since boot */
    current_channel: number;     /* uint8: 0-7 or 0xFF if idle */
    current_task_type: number;   /* uint8: 0=duration, 1=volume, 0xFF=error */
    current_value: number;       /* uint16: minutes or liters (or error code if type=0xFF) */
    command: number;             /* uint8: command to execute (write-only) */
    task_id_to_delete: number;   /* uint8: reserved for future */
    active_task_id: number;      /* uint8: currently active task ID */
}

// ============================================================================
// Statistics Data (Characteristic #8) - 15 bytes
// ============================================================================
export interface StatisticsData {
    channel_id: number;         /* uint8: channel 0-7 */
    total_volume: number;       /* uint32: total ml dispensed */
    last_volume: number;        /* uint32: last irrigation ml */
    last_watering: number;      /* uint32: Unix timestamp */
    count: number;              /* uint16: completion count */
}

// ============================================================================
// Alarm Data (Characteristic #10) - 7 bytes
// ============================================================================
export interface AlarmData {
    alarm_code: number;         /* uint8: alarm identifier (0=none) */
    alarm_data: number;         /* uint16: extra context */
    timestamp: number;          /* uint32: UTC seconds */
}

/**
 * Alarm history entry for tracking past alarms
 */
export interface AlarmHistoryEntry {
    alarm_code: AlarmCode;
    alarm_data: number;
    timestamp: number;          /* UTC seconds when raised */
    cleared_at?: number;        /* UTC seconds when cleared (undefined if still active) */
    channel_id?: number;        /* Extracted channel ID if applicable */
}

// ============================================================================
// Auto Calculation Status (Characteristic #15) - 64 bytes
// ============================================================================
export interface AutoCalcStatusData {
    channel_id: number;          /* uint8 */
    calculation_active: number;  /* uint8 */
    irrigation_needed: number;   /* uint8 */
    current_deficit_mm: number;  /* float */
    et0_mm_day: number;          /* float */
    crop_coefficient: number;    /* float */
    net_irrigation_mm: number;   /* float */
    gross_irrigation_mm: number; /* float */
    calculated_volume_l: number; /* float */
    last_calculation_time: number; /* uint32 */
    next_irrigation_time: number;  /* uint32 */
    days_after_planting: number;   /* uint16 */
    phenological_stage: number;    /* uint8 */
    quality_mode: number;          /* uint8 */
    volume_limited: number;        /* uint8 */
    auto_mode: number;            /* uint8 */
    raw_mm: number;               /* float */
    effective_rain_mm: number;    /* float */
    calculation_error: number;    /* uint8 */
    etc_mm_day: number;           /* float */
    volume_liters: number;        /* float (legacy alias) */
    cycle_count: number;          /* uint8 */
    cycle_duration_min: number;   /* uint8 */
    reserved?: number[];          /* uint8[4] */
}

// ============================================================================
// Hydraulic Status Data (Characteristic #29 - UUID: de22) - 48 bytes
// ============================================================================
export interface HydraulicStatusData {
    channel_id: number;             /* uint8: channel 0-7 */
    profile_type: HydraulicProfileType; /* uint8: 0=auto, 1=spray, 2=drip */
    lock_level: HydraulicLockLevel; /* uint8: 0=none, 1=soft, 2=hard */
    lock_reason: HydraulicLockReason; /* uint8: 0=none, 1=high flow, 2=no flow, 3=unexpected, 4=mainline leak */
    nominal_flow_ml_min: number;    /* uint32: learned nominal flow (ml/min) */
    ramp_up_time_sec: number;       /* uint16: learned ramp-up time (seconds) */
    tolerance_high_percent: number; /* uint8: high flow tolerance percentage */
    tolerance_low_percent: number;  /* uint8: low flow tolerance percentage */
    is_calibrated: boolean;         /* uint8: 1 if stable runs met */
    monitoring_enabled: boolean;    /* uint8: 1 if monitoring enabled */
    learning_runs: number;          /* uint8: total learning runs */
    stable_runs: number;            /* uint8: stable learning runs */
    estimated: boolean;             /* uint8: 1 if nominal flow is estimated */
    manual_override_active: boolean; /* uint8: 1 if manual override active */
    lock_at_epoch: number;          /* uint32: channel lock timestamp (UTC epoch) */
    retry_after_epoch: number;      /* uint32: channel retry timestamp (UTC epoch) */
    no_flow_runs: number;           /* uint8: persistent NO_FLOW count */
    high_flow_runs: number;         /* uint8: persistent HIGH_FLOW count */
    unexpected_flow_runs: number;   /* uint8: persistent UNEXPECTED_FLOW count */
    last_anomaly_epoch: number;     /* uint32: last anomaly timestamp (UTC epoch) */
    global_lock_level: HydraulicLockLevel; /* uint8: global lock level */
    global_lock_reason: HydraulicLockReason; /* uint8: global lock reason */
    global_lock_at_epoch: number;   /* uint32: global lock timestamp (UTC epoch) */
    global_retry_after_epoch: number; /* uint32: global retry timestamp (UTC epoch) */
}

// ============================================================================
// Diagnostics Data (Characteristic #13) - 12 bytes
// ============================================================================
export interface DiagnosticsData {
    uptime: number;             /* uint32: minutes since boot */
    error_count: number;        /* uint16: total errors recorded */
    last_error: number;         /* uint8: most recent error code */
    valve_status: number;       /* uint8: bitmask of active valves */
    battery_level: number;      /* uint8: 0-100 or 0xFF (mains powered) */
    reserved?: number[];        /* uint8[3] */
}

// ============================================================================
// History Management (Characteristic #12)
// ============================================================================
export interface HistoryQueryHeader {
    channel_id: number;         /* uint8: 0-7 or 0xFF */
    history_type: number;       /* uint8: 0=detailed, 1=daily, 2=monthly, 3=annual, 0xFF=clear */
    entry_index: number;        /* uint8: page/offset */
    count: number;              /* uint8: requested entries (1-50) */
    start_timestamp: number;    /* uint32: optional filter */
    end_timestamp: number;      /* uint32: optional filter */
}

export interface HistoryDetailedEntry {
    timestamp: number;          /* uint32 */
    channel_id: number;         /* uint8 */
    event_type: number;         /* uint8: 1=complete, 3=error */
    mode: number;               /* uint8: 0=duration, 1=volume */
    target_value_ml: number;    /* uint16 */
    actual_value_ml: number;    /* uint16 */
    total_volume_ml: number;    /* uint16 */
    trigger_type: number;       /* uint8: 0=manual, 1=schedule, 2=remote */
    success_status: number;     /* uint8: boolean */
    error_code: number;         /* uint8 */
    flow_rate_avg: number;      /* uint16: ml/s */
}

export interface HistoryDailyEntry {
    day_index: number;          /* uint16: day of year */
    year: number;               /* uint16 */
    watering_sessions_ok: number; /* uint8 */
    total_volume_ml: number;    /* uint32 */
    total_duration_est_sec: number; /* uint16 */
    avg_flow_rate: number;      /* uint16 */
    success_rate: number;       /* uint8: 0-100 */
    error_count: number;        /* uint8 */
}

export interface HistoryMonthlyEntry {
    month: number;              /* uint8: 1-12 */
    year: number;               /* uint16 */
    total_sessions: number;     /* uint16 */
    total_volume_ml: number;    /* uint32 */
    total_duration_hours: number; /* uint16 */
    avg_daily_volume: number;   /* uint16 */
    active_days: number;        /* uint8 */
    success_rate: number;       /* uint8 */
}

export interface HistoryAnnualEntry {
    year: number;               /* uint16 */
    total_sessions: number;     /* uint16 */
    total_volume_liters: number; /* uint32 */
    avg_monthly_volume_liters: number; /* uint16 */
    most_active_month: number;  /* uint8 */
    success_rate: number;       /* uint8 */
    peak_month_volume_liters: number; /* uint16 */
}

// ============================================================================
// Rain History Control (Characteristic #20)
// ============================================================================
export interface RainHistoryCommandData {
    command: number;            /* uint8: RainHistoryCommand */
    start_timestamp: number;    /* uint32: inclusive start */
    end_timestamp: number;      /* uint32: inclusive end */
    max_entries: number;        /* uint16: 1-65535 */
    data_type: number;          /* uint8: 0=hourly, 1=daily */
    reserved?: number[];        /* uint8[4] */
}

export interface RainHourlyEntry {
    hour_epoch: number;         /* uint32 */
    rainfall_mm_x100: number;   /* uint16: divide by 100 for mm */
    pulse_count: number;        /* uint8 */
    data_quality: number;       /* uint8 */
}

export interface RainDailyEntry {
    day_epoch: number;          /* uint32 */
    total_rainfall_mm_x100: number; /* uint32: divide by 100 for mm */
    max_hourly_mm_x100: number; /* uint16 */
    active_hours: number;       /* uint8 */
    data_completeness: number;  /* uint8 */
}

export interface RainRecentTotals {
    last_hour_mm_x100: number;  /* uint32 */
    last_24h_mm_x100: number;   /* uint32 */
    last_7d_mm_x100: number;    /* uint32 */
}

// ============================================================================
// Environmental History (Characteristic #22)
// ============================================================================
export interface EnvHistoryRequest {
    command: number;            /* uint8: EnvHistoryCommand */
    start_time: number;         /* uint32: inclusive Unix start */
    end_time: number;           /* uint32: inclusive Unix end */
    data_type: number;          /* uint8: 0=detailed, 1=hourly, 2=daily */
    max_records: number;        /* uint8: 1-100 */
    fragment_id: number;        /* uint8: 0-based */
    reserved?: number[];        /* uint8[7] */
}

export interface EnvDetailedEntry {
    timestamp: number;          /* uint32 */
    temperature_c_x100: number; /* int16: divide by 100 */
    humidity_pct_x100: number;  /* uint16: divide by 100 */
    pressure_pa: number;        /* uint32: hPa × 100 */
}

export interface EnvHourlyEntry {
    timestamp: number;          /* uint32 */
    temp_avg_x100: number;      /* int16 */
    temp_min_x100: number;      /* int16 */
    temp_max_x100: number;      /* int16 */
    humidity_avg_x100: number;  /* uint16 */
    pressure_avg_pa: number;    /* uint32 */
}

export interface EnvDailyEntry {
    date_code: number;          /* uint32: YYYYMMDD */
    temp_avg_x100: number;      /* int16 */
    temp_min_x100: number;      /* int16 */
    temp_max_x100: number;      /* int16 */
    humidity_avg_x100: number;  /* uint16 */
    humidity_min_x100: number;  /* uint16 */
    humidity_max_x100: number;  /* uint16 */
    pressure_avg_pa: number;    /* uint32 */
    sample_count: number;       /* uint16 */
}

export interface EnvTrendEntry {
    temp_change_24h_x100: number;   /* int16 */
    humidity_change_24h_x100: number; /* int16 */
    pressure_change_24h: number;   /* int32 */
    temp_min_24h_x100: number;     /* int16 */
    temp_max_24h_x100: number;     /* int16 */
    humidity_min_24h_x100: number; /* uint16 */
    humidity_max_24h_x100: number; /* uint16 */
    temp_slope_per_hr_x100: number; /* int16 */
    humidity_slope_per_hr_x100: number; /* int16 */
    pressure_slope_per_hr: number; /* int16 */
    sample_count: number;          /* uint16 */
}

export interface UnifiedHistoryHeader {
    data_type: number;       /* uint8: domain-specific sub-type */
    status: number;          /* uint8: 0=OK, non-zero=error */
    entry_count: number;     /* uint16: total entries (LE) */
    fragment_index: number;  /* uint8: 0-based */
    total_fragments: number; /* uint8: total fragment count */
    fragment_size: number;   /* uint8: payload bytes in THIS fragment */
    reserved: number;        /* uint8: 0 */
}

// ============================================================================
// BULK SYNC SNAPSHOT (Characteristic #28) - 60 bytes
// ============================================================================
export interface BulkSyncSnapshot {
    version: number;                 /* uint8 */
    flags: number;                   /* uint8 */
    rtc_valid: boolean;              /* bit0 */
    env_valid: boolean;              /* bit1 */
    rain_valid: boolean;             /* bit2 */
    utc_timestamp: number;           /* uint32 */
    timezone_offset_min: number;     /* int16 */
    dst_active: boolean;             /* uint8 */
    system_mode: number;             /* uint8 */
    active_alarms: number;           /* uint8 */
    valve_states: number;            /* uint8 */
    active_channel: number;          /* uint8 */
    remaining_seconds: number;       /* uint16 */
    flow_rate_ml_min: number;        /* uint16 */
    temperature_c: number;           /* int16 / 10 */
    humidity_pct: number;            /* uint16 / 10 */
    pressure_hpa: number;            /* uint16 / 10 */
    dew_point_c: number;             /* int16 / 10 */
    vpd_kpa: number;                 /* uint16 / 100 */
    rain_today_mm: number;           /* uint16 / 10 */
    rain_week_mm: number;            /* uint16 / 10 */
    rain_integration_enabled: boolean; /* uint8 */
    skip_active: boolean;            /* uint8 */
    skip_remaining_min: number;      /* uint16 */
    temp_comp_enabled: boolean;      /* uint8 */
    rain_comp_enabled: boolean;      /* uint8 */
    temp_adjustment_pct: number;     /* int8 */
    rain_adjustment_pct: number;     /* int8 */
    pending_task_count: number;      /* uint8 */
    next_task_channel: number;       /* uint8 */
    next_task_in_min: number;        /* uint16 */
    next_task_timestamp: number;     /* uint32 */
    channel_status: number[];        /* uint8[8] */
}

// ============================================================================
// CONSTANTS - Protocol Values
// ============================================================================
export const FRAGMENT_TYPE_NAME_ONLY = 0x01;
export const FRAGMENT_TYPE_FULL_BE = 0x02;
export const FRAGMENT_TYPE_FULL_LE = 0x03;

export const UNIFIED_HEADER_SIZE = 8;
export const WRITE_HEADER_SIZE = 4;
export const MAX_CHUNK_SIZE = 20;
export const RAIN_HISTORY_FRAGMENT_SIZE = 232;
export const ENV_HISTORY_FRAGMENT_SIZE = 232;
export const RAIN_HISTORY_MAX_FRAGMENTS = 255;

// ============================================================================
// Current Task Data (Characteristic #16) - 22 bytes
// ============================================================================
export interface CurrentTaskData {
    channel_id: number;      /* 0-7 or 0xFF if idle */
    start_time: number;      /* uint32 */
    mode: number;            /* 0=duration, 1=volume */
    target_value: number;    /* uint32 (seconds or ml) */
    current_value: number;   /* uint32 (seconds or ml) */
    total_volume: number;    /* uint32 (ml) */
    status: number;          /* 0=Idle, 1=Running, 2=Paused */
    reserved: number;        /* uint16 (elapsed seconds in volume mode) */
}

// ============================================================================
// Onboarding Status (Characteristic #24) - 29 bytes
// ============================================================================

/**
 * Channel Config Flags - 8 bits per channel (uint64 total)
 * Bits are in order: [0..7] for channel 0, [8..15] for channel 1, etc.
 * Each channel has 8 flags corresponding to these settings.
 */
export const CHANNEL_FLAG = {
    PLANT_TYPE: 0,        // Bit 0: Plant type configured
    SOIL_TYPE: 1,         // Bit 1: Soil type configured
    IRRIGATION_METHOD: 2, // Bit 2: Irrigation method configured
    COVERAGE: 3,          // Bit 3: Coverage/area configured
    SUN_EXPOSURE: 4,      // Bit 4: Sun exposure configured
    NAME: 5,              // Bit 5: Zone name configured
    WATER_FACTOR: 6,      // Bit 6: Water factor/duration/volume configured
    ENABLED: 7,           // Bit 7: Zone enabled
} as const;

/**
 * System Config Flags - 8 defined bits (uint32)
 */
export const SYSTEM_FLAG = {
    TIMEZONE: 0,          // Bit 0: Timezone configured
    FLOW_CALIBRATION: 1,  // Bit 1: Flow sensor calibrated
    MASTER_VALVE: 2,      // Bit 2: Master valve configured
    RTC: 3,               // Bit 3: RTC (real-time clock) synced
    RAIN_SENSOR: 4,       // Bit 4: Rain sensor configured
    POWER_MODE: 5,        // Bit 5: Power mode configured
    LOCATION: 6,          // Bit 6: Location (GPS) configured
    INITIAL_SETUP: 7,     // Bit 7: Initial setup completed (auto-set by firmware)
} as const;

/**
 * Channel Extended Flags - 8 bits per channel (uint64 total)
 * Advanced configuration flags. Bit position = channel_id * 8 + flag_bit.
 */
export const CHANNEL_EXT_FLAG = {
    FAO56_READY: 0,       // Bit 0: Auto-set when all FAO-56 requirements met
    RAIN_COMP: 1,         // Bit 1: Rain compensation enabled for channel
    TEMP_COMP: 2,         // Bit 2: Temperature compensation enabled for channel
    CONFIG_COMPLETE: 3,          // Bit 3: Schedule configured for channel
    LATITUDE: 4,          // Bit 4: Latitude set for channel (!= 0)
    VOLUME_LIMIT: 5,      // Bit 5: Max volume limit configured (> 0)
    PLANTING_DATE: 6,     // Bit 6: Planting date configured (> 0)
    CYCLE_SOAK: 7,        // Bit 7: Cycle & soak enabled
} as const;

/**
 * Helper: Check if a specific channel has a flag set
 * @param channelFlags - The uint64 channel_config_flags from OnboardingStatusData
 * @param channelIndex - Channel index (0-7)
 * @param flag - Flag bit (0-7) from CHANNEL_FLAG
 */
export function hasChannelFlag(channelFlags: bigint, channelIndex: number, flag: number): boolean {
    const bitPosition = BigInt(channelIndex * 8 + flag);
    return (channelFlags & (BigInt(1) << bitPosition)) !== BigInt(0);
}

/**
 * Helper: Check if a specific system flag is set
 * @param systemFlags - The uint32 system_config_flags from OnboardingStatusData
 * @param flag - Flag bit from SYSTEM_FLAG
 */
export function hasSystemFlag(systemFlags: number, flag: number): boolean {
    return (systemFlags & (1 << flag)) !== 0;
}

/**
 * Helper: Check if a channel has a schedule configured
 * @param scheduleFlags - The uint8 schedule_config_flags from OnboardingStatusData
 * @param channelIndex - Channel index (0-7)
 */
export function hasSchedule(scheduleFlags: number, channelIndex: number): boolean {
    return (scheduleFlags & (1 << channelIndex)) !== 0;
}

/**
 * Helper: Check if a specific channel has an extended flag set
 * @param extendedFlags - The uint64 channel_extended_flags from OnboardingStatusData
 * @param channelIndex - Channel index (0-7)
 * @param flag - Flag bit (0-7) from CHANNEL_EXT_FLAG
 */
export function hasChannelExtFlag(extendedFlags: bigint, channelIndex: number, flag: number): boolean {
    const bitPosition = BigInt(channelIndex * 8 + flag);
    return (extendedFlags & (BigInt(1) << bitPosition)) !== BigInt(0);
}

/**
 * Helper: Check if channel has FAO-56 mode ready (auto-set by firmware)
 */
export function isChannelFao56Ready(extendedFlags: bigint, channelIndex: number): boolean {
    return hasChannelExtFlag(extendedFlags, channelIndex, CHANNEL_EXT_FLAG.FAO56_READY);
}

/**
 * Helper: Check if channel is fully configured (config_complete bit)
 */
export function isChannelConfigComplete(extendedFlags: bigint, channelIndex: number): boolean {
    return hasChannelExtFlag(extendedFlags, channelIndex, CHANNEL_EXT_FLAG.CONFIG_COMPLETE);
}

/**
 * Helper: Check if all essential FAO-56 fields are configured for a channel
 */
export function isChannelFao56Complete(channelFlags: bigint, channelIndex: number): boolean {
    return hasChannelFlag(channelFlags, channelIndex, CHANNEL_FLAG.PLANT_TYPE) &&
        hasChannelFlag(channelFlags, channelIndex, CHANNEL_FLAG.SOIL_TYPE) &&
        hasChannelFlag(channelFlags, channelIndex, CHANNEL_FLAG.IRRIGATION_METHOD) &&
        hasChannelFlag(channelFlags, channelIndex, CHANNEL_FLAG.COVERAGE) &&
        hasChannelFlag(channelFlags, channelIndex, CHANNEL_FLAG.SUN_EXPOSURE);
}

/**
 * Helper: Check if a channel has basic setup (name + enabled)
 */
export function isChannelBasicComplete(channelFlags: bigint, channelIndex: number): boolean {
    return hasChannelFlag(channelFlags, channelIndex, CHANNEL_FLAG.NAME) &&
        hasChannelFlag(channelFlags, channelIndex, CHANNEL_FLAG.ENABLED);
}

/**
 * Helper: Check if any channel has minimum required configuration (plant + soil + irrigation + coverage)
 * Used to determine if user has completed at least one channel setup
 */
export function hasAnyConfiguredChannel(channelFlags: bigint): boolean {
    const REQUIRED_FLAGS = 0x0F; // bits 0-3: plant + soil + irrigation + coverage

    for (let ch = 0; ch < 8; ch++) {
        const flags = Number((channelFlags >> BigInt(ch * 8)) & BigInt(0xFF));
        if ((flags & REQUIRED_FLAGS) === REQUIRED_FLAGS) {
            return true; // At least one channel is configured
        }
    }
    return false;
}

/**
 * Helper: Check if initial setup requirements are met
 * Initial setup requires: RTC configured + Timezone set + at least one channel configured
 */
export function isInitialSetupComplete(systemFlags: number, channelFlags: bigint): boolean {
    return hasSystemFlag(systemFlags, SYSTEM_FLAG.RTC) &&
        hasSystemFlag(systemFlags, SYSTEM_FLAG.TIMEZONE) &&
        hasAnyConfiguredChannel(channelFlags);
}

export interface OnboardingStatusData {
    overall_completion_pct: number;      /* uint8 - offset 0 */
    channels_completion_pct: number;     /* uint8 - offset 1 */
    system_completion_pct: number;       /* uint8 - offset 2 */
    schedules_completion_pct: number;    /* uint8 - offset 3 */
    channel_config_flags: bigint;        /* uint64 - offset 4-11 (basic flags) */
    system_config_flags: number;         /* uint32 - offset 12-15 */
    schedule_config_flags: number;       /* uint8 - offset 16 */
    onboarding_start_time: number;       /* uint32 - offset 17-20 */
    last_update_time: number;            /* uint32 - offset 21-24 */
    channel_extended_flags: bigint;      /* uint64 - offset 25-32 (extended flags) */
}
// Total size: 33 bytes

export interface EnvironmentalData {
    temperature: number;         /* float (deg C) */
    humidity: number;            /* float (%RH) */
    pressure: number;            /* float (hPa) */
    timestamp: number;           /* uint32 */
    sensor_status: number;       /* uint8 (1=valid) */
    measurement_interval: number;/* uint16 (seconds) */
    data_quality: number;        /* uint8 (0-100) */
}

export interface RainData {
    current_hour_mm: number;     /* float (from uint32 / 100) */
    today_total_mm: number;      /* float (from uint32 / 100) */
    last_24h_mm: number;         /* float (from uint32 / 100) */
    current_rate_mm_h: number;   /* float (from uint16 / 100) */
    last_pulse_time: number;     /* uint32 */
    total_pulses: number;        /* uint32 */
    sensor_status: number;       /* uint8 (0=inactive, 1=active, 2=error) */
    data_quality: number;        /* uint8 */
}

/**
 * System Configuration Data (56 bytes)
 * 
 * NOTE: As of v2.x firmware, rain compensation is configured PER-CHANNEL ONLY.
 * The rain-related fields in this struct are RESERVED for backward compatibility:
 * - _reserved_rain_enabled (offset 20): Always reads 0, writes IGNORED
 * - _reserved_rain_sensitivity (offset 22): Always reads 0.0, writes IGNORED  
 * - _reserved_rain_lookback_hours (offset 30): Always reads 0, writes IGNORED
 * - _reserved_rain_skip_threshold (offset 32): Always reads 0.0, writes IGNORED
 * 
 * Rain compensation settings should be configured via:
 * - Rain Sensor Config (char 18) for global defaults (calibration, global sensitivity)
 * - Per-channel settings are stored internally but not exposed via public BLE
 * 
 * Only TEMPERATURE compensation is configurable globally via this characteristic.
 * Per-channel settings are pushed when global temp settings change.
 */
export interface SystemConfigData {
    version: number;                 /* uint8 - Always 2 */
    power_mode: number;              /* uint8 - 0=Normal, 1=Energy-Saving, 2=Ultra-Low */
    flow_calibration: number;        /* uint32 - Pulses per liter (100-10000) */
    max_active_valves: number;       /* uint8 - Read only, always 1 */
    num_channels: number;            /* uint8 - Read only, always 8 */
    master_valve: {
        enabled: boolean;            /* uint8 */
        pre_delay: number;           /* int16 - seconds */
        post_delay: number;          /* int16 - seconds */
        overlap_grace: number;       /* uint8 - seconds */
        auto_management: boolean;    /* uint8 */
        current_state: boolean;      /* uint8 - Read only */
    };
    bme280: {
        enabled: boolean;            /* uint8 */
        measurement_interval: number;/* uint16 - seconds */
        status: number;              /* uint8 - Read only: 0=missing, 1=ok, 2=error, 3=disabled */
    };
    compensation: {
        /** @deprecated RESERVED - Always reads 0, writes IGNORED. Rain is per-channel only. */
        _reserved_rain_enabled: boolean;       /* uint8 - RESERVED */
        temp_enabled: boolean;                 /* uint8 - Global temp compensation enable */
        /** @deprecated RESERVED - Always reads 0.0, writes IGNORED. Rain is per-channel only. */
        _reserved_rain_sensitivity: number;    /* float - RESERVED */
        temp_sensitivity: number;              /* float - Clamped 0.01-0.20 */
        /** @deprecated RESERVED - Always reads 0, writes IGNORED. Rain is per-channel only. */
        _reserved_rain_lookback_hours: number; /* uint16 - RESERVED */
        /** @deprecated RESERVED - Always reads 0.0, writes IGNORED. Rain is per-channel only. */
        _reserved_rain_skip_threshold: number; /* float - RESERVED */
        temp_base_temperature: number;         /* float - Clamped -10 to 50°C */
    };
    status: {
        interval_mode_channels: number;      /* uint8 - Bitmask, read only */
        compensation_active_channels: number;/* uint8 - Bitmask, read only */
        incomplete_config_channels: number;  /* uint8 - Bitmask, read only */
        environmental_data_quality: number;  /* uint8 - 0-100, read only */
    };
    last_config_update: number;      /* uint32 - Unix UTC seconds, read only */
    last_sensor_reading: number;     /* uint32 - Unix UTC seconds, read only */
}

export interface CalibrationData {
    action: number; // 0=Stop, 1=Start, 2=In Progress, 3=Calculated, 4=Apply, 5=Reset
    pulses: number;
    volume_ml: number;
    pulses_per_liter: number;
}

export interface ScheduleConfigData {
    channel_id: number;      /* uint8 */
    schedule_type: number;   /* uint8 (0=Daily, 1=Periodic, 2=Auto/FAO-56) */
    days_mask: number;       /* uint8 (Daily bitmask or interval days; ignored for AUTO) */
    hour: number;            /* uint8 */
    minute: number;          /* uint8 */
    watering_mode: number;   /* uint8 (0=Duration, 1=Volume) */
    value: number;           /* uint16 (Minutes or Liters; AUTO ignores this) */
    auto_enabled: boolean;   /* uint8 */
    use_solar_timing: boolean;    /* uint8 */
    solar_event: number;          /* uint8 (0=sunset, 1=sunrise) */
    solar_offset_minutes: number; /* int8 (-120..120) */
}

export interface GrowingEnvData {
    channel_id: number;              /* uint8 */
    plant_db_index: number;          /* uint16 */
    soil_db_index: number;           /* uint8 */
    irrigation_method_index: number; /* uint8 */
    use_area_based: boolean;         /* uint8 */
    coverage: {
        area_m2?: number;            /* float */
        plant_count?: number;        /* uint16 */
    };
    auto_mode: number;               /* uint8 */
    max_volume_limit_l: number;      /* float */
    enable_cycle_soak: boolean;      /* uint8 */
    planting_date_unix: number;      /* uint32 */
    days_after_planting: number;     /* uint16 */
    latitude_deg: number;            /* float */
    sun_exposure_pct: number;        /* uint8 */
    /* Legacy/Custom Plant Fields */
    plant_type: number;              /* uint8 */
    specific_plant: number;          /* uint16 */
    soil_type: number;               /* uint8 */
    irrigation_method: number;       /* uint8 */
    sun_percentage: number;          /* uint8 */
    custom_name: string;             /* char[32] */
    water_need_factor: number;       /* float */
    irrigation_freq_days: number;    /* uint8 */
    prefer_area_based: boolean;      /* uint8 */
}

/**
 * Rain Sensor Configuration Data (18 bytes)
 * 
 * This characteristic provides global rain sensor settings:
 * - mm_per_pulse: Calibration for tipping-bucket sensor (0.1-10.0)
 * - debounce_ms: Debounce window (10-1000ms)
 * - sensor_enabled: Enable/disable hardware
 * - integration_enabled: Enable/disable rain-based irrigation adjustments
 * - rain_sensitivity_pct: Sensitivity curve weight (0-100%)
 * - skip_threshold_mm: Global default for skip threshold (0-100mm)
 * 
 * ⚠️ IMPORTANT: The skip_threshold_mm here is a GLOBAL DEFAULT.
 * Actual skip decisions use PER-CHANNEL thresholds configured via:
 * - Internal enhanced_channel_config_data (not exposed via public BLE)
 * - Per-channel settings override this global default
 * 
 * ⚠️ Skip logic only applies to TIME/VOLUME watering modes.
 * For FAO-56 automatic modes (AUTO_QUALITY, AUTO_ECO), skip is never
 * applied because FAO-56 already incorporates rainfall in ET0 calculations.
 */
export interface RainConfigData {
    mm_per_pulse: number;            /* float */
    debounce_ms: number;             /* uint16 */
    sensor_enabled: boolean;         /* uint8 */
    integration_enabled: boolean;    /* uint8 */
    rain_sensitivity_pct: number;    /* float */
    skip_threshold_mm: number;       /* float */
}

export interface TimezoneConfigData {
    utc_offset_minutes: number;      /* int16 */
    dst_enabled: boolean;            /* uint8 */
    dst_start_month: number;         /* uint8 */
    dst_start_week: number;          /* uint8 */
    dst_start_dow: number;           /* uint8 */
    dst_end_month: number;           /* uint8 */
    dst_end_week: number;            /* uint8 */
    dst_end_dow: number;             /* uint8 */
    dst_offset_minutes: number;      /* int16 */
}

export interface RainIntegrationStatusData {
    sensor_active: boolean;          /* uint8 */
    integration_enabled: boolean;    /* uint8 */
    last_pulse_time: number;         /* uint32 */
    calibration_mm_per_pulse: number;/* float */
    rainfall_last_hour: number;      /* float */
    rainfall_last_24h: number;       /* float */
    rainfall_last_48h: number;       /* float */
    sensitivity_pct: number;         /* float */
    skip_threshold_mm: number;       /* float */
    channel_reduction_pct: number[]; /* float[8] */
    channel_skip_irrigation: boolean[]; /* uint8[8] */
    hourly_entries: number;          /* uint16 */
    daily_entries: number;           /* uint16 */
    storage_usage_bytes: number;     /* uint32 */
}

export interface CompensationStatusData {
    channel_id: number;              /* uint8 */
    rain: {
        active: boolean;             /* uint8 */
        recent_rainfall_mm: number;  /* float */
        reduction_percentage: number;/* float */
        skip_watering: boolean;      /* uint8 */
        calculation_time: number;    /* uint32 */
    };
    temperature: {
        active: boolean;             /* uint8 */
        current_temperature: number; /* float */
        factor: number;              /* float */
        adjusted_requirement: number;/* float */
        calculation_time: number;    /* uint32 */
    };
    any_compensation_active: boolean;/* uint8 */
}


/**
 * Per-channel Rain and Temperature Compensation Configuration (44 bytes)
 * Characteristic #27: UUID 12345678-1234-5678-1234-56789abcde19
 * 
 * ⚠️ IMPORTANT: Compensation only applies to TIME and VOLUME watering modes.
 * For FAO-56 automatic modes (AUTO_QUALITY, AUTO_ECO), compensation is NEVER applied
 * because FAO-56 already incorporates weather data into ET₀ calculations.
 * 
 * Operations:
 * - Write 1 byte: Select channel for subsequent reads
 * - Write 44 bytes: Update channel's compensation settings
 * - Read: Returns config for currently selected channel
 * - Notify: Sent after config changes or on CCC subscription
 */
export interface ChannelCompensationConfigData {
    channel_id: number;              /* uint8  @ 0   - Channel ID (0-7) */
    rain: {
        enabled: boolean;            /* uint8  @ 1   - Rain compensation enable */
        sensitivity: number;         /* float  @ 2   - Sensitivity factor (0.0-1.0) */
        lookback_hours: number;      /* uint16 @ 6   - Hours to look back (1-72) */
        skip_threshold_mm: number;   /* float  @ 8   - Skip threshold in mm (0.0-100.0) */
        reduction_factor: number;    /* float  @ 12  - Reduction factor (0.0-1.0) */
    };
    temp: {
        enabled: boolean;            /* uint8  @ 16  - Temperature compensation enable */
        base_temperature: number;    /* float  @ 17  - Base temperature °C (-40.0 to 60.0) */
        sensitivity: number;         /* float  @ 21  - Temperature sensitivity (0.1-2.0) */
        min_factor: number;          /* float  @ 25  - Minimum factor for cold (0.5-1.0) */
        max_factor: number;          /* float  @ 29  - Maximum factor for hot (1.0-2.0) */
    };
    last_rain_calc_time: number;     /* uint32 @ 33  - Last rain calculation (Unix) - READ-ONLY */
    last_temp_calc_time: number;     /* uint32 @ 37  - Last temp calculation (Unix) - READ-ONLY */
    /* reserved[3] @ 41-43 ignored */
}

/**
 * Custom Soil Configuration Data (70 bytes)
 * 
 * CRUD operations for custom soil profiles per channel.
 * Part of Custom Configuration Service (UUID: 12345678-1234-5678-9abc-def123456780)
 * Characteristic UUID: 12345678-1234-5678-9abc-def123456781
 * 
 * Operations:
 * - 0: READ - Read current custom soil config for channel
 * - 1: CREATE - Create new custom soil config
 * - 2: UPDATE - Update existing custom soil config
 * - 3: DELETE - Delete custom soil config (revert to soil_db_index)
 * 
 * Response status codes:
 * - 0: Success
 * - -2 (0xFE): NOT_FOUND - No custom soil for this channel
 * - -22 (0xEA): INVALID_PARAM - Validation failed
 * 
 * Structure (70 bytes total):
 * | Offset | Field              | Type   | Size |
 * | 0      | channel_id         | u8     | 1    |
 * | 1      | operation          | u8     | 1    |
 * | 2      | name[32]           | char   | 32   |
 * | 34     | field_capacity     | float  | 4    |
 * | 38     | wilting_point      | float  | 4    |
 * | 42     | infiltration_rate  | float  | 4    |
 * | 46     | bulk_density       | float  | 4    |
 * | 50     | organic_matter     | float  | 4    |
 * | 54     | created_timestamp  | u32    | 4    |
 * | 58     | modified_timestamp | u32    | 4    |
 * | 62     | crc32              | u32    | 4    |
 * | 66     | status             | u8     | 1    |
 * | 67     | reserved[3]        | u8     | 3    |
 * TOTAL: 70 bytes
 */
export interface CustomSoilConfigData {
    channel_id: number;              /* uint8  @ 0   - Channel ID (0-7) */
    operation: number;               /* uint8  @ 1   - 0=read, 1=create, 2=update, 3=delete */
    name: string;                    /* char[32] @ 2 - UTF-8 NUL-padded */
    field_capacity: number;          /* float  @ 34  - Field capacity % (0-100) */
    wilting_point: number;           /* float  @ 38  - Wilting point % (0-100) */
    infiltration_rate: number;       /* float  @ 42  - Infiltration rate mm/hr */
    bulk_density: number;            /* float  @ 46  - Bulk density g/cm³ */
    organic_matter: number;          /* float  @ 50  - Organic matter % (0-100) */
    created_timestamp: number;       /* uint32 @ 54  - Unix seconds (FW fills on create) */
    modified_timestamp: number;      /* uint32 @ 58  - Unix seconds (FW fills on create/update) */
    crc32: number;                   /* uint32 @ 62  - CRC32 (FW fills) */
    status: number;                  /* int8   @ 66  - Response status code */
    /* reserved[3] @ 67-69 - Must be 0 */
}

export const CUSTOM_SOIL_OPERATIONS = {
    READ: 0,
    CREATE: 1,
    UPDATE: 2,
    DELETE: 3
} as const;

export const CUSTOM_SOIL_STATUS = {
    SUCCESS: 0,
    NOT_FOUND: -2,
    INVALID_PARAM: -22
} as const;


/**
 * Soil Moisture Configuration Data (8 bytes)
 *
 * Part of Custom Configuration Service (UUID: 12345678-1234-5678-9abc-def123456780)
 * Characteristic UUID: 12345678-1234-5678-9abc-def123456784
 *
 * Configures the antecedent soil moisture estimate used by FAO-56 effective precipitation/runoff.
 */
export interface SoilMoistureConfigData {
    channel_id: number;              /* uint8  @ 0 - 0..7 per-channel, 0xFF global */
    operation: number;               /* uint8  @ 1 - 0=read, 1=set */
    enabled: boolean;                /* uint8  @ 2 - override enable */
    moisture_pct: number;            /* uint8  @ 3 - 0..100 */
    status: number;                  /* uint8  @ 4 - watering_error_t (0=success) */
    has_data: boolean;               /* uint8  @ 5 - 0=no NVS record, 1=value present */
    /* reserved[2] @ 6-7 - must be 0 */
}

export const SOIL_MOISTURE_OPERATIONS = {
    READ: 0,
    SET: 1
} as const;

export const SOIL_MOISTURE_STATUS = {
    SUCCESS: 0
} as const;


// ============================================================================
// Alarm Helper Functions
// ============================================================================

/**
 * Get the severity level of an alarm for UI display prioritization
 */
export function getAlarmSeverity(code: AlarmCode): AlarmSeverity {
    switch (code) {
        case AlarmCode.NONE:
            return AlarmSeverity.INFO;
        case AlarmCode.LOW_FLOW:
            return AlarmSeverity.WARNING;
        case AlarmCode.FREEZE_LOCKOUT:
        case AlarmCode.NO_FLOW:
        case AlarmCode.CHANNEL_LOCK:
            return AlarmSeverity.DANGER;
        case AlarmCode.HIGH_FLOW:
        case AlarmCode.UNEXPECTED_FLOW:
        case AlarmCode.MAINLINE_LEAK:
        case AlarmCode.GLOBAL_LOCK:
            return AlarmSeverity.CRITICAL;
        default:
            return AlarmSeverity.WARNING;
    }
}

/**
 * Get human-readable title for an alarm code
 */
export function getAlarmTitle(code: AlarmCode): string {
    switch (code) {
        case AlarmCode.NONE:
            return 'No Alarm';
        case AlarmCode.NO_FLOW:
            return 'No Water Flow';
        case AlarmCode.UNEXPECTED_FLOW:
            return 'Unexpected Flow Detected';
        case AlarmCode.FREEZE_LOCKOUT:
            return 'Freeze Protection Active';
        case AlarmCode.HIGH_FLOW:
            return 'High Flow Alert';
        case AlarmCode.LOW_FLOW:
            return 'Low Flow Warning';
        case AlarmCode.MAINLINE_LEAK:
            return 'Mainline Leak Detected';
        case AlarmCode.CHANNEL_LOCK:
            return 'Zone Locked';
        case AlarmCode.GLOBAL_LOCK:
            return 'System Locked';
        default:
            return `Unknown Alarm (${code})`;
    }
}

/**
 * Get human-readable description for an alarm code with optional channel info
 */
export function getAlarmDescription(code: AlarmCode, channelId?: number, alarmData?: number): string {
    const zoneText = channelId !== undefined ? ` Zone ${channelId + 1}` : '';

    switch (code) {
        case AlarmCode.NONE:
            return 'System operating normally.';
        case AlarmCode.NO_FLOW:
            return `No water flow detected${zoneText ? ' in' + zoneText : ''} during watering. Check water supply and connections.`;
        case AlarmCode.UNEXPECTED_FLOW:
            return `Water flow detected while all valves are closed (${alarmData || 0} pulses). Possible leak or stuck valve.`;
        case AlarmCode.FREEZE_LOCKOUT:
            const tempText = alarmData === 0xFFFF ? 'stale sensor data' :
                alarmData ? `${(alarmData / 10).toFixed(1)}°C` : 'low temperature';
            return `Watering suspended due to freeze risk (${tempText}). Will resume when safe.`;
        case AlarmCode.HIGH_FLOW:
            return `Flow rate exceeded safe limits${zoneText ? ' in' + zoneText : ''}. Possible burst pipe or leak.`;
        case AlarmCode.LOW_FLOW:
            return `Flow rate below expected${zoneText ? ' in' + zoneText : ''}. Check for blockages or low pressure.`;
        case AlarmCode.MAINLINE_LEAK:
            return `Static test detected flow (${alarmData || 0} pulses) with all zones off. Mainline leak suspected.`;
        case AlarmCode.CHANNEL_LOCK:
            return `${zoneText ? zoneText + ' has been' : 'Zone'} locked due to repeated anomalies. Manual unlock required.`;
        case AlarmCode.GLOBAL_LOCK:
            return 'System locked due to critical hydraulic issue. All watering suspended until cleared.';
        default:
            return 'Unrecognized alarm. Contact support if issue persists.';
    }
}

/**
 * Extract channel ID from alarm_data field based on alarm code.
 * Returns undefined if the alarm doesn't carry channel info.
 */
export function getAffectedChannelFromAlarmData(code: AlarmCode, alarmData: number): number | undefined {
    switch (code) {
        case AlarmCode.HIGH_FLOW:
        case AlarmCode.LOW_FLOW:
        case AlarmCode.CHANNEL_LOCK:
        case AlarmCode.GLOBAL_LOCK:
            // These alarms store channel_id in alarm_data
            return alarmData >= 0 && alarmData <= 7 ? alarmData : undefined;
        case AlarmCode.NO_FLOW:
            // NO_FLOW stores retry count in alarm_data, not channel - channel comes from context
            return undefined;
        default:
            return undefined;
    }
}

/**
 * Check if an alarm requires immediate attention (popup)
 */
export function isAlarmCritical(code: AlarmCode): boolean {
    const severity = getAlarmSeverity(code);
    return severity === AlarmSeverity.CRITICAL || severity === AlarmSeverity.DANGER;
}

/**
 * Get the lock reason description
 */
export function getLockReasonDescription(reason: HydraulicLockReason): string {
    switch (reason) {
        case HydraulicLockReason.NONE:
            return 'None';
        case HydraulicLockReason.HIGH_FLOW:
            return 'High flow detected';
        case HydraulicLockReason.NO_FLOW:
            return 'No flow detected';
        case HydraulicLockReason.UNEXPECTED:
            return 'Unexpected flow';
        case HydraulicLockReason.MAINLINE_LEAK:
            return 'Mainline leak';
        default:
            return 'Unknown';
    }
}

// ============================================================================
// Interval Mode Configuration (Characteristic #32) - 16 bytes
// UUID: 12345678-1234-5678-9abc-def123456785
// Controls Cycle & Soak ON/OFF timing durations per-channel
// ============================================================================
export interface IntervalModeConfigData {
    channel_id: number;       // 0-7
    enabled: boolean;         // 0=disabled, 1=enabled
    watering_minutes: number; // 0-60, cycle duration
    watering_seconds: number; // 0-59, additional seconds
    pause_minutes: number;    // 0-60, soak duration
    pause_seconds: number;    // 0-59, additional seconds
    configured: boolean;      // Read-only, runtime gate
    last_update: number;      // uint32 timestamp
}
