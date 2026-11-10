import { authed, body, route } from "@/server/api";
import { receivePurchaseOrder } from "@/server/procurement";

type Ctx = { params: Promise<{ id: string }> };

/** Body: { lines: [{ lineId, receivedQty, receivedPrice }], note? } */
export const POST = route(async (req, { params }: Ctx) =>
  receivePurchaseOrder(await authed(req, ["OWNER", "MANAGER"]), (await params).id, await body(req)),
);
