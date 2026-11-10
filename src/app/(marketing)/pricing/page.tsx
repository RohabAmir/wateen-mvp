import Link from "next/link";
import clsx from "clsx";
import { getI18n } from "@/lib/locale";
import { sar } from "@/lib/format";
import { PLANS } from "@/content/marketing";

export const metadata = { title: "Pricing" };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const { locale, tx } = await getI18n();
  const yearly = (await searchParams).billing === "yearly";

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-plum-deep">{tx("Simple pricing per branch", "تسعير بسيط لكل فرع")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{tx("Free setup and supplier onboarding on every plan.", "إعداد مجاني وضم الموردين في كل الباقات.")}</p>
        <div className="mt-8 inline-flex rounded-xl bg-mist p-1 text-sm">
          <Link href="/pricing" className={clsx("rounded-lg px-4 py-2", !yearly ? "bg-white font-medium text-plum shadow-sm" : "text-metal")}>
            {tx("Monthly", "شهري")}
          </Link>
          <Link href="/pricing?billing=yearly" className={clsx("rounded-lg px-4 py-2", yearly ? "bg-white font-medium text-plum shadow-sm" : "text-metal")}>
            {tx("Yearly, save 20%", "سنوي، وفّر 20%")}
          </Link>
        </div>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => {
          const popular = "popular" in p && p.popular;
          const price = p.monthly === null ? null : yearly ? Math.round(p.monthly * 0.8) : p.monthly;
          return (
            <div key={p.key} className={clsx("relative flex flex-col rounded-3xl border p-8", popular ? "border-plum bg-plum text-white shadow-xl shadow-plum/20" : "border-line bg-white")}>
              {popular && <span className="absolute -top-3 start-8 rounded-full bg-orange px-3 py-1 text-xs font-medium text-white">{tx("Most popular", "الأكثر طلباً")}</span>}
              <p className={clsx("text-lg font-bold", popular ? "text-white" : "text-plum")}>{p.name[locale]}</p>
              <p className={clsx("mt-1 text-sm", popular ? "text-white/75" : "text-metal")}>{p.blurb[locale]}</p>
              <p className="num mt-6 text-4xl font-bold">{price === null ? tx("Custom", "حسب الطلب") : sar(price, locale)}</p>
              <p className={clsx("text-sm", popular ? "text-white/70" : "text-metal")}>
                {price === null ? tx("Talk to sales", "تواصل مع المبيعات") : tx("per branch per month", "لكل فرع شهرياً")}
                {price !== null && yearly ? tx(", billed yearly", "، تُدفع سنوياً") : ""}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f.en} className="flex gap-2">
                    <span className={popular ? "text-orange" : "text-plum"}>✓</span>
                    {f[locale]}
                  </li>
                ))}
              </ul>
              <Link href="/demo" className={clsx("mt-8", popular ? "btn-orange" : "btn-outline")}>
                {p.monthly === null ? tx("Contact sales", "تواصل مع المبيعات") : tx("Book a demo", "احجز عرضاً")}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
