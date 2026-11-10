import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { pct, sar } from "@/lib/format";
import { supplierScores } from "@/server/suppliers";
import { Badge, Card, PageHeader, TableWrap } from "@/components/ui";

export const metadata = { title: "Marketplace" };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser(["OWNER", "MANAGER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const q = (await searchParams).q?.trim();
  const [suppliers, scores, offers] = await Promise.all([
    db.supplier.findMany({ include: { _count: { select: { catalog: true } } }, orderBy: { name: "asc" } }),
    supplierScores(),
    q
      ? db.catalogItem.findMany({
          where: { item: { orgId: user.orgId!, OR: [{ name: { contains: q, mode: "insensitive" } }, { nameAr: { contains: q } }, { category: { contains: q, mode: "insensitive" } }] } },
          include: { item: true, supplier: true },
          orderBy: [{ item: { name: "asc" } }, { price: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  const cheapest = new Map<string, number>();
  for (const o of offers) cheapest.set(o.itemId, Math.min(cheapest.get(o.itemId) ?? Infinity, o.price));

  return (
    <>
      <PageHeader
        title={tx("Supplier marketplace", "سوق الموردين")}
        subtitle={tx("Order directly from supplier catalogues, compare prices and see each supplier's delivery record.", "اطلب مباشرة من كتالوجات الموردين، وقارن الأسعار، وشاهد سجل التوصيل لكل مورد.")}
      />
      <form className="mb-6 flex gap-2">
        <input name="q" defaultValue={q} className="input max-w-md" placeholder={tx("Compare prices: chicken, shrimp, produce…", "قارن الأسعار: دجاج، روبيان، خضار…")} />
        <button className="btn-primary">{tx("Search", "بحث")}</button>
      </form>

      {q && (
        <Card className="mb-6" title={tx(`Offers for "${q}"`, `العروض لـ "${q}"`)}>
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>{tx("Item", "الصنف")}</th>
                  <th>{tx("Supplier", "المورد")}</th>
                  <th className="text-end">{tx("Price", "السعر")}</th>
                  <th className="text-end">{tx("Pack", "العبوة")}</th>
                  <th className="text-end">{tx("Lead time", "مدة التوريد")}</th>
                  <th className="text-end">{tx("Score", "التقييم")}</th>
                  <th />
                </tr>
              </thead>
              <tbody className="num">
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium">{pickName(locale, o.item)}</td>
                    <td>{pickName(locale, o.supplier)}</td>
                    <td className="text-end">
                      {sar(o.price, locale, 2)}/{label(locale, o.item.unit)}{" "}
                      {o.price === cheapest.get(o.itemId) && offers.filter((x) => x.itemId === o.itemId).length > 1 && <Badge tone="success">{tx("Best price", "أفضل سعر")}</Badge>}
                    </td>
                    <td className="text-end">{o.packSize} {label(locale, o.item.unit)}</td>
                    <td className="text-end">{o.supplier.leadTimeDays} {tx("days", "أيام")}</td>
                    <td className="text-end">{scores.get(o.supplierId)?.score ?? "—"}</td>
                    <td><Link href={`/marketplace/${o.supplierId}`} className="text-plum hover:underline">{tx("Order", "اطلب")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((s) => {
          const sc = scores.get(s.id);
          return (
            <Link key={s.id} href={`/marketplace/${s.id}`} className="card flex flex-col p-5 transition hover:border-plum/30 hover:shadow-lg hover:shadow-plum/5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mist font-bold text-plum">{s.name.charAt(0)}</span>
                <div className="min-w-0">
                  <p className="font-bold text-ink">{pickName(locale, s)}</p>
                  <p className="text-sm text-metal">{locale === "ar" ? s.categoryAr : s.category} · {s.city}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-canvas p-2">
                  <p className="num text-base font-bold text-ink">{sc ? sc.score : "—"}</p>
                  <p className="text-metal">{tx("Score", "التقييم")}</p>
                </div>
                <div className="rounded-lg bg-canvas p-2">
                  <p className="num text-base font-bold text-ink">{sc ? pct(sc.onTimePct, locale, 0) : "—"}</p>
                  <p className="text-metal">{tx("On time", "بالوقت")}</p>
                </div>
                <div className="rounded-lg bg-canvas p-2">
                  <p className="num text-base font-bold text-ink">{s.leadTimeDays}</p>
                  <p className="text-metal">{tx("Days lead", "أيام التوريد")}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-metal">
                {tx(`${s._count.catalog} products · minimum ${sar(s.minOrder)}`, `${s._count.catalog} منتج · الحد الأدنى ${sar(s.minOrder, "ar")}`)}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
