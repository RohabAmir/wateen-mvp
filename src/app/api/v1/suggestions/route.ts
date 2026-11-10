import { authed, route } from "@/server/api";
import { getSuggestions } from "@/server/procurement";

export const GET = route(async (req) => {
  const user = await authed(req, ["OWNER", "MANAGER", "PURCHASER"]);
  return getSuggestions(user, new URL(req.url).searchParams.get("branchId") ?? undefined);
});
