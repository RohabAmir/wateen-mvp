import "server-only";
import { z } from "zod";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { recipeCost, round2 } from "@/lib/costing";
import { countVariance } from "@/lib/inventory";
import { asOrgUser, assertBranch, audit, nextNumber } from "./access";
import { assert, ServiceError } from "./errors";

const ManagerRoles = ["OWNER", "MANAGER"] as const;
const assertOperator = (user: User) =>
  assert((ManagerRoles as readonly string[]).includes(user.role), "Only owners and branch managers can do this", 403);

export const salesImportSchema = z.object({
  branchId: z.string().min(1),
  lines: z
    .array(z.object({ code: z.string().min(1), qty: z.coerce.number().int().positive("Quantities must be whole positive numbers") }))
    .min(1, "Add at least one sales line"),
});

/** Parses POS export lines in the form "M01,72" (menu code, quantity). */
export function parseSalesCsv(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^code/i.test(l))
    .map((l) => {
      const [code, qty] = l.split(/[,;\t]/).map((s) => s.trim());
      return { code: code.toUpperCase(), qty: Number(qty) };
    });
}

/** A realistic day of sales for a branch, used by the "simulate today's sales" button. */
export async function sampleDay(orgId: string, branchId: string) {
  const branch = await db.branch.findUniqueOrThrow({ where: { id: branchId } });
  const factor = branch.code === "OLY" ? 1.2 : branch.code === "NRJ" ? 0.8 : 1;
  const base: Record<string, number> = { M01: 72, M02: 48, M03: 26, M04: 19, M05: 9, M06: 31, M07: 42, M08: 29, M09: 14, M10: 52, M11: 24, M12: 47, M13: 21 };
  const menu = await db.menuItem.findMany({ where: { orgId }, orderBy: { code: "asc" } });
  return menu.map((m) => ({ code: m.code, qty: Math.round((base[m.code] ?? 10) * factor) }));
}

/**
 * Imports a POS sales batch: records revenue and plate cost per menu item, then deducts every
 * recipe ingredient from branch stock. Returns the items that dropped to or below their reorder point.
 */
export async function importSales(user: User, input: unknown) {
  const u = asOrgUser(user);
  assertOperator(u);
  const { branchId, lines } = salesImportSchema.parse(input);
  await assertBranch(u, branchId);

  const menu = await db.menuItem.findMany({ where: { orgId: u.orgId }, include: { lines: { include: { item: true } } } });
  const byCode = new Map(menu.map((m) => [m.code, m]));
  const unknown = lines.filter((l) => !byCode.has(l.code)).map((l) => l.code);
  if (unknown.length) throw new ServiceError(`Unknown menu codes: ${unknown.join(", ")}`, 422);

  const batch = `POS-${Date.now().toString(36).toUpperCase()}`;
  const usage = new Map<string, { qty: number; unitCost: number }>();
  let revenue = 0;
  let cost = 0;
  const saleRows = lines.map((l) => {
    const m = byCode.get(l.code)!;
    const plate = recipeCost(m.lines.map((r) => ({ qty: r.qty, unitCost: r.item.avgCost })));
    revenue += m.price * l.qty;
    cost += plate * l.qty;
    for (const r of m.lines) {
      const cur = usage.get(r.itemId) ?? { qty: 0, unitCost: r.item.avgCost };
      cur.qty += r.qty * l.qty;
      usage.set(r.itemId, cur);
    }
    return { branchId, menuItemId: m.id, qty: l.qty, revenue: round2(m.price * l.qty), cost: round2(plate * l.qty), batch, soldAt: new Date() };
  });

  const crossed = await db.$transaction(async (tx) => {
    await tx.sale.createMany({ data: saleRows });
    await tx.stockMovement.createMany({
      data: [...usage].map(([itemId, v]) => ({ branchId, itemId, type: "SALE" as const, qty: round2(-v.qty), unitCost: v.unitCost, refType: "POS", refId: batch, userId: u.id })),
    });
    const crossed: string[] = [];
    for (const [itemId, v] of usage) {
      const s = await tx.stock.update({ where: { branchId_itemId: { branchId, itemId } }, data: { onHand: { decrement: round2(v.qty) } } });
      if (s.onHand <= s.reorderPoint && s.onHand + v.qty > s.reorderPoint) crossed.push(itemId);
    }
    await audit(tx, "BRANCH", branchId, "POS_IMPORT", u, `${batch}: ${lines.length} menu lines`);
    return crossed;
  });

  const lowItems = await db.item.findMany({ where: { id: { in: crossed } }, select: { id: true, name: true, nameAr: true } });
  return { batch, revenue: round2(revenue), cost: round2(cost), lines: lines.length, ingredients: usage.size, lowItems };
}

export const wasteSchema = z.object({
  branchId: z.string().min(1),
  itemId: z.string().min(1),
  qty: z.coerce.number().positive("Enter a quantity above zero"),
  reason: z.string().trim().min(2, "Give a reason").max(120),
});

export async function recordWaste(user: User, input: unknown) {
  const u = asOrgUser(user);
  assertOperator(u);
  const d = wasteSchema.parse(input);
  await assertBranch(u, d.branchId);
  const item = await db.item.findFirst({ where: { id: d.itemId, orgId: u.orgId } });
  assert(item, "Item not found", 404);
  await db.$transaction(async (tx) => {
    await tx.stock.update({ where: { branchId_itemId: { branchId: d.branchId, itemId: d.itemId } }, data: { onHand: { decrement: d.qty } } });
    await tx.stockMovement.create({ data: { branchId: d.branchId, itemId: d.itemId, type: "WASTE", qty: -d.qty, unitCost: item.avgCost, note: d.reason, userId: u.id } });
  });
  return { value: round2(d.qty * item.avgCost) };
}

export const transferSchema = z
  .object({
    fromBranchId: z.string().min(1),
    toBranchId: z.string().min(1),
    itemId: z.string().min(1),
    qty: z.coerce.number().positive("Enter a quantity above zero"),
  })
  .refine((d) => d.fromBranchId !== d.toBranchId, "Pick two different branches");

export async function transferStock(user: User, input: unknown) {
  const u = asOrgUser(user);
  assertOperator(u);
  const d = transferSchema.parse(input);
  await assertBranch(u, d.fromBranchId);
  const [item, to] = await Promise.all([
    db.item.findFirst({ where: { id: d.itemId, orgId: u.orgId } }),
    db.branch.findFirst({ where: { id: d.toBranchId, orgId: u.orgId } }),
  ]);
  assert(item && to, "Item or branch not found", 404);
  const from = await db.stock.findUniqueOrThrow({ where: { branchId_itemId: { branchId: d.fromBranchId, itemId: d.itemId } } });
  assert(from.onHand >= d.qty, `Only ${from.onHand} ${item.unit} on hand`);
  const ref = `TRF-${Date.now().toString(36).toUpperCase()}`;
  await db.$transaction(async (tx) => {
    await tx.stock.update({ where: { id: from.id }, data: { onHand: { decrement: d.qty } } });
    await tx.stock.update({ where: { branchId_itemId: { branchId: d.toBranchId, itemId: d.itemId } }, data: { onHand: { increment: d.qty } } });
    await tx.stockMovement.createMany({
      data: [
        { branchId: d.fromBranchId, itemId: d.itemId, type: "TRANSFER_OUT", qty: -d.qty, unitCost: item.avgCost, refType: "TRANSFER", refId: ref, userId: u.id },
        { branchId: d.toBranchId, itemId: d.itemId, type: "TRANSFER_IN", qty: d.qty, unitCost: item.avgCost, refType: "TRANSFER", refId: ref, userId: u.id },
      ],
    });
  });
  return { ref };
}

/** Opens a stock count for a branch with the system quantity of every item as the expected quantity. */
export async function createCount(user: User, branchId: string) {
  const u = asOrgUser(user);
  assertOperator(u);
  await assertBranch(u, branchId);
  const open = await db.stockCount.findFirst({ where: { branchId, status: "DRAFT" } });
  if (open) return open;
  const stock = await db.stock.findMany({ where: { branchId }, include: { item: true }, orderBy: { item: { category: "asc" } } });
  return db.$transaction(async (tx) => {
    const count = await tx.stockCount.create({
      data: {
        number: await nextNumber(tx, "CNT"),
        branchId,
        userId: u.id,
        lines: { create: stock.map((s) => ({ itemId: s.itemId, expectedQty: round2(s.onHand), unitCost: s.item.avgCost })) },
      },
    });
    await audit(tx, "COUNT", count.id, "CREATED", u);
    return count;
  });
}

export const countEntriesSchema = z.record(z.string(), z.coerce.number().min(0, "Counted quantities cannot be negative"));

async function loadDraftCount(user: User, countId: string) {
  const u = asOrgUser(user);
  assertOperator(u);
  const count = await db.stockCount.findUnique({ where: { id: countId }, include: { lines: true } });
  assert(count, "Stock count not found", 404);
  await assertBranch(u, count.branchId);
  assert(count.status === "DRAFT", "This count is already posted");
  return { u, count };
}

export async function saveCount(user: User, countId: string, entries: unknown) {
  const { count } = await loadDraftCount(user, countId);
  const values = countEntriesSchema.parse(entries);
  const ids = new Set(count.lines.map((l) => l.id));
  await db.$transaction(
    Object.entries(values)
      .filter(([id]) => ids.has(id))
      .map(([id, countedQty]) => db.stockCountLine.update({ where: { id }, data: { countedQty } })),
  );
  return { saved: Object.keys(values).length };
}

/**
 * Posts a count: sets on-hand to the counted quantity and records the difference as a count
 * adjustment, which is the unexplained variance the reports surface. Uncounted lines are left as is.
 */
export async function postCount(user: User, countId: string, entries?: unknown) {
  if (entries) await saveCount(user, countId, entries);
  const { u, count } = await loadDraftCount(user, countId);
  const counted = count.lines.filter((l) => l.countedQty !== null);
  assert(counted.length > 0, "Enter at least one counted quantity before posting");

  let lossValue = 0;
  await db.$transaction(async (tx) => {
    for (const l of counted) {
      const stock = await tx.stock.findUniqueOrThrow({ where: { branchId_itemId: { branchId: count.branchId, itemId: l.itemId } } });
      // Movements since the count opened (sales, receipts) still apply on top of the counted quantity.
      const drift = round2(stock.onHand - l.expectedQty);
      const v = countVariance({ expectedQty: l.expectedQty, countedQty: l.countedQty!, unitCost: l.unitCost });
      lossValue += v.lossValue;
      await tx.stock.update({ where: { id: stock.id }, data: { onHand: round2(l.countedQty! + drift) } });
      if (v.qty !== 0) {
        await tx.stockMovement.create({
          data: { branchId: count.branchId, itemId: l.itemId, type: "COUNT_ADJUST", qty: v.qty, unitCost: l.unitCost, refType: "COUNT", refId: count.id, userId: u.id },
        });
      }
    }
    await tx.stockCount.update({ where: { id: count.id }, data: { status: "POSTED", postedAt: new Date() } });
    await audit(tx, "COUNT", count.id, "POSTED", u, `Net variance SAR ${round2(-lossValue)}`);
  });
  return { lossValue: round2(lossValue), lines: counted.length };
}
