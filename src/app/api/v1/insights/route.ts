import { authed, route } from "@/server/api";
import { periodReport } from "@/server/reports";

export const GET = route(async (req) => {
  const user = await authed(req, ["OWNER", "MANAGER", "PURCHASER"]);
  return (await periodReport(user, { days: 30 })).insights;
});
