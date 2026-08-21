const SYMBOLS: Record<string, string> = { INR: "\u20B9", USD: "$", EUR: "\u20AC" };

/** Minor units in, display string out. 249900 INR -> ₹2,499 */
export function formatPrice(minor: number, currency = "INR"): string {
  const major = minor / 100;
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${symbol}${major.toLocaleString(locale, {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Split a paid line between seller and platform, in minor units. */
export function splitEarnings(price: number, revenueShareBps: number) {
  const seller = Math.floor((price * revenueShareBps) / 10_000);
  return { seller, platform: price - seller };
}
