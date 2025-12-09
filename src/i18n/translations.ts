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
};

// All translations
export const translations: Record<Language, TranslationKeys> = {
    en,
    ro,
};

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';
