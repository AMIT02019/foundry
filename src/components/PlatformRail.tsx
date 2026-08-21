"use client";

import { useEffect, useRef, useState } from "react";
import { platformList } from "@/lib/platforms";

/**
 * A pinned section that steps through what each platform actually gets:
 * delivery method, whether licensing is enforceable, whether updates are
 * automatic. Scroll position drives which row is live — the progression is
 * the information, not decoration.
 */
export function PlatformRail() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const node = section.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const total = node.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      setActive(
        Math.min(
          platformList.length - 1,
          Math.floor(progress * platformList.length),
        ),
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const current = platformList[active];

  return (
    <section className="rail" ref={section} id="licensing">
      <div className="rail__sticky">
        <div className="wrap rail__grid">
          <div>
            <p className="eyebrow mono">One catalogue, four delivery paths</p>
            <h2 className="rail__heading">
              A WordPress theme and an HTML kit are not the same product.
            </h2>
            <p className="rail__copy">
              Only some platforms can enforce a licence or push an update. The
              catalogue knows the difference, so buyers see exactly what they
              get before they pay.
            </p>
          </div>

          <ol className="rail__list">
            {platformList.map((p, i) => (
              <li
                key={p.slug}
                className={`rail__item ${i === active ? "is-active" : ""}`}
                style={{ ["--dot" as string]: p.accent }}
              >
                <span className="rail__mark" aria-hidden="true" />
                <div>
                  <strong>{p.name}</strong>
                  <span className="mono rail__facts">
                    {p.deliveryType === "file" ? "zip download" : "clone link"}
                    {p.supportsLicensing ? " · licence enforced" : ""}
                    {p.supportsAutoUpdate ? " · auto-updates" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="wrap">
          <p className="rail__guide mono">{current?.installGuide}</p>
        </div>
      </div>
    </section>
  );
}
