"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/money";

interface BuyBoxProps {
  productId: number;
  slug: string;
  priceRegular: number;
  priceExtended: number | null;
  currency: string;
  demoUrl: string | null;
  platformName: string;
  supportsAutoUpdate: boolean;
  sellerName: string;
  latestVersion?: string | null;
  latestReleaseDate?: string | null;
  requirements?: Record<string, unknown>;
}

export function BuyBox({
  productId,
  slug,
  priceRegular,
  priceExtended,
  currency,
  demoUrl,
  platformName,
  supportsAutoUpdate,
  sellerName,
  latestVersion,
  latestReleaseDate,
  requirements = {},
}: BuyBoxProps) {
  const [selectedTier, setSelectedTier] = useState<"regular" | "extended">(
    "regular",
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePrice =
    selectedTier === "extended" && priceExtended != null
      ? priceExtended
      : priceRegular;

  async function handleBuy() {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: [{ productId, tier: selectedTier }],
        }),
      });

      if (res.status === 401) {
        window.location.href = `/signin?next=/templates/${encodeURIComponent(slug)}`;
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate checkout");
      }

      if (data.keyId && typeof window !== "undefined") {
        if (!(window as unknown as { Razorpay?: unknown }).Razorpay) {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          document.body.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () =>
              reject(new Error("Failed to load Razorpay SDK"));
          });
        }

        const RazorpayConstructor = (
          window as unknown as {
            Razorpay: new (options: Record<string, unknown>) => {
              open: () => void;
            };
          }
        ).Razorpay;

        const rzp = new RazorpayConstructor({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "Foundry",
          description: `License for ${slug} (${selectedTier})`,
          order_id: data.gatewayOrderId,
          handler: function () {
            window.location.href = "/account";
          },
          theme: { color: "#1f4bff" },
        });

        rzp.open();
        setStatus("idle");
      } else {
        window.location.href = "/account";
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Checkout failed. Please try again.",
      );
    }
  }

  const formattedRequirements = Object.entries(requirements).flatMap(
    ([key, value]) => {
      if (value === false || value == null || value === "") return [];
      if (value === true) return [[key, "required"] as [string, string]];
      return [[key, String(value)] as [string, string]];
    },
  );

  return (
    <aside className="buybox">
      <div className="buybox__price">
        {formatPrice(activePrice, currency)}
      </div>

      <div
        className="tier"
        aria-current={selectedTier === "regular"}
        onClick={() => setSelectedTier("regular")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setSelectedTier("regular");
        }}
      >
        <span>
          Regular licence
          <small>One site you or your client owns</small>
        </span>
        <span className="mono">{formatPrice(priceRegular, currency)}</span>
      </div>

      {priceExtended ? (
        <div
          className="tier"
          aria-current={selectedTier === "extended"}
          onClick={() => setSelectedTier("extended")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setSelectedTier("extended");
          }}
        >
          <span>
            Extended licence
            <small>Unlimited sites, resale permitted</small>
          </span>
          <span className="mono">{formatPrice(priceExtended, currency)}</span>
        </div>
      ) : null}

      <button
        className="btn btn--block"
        type="button"
        onClick={handleBuy}
        disabled={status === "loading"}
        style={{ marginTop: "1rem" }}
      >
        {status === "loading"
          ? "Preparing checkout…"
          : `Buy now (${selectedTier === "extended" ? "Extended" : "Regular"})`}
      </button>

      {errorMessage && (
        <p
          className="mono"
          style={{
            color: "#ff5252",
            fontSize: "12px",
            marginTop: "0.5rem",
            wordBreak: "break-word",
          }}
        >
          {errorMessage}
        </p>
      )}

      {demoUrl ? (
        <a
          className="btn btn--ghost btn--block"
          href={demoUrl}
          target="_blank"
          rel="noreferrer"
          style={{ marginTop: "0.5rem" }}
        >
          Open live demo
        </a>
      ) : null}

      <ul className="specs">
        <li>
          <span className="k">Platform</span>
          <span>{platformName}</span>
        </li>
        <li>
          <span className="k">Latest</span>
          <span>{latestVersion ?? "—"}</span>
        </li>
        <li>
          <span className="k">Updated</span>
          <span>{latestReleaseDate ?? "—"}</span>
        </li>
        {formattedRequirements.map(([key, value]) => (
          <li key={key}>
            <span className="k">{key}</span>
            <span>{value}</span>
          </li>
        ))}
        <li>
          <span className="k">Updates</span>
          <span>{supportsAutoUpdate ? "automatic" : "manual"}</span>
        </li>
        <li>
          <span className="k">By</span>
          <span>{sellerName}</span>
        </li>
      </ul>
    </aside>
  );
}
