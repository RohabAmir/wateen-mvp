import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { date, num, sar } from "@/lib/format";
import { branchIdsFor } from "@/server/access";
import { getSuggestions, listPurchaseOrders } from "@/server/procurement";
import { Badge, Card, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { BranchFilter } from "@/components/BranchFilter";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { createOrderAction } from "@/app/actions/ops";

export const metadata = { title: "Purchasing" };

const FILTERS = ["ALL", "PENDING_APPROVAL", "SENT", "CONFIRMED", "SHIPPED", "RECEIVED", "REJECTED"];

export default async function ProcurementPage({ searchParams }: { searchParams: Promise<{ branch?: string; status?: string }> }) {
  const user = await requireUser(["OWNER", "MANAGER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const sp = await searchParams;
  const ids = await branchIdsFor(user);
  const branchId = sp.branch && ids.includes(sp.branch) ? sp.branch : undefined;
  const status = sp.status ?? "ALL";
  const [branches, suggestions, orders, org] = await Promise.all([
    db.branch.findMany({ where: { id: { in: ids } }, orderBy: { code: "desc" } }),
    getSuggestions(user, branchId),
    listPurchaseOrders(user, { status }),
    db.organization.findUniqueOrThrow({ where: { id: user.orgId! } }),
  ]);
  const visibleOrders = branchId ? orders.filter((o) => o.branchId === branchId) : orders;

  return (
    <>
      <PageHeader
        title={tx("Purchasing", "المشتريات")}
        subtitle={tx(
          `Smart reorder suggestions from stock levels and usage forecasts. Orders above ${sar(org.approvalThreshold)} need approval.`,
          `اقتراحات طلب ذكية من مستويات المخزون وتوقعات الاستهلاك. الطلبات فوق ${sar(org.approvalThreshold, "ar")} تحتاج موافقة.`,
        )}
        action={<Link href="/marketplace" className="btn-outline">{tx("Order from the marketplace", "اطلب من السوق")}</Link>}
      />
      <BranchFilter branches={branches} current={branchId} locale={locale} basePath="/procurement" params={{ status: sp.status }} />

      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        {tx("Smart reorder suggestions", "اقتراحات الطلب الذكي")}
        <Badge tone="orange">{suggestions.reduce((n, g) => n + g.lines.length, 0)}</Badge>
      </h2>
      {suggestions.length === 0 ? (
        <Card><EmptyState title={tx("Stock is healthy", "المخزون بحالة جيدة")} body={tx("No item is below its reorder point or forecast to run out.", "لا يوجد صنف تحت حد الطلب أو متوقع نفاده.")} /></Card>
      ) : (
        <div className="space-y-4">
          {suggestions.map((g) => {
            const belowMin = g.total < g.supplier.minOrder;
            return (
              <Card key={`${g.branchId}:${g.supplier.id}`}>
                <ActionForm action={createOrderAction}>
                  <input type="hidden" name="branchId" value={g.branchId} />
                  <input type="hidden" name="supplierId" value={g.supplier.id} />
                  <input type="hidden" name="source" value="SUGGESTION" />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                    <div>
                      <p className="font-bold">{pickName(locale, g.supplier)}</p>
                      <p className="text-sm text-metal">
                        {tx("Deliver to", "التوصيل إلى")} {pickName(locale, g.branch)} · {tx(`${g.supplier.leadTimeDays}-day lead time`, `مدة التوريد ${g.supplier.leadTimeDays} يوم`)} · {tx("Minimum", "الحد الأدنى")} {sar(g.supplier.minOrder, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num text-lg font-bold">{sar(g.total, locale)}</span>
                      {g.total > org.approvalThreshold && <Badge tone="warning">{tx("Needs approval", "يحتاج موافقة")}</Badge>}
                      <SubmitButton className="btn-primary" pendingLabel={tx("Creating…", "جارٍ الإنشاء…")}>
                        {g.total > org.approvalThreshold ? tx("Submit for approval", "إرسال للموافقة") : tx("Send order", "إرسال الطلب")}
                      </SubmitButton>
                    </div>
                  </div>
                  <TableWrap>
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th>{tx("Item", "الصنف")}</th>
                          <th>{tx("Why", "السبب")}</th>
                          <th className="text-end">{tx("On hand", "المتوفر")}</th>
                          <th className="text-end">{tx("Daily use", "الاستهلاك اليومي")}</th>
                          <th className="text-end">{tx("Days left", "أيام متبقية")}</th>
                          <th className="text-end">{tx("Order qty", "كمية الطلب")}</th>
                          <th className="text-end">{tx("Price", "السعر")}</th>
                        </tr>
                      </thead>
                      <tbody className="num">
                        {g.lines.map((l) => (
                          <tr key={l.itemId}>
                            <td>
                              <span className="font-medium">{pickName(locale, l)}</span>
                              {l.cheaper && (
                                <span className="block text-xs text-success-dark">
                                  {tx(
                                    `${l.cheaper.supplier} sells at ${sar(l.cheaper.price, "en", 2)}, save ${sar(l.cheaper.saving)}`,
                                    `${l.cheaper.supplierAr} يبيع بـ ${sar(l.cheaper.price, "ar", 2)}، وفّر ${sar(l.cheaper.saving, "ar")}`,
                                  )}
                                </span>
                              )}
                            </td>
                            <td>
                              <Badge tone={l.reason === "BELOW_REORDER_POINT" ? "warning" : "plum"}>
                                {l.reason === "BELOW_REORDER_POINT" ? tx("Below reorder point", "تحت حد الطلب") : tx("Forecast stockout", "نفاد متوقع")}
                              </Badge>
                            </td>
                            <td className="text-end">{num(l.onHand, locale)} {label(locale, l.unit)}{l.onOrder ? <span className="block text-xs text-metal">+{num(l.onOrder, locale)} {tx("on order", "قيد الطلب")}</span> : null}</td>
                            <td className="text-end">{num(l.avgDaily, locale)}</td>
                            <td className={clsx("text-end", l.daysCover <= g.supplier.leadTimeDays && "font-medium text-danger")}>{Number.isFinite(l.daysCover) ? num(l.daysCover, locale) : "∞"}</td>
                            <td className="text-end"><input name={`qty_${l.itemId}`} type="number" min="0" step="any" defaultValue={l.qty} className="input-sm" aria-label={l.name} /></td>
                            <td className="text-end">{sar(l.unitPrice, locale, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                  {belowMin && <p className="border-t border-line px-5 py-2 text-xs text-warning">{tx("Below the supplier minimum. Add quantity or combine with another order.", "أقل من الحد الأدنى للمورد. زد الكمية أو اجمعه مع طلب آخر.")}</p>}
                </ActionForm>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{tx("Purchase orders", "أوامر الشراء")}</h2>
        <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={`/procurement?${new URLSearchParams({ ...(branchId ? { branch: branchId } : {}), status: f })}`}
              className={clsx("rounded-lg px-3 py-1.5 text-sm", status === f ? "bg-plum text-white" : "text-ink-soft hover:bg-mist")}
            >
              {f === "ALL" ? tx("All", "الكل") : label(locale, f)}
            </Link>
          ))}
        </div>
      </div>
      <Card>
        {visibleOrders.length === 0 ? (
          <EmptyState title={tx("No orders", "لا توجد طلبات")} />
        ) : (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>{tx("Order", "الطلب")}</th>
                  <th>{tx("Supplier", "المورد")}</th>
                  <th>{tx("Branch", "الفرع")}</th>
                  <th>{tx("Source", "المصدر")}</th>
                  <th>{tx("Created", "الإنشاء")}</th>
                  <th>{tx("Expected", "المتوقع")}</th>
                  <th className="text-end">{tx("Total", "الإجمالي")}</th>
                  <th>{tx("Status", "الحالة")}</th>
                </tr>
              </thead>
              <tbody className="num">
                {visibleOrders.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/procurement/${o.id}`} className="font-medium text-plum hover:underline">{o.number}</Link></td>
                    <td>{pickName(locale, o.supplier)}</td>
                    <td>{pickName(locale, o.branch)}</td>
                    <td className="text-metal">{label(locale, o.source)}</td>
                    <td>{date(o.createdAt, locale)}</td>
                    <td>{date(o.expectedDate, locale)}</td>
                    <td className="text-end">{sar(o.total, locale)}</td>
                    <td><StatusBadge status={o.status} locale={locale} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
