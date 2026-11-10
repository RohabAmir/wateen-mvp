import { z } from "zod";
import { db } from "@/lib/db";
import { signToken } from "@/lib/session";
import { body, route } from "@/server/api";
import { assert } from "@/server/errors";

const schema = z.object({ email: z.string().email() });

export const POST = route(async (req) => {
  const { email } = schema.parse(await body(req));
  const user = await db.user.findUnique({ where: { email } });
  assert(user, "Unknown demo user", 404);
  return {
    token: await signToken(user.id),
    tokenType: "Bearer",
    expiresIn: 7 * 24 * 3600,
    user: { id: user.id, name: user.name, role: user.role, orgId: user.orgId, branchId: user.branchId, supplierId: user.supplierId },
  };
});
