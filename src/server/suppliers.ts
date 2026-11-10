import "server-only";
import { db } from "@/lib/db";
import { supplierScore } from "@/lib/procurement";

/** Lifetime on-time, in-full and price scores per supplier, across all buyers on the platform. */
export async function supplierScores() {
  const orders = await db.purchaseOrder.findMany({
    where: { status: "RECEIVED" },
    select: { supplierId: true, expectedDate: true, receivedAt: true, total: true, lines: { select: { qty: true, unitPrice: true, receivedQty: true, receivedPrice: true } } },
  });
  const bySupplier = new Map<string, typeof orders>();
  for (const o of orders) bySupplier.set(o.supplierId, [...(bySupplier.get(o.supplierId) ?? []), o]);
  return new Map(
    [...bySupplier].map(([id, list]) => [
      id,
      supplierScore(
        list.map((o) => ({
          ...o,
          lines: o.lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, receivedQty: l.receivedQty ?? l.qty, receivedPrice: l.receivedPrice ?? l.unitPrice })),
        })),
      ),
    ]),
  );
}
