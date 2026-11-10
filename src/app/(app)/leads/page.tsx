import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { Card, PageHeader, Stat, StatusBadge, TableWrap } from "@/components/ui";
import { leadStatusAction } from "@/app/actions/ops";

export const metadata = { title: "Demo requests" };

export default async function LeadsPage() {
  await requireUser(["ADMIN"]);
  const { locale, tx } = await getI18n();
  const [leads, orgs, suppliers, orders] = await Promise.all([
    db.lead.findMany({ orderBy: { createdAt: "desc" } }),
    db.organization.count(),
    db.supplier.count(),
    db.purchaseOrder.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
  ]);
  const branches = leads.reduce((s, l) => s + l.branches, 0);

  return (
    <>
      <PageHeader title={tx("Demo requests", "طلبات العروض التوضيحية")} subtitle={tx("Leads from the Book a demo form on the marketing site.", "العملاء المحتملون من نموذج حجز العرض في الموقع.")} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="plum" label={tx("Open leads", "عملاء جدد")} value={String(leads.filter((l) => l.status === "NEW").length)} />
        <Stat label={tx("Branches in pipeline", "فروع في المسار")} value={String(branches)} />
        <Stat label={tx("Customers and suppliers live", "العملاء والموردون")} value={`${orgs} / ${suppliers}`} />
        <Stat tone="orange" label={tx("Orders through the platform, 30 days", "الطلبات عبر المنصة، 30 يوماً")} value={String(orders)} />
      </div>
      <Card>
        <TableWrap>
          <table className="table-base">
            <thead>
              <tr>
                <th>{tx("Contact", "جهة الاتصال")}</th>
                <th>{tx("Business", "النشاط")}</th>
                <th className="text-end">{tx("Branches", "الفروع")}</th>
                <th>{tx("Message", "الرسالة")}</th>
                <th>{tx("Received", "الوصول")}</th>
                <th>{tx("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-metal" dir="ltr">{l.email} · {l.phone}</p>
                  </td>
                  <td>{l.company}<span className="block text-xs text-metal">{l.segment}</span></td>
                  <td className="num text-end">{l.branches}</td>
                  <td className="max-w-xs text-sm text-ink-soft">{l.message ?? "—"}</td>
                  <td className="whitespace-nowrap">{dateTime(l.createdAt, locale)}</td>
                  <td>
                    <form action={leadStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={l.id} />
                      <StatusBadge status={l.status} locale={locale} />
                      <select name="status" defaultValue={l.status} className="rounded-lg border border-line px-2 py-1 text-xs">
                        <option value="NEW">{tx("New", "جديد")}</option>
                        <option value="CONTACTED">{tx("Contacted", "تم التواصل")}</option>
                        <option value="QUALIFIED">{tx("Qualified", "مؤهل")}</option>
                      </select>
                      <button className="text-xs text-plum hover:underline">{tx("Save", "حفظ")}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </>
  );
}
