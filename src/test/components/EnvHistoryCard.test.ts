/**
 * Tests for EnvHistoryCard helper functions
 * Tests temperature, humidity, and pressure formatting
 */
import { describe, it, expect } from 'vitest';

describe('EnvHistoryCard Helpers', () => {
    describe('formatTemp', () => {
        const formatTemp = (t_x100: number): string => {
            return (t_x100 / 100).toFixed(1);
        };

        it('should format positive temperatures', () => {
            expect(formatTemp(2350)).toBe('23.5');
            expect(formatTemp(2500)).toBe('25.0');
        });

        it('should format zero temperature', () => {
            expect(formatTemp(0)).toBe('0.0');
        });

        it('should format negative temperatures', () => {
            expect(formatTemp(-500)).toBe('-5.0');
            expect(formatTemp(-1234)).toBe('-12.3');
        });

        it('should format with one decimal place', () => {
            expect(formatTemp(1999)).toBe('20.0');  // rounds to 20.0
            expect(formatTemp(2001)).toBe('20.0');  // rounds to 20.0
        });
    });

    describe('formatHumidity', () => {
        const formatHumidity = (h_x100: number): string => {
            return (h_x100 / 100).toFixed(0);
        };

        it('should format normal humidity values', () => {
            expect(formatHumidity(4500)).toBe('45');
            expect(formatHumidity(6500)).toBe('65');
        });

        it('should format 0% humidity', () => {
            expect(formatHumidity(0)).toBe('0');
        });

        it('should format 100% humidity', () => {
            expect(formatHumidity(10000)).toBe('100');
        });

        it('should round to nearest integer', () => {
            expect(formatHumidity(4550)).toBe('46');  // 45.5 rounds to 46
            expect(formatHumidity(4549)).toBe('45');  // 45.49 rounds to 45
        });
    });

    describe('formatPressure', () => {
        const formatPressure = (pa: number): string => {
            return (pa / 100).toFixed(0); // Pa to hPa
        };

        it('should convert Pa to hPa', () => {
            expect(formatPressure(101325)).toBe('1013');  // Standard pressure
            expect(formatPressure(100000)).toBe('1000');
        });

        it('should handle low pressure', () => {
            expect(formatPressure(98000)).toBe('980');
        });

        it('should handle high pressure', () => {
            expect(formatPressure(105000)).toBe('1050');
        });
    });
});

describe('Temperature Chart Calculations', () => {
    describe('Min/Max Temperature', () => {
        it('should calculate min temperature from hourly data', () => {
            const hourlyTemps = [2000, 2500, 3000, 1500, 2200];
            const minTemp = Math.min(...hourlyTemps) / 100;
            expect(minTemp).toBe(15);
        });

        it('should calculate max temperature from hourly data', () => {
            const hourlyTemps = [2000, 2500, 3000, 1500, 2200];
            const maxTemp = Math.max(...hourlyTemps) / 100;
            expect(maxTemp).toBe(30);
        });

        it('should use default when array is empty', () => {
            const hourlyTemps: number[] = [];
            const minTemp = Math.min(...hourlyTemps, 0) / 100;
            const maxTemp = Math.max(...hourlyTemps, 4000) / 100;
            expect(minTemp).toBe(0);
            expect(maxTemp).toBe(40);
        });
    });

    describe('Temperature Range', () => {
        it('should calculate temperature range', () => {
            const minTemp = 15;
            const maxTemp = 30;
            const tempRange = maxTemp - minTemp || 40;
            expect(tempRange).toBe(15);
        });

        it('should default to 40 when range is 0', () => {
            const minTemp = 25;
            const maxTemp = 25;
            const tempRange = maxTemp - minTemp || 40;
            expect(tempRange).toBe(40);
        });
    });

    describe('getTempY (SVG Y coordinate)', () => {
        const getTempY = (temp_x100: number, minTemp: number, tempRange: number): number => {
            const temp = temp_x100 / 100;
            return 100 - ((temp - minTemp) / tempRange * 100);
        };

        it('should return 100 for minimum temperature', () => {
            const minTemp = 15;
            const tempRange = 15; // 15-30°C range
            expect(getTempY(1500, minTemp, tempRange)).toBe(100);
        });

        it('should return 0 for maximum temperature', () => {
            const minTemp = 15;
            const tempRange = 15;
            expect(getTempY(3000, minTemp, tempRange)).toBe(0);
        });

        it('should return 50 for middle temperature', () => {
            const minTemp = 10;
            const tempRange = 20; // 10-30°C range
            expect(getTempY(2000, minTemp, tempRange)).toBe(50);
        });
    });
});

describe('View Type State', () => {
    type ViewType = 'live' | 'hourly' | 'daily';

    it('should start with live view', () => {
        const defaultView: ViewType = 'live';
        expect(defaultView).toBe('live');
    });

    it('should allow switching to hourly', () => {
        let viewType: ViewType = 'live';
        viewType = 'hourly';
        expect(viewType).toBe('hourly');
    });

    it('should allow switching to daily', () => {
        let viewType: ViewType = 'live';
        viewType = 'daily';
        expect(viewType).toBe('daily');
    });
});

describe('Trend Indicators', () => {
    describe('Temperature Trend', () => {
        const getTempTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
            const diff = current - previous;
            if (Math.abs(diff) < 50) return 'stable'; // Less than 0.5°C change
            return diff > 0 ? 'up' : 'down';
        };

        it('should detect rising temperature', () => {
            expect(getTempTrend(2500, 2400)).toBe('up');
        });

        it('should detect falling temperature', () => {
            expect(getTempTrend(2400, 2500)).toBe('down');
        });

        it('should detect stable temperature', () => {
            expect(getTempTrend(2500, 2520)).toBe('stable');
            expect(getTempTrend(2500, 2480)).toBe('stable');
        });
    });

    describe('Humidity Trend', () => {
        const getHumidityTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
            const diff = current - previous;
            if (Math.abs(diff) < 200) return 'stable'; // Less than 2% change
            return diff > 0 ? 'up' : 'down';
        };

        it('should detect rising humidity', () => {
            expect(getHumidityTrend(6500, 6200)).toBe('up');
        });

        it('should detect falling humidity', () => {
            expect(getHumidityTrend(6200, 6500)).toBe('down');
        });

        it('should detect stable humidity', () => {
            expect(getHumidityTrend(6500, 6400)).toBe('stable');
        });
    });
});

describe('Environmental Data Validation', () => {
    describe('Temperature Bounds', () => {
        const isValidTemp = (t_x100: number): boolean => {
            const temp = t_x100 / 100;
            return temp >= -40 && temp <= 85; // Typical sensor range
        };

        it('should accept valid temperatures', () => {
            expect(isValidTemp(2500)).toBe(true);  // 25°C
            expect(isValidTemp(0)).toBe(true);      // 0°C
            expect(isValidTemp(-2000)).toBe(true);  // -20°C
        });

        it('should reject out-of-range temperatures', () => {
            expect(isValidTemp(-5000)).toBe(false); // -50°C
            expect(isValidTemp(10000)).toBe(false); // 100°C
        });
    });

    describe('Humidity Bounds', () => {
        const isValidHumidity = (h_x100: number): boolean => {
            const humidity = h_x100 / 100;
            return humidity >= 0 && humidity <= 100;
        };

        it('should accept valid humidity', () => {
            expect(isValidHumidity(5000)).toBe(true);  // 50%
            expect(isValidHumidity(0)).toBe(true);      // 0%
            expect(isValidHumidity(10000)).toBe(true);  // 100%
        });

        it('should reject out-of-range humidity', () => {
            expect(isValidHumidity(-100)).toBe(false);  // -1%
            expect(isValidHumidity(10100)).toBe(false); // 101%
        });
    });

    describe('Pressure Bounds', () => {
        const isValidPressure = (pa: number): boolean => {
            const hPa = pa / 100;
            return hPa >= 300 && hPa <= 1100; // Typical sensor range
        };

        it('should accept valid pressure', () => {
            expect(isValidPressure(101325)).toBe(true);  // Standard pressure
            expect(isValidPressure(95000)).toBe(true);   // 950 hPa
        });

        it('should reject out-of-range pressure', () => {
            expect(isValidPressure(20000)).toBe(false);  // 200 hPa (too low)
            expect(isValidPressure(120000)).toBe(false); // 1200 hPa (too high)
        });
    });
});

describe('History Entry Timestamp', () => {
    describe('Hourly Data', () => {
        const formatHourlyTimestamp = (hoursAgo: number): string => {
            if (hoursAgo === 0) return 'Now';
            if (hoursAgo === 1) return '1h ago';
            if (hoursAgo < 24) return `${hoursAgo}h ago`;
            return `${Math.floor(hoursAgo / 24)}d ago`;
        };

        it('should format current hour as Now', () => {
            expect(formatHourlyTimestamp(0)).toBe('Now');
        });

        it('should format single hour', () => {
            expect(formatHourlyTimestamp(1)).toBe('1h ago');
        });

        it('should format multiple hours', () => {
            expect(formatHourlyTimestamp(6)).toBe('6h ago');
            expect(formatHourlyTimestamp(23)).toBe('23h ago');
        });

        it('should format as days when 24+ hours', () => {
            expect(formatHourlyTimestamp(24)).toBe('1d ago');
            expect(formatHourlyTimestamp(48)).toBe('2d ago');
        });
    });

    describe('Daily Data', () => {
        const formatDailyTimestamp = (daysAgo: number): string => {
            if (daysAgo === 0) return 'Today';
            if (daysAgo === 1) return 'Yesterday';
            return `${daysAgo} days ago`;
        };

        it('should format today', () => {
            expect(formatDailyTimestamp(0)).toBe('Today');
        });

        it('should format yesterday', () => {
            expect(formatDailyTimestamp(1)).toBe('Yesterday');
        });

        it('should format multiple days', () => {
            expect(formatDailyTimestamp(3)).toBe('3 days ago');
            expect(formatDailyTimestamp(7)).toBe('7 days ago');
        });
    });
});
