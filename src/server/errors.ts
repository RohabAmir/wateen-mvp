import { ZodError } from "zod";

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function assert(cond: unknown, message: string, status = 400): asserts cond {
  if (!cond) throw new ServiceError(message, status);
}

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export function errorMessage(e: unknown): { message: string; status: number } {
  if (e instanceof ServiceError) return { message: e.message, status: e.status };
  if (e instanceof ZodError) return { message: e.issues[0]?.message ?? "Invalid input", status: 422 };
  console.error(e);
  return { message: "Something went wrong. Please try again.", status: 500 };
}

export async function toResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: errorMessage(e).message };
  }
}
