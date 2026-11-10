import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { date, pct, sar } from "@/lib/format";
import { periodReport } from "@/server/reports";
import { getSuggestions } from "@/server/procurement";
import { BarChart, Card, PageHeader, Stat, StatusBadge, TableWrap } from "@/components/ui";
import { InsightList } from "@/components/InsightList";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser(["OWNER", "MANAGER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const [r, suggestions, openOrders] = await Promise.all([
    periodReport(user, { days: 30 }),
    getSuggestions(user),
    db.purchaseOrder.findMany({
      where: {
        orgId: user.orgId!,
        status: user.role === "MANAGER" ? { in: ["SENT", "CONFIRMED", "SHIPPED"] } : "PENDING_APPROVAL",
        ...(user.role === "MANAGER" ? { branchId: user.branchId! } : {}),
      },
      include: { supplier: true, branch: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const s = r.summary;
  const gap = s.actualPct - s.theoreticalPct;
  const suggestionLines = suggestions.reduce((n, g) => n + g.lines.length, 0);

  return (
    <>
      <PageHeader
        title={tx(`Welcome back, ${user.name.split(" ")[0]}`, `مرحباً ${user.nameAr.split(" ")[0]}`)}
        subtitle={tx("Last 30 days across", "آخر 30 يوماً في") + " " + r.branches.map((b) => pickName(locale, b)).join(locale === "ar" ? "، " : ", ")}
        action={
          <div className="flex flex-wrap gap-2">
            {user.role !== "PURCHASER" && <Link href="/sales" className="btn-outline">{tx("Import POS sales", "استيراد المبيعات")}</Link>}
            <Link href="/procurement" className="btn-primary">
              {tx("Smart reorder", "الطلب الذكي")}
              {suggestionLines > 0 && <span className="rounded-full bg-orange px-2 text-xs">{suggestionLines}</span>}
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="plum" label={tx("Revenue", "الإيرادات")} value={sar(s.revenue, locale)} hint={tx(`${r.days} days of POS sales`, `مبيعات ${r.days} يوماً`)} />
        <Stat
          label={tx("Actual food cost", "تكلفة الطعام الفعلية")}
          value={pct(s.actualPct, locale)}
          hint={tx(`Recipes say ${pct(s.theoreticalPct)}. Gap ${pct(gap)}`, `حسب الوصفات ${pct(s.theoreticalPct, "ar")}. الفرق ${pct(gap, "ar")}`)}
        />
        <Stat tone="danger" label={tx("Unexplained stock loss", "خسائر مخزون غير مبررة")} value={sar(s.varianceCost, locale)} hint={tx("Found by stock counts", "كشفها الجرد")} />
        <Stat tone="orange" label={tx("Recorded waste", "الهدر المسجل")} value={sar(s.wasteCost, locale)} hint={tx(`${r.lowStock} items below reorder point`, `${r.lowStock} صنف تحت حد الطلب`)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3" title={tx("Insights ranked by money at stake", "رؤى مرتبة حسب المبلغ المعرض للخطر")} action={<Link href="/reports" className="text-sm text-plum hover:underline">{tx("All reports", "كل التقارير")}</Link>}>
          <InsightList insights={r.insights} locale={locale} limit={6} />
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card title={tx("Daily revenue and actual food cost", "الإيرادات اليومية وتكلفة الطعام الفعلية")}>
            <div className="p-5">
              <BarChart
                data={r.daily.map((d) => ({ key: d.day, label: date(d.day, locale).replace(/ \d{4}$/, ""), value: d.revenue, secondary: d.actualCost }))}
                format={(n) => sar(n, locale)}
              />
              <div className="mt-3 flex gap-4 text-xs text-metal">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-plum/85" />{tx("Revenue", "الإيرادات")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange/80" />{tx("Food cost", "تكلفة الطعام")}</span>
              </div>
            </div>
          </Card>

          <Card
            title={user.role === "MANAGER" ? tx("Deliveries on the way", "طلبات في الطريق") : tx("Waiting for approval", "بانتظار الموافقة")}
            action={<Link href="/procurement" className="text-sm text-plum hover:underline">{tx("Open", "فتح")}</Link>}
          >
            {openOrders.length === 0 ? (
              <p className="px-5 py-6 text-sm text-metal">{tx("Nothing waiting.", "لا شيء بالانتظار.")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {openOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/procurement/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{pickName(locale, o.supplier)}</span>
                        <span className="text-xs text-metal">{o.number} · {pickName(locale, o.branch)}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="num text-sm font-medium">{sar(o.total, locale)}</span>
                        <StatusBadge status={o.status} locale={locale} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {r.branchSummaries.length > 1 && (
        <Card className="mt-6" title={tx("Branch comparison", "مقارنة الفروع")}>
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>{tx("Branch", "الفرع")}</th>
                  <th className="text-end">{tx("Revenue", "الإيرادات")}</th>
                  <th className="text-end">{tx("Theoretical", "النظرية")}</th>
                  <th className="text-end">{tx("Actual", "الفعلية")}</th>
                  <th className="text-end">{tx("Waste", "الهدر")}</th>
                  <th className="text-end">{tx("Unexplained loss", "خسائر غير مبررة")}</th>
                </tr>
              </thead>
              <tbody className="num">
                {r.branchSummaries.map((b) => (
                  <tr key={b.branch.id}>
                    <td className="font-medium">{pickName(locale, b.branch)}</td>
                    <td className="text-end">{sar(b.revenue, locale)}</td>
                    <td className="text-end">{pct(b.theoreticalPct, locale)}</td>
                    <td className={`text-end font-medium ${b.actualPct - b.theoreticalPct > 2 ? "text-danger" : ""}`}>{pct(b.actualPct, locale)}</td>
                    <td className="text-end">{sar(b.wasteCost, locale)}</td>
                    <td className="text-end">{sar(b.varianceCost, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
