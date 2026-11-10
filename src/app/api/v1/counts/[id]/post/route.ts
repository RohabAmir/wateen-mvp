import { authed, body, route } from "@/server/api";
import { postCount } from "@/server/inventory";

type Ctx = { params: Promise<{ id: string }> };

/** Body: { entries: { [countLineId]: countedQty } } */
export const POST = route(async (req, { params }: Ctx) => {
  const user = await authed(req, ["OWNER", "MANAGER"]);
  const { entries } = (await body(req)) as { entries?: unknown };
  return postCount(user, (await params).id, entries);
});
