import { authed, route } from "@/server/api";
import { stockOverview } from "@/server/reports";

export const GET = route(async (req) => {
  const user = await authed(req, ["OWNER", "MANAGER", "PURCHASER"]);
  const branchId = new URL(req.url).searchParams.get("branchId") ?? undefined;
  const rows = await stockOverview(user, { branchId });
  return rows.map((r) => ({
    branchId: r.branchId,
    branch: r.branch.code,
    itemId: r.itemId,
    sku: r.item.sku,
    item: r.item.name,
    unit: r.item.unit,
    onHand: r.onHand,
    onOrder: r.onOrder,
    parLevel: r.parLevel,
    reorderPoint: r.reorderPoint,
    avgDaily: r.avgDaily,
    daysCover: Number.isFinite(r.daysCover) ? Math.round(r.daysCover * 10) / 10 : null,
    value: r.value,
    state: r.state,
  }));
});
