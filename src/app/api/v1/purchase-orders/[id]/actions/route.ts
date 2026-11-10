import { authed, body, route } from "@/server/api";
import { actOnPurchaseOrder } from "@/server/procurement";

type Ctx = { params: Promise<{ id: string }> };

/** Body: { action: APPROVE | REJECT | CANCEL | CONFIRM | SHIP, note?, expectedDate? } */
export const POST = route(async (req, { params }: Ctx) => actOnPurchaseOrder(await authed(req), (await params).id, await body(req)));
