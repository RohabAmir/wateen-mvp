import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { date, num, sar } from "@/lib/format";
import { branchIdsFor } from "@/server/access";
import { Card, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { rfqAction } from "@/app/actions/ops";

export const metadata = { title: "Requests for quote" };

export default async function RfqListPage() {
  const user = await requireUser(["OWNER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const ids = await branchIdsFor(user);
  const [rfqs, branches, items] = await Promise.all([
    db.rfq.findMany({ where: { orgId: user.orgId! }, include: { item: true, branch: true, quotes: true }, orderBy: { createdAt: "desc" } }),
    db.branch.findMany({ where: { id: { in: ids } }, orderBy: { code: "desc" } }),
    db.item.findMany({ where: { orgId: user.orgId! }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title={tx("Requests for quote", "طلبات عروض الأسعار")}
        subtitle={tx("Send one request to every supplier that carries the item, then award the best offer.", "أرسل طلباً واحداً لكل مورد يبيع الصنف، ثم اختر أفضل عرض.")}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>RFQ</th>
                  <th>{tx("Item", "الصنف")}</th>
                  <th className="text-end">{tx("Qty", "الكمية")}</th>
                  <th className="text-end">{tx("Quotes", "العروض")}</th>
                  <th className="text-end">{tx("Best", "الأفضل")}</th>
                  <th>{tx("Due", "الموعد")}</th>
                  <th>{tx("Status", "الحالة")}</th>
                </tr>
              </thead>
              <tbody className="num">
                {rfqs.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/rfq/${r.id}`} className="font-medium whitespace-nowrap text-plum hover:underline">{r.number}</Link></td>
                    <td>{pickName(locale, r.item)}<span className="block text-xs text-metal">{pickName(locale, r.branch)}</span></td>
                    <td className="text-end">{num(r.qty, locale)} {label(locale, r.item.unit)}</td>
                    <td className="text-end">{r.quotes.length}</td>
                    <td className="text-end">{r.quotes.length ? sar(Math.min(...r.quotes.map((q) => q.unitPrice)), locale, 2) : "—"}</td>
                    <td>{date(r.dueDate, locale)}</td>
                    <td><StatusBadge status={r.status} locale={locale} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
        <Card title={tx("New request", "طلب جديد")}>
          <ActionForm action={rfqAction} className="space-y-3 p-5">
            <div>
              <label className="label">{tx("Item", "الصنف")}</label>
              <select name="itemId" className="input">
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{pickName(locale, i)} ({label(locale, i.unit)})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{tx("Quantity", "الكمية")}</label>
                <input name="qty" type="number" min="1" step="any" required className="input" />
              </div>
              <div>
                <label className="label">{tx("Quotes due in (days)", "موعد العروض (أيام)")}</label>
                <input name="dueDays" type="number" min="1" max="30" defaultValue={3} className="input" />
              </div>
            </div>
            <div>
              <label className="label">{tx("Deliver to", "التوصيل إلى")}</label>
              <select name="branchId" className="input">
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{pickName(locale, b)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{tx("Terms", "الشروط")}</label>
              <textarea name="note" rows={2} className="input" placeholder={tx("e.g. price held for 30 days", "مثال: ثبات السعر لمدة 30 يوماً")} />
            </div>
            <SubmitButton className="btn-primary w-full">{tx("Send to suppliers", "إرسال للموردين")}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
