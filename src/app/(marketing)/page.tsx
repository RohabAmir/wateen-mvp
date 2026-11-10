import Link from "next/link";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/locale";
import { sar } from "@/lib/format";
import { FEATURES, SEGMENTS, SERVICES } from "@/content/marketing";

export const dynamic = "force-dynamic";

async function liveNumbers() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [counts, suppliers, catalog, orders] = await Promise.all([
    db.stockMovement.findMany({ where: { type: "COUNT_ADJUST", createdAt: { gte: since } }, select: { qty: true, unitCost: true } }),
    db.supplier.count(),
    db.catalogItem.count(),
    db.purchaseOrder.count({ where: { createdAt: { gte: since } } }),
  ]);
  const variance = counts.reduce((s, m) => s - m.qty * m.unitCost, 0);
  return { variance, suppliers, catalog, orders };
}

export default async function Landing() {
  const { locale, tx } = await getI18n();
  const live = await liveNumbers();
  const loop = [
    [tx("Buy", "اشترِ"), tx("Smart reorder and approvals", "طلب ذكي وموافقات")],
    [tx("Receive", "استلم"), tx("Short and price checks", "فحص النقص والسعر")],
    [tx("Store", "خزّن"), tx("Live stock per branch", "مخزون لحظي لكل فرع")],
    [tx("Cook", "اطبخ"), tx("Recipes and plate cost", "وصفات وتكلفة طبق")],
    [tx("Sell", "بِع"), tx("POS sales deduct stock", "المبيعات تخصم المخزون")],
    [tx("Measure", "قِس"), tx("Variance and insights", "الفروقات والرؤى")],
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-mist to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-plum shadow-sm ring-1 ring-plum/10">
              <span className="h-1.5 w-1.5 rounded-full bg-orange" />
              {tx("Back-of-house and inventory platform for F&B", "منصة الإدارة الخلفية والمخزون للأغذية والمشروبات")}
            </p>
            <h1 className="text-4xl leading-tight font-bold text-plum-deep md:text-5xl">
              {tx("Protect your food cost in every branch", "احمِ تكلفة الطعام في كل فرع")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              {tx(
                "Wateen-MVP connects your recipes, stock, suppliers and sales, so you see exactly where money leaks and fix it this week, not at the end of the quarter.",
                "يربط وتين وصفاتك ومخزونك ومورديك ومبيعاتك، فترى بالضبط أين يتسرب المال وتعالجه هذا الأسبوع، لا في نهاية الربع.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo" className="btn-orange px-6 py-3 text-base">{tx("Book a demo", "احجز عرضاً")}</Link>
              <Link href="/login" className="btn-outline px-6 py-3 text-base">{tx("Explore the live demo", "استكشف العرض المباشر")}</Link>
            </div>
            <p className="mt-4 text-sm text-metal">{tx("No sign-up. Pick a persona and click around.", "دون تسجيل. اختر شخصية وتصفح.")}</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-plum/5 blur-2xl" />
            <div className="relative rounded-3xl border border-line bg-white p-5 shadow-xl shadow-plum/10">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-ink">{tx("Al Nakheel Restaurants · last 30 days", "مطاعم النخيل · آخر 30 يوماً")}</p>
                <span className="rounded-full bg-success-light px-2 py-0.5 text-xs text-success-dark">{tx("Live", "مباشر")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-plum p-4 text-white">
                  <p className="text-xs text-white/70">{tx("Unexplained stock loss found", "خسائر مخزون غير مبررة")}</p>
                  <p className="num mt-1 text-2xl font-bold">{sar(live.variance, locale)}</p>
                </div>
                <div className="rounded-2xl bg-orange-light p-4">
                  <p className="text-xs text-metal">{tx("Purchase orders raised", "أوامر شراء")}</p>
                  <p className="num mt-1 text-2xl font-bold text-ink">{live.orders}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { c: "bg-danger", t: tx("Chicken breast at Olaya: far more used than recipes explain", "صدر الدجاج في العليا: استهلاك أعلى بكثير مما تفسره الوصفات") },
                  { c: "bg-orange", t: tx("Gulf Seafood raised shrimp by 11.4%. Send an RFQ.", "الخليج للمأكولات البحرية رفع سعر الروبيان 11.4%. أرسل طلب عروض.") },
                  { c: "bg-plum-soft", t: tx("Lettuce at Al Malqa runs out tomorrow", "الخس في الملقا ينفد غداً") },
                ].map((i) => (
                  <div key={i.t} className="flex items-start gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i.c}`} />
                    {i.t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-wide text-orange uppercase">{tx("Four services, one platform", "أربع خدمات، منصة واحدة")}</p>
          <h2 className="mt-2 text-3xl font-bold text-plum-deep">{tx("Everything between the supplier and the plate", "كل ما بين المورد والطبق")}</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-2xl border border-line p-6 transition hover:-translate-y-0.5 hover:border-plum/30 hover:shadow-lg hover:shadow-plum/5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-mist text-xl text-plum group-hover:bg-plum group-hover:text-white">{s.icon}</div>
              <h3 className="mt-4 font-bold text-ink">{s.title[locale]}</h3>
              <p className="mt-2 text-sm leading-relaxed text-metal">{s.short[locale]}</p>
              <p className="mt-4 text-sm font-medium text-plum">{tx("Learn more", "اعرف المزيد")} →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-plum-deep py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <h2 className="text-3xl font-bold">{tx("One loop, no blind spots", "دورة واحدة بلا نقاط عمياء")}</h2>
          <p className="mt-2 max-w-2xl text-white/70">
            {tx(
              "Every step writes to the same stock ledger, so food cost, variance and supplier performance are always up to date.",
              "كل خطوة تُسجّل في نفس سجل المخزون، فتبقى تكلفة الطعام والفروقات وأداء الموردين محدثة دائماً.",
            )}
          </p>
          <ol className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {loop.map(([title, body], i) => (
              <li key={title} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <span className="num text-sm text-orange">0{i + 1}</span>
                <p className="mt-1 text-lg font-bold">{title}</p>
                <p className="mt-1 text-sm text-white/70">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <h2 className="text-3xl font-bold text-plum-deep">{tx("Built for every kind of kitchen", "مصمم لكل أنواع المطابخ")}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SEGMENTS.map((s) => (
            <div key={s.key} className="rounded-2xl bg-mist p-6">
              <h3 className="font-bold text-plum">{s.title[locale]}</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {s.points.map((p) => (
                  <li key={p.en} className="flex gap-2">
                    <span className="text-orange">✓</span>
                    {p[locale]}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-canvas py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-wide text-orange uppercase">{tx("For suppliers", "للموردين")}</p>
            <h2 className="mt-2 text-3xl font-bold text-plum-deep">{tx("A marketplace that brings orders to you", "سوق يجلب الطلبات إليك")}</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              {tx(
                "Distributors list their catalogue once and receive clean purchase orders from every restaurant on the platform. Confirm, ship and quote from one portal, and build a track record buyers can see.",
                "يُدرج الموزعون كتالوجهم مرة واحدة ويستقبلون أوامر شراء واضحة من كل المطاعم على المنصة. أكّد واشحن وقدّم العروض من بوابة واحدة، وابنِ سجلاً يراه المشترون.",
              )}
            </p>
            <Link href="/services/marketplace" className="btn-primary mt-6">{tx("How the marketplace works", "كيف يعمل السوق")}</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              [String(live.suppliers), tx("suppliers in the demo", "مورد في العرض")],
              [String(live.catalog), tx("catalogue listings", "صنف في الكتالوجات")],
              ["3", tx("branches connected", "فروع متصلة")],
              ["2", tx("languages, full RTL", "لغتان مع دعم كامل للعربية")],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-line bg-white p-6">
                <p className="num text-3xl font-bold text-plum">{n}</p>
                <p className="mt-1 text-sm text-metal">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <h2 className="text-3xl font-bold text-plum-deep">{tx("Why restaurants choose us", "لماذا تختارنا المطاعم")}</h2>
        <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title.en}>
              <p className="font-bold text-ink">{f.title[locale]}</p>
              <p className="mt-1 text-sm text-metal">{f.body[locale]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-plum to-plum-dark p-10 text-white md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{tx("Ready to see it with your own menu?", "جاهز لتراه بقائمتك الخاصة؟")}</h2>
            <p className="mt-2 text-white/75">{tx("We load your items, recipes and suppliers in a few days.", "نُدخل أصنافك ووصفاتك ومورديك خلال أيام قليلة.")}</p>
          </div>
          <Link href="/demo" className="btn-orange px-6 py-3 text-base">{tx("Book a demo", "احجز عرضاً")}</Link>
        </div>
      </section>
    </>
  );
}
