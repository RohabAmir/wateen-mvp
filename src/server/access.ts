import "server-only";
import type { Prisma, User } from "@prisma/client";
import { db } from "@/lib/db";
import { assert } from "./errors";

export type Tx = Prisma.TransactionClient;

export interface OrgUser extends User {
  orgId: string;
}

export function asOrgUser(user: User): OrgUser {
  assert(user.orgId, "This action is only available to restaurant users", 403);
  return user as OrgUser;
}

/** Branches the user may act on. Branch managers are limited to their own branch. */
export async function branchIdsFor(user: User): Promise<string[]> {
  if (!user.orgId) return [];
  if (user.role === "MANAGER" && user.branchId) return [user.branchId];
  const branches = await db.branch.findMany({ where: { orgId: user.orgId }, select: { id: true }, orderBy: { code: "desc" } });
  return branches.map((b) => b.id);
}

export async function assertBranch(user: User, branchId: string) {
  const ids = await branchIdsFor(user);
  assert(ids.includes(branchId), "You do not have access to this branch", 403);
}

export async function audit(
  client: Tx | typeof db,
  entity: string,
  entityId: string,
  action: string,
  user: { id: string; name: string } | null,
  note?: string | null,
  userName?: string,
) {
  await client.auditLog.create({
    data: { entity, entityId, action, note: note || null, userId: user?.id ?? null, userName: userName ?? user?.name ?? null },
  });
}

export async function nextNumber(client: Tx | typeof db, prefix: "PO" | "CNT" | "RFQ"): Promise<string> {
  const d = new Date();
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const where = { number: { startsWith: `${prefix}-${ym}-` } };
  const count =
    prefix === "PO"
      ? await client.purchaseOrder.count({ where })
      : prefix === "CNT"
        ? await client.stockCount.count({ where })
        : await client.rfq.count({ where });
  return `${prefix}-${ym}-${String(count + 1).padStart(4, "0")}`;
}
