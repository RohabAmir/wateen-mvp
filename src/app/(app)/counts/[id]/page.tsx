import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { dateTime, num, sar } from "@/lib/format";
import { branchIdsFor } from "@/server/access";
import { Badge, Card, PageHeader, StatusBadge, TableWrap, Timeline } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { countAction } from "@/app/actions/ops";

export const metadata = { title: "Stock count" };

export default async function CountPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["OWNER", "MANAGER"]);
  const { locale, tx } = await getI18n();
  const { id } = await params;
  const count = await db.stockCount.findUnique({
    where: { id },
    include: { branch: true, lines: { include: { item: true }, orderBy: [{ item: { category: "asc" } }, { item: { name: "asc" } }] } },
  });
  if (!count || !(await branchIdsFor(user)).includes(count.branchId)) notFound();
  const events = await db.auditLog.findMany({ where: { entity: "COUNT", entityId: id }, orderBy: { createdAt: "asc" } });
  const draft = count.status === "DRAFT";
  const net = count.lines.reduce((s, l) => s + (l.countedQty === null ? 0 : (l.countedQty - l.expectedQty) * l.unitCost), 0);

  return (
    <>
      <PageHeader
        back={{ href: "/counts", label: tx("Stock counts", "الجرد") }}
        title={`${count.number} · ${pickName(locale, count.branch)}`}
        subtitle={
          draft
            ? tx("Enter what is physically on the shelf. Leave a line empty to skip it.", "أدخل الكمية الموجودة فعلاً على الرف. اترك السطر فارغاً لتخطيه.")
            : tx(`Posted ${dateTime(count.postedAt, "en")}. Net variance ${sar(net, "en")}.`, `رُحّل ${dateTime(count.postedAt, "ar")}. صافي الفرق ${sar(net, "ar")}.`)
        }
        action={<StatusBadge status={count.status} locale={locale} />}
      />
      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="xl:col-span-3">
          <ActionForm action={countAction}>
            <input type="hidden" name="countId" value={count.id} />
            <TableWrap>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>{tx("Item", "الصنف")}</th>
                    <th className="text-end">{tx("System qty", "كمية النظام")}</th>
                    <th className="text-end">{tx("Counted", "المعدود")}</th>
                    <th className="text-end">{tx("Difference", "الفرق")}</th>
                    <th className="text-end">{tx("Value", "القيمة")}</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {count.lines.map((l) => {
                    const diff = l.countedQty === null ? null : l.countedQty - l.expectedQty;
                    return (
                      <tr key={l.id}>
                        <td>
                          <span className="font-medium">{pickName(locale, l.item)}</span>{" "}
                          {l.item.highValue && <Badge tone="orange">{tx("High value", "عالي القيمة")}</Badge>}
                          <span className="block text-xs text-metal">{label(locale, l.item.category)}</span>
                        </td>
                        <td className="text-end text-metal">{num(l.expectedQty, locale, 2)} {label(locale, l.item.unit)}</td>
                        <td className="text-end">
                          {draft ? (
                            <input name={`line_${l.id}`} type="number" step="0.01" min="0" defaultValue={l.countedQty ?? ""} className="input-sm" aria-label={l.item.name} />
                          ) : (
                            num(l.countedQty ?? 0, locale, 2)
                          )}
                        </td>
                        <td className={`text-end ${diff !== null && diff < 0 ? "text-danger" : ""}`}>{diff === null ? "—" : num(diff, locale, 2)}</td>
                        <td className={`text-end ${diff !== null && diff < 0 ? "text-danger" : ""}`}>{diff === null ? "—" : sar(diff * l.unitCost, locale, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            {draft && (
              <div className="flex flex-wrap gap-2 border-t border-line p-4">
                <SubmitButton name="intent" value="save" className="btn-outline">{tx("Save progress", "حفظ التقدم")}</SubmitButton>
                <SubmitButton name="intent" value="post" className="btn-primary" pendingLabel={tx("Posting…", "جارٍ الترحيل…")}>
                  {tx("Post count and adjust stock", "ترحيل الجرد وتسوية المخزون")}
                </SubmitButton>
              </div>
            )}
          </ActionForm>
        </Card>
        <Card title={tx("History", "السجل")}>
          <div className="p-5">
            <Timeline events={events} locale={locale} />
          </div>
        </Card>
      </div>
    </>
  );
}
