'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function HeroIntro({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = root.current?.querySelectorAll('[data-intro]');
    if (!targets?.length) return;
    gsap.fromTo(targets, { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.68, stagger: 0.09, ease: 'power3.out', clearProps: 'all' });
  }, { scope: root });

  return <div ref={root} className="hero-intro">{children}</div>;
}
