import "server-only";
import { z } from "zod";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { round2 } from "@/lib/costing";
import { asOrgUser, assertBranch, audit, nextNumber } from "./access";
import { assert } from "./errors";
import { createPurchaseOrder } from "./procurement";

export const catalogUpdateSchema = z.object({
  price: z.coerce.number().positive("Price must be above zero"),
  inStock: z.coerce.boolean(),
});

/** Supplier updates a catalogue price. The previous price is kept so buyers can see the change. */
export async function updateCatalogItem(user: User, id: string, input: unknown) {
  assert(user.role === "SUPPLIER", "Only suppliers can edit catalogues", 403);
  const d = catalogUpdateSchema.parse(input);
  const item = await db.catalogItem.findUnique({ where: { id } });
  assert(item && item.supplierId === user.supplierId, "Catalogue item not found", 404);
  const changed = round2(d.price) !== item.price;
  return db.catalogItem.update({
    where: { id },
    data: { price: round2(d.price), inStock: d.inStock, previousPrice: changed ? item.price : item.previousPrice },
  });
}

export const rfqSchema = z.object({
  branchId: z.string().min(1),
  itemId: z.string().min(1),
  qty: z.coerce.number().positive("Enter a quantity above zero"),
  dueDays: z.coerce.number().int().min(1).max(30).default(3),
  note: z.string().trim().max(300).optional(),
});

export async function createRfq(user: User, input: unknown) {
  const u = asOrgUser(user);
  assert(["OWNER", "PURCHASER"].includes(u.role), "Only owners and purchasing can request quotes", 403);
  const d = rfqSchema.parse(input);
  await assertBranch(u, d.branchId);
  const item = await db.item.findFirst({ where: { id: d.itemId, orgId: u.orgId } });
  assert(item, "Item not found", 404);
  return db.$transaction(async (tx) => {
    const rfq = await tx.rfq.create({
      data: {
        number: await nextNumber(tx, "RFQ"),
        orgId: u.orgId,
        branchId: d.branchId,
        itemId: d.itemId,
        qty: d.qty,
        dueDate: new Date(Date.now() + d.dueDays * 86_400_000),
        note: d.note || null,
        createdById: u.id,
      },
    });
    await audit(tx, "RFQ", rfq.id, "CREATED", u, d.note);
    return rfq;
  });
}

/** RFQs a supplier can quote on: open requests for items in their category or catalogue. */
export async function supplierRfqs(user: User) {
  assert(user.role === "SUPPLIER" && user.supplierId, "Suppliers only", 403);
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: user.supplierId }, include: { catalog: true } });
  const itemIds = supplier.catalog.map((c) => c.itemId);
  return db.rfq.findMany({
    where: { OR: [{ itemId: { in: itemIds } }, { item: { category: supplier.category } }, { quotes: { some: { supplierId: supplier.id } } }] },
    include: { item: true, branch: true, org: true, quotes: { where: { supplierId: supplier.id } } },
    orderBy: { createdAt: "desc" },
  });
}

export const quoteSchema = z.object({
  unitPrice: z.coerce.number().positive("Enter a unit price"),
  leadTimeDays: z.coerce.number().int().min(0).max(30),
  note: z.string().trim().max(300).optional(),
});

export async function submitQuote(user: User, rfqId: string, input: unknown) {
  assert(user.role === "SUPPLIER" && user.supplierId, "Only suppliers can quote", 403);
  const d = quoteSchema.parse(input);
  const rfq = await db.rfq.findUnique({ where: { id: rfqId } });
  assert(rfq, "RFQ not found", 404);
  assert(rfq.status === "OPEN", "This RFQ is closed");
  assert(rfq.dueDate > new Date(), "The quote deadline has passed");
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: user.supplierId } });
  const quote = await db.quote.upsert({
    where: { rfqId_supplierId: { rfqId, supplierId: supplier.id } },
    create: { rfqId, supplierId: supplier.id, unitPrice: round2(d.unitPrice), leadTimeDays: d.leadTimeDays, note: d.note || null },
    update: { unitPrice: round2(d.unitPrice), leadTimeDays: d.leadTimeDays, note: d.note || null },
  });
  await audit(db, "RFQ", rfqId, "QUOTED", user, `SAR ${quote.unitPrice} per unit, ${quote.leadTimeDays} days`, `${user.name} (${supplier.name})`);
  return quote;
}

export async function getRfq(user: User, id: string) {
  const u = asOrgUser(user);
  const rfq = await db.rfq.findUnique({
    where: { id },
    include: { item: { include: { catalog: { include: { supplier: true } } } }, branch: true, po: true, quotes: { include: { supplier: true }, orderBy: { unitPrice: "asc" } } },
  });
  assert(rfq && rfq.orgId === u.orgId, "RFQ not found", 404);
  return rfq;
}

/** Awards an RFQ to one quote and raises a purchase order at the quoted price. Other quotes are marked as lost. */
export async function awardQuote(user: User, rfqId: string, quoteId: string) {
  const u = asOrgUser(user);
  assert(["OWNER", "PURCHASER"].includes(u.role), "Only owners and purchasing can award quotes", 403);
  const rfq = await getRfq(u, rfqId);
  assert(rfq.status === "OPEN", "This RFQ is already closed");
  const quote = rfq.quotes.find((q) => q.id === quoteId);
  assert(quote, "Quote not found", 404);

  const po = await createPurchaseOrder(
    u,
    {
      branchId: rfq.branchId,
      supplierId: quote.supplierId,
      source: "RFQ",
      note: `Awarded from ${rfq.number}`,
      lines: [{ itemId: rfq.itemId, qty: rfq.qty, unitPrice: quote.unitPrice }],
    },
    { rfqPrice: true },
  );
  return db.$transaction(async (tx) => {
    await tx.quote.updateMany({ where: { rfqId, id: { not: quote.id } }, data: { status: "LOST" } });
    await tx.quote.update({ where: { id: quote.id }, data: { status: "AWARDED" } });
    await tx.rfq.update({ where: { id: rfqId }, data: { status: "AWARDED", poId: po.id } });
    await audit(tx, "RFQ", rfqId, "AWARDED", u, `${quote.supplier.name} at SAR ${quote.unitPrice}, ${po.number}`);
    return po;
  });
}
