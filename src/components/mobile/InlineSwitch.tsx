import React from 'react';

interface InlineSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
  size?: 'sm' | 'md';
}

const InlineSwitch: React.FC<InlineSwitchProps> = ({
  checked,
  disabled = false,
  onToggle,
  label,
  size = 'md',
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onToggle}
    disabled={disabled}
    className={[
      'relative inline-flex shrink-0 items-center rounded-full border p-1 transition-all duration-200',
      size === 'sm' ? 'h-8 w-14' : 'h-9 w-16',
      checked
        ? 'border-mobile-primary bg-mobile-primary/95 shadow-[0_0_0_1px_rgba(20,247,89,0.35),0_8px_20px_rgba(20,247,89,0.25)]'
        : 'border-white/15 bg-white/10',
      disabled ? 'cursor-not-allowed opacity-45' : 'active:scale-[0.97]',
    ].join(' ')}
  >
    <span
      className={[
        'pointer-events-none block rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.4)] transition-transform duration-200',
        size === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
        checked ? (size === 'sm' ? 'translate-x-6' : 'translate-x-7') : 'translate-x-0',
      ].join(' ')}
    />
  </button>
);

export default InlineSwitch;
