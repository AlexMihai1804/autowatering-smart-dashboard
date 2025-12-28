import React from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useSettings } from '../../hooks/useSettings';
import {
  calcAverageSoilMoisturePercentPreferred,
  calcSoilMoisturePercentPreferred,
  getSoilMoistureLabel
} from '../../utils/soilMoisture';

const MobileWeatherDetails: React.FC = () => {
  const history = useHistory();
  const { formatTemperature, useCelsius } = useSettings();
  const {
    envData,
    rainData,
    zones,
    autoCalcStatus,
    globalAutoCalcStatus,
    soilMoistureConfig,
    globalSoilMoistureConfig
  } = useAppStore();

  // Soil moisture: prefer device-provided config (if present/enabled), otherwise FAO-derived estimate
  const moistureFromZones = calcAverageSoilMoisturePercentPreferred(
    zones.map((z) => ({
      autoCalc: autoCalcStatus.get(z.channel_id) ?? null,
      perChannelConfig: soilMoistureConfig.get(z.channel_id) ?? null
    })),
    globalSoilMoistureConfig
  );
  const moistureFromGlobal = calcSoilMoisturePercentPreferred({
    perChannelConfig: null,
    globalConfig: globalSoilMoistureConfig,
    autoCalc: globalAutoCalcStatus
  });
  const estimatedMoisture = moistureFromZones ?? moistureFromGlobal;
  const moistureStatus = estimatedMoisture === null ? null : getSoilMoistureLabel(estimatedMoisture);
  
  const temperature = envData?.temperature ?? 24;
  const humidity = envData?.humidity ?? 45;
  const rainfall24h = rainData?.last_24h_mm ?? 0;
  
  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark font-manrope overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center bg-mobile-bg-dark/95 backdrop-blur-md p-4 pb-2 justify-between shrink-0">
        <button 
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
          Environment Status
        </h2>
      </div>
      
      {/* Last updated */}
      <p className="text-mobile-text-muted text-xs font-medium leading-normal pb-4 px-4 text-center flex items-center justify-center gap-1">
        <span className="material-symbols-outlined text-sm">sync</span>
        Updated 2 mins ago
      </p>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        {/* Main Content */}
        <div className="flex flex-col gap-5 px-4">
        {estimatedMoisture !== null && moistureStatus && (
          <>
            {/* Soil Moisture Card */}
            <div className="flex flex-col items-stretch rounded-2xl shadow-sm bg-mobile-card-dark overflow-hidden ring-1 ring-white/5">
              <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-xl font-bold leading-tight">Soil Moisture</p>
                    <p className="text-mobile-text-muted text-sm font-medium mt-1">
                      {zones[0]?.name ?? 'Zone 1'} • Overview
                    </p>
                  </div>
                  <div className="size-10 rounded-full bg-mobile-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-mobile-primary">grass</span>
                  </div>
                </div>
                
                <div className="flex flex-row items-center gap-6">
                  {/* SVG Gauge */}
                  <div className="relative size-32 shrink-0">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        className="text-white/10"
                        cx="50" cy="50" r="42"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                      />
                      <circle
                        className="text-mobile-primary"
                        cx="50" cy="50" r="42"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="263.89"
                        strokeDashoffset={263.89 * (1 - estimatedMoisture / 100)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{estimatedMoisture}%</span>
                      <span className="text-[10px] font-bold text-mobile-primary uppercase tracking-wider">
                        {moistureStatus}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-mobile-primary text-xl mt-0.5">check_circle</span>
                      <div>
                        <p className="text-white text-sm font-bold leading-snug">
                          {estimatedMoisture >= 60 ? 'Watering Skipped' : 'Watering Needed'}
                        </p>
                        <p className="text-mobile-text-muted text-xs leading-relaxed mt-1">
                          {estimatedMoisture >= 60 
                            ? 'Soil moisture is sufficient for the next 24 hours.'
                            : 'Consider running a watering cycle soon.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-white/5">
                <div 
                  className="h-full bg-mobile-primary rounded-r-full transition-all" 
                  style={{ width: `${estimatedMoisture}%` }}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Sensor Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-mobile-card-dark ring-1 ring-white/5">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-red-500/20 rounded-full text-red-400">
                <span className="material-symbols-outlined text-xl">thermostat</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-mobile-text-muted">
                High {formatTemperature(temperature + 4)}
              </span>
            </div>
            <div>
              <p className="text-mobile-text-muted text-sm font-medium">Temperature</p>
              <p className="text-white tracking-tight text-3xl font-extrabold leading-tight mt-1">
                {formatTemperature(temperature, false)}
                <span className="text-lg align-top text-mobile-text-muted">{useCelsius ? '°C' : '°F'}</span>
              </p>
            </div>
          </div>
          
          {/* Humidity */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-mobile-card-dark ring-1 ring-white/5">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                <span className="material-symbols-outlined text-xl">humidity_percentage</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-mobile-text-muted">
                Dew {formatTemperature(temperature - 8)}
              </span>
            </div>
            <div>
              <p className="text-mobile-text-muted text-sm font-medium">Humidity</p>
              <p className="text-white tracking-tight text-3xl font-extrabold leading-tight mt-1">
                {humidity.toFixed(0)}
                <span className="text-lg align-top text-mobile-text-muted">%</span>
              </p>
            </div>
          </div>
          
          {/* Rainfall */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-mobile-card-dark ring-1 ring-white/5">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-mobile-primary/10 rounded-full text-mobile-primary">
                <span className="material-symbols-outlined text-xl">rainy</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-mobile-text-muted">24h</span>
            </div>
            <div>
              <p className="text-mobile-text-muted text-sm font-medium">Rainfall</p>
              <p className="text-white tracking-tight text-3xl font-extrabold leading-tight mt-1">
                {rainfall24h.toFixed(1)}
                <span className="text-lg align-top text-mobile-text-muted font-medium pl-1">mm</span>
              </p>
            </div>
          </div>
          
          {/* Wind - Mock */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-mobile-card-dark ring-1 ring-white/5">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-gray-500/20 rounded-full text-gray-400">
                <span className="material-symbols-outlined text-xl">air</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-mobile-text-muted">NW</span>
            </div>
            <div>
              <p className="text-mobile-text-muted text-sm font-medium">Wind Speed</p>
              <p className="text-white tracking-tight text-3xl font-extrabold leading-tight mt-1">
                8
                <span className="text-lg align-top text-mobile-text-muted font-medium pl-1">km/h</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Forecast Chart */}
        <div className="flex flex-col gap-2 rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-base font-bold leading-normal">Rain & Temp Forecast</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-mobile-primary" />
                <span className="text-[10px] uppercase font-bold text-mobile-text-muted">Rain %</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full border border-white/50" />
                <span className="text-[10px] uppercase font-bold text-mobile-text-muted">Temp</span>
              </div>
            </div>
          </div>
          
          <div className="h-[140px] w-full relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-dashed border-mobile-text-muted" />
              <div className="border-b border-dashed border-mobile-text-muted" />
              <div className="border-b border-dashed border-mobile-text-muted" />
              <div className="border-b border-dashed border-mobile-text-muted" />
            </div>
            
            <svg className="w-full h-full" viewBox="0 0 380 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#13ec37" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#13ec37" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Rain Area */}
              <path
                d="M0 120 L0 100 C 40 100, 50 60, 90 60 C 130 60, 140 90, 180 90 C 220 90, 230 110, 270 110 L 380 120 Z"
                fill="url(#rainGradient)"
              />
              <path
                d="M0 100 C 40 100, 50 60, 90 60 C 130 60, 140 90, 180 90 C 220 90, 230 110, 270 110 L 380 120"
                fill="none"
                stroke="#13ec37"
                strokeWidth="2"
              />
              {/* Temp Line */}
              <path
                d="M0 80 C 40 75, 60 70, 100 65 C 140 60, 160 55, 200 50 C 240 45, 280 50, 320 55 L 380 60"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </svg>
            
            {/* X Axis Labels */}
            <div className="flex justify-between mt-2 text-xs font-medium text-white/30 px-2">
              <span>Now</span>
              <span>+3h</span>
              <span>+6h</span>
              <span>+12h</span>
              <span>+24h</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default MobileWeatherDetails;
