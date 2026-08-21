import { createHmac, timingSafeEqual } from "crypto";

/**
 * Razorpay via its REST API rather than the SDK — two endpoints and one HMAC
 * check don't justify a dependency, and this keeps the surface auditable.
 *
 * Amounts are in paise, which is already how the whole app stores money.
 */

const API = "https://api.razorpay.com/v1";

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export async function createRazorpayOrder(params: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Razorpay order failed (${response.status}): ${await response.text()}`,
    );
  }

  return response.json();
}

/**
 * Webhook authenticity. Compared in constant time — a plain === here leaks
 * signature bytes through timing.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
): boolean {
  if (!signature || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
