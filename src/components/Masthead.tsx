"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Transparent over the dark hero, solid once the catalogue is in view — and
 * solid from the start on every page that has no hero behind it, otherwise the
 * white wordmark would sit on white paper.
 */
export function Masthead() {
  const pathname = usePathname();
  const hasHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!hasHero) return;
    const onScroll = () =>
      setScrolled(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasHero]);

  return (
    <header className="masthead" data-lifted={!hasHero || scrolled}>
      <div className="wrap masthead__inner">
        <a href="/" className="wordmark">
          Foundry<span>.</span>
        </a>
        <nav className="masthead__nav">
          <a href="/#catalogue">Browse</a>
          <a href="/#licensing" className="masthead__optional">
            Licensing
          </a>
          <a href="/seller">Sell</a>
          <a href="/account">Downloads</a>
        </nav>
      </div>
    </header>
  );
}
