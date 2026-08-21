"use client";

import { useCallback, useRef } from "react";
import { formatPrice } from "@/lib/money";
import { PLATFORMS, type PlatformSlug } from "@/lib/platforms";

export interface CardProduct {
  slug: string;
  title: string;
  tagline: string;
  priceRegular: number;
  currency: string;
  thumbnailUrl: string | null;
  demoUrl: string | null;
  platformSlug: string;
  version: string | null;
}

/**
 * Cards are browser viewports that lift off the page under the pointer. The
 * tilt is written straight to a CSS custom property inside rAF — no state, no
 * rerender, so a grid of forty cards stays at 60fps.
 */
export function TemplateCard({ product }: { product: CardProduct }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const frame = useRef(0);

  const handleMove = useCallback((event: React.PointerEvent<HTMLAnchorElement>) => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--rx", `${(0.5 - py) * 9}deg`);
      node.style.setProperty("--ry", `${(px - 0.5) * 11}deg`);
      node.style.setProperty("--gx", `${px * 100}%`);
      node.style.setProperty("--gy", `${py * 100}%`);
    });
  }, []);

  const handleLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    cancelAnimationFrame(frame.current);
    node.style.setProperty("--rx", "0deg");
    node.style.setProperty("--ry", "0deg");
  }, []);

  const platform = PLATFORMS[product.platformSlug as PlatformSlug];
  const host = product.demoUrl
    ? product.demoUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : `foundry.dev/${product.slug}`;

  return (
    <div className="card-stage">
      <a
        ref={ref}
        className="card"
        href={`/templates/${product.slug}`}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        <span className="card__sheen" aria-hidden="true" />
        <div className="card__chrome">
          <span className="card__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="card__url">{host}</span>
        </div>
        {product.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="card__shot"
            src={product.thumbnailUrl}
            alt={`${product.title} homepage`}
            loading="lazy"
          />
        ) : (
          <div className="card__shot card__shot--empty">
            <span className="mono">{platform?.name ?? product.platformSlug}</span>
          </div>
        )}
        <div className="card__body">
          <h3 className="card__title">{product.title}</h3>
          <p className="card__tagline">{product.tagline}</p>
          <div className="card__meta">
            <span
              className="badge"
              style={{ ["--dot" as string]: platform?.accent ?? "#1F4BFF" }}
            >
              <i />
              {platform?.name ?? product.platformSlug}
              {product.version ? ` ${product.version}` : ""}
            </span>
            <span className="price">
              {formatPrice(product.priceRegular, product.currency)}
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
