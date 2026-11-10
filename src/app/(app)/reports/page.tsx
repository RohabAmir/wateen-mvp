import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { num, pct, sar } from "@/lib/format";
import { branchIdsFor } from "@/server/access";
import { periodReport } from "@/server/reports";
import { Badge, Card, PageHeader, ProgressBar, Stat, StatusBadge, TableWrap } from "@/components/ui";
import { BranchFilter } from "@/components/BranchFilter";
import { InsightList } from "@/components/InsightList";

export const metadata = { title: "Reports" };

const TABS = ["overview", "variance", "menu", "purchasing", "waste"] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string; branch?: string; days?: string }> }) {
  const user = await requireUser(["OWNER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "overview";
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const ids = await branchIdsFor(user);
  const branchId = sp.branch && ids.includes(sp.branch) ? sp.branch : undefined;
  const [branches, r] = await Promise.all([db.branch.findMany({ where: { id: { in: ids } }, orderBy: { code: "desc" } }), periodReport(user, { days, branchId })]);
  const s = r.summary;
  const tabLabels: Record<string, string> = {
    overview: tx("Overview and insights", "نظرة عامة ورؤى"),
    variance: tx("Variance", "الفروقات"),
    menu: tx("Menu engineering", "هندسة القائمة"),
    purchasing: tx("Purchasing and suppliers", "المشتريات والموردون"),
    waste: tx("Waste", "الهدر"),
  };
  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ tab, branch: branchId, days: String(days), ...p }).filter(([, v]) => v) as [string, string][]);
    return `/reports?${q}`;
  };

  return (
    <>
      <PageHeader
        title={tx("Reports", "التقارير")}
        subtitle={tx(`Last ${days} days. Built from POS sales, deliveries, waste entries and stock counts.`, `آخر ${days} يوماً. مبنية على المبيعات والاستلام والهدر والجرد.`)}
        action={
          <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={link({ days: String(d) })} className={clsx("rounded-lg px-3 py-1.5 text-sm", d === days ? "bg-plum text-white" : "text-ink-soft hover:bg-mist")}>
                {tx(`${d} days`, `${d} يوم`)}
              </Link>
            ))}
          </div>
        }
      />
      <BranchFilter branches={branches} current={branchId} locale={locale} basePath="/reports" params={{ tab, days: String(days) }} />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link key={t} href={link({ tab: t })} className={clsx("-mb-px border-b-2 px-4 py-2.5 text-sm whitespace-nowrap", t === tab ? "border-plum font-medium text-plum" : "border-transparent text-metal hover:text-ink")}>
            {tabLabels[t]}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat tone="plum" label={tx("Revenue", "الإيرادات")} value={sar(s.revenue, locale)} />
            <Stat label={tx("Theoretical food cost", "تكلفة الطعام النظرية")} value={pct(s.theoreticalPct, locale)} hint={sar(s.theoreticalCost, locale)} />
            <Stat tone="danger" label={tx("Actual food cost", "تكلفة الطعام الفعلية")} value={pct(s.actualPct, locale)} hint={sar(s.actualCost, locale)} />
            <Stat tone="orange" label={tx("Purchases received", "المشتريات المستلمة")} value={sar(r.purchases, locale)} hint={tx(`Stock on hand ${sar(r.stockValue)}`, `المخزون الحالي ${sar(r.stockValue, "ar")}`)} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-5">
            <Card className="xl:col-span-3" title={tx("Insights", "الرؤى")}>
              <InsightList insights={r.insights} locale={locale} />
            </Card>
            <Card className="xl:col-span-2" title={tx("Where the food cost goes", "أين تذهب تكلفة الطعام")}>
              <div className="space-y-4 p-5">
                {[
                  [tx("Recipe cost of sales", "تكلفة الوصفات للمبيعات"), s.theoreticalCost, "plum"],
                  [tx("Recorded waste", "الهدر المسجل"), s.wasteCost, "orange"],
                  [tx("Unexplained loss (counts)", "خسائر غير مبررة (الجرد)"), s.varianceCost, "danger"],
                ].map(([l, v, tone]) => (
                  <div key={l as string}>
                    <div className="mb-1 flex justify-between text-sm"><span>{l as string}</span><span className="num font-medium">{sar(v as number, locale)}</span></div>
                    <ProgressBar value={((v as number) / Math.max(1, s.actualCost)) * 100} tone={tone as "plum"} />
                  </div>
                ))}
                <p className="rounded-lg bg-canvas p-3 text-sm text-ink-soft">
                  {tx(
                    `Closing the gap between actual and theoretical food cost is worth ${sar(s.wasteCost + s.varianceCost)} over ${days} days.`,
                    `سد الفجوة بين التكلفة الفعلية والنظرية يساوي ${sar(s.wasteCost + s.varianceCost, "ar")} خلال ${days} يوماً.`,
                  )}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === "variance" && (
        <Card title={tx("Theoretical vs actual usage by item", "الاستهلاك النظري مقابل الفعلي لكل صنف")}>
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>{tx("Item", "الصنف")}</th>
                  <th>{tx("Branch", "الفرع")}</th>
                  <th className="text-end">{tx("Recipe usage", "استهلاك الوصفات")}</th>
                  <th className="text-end">{tx("Waste", "الهدر")}</th>
                  <th className="text-end">{tx("Unexplained", "غير مبرر")}</th>
                  <th className="text-end">{tx("Variance %", "نسبة الفرق")}</th>
                  <th className="text-end">{tx("Loss value", "قيمة الخسارة")}</th>
                </tr>
              </thead>
              <tbody className="num">
                {r.variance.filter((v) => v.theoreticalUsage > 0 || v.lossValue !== 0).slice(0, 40).map((v) => (
                  <tr key={`${v.branchId}:${v.itemId}`}>
                    <td className="font-medium">{pickName(locale, v.item)} {v.item.highValue && <Badge tone="orange">{tx("High value", "عالي القيمة")}</Badge>}</td>
                    <td>{pickName(locale, v.branch)}</td>
                    <td className="text-end">{num(v.theoreticalUsage, locale)} {label(locale, v.item.unit)}</td>
                    <td className="text-end">{num(v.wasteQty, locale)}</td>
                    <td className={clsx("text-end", v.lossQty > 0 && "text-danger")}>{num(v.lossQty, locale)}</td>
                    <td className={clsx("text-end font-medium", v.variancePct >= 5 ? "text-danger" : v.variancePct >= 2 ? "text-warning" : "")}>{pct(v.variancePct, locale)}</td>
                    <td className={clsx("text-end font-medium", v.lossValue > 0 && "text-danger")}>{sar(v.lossValue, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      {tab === "menu" && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {[
              ["STAR", tx("Popular and profitable. Keep and feature.", "شائع ومربح. حافظ عليه وأبرزه.")],
              ["PLOWHORSE", tx("Popular, low margin. Reprice or trim the portion.", "شائع بهامش منخفض. أعد التسعير أو قلّص الحصة.")],
              ["PUZZLE", tx("Profitable but rarely ordered. Promote it.", "مربح لكنه قليل الطلب. روّج له.")],
              ["DOG", tx("Neither. Rework or remove.", "لا هذا ولا ذاك. أعد صياغته أو احذفه.")],
            ].map(([k, d]) => (
              <div key={k} className="card p-4">
                <StatusBadge status={k} locale={locale} />
                <p className="mt-2 text-sm text-metal">{d}</p>
              </div>
            ))}
          </div>
          <Card>
            <TableWrap>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>{tx("Menu item", "الصنف")}</th>
                    <th className="text-end">{tx("Sold", "المباع")}</th>
                    <th className="text-end">{tx("Price", "السعر")}</th>
                    <th className="text-end">{tx("Plate cost", "تكلفة الطبق")}</th>
                    <th className="text-end">{tx("Food cost %", "نسبة التكلفة")}</th>
                    <th className="text-end">{tx("Margin each", "الهامش للطبق")}</th>
                    <th className="text-end">{tx("Total margin", "إجمالي الهامش")}</th>
                    <th>{tx("Class", "التصنيف")}</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {r.menu.map((m) => (
                    <tr key={m.menuItem.id}>
                      <td className="font-medium">{pickName(locale, m.menuItem)}</td>
                      <td className="text-end">{m.qtySold.toLocaleString("en")}</td>
                      <td className="text-end">{sar(m.menuItem.price, locale)}</td>
                      <td className="text-end">{sar(m.cost, locale, 2)}</td>
                      <td className={clsx("text-end", m.foodCostPct > 35 && "font-medium text-danger")}>{pct(m.foodCostPct, locale)}</td>
                      <td className="text-end">{sar(m.margin, locale, 2)}</td>
                      <td className="text-end font-medium">{sar(m.totalMargin, locale)}</td>
                      <td><StatusBadge status={m.class} locale={locale} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}

      {tab === "purchasing" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2" title={tx("Supplier scorecard", "بطاقة أداء الموردين")}>
            <TableWrap>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>{tx("Supplier", "المورد")}</th>
                    <th className="text-end">{tx("Spend", "الإنفاق")}</th>
                    <th className="text-end">{tx("Deliveries", "التوصيلات")}</th>
                    <th className="text-end">{tx("On time", "بالوقت")}</th>
                    <th className="text-end">{tx("In full", "كاملة")}</th>
                    <th className="text-end">{tx("Agreed price", "السعر المتفق")}</th>
                    <th className="text-end">{tx("Score", "التقييم")}</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {r.suppliers.map((x) => (
                    <tr key={x.supplier.id}>
                      <td className="font-medium"><Link href={`/marketplace/${x.supplier.id}`} className="hover:text-plum">{pickName(locale, x.supplier)}</Link></td>
                      <td className="text-end">{sar(x.spend, locale)}</td>
                      <td className="text-end">{x.orders}</td>
                      <td className={clsx("text-end", x.onTimePct < 90 && "text-danger")}>{pct(x.onTimePct, locale, 0)}</td>
                      <td className={clsx("text-end", x.inFullPct < 90 && "text-danger")}>{pct(x.inFullPct, locale, 0)}</td>
                      <td className={clsx("text-end", x.priceAccuracyPct < 90 && "text-danger")}>{pct(x.priceAccuracyPct, locale, 0)}</td>
                      <td className="text-end"><Badge tone={x.score >= 90 ? "success" : x.score >= 75 ? "warning" : "danger"}>{x.score}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
          <Card title={tx("Spend by category", "الإنفاق حسب الفئة")}>
            <div className="space-y-4 p-5">
              {r.categories.map((c) => (
                <div key={c.category}>
                  <div className="mb-1 flex justify-between text-sm"><span>{label(locale, c.category)}</span><span className="num font-medium">{sar(c.spend, locale)}</span></div>
                  <ProgressBar value={(c.spend / Math.max(1, r.purchases)) * 100} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "waste" && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat tone="orange" label={tx("Waste this period", "الهدر في الفترة")} value={sar(s.wasteCost, locale)} />
            <Stat label={tx("Last 7 days", "آخر 7 أيام")} value={sar(r.waste.last7, locale)} />
            <Stat label={tx("The 7 days before", "الأيام السبعة السابقة")} value={sar(r.waste.prior7, locale)} />
          </div>
          <Card title={tx("Waste by item", "الهدر حسب الصنف")}>
            <TableWrap>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>{tx("Item", "الصنف")}</th>
                    <th>{tx("Branch", "الفرع")}</th>
                    <th className="text-end">{tx("Quantity", "الكمية")}</th>
                    <th className="text-end">{tx("% of usage", "من الاستهلاك")}</th>
                    <th className="text-end">{tx("Value", "القيمة")}</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {r.variance.filter((v) => v.wasteValue > 0).sort((a, b) => b.wasteValue - a.wasteValue).map((v) => (
                    <tr key={`${v.branchId}:${v.itemId}`}>
                      <td className="font-medium">{pickName(locale, v.item)}</td>
                      <td>{pickName(locale, v.branch)}</td>
                      <td className="text-end">{num(v.wasteQty, locale)} {label(locale, v.item.unit)}</td>
                      <td className="text-end">{v.theoreticalUsage ? pct((v.wasteQty / v.theoreticalUsage) * 100, locale) : "—"}</td>
                      <td className="text-end font-medium">{sar(v.wasteValue, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}
    </>
  );
}
