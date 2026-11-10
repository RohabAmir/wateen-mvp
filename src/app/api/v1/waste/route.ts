import { authed, body, route } from "@/server/api";
import { recordWaste } from "@/server/inventory";

export const POST = route(async (req) => recordWaste(await authed(req, ["OWNER", "MANAGER"]), await body(req)));
