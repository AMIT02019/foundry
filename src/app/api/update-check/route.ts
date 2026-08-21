import { NextResponse } from "next/server";
import { checkForUpdate } from "@/lib/licenses";

/**
 * GET /api/update-check?key=...&slug=...&installed=1.2.0
 *
 * WordPress polls this on its twice-daily update cron. Returns the newest
 * release plus a short-lived package URL, or a reason the buyer isn't eligible.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = params.get("key");
  const slug = params.get("slug");
  const installed = params.get("installed");

  if (!key || !slug) {
    return NextResponse.json(
      { ok: false, reason: "key_and_slug_required" },
      { status: 400 },
    );
  }

  const result = await checkForUpdate(key, slug);
  if (!result.ok) return NextResponse.json(result, { status: 403 });

  return NextResponse.json({
    ...result,
    updateAvailable: installed ? isNewer(result.version, installed) : true,
  });
}

function isNewer(candidate: string, installed: string): boolean {
  const a = candidate.split(".").map(Number);
  const b = installed.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}
