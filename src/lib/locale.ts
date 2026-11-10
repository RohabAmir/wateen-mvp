import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, makeTx, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "ar" ? "ar" : "en";
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, tx: makeTx(locale) };
}
