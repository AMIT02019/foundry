"use client";

import { useState } from "react";

/**
 * Download links are minted on demand and die in fifteen minutes, so the page
 * asks for one at click time rather than rendering a link that would be stale
 * by the time anyone used it.
 */
export function DownloadButton({ licenseId }: { licenseId: number }) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleClick() {
    setState("working");
    try {
      const response = await fetch("/api/account/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setState("error");
        setMessage(explain(data.error));
        return;
      }

      window.location.href = data.url;
      setState("idle");
    } catch {
      setState("error");
      setMessage("Couldn't reach the server. Try again in a moment.");
    }
  }

  return (
    <>
      <button
        className="btn btn--block"
        onClick={handleClick}
        disabled={state === "working"}
      >
        {state === "working" ? "Preparing…" : "Download"}
      </button>
      {state === "error" ? (
        <p className="purchase__error mono">{message}</p>
      ) : null}
    </>
  );
}

function explain(reason?: string): string {
  switch (reason) {
    case "revoked":
      return "This licence has been revoked. Contact support.";
    case "no_release":
      return "No downloadable release is attached to this product yet.";
    case "sign_in_required":
      return "Your session expired. Sign in again.";
    default:
      return "Download failed. Try again in a moment.";
  }
}
