import { authed, body, route } from "@/server/api";
import { importSales, sampleDay } from "@/server/inventory";

/** Body: { branchId, lines: [{ code, qty }] } or { branchId, sample: true } for a simulated day. */
export const POST = route(async (req) => {
  const user = await authed(req, ["OWNER", "MANAGER"]);
  const b = (await body(req)) as { branchId?: string; sample?: boolean; lines?: unknown };
  const lines = b.sample && b.branchId ? await sampleDay(user.orgId!, b.branchId) : b.lines;
  return importSales(user, { branchId: b.branchId, lines });
});
