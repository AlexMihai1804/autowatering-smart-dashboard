import { AutoCalcStatusData, SoilMoistureConfigData } from '../types/firmware_structs';

function calcSoilMoisturePercentFromConfig(
  perChannel?: SoilMoistureConfigData | null,
  globalCfg?: SoilMoistureConfigData | null
): number | null {
  // Spec: even when `has_data=0` (no NVS record), firmware returns usable defaults.
  // Effective precedence:
  // 1) per-channel enabled -> use per-channel moisture
  // 2) else global enabled -> use global moisture
  // 3) else default 50%
  const hasAnyResponse = !!perChannel || !!globalCfg;

  const fromChannel =
    perChannel && perChannel.channel_id !== 0xff && perChannel.enabled ? perChannel.moisture_pct : null;

  const fromGlobal =
    globalCfg && globalCfg.channel_id === 0xff && globalCfg.enabled ? globalCfg.moisture_pct : null;

  const pct = fromChannel ?? fromGlobal ?? (hasAnyResponse ? 50 : null);
  if (pct === null) return null;
  if (!Number.isFinite(pct)) return null;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export function calcSoilMoisturePercentPreferred(args: {
  perChannelConfig?: SoilMoistureConfigData | null;
  globalConfig?: SoilMoistureConfigData | null;
  autoCalc?: AutoCalcStatusData | null;
}): number | null {
  return (
    calcSoilMoisturePercentFromConfig(args.perChannelConfig, args.globalConfig) ??
    calcSoilMoisturePercentFromAutoCalc(args.autoCalc)
  );
}

export function calcSoilMoisturePercentFromAutoCalc(
  autoCalc?: AutoCalcStatusData | null
): number | null {
  if (!autoCalc) return null;

  const rawMm = autoCalc.raw_mm;
  const deficitMm = autoCalc.current_deficit_mm;
  const lastCalc = autoCalc.last_calculation_time;

  if (!lastCalc) return null;
  if (!Number.isFinite(rawMm) || rawMm <= 0) return null;
  if (!Number.isFinite(deficitMm) || deficitMm < 0) return null;

  const clampedDeficit = Math.min(Math.max(deficitMm, 0), rawMm);
  const percent = Math.round((1 - clampedDeficit / rawMm) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function calcAverageSoilMoisturePercent(
  autoCalcs: Iterable<AutoCalcStatusData | null | undefined>
): number | null {
  let sum = 0;
  let count = 0;

  for (const autoCalc of autoCalcs) {
    const pct = calcSoilMoisturePercentFromAutoCalc(autoCalc);
    if (pct === null) continue;
    sum += pct;
    count += 1;
  }

  return count ? Math.round(sum / count) : null;
}

export function calcAverageSoilMoisturePercentPreferred(
  items: Iterable<{
    autoCalc?: AutoCalcStatusData | null;
    perChannelConfig?: SoilMoistureConfigData | null;
  }>,
  globalConfig?: SoilMoistureConfigData | null
): number | null {
  let sum = 0;
  let count = 0;

  for (const item of items) {
    const pct = calcSoilMoisturePercentPreferred({
      autoCalc: item.autoCalc ?? null,
      perChannelConfig: item.perChannelConfig ?? null,
      globalConfig: globalConfig ?? null
    });
    if (pct === null) continue;
    sum += pct;
    count += 1;
  }

  return count ? Math.round(sum / count) : null;
}

export function getSoilMoistureLabel(percent: number): 'Optimal' | 'Fair' | 'Low' {
  if (percent > 60) return 'Optimal';
  if (percent > 30) return 'Fair';
  return 'Low';
}
