import "server-only";
import { z } from "zod";
import type { POSource, PurchaseOrder, User } from "@prisma/client";
import { db } from "@/lib/db";
import { round2 } from "@/lib/costing";
import { daysOfCover, reorderSuggestion, weightedAverageCost } from "@/lib/inventory";
import { canApprove, canTransition, needsApproval, orderTotal, receiptFlags, type POAction } from "@/lib/procurement";
import { DAY } from "@/lib/format";
import { asOrgUser, assertBranch, audit, branchIdsFor, nextNumber, type Tx } from "./access";
import { assert, ServiceError } from "./errors";

export const OPEN_STATUSES = ["DRAFT", "PENDING_APPROVAL", "SENT", "CONFIRMED", "SHIPPED"] as const;

/** Average daily recipe usage per branch and item over the last 14 days. */
export async function dailyUsage(branchIds: string[], days = 14) {
  const rows = await db.stockMovement.groupBy({
    by: ["branchId", "itemId"],
    where: { branchId: { in: branchIds }, type: "SALE", createdAt: { gte: new Date(Date.now() - days * DAY) } },
    _sum: { qty: true },
  });
  return new Map(rows.map((r) => [`${r.branchId}:${r.itemId}`, -(r._sum.qty ?? 0) / days]));
}

export async function onOrderQty(branchIds: string[]) {
  const rows = await db.pOLine.findMany({
    where: { po: { branchId: { in: branchIds }, status: { in: [...OPEN_STATUSES] } } },
    select: { qty: true, itemId: true, po: { select: { branchId: true } } },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(`${r.po.branchId}:${r.itemId}`, (map.get(`${r.po.branchId}:${r.itemId}`) ?? 0) + r.qty);
  return map;
}

export interface SuggestionLine {
  itemId: string;
  name: string;
  nameAr: string;
  unit: string;
  onHand: number;
  onOrder: number;
  parLevel: number;
  reorderPoint: number;
  avgDaily: number;
  daysCover: number;
  qty: number;
  unitPrice: number;
  reason: "BELOW_REORDER_POINT" | "FORECAST_STOCKOUT";
  cheaper?: { supplier: string; supplierAr: string; price: number; saving: number };
}

export interface SuggestionGroup {
  branchId: string;
  branch: { name: string; nameAr: string };
  supplier: { id: string; name: string; nameAr: string; leadTimeDays: number; minOrder: number };
  lines: SuggestionLine[];
  total: number;
}

/**
 * Smart reorder: for every stocked item at or below its reorder point, or forecast to run out
 * within the supplier lead time, suggests a quantity from the branch's usual supplier, grouped
 * into one draft order per branch and supplier.
 */
export async function getSuggestions(user: User, onlyBranchId?: string): Promise<SuggestionGroup[]> {
  const u = asOrgUser(user);
  let branchIds = await branchIdsFor(u);
  if (onlyBranchId) branchIds = branchIds.filter((b) => b === onlyBranchId);
  if (branchIds.length === 0) return [];

  const [stock, usage, onOrder, catalog, recent] = await Promise.all([
    db.stock.findMany({ where: { branchId: { in: branchIds } }, include: { item: true, branch: true } }),
    dailyUsage(branchIds),
    onOrderQty(branchIds),
    db.catalogItem.findMany({ where: { inStock: true, item: { orgId: u.orgId } }, include: { supplier: true } }),
    db.pOLine.findMany({
      where: { po: { orgId: u.orgId, status: "RECEIVED" } },
      select: { itemId: true, po: { select: { supplierId: true, receivedAt: true } } },
      orderBy: { po: { receivedAt: "desc" } },
      take: 500,
    }),
  ]);
  const usual = new Map<string, string>();
  for (const r of recent) if (!usual.has(r.itemId)) usual.set(r.itemId, r.po.supplierId);

  const groups = new Map<string, SuggestionGroup>();
  for (const s of stock) {
    const offers = catalog.filter((c) => c.itemId === s.itemId);
    if (offers.length === 0) continue;
    const cheapest = offers.reduce((a, b) => (b.price < a.price ? b : a));
    const chosen = offers.find((o) => o.supplierId === usual.get(s.itemId)) ?? cheapest;
    const key = `${s.branchId}:${s.itemId}`;
    const avgDaily = usage.get(key) ?? 0;
    const pending = onOrder.get(key) ?? 0;
    const sug = reorderSuggestion({
      onHand: s.onHand,
      onOrder: pending,
      parLevel: s.parLevel,
      reorderPoint: s.reorderPoint,
      avgDailyUsage: avgDaily,
      leadTimeDays: chosen.supplier.leadTimeDays,
      packSize: chosen.packSize,
      minQty: chosen.minQty,
    });
    if (!sug) continue;
    const gKey = `${s.branchId}:${chosen.supplierId}`;
    const g = groups.get(gKey) ?? {
      branchId: s.branchId,
      branch: { name: s.branch.name, nameAr: s.branch.nameAr },
      supplier: { id: chosen.supplierId, name: chosen.supplier.name, nameAr: chosen.supplier.nameAr, leadTimeDays: chosen.supplier.leadTimeDays, minOrder: chosen.supplier.minOrder },
      lines: [],
      total: 0,
    };
    g.lines.push({
      itemId: s.itemId,
      name: s.item.name,
      nameAr: s.item.nameAr,
      unit: s.item.unit,
      onHand: round2(s.onHand),
      onOrder: round2(pending),
      parLevel: s.parLevel,
      reorderPoint: s.reorderPoint,
      avgDaily: round2(avgDaily),
      daysCover: daysOfCover(s.onHand, avgDaily),
      qty: sug.qty,
      unitPrice: chosen.price,
      reason: sug.reason,
      cheaper:
        cheapest.supplierId !== chosen.supplierId && cheapest.price < chosen.price
          ? { supplier: cheapest.supplier.name, supplierAr: cheapest.supplier.nameAr, price: cheapest.price, saving: round2((chosen.price - cheapest.price) * sug.qty) }
          : undefined,
    });
    g.total = round2(g.total + sug.qty * chosen.price);
    groups.set(gKey, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

export const createPOSchema = z.object({
  branchId: z.string().min(1),
  supplierId: z.string().min(1),
  source: z.enum(["SUGGESTION", "MARKETPLACE", "RFQ", "MANUAL"]).default("MANUAL"),
  note: z.string().trim().max(300).optional(),
  lines: z
    .array(z.object({ itemId: z.string().min(1), qty: z.coerce.number().positive(), unitPrice: z.coerce.number().positive().optional() }))
    .min(1, "Add at least one item"),
});

async function submitInTx(tx: Tx, po: PurchaseOrder, user: User) {
  const org = await tx.organization.findUniqueOrThrow({ where: { id: po.orgId } });
  const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: po.supplierId } });
  const now = new Date();
  if (needsApproval(po.total, org.approvalThreshold)) {
    await audit(tx, "PO", po.id, "SUBMITTED", user, `Above the SAR ${org.approvalThreshold} approval limit`);
    return tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "PENDING_APPROVAL", submittedAt: now } });
  }
  await audit(tx, "PO", po.id, "SUBMITTED", user);
  await audit(tx, "PO", po.id, "SENT", user, "Within the approval limit, sent automatically");
  return tx.purchaseOrder.update({
    where: { id: po.id },
    data: { status: "SENT", submittedAt: now, sentAt: now, expectedDate: new Date(now.getTime() + supplier.leadTimeDays * DAY) },
  });
}

/** Creates and submits a purchase order. Prices come from the supplier catalogue unless an RFQ price is passed. */
export async function createPurchaseOrder(user: User, input: unknown, opts: { rfqPrice?: boolean } = {}) {
  const u = asOrgUser(user);
  assert(["OWNER", "MANAGER", "PURCHASER"].includes(u.role), "You cannot raise purchase orders", 403);
  const d = createPOSchema.parse(input);
  await assertBranch(u, d.branchId);
  const supplier = await db.supplier.findUnique({ where: { id: d.supplierId }, include: { catalog: true } });
  assert(supplier, "Supplier not found", 404);

  const lines = d.lines.map((l) => {
    const offer = supplier.catalog.find((c) => c.itemId === l.itemId);
    if (!offer && !opts.rfqPrice) throw new ServiceError(`${supplier.name} does not sell one of the selected items`, 422);
    const unitPrice = opts.rfqPrice && l.unitPrice ? l.unitPrice : offer!.price;
    return { itemId: l.itemId, qty: round2(l.qty), unitPrice };
  });
  const total = orderTotal(lines);
  assert(total >= supplier.minOrder, `${supplier.name} has a minimum order of SAR ${supplier.minOrder}. This order is SAR ${total}.`, 422);

  return db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        number: await nextNumber(tx, "PO"),
        orgId: u.orgId,
        branchId: d.branchId,
        supplierId: supplier.id,
        source: d.source as POSource,
        note: d.note || null,
        total,
        createdById: u.id,
        lines: { create: lines },
      },
    });
    await audit(tx, "PO", po.id, "CREATED", u, d.note);
    return submitInTx(tx, po, u);
  });
}

/** Loads a purchase order the user may see: their organisation's orders, or orders addressed to their supplier. */
export async function getPurchaseOrder(user: User, id: string) {
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { lines: { include: { item: true } }, supplier: true, branch: true, rfq: true },
  });
  assert(po, "Purchase order not found", 404);
  if (user.role === "SUPPLIER") {
    assert(po.supplierId === user.supplierId && po.status !== "DRAFT" && po.status !== "PENDING_APPROVAL", "Purchase order not found", 404);
  } else {
    assert(po.orgId === user.orgId, "Purchase order not found", 404);
    if (user.role === "MANAGER") assert(po.branchId === user.branchId, "Purchase order not found", 404);
  }
  return po;
}

export const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "CANCEL", "CONFIRM", "SHIP"]),
  note: z.string().trim().max(300).optional(),
  expectedDate: z.string().optional(),
});

export async function actOnPurchaseOrder(user: User, id: string, input: unknown) {
  const { action, note, expectedDate } = actionSchema.parse(input);
  const po = await getPurchaseOrder(user, id);
  assert(canTransition(action as POAction, po.status, user.role), `You cannot ${action.toLowerCase()} an order that is ${po.status.toLowerCase().replace("_", " ")}`, 409);
  const now = new Date();
  const supplierName = user.role === "SUPPLIER" ? `${user.name} (${po.supplier.name})` : undefined;

  return db.$transaction(async (tx) => {
    switch (action) {
      case "APPROVE":
        assert(canApprove(user.role, user.id, po.createdById), "You cannot approve an order you raised yourself", 403);
        await audit(tx, "PO", po.id, "APPROVED", user, note);
        await audit(tx, "PO", po.id, "SENT", user);
        return tx.purchaseOrder.update({
          where: { id },
          data: { status: "SENT", approvedById: user.id, approvedAt: now, sentAt: now, expectedDate: new Date(now.getTime() + po.supplier.leadTimeDays * DAY) },
        });
      case "REJECT":
        assert(note, "Give a reason for rejecting the order", 422);
        await audit(tx, "PO", po.id, "REJECTED", user, note);
        return tx.purchaseOrder.update({ where: { id }, data: { status: "REJECTED" } });
      case "CANCEL":
        await audit(tx, "PO", po.id, "CANCELLED", user, note);
        return tx.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
      case "CONFIRM": {
        const date = expectedDate ? new Date(expectedDate) : po.expectedDate;
        assert(!date || !Number.isNaN(date.getTime()), "Delivery date is not valid", 422);
        await audit(tx, "PO", po.id, "CONFIRMED", user, note, supplierName);
        return tx.purchaseOrder.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: now, expectedDate: date } });
      }
      case "SHIP":
        await audit(tx, "PO", po.id, "SHIPPED", user, note, supplierName);
        return tx.purchaseOrder.update({ where: { id }, data: { status: "SHIPPED", shippedAt: now } });
    }
  });
}

export const receiveSchema = z.object({
  note: z.string().trim().max(300).optional(),
  lines: z
    .array(z.object({ lineId: z.string().min(1), receivedQty: z.coerce.number().min(0), receivedPrice: z.coerce.number().positive() }))
    .min(1),
});

/**
 * Goods receipt: books the delivered quantities into branch stock at the invoiced price, updates
 * the weighted average cost, and flags short deliveries and price increases against the order.
 */
export async function receivePurchaseOrder(user: User, id: string, input: unknown) {
  const d = receiveSchema.parse(input);
  const po = await getPurchaseOrder(user, id);
  assert(canTransition("RECEIVE", po.status, user.role), "This order cannot be received", 409);
  await assertBranch(user, po.branchId);
  const byId = new Map(d.lines.map((l) => [l.lineId, l]));
  assert(po.lines.every((l) => byId.has(l.id)), "Enter the received quantity and price for every line", 422);

  const flags = po.lines.map((l) => {
    const r = byId.get(l.id)!;
    return { itemId: l.itemId, name: l.item.name, nameAr: l.item.nameAr, unit: l.item.unit, ...receiptFlags({ qty: l.qty, unitPrice: l.unitPrice, receivedQty: r.receivedQty, receivedPrice: r.receivedPrice }) };
  });

  await db.$transaction(async (tx) => {
    for (const l of po.lines) {
      const r = byId.get(l.id)!;
      await tx.pOLine.update({ where: { id: l.id }, data: { receivedQty: r.receivedQty, receivedPrice: r.receivedPrice } });
      if (r.receivedQty <= 0) continue;
      const totalOnHand = await tx.stock.aggregate({ where: { itemId: l.itemId }, _sum: { onHand: true } });
      await tx.item.update({
        where: { id: l.itemId },
        data: { avgCost: weightedAverageCost(totalOnHand._sum.onHand ?? 0, l.item.avgCost, r.receivedQty, r.receivedPrice) },
      });
      await tx.stock.update({ where: { branchId_itemId: { branchId: po.branchId, itemId: l.itemId } }, data: { onHand: { increment: r.receivedQty } } });
      await tx.stockMovement.create({
        data: { branchId: po.branchId, itemId: l.itemId, type: "RECEIVE", qty: r.receivedQty, unitCost: r.receivedPrice, refType: "PO", refId: po.id, userId: user.id },
      });
    }
    const issues = flags.filter((f) => f.short || f.over || f.priceUp);
    const summary = issues.length
      ? issues.map((f) => `${f.name}: ${f.short ? `short ${-f.qtyDiff} ${f.unit}` : f.over ? `over ${f.qtyDiff} ${f.unit}` : ""}${f.priceUp ? ` price +SAR ${f.priceDiff}` : ""}`).join("; ")
      : "Delivered in full at the agreed price";
    await audit(tx, "PO", po.id, "RECEIVED", user, d.note ? `${summary}. ${d.note}` : summary);
    await tx.purchaseOrder.update({ where: { id }, data: { status: "RECEIVED", receivedAt: new Date() } });
  });
  return { flags, receivedValue: round2(d.lines.reduce((s, l) => s + l.receivedQty * l.receivedPrice, 0)) };
}

export async function listPurchaseOrders(user: User, filter: { status?: string } = {}) {
  const status = filter.status && filter.status !== "ALL" ? { status: filter.status as PurchaseOrder["status"] } : {};
  if (user.role === "SUPPLIER") {
    return db.purchaseOrder.findMany({
      where: { supplierId: user.supplierId!, status: { notIn: ["DRAFT", "PENDING_APPROVAL"] }, ...status },
      include: { branch: true, supplier: true, org: true, _count: { select: { lines: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  const branchIds = await branchIdsFor(user);
  return db.purchaseOrder.findMany({
    where: { orgId: user.orgId!, branchId: { in: branchIds }, ...status },
    include: { branch: true, supplier: true, org: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
