import { authed, body, route } from "@/server/api";
import { updateCatalogItem } from "@/server/marketplace";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, { params }: Ctx) => updateCatalogItem(await authed(req, ["SUPPLIER"]), (await params).id, await body(req)));
