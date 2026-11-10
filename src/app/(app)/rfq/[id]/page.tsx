import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { date, days, num, sar } from "@/lib/format";
import { round2 } from "@/lib/costing";
import { getRfq } from "@/server/marketplace";
import { supplierScores } from "@/server/suppliers";
import { ServiceError } from "@/server/errors";
import { Badge, Card, EmptyState, KeyValue, PageHeader, StatusBadge, TableWrap, Timeline } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { awardAction } from "@/app/actions/ops";

export const metadata = { title: "RFQ" };

export default async function RfqPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["OWNER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const { id } = await params;
  const rfq = await getRfq(user, id).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });
  const [events, scores] = await Promise.all([db.auditLog.findMany({ where: { entity: "RFQ", entityId: id }, orderBy: { createdAt: "asc" } }), supplierScores()]);
  const invited = rfq.item.catalog.map((c) => c.supplier);
  const current = rfq.item.catalog.reduce<number | null>((m, c) => (m === null || c.price < m ? c.price : m), null);
  const best = rfq.quotes[0];
  const open = rfq.status === "OPEN";

  return (
    <>
      <PageHeader
        back={{ href: "/rfq", label: tx("Requests for quote", "طلبات العروض") }}
        title={`${rfq.number} · ${pickName(locale, rfq.item)}`}
        subtitle={rfq.note ?? undefined}
        action={<StatusBadge status={rfq.status} locale={locale} />}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <div className="p-5">
              <KeyValue
                items={[
                  { label: tx("Quantity", "الكمية"), value: `${num(rfq.qty, locale)} ${label(locale, rfq.item.unit)}` },
                  { label: tx("Deliver to", "التوصيل إلى"), value: pickName(locale, rfq.branch) },
                  { label: tx("Quotes due", "موعد العروض"), value: date(rfq.dueDate, locale) },
                  { label: tx("Suppliers invited", "الموردون المدعوون"), value: invited.map((s) => pickName(locale, s)).join(locale === "ar" ? "، " : ", ") },
                  { label: tx("Best catalogue price today", "أفضل سعر كتالوج اليوم"), value: current ? sar(current, locale, 2) : "—" },
                  { label: tx("Purchase order", "أمر الشراء"), value: rfq.po ? <Link href={`/procurement/${rfq.po.id}`} className="text-plum underline">{rfq.po.number}</Link> : "—" },
                ]}
              />
            </div>
          </Card>
          <Card title={tx("Quote comparison", "مقارنة العروض")}>
            {rfq.quotes.length === 0 ? (
              <EmptyState title={tx("No quotes yet", "لا توجد عروض بعد")} body={tx("Suppliers see this request in their portal.", "يرى الموردون هذا الطلب في بوابتهم.")} />
            ) : (
              <TableWrap>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>{tx("Supplier", "المورد")}</th>
                      <th className="text-end">{tx("Unit price", "سعر الوحدة")}</th>
                      <th className="text-end">{tx("Total", "الإجمالي")}</th>
                      <th className="text-end">{tx("vs best catalogue", "مقارنة بالكتالوج")}</th>
                      <th className="text-end">{tx("Lead time", "مدة التوريد")}</th>
                      <th className="text-end">{tx("Score", "التقييم")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="num">
                    {rfq.quotes.map((q) => {
                      const saving = current ? round2((current - q.unitPrice) * rfq.qty) : 0;
                      return (
                        <tr key={q.id} className={q.id === best?.id ? "bg-success-light/40" : ""}>
                          <td>
                            <span className="font-medium">{pickName(locale, q.supplier)}</span>{" "}
                            {q.id === best?.id && <Badge tone="success">{tx("Lowest", "الأقل")}</Badge>}
                            {q.note && <span className="block text-xs text-metal">{q.note}</span>}
                          </td>
                          <td className="text-end">{sar(q.unitPrice, locale, 2)}</td>
                          <td className="text-end">{sar(q.unitPrice * rfq.qty, locale)}</td>
                          <td className={`text-end ${saving > 0 ? "text-success-dark" : saving < 0 ? "text-danger" : ""}`}>
                            {saving > 0 ? tx(`saves ${sar(saving)}`, `يوفر ${sar(saving, "ar")}`) : saving < 0 ? tx(`+${sar(-saving)}`, `+${sar(-saving, "ar")}`) : "—"}
                          </td>
                          <td className="text-end">{days(q.leadTimeDays, locale)}</td>
                          <td className="text-end">{scores.get(q.supplierId)?.score ?? tx("New", "جديد")}</td>
                          <td className="text-end">
                            {open ? (
                              <ActionForm action={awardAction}>
                                <input type="hidden" name="rfqId" value={rfq.id} />
                                <input type="hidden" name="quoteId" value={q.id} />
                                <SubmitButton className="btn-primary px-3 py-1.5">{tx("Award", "ترسية")}</SubmitButton>
                              </ActionForm>
                            ) : (
                              <StatusBadge status={q.status} locale={locale} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </div>
        <Card title={tx("Timeline", "السجل الزمني")}>
          <div className="p-5">
            <Timeline events={events} locale={locale} />
          </div>
        </Card>
      </div>
    </>
  );
}
