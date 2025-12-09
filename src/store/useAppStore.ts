import { create } from 'zustand';
import { 
    ChannelConfigData, 
    ValveControlData, 
    RtcData, 
    CalibrationData, 
    ResetControlData,
    SystemStatus,
    CurrentTaskData,
    OnboardingStatusData,
    EnvironmentalData,
    RainData,
    SystemConfigData,
    ScheduleConfigData,
    GrowingEnvData,
    RainConfigData,
    TimezoneConfigData,
    RainIntegrationStatusData,
    CompensationStatusData,
    AutoCalcStatusData,
    ChannelCompensationConfigData,
    // New types
    FlowSensorData,
    TaskQueueData,
    StatisticsData,
    AlarmData,
    DiagnosticsData,
    HistoryDetailedEntry,
    RainHourlyEntry,
    RainDailyEntry,
    EnvDetailedEntry,
    EnvHourlyEntry,
    EnvDailyEntry
} from '../types/firmware_structs';
import { PlantDBEntry, SoilDBEntry, IrrigationMethodEntry } from '../services/DatabaseService';
import { 
    ChannelWizardState, 
    UnifiedZoneConfig, 
    WizardStep, 
    LocationData,
    DEFAULT_WIZARD_STATE,
    createInitialZones,
    getNextStep,
    getPrevStep,
    isFao56Mode
} from '../types/wizard';

// Define types for our store
interface BleDevice {
    deviceId: string;
    name?: string;
    rssi?: number;
}

interface AppState {
    // Connection State
    connectionState: 'disconnected' | 'scanning' | 'connecting' | 'connected';
    discoveredDevices: BleDevice[];
    connectedDeviceId: string | null;

    // Data State
    zones: ChannelConfigData[];
    valveStatus: Map<number, ValveControlData>; // Map channel_id to status
    rtcConfig: RtcData | null;
    calibrationState: CalibrationData | null;
    resetState: ResetControlData | null;
    currentTask: CurrentTaskData | null;
    onboardingState: OnboardingStatusData | null;
    envData: EnvironmentalData | null;
    rainData: RainData | null;
    
    // New Data States Initial Values
    systemConfig: SystemConfigData | null;
    rainConfig: RainConfigData | null;
    timezoneConfig: TimezoneConfigData | null;
    rainIntegration: RainIntegrationStatusData | null;
    compensationStatus: Map<number, CompensationStatusData>;
    autoCalcStatus: Map<number, AutoCalcStatusData>;
    growingEnv: Map<number, GrowingEnvData>;
    schedules: Map<number, ScheduleConfigData>;
    channelCompensationConfig: Map<number, ChannelCompensationConfigData>;
    
    // New Characteristic Data (added from BLE docs)
    flowSensorData: FlowSensorData | null;
    taskQueue: TaskQueueData | null;
    statistics: Map<number, StatisticsData>;  // channel_id -> stats
    alarmStatus: AlarmData | null;
    diagnosticsData: DiagnosticsData | null;
    
    // History data caches
    wateringHistory: HistoryDetailedEntry[];
    rainHistoryHourly: RainHourlyEntry[];
    rainHistoryDaily: RainDailyEntry[];
    envHistoryDetailed: EnvDetailedEntry[];
    envHistoryHourly: EnvHourlyEntry[];
    envHistoryDaily: EnvDailyEntry[];

    systemStatus: {
        state: SystemStatus;
        nextRun?: string;
        batteryVoltage?: number;
    };

    // Database
    plantDb: PlantDBEntry[];
    soilDb: SoilDBEntry[];
    irrigationMethodDb: IrrigationMethodEntry[];
    
    // Onboarding Wizard State (legacy)
    wizardState: {
        isOpen: boolean;
        phase: 1 | 2 | 3;  // 1=System, 2=Zones, 3=Schedules
        currentZone: number;  // 0-7 for zone config
        completedZones: number[];  // List of configured zone IDs
    };
    
    // Channel Configuration Wizard State (new unified wizard)
    channelWizard: ChannelWizardState;
    
    // Actions
    setConnectionState: (state: 'disconnected' | 'scanning' | 'connecting' | 'connected') => void;
    addDiscoveredDevice: (device: BleDevice) => void;
    setConnectedDeviceId: (id: string | null) => void;
    
    // Data Actions
    updateZone: (channelId: number, data: Partial<ChannelConfigData>) => void;
    setZones: (zones: ChannelConfigData[]) => void;
    updateValveStatus: (channelId: number, status: ValveControlData) => void;
    setRtcConfig: (config: RtcData) => void;
    setCalibrationState: (state: CalibrationData) => void;
    setResetState: (state: ResetControlData) => void;
    setCurrentTask: (task: CurrentTaskData) => void;
    setOnboardingState: (state: OnboardingStatusData) => void;
    setEnvData: (data: EnvironmentalData) => void;
    setRainData: (data: RainData) => void;
    
    // New Data Actions Implementation
    setSystemConfig: (config: SystemConfigData) => void;
    setRainConfig: (config: RainConfigData) => void;
    setTimezoneConfig: (config: TimezoneConfigData) => void;
    setRainIntegration: (status: RainIntegrationStatusData) => void;
    
    updateCompensation: (status: CompensationStatusData) => void;
    updateAutoCalc: (status: AutoCalcStatusData) => void;
    updateGrowingEnv: (env: GrowingEnvData) => void;
    updateSchedule: (schedule: ScheduleConfigData) => void;
    updateChannelCompensationConfig: (config: ChannelCompensationConfigData) => void;
    
    // New data actions
    setFlowSensor: (data: FlowSensorData) => void;
    setTaskQueue: (data: TaskQueueData) => void;
    updateStatistics: (data: StatisticsData) => void;
    setAlarmStatus: (data: AlarmData) => void;
    setDiagnostics: (data: DiagnosticsData) => void;
    
    // History actions
    setWateringHistory: (entries: HistoryDetailedEntry[]) => void;
    appendWateringHistory: (entries: HistoryDetailedEntry[]) => void;
    setRainHistoryHourly: (entries: RainHourlyEntry[]) => void;
    setRainHistoryDaily: (entries: RainDailyEntry[]) => void;
    setEnvHistoryDetailed: (entries: EnvDetailedEntry[]) => void;
    setEnvHistoryHourly: (entries: EnvHourlyEntry[]) => void;
    setEnvHistoryDaily: (entries: EnvDailyEntry[]) => void;
    clearHistoryCache: () => void;

    updateSystemStatus: (status: Partial<AppState['systemStatus']>) => void;
    setDatabase: (plants: PlantDBEntry[], soils: SoilDBEntry[], irrigationMethods: IrrigationMethodEntry[]) => void;
    setWizardState: (state: Partial<AppState['wizardState']>) => void;
    markZoneConfigured: (channelId: number) => void;
    isZoneConfigured: (channelId: number) => boolean;
    openWizard: (phase?: 1 | 2 | 3) => void;
    closeWizard: () => void;
    
    // Channel Wizard Actions
    initChannelWizard: (numChannels?: number) => void;
    updateCurrentZoneConfig: (updates: Partial<UnifiedZoneConfig>) => void;
    setWizardStep: (step: WizardStep) => void;
    nextWizardStep: () => void;
    prevWizardStep: () => void;
    skipCurrentZone: () => void;
    skipAllRemainingZones: () => void;
    saveAndNextZone: () => void;
    setSharedLocation: (location: LocationData) => void;
    goToFinalSummary: () => void;
    finishChannelWizard: () => void;
    closeChannelWizard: () => void;
    setTilesProgress: (downloading: boolean, progress: number) => void;
    
    resetStore: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    connectionState: 'disconnected',
    discoveredDevices: [],
    connectedDeviceId: null,
    
    // Initial Data State
    zones: [],
    valveStatus: new Map(),
    rtcConfig: null,
    calibrationState: null,
    resetState: null,
    currentTask: null,
    onboardingState: null,
    envData: null,
    rainData: null,
    
    // New Data States Initial Values
    systemConfig: null,
    rainConfig: null,
    timezoneConfig: null,
    rainIntegration: null,
    compensationStatus: new Map<number, CompensationStatusData>(),
    autoCalcStatus: new Map<number, AutoCalcStatusData>(),
    growingEnv: new Map<number, GrowingEnvData>(),
    schedules: new Map<number, ScheduleConfigData>(),
    channelCompensationConfig: new Map<number, ChannelCompensationConfigData>(),
    
    // New Characteristic Data (added from BLE docs)
    flowSensorData: null,
    taskQueue: null,
    statistics: new Map<number, StatisticsData>(),
    alarmStatus: null,
    diagnosticsData: null,
    
    // History data caches
    wateringHistory: [],
    rainHistoryHourly: [],
    rainHistoryDaily: [],
    envHistoryDetailed: [],
    envHistoryHourly: [],
    envHistoryDaily: [],

    systemStatus: {
        state: SystemStatus.OK,
    },

    plantDb: [],
    soilDb: [],
    irrigationMethodDb: [],
    
    wizardState: {
        isOpen: false,
        phase: 1,
        currentZone: 0,
        completedZones: []
    },
    
    // Channel Wizard State
    channelWizard: { ...DEFAULT_WIZARD_STATE },

    setConnectionState: (state) => set({ connectionState: state }),
    addDiscoveredDevice: (device) => set((state) => {
        if (state.discoveredDevices.some(d => d.deviceId === device.deviceId)) {
            return state;
        }
        return { discoveredDevices: [...state.discoveredDevices, device] };
    }),
    setConnectedDeviceId: (id) => set({ connectedDeviceId: id }),

    updateZone: (channelId, data) => set((state) => {
        const newZones = [...state.zones];
        const index = newZones.findIndex(z => z.channel_id === channelId);
        if (index !== -1) {
            newZones[index] = { ...newZones[index], ...data };
        } else {
            // If we don't have it, we can't really update it partially, but for safety:
             // In a real app we might fetch it first.
        }
        return { zones: newZones };
    }),

    setZones: (zones) => set({ zones }),

    updateValveStatus: (channelId, status) => set((state) => {
        const newMap = new Map(state.valveStatus);
        newMap.set(channelId, status);
        return { valveStatus: newMap };
    }),

    setRtcConfig: (config) => set({ rtcConfig: config }),
    setCalibrationState: (state) => set({ calibrationState: state }),
    setResetState: (state) => set({ resetState: state }),
    setCurrentTask: (task) => set({ currentTask: task }),
    setOnboardingState: (state) => set({ onboardingState: state }),
    setEnvData: (data) => set({ envData: data }),
    setRainData: (data) => set({ rainData: data }),

    // New Data Actions Implementation
    setSystemConfig: (config) => set({ systemConfig: config }),
    setRainConfig: (config) => set({ rainConfig: config }),
    setTimezoneConfig: (config) => set({ timezoneConfig: config }),
    setRainIntegration: (status) => set({ rainIntegration: status }),
    
    updateCompensation: (status) => set((state) => {
        const newMap = new Map(state.compensationStatus);
        newMap.set(status.channel_id, status);
        return { compensationStatus: newMap };
    }),
    
    updateAutoCalc: (status) => set((state) => {
        const newMap = new Map(state.autoCalcStatus);
        newMap.set(status.channel_id, status);
        return { autoCalcStatus: newMap };
    }),
    
    updateGrowingEnv: (env) => set((state) => {
        const newMap = new Map(state.growingEnv);
        newMap.set(env.channel_id, env);
        return { growingEnv: newMap };
    }),
    
    updateSchedule: (schedule) => set((state) => {
        const newMap = new Map(state.schedules);
        newMap.set(schedule.channel_id, schedule);
        return { schedules: newMap };
    }),
    
    updateChannelCompensationConfig: (config) => set((state) => {
        const newMap = new Map(state.channelCompensationConfig);
        newMap.set(config.channel_id, config);
        return { channelCompensationConfig: newMap };
    }),
    
    // New data actions
    setFlowSensor: (data) => set({ flowSensorData: data }),
    setTaskQueue: (data) => set({ taskQueue: data }),
    updateStatistics: (data) => set((state) => {
        const newMap = new Map(state.statistics);
        newMap.set(data.channel_id, data);
        return { statistics: newMap };
    }),
    setAlarmStatus: (data) => set({ alarmStatus: data }),
    setDiagnostics: (data) => set({ diagnosticsData: data }),
    
    // History actions
    setWateringHistory: (entries) => set({ wateringHistory: entries }),
    appendWateringHistory: (entries) => set((state) => ({
        wateringHistory: [...state.wateringHistory, ...entries]
    })),
    setRainHistoryHourly: (entries) => set({ rainHistoryHourly: entries }),
    setRainHistoryDaily: (entries) => set({ rainHistoryDaily: entries }),
    setEnvHistoryDetailed: (entries) => set({ envHistoryDetailed: entries }),
    setEnvHistoryHourly: (entries) => set({ envHistoryHourly: entries }),
    setEnvHistoryDaily: (entries) => set({ envHistoryDaily: entries }),
    clearHistoryCache: () => set({
        wateringHistory: [],
        rainHistoryHourly: [],
        rainHistoryDaily: [],
        envHistoryDetailed: [],
        envHistoryHourly: [],
        envHistoryDaily: []
    }),

    updateSystemStatus: (status) => set((state) => ({
        systemStatus: { ...state.systemStatus, ...status }
    })),
    setDatabase: (plants, soils, irrigationMethods) => set({ 
        plantDb: plants, 
        soilDb: soils, 
        irrigationMethodDb: irrigationMethods 
    }),
    setWizardState: (wizardUpdate) => set((state) => ({
        wizardState: { ...state.wizardState, ...wizardUpdate }
    })),
    markZoneConfigured: (channelId) => set((state) => {
        const completedZones = state.wizardState.completedZones.includes(channelId)
            ? state.wizardState.completedZones
            : [...state.wizardState.completedZones, channelId];
        console.log(`[Store] Marking zone ${channelId} as configured. completedZones:`, completedZones);
        return {
            wizardState: { ...state.wizardState, completedZones }
        };
    }),
    isZoneConfigured: (channelId) => {
        // This is a getter, not a setter - we need to access state differently
        // For now, return false - we'll check in the component
        return false;
    },
    openWizard: (phase = 1) => set((state) => ({
        wizardState: { ...state.wizardState, isOpen: true, phase }
    })),
    closeWizard: () => set((state) => ({
        wizardState: { ...state.wizardState, isOpen: false }
    })),
    
    // Channel Wizard Actions Implementation
    initChannelWizard: (numChannels = 8) => set({
        channelWizard: {
            ...DEFAULT_WIZARD_STATE,
            isOpen: true,
            zones: createInitialZones(numChannels)
        }
    }),
    
    updateCurrentZoneConfig: (updates) => set((state) => {
        const zones = [...state.channelWizard.zones];
        const idx = state.channelWizard.currentZoneIndex;
        zones[idx] = { ...zones[idx], ...updates };
        return { channelWizard: { ...state.channelWizard, zones } };
    }),
    
    setWizardStep: (step) => set((state) => ({
        channelWizard: { ...state.channelWizard, currentStep: step }
    })),
    
    nextWizardStep: () => set((state) => {
        const currentZone = state.channelWizard.zones[state.channelWizard.currentZoneIndex];
        const nextStep = getNextStep(state.channelWizard.currentStep, currentZone.wateringMode);
        if (nextStep) {
            return { channelWizard: { ...state.channelWizard, currentStep: nextStep } };
        }
        return state;
    }),
    
    prevWizardStep: () => set((state) => {
        const currentZone = state.channelWizard.zones[state.channelWizard.currentZoneIndex];
        const prevStep = getPrevStep(state.channelWizard.currentStep, currentZone.wateringMode);
        if (prevStep) {
            return { channelWizard: { ...state.channelWizard, currentStep: prevStep } };
        }
        return state;
    }),
    
    skipCurrentZone: () => set((state) => {
        const zones = [...state.channelWizard.zones];
        const idx = state.channelWizard.currentZoneIndex;
        zones[idx] = { ...zones[idx], skipped: true, enabled: false };
        
        // Move to next zone or final summary
        const nextIdx = idx + 1;
        if (nextIdx >= zones.length) {
            return { 
                channelWizard: { 
                    ...state.channelWizard, 
                    zones,
                    phase: 'final_summary' 
                } 
            };
        }
        return { 
            channelWizard: { 
                ...state.channelWizard, 
                zones,
                currentZoneIndex: nextIdx,
                currentStep: 'mode'
            } 
        };
    }),
    
    skipAllRemainingZones: () => set((state) => {
        const zones = [...state.channelWizard.zones];
        for (let i = state.channelWizard.currentZoneIndex; i < zones.length; i++) {
            zones[i] = { ...zones[i], skipped: true, enabled: false };
        }
        return { 
            channelWizard: { 
                ...state.channelWizard, 
                zones,
                skipAllRemaining: true,
                phase: 'final_summary'
            } 
        };
    }),
    
    saveAndNextZone: () => set((state) => {
        const zones = [...state.channelWizard.zones];
        const idx = state.channelWizard.currentZoneIndex;
        zones[idx] = { ...zones[idx], enabled: true };
        
        // Move to next zone or final summary
        const nextIdx = idx + 1;
        if (nextIdx >= zones.length) {
            return { 
                channelWizard: { 
                    ...state.channelWizard, 
                    zones,
                    phase: 'final_summary' 
                } 
            };
        }
        return { 
            channelWizard: { 
                ...state.channelWizard, 
                zones,
                currentZoneIndex: nextIdx,
                currentStep: 'mode'
            } 
        };
    }),
    
    setSharedLocation: (location) => set((state) => ({
        channelWizard: { ...state.channelWizard, sharedLocation: location }
    })),
    
    goToFinalSummary: () => set((state) => ({
        channelWizard: { ...state.channelWizard, phase: 'final_summary' }
    })),
    
    finishChannelWizard: () => set((state) => ({
        channelWizard: { ...state.channelWizard, phase: 'complete', isOpen: false }
    })),
    
    closeChannelWizard: () => set({
        channelWizard: { ...DEFAULT_WIZARD_STATE }
    }),
    
    setTilesProgress: (downloading, progress) => set((state) => ({
        channelWizard: { 
            ...state.channelWizard, 
            tilesDownloading: downloading, 
            tilesProgress: progress 
        }
    })),
    
    resetStore: () => set({
        connectionState: 'disconnected',
        connectedDeviceId: null,
        zones: [],
        valveStatus: new Map(),
        rtcConfig: null,
        calibrationState: null,
        resetState: null,
        currentTask: null,
        onboardingState: null,
        envData: null,
        rainData: null,
        systemConfig: null,
        rainConfig: null,
        timezoneConfig: null,
        rainIntegration: null,
        compensationStatus: new Map(),
        autoCalcStatus: new Map(),
        growingEnv: new Map(),
        schedules: new Map(),
        // New states
        flowSensorData: null,
        taskQueue: null,
        statistics: new Map(),
        alarmStatus: null,
        diagnosticsData: null,
        wateringHistory: [],
        rainHistoryHourly: [],
        rainHistoryDaily: [],
        envHistoryDetailed: [],
        envHistoryHourly: [],
        envHistoryDaily: [],
        systemStatus: { state: SystemStatus.OK },
        channelWizard: { ...DEFAULT_WIZARD_STATE }
    })
}));
