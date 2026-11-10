import { db } from "@/lib/db";
import { route } from "@/server/api";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await db.$queryRaw`SELECT 1`;
  return { status: "ok", service: "wateen-mvp", time: new Date().toISOString() };
});
