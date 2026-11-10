import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { pct, sar } from "@/lib/format";
import { branchIdsFor } from "@/server/access";
import { supplierScores } from "@/server/suppliers";
import { Badge, Card, PageHeader, Stat, TableWrap } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { createOrderAction } from "@/app/actions/ops";

export const metadata = { title: "Supplier" };

export default async function SupplierStorePage({ params }: { params: Promise<{ supplierId: string }> }) {
  const user = await requireUser(["OWNER", "MANAGER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const { supplierId } = await params;
  const supplier = await db.supplier.findUnique({
    where: { id: supplierId },
    include: { catalog: { where: { item: { orgId: user.orgId! } }, include: { item: true }, orderBy: { item: { name: "asc" } } } },
  });
  if (!supplier) notFound();
  const ids = await branchIdsFor(user);
  const [branches, scores] = await Promise.all([db.branch.findMany({ where: { id: { in: ids } }, orderBy: { code: "desc" } }), supplierScores()]);
  const sc = scores.get(supplier.id);

  return (
    <>
      <PageHeader
        back={{ href: "/marketplace", label: tx("Marketplace", "السوق") }}
        title={pickName(locale, supplier)}
        subtitle={`${locale === "ar" ? supplier.categoryAr : supplier.category} · ${supplier.city} · ${tx(`${supplier.leadTimeDays}-day delivery`, `توصيل خلال ${supplier.leadTimeDays} يوم`)} · ${tx("minimum", "الحد الأدنى")} ${sar(supplier.minOrder, locale)}`}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="plum" label={tx("Supplier score", "تقييم المورد")} value={sc ? `${sc.score}/100` : "—"} hint={sc ? tx(`${sc.orders} deliveries`, `${sc.orders} توصيلة`) : undefined} />
        <Stat label={tx("On time", "في الوقت")} value={sc ? pct(sc.onTimePct, locale, 0) : "—"} />
        <Stat label={tx("In full", "كاملة")} value={sc ? pct(sc.inFullPct, locale, 0) : "—"} />
        <Stat label={tx("Invoiced at agreed price", "بالسعر المتفق")} value={sc ? pct(sc.priceAccuracyPct, locale, 0) : "—"} />
      </div>
      <Card title={tx("Catalogue", "الكتالوج")}>
        <ActionForm action={createOrderAction}>
          <input type="hidden" name="supplierId" value={supplier.id} />
          <input type="hidden" name="source" value="MARKETPLACE" />
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>{tx("Product", "المنتج")}</th>
                  <th className="text-end">{tx("Price", "السعر")}</th>
                  <th className="text-end">{tx("Pack size", "حجم العبوة")}</th>
                  <th className="text-end">{tx("Min qty", "أقل كمية")}</th>
                  <th className="text-end">{tx("Order qty", "كمية الطلب")}</th>
                </tr>
              </thead>
              <tbody className="num">
                {supplier.catalog.map((c) => (
                  <tr key={c.id} className={c.inStock ? "" : "opacity-50"}>
                    <td>
                      <span className="font-medium">{pickName(locale, c.item)}</span>{" "}
                      {!c.inStock && <Badge tone="danger">{tx("Out of stock", "غير متوفر")}</Badge>}
                      {c.previousPrice && c.price > c.previousPrice && (
                        <Badge tone="warning">{tx(`Up from ${sar(c.previousPrice, "en", 2)}`, `ارتفع من ${sar(c.previousPrice, "ar", 2)}`)}</Badge>
                      )}
                    </td>
                    <td className="text-end">{sar(c.price, locale, 2)}/{label(locale, c.item.unit)}</td>
                    <td className="text-end">{c.packSize}</td>
                    <td className="text-end">{c.minQty}</td>
                    <td className="text-end">
                      <input name={`qty_${c.itemId}`} type="number" min="0" step={c.packSize} disabled={!c.inStock} className="input-sm" aria-label={c.item.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <div className="flex flex-wrap items-end gap-3 border-t border-line p-5">
            <div>
              <label className="label">{tx("Deliver to", "التوصيل إلى")}</label>
              <select name="branchId" className="input" defaultValue={user.branchId ?? branches[0]?.id}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{pickName(locale, b)}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="label">{tx("Note to supplier", "ملاحظة للمورد")}</label>
              <input name="note" className="input" />
            </div>
            <SubmitButton className="btn-primary" pendingLabel={tx("Placing…", "جارٍ الطلب…")}>{tx("Place order", "إرسال الطلب")}</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
