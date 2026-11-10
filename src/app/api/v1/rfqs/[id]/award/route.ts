import { z } from "zod";
import { authed, body, route } from "@/server/api";
import { awardQuote } from "@/server/marketplace";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const user = await authed(req, ["OWNER", "PURCHASER"]);
  const { quoteId } = z.object({ quoteId: z.string().min(1) }).parse(await body(req));
  return awardQuote(user, (await params).id, quoteId);
});
