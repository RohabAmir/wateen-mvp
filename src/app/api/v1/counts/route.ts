import { z } from "zod";
import { db } from "@/lib/db";
import { authed, body, json, route } from "@/server/api";
import { createCount } from "@/server/inventory";

export const POST = route(async (req) => {
  const user = await authed(req, ["OWNER", "MANAGER"]);
  const { branchId } = z.object({ branchId: z.string().min(1) }).parse(await body(req));
  const count = await createCount(user, branchId);
  const lines = await db.stockCountLine.findMany({ where: { countId: count.id }, include: { item: { select: { sku: true, name: true, unit: true } } } });
  return json({ data: { ...count, lines } }, 201);
});
