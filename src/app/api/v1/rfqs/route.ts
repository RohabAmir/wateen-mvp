import { db } from "@/lib/db";
import { authed, body, json, route } from "@/server/api";
import { createRfq, supplierRfqs } from "@/server/marketplace";

export const GET = route(async (req) => {
  const user = await authed(req);
  if (user.role === "SUPPLIER") return supplierRfqs(user);
  return db.rfq.findMany({ where: { orgId: user.orgId! }, include: { item: true, quotes: true }, orderBy: { createdAt: "desc" } });
});

export const POST = route(async (req) => json({ data: await createRfq(await authed(req, ["OWNER", "PURCHASER"]), await body(req)) }, 201));
