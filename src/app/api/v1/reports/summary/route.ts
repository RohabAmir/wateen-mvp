import { authed, route } from "@/server/api";
import { periodReport } from "@/server/reports";

export const GET = route(async (req) => {
  const user = await authed(req, ["OWNER", "MANAGER", "PURCHASER"]);
  const sp = new URL(req.url).searchParams;
  const r = await periodReport(user, { days: Number(sp.get("days") ?? 30), branchId: sp.get("branchId") ?? undefined });
  return {
    days: r.days,
    summary: r.summary,
    branches: r.branchSummaries.map(({ branch, ...b }) => ({ branch: branch.code, ...b })),
    purchases: r.purchases,
    stockValue: r.stockValue,
    lowStock: r.lowStock,
    topVariance: r.variance.slice(0, 5).map((v) => ({ branch: v.branch.code, item: v.item.name, lossQty: v.lossQty, lossValue: v.lossValue, variancePct: v.variancePct })),
    menu: r.menu.map((m) => ({ code: m.menuItem.code, name: m.menuItem.name, qtySold: m.qtySold, price: m.menuItem.price, cost: m.cost, foodCostPct: m.foodCostPct, class: m.class })),
    suppliers: r.suppliers.map(({ supplier, ...s }) => ({ supplier: supplier.name, ...s })),
  };
});
