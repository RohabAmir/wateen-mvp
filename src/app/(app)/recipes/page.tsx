import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { num, pct, sar } from "@/lib/format";
import { priceForTarget, recipeCost } from "@/lib/costing";
import { TARGET_FOOD_COST } from "@/lib/insights";
import { Badge, Card, PageHeader, ProgressBar } from "@/components/ui";

export const metadata = { title: "Recipes and costing" };

export default async function RecipesPage() {
  const user = await requireUser(["OWNER", "MANAGER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const menu = await db.menuItem.findMany({ where: { orgId: user.orgId! }, include: { lines: { include: { item: true } } }, orderBy: { code: "asc" } });

  return (
    <>
      <PageHeader
        title={tx("Recipes and plate costing", "الوصفات وتكلفة الأطباق")}
        subtitle={tx(
          `Plate cost uses the latest weighted average purchase price of every ingredient. Target food cost is ${TARGET_FOOD_COST}%.`,
          `تكلفة الطبق تعتمد على أحدث متوسط مرجح لسعر شراء كل مكوّن. هدف تكلفة الطعام ${TARGET_FOOD_COST}%.`,
        )}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {menu.map((m) => {
          const cost = recipeCost(m.lines.map((l) => ({ qty: l.qty, unitCost: l.item.avgCost })));
          const fc = (cost / m.price) * 100;
          const calories = Math.round(m.lines.reduce((s, l) => s + (l.item.calories ?? 0) * l.qty, 0));
          const allergens = [...new Set(m.lines.flatMap((l) => l.item.allergens))];
          const over = fc > TARGET_FOOD_COST + 3;
          return (
            <Card key={m.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{pickName(locale, m)}</p>
                      <p className="text-xs text-metal">{m.code} · {label(locale, m.category)} · {calories} {tx("kcal", "سعرة")}</p>
                    </div>
                    <div className="text-end">
                      <p className="num font-bold">{sar(m.price, locale)}</p>
                      <p className="num text-xs text-metal">{tx("Cost", "التكلفة")} {sar(cost, locale, 2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1"><ProgressBar value={fc * 2} tone={over ? "danger" : fc > TARGET_FOOD_COST ? "orange" : "success"} /></div>
                    <span className={`num text-sm font-medium ${over ? "text-danger" : ""}`}>{pct(fc, locale)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allergens.map((a) => <Badge key={a} tone="warning">{a}</Badge>)}
                    {over && <Badge tone="danger">{tx(`Price for target: ${sar(priceForTarget(cost, TARGET_FOOD_COST))}`, `السعر المستهدف: ${sar(priceForTarget(cost, TARGET_FOOD_COST), "ar")}`)}</Badge>}
                    <span className="ms-auto text-xs text-plum group-open:hidden">{tx("Show recipe", "عرض الوصفة")}</span>
                  </div>
                </summary>
                <table className="table-base border-t border-line">
                  <thead>
                    <tr>
                      <th>{tx("Ingredient", "المكوّن")}</th>
                      <th className="text-end">{tx("Qty", "الكمية")}</th>
                      <th className="text-end">{tx("Unit cost", "تكلفة الوحدة")}</th>
                      <th className="text-end">{tx("Line cost", "التكلفة")}</th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    {m.lines.map((l) => (
                      <tr key={l.id}>
                        <td>{pickName(locale, l.item)}</td>
                        <td className="text-end">{num(l.qty, locale, 3)} {label(locale, l.item.unit)}</td>
                        <td className="text-end">{sar(l.item.avgCost, locale, 2)}</td>
                        <td className="text-end">{sar(l.qty * l.item.avgCost, locale, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </Card>
          );
        })}
      </div>
    </>
  );
}
