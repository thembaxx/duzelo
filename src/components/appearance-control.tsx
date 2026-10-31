'use client';

import { Desktop, Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Desktop },
] as const;

export function AppearanceControl({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className={compact ? 'appearance-control compact' : 'appearance-control'}
      role="group" aria-label="Colour theme">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          className="appearance-option"
          type="button"
          aria-label={label + ' theme'}
          aria-pressed={mounted ? theme === value : false}
          disabled={!mounted}
          onClick={() => setTheme(value)}
          title={label + ' theme'}
        >
          <Icon size={17} weight={mounted && theme === value ? 'fill' : 'regular'} aria-hidden />
          {!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
