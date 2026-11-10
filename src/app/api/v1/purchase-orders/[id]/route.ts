import { db } from "@/lib/db";
import { authed, route } from "@/server/api";
import { getPurchaseOrder } from "@/server/procurement";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (req, { params }: Ctx) => {
  const user = await authed(req);
  const { id } = await params;
  const po = await getPurchaseOrder(user, id);
  const events = await db.auditLog.findMany({ where: { entity: "PO", entityId: id }, orderBy: { createdAt: "asc" } });
  return { ...po, events };
});
