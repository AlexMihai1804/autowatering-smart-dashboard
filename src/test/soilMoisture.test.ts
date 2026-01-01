import { describe, it, expect } from 'vitest';
import {
  calcSoilMoisturePercentPreferred,
  calcSoilMoisturePercentFromAutoCalc,
  calcAverageSoilMoisturePercent,
  calcAverageSoilMoisturePercentPreferred,
  getSoilMoistureLabel,
} from '../utils/soilMoisture';
import { AutoCalcStatusData, SoilMoistureConfigData } from '../types/firmware_structs';

describe('soilMoisture utilities', () => {
  // ============================================================================
  // calcSoilMoisturePercentFromAutoCalc
  // ============================================================================
  describe('calcSoilMoisturePercentFromAutoCalc', () => {
    it('should return null if autoCalc is null or undefined', () => {
      expect(calcSoilMoisturePercentFromAutoCalc(null)).toBeNull();
      expect(calcSoilMoisturePercentFromAutoCalc(undefined)).toBeNull();
    });

    it('should return null if last_calculation_time is 0', () => {
      const autoCalc = {
        channel_id: 1,
        raw_mm: 100,
        current_deficit_mm: 20,
        last_calculation_time: 0,
      } as AutoCalcStatusData;
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBeNull();
    });

    it('should return null if raw_mm is 0 or negative', () => {
      const autoCalc = {
        channel_id: 1,
        raw_mm: 0,
        current_deficit_mm: 20,
        last_calculation_time: 1700000000,
      } as AutoCalcStatusData;
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBeNull();

      const autoCalcNeg = { ...autoCalc, raw_mm: -10 };
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalcNeg)).toBeNull();
    });

    it('should return null if raw_mm is NaN or Infinity', () => {
      const autoCalc = {
        channel_id: 1,
        raw_mm: NaN,
        current_deficit_mm: 20,
        last_calculation_time: 1700000000,
      } as AutoCalcStatusData;
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBeNull();

      const autoCalcInf = { ...autoCalc, raw_mm: Infinity };
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalcInf)).toBeNull();
    });

    it('should return null if current_deficit_mm is NaN', () => {
      const autoCalc = {
        channel_id: 1,
        raw_mm: 100,
        current_deficit_mm: NaN,
        last_calculation_time: 1700000000,
      } as AutoCalcStatusData;
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBeNull();
    });

    it('should return null if current_deficit_mm is negative (fails validation)', () => {
      // The function checks `deficitMm < 0` and returns null
      const autoCalc = {
        channel_id: 1,
        raw_mm: 100,
        current_deficit_mm: -10,
        last_calculation_time: 1700000000,
      } as AutoCalcStatusData;
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBeNull();
    });

    it('should calculate correct moisture percent', () => {
      const autoCalc = {
        channel_id: 1,
        raw_mm: 100,
        current_deficit_mm: 0,
        last_calculation_time: 1700000000,
      } as AutoCalcStatusData;
      // deficit 0 -> 100% moisture
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBe(100);

      // deficit 50 out of 100 -> 50%
      expect(calcSoilMoisturePercentFromAutoCalc({ ...autoCalc, current_deficit_mm: 50 })).toBe(50);

      // deficit 25 out of 100 -> 75%
      expect(calcSoilMoisturePercentFromAutoCalc({ ...autoCalc, current_deficit_mm: 25 })).toBe(75);

      // deficit 100 out of 100 -> 0%
      expect(calcSoilMoisturePercentFromAutoCalc({ ...autoCalc, current_deficit_mm: 100 })).toBe(0);
    });

    it('should clamp deficit to raw_mm (deficit > raw_mm)', () => {
      const autoCalc = {
        channel_id: 1,
        raw_mm: 100,
        current_deficit_mm: 150, // larger than raw_mm
        last_calculation_time: 1700000000,
      } as AutoCalcStatusData;
      // Clamped to 100, so 0% moisture
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBe(0);
    });

    it('should clamp result between 0 and 100', () => {
      const autoCalc = {
        channel_id: 1,
        raw_mm: 100,
        current_deficit_mm: 200,
        last_calculation_time: 1700000000,
      } as AutoCalcStatusData;
      expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBe(0);
    });
  });

  // ============================================================================
  // calcSoilMoisturePercentPreferred
  // ============================================================================
  describe('calcSoilMoisturePercentPreferred', () => {
    it('should return null if all inputs are null/undefined', () => {
      expect(calcSoilMoisturePercentPreferred({})).toBeNull();
      expect(calcSoilMoisturePercentPreferred({ perChannelConfig: null, globalConfig: null, autoCalc: null })).toBeNull();
    });

    it('should prefer per-channel config over global config', () => {
      const perChannel: SoilMoistureConfigData = {
        channel_id: 1,
        enabled: true,
        moisture_pct: 70,
        has_data: true,
      };
      const global: SoilMoistureConfigData = {
        channel_id: 0xff,
        enabled: true,
        moisture_pct: 50,
        has_data: true,
      };
      expect(calcSoilMoisturePercentPreferred({ perChannelConfig: perChannel, globalConfig: global })).toBe(70);
    });

    it('should fallback to global config if per-channel is disabled', () => {
      const perChannel: SoilMoistureConfigData = {
        channel_id: 1,
        enabled: false,
        moisture_pct: 70,
        has_data: true,
      };
      const global: SoilMoistureConfigData = {
        channel_id: 0xff,
        enabled: true,
        moisture_pct: 50,
        has_data: true,
      };
      expect(calcSoilMoisturePercentPreferred({ perChannelConfig: perChannel, globalConfig: global })).toBe(50);
    });

    it('should fallback to 50% default if configs exist but neither is enabled', () => {
      const perChannel: SoilMoistureConfigData = {
        channel_id: 1,
        enabled: false,
        moisture_pct: 70,
        has_data: true,
      };
      const global: SoilMoistureConfigData = {
        channel_id: 0xff,
        enabled: false,
        moisture_pct: 50,
        has_data: true,
      };
      expect(calcSoilMoisturePercentPreferred({ perChannelConfig: perChannel, globalConfig: global })).toBe(50);
    });

    it('should fallback to autoCalc if no config returns value', () => {
      const autoCalc = {
        channel_id: 1,
        raw_mm: 100,
        current_deficit_mm: 40,
        last_calculation_time: 1700000000,
      } as AutoCalcStatusData;
      expect(calcSoilMoisturePercentPreferred({ autoCalc })).toBe(60);
    });

    it('should clamp moisture_pct to 0-100 range', () => {
      const perChannel: SoilMoistureConfigData = {
        channel_id: 1,
        enabled: true,
        moisture_pct: 150, // out of range
        has_data: true,
      };
      expect(calcSoilMoisturePercentPreferred({ perChannelConfig: perChannel })).toBe(100);

      const perChannelNeg: SoilMoistureConfigData = {
        channel_id: 1,
        enabled: true,
        moisture_pct: -10,
        has_data: true,
      };
      expect(calcSoilMoisturePercentPreferred({ perChannelConfig: perChannelNeg })).toBe(0);
    });
  });

  // ============================================================================
  // calcAverageSoilMoisturePercent
  // ============================================================================
  describe('calcAverageSoilMoisturePercent', () => {
    it('should return null for empty iterable', () => {
      expect(calcAverageSoilMoisturePercent([])).toBeNull();
    });

    it('should return null if all items have no valid data', () => {
      expect(calcAverageSoilMoisturePercent([null, undefined, null])).toBeNull();
    });

    it('should calculate average from multiple autoCalc entries', () => {
      const calcs = [
        { channel_id: 1, raw_mm: 100, current_deficit_mm: 0, last_calculation_time: 1700000000 } as AutoCalcStatusData,  // 100%
        { channel_id: 2, raw_mm: 100, current_deficit_mm: 50, last_calculation_time: 1700000000 } as AutoCalcStatusData, // 50%
      ];
      expect(calcAverageSoilMoisturePercent(calcs)).toBe(75); // (100 + 50) / 2
    });

    it('should skip null/undefined entries in average', () => {
      const calcs = [
        { channel_id: 1, raw_mm: 100, current_deficit_mm: 20, last_calculation_time: 1700000000 } as AutoCalcStatusData, // 80%
        null,
        undefined,
      ];
      expect(calcAverageSoilMoisturePercent(calcs)).toBe(80);
    });
  });

  // ============================================================================
  // calcAverageSoilMoisturePercentPreferred
  // ============================================================================
  describe('calcAverageSoilMoisturePercentPreferred', () => {
    it('should return null for empty iterable', () => {
      expect(calcAverageSoilMoisturePercentPreferred([])).toBeNull();
    });

    it('should calculate average from mixed sources', () => {
      const items = [
        {
          perChannelConfig: { channel_id: 1, enabled: true, moisture_pct: 60, has_data: true } as SoilMoistureConfigData,
        },
        {
          autoCalc: { channel_id: 2, raw_mm: 100, current_deficit_mm: 20, last_calculation_time: 1700000000 } as AutoCalcStatusData, // 80%
        },
      ];
      expect(calcAverageSoilMoisturePercentPreferred(items)).toBe(70); // (60 + 80) / 2
    });

    it('should use global config when per-channel not available', () => {
      const globalConfig: SoilMoistureConfigData = {
        channel_id: 0xff,
        enabled: true,
        moisture_pct: 55,
        has_data: true,
      };
      const items = [
        { perChannelConfig: null },
        { perChannelConfig: null },
      ];
      expect(calcAverageSoilMoisturePercentPreferred(items, globalConfig)).toBe(55);
    });
  });

  // ============================================================================
  // getSoilMoistureLabel
  // ============================================================================
  describe('getSoilMoistureLabel', () => {
    it('should return "Low" for percent <= 30', () => {
      expect(getSoilMoistureLabel(0)).toBe('Low');
      expect(getSoilMoistureLabel(10)).toBe('Low');
      expect(getSoilMoistureLabel(30)).toBe('Low');
    });

    it('should return "Fair" for percent > 30 and <= 60', () => {
      expect(getSoilMoistureLabel(31)).toBe('Fair');
      expect(getSoilMoistureLabel(45)).toBe('Fair');
      expect(getSoilMoistureLabel(60)).toBe('Fair');
    });

    it('should return "Optimal" for percent > 60', () => {
      expect(getSoilMoistureLabel(61)).toBe('Optimal');
      expect(getSoilMoistureLabel(80)).toBe('Optimal');
      expect(getSoilMoistureLabel(100)).toBe('Optimal');
    });
  });
});
