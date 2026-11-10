import { authed, body, route } from "@/server/api";
import { submitQuote } from "@/server/marketplace";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => submitQuote(await authed(req, ["SUPPLIER"]), (await params).id, await body(req)));
