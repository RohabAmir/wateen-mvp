import { foodCostPct, priceForTarget, round2 } from "./costing";
import { num, pct, sar } from "./format";

export type Severity = "high" | "medium" | "low";

export interface Insight {
  id: string;
  kind: "VARIANCE" | "PRICE" | "STOCKOUT" | "MARGIN" | "WASTE" | "OVERSTOCK";
  severity: Severity;
  /** Estimated monthly money at stake, in SAR. Used to rank insights. */
  impact: number;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  href: string;
}

type Named = { en: string; ar: string };

export interface InsightInput {
  periodDays: number;
  variance: { branchId: string; branch: Named; item: Named; unit: string; lossQty: number; lossValue: number; theoreticalUsage: number }[];
  priceChanges: { supplier: Named; item: Named; oldPrice: number; newPrice: number; monthlyQty: number }[];
  cover: { branchId: string; branch: Named; item: Named; unit: string; onHand: number; daysCover: number; leadTimeDays: number; dailyValue: number }[];
  menu: { item: Named; price: number; cost: number; qtySold: number }[];
  waste: { last7: number; prior7: number };
  overstock: { branchId: string; branch: Named; item: Named; daysCover: number; value: number }[];
}

export const TARGET_FOOD_COST = 32;
const MARGIN_ALERT_PCT = 38;

/**
 * Rule-based insights over the operating data. Each rule mirrors a question an operations manager
 * asks; results are ranked by the money at stake per month.
 */
export function generateInsights(d: InsightInput): Insight[] {
  const out: Insight[] = [];
  const monthly = (v: number) => round2((v / Math.max(1, d.periodDays)) * 30);

  for (const v of d.variance) {
    const vPct = v.theoreticalUsage > 0 ? (v.lossQty / v.theoreticalUsage) * 100 : 0;
    if (v.lossValue < 300 || vPct < 3) continue;
    out.push({
      id: `variance-${v.branchId}-${v.item.en}`,
      kind: "VARIANCE",
      severity: v.lossValue >= 2000 || vPct >= 8 ? "high" : "medium",
      impact: monthly(v.lossValue),
      title: {
        en: `${v.item.en} at ${v.branch.en}: ${sar(v.lossValue)} unexplained loss`,
        ar: `${v.item.ar} في ${v.branch.ar}: خسارة غير مبررة ${sar(v.lossValue, "ar")}`,
      },
      body: {
        en: `Counts found ${num(v.lossQty)} ${v.unit} more used than recipes explain (${pct(vPct)} of usage). Check portioning, receiving and storage.`,
        ar: `أظهر الجرد استهلاك ${num(v.lossQty, "ar")} ${v.unit} أكثر مما تفسره الوصفات (${pct(vPct, "ar")} من الاستهلاك). راجع الحصص والاستلام والتخزين.`,
      },
      href: `/reports?tab=variance&branch=${v.branchId}`,
    });
  }

  for (const p of d.priceChanges) {
    const change = ((p.newPrice - p.oldPrice) / p.oldPrice) * 100;
    if (change < 5) continue;
    const impact = round2((p.newPrice - p.oldPrice) * p.monthlyQty);
    out.push({
      id: `price-${p.supplier.en}-${p.item.en}`,
      kind: "PRICE",
      severity: change >= 10 ? "high" : "medium",
      impact,
      title: {
        en: `${p.supplier.en} raised ${p.item.en} by ${pct(change)}`,
        ar: `${p.supplier.ar} رفع سعر ${p.item.ar} بنسبة ${pct(change, "ar")}`,
      },
      body: {
        en: `From ${sar(p.oldPrice, "en", 2)} to ${sar(p.newPrice, "en", 2)}. About ${sar(impact)} a month at current volumes. Send an RFQ to compare suppliers.`,
        ar: `من ${sar(p.oldPrice, "ar", 2)} إلى ${sar(p.newPrice, "ar", 2)}. حوالي ${sar(impact, "ar")} شهرياً بالاستهلاك الحالي. أرسل طلب عروض أسعار للمقارنة.`,
      },
      href: "/rfq",
    });
  }

  for (const c of d.cover) {
    if (c.daysCover > c.leadTimeDays + 1) continue;
    out.push({
      id: `stockout-${c.branchId}-${c.item.en}`,
      kind: "STOCKOUT",
      severity: c.daysCover < c.leadTimeDays ? "high" : "medium",
      impact: round2(c.dailyValue * 3),
      title: {
        en: `${c.item.en} at ${c.branch.en} runs out in ${num(c.daysCover)} days`,
        ar: `${c.item.ar} في ${c.branch.ar} ينفد خلال ${num(c.daysCover, "ar")} يوم`,
      },
      body: {
        en: `${num(c.onHand)} ${c.unit} left and the supplier needs ${c.leadTimeDays} days. Order now to avoid menu items going unavailable.`,
        ar: `المتبقي ${num(c.onHand, "ar")} ${c.unit} والمورد يحتاج ${c.leadTimeDays} أيام. اطلب الآن لتجنب توقف أصناف من القائمة.`,
      },
      href: `/procurement?branch=${c.branchId}`,
    });
  }

  for (const m of d.menu) {
    const fc = foodCostPct(m.cost, m.price);
    if (fc < MARGIN_ALERT_PCT || m.qtySold === 0) continue;
    const target = priceForTarget(m.cost, TARGET_FOOD_COST);
    const impact = monthly((m.cost - (m.price * TARGET_FOOD_COST) / 100) * m.qtySold);
    out.push({
      id: `margin-${m.item.en}`,
      kind: "MARGIN",
      severity: fc >= 45 ? "high" : "medium",
      impact,
      title: {
        en: `${m.item.en} has a ${pct(fc)} food cost`,
        ar: `تكلفة الطعام لـ${m.item.ar} تبلغ ${pct(fc, "ar")}`,
      },
      body: {
        en: `Plate cost ${sar(m.cost, "en", 2)} against a ${sar(m.price)} price. A price of ${sar(target)} or a smaller portion brings it to the ${TARGET_FOOD_COST}% target.`,
        ar: `تكلفة الطبق ${sar(m.cost, "ar", 2)} مقابل سعر ${sar(m.price, "ar")}. سعر ${sar(target, "ar")} أو حصة أصغر يعيدها إلى هدف ${TARGET_FOOD_COST}%.`,
      },
      href: "/recipes",
    });
  }

  if (d.waste.prior7 > 0 && d.waste.last7 > d.waste.prior7 * 1.3 && d.waste.last7 > 200) {
    const change = ((d.waste.last7 - d.waste.prior7) / d.waste.prior7) * 100;
    out.push({
      id: "waste-trend",
      kind: "WASTE",
      severity: change > 60 ? "high" : "medium",
      impact: round2((d.waste.last7 - d.waste.prior7) * 4),
      title: { en: `Waste is up ${pct(change)} this week`, ar: `الهدر ارتفع ${pct(change, "ar")} هذا الأسبوع` },
      body: {
        en: `${sar(d.waste.last7)} written off in the last 7 days against ${sar(d.waste.prior7)} the week before.`,
        ar: `تم شطب ${sar(d.waste.last7, "ar")} خلال آخر 7 أيام مقابل ${sar(d.waste.prior7, "ar")} في الأسبوع السابق.`,
      },
      href: "/reports?tab=waste",
    });
  }

  for (const o of d.overstock) {
    if (o.daysCover < 45 || o.value < 500) continue;
    out.push({
      id: `overstock-${o.branchId}-${o.item.en}`,
      kind: "OVERSTOCK",
      severity: "low",
      impact: round2(o.value * 0.1),
      title: {
        en: `${sar(o.value)} of ${o.item.en} sitting at ${o.branch.en}`,
        ar: `${sar(o.value, "ar")} من ${o.item.ar} مخزنة في ${o.branch.ar}`,
      },
      body: {
        en: `${Number.isFinite(o.daysCover) ? `${Math.round(o.daysCover)} days` : "Months"} of cover. Transfer to another branch or lower the par level to free up cash.`,
        ar: `${Number.isFinite(o.daysCover) ? `${Math.round(o.daysCover)} يوم` : "أشهر"} من التغطية. انقلها لفرع آخر أو خفّض الحد الأعلى لتحرير السيولة.`,
      },
      href: "/inventory",
    });
  }

  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.impact - a.impact);
}
