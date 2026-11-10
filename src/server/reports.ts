import "server-only";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { classifyMenu, foodCostSummary, recipeCost, round2, type MenuClass } from "@/lib/costing";
import { daysOfCover, stockState } from "@/lib/inventory";
import { generateInsights, type InsightInput } from "@/lib/insights";
import { supplierScore } from "@/lib/procurement";
import { DAY } from "@/lib/format";
import { asOrgUser, branchIdsFor } from "./access";
import { dailyUsage, onOrderQty } from "./procurement";

export interface ReportOptions {
  days?: number;
  branchId?: string;
}

async function scope(user: User, opts: ReportOptions) {
  const u = asOrgUser(user);
  let branchIds = await branchIdsFor(u);
  if (opts.branchId && branchIds.includes(opts.branchId)) branchIds = [opts.branchId];
  const days = opts.days && opts.days > 0 ? Math.min(opts.days, 90) : 30;
  return { u, branchIds, days, since: new Date(Date.now() - days * DAY) };
}

/** Current stock per branch and item with value, days of cover and status. */
export async function stockOverview(user: User, opts: ReportOptions = {}) {
  const { branchIds } = await scope(user, opts);
  const [stock, usage, onOrder] = await Promise.all([
    db.stock.findMany({ where: { branchId: { in: branchIds } }, include: { item: true, branch: true }, orderBy: [{ item: { category: "asc" } }, { item: { name: "asc" } }] }),
    dailyUsage(branchIds),
    onOrderQty(branchIds),
  ]);
  return stock.map((s) => {
    const avgDaily = usage.get(`${s.branchId}:${s.itemId}`) ?? 0;
    return {
      ...s,
      value: round2(s.onHand * s.item.avgCost),
      avgDaily: round2(avgDaily),
      daysCover: daysOfCover(s.onHand, avgDaily),
      onOrder: round2(onOrder.get(`${s.branchId}:${s.itemId}`) ?? 0),
      state: stockState(s.onHand, s.reorderPoint, s.parLevel),
    };
  });
}

export type StockRow = Awaited<ReturnType<typeof stockOverview>>[number];

/** Everything the dashboard and reports need for a period, computed from the stock ledger and POS sales. */
export async function periodReport(user: User, opts: ReportOptions = {}) {
  const { u, branchIds, days, since } = await scope(user, opts);
  const [branches, sales, movements, menu, received, catalog, stock] = await Promise.all([
    db.branch.findMany({ where: { id: { in: branchIds } }, orderBy: { code: "desc" } }),
    db.sale.findMany({ where: { branchId: { in: branchIds }, soldAt: { gte: since } }, select: { branchId: true, menuItemId: true, qty: true, revenue: true, cost: true, soldAt: true } }),
    db.stockMovement.findMany({
      where: { branchId: { in: branchIds }, createdAt: { gte: since }, type: { in: ["SALE", "WASTE", "COUNT_ADJUST"] } },
      select: { branchId: true, itemId: true, type: true, qty: true, unitCost: true, createdAt: true },
    }),
    db.menuItem.findMany({ where: { orgId: u.orgId }, include: { lines: { include: { item: true } } }, orderBy: { code: "asc" } }),
    db.purchaseOrder.findMany({
      where: { orgId: u.orgId, branchId: { in: branchIds }, status: "RECEIVED", receivedAt: { gte: since } },
      include: { lines: { include: { item: true } }, supplier: true },
    }),
    db.catalogItem.findMany({ where: { item: { orgId: u.orgId } }, include: { supplier: true, item: true } }),
    stockOverview(user, opts),
  ]);

  const items = new Map(stock.map((s) => [s.itemId, s.item]));
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  // Food cost by branch and by day.
  const byBranch = new Map(branches.map((b) => [b.id, { revenue: 0, theoretical: 0, waste: 0, variance: 0 }]));
  const byDay = new Map<string, { revenue: number; theoretical: number; waste: number; variance: number }>();
  const dayBucket = (d: Date) => {
    const k = dayKey(d);
    if (!byDay.has(k)) byDay.set(k, { revenue: 0, theoretical: 0, waste: 0, variance: 0 });
    return byDay.get(k)!;
  };
  for (const s of sales) {
    const b = byBranch.get(s.branchId)!;
    b.revenue += s.revenue;
    b.theoretical += s.cost;
    const d = dayBucket(s.soldAt);
    d.revenue += s.revenue;
    d.theoretical += s.cost;
  }

  const varianceMap = new Map<string, { branchId: string; itemId: string; theoreticalUsage: number; wasteQty: number; wasteValue: number; lossQty: number; lossValue: number }>();
  const vRow = (branchId: string, itemId: string) => {
    const k = `${branchId}:${itemId}`;
    if (!varianceMap.has(k)) varianceMap.set(k, { branchId, itemId, theoreticalUsage: 0, wasteQty: 0, wasteValue: 0, lossQty: 0, lossValue: 0 });
    return varianceMap.get(k)!;
  };
  const now = Date.now();
  const waste = { last7: 0, prior7: 0 };
  for (const m of movements) {
    const r = vRow(m.branchId, m.itemId);
    const value = -m.qty * m.unitCost;
    if (m.type === "SALE") r.theoreticalUsage += -m.qty;
    if (m.type === "WASTE") {
      r.wasteQty += -m.qty;
      r.wasteValue += value;
      byBranch.get(m.branchId)!.waste += value;
      dayBucket(m.createdAt).waste += value;
      const age = (now - m.createdAt.getTime()) / DAY;
      if (age <= 7) waste.last7 += value;
      else if (age <= 14) waste.prior7 += value;
    }
    if (m.type === "COUNT_ADJUST") {
      r.lossQty += -m.qty;
      r.lossValue += value;
      byBranch.get(m.branchId)!.variance += value;
      dayBucket(m.createdAt).variance += value;
    }
  }

  const totals = [...byBranch.values()].reduce(
    (a, b) => ({ revenue: a.revenue + b.revenue, theoretical: a.theoretical + b.theoretical, waste: a.waste + b.waste, variance: a.variance + b.variance }),
    { revenue: 0, theoretical: 0, waste: 0, variance: 0 },
  );
  const summary = foodCostSummary(totals.revenue, totals.theoretical, totals.waste, totals.variance);
  const branchSummaries = branches.map((b) => {
    const x = byBranch.get(b.id)!;
    return { branch: b, ...foodCostSummary(x.revenue, x.theoretical, x.waste, x.variance) };
  });
  const daily = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, x]) => ({ day, ...foodCostSummary(x.revenue, x.theoretical, x.waste, x.variance) }));

  const variance = [...varianceMap.values()]
    .map((r) => {
      const item = items.get(r.itemId)!;
      return {
        ...r,
        item,
        branch: branchById.get(r.branchId)!,
        theoreticalUsage: round2(r.theoreticalUsage),
        lossQty: round2(r.lossQty),
        lossValue: round2(r.lossValue),
        wasteQty: round2(r.wasteQty),
        wasteValue: round2(r.wasteValue),
        variancePct: r.theoreticalUsage > 0 ? round2((r.lossQty / r.theoreticalUsage) * 100) : 0,
      };
    })
    .filter((r) => r.item)
    .sort((a, b) => b.lossValue - a.lossValue);

  // Menu engineering on current plate costs.
  const sold = new Map<string, { qty: number; revenue: number }>();
  for (const s of sales) {
    const x = sold.get(s.menuItemId) ?? { qty: 0, revenue: 0 };
    x.qty += s.qty;
    x.revenue += s.revenue;
    sold.set(s.menuItemId, x);
  }
  const menuPerf = menu.map((m) => {
    const cost = recipeCost(m.lines.map((l) => ({ qty: l.qty, unitCost: l.item.avgCost })));
    const s = sold.get(m.id) ?? { qty: 0, revenue: 0 };
    return { menuItem: m, cost, qtySold: s.qty, revenue: round2(s.revenue), margin: round2(m.price - cost), totalMargin: round2((m.price - cost) * s.qty), foodCostPct: m.price ? round2((cost / m.price) * 100) : 0 };
  });
  const classes = classifyMenu(menuPerf.map((m) => ({ id: m.menuItem.id, qtySold: m.qtySold, price: m.menuItem.price, cost: m.cost })));
  const menuReport = menuPerf.map((m) => ({ ...m, class: classes[m.menuItem.id] as MenuClass })).sort((a, b) => b.totalMargin - a.totalMargin);

  // Purchasing and supplier performance.
  const spendBySupplier = new Map<string, { supplier: (typeof received)[number]["supplier"]; spend: number; orders: typeof received }>();
  const spendByCategory = new Map<string, number>();
  for (const po of received) {
    const x = spendBySupplier.get(po.supplierId) ?? { supplier: po.supplier, spend: 0, orders: [] };
    for (const l of po.lines) {
      const v = (l.receivedQty ?? l.qty) * (l.receivedPrice ?? l.unitPrice);
      x.spend += v;
      spendByCategory.set(l.item.category, (spendByCategory.get(l.item.category) ?? 0) + v);
    }
    x.orders.push(po);
    spendBySupplier.set(po.supplierId, x);
  }
  const suppliers = [...spendBySupplier.values()]
    .map((x) => ({
      supplier: x.supplier,
      ...supplierScore(
        x.orders.map((o) => ({
          expectedDate: o.expectedDate,
          receivedAt: o.receivedAt,
          total: o.total,
          lines: o.lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, receivedQty: l.receivedQty ?? l.qty, receivedPrice: l.receivedPrice ?? l.unitPrice })),
        })),
      ),
      spend: round2(x.spend),
    }))
    .sort((a, b) => b.spend - a.spend);
  const categories = [...spendByCategory.entries()].map(([category, spend]) => ({ category, spend: round2(spend) })).sort((a, b) => b.spend - a.spend);
  const purchases = round2(suppliers.reduce((s, x) => s + x.spend, 0));

  // Insights.
  const named = (r: { name: string; nameAr: string }) => ({ en: r.name, ar: r.nameAr });
  const orgUsage = new Map<string, number>();
  for (const s of stock) orgUsage.set(s.itemId, (orgUsage.get(s.itemId) ?? 0) + s.avgDaily);
  const leadTime = new Map<string, number>();
  for (const c of catalog) leadTime.set(c.itemId, Math.min(leadTime.get(c.itemId) ?? 99, c.supplier.leadTimeDays));

  const insightInput: InsightInput = {
    periodDays: days,
    variance: variance.map((v) => ({ branchId: v.branchId, branch: named(v.branch), item: named(v.item), unit: v.item.unit, lossQty: v.lossQty, lossValue: v.lossValue, theoreticalUsage: v.theoreticalUsage })),
    priceChanges: catalog
      .filter((c) => c.previousPrice && c.price > c.previousPrice && (orgUsage.get(c.itemId) ?? 0) > 0)
      .map((c) => ({ supplier: named(c.supplier), item: named(c.item), oldPrice: c.previousPrice!, newPrice: c.price, monthlyQty: round2((orgUsage.get(c.itemId) ?? 0) * 30) })),
    cover: stock
      .filter((s) => s.avgDaily > 0 && s.onOrder === 0)
      .map((s) => ({ branchId: s.branchId, branch: named(s.branch), item: named(s.item), unit: s.item.unit, onHand: round2(s.onHand), daysCover: s.daysCover, leadTimeDays: leadTime.get(s.itemId) ?? 2, dailyValue: round2(s.avgDaily * s.item.avgCost) })),
    menu: menuReport.map((m) => ({ item: named(m.menuItem), price: m.menuItem.price, cost: m.cost, qtySold: m.qtySold })),
    waste: { last7: round2(waste.last7), prior7: round2(waste.prior7) },
    overstock: stock.map((s) => ({ branchId: s.branchId, branch: named(s.branch), item: named(s.item), daysCover: s.daysCover, value: s.value })),
  };
  const insights = generateInsights(insightInput);

  return {
    days,
    branches,
    summary,
    branchSummaries,
    daily,
    variance,
    menu: menuReport,
    suppliers,
    categories,
    purchases,
    waste: insightInput.waste,
    stockValue: round2(stock.reduce((s, x) => s + x.value, 0)),
    lowStock: stock.filter((s) => s.state === "LOW" || s.state === "OUT").length,
    insights,
  };
}

export type PeriodReport = Awaited<ReturnType<typeof periodReport>>;
