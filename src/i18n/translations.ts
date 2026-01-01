/**
 * Internationalization (i18n) System
 * 
 * Default: English
 * Available: English, Romanian
 */

export type Language = 'en' | 'ro';

export interface TranslationKeys {
    // Common
    common: {
        next: string;
        back: string;
        cancel: string;
        save: string;
        confirm: string;
        close: string;
        loading: string;
        error: string;
        success: string;
        skip: string;
        useDefaults: string;
        undo: string;
        yes: string;
        no: string;
        ok: string;
        retry: string;
        minutes: string;
        hours: string;
        liters: string;
        percent: string;
    };

    // Onboarding Wizard
    wizard: {
        title: string;
        exitConfirmTitle: string;
        exitConfirmMessage: string;
        exitConfirmCancel: string;
        exitConfirmExit: string;

        // Phases
        phases: {
            welcome: string;
            system: string;
            zones: string;
            complete: string;
        };

        // Welcome
        welcome: {
            title: string;
            subtitle: string;
            description: string;
            startButton: string;
            fao56Mode: string;
            fao56Description: string;
            manualMode: string;
            manualDescription: string;
            alreadyConfigured: string;
            zonesConfiguredMsg: string;
            overallProgress: string;
            continueToClose: string;
            factoryResetNote: string;
        };

        // System Configuration (Phase 1)
        system: {
            title: string;
            allConfigured: string;
            configureRemaining: string;
            alreadyConfigured: string;
            masterValve: string;
            enableMasterValve: string;
            preDelay: string;
            postDelay: string;
            rainSensor: string;
            enableRainSensor: string;
            threshold: string;
            powerMode: string;
            selectPowerMode: string;
            flowCalibration: string;
            pulsesPerLiter: string;
            skipToZones: string;
        };

        // Zone Configuration
        zone: {
            namePrompt: string;
            namePlaceholder: string;
            selectMode: string;
            summary: string;
            cloneTitle: string;
            cloneDescription: string;
            cloneButton: string;
            useLocationFrom: string;
        };

        // Watering Modes
        modes: {
            fao56Auto: string;
            fao56AutoDesc: string;
            fao56Eco: string;
            fao56EcoDesc: string;
            duration: string;
            durationDesc: string;
            volume: string;
            volumeDesc: string;
        };

        // Steps
        steps: {
            mode: string;
            modeDesc: string;
            plant: string;
            plantDesc: string;
            location: string;
            locationDesc: string;
            soil: string;
            soilDesc: string;
            irrigation: string;
            irrigationDesc: string;
            environment: string;
            environmentDesc: string;
            schedule: string;
            scheduleDesc: string;
        };

        // Plant Selector
        plant: {
            title: string;
            searchPlaceholder: string;
            popular: string;
            allCategories: string;
            waterNeedLow: string;
            waterNeedMedium: string;
            waterNeedHigh: string;
            alreadyConfigured: string;
            coverageDenseExplanation: string;
            coverageSparseExplanation: string;
        };

        // Soil Selector
        soil: {
            title: string;
            autoDetect: string;
            detecting: string;
            detectedWith: string;
            confidence: string;
            manualSelect: string;
            noLocation: string;
        };

        // Location
        location: {
            title: string;
            gpsButton: string;
            gettingLocation: string;
            permissionDenied: string;
            unavailable: string;
            manualEntry: string;
        };

        // Schedule
        schedule: {
            enable: string;
            fao56Smart: string;
            fao56SmartDesc: string;
            evaluationDaily: string;
            estimatedDuration: string;
            modify: string;
        };

        // Summary
        summary: {
            title: string;
            mode: string;
            plant: string;
            soil: string;
            irrigation: string;
            coverage: string;
            sunExposure: string;
            cycleSoak: string;
            maxVolume: string;
            location: string;
            planted: string;
            schedulePreview: string;
        };

        // Validation
        validation: {
            zoneNameRequired: string;
            zoneNameTooShort: string;
            coverageRequired: string;
            coverageInvalid: string;
            plantRequired: string;
            soilRequired: string;
            locationRequired: string;
        };

        // Completion
        complete: {
            title: string;
            subtitle: string;
            zonesConfigured: string;
            addAnotherZone: string;
            finishSetup: string;
        };
    };

    // Categories
    categories: {
        vegetables: string;
        fruits: string;
        lawn: string;
        flowers: string;
        trees: string;
        shrubs: string;
        herbs: string;
        other: string;
    };

    // Settings
    settings: {
        language: string;
        theme: string;
        darkMode: string;
        lightMode: string;
        systemDefault: string;
        systemSettings: string;
        deviceTime: string;
        notConnected: string;
        autoSynced: string;
        masterValve: string;
        enableMasterValve: string;
        preDelay: string;
        postDelay: string;
        saveMasterValveConfig: string;
        masterValveSaved: string;
        masterValveFailed: string;
        rainSensor: string;
        enableRainSensor: string;
        mmPerPulse: string;
        skipThreshold: string;
        skipThresholdHint: string;
        saveRainSensorConfig: string;
        rainSensorSaved: string;
        rainSensorFailed: string;
        flowCalibration: string;
        pulses: string;
        pulsesPerLiter: string;
        startCalibration: string;
        dangerZone: string;
        dangerWarning: string;
        resetOptions: string;
    };

    // Errors
    errors: {
        connectionLost: string;
        saveFailed: string;
        loadFailed: string;
        gpsFailed: string;
        tryAgain: string;
        checkConnection: string;
    };

    // Accessibility
    a11y: {
        closeButton: string;
        nextStep: string;
        previousStep: string;
        progressBar: string;
        selectedItem: string;
        expandSection: string;
        collapseSection: string;
    };

    // Dashboard
    dashboard: {
        device: string;
        connected: string;
        otherDevices: string;
        tapToConnect: string;
        addNewDevice: string;
        online: string;
        wateringActive: string;
        remaining: string;
        progress: string;
        nextWateringCycle: string;
        noScheduleConfigured: string;
        soilMoisture: string;
        temp: string;
        humidity: string;
        rainfall24h: string;
        quickActions: string;
        manualWater: string;
        pauseSchedule: string;
        completeSetup: string;
        noZonesConfigured: string;
    };

    // Zones
    zones: {
        zone: string;
        zones: string;
        details: string;
        overview: string;
        schedule: string;
        history: string;
        settings: string;
        addZone: string;
        editZone: string;
        deleteZone: string;
        cycleSoak: string;
        enabled: string;
        disabled: string;
        preventsRunoff: string;
        waterWithoutPauses: string;
        cycleDuration: string;
        soakDuration: string;
        maxVolumePerSession: string;
        wateringTime: string;
        pauseTime: string;
        soilType: string;
        plant: string;
        irrigationMethod: string;
        coverage: string;
        areaSqm: string;
        plantCount: string;
        sunExposure: string;
        irrigationZones: string;
        zonesConfigured: string;
        wateringInProgress: string;
        allSystemsNormal: string;
        noZonesConfigured: string;
        tapAddZone: string;
        addFirstZone: string;
        notScheduled: string;
        today: string;
        tomorrow: string;
        next: string;
        wateringNow: string;
        water: string;
        auto: string;
        rainSkip: string;
        left: string;
        started: string;
        justNow: string;
        last: string;
        yesterday: string;
    };

    // Weather
    weather: {
        mostlySunny: string;
        noRainExpected: string;
        nextRun: string;
        waterSave: string;
    };

    // Reset
    reset: {
        title: string;
        deviceReset: string;
        selectType: string;
        selectChannel: string;
        channel: string;
        continue: string;
        waitingConfirmation: string;
        executing: string;
        confirmationCode: string;
        doNotClose: string;
        complete: string;
        error: string;
        tryAgain: string;
        warning: string;
        confirmDanger: string;
        yesContinue: string;
    };

    // Cycle & Soak
    cycleSoak: {
        title: string;
        selectSoilFirst: string;
        activated: string;
        deactivated: string;
        cycleWatering: string;
        soakAbsorption: string;
        done: string;
        auto: string;
        active: string;
        off: string;
        wateringPause: string;
        preventsRunoff: string;
        slowSoil: string;
        fastSoil: string;
        explanation: string;
        safetyLimit: string;
    };

    // Max Volume
    maxVolume: {
        title: string;
        perSession: string;
        liters: string;
        unlimited: string;
        safetyLimit: string;
        safetyExplanation: string;
    };

    // Zone Details
    zoneDetails: {
        notConfigured: string;
        notScheduled: string;
        wateringActive: string;
        idle: string;
        nextWatering: string;
        schedule: string;
        autoQuality: string;
        autoEco: string;
        manual: string;
        everyDay: string;
        preventsRunoff: string;
        totalArea: string;
        totalPlants: string;
        shade: string;
        partialSun: string;
        fullSun: string;
        highEvaporation: string;
        normalEvaporation: string;
        lowEvaporation: string;
        irrigationNeeded: string;
        soilHasEnough: string;
        fixedDuration: string;
        fixedVolume: string;
        light: string;
        moderate: string;
        strong: string;
        // Tabs
        overview: string;
        history: string;
        adjust: string;
        // Schedule types
        daily: string;
        periodic: string;
        autoFao56: string;
        duration: string;
        volume: string;
        unknown: string;
        // Durations
        quick: string;
        standard: string;
        deep: string;
        custom: string;
        // Actions
        startWatering: string;
        stopWatering: string;
        resetZone: string;
        // Recommendations
        recommended: string;
        optional: string;
        soilInfiltration: string;
        applicationRate: string;
        resetToAuto: string;
        howCycleSoakWorks: string;
        // Calculation
        howWeCalculated: string;
        availableWater: string;
        rootDepth: string;
        adjustManually: string;
        recommendedValue: string;
        useCalculatedValue: string;
        orEnterDirectly: string;
        valueDiffers: string;
        whatIsMaxVolume: string;
    };

    // Wizard for adding a zone
    zoneWizard: {
        steps: {
            selectChannel: string;
            allConfigured: string; // New page
            zoneName: string;
            plantMethod: string;
            plantSelection: string;
            locationSetup: string;
            soilType: string;
            sunExposure: string;
            coverageArea: string;
            irrigationMethod: string;
            wateringMode: string;
            scheduleConfig: string;
            weatherAdjustments: string;
            zoneSummary: string;
        };
        header: {
            addZone: string;
            cancel: string;
        };
        allConfigured: {
            title: string;
            message: string;
            button: string;
        };
        selectChannel: {
            title: string;
            subtitle: string;
            allConfigured: string;
            channel: string;
            notConfigured: string;
            goBack: string;
        };
        zoneName: {
            title: string;
            subtitle: string;
            placeholder: string;
            suggestions: {
                frontLawn: string;
                backGarden: string;
                flowerBed: string;
                vegetables: string;
                trees: string;
                patio: string;
            };
        };
        plantMethod: {
            title: string;
            optimizationTip: {
                title: string;
                text: string;
            };
            camera: {
                title: string;
                desc: string;
                alert: string;
            };
            manual: {
                title: string;
                desc: string;
            };
        };
        plantSelection: {
            title: string;
            subtitle: string;
            searchPlaceholder: string;
            noPlantsFound: string;
            categories: {
                all: string;
            };
        };
        locationSetup: {
            title: string;
            subtitle: string;
            cardTitle: string;
            cardDesc: string;
            locationDetected: string;
            startDetection: string;
            detecting: string;
            skip: string;
            skipDesc: string;
            errors: {
                denied: string;
                unavailable: string;
                failed: string;
                soilFailed: string;
            };
        };
        soilType: {
            title: string;
            subtitle: string;
            searchPlaceholder: string;
            customProfile: string;
            manualSelect: string;
            basedOnLocation: string;
            orSelectManually: string;
            selectSoil: string;
            // Added keys
            customProfileCreated: string;
            selectSoilForAccuracy: string;
            detectedAt: string;
            clay: string;
            sand: string;
            silt: string;
            fieldCapacity: string;
            wiltingPoint: string;
            infiltration: string;
            bulkDensity: string;
            selectSoilType: string;
            waterManagement: string;
            cycleSoak: {
                title: string;
                activeSlowSoil: string;
                recommendedSlowSoil: string;
                activeSlopedTerrain: string;
                disabledFastSoil: string;
            };
        };
        sunExposure: {
            title: string;
            full: { name: string; desc: string; };
            partial: { name: string; desc: string; };
            shade: { name: string; desc: string; };
        };
        coverage: {
            title: string;
            subtitle: string;
            specifyByArea: string;
            specifyByPlants: string;
            helperArea: string;
            helperPlants: string;
            areaUnit: string;
            plantsUnit: string;
            coverageDenseExplanation: string;
            coverageSparseExplanation: string;
        };
        irrigation: {
            title: string;
            subtitle: string;
            efficiency: string;
        };
        wateringMode: {
            title: string;
            subtitle: string;
            nextStepTip: {
                title: string;
                text: string;
            };
            modes: {
                quality: { label: string; desc: string; };
                eco: { label: string; desc: string; };
                duration: { label: string; desc: string; };
                volume: { label: string; desc: string; };
            };
            recommended: string;
        };
        schedule: {
            title: string;
            subtitleFao: string;
            subtitleManual: string;
            auto: {
                title: string;
                desc: string;
                recommended: string;
                howItWorks: {
                    title: string;
                    text: string;
                };
            };
            custom: {
                title: string;
                desc: string;
            };
            duration: string;
            volume: string;
            startTime: string;
            solar: string;
            fixedTime: string;
            frequency: string;
            daily: string;
            specificDays: string;
            everyXDays: string;
            everyXDaysValue: string;
            waterEvery: string;
            solarEvents: {
                sunrise: string;
                sunset: string;
            };
            solarOffset: string;
            solarOffsetOptions: {
                before: string;
                atEvent: string;
                after: string;
            };
            days: {
                everyDay: string;
                mwf: string;
                tts: string;
            };
        };
        weather: {
            title: string;
            rainSkip: { name: string; desc: string; };
            tempAdjust: { name: string; desc: string; };
            windSkip: { name: string; desc: string; };
            advanced: string;
            cycleSoak: {
                title: string;
                explanation: string;
            };
            maxVolume: {
                title: string;
                desc: string;
            };
        };
        summary: {
            title: string;
            subtitle: string;
            save: string;
            saving: string;
            channel: string;
            enabled: string;
            disabled: string;
            gps: string;
            notSet: string;
            wateringModes: {
                quality: string;
                eco: string;
                duration: string;
                volume: string;
            };
            sunExposure: {
                full: string;
                partial: string;
                shade: string;
            };
            scheduleTypes: {
                fullyAutomatic: string;
                everyDay: string;
                daily: string;
                everyXDays: string;
            };
            solarEvents: {
                sunrise: string;
                sunset: string;
            };
            timeDescriptions: {
                sunsetAuto: string;
                atEvent: string;
                afterEvent: string;
                beforeEvent: string;
            };
            days: {
                sun: string;
                mon: string;
                tue: string;
                wed: string;
                thu: string;
                fri: string;
                sat: string;
            };
            items: {
                channel: string;
                mode: string;
                plantType: string;
                soilType: string;
                sunExposure: string;
                maxVolume: string;
                cycleSoak: string;
                coverage: string;
                irrigation: string;
                schedule: string;
                startTime: string;
            };
        };
        common: {
            continue: string;
            cancel: string;
            goBack: string;
            edit: string;
            confirm: string;
        };
    };
}

// English translations (default)
export const en: TranslationKeys = {
    common: {
        next: 'Next',
        back: 'Back',
        cancel: 'Cancel',
        save: 'Save',
        confirm: 'Confirm',
        close: 'Close',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        skip: 'Skip',
        useDefaults: 'Use Defaults',
        undo: 'Undo',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        retry: 'Retry',
        minutes: 'minutes',
        hours: 'hours',
        liters: 'liters',
        percent: '%',
    },

    wizard: {
        title: 'Setup Wizard',
        exitConfirmTitle: 'Exit wizard?',
        exitConfirmMessage: 'You have unsaved changes. If you exit now, your progress will be lost.',
        exitConfirmCancel: 'Stay',
        exitConfirmExit: 'Exit',

        phases: {
            welcome: 'Welcome',
            system: 'System Setup',
            zones: 'Zone Configuration',
            complete: 'Complete',
        },

        welcome: {
            title: 'Welcome!',
            subtitle: 'Let\'s configure your irrigation system step by step.',
            description: 'We\'ll configure your system, set up zones with plants and soil types, then create schedules.',
            startButton: 'Get Started',
            fao56Mode: 'FAO-56 Smart Mode',
            fao56Description: 'Scientific irrigation based on plant needs and weather',
            manualMode: 'Manual Mode',
            manualDescription: 'Simple duration or volume-based watering',
            alreadyConfigured: 'System Already Configured!',
            zonesConfiguredMsg: 'Your irrigation system has zones configured.',
            overallProgress: 'Overall Progress',
            continueToClose: 'Click "Continue" to close the wizard. You can add or modify zones from the main interface.',
            factoryResetNote: 'To reconfigure from scratch, use "Factory Reset" in Settings.',
        },

        system: {
            title: 'System Configuration',
            allConfigured: 'All system settings are configured!',
            configureRemaining: 'Configure {count} remaining setting(s)',
            alreadyConfigured: 'Already Configured',
            masterValve: 'Master Valve',
            enableMasterValve: 'Enable Master Valve',
            preDelay: 'Pre-delay (seconds)',
            postDelay: 'Post-delay (seconds)',
            rainSensor: 'Rain Sensor',
            enableRainSensor: 'Enable Rain Sensor',
            threshold: 'Threshold (mm)',
            powerMode: 'Power Mode',
            selectPowerMode: 'Select Power Mode',
            flowCalibration: 'Flow Calibration',
            pulsesPerLiter: 'Pulses per Liter',
            skipToZones: 'Skip to Zones',
        },

        zone: {
            namePrompt: 'What do you call this zone?',
            namePlaceholder: 'e.g., Front Garden, Tomatoes, Lawn...',
            selectMode: 'Select watering mode:',
            summary: 'Zone Summary',
            cloneTitle: 'Quick Setup',
            cloneDescription: 'Copy settings from',
            cloneButton: 'Copy',
            useLocationFrom: 'Use location from',
        },

        modes: {
            fao56Auto: 'FAO-56 Auto',
            fao56AutoDesc: 'Automatic calculation based on evapotranspiration',
            fao56Eco: 'FAO-56 Eco',
            fao56EcoDesc: 'Water-saving mode with 20% reduction',
            duration: 'Duration',
            durationDesc: 'Fixed time watering',
            volume: 'Volume',
            volumeDesc: 'Fixed volume watering',
        },

        steps: {
            mode: 'Mode',
            modeDesc: 'Choose watering mode',
            plant: 'Plant Selection',
            plantDesc: 'Choose what you\'re growing',
            location: 'Location',
            locationDesc: 'For weather data',
            soil: 'Soil Type',
            soilDesc: 'Affects water retention',
            irrigation: 'Irrigation Method',
            irrigationDesc: 'How water is delivered',
            environment: 'Environment',
            environmentDesc: 'Coverage and sun exposure',
            schedule: 'Schedule',
            scheduleDesc: 'When to water',
        },

        plant: {
            title: 'What do you want to water?',
            searchPlaceholder: 'Search plant... (e.g., tomatoes, lawn)',
            popular: 'Popular',
            allCategories: 'All',
            waterNeedLow: 'Low water need',
            waterNeedMedium: 'Medium water need',
            waterNeedHigh: 'High water need',
            alreadyConfigured: 'Plant Already Configured',
            coverageDenseExplanation: 'Dense crop - using area measurement',
            coverageSparseExplanation: 'Sparse planting - enter number of plants',
        },

        soil: {
            title: 'Soil Type',
            autoDetect: 'Auto-detect from GPS',
            detecting: 'Detecting soil type...',
            detectedWith: 'Detected with',
            confidence: 'confidence',
            manualSelect: 'Select manually',
            noLocation: 'Set location first for auto-detection',
        },

        location: {
            title: 'Location',
            gpsButton: 'Use GPS',
            gettingLocation: 'Getting location...',
            permissionDenied: 'GPS permission denied. Use the map or enter coordinates manually.',
            unavailable: 'GPS unavailable. Use the map or enter coordinates manually.',
            manualEntry: 'Enter coordinates manually',
        },

        schedule: {
            enable: 'Enable schedule',
            fao56Smart: 'FAO-56 Smart Schedule',
            fao56SmartDesc: 'Evaluates daily water needs based on evapotranspiration',
            evaluationDaily: 'Daily at sunrise',
            estimatedDuration: '~15-45 min / zone',
            modify: 'Modify',
        },

        summary: {
            title: 'Zone Summary',
            mode: 'Mode',
            plant: 'Plant',
            soil: 'Soil',
            irrigation: 'Irrigation',
            coverage: 'Coverage',
            sunExposure: 'Sun Exposure',
            cycleSoak: 'Cycle & Soak',
            maxVolume: 'Max Volume',
            location: 'Location',
            planted: 'Planted',
            schedulePreview: 'Schedule Preview',
        },

        validation: {
            zoneNameRequired: 'Zone name is required',
            zoneNameTooShort: 'Zone name must be at least 2 characters',
            coverageRequired: 'Coverage value is required',
            coverageInvalid: 'Please enter a valid coverage value',
            plantRequired: 'Please select a plant',
            soilRequired: 'Please select a soil type',
            locationRequired: 'Please set a location for weather data',
        },

        complete: {
            title: 'Setup Complete!',
            subtitle: 'Your irrigation system is ready',
            zonesConfigured: 'zones configured',
            addAnotherZone: 'Add Another Zone',
            finishSetup: 'Finish Setup',
        },
    },

    categories: {
        vegetables: 'Vegetables',
        fruits: 'Fruits',
        lawn: 'Lawn',
        flowers: 'Flowers',
        trees: 'Trees',
        shrubs: 'Shrubs',
        herbs: 'Herbs',
        other: 'Other',
    },

    settings: {
        language: 'Language',
        theme: 'Theme',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        systemDefault: 'System Default',
        systemSettings: 'System Settings',
        deviceTime: 'Device Time',
        notConnected: 'Not connected',
        autoSynced: 'Auto-synced on connection',
        masterValve: 'Master Valve',
        enableMasterValve: 'Enable Master Valve',
        preDelay: 'Pre-delay (seconds)',
        postDelay: 'Post-delay (seconds)',
        saveMasterValveConfig: 'Save Master Valve Config',
        masterValveSaved: 'Master Valve config saved',
        masterValveFailed: 'Failed to save Master Valve config',
        rainSensor: 'Rain Sensor',
        enableRainSensor: 'Enable Rain Sensor',
        mmPerPulse: 'mm per pulse',
        skipThreshold: 'Skip threshold (mm)',
        skipThresholdHint: 'Skip irrigation if rain exceeds threshold in last 24h',
        saveRainSensorConfig: 'Save Rain Sensor Config',
        rainSensorSaved: 'Rain Sensor config saved',
        rainSensorFailed: 'Failed to save Rain Sensor config',
        flowCalibration: 'Flow Sensor Calibration',
        pulses: 'Pulses',
        pulsesPerLiter: 'pulses/L',
        startCalibration: 'Start Calibration',
        dangerZone: 'Danger Zone',
        dangerWarning: 'Resets may delete configurations, schedules or history.',
        resetOptions: 'Reset Options',
    },

    errors: {
        connectionLost: 'Connection lost. Please check your device.',
        saveFailed: 'Failed to save. Please try again.',
        loadFailed: 'Failed to load data. Please try again.',
        gpsFailed: 'GPS error. Try again or use the map.',
        tryAgain: 'Try again',
        checkConnection: 'Check your connection and try again.',
    },

    a11y: {
        closeButton: 'Close dialog',
        nextStep: 'Go to next step',
        previousStep: 'Go to previous step',
        progressBar: 'Setup progress',
        selectedItem: 'Selected',
        expandSection: 'Expand section',
        collapseSection: 'Collapse section',
    },

    dashboard: {
        device: 'Device',
        connected: 'Connected',
        otherDevices: 'Other Devices',
        tapToConnect: 'Tap to connect',
        addNewDevice: 'Add New Device',
        online: 'Online',
        wateringActive: 'Watering Active',
        remaining: 'remaining',
        progress: 'Progress',
        nextWateringCycle: 'Next Watering Cycle',
        noScheduleConfigured: 'No schedule configured',
        soilMoisture: 'Soil Moisture',
        temp: 'Temp',
        humidity: 'Humidity',
        rainfall24h: 'Rainfall (24h)',
        quickActions: 'Quick Actions',
        manualWater: 'Manual Water',
        pauseSchedule: 'Pause Schedule',
        completeSetup: 'Complete Setup',
        noZonesConfigured: 'No zones configured yet',
    },

    zones: {
        zone: 'Zone',
        zones: 'Zones',
        details: 'Details',
        overview: 'Overview',
        schedule: 'Schedule',
        history: 'History',
        settings: 'Settings',
        addZone: 'Add Zone',
        editZone: 'Edit Zone',
        deleteZone: 'Delete Zone',
        cycleSoak: 'Cycle & Soak',
        enabled: 'Enabled',
        disabled: 'Disabled',
        preventsRunoff: 'Prevents runoff on slow-draining or sloped soil',
        waterWithoutPauses: 'Water without pauses',
        cycleDuration: 'Cycle Duration',
        soakDuration: 'Soak Duration',
        maxVolumePerSession: 'Max Volume per Session',
        wateringTime: 'Watering time before pause',
        pauseTime: 'Pause time for absorption',
        soilType: 'Soil Type',
        plant: 'Plant',
        irrigationMethod: 'Irrigation Method',
        coverage: 'Coverage',
        areaSqm: 'Area (m²)',
        plantCount: 'Plant Count',
        sunExposure: 'Sun Exposure',
        irrigationZones: 'Irrigation Zones',
        zonesConfigured: 'zones configured',
        wateringInProgress: 'Watering in Progress',
        allSystemsNormal: 'All Systems Normal',
        noZonesConfigured: 'No Zones Configured',
        tapAddZone: 'Tap Add Zone to set up your first irrigation zone',
        addFirstZone: 'Add First Zone',
        notScheduled: 'Not scheduled',
        today: 'Today',
        tomorrow: 'Tomorrow',
        next: 'Next',
        wateringNow: 'Watering Now',
        water: 'Water',
        auto: 'Auto',
        rainSkip: 'Rain Skip',
        left: 'LEFT',
        started: 'Started',
        justNow: 'Just now',
        last: 'Last',
        yesterday: 'Yesterday',
    },

    weather: {
        mostlySunny: 'Mostly Sunny',
        noRainExpected: 'No rain expected for 3 days.',
        nextRun: 'Next Run',
        waterSave: 'Water Save',
    },

    reset: {
        title: 'Reset',
        deviceReset: 'Device Reset',
        selectType: 'Select the reset type you want.',
        selectChannel: 'Select channel:',
        channel: 'Channel',
        continue: 'Continue',
        waitingConfirmation: 'Waiting for confirmation...',
        executing: 'Executing reset...',
        confirmationCode: 'Confirmation code:',
        doNotClose: 'Do not close this window',
        complete: 'Reset Complete!',
        error: 'Reset Error',
        tryAgain: 'Try again',
        warning: 'Warning!',
        confirmDanger: 'Are you sure you want to execute this action? This cannot be undone!',
        yesContinue: 'Yes, continue',
    },

    cycleSoak: {
        title: 'Cycle & Soak',
        selectSoilFirst: 'Cycle & Soak - select soil first',
        activated: 'Activated',
        deactivated: 'Deactivated',
        cycleWatering: 'Watering cycle',
        soakAbsorption: 'Soak absorption',
        done: 'Done',
        auto: 'Auto',
        active: 'Active',
        off: 'Off',
        wateringPause: 'watering • pause',
        preventsRunoff: 'Prevents runoff on slow-draining or sloped soil',
        slowSoil: 'Slow soil',
        fastSoil: 'Fast soil',
        explanation: 'Cycle applies water in short bursts, with soak time between for absorption.',
        safetyLimit: 'Prevents overwatering',
    },

    maxVolume: {
        title: 'Max Volume',
        perSession: 'Max Volume per Session',
        liters: 'liters',
        unlimited: 'Unlimited',
        safetyLimit: 'Volume limit',
        safetyExplanation: 'Safety measure to prevent overwatering in case of calculation errors or sensor issues.',
    },

    zoneDetails: {
        notConfigured: 'Not configured',
        notScheduled: 'Not scheduled',
        wateringActive: 'Watering Active',
        idle: 'Idle',
        nextWatering: 'Next Watering',
        schedule: 'Schedule',
        autoQuality: 'Auto Quality',
        autoEco: 'Auto Eco',
        manual: 'Manual',
        everyDay: 'Every day',
        preventsRunoff: 'Prevents runoff',
        totalArea: 'Total Area',
        totalPlants: 'Total Plants',
        shade: 'Shade',
        partialSun: 'Partial Sun',
        fullSun: 'Full Sun',
        highEvaporation: 'High evaporation',
        normalEvaporation: 'Normal evaporation',
        lowEvaporation: 'Low evaporation',
        irrigationNeeded: 'Irrigation needed',
        soilHasEnough: 'Soil has enough water',
        fixedDuration: 'Fixed Duration',
        fixedVolume: 'Fixed Volume',
        light: 'Light',
        moderate: 'Moderate',
        strong: 'Strong',
        // Tabs
        overview: 'Overview',
        history: 'History',
        adjust: 'Adjust',
        // Schedule types
        daily: 'Daily',
        periodic: 'Periodic',
        autoFao56: 'Auto (FAO-56)',
        duration: 'Duration',
        volume: 'Volume',
        unknown: 'Unknown',
        // Durations
        quick: 'Quick',
        standard: 'Standard',
        deep: 'Deep',
        custom: 'Custom',
        // Actions
        startWatering: 'Start Watering',
        stopWatering: 'Stop Watering',
        resetZone: 'Reset Zone',
        // Recommendations
        recommended: 'Recommended',
        optional: 'Optional',
        soilInfiltration: 'Soil infiltration',
        applicationRate: 'Application rate',
        resetToAuto: 'Reset to auto values',
        howCycleSoakWorks: 'How does Cycle & Soak work?',
        // Calculation
        howWeCalculated: 'How we calculated:',
        availableWater: 'Available water',
        rootDepth: 'Root depth',
        adjustManually: 'Adjust manually:',
        recommendedValue: 'Recommended:',
        useCalculatedValue: 'Use calculated value',
        orEnterDirectly: 'Or enter directly:',
        valueDiffers: 'Value differs significantly from recommended',
        whatIsMaxVolume: 'What is max volume?',
    },

    // Wizard
    zoneWizard: {
        steps: {
            selectChannel: 'Select Channel',
            allConfigured: 'All Configured',
            zoneName: 'Zone Name',
            plantMethod: 'Plant Select',
            plantSelection: 'Select Plant',
            locationSetup: 'Location',
            soilType: 'Soil Type',
            sunExposure: 'Sun Exposure',
            coverageArea: 'Coverage',
            irrigationMethod: 'Irrigation',
            wateringMode: 'Watering Mode',
            scheduleConfig: 'Schedule',
            weatherAdjustments: 'Weather',
            zoneSummary: 'Summary',
        },
        header: {
            addZone: 'Add Zone',
            cancel: 'Cancel',
        },
        allConfigured: {
            title: 'All Zones Configured!',
            message: 'All available channels have been set up.',
            button: 'Go Back',
        },
        selectChannel: {
            title: 'Select Channel',
            subtitle: 'Choose an unconfigured channel for your new zone',
            allConfigured: 'All channels are already configured!',
            channel: 'Channel',
            notConfigured: 'Not configured',
            goBack: 'Go Back',
        },
        zoneName: {
            title: 'Name This Zone',
            subtitle: 'Give your zone a descriptive name',
            placeholder: 'e.g., Front Lawn',
            suggestions: {
                frontLawn: 'Front Lawn',
                backGarden: 'Back Garden',
                flowerBed: 'Flower Bed',
                vegetables: 'Vegetables',
                trees: 'Trees',
                patio: 'Patio',
            },
        },
        plantMethod: {
            title: 'Select Plant Type',
            optimizationTip: {
                title: 'Optimization Tip',
                text: 'Knowing your plant type helps calculate the perfect soil moisture levels and watering schedule.',
            },
            camera: {
                title: 'Identify with Camera',
                desc: 'Use AI to detect your plant instantly',
                alert: 'Camera identification coming soon! Please use manual search for now.',
            },
            manual: {
                title: 'Manual Search',
                desc: 'Browse the botanical database',
            },
        },
        plantSelection: {
            title: 'Browse Plants',
            subtitle: 'Select a category or search the database',
            searchPlaceholder: 'Search plants...',
            noPlantsFound: 'No plants found',
            categories: {
                all: 'All',
            },
        },
        locationSetup: {
            title: 'Set Location',
            subtitle: 'Location helps us determine soil type and optimize watering based on local weather.',
            cardTitle: 'Auto-Detect via GPS',
            cardDesc: 'We\'ll use your location to identify local soil composition and weather patterns.',
            locationDetected: 'Location Detected!',
            startDetection: 'Start Detection',
            detecting: 'Detecting...',
            skip: 'Or skip this step',
            skipDesc: 'You can manually select soil type in the next step',
            errors: {
                denied: 'Location permission denied. Please enable GPS permissions in settings.',
                unavailable: 'Geolocation is not available on this device/browser.',
                failed: 'Failed to get location. Please try again.',
                soilFailed: 'Soil detection is temporarily unavailable (SoilGrids). Please select soil manually.',
            },
        },
        soilType: {
            title: 'Soil Type',
            subtitle: 'Select the soil type to optimize watering',
            searchPlaceholder: 'Search soils...',
            customProfile: 'Custom Profile',
            manualSelect: 'Or select manually',
            basedOnLocation: 'Based on location',
            orSelectManually: 'Or select manually',
            selectSoil: 'Select soil type',
            // Added keys
            customProfileCreated: 'Custom soil profile created from GPS location',
            selectSoilForAccuracy: 'Select your soil type for accurate watering',
            detectedAt: 'Detected at',
            clay: 'Clay',
            sand: 'Sand',
            silt: 'Silt',
            fieldCapacity: 'Field Capacity',
            wiltingPoint: 'Wilting Point',
            infiltration: 'Infiltration',
            bulkDensity: 'Bulk Density',
            selectSoilType: 'Select soil type',
            waterManagement: 'Water Management',
            cycleSoak: {
                title: 'Cycle & Soak',
                activeSlowSoil: 'Active - Slow soil ({infiltration} mm/h) - prevents runoff',
                recommendedSlowSoil: 'Recommended - Slow soil ({infiltration} mm/h)',
                activeSlopedTerrain: 'Active - Prevents runoff on sloped terrain',
                disabledFastSoil: 'Disabled - Fast soil ({infiltration} mm/h)',
            },
        },
        sunExposure: {
            title: 'Sun Exposure',
            full: { name: 'Full Sun', desc: '6+ hours of direct sunlight' },
            partial: { name: 'Partial Sun', desc: '3-6 hours of direct sunlight' },
            shade: { name: 'Shade', desc: 'Less than 3 hours of sunlight' },
        },
        coverage: {
            title: 'Define Coverage',
            subtitle: 'How should we calculate water usage for this zone?',
            specifyByArea: 'Specify by Area',
            specifyByPlants: 'Specify by Plants',
            helperArea: 'We\'ll use this to estimate the liters required for optimal hydration.',
            helperPlants: 'Each plant will receive individual watering calculations.',
            areaUnit: 'm²',
            plantsUnit: 'plants',
            coverageDenseExplanation: 'Dense crop - using area (m²)',
            coverageSparseExplanation: 'Sparse planting - using plant count',
        },
        irrigation: {
            title: 'Irrigation Method',
            subtitle: 'Select your irrigation system type',
            efficiency: 'eff.',
        },
        wateringMode: {
            title: 'Watering Mode',
            subtitle: 'Choose how this zone is watered based on your landscape needs.',
            nextStepTip: {
                title: 'Next: Plant & Soil Setup',
                text: 'FAO-56 modes need to know your plant type and soil to calculate accurate water needs.',
            },
            modes: {
                quality: { label: 'Smart Auto', desc: 'Calculates water needs using weather data. Maximizes plant health.' },
                eco: { label: 'Eco Saver', desc: 'Same as Smart Auto but uses 30% less water. Trains deeper roots.' },
                duration: { label: 'Fixed Duration', desc: 'Waters for a fixed time (e.g., 10 minutes). You control the schedule.' },
                volume: { label: 'Fixed Volume', desc: 'Waters until a specific volume is reached (e.g., 5 liters).' },
            },
            recommended: 'Recommended',
        },
        schedule: {
            title: 'Schedule',
            subtitleFao: 'Choose when to water. Amount is calculated automatically.',
            subtitleManual: 'Set when and how much to water.',
            auto: {
                title: 'Fully Automatic',
                desc: 'System decides when & how much based on soil moisture deficit',
                recommended: 'RECOMMENDED',
                howItWorks: {
                    title: 'How Automatic Mode Works',
                    text: 'The system monitors soil moisture deficit using FAO-56 calculations and weather data. It waters at sunset when needed, using exactly the amount required to restore optimal moisture.',
                },
            },
            custom: {
                title: 'Custom Schedule',
                desc: 'Set specific days/times, amount still auto-calculated',
            },
            duration: 'Duration',
            volume: 'Volume',
            startTime: 'Start Time',
            solar: 'Solar',
            fixedTime: 'Fixed Time',
            frequency: 'Frequency',
            daily: 'Daily',
            specificDays: 'Specific Days',
            everyXDays: 'Every X Days',
            everyXDaysValue: 'Every {days} days',
            waterEvery: 'Water every',
            solarEvents: {
                sunrise: 'Sunrise',
                sunset: 'Sunset',
            },
            solarOffset: 'Offset',
            solarOffsetOptions: {
                before: 'Before',
                atEvent: 'At event',
                after: 'After',
            },
            days: {
                everyDay: 'Every Day',
                mwf: 'M/W/F',
                tts: 'T/Th/S',
            },
        },
        weather: {
            title: 'Weather Adjustments',
            rainSkip: { name: 'Rain Skip', desc: 'Skip watering when rain is expected' },
            tempAdjust: { name: 'Temperature Adjust', desc: 'Increase watering on hot days' },
            windSkip: { name: 'Wind Skip', desc: 'Skip watering on windy days' },
            advanced: 'Advanced Settings',
            cycleSoak: {
                title: 'Cycle & Soak',
                explanation: 'Helps prevent runoff by splitting watering into cycles.',
            },
            maxVolume: {
                title: 'Max Volume',
                desc: 'Caps the amount of water applied per watering event.',
            },
        },
        summary: {
            title: 'Summary',
            subtitle: 'Review your zone configuration',
            save: 'Save Zone',
            saving: 'Saving...',
            channel: 'Channel',
            enabled: 'Enabled',
            disabled: 'Disabled',
            gps: 'GPS detected',
            notSet: 'Not set',
            wateringModes: {
                quality: 'Quality Mode',
                eco: 'Eco Mode',
                duration: 'Duration Mode',
                volume: 'Volume Mode',
            },
            sunExposure: {
                full: 'Full Sun',
                partial: 'Partial Shade',
                shade: 'Full Shade',
            },
            scheduleTypes: {
                fullyAutomatic: 'Fully Automatic',
                everyDay: 'Every Day',
                daily: 'Daily',
                everyXDays: 'Every {days} days',
            },
            solarEvents: {
                sunrise: 'Sunrise',
                sunset: 'Sunset',
            },
            timeDescriptions: {
                sunsetAuto: 'Sunset (auto)',
                atEvent: 'At {event}',
                afterEvent: '{offset} min after {event}',
                beforeEvent: '{offset} min before {event}',
            },
            days: {
                sun: 'Sun',
                mon: 'Mon',
                tue: 'Tue',
                wed: 'Wed',
                thu: 'Thu',
                fri: 'Fri',
                sat: 'Sat',
            },
            items: {
                channel: 'Channel',
                mode: 'Mode',
                plantType: 'Plant Type',
                soilType: 'Soil Type',
                sunExposure: 'Sun Exposure',
                maxVolume: 'Max Volume',
                cycleSoak: 'Cycle & Soak',
                coverage: 'Coverage',
                irrigation: 'Irrigation',
                schedule: 'Schedule',
                startTime: 'Start Time',
            },
        },
        common: {
            continue: 'Continue',
            cancel: 'Cancel',
            goBack: 'Go Back',
            edit: 'Edit',
            confirm: 'Confirm',
        },
    },
};

// Romanian translations
export const ro: TranslationKeys = {
    common: {
        next: 'Înainte',
        back: 'Înapoi',
        cancel: 'Anulează',
        save: 'Salvează',
        confirm: 'Confirmă',
        close: 'Închide',
        loading: 'Se încarcă...',
        error: 'Eroare',
        success: 'Succes',
        skip: 'Sări',
        useDefaults: 'Folosește valorile implicite',
        undo: 'Anulează acțiunea',
        yes: 'Da',
        no: 'Nu',
        ok: 'OK',
        retry: 'Reîncearcă',
        minutes: 'minute',
        hours: 'ore',
        liters: 'litri',
        percent: '%',
    },

    wizard: {
        title: 'Asistent de Configurare',
        exitConfirmTitle: 'Ieși din wizard?',
        exitConfirmMessage: 'Ai modificări nesalvate. Dacă ieși acum, progresul va fi pierdut.',
        exitConfirmCancel: 'Rămân',
        exitConfirmExit: 'Ieși',

        phases: {
            welcome: 'Bun venit',
            system: 'Configurare Sistem',
            zones: 'Configurare Zone',
            complete: 'Finalizat',
        },

        welcome: {
            title: 'Bun venit!',
            subtitle: 'Să configurăm sistemul tău de irigații pas cu pas.',
            description: 'Vom configura sistemul, vom seta zonele cu plante și tipuri de sol, apoi vom crea programări.',
            startButton: 'Începe',
            fao56Mode: 'Mod FAO-56 Smart',
            fao56Description: 'Irigare științifică bazată pe nevoile plantelor și vreme',
            manualMode: 'Mod Manual',
            manualDescription: 'Udare simplă bazată pe durată sau volum',
            alreadyConfigured: 'Sistem deja configurat!',
            zonesConfiguredMsg: 'Sistemul tău de irigații are zone configurate.',
            overallProgress: 'Progres general',
            continueToClose: 'Apasă "Continuă" pentru a închide asistentul. Poți adăuga sau modifica zone din interfața principală.',
            factoryResetNote: 'Pentru a reconfigura de la zero, folosește "Resetare din Fabrică" din Setări.',
        },

        system: {
            title: 'Configurare Sistem',
            allConfigured: 'Toate setările sistemului sunt configurate!',
            configureRemaining: 'Configurează {count} setare/setări rămase',
            alreadyConfigured: 'Deja Configurat',
            masterValve: 'Supapă Principală',
            enableMasterValve: 'Activează Supapa Principală',
            preDelay: 'Pre-întârziere (secunde)',
            postDelay: 'Post-întârziere (secunde)',
            rainSensor: 'Senzor de Ploaie',
            enableRainSensor: 'Activează Senzorul de Ploaie',
            threshold: 'Prag (mm)',
            powerMode: 'Mod Alimentare',
            selectPowerMode: 'Selectează Modul de Alimentare',
            flowCalibration: 'Calibrare Debit',
            pulsesPerLiter: 'Impulsuri pe Litru',
            skipToZones: 'Sari la Zone',
        },

        zone: {
            namePrompt: 'Cum numești această zonă?',
            namePlaceholder: 'ex: Grădină față, Roșii, Gazon...',
            selectMode: 'Selectează modul de udare:',
            summary: 'Rezumat Zonă',
            cloneTitle: 'Configurare rapidă',
            cloneDescription: 'Copiază setările din',
            cloneButton: 'Copiază',
            useLocationFrom: 'Folosește locația din',
        },

        modes: {
            fao56Auto: 'FAO-56 Auto',
            fao56AutoDesc: 'Calcul automat bazat pe evapotranspirație',
            fao56Eco: 'FAO-56 Eco',
            fao56EcoDesc: 'Mod economic cu reducere 20%',
            duration: 'Durată',
            durationDesc: 'Udare pe timp fix',
            volume: 'Volum',
            volumeDesc: 'Udare pe volum fix',
        },

        steps: {
            mode: 'Mod',
            modeDesc: 'Alege modul de udare',
            plant: 'Selectare Plantă',
            plantDesc: 'Alege ce cultivi',
            location: 'Locație',
            locationDesc: 'Pentru date meteo',
            soil: 'Tip Sol',
            soilDesc: 'Afectează retenția apei',
            irrigation: 'Metodă Irigare',
            irrigationDesc: 'Cum se livrează apa',
            environment: 'Mediu',
            environmentDesc: 'Acoperire și expunere solară',
            schedule: 'Program',
            scheduleDesc: 'Când să ude',
        },

        plant: {
            title: 'Ce vrei să uzi?',
            searchPlaceholder: 'Caută plantă... (ex: roșii, gazon)',
            popular: 'Populare',
            allCategories: 'Toate',
            waterNeedLow: 'Apă redusă',
            waterNeedMedium: 'Apă medie',
            waterNeedHigh: 'Apă multă',
            alreadyConfigured: 'Plantă deja configurată',
            coverageDenseExplanation: 'Cultură densă - folosim suprafața',
            coverageSparseExplanation: 'Plantare rară - introduci numărul de plante',
        },

        soil: {
            title: 'Tip Sol',
            autoDetect: 'Detectare automată din GPS',
            detecting: 'Se detectează tipul solului...',
            detectedWith: 'Detectat cu',
            confidence: 'încredere',
            manualSelect: 'Selectează manual',
            noLocation: 'Setează locația pentru detectare automată',
        },

        location: {
            title: 'Locație',
            gpsButton: 'Folosește GPS',
            gettingLocation: 'Se obține locația...',
            permissionDenied: 'Permisiune GPS refuzată. Folosește harta sau introdu coordonatele manual.',
            unavailable: 'GPS indisponibil. Folosește harta sau introdu coordonatele manual.',
            manualEntry: 'Introdu coordonatele manual',
        },

        schedule: {
            enable: 'Activează programare',
            fao56Smart: 'Program Smart FAO-56',
            fao56SmartDesc: 'Evaluează zilnic necesarul de apă bazat pe evapotranspirație',
            evaluationDaily: 'Zilnic la răsărit',
            estimatedDuration: '~15-45 min / zonă',
            modify: 'Modifică',
        },

        summary: {
            title: 'Rezumat Zonă',
            mode: 'Mod',
            plant: 'Plantă',
            soil: 'Sol',
            irrigation: 'Irigare',
            coverage: 'Acoperire',
            sunExposure: 'Expunere Solară',
            cycleSoak: 'Ciclu & Pauză',
            maxVolume: 'Volum Maxim',
            location: 'Locație',
            planted: 'Plantat',
            schedulePreview: 'Previzualizare Program',
        },

        validation: {
            zoneNameRequired: 'Numele zonei este obligatoriu',
            zoneNameTooShort: 'Numele zonei trebuie să aibă minim 2 caractere',
            coverageRequired: 'Valoarea acoperirii este obligatorie',
            coverageInvalid: 'Introdu o valoare validă pentru acoperire',
            plantRequired: 'Selectează o plantă',
            soilRequired: 'Selectează un tip de sol',
            locationRequired: 'Setează o locație pentru datele meteo',
        },

        complete: {
            title: 'Configurare Completă!',
            subtitle: 'Sistemul tău de irigații este gata',
            zonesConfigured: 'zone configurate',
            addAnotherZone: 'Adaugă altă zonă',
            finishSetup: 'Finalizează',
        },
    },

    categories: {
        vegetables: 'Legume',
        fruits: 'Fructe',
        lawn: 'Gazon',
        flowers: 'Flori',
        trees: 'Copaci',
        shrubs: 'Arbuști',
        herbs: 'Aromate',
        other: 'Altele',
    },

    settings: {
        language: 'Limbă',
        theme: 'Temă',
        darkMode: 'Mod Întunecat',
        lightMode: 'Mod Luminos',
        systemDefault: 'Implicit Sistem',
        systemSettings: 'Setări Sistem',
        deviceTime: 'Ora Dispozitiv',
        notConnected: 'Neconectat',
        autoSynced: 'Sincronizat automat la conectare',
        masterValve: 'Valvă Principală',
        enableMasterValve: 'Activează Valva Principală',
        preDelay: 'Pre-delay (secunde)',
        postDelay: 'Post-delay (secunde)',
        saveMasterValveConfig: 'Salvează Config Valvă Principală',
        masterValveSaved: 'Configurația valvei principale salvată',
        masterValveFailed: 'Eșuat salvarea valvei principale',
        rainSensor: 'Senzor Ploaie',
        enableRainSensor: 'Activează Senzor Ploaie',
        mmPerPulse: 'mm per puls',
        skipThreshold: 'Prag sărire (mm)',
        skipThresholdHint: 'Sari irigația dacă ploaia depășește pragul în ultimele 24h',
        saveRainSensorConfig: 'Salvează Config Senzor Ploaie',
        rainSensorSaved: 'Configurația senzorului de ploaie salvată',
        rainSensorFailed: 'Eșuat salvarea senzorului de ploaie',
        flowCalibration: 'Calibrare Senzor Debit',
        pulses: 'Pulsuri',
        pulsesPerLiter: 'pulsuri/L',
        startCalibration: 'Pornește Calibrare',
        dangerZone: 'Zonă Periculoasă',
        dangerWarning: 'Resetările pot șterge configurații, programări sau istoric.',
        resetOptions: 'Opțiuni Resetare',
    },

    errors: {
        connectionLost: 'Conexiune pierdută. Verifică dispozitivul.',
        saveFailed: 'Salvare eșuată. Încearcă din nou.',
        loadFailed: 'Încărcare eșuată. Încearcă din nou.',
        gpsFailed: 'Eroare GPS. Încearcă din nou sau folosește harta.',
        tryAgain: 'Încearcă din nou',
        checkConnection: 'Verifică conexiunea și încearcă din nou.',
    },

    a11y: {
        closeButton: 'Închide dialogul',
        nextStep: 'Pasul următor',
        previousStep: 'Pasul anterior',
        progressBar: 'Progres configurare',
        selectedItem: 'Selectat',
        expandSection: 'Extinde secțiunea',
        collapseSection: 'Restrânge secțiunea',
    },

    dashboard: {
        device: 'Dispozitiv',
        connected: 'Conectat',
        otherDevices: 'Alte Dispozitive',
        tapToConnect: 'Apasă pentru conectare',
        addNewDevice: 'Adaugă Dispozitiv Nou',
        online: 'Online',
        wateringActive: 'Udare Activă',
        remaining: 'rămas',
        progress: 'Progres',
        nextWateringCycle: 'Următorul Ciclu de Udare',
        noScheduleConfigured: 'Nicio programare configurată',
        soilMoisture: 'Umiditate Sol',
        temp: 'Temp',
        humidity: 'Umiditate',
        rainfall24h: 'Precipitații (24h)',
        quickActions: 'Acțiuni Rapide',
        manualWater: 'Udare Manuală',
        pauseSchedule: 'Pauză Program',
        completeSetup: 'Finalizează Configurarea',
        noZonesConfigured: 'Nicio zonă configurată încă',
    },

    zones: {
        zone: 'Zonă',
        zones: 'Zone',
        details: 'Detalii',
        overview: 'Prezentare',
        schedule: 'Program',
        history: 'Istoric',
        settings: 'Setări',
        addZone: 'Adaugă Zonă',
        editZone: 'Editează Zonă',
        deleteZone: 'Șterge Zonă',
        cycleSoak: 'Ciclu și Pauză',
        enabled: 'Activat',
        disabled: 'Dezactivat',
        preventsRunoff: 'Previne scurgerea pe sol lent sau înclinat',
        waterWithoutPauses: 'Apă fără pauze',
        cycleDuration: 'Durată Ciclu',
        soakDuration: 'Durată Pauză',
        maxVolumePerSession: 'Volum Maxim per Sesiune',
        wateringTime: 'Timp udare înainte de pauză',
        pauseTime: 'Timp pauză pentru absorbție',
        soilType: 'Tip Sol',
        plant: 'Plantă',
        irrigationMethod: 'Metodă Irigare',
        coverage: 'Acoperire',
        areaSqm: 'Suprafață (m²)',
        plantCount: 'Număr Plante',
        sunExposure: 'Expunere Solară',
        irrigationZones: 'Zone de Irigare',
        zonesConfigured: 'zone configurate',
        wateringInProgress: 'Udare în Curs',
        allSystemsNormal: 'Toate Sistemele Normale',
        noZonesConfigured: 'Nicio Zonă Configurată',
        tapAddZone: 'Apasă Adaugă Zonă pentru prima zonă de irigare',
        addFirstZone: 'Adaugă Prima Zonă',
        notScheduled: 'Neprogramat',
        today: 'Azi',
        tomorrow: 'Mâine',
        next: 'Următor',
        wateringNow: 'Udare Acum',
        water: 'Udă',
        auto: 'Auto',
        rainSkip: 'Sărit Ploaie',
        left: 'RĂMAS',
        started: 'Început',
        justNow: 'Chiar acum',
        last: 'Ultima',
        yesterday: 'Ieri',
    },

    weather: {
        mostlySunny: 'Predominant Însorit',
        noRainExpected: 'Nu se așteaptă ploaie 3 zile.',
        nextRun: 'Următoarea Rulare',
        waterSave: 'Economie Apă',
    },

    reset: {
        title: 'Resetare',
        deviceReset: 'Resetare Dispozitiv',
        selectType: 'Selectați tipul de resetare dorit.',
        selectChannel: 'Selectați canalul:',
        channel: 'Canal',
        continue: 'Continuă',
        waitingConfirmation: 'Aștept confirmare...',
        executing: 'Execut resetare...',
        confirmationCode: 'Cod de confirmare:',
        doNotClose: 'Nu închideți această fereastră',
        complete: 'Resetare Completă!',
        error: 'Eroare la Resetare',
        tryAgain: 'Încearcă din nou',
        warning: 'Atenție!',
        confirmDanger: 'Sunteți sigur că doriți să executați această acțiune? Nu poate fi anulată!',
        yesContinue: 'Da, continuă',
    },

    cycleSoak: {
        title: 'Ciclu și Pauză',
        selectSoilFirst: 'Ciclu și Pauză - selectează solul mai întâi',
        activated: 'Activat',
        deactivated: 'Dezactivat',
        cycleWatering: 'Ciclu udare',
        soakAbsorption: 'Pauză absorbție',
        done: 'Gata',
        auto: 'Auto',
        active: 'Activ',
        off: 'Oprit',
        wateringPause: 'udare • pauză',
        preventsRunoff: 'Previne scurgerea pe sol lent sau înclinat',
        slowSoil: 'Sol lent',
        fastSoil: 'Sol rapid',
        explanation: 'Ciclul aplică apa în rafale scurte, cu timp de pauză între ele pentru absorbție.',
        safetyLimit: 'Previne udarea excesivă',
    },

    maxVolume: {
        title: 'Volum Maxim',
        perSession: 'Volum Maxim per Sesiune',
        liters: 'litri',
        unlimited: 'Nelimitat',
        safetyLimit: 'Limită de volum',
        safetyExplanation: 'Măsură de siguranță pentru a preveni udarea excesivă în caz de erori de calcul sau senzori.',
    },

    zoneDetails: {
        notConfigured: 'Neconfigurat',
        notScheduled: 'Neprogramat',
        wateringActive: 'Udare Activă',
        idle: 'Inactiv',
        nextWatering: 'Următoarea Udare',
        schedule: 'Program',
        autoQuality: 'Auto Calitate',
        autoEco: 'Auto Eco',
        manual: 'Manual',
        everyDay: 'În fiecare zi',
        preventsRunoff: 'Previne scurgerea',
        totalArea: 'Suprafață Totală',
        totalPlants: 'Total Plante',
        shade: 'Umbră',
        partialSun: 'Soare Parțial',
        fullSun: 'Soare Plin',
        highEvaporation: 'Evaporare mare',
        normalEvaporation: 'Evaporare normală',
        lowEvaporation: 'Evaporare mică',
        irrigationNeeded: 'Irigație necesară',
        soilHasEnough: 'Solul are suficientă apă',
        fixedDuration: 'Durată Fixă',
        fixedVolume: 'Volum Fix',
        light: 'Ușor',
        moderate: 'Moderat',
        strong: 'Puternic',
        // Tabs
        overview: 'Prezentare',
        history: 'Istoric',
        adjust: 'Ajustare',
        // Schedule types
        daily: 'Zilnic',
        periodic: 'Periodic',
        autoFao56: 'Auto (FAO-56)',
        duration: 'Durată',
        volume: 'Volum',
        unknown: 'Necunoscut',
        // Durations
        quick: 'Rapid',
        standard: 'Standard',
        deep: 'Profund',
        custom: 'Personalizat',
        // Actions
        startWatering: 'Pornește Udarea',
        stopWatering: 'Oprește Udarea',
        resetZone: 'Resetează Zona',
        // Recommendations
        recommended: 'Recomandat',
        optional: 'Opțional',
        soilInfiltration: 'Infiltrare sol',
        applicationRate: 'Rată aplicare',
        resetToAuto: 'Resetează la valori automate',
        howCycleSoakWorks: 'Cum funcționează Cycle & Soak?',
        // Calculation
        howWeCalculated: 'Cum am calculat:',
        availableWater: 'Apă disponibilă',
        rootDepth: 'Adâncime rădăcini',
        adjustManually: 'Ajustează manual:',
        recommendedValue: 'Recomandat:',
        useCalculatedValue: 'Folosește valoarea calculată',
        orEnterDirectly: 'Sau introdu direct:',
        valueDiffers: 'Valoarea diferă semnificativ de cea recomandată',
        whatIsMaxVolume: 'Ce înseamnă volumul maxim?',
    },

    // Wizard
    zoneWizard: {
        steps: {
            selectChannel: 'Selectare Canal',
            allConfigured: 'Toate Configurate',
            zoneName: 'Nume Zonă',
            plantMethod: 'Metodă Plantă',
            plantSelection: 'Selectare Plantă',
            locationSetup: 'Locație',
            soilType: 'Tip Sol',
            sunExposure: 'Expunere Soare',
            coverageArea: 'Acoperire',
            irrigationMethod: 'Irigare',
            wateringMode: 'Mod Udare',
            scheduleConfig: 'Program',
            weatherAdjustments: 'Vreme',
            zoneSummary: 'Sumar',
        },
        header: {
            addZone: 'Adaugă Zonă',
            cancel: 'Anulează',
        },
        allConfigured: {
            title: 'Toate Zonele Configurate!',
            message: 'Toate canalele disponibile au fost configurate.',
            button: 'Înapoi',
        },
        selectChannel: {
            title: 'Selectare Canal',
            subtitle: 'Alege un canal neconfigurat pentru noua zonă',
            allConfigured: 'Toate canalele sunt deja configurate!',
            channel: 'Canal',
            notConfigured: 'Neconfigurat',
            goBack: 'Înapoi',
        },
        zoneName: {
            title: 'Numește Zona',
            subtitle: 'Dă-i zonei un nume descriptiv',
            placeholder: 'ex: Peluză Față',
            suggestions: {
                frontLawn: 'Peluză Față',
                backGarden: 'Grădină Spate',
                flowerBed: 'Rond Flori',
                vegetables: 'Legume',
                trees: 'Copaci',
                patio: 'Terasă',
            },
        },
        plantMethod: {
            title: 'Selectare Tip Plantă',
            optimizationTip: {
                title: 'Sfat Optimizare',
                text: 'Cunoașterea tipului de plantă ajută la calcularea umidității solului și a programului perfect.',
            },
            camera: {
                title: 'Identificare cu Camera',
                desc: 'Folosește AI pentru a detecta planta instantaneu',
                alert: 'Identificarea cu camera vine în curând! Folosește căutarea manuală momentan.',
            },
            manual: {
                title: 'Căutare Manuală',
                desc: 'Răsfoiește baza de date botanică',
            },
        },
        plantSelection: {
            title: 'Răsfoiește Plante',
            subtitle: 'Alege o categorie sau caută în bază',
            searchPlaceholder: 'Caută plante...',
            noPlantsFound: 'Nicio plantă găsită',
            categories: {
                all: 'Toate',
            },
        },
        locationSetup: {
            title: 'Setare Locație',
            subtitle: 'Locația ne ajută să determinăm tipul de sol și vremea locală.',
            cardTitle: 'Detectare Auto prin GPS',
            cardDesc: 'Vom folosi locația ta pentru a identifica compoziția solului și vremea.',
            locationDetected: 'Locație Detectată!',
            startDetection: 'Start Detectare',
            detecting: 'Detectare...',
            skip: 'Sau sari acest pas',
            skipDesc: 'Poți selecta manual tipul de sol în pasul următor',
            errors: {
                denied: 'Permisiune locație refuzată. Activează GPS din setări.',
                unavailable: 'Geolocația nu e disponibilă.',
                failed: 'Eșec la obținerea locației. Încearcă din nou.',
                soilFailed: 'Detectarea solului indisponibilă. Selectează manual.',
            },
        },
        soilType: {
            title: 'Tip Sol',
            subtitle: 'Selectează tipul de sol pentru optimizare',
            searchPlaceholder: 'Caută soluri...',
            customProfile: 'Profil Personalizat',
            manualSelect: 'Sau selectează manual',
            basedOnLocation: 'Bazat pe locație',
            orSelectManually: 'Sau selectează manual',
            selectSoil: 'Selectează tip sol',
            // Added keys
            customProfileCreated: 'Profil sol personalizat creat din locația GPS',
            selectSoilForAccuracy: 'Selectează tipul de sol pentru udare precisă',
            detectedAt: 'Detectat la',
            clay: 'Argilă',
            sand: 'Nisip',
            silt: 'Nămol',
            fieldCapacity: 'Capacitate Câmp',
            wiltingPoint: 'Punct ofilire',
            infiltration: 'Infiltrație',
            bulkDensity: 'Densitate',
            selectSoilType: 'Selectează tip sol',
            waterManagement: 'Management Apă',
            cycleSoak: {
                title: 'Ciclu & Pauză',
                activeSlowSoil: 'Activ - Sol lent ({infiltration} mm/h) - previne scurgerea',
                recommendedSlowSoil: 'Recomandat - Sol lent ({infiltration} mm/h)',
                activeSlopedTerrain: 'Activ - Previne scurgerea pe teren în pantă',
                disabledFastSoil: 'Dezactivat - Sol rapid ({infiltration} mm/h)',
            },
        },
        sunExposure: {
            title: 'Expunere Soare',
            full: { name: 'Soare Plin', desc: '6+ ore de soare direct' },
            partial: { name: 'Soare Parțial', desc: '3-6 ore de soare direct' },
            shade: { name: 'Umbră', desc: 'Sub 3 ore de soare' },
        },
        coverage: {
            title: 'Definire Acoperire',
            subtitle: 'Cum să calculăm necesarul de apă?',
            specifyByArea: 'Specifică per Suprafață',
            specifyByPlants: 'Specifică per Plante',
            helperArea: 'Vom folosi acest lucru pentru a estima litrii necesari pentru o hidratare optimă.',
            helperPlants: 'Fiecare plantă va primi calcule individuale de udare.',
            areaUnit: 'm²',
            plantsUnit: 'plante',
            coverageDenseExplanation: 'Cultură densă - folosim suprafața (m²)',
            coverageSparseExplanation: 'Plantare rară - folosim numărul de plante',
        },
        irrigation: {
            title: 'Metodă Irigare',
            subtitle: 'Selectează tipul sistemului de irigații',
            efficiency: 'ef.',
        },
        wateringMode: {
            title: 'Mod Udare',
            subtitle: 'Alege cum va fi udată această zonă.',
            nextStepTip: {
                title: 'Urmează: Configurare Plantă & Sol',
                text: 'Modurile FAO-56 necesită tipul de plantă și sol pentru calcule precise.',
            },
            modes: {
                quality: { label: 'Smart Auto', desc: 'Calculează nevoile folosind date meteo. Maximizează sănătatea.' },
                eco: { label: 'Eco Saver', desc: 'La fel ca Smart Auto dar cu 30% mai puțină apă. Antrenează rădăcini adânci.' },
                duration: { label: 'Durată Fixă', desc: 'Udă un timp fix (ex: 10 min). Tu controlezi programul.' },
                volume: { label: 'Volum Fix', desc: 'Udă până la un volum fix (ex: 5 litri).' },
            },
            recommended: 'Recomandat',
        },
        schedule: {
            title: 'Program',
            subtitleFao: 'Alege când să uzi. Cantitatea e calculată automat.',
            subtitleManual: 'Setează când și cât să uzi.',
            auto: {
                title: 'Complet Automat',
                desc: 'Sistemul decide când și cât pe baza umidității',
                recommended: 'RECOMANDAT',
                howItWorks: {
                    title: 'Cum funcționează Modul Automat',
                    text: 'Sistemul monitorizează deficitul de apă folosind calcule FAO-56 și date meteo. Udă la apus când e nevoie, exact cât trebuie.',
                },
            },
            custom: {
                title: 'Program Personalizat',
                desc: 'Setează zile/ore specifice, cantitatea încă auto-calculată',
            },
            duration: 'Durată',
            volume: 'Volum',
            startTime: 'Oră Start',
            solar: 'Solar',
            fixedTime: 'Timp Fix',
            frequency: 'Frecvență',
            daily: 'Zilnic',
            specificDays: 'Zile Specifice',
            everyXDays: 'La fiecare X zile',
            everyXDaysValue: 'La fiecare {days} zile',
            waterEvery: 'Udă la fiecare',
            solarEvents: {
                sunrise: 'Răsărit',
                sunset: 'Apus',
            },
            solarOffset: 'Decalaj',
            solarOffsetOptions: {
                before: 'Înainte',
                atEvent: 'La eveniment',
                after: 'După',
            },
            days: {
                everyDay: 'În fiecare zi',
                mwf: 'L/M/V',
                tts: 'M/J/S',
            },
        },
        weather: {
            title: 'Ajustări Vreme',
            rainSkip: { name: 'Sărit Ploaie', desc: 'Sari peste udare când plouă' },
            tempAdjust: { name: 'Ajustare Temp', desc: 'Crește udarea în zilele caniculare' },
            windSkip: { name: 'Sărit Vânt', desc: 'Sari peste udare când bate vântul' },
            advanced: 'Setări Avansate',
            cycleSoak: {
                title: 'Ciclu & Pauză',
                explanation: 'Previne scurgerea împărțind udarea în cicluri.',
            },
            maxVolume: {
                title: 'Volum Maxim',
                desc: 'Limitează cantitatea de apă aplicată per udare.',
            },
        },
        summary: {
            title: 'Sumar',
            subtitle: 'Revizuiește configurația zonei',
            save: 'Salvează Zona',
            saving: 'Se salvează...',
            channel: 'Canal',
            enabled: 'Activat',
            disabled: 'Dezactivat',
            gps: 'detectat GPS',
            notSet: 'Nesetat',
            wateringModes: {
                quality: 'Mod Calitate',
                eco: 'Mod Eco',
                duration: 'Mod Durată',
                volume: 'Mod Volum',
            },
            sunExposure: {
                full: 'Soare Direct',
                partial: 'Umbră Parțială',
                shade: 'Umbră Totală',
            },
            scheduleTypes: {
                fullyAutomatic: 'Complet Automat',
                everyDay: 'În Fiecare Zi',
                daily: 'Zilnic',
                everyXDays: 'La fiecare {days} zile',
            },
            solarEvents: {
                sunrise: 'Răsărit',
                sunset: 'Apus',
            },
            timeDescriptions: {
                sunsetAuto: 'Apus (automat)',
                atEvent: 'La {event}',
                afterEvent: '{offset} min după {event}',
                beforeEvent: '{offset} min înainte de {event}',
            },
            days: {
                sun: 'Dum',
                mon: 'Lun',
                tue: 'Mar',
                wed: 'Mie',
                thu: 'Joi',
                fri: 'Vin',
                sat: 'Sâm',
            },
            items: {
                channel: 'Canal',
                mode: 'Mod',
                plantType: 'Tip Plantă',
                soilType: 'Tip Sol',
                sunExposure: 'Expunere Soare',
                maxVolume: 'Volum Max',
                cycleSoak: 'Ciclu & Pauză',
                coverage: 'Acoperire',
                irrigation: 'Irigare',
                schedule: 'Program',
                startTime: 'Oră Start',
            },
        },
        common: {
            continue: 'Continuă',
            cancel: 'Anulează',
            goBack: 'Înapoi',
            edit: 'Editează',
            confirm: 'Confirmă',
        },
    },
};

// All translations
export const translations: Record<Language, TranslationKeys> = {
    en,
    ro,
};

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';
