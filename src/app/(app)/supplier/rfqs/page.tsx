import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { date, num, sar } from "@/lib/format";
import { supplierRfqs } from "@/server/marketplace";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { quoteAction } from "@/app/actions/ops";

export const metadata = { title: "Requests for quote" };

export default async function SupplierRfqsPage() {
  const user = await requireUser(["SUPPLIER"]);
  const { locale, tx } = await getI18n();
  const rfqs = await supplierRfqs(user);

  return (
    <>
      <PageHeader title={tx("Requests for quote", "طلبات عروض الأسعار")} subtitle={tx("Restaurants asking for prices on products you sell. The lowest reliable quote usually wins.", "مطاعم تطلب أسعاراً لمنتجات تبيعها. العرض الأقل والموثوق يفوز عادةً.")} />
      {rfqs.length === 0 ? (
        <Card><EmptyState title={tx("No requests right now", "لا توجد طلبات حالياً")} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rfqs.map((r) => {
            const mine = r.quotes[0];
            const open = r.status === "OPEN" && r.dueDate > new Date();
            return (
              <Card key={r.id}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{r.number} · {pickName(locale, r.item)}</p>
                      <p className="text-sm text-metal">
                        {pickName(locale, r.org)} · {pickName(locale, r.branch)} · {num(r.qty, locale)} {label(locale, r.item.unit)} · {tx("due", "الموعد")} {date(r.dueDate, locale)}
                      </p>
                    </div>
                    <StatusBadge status={mine?.status ?? r.status} locale={locale} />
                  </div>
                  {r.note && <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-sm text-ink-soft">{r.note}</p>}
                  {mine && <p className="mt-3 text-sm">{tx("Your quote", "عرضك")}: <span className="num font-medium">{sar(mine.unitPrice, locale, 2)}</span> · {mine.leadTimeDays} {tx("days", "أيام")}</p>}
                  {open && (
                    <ActionForm action={quoteAction} className="mt-4 grid grid-cols-2 gap-3">
                      <input type="hidden" name="rfqId" value={r.id} />
                      <div>
                        <label className="label">{tx(`Unit price (SAR/${r.item.unit})`, `سعر الوحدة (ريال/${label("ar", r.item.unit)})`)}</label>
                        <input name="unitPrice" type="number" step="0.01" min="0.01" required defaultValue={mine?.unitPrice} className="input" />
                      </div>
                      <div>
                        <label className="label">{tx("Lead time (days)", "مدة التوريد (أيام)")}</label>
                        <input name="leadTimeDays" type="number" min="0" max="30" required defaultValue={mine?.leadTimeDays ?? 2} className="input" />
                      </div>
                      <div className="col-span-2">
                        <input name="note" className="input" placeholder={tx("Terms (optional)", "الشروط (اختياري)")} defaultValue={mine?.note ?? ""} />
                      </div>
                      <div className="col-span-2">
                        <SubmitButton className="btn-primary w-full">{mine ? tx("Update quote", "تحديث العرض") : tx("Submit quote", "تقديم العرض")}</SubmitButton>
                      </div>
                    </ActionForm>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
