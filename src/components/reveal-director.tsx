'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Progressive scroll reveals. Content stays visible without JavaScript and
 * under prefers-reduced-motion; no timers, endless loops or animation dependencies.
 */
export function RevealDirector() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = [...document.querySelectorAll<HTMLElement>(
      '.section-heading, .category-card, .demo-scenario-card, .steps-grid li, .detail-panel, .closing-cta'
    )];
    if (!targets.length) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('reveal-in');
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.06, rootMargin: '0px 0px -18px 0px' });
    for (const target of targets) {
      target.classList.add('reveal-pending');
      observer.observe(target);
    }
    return () => {
      observer.disconnect();
      for (const target of targets) {
        target.classList.remove('reveal-pending');
        target.classList.remove('reveal-in');
      }
    };
  }, [pathname]);
  return null;
}
