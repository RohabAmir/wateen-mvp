import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { dateTime, sar } from "@/lib/format";
import { branchIdsFor } from "@/server/access";
import { Card, PageHeader, TableWrap } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { importSalesAction } from "@/app/actions/ops";

export const metadata = { title: "POS sales" };

export default async function SalesPage() {
  const user = await requireUser(["OWNER", "MANAGER"]);
  const { locale, tx } = await getI18n();
  const ids = await branchIdsFor(user);
  const [branches, menu, batches] = await Promise.all([
    db.branch.findMany({ where: { id: { in: ids } }, orderBy: { code: "desc" } }),
    db.menuItem.findMany({ where: { orgId: user.orgId! }, orderBy: { code: "asc" } }),
    db.sale.groupBy({
      by: ["batch", "branchId"],
      where: { branchId: { in: ids } },
      _sum: { revenue: true, cost: true, qty: true },
      _max: { soldAt: true },
      orderBy: { _max: { soldAt: "desc" } },
      take: 10,
    }),
  ]);
  const branchName = new Map(branches.map((b) => [b.id, pickName(locale, b)]));

  return (
    <>
      <PageHeader
        title={tx("POS sales import", "استيراد مبيعات نقاط البيع")}
        subtitle={tx(
          "Every menu item sold deducts its recipe ingredients from branch stock. This is what drives theoretical food cost and smart reorders.",
          "كل صنف مباع يخصم مكونات وصفته من مخزون الفرع، وهذا ما يحرك تكلفة الطعام النظرية والطلب الذكي.",
        )}
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" title={tx("Import a sales batch", "استيراد دفعة مبيعات")}>
          <ActionForm action={importSalesAction} className="space-y-4 p-5">
            <div>
              <label className="label">{tx("Branch", "الفرع")}</label>
              <select name="branchId" className="input" defaultValue={user.branchId ?? branches[0]?.id}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{pickName(locale, b)}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl bg-mist p-4">
              <p className="font-medium text-plum">{tx("Simulate today's POS export", "محاكاة ملف نقاط البيع لليوم")}</p>
              <p className="mt-1 text-sm text-ink-soft">{tx("Loads a typical day of sales for this branch, about 450 covers.", "يُحمّل مبيعات يوم نموذجي لهذا الفرع، حوالي 450 طلباً.")}</p>
              <SubmitButton name="mode" value="sample" className="btn-orange mt-3" pendingLabel={tx("Importing…", "جارٍ الاستيراد…")}>
                {tx("Import today's sales", "استيراد مبيعات اليوم")}
              </SubmitButton>
            </div>
            <div>
              <label className="label">{tx("Or paste a POS export (menu code, quantity per line)", "أو الصق ملف نقاط البيع (رمز الصنف، الكمية في كل سطر)")}</label>
              <textarea name="csv" rows={6} className="input font-mono" dir="ltr" placeholder={"M01,72\nM02,48\nM12,47"} />
            </div>
            <SubmitButton name="mode" value="csv" className="btn-primary" pendingLabel={tx("Importing…", "جارٍ الاستيراد…")}>
              {tx("Import pasted lines", "استيراد الأسطر")}
            </SubmitButton>
          </ActionForm>
        </Card>
        <Card className="lg:col-span-2" title={tx("Menu codes", "رموز الأصناف")}>
          <ul className="divide-y divide-line text-sm">
            {menu.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 px-5 py-2">
                <span><span className="font-mono text-metal">{m.code}</span> {pickName(locale, m)}</span>
                <span className="num text-metal">{sar(m.price, locale)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="mt-6" title={tx("Recent batches", "آخر الدفعات")}>
        <TableWrap>
          <table className="table-base">
            <thead>
              <tr>
                <th>{tx("Batch", "الدفعة")}</th>
                <th>{tx("Branch", "الفرع")}</th>
                <th>{tx("Imported", "وقت الاستيراد")}</th>
                <th className="text-end">{tx("Items sold", "الأصناف المباعة")}</th>
                <th className="text-end">{tx("Revenue", "الإيرادات")}</th>
                <th className="text-end">{tx("Recipe cost", "تكلفة الوصفات")}</th>
              </tr>
            </thead>
            <tbody className="num">
              {batches.map((b) => (
                <tr key={b.batch + b.branchId}>
                  <td className="font-mono text-xs">{b.batch}</td>
                  <td>{branchName.get(b.branchId)}</td>
                  <td>{dateTime(b._max.soldAt, locale)}</td>
                  <td className="text-end">{b._sum.qty}</td>
                  <td className="text-end">{sar(b._sum.revenue ?? 0, locale)}</td>
                  <td className="text-end">{sar(b._sum.cost ?? 0, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </>
  );
}
