import "server-only";
import type { Role, User } from "@prisma/client";
import { getApiUser } from "@/lib/session";
import { errorMessage, ServiceError } from "./errors";

type Handler<C> = (req: Request, ctx: C) => Promise<unknown>;

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

/** Wraps a route handler with consistent JSON success and error envelopes. */
export function route<C>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      const data = await fn(req, ctx);
      return data instanceof Response ? data : json({ data });
    } catch (e) {
      const { message, status } = errorMessage(e);
      return json({ error: { message, status } }, status);
    }
  };
}

export async function authed(req: Request, roles?: Role[]): Promise<User> {
  const user = await getApiUser(req);
  if (!user) throw new ServiceError("Authentication required. Use POST /api/v1/auth/demo-login to get a token.", 401);
  if (roles && !roles.includes(user.role)) throw new ServiceError(`This endpoint requires role ${roles.join(" or ")}`, 403);
  return user;
}

export async function body(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ServiceError("Request body must be valid JSON", 400);
  }
}
