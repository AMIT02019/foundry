"use client";

import { useEffect } from "react";

/**
 * Lenis smooths the wheel, which is what makes the 3D hero read as one
 * continuous move rather than a series of jumps. Skipped entirely for anyone
 * who has asked for reduced motion — native scrolling is the honest fallback.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;

    import("lenis").then(({ default: Lenis }) => {
      lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      const tick = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return null;
}
