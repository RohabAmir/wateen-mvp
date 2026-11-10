import { authed, route } from "@/server/api";
import { branchIdsFor } from "@/server/access";

export const GET = route(async (req) => {
  const user = await authed(req);
  return { ...user, branchIds: await branchIdsFor(user) };
});
