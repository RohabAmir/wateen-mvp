import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { date, sar } from "@/lib/format";
import { branchIdsFor } from "@/server/access";
import { Card, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { createCountAction } from "@/app/actions/ops";

export const metadata = { title: "Stock counts" };

export default async function CountsPage() {
  const user = await requireUser(["OWNER", "MANAGER"]);
  const { locale, tx } = await getI18n();
  const ids = await branchIdsFor(user);
  const [branches, counts] = await Promise.all([
    db.branch.findMany({ where: { id: { in: ids } }, orderBy: { code: "desc" } }),
    db.stockCount.findMany({ where: { branchId: { in: ids } }, include: { branch: true, lines: true }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return (
    <>
      <PageHeader
        title={tx("Stock counts", "الجرد")}
        subtitle={tx(
          "Counting is how variance is found: the gap between what recipes say was used and what is really left.",
          "الجرد هو طريقة كشف الفروقات: الفرق بين ما تقوله الوصفات وما تبقى فعلاً.",
        )}
        action={
          <form action={createCountAction} className="flex gap-2">
            <select name="branchId" className="input" defaultValue={user.branchId ?? branches[0]?.id}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{pickName(locale, b)}</option>
              ))}
            </select>
            <button className="btn-primary">{tx("Start a count", "بدء جرد")}</button>
          </form>
        }
      />
      <Card>
        <TableWrap>
          <table className="table-base">
            <thead>
              <tr>
                <th>{tx("Count", "الجرد")}</th>
                <th>{tx("Branch", "الفرع")}</th>
                <th>{tx("Started", "البداية")}</th>
                <th className="text-end">{tx("Items", "الأصناف")}</th>
                <th className="text-end">{tx("Net variance", "صافي الفرق")}</th>
                <th>{tx("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody className="num">
              {counts.map((c) => {
                const net = c.lines.reduce((s, l) => s + (l.countedQty === null ? 0 : (l.countedQty - l.expectedQty) * l.unitCost), 0);
                return (
                  <tr key={c.id}>
                    <td><Link href={`/counts/${c.id}`} className="font-medium text-plum hover:underline">{c.number}</Link></td>
                    <td>{pickName(locale, c.branch)}</td>
                    <td>{date(c.createdAt, locale)}</td>
                    <td className="text-end">{c.lines.length}</td>
                    <td className={`text-end font-medium ${net < -1 ? "text-danger" : net > 1 ? "text-success-dark" : ""}`}>{sar(net, locale)}</td>
                    <td><StatusBadge status={c.status} locale={locale} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </>
  );
}
