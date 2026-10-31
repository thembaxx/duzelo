"use client";

/**
 * Adapted from the Spotlight Card interaction pattern in EasyUI
 * https://github.com/Surajmaurya1/easyui (MIT). Uses CSS custom properties
 * instead of a second animation runtime. Visual effect is progressive:
 * touch/keyboard/reduced-motion users get the normal static card.
 */
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

type SpotlightStyle = CSSProperties & { "--spot-x"?: string; "--spot-y"?: string };

export function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    const style = ref.current.style as SpotlightStyle & CSSStyleDeclaration;
    style.setProperty("--spot-x", String(event.clientX - bounds.left) + "px");
    style.setProperty("--spot-y", String(event.clientY - bounds.top) + "px");
  }
  return (
    <div ref={ref} onPointerMove={onPointerMove} className={"spotlight-card " + className}>
      {children}
    </div>
  );
}
