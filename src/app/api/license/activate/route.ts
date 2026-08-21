import { NextResponse } from "next/server";
import { activateLicense, deactivateLicense } from "@/lib/licenses";

/**
 * POST /api/license/activate
 * Body: { key, site_url, action?: "activate" | "deactivate" }
 *
 * Called by the theme's updater class on the buyer's site.
 */
export async function POST(request: Request) {
  let body: { key?: string; site_url?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  const { key, site_url: siteUrl, action = "activate" } = body;
  if (!key || !siteUrl) {
    return NextResponse.json(
      { ok: false, reason: "key_and_site_url_required" },
      { status: 400 },
    );
  }

  const result =
    action === "deactivate"
      ? await deactivateLicense(key, siteUrl)
      : await activateLicense(key, siteUrl);

  return NextResponse.json(result, { status: result.ok ? 200 : 403 });
}
