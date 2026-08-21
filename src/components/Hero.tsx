"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/**
 * WebGL loads only in the browser, only after the copy has painted, and only
 * when the visitor hasn't asked for reduced motion. The headline is never
 * waiting on a 3D bundle.
 */
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

export function Hero() {
  const scroll = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const section = useRef<HTMLElement>(null);
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smallScreen = window.matchMedia("(max-width: 720px)").matches;
    if (reduced || smallScreen) return;

    // Give the first paint room to breathe before pulling in three.js.
    const id = window.setTimeout(() => setShowScene(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const height = section.current?.offsetHeight ?? window.innerHeight;
      scroll.current = Math.min(1, Math.max(0, window.scrollY / height));
    };
    const onPointer = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -((event.clientY / window.innerHeight) * 2 - 1),
      };
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <section className="hero" ref={section}>
      <div className="hero__scene" aria-hidden="true">
        {showScene ? <HeroScene scroll={scroll} pointer={pointer} /> : null}
      </div>
      <div className="hero__veil" aria-hidden="true" />

      <div className="wrap hero__inner">
        <p className="hero__eyebrow mono">
          <span className="pulse" /> 4 platforms · one catalogue
        </p>
        <h1 className="hero__title">
          <span className="line">
            <em>Templates</em> that ship
          </span>
          <span className="line">on any stack.</span>
        </h1>
        <p className="hero__lede">
          WordPress themes, static HTML kits, Shopify storefronts and Framer
          projects, sold side by side. Buy once, keep the files, get a year of
          updates.
        </p>
        <div className="hero__actions">
          <a className="btn btn--lg" href="#catalogue">
            Browse the catalogue
          </a>
          <a className="btn btn--lg btn--wire" href="/seller">
            Sell your work
          </a>
        </div>
      </div>

      <div className="hero__rule" aria-hidden="true">
        <span className="mono">scroll</span>
        <i />
      </div>
    </section>
  );
}
