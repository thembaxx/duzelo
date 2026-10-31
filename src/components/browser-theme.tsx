'use client';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

/** Keep browser bars coordinated with explicit theme, including overrides. */
export function BrowserTheme() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme !== 'dark' && resolvedTheme !== 'light') return;
    const color = resolvedTheme === 'dark' ? '#101C17' : '#F9F7F0';
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => {
      meta.content = color;
      meta.removeAttribute('media');
    });
    document.documentElement.style.backgroundColor = color;
  }, [resolvedTheme]);
  return null;
}
