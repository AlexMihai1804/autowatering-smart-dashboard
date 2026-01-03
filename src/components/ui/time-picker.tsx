import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { useI18n } from '../../i18n';

type MinuteStep = 1 | 2 | 5 | 10 | 15 | 20 | 30;

export interface ShadcnTimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  minuteStep?: MinuteStep;
  className?: string;
}

const clampHour = (h: number) => (Number.isFinite(h) ? ((Math.round(h) % 24) + 24) % 24 : 0);

const format2 = (n: number) => String(n).padStart(2, '0');

export function TimePicker({
  hour,
  minute,
  onChange,
  minuteStep = 15,
  className,
}: ShadcnTimePickerProps) {
  const { t } = useI18n();
  const safeHour = clampHour(hour);
  const minutes = React.useMemo(() => {
    const step = Math.max(1, minuteStep);
    const out: number[] = [];
    for (let m = 0; m < 60; m += step) out.push(m);
    return out;
  }, [minuteStep]);

  const safeMinute = React.useMemo(() => {
    if (!Number.isFinite(minute)) return minutes[0] ?? 0;
    const closest = minutes.reduce((best, m) =>
      Math.abs(m - minute) < Math.abs(best - minute) ? m : best
    , minutes[0] ?? 0);
    return closest;
  }, [minute, minutes]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full max-w-[260px] justify-center border border-mobile-border-dark bg-white/5 text-white',
            className
          )}
        >
          {format2(safeHour)}:{format2(safeMinute)}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px]">
        <div className="text-center text-sm font-bold text-mobile-text-muted mb-3">{t('timePicker.selectTime')}</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold text-mobile-text-muted mb-2">{t('timePicker.hour')}</div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-mobile-border-dark bg-white/5 p-1">
              {Array.from({ length: 24 }, (_, h) => {
                const selected = h === safeHour;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onChange(h, safeMinute)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors',
                      selected
                        ? 'bg-mobile-primary/20 text-mobile-primary'
                        : 'text-white/80 hover:bg-white/5'
                    )}
                  >
                    {format2(h)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-mobile-text-muted mb-2">{t('timePicker.minute')}</div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-mobile-border-dark bg-white/5 p-1">
              {minutes.map((m) => {
                const selected = m === safeMinute;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange(safeHour, m)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors',
                      selected
                        ? 'bg-mobile-primary/20 text-mobile-primary'
                        : 'text-white/80 hover:bg-white/5'
                    )}
                  >
                    {format2(m)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
