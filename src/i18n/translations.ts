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
        saving: string;
        confirm: string;
        close: string;
        loading: string;
        error: string;
        success: string;
        skip: string;
        skipAll: string;
        skipped: string;
        all: string;
        useDefaults: string;
        undo: string;
        yes: string;
        no: string;
        ok: string;
        retry: string;
        refresh: string;
        pressBackAgainToExit: string;
        showAll: string;
        showLess: string;
        continue: string;
        finish: string;
        change: string;
        selected: string;
        optional: string;
        notSet: string;
        notAvailable: string;
        warning: string;
        on: string;
        off: string;
        start: string;
        stop: string;
        edit: string;
        apply: string;
        fix: string;
        view: string;
        set: string;
        advanced: string;
        minutes: string;
        minutesShort: string;
        secondsShort: string;
        hours: string;
        hoursShort: string;
        daysShort: string;
        days: string;
        liters: string;
        litersShort: string;
        litersPerMinuteShort: string;
        mlShort: string;
        mm: string;
        mmPerHour: string;
        squareMetersShort: string;
        squareFeetShort: string;
        metersShort: string;
        degreesC: string;
        degreesF: string;
        gallonsShort: string;
        inchesShort: string;
        percent: string;
        am: string;
        pm: string;
        hPa: string;
    };

    // Labels
    labels: {
        active: string;
        inactive: string;
        unknown: string;
        none: string;
        total: string;
        totalVolume: string;
        sessions: string;
        successRate: string;
        temperature: string;
        humidity: string;
        pressure: string;
        rainfall: string;
        avg: string;
        min: string;
        max: string;
        current: string;
        daily: string;
        hourly: string;
        monthly: string;
        recent: string;
        summary: string;
        filter: string;
        clear: string;
        queue: string;
        pending: string;
        status: string;
        uptime: string;
        errors: string;
        power: string;
        flow: string;
        alarm: string;
        progress: string;
        target: string;
        time: string;
        volume: string;
        manual: string;
        schedule: string;
        remote: string;
        last: string;
        lastActive: string;
        efficiency: string;
    };

    // Soil moisture status labels
    soilMoisture: {
        optimal: string;
        fair: string;
        low: string;
    };

    // Onboarding Wizard
    wizard: {
        title: string;
        exitConfirmTitle: string;
        exitConfirmMessage: string;
        exitConfirmCancel: string;
        exitConfirmExit: string;
        zoneStepTitle: string;
        zoneProgress: string;

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
            rainCalibration: string;
            rainCompNote: string;
            powerMode: string;
            selectPowerMode: string;
            powerModes: {
                normal: string;
                lowPower: string;
                alwaysOn: string;
            };
            flowCalibration: string;
            pulsesPerLiter: string;
            flowCalibrationNote: string;
            skipToZones: string;
        };

        // Zone Configuration
        zone: {
            selectTitle: string;
            selectSubtitle: string;
            nameLabel: string;
            namePrompt: string;
            namePlaceholder: string;
            selectMode: string;
            summary: string;
            cloneTitle: string;
            cloneDescription: string;
            cloneButton: string;
            useLocationFrom: string;
            copyFrom: string;
            copyConfig: string;
            skipZone: string;
            testValve: string;
            testing: string;
            previouslyConfigured: string;
            features: string;
            quickSetupTitle: string;
            quickSetupSubtitle: string;
            featureRainComp: string;
            featureTempComp: string;
            featureCycleSoak: string;
            featurePlanted: string;
            featureVolumeLimit: string;
            featureWater: string;
            skipAllTitle: string;
            skipAllMessage: string;
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

        // Manual controls
        manual: {
            durationTitle: string;
            durationLabel: string;
            volumeTitle: string;
            volumeLabel: string;
        };

        // Compensation settings
        compensation: {
            rainTitle: string;
            rainEnable: string;
            rainDesc: string;
            sensitivity: string;
            skipThreshold: string;
            lookbackPeriod: string;
            lookbackHours: string;
            rainSummary: string;
            tempTitle: string;
            tempEnable: string;
            tempDesc: string;
            baseTemp: string;
            tempSensitivity: string;
            tempNote: string;
            tempSummary: string;
        };

        // Status labels
        status: {
            faoReadyTitle: string;
            faoReadyDesc: string;
        };

        // General wizard messages
        messages: {
            keepCurrentSettings: string;
            adjustValuesHint: string;
            skipConfiguredNote: string;
            saveOnSchedule: string;
            soilIrrigationConfigured: string;
            soilConfigured: string;
            irrigationConfigured: string;
            coverageSunConfigured: string;
            coverageConfigured: string;
            sunConfigured: string;
        };

        warnings: {
            irrigationDripPreferred: string;
            lawnSprinklerPreferred: string;
            slowSoilCycleSoak: string;
            largeArea: string;
            manyPlants: string;
            highSunExposure: string;
            lowSunExposure: string;
        };

        tutorial: {
            skip: string;
            stepProgress: string;
        };

        // Tooltip content
        tooltips: {
            exampleLabel: string;
            items: {
                fao56: { title: string; description: string; example: string; };
                fieldCapacity: { title: string; description: string; example: string; };
                wiltingPoint: { title: string; description: string; example: string; };
                infiltrationRate: { title: string; description: string; example: string; };
                cycleSoak: { title: string; description: string; example: string; };
                kc: { title: string; description: string; example: string; };
                irrigationMethod: { title: string; description: string; example: string; };
                et0: { title: string; description: string; example: string; };
                coverage: { title: string; description: string; example: string; };
                sunExposure: { title: string; description: string; example: string; };
                maxVolume: { title: string; description: string; example: string; };
                plantingDate: { title: string; description: string; example: string; };
                dripIrrigation: { title: string; description: string; example: string; };
                sprinkler: { title: string; description: string; example: string; };
                soilAutoDetect: { title: string; description: string; example: string; };
            };
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
            settings: string;
            settingsDesc: string;
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
            alreadyConfiguredDesc: string;
            coverageDenseExplanation: string;
            coverageSparseExplanation: string;
            noResultsTitle: string;
            noResultsHint: string;
            kcMeaning: string;
            kcLegendLow: string;
            kcLegendMedium: string;
            kcLegendHigh: string;
            plantsLabel: string;
        };

        // Soil Selector
        soil: {
            title: string;
            searchPlaceholder: string;
            autoDetect: string;
            detecting: string;
            detectingSource: string;
            detectedWith: string;
            confidence: string;
            confidenceHigh: string;
            confidenceMedium: string;
            confidenceLow: string;
            manualSelect: string;
            noLocation: string;
            noLocationHint: string;
            autoDetectedLabel: string;
            selectedLabel: string;
            detectionFailed: string;
            autoDetectUnavailable: string;
            manualSelectButton: string;
            manualSelectTitle: string;
            selectAnother: string;
            redetect: string;
            detectedComposition: string;
            clay: string;
            sand: string;
            silt: string;
            fieldCapacity: string;
            wiltingPoint: string;
            infiltration: string;
            availableWater: string;
            customFromGps: string;
        };

        // Irrigation Method Selector
        irrigationMethod: {
            title: string;
            searchPlaceholder: string;
            recommendedFor: string;
            recommendedBadge: string;
            efficiencyLabel: string;
            applicationRateLabel: string;
            allMethods: string;
            noResults: string;
            sortedNote: string;
            moreMethods: string;
            descriptionFallback: string;
            categories: {
                drip: string;
                sprinkler: string;
                surface: string;
                micro: string;
                manual: string;
                other: string;
            };
            descriptions: {
                dripSurface: string;
                dripSubsurface: string;
                sprinklerSet: string;
                sprinklerPopup: string;
                microspray: string;
                soaker: string;
                basinFlood: string;
                manual: string;
                furrow: string;
            };
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

        plantingDate: {
            label: string;
            helper: string;
        };

        // Schedule
        schedule: {
            enable: string;
            fao56Smart: string;
            fao56SmartDesc: string;
            autoBadge: string;
            autoSummary: string;
            configureTitle: string;
            enableTitle: string;
            enableDesc: string;
            scheduleType: string;
            daily: string;
            periodic: string;
            auto: string;
            selectDays: string;
            none: string;
            everyDay: string;
            weekdays: string;
            weekend: string;
            everyXDays: string;
            days: {
                sun: string;
                mon: string;
                tue: string;
                wed: string;
                thu: string;
                fri: string;
                sat: string;
            };
            intervalDays: string;
            startTime: string;
            startTimeDesc: string;
            solarTime: string;
            solarTimeDesc: string;
            solarEvent: string;
            sunrise: string;
            sunset: string;
            offsetMinutes: string;
            offsetPlaceholder: string;
            wateringAmount: string;
            durationMinutes: string;
            volumeLiters: string;
            summaryAuto: string;
            summaryManual: string;
            solarSuffix: string;
            autoCalculationTitle: string;
            autoCalculationDesc: string;
            evaluationLabel: string;
            evaluationDaily: string;
            estimatedDurationLabel: string;
            estimatedDuration: string;
            summaryDesc: string;
            modify: string;
            backToAuto: string;
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
            duration: string;
            volume: string;
            cycleSoak: string;
            maxVolume: string;
            location: string;
            planted: string;
            schedulePreview: string;
            schedule: string;
            finalTitle: string;
            finalCounts: string;
        };

        // Validation
        validation: {
            zoneNameRequired: string;
            zoneNameTooShort: string;
            zoneNameTooLong: string;
            coverageRequired: string;
            coverageInvalid: string;
            coverageTooHigh: string;
            plantRequired: string;
            soilRequired: string;
            irrigationRequired: string;
            soilAndIrrigationRequired: string;
            locationRequired: string;
            scheduleEnabled: string;
            durationRequired: string;
            volumeRequired: string;
            manualScheduleType: string;
        };

        // Completion
        complete: {
            title: string;
            subtitle: string;
            zonesConfigured: string;
            addAnotherZone: string;
            finishSetup: string;
            goToDashboard: string;
            zoneCompleteTitle: string;
            zoneCompleteMessage: string;
            allZonesCompleteMessage: string;
            configureMoreZones: string;
            completeSetup: string;
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

    // Plant categories (database)
    plantCategories: {
        agriculture: string;
        gardening: string;
        landscaping: string;
        indoor: string;
        succulent: string;
        fruit: string;
        vegetable: string;
        herb: string;
        lawn: string;
        shrub: string;
    };

    // Soil textures (database)
    soilTextures: {
        sand: string;
        loamySand: string;
        sandyLoam: string;
        loam: string;
        siltLoam: string;
        clayLoam: string;
        sandyClayLoam: string;
        siltyClayLoam: string;
        clay: string;
        siltyClay: string;
        sandyClay: string;
    };

    // Types
    types: {
        plant: {
            vegetables: string;
            herbs: string;
            flowers: string;
            shrubs: string;
            trees: string;
            lawn: string;
            succulents: string;
            custom: string;
        };
        soil: {
            clay: string;
            sandy: string;
            loamy: string;
            silty: string;
            rocky: string;
            peaty: string;
            pottingMix: string;
            hydroponic: string;
        };
        irrigation: {
            drip: string;
            sprinkler: string;
            soakerHose: string;
            microSpray: string;
            handWatering: string;
            flood: string;
        };
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

    // Calibration
    calibration: {
        title: string;
        introTitle: string;
        introDescription: string;
        beforeStartTitle: string;
        beforeStartItem1: string;
        beforeStartItem2: string;
        beforeStartItem3: string;
        currentCalibration: string;
        measuringTitle: string;
        measuringDescription: string;
        pulsesLabel: string;
        timeLabel: string;
        dontStopWater: string;
        volumeTitle: string;
        volumeDescription: string;
        pulsesCounted: string;
        volumeLabel: string;
        volumeHint: string;
        minVolumeError: string;
        calculate: string;
        resultTitle: string;
        pulsesPerLiterLabel: string;
        accuracyLabel: string;
        accuracyHigh: string;
        accuracyMedium: string;
        accuracyLow: string;
        summaryPulses: string;
        summaryVolume: string;
        calibrationFailed: string;
        applyFailed: string;
        completeTitle: string;
        completeDescription: string;
        errorTitle: string;
        errorDefault: string;
        retry: string;
    };

    // Errors
    errors: {
        notConnected: string;
        connectionLost: string;
        saveFailed: string;
        loadFailed: string;
        gpsFailed: string;
        gpsDenied: string;
        gpsTimeout: string;
        gpsUnavailable: string;
        gpsDeniedSuggestion: string;
        gpsTimeoutSuggestion: string;
        gpsUnavailableSuggestion: string;
        tryAgain: string;
        checkConnection: string;
        failedWithReason: string;
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
        helpLabel: string;
    };

    // Dashboard
    dashboard: {
        device: string;
        connected: string;
        otherDevices: string;
        tapToConnect: string;
        addNewDevice: string;
        online: string;
        switching: string;
        deviceNamePlaceholder: string;
        wateringActive: string;
        remaining: string;
        progress: string;
        nextWateringCycle: string;
        noScheduleConfigured: string;
        soilMoisture: string;
        temp: string;
        humidity: string;
        humidityDry: string;
        humidityNormal: string;
        rainfall24h: string;
        quickActions: string;
        manualWater: string;
        pauseSchedule: string;
        pauseResumeOnlyWhileActive: string;
        completeSetup: string;
        noZonesConfigured: string;
        title: string;
        subtitle: string;
        emergencyStop: string;
        notConnected: string;
        emergencyStopSuccess: string;
        emergencyStopFailed: string;
        connectionUplink: string;
        linked: string;
        disconnect: string;
        scanning: string;
        connecting: string;
        initiateScan: string;
        systemSetup: string;
        complete: string;
        channels: string;
        system: string;
        schedules: string;
        continueSetup: string;
        systemConfigured: string;
        allZonesConfigured: string;
        reconfigure: string;
        environmentalSensors: string;
        live: string;
        offline: string;
        rainSensorLabel: string;
        rainStatusRaining: string;
        rainStatusDry: string;
        rainStatusInactive: string;
        rainStatusUnknown: string;
        zoneActive: string;
        wateringInProgressLabel: string;
        nextScheduledRun: string;
        connectionState: {
            connected: string;
            disconnected: string;
            scanning: string;
            connecting: string;
        };
        systemStatus: {
            ok: string;
            noFlow: string;
            unexpectedFlow: string;
            fault: string;
            rtcError: string;
            lowPower: string;
            freezeLockout: string;
            unknown: string;
        };
    };

    // Health & Setup hub
    healthHub: {
        bannerTitle: string;
        title: string;
        subtitle: string;
        systemStatusTitle: string;
        setupScore: string;
        setupScoreHint: string;
        onboardingComplete: string;
        onboardingIncomplete: string;
        validateConfig: string;
        validating: string;
        validationStarted: string;
        zoneMask: string;
        scheduleMask: string;
        missingItems: string;
        missingZones: string;
        missingSchedules: string;
        deviceFlags: string;
        flagNeedsSync: string;
        flagNvsError: string;
        flagValidationError: string;
        activeIssues: string;
        allGoodTitle: string;
        allGoodDesc: string;
        noActiveAlarms: string;
        deviceHealthCta: string;
        deviceHealthCtaHint: string;
        troubleshootingCta: string;
        troubleshootingCtaHint: string;
        deviceHealth: {
            title: string;
            subtitle: string;
            diagnostics: string;
            environment: string;
            runtime: string;
            support: string;
            supportHint: string;
            bmeStatus: string;
            bmeMeasurementInterval: string;
            lastSensorReading: string;
            alarmState: string;
            lockState: string;
            lastErrorCode: string;
            copyDebugBundle: string;
            debugBundleCopied: string;
            debugBundleCopyFailed: string;
            refreshFailed: string;
            activeAlarmNone: string;
            lockNone: string;
            bmeMissing: string;
            bmeOk: string;
            bmeError: string;
            bmeDisabled: string;
            bmeUnknown: string;
        };
        troubleshooting: {
            title: string;
            subtitle: string;
            activeAlarmBanner: string;
            activeAlarmNone: string;
            openAlarmHistory: string;
            shareSteps: string;
            stepsCopied: string;
            shareUnsupported: string;
            noGuideTitle: string;
            noGuideDesc: string;
            guides: {
                noFlow: {
                    symptom: string;
                    step1: string;
                    step2: string;
                    step3: string;
                };
                unexpectedFlow: {
                    symptom: string;
                    step1: string;
                    step2: string;
                    step3: string;
                };
                highFlow: {
                    symptom: string;
                    step1: string;
                    step2: string;
                    step3: string;
                };
                mainlineLeak: {
                    symptom: string;
                    step1: string;
                    step2: string;
                    step3: string;
                };
                freezeLockout: {
                    symptom: string;
                    step1: string;
                    step2: string;
                    step3: string;
                };
            };
        };
    };

    // Analytics
    analytics: {
        title: string;
        liveData: string;
        offline: string;
        summary: {
            currentTemp: string;
            rain7d: string;
        };
    };

    // History Dashboard
    historyDashboard: {
        title: string;
        liveDataAvailable: string;
        cachedData: string;
        clearFilters: string;
        successRate: string;
        wateringSessions: string;
        avgSuffix: string;
        avgTemperature: string;
        rainyDryDays: string;
        tabs: {
            watering: string;
            environment: string;
            rainfall: string;
        };
        volumeOverTime: string;
        channelDistribution: string;
        recentSessions: string;
        noSessionsInPeriod: string;
        temperatureHumidity: string;
        minTemp: string;
        maxTemp: string;
        avgHumidity: string;
        minHumidity: string;
        maxHumidity: string;
        avgPressure: string;
        rainfallHistory: string;
        totalRainfall: string;
        dailyAverage: string;
        maxHourly: string;
        rainyDays: string;
        dryDays: string;
        longestDrySpell: string;
        historySynced: string;
        syncFailed: string;
    };

    // Statistics
    statistics: {
        title: string;
        refreshed: string;
        resetAllConfirm: string;
        resetAllTitle: string;
        resetSuccess: string;
        channelReset: string;
        noData: string;
        tapRefresh: string;
        never: string;
        timeAgoMinutes: string;
        timeAgoHours: string;
        timeAgoDays: string;
        sessionsWithLast: string;
        lastLabel: string;
        volumeDistribution: string;
    };

    // Watering History Card
    wateringHistory: {
        title: string;
        loaded: string;
        clearConfirm: string;
        cleared: string;
        noData: string;
        tapRefresh: string;
    };

    // Environmental History Card
    envHistory: {
        title: string;
        loaded: string;
        clearConfirm: string;
        cleared: string;
        last24Hours: string;
        last7Days: string;
        noHourlyData: string;
        noDailyData: string;
    };

    // Rain History Card
    rainHistory: {
        title: string;
        loaded: string;
        clearConfirm: string;
        cleared: string;
        calibrateTitle: string;
        calibrateConfirm: string;
        calibrateStarted: string;
        lastHour: string;
        last24Hours: string;
        last7Days: string;
        noHourlyData: string;
        noDailyData: string;
        last24HoursMax: string;
        last7DaysTotal: string;
    };

    // Task Control
    taskControl: {
        title: string;
        commandSent: string;
        queueStatus: string;
        totalDispensed: string;
        noActiveTask: string;
        tasksWaiting: string;
        completedToday: string;
        activeId: string;
        actions: {
            pause: string;
            resume: string;
            stop: string;
            startNext: string;
            clearQueue: string;
        };
        status: {
            running: string;
            paused: string;
            idle: string;
        };
    };

    // Diagnostics
    diagnostics: {
        title: string;
        refreshed: string;
        mainsPower: string;
        activeValves: string;
        queuePending: string;
        alarmClear: string;
        alarmActive: string;
        lastError: string;
        errorCode: string;
        systemStatus: {
            ok: string;
            noFlow: string;
            unexpectedFlow: string;
            fault: string;
            rtcError: string;
            lowPower: string;
            unknown: string;
        };
        wateringErrors: {
            invalidParam: string;
            notInitialized: string;
            hardware: string;
            busy: string;
            queueFull: string;
            timeout: string;
            config: string;
            rtcFailure: string;
            storage: string;
            dataCorrupt: string;
            invalidData: string;
            bufferFull: string;
            noMemory: string;
        };
    };

    // Charts
    charts: {
        noDistributionData: string;
        noEnvironmentalData: string;
        noRainData: string;
        noWateringData: string;
        share: string;
        maxPerHour: string;
        tempMax: string;
        tempMin: string;
        tempAvg: string;
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
        activeCount: string;
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
        reasonSlope: string;
        reasonSlow: string;
        reasonFast: string;
        educationIntro: string;
        educationStepCycle: string;
        educationStepSoak: string;
        educationStepRepeat: string;
        educationTip: string;
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
        calculationStepRaw: string;
        calculationStepVolume: string;
        simpleCalculation: string;
        rangeMin: string;
        rangeMax: string;
        educationIntro: string;
        educationTip: string;
    };

    // Zone Details
    zoneDetails: {
        notConfigured: string;
        notScheduled: string;
        wateringActive: string;
        idle: string;
        nextWatering: string;
        todayAt: string;
        tomorrowAt: string;
        dayAt: string;
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
        skipNextNotAvailable: string;
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
        zone: string;
        tapToConfigure: string;
        zoneNotConfiguredTitle: string;
        zoneNotConfiguredDesc: string;
        configureZone: string;
        quickWater: string;
        manualOverride: string;
        editSettings: string;
        dry: string;
        wet: string;
        quickWateringTitle: string;
        configureZoneTitle: string;
        zoneSettingsTitle: string;
        startManualWatering: string;
        sectionGeneral: string;
        sectionWateringMode: string;
        sectionPlantSoil: string;
        sectionCoverageSun: string;
        sectionAdvanced: string;
        sectionSchedule: string;
        changePlantSoil: string;
        scheduleEnabled: string;
        scheduleFao56: string;
        scheduleEvery: string;
        scheduleDays: string;
        scheduleAutoNote: string;
        stepProgress: string;
        coverageArea: string;
        coverageByArea: string;
        coverageByPlants: string;
        directSunlight: string;
        waterFor: string;
        pauseFor: string;
        locationNote: string;
        selectPlantingDate: string;
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
            customBadge: string;
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
            applicationRate: string;
        };
        wateringMode: {
            title: string;
            subtitle: string;
            nextStepTip: {
                title: string;
                text: string;
            };
            badges: {
                faoQuality: string;
                faoEco: string;
                manual: string;
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

    navigation: {
        home: string;
        zones: string;
        aiDoctor: string;
        history: string;
        settings: string;
        marketplace: string;
    };

    marketplace: {
        title: string;
        browse: string;
        plants: string;
        packs: string;
        search: string;
        searchPlaceholder: string;
        aiSearch: string;
        aiSearchHint: string;
        aiSearchPlaceholder: string;
        searchFailed: string;
        aiAnswer: string;
        suggestedQueries: string;
        searchSuggestionIndoorLowLight: string;
        searchSuggestionDroughtSucculents: string;
        searchSuggestionTomatoFao56: string;
        searchSuggestionMediterraneanHerbs: string;
        allCategories: string;
        newest: string;
        topRated: string;
        mostDownloaded: string;
        loadMore: string;
        noResults: string;
        createPlant: string;
        editPlant: string;
        newPlant: string;
        saveDraft: string;
        submitForReview: string;
        signInRequired: string;
        details: string;
        reviews: string;
        comments: string;
        writeReview: string;
        writeComment: string;
        addComment: string;
        reply: string;
        install: string;
        installed: string;
        installAll: string;
        remove: string;
        category: string;
        selectCategory: string;
        scientificName: string;
        commonNameEn: string;
        commonNameRo: string;
        placeholderScientificName: string;
        placeholderCommonNameEn: string;
        placeholderCommonNameRo: string;
        placeholderTags: string;
        descriptionEn: string;
        descriptionRo: string;
        tags: string;
        images: string;
        addImages: string;
        technicalData: string;
        aiFillGaps: string;
        translateEnToRo: string;
        translateRoToEn: string;
        myLibrary: string;
        myPlants: string;
        authorProfile: string;
        publishedPlants: string;
        noPlants: string;
        noAuthoredPlants: string;
        noFilteredPlants: string;
        createFirst: string;
        plantChat: string;
        chatWelcome: string;
        chatHint: string;
        chatPlaceholder: string;
        chatError: string;
        packNotFound: string;
        plantsInPack: string;
        downloads: string;
        views: string;
        rating: string;
        synced: string;
        pendingSync: string;
        askAi: string;
        viewAuthor: string;
        aiSearchTitle: string;
        askAiSubtitle: string;
        browseMarketplace: string;
        collections: string;
        emptyLibrary: string;
        noComments: string;
        noDescription: string;
        generatingDescription: string;
        noPacks: string;
        noReviews: string;
        notSynced: string;
        packsTab: string;
        plantsInLibrary: string;
        storageUsed: string;
        plantsTab: string;
        reviewBody: string;
        reviewTitle: string;
        searchWithAi: string;
        sortNewest: string;
        sortPopular: string;
        sortTopRated: string;
        submitReview: string;
        trySearching: string;
        // Device sync
        libraryTab: string;
        onDeviceTab: string;
        syncToDevice: string;
        syncAllToDevice: string;
        removeFromDevice: string;
        syncingToDevice: string;
        syncSuccess: string;
        syncFailed: string;
        noDevicePlants: string;
        devicePlantsCount: string;
        connectDeviceToSync: string;
        publishToMarketplace: string;
        publishDescription: string;
        romPlant: string;
        customPlant: string;
        devicePlantId: string;
        romPlantId: string;
        onDevice: string;
        updateOnDevice: string;
        plantsCount: string;
        // Unified grid + device filter
        filterAll: string;
        filterOnDevice: string;
        filterNotInstalled: string;
        deviceOffline: string;
        // Detail page tabs
        overviewTab: string;
        guideTab: string;
        deviceTab: string;
        // Growing guide
        noGrowingData: string;
        cropCoefficients: string;
        cropCoefficientsHint: string;
        growthStages: string;
        growthStagesOngoingSummary: string;
        growthStagesOngoingOnlySummary: string;
        growthStagesOngoingHint: string;
        stageOngoingShort: string;
        stageOngoingLabel: string;
        stageMaturityLabel: string;
        stageIni: string;
        stageDev: string;
        stageMid: string;
        stageEnd: string;
        kcInitialLabel: string;
        kcMidLabel: string;
        kcEndLabel: string;
        kcDevLabel: string;
        rootAndSoil: string;
        rootDepthLabel: string;
        rootDepthHint: string;
        growingConditions: string;
        optimalTempLabel: string;
        optimalTempHint: string;
        fromValueTemplate: string;
        upToValueTemplate: string;
        soilPhLabel: string;
        soilPhHint: string;
        frostToleranceHint: string;
        droughtLabel: string;
        shadeLabel: string;
        salinityLabel: string;
        toleranceLow: string;
        toleranceMedium: string;
        toleranceHigh: string;
        droughtHintLow: string;
        droughtHintMedium: string;
        droughtHintHigh: string;
        shadeHintLow: string;
        shadeHintMedium: string;
        shadeHintHigh: string;
        salinityHintLow: string;
        salinityHintMedium: string;
        salinityHintHigh: string;
        indoorSuitableLabel: string;
        criticalStageLabel: string;
        criticalStageEstLabel: string;
        criticalStageGenericLabel: string;
        criticalStageHint: string;
        moreInfoLabel: string;
        careGuideTitle: string;
        technicalDetails: string;
        technicalDetailsDesc: string;
        otherParameters: string;
        growthCycleAnnual: string;
        growthCyclePerennial: string;
        growthCycleBiennial: string;
        primaryUseOrnamental: string;
        primaryUseFood: string;
        primaryUseFruit: string;
        primaryUseVegetable: string;
        primaryUseHerb: string;
        primaryUseMedicinal: string;
        primaryUseAromatic: string;
        primaryUseForage: string;
        primaryUseLawn: string;
        primaryUseTimber: string;
        primaryUseIndustrial: string;
        irrigMethodDrip: string;
        irrigMethodSprinkler: string;
        irrigMethodSurface: string;
        irrigMethodManual: string;
        irrigMethodRainfed: string;
        // Device tab detail
        deviceVersion: string;
        removedFromDevice: string;
        confirmRemoveFromDevice: string;
        daysLabel: string;
        totalLabel: string;
        connectToManage: string;
        notOnDevice: string;
        builtInPlant: string;
        builtInPlantDesc: string;
        upToDate: string;
        updateAvailable: string;
        quickFacts: string;
        qfCycle: string;
        qfTemp: string;
        qfFrost: string;
        qfWater: string;
        qfIndoor: string;
        qfUse: string;
        qfIrrigation: string;
        qfHigh: string;
        qfMedium: string;
        qfLow: string;
        qfWaterHigh: string;
        qfWaterMedium: string;
        qfWaterLow: string;
        status: {
            all: string;
            draft: string;
            pending_review: string;
            approved: string;
            rejected: string;
        };
    };

    admin: {
        title: string;
        subtitle: string;
        accessDenied: string;
        accessDeniedDesc: string;
        totalPlants: string;
        pendingReview: string;
        approved: string;
        rejected: string;
        totalPacks: string;
        totalUsers: string;
        totalReviews: string;
        totalDownloads: string;
        moderationQueue: string;
        moderationDesc: string;
        plantManager: string;
        plantManagerDesc: string;
        filterPending: string;
        filterFlagged: string;
        filterAll: string;
        queueEmpty: string;
        aiScore: string;
        accuracy: string;
        completeness: string;
        quality: string;
        aiRecommends: string;
        aiReview: string;
        approve: string;
        reject: string;
        noPlantsFound: string;
        loading: string;
        loadMore: string;
        draft: string;
        authorLabel: string;
    };

    timePicker: {
        selectTime: string;
        hour: string;
        minute: string;
    };

    qrSharing: {
        title: string;
        share: string;
        scan: string;
        shareTitle: string;
        shareFailed: string;
        generateFailed: string;
        copyFailed: string;
        zonesToShare: string;
        scanWithDevice: string;
        copied: string;
        copyData: string;
        includedTitle: string;
        includedItem: string;
        qrCodeAlt: string;
        scanUnavailable: string;
        scanPasteHint: string;
        pasteFromClipboard: string;
        invalidData: string;
    };

    alarmCard: {
        names: {
            noAlarm: string;
            noFlow: string;
            unexpectedFlow: string;
            freezeProtection: string;
            highFlow: string;
            lowFlow: string;
            mainlineLeak: string;
            zoneLocked: string;
            systemLocked: string;
            unknown: string;
        };
        descriptions: {
            noAlarm: string;
            noFlow: string;
            unexpectedFlow: string;
            freezeProtection: string;
            highFlow: string;
            lowFlow: string;
            mainlineLeak: string;
            zoneLocked: string;
            systemLocked: string;
            unknown: string;
        };
        detailTokens: {
            freezeTempLow: string;
            freezeTempStale: string;
        };
        detailedDescriptions: {
            noAlarm: string;
            noFlow: string;
            noFlowZone: string;
            unexpectedFlow: string;
            freezeProtection: string;
            highFlow: string;
            highFlowZone: string;
            lowFlow: string;
            lowFlowZone: string;
            mainlineLeak: string;
            zoneLocked: string;
            zoneLockedZone: string;
            systemLocked: string;
            unknown: string;
        };
        cleared: string;
        codeLabel: string;
        dataLabel: string;
        occurredLabel: string;
        clearTitle: string;
        clearConfirmMessage: string;
    };

    alarmPopup: {
        cleared: string;
        retryIn: string;
        dismiss: string;
        clearing: string;
        clearAlarm: string;
        viewHistory: string;
    };

    alarmHistory: {
        title: string;
        emptyTitle: string;
        emptyMessage: string;
        active: string;
        cleared: string;
        clearedAt: string;
        clearAlarm: string;
        clearAll: string;
        clearAllTitle: string;
        clearAllConfirmMessage: string;
        clearAllConfirmWord: string;
        testZone30s: string;
        testZoneRunningTitle: string;
        testZoneRunningMessage: string;
        emergencyStop: string;
        testZoneCompleted: string;
        time: {
            unknown: string;
            justNow: string;
            minutesAgo: string;
            hoursAgo: string;
            daysAgo: string;
        };
    };

    deviceSelector: {
        title: string;
        searchPlaceholder: string;
        noDevices: string;
        current: string;
        lastSeen: string;
        unknown: string;
        online: string;
        offline: string;
        addDevice: string;
    };

    mobileConfirm: {
        typeToConfirm: string;
    };

    mobileConnectionSuccess: {
        title: string;
        subtitle: string;
        deviceId: string;
        continueSetup: string;
        skipToDashboard: string;
    };

    mobileDeviceInfo: {
        title: string;
        systemStatus: string;
        signalStrength: string;
        signalExcellent: string;
        signalGood: string;
        signalFair: string;
        signalWeak: string;
        uptime: string;
        battery: string;
        errors: string;
        model: string;
        softwareHardware: string;
        firmwareVersion: string;
        serialNumber: string;
        checkUpdates: string;
        rebootDevice: string;
        rebootTitle: string;
        rebootMessage: string;
        rebootConfirm: string;
        rebootNotAvailable: string;
    };

    mobileDeviceReset: {
        title: string;
        warningTitle: string;
        warningBody: string;
        sectionLabel: string;
        helpTitle: string;
        helpBody: string;
        helpAction: string;
        confirmTitle: string;
        confirmReset: string;
        confirmFactory: string;
        confirmWord: string;
        factoryResetTitle: string;
        processing: string;
        resetting: string;
        progressComplete: string;
        retryAttempt: string;
        resetSuccess: string;
        resetFailed: string;
        options: {
            settings: { name: string; description: string; details: string; };
            schedule: { name: string; description: string; details: string; };
            stats: { name: string; description: string; details: string; };
            full: { name: string; description: string; details: string; };
        };
        wipeSteps: {
            prepare: string;
            resetChannels: string;
            resetSystem: string;
            resetCalibration: string;
            clearRainHistory: string;
            clearEnvHistory: string;
            clearOnboarding: string;
            verify: string;
            done: string;
        };
    };

    mobileDeviceScan: {
        title: string;
        scanning: string;
        scanComplete: string;
        scanHint: string;
        availableDevices: string;
        looking: string;
        noneFound: string;
        connecting: string;
        connect: string;
        cantFind: string;
        scanningShort: string;
        restartScan: string;
        defaultDeviceName: string;
        signalLabel: string;
        signal: {
            unknown: string;
            excellent: string;
            strong: string;
            fair: string;
            weak: string;
        };
    };

    mobileDeviceSettings: {
        title: string;
        groups: {
            deviceConfiguration: string;
            powerPerformance: string;
            maintenance: string;
        };
        items: {
            deviceInfo: { label: string; subtitle: string; };
            flowCalibration: { label: string; subtitle: string; };
            masterValve: { label: string; subtitle: string; };
            rainSensor: { label: string; subtitle: string; };
            powerMode: { label: string; subtitle: string; };
            resetOptions: { label: string; subtitle: string; };
            timeLocation: { label: string; subtitle: string; };
            packsPlants: { label: string; subtitle: string; subtitleWithCount: string; };
        };
    };

    firmwareUpdate: {
        checking: string;
        upToDate: string;
        available: string;
        install: string;
        backendNotConfigured: string;
        connectDeviceFirst: string;
        stopWateringFirst: string;
        otaChannel: string;
        hardwareBoard: string;
        latestRelease: string;
        versionLabel: string;
        packageSize: string;
        releaseNotes: string;
        downloadAndInstall: string;
        uploadedSummary: string;
        targetVersion: string;
        runningVersion: string;
        downloadingPackage: string;
        startingTransfer: string;
    };

    mobileFlowCalibration: {
        title: string;
        currentCalibration: string;
        wizardTitle: string;
        steps: {
            selectZone: { title: string; desc: string; };
            prepareContainer: { title: string; desc: string; };
            runCalibration: { title: string; desc: string; };
            enterVolume: { title: string; desc: string; };
        };
        selectZone: string;
        selectZoneAlert: string;
        startCalibration: string;
        startFailed: string;
        runningZone: string;
        stopAndMeasure: string;
        pulsesLabel: string;
        pulsesDetected: string;
        enterCollectedVolume: string;
        litersLabel: string;
        recalculate: string;
        calculatedValue: string;
        saveCalibration: string;
        saving: string;
        saveFailed: string;
        saveManual: string;
        saveManualFailed: string;
        manualEntry: string;
        completeTitle: string;
        collectedPulses: string;
        calculateFailed: string;
        recalibrate: string;
        pulsesPerLiter: string;
    };

    mobileHelpAbout: {
        title: string;
        appName: string;
        appTagline: string;
        versionBuild: string;
        linkNotConfigured: string;
        helpSection: {
            title: string;
            userGuide: { title: string; subtitle: string; };
            faq: { title: string; subtitle: string; };
            contact: { title: string; subtitle: string; };
            reportBug: { title: string; subtitle: string; };
        };
        legalSection: {
            title: string;
            terms: string;
            privacy: string;
            licenses: string;
        };
        footerLine1: string;
        footerLine2: string;
    };

    mobileHistory: {
        title: string;
        tabs: {
            watering: string;
            environment: string;
            rain: string;
        };
        timeFrames: {
            day: string;
            week: string;
            month: string;
        };
        timeFrameRanges: {
            day: string;
            week: string;
            month: string;
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
        totalConsumption: string;
        totalRainfall: string;
        averageValues: string;
        sessions: string;
        events: string;
        readings: string;
        skipped: string;
        currentTemp: string;
        currentHumidity: string;
        temperatureLabel: string;
        humidityLabel: string;
        noWateringData: string;
        noEnvironmentData: string;
        noRainData: string;
        allZones: string;
        units: {
            mm: string;
        };
    };

    mobileManageDevices: {
        title: string;
        currentDevice: string;
        otherDevices: string;
        activeBadge: string;
        connectedVia: string;
        connectionTypes: {
            wifi: string;
            bluetooth: string;
        };
        lastSync: {
            label: string;
            justNow: string;
            minutesAgo: string;
            hoursAgo: string;
        };
        signalStrength: {
            label: string;
            excellent: string;
            good: string;
            fair: string;
            weak: string;
        };
        status: {
            online: string;
            standby: string;
            offline: string;
        };
        deviceLine: string;
        addController: string;
        emptyTitle: string;
        emptyMessage: string;
    };

    mobileMasterValve: {
        title: string;
        subtitle: string;
        masterLabel: string;
        delayBefore: string;
        delayBeforeHint: string;
        delayAfter: string;
        delayAfterHint: string;
        timingHint: string;
        timingVisualization: string;
        save: string;
        saving: string;
        saveFailed: string;
    };

    mobileNoDevices: {
        title: string;
        subtitle: string;
        addDevice: string;
        needHelp: string;
        appName: string;
    };

    mobileNotifications: {
        title: string;
        clearAll: string;
        alarms: string;
        filters: {
            all: string;
            errors: string;
            warnings: string;
            info: string;
        };
        sections: {
            today: string;
            yesterday: string;
            lastWeek: string;
        };
        days: {
            sun: string;
            mon: string;
        };
        emptyTitle: string;
        emptyMessage: string;
        mock: {
            irrigationCompleted: { title: string; message: string; };
            irrigationCompletedShort: { message: string; };
            moistureAlert: { title: string; message: string; };
            scheduleSkipped: { title: string; message: string; };
            firmwareUpdated: { title: string; message: string; };
            connectionLost: { title: string; message: string; };
        };
    };

    mobileOnboardingWizard: {
        deviceName: {
            title: string;
            subtitle: string;
            placeholder: string;
            defaultName: string;
        };
        timeSync: {
            title: string;
            subtitle: string;
            currentTime: string;
            autoSync: string;
        };
        masterValve: {
            title: string;
            subtitle: string;
            delayBefore: string;
            delayAfter: string;
            preDelayHint: string;
            postDelayHint: string;
        };
        selectZones: {
            title: string;
            subtitle: string;
            loading: string;
            status: {
                configured: string;
                willConfigure: string;
                tapToEnable: string;
            };
            selected: string;
            selectedSingle: string;
            toConfigure: string;
        };
        summary: {
            title: string;
            subtitle: string;
            deviceNameLabel: string;
            masterValveLabel: string;
            zonesConfiguredLabel: string;
            enabled: string;
            disabled: string;
            zonesCount: string;
            zonesCountSingle: string;
            allSetTitle: string;
            allSetBody: string;
        };
        actions: {
            continue: string;
            configureZones: string;
            goToDashboard: string;
        };
        zoneNumber: string;
    };

    mobilePermissions: {
        enableTitle: string;
        enabledTitle: string;
        required: string;
        permissions: {
            bluetooth: { name: string; description: string; };
            location: { name: string; description: string; };
            notifications: { name: string; description: string; };
        };
        allow: string;
        skipAll: string;
        skipForNow: string;
        getStarted: string;
        footerNote: string;
    };

    mobilePowerMode: {
        title: string;
        powerSource: string;
        currentBattery: string;
        mains: string;
        externalPower: string;
        batteryGood: string;
        batteryLow: string;
        selectPowerMode: string;
        infoNote: string;
        apply: string;
        saving: string;
        saveFailed: string;
        modes: {
            performance: {
                name: string;
                description: string;
                features: {
                    update15: string;
                    bleInstant: string;
                    fullLogging: string;
                };
            };
            balanced: {
                name: string;
                description: string;
                features: {
                    update30: string;
                    bleNormal: string;
                    standardLogging: string;
                };
            };
            eco: {
                name: string;
                description: string;
                features: {
                    updateHourly: string;
                    bleReduced: string;
                    minimalLogging: string;
                };
            };
        };
    };

    mobileSettings: {
        title: string;
        autoWaterDevice: string;
        statusLabel: string;
        statusOnline: string;
        statusOffline: string;
        switchDevice: string;
        sectionAccount: string;
        profile: string;
        guest: string;
        deviceSettings: string;
        zoneConfiguration: string;
        wateringSchedules: string;
        rainDelay: string;
        notifications: string;
        alarms: string;
        helpCenter: string;
        firmware: string;
        about: string;
        account: string;
        premium: string;
        aiDoctor: string;
        sectionDeviceConfiguration: string;
        sectionAppPreferences: string;
        sectionCustomization: string;
        sectionSupport: string;
        appearance: string;
        themeDark: string;
        themeLight: string;
        language: string;
        selectLanguage: string;
        units: string;
        selectUnits: string;
        metric: string;
        imperial: string;
        disconnectDevice: string;
        appVersion: string;
    };

    mobileAuth: {
        titleAccount: string;
        titleLogin: string;
        titleSignup: string;
        titleConfirm: string;
        signedInUserFallback: string;
        firebaseNotConfiguredTitle: string;
        firebaseNotConfiguredSubtitle: string;
        loading: string;
        planLabel: string;
        planPremium: string;
        planFree: string;
        openProfile: string;
        manageSubscription: string;
        continueTo: string;
        signOut: string;
        accessTitle: string;
        accessSubtitle: string;
        tabLogin: string;
        tabSignup: string;
        continueWithGoogle: string;
        emailLabel: string;
        emailPlaceholder: string;
        passwordLabel: string;
        passwordPlaceholder: string;
        passwordPolicyHint: string;
        confirmPasswordLabel: string;
        confirmPasswordPlaceholder: string;
        submitLogin: string;
        submitSignup: string;
        submitConfirm: string;
        errorEmailPasswordRequired: string;
        errorEmailInvalid: string;
        errorPasswordsDontMatch: string;
        errorPasswordPolicy: string;
        errorConfirmationCodeRequired: string;
        errorAuthFailed: string;
        confirmCodeTitle: string;
        confirmCodeSubtitle: string;
        confirmationCodeLabel: string;
        confirmationCodePlaceholder: string;
        confirmCodeSentHint: string;
        confirmCodeResentHint: string;
        resendCode: string;
        backToLogin: string;
        guestTitle: string;
        guestTitleActive: string;
        continueAsGuest: string;
        exitGuestMode: string;
    };

    mobilePremium: {
        title: string;
        cardTitle: string;
        cardSubtitle: string;
        checkoutSuccess: string;
        checkoutCancelled: string;
        errorCheckoutFailed: string;
        errorBillingPortalFailed: string;
        backendNotConfiguredTitle: string;
        backendNotConfiguredSubtitle: string;
        loginRequired: string;
        goToLogin: string;
        statusPremiumActive: string;
        statusFreePlan: string;
        statusLabel: string;
        statusUnknown: string;
        planLabel: string;
        renewsLabel: string;
        syncing: string;
        manageSubscription: string;
        upgradeMonthly: string;
        refreshStatus: string;
        working: string;
        includedTitle: string;
        includedResetNote: string;
        featurePlantId: string;
        featurePlantIdDescription: string;
        featureAiDoctor: string;
        featureAiDoctorDescription: string;
        perDay: string;
        perMonth: string;
    };

    mobileUpsell: {
        title: string;
        subtitle: string;
        loginToUpgrade: string;
        upgradeNow: string;
        buyPremium: string;
        back: string;
        notNow: string;
        disclaimer: string;
    };

    mobileProfile: {
        title: string;
        emailStatus: string;
        emailVerified: string;
        emailNotVerified: string;
        loading: string;
        messageProfileUpdated: string;
        messageVerificationSent: string;
        messagePasswordUpdated: string;
        errorProfileUpdateFailed: string;
        errorVerificationFailed: string;
        errorPasswordMismatch: string;
        errorPasswordChangeFailed: string;
        errorDeleteTypeDelete: string;
        errorDeleteFailed: string;
        sectionProfileDetails: string;
        placeholderDisplayName: string;
        placeholderPhone: string;
        placeholderCompany: string;
        placeholderCountry: string;
        saveProfile: string;
        saving: string;
        sectionSecurity: string;
        sendVerificationEmail: string;
        placeholderCurrentPassword: string;
        placeholderNewPassword: string;
        placeholderConfirmNewPassword: string;
        changePassword: string;
        sectionAccountActions: string;
        signOut: string;
        deleteAccountTitle: string;
        deleteAccountHint: string;
        placeholderDeletePassword: string;
        placeholderTypeDelete: string;
        deleteAccountButton: string;
        deleting: string;
        working: string;
    };

    mobileAiDoctor: {
        title: string;
        cardTitle: string;
        cardSubtitle: string;
        notConfiguredTitle: string;
        notConfiguredSubtitle: string;
        premiumOnlyTitle: string;
        upgradeToPremium: string;
        checkingSubscription: string;
        chooseLeafPhoto: string;
        previewAlt: string;
        symptomsLabel: string;
        symptomsPlaceholder: string;
        analyzing: string;
        analyzeButton: string;
        diagnosisFailedTitle: string;
        unknownPlant: string;
        confidenceLabel: string;
        healthStatusLabel: string;
        healthLikelyHealthy: string;
        healthPossibleDisease: string;
        healthUnknown: string;
        diseaseCandidatesTitle: string;
        diseaseCandidatesEmpty: string;
        followUpQuestionTitle: string;
        aiTreatmentGuidanceTitle: string;
        disclaimer: string;
    };

    mobilePlantId: {
        loginRequired: string;
        checkingSubscription: string;
        premiumOnly: string;
        noLocalMatch: string;
        identificationFailed: string;
        reviewTitle: string;
        reviewAmbiguous: string;
        reviewNoLocal: string;
        detectedByCamera: string;
        matchConfidence: string;
        suggestedLocal: string;
        chooseManually: string;
        useThis: string;
        matchSaved: string;
    };

    mobilePacksSettings: {
        syncError: string;
        title: string;
        loading: string;
        tabs: {
            plants: string;
            packs: string;
        };
        storage: {
            flash: string;
            romPlants: string;
            customPlants: string;
        };
        plants: {
            builtIn: string;
            installed: string;
        };
        labels: {
            id: string;
            version: string;
            pack: string;
        };
        customPlants: {
            title: string;
            empty: string;
            emptyHint: string;
            create: string;
        };
        romPlants: {
            title: string;
            plantsCount: string;
            showMore: string;
        };
        packs: {
            installed: string;
            empty: string;
            emptyHint: string;
        };
        updates: {
            checking: string;
            check: string;
            upToDate: string;
            available: string;
        };
        plantDetails: {
            plantId: string;
            packId: string;
            version: string;
            bleOnlyNote: string;
            cropCoefficients: string;
            growthStages: string;
            stageIni: string;
            stageDev: string;
            stageMid: string;
            stageEnd: string;
            rootDepth: string;
            depletionFraction: string;
            tolerances: string;
            droughtTolerance: string;
            shadeTolerance: string;
            salinityTolerance: string;
            recommendedMethod: string;
            close: string;
        };
        packDetails: {
            plantsInPack: string;
            noPlants: string;
            close: string;
        };
    };

    mobileTimeLocation: {
        title: string;
        deviceTime: string;
        syncing: string;
        syncNow: string;
        syncSuccess: string;
        syncFailed: string;
        timezone: string;
        timezones: {
            bucharest: string;
            london: string;
            berlin: string;
            newYork: string;
            losAngeles: string;
            custom: string;
        };
        utcOffset: string;
        dst: {
            sectionTitle: string;
            toggleTitle: string;
            disabledHint: string;
            summary: string;
            weekNth: string;
            weekLast: string;
        };
        advancedTitle: string;
        advancedSubtitle: string;
        advanced: {
            utcOffsetMinutes: string;
            dstOffsetMinutes: string;
            dstStart: string;
            dstEnd: string;
        };
        locationCoordinates: string;
        latitude: string;
        longitude: string;
        degrees: string;
        getLocation: string;
        locationHint: string;
        locationFailed: string;
        saving: string;
        saveSettings: string;
        saveSuccess: string;
        saveFailed: string;
    };

    mobileRainSensor: {
        title: string;
        updated: string;
        loadFailed: string;
        statusTitle: string;
        sensorActive: string;
        sensorInactive: string;
        lastPulse: string;
        never: string;
        rainLast24h: string;
        rainLastHour: string;
        enableTitle: string;
        enableSubtitle: string;
        integrationTitle: string;
        integrationSubtitle: string;
        calibrationTitle: string;
        calibrationHint: string;
        calibrate: string;
        mmPerPulse: string;
        debounceMs: string;
        advancedTitle: string;
        sensitivityPct: string;
        skipThresholdMm: string;
        advancedHint: string;
        saving: string;
        save: string;
        saveSuccess: string;
        saveFailed: string;
        calibrationRequested: string;
        calibrationFailed: string;
    };

    mobileWeatherDetails: {
        title: string;
        updated: string;
        soilMoisture: {
            title: string;
            wateringNeeded: string;
            wateringSkipped: string;
            sufficient: string;
            consider: string;
        };
        soilMoistureOverride: {
            title: string;
            subtitle: string;
            enabledLabel: string;
            valueLabel: string;
            scopeGlobal: string;
            globalDerived: string;
            modelTitle: string;
            modelValue: string;
            modelNoLocation: string;
            modelNoSoilParams: string;
            modelFailed: string;
            modelSetLocation: string;
            modelSetSoil: string;
            hint: string;
            reset: string;
            notConnected: string;
            loadFailed: string;
            saveFailed: string;
        };
        zoneOverview: string;
        temperature: string;
        highLabel: string;
        dewLabel: string;
        humidity: string;
        last24h: string;
        rainfall: string;
        windDirection: string;
        windSpeed: string;
        forecast: {
            title: string;
            rainPercent: string;
            temp: string;
        };
        forecastLabels: {
            now: string;
            plus3h: string;
            plus6h: string;
            plus12h: string;
            plus24h: string;
        };
        units: {
            mm: string;
            kmh: string;
        };
    };

    mobileWelcome: {
        appName: string;
        tagline: string;
        connectingTo: string;
        savedDevices: string;
        lastConnected: string;
        addNewDevice: string;
        setupNewDevice: string;
        terms: string;
    };

    mobileZoneConfig: {
        title: string;
        zoneNotFound: string;
        zoneName: string;
        zoneNamePlaceholder: string;
        plantType: string;
        selectPlant: string;
        cropCoefficient: string;
        soilType: string;
        selectSoil: string;
        sunExposure: string;
        sun: {
            full: string;
            fullDesc: string;
            partial: string;
            partialDesc: string;
            shade: string;
            shadeDesc: string;
        };
        areaSize: string;
        areaUnit: string;
        calculatedSettings: string;
        autoBadge: string;
        dailyWaterNeed: string;
        recommendedCycle: string;
        frequency: string;
        everyTwoDays: string;
        advancedSettings: string;
        save: string;
        selectPlantTitle: string;
        searchPlants: string;
        noPlants: string;
        selectSoilTitle: string;
        searchSoils: string;
        noSoils: string;
    };

    mobileZoneDetails: {
        title: string;
        zoneNotFound: string;
        loadingZone: string;
        general: string;
        waterNeedLow: string;
        waterNeedNormal: string;
        waterNeedHigh: string;
        waterNeedSuffix: string;
        remainingLabel: string;
        idleLabel: string;
        nextSchedule: string;
        quickActions: string;
        skipNext: string;
        healthStats: string;
        soilMoisture: string;
        lastRunUsage: string;
        watering: string;
        startManualCycle: string;
        plantTitle: string;
        plantId: string;
        soilId: string;
        methodId: string;
        customSoilName: string;
        customSatellite: string;
        typeValue: string;
        modeValue: string;
        everyXDays: string;
        inlineSeparator: string;
        smartStatsTitle: string;
        needBadge: string;
        calculatedVolume: string;
        stageLabel: string;
        afterPlanting: string;
        rainBenefit: string;
        waterDeficit: string;
        waterManagement: string;
        savedToDevice: string;
        intervalModeLoadFailed: string;
        intervalModeUnsupported: string;
        manualControl: string;
        advancedZoneControls: string;
        tapToStartCycle: string;
        resetConfirmBody: string;
        wateringModeTitle: string;
        wateringModeSubtitle: string;
        wateringModeSmartDesc: string;
        wateringModeManualDesc: string;
        smartAutoTitle: string;
        recommendedBadge: string;
        smartAutoDesc: string;
        smartEcoTitle: string;
        waterSaverBadge: string;
        smartEcoDesc: string;
        fixedDurationDesc: string;
        fixedVolumeDesc: string;
        scheduleActiveTitle: string;
        scheduleActiveSubtitle: string;
        wateringDaysLabel: string;
        startTimeLabel: string;
        solarTimingTitle: string;
        solarTimingSubtitle: string;
        allLabel: string;
        cameraTitle: string;
        cameraSubtitle: string;
        cameraComingSoon: string;
        browseDatabase: string;
        searchPlantsPlaceholder: string;
        soilTitle: string;
        detectFromGpsTitle: string;
        detectFromGpsSubtitle: string;
        soilDetectUnavailable: string;
        soilDetectGpsDenied: string;
        soilDetectNotAvailable: string;
        soilDetectFailed: string;
        noCustomSoilProfile: string;
        customSoilTitle: string;
        customSoilGps: string;
        customSoilSaved: string;
        customSoilEnabled: string;
        soilComposition: string;
        disableButton: string;
        orSelectType: string;
        satelliteDetectedTitle: string;
        satelliteDetectedSubtitle: string;
        searchSoilPlaceholder: string;
        irrigationTitle: string;
        irrigationSubtitle: string;
        efficiencyLabel: string;
        applicationRateLabel: string;
        coverageTitle: string;
        coverageQuestion: string;
        coverageAreaLabel: string;
        coverageAreaDesc: string;
        coveragePlantsLabel: string;
        coveragePlantsDesc: string;
        units: {
            mm: string;
            mmPerDay: string;
            days: string;
            squareMeters: string;
            plants: string;
        };
        quickPresets: string;
        sunExposureTitle: string;
        sunExposureQuestion: string;
        sunShadeDesc: string;
        sunPartialDesc: string;
        sunFullDesc: string;
        sunInfoNote: string;
        rainAdjustmentTitle: string;
        rainAdjustmentOn: string;
        rainAdjustmentOff: string;
        rainAdjustmentOnDesc: string;
        rainAdjustmentOffDesc: string;
        rainAdjustmentQuestion: string;
        rainPresets: {
            lightLabel: string;
            lightDesc: string;
            normalLabel: string;
            normalDesc: string;
            strongLabel: string;
            strongDesc: string;
        };
        rainAdjustmentInfo: string;
        tempAdjustmentTitle: string;
        tempAdjustmentOn: string;
        tempAdjustmentOff: string;
        tempAdjustmentOnDesc: string;
        tempAdjustmentOffDesc: string;
        tempAdjustmentQuestion: string;
        tempPresets: {
            lightLabel: string;
            lightDesc: string;
            normalLabel: string;
            normalDesc: string;
            strongLabel: string;
            strongDesc: string;
        };
        tempAdjustmentInfo: string;
        cycleSoakEnabledDesc: string;
        cycleSoakDisabledDesc: string;
        cycleSoakInfo: string;
        cycleDurationLabel: string;
        cycleDurationHint: string;
        soakDurationLabel: string;
        soakDurationHint: string;
        maxVolumePerWatering: string;
        maxVolumeHint: string;
        scheduleAutomatic: string;
        scheduleAutoNote: string;
        growingEnvironmentTitle: string;
        detectedFromGps: string;
        estimatedVolume: string;
        smartWateringActive: string;
        adjustmentsAutomatic: string;
        smartModeDescription: string;
        currentWeatherImpact: string;
        waterLossLabel: string;
        plantNeedsLabel: string;
        plantNeedsNote: string;
        rainBenefitPositive: string;
        rainBenefitNone: string;
        summaryNeeds: string;
        summaryEnough: string;
        todaysAdjustment: string;
        lessWater: string;
        normalWater: string;
        moreWater: string;
        noWeatherAdjustments: string;
        hotWeatherNote: string;
        rainWeatherNote: string;
        weatherAdjustments: string;
        enabledLabel: string;
        recentRain: string;
        skipNextWatering: string;
        usingLessWater: string;
        waitingForRain: string;
        tapSettingsToEnable: string;
        currentTemp: string;
        tempFactor: string;
        baseTemp: string;
        noCompensationConfigured: string;
        enableCompensationHint: string;
        configureCompensation: string;
        compensationModeHint: string;
        allTime: string;
        totalRuns: string;
        avgLiters: string;
        lastLiters: string;
        lastRun: string;
        recentActivity: string;
        noHistory: string;
        errorCode: string;
        statusPartial: string;
        waterLossPerDay: string;
        plantNeedsPerDay: string;
        days: {
            sun: string;
            mon: string;
            tue: string;
            wed: string;
            thu: string;
            fri: string;
            sat: string;
        };
        modeLabels: {
            fao56Auto: string;
            fao56Eco: string;
        };
    };

    loadingScreen: {
        loadingData: string;
        syncCheckingSetup: string;
        syncReadingSensors: string;
        syncReadingRain: string;
        syncReadingStatus: string;
        syncReadingConfig: string;
        syncReadingMoisture: string;
        syncReady: string;
    };

    appSettings: {
        title: string;
        notifications: string;
        pushNotifications: string;
        alertsUpdates: string;
        appearance: string;
        darkMode: string;
        useDarkTheme: string;
        language: string;
        selectLanguage: string;
        units: string;
        metricLabel: string;
        imperialLabel: string;
        autoDetectedRegion: string;
        dataPrivacy: string;
        exportData: string;
        exportDesc: string;
        clearAppData: string;
        clearAppDesc: string;
        backupToAccount: string;
        backupToAccountDesc: string;
        restoreFromAccount: string;
        restoreFromAccountDesc: string;
        backupSaved: string;
        backupNotFound: string;
        backupRestored: string;
        uxMode: string;
        advancedMode: string;
        advancedModeDesc: string;
    };

    ecoBadge: {
        rainDetected: string;
        monitor: string;
        last24h: string;
        zonesPaused: string;
    };

    hydraulicStatus: {
        statusNominal: string;
        flowMonitoringActive: string;
        monitoringDisabled: string;
        protectionInactive: string;
        systemLocked: string;
        warning: string;
        view: string;
        lockReasons: {
            highFlow: string;
            noFlow: string;
            unexpected: string;
            mainlineLeak: string;
            allClear: string;
            unknown: string;
        };
    };

    hydraulicDetails: {
        title: string;
        statusLocked: string;
        statusLearning: string;
        statusActive: string;
        profileAuto: string;
        profileSpray: string;
        profileDrip: string;
        profileUnknown: string;
        alertHighFlow: string;
        alertNoFlow: string;
        alertLeak: string;
        alertMainline: string;
        alertAnomaly: string;
        lockDescription: string;
        flowRate: string;
        variance: string;
        estimated: string;
        calibrating: string;
    };

    soilTank: {
        title: string;
        subtitle: string;
        currentDeficit: string;
        etcToday: string;
        nextVolume: string;
        irrigationNeeded: string;
    };

    locationPicker: {
        instruction: string;
        selectedTitle: string;
        sourceLabel: string;
        sourceGps: string;
        sourceMap: string;
        sourceManual: string;
        hideManual: string;
        manualEntry: string;
        latitude: string;
        longitude: string;
        setLocation: string;
        invalidCoordinates: string;
        latitudeRange: string;
        longitudeRange: string;
    };
}

// English translations (default)
export const en: TranslationKeys = {
    common: {
        next: 'Next',
        back: 'Back',
        cancel: 'Cancel',
        save: 'Save',
        saving: 'Saving...',
        confirm: 'Confirm',
        close: 'Close',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        skip: 'Skip',
        skipAll: 'Skip all',
        skipped: 'Skipped',
        all: 'All',
        useDefaults: 'Use Defaults',
        undo: 'Undo',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        retry: 'Retry',
        refresh: 'Refresh',
        pressBackAgainToExit: 'Press back again to exit',
        showAll: 'Show all',
        showLess: 'Show less',
        continue: 'Continue',
        finish: 'Finish',
        change: 'Change',
        selected: 'Selected',
        optional: 'Optional',
        notSet: 'Not set',
        notAvailable: 'N/A',
        warning: 'Warning',
        on: 'On',
        off: 'Off',
        start: 'Start',
        stop: 'Stop',
        edit: 'Edit',
        apply: 'Apply',
        fix: 'Fix',
        view: 'View',
        set: 'Set',
        advanced: 'Advanced',
        minutes: 'minutes',
        minutesShort: 'min',
        secondsShort: 's',
        hours: 'hours',
        hoursShort: 'h',
        daysShort: 'd',
        days: 'days',
        liters: 'liters',
        litersShort: 'L',
        litersPerMinuteShort: 'L/min',
        mlShort: 'ml',
        mm: 'mm',
        mmPerHour: 'mm/h',
        squareMetersShort: 'm2',
        squareFeetShort: 'ft2',
        metersShort: 'm',
        degreesC: '°C',
        degreesF: '°F',
        gallonsShort: 'gal',
        inchesShort: 'in',
        hPa: 'hPa',
        percent: '%',
        am: 'AM',
        pm: 'PM',
    },

    labels: {
        active: 'Active',
        inactive: 'Inactive',
        unknown: 'Unknown',
        none: 'None',
        total: 'Total',
        totalVolume: 'Total Volume',
        sessions: 'Sessions',
        successRate: 'Success Rate',
        temperature: 'Temperature',
        humidity: 'Humidity',
        pressure: 'Pressure',
        rainfall: 'Rainfall',
        avg: 'Avg',
        min: 'Min',
        max: 'Max',
        current: 'Current',
        daily: 'Daily',
        hourly: 'Hourly',
        monthly: 'Monthly',
        recent: 'Recent',
        summary: 'Summary',
        filter: 'Filter',
        clear: 'Clear',
        queue: 'Queue',
        pending: 'pending',
        status: 'Status',
        uptime: 'Uptime',
        errors: 'Errors',
        power: 'Power',
        flow: 'Flow',
        alarm: 'Alarm',
        progress: 'Progress',
        target: 'Target',
        time: 'Time',
        volume: 'Volume',
        manual: 'Manual',
        schedule: 'Schedule',
        remote: 'Remote',
        last: 'Last',
        lastActive: 'Last Active',
        efficiency: 'Efficiency',
    },

    soilMoisture: {
        optimal: 'Optimal',
        fair: 'Fair',
        low: 'Low',
    },

    wizard: {
        title: 'Setup Wizard',
        exitConfirmTitle: 'Exit wizard?',
        exitConfirmMessage: 'You have unsaved changes. If you exit now, your progress will be lost.',
        exitConfirmCancel: 'Stay',
        exitConfirmExit: 'Exit',
        zoneStepTitle: 'Zone {index} - {step}',
        zoneProgress: 'Zone {current}/{total}',

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
            rainCalibration: 'Calibration (mm per pulse)',
            rainCompNote: 'Rain compensation settings are configured per-zone for TIME/VOLUME modes. FAO-56 modes incorporate rain data automatically.',
            powerMode: 'Power Mode',
            selectPowerMode: 'Select Power Mode',
            powerModes: {
                normal: 'Normal',
                lowPower: 'Low Power',
                alwaysOn: 'Always On',
            },
            flowCalibration: 'Flow Calibration',
            pulsesPerLiter: 'Pulses per Liter',
            flowCalibrationNote: 'Default: 750 pulses/L. Use calibration wizard in Settings for precise value.',
            skipToZones: 'Skip to Zones',
        },

        zone: {
            selectTitle: 'Select Zone',
            selectSubtitle: 'Choose a zone to configure',
            nameLabel: 'Zone name',
            namePrompt: 'What do you call this zone?',
            namePlaceholder: 'e.g., Front Garden, Tomatoes, Lawn...',
            selectMode: 'Select watering mode:',
            summary: 'Zone Summary',
            cloneTitle: 'Quick Setup',
            cloneDescription: 'Copy settings from',
            cloneButton: 'Copy',
            useLocationFrom: 'Use location from',
            copyFrom: 'Copy from...',
            copyConfig: 'Copy Config',
            skipZone: 'Skip Zone',
            testValve: 'Test ({seconds}s)',
            testing: 'Testing...',
            previouslyConfigured: 'Previously Configured',
            features: 'Features:',
            quickSetupTitle: 'Quick Setup',
            quickSetupSubtitle: 'Copy settings from \"{zone}\"',
            featureRainComp: 'Rain Comp',
            featureTempComp: 'Temp Comp',
            featureCycleSoak: 'Cycle/Soak',
            featurePlanted: 'Planted',
            featureVolumeLimit: 'Vol Limit',
            featureWater: 'Water',
            skipAllTitle: 'Skip remaining zones?',
            skipAllMessage: 'You will skip {count} zones. You can configure them later.',
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

        manual: {
            durationTitle: 'Watering Duration',
            durationLabel: 'Duration (minutes)',
            volumeTitle: 'Target Volume',
            volumeLabel: 'Volume (liters)',
        },

        compensation: {
            rainTitle: 'Rain Compensation',
            rainEnable: 'Enable Rain Compensation',
            rainDesc: 'Adjust watering based on recent rainfall',
            sensitivity: 'Sensitivity',
            skipThreshold: 'Skip if rain exceeds:',
            lookbackPeriod: 'Lookback period:',
            lookbackHours: 'hours',
            rainSummary: '{sensitivity}% • Skip >{threshold}mm',
            tempTitle: 'Temperature Compensation',
            tempEnable: 'Enable Temperature Compensation',
            tempDesc: 'Increase watering on hot days, reduce on cool days',
            baseTemp: 'Base temperature:',
            tempSensitivity: 'Sensitivity',
            tempNote: 'At {temp}{unit} no adjustment. Higher temps = more water (up to 30% extra), lower = less.',
            tempSummary: 'Base {temp}{unit} • {sensitivity}%',
        },

        status: {
            faoReadyTitle: 'FAO-56 Ready ✓',
            faoReadyDesc: 'All requirements met for automatic ET₀ calculation',
        },

        messages: {
            keepCurrentSettings: 'Select new values to change, or press Next to keep current settings.',
            adjustValuesHint: 'Adjust values if needed, or press Next to keep current settings.',
            skipConfiguredNote: 'Configured settings will be skipped. You can still reconfigure by navigating manually.',
            saveOnSchedule: 'Configuration will be saved when you proceed to schedule.',
            soilIrrigationConfigured: 'Soil & Irrigation Already Configured',
            soilConfigured: 'Soil Already Configured',
            irrigationConfigured: 'Irrigation Already Configured',
            coverageSunConfigured: 'Coverage & Sun Already Configured',
            coverageConfigured: 'Coverage Already Configured',
            sunConfigured: 'Sun Exposure Already Configured',
        },

        warnings: {
            irrigationDripPreferred: '{plant} prefers drip irrigation. Sprinkler can cause foliar diseases.',
            lawnSprinklerPreferred: 'Lawns are usually watered with sprinklers for even coverage. Drip works but needs careful spacing.',
            slowSoilCycleSoak: 'Soil {soil} absorbs water slowly. We recommend enabling Cycle & Soak to prevent runoff.',
            largeArea: 'Large area! Make sure your system flow rate is sufficient for even coverage.',
            manyPlants: 'Many plants on one channel. Check that all receive enough water.',
            highSunExposure: 'High sun exposure. Plants will need more water on hot days.',
            lowSunExposure: '{plant} prefers sun. In deep shade it may have growth issues.',
        },

        tutorial: {
            skip: 'Skip Tour',
            stepProgress: 'Step {current} of {total}',
        },

        tooltips: {
            exampleLabel: 'Example:',
            items: {
                fao56: {
                    title: 'What is FAO-56?',
                    description: 'A scientific method developed by the UN (FAO) to precisely calculate plant water needs. It considers plant type, soil, weather, and growth stage.',
                    example: 'Used by farms and professional gardens in over 150 countries.',
                },
                fieldCapacity: {
                    title: 'Field Capacity',
                    description: 'The maximum amount of water soil can hold against gravity. Like a wet sponge—water that doesn’t drain away.',
                    example: 'Sand: ~15%, Clay: ~45%, Loam: ~35%',
                },
                wiltingPoint: {
                    title: 'Wilting Point',
                    description: 'Moisture level where plants can no longer extract water and begin to wilt. Below this = stress.',
                    example: 'Sand: ~5%, Clay: ~25%, Loam: ~15%',
                },
                infiltrationRate: {
                    title: 'Infiltration Rate',
                    description: 'How fast water enters the soil. Sand absorbs quickly (risk of deep drainage), clay slowly (risk of pooling).',
                    example: 'Sand: 25+ mm/h, Clay: 3-5 mm/h',
                },
                cycleSoak: {
                    title: 'Cycle & Soak',
                    description: 'Technique for heavy soils: water a little, pause to soak, repeat. Prevents runoff and puddling.',
                    example: 'Clay: 3 min water, 20 min soak, repeat 3 times',
                },
                kc: {
                    title: 'Crop Coefficient (Kc)',
                    description: 'Ratio of your plant’s water use to reference grass. Values >1 mean higher water use.',
                    example: 'Tomatoes in fruiting: Kc=1.15, Lawn: Kc=1.0',
                },
                irrigationMethod: {
                    title: 'Irrigation Method',
                    description: 'How water is delivered to plants. The right choice depends on plant type and soil.',
                    example: 'Drip for vegetables, sprinkler for lawn',
                },
                et0: {
                    title: 'Reference ET (ET₀)',
                    description: 'Water lost from soil and plants; depends on temperature, wind, and humidity. High in summer, low in winter.',
                    example: 'Jan RO: ~0.5 mm/day, Jul RO: ~5-6 mm/day',
                },
                coverage: {
                    title: 'Area / Plant Count',
                    description: 'The area watered by this channel. Specify square meters or number of plants.',
                    example: '15 m² lawn or 20 tomato plants',
                },
                sunExposure: {
                    title: 'Sun Exposure',
                    description: 'How much direct sunlight the zone receives. More sun means more evaporation and higher water needs.',
                    example: 'Full shade: 20-30%, Partial: 50-70%, Full sun: 80-100%',
                },
                maxVolume: {
                    title: 'Maximum Volume (Safety)',
                    description: 'Safety limit to prevent flooding. The system won’t dispense more than this per session, regardless of calculations.',
                    example: 'Small pot: 5L, veggie bed: 50L, 100 m² lawn: 200L',
                },
                plantingDate: {
                    title: 'Planting Date',
                    description: 'When plants were planted. The system adjusts Kc based on growth stage.',
                    example: 'Tomatoes planted May 15 → Kc increases through July',
                },
                dripIrrigation: {
                    title: 'Drip Irrigation',
                    description: 'Water delivered slowly at the roots. Highest efficiency (90%+), reduces evaporation and leaf disease.',
                    example: 'Ideal for vegetables, trees, shrubs, flower beds',
                },
                sprinkler: {
                    title: 'Sprinkler',
                    description: 'Simulates natural rain. Loses 20-30% to evaporation but covers large areas evenly.',
                    example: 'Ideal for lawns and large open areas',
                },
                soilAutoDetect: {
                    title: 'Automatic Soil Detection',
                    description: 'Uses the global SoilGrids (ISRIC) database with 250m resolution based on satellite and field data.',
                    example: 'Accuracy: high for agricultural areas, medium for urban areas',
                },
            },
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
            settings: 'Settings',
            settingsDesc: 'Configure settings',
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
            alreadyConfiguredDesc: 'This zone already has a plant set on the device. Select a new one to change it, or press Next to keep current.',
            coverageDenseExplanation: 'Dense crop - using area measurement',
            coverageSparseExplanation: 'Sparse planting - enter number of plants',
            noResultsTitle: 'No plants found',
            noResultsHint: 'Try another search or category',
            kcMeaning: 'What does Kc mean?',
            kcLegendLow: '< 0.5 = Low water',
            kcLegendMedium: '0.5-0.8 = Medium water',
            kcLegendHigh: '> 0.8 = High water',
            plantsLabel: 'plants',
        },

        soil: {
            title: 'Soil Type',
            searchPlaceholder: 'Search soil...',
            autoDetect: 'Auto-detect from GPS',
            detecting: 'Detecting soil type...',
            detectingSource: 'Using SoilGrids (ISRIC)',
            detectedWith: 'Detected with',
            confidence: 'confidence',
            confidenceHigh: 'High confidence',
            confidenceMedium: 'Medium confidence',
            confidenceLow: 'Low confidence',
            manualSelect: 'Select manually',
            noLocation: 'Set location first for auto-detection',
            noLocationHint: 'We will detect soil type automatically from GPS coordinates',
            autoDetectedLabel: 'Auto-detected',
            selectedLabel: 'Soil selected',
            detectionFailed: 'We could not detect the soil. Choose manually from the list.',
            autoDetectUnavailable: 'Auto-detect unavailable. Select manually:',
            manualSelectButton: 'Select soil manually',
            manualSelectTitle: 'Select soil type',
            selectAnother: 'Choose another soil',
            redetect: 'Redetect',
            detectedComposition: 'Detected composition:',
            clay: 'Clay',
            sand: 'Sand',
            silt: 'Silt',
            fieldCapacity: 'Field capacity',
            wiltingPoint: 'Wilting point',
            infiltration: 'Infiltration',
            availableWater: 'Available water',
            customFromGps: 'Custom from GPS',
        },

        irrigationMethod: {
            title: 'Irrigation Method',
            searchPlaceholder: 'Search method...',
            recommendedFor: 'Recommended for {plant}:',
            recommendedBadge: 'Recommended',
            efficiencyLabel: 'Efficiency',
            applicationRateLabel: 'Application rate',
            allMethods: 'All methods ({count})',
            noResults: 'No methods found for \"{query}\"',
            sortedNote: 'Methods are sorted by compatibility with the selected plant.',
            moreMethods: 'More methods ({count})',
            descriptionFallback: 'Irrigation method',
            categories: {
                drip: 'Drip',
                sprinkler: 'Sprinkler',
                surface: 'Surface',
                micro: 'Micro',
                manual: 'Manual',
                other: 'Other',
            },
            descriptions: {
                dripSurface: 'Slow drip at the roots. 90%+ efficient.',
                dripSubsurface: 'Subsurface drip. Ideal for lawns.',
                sprinklerSet: 'Rotating spray. Good for large areas.',
                sprinklerPopup: 'Pop-up sprinkler. Clean appearance.',
                microspray: 'Fine mist. Ideal for flowers and herbs.',
                soaker: 'Porous hose. Easy to install.',
                basinFlood: 'Controlled flooding. For trees and shrubs.',
                manual: 'Manual hose watering. Maximum flexibility.',
                furrow: 'Furrow irrigation. For larger gardens.',
            },
        },

        location: {
            title: 'Location',
            gpsButton: 'Use GPS',
            gettingLocation: 'Getting location...',
            permissionDenied: 'GPS permission denied. Use the map or enter coordinates manually.',
            unavailable: 'GPS unavailable. Use the map or enter coordinates manually.',
            manualEntry: 'Enter coordinates manually',
        },

        plantingDate: {
            label: 'Planting Date',
            helper: 'Helps calculate Kc for young plants',
        },

        schedule: {
            enable: 'Enable schedule',
            fao56Smart: 'FAO-56 Smart Schedule',
            fao56SmartDesc: 'Evaluates daily water needs based on evapotranspiration',
            autoBadge: 'Auto',
            autoSummary: 'Starts at {event}. Solar Time ON.',
            configureTitle: 'Configure watering schedule',
            enableTitle: 'Enable Schedule',
            enableDesc: 'Automatic watering for this zone',
            scheduleType: 'Schedule Type',
            daily: 'Daily',
            periodic: 'Every X Days',
            auto: 'FAO-56',
            selectDays: 'Select days:',
            none: 'None',
            everyDay: 'Every day',
            weekdays: 'Weekdays',
            weekend: 'Weekend',
            everyXDays: 'every {days} days',
            days: {
                sun: 'Sun',
                mon: 'Mon',
                tue: 'Tue',
                wed: 'Wed',
                thu: 'Thu',
                fri: 'Fri',
                sat: 'Sat',
            },
            intervalDays: 'Interval (days)',
            startTime: 'Start Time',
            startTimeDesc: 'Start time (fixed / fallback)',
            solarTime: 'Solar Time',
            solarTimeDesc: 'Start at sunrise/sunset instead of fixed time',
            solarEvent: 'Solar event',
            sunrise: 'Sunrise 🌅',
            sunset: 'Sunset 🌇',
            offsetMinutes: 'Offset (minutes)',
            offsetPlaceholder: '-120 .. 120',
            wateringAmount: 'Watering Amount',
            durationMinutes: 'Duration (min)',
            volumeLiters: 'Volume (L)',
            summaryAuto: '{mode} at {time}{solar}',
            summaryManual: '{time}, {days}{solar}',
            solarSuffix: ' (solar {event} {offset}{unit})',
            autoCalculationTitle: 'FAO-56 Auto Calculation',
            autoCalculationDesc: 'Automatically adjust watering based on weather and plant needs',
            evaluationLabel: 'Evaluation',
            evaluationDaily: 'Daily at sunrise',
            estimatedDurationLabel: 'Estimated duration',
            estimatedDuration: '~15-45 min / zone',
            summaryDesc: 'FAO-56 automatically calculates water needs based on local weather, plant type, and soil characteristics.',
            modify: 'Modify',
            backToAuto: 'Back to simplified Auto',
        },

        summary: {
            title: 'Zone Summary',
            mode: 'Mode',
            plant: 'Plant',
            soil: 'Soil',
            irrigation: 'Irrigation',
            coverage: 'Coverage',
            sunExposure: 'Sun Exposure',
            duration: 'Duration',
            volume: 'Volume',
            cycleSoak: 'Cycle & Soak',
            maxVolume: 'Max Volume',
            location: 'Location',
            planted: 'Planted',
            schedulePreview: 'Schedule Preview',
            schedule: 'Schedule',
            finalTitle: 'Final Summary',
            finalCounts: 'Configured zones: {configured}, skipped: {skipped}',
        },

        validation: {
            zoneNameRequired: 'Zone name is required',
            zoneNameTooShort: 'Zone name must be at least 2 characters',
            zoneNameTooLong: 'Zone name is quite long',
            coverageRequired: 'Coverage value is required',
            coverageInvalid: 'Please enter a valid coverage value',
            coverageTooHigh: 'Coverage value seems very high',
            plantRequired: 'Please select a plant',
            soilRequired: 'Please select a soil type',
            irrigationRequired: 'Please select an irrigation method',
            soilAndIrrigationRequired: 'Please select soil type and irrigation method',
            locationRequired: 'Please set a location for weather data',
            scheduleEnabled: 'Enable the schedule',
            durationRequired: 'Enter watering duration',
            volumeRequired: 'Enter watering volume',
            manualScheduleType: 'Choose daily or periodic schedule for manual modes',
        },

        complete: {
            title: 'Setup Complete!',
            subtitle: 'Your irrigation system is ready',
            zonesConfigured: 'zones configured',
            addAnotherZone: 'Add Another Zone',
            finishSetup: 'Finish Setup',
            goToDashboard: 'Go to Dashboard',
            zoneCompleteTitle: 'Zone {index} Complete! ✓',
            zoneCompleteMessage: 'You have configured {count} zone{plural}. Would you like to add another zone or finish the setup?',
            allZonesCompleteMessage: 'All 8 zones have been configured!',
            configureMoreZones: 'Configure More Zones',
            completeSetup: 'Complete Setup',
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

    plantCategories: {
        agriculture: 'Agriculture',
        gardening: 'Gardening',
        landscaping: 'Landscaping',
        indoor: 'Indoor',
        succulent: 'Succulent',
        fruit: 'Fruit',
        vegetable: 'Vegetable',
        herb: 'Herb',
        lawn: 'Lawn',
        shrub: 'Shrub',
    },

    soilTextures: {
        sand: 'Sand',
        loamySand: 'Loamy Sand',
        sandyLoam: 'Sandy Loam',
        loam: 'Loam',
        siltLoam: 'Silt Loam',
        clayLoam: 'Clay Loam',
        sandyClayLoam: 'Sandy Clay Loam',
        siltyClayLoam: 'Silty Clay Loam',
        clay: 'Clay',
        siltyClay: 'Silty Clay',
        sandyClay: 'Sandy Clay',
    },

    types: {
        plant: {
            vegetables: 'Vegetables',
            herbs: 'Herbs',
            flowers: 'Flowers',
            shrubs: 'Shrubs',
            trees: 'Trees',
            lawn: 'Lawn',
            succulents: 'Succulents',
            custom: 'Custom',
        },
        soil: {
            clay: 'Clay',
            sandy: 'Sandy',
            loamy: 'Loamy',
            silty: 'Silty',
            rocky: 'Rocky',
            peaty: 'Peaty',
            pottingMix: 'Potting Mix',
            hydroponic: 'Hydroponic',
        },
        irrigation: {
            drip: 'Drip',
            sprinkler: 'Sprinkler',
            soakerHose: 'Soaker Hose',
            microSpray: 'Micro Spray',
            handWatering: 'Hand Watering',
            flood: 'Flood',
        },
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

    calibration: {
        title: 'Flow Sensor Calibration',
        introTitle: 'Flow Sensor Calibration',
        introDescription: 'Calibration measures how many pulses the sensor generates per liter of water.',
        beforeStartTitle: 'Before you start:',
        beforeStartItem1: 'Prepare a measuring container (2L recommended)',
        beforeStartItem2: 'Make sure you have water available',
        beforeStartItem3: 'The process takes 1-2 minutes',
        currentCalibration: 'Current calibration: {value}',
        measuringTitle: 'Measuring...',
        measuringDescription: 'Open the valve and let water flow into the container.',
        pulsesLabel: 'Pulses',
        timeLabel: 'Time',
        dontStopWater: 'Do not stop the water until you press \"Done\"',
        volumeTitle: 'How much water did you collect?',
        volumeDescription: 'Measure the exact volume from the container (in milliliters).',
        pulsesCounted: 'Pulses counted: {count}',
        volumeLabel: 'Volume (ml)',
        volumeHint: 'Minimum {min}ml, recommended {recommended}ml',
        minVolumeError: 'Minimum volume is {min}ml',
        calculate: 'Calculate',
        resultTitle: 'Calibration Calculated!',
        pulsesPerLiterLabel: 'pulses / liter',
        accuracyLabel: 'Accuracy: {level}',
        accuracyHigh: 'Excellent',
        accuracyMedium: 'Acceptable',
        accuracyLow: 'Check connections',
        summaryPulses: 'Pulses counted: {count}',
        summaryVolume: 'Measured volume: {volume}ml',
        calibrationFailed: 'Calibration failed',
        applyFailed: 'Failed to apply',
        completeTitle: 'Calibration Saved!',
        completeDescription: 'The new calibration has been applied successfully.',
        errorTitle: 'Error',
        errorDefault: 'An error occurred',
        retry: 'Try again',
    },

    errors: {
        notConnected: 'Not connected',
        connectionLost: 'Connection lost. Please check your device.',
        saveFailed: 'Failed to save. Please try again.',
        loadFailed: 'Failed to load data. Please try again.',
        gpsFailed: 'GPS error. Try again or use the map.',
        gpsDenied: 'GPS permission denied',
        gpsTimeout: 'GPS request timed out',
        gpsUnavailable: 'GPS is not available',
        gpsDeniedSuggestion: 'Enable location permissions in your device settings, or use the map to select a location.',
        gpsTimeoutSuggestion: 'Make sure you’re in an area with good GPS signal. Try moving outdoors.',
        gpsUnavailableSuggestion: 'Your device may not have GPS capability. Use the map or enter coordinates manually.',
        tryAgain: 'Try again',
        checkConnection: 'Check your connection and try again.',
        failedWithReason: 'Failed: {error}',
    },

    a11y: {
        closeButton: 'Close dialog',
        nextStep: 'Go to next step',
        previousStep: 'Go to previous step',
        progressBar: 'Setup progress',
        selectedItem: 'Selected',
        expandSection: 'Expand section',
        collapseSection: 'Collapse section',
        helpLabel: 'Help: {title}',
    },

    dashboard: {
        device: 'Device',
        connected: 'Connected',
        otherDevices: 'Other Devices',
        tapToConnect: 'Tap to connect',
        addNewDevice: 'Add New Device',
        online: 'Online',
        switching: 'Switching...',
        deviceNamePlaceholder: 'Device name',
        wateringActive: 'Watering Active',
        remaining: 'remaining',
        progress: 'Progress',
        nextWateringCycle: 'Next Watering Cycle',
        noScheduleConfigured: 'No schedule configured',
        soilMoisture: 'Soil Moisture',
        temp: 'Temp',
        humidity: 'Humidity',
        humidityDry: 'Dry',
        humidityNormal: 'Normal',
        rainfall24h: 'Rainfall (24h)',
        quickActions: 'Quick Actions',
        manualWater: 'Manual Water',
        pauseSchedule: 'Pause Schedule',
        pauseResumeOnlyWhileActive: 'Pause/resume is available only while a watering task is active.',
        completeSetup: 'Complete Setup',
        noZonesConfigured: 'No zones configured yet',
        title: 'COMMAND DECK',
        subtitle: 'System Overview',
        emergencyStop: 'EMERGENCY STOP',
        notConnected: 'Not connected',
        emergencyStopSuccess: 'Emergency stop executed!',
        emergencyStopFailed: 'Failed: {error}',
        connectionUplink: 'Connection Uplink',
        linked: 'LINKED: {id}',
        disconnect: 'DISCONNECT',
        scanning: 'SCANNING...',
        connecting: 'CONNECTING...',
        initiateScan: 'INITIATE SCAN',
        systemSetup: 'System Setup',
        complete: 'Complete',
        channels: 'Channels',
        system: 'System',
        schedules: 'Schedules',
        continueSetup: 'CONTINUE SETUP',
        systemConfigured: 'System Configured',
        allZonesConfigured: 'All zones and schedules are set up',
        reconfigure: 'Reconfigure',
        environmentalSensors: 'Environmental Sensors',
        live: 'LIVE',
        offline: 'OFFLINE',
        rainSensorLabel: 'Rain Sensor',
        rainStatusRaining: 'RAINING ({rate} mm/h)',
        rainStatusDry: 'DRY',
        rainStatusInactive: 'INACTIVE',
        rainStatusUnknown: 'UNKNOWN',
        zoneActive: '{zone} Active',
        wateringInProgressLabel: 'Watering in progress...',
        nextScheduledRun: 'Next scheduled run:',
        connectionState: {
            connected: 'CONNECTED',
            disconnected: 'DISCONNECTED',
            scanning: 'SCANNING',
            connecting: 'CONNECTING',
        },
        systemStatus: {
            ok: 'SYSTEM OK',
            noFlow: 'NO FLOW DETECTED',
            unexpectedFlow: 'UNEXPECTED FLOW',
            fault: 'SYSTEM FAULT',
            rtcError: 'RTC ERROR',
            lowPower: 'LOW POWER',
            freezeLockout: 'FREEZE LOCKOUT',
            unknown: 'UNKNOWN',
        },
    },

    healthHub: {
        bannerTitle: 'Stare si configurare',
        title: 'Stare si configurare',
        subtitle: 'Setup score, locks, alarms, and quick fixes',
        systemStatusTitle: 'System status',
        setupScore: 'Setup score',
        setupScoreHint: 'Reading from device...',
        onboardingComplete: 'Setup complete',
        onboardingIncomplete: 'Setup not finished',
        validateConfig: 'Validate',
        validating: 'Validating...',
        validationStarted: 'Validation started',
        zoneMask: 'Zones mask',
        scheduleMask: 'Schedules mask',
        missingItems: 'Missing items',
        missingZones: '{count} zone(s) missing',
        missingSchedules: '{count} schedule(s) missing',
        deviceFlags: 'Device flags',
        flagNeedsSync: 'Needs sync (device requests a full sync).',
        flagNvsError: 'Storage error (NVS). Settings may not persist.',
        flagValidationError: 'Validation error. Some settings are invalid or inconsistent.',
        activeIssues: 'Active issues',
        allGoodTitle: 'All good',
        allGoodDesc: 'No active alarms or locks detected.',
        noActiveAlarms: 'No active alarms',
        deviceHealthCta: 'Device Health',
        deviceHealthCtaHint: 'Diagnostics snapshot and debug bundle',
        troubleshootingCta: 'Depanare',
        troubleshootingCtaHint: 'Step-by-step fixes for common alarms',
        deviceHealth: {
            title: 'Device Health',
            subtitle: 'Diagnostics and support bundle',
            diagnostics: 'Diagnostics snapshot',
            environment: 'Sensor health',
            runtime: 'Runtime state',
            support: 'Support',
            supportHint: 'Copy this bundle and share it with support or firmware dev.',
            bmeStatus: 'BME280 status',
            bmeMeasurementInterval: 'BME280 interval',
            lastSensorReading: 'Last sensor reading',
            alarmState: 'Active alarm',
            lockState: 'Global lock',
            lastErrorCode: 'Last error code',
            copyDebugBundle: 'Copy debug bundle',
            debugBundleCopied: 'Debug bundle copied',
            debugBundleCopyFailed: 'Failed to copy debug bundle',
            refreshFailed: 'Some data could not be refreshed',
            activeAlarmNone: 'No active alarm',
            lockNone: 'No lock',
            bmeMissing: 'Missing',
            bmeOk: 'OK',
            bmeError: 'Error',
            bmeDisabled: 'Disabled',
            bmeUnknown: 'Unknown',
        },
        troubleshooting: {
            title: 'Depanare',
            subtitle: 'Common alarm fixes',
            activeAlarmBanner: 'Current alarm focus',
            activeAlarmNone: 'No active alarm',
            openAlarmHistory: 'Open alarm history',
            shareSteps: 'Share steps',
            stepsCopied: 'Steps copied to clipboard',
            shareUnsupported: 'Unable to share steps',
            noGuideTitle: 'No guide available',
            noGuideDesc: 'There is no troubleshooting guide for this alarm yet.',
            guides: {
                noFlow: {
                    symptom: 'Valve opened but no flow pulses were detected.',
                    step1: 'Check water supply and make sure the valve is actually opening.',
                    step2: 'Check flow sensor wiring and verify flow calibration is greater than 0.',
                    step3: 'Run Test Zone 30s, then clear the alarm after flow is confirmed.',
                },
                unexpectedFlow: {
                    symptom: 'Flow pulses detected while all valves should be closed.',
                    step1: 'Inspect for leaks or a stuck valve that does not fully close.',
                    step2: 'Close water supply briefly and confirm pulses stop.',
                    step3: 'After fixing the cause, clear the alarm and monitor the next cycle.',
                },
                highFlow: {
                    symptom: 'Flow exceeded learned safe limits for the system.',
                    step1: 'Stop watering immediately and inspect for burst pipe or broken sprinkler.',
                    step2: 'Check zone hardware and fix leak before restarting watering.',
                    step3: 'Run a short manual test and clear the alarm only after flow is stable.',
                },
                mainlineLeak: {
                    symptom: 'Static leak test detected flow with all zones off.',
                    step1: 'Inspect mainline and master valve for leaks or bypass flow.',
                    step2: 'Confirm no zone is running and watch flow pulses for 30-60 seconds.',
                    step3: 'Fix leakage path, then clear alarm and validate again.',
                },
                freezeLockout: {
                    symptom: 'Freeze protection paused watering due to low or stale temperature data.',
                    step1: 'Wait until temperature rises above freeze threshold.',
                    step2: 'Refresh environmental data and verify BME280 status is OK.',
                    step3: 'Resume watering after lockout clears or use manual test for verification.',
                },
            },
        },
    },

    analytics: {
        title: 'Analytics',
        liveData: 'LIVE DATA',
        offline: 'OFFLINE',
        summary: {
            currentTemp: 'Current Temp',
            rain7d: 'Rain (7d)',
        },
    },

    historyDashboard: {
        title: 'History Dashboard',
        liveDataAvailable: 'Live data available',
        cachedData: 'Showing cached data',
        clearFilters: 'Clear',
        successRate: '{percent}% success',
        wateringSessions: 'Watering Sessions',
        avgSuffix: 'avg',
        avgTemperature: 'Avg Temperature',
        rainyDryDays: '{rainy} rainy / {dry} dry days',
        tabs: {
            watering: 'Watering',
            environment: 'Environment',
            rainfall: 'Rainfall',
        },
        volumeOverTime: 'Volume Over Time',
        channelDistribution: 'Channel Distribution',
        recentSessions: 'Recent Sessions',
        noSessionsInPeriod: 'No watering sessions in selected period',
        temperatureHumidity: 'Temperature & Humidity',
        minTemp: 'Min Temp',
        maxTemp: 'Max Temp',
        avgHumidity: 'Avg Humidity',
        minHumidity: 'Min Humidity',
        maxHumidity: 'Max Humidity',
        avgPressure: 'Avg Pressure',
        rainfallHistory: 'Rainfall History',
        totalRainfall: 'Total Rainfall',
        dailyAverage: 'Daily Average',
        maxHourly: 'Max Hourly',
        rainyDays: 'Rainy Days',
        dryDays: 'Dry Days',
        longestDrySpell: 'Longest Dry Spell',
        historySynced: 'History synced',
        syncFailed: 'Sync failed: {error}',
    },

    statistics: {
        title: 'Channel Statistics',
        refreshed: 'Statistics refreshed',
        resetAllConfirm: 'Reset ALL channel statistics? This cannot be undone.',
        resetAllTitle: 'Reset all statistics',
        resetSuccess: 'Statistics reset',
        channelReset: 'Channel {channel} reset',
        noData: 'No statistics data',
        tapRefresh: 'Tap refresh to load',
        never: 'Never',
        timeAgoMinutes: '{minutes}m ago',
        timeAgoHours: '{hours}h ago',
        timeAgoDays: '{days}d ago',
        sessionsWithLast: '{count} sessions • Last: {last}',
        lastLabel: 'Last: {value}',
        volumeDistribution: 'Volume Distribution',
    },

    wateringHistory: {
        title: 'Watering History',
        loaded: 'History loaded',
        clearConfirm: 'Clear ALL watering history? This cannot be undone.',
        cleared: 'History cleared',
        noData: 'No history data',
        tapRefresh: 'Tap refresh to load',
    },

    envHistory: {
        title: 'Environmental History',
        loaded: 'Environmental history loaded',
        clearConfirm: 'Clear ALL environmental history? This cannot be undone.',
        cleared: 'History cleared',
        last24Hours: '24 Hours',
        last7Days: '7 Days',
        noHourlyData: 'No hourly data',
        noDailyData: 'No daily data',
    },

    rainHistory: {
        title: 'Rain History',
        loaded: 'Rain history loaded',
        clearConfirm: 'Reset ALL rain history data? This cannot be undone.',
        cleared: 'Rain history cleared',
        calibrateTitle: 'Calibrate sensor',
        calibrateConfirm: 'Start rain sensor calibration?',
        calibrateStarted: 'Calibration started',
        lastHour: 'mm (Last Hour)',
        last24Hours: 'mm (24 Hours)',
        last7Days: 'mm (7 Days)',
        noHourlyData: 'No hourly data',
        noDailyData: 'No daily data',
        last24HoursMax: 'Last 24 hours • Max: {max} mm',
        last7DaysTotal: 'Last 7 days • Total: {total} mm',
    },

    taskControl: {
        title: 'Task Control',
        commandSent: '{action} command sent',
        queueStatus: '{count} pending',
        totalDispensed: 'Total dispensed: {volume}',
        noActiveTask: 'No active task',
        tasksWaiting: '{count} task(s) waiting in queue',
        completedToday: 'Completed today: {count}',
        activeId: 'Active ID: {id}',
        actions: {
            pause: 'Pause',
            resume: 'Resume',
            stop: 'Stop',
            startNext: 'Start Next',
            clearQueue: 'Clear Queue',
        },
        status: {
            running: 'RUNNING',
            paused: 'PAUSED',
            idle: 'IDLE',
        },
    },

    diagnostics: {
        title: 'System Diagnostics',
        refreshed: 'Diagnostics refreshed',
        mainsPower: 'Mains',
        activeValves: 'Active Valves',
        queuePending: '{count} pending',
        alarmClear: 'Clear',
        alarmActive: 'Active',
        lastError: 'Last Error: {error}',
        errorCode: 'Code {code}',
        systemStatus: {
            ok: 'OK',
            noFlow: 'No Flow',
            unexpectedFlow: 'Unexpected Flow',
            fault: 'Fault',
            rtcError: 'RTC Error',
            lowPower: 'Low Power',
            unknown: 'Unknown',
        },
        wateringErrors: {
            invalidParam: 'Invalid parameter',
            notInitialized: 'Not initialized',
            hardware: 'Hardware failure',
            busy: 'Busy',
            queueFull: 'Queue full',
            timeout: 'Timeout',
            config: 'Configuration error',
            rtcFailure: 'RTC failure',
            storage: 'Storage error',
            dataCorrupt: 'Data corrupt',
            invalidData: 'Invalid data',
            bufferFull: 'Buffer full',
            noMemory: 'No memory',
        },
    },

    charts: {
        noDistributionData: 'No distribution data',
        noEnvironmentalData: 'No environmental data',
        noRainData: 'No rain data',
        noWateringData: 'No watering data',
        share: 'Share',
        maxPerHour: 'Max/hr',
        tempMax: 'Temp Max',
        tempMin: 'Temp Min',
        tempAvg: 'Temp Avg',
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
        activeCount: '{count} active',
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
        reasonSlope: 'Sloped terrain ({slope}%) + soil {rate} mm/h',
        reasonSlow: 'Slow soil ({rate} mm/h) - prevents runoff',
        reasonFast: 'Fast soil ({rate} mm/h) - not needed',
        educationIntro: 'Cycle & Soak prevents runoff by splitting watering into small cycles with pauses between them.',
        educationStepCycle: 'Watering cycle: water is applied for a short period.',
        educationStepSoak: 'Soak pause: soil absorbs water deeper.',
        educationStepRepeat: 'Repeat: cycle repeats until the total volume is reached.',
        educationTip: 'Tip: Ideal for clay soils and sloped terrain.',
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
        calculationStepRaw: '1. RAW (mm): {depth} mm',
        calculationStepVolume: '2. Volume: {depth} mm ? {area} m? = {volume} L',
        simpleCalculation: 'Simple calculation: 2 liters ? {count} plants = {volume} L',
        rangeMin: '{value} L',
        rangeMax: '{value} L',
        educationIntro: 'The volume limit is a safety measure to prevent overwatering in case of calculation or sensor errors.',
        educationTip: 'Tip: Set this value 20-30% higher than the estimated maximum daily need.',
    },

    zoneDetails: {
        notConfigured: 'Not configured',
        notScheduled: 'Not scheduled',
        wateringActive: 'Watering Active',
        idle: 'Idle',
        nextWatering: 'Next Watering',
        todayAt: 'Today at {time}',
        tomorrowAt: 'Tomorrow at {time}',
        dayAt: '{day} at {time}',
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
        skipNextNotAvailable: 'Skip-next command is not available in current firmware BLE API.',
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

        zone: 'Zone',
        tapToConfigure: 'Tap to configure this zone',
        zoneNotConfiguredTitle: 'Zone Not Configured',
        zoneNotConfiguredDesc: 'Set up plant type, soil, and irrigation settings to enable smart watering.',
        configureZone: 'Configure Zone',
        quickWater: 'Quick Water',
        manualOverride: 'Manual Override',
        editSettings: 'Edit Settings',
        dry: 'Dry',
        wet: 'Wet',
        quickWateringTitle: 'Quick Watering',
        configureZoneTitle: 'Configure Zone',
        zoneSettingsTitle: 'Zone Settings',
        startManualWatering: 'Start manual watering',
        sectionGeneral: 'General',
        sectionWateringMode: 'Watering Mode',
        sectionPlantSoil: 'Plant & Soil',
        sectionCoverageSun: 'Coverage & Sun',
        sectionAdvanced: 'Advanced',
        sectionSchedule: 'Schedule',
        changePlantSoil: 'Change Plant/Soil',
        scheduleEnabled: 'Schedule Enabled',
        scheduleFao56: 'FAO-56',
        scheduleEvery: 'Every',
        scheduleDays: 'days',
        scheduleAutoNote: 'FAO-56 Smart schedule runs daily at the set time.',
        stepProgress: 'Step {current} of {total}',
        coverageArea: 'Coverage Area',
        coverageByArea: 'Area (m?)',
        coverageByPlants: 'Plant Count',
        directSunlight: '{percent}% direct sunlight',
        waterFor: 'Water for',
        pauseFor: 'Then pause for',
        locationNote: 'Your location is needed to calculate accurate solar radiation and evapotranspiration.',
        selectPlantingDate: 'Select planting date',
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
            customProfile: 'Custom Soil Profile',
            customBadge: 'CUSTOM',
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
            applicationRate: '{value} mm/h',
        },
        wateringMode: {
            title: 'Watering Mode',
            subtitle: 'Choose how this zone is watered based on your landscape needs.',
            nextStepTip: {
                title: 'Next: Plant & Soil Setup',
                text: 'FAO-56 modes need to know your plant type and soil to calculate accurate water needs.',
            },
            badges: {
                faoQuality: 'FAO-56 100%',
                faoEco: 'FAO-56 70%',
                manual: 'Manual',
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
    navigation: {
        home: 'Home',
        zones: 'Zones',
        aiDoctor: 'AI Doctor',
        history: 'History',
        settings: 'Settings',
        marketplace: 'Plants',
    },
    marketplace: {
        title: 'Plant Marketplace',
        browse: 'Browse',
        plants: 'Plants',
        packs: 'Packs',
        search: 'Search',
        searchPlaceholder: 'Search plants...',
        aiSearch: 'AI Search',
        aiSearchHint: 'Ask anything about plants using natural language',
        aiSearchPlaceholder: 'Describe the plant you\'re looking for...',
        searchFailed: 'Search failed',
        aiAnswer: 'AI Answer',
        suggestedQueries: 'Suggested Queries',
        searchSuggestionIndoorLowLight: 'Best indoor plants for low light',
        searchSuggestionDroughtSucculents: 'Drought-resistant succulents',
        searchSuggestionTomatoFao56: 'FAO-56 parameters for tomatoes',
        searchSuggestionMediterraneanHerbs: 'Herbs that grow well in Mediterranean climate',
        allCategories: 'All',
        newest: 'Newest',
        topRated: 'Top Rated',
        mostDownloaded: 'Popular',
        loadMore: 'Load More',
        noResults: 'No plants found',
        createPlant: 'Create Plant',
        editPlant: 'Edit Plant',
        newPlant: 'New Plant',
        saveDraft: 'Save Draft',
        submitForReview: 'Submit for Review',
        signInRequired: 'Sign in to access this feature',
        details: 'Details',
        reviews: 'Reviews',
        comments: 'Comments',
        writeReview: 'Write a review...',
        writeComment: 'Write a comment...',
        addComment: 'Add Comment',
        reply: 'Reply',
        install: 'Install',
        installed: 'Installed',
        installAll: 'Install All Plants',
        remove: 'Remove',
        category: 'Category',
        selectCategory: 'Select category...',
        scientificName: 'Scientific Name',
        commonNameEn: 'Name (EN)',
        commonNameRo: 'Name (RO)',
        placeholderScientificName: 'Solanum lycopersicum',
        placeholderCommonNameEn: 'Tomato',
        placeholderCommonNameRo: 'Tomato',
        placeholderTags: 'indoor, tropical, low-water',
        descriptionEn: 'Description (EN)',
        descriptionRo: 'Description (RO)',
        tags: 'Tags (comma separated)',
        images: 'Images',
        addImages: 'Add images',
        technicalData: 'Technical Data (AI-filled)',
        aiFillGaps: 'AI Fill Gaps',
        translateEnToRo: 'EN -> RO',
        translateRoToEn: 'RO -> EN',
        myLibrary: 'My Library',
        myPlants: 'My Plants',
        authorProfile: 'Author Profile',
        publishedPlants: 'Published Plants',
        noPlants: 'No plants published yet',
        noAuthoredPlants: 'You haven\'t created any plants yet',
        noFilteredPlants: 'No plants with this status',
        createFirst: 'Create Your First Plant',
        plantChat: 'Plant AI Chat',
        chatWelcome: 'Ask anything about this plant',
        chatHint: 'Watering schedule, sunlight needs, soil preferences, pest control, FAO-56 data...',
        chatPlaceholder: 'Ask about this plant...',
        chatError: 'Sorry, something went wrong. Please try again.',
        packNotFound: 'Pack not found',
        plantsInPack: 'Plants in this pack',
        downloads: 'downloads',
        views: 'views',
        rating: 'rating',
        synced: 'Synced',
        pendingSync: 'Pending sync',
        askAi: 'Ask AI',
        viewAuthor: 'View Author',
        aiSearchTitle: 'AI Plant Search',
        askAiSubtitle: 'Get care tips, disease info, and more',
        browseMarketplace: 'Browse Marketplace',
        collections: 'Collections',
        emptyLibrary: 'Your library is empty',
        noComments: 'No comments yet',
        noDescription: 'No description.',
        generatingDescription: 'Generating description with AI...',
        noPacks: 'No packs yet',
        noReviews: 'No reviews yet',
        notSynced: 'Not synced',
        packsTab: 'Packs',
        plantsInLibrary: 'plants in your library',
        storageUsed: '{percent}% used',
        plantsTab: 'Plants',
        reviewBody: 'Your review...',
        reviewTitle: 'Title (optional)',
        searchWithAi: 'Search with AI',
        sortNewest: 'Newest',
        sortPopular: 'Popular',
        sortTopRated: 'Top Rated',
        submitReview: 'Submit Review',
        trySearching: 'Try searching for',
        libraryTab: 'Library',
        onDeviceTab: 'On Device',
        syncToDevice: 'Sync to Device',
        syncAllToDevice: 'Sync All to Device',
        removeFromDevice: 'Remove from Device',
        syncingToDevice: 'Syncing to device...',
        syncSuccess: 'Successfully synced to device',
        syncFailed: 'Failed to sync to device',
        noDevicePlants: 'No plants on device',
        devicePlantsCount: 'plants on device',
        connectDeviceToSync: 'Connect to a device to sync plants',
        publishToMarketplace: 'Publish to Marketplace',
        publishDescription: 'Share this plant with the community',
        romPlant: 'Built-in',
        customPlant: 'Custom',
        devicePlantId: 'Device ID',
        romPlantId: 'ROM ID',
        onDevice: 'On Device',
        updateOnDevice: 'Update on Device',
        plantsCount: 'plants',
        filterAll: 'All',
        filterOnDevice: 'On Device',
        filterNotInstalled: 'Not Installed',
        deviceOffline: 'Device offline',
        overviewTab: 'Overview',
        guideTab: 'Guide',
        deviceTab: 'Device',
        noGrowingData: 'No growing data available',
        cropCoefficients: 'Crop Coefficients',
        cropCoefficientsHint: 'FAO-56 crop coefficients (Kc) - water use relative to reference evapotranspiration.',
        growthStages: 'Growth Stages',
        growthStagesOngoingSummary: '{days} {unit} to maturity, then permanent mature stage',
        growthStagesOngoingOnlySummary: 'Permanent mature stage',
        growthStagesOngoingHint: 'The plant remains in mature stage.',
        stageOngoingShort: 'mature',
        stageOngoingLabel: 'permanent',
        stageMaturityLabel: 'Maturity',
        stageIni: 'Initial',
        stageDev: 'Development',
        stageMid: 'Mid-season',
        stageEnd: 'Late',
        kcInitialLabel: 'Kc Initial',
        kcMidLabel: 'Kc Mid-season',
        kcEndLabel: 'Kc End',
        kcDevLabel: 'Kc Development',
        rootAndSoil: 'Root & Soil',
        rootDepthLabel: 'Root depth',
        rootDepthHint: 'Typical active root depth used when estimating how much water the soil can store.',
        growingConditions: 'Growing Conditions',
        optimalTempLabel: 'Optimal temp',
        optimalTempHint: 'Range where the plant grows best with minimal stress.',
        fromValueTemplate: 'from {value}{unit}',
        upToValueTemplate: 'up to {value}{unit}',
        soilPhLabel: 'Soil pH',
        soilPhHint: 'Preferred soil acidity range for healthy nutrient uptake.',
        frostToleranceHint: 'Approximate minimum temperature the plant can tolerate without major damage.',
        droughtLabel: 'Resistance to dry periods',
        shadeLabel: 'Adaptation to low light',
        salinityLabel: 'Salt tolerance (soil/water)',
        toleranceLow: 'Low',
        toleranceMedium: 'Medium',
        toleranceHigh: 'High',
        droughtHintLow: 'Needs frequent watering. Soil should not stay dry for long.',
        droughtHintMedium: 'Needs regular watering, but can handle short dry periods.',
        droughtHintHigh: 'Handles longer dry periods better than average plants.',
        shadeHintLow: 'Needs strong light and more direct sun.',
        shadeHintMedium: 'Grows well in partial shade.',
        shadeHintHigh: 'Adapts well to low-light conditions.',
        salinityHintLow: 'Sensitive to salty soil/water. Use low-salinity water.',
        salinityHintMedium: 'Moderate tolerance to salts in soil/water.',
        salinityHintHigh: 'Tolerates salts in soil/water better than average plants.',
        indoorSuitableLabel: 'Indoor suitable',
        criticalStageLabel: 'Water-sensitive stage',
        criticalStageEstLabel: 'After planting (establishment)',
        criticalStageGenericLabel: 'Sensitive period (keep watering steady)',
        criticalStageHint: 'During this stage, irregular watering can reduce growth or yield.',
        moreInfoLabel: 'More info',
        careGuideTitle: 'Care Guide',
        technicalDetails: 'Technical Details',
        technicalDetailsDesc: 'FAO-56, pH, frost tolerance',
        otherParameters: 'Other Parameters',
        growthCycleAnnual: 'Annual',
        growthCyclePerennial: 'Perennial',
        growthCycleBiennial: 'Biennial',
        primaryUseOrnamental: 'Ornamental',
        primaryUseFood: 'Food',
        primaryUseFruit: 'Fruit',
        primaryUseVegetable: 'Vegetable',
        primaryUseHerb: 'Herb',
        primaryUseMedicinal: 'Medicinal',
        primaryUseAromatic: 'Aromatic',
        primaryUseForage: 'Forage',
        primaryUseLawn: 'Lawn',
        primaryUseTimber: 'Timber',
        primaryUseIndustrial: 'Industrial',
        irrigMethodDrip: 'Drip',
        irrigMethodSprinkler: 'Sprinkler',
        irrigMethodSurface: 'Surface',
        irrigMethodManual: 'Manual',
        irrigMethodRainfed: 'Rainfed',
        deviceVersion: 'Version on device',
        removedFromDevice: 'Removed from device',
        confirmRemoveFromDevice: 'Remove this plant from the device?',
        connectToManage: 'Connect device to manage',
        notOnDevice: 'This plant is not synced to your device yet',
        builtInPlant: 'Built-in ROM Plant',
        builtInPlantDesc: 'Pre-loaded in device firmware — always available',
        upToDate: 'Up to date',
        updateAvailable: 'Update available',
        quickFacts: 'Quick Facts',
        qfCycle: 'Cycle',
        qfTemp: 'Temperature',
        qfFrost: 'Frost tolerance',
        qfWater: 'Water needs',
        qfIndoor: 'Indoor',
        qfUse: 'Use',
        qfIrrigation: 'Irrigation',
        qfHigh: 'High',
        qfMedium: 'Medium',
        qfLow: 'Low',
        qfWaterHigh: 'High water need',
        qfWaterMedium: 'Medium water need',
        qfWaterLow: 'Low water need',
        daysLabel: 'days',
        totalLabel: 'total',
        status: {
            all: 'All',
            draft: 'Drafts',
            pending_review: 'Pending',
            approved: 'Approved',
            rejected: 'Rejected',
        },
    },
    admin: {
        title: 'Admin Panel',
        subtitle: 'Plant Marketplace',
        accessDenied: 'Access Denied',
        accessDeniedDesc: 'You need administrator privileges to access this section.',
        totalPlants: 'Total Plants',
        pendingReview: 'Pending Review',
        approved: 'Approved',
        rejected: 'Rejected',
        totalPacks: 'Total Packs',
        totalUsers: 'Total Users',
        totalReviews: 'Reviews',
        totalDownloads: 'Downloads',
        moderationQueue: 'Moderation Queue',
        moderationDesc: 'Review and approve submitted plants',
        plantManager: 'Plant Manager',
        plantManagerDesc: 'Browse, search and manage all plants',
        filterPending: 'Pending',
        filterFlagged: 'AI Flagged',
        filterAll: 'All',
        queueEmpty: 'Queue is empty — all caught up!',
        aiScore: 'AI Score',
        accuracy: 'Accuracy',
        completeness: 'Completeness',
        quality: 'Quality',
        aiRecommends: 'AI Recommends',
        aiReview: 'AI Review',
        approve: 'Approve',
        reject: 'Reject',
        noPlantsFound: 'No plants found',
        loading: 'Loading...',
        loadMore: 'Load More',
        draft: 'Draft',
        authorLabel: 'Author',
    },
    timePicker: {
        selectTime: 'Select time',
        hour: 'Hour',
        minute: 'Minute',
    },
    qrSharing: {
        title: 'QR Sharing',
        share: 'Share',
        scan: 'Scan',
        shareTitle: 'Share zone configuration',
        shareFailed: 'Failed to share',
        generateFailed: 'Failed to generate QR code',
        copyFailed: 'Failed to copy to clipboard',
        zonesToShare: 'Sharing {count} zone{plural}',
        scanWithDevice: 'Scan with another device to import',
        copied: 'Copied',
        copyData: 'Copy data',
        includedTitle: 'Included in share',
        includedItem: '{name} ({mode})',
        qrCodeAlt: 'QR code',
        scanUnavailable: 'Camera scanning requires native app capabilities.',
        scanPasteHint: 'You can paste configuration data from clipboard instead.',
        pasteFromClipboard: 'Paste from Clipboard',
        invalidData: 'Invalid configuration data',
    },
    alarmCard: {
        names: {
            noAlarm: 'No Alarm',
            noFlow: 'No Flow',
            unexpectedFlow: 'Unexpected Flow',
            freezeProtection: 'Freeze Protection',
            highFlow: 'High Flow',
            lowFlow: 'Low Flow',
            mainlineLeak: 'Mainline Leak',
            zoneLocked: 'Zone Locked',
            systemLocked: 'System Locked',
            unknown: 'Unknown Alarm ({code})',
        },
        descriptions: {
            noAlarm: 'System operating normally',
            noFlow: 'No water flow detected during watering. Check supply, valve, filter, and sensor.',
            unexpectedFlow: 'Flow detected when all valves are closed. Check for leaks.',
            freezeProtection: 'Freeze protection is active. Watering is temporarily paused.',
            highFlow: 'Flow exceeded the learned limit. Possible burst/leak.',
            lowFlow: 'Flow is below the learned limit. Check pressure and filters.',
            mainlineLeak: 'Static test detected flow with zones off. Check for leaks.',
            zoneLocked: 'Zone locked after repeated anomalies. Manual intervention required.',
            systemLocked: 'System locked due to a critical water anomaly. Check for leaks.',
            unknown: 'Unrecognized alarm code. Contact support.',
        },
        detailTokens: {
            freezeTempLow: 'low temperature',
            freezeTempStale: 'stale sensor data',
        },
        detailedDescriptions: {
            noAlarm: 'System operating normally.',
            noFlow: 'No water flow detected during watering. Check water supply and connections.',
            noFlowZone: 'No water flow detected in {zone} during watering. Check water supply and connections.',
            unexpectedFlow: 'Water flow detected while all valves are closed ({pulses} pulses). Possible leak or stuck valve.',
            freezeProtection: 'Watering suspended due to freeze risk ({temp}). Will resume when safe.',
            highFlow: 'Flow rate exceeded safe limits. Possible burst pipe or leak.',
            highFlowZone: 'Flow rate exceeded safe limits in {zone}. Possible burst pipe or leak.',
            lowFlow: 'Flow rate below expected. Check for blockages or low pressure.',
            lowFlowZone: 'Flow rate below expected in {zone}. Check for blockages or low pressure.',
            mainlineLeak: 'Static test detected flow ({pulses} pulses) with all zones off. Mainline leak suspected.',
            zoneLocked: 'Zone locked due to repeated anomalies. Manual unlock required.',
            zoneLockedZone: '{zone} has been locked due to repeated anomalies. Manual unlock required.',
            systemLocked: 'System locked due to critical hydraulic issue. All watering suspended until cleared.',
            unknown: 'Unrecognized alarm. Contact support if issue persists.',
        },
        cleared: 'Alarm cleared',
        codeLabel: 'Code',
        dataLabel: 'Data',
        occurredLabel: 'Occurred',
        clearTitle: 'Clear Alarm',
        clearConfirmMessage: 'Are you sure you want to clear the \"{alarm}\" alarm? Make sure the underlying issue has been resolved.',
    },
    alarmPopup: {
        cleared: 'Alarm cleared',
        retryIn: 'Auto-retry in {time}',
        dismiss: 'Dismiss',
        clearing: 'Clearing...',
        clearAlarm: 'Clear Alarm',
        viewHistory: 'View Alarm History',
    },
    alarmHistory: {
        title: 'Alarm History',
        emptyTitle: 'No Alarms',
        emptyMessage: 'Your irrigation system is running smoothly.',
        active: 'Active',
        cleared: 'Cleared',
        clearedAt: 'Cleared {time}',
        clearAlarm: 'Clear Alarm',
        clearAll: 'Clear All Alarms',
        clearAllTitle: 'Clear All Alarms',
        clearAllConfirmMessage: 'This clears all active alarms on the controller. Only do this after fixing the underlying issue.',
        clearAllConfirmWord: 'CLEAR',
        testZone30s: 'Test Zone (30s)',
        testZoneRunningTitle: 'Testing {zone}',
        testZoneRunningMessage: 'Auto-stopping in {seconds}s. Tap Emergency Stop if needed.',
        emergencyStop: 'Emergency Stop',
        testZoneCompleted: 'Zone test completed.',
        time: {
            unknown: 'Unknown',
            justNow: 'Just now',
            minutesAgo: '{count}m ago',
            hoursAgo: '{count}h ago',
            daysAgo: '{count}d ago',
        },
    },
    deviceSelector: {
        title: 'Select Device',
        searchPlaceholder: 'Search devices...',
        noDevices: 'No devices found',
        current: 'Current',
        lastSeen: 'Last seen: {time}',
        unknown: 'Unknown',
        online: 'Online',
        offline: 'Offline',
        addDevice: 'Add New Device',
    },
    mobileConfirm: {
        typeToConfirm: "Type '{value}' to confirm",
    },
    mobileConnectionSuccess: {
        title: 'Connection Successful',
        subtitle: 'Your controller is online and ready to set up.',
        deviceId: 'Device ID: {id}',
        continueSetup: 'Continue Setup',
        skipToDashboard: 'Skip to Dashboard',
    },
    mobileDeviceInfo: {
        title: 'Device Info',
        systemStatus: 'System Status',
        signalStrength: 'Signal Strength',
        signalExcellent: 'Excellent',
        signalGood: 'Good',
        signalFair: 'Fair',
        signalWeak: 'Weak',
        uptime: 'Uptime',
        battery: 'Battery',
        errors: 'Errors',
        model: 'Model',
        softwareHardware: 'Software & Hardware',
        firmwareVersion: 'Firmware Version',
        serialNumber: 'Serial Number',
        checkUpdates: 'Check for Updates',
        rebootDevice: 'Reboot Device',
        rebootTitle: 'Reboot Device?',
        rebootMessage: 'This will restart the controller and may take a minute.',
        rebootConfirm: 'Reboot',
        rebootNotAvailable: 'Reboot command is not available in current firmware BLE API.',
    },
    mobileDeviceReset: {
        title: 'Reset Options',
        warningTitle: 'Reset Warning',
        warningBody: 'Resetting can clear settings, schedules, and history. Choose carefully.',
        sectionLabel: 'Reset Types',
        helpTitle: 'Need Help?',
        helpBody: 'Learn what each reset option does before proceeding.',
        helpAction: 'Learn More',
        confirmTitle: 'Confirm Reset',
        confirmReset: 'Reset',
        confirmFactory: 'Factory Reset',
        confirmWord: 'RESET',
        factoryResetTitle: 'Factory Reset in Progress',
        processing: 'Processing...',
        resetting: 'Resetting...',
        progressComplete: '{percent}% complete',
        retryAttempt: 'Retry attempt {count}',
        resetSuccess: 'Reset complete',
        resetFailed: 'Reset failed: {reason}',
        options: {
            settings: { name: 'Reset Settings', description: 'Clear system settings', details: 'Resets device settings to defaults. Schedules and history stay.' },
            schedule: { name: 'Reset Schedule', description: 'Clear watering schedules', details: 'Removes all schedules and zone timing.' },
            stats: { name: 'Reset History', description: 'Clear logs & statistics', details: 'Deletes watering, rain, and environment history.' },
            full: { name: 'Factory Reset', description: 'Wipe all data', details: 'Restores the device to factory state. All data is erased.' },
        },
        wipeSteps: {
            prepare: 'Preparing...',
            resetChannels: 'Resetting channels',
            resetSystem: 'Resetting system',
            resetCalibration: 'Resetting calibration',
            clearRainHistory: 'Clearing rain history',
            clearEnvHistory: 'Clearing environment history',
            clearOnboarding: 'Clearing onboarding',
            verify: 'Verifying reset',
            done: 'Done',
        },
    },
    mobileDeviceScan: {
        title: 'Scan for Devices',
        scanning: 'Scanning for devices...',
        scanComplete: 'Scan complete',
        scanHint: 'Make sure your controller is powered on and nearby.',
        availableDevices: '{count} devices found',
        looking: 'Looking for devices...',
        noneFound: 'No devices found',
        connecting: 'Connecting...',
        connect: 'Connect',
        cantFind: 'Cannot find your device?',
        scanningShort: 'Scanning',
        restartScan: 'Restart Scan',
        defaultDeviceName: 'AutoWater Controller',
        signalLabel: 'Signal: {label}',
        signal: {
            unknown: 'Unknown',
            excellent: 'Excellent',
            strong: 'Strong',
            fair: 'Fair',
            weak: 'Weak',
        },
    },
    mobileDeviceSettings: {
        title: 'Device Settings',
        groups: {
            deviceConfiguration: 'Device Configuration',
            powerPerformance: 'Power & Performance',
            maintenance: 'Maintenance',
        },
        items: {
            deviceInfo: { label: 'Device Info', subtitle: 'System details and status' },
            flowCalibration: { label: 'Flow Calibration', subtitle: 'Calibrate the flow sensor' },
            masterValve: { label: 'Master Valve', subtitle: 'Configure master valve timing' },
            rainSensor: { label: 'Rain Sensor', subtitle: 'Calibration and rain integration' },
            powerMode: { label: 'Power Mode', subtitle: 'Battery and performance settings' },
            resetOptions: { label: 'Reset Options', subtitle: 'Clear settings or data' },
            timeLocation: { label: 'Time & Location', subtitle: 'Sync time and GPS' },
            packsPlants: { label: 'Packs & Plants', subtitle: 'Manage installed plant profiles', subtitleWithCount: '{count} custom plants installed' },
        },
    },
    firmwareUpdate: {
        checking: 'Checking...',
        upToDate: 'Everything is up to date',
        available: 'Updates available',
        install: 'Install',
        backendNotConfigured: 'OTA backend is not configured.',
        connectDeviceFirst: 'Connect to a device before checking firmware updates.',
        stopWateringFirst: 'Stop active watering before starting OTA.',
        otaChannel: 'OTA Channel',
        hardwareBoard: 'Hardware Board',
        latestRelease: 'Latest Release',
        versionLabel: 'Version',
        packageSize: 'Package size',
        releaseNotes: 'Release notes',
        downloadAndInstall: 'Download & Install OTA',
        uploadedSummary: 'Uploaded {size}',
        targetVersion: 'Target version: v{version}',
        runningVersion: 'Running version: v{version}',
        downloadingPackage: 'Downloading firmware package...',
        startingTransfer: 'Starting BLE OTA transfer...',
    },
    mobileFlowCalibration: {
        title: 'Flow Calibration',
        currentCalibration: 'Current calibration',
        wizardTitle: 'Calibration Steps',
        steps: {
            selectZone: { title: 'Select Zone', desc: 'Choose a zone to run water.' },
            prepareContainer: { title: 'Prepare Container', desc: 'Have a measured container ready.' },
            runCalibration: { title: 'Run Calibration', desc: 'Start watering and collect water.' },
            enterVolume: { title: 'Enter Volume', desc: 'Enter the amount collected.' },
        },
        selectZone: 'Select a zone',
        selectZoneAlert: 'Please select a zone first.',
        startCalibration: 'Start Calibration',
        startFailed: 'Failed to start calibration',
        runningZone: 'Running zone {zone}',
        stopAndMeasure: 'Stop and measure',
        pulsesLabel: 'Pulses',
        pulsesDetected: 'Pulses detected',
        enterCollectedVolume: 'Enter collected volume',
        litersLabel: 'Liters',
        recalculate: 'Recalculate',
        calculatedValue: 'Calculated value',
        saveCalibration: 'Save Calibration',
        saving: 'Saving...',
        saveFailed: 'Failed to save calibration',
        saveManual: 'Save Manual',
        saveManualFailed: 'Failed to save manual value',
        manualEntry: 'Or enter value manually',
        completeTitle: 'Calibration Complete',
        collectedPulses: 'Collected {count} pulses',
        calculateFailed: 'Failed to calculate',
        recalibrate: 'Recalibrate',
        pulsesPerLiter: 'pulses/L',
    },
    mobileHelpAbout: {
        title: 'Help & About',
        appName: 'AutoWater',
        appTagline: 'Smart irrigation made simple',
        versionBuild: 'Version {version} (Build {build})',
        linkNotConfigured: 'This link is not configured yet. Set the corresponding VITE_* URL.',
        helpSection: {
            title: 'Help Center',
            userGuide: { title: 'User Guide', subtitle: 'Learn how to set up your system' },
            faq: { title: 'FAQs', subtitle: 'Common questions' },
            contact: { title: 'Contact Support', subtitle: 'Get help from our team' },
            reportBug: { title: 'Report a Bug', subtitle: 'Tell us what is not working' },
        },
        legalSection: {
            title: 'Legal',
            terms: 'Terms of Service',
            privacy: 'Privacy Policy',
            licenses: 'Open Source Licenses',
        },
        footerLine1: 'AutoWater - smart irrigation',
        footerLine2: 'Copyright {year} AutoWater',
    },
    mobileHistory: {
        title: 'History',
        tabs: {
            watering: 'Watering',
            environment: 'Environment',
            rain: 'Rain',
        },
        timeFrames: {
            day: 'Day',
            week: 'Week',
            month: 'Month',
        },
        timeFrameRanges: {
            day: 'Daily summary',
            week: 'Weekly summary',
            month: 'Monthly summary',
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
        totalConsumption: 'Total Consumption',
        totalRainfall: 'Total Rainfall',
        averageValues: 'Average Values',
        sessions: '{count} sessions',
        events: '{count} events',
        readings: '{count} readings',
        skipped: '{count} skipped',
        currentTemp: 'Current Temp',
        currentHumidity: 'Current Humidity',
        temperatureLabel: 'Temperature ({unit})',
        humidityLabel: 'Humidity ({unit})',
        noWateringData: 'No watering data for this period',
        noEnvironmentData: 'No environment data for this period',
        noRainData: 'No rain data for this period',
        allZones: 'All Zones',
        units: {
            mm: 'mm',
        },
    },
    mobileManageDevices: {
        title: 'Manage Devices',
        currentDevice: 'Current Device',
        otherDevices: 'Other Devices',
        activeBadge: 'Active',
        connectedVia: 'Connected via {type}',
        connectionTypes: {
            wifi: 'Wi-Fi',
            bluetooth: 'Bluetooth',
        },
        lastSync: {
            label: 'Last Sync',
            justNow: 'Just now',
            minutesAgo: '{count} min ago',
            hoursAgo: '{count} h ago',
        },
        signalStrength: {
            label: 'Signal Strength',
            excellent: 'Excellent',
            good: 'Good',
            fair: 'Fair',
            weak: 'Weak',
        },
        status: {
            online: 'Online',
            standby: 'Standby',
            offline: 'Offline',
        },
        deviceLine: '{status} - {location}',
        addController: 'Add Controller',
        emptyTitle: 'No Devices',
        emptyMessage: 'You do not have any devices yet. Add one to get started.',
    },
    mobileMasterValve: {
        title: 'Master Valve',
        subtitle: 'Configure master valve timing',
        masterLabel: 'Master',
        delayBefore: 'Delay Before Start',
        delayBeforeHint: 'Master valve opens {seconds}{unit} before zones start',
        delayAfter: 'Delay After Stop',
        delayAfterHint: 'Master valve stays open {seconds}{unit} after zones stop',
        timingHint: 'Delays help protect the pump and stabilize pressure.',
        timingVisualization: 'Timing Visualization',
        save: 'Save',
        saving: 'Saving...',
        saveFailed: 'Failed to save settings',
    },
    mobileNoDevices: {
        title: 'No Devices',
        subtitle: 'Connect a controller to get started',
        addDevice: 'Add Device',
        needHelp: 'Need help?',
        appName: 'AutoWater',
    },
    mobileNotifications: {
        title: 'Notifications',
        clearAll: 'Clear All',
        alarms: 'Alarms',
        filters: {
            all: 'All',
            errors: 'Errors',
            warnings: 'Warnings',
            info: 'Info',
        },
        sections: {
            today: 'Today',
            yesterday: 'Yesterday',
            lastWeek: 'Last Week',
        },
        days: {
            sun: 'Sun',
            mon: 'Mon',
        },
        emptyTitle: 'No Notifications',
        emptyMessage: 'You are all caught up.',
        mock: {
            irrigationCompleted: { title: 'Irrigation Complete', message: 'Your zone finished watering.' },
            irrigationCompletedShort: { message: 'Watering completed.' },
            moistureAlert: { title: 'Low Moisture Alert', message: 'Soil moisture below {threshold}%.' },
            scheduleSkipped: { title: 'Schedule Skipped', message: 'Rain detected. Watering skipped.' },
            firmwareUpdated: { title: 'Firmware Updated', message: 'Updated to version {version}.' },
            connectionLost: { title: 'Connection Lost', message: 'Device offline for {minutes} minutes.' },
        },
    },
    mobileOnboardingWizard: {
        deviceName: {
            title: 'Name Your Device',
            subtitle: 'Give your device a memorable name',
            placeholder: 'My AutoWatering',
            defaultName: 'My AutoWatering',
        },
        timeSync: {
            title: 'Sync Time',
            subtitle: 'We will sync device time with your phone.',
            currentTime: 'Current Time',
            autoSync: 'Time will sync automatically',
        },
        masterValve: {
            title: 'Master Valve',
            subtitle: 'Do you have a master valve installed?',
            delayBefore: 'Delay Before Start',
            delayAfter: 'Delay After Stop',
            preDelayHint: 'Master valve opens {seconds} before zones start',
            postDelayHint: 'Master valve stays open {seconds} after zones stop',
        },
        selectZones: {
            title: 'Select Zones to Configure',
            subtitle: 'Choose which zones you want to set up',
            loading: 'Loading zones...',
            status: {
                configured: 'Already configured',
                willConfigure: 'Will be configured',
                tapToEnable: 'Tap to enable',
            },
            selected: '{count} zones selected',
            selectedSingle: '{count} zone selected',
            toConfigure: '({count} to configure)',
        },
        summary: {
            title: 'Setup Complete!',
            subtitle: 'Your irrigation system is ready to go',
            deviceNameLabel: 'Device Name',
            masterValveLabel: 'Master Valve',
            zonesConfiguredLabel: 'Zones Configured',
            enabled: 'Enabled',
            disabled: 'Disabled',
            zonesCount: '{count} zones',
            zonesCountSingle: '{count} zone',
            allSetTitle: 'You are all set!',
            allSetBody: 'Your watering schedules are now active. You can always adjust settings from the dashboard.',
        },
        actions: {
            continue: 'Continue',
            configureZones: 'Configure Zones',
            goToDashboard: 'Go to Dashboard',
        },
        zoneNumber: 'Zone {number}',
    },
    mobilePermissions: {
        enableTitle: 'Enable {name}',
        enabledTitle: '{name} enabled',
        required: 'Required',
        permissions: {
            bluetooth: { name: 'Bluetooth', description: 'Required to connect to your device.' },
            location: { name: 'Location', description: 'Used to detect soil type and local weather.' },
            notifications: { name: 'Notifications', description: 'Receive alerts and updates.' },
        },
        allow: 'Allow {name}',
        skipAll: 'Skip All',
        skipForNow: 'Skip for Now',
        getStarted: 'Get Started',
        footerNote: 'You can change permissions later in Settings.',
    },
    mobilePowerMode: {
        title: 'Power Mode',
        powerSource: 'Power Source',
        currentBattery: 'Current Battery',
        mains: 'Mains Power',
        externalPower: 'External Power',
        batteryGood: 'Battery Good',
        batteryLow: 'Battery Low',
        selectPowerMode: 'Select Power Mode',
        infoNote: 'Power mode affects battery life and connectivity.',
        apply: 'Apply',
        saving: 'Saving...',
        saveFailed: 'Failed to save power mode',
        modes: {
            performance: {
                name: 'Performance',
                description: 'Best responsiveness and fastest updates.',
                features: {
                    update15: 'Updates every 15 min',
                    bleInstant: 'Instant BLE',
                    fullLogging: 'Full logging',
                },
            },
            balanced: {
                name: 'Balanced',
                description: 'Good balance of performance and battery.',
                features: {
                    update30: 'Updates every 30 min',
                    bleNormal: 'Normal BLE',
                    standardLogging: 'Standard logging',
                },
            },
            eco: {
                name: 'Eco',
                description: 'Maximize battery life with fewer updates.',
                features: {
                    updateHourly: 'Hourly updates',
                    bleReduced: 'Reduced BLE',
                    minimalLogging: 'Minimal logging',
                },
            },
        },
    },
    mobileSettings: {
        title: 'Settings',
        autoWaterDevice: 'AutoWater Device',
        statusLabel: 'Status: {status}',
        statusOnline: 'Online',
        statusOffline: 'Offline',
        switchDevice: 'Switch Device',
        sectionAccount: 'Account',
        profile: 'Profile',
        guest: 'Guest',
        deviceSettings: 'Device Settings',
        zoneConfiguration: 'Zone Configuration',
        wateringSchedules: 'Watering Schedules',
        rainDelay: 'Rain Delay',
        notifications: 'Notifications',
        alarms: 'Alarms',
        helpCenter: 'Help Center',
        firmware: 'Firmware',
        about: 'About',
        account: 'Account',
        premium: 'Premium',
        aiDoctor: 'AI Doctor',
        sectionDeviceConfiguration: 'Device',
        sectionAppPreferences: 'App Preferences',
        sectionCustomization: 'Customization',
        sectionSupport: 'Support',
        appearance: 'Appearance',
        themeDark: 'Dark',
        themeLight: 'Light',
        language: 'Language',
        selectLanguage: 'Select Language',
        units: 'Units',
        selectUnits: 'Select Units',
        metric: 'Metric',
        imperial: 'Imperial',
        disconnectDevice: 'Disconnect Device',
        appVersion: 'App Version',
    },
    mobileAuth: {
        titleAccount: 'Account',
        titleLogin: 'Login',
        titleSignup: 'Create account',
        titleConfirm: 'Confirm email',
        signedInUserFallback: 'Signed in user',
        firebaseNotConfiguredTitle: 'AWS Cognito is not configured.',
        firebaseNotConfiguredSubtitle: 'Add `VITE_AWS_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_APP_CLIENT_ID` in `.env`.',
        loading: 'Loading account state...',
        planLabel: 'Plan: {plan}',
        planPremium: 'Premium',
        planFree: 'Free',
        openProfile: 'Open profile',
        manageSubscription: 'Manage subscription',
        continueTo: 'Continue',
        signOut: 'Sign out',
        accessTitle: 'Account access',
        accessSubtitle: 'Login for sync, premium and AI Doctor access.',
        tabLogin: 'Login',
        tabSignup: 'Sign up',
        continueWithGoogle: 'Continue with Google',
        emailLabel: 'Email',
        emailPlaceholder: 'name@email.com',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Min 8 chars (upper, lower, number, symbol)',
        passwordPolicyHint: 'At least 8 characters, with uppercase, lowercase, number and symbol.',
        confirmPasswordLabel: 'Confirm password',
        confirmPasswordPlaceholder: 'Repeat password',
        submitLogin: 'Login',
        submitSignup: 'Create account',
        submitConfirm: 'Confirm',
        errorEmailPasswordRequired: 'Email and password are required.',
        errorEmailInvalid: 'Enter a valid email address.',
        errorPasswordsDontMatch: 'Passwords do not match.',
        errorPasswordPolicy: 'Password must be at least 8 characters and include uppercase, lowercase, number and symbol.',
        errorConfirmationCodeRequired: 'Confirmation code is required.',
        errorAuthFailed: 'Authentication failed.',
        confirmCodeTitle: 'Confirm your email',
        confirmCodeSubtitle: 'Enter the code sent to {email}.',
        confirmationCodeLabel: 'Confirmation code',
        confirmationCodePlaceholder: '123456',
        confirmCodeSentHint: 'Code sent. Check your email (and spam).',
        confirmCodeResentHint: 'Code resent. Check your email (and spam).',
        resendCode: 'Resend code',
        backToLogin: 'Back to login',
        guestTitle: 'Continue without account.',
        guestTitleActive: 'You are using guest mode.',
        continueAsGuest: 'Continue as guest',
        exitGuestMode: 'Exit guest mode',
    },
    mobilePremium: {
        title: 'Premium',
        cardTitle: 'AutoWatering Premium',
        cardSubtitle: 'Unlock AI Doctor diagnosis and camera plant identification. Start with a 7-day free trial.',
        checkoutSuccess: 'Checkout completed. Refreshing subscription...',
        checkoutCancelled: 'Checkout was cancelled.',
        errorCheckoutFailed: 'Failed to open checkout.',
        errorBillingPortalFailed: 'Failed to open billing portal.',
        backendNotConfiguredTitle: 'Billing backend is not configured.',
        backendNotConfiguredSubtitle: 'Add Cognito + subscription backend environment variables.',
        loginRequired: 'Login is required to manage premium subscription.',
        goToLogin: 'Go to login',
        statusPremiumActive: 'Premium active',
        statusFreePlan: 'Free plan',
        statusLabel: 'Status: {status}',
        statusUnknown: 'Unknown',
        planLabel: 'Plan: {plan}',
        renewsLabel: 'Renews: {date}',
        syncing: 'Syncing subscription status...',
        manageSubscription: 'Manage subscription',
        upgradeMonthly: 'Upgrade monthly',
        refreshStatus: 'Refresh status',
        working: 'Working...',
        includedTitle: 'Included usage',
        includedResetNote: 'Limits reset daily and monthly (UTC).',
        featurePlantId: 'Camera Plant ID',
        featurePlantIdDescription: 'Identify plants from a camera photo and auto-fill your zone plant type.',
        featureAiDoctor: 'AI Doctor',
        featureAiDoctorDescription: 'Detect common leaf diseases and get clear treatment guidance.',
        perDay: '{count}/day',
        perMonth: '{count}/month',
    },
    mobileUpsell: {
        title: 'Unlock Premium',
        subtitle: 'AI Doctor diagnosis and camera plant identification. Start with a 7-day free trial.',
        loginToUpgrade: 'Login to unlock',
        upgradeNow: 'Upgrade to Premium',
        buyPremium: 'Buy Premium',
        back: 'Back',
        notNow: 'Not now',
        disclaimer: 'Premium is linked to your account. You can manage or cancel anytime.',
    },
    mobileProfile: {
        title: 'Profile',
        emailStatus: 'Email status: {status}',
        emailVerified: 'Verified',
        emailNotVerified: 'Not verified',
        loading: 'Loading profile...',
        messageProfileUpdated: 'Profile updated.',
        messageVerificationSent: 'Verification email sent.',
        messagePasswordUpdated: 'Password updated.',
        errorProfileUpdateFailed: 'Profile update failed.',
        errorVerificationFailed: 'Failed to send verification email.',
        errorPasswordMismatch: 'New password and confirmation do not match.',
        errorPasswordChangeFailed: 'Failed to change password.',
        errorDeleteTypeDelete: 'Type DELETE to confirm account removal.',
        errorDeleteFailed: 'Failed to delete account.',
        sectionProfileDetails: 'Profile details',
        placeholderDisplayName: 'Display name',
        placeholderPhone: 'Phone',
        placeholderCompany: 'Company',
        placeholderCountry: 'Country',
        saveProfile: 'Save profile',
        saving: 'Saving...',
        sectionSecurity: 'Security',
        sendVerificationEmail: 'Send verification email',
        placeholderCurrentPassword: 'Current password',
        placeholderNewPassword: 'New password',
        placeholderConfirmNewPassword: 'Confirm new password',
        changePassword: 'Change password',
        sectionAccountActions: 'Account actions',
        signOut: 'Sign out',
        deleteAccountTitle: 'Delete account',
        deleteAccountHint: 'This removes your account record and cloud data. Type DELETE to confirm.',
        placeholderDeletePassword: 'Current password',
        placeholderTypeDelete: 'Type DELETE',
        deleteAccountButton: 'Delete account',
        deleting: 'Deleting...',
        working: 'Working...',
    },
    mobileAiDoctor: {
        title: 'AI Doctor',
        cardTitle: 'Plant disease assistant',
        cardSubtitle: 'Upload a clear leaf photo, then add symptoms for better diagnosis.',
        notConfiguredTitle: 'AI Doctor is not configured.',
        notConfiguredSubtitle: 'Set VITE_AI_DOCTOR_API_URL.',
        premiumOnlyTitle: 'AI Doctor is available only on Premium.',
        upgradeToPremium: 'Upgrade to premium',
        checkingSubscription: 'Checking subscription status...',
        chooseLeafPhoto: 'Choose leaf photo',
        previewAlt: 'Plant preview',
        symptomsLabel: 'Symptoms (optional)',
        symptomsPlaceholder: 'Example: yellow spots, curling leaves, white powder, stem rot...',
        analyzing: 'Analyzing...',
        analyzeButton: 'Analyze disease risk',
        diagnosisFailedTitle: 'Diagnosis failed',
        unknownPlant: 'Unknown plant',
        confidenceLabel: 'Confidence: {value}',
        healthStatusLabel: 'Health status:',
        healthLikelyHealthy: 'Likely healthy',
        healthPossibleDisease: 'Possible disease detected',
        healthUnknown: 'Unknown',
        diseaseCandidatesTitle: 'Disease candidates',
        diseaseCandidatesEmpty: 'No disease candidates reported.',
        followUpQuestionTitle: 'Follow-up question',
        aiTreatmentGuidanceTitle: 'AI treatment guidance',
        disclaimer: 'AI guidance is advisory only. Confirm severe diseases with an agronomist before applying high-risk treatments.',
    },
    mobilePlantId: {
        loginRequired: 'Login required for camera plant identification.',
        checkingSubscription: 'Checking subscription status...',
        premiumOnly: 'Camera plant identification is available only on Premium.',
        noLocalMatch: 'Plant was identified by API, but no matching plant exists in local database.',
        identificationFailed: 'Plant identification failed.',
        reviewTitle: 'Review detection',
        reviewAmbiguous: 'The detection is uncertain. Pick the best local match.',
        reviewNoLocal: 'No exact local match was found. Choose the closest plant.',
        detectedByCamera: 'Detected by camera',
        matchConfidence: 'Match confidence: {value}%',
        suggestedLocal: 'Suggested local plant',
        chooseManually: 'Choose manually',
        useThis: 'Use this plant',
        matchSaved: 'Plant selection saved.',
    },
    mobilePacksSettings: {
        syncError: 'Could not sync pack data from device.',
        title: 'Packs & Plants',
        loading: 'Loading...',
        tabs: {
            plants: 'Plants',
            packs: 'Packs',
        },
        storage: {
            flash: 'Flash',
            romPlants: 'ROM plants',
            customPlants: 'Custom plants',
        },
        plants: {
            builtIn: 'Built-in plants',
            installed: 'Installed plants',
        },
        labels: {
            id: 'ID',
            version: 'v',
            pack: 'Pack',
        },
        customPlants: {
            title: 'Custom plants',
            empty: 'No custom plants installed',
            emptyHint: 'Install plants from Marketplace to see them here.',
            create: 'Create plant',
        },
        romPlants: {
            title: 'Built-in plant database',
            plantsCount: 'plants',
            showMore: 'Show more',
        },
        packs: {
            installed: 'Installed packs',
            empty: 'No packs installed',
            emptyHint: 'Install a pack to see grouped plants here.',
        },
        updates: {
            checking: 'Checking updates...',
            check: 'Check updates',
            upToDate: 'Everything is up to date.',
            available: 'Updates are available.',
        },
        plantDetails: {
            plantId: 'Plant ID',
            packId: 'Pack ID',
            version: 'Version',
            bleOnlyNote: 'This detail is read from BLE payload.',
            cropCoefficients: 'Crop coefficients',
            growthStages: 'Growth stages',
            stageIni: 'Initial',
            stageDev: 'Development',
            stageMid: 'Mid',
            stageEnd: 'End',
            rootDepth: 'Root depth',
            depletionFraction: 'Depletion fraction',
            tolerances: 'Tolerances',
            droughtTolerance: 'Drought',
            shadeTolerance: 'Shade',
            salinityTolerance: 'Salinity',
            recommendedMethod: 'Recommended irrigation',
            close: 'Close',
        },
        packDetails: {
            plantsInPack: 'Plants in this pack',
            noPlants: 'No plants found in this pack.',
            close: 'Close',
        },
    },
    mobileTimeLocation: {
        title: 'Time & Location',
        deviceTime: 'Device Time',
        syncing: 'Syncing...',
        syncNow: 'Sync Now',
        syncSuccess: 'Time synced',
        syncFailed: 'Failed to sync time',
        timezone: 'Timezone',
        timezones: {
            bucharest: 'Bucharest',
            london: 'London',
            berlin: 'Berlin',
            newYork: 'New York',
            losAngeles: 'Los Angeles',
            custom: 'Custom',
        },
        utcOffset: 'UTC Offset {offset}',
        dst: {
            sectionTitle: 'Daylight Saving Time (DST)',
            toggleTitle: 'DST enabled',
            disabledHint: 'Disabled. Enable DST if your timezone observes seasonal clock changes.',
            summary: 'Starts {startWeek} {startDow} of {startMonth}, ends {endWeek} {endDow} of {endMonth} ({offset} min)',
            weekNth: '{n}th',
            weekLast: 'last',
        },
        advancedTitle: 'Advanced settings',
        advancedSubtitle: 'Offsets and DST rules',
        advanced: {
            utcOffsetMinutes: 'UTC offset (minutes)',
            dstOffsetMinutes: 'DST offset (minutes)',
            dstStart: 'DST start rule',
            dstEnd: 'DST end rule',
        },
        locationCoordinates: 'Location Coordinates',
        latitude: 'Latitude',
        longitude: 'Longitude',
        degrees: 'deg',
        getLocation: 'Get Location',
        locationHint: 'Use GPS to update the device location.',
        locationFailed: 'Failed to get location',
        saving: 'Saving...',
        saveSettings: 'Save Settings',
        saveSuccess: 'Settings saved',
        saveFailed: 'Failed to save settings',
    },
    mobileRainSensor: {
        title: 'Rain Sensor',
        updated: 'Updated {minutes} min ago',
        loadFailed: 'Failed to load from device',
        statusTitle: 'Status',
        sensorActive: 'Sensor active',
        sensorInactive: 'Sensor inactive',
        lastPulse: 'Last pulse',
        never: 'Never',
        rainLast24h: 'Last 24h',
        rainLastHour: 'Last hour',
        enableTitle: 'Rain sensor',
        enableSubtitle: 'Enable tipping-bucket input',
        integrationTitle: 'Rain integration',
        integrationSubtitle: 'Use rain for skip/reduction decisions',
        calibrationTitle: 'Calibration',
        calibrationHint: 'Set mm/pulse and debounce to match your sensor.',
        calibrate: 'Calibrate',
        mmPerPulse: 'mm per pulse',
        debounceMs: 'Debounce (ms)',
        advancedTitle: 'Advanced',
        sensitivityPct: 'Sensitivity (%)',
        skipThresholdMm: 'Skip threshold (mm)',
        advancedHint: 'Note: per-zone thresholds take precedence. FAO-56 auto modes already incorporate rainfall.',
        saving: 'Saving...',
        save: 'Save',
        saveSuccess: 'Saved',
        saveFailed: 'Failed to save',
        calibrationRequested: 'Calibration requested',
        calibrationFailed: 'Calibration failed',
    },
    mobileWeatherDetails: {
        title: 'Weather',
        updated: 'Updated {minutes} min ago',
        soilMoisture: {
            title: 'Soil Moisture',
            wateringNeeded: 'Watering needed',
            wateringSkipped: 'Watering skipped',
            sufficient: 'Sufficient',
            consider: 'Consider watering',
        },
        soilMoistureOverride: {
            title: 'Soil moisture override',
            subtitle: 'Calibrate the estimate used for rain effectiveness and FAO-56 calculations.',
            enabledLabel: 'Override enabled',
            valueLabel: 'Soil moisture',
            scopeGlobal: 'Global',
            globalDerived: 'Global is derived from per-zone overrides and cannot be set.',
            modelTitle: 'Suggested by weather model',
            modelValue: 'Open-Meteo (0-9cm) at {time}: {value} (VWC {vwc})',
            modelNoLocation: 'Set your location to enable suggestions.',
            modelNoSoilParams: 'Soil parameters missing for this selection (FC/WP).',
            modelFailed: 'Could not load model estimate.',
            modelSetLocation: 'Set location',
            modelSetSoil: 'Set soil type',
            hint: 'Per-zone overrides (if enabled) take precedence over the global fallback.',
            reset: 'Reset to default',
            notConnected: 'Connect to the device to change this setting.',
            loadFailed: 'Failed to load from device. Showing last known value.',
            saveFailed: 'Failed to save to device.',
        },
        zoneOverview: 'Zone Overview',
        temperature: 'Temperature',
        highLabel: 'High {value}',
        dewLabel: 'Dew {value}',
        humidity: 'Humidity',
        last24h: 'Last 24h',
        rainfall: 'Rainfall',
        windDirection: 'Wind Direction',
        windSpeed: 'Wind Speed',
        forecast: {
            title: 'Forecast',
            rainPercent: 'Rain',
            temp: 'Temp',
        },
        forecastLabels: {
            now: 'Now',
            plus3h: '+3h',
            plus6h: '+6h',
            plus12h: '+12h',
            plus24h: '+24h',
        },
        units: {
            mm: 'mm',
            kmh: 'km/h',
        },
    },
    mobileWelcome: {
        appName: 'AutoWater',
        tagline: 'Smart irrigation control',
        connectingTo: 'Connecting to {name}',
        savedDevices: 'Saved Devices',
        lastConnected: 'Last connected {date}',
        addNewDevice: 'Add New Device',
        setupNewDevice: 'Set Up New Device',
        terms: 'By continuing you agree to the Terms and Privacy Policy.',
    },
    mobileZoneConfig: {
        title: 'Zone Config',
        zoneNotFound: 'Zone not found',
        zoneName: 'Zone Name',
        zoneNamePlaceholder: 'Enter zone name',
        plantType: 'Plant Type',
        selectPlant: 'Select Plant',
        cropCoefficient: 'Crop Coefficient',
        soilType: 'Soil Type',
        selectSoil: 'Select Soil',
        sunExposure: 'Sun Exposure',
        sun: {
            full: 'Full Sun',
            fullDesc: '6+ hours of direct sunlight',
            partial: 'Partial Sun',
            partialDesc: '3-6 hours of direct sunlight',
            shade: 'Shade',
            shadeDesc: 'Less than 3 hours of sunlight',
        },
        areaSize: 'Area Size',
        areaUnit: 'm2',
        calculatedSettings: 'Calculated Settings',
        autoBadge: 'AUTO',
        dailyWaterNeed: 'Daily Water Need',
        recommendedCycle: 'Recommended Cycle',
        frequency: 'Frequency',
        everyTwoDays: 'Every 2 days',
        advancedSettings: 'Advanced Settings',
        save: 'Save',
        selectPlantTitle: 'Select Plant',
        searchPlants: 'Search plants...',
        noPlants: 'No plants found',
        selectSoilTitle: 'Select Soil',
        searchSoils: 'Search soils...',
        noSoils: 'No soils found',
    },
    mobileZoneDetails: {
        title: 'Zone Details',
        zoneNotFound: 'Zone not found',
        loadingZone: 'Loading zone...',
        general: 'General',
        waterNeedLow: 'Low',
        waterNeedNormal: 'Normal',
        waterNeedHigh: 'High',
        waterNeedSuffix: 'water need',
        remainingLabel: 'Remaining',
        idleLabel: 'Idle',
        nextSchedule: 'Next schedule: {time}',
        quickActions: 'Quick Actions',
        skipNext: 'Skip Next',
        healthStats: 'Health Stats',
        soilMoisture: 'Soil Moisture',
        lastRunUsage: 'Last run usage',
        watering: 'Watering',
        startManualCycle: 'Start Manual Cycle',
        plantTitle: 'Plant',
        plantId: 'Plant ID {id}',
        soilId: 'Soil ID {id}',
        methodId: 'Method ID {id}',
        customSoilName: 'Custom soil: {name}',
        customSatellite: 'Custom satellite',
        typeValue: 'Type {value}',
        modeValue: 'Mode {value}',
        everyXDays: 'Every {count} days',
        inlineSeparator: ' | ',
        smartStatsTitle: 'Smart Stats',
        needBadge: 'Needs Water',
        calculatedVolume: 'Calculated Volume',
        stageLabel: 'Stage {stage}',
        afterPlanting: 'After planting',
        rainBenefit: 'Rain benefit',
        waterDeficit: 'Water deficit',
        waterManagement: 'Water Management',
        savedToDevice: 'Saved to device',
        intervalModeLoadFailed: 'Cycle & Soak timing could not be loaded. Durations were not saved.',
        intervalModeUnsupported: 'Cycle & Soak timing is not supported by your firmware.',
        manualControl: 'Manual Control',
        advancedZoneControls: 'Advanced zone controls',
        tapToStartCycle: 'Tap to start {minutes} min cycle',
        resetConfirmBody: 'Reset zone settings to defaults?',
        wateringModeTitle: 'Watering Mode',
        wateringModeSubtitle: 'Choose how this zone is watered',
        wateringModeSmartDesc: 'Automatic, weather-based watering',
        wateringModeManualDesc: 'Fixed schedule and amount',
        smartAutoTitle: 'Smart Auto',
        recommendedBadge: 'Recommended',
        smartAutoDesc: 'Calculates water needs automatically.',
        smartEcoTitle: 'Smart Eco',
        waterSaverBadge: 'Water Saver',
        smartEcoDesc: 'Uses less water while keeping plants healthy.',
        fixedDurationDesc: 'Water for a fixed time each cycle.',
        fixedVolumeDesc: 'Water until a fixed volume is reached.',
        scheduleActiveTitle: 'Schedule Active',
        scheduleActiveSubtitle: 'Zone will water automatically.',
        wateringDaysLabel: 'Watering Days',
        startTimeLabel: 'Start Time',
        solarTimingTitle: 'Solar Timing',
        solarTimingSubtitle: 'Based on sunrise and sunset',
        allLabel: 'All',
        cameraTitle: 'Identify Plant',
        cameraSubtitle: 'Use camera to detect plant',
        cameraComingSoon: 'Camera identification coming soon',
        browseDatabase: 'Browse database',
        searchPlantsPlaceholder: 'Search plants...',
        soilTitle: 'Soil',
        detectFromGpsTitle: 'Detect from GPS',
        detectFromGpsSubtitle: 'Use location to detect soil',
        soilDetectUnavailable: 'Soil detection unavailable',
        soilDetectGpsDenied: 'GPS permission denied',
        soilDetectNotAvailable: 'Soil detection not available',
        soilDetectFailed: 'Soil detection failed',
        noCustomSoilProfile: 'No custom soil profile. Tap "Detect from GPS" first.',
        customSoilTitle: 'Custom Soil',
        customSoilGps: 'Custom soil: {name}',
        customSoilSaved: 'Custom soil saved: {name}',
        customSoilEnabled: 'Custom soil enabled',
        soilComposition: 'Soil composition',
        disableButton: 'Disable',
        orSelectType: 'Or select soil type',
        satelliteDetectedTitle: 'Satellite detected',
        satelliteDetectedSubtitle: 'Soil data from satellite',
        searchSoilPlaceholder: 'Search soils...',
        irrigationTitle: 'Irrigation Method',
        irrigationSubtitle: 'Select irrigation method',
        efficiencyLabel: 'Efficiency {value}%',
        applicationRateLabel: 'Application rate {value} mm/h',
        coverageTitle: 'Coverage',
        coverageQuestion: 'How is this zone covered?',
        coverageAreaLabel: 'By area',
        coverageAreaDesc: 'Set the area in square meters',
        coveragePlantsLabel: 'By plants',
        coveragePlantsDesc: 'Set number of plants',
        units: {
            mm: 'mm',
            mmPerDay: 'mm/day',
            days: 'days',
            squareMeters: 'm2',
            plants: 'plants',
        },
        quickPresets: 'Quick presets',
        sunExposureTitle: 'Sun Exposure',
        sunExposureQuestion: 'How much sun does this zone get?',
        sunShadeDesc: 'Mostly shade',
        sunPartialDesc: 'Partial sun',
        sunFullDesc: 'Full sun',
        sunInfoNote: 'Sun exposure affects water needs.',
        rainAdjustmentTitle: 'Rain Adjustment',
        rainAdjustmentOn: 'Rain adjustment on',
        rainAdjustmentOff: 'Rain adjustment off',
        rainAdjustmentOnDesc: 'Reduce watering when rain is expected.',
        rainAdjustmentOffDesc: 'No rain-based adjustments.',
        rainAdjustmentQuestion: 'How sensitive should it be?',
        rainPresets: {
            lightLabel: 'Light',
            lightDesc: 'Low sensitivity, small reduction',
            normalLabel: 'Normal',
            normalDesc: 'Balanced sensitivity and reduction',
            strongLabel: 'Strong',
            strongDesc: 'High sensitivity, larger reduction',
        },
        rainAdjustmentInfo: 'Adjust watering based on forecast rain.',
        tempAdjustmentTitle: 'Temperature Adjustment',
        tempAdjustmentOn: 'Temperature adjustment on',
        tempAdjustmentOff: 'Temperature adjustment off',
        tempAdjustmentOnDesc: 'Increase watering on hot days.',
        tempAdjustmentOffDesc: 'No temperature adjustments.',
        tempAdjustmentQuestion: 'How sensitive should it be?',
        tempPresets: {
            lightLabel: 'Light',
            lightDesc: 'Low sensitivity, small increase',
            normalLabel: 'Normal',
            normalDesc: 'Balanced sensitivity and increase',
            strongLabel: 'Strong',
            strongDesc: 'High sensitivity, larger increase',
        },
        tempAdjustmentInfo: 'Adjust watering based on temperature.',
        cycleSoakEnabledDesc: 'Cycle & Soak enabled',
        cycleSoakDisabledDesc: 'Cycle & Soak disabled',
        cycleSoakInfo: 'Helps prevent runoff on slow soils.',
        cycleDurationLabel: 'Cycle duration',
        cycleDurationHint: 'Short cycles reduce runoff.',
        soakDurationLabel: 'Soak duration',
        soakDurationHint: 'Time between cycles.',
        maxVolumePerWatering: 'Max volume per watering',
        maxVolumeHint: 'Limit to prevent overwatering.',
        scheduleAutomatic: 'Automatic',
        scheduleAutoNote: 'Automatic schedule based on weather.',
        growingEnvironmentTitle: 'Growing Environment',
        detectedFromGps: 'Detected from GPS',
        estimatedVolume: 'Estimated volume',
        smartWateringActive: 'Smart watering active',
        adjustmentsAutomatic: 'Adjustments are automatic',
        smartModeDescription: 'Based on weather, soil, and plants.',
        currentWeatherImpact: 'Current weather impact',
        waterLossLabel: 'Water loss',
        waterLossPerDay: 'Water loss per day',
        plantNeedsLabel: 'Plant needs',
        plantNeedsNote: 'Adjusted for plant type',
        plantNeedsPerDay: 'Plant needs per day',
        rainBenefitPositive: 'Rain adds water',
        rainBenefitNone: 'No rain benefit',
        summaryNeeds: 'Needs water',
        summaryEnough: 'Enough water',
        todaysAdjustment: 'Adjustment today',
        lessWater: 'Less water',
        normalWater: 'Normal',
        moreWater: 'More water',
        noWeatherAdjustments: 'No adjustments today',
        hotWeatherNote: 'Hot weather increased watering',
        rainWeatherNote: 'Rain reduced watering',
        weatherAdjustments: 'Weather adjustments',
        enabledLabel: 'Enabled',
        recentRain: 'Recent rain: {value} {unit}',
        skipNextWatering: 'Skip next watering',
        usingLessWater: 'Using less water',
        waitingForRain: 'Waiting for rain',
        tapSettingsToEnable: 'Tap settings to enable',
        currentTemp: 'Current temp',
        tempFactor: 'Temp factor',
        baseTemp: 'Base temp',
        noCompensationConfigured: 'No compensation configured',
        enableCompensationHint: 'Enable adjustments in settings',
        configureCompensation: 'Configure compensation',
        compensationModeHint: 'Compensation is available only for Duration/Volume modes. Switch from FAO-56 to configure it.',
        allTime: 'All time',
        totalRuns: 'Total runs',
        avgLiters: 'Avg liters',
        lastLiters: 'Last liters',
        lastRun: 'Last run',
        recentActivity: 'Recent activity',
        noHistory: 'No history',
        errorCode: 'Error code {code}',
        statusPartial: 'Partial',
        days: {
            sun: 'Sun',
            mon: 'Mon',
            tue: 'Tue',
            wed: 'Wed',
            thu: 'Thu',
            fri: 'Fri',
            sat: 'Sat',
        },
        modeLabels: {
            fao56Auto: 'Auto (FAO-56)',
            fao56Eco: 'Eco (FAO-56)',
        },
    },
    loadingScreen: {
        loadingData: 'Loading data...',
        syncCheckingSetup: 'Checking setup...',
        syncReadingSensors: 'Reading sensors...',
        syncReadingRain: 'Reading rain data...',
        syncReadingStatus: 'Reading system status...',
        syncReadingConfig: 'Reading configuration...',
        syncReadingMoisture: 'Reading moisture...',
        syncReady: 'Ready!',
    },
    appSettings: {
        title: 'App Settings',
        notifications: 'Notifications',
        pushNotifications: 'Push Notifications',
        alertsUpdates: 'Alerts and updates',
        appearance: 'Appearance',
        darkMode: 'Dark Mode',
        useDarkTheme: 'Use dark theme',
        language: 'Language',
        selectLanguage: 'Select language',
        units: 'Units',
        metricLabel: 'Metric ({temp}, {volume}, {length})',
        imperialLabel: 'Imperial ({temp}, {volume}, {length})',
        autoDetectedRegion: 'Auto-detected from your region: {locale}',
        dataPrivacy: 'Data & Privacy',
        exportData: 'Export Data',
        exportDesc: 'Download your watering history',
        clearAppData: 'Clear App Data',
        clearAppDesc: 'Remove local cache and settings',
        backupToAccount: 'Back Up to Account',
        backupToAccountDesc: 'Save app preferences and device list to the cloud',
        restoreFromAccount: 'Restore from Account',
        restoreFromAccountDesc: 'Load saved app preferences from cloud backup',
        backupSaved: 'Backup saved to your account.',
        backupNotFound: 'No cloud backup found for this account.',
        backupRestored: 'Backup restored from your account.',
        uxMode: 'Display Mode',
        advancedMode: 'Advanced Mode',
        advancedModeDesc: 'Show technical details like pH, FAO-56 Kc values',
    },
    ecoBadge: {
        rainDetected: 'Rain Detected',
        monitor: 'Eco Monitor',
        last24h: '{amount} mm last 24h',
        zonesPaused: '{count} zone{plural} paused',
    },
    hydraulicStatus: {
        statusNominal: 'System Nominal',
        flowMonitoringActive: 'Flow monitoring active',
        monitoringDisabled: 'Monitoring Disabled',
        protectionInactive: 'Protection inactive',
        systemLocked: 'System Locked',
        warning: 'Warning',
        view: 'View',
        lockReasons: {
            highFlow: 'High flow detected',
            noFlow: 'No flow detected',
            unexpected: 'Unexpected flow',
            mainlineLeak: 'Mainline leak',
            allClear: 'All clear',
            unknown: 'Unknown anomaly',
        },
    },
    hydraulicDetails: {
        title: 'Hydraulic Profile',
        statusLocked: 'Locked',
        statusLearning: 'Learning',
        statusActive: 'Active',
        profileAuto: 'Auto',
        profileSpray: 'Spray',
        profileDrip: 'Drip',
        profileUnknown: 'Unknown',
        alertHighFlow: 'High flow detected',
        alertNoFlow: 'No flow detected',
        alertLeak: 'Unexpected flow detected',
        alertMainline: 'Mainline leak detected',
        alertAnomaly: 'Flow anomaly detected',
        lockDescription: 'Hydraulic safety lock is active. Check for leaks or blockages before resuming watering.',
        flowRate: 'Flow Rate',
        variance: 'Variance',
        estimated: 'Estimated',
        calibrating: 'Calibrating {current}/{total}',
    },
    soilTank: {
        title: 'Soil Tank',
        subtitle: 'Smart Soil Moisture',
        currentDeficit: 'Current Deficit',
        etcToday: 'ETc Today',
        nextVolume: 'Next Volume',
        irrigationNeeded: 'Irrigation needed',
    },
    locationPicker: {
        instruction: 'Tap the map to set a location',
        selectedTitle: 'Selected Location',
        sourceLabel: 'Source',
        sourceGps: 'GPS',
        sourceMap: 'Map',
        sourceManual: 'Manual',
        hideManual: 'Hide manual entry',
        manualEntry: 'Manual entry',
        latitude: 'Latitude',
        longitude: 'Longitude',
        setLocation: 'Set location',
        invalidCoordinates: 'Invalid coordinates',
        latitudeRange: 'Latitude must be between -90 and 90',
        longitudeRange: 'Longitude must be between -180 and 180',
    },
};

// Romanian translations
export const ro: TranslationKeys = {
    common: {
        next: 'Înainte',
        back: 'Înapoi',
        cancel: 'Anulează',
        save: 'Salvează',
        saving: 'Se salveaza...',
        confirm: 'Confirmă',
        close: 'Închide',
        loading: 'Se încarcă...',
        error: 'Eroare',
        success: 'Succes',
        skip: 'Sări',
        skipAll: 'Sari tot',
        skipped: 'Sarite',
        all: 'Toate',
        useDefaults: 'Folosește valorile implicite',
        undo: 'Anulează acțiunea',
        yes: 'Da',
        no: 'Nu',
        ok: 'OK',
        retry: 'Reîncearcă',
        continue: 'Continu?',
        finish: 'Finalizeaz?',
        change: 'Schimb?',
        selected: 'Selectat',
        optional: 'Op?ional',
        notSet: 'Nesetat',
        notAvailable: 'N/A',
        warning: 'Atentie',
        on: 'Pornit',
        off: 'Oprit',
        start: 'Porne?te',
        stop: 'Opre?te',
        edit: 'Editeaz?',
        apply: 'Aplic?',
        fix: 'Rezolva',
        refresh: 'Reimprospateaza',
        pressBackAgainToExit: 'Apasa inca o data inapoi pentru a iesi',
        showAll: 'Arată tot',
        showLess: 'Arată mai puțin',
        view: 'Vezi',
        set: 'Seteaza',
        advanced: 'Avansat',
        minutes: 'minute',
        minutesShort: 'min',
        secondsShort: 's',
        hours: 'ore',
        hoursShort: 'h',
        daysShort: 'z',
        days: 'zile',
        liters: 'litri',
        litersShort: 'L',
        litersPerMinuteShort: 'L/min',
        mlShort: 'ml',
        mm: 'mm',
        mmPerHour: 'mm/h',
        squareMetersShort: 'm2',
        squareFeetShort: 'ft2',
        metersShort: 'm',
        degreesC: '°C',
        degreesF: '°F',
        gallonsShort: 'gal',
        inchesShort: 'in',
        hPa: 'hPa',
        percent: '%',
        am: 'AM',
        pm: 'PM',
    },

    labels: {
        active: 'Activ',
        inactive: 'Inactiv',
        unknown: 'Necunoscut',
        none: 'Niciunul',
        total: 'Total',
        totalVolume: 'Volum Total',
        sessions: 'Sesiuni',
        successRate: 'Rată de succes',
        temperature: 'Temperatură',
        humidity: 'Umiditate',
        pressure: 'Presiune',
        rainfall: 'Precipitații',
        avg: 'Medie',
        min: 'Min',
        max: 'Max',
        current: 'Curent',
        daily: 'Zilnic',
        hourly: 'Orar',
        monthly: 'Lunar',
        recent: 'Recent',
        summary: 'Sumar',
        filter: 'Filtru',
        clear: 'Șterge',
        queue: 'Coadă',
        pending: 'în așteptare',
        status: 'Stare',
        uptime: 'Timp funcționare',
        errors: 'Erori',
        power: 'Alimentare',
        flow: 'Flux',
        alarm: 'Alarmă',
        progress: 'Progres',
        target: 'Țintă',
        time: 'Timp',
        volume: 'Volum',
        manual: 'Manual',
        schedule: 'Program',
        remote: 'La distanță',
        last: 'Ultima',
        lastActive: 'Ultima activitate',
        efficiency: 'Eficiență',
    },

    soilMoisture: {
        optimal: 'Optim',
        fair: 'Mediu',
        low: 'Scazut',
    },

    wizard: {
        title: 'Asistent de Configurare',
        exitConfirmTitle: 'Ieși din wizard?',
        exitConfirmMessage: 'Ai modificări nesalvate. Dacă ieși acum, progresul va fi pierdut.',
        exitConfirmCancel: 'Rămân',
        exitConfirmExit: 'Ieși',
        zoneStepTitle: 'Zona {index} - {step}',
        zoneProgress: 'Zona {current}/{total}',

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
            rainCalibration: 'Calibrare (mm pe puls)',
            rainCompNote: 'Set?rile de compensare a ploii sunt configurate pe zon? pentru modurile TIMP/VOLUM. Modurile FAO-56 folosesc automat datele de ploaie.',
            powerMode: 'Mod Alimentare',
            selectPowerMode: 'Selectează Modul de Alimentare',
            powerModes: {
                normal: 'Normal',
                lowPower: 'Consum redus',
                alwaysOn: 'Mereu pornit',
            },
            flowCalibration: 'Calibrare Debit',
            pulsesPerLiter: 'Impulsuri pe Litru',
            flowCalibrationNote: 'Implicit: 750 pulsuri/L. Folose?te asistentul de calibrare din Set?ri pentru o valoare precis?.',
            skipToZones: 'Sari la Zone',
        },

        zone: {

            selectTitle: 'Selecteaz? zona',
            selectSubtitle: 'Alege o zon? de configurat',
            nameLabel: 'Nume zona',
            namePrompt: 'Cum numești această zonă?',
            namePlaceholder: 'ex: Grădină față, Roșii, Gazon...',
            selectMode: 'Selectează modul de udare:',
            summary: 'Rezumat Zonă',
            cloneTitle: 'Configurare rapidă',
            cloneDescription: 'Copiază setările din',
            cloneButton: 'Copiază',
            useLocationFrom: 'Folosește locația din',
            copyFrom: 'Copiaz? din...',
            copyConfig: 'Copiaza setari',
            skipZone: 'Sari peste zona',
            testValve: 'Test ({seconds}s)',
            testing: 'Testare...',
            previouslyConfigured: 'Configurat anterior',
            features: 'Func?ii:',
            quickSetupTitle: 'Configurare rapid?',
            quickSetupSubtitle: 'Copiaz? set?rile din "{zone}"',
            featureRainComp: 'Comp. ploaie',
            featureTempComp: 'Comp. temp.',
            featureCycleSoak: 'Ciclu/Pauz?',
            featurePlanted: 'Plantat',
            featureVolumeLimit: 'Limita volum',
            featureWater: 'Apa',
            skipAllTitle: 'Sari toate zonele ramase?',
            skipAllMessage: 'Vor fi sarite {count} zone. Poti configura mai tarziu.',
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
        manual: {
            durationTitle: 'Durat? udare',
            durationLabel: 'Durat? (minute)',
            volumeTitle: 'Volum ?int?',
            volumeLabel: 'Volum (litri)',
        },

        compensation: {
            rainTitle: 'Compensare ploaie',
            rainEnable: 'Activeaz? compensarea ploii',
            rainDesc: 'Ajusteaza udarea pe baza ploilor recente',
            sensitivity: 'Sensibilitate',
            skipThreshold: 'Sari dac? ploaia dep??e?te:',
            lookbackPeriod: 'Perioad? de referin??:',
            lookbackHours: 'ore',
            rainSummary: '{sensitivity}% • Sari >{threshold}mm',
            tempTitle: 'Compensare temperatur?',
            tempEnable: 'Activeaz? compensarea temperaturii',
            tempDesc: 'Creste udarea in zilele calde, reduce in zilele reci',
            baseTemp: 'Temperatur? de baz?:',
            tempSensitivity: 'Sensibilitate',
            tempNote: 'La {temp}{unit} nu se ajusteaza. Temperaturile mai mari = mai multa apa (pana la 30% extra), cele mici = mai putina.',
            tempSummary: 'Baza {temp}{unit} • {sensitivity}%',
        },

        status: {
            faoReadyTitle: 'FAO-56 Preg?tit ?',
            faoReadyDesc: 'Toate cerin?ele sunt ?ndeplinite pentru calcul automat ET?',
        },

        messages: {
            keepCurrentSettings: 'Selecteaz? valori noi pentru a schimba, sau apas? ?nainte pentru a p?stra set?rile curente.',
            adjustValuesHint: 'Ajusteaz? valorile dac? e nevoie, sau apas? ?nainte pentru a p?stra set?rile curente.',
            skipConfiguredNote: 'Setarile configurate vor fi sarite. Poti reconfigura manual oricand.',
            saveOnSchedule: 'Configurarea se salveaza cand treci la programare.',
            soilIrrigationConfigured: 'Sol si irigare configurate deja',
            soilConfigured: 'Sol configurat deja',
            irrigationConfigured: 'Irigare configurata deja',
            coverageSunConfigured: 'Acoperire si soare configurate deja',
            coverageConfigured: 'Acoperire configurata deja',
            sunConfigured: 'Expunere solara configurata deja',
        },
        warnings: {
            irrigationDripPreferred: '{plant} prefer? irigare prin picurare. Sprinkler poate cauza boli foliare.',
            lawnSprinklerPreferred: 'Gazonul se ud? de obicei cu sprinkler pentru acoperire uniform?. Drip func?ioneaz?, dar necesit? spa?iere atent?.',
            slowSoilCycleSoak: 'Solul {soil} absoarbe apa lent. Recomand?m activarea Ciclu & Pauz? pentru a preveni scurgerea.',
            largeArea: 'Suprafa?? mare! Asigur?-te c? debitul sistemului este suficient pentru acoperire uniform?.',
            manyPlants: 'Multe plante pe un singur canal. Verific? dac? toate primesc ap? suficient?.',
            highSunExposure: 'Expunere mare la soare. Plantele vor avea nevoie de mai mult? ap? ?n zilele c?lduroase.',
            lowSunExposure: '{plant} prefer? soarele. ?n umbr? total? poate avea probleme de cre?tere.',
        },

        tutorial: {
            skip: 'Sari peste tur',
            stepProgress: 'Pasul {current} din {total}',
        },

        tooltips: {
            exampleLabel: 'Exemplu:',
            items: {
                fao56: {
                    title: 'Ce este FAO-56?',
                    description: 'O metod? ?tiin?ific? dezvoltat? de ONU (FAO) pentru calculul precis al nevoilor de ap? ale plantelor. Ia ?n considerare tipul plantei, solul, vremea ?i faza de cre?tere.',
                    example: 'Folosit? de ferme ?i gr?dini profesionale ?n peste 150 de ??ri.',
                },
                fieldCapacity: {
                    title: 'Capacitate de c?mp (Field Capacity)',
                    description: 'Cantitatea maxim? de ap? pe care solul o poate re?ine ?mpotriva gravita?iei. Ca un burete ud ? apa care nu se scurge.',
                    example: 'Nisip: ~15%, Argil?: ~45%, Loam: ~35%',
                },
                wiltingPoint: {
                    title: 'Punct de ofilire (Wilting Point)',
                    description: 'Nivelul de umiditate la care plantele nu mai pot extrage ap? ?i ?ncep s? se ofileasc?. Sub acest nivel = stres.',
                    example: 'Nisip: ~5%, Argil?: ~25%, Loam: ~15%',
                },
                infiltrationRate: {
                    title: 'Rat? de infiltrare',
                    description: 'C?t de repede absoarbe solul apa. Nisipul absoarbe rapid (risc de scurgere ?n ad?ncime), argila lent (risc de b?ltire).',
                    example: 'Nisip: 25+ mm/h, Argil?: 3-5 mm/h',
                },
                cycleSoak: {
                    title: 'Ciclu & Pauz?',
                    description: 'Tehnic? pentru soluri grele: uzi pu?in, pauz? de absorb?ie, repe?i. Previne scurgerea ?i b?ltirea.',
                    example: 'Argil?: 3 min udare, 20 min pauz?, repet? de 3 ori',
                },
                kc: {
                    title: 'Coeficient Kc',
                    description: 'Raportul dintre consumul de ap? al plantei tale ?i cel al gazonului de referin??. Valori >1 = consum? mai mult.',
                    example: 'Tomate la fructificare: Kc=1.15, Gazon: Kc=1.0',
                },
                irrigationMethod: {
                    title: 'Metod? de irigare',
                    description: 'Modul ?n care apa este distribuit? plantelor. Alegerea corect? depinde de tipul plantei ?i de sol.',
                    example: 'Picurare pentru legume, sprinkler pentru gazon',
                },
                et0: {
                    title: 'Evapotranspira?ie (ET?)',
                    description: 'Cantitatea de ap? pierdut? din sol ?i plante; depinde de temperatur?, v?nt ?i umiditate. Vara: mare, iarna: mic?.',
                    example: 'Ianuarie RO: ~0.5 mm/zi, Iulie RO: ~5-6 mm/zi',
                },
                coverage: {
                    title: 'Suprafa?? / Nr. plante',
                    description: 'Zona udat? de acest canal. Po?i specifica ?n metri p?tra?i sau num?r de plante.',
                    example: '15 m? gazon sau 20 de plante de tomate',
                },
                sunExposure: {
                    title: 'Expunere la soare',
                    description: 'C?t soare direct prime?te zona. Mai mult soare ?nseamn? mai mult? evaporare ?i necesar mai mare de ap?.',
                    example: 'Umbr? total?: 20-30%, Par?ial: 50-70%, Soare plin: 80-100%',
                },
                maxVolume: {
                    title: 'Volum maxim (siguran??)',
                    description: 'Limit? de siguran?? pentru a preveni inundarea. Sistemul nu va turna mai mult de at?t ?ntr-o sesiune.',
                    example: 'Ghiveci mic: 5L, strat legume: 50L, gazon 100 m?: 200L',
                },
                plantingDate: {
                    title: 'Data plant?rii',
                    description: 'C?nd au fost plantate. Sistemul ajusteaz? Kc ?n func?ie de faza de cre?tere.',
                    example: 'Tomate plantate pe 15 Mai ? Kc cre?te treptat p?n? ?n Iulie',
                },
                dripIrrigation: {
                    title: 'Irigare prin picurare (Drip)',
                    description: 'Ap? livrat? lent, direct la r?d?cin?. Cea mai eficient? metod? (90%+), minimizeaz? evaporarea ?i bolile foliare.',
                    example: 'Ideal pentru: legume, pomi, arbu?ti, flori ?n straturi',
                },
                sprinkler: {
                    title: 'Sprinkler (Stropire)',
                    description: 'Simuleaz? ploaia natural?. Pierde 20-30% prin evaporare, dar acoper? suprafe?e mari uniform.',
                    example: 'Ideal pentru: gazon, suprafe?e mari deschise',
                },
                soilAutoDetect: {
                    title: 'Detectare automat? sol',
                    description: 'Folosim baza de date global? SoilGrids (ISRIC) cu rezolu?ie de 250m, bazat? pe analize satelitare ?i probe de teren.',
                    example: 'Precizie: ?nalt? pentru zone agricole, medie pentru zone urbane',
                },
            },
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
            settings: 'Set?ri',
            settingsDesc: 'Configureaz? set?rile',
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
            alreadyConfiguredDesc: 'Zona are deja o plant? setat? pe dispozitiv. Selecteaz? alta pentru a o schimba sau apas? ?nainte pentru a p?stra.',
            coverageDenseExplanation: 'Cultură densă - folosim suprafața',
            coverageSparseExplanation: 'Plantare rară - introduci numărul de plante',
            noResultsTitle: 'Nu s-au g?sit plante',
            noResultsHint: '?ncearc? alt? c?utare sau categorie',
            kcMeaning: 'Ce ?nseamn? Kc?',
            kcLegendLow: '< 0.5 = Ap? redus?',
            kcLegendMedium: '0.5-0.8 = Ap? medie',
            kcLegendHigh: '> 0.8 = Ap? mult?',
            plantsLabel: 'plante',
        },

        soil: {
            title: 'Tip Sol',
            searchPlaceholder: 'Cauta sol...',
            autoDetect: 'Detectare automată din GPS',
            detecting: 'Se detectează tipul solului...',
            detectingSource: 'Folosim baza de date SoilGrids (ISRIC)',
            detectedWith: 'Detectat cu',
            confidence: 'încredere',
            confidenceHigh: '?ncredere mare',
            confidenceMedium: '?ncredere medie',
            confidenceLow: '?ncredere sc?zut?',
            manualSelect: 'Selectează manual',
            noLocation: 'Setează locația pentru detectare automată',
            noLocationHint: 'Vom detecta automat tipul de sol din coordonatele GPS',
            autoDetectedLabel: 'Detectat automat',
            selectedLabel: 'Sol selectat',
            detectionFailed: 'Nu am putut detecta solul. Alege manual din list?.',
            autoDetectUnavailable: 'Auto-detectare indisponibil?. Selecteaz? manual:',
            manualSelectButton: 'Alege manual tipul de sol',
            manualSelectTitle: 'Alege tipul de sol',
            selectAnother: 'Alege alt sol',
            redetect: 'Redetecteaz?',
            detectedComposition: 'Compozi?ie detectat?:',
            clay: 'Argil?',
            sand: 'Nisip',
            silt: 'Silt',
            fieldCapacity: 'Capacitate c?mp',
            wiltingPoint: 'Punct de ofilire',
            infiltration: 'Infiltrare',
            availableWater: 'Ap? disponibil?',
            customFromGps: 'Personalizat din GPS',
        },
        irrigationMethod: {
            title: 'Metod? de irigare',
            searchPlaceholder: 'Caut? metod?...',
            recommendedFor: 'Recomandate pentru {plant}:',
            recommendedBadge: 'Recomandat',
            efficiencyLabel: 'Eficien??',
            applicationRateLabel: 'Rat? aplicare',
            allMethods: 'Toate metodele ({count})',
            noResults: 'Nicio metod? g?sit? pentru "{query}"',
            sortedNote: 'Metodele sunt sortate dup? compatibilitatea cu planta selectat?.',
            moreMethods: 'Mai multe metode ({count})',
            descriptionFallback: 'Metod? de irigare',
            categories: {
                drip: 'Picurare',
                sprinkler: 'Aspersie',
                surface: 'Suprafa??',
                micro: 'Micro',
                manual: 'Manual',
                other: 'Altele',
            },
            descriptions: {
                dripSurface: 'Picurare lent? la r?d?cin?. Eficien?? 90%+',
                dripSubsurface: 'Picurare sub sol. Ideal pentru gazon',
                sprinklerSet: 'Stropire rotativ?. Bun pentru suprafe?e mari',
                sprinklerPopup: 'Sprinkler ascuns. Aspect estetic',
                microspray: 'Cea?? fin?. Ideal pentru flori ?i ierburi',
                soaker: 'Furtun poros. Simplu de instalat',
                basinFlood: 'Inundare controlat?. Pentru pomi ?i arbu?ti',
                manual: 'Manual cu furtun. Flexibilitate maxim?',
                furrow: 'Irigare prin ?an?uri. Pentru gr?dini mari',
            },
        },


        location: {
            title: 'Locație',
            gpsButton: 'Folosește GPS',
            gettingLocation: 'Se obține locația...',
            permissionDenied: 'Permisiune GPS refuzată. Folosește harta sau introdu coordonatele manual.',
            unavailable: 'GPS indisponibil. Folosește harta sau introdu coordonatele manual.',
            manualEntry: 'Introdu coordonatele manual',
        },
        plantingDate: {
            label: 'Data plant?rii',
            helper: 'Ajuta la calculul Kc pentru plante tinere',
        },


        schedule: {
            enable: 'Activează programare',
            fao56Smart: 'Program Smart FAO-56',
            fao56SmartDesc: 'Evaluează zilnic necesarul de apă bazat pe evapotranspirație',
            autoBadge: 'Auto',
            autoSummary: 'Porneste la {event}. Orar solar activ.',
            configureTitle: 'Configureaz? programul de udare',
            enableTitle: 'Activeaz? programarea',
            enableDesc: 'Udare automat? pentru aceast? zon?',
            scheduleType: 'Tip programare',
            daily: 'Zilnic',
            periodic: 'La X zile',
            auto: 'FAO-56',
            selectDays: 'Selecteaz? zilele:',
            none: 'Niciuna',
            everyDay: 'Zilnic',
            weekdays: 'Zile lucratoare',
            weekend: 'Weekend',
            everyXDays: 'la fiecare {days} zile',
            days: {
                sun: 'Dum',
                mon: 'Lun',
                tue: 'Mar',
                wed: 'Mie',
                thu: 'Joi',
                fri: 'Vin',
                sat: 'Sam',
            },
            intervalDays: 'Interval (zile)',
            startTime: 'Ora de start',
            startTimeDesc: 'Ora de start (fix? / fallback)',
            solarTime: 'Orar solar',
            solarTimeDesc: 'Porne?te la r?s?rit/apus ?n loc de or? fix?',
            solarEvent: 'Eveniment solar',
            sunrise: 'R?s?rit ??',
            sunset: 'Apus ??',
            offsetMinutes: 'Offset (minute)',
            offsetPlaceholder: '-120 .. 120',
            wateringAmount: 'Cantitate udare',
            durationMinutes: 'Durat? (min)',
            volumeLiters: 'Volum (L)',
            summaryAuto: '{mode} la {time}{solar}',
            summaryManual: '{time}, {days}{solar}',
            solarSuffix: ' (solar {event} {offset}{unit})',
            autoCalculationTitle: 'Calcul automat FAO-56',
            autoCalculationDesc: 'Ajusteaza automat udarea pe baza vremii si nevoilor plantelor',
            evaluationLabel: 'Evaluare',
            evaluationDaily: 'Zilnic la răsărit',
            estimatedDurationLabel: 'Durat? estimat?',
            estimatedDuration: '~15-45 min / zonă',
            summaryDesc: 'FAO-56 calculeaza automat necesarul de apa pe baza vremii locale, tipului de planta si caracteristicilor solului.',
            modify: 'Modifică',
            backToAuto: 'Inapoi la Auto simplificat',
        },

        summary: {
            title: 'Rezumat Zonă',
            mode: 'Mod',
            plant: 'Plantă',
            soil: 'Sol',
            irrigation: 'Irigare',
            coverage: 'Acoperire',
            sunExposure: 'Expunere Solară',
            duration: 'Durata',
            volume: 'Volum',
            cycleSoak: 'Ciclu & Pauză',
            maxVolume: 'Volum Maxim',
            location: 'Locație',
            planted: 'Plantat',
            schedulePreview: 'Previzualizare Program',
            schedule: 'Program',
            finalTitle: 'Rezumat final',
            finalCounts: 'Zone configurate: {configured}, sarite: {skipped}',
        },

        validation: {
            zoneNameRequired: 'Numele zonei este obligatoriu',
            zoneNameTooShort: 'Numele zonei trebuie să aibă minim 2 caractere',
            zoneNameTooLong: 'Numele zonei este destul de lung',
            coverageRequired: 'Valoarea acoperirii este obligatorie',
            coverageInvalid: 'Introdu o valoare validă pentru acoperire',
            coverageTooHigh: 'Valoarea pentru acoperire pare foarte mare',
            plantRequired: 'Selectează o plantă',
            soilRequired: 'Selectează un tip de sol',
            irrigationRequired: 'Selecteaza metoda de irigare',
            soilAndIrrigationRequired: 'Selecteaza tipul de sol si metoda de irigare',
            locationRequired: 'Setează o locație pentru datele meteo',
            scheduleEnabled: 'Activeaza programul',
            durationRequired: 'Introdu durata de udare',
            volumeRequired: 'Introdu volumul de udare',
            manualScheduleType: 'Alege program zilnic sau periodic pentru modurile manuale',
        },

        complete: {
            title: 'Configurare Completă!',
            subtitle: 'Sistemul tău de irigații este gata',
            zonesConfigured: 'zone configurate',
            addAnotherZone: 'Adaugă altă zonă',
            finishSetup: 'Finalizează',
            goToDashboard: 'Mergi la Dashboard',
            zoneCompleteTitle: 'Zona {index} complet?! ?',
            zoneCompleteMessage: 'Ai configurat {count} zon?{plural}. Vrei s? adaugi o alt? zon? sau s? finalizezi configurarea?',
            allZonesCompleteMessage: 'Toate cele 8 zone au fost configurate!',
            configureMoreZones: 'Configureaz? mai multe zone',
            completeSetup: 'Finalizeaz? configurarea',
        },
    },

    categories: {
        vegetables: 'Legume',
        fruits: 'Fructe',
        lawn: 'Gazon',
        flowers: 'Flori',
        trees: 'Copaci',
        shrubs: 'Arbusti',
        herbs: 'Aromatice',
        other: 'Altele',
    },

    plantCategories: {
        agriculture: 'Agricultura',
        gardening: 'Gradinarit',
        landscaping: 'Peisagistica',
        indoor: 'Interior',
        succulent: 'Suculente',
        fruit: 'Fructe',
        vegetable: 'Legume',
        herb: 'Aromatice',
        lawn: 'Gazon',
        shrub: 'Arbusti',
    },

    soilTextures: {
        sand: 'Nisip',
        loamySand: 'Nisip lutos',
        sandyLoam: 'Lut nisipos',
        loam: 'Lut',
        siltLoam: 'Lut siltatic',
        clayLoam: 'Lut argilos',
        sandyClayLoam: 'Lut argilos nisipos',
        siltyClayLoam: 'Lut argilos siltos',
        clay: 'Argilă',
        siltyClay: 'Argilă siltică',
        sandyClay: 'Argilă nisipoasă',
    },

    types: {
        plant: {
            vegetables: 'Legume',
            herbs: 'Aromate',
            flowers: 'Flori',
            shrubs: 'Arbuști',
            trees: 'Copaci',
            lawn: 'Gazon',
            succulents: 'Plante suculente',
            custom: 'Personalizat',
        },
        soil: {
            clay: 'Argilos',
            sandy: 'Nisipos',
            loamy: 'Lutos',
            silty: 'Nisip fin',
            rocky: 'Pietros',
            peaty: 'Turba',
            pottingMix: 'Pământ de ghiveci',
            hydroponic: 'Hidroponic',
        },
        irrigation: {
            drip: 'Picurare',
            sprinkler: 'Aspersie',
            soakerHose: 'Furtun poros',
            microSpray: 'Micro spray',
            handWatering: 'Udare manuală',
            flood: 'Inundare',
        },
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
    calibration: {
        title: 'Calibrare Senzor Debit',
        introTitle: 'Calibrare Senzor Debit',
        introDescription: 'Calibrarea m?soar? c?te pulsuri genereaz? senzorul pentru fiecare litru de ap?.',
        beforeStartTitle: '?nainte de a ?ncepe:',
        beforeStartItem1: 'Preg?ti?i un recipient gradat (2L recomandat)',
        beforeStartItem2: 'Asigura?i-v? c? ave?i ap? disponibil?',
        beforeStartItem3: 'Procesul dureaz? 1-2 minute',
        currentCalibration: 'Calibrare curent?: {value}',
        measuringTitle: 'M?surare ?n curs...',
        measuringDescription: 'Deschide?i robinetul ?i l?sa?i apa s? curg? ?n recipient.',
        pulsesLabel: 'Pulsuri',
        timeLabel: 'Timp',
        dontStopWater: 'Nu opri?i apa p?n? nu ap?sa?i "Gata"',
        volumeTitle: 'C?t? ap? a?i colectat?',
        volumeDescription: 'M?sura?i volumul exact din recipient (?n mililitri).',
        pulsesCounted: 'Pulsuri num?rate: {count}',
        volumeLabel: 'Volum (ml)',
        volumeHint: 'Minim {min}ml, recomandat {recommended}ml',
        minVolumeError: 'Volumul minim este {min}ml',
        calculate: 'Calculeaz?',
        resultTitle: 'Calibrare Calculat?!',
        pulsesPerLiterLabel: 'pulsuri / litru',
        accuracyLabel: 'Precizie: {level}',
        accuracyHigh: 'Excelent?',
        accuracyMedium: 'Acceptabil?',
        accuracyLow: 'Verifica?i conexiunile',
        summaryPulses: 'Pulsuri num?rate: {count}',
        summaryVolume: 'Volum m?surat: {volume}ml',
        calibrationFailed: 'Calibrarea a e?uat',
        applyFailed: 'Aplicarea a e?uat',
        completeTitle: 'Calibrare Salvat?!',
        completeDescription: 'Noua calibrare a fost aplicat? cu succes.',
        errorTitle: 'Eroare',
        errorDefault: 'A ap?rut o eroare',
        retry: 'Re?ncearc?',
    },


    errors: {
        notConnected: 'Neconectat',
        connectionLost: 'Conexiune pierdută. Verifică dispozitivul.',
        saveFailed: 'Salvare eșuată. Încearcă din nou.',
        loadFailed: 'Încărcare eșuată. Încearcă din nou.',
        gpsFailed: 'Eroare GPS. Încearcă din nou sau folosește harta.',
        gpsDenied: 'Permisiunea GPS a fost refuzat?',
        gpsTimeout: 'Cererea GPS a expirat',
        gpsUnavailable: 'GPS nu este disponibil',
        gpsDeniedSuggestion: 'Activeaz? permisiunile de loca?ie ?n set?rile dispozitivului sau folose?te harta pentru a alege loca?ia.',
        gpsTimeoutSuggestion: 'Asigur?-te c? e?ti ?ntr-o zon? cu semnal GPS bun. ?ncearc? s? ie?i afar?.',
        gpsUnavailableSuggestion: 'Dispozitivul t?u poate s? nu aib? GPS. Folose?te harta sau introdu coordonatele manual.',
        tryAgain: 'Încearcă din nou',
        checkConnection: 'Verifică conexiunea și încearcă din nou.',
        failedWithReason: 'E?uat: {error}',
    },

    a11y: {
        closeButton: 'Închide dialogul',
        nextStep: 'Pasul următor',
        previousStep: 'Pasul anterior',
        progressBar: 'Progres configurare',
        selectedItem: 'Selectat',
        expandSection: 'Extinde secțiunea',
        collapseSection: 'Restrânge secțiunea',
        helpLabel: 'Ajutor: {title}',
    },

    dashboard: {
        device: 'Dispozitiv',
        connected: 'Conectat',
        otherDevices: 'Alte Dispozitive',
        tapToConnect: 'Apasă pentru conectare',
        addNewDevice: 'Adaugă Dispozitiv Nou',
        online: 'Online',
        switching: 'Se schimba...',
        deviceNamePlaceholder: 'Nume dispozitiv',
        wateringActive: 'Udare Activă',
        remaining: 'rămas',
        progress: 'Progres',
        nextWateringCycle: 'Următorul Ciclu de Udare',
        noScheduleConfigured: 'Nicio programare configurată',
        soilMoisture: 'Umiditate Sol',
        temp: 'Temp',
        humidity: 'Umiditate',
        humidityDry: 'Uscat',
        humidityNormal: 'Normal',
        rainfall24h: 'Precipitații (24h)',
        quickActions: 'Acțiuni Rapide',
        manualWater: 'Udare Manuală',
        pauseSchedule: 'Pauză Program',
        pauseResumeOnlyWhileActive: 'Pauza sau reluarea este disponibilă doar când există o udare activă.',
        completeSetup: 'Finalizează Configurarea',
        noZonesConfigured: 'Nicio zonă configurată încă',
        title: 'PUNCT DE COMAND?',
        subtitle: 'Prezentare Sistem',
        emergencyStop: 'OPRIRE DE URGEN??',
        notConnected: 'Neconectat',
        emergencyStopSuccess: 'Oprire de urgen?? executat?!',
        emergencyStopFailed: 'E?uat: {error}',
        connectionUplink: 'Leg?tur? Conexiune',
        linked: 'CONECTAT: {id}',
        disconnect: 'DECONECTEAZ?',
        scanning: 'SE SCANEAZ?...',
        connecting: 'SE CONECTEAZ?...',
        initiateScan: 'INI?IAZ? SCANARE',
        systemSetup: 'Configurare Sistem',
        complete: 'Complet',
        channels: 'Canale',
        system: 'Sistem',
        schedules: 'Programe',
        continueSetup: 'CONTINU? CONFIGURAREA',
        systemConfigured: 'Sistem Configurat',
        allZonesConfigured: 'Toate zonele ?i programele sunt configurate',
        reconfigure: 'Reconfigureaz?',
        environmentalSensors: 'Senzori de mediu',
        live: 'LIVE',
        offline: 'OFFLINE',
        rainSensorLabel: 'Senzor Ploaie',
        rainStatusRaining: 'PLOU? ({rate} mm/h)',
        rainStatusDry: 'USCAT',
        rainStatusInactive: 'INACTIV',
        rainStatusUnknown: 'NECUNOSCUT',
        zoneActive: '{zone} Activ',
        wateringInProgressLabel: 'Udare ?n curs...',
        nextScheduledRun: 'Urm?toarea rulare programat?:',
        connectionState: {
            connected: 'CONECTAT',
            disconnected: 'DECONECTAT',
            scanning: 'SE SCANEAZ?',
            connecting: 'SE CONECTEAZ?',
        },
        systemStatus: {
            ok: 'SISTEM OK',
            noFlow: 'F?R? DEBIT DETECTAT',
            unexpectedFlow: 'DEBIT NEA?TEPTAT',
            fault: 'DEFEC?IUNE SISTEM',
            rtcError: 'EROARE RTC',
            lowPower: 'PUTERE SC?ZUT?',
            freezeLockout: 'BLOCARE INGHET (FREEZE LOCKOUT)',
            unknown: 'NECUNOSCUT',
        },
    },

    healthHub: {
        bannerTitle: 'Health & Setup',
        title: 'Health & Setup',
        subtitle: 'Scor setup, lock-uri, alarme si fix-uri rapide',
        systemStatusTitle: 'Stare sistem',
        setupScore: 'Scor setup',
        setupScoreHint: 'Citesc de pe device...',
        onboardingComplete: 'Setup complet',
        onboardingIncomplete: 'Setup incomplet',
        validateConfig: 'Valideaza',
        validating: 'Validez...',
        validationStarted: 'Validare pornita',
        zoneMask: 'Masca zone',
        scheduleMask: 'Masca programe',
        missingItems: 'Lipsuri',
        missingZones: 'Lipsesc {count} zone',
        missingSchedules: 'Lipsesc {count} programe',
        deviceFlags: 'Flag-uri device',
        flagNeedsSync: 'Necesita sync (device-ul cere resincronizare).',
        flagNvsError: 'Eroare storage (NVS). Setarile pot sa nu se salveze.',
        flagValidationError: 'Eroare validare. Unele setari sunt invalide sau inconsistente.',
        activeIssues: 'Probleme active',
        allGoodTitle: 'Totul e OK',
        allGoodDesc: 'Nu exista alarme sau lock-uri active.',
        noActiveAlarms: 'Fara alarme active',
        deviceHealthCta: 'Sanatate device',
        deviceHealthCtaHint: 'Diagnoza rapida si pachet debug',
        troubleshootingCta: 'Troubleshooting',
        troubleshootingCtaHint: 'Pasi clari pentru alarme comune',
        deviceHealth: {
            title: 'Sanatate device',
            subtitle: 'Diagnoza si pachet suport',
            diagnostics: 'Snapshot diagnostic',
            environment: 'Stare senzori',
            runtime: 'Stare runtime',
            support: 'Suport',
            supportHint: 'Copiaza pachetul si trimite-l la suport sau la dev-ul de firmware.',
            bmeStatus: 'Status BME280',
            bmeMeasurementInterval: 'Interval BME280',
            lastSensorReading: 'Ultima citire senzor',
            alarmState: 'Alarma activa',
            lockState: 'Lock global',
            lastErrorCode: 'Ultimul cod eroare',
            copyDebugBundle: 'Copiaza pachet debug',
            debugBundleCopied: 'Pachet debug copiat',
            debugBundleCopyFailed: 'Nu am putut copia pachetul debug',
            refreshFailed: 'Unele date nu au putut fi actualizate',
            activeAlarmNone: 'Fara alarma activa',
            lockNone: 'Fara lock',
            bmeMissing: 'Lipsa',
            bmeOk: 'OK',
            bmeError: 'Eroare',
            bmeDisabled: 'Dezactivat',
            bmeUnknown: 'Necunoscut',
        },
        troubleshooting: {
            title: 'Troubleshooting',
            subtitle: 'Fix rapid pentru alarme comune',
            activeAlarmBanner: 'Focus pe alarma curenta',
            activeAlarmNone: 'Nu exista alarma activa',
            openAlarmHistory: 'Deschide istoricul alarmelor',
            shareSteps: 'Distribuie pasii',
            stepsCopied: 'Pasii au fost copiati',
            shareUnsupported: 'Nu am putut distribui pasii',
            noGuideTitle: 'Nu exista ghid',
            noGuideDesc: 'Nu exista inca un ghid pentru aceasta alarma.',
            guides: {
                noFlow: {
                    symptom: 'Valva a pornit, dar nu s-au detectat impulsuri de debit.',
                    step1: 'Verifica alimentarea cu apa si confirma ca valva chiar se deschide.',
                    step2: 'Verifica legaturile senzorului de debit si calibrarea (>0).',
                    step3: 'Ruleaza Test zona 30s, apoi sterge alarma dupa ce debitul e confirmat.',
                },
                unexpectedFlow: {
                    symptom: 'Sunt impulsuri de debit desi toate valvele ar trebui sa fie inchise.',
                    step1: 'Cauta scurgeri sau o valva blocata care nu se inchide complet.',
                    step2: 'Inchide temporar apa si verifica daca impulsurile dispar.',
                    step3: 'Dupa remediere, sterge alarma si monitorizeaza urmatorul ciclu.',
                },
                highFlow: {
                    symptom: 'Debitul a depasit limita sigura invatata de sistem.',
                    step1: 'Opreste udarea si verifica daca exista conducta sparta sau aspersor rupt.',
                    step2: 'Repara problema hardware inainte sa repornesti udarea.',
                    step3: 'Ruleaza un test scurt manual si sterge alarma doar cand debitul e stabil.',
                },
                mainlineLeak: {
                    symptom: 'Testul static a detectat debit cu toate zonele oprite.',
                    step1: 'Verifica conducta principala si supapa master pentru scurgeri.',
                    step2: 'Confirma ca nicio zona nu ruleaza si urmareste impulsurile 30-60 secunde.',
                    step3: 'Repara sursa de pierdere, apoi sterge alarma si valideaza din nou.',
                },
                freezeLockout: {
                    symptom: 'Protectia la inghet a oprit udarea din cauza temperaturii mici sau datelor vechi.',
                    step1: 'Asteapta pana cand temperatura urca peste pragul de inghet.',
                    step2: 'Actualizeaza datele de mediu si verifica statusul BME280 (OK).',
                    step3: 'Reia udarea dupa ce lockout-ul dispare sau foloseste test manual pentru verificare.',
                },
            },
        },
    },
    analytics: {
        title: 'Analiz?',
        liveData: 'DATE LIVE',
        offline: 'OFFLINE',
        summary: {
            currentTemp: 'Temperatur? Curent?',
            rain7d: 'Ploaie (7 zile)',
        },
    },

    historyDashboard: {
        title: 'Tablou Istoric',
        liveDataAvailable: 'Date live disponibile',
        cachedData: 'Se afi?eaz? datele din cache',
        clearFilters: '?terge',
        successRate: '{percent}% reu?it?',
        wateringSessions: 'Sesiuni de udare',
        avgSuffix: 'medie',
        avgTemperature: 'Temperatur? Medie',
        rainyDryDays: '{rainy} zile ploioase / {dry} zile uscate',
        tabs: {
            watering: 'Udare',
            environment: 'Mediu',
            rainfall: 'Precipita?ii',
        },
        volumeOverTime: 'Volum ?n timp',
        channelDistribution: 'Distribu?ie pe canale',
        recentSessions: 'Sesiuni recente',
        noSessionsInPeriod: 'Nu exist? sesiuni de udare ?n perioada selectat?',
        temperatureHumidity: 'Temperatur? & Umiditate',
        minTemp: 'Temp Min',
        maxTemp: 'Temp Max',
        avgHumidity: 'Umiditate Medie',
        minHumidity: 'Umiditate Min',
        maxHumidity: 'Umiditate Max',
        avgPressure: 'Presiune Medie',
        rainfallHistory: 'Istoric Precipita?ii',
        totalRainfall: 'Total Precipita?ii',
        dailyAverage: 'Medie Zilnic?',
        maxHourly: 'Maxim Orar',
        rainyDays: 'Zile Ploioase',
        dryDays: 'Zile Uscate',
        longestDrySpell: 'Cea mai lung? perioad? uscat?',
        historySynced: 'Istoric sincronizat',
        syncFailed: 'Sincronizare e?uat?: {error}',
    },

    statistics: {
        title: 'Statistici Canale',
        refreshed: 'Statistici actualizate',
        resetAllConfirm: 'Resetezi TOATE statisticile canalelor? Nu se poate anula.',
        resetAllTitle: 'Reseteaz? toate statisticile',
        resetSuccess: 'Statistici resetate',
        channelReset: 'Canal {channel} resetat',
        noData: 'Nu exist? statistici',
        tapRefresh: 'Apas? refresh pentru ?nc?rcare',
        never: 'Niciodat?',
        timeAgoMinutes: 'acum {minutes}m',
        timeAgoHours: 'acum {hours}h',
        timeAgoDays: 'acum {days}z',
        sessionsWithLast: '{count} sesiuni ? Ultima: {last}',
        lastLabel: 'Ultima: {value}',
        volumeDistribution: 'Distribu?ie volum',
    },

    wateringHistory: {
        title: 'Istoric Udare',
        loaded: 'Istoric ?nc?rcat',
        clearConfirm: '?tergi TOT istoricul de udare? Nu se poate anula.',
        cleared: 'Istoric ?ters',
        noData: 'Nu exist? date de istoric',
        tapRefresh: 'Apas? refresh pentru ?nc?rcare',
    },

    envHistory: {
        title: 'Istoric Mediu',
        loaded: 'Istoric mediu ?nc?rcat',
        clearConfirm: '?tergi TOT istoricul de mediu? Nu se poate anula.',
        cleared: 'Istoric ?ters',
        last24Hours: 'Ultimele 24 ore',
        last7Days: '7 Zile',
        noHourlyData: 'Nu exist? date orare',
        noDailyData: 'Nu exist? date zilnice',
    },

    rainHistory: {
        title: 'Istoric Ploaie',
        loaded: 'Istoric ploaie ?nc?rcat',
        clearConfirm: 'Resetezi TOT istoricul de ploaie? Nu se poate anula.',
        cleared: 'Istoric ploaie ?ters',
        calibrateTitle: 'Calibreaz? senzorul',
        calibrateConfirm: 'Porne?ti calibrarea senzorului de ploaie?',
        calibrateStarted: 'Calibrare pornit?',
        lastHour: 'mm (Ultima or?)',
        last24Hours: 'mm (24 Ore)',
        last7Days: 'mm (7 Zile)',
        noHourlyData: 'Nu exist? date orare',
        noDailyData: 'Nu exist? date zilnice',
        last24HoursMax: 'Ultimele 24 ore ? Max: {max} mm',
        last7DaysTotal: 'Ultimele 7 zile ? Total: {total} mm',
    },

    taskControl: {
        title: 'Control Sarcini',
        commandSent: 'Comanda {action} trimis?',
        queueStatus: '{count} ?n a?teptare',
        totalDispensed: 'Total distribuit: {volume}',
        noActiveTask: 'Nicio sarcin? activ?',
        tasksWaiting: '{count} sarcin?(sarcini) ?n a?teptare',
        completedToday: 'Finalizate azi: {count}',
        activeId: 'ID activ: {id}',
        actions: {
            pause: 'Pauz?',
            resume: 'Reia',
            stop: 'Opre?te',
            startNext: 'Porne?te urm?toarea',
            clearQueue: 'Gole?te coada',
        },
        status: {
            running: '?N CURS',
            paused: 'PAUZAT',
            idle: 'INACTIV',
        },
    },

    diagnostics: {
        title: 'Diagnoz? Sistem',
        mainsPower: 'Re?ea',
        activeValves: 'Vane active',
        refreshed: 'Diagnoz? actualizat?',
        queuePending: '{count} ?n a?teptare',
        alarmClear: 'Curat',
        alarmActive: 'Activ',
        lastError: 'Ultima eroare: {error}',
        errorCode: 'Cod {code}',
        systemStatus: {
            ok: 'OK',
            noFlow: 'F?r? debit',
            unexpectedFlow: 'Debit nea?teptat',
            fault: 'Defec?iune',
            rtcError: 'Eroare RTC',
            lowPower: 'Putere sc?zut?',
            unknown: 'Necunoscut',
        },
        wateringErrors: {
            invalidParam: 'Parametru invalid',
            notInitialized: 'Neini?ializat',
            hardware: 'Defec?iune hardware',
            busy: 'Ocupat',
            queueFull: 'Coad? plin?',
            timeout: 'Timeout',
            config: 'Eroare configurare',
            rtcFailure: 'E?ec RTC',
            storage: 'Eroare stocare',
            dataCorrupt: 'Date corupte',
            invalidData: 'Date invalide',
            bufferFull: 'Buffer plin',
            noMemory: 'Memorie insuficient?',
        },
    },

    charts: {
        noDistributionData: 'Nu exist? date de distribu?ie',
        noEnvironmentalData: 'Nu exist? date de mediu',
        noRainData: 'Nu exist? date de ploaie',
        noWateringData: 'Nu exist? date de udare',
        share: 'Pondere',
        maxPerHour: 'Max/or?',
        tempMax: 'Temp Max',
        tempMin: 'Temp Min',
        tempAvg: 'Temp Med',
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
        activeCount: '{count} Active',
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
        reasonSlope: 'Teren ?nclinat ({slope}%) + sol {rate} mm/h',
        reasonSlow: 'Sol lent ({rate} mm/h) - previne scurgerea',
        reasonFast: 'Sol rapid ({rate} mm/h) - nu e necesar',
        educationIntro: 'Ciclu & Pauz? previne scurgerea apei prin ?mp?r?irea ud?rii ?n cicluri mici cu pauze ?ntre ele.',
        educationStepCycle: 'Ciclu udare: apa se aplic? pentru o perioad? scurt?.',
        educationStepSoak: 'Pauz? (Soak): solul absoarbe apa ?n profunzime.',
        educationStepRepeat: 'Repetare: ciclul se repet? p?n? se atinge volumul total.',
        educationTip: 'Sfat: ideal pentru soluri argiloase ?i terenuri ?n pant?.',
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
        calculationStepRaw: '1. RAW (mm): {depth} mm',
        calculationStepVolume: '2. Volum: {depth} mm ? {area} m? = {volume} L',
        simpleCalculation: 'Calcul simplificat: 2 litri ? {count} plante = {volume} L',
        rangeMin: '{value} L',
        rangeMax: '{value} L',
        educationIntro: 'Limita de volum este o m?sur? de siguran?? pentru a preveni udarea excesiv? ?n caz de erori de calcul sau senzori.',
        educationTip: 'Sfat: seteaz? aceast? valoare cu 20-30% mai mare dec?t necesarul zilnic maxim estimat.',
    },

    zoneDetails: {
        notConfigured: 'Neconfigurat',
        notScheduled: 'Neprogramat',
        wateringActive: 'Udare Activă',
        idle: 'Inactiv',
        nextWatering: 'Următoarea Udare',
        todayAt: 'Azi la {time}',
        tomorrowAt: 'Maine la {time}',
        dayAt: '{day} la {time}',
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
        skipNextNotAvailable: 'Comanda de sarire a urmatoarei udari nu este disponibila in firmware-ul BLE curent.',
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

        zone: 'Zona',
        tapToConfigure: 'Apasa pentru a configura aceasta zona',
        zoneNotConfiguredTitle: 'Zona neconfigurata',
        zoneNotConfiguredDesc: 'Seteaza tipul de planta, sol si irigare pentru a activa udarea smart.',
        configureZone: 'Configureaza zona',
        quickWater: 'Udare rapida',
        manualOverride: 'Control manual',
        editSettings: 'Editeaza setari',
        dry: 'Uscat',
        wet: 'Umed',
        quickWateringTitle: 'Udare rapida',
        configureZoneTitle: 'Configureaza zona',
        zoneSettingsTitle: 'Setari zona',
        startManualWatering: 'Porneste udare manuala',
        sectionGeneral: 'General',
        sectionWateringMode: 'Mod udare',
        sectionPlantSoil: 'Planta si sol',
        sectionCoverageSun: 'Acoperire si soare',
        sectionAdvanced: 'Avansat',
        sectionSchedule: 'Program',
        changePlantSoil: 'Schimba planta/sol',
        scheduleEnabled: 'Program activ',
        scheduleFao56: 'FAO-56',
        scheduleEvery: 'La fiecare',
        scheduleDays: 'zile',
        scheduleAutoNote: 'Programul FAO-56 ruleaza zilnic la ora setata.',
        stepProgress: 'Pasul {current} din {total}',
        coverageArea: 'Acoperire',
        coverageByArea: 'Suprafata (m2)',
        coverageByPlants: 'Numar plante',
        directSunlight: '{percent}% soare direct',
        waterFor: 'Uda pentru',
        pauseFor: 'Apoi pauza',
        locationNote: 'Locatia este necesara pentru a calcula radiatia solara si evapotranspiratia.',
        selectPlantingDate: 'Selecteaza data plantarii',
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
            customProfile: 'Profil sol personalizat',
            customBadge: 'PERSONALIZAT',
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
            applicationRate: '{value} mm/h',
        },
        wateringMode: {
            title: 'Mod Udare',
            subtitle: 'Alege cum va fi udată această zonă.',
            nextStepTip: {
                title: 'Urmează: Configurare Plantă & Sol',
                text: 'Modurile FAO-56 necesită tipul de plantă și sol pentru calcule precise.',
            },
            badges: {
                faoQuality: 'FAO-56 100%',
                faoEco: 'FAO-56 70%',
                manual: 'Manual',
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

    navigation: {
        home: 'Acasa',
        zones: 'Zone',
        aiDoctor: 'AI Doctor',
        history: 'Istoric',
        settings: 'Setari',
        marketplace: 'Plante',
    },
    marketplace: {
        title: 'Piata de Plante',
        browse: 'Exploreaza',
        plants: 'Plante',
        packs: 'Pachete',
        search: 'Cauta',
        searchPlaceholder: 'Cauta plante...',
        aiSearch: 'Cautare AI',
        aiSearchHint: 'Intreaba orice despre plante folosind limbaj natural',
        aiSearchPlaceholder: 'Descrie planta pe care o cauti...',
        searchFailed: 'Cautarea a esuat',
        aiAnswer: 'Raspuns AI',
        suggestedQueries: 'Intrebari sugerate',
        searchSuggestionIndoorLowLight: 'Cele mai bune plante de interior pentru lumina redusa',
        searchSuggestionDroughtSucculents: 'Suculente rezistente la seceta',
        searchSuggestionTomatoFao56: 'Parametri FAO-56 pentru rosii',
        searchSuggestionMediterraneanHerbs: 'Ierburi care cresc bine in clima mediteraneana',
        allCategories: 'Toate',
        newest: 'Cele mai noi',
        topRated: 'Cele mai bine cotate',
        mostDownloaded: 'Populare',
        loadMore: 'Incarca mai mult',
        noResults: 'Nicio planta gasita',
        createPlant: 'Creeaza planta',
        editPlant: 'Editeaza planta',
        newPlant: 'Planta noua',
        saveDraft: 'Salveaza ciorna',
        submitForReview: 'Trimite la revizie',
        signInRequired: 'Autentifica-te pentru a accesa aceasta functie',
        details: 'Detalii',
        reviews: 'Recenzii',
        comments: 'Comentarii',
        writeReview: 'Scrie o recenzie...',
        writeComment: 'Scrie un comentariu...',
        addComment: 'Adauga comentariu',
        reply: 'Raspunde',
        install: 'Instaleaza',
        installed: 'Instalat',
        installAll: 'Instaleaza toate plantele',
        remove: 'Sterge',
        category: 'Categorie',
        selectCategory: 'Selecteaza categoria...',
        scientificName: 'Nume stiintific',
        commonNameEn: 'Nume (EN)',
        commonNameRo: 'Nume (RO)',
        placeholderScientificName: 'Solanum lycopersicum',
        placeholderCommonNameEn: 'Tomato',
        placeholderCommonNameRo: 'Rosie',
        placeholderTags: 'interior, tropical, putina-apa',
        descriptionEn: 'Descriere (EN)',
        descriptionRo: 'Descriere (RO)',
        tags: 'Etichete (separate prin virgula)',
        images: 'Imagini',
        addImages: 'Adauga imagini',
        technicalData: 'Date tehnice (completate de AI)',
        aiFillGaps: 'AI Completeaza',
        translateEnToRo: 'EN -> RO',
        translateRoToEn: 'RO -> EN',
        myLibrary: 'Biblioteca mea',
        myPlants: 'Plantele mele',
        authorProfile: 'Profil autor',
        publishedPlants: 'Plante publicate',
        noPlants: 'Nicio planta publicata inca',
        noAuthoredPlants: 'Nu ai creat inca nicio planta',
        noFilteredPlants: 'Nicio planta cu acest status',
        createFirst: 'Creeaza prima ta planta',
        plantChat: 'Chat AI Planta',
        chatWelcome: 'Intreaba orice despre aceasta planta',
        chatHint: 'Program de udare, nevoi de lumina, preferinte de sol, control daunatori, date FAO-56...',
        chatPlaceholder: 'Intreaba despre aceasta planta...',
        chatError: 'Ne pare rau, ceva nu a mers bine. Incearca din nou.',
        packNotFound: 'Pachet negasit',
        plantsInPack: 'Plantele din acest pachet',
        downloads: 'descarcari',
        views: 'vizualizari',
        rating: 'rating',
        synced: 'Sincronizat',
        pendingSync: 'In asteptare',
        askAi: 'Intreaba AI',
        viewAuthor: 'Vezi autorul',
        aiSearchTitle: 'Cautare AI Plante',
        askAiSubtitle: 'Primeste sfaturi de ingrijire, informatii despre boli si mai mult',
        browseMarketplace: 'Exploreaza Piata',
        collections: 'Colectii',
        emptyLibrary: 'Biblioteca ta este goala',
        noComments: 'Niciun comentariu inca',
        noDescription: 'Fara descriere.',
        generatingDescription: 'Se genereaz\u0103 descrierea cu AI...',
        noPacks: 'Niciun pachet inca',
        noReviews: 'Nicio recenzie inca',
        notSynced: 'Nesincronizat',
        packsTab: 'Pachete',
        plantsInLibrary: 'plante in biblioteca ta',
        storageUsed: '{percent}% folosit',
        plantsTab: 'Plante',
        reviewBody: 'Recenzia ta...',
        reviewTitle: 'Titlu (optional)',
        searchWithAi: 'Cauta cu AI',
        sortNewest: 'Cele mai noi',
        sortPopular: 'Populare',
        sortTopRated: 'Cele mai bine cotate',
        submitReview: 'Trimite recenzia',
        trySearching: 'Incearca sa cauti',
        libraryTab: 'Biblioteca',
        onDeviceTab: 'Pe Dispozitiv',
        syncToDevice: 'Sincronizeaza pe Dispozitiv',
        syncAllToDevice: 'Sincronizeaza Totul pe Dispozitiv',
        removeFromDevice: 'Sterge de pe Dispozitiv',
        syncingToDevice: 'Se sincronizeaza pe dispozitiv...',
        syncSuccess: 'Sincronizat cu succes pe dispozitiv',
        syncFailed: 'Sincronizarea pe dispozitiv a esuat',
        noDevicePlants: 'Nicio planta pe dispozitiv',
        devicePlantsCount: 'plante pe dispozitiv',
        connectDeviceToSync: 'Conecteaza un dispozitiv pentru a sincroniza plantele',
        publishToMarketplace: 'Publica in Piata',
        publishDescription: 'Partajeaza aceasta planta cu comunitatea',
        romPlant: 'Incorporat',
        customPlant: 'Personalizat',
        devicePlantId: 'ID Dispozitiv',
        romPlantId: 'ID ROM',
        onDevice: 'Pe Dispozitiv',
        updateOnDevice: 'Actualizeaza pe Dispozitiv',
        plantsCount: 'plante',
        filterAll: 'Toate',
        filterOnDevice: 'Pe Dispozitiv',
        filterNotInstalled: 'Neinstalate',
        deviceOffline: 'Dispozitiv offline',
        overviewTab: 'Prezentare',
        guideTab: 'Ghid',
        deviceTab: 'Dispozitiv',
        noGrowingData: 'Nu sunt date de crestere disponibile',
        cropCoefficients: 'Coeficienti de cultura',
        cropCoefficientsHint: 'Coeficienti FAO-56 (Kc) - consum relativ de apa fata de evapotranspiratia de referinta.',
        growthStages: 'Stadii de crestere',
        growthStagesOngoingSummary: '{days} {unit} pana la maturitate, apoi stadiu matur permanent',
        growthStagesOngoingOnlySummary: 'Stadiu matur permanent',
        growthStagesOngoingHint: 'Planta ramane in stadiul matur.',
        stageOngoingShort: 'matur',
        stageOngoingLabel: 'permanent',
        stageMaturityLabel: 'Maturitate',
        stageIni: 'Initial',
        stageDev: 'Dezvoltare',
        stageMid: 'Mijloc',
        stageEnd: 'Final',
        kcInitialLabel: 'Kc Initial',
        kcMidLabel: 'Kc Mijloc',
        kcEndLabel: 'Kc Final',
        kcDevLabel: 'Kc Dezvoltare',
        rootAndSoil: 'Radacina si sol',
        rootDepthLabel: 'Adancime radacina',
        rootDepthHint: 'Adancimea tipica a radacinilor active, folosita la estimarea apei disponibile in sol.',
        growingConditions: 'Conditii de crestere',
        optimalTempLabel: 'Temperatura optima',
        optimalTempHint: 'Intervalul in care planta creste cel mai bine, cu stres minim.',
        fromValueTemplate: 'de la {value}{unit}',
        upToValueTemplate: 'pana la {value}{unit}',
        soilPhLabel: 'pH sol',
        soilPhHint: 'Intervalul de aciditate/alcalinitate a solului preferat de planta.',
        frostToleranceHint: 'Temperatura minima aproximativa suportata fara afectari majore.',
        droughtLabel: 'Rezistenta la lipsa apei',
        shadeLabel: 'Adaptare la lumina redusa',
        salinityLabel: 'Rezistenta la saruri (apa/sol)',
        toleranceLow: 'Scazuta',
        toleranceMedium: 'Medie',
        toleranceHigh: 'Ridicata',
        droughtHintLow: 'Are nevoie de udari dese. Solul nu trebuie lasat uscat mult timp.',
        droughtHintMedium: 'Are nevoie de udare regulata, dar suporta perioade scurte de uscaciune.',
        droughtHintHigh: 'Suporta mai bine perioadele fara apa fata de majoritatea plantelor.',
        shadeHintLow: 'Are nevoie de lumina multa si soare direct.',
        shadeHintMedium: 'Creste bine la lumina partiala.',
        shadeHintHigh: 'Se adapteaza bine in zone cu lumina redusa.',
        salinityHintLow: 'Este sensibila la saruri. Evita apa sau solul salin.',
        salinityHintMedium: 'Tolereaza moderat sarurile din apa/sol.',
        salinityHintHigh: 'Tolereaza mai bine sarurile din apa/sol.',
        indoorSuitableLabel: 'Potrivita pentru interior',
        criticalStageLabel: 'Etapa sensibila la lipsa apei',
        criticalStageEstLabel: 'Prindere dupa plantare',
        criticalStageGenericLabel: 'Perioada sensibila (udare constanta)',
        criticalStageHint: 'In aceasta etapa, udarea neregulata poate afecta cresterea sau productia.',
        moreInfoLabel: 'Mai multe informatii',
        careGuideTitle: 'Ghid de ingrijire',
        technicalDetails: 'Detalii tehnice',
        technicalDetailsDesc: 'FAO-56, pH, toleranta la ger',
        otherParameters: 'Alti parametri',
        growthCycleAnnual: 'Anuala',
        growthCyclePerennial: 'Perena',
        growthCycleBiennial: 'Bienala',
        primaryUseOrnamental: 'Ornamentala',
        primaryUseFood: 'Alimentar',
        primaryUseFruit: 'Fruct',
        primaryUseVegetable: 'Leguma',
        primaryUseHerb: 'Planta aromatica',
        primaryUseMedicinal: 'Medicinal',
        primaryUseAromatic: 'Aromatic',
        primaryUseForage: 'Furaj',
        primaryUseLawn: 'Gazon',
        primaryUseTimber: 'Lemn',
        primaryUseIndustrial: 'Industrial',
        irrigMethodDrip: 'Picurare',
        irrigMethodSprinkler: 'Aspersie',
        irrigMethodSurface: 'La suprafata',
        irrigMethodManual: 'Manual',
        irrigMethodRainfed: 'Pluvial',
        deviceVersion: 'Versiune pe dispozitiv',
        removedFromDevice: 'Sters de pe dispozitiv',
        confirmRemoveFromDevice: 'Stergi aceasta planta de pe dispozitiv?',
        connectToManage: 'Conectează dispozitivul pentru a gestiona',
        notOnDevice: 'Această plantă nu este încă sincronizată pe dispozitiv',
        builtInPlant: 'Plantă ROM Integrată',
        builtInPlantDesc: 'Pre-încărcată în firmware — mereu disponibilă',
        upToDate: 'La zi',
        updateAvailable: 'Actualizare disponibilă',
        quickFacts: 'Informații Rapide',
        qfCycle: 'Ciclu',
        qfTemp: 'Temperatură',
        qfFrost: 'Toleranță la îngheț',
        qfWater: 'Necesar apă',
        qfIndoor: 'Interior',
        qfUse: 'Utilizare',
        qfIrrigation: 'Irigare',
        qfHigh: 'Ridicat',
        qfMedium: 'Mediu',
        qfLow: 'Scăzut',
        qfWaterHigh: 'Necesar mare de apă',
        qfWaterMedium: 'Necesar mediu de apă',
        qfWaterLow: 'Necesar redus de apă',
        daysLabel: 'zile',
        totalLabel: 'total',
        status: {
            all: 'Toate',
            draft: 'Ciorne',
            pending_review: 'In asteptare',
            approved: 'Aprobate',
            rejected: 'Respinse',
        },
    },
    admin: {
        title: 'Panou Admin',
        subtitle: 'Piata de Plante',
        accessDenied: 'Acces Refuzat',
        accessDeniedDesc: 'Ai nevoie de privilegii de administrator pentru a accesa aceasta sectiune.',
        totalPlants: 'Total Plante',
        pendingReview: 'In Asteptare',
        approved: 'Aprobate',
        rejected: 'Respinse',
        totalPacks: 'Total Pachete',
        totalUsers: 'Total Utilizatori',
        totalReviews: 'Recenzii',
        totalDownloads: 'Descarcari',
        moderationQueue: 'Coada Moderare',
        moderationDesc: 'Revizuieste si aproba plantele trimise',
        plantManager: 'Manager Plante',
        plantManagerDesc: 'Cauta si gestioneaza toate plantele',
        filterPending: 'In Asteptare',
        filterFlagged: 'Semnalate AI',
        filterAll: 'Toate',
        queueEmpty: 'Coada este goala — totul e la zi!',
        aiScore: 'Scor AI',
        accuracy: 'Acuratete',
        completeness: 'Completitudine',
        quality: 'Calitate',
        aiRecommends: 'AI Recomanda',
        aiReview: 'Revizie AI',
        approve: 'Aproba',
        reject: 'Respinge',
        noPlantsFound: 'Nicio planta gasita',
        loading: 'Se incarca...',
        loadMore: 'Incarca Mai Multe',
        draft: 'Ciorna',
        authorLabel: 'Autor',
    },
    timePicker: {
        selectTime: 'Selecteaza ora',
        hour: 'Ora',
        minute: 'Minut',
    },
    qrSharing: {
        title: 'Partajare QR',
        share: 'Distribuie',
        scan: 'Scaneaza',
        shareTitle: 'Distribuie configuratia zonelor',
        shareFailed: 'Distribuire esuata',
        generateFailed: 'Generare cod QR esuata',
        copyFailed: 'Copiere in clipboard esuata',
        zonesToShare: 'Distribui {count} zon{plural}',
        scanWithDevice: 'Scaneaza cu alt dispozitiv pentru import',
        copied: 'Copiat',
        copyData: 'Copiaza date',
        includedTitle: 'Inclus in partajare',
        includedItem: '{name} ({mode})',
        qrCodeAlt: 'Cod QR',
        scanUnavailable: 'Scanarea camerei necesita aplicatia nativa.',
        scanPasteHint: 'Poti lipi datele de configurare din clipboard.',
        pasteFromClipboard: 'Lipeste din Clipboard',
        invalidData: 'Date de configurare invalide',
    },
    alarmCard: {
        names: {
            noAlarm: 'Fara alarma',
            noFlow: 'Fara debit',
            unexpectedFlow: 'Debit neasteptat',
            freezeProtection: 'Protectie inghet',
            highFlow: 'Debit mare',
            lowFlow: 'Debit mic',
            mainlineLeak: 'Scurgere conducta principala',
            zoneLocked: 'Zona blocata',
            systemLocked: 'Sistem blocat',
            unknown: 'Alarma necunoscuta ({code})',
        },
        descriptions: {
            noAlarm: 'Sistemul functioneaza normal',
            noFlow: 'Nu s-a detectat debit in timpul udarii. Verifica alimentarea, valva, filtrul si senzorul.',
            unexpectedFlow: 'Debit detectat cand toate valvele sunt inchise. Verifica scurgeri.',
            freezeProtection: 'Protectia la inghet este activa. Udarea este oprita temporar.',
            highFlow: 'Debit peste limita invatata. Posibila spargere/scurgere.',
            lowFlow: 'Debit sub limita invatata. Verifica presiunea si filtrele.',
            mainlineLeak: 'Test static: debit cu zonele oprite. Verifica scurgeri.',
            zoneLocked: 'Zona blocata dupa anomalii repetate. Necesita interventie.',
            systemLocked: 'Sistem blocat din cauza unei anomalii critice. Verifica scurgeri.',
            unknown: 'Cod alarma nerecunoscut. Contacteaza suportul.',
        },
        detailTokens: {
            freezeTempLow: 'temperatura scazuta',
            freezeTempStale: 'date senzor invechite',
        },
        detailedDescriptions: {
            noAlarm: 'Sistemul functioneaza normal.',
            noFlow: 'Nu s-a detectat debit in timpul udarii. Verifica alimentarea cu apa si conexiunile.',
            noFlowZone: 'Nu s-a detectat debit in {zone} in timpul udarii. Verifica alimentarea cu apa si conexiunile.',
            unexpectedFlow: 'Debit detectat cand toate valvele sunt inchise ({pulses} impulsuri). Posibila scurgere sau valva blocata.',
            freezeProtection: 'Udarea este oprita din cauza inghetului ({temp}). Va porni cand este sigur.',
            highFlow: 'Debit peste limita sigura. Posibila conducta sparta sau scurgere.',
            highFlowZone: 'Debit peste limita sigura in {zone}. Posibila conducta sparta sau scurgere.',
            lowFlow: 'Debit sub asteptari. Verifica presiunea si filtrele.',
            lowFlowZone: 'Debit sub asteptari in {zone}. Verifica presiunea si filtrele.',
            mainlineLeak: 'Test static a detectat debit ({pulses} impulsuri) cu toate zonele oprite. Scurgere pe conducta principala.',
            zoneLocked: 'Zona blocata dupa anomalii repetate. Este necesara deblocare manuala.',
            zoneLockedZone: '{zone} a fost blocata dupa anomalii repetate. Este necesara deblocare manuala.',
            systemLocked: 'Sistem blocat din cauza unei probleme hidraulice critice. Toata udarea este oprita pana la remediere.',
            unknown: 'Alarma nerecunoscuta. Contacteaza suportul daca problema persista.',
        },
        cleared: 'Alarma stearsa',
        codeLabel: 'Cod',
        dataLabel: 'Date',
        occurredLabel: 'Produs',
        clearTitle: 'Sterge alarma',
        clearConfirmMessage: 'Sigur vrei sa stergi alarma "{alarm}"? Asigura-te ca problema a fost rezolvata.',
    },
    alarmPopup: {
        cleared: 'Alarma stearsa',
        retryIn: 'Reincercare automata in {time}',
        dismiss: 'Inchide',
        clearing: 'Se sterge...',
        clearAlarm: 'Sterge alarma',
        viewHistory: 'Vezi istoricul alarmelor',
    },
    alarmHistory: {
        title: 'Istoric alarme',
        emptyTitle: 'Fara alarme',
        emptyMessage: 'Sistemul de irigare functioneaza normal.',
        active: 'Activa',
        cleared: 'Stearsa',
        clearedAt: 'Stearsa {time}',
        clearAlarm: 'Sterge alarma',
        clearAll: 'Sterge toate alarmele',
        clearAllTitle: 'Sterge toate alarmele',
        clearAllConfirmMessage: 'Aceasta actiune sterge toate alarmele active de pe controler. Fa asta doar dupa ce ai rezolvat cauza problemei.',
        clearAllConfirmWord: 'STERGE',
        testZone30s: 'Testeaza zona (30s)',
        testZoneRunningTitle: 'Testam {zone}',
        testZoneRunningMessage: 'Se opreste automat in {seconds}s. Apasa Oprire de urgenta daca e nevoie.',
        emergencyStop: 'Oprire de urgenta',
        testZoneCompleted: 'Testul zonei s-a incheiat.',
        time: {
            unknown: 'Necunoscut',
            justNow: 'Chiar acum',
            minutesAgo: 'acum {count}m',
            hoursAgo: 'acum {count}h',
            daysAgo: 'acum {count}z',
        },
    },
    deviceSelector: {
        title: 'Selecteaza dispozitiv',
        searchPlaceholder: 'Cauta dispozitive...',
        noDevices: 'Nu s-au gasit dispozitive',
        current: 'Curent',
        lastSeen: 'Vazut ultima data: {time}',
        unknown: 'Necunoscut',
        online: 'Online',
        offline: 'Offline',
        addDevice: 'Adauga dispozitiv nou',
    },
    mobileConfirm: {
        typeToConfirm: "Scrie '{value}' pentru confirmare",
    },
    mobileConnectionSuccess: {
        title: 'Conectare reusita',
        subtitle: 'Controlerul este online si gata de configurare.',
        deviceId: 'ID dispozitiv: {id}',
        continueSetup: 'Continua configurarea',
        skipToDashboard: 'Sari la dashboard',
    },
    mobileDeviceInfo: {
        title: 'Info dispozitiv',
        systemStatus: 'Stare sistem',
        signalStrength: 'Semnal',
        signalExcellent: 'Excelent',
        signalGood: 'Bun',
        signalFair: 'Acceptabil',
        signalWeak: 'Slab',
        uptime: 'Timp pornit',
        battery: 'Baterie',
        errors: 'Erori',
        model: 'Model',
        softwareHardware: 'Software si hardware',
        firmwareVersion: 'Versiune firmware',
        serialNumber: 'Numar serial',
        checkUpdates: 'Verifica actualizari',
        rebootDevice: 'Reporneste dispozitivul',
        rebootTitle: 'Repornire dispozitiv',
        rebootMessage: 'Dispozitivul se va reporni si poate dura un minut.',
        rebootConfirm: 'Reporneste',
        rebootNotAvailable: 'Comanda de repornire nu este disponibila in acest firmware.',
    },
    mobileDeviceReset: {
        title: 'Optiuni resetare',
        warningTitle: 'Atentie',
        warningBody: 'Resetarea poate sterge setari, programe si istoric. Alege cu grija.',
        sectionLabel: 'Tipuri resetare',
        helpTitle: 'Ai nevoie de ajutor?',
        helpBody: 'Afla ce face fiecare optiune inainte de a continua.',
        helpAction: 'Afla mai mult',
        confirmTitle: 'Confirma resetarea',
        confirmReset: 'Reseteaza',
        confirmFactory: 'Resetare din fabrica',
        confirmWord: 'RESET',
        factoryResetTitle: 'Resetare din fabrica in curs',
        processing: 'Se proceseaza...',
        resetting: 'Se reseteaza...',
        progressComplete: '{percent}% complet',
        retryAttempt: 'Reincercare {count}',
        resetSuccess: 'Resetare completa',
        resetFailed: 'Resetare esuata: {reason}',
        options: {
            settings: { name: 'Resetare setari', description: 'Sterge setarile', details: 'Reseteaza setarile dispozitivului la valori implicite. Programele si istoricul raman.' },
            schedule: { name: 'Resetare programe', description: 'Sterge programele de udare', details: 'Sterge toate programele si timpii zonelor.' },
            stats: { name: 'Resetare istoric', description: 'Sterge loguri si statistici', details: 'Sterge istoricul de udare, ploaie si mediu.' },
            full: { name: 'Resetare din fabrica', description: 'Sterge toate datele', details: 'Revine la starea din fabrica. Toate datele sunt sterse.' },
        },
        wipeSteps: {
            prepare: 'Pregatire...',
            resetChannels: 'Resetare canale',
            resetSystem: 'Resetare sistem',
            resetCalibration: 'Resetare calibrare',
            clearRainHistory: 'Sterge istoricul ploii',
            clearEnvHistory: 'Sterge istoricul mediului',
            clearOnboarding: 'Sterge onboarding',
            verify: 'Verificare',
            done: 'Gata',
        },
    },
    mobileDeviceScan: {
        title: 'Scanare dispozitive',
        scanning: 'Se scaneaza dispozitive...',
        scanComplete: 'Scanare completa',
        scanHint: 'Asigura-te ca dispozitivul este pornit si in apropiere.',
        availableDevices: '{count} dispozitive gasite',
        looking: 'Se cauta dispozitive...',
        noneFound: 'Nu s-au gasit dispozitive',
        connecting: 'Conectare...',
        connect: 'Conecteaza',
        cantFind: 'Nu gasesti dispozitivul?',
        scanningShort: 'Se scaneaza',
        restartScan: 'Reia scanarea',
        defaultDeviceName: 'Controller AutoWater',
        signalLabel: 'Semnal: {label}',
        signal: {
            unknown: 'Necunoscut',
            excellent: 'Excelent',
            strong: 'Puternic',
            fair: 'Acceptabil',
            weak: 'Slab',
        },
    },
    mobileDeviceSettings: {
        title: 'Setari dispozitiv',
        groups: {
            deviceConfiguration: 'Configurare dispozitiv',
            powerPerformance: 'Putere si performanta',
            maintenance: 'Mentenanta',
        },
        items: {
            deviceInfo: { label: 'Info dispozitiv', subtitle: 'Detalii si status' },
            flowCalibration: { label: 'Calibrare debit', subtitle: 'Calibreaza senzorul de debit' },
            masterValve: { label: 'Supapa principala', subtitle: 'Configureaza timpii supapei' },
            rainSensor: { label: 'Senzor ploaie', subtitle: 'Calibrare si integrare ploaie' },
            powerMode: { label: 'Mod energie', subtitle: 'Setari baterie si performanta' },
            resetOptions: { label: 'Optiuni resetare', subtitle: 'Sterge setari sau date' },
            timeLocation: { label: 'Timp si locatie', subtitle: 'Sincronizare timp si GPS' },
            packsPlants: { label: 'Pachete si plante', subtitle: 'Gestioneaza profilele de plante', subtitleWithCount: '{count} plante custom instalate' },
        },
    },
    firmwareUpdate: {
        checking: 'Se verifica...',
        upToDate: 'Totul este la zi',
        available: 'Actualizari disponibile',
        install: 'Instaleaza',
        backendNotConfigured: 'Backend-ul OTA nu este configurat.',
        connectDeviceFirst: 'Conecteaza un dispozitiv inainte sa verifici actualizarile de firmware.',
        stopWateringFirst: 'Opreste udarea activa inainte de a porni OTA.',
        otaChannel: 'Canal OTA',
        hardwareBoard: 'Placa hardware',
        latestRelease: 'Ultima versiune',
        versionLabel: 'Versiune',
        packageSize: 'Dimensiune pachet',
        releaseNotes: 'Note de versiune',
        downloadAndInstall: 'Descarca si instaleaza OTA',
        uploadedSummary: 'Transferat {size}',
        targetVersion: 'Versiune tinta: v{version}',
        runningVersion: 'Versiune curenta: v{version}',
        downloadingPackage: 'Se descarca pachetul de firmware...',
        startingTransfer: 'Pornesc transferul OTA prin BLE...',
    },
    mobileFlowCalibration: {
        title: 'Calibrare debit',
        currentCalibration: 'Calibrare curenta',
        wizardTitle: 'Pasi de calibrare',
        steps: {
            selectZone: { title: 'Selecteaza zona', desc: 'Alege o zona pentru udare.' },
            prepareContainer: { title: 'Pregateste recipient', desc: 'Ai un recipient gradat pregatit.' },
            runCalibration: { title: 'Ruleaza calibrarea', desc: 'Porneste udarea si colecteaza apa.' },
            enterVolume: { title: 'Introdu volum', desc: 'Introdu volumul colectat.' },
        },
        selectZone: 'Selecteaza o zona',
        selectZoneAlert: 'Selecteaza o zona mai intai.',
        startCalibration: 'Porneste calibrarea',
        startFailed: 'Nu s-a putut porni calibrarea',
        runningZone: 'Ruleaza zona {zone}',
        stopAndMeasure: 'Opreste si masoara',
        pulsesLabel: 'Pulsuri',
        pulsesDetected: 'Pulsuri detectate',
        enterCollectedVolume: 'Introdu volumul colectat',
        litersLabel: 'Litri',
        recalculate: 'Recalculeaza',
        calculatedValue: 'Valoare calculata',
        saveCalibration: 'Salveaza calibrarea',
        saving: 'Se salveaza...',
        saveFailed: 'Salvarea a esuat',
        saveManual: 'Salveaza manual',
        saveManualFailed: 'Salvarea manuala a esuat',
        manualEntry: 'Sau introdu manual',
        completeTitle: 'Calibrare completa',
        collectedPulses: '{count} pulsuri colectate',
        calculateFailed: 'Calcul esuat',
        recalibrate: 'Recalibreaza',
        pulsesPerLiter: 'pulsuri/L',
    },
    mobileHelpAbout: {
        title: 'Ajutor si despre',
        appName: 'AutoWater',
        appTagline: 'Irigare inteligenta, simpla',
        versionBuild: 'Versiune {version} (Build {build})',
        linkNotConfigured: 'Acest link nu este configurat inca. Seteaza URL-ul VITE_* corespunzator.',
        helpSection: {
            title: 'Ajutor',
            userGuide: { title: 'Ghid utilizator', subtitle: 'Invata cum configurezi sistemul' },
            faq: { title: 'Intrebari frecvente', subtitle: 'Raspunsuri rapide' },
            contact: { title: 'Contact suport', subtitle: 'Discuta cu echipa' },
            reportBug: { title: 'Raporteaza bug', subtitle: 'Spune-ne ce nu merge' },
        },
        legalSection: {
            title: 'Legal',
            terms: 'Termeni si conditii',
            privacy: 'Politica de confidentialitate',
            licenses: 'Licente open source',
        },
        footerLine1: 'AutoWater - irigare inteligenta',
        footerLine2: 'Copyright {year} AutoWater',
    },
    mobileHistory: {
        title: 'Istoric',
        tabs: {
            watering: 'Udari',
            environment: 'Mediu',
            rain: 'Ploaie',
        },
        timeFrames: {
            day: 'Zi',
            week: 'Saptamana',
            month: 'Luna',
        },
        timeFrameRanges: {
            day: 'Rezumat zilnic',
            week: 'Rezumat saptamanal',
            month: 'Rezumat lunar',
        },
        days: {
            sun: 'Dum',
            mon: 'Lun',
            tue: 'Mar',
            wed: 'Mie',
            thu: 'Joi',
            fri: 'Vin',
            sat: 'Sam',
        },
        totalConsumption: 'Consum total',
        totalRainfall: 'Ploaie totala',
        averageValues: 'Valori medii',
        sessions: '{count} sesiuni',
        events: '{count} evenimente',
        readings: '{count} citiri',
        skipped: '{count} sarite',
        currentTemp: 'Temperatura curenta',
        currentHumidity: 'Umiditate curenta',
        temperatureLabel: 'Temperatura ({unit})',
        humidityLabel: 'Umiditate ({unit})',
        noWateringData: 'Fara date de udare pentru aceasta perioada',
        noEnvironmentData: 'Fara date de mediu pentru aceasta perioada',
        noRainData: 'Fara date de ploaie pentru aceasta perioada',
        allZones: 'Toate zonele',
        units: {
            mm: 'mm',
        },
    },
    mobileManageDevices: {
        title: 'Gestionare dispozitive',
        currentDevice: 'Dispozitiv curent',
        otherDevices: 'Alte dispozitive',
        activeBadge: 'Activ',
        connectedVia: 'Conectat prin {type}',
        connectionTypes: {
            wifi: 'Wi-Fi',
            bluetooth: 'Bluetooth',
        },
        lastSync: {
            label: 'Ultima sincronizare',
            justNow: 'Acum',
            minutesAgo: 'acum {count} min',
            hoursAgo: 'acum {count} h',
        },
        signalStrength: {
            label: 'Semnal',
            excellent: 'Excelent',
            good: 'Bun',
            fair: 'Acceptabil',
            weak: 'Slab',
        },
        status: {
            online: 'Online',
            standby: 'In asteptare',
            offline: 'Offline',
        },
        deviceLine: '{status} - {location}',
        addController: 'Adauga controller',
        emptyTitle: 'Fara dispozitive',
        emptyMessage: 'Nu ai dispozitive. Adauga unul pentru a incepe.',
    },
    mobileMasterValve: {
        title: 'Supapa principala',
        subtitle: 'Configureaza timpii supapei principale',
        masterLabel: 'Principala',
        delayBefore: 'Intarziere inainte',
        delayBeforeHint: 'Supapa principala se deschide cu {seconds}{unit} inainte de zone',
        delayAfter: 'Intarziere dupa',
        delayAfterHint: 'Supapa principala ramane deschisa {seconds}{unit} dupa oprirea zonelor',
        timingHint: 'Intarzierile protejeaza pompa si stabilizeaza presiunea.',
        timingVisualization: 'Vizualizare timing',
        save: 'Salveaza',
        saving: 'Se salveaza...',
        saveFailed: 'Salvarea a esuat',
    },
    mobileNoDevices: {
        title: 'Fara dispozitive',
        subtitle: 'Conecteaza un controller pentru a incepe',
        addDevice: 'Adauga dispozitiv',
        needHelp: 'Ai nevoie de ajutor?',
        appName: 'AutoWater',
    },
    mobileNotifications: {
        title: 'Notificari',
        clearAll: 'Sterge tot',
        alarms: 'Alarme',
        filters: {
            all: 'Toate',
            errors: 'Erori',
            warnings: 'Avertismente',
            info: 'Info',
        },
        sections: {
            today: 'Azi',
            yesterday: 'Ieri',
            lastWeek: 'Saptamana trecuta',
        },
        days: {
            sun: 'Dum',
            mon: 'Lun',
        },
        emptyTitle: 'Fara notificari',
        emptyMessage: 'Nu ai notificari noi.',
        mock: {
            irrigationCompleted: { title: 'Udare terminata', message: 'Zona a terminat udarea.' },
            irrigationCompletedShort: { message: 'Udare terminata.' },
            moistureAlert: { title: 'Alerta umiditate', message: 'Umiditate sub {threshold}%.' },
            scheduleSkipped: { title: 'Program sarit', message: 'Ploaie detectata. Udarea a fost sarita.' },
            firmwareUpdated: { title: 'Firmware actualizat', message: 'Actualizat la versiunea {version}.' },
            connectionLost: { title: 'Conexiune pierduta', message: 'Dispozitiv offline de {minutes} minute.' },
        },
    },
    mobileOnboardingWizard: {
        deviceName: {
            title: 'Nume dispozitiv',
            subtitle: 'Alege un nume usor de recunoscut',
            placeholder: 'AutoWater',
            defaultName: 'AutoWater',
        },
        timeSync: {
            title: 'Sincronizare timp',
            subtitle: 'Vom sincroniza timpul dispozitivului cu telefonul',
            currentTime: 'Ora curenta',
            autoSync: 'Timpul se sincronizeaza automat',
        },
        masterValve: {
            title: 'Supapa principala',
            subtitle: 'Ai instalata o supapa principala?',
            delayBefore: 'Intarziere inainte',
            delayAfter: 'Intarziere dupa',
            preDelayHint: 'Supapa principala se deschide cu {seconds} inainte de zone',
            postDelayHint: 'Supapa principala ramane deschisa {seconds} dupa oprirea zonelor',
        },
        selectZones: {
            title: 'Selecteaza zone',
            subtitle: 'Alege zonele pe care vrei sa le configurezi',
            loading: 'Se incarca zonele...',
            status: {
                configured: 'Deja configurata',
                willConfigure: 'Va fi configurata',
                tapToEnable: 'Apasa pentru activare',
            },
            selected: '{count} zone selectate',
            selectedSingle: '{count} zona selectata',
            toConfigure: '({count} de configurat)',
        },
        summary: {
            title: 'Configurare completa',
            subtitle: 'Sistemul este gata',
            deviceNameLabel: 'Nume dispozitiv',
            masterValveLabel: 'Supapa principala',
            zonesConfiguredLabel: 'Zone configurate',
            enabled: 'Activata',
            disabled: 'Dezactivata',
            zonesCount: '{count} zone',
            zonesCountSingle: '{count} zona',
            allSetTitle: 'Totul este gata!',
            allSetBody: 'Programele de udare sunt active. Poti ajusta setarile din dashboard.',
        },
        actions: {
            continue: 'Continua',
            configureZones: 'Configureaza zonele',
            goToDashboard: 'Mergi la dashboard',
        },
        zoneNumber: 'Zona {number}',
    },
    mobilePermissions: {
        enableTitle: 'Activeaza {name}',
        enabledTitle: '{name} activat',
        required: 'Obligatoriu',
        permissions: {
            bluetooth: { name: 'Bluetooth', description: 'Necesita Bluetooth pentru a conecta dispozitivul.' },
            location: { name: 'Locatie', description: 'Folosim locatia pentru sol si vreme.' },
            notifications: { name: 'Notificari', description: 'Primeste alerte si actualizari.' },
        },
        allow: 'Permite {name}',
        skipAll: 'Sari peste tot',
        skipForNow: 'Sari pentru acum',
        getStarted: 'Incepe',
        footerNote: 'Poti schimba permisiunile oricand din setari.',
    },
    mobilePowerMode: {
        title: 'Mod energie',
        powerSource: 'Sursa energie',
        currentBattery: 'Baterie curenta',
        mains: 'Retea',
        externalPower: 'Alimentare externa',
        batteryGood: 'Baterie buna',
        batteryLow: 'Baterie scazuta',
        selectPowerMode: 'Selecteaza modul',
        infoNote: 'Modul de energie afecteaza autonomia si conectivitatea.',
        apply: 'Aplica',
        saving: 'Se salveaza...',
        saveFailed: 'Salvarea a esuat',
        modes: {
            performance: {
                name: 'Performanta',
                description: 'Raspuns maxim si actualizari rapide.',
                features: {
                    update15: 'Actualizare la 15 min',
                    bleInstant: 'BLE instant',
                    fullLogging: 'Logare completa',
                },
            },
            balanced: {
                name: 'Echilibrat',
                description: 'Echilibru intre performanta si baterie.',
                features: {
                    update30: 'Actualizare la 30 min',
                    bleNormal: 'BLE normal',
                    standardLogging: 'Logare standard',
                },
            },
            eco: {
                name: 'Eco',
                description: 'Maximizeaza autonomia cu actualizari rare.',
                features: {
                    updateHourly: 'Actualizare la o ora',
                    bleReduced: 'BLE redus',
                    minimalLogging: 'Logare minima',
                },
            },
        },
    },
    mobileSettings: {
        title: 'Setari',
        autoWaterDevice: 'Dispozitiv AutoWater',
        statusLabel: 'Status: {status}',
        statusOnline: 'Online',
        statusOffline: 'Offline',
        switchDevice: 'Schimba dispozitiv',
        sectionAccount: 'Cont',
        profile: 'Profil',
        guest: 'Guest',
        deviceSettings: 'Setari dispozitiv',
        zoneConfiguration: 'Configurare zone',
        wateringSchedules: 'Programe udare',
        rainDelay: 'Intarziere ploaie',
        notifications: 'Notificari',
        alarms: 'Alarme',
        helpCenter: 'Centru ajutor',
        firmware: 'Firmware',
        about: 'Despre',
        account: 'Cont',
        premium: 'Premium',
        aiDoctor: 'AI Doctor',
        sectionDeviceConfiguration: 'Dispozitiv',
        sectionAppPreferences: 'Preferinte aplicatie',
        sectionCustomization: 'Personalizare',
        sectionSupport: 'Suport',
        appearance: 'Aspect',
        themeDark: 'Intunecat',
        themeLight: 'Luminos',
        language: 'Limba',
        selectLanguage: 'Selecteaza limba',
        units: 'Unitati',
        selectUnits: 'Selecteaza unitati',
        metric: 'Metric',
        imperial: 'Imperial',
        disconnectDevice: 'Deconecteaza dispozitiv',
        appVersion: 'Versiune aplicatie',
    },
    mobileAuth: {
        titleAccount: 'Cont',
        titleLogin: 'Autentificare',
        titleSignup: 'Creeaza cont',
        titleConfirm: 'Confirma email-ul',
        signedInUserFallback: 'Utilizator conectat',
        firebaseNotConfiguredTitle: 'AWS Cognito nu este configurat.',
        firebaseNotConfiguredSubtitle: 'Adauga `VITE_AWS_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_APP_CLIENT_ID` in `.env`.',
        loading: 'Se incarca starea contului...',
        planLabel: 'Plan: {plan}',
        planPremium: 'Premium',
        planFree: 'Gratuit',
        openProfile: 'Deschide profil',
        manageSubscription: 'Gestioneaza abonamentul',
        continueTo: 'Continua',
        signOut: 'Deconectare',
        accessTitle: 'Acces cont',
        accessSubtitle: 'Autentifica-te pentru sincronizare, premium si acces la AI Doctor.',
        tabLogin: 'Autentificare',
        tabSignup: 'Inregistrare',
        continueWithGoogle: 'Continua cu Google',
        emailLabel: 'Email',
        emailPlaceholder: 'nume@email.com',
        passwordLabel: 'Parola',
        passwordPlaceholder: 'Minim 8 caractere (mare, mica, cifra, simbol)',
        passwordPolicyHint: 'Minim 8 caractere, cu litera mare, litera mica, cifra si simbol.',
        confirmPasswordLabel: 'Confirma parola',
        confirmPasswordPlaceholder: 'Repeta parola',
        submitLogin: 'Autentificare',
        submitSignup: 'Creeaza cont',
        submitConfirm: 'Confirma',
        errorEmailPasswordRequired: 'Email-ul si parola sunt obligatorii.',
        errorEmailInvalid: 'Introdu un email valid.',
        errorPasswordsDontMatch: 'Parolele nu se potrivesc.',
        errorPasswordPolicy: 'Parola trebuie sa aiba minim 8 caractere si sa contina litera mare, litera mica, cifra si simbol.',
        errorConfirmationCodeRequired: 'Codul de confirmare este obligatoriu.',
        errorAuthFailed: 'Autentificarea a esuat.',
        confirmCodeTitle: 'Confirma-ti email-ul',
        confirmCodeSubtitle: 'Introdu codul trimis la {email}.',
        confirmationCodeLabel: 'Cod confirmare',
        confirmationCodePlaceholder: '123456',
        confirmCodeSentHint: 'Cod trimis. Verifica email-ul (si spam).',
        confirmCodeResentHint: 'Cod retrimis. Verifica email-ul (si spam).',
        resendCode: 'Retrimite codul',
        backToLogin: 'Inapoi la autentificare',
        guestTitle: 'Continua fara cont.',
        guestTitleActive: 'Folosesti modul guest.',
        continueAsGuest: 'Continua ca guest',
        exitGuestMode: 'Iesi din modul guest',
    },
    mobilePremium: {
        title: 'Premium',
        cardTitle: 'AutoWatering Premium',
        cardSubtitle: 'Deblocheaza AI Doctor si identificarea plantei cu camera. Incepe cu 7 zile trial gratuit.',
        checkoutSuccess: 'Plata finalizata. Se actualizeaza abonamentul...',
        checkoutCancelled: 'Plata a fost anulata.',
        errorCheckoutFailed: 'Nu s-a putut deschide pagina de plata.',
        errorBillingPortalFailed: 'Nu s-a putut deschide portalul de facturare.',
        backendNotConfiguredTitle: 'Backend-ul de plata nu este configurat.',
        backendNotConfiguredSubtitle: 'Adauga variabilele de mediu pentru Cognito + abonament.',
        loginRequired: 'Trebuie sa te autentifici pentru a gestiona abonamentul premium.',
        goToLogin: 'Mergi la autentificare',
        statusPremiumActive: 'Premium activ',
        statusFreePlan: 'Plan gratuit',
        statusLabel: 'Status: {status}',
        statusUnknown: 'Necunoscut',
        planLabel: 'Plan: {plan}',
        renewsLabel: 'Reinnoieste: {date}',
        syncing: 'Se sincronizeaza statusul abonamentului...',
        manageSubscription: 'Gestioneaza abonamentul',
        upgradeMonthly: 'Activeaza lunar',
        refreshStatus: 'Reimprospateaza status',
        working: 'Se lucreaza...',
        includedTitle: 'Utilizare inclusa',
        includedResetNote: 'Limitele se reseteaza zilnic si lunar (UTC).',
        featurePlantId: 'Identificare planta (camera)',
        featurePlantIdDescription: 'Identifica plantele din poza si completeaza automat tipul de planta pentru zona.',
        featureAiDoctor: 'AI Doctor',
        featureAiDoctorDescription: 'Detecteaza boli comune ale frunzelor si ofera ghid clar de tratament.',
        perDay: '{count}/zi',
        perMonth: '{count}/luna',
    },
    mobileUpsell: {
        title: 'Deblocheaza Premium',
        subtitle: 'AI Doctor si identificarea plantei cu camera. Incepe cu 7 zile trial gratuit.',
        loginToUpgrade: 'Autentifica-te pentru deblocare',
        upgradeNow: 'Treci la Premium',
        buyPremium: 'Cumpara Premium',
        back: 'Inapoi',
        notNow: 'Nu acum',
        disclaimer: 'Premium este legat de cont. Poti gestiona sau anula oricand.',
    },
    mobileProfile: {
        title: 'Profil',
        emailStatus: 'Status email: {status}',
        emailVerified: 'Verificat',
        emailNotVerified: 'Neverificat',
        loading: 'Se incarca profilul...',
        messageProfileUpdated: 'Profil actualizat.',
        messageVerificationSent: 'Email de verificare trimis.',
        messagePasswordUpdated: 'Parola actualizata.',
        errorProfileUpdateFailed: 'Actualizarea profilului a esuat.',
        errorVerificationFailed: 'Trimiterea emailului de verificare a esuat.',
        errorPasswordMismatch: 'Parola noua si confirmarea nu se potrivesc.',
        errorPasswordChangeFailed: 'Schimbarea parolei a esuat.',
        errorDeleteTypeDelete: 'Scrie DELETE pentru a confirma stergerea contului.',
        errorDeleteFailed: 'Stergerea contului a esuat.',
        sectionProfileDetails: 'Detalii profil',
        placeholderDisplayName: 'Nume afisat',
        placeholderPhone: 'Telefon',
        placeholderCompany: 'Companie',
        placeholderCountry: 'Tara',
        saveProfile: 'Salveaza profil',
        saving: 'Se salveaza...',
        sectionSecurity: 'Securitate',
        sendVerificationEmail: 'Trimite email de verificare',
        placeholderCurrentPassword: 'Parola curenta',
        placeholderNewPassword: 'Parola noua',
        placeholderConfirmNewPassword: 'Confirma parola noua',
        changePassword: 'Schimba parola',
        sectionAccountActions: 'Actiuni cont',
        signOut: 'Deconectare',
        deleteAccountTitle: 'Sterge cont',
        deleteAccountHint: 'Sterge contul si datele din cloud. Scrie DELETE pentru confirmare.',
        placeholderDeletePassword: 'Parola curenta',
        placeholderTypeDelete: 'Scrie DELETE',
        deleteAccountButton: 'Sterge cont',
        deleting: 'Se sterge...',
        working: 'Se lucreaza...',
    },
    mobileAiDoctor: {
        title: 'AI Doctor',
        cardTitle: 'Asistent boli plante',
        cardSubtitle: 'Incarca o poza clara cu frunza, apoi adauga simptome pentru diagnostic mai bun.',
        notConfiguredTitle: 'AI Doctor nu este configurat.',
        notConfiguredSubtitle: 'Seteaza VITE_AI_DOCTOR_API_URL.',
        premiumOnlyTitle: 'AI Doctor este disponibil doar pe Premium.',
        upgradeToPremium: 'Treci la premium',
        checkingSubscription: 'Se verifica abonamentul...',
        chooseLeafPhoto: 'Alege poza frunzei',
        previewAlt: 'Previzualizare planta',
        symptomsLabel: 'Simptome (optional)',
        symptomsPlaceholder: 'Ex: pete galbene, frunze rasucite, praf alb, putregai...',
        analyzing: 'Se analizeaza...',
        analyzeButton: 'Analizeaza riscul de boala',
        diagnosisFailedTitle: 'Diagnosticul a esuat',
        unknownPlant: 'Planta necunoscuta',
        confidenceLabel: 'Incredere: {value}',
        healthStatusLabel: 'Status sanatate:',
        healthLikelyHealthy: 'Probabil sanatoasa',
        healthPossibleDisease: 'Posibila boala detectata',
        healthUnknown: 'Necunoscut',
        diseaseCandidatesTitle: 'Boli posibile',
        diseaseCandidatesEmpty: 'Nu au fost raportate boli.',
        followUpQuestionTitle: 'Intrebare de clarificare',
        aiTreatmentGuidanceTitle: 'Ghid tratament AI',
        disclaimer: 'Ghidul AI este informativ. Confirma bolile grave cu un agronom inainte de tratamente cu risc.',
    },
    mobilePlantId: {
        loginRequired: 'Trebuie sa te autentifici pentru identificarea cu camera.',
        checkingSubscription: 'Se verifica abonamentul...',
        premiumOnly: 'Identificarea cu camera este disponibila doar pe Premium.',
        noLocalMatch: 'Planta a fost identificata de API, dar nu exista in baza de date locala.',
        identificationFailed: 'Identificarea plantei a esuat.',
        reviewTitle: 'Verifica identificarea',
        reviewAmbiguous: 'Rezultatul este ambiguu. Alege varianta corecta din baza locala.',
        reviewNoLocal: 'Nu am gasit o potrivire locala exacta. Alege cea mai apropiata planta.',
        detectedByCamera: 'Detectata de camera',
        matchConfidence: 'Incredere potrivire: {value}%',
        suggestedLocal: 'Planta locala sugerata',
        chooseManually: 'Alege manual',
        useThis: 'Foloseste aceasta planta',
        matchSaved: 'Selectia plantei a fost salvata.',
    },
    mobilePacksSettings: {
        syncError: 'Nu am putut sincroniza datele de pachete de pe dispozitiv.',
        title: 'Pachete si plante',
        loading: 'Se incarca...',
        tabs: {
            plants: 'Plante',
            packs: 'Pachete',
        },
        storage: {
            flash: 'Memorie flash',
            romPlants: 'Plante ROM',
            customPlants: 'Plante personalizate',
        },
        plants: {
            builtIn: 'Plante preinstalate',
            installed: 'Plante instalate',
        },
        labels: {
            id: 'ID',
            version: 'v',
            pack: 'Pachet',
        },
        customPlants: {
            title: 'Plante personalizate',
            empty: 'Nu exista plante personalizate instalate',
            emptyHint: 'Instaleaza plante din Marketplace ca sa apara aici.',
            create: 'Creeaza planta',
        },
        romPlants: {
            title: 'Baza de date plante preinstalata',
            plantsCount: 'plante',
            showMore: 'Arata mai multe',
        },
        packs: {
            installed: 'Pachete instalate',
            empty: 'Nu exista pachete instalate',
            emptyHint: 'Instaleaza un pachet pentru a vedea plantele grupate aici.',
        },
        updates: {
            checking: 'Se verifica actualizarile...',
            check: 'Verifica actualizari',
            upToDate: 'Totul este actualizat.',
            available: 'Exista actualizari disponibile.',
        },
        plantDetails: {
            plantId: 'ID planta',
            packId: 'ID pachet',
            version: 'Versiune',
            bleOnlyNote: 'Acest detaliu este citit din payload-ul BLE.',
            cropCoefficients: 'Coeficienti de cultura',
            growthStages: 'Etape de crestere',
            stageIni: 'Initial',
            stageDev: 'Dezvoltare',
            stageMid: 'Mijloc',
            stageEnd: 'Final',
            rootDepth: 'Adancime radacina',
            depletionFraction: 'Fractie de depletie',
            tolerances: 'Tolerante',
            droughtTolerance: 'Seceta',
            shadeTolerance: 'Umbra',
            salinityTolerance: 'Salinitate',
            recommendedMethod: 'Metoda recomandata de irigare',
            close: 'Inchide',
        },
        packDetails: {
            plantsInPack: 'Plante in acest pachet',
            noPlants: 'Nu s-au gasit plante in acest pachet.',
            close: 'Inchide',
        },
    },
    mobileTimeLocation: {
        title: 'Timp si locatie',
        deviceTime: 'Timp dispozitiv',
        syncing: 'Se sincronizeaza...',
        syncNow: 'Sincronizeaza acum',
        syncSuccess: 'Timp sincronizat',
        syncFailed: 'Sincronizarea a esuat',
        timezone: 'Fus orar',
        timezones: {
            bucharest: 'Bucuresti',
            london: 'Londra',
            berlin: 'Berlin',
            newYork: 'New York',
            losAngeles: 'Los Angeles',
            custom: 'Personalizat',
        },
        utcOffset: 'UTC offset {offset}',
        dst: {
            sectionTitle: 'Ora de vara (DST)',
            toggleTitle: 'DST activ',
            disabledHint: 'Dezactivat. Activeaza DST daca fusul tau orar schimba ora sezonier.',
            summary: 'Incepe {startWeek} {startDow} din {startMonth}, se termina {endWeek} {endDow} din {endMonth} ({offset} min)',
            weekNth: 'sapt. {n}',
            weekLast: 'ultima',
        },
        advancedTitle: 'Setari avansate',
        advancedSubtitle: 'Offset si reguli DST',
        advanced: {
            utcOffsetMinutes: 'UTC offset (minute)',
            dstOffsetMinutes: 'Offset DST (minute)',
            dstStart: 'Regula inceput DST',
            dstEnd: 'Regula final DST',
        },
        locationCoordinates: 'Coordonate locatie',
        latitude: 'Latitudine',
        longitude: 'Longitudine',
        degrees: 'grade',
        getLocation: 'Obtine locatie',
        locationHint: 'Folosim GPS pentru a seta locatia dispozitivului.',
        locationFailed: 'Nu s-a putut obtine locatia',
        saving: 'Se salveaza...',
        saveSettings: 'Salveaza setarile',
        saveSuccess: 'Setari salvate',
        saveFailed: 'Salvarea a esuat',
    },
    mobileRainSensor: {
        title: 'Senzor ploaie',
        updated: 'Actualizat acum {minutes} min',
        loadFailed: 'Nu am putut citi din dispozitiv',
        statusTitle: 'Status',
        sensorActive: 'Senzor activ',
        sensorInactive: 'Senzor inactiv',
        lastPulse: 'Ultimul impuls',
        never: 'Niciodata',
        rainLast24h: 'Ultimele 24h',
        rainLastHour: 'Ultima ora',
        enableTitle: 'Senzor ploaie',
        enableSubtitle: 'Activeaza intrarea pentru tipping-bucket',
        integrationTitle: 'Integrare ploaie',
        integrationSubtitle: 'Foloseste ploaia pentru skip/reducere',
        calibrationTitle: 'Calibrare',
        calibrationHint: 'Seteaza mm/impuls si debounce conform senzorului.',
        calibrate: 'Calibreaza',
        mmPerPulse: 'mm per impuls',
        debounceMs: 'Debounce (ms)',
        advancedTitle: 'Avansat',
        sensitivityPct: 'Sensibilitate (%)',
        skipThresholdMm: 'Prag skip (mm)',
        advancedHint: 'Nota: setarile pe zona au prioritate. Modurile FAO-56 includ deja ploaia.',
        saving: 'Se salveaza...',
        save: 'Salveaza',
        saveSuccess: 'Salvat',
        saveFailed: 'Salvarea a esuat',
        calibrationRequested: 'Calibrarea a fost pornita',
        calibrationFailed: 'Calibrarea a esuat',
    },
    mobileWeatherDetails: {
        title: 'Vreme',
        updated: 'Actualizat acum {minutes} min',
        soilMoisture: {
            title: 'Umiditate sol',
            wateringNeeded: 'Udare necesara',
            wateringSkipped: 'Udare sarita',
            sufficient: 'Suficient',
            consider: 'Ia in calcul udarea',
        },
        soilMoistureOverride: {
            title: 'Override umiditate sol',
            subtitle: 'Calibreaza estimarea folosita la eficienta ploii si calculele FAO-56.',
            enabledLabel: 'Override activ',
            valueLabel: 'Umiditate sol',
            scopeGlobal: 'Global',
            globalDerived: 'Global este derivat din override-urile pe zona si nu poate fi setat.',
            modelTitle: 'Sugestie din model meteo',
            modelValue: 'Open-Meteo (0-9cm) la {time}: {value} (VWC {vwc})',
            modelNoLocation: 'Seteaza locatia ca sa activam sugestiile.',
            modelNoSoilParams: 'Lipsesc parametrii solului pentru selectia curenta (FC/WP).',
            modelFailed: 'Nu am putut incarca estimarea.',
            modelSetLocation: 'Seteaza locatia',
            modelSetSoil: 'Seteaza tipul de sol',
            hint: 'Override-urile pe zona (daca sunt activate) au prioritate fata de fallback-ul global.',
            reset: 'Revino la implicit',
            notConnected: 'Conecteaza-te la dispozitiv ca sa schimbi setarea.',
            loadFailed: 'Nu am putut citi din dispozitiv. Afisez ultima valoare cunoscuta.',
            saveFailed: 'Nu am putut salva in dispozitiv.',
        },
        zoneOverview: 'Prezentare zona',
        temperature: 'Temperatura',
        highLabel: 'Max {value}',
        dewLabel: 'Punct de roua {value}',
        humidity: 'Umiditate',
        last24h: 'Ultimele 24h',
        rainfall: 'Precipitatii',
        windDirection: 'Directie vant',
        windSpeed: 'Viteza vant',
        forecast: {
            title: 'Prognoza',
            rainPercent: 'Ploaie',
            temp: 'Temp',
        },
        forecastLabels: {
            now: 'Acum',
            plus3h: '+3h',
            plus6h: '+6h',
            plus12h: '+12h',
            plus24h: '+24h',
        },
        units: {
            mm: 'mm',
            kmh: 'km/h',
        },
    },
    mobileWelcome: {
        appName: 'AutoWater',
        tagline: 'Control inteligent al irigarii',
        connectingTo: 'Se conecteaza la {name}',
        savedDevices: 'Dispozitive salvate',
        lastConnected: 'Ultima conectare {date}',
        addNewDevice: 'Adauga dispozitiv nou',
        setupNewDevice: 'Configureaza dispozitiv nou',
        terms: 'Continuand, accepti termenii si politica de confidentialitate.',
    },
    mobileZoneConfig: {
        title: 'Configurare zona',
        zoneNotFound: 'Zona nu a fost gasita',
        zoneName: 'Nume zona',
        zoneNamePlaceholder: 'Introdu numele zonei',
        plantType: 'Tip planta',
        selectPlant: 'Selecteaza planta',
        cropCoefficient: 'Coeficient cultura',
        soilType: 'Tip sol',
        selectSoil: 'Selecteaza sol',
        sunExposure: 'Expunere la soare',
        sun: {
            full: 'Soare plin',
            fullDesc: '6+ ore de soare direct',
            partial: 'Soare partial',
            partialDesc: '3-6 ore de soare direct',
            shade: 'Umbra',
            shadeDesc: 'Sub 3 ore de soare',
        },
        areaSize: 'Suprafata',
        areaUnit: 'm2',
        calculatedSettings: 'Setari calculate',
        autoBadge: 'AUTO',
        dailyWaterNeed: 'Necesitate zilnica',
        recommendedCycle: 'Ciclu recomandat',
        frequency: 'Frecventa',
        everyTwoDays: 'La 2 zile',
        advancedSettings: 'Setari avansate',
        save: 'Salveaza',
        selectPlantTitle: 'Selecteaza planta',
        searchPlants: 'Cauta plante...',
        noPlants: 'Nu s-au gasit plante',
        selectSoilTitle: 'Selecteaza sol',
        searchSoils: 'Cauta soluri...',
        noSoils: 'Nu s-au gasit soluri',
    },
    mobileZoneDetails: {
        title: 'Detalii zona',
        zoneNotFound: 'Zona nu a fost gasita',
        loadingZone: 'Se incarca zona...',
        general: 'General',
        waterNeedLow: 'Scazut',
        waterNeedNormal: 'Normal',
        waterNeedHigh: 'Ridicat',
        waterNeedSuffix: 'nevoie de apa',
        remainingLabel: 'Ramas',
        idleLabel: 'Inactiv',
        nextSchedule: 'Urmatoarea udare: {time}',
        quickActions: 'Actiuni rapide',
        skipNext: 'Sari peste urmatoarea',
        healthStats: 'Statistici',
        soilMoisture: 'Umiditate sol',
        lastRunUsage: 'Consum ultima udare',
        watering: 'Udare',
        startManualCycle: 'Porneste ciclu manual',
        plantTitle: 'Planta',
        plantId: 'ID planta {id}',
        soilId: 'ID sol {id}',
        methodId: 'ID metoda {id}',
        customSoilName: 'Sol personalizat: {name}',
        customSatellite: 'Satelit personalizat',
        typeValue: 'Tip {value}',
        modeValue: 'Mod {value}',
        everyXDays: 'La fiecare {count} zile',
        inlineSeparator: ' | ',
        smartStatsTitle: 'Statistici smart',
        needBadge: 'Necesita apa',
        calculatedVolume: 'Volum calculat',
        stageLabel: 'Etapa {stage}',
        afterPlanting: 'Dupa plantare',
        rainBenefit: 'Beneficiu ploaie',
        waterDeficit: 'Deficit de apa',
        waterManagement: 'Management apa',
        savedToDevice: 'Salvat pe dispozitiv',
        intervalModeLoadFailed: 'Nu am putut citi timpii Cycle & Soak. Duratele nu au fost salvate.',
        intervalModeUnsupported: 'Timpii Cycle & Soak nu sunt suportati de firmware-ul tau.',
        manualControl: 'Control manual',
        advancedZoneControls: 'Controale avansate zona',
        tapToStartCycle: 'Apasa pentru ciclu de {minutes} min',
        resetConfirmBody: 'Resetezi setarile zonei?',
        wateringModeTitle: 'Mod udare',
        wateringModeSubtitle: 'Alege modul de udare',
        wateringModeSmartDesc: 'Automat, bazat pe vreme',
        wateringModeManualDesc: 'Program fix si cantitate fixa',
        smartAutoTitle: 'Smart Auto',
        recommendedBadge: 'Recomandat',
        smartAutoDesc: 'Calculeaza automat necesarul de apa.',
        smartEcoTitle: 'Smart Eco',
        waterSaverBadge: 'Economisire apa',
        smartEcoDesc: 'Foloseste mai putina apa.',
        fixedDurationDesc: 'Udare pentru o durata fixa.',
        fixedVolumeDesc: 'Udare pana la un volum fix.',
        scheduleActiveTitle: 'Program activ',
        scheduleActiveSubtitle: 'Zona se uda automat.',
        wateringDaysLabel: 'Zile de udare',
        startTimeLabel: 'Ora de start',
        solarTimingTitle: 'Program solar',
        solarTimingSubtitle: 'Bazat pe rasarit/apus',
        allLabel: 'Toate',
        cameraTitle: 'Identifica planta',
        cameraSubtitle: 'Foloseste camera pentru identificare',
        cameraComingSoon: 'Identificarea cu camera in curand',
        browseDatabase: 'Rasfoieste baza de date',
        searchPlantsPlaceholder: 'Cauta plante...',
        soilTitle: 'Sol',
        detectFromGpsTitle: 'Detecteaza din GPS',
        detectFromGpsSubtitle: 'Foloseste locatia pentru tip sol',
        soilDetectUnavailable: 'Detectarea solului indisponibila',
        soilDetectGpsDenied: 'Permisiune GPS refuzata',
        soilDetectNotAvailable: 'Detectarea solului nu este disponibila',
        soilDetectFailed: 'Detectarea solului a esuat',
        noCustomSoilProfile: 'Niciun profil de sol personalizat. Apasă "Detectează din GPS" mai întâi.',
        customSoilTitle: 'Sol personalizat',
        customSoilGps: 'Sol personalizat: {name}',
        customSoilSaved: 'Sol salvat: {name}',
        customSoilEnabled: 'Sol personalizat activ',
        soilComposition: 'Compozitie sol',
        disableButton: 'Dezactiveaza',
        orSelectType: 'Sau selecteaza tipul',
        satelliteDetectedTitle: 'Detectat din satelit',
        satelliteDetectedSubtitle: 'Date sol din satelit',
        searchSoilPlaceholder: 'Cauta soluri...',
        irrigationTitle: 'Metoda irigare',
        irrigationSubtitle: 'Selecteaza metoda de irigare',
        efficiencyLabel: 'Eficienta {value}%',
        applicationRateLabel: 'Debit {value} mm/h',
        coverageTitle: 'Acoperire',
        coverageQuestion: 'Cum se calculeaza acoperirea?',
        coverageAreaLabel: 'Dupa suprafata',
        coverageAreaDesc: 'Seteaza suprafata in metri patrati',
        coveragePlantsLabel: 'Dupa plante',
        coveragePlantsDesc: 'Seteaza numarul de plante',
        units: {
            mm: 'mm',
            mmPerDay: 'mm/zi',
            days: 'zile',
            squareMeters: 'm2',
            plants: 'plante',
        },
        quickPresets: 'Presetari rapide',
        sunExposureTitle: 'Expunere la soare',
        sunExposureQuestion: 'Cat soare primeste zona?',
        sunShadeDesc: 'Mai mult umbra',
        sunPartialDesc: 'Soare partial',
        sunFullDesc: 'Soare plin',
        sunInfoNote: 'Soarele influenteaza necesarul de apa.',
        rainAdjustmentTitle: 'Ajustare ploaie',
        rainAdjustmentOn: 'Ajustare ploaie activata',
        rainAdjustmentOff: 'Ajustare ploaie dezactivata',
        rainAdjustmentOnDesc: 'Reduce udarea cand se anunta ploaie.',
        rainAdjustmentOffDesc: 'Fara ajustari pentru ploaie.',
        rainAdjustmentQuestion: 'Cat de sensibila sa fie?',
        rainPresets: {
            lightLabel: 'Usor',
            lightDesc: 'Sensibilitate mica, reducere mica',
            normalLabel: 'Normal',
            normalDesc: 'Echilibru intre sensibilitate si reducere',
            strongLabel: 'Puternic',
            strongDesc: 'Sensibilitate mare, reducere mare',
        },
        rainAdjustmentInfo: 'Ajusteaza udarea in functie de prognoza.',
        tempAdjustmentTitle: 'Ajustare temperatura',
        tempAdjustmentOn: 'Ajustare temperatura activata',
        tempAdjustmentOff: 'Ajustare temperatura dezactivata',
        tempAdjustmentOnDesc: 'Creste udarea in zilele calde.',
        tempAdjustmentOffDesc: 'Fara ajustari de temperatura.',
        tempAdjustmentQuestion: 'Cat de sensibila sa fie?',
        tempPresets: {
            lightLabel: 'Usor',
            lightDesc: 'Sensibilitate mica, crestere mica',
            normalLabel: 'Normal',
            normalDesc: 'Echilibru intre sensibilitate si crestere',
            strongLabel: 'Puternic',
            strongDesc: 'Sensibilitate mare, crestere mare',
        },
        tempAdjustmentInfo: 'Ajusteaza udarea in functie de temperatura.',
        cycleSoakEnabledDesc: 'Cycle & Soak activ',
        cycleSoakDisabledDesc: 'Cycle & Soak dezactivat',
        cycleSoakInfo: 'Ajuta la prevenirea scurgerii.',
        cycleDurationLabel: 'Durata ciclu',
        cycleDurationHint: 'Cicluri scurte reduc scurgerea.',
        soakDurationLabel: 'Durata pauza',
        soakDurationHint: 'Timp intre cicluri.',
        maxVolumePerWatering: 'Volum maxim per udare',
        maxVolumeHint: 'Limiteaza udarea excesiva.',
        scheduleAutomatic: 'Automat',
        scheduleAutoNote: 'Program automat bazat pe vreme.',
        growingEnvironmentTitle: 'Mediu de crestere',
        detectedFromGps: 'Detectat din GPS',
        estimatedVolume: 'Volum estimat',
        smartWateringActive: 'Udare smart activa',
        adjustmentsAutomatic: 'Ajustari automate',
        smartModeDescription: 'Bazat pe vreme, sol si plante.',
        currentWeatherImpact: 'Impact meteo curent',
        waterLossLabel: 'Pierderi apa',
        waterLossPerDay: 'Pierderi pe zi',
        plantNeedsLabel: 'Necesar plante',
        plantNeedsNote: 'Ajustat dupa tipul plantei',
        plantNeedsPerDay: 'Necesar pe zi',
        rainBenefitPositive: 'Ploaia ajuta',
        rainBenefitNone: 'Fara beneficiu ploaie',
        summaryNeeds: 'Necesita apa',
        summaryEnough: 'Suficient',
        todaysAdjustment: 'Ajustarea de azi',
        lessWater: 'Mai putina apa',
        normalWater: 'Normal',
        moreWater: 'Mai multa apa',
        noWeatherAdjustments: 'Fara ajustari azi',
        hotWeatherNote: 'Vreme calda a crescut udarea',
        rainWeatherNote: 'Ploaia a redus udarea',
        weatherAdjustments: 'Ajustari meteo',
        enabledLabel: 'Activat',
        recentRain: 'Ploaie recenta: {value} {unit}',
        skipNextWatering: 'Sare urmatoarea udare',
        usingLessWater: 'Foloseste mai putina apa',
        waitingForRain: 'Se asteapta ploaia',
        tapSettingsToEnable: 'Apasa setari pentru activare',
        currentTemp: 'Temperatura curenta',
        tempFactor: 'Factor temperatura',
        baseTemp: 'Temperatura baza',
        noCompensationConfigured: 'Nu sunt ajustari configurate',
        enableCompensationHint: 'Activeaza ajustarile in setari',
        configureCompensation: 'Configureaza ajustari',
        compensationModeHint: 'Compensarea este disponibila doar pentru modurile Durata/Volum. Schimba din FAO-56 ca sa o configurezi.',
        allTime: 'Tot timpul',
        totalRuns: 'Total rulari',
        avgLiters: 'Medie litri',
        lastLiters: 'Ultimii litri',
        lastRun: 'Ultima udare',
        recentActivity: 'Activitate recenta',
        noHistory: 'Fara istoric',
        errorCode: 'Cod eroare {code}',
        statusPartial: 'Partial',
        days: {
            sun: 'Dum',
            mon: 'Lun',
            tue: 'Mar',
            wed: 'Mie',
            thu: 'Joi',
            fri: 'Vin',
            sat: 'Sam',
        },
        modeLabels: {
            fao56Auto: 'Auto (FAO-56)',
            fao56Eco: 'Eco (FAO-56)',
        },
    },
    loadingScreen: {
        loadingData: 'Se incarca datele...',
        syncCheckingSetup: 'Verificare configurare...',
        syncReadingSensors: 'Citire senzori...',
        syncReadingRain: 'Citire date ploaie...',
        syncReadingStatus: 'Citire stare sistem...',
        syncReadingConfig: 'Citire configuratie...',
        syncReadingMoisture: 'Citire umiditate...',
        syncReady: 'Gata!',
    },
    appSettings: {
        title: 'Setari aplicatie',
        notifications: 'Notificari',
        pushNotifications: 'Notificari push',
        alertsUpdates: 'Alerte si actualizari',
        appearance: 'Aspect',
        darkMode: 'Mod intunecat',
        useDarkTheme: 'Foloseste tema intunecata',
        language: 'Limba',
        selectLanguage: 'Selecteaza limba',
        units: 'Unitati',
        metricLabel: 'Metric ({temp}, {volume}, {length})',
        imperialLabel: 'Imperial ({temp}, {volume}, {length})',
        autoDetectedRegion: 'Detectat automat dupa regiune: {locale}',
        dataPrivacy: 'Date si confidentialitate',
        exportData: 'Exporta date',
        exportDesc: 'Descarca istoricul de udare',
        clearAppData: 'Sterge datele aplicatiei',
        clearAppDesc: 'Sterge cache-ul local si setarile',
        backupToAccount: 'Backup in cont',
        backupToAccountDesc: 'Salveaza preferintele aplicatiei si lista de dispozitive in cloud',
        restoreFromAccount: 'Restaureaza din cont',
        restoreFromAccountDesc: 'Incarca preferintele salvate din backup-ul din cloud',
        backupSaved: 'Backup-ul a fost salvat in cont.',
        backupNotFound: 'Nu exista backup in cloud pentru acest cont.',
        backupRestored: 'Backup-ul a fost restaurat din cont.',
        uxMode: 'Mod afisare',
        advancedMode: 'Mod avansat',
        advancedModeDesc: 'Arata detalii tehnice precum pH, valori FAO-56 Kc',
    },
    ecoBadge: {
        rainDetected: 'Ploaie detectata',
        monitor: 'Monitor Eco',
        last24h: '{amount} mm ultimele 24h',
        zonesPaused: '{count} zon{plural} in pauza',
    },
    hydraulicStatus: {
        statusNominal: 'Sistem normal',
        flowMonitoringActive: 'Monitorizare debit activa',
        monitoringDisabled: 'Monitorizare dezactivata',
        protectionInactive: 'Protectie inactiva',
        systemLocked: 'Sistem blocat',
        warning: 'Atentie',
        view: 'Vezi',
        lockReasons: {
            highFlow: 'Debit mare detectat',
            noFlow: 'Fara debit detectat',
            unexpected: 'Debit neasteptat',
            mainlineLeak: 'Scurgere conducta principala',
            allClear: 'Totul este in regula',
            unknown: 'Anomalie necunoscuta',
        },
    },
    hydraulicDetails: {
        title: 'Profil hidraulic',
        statusLocked: 'Blocat',
        statusLearning: 'Invatare',
        statusActive: 'Activ',
        profileAuto: 'Auto',
        profileSpray: 'Spray',
        profileDrip: 'Picurare',
        profileUnknown: 'Necunoscut',
        alertHighFlow: 'Debit mare detectat',
        alertNoFlow: 'Fara debit detectat',
        alertLeak: 'Debit neasteptat detectat',
        alertMainline: 'Scurgere conducta principala',
        alertAnomaly: 'Anomalie de debit detectata',
        lockDescription: 'Blocarea hidraulica este activa. Verifica scurgerile sau blocajele inainte de reluare.',
        flowRate: 'Debit',
        variance: 'Variatie',
        estimated: 'Estimat',
        calibrating: 'Calibrare {current}/{total}',
    },
    soilTank: {
        title: 'Rezervor sol',
        subtitle: 'Umiditate sol inteligenta',
        currentDeficit: 'Deficit curent',
        etcToday: 'ETc azi',
        nextVolume: 'Urmatorul volum',
        irrigationNeeded: 'Irigare necesara',
    },
    locationPicker: {
        instruction: 'Apasa pe harta pentru a seta locatia',
        selectedTitle: 'Locatie selectata',
        sourceLabel: 'Sursa',
        sourceGps: 'GPS',
        sourceMap: 'Harta',
        sourceManual: 'Manual',
        hideManual: 'Ascunde introducerea manuala',
        manualEntry: 'Introducere manuala',
        latitude: 'Latitudine',
        longitude: 'Longitudine',
        setLocation: 'Seteaza locatia',
        invalidCoordinates: 'Coordonate invalide',
        latitudeRange: 'Latitudinea trebuie sa fie intre -90 si 90',
        longitudeRange: 'Longitudinea trebuie sa fie intre -180 si 180',
    },
};

// All translations
export const translations: Record<Language, TranslationKeys> = {
    en,
    ro,
};

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';

