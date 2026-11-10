export type Locale = "en" | "ar";

const nf = (locale: Locale, opts: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA", opts);

export function sar(n: number, locale: Locale = "en", digits = 0): string {
  const v = nf(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  return locale === "ar" ? `${v} ر.س` : `SAR ${v}`;
}

export function num(n: number, locale: Locale = "en", digits = 1): string {
  return nf(locale, { maximumFractionDigits: digits }).format(n);
}

export function pct(n: number, locale: Locale = "en", digits = 1): string {
  return `${num(n, locale, digits)}%`;
}

export function date(d: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function dateTime(d: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export const DAY = 86_400_000;
export const daysAgo = (n: number, from = Date.now()) => new Date(from - n * DAY);
