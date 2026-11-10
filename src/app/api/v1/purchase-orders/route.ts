import { authed, body, json, route } from "@/server/api";
import { createPurchaseOrder, listPurchaseOrders } from "@/server/procurement";

export const GET = route(async (req) => {
  const user = await authed(req);
  const orders = await listPurchaseOrders(user, { status: new URL(req.url).searchParams.get("status") ?? undefined });
  return orders.map(({ org: _o, ...o }) => o);
});

export const POST = route(async (req) => {
  const user = await authed(req, ["OWNER", "MANAGER", "PURCHASER"]);
  return json({ data: await createPurchaseOrder(user, await body(req)) }, 201);
});
