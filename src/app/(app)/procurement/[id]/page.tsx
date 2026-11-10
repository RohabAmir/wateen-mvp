import { notFound } from "next/navigation";
import clsx from "clsx";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { date, num, sar } from "@/lib/format";
import { allowedActions, canApprove, receiptFlags } from "@/lib/procurement";
import { getPurchaseOrder } from "@/server/procurement";
import { ServiceError } from "@/server/errors";
import { Badge, Card, KeyValue, PageHeader, StatusBadge, TableWrap, Timeline } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { poAction, receiveAction } from "@/app/actions/ops";

export const metadata = { title: "Purchase order" };

const STEPS = ["PENDING_APPROVAL", "SENT", "CONFIRMED", "SHIPPED", "RECEIVED"] as const;

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { locale, tx } = await getI18n();
  const { id } = await params;
  const po = await getPurchaseOrder(user, id).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });
  const [events, creator, approver] = await Promise.all([
    db.auditLog.findMany({ where: { entity: "PO", entityId: id }, orderBy: { createdAt: "asc" } }),
    db.user.findUnique({ where: { id: po.createdById } }),
    po.approvedById ? db.user.findUnique({ where: { id: po.approvedById } }) : null,
  ]);
  const actions = allowedActions(po.status, user.role).filter((a) => a !== "APPROVE" || canApprove(user.role, user.id, po.createdById));
  const received = po.status === "RECEIVED";
  const isSupplier = user.role === "SUPPLIER";
  const stepIndex = STEPS.indexOf(po.status as (typeof STEPS)[number]);
  const tomorrow = new Date(Date.now() + po.supplier.leadTimeDays * 86_400_000).toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        back={isSupplier ? { href: "/supplier", label: tx("Orders", "الطلبات") } : { href: "/procurement", label: tx("Purchasing", "المشتريات") }}
        title={`${po.number} · ${pickName(locale, po.supplier)}`}
        subtitle={`${tx("Deliver to", "التوصيل إلى")} ${pickName(locale, po.branch)} · ${label(locale, po.source)}`}
        action={<StatusBadge status={po.status} locale={locale} />}
      />

      {stepIndex >= 0 && (
        <ol className="mb-6 grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <div className={clsx("h-1.5 rounded-full", i <= stepIndex ? "bg-plum" : "bg-line")} />
              <p className={clsx("mt-2 text-xs", i <= stepIndex ? "font-medium text-plum" : "text-metal")}>{label(locale, s)}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <div className="p-5">
              <KeyValue
                items={[
                  { label: tx("Order total", "إجمالي الطلب"), value: <span className="num">{sar(po.total, locale, 2)}</span> },
                  { label: tx("Raised by", "أنشأه"), value: creator ? pickName(locale, creator) : "—" },
                  { label: tx("Approved by", "وافق عليه"), value: approver ? pickName(locale, approver) : po.status === "PENDING_APPROVAL" ? tx("Waiting", "بالانتظار") : tx("Within limit", "ضمن الحد") },
                  { label: tx("Created", "تاريخ الإنشاء"), value: date(po.createdAt, locale) },
                  { label: tx("Expected delivery", "التوصيل المتوقع"), value: date(po.expectedDate, locale) },
                  { label: tx("Received", "تاريخ الاستلام"), value: date(po.receivedAt, locale) },
                ]}
              />
              {po.note && <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-sm text-ink-soft">{po.note}</p>}
            </div>
          </Card>

          {actions.includes("RECEIVE") ? (
            <Card title={tx("Receive delivery", "استلام الطلب")}>
              <ActionForm action={receiveAction}>
                <input type="hidden" name="poId" value={po.id} />
                <p className="px-5 pt-4 text-sm text-metal">
                  {tx(
                    "Enter what actually arrived and the price on the invoice. Short deliveries and price increases above 2% are flagged.",
                    "أدخل ما وصل فعلاً والسعر في الفاتورة. يتم رصد النقص وزيادة الأسعار فوق 2%.",
                  )}
                </p>
                <TableWrap>
                  <table className="table-base mt-2">
                    <thead>
                      <tr>
                        <th>{tx("Item", "الصنف")}</th>
                        <th className="text-end">{tx("Ordered", "المطلوب")}</th>
                        <th className="text-end">{tx("Agreed price", "السعر المتفق")}</th>
                        <th className="text-end">{tx("Received qty", "الكمية المستلمة")}</th>
                        <th className="text-end">{tx("Invoice price", "سعر الفاتورة")}</th>
                      </tr>
                    </thead>
                    <tbody className="num">
                      {po.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="font-medium">{pickName(locale, l.item)}</td>
                          <td className="text-end">{num(l.qty, locale)} {label(locale, l.item.unit)}</td>
                          <td className="text-end">{sar(l.unitPrice, locale, 2)}</td>
                          <td className="text-end"><input name={`rq_${l.id}`} type="number" step="any" min="0" defaultValue={l.qty} className="input-sm" aria-label={`${l.item.name} received`} /></td>
                          <td className="text-end"><input name={`rp_${l.id}`} type="number" step="0.01" min="0.01" defaultValue={l.unitPrice} className="input-sm" aria-label={`${l.item.name} price`} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
                <div className="flex flex-wrap items-end gap-3 border-t border-line p-5">
                  <div className="min-w-[240px] flex-1">
                    <label className="label">{tx("Note (optional)", "ملاحظة (اختياري)")}</label>
                    <input name="note" className="input" placeholder={tx("e.g. two crates of tomatoes were bruised", "مثال: صندوقان من الطماطم تالفان")} />
                  </div>
                  <SubmitButton className="btn-primary" pendingLabel={tx("Posting…", "جارٍ الترحيل…")}>{tx("Post goods receipt", "ترحيل الاستلام")}</SubmitButton>
                </div>
              </ActionForm>
            </Card>
          ) : (
            <Card title={tx("Lines", "البنود")}>
              <TableWrap>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>{tx("Item", "الصنف")}</th>
                      <th className="text-end">{tx("Qty", "الكمية")}</th>
                      <th className="text-end">{tx("Price", "السعر")}</th>
                      {received && <th className="text-end">{tx("Received", "المستلم")}</th>}
                      {received && <th className="text-end">{tx("Invoiced", "المفوتر")}</th>}
                      <th className="text-end">{tx("Line total", "الإجمالي")}</th>
                      {received && <th>{tx("Check", "الفحص")}</th>}
                    </tr>
                  </thead>
                  <tbody className="num">
                    {po.lines.map((l) => {
                      const f = received ? receiptFlags({ qty: l.qty, unitPrice: l.unitPrice, receivedQty: l.receivedQty ?? l.qty, receivedPrice: l.receivedPrice ?? l.unitPrice }) : null;
                      return (
                        <tr key={l.id}>
                          <td className="font-medium">{pickName(locale, l.item)}</td>
                          <td className="text-end">{num(l.qty, locale)} {label(locale, l.item.unit)}</td>
                          <td className="text-end">{sar(l.unitPrice, locale, 2)}</td>
                          {received && <td className={clsx("text-end", f?.short && "text-danger")}>{num(l.receivedQty ?? 0, locale)}</td>}
                          {received && <td className={clsx("text-end", f?.priceUp && "text-danger")}>{sar(l.receivedPrice ?? 0, locale, 2)}</td>}
                          <td className="text-end">{sar((l.receivedQty ?? l.qty) * (l.receivedPrice ?? l.unitPrice), locale, 2)}</td>
                          {received && (
                            <td className="space-x-1">
                              {f?.short && <Badge tone="danger">{tx("Short", "نقص")}</Badge>}
                              {f?.over && <Badge tone="warning">{tx("Over", "زيادة")}</Badge>}
                              {f?.priceUp && <Badge tone="danger">{tx("Price up", "سعر أعلى")}</Badge>}
                              {!f?.short && !f?.over && !f?.priceUp && <Badge tone="success">OK</Badge>}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {actions.some((a) => a !== "RECEIVE") && (
            <Card title={tx("Actions", "الإجراءات")}>
              <div className="space-y-4 p-5">
                {actions.includes("APPROVE") && (
                  <ActionForm action={poAction} className="space-y-3">
                    <input type="hidden" name="poId" value={po.id} />
                    <textarea name="note" rows={2} className="input" placeholder={tx("Comment (required to reject)", "تعليق (مطلوب للرفض)")} />
                    <div className="flex gap-2">
                      <SubmitButton name="action" value="APPROVE" className="btn-primary flex-1">{tx("Approve and send", "موافقة وإرسال")}</SubmitButton>
                      <SubmitButton name="action" value="REJECT" className="btn-danger">{tx("Reject", "رفض")}</SubmitButton>
                    </div>
                  </ActionForm>
                )}
                {po.status === "PENDING_APPROVAL" && !actions.includes("APPROVE") && !isSupplier && (
                  <p className="rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">
                    {user.role === "PURCHASER"
                      ? tx("You raised this order, so another approver must sign it off.", "أنت من أنشأ هذا الطلب، لذا يجب أن يوافق عليه مسؤول آخر.")
                      : tx("Waiting for purchasing or the owner to approve.", "بانتظار موافقة المشتريات أو المالك.")}
                  </p>
                )}
                {actions.includes("CONFIRM") && (
                  <ActionForm action={poAction} className="space-y-3">
                    <input type="hidden" name="poId" value={po.id} />
                    <input type="hidden" name="action" value="CONFIRM" />
                    <div>
                      <label className="label">{tx("Delivery date", "تاريخ التوصيل")}</label>
                      <input type="date" name="expectedDate" defaultValue={po.expectedDate?.toISOString().slice(0, 10) ?? tomorrow} className="input" />
                    </div>
                    <SubmitButton className="btn-primary w-full">{tx("Confirm order", "تأكيد الطلب")}</SubmitButton>
                  </ActionForm>
                )}
                {actions.includes("SHIP") && (
                  <ActionForm action={poAction}>
                    <input type="hidden" name="poId" value={po.id} />
                    <SubmitButton name="action" value="SHIP" className="btn-orange w-full">{tx("Mark as out for delivery", "تحديد كقيد التوصيل")}</SubmitButton>
                  </ActionForm>
                )}
                {actions.includes("CANCEL") && (
                  <ActionForm action={poAction}>
                    <input type="hidden" name="poId" value={po.id} />
                    <SubmitButton name="action" value="CANCEL" className="btn-ghost w-full text-danger">{tx("Cancel order", "إلغاء الطلب")}</SubmitButton>
                  </ActionForm>
                )}
              </div>
            </Card>
          )}
          <Card title={tx("Timeline", "السجل الزمني")}>
            <div className="p-5">
              <Timeline events={events} locale={locale} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
