import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { date, pct, sar } from "@/lib/format";
import { listPurchaseOrders } from "@/server/procurement";
import { supplierScores } from "@/server/suppliers";
import { Card, EmptyState, PageHeader, Stat, StatusBadge, TableWrap } from "@/components/ui";

export const metadata = { title: "Supplier portal" };

const FILTERS = ["ALL", "SENT", "CONFIRMED", "SHIPPED", "RECEIVED"];

export default async function SupplierHome({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser(["SUPPLIER"]);
  const { locale, tx } = await getI18n();
  const status = (await searchParams).status ?? "ALL";
  const [supplier, orders, all, scores] = await Promise.all([
    db.supplier.findUniqueOrThrow({ where: { id: user.supplierId! } }),
    listPurchaseOrders(user, { status }),
    listPurchaseOrders(user),
    supplierScores(),
  ]);
  const sc = scores.get(supplier.id);
  const since = Date.now() - 30 * 86_400_000;
  const revenue = all.filter((o) => o.status === "RECEIVED" && o.receivedAt && o.receivedAt.getTime() > since).reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader
        title={pickName(locale, supplier)}
        subtitle={tx("New orders from restaurants on the platform land here. Confirm them, then mark them out for delivery.", "تصل هنا الطلبات الجديدة من المطاعم على المنصة. أكّدها ثم حدّدها كقيد التوصيل.")}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="plum" label={tx("To confirm", "بانتظار التأكيد")} value={String(all.filter((o) => o.status === "SENT").length)} />
        <Stat tone="orange" label={tx("To deliver", "بانتظار التوصيل")} value={String(all.filter((o) => o.status === "CONFIRMED" || o.status === "SHIPPED").length)} />
        <Stat label={tx("Delivered, last 30 days", "تم توصيله، آخر 30 يوماً")} value={sar(revenue, locale)} />
        <Stat label={tx("Your score", "تقييمك")} value={sc ? `${sc.score}/100` : "—"} hint={sc ? tx(`On time ${pct(sc.onTimePct, "en", 0)} · in full ${pct(sc.inFullPct, "en", 0)}`, `بالوقت ${pct(sc.onTimePct, "ar", 0)} · كاملة ${pct(sc.inFullPct, "ar", 0)}`) : undefined} />
      </div>
      <div className="mt-6 mb-3 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link key={f} href={`/supplier?status=${f}`} className={clsx("rounded-lg px-3 py-1.5 text-sm", status === f ? "bg-plum text-white" : "bg-white text-ink-soft ring-1 ring-line hover:bg-mist")}>
            {f === "ALL" ? tx("All", "الكل") : label(locale, f)}
          </Link>
        ))}
      </div>
      <Card>
        {orders.length === 0 ? (
          <EmptyState title={tx("No orders", "لا توجد طلبات")} />
        ) : (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>{tx("Order", "الطلب")}</th>
                  <th>{tx("Customer", "العميل")}</th>
                  <th>{tx("Deliver to", "التوصيل إلى")}</th>
                  <th>{tx("Received on", "تاريخ الطلب")}</th>
                  <th>{tx("Delivery date", "تاريخ التوصيل")}</th>
                  <th className="text-end">{tx("Value", "القيمة")}</th>
                  <th>{tx("Status", "الحالة")}</th>
                </tr>
              </thead>
              <tbody className="num">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/procurement/${o.id}`} className="font-medium text-plum hover:underline">{o.number}</Link></td>
                    <td>{pickName(locale, o.org)}</td>
                    <td>{pickName(locale, o.branch)}</td>
                    <td>{date(o.sentAt ?? o.createdAt, locale)}</td>
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
