import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { num, sar } from "@/lib/format";
import { branchIdsFor } from "@/server/access";
import { stockOverview } from "@/server/reports";
import { Badge, Card, PageHeader, Stat, StatusBadge, TableWrap } from "@/components/ui";
import { BranchFilter } from "@/components/BranchFilter";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { transferAction, wasteAction } from "@/app/actions/ops";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ branch?: string; state?: string; q?: string }> }) {
  const user = await requireUser(["OWNER", "MANAGER", "PURCHASER"]);
  const { locale, tx } = await getI18n();
  const sp = await searchParams;
  const ids = await branchIdsFor(user);
  const branches = await db.branch.findMany({ where: { id: { in: ids } }, orderBy: { code: "desc" } });
  const branchId = sp.branch && ids.includes(sp.branch) ? sp.branch : undefined;
  const all = await stockOverview(user, { branchId });
  const q = sp.q?.trim().toLowerCase();
  const rows = all.filter(
    (r) => (!sp.state || (sp.state === "ATTENTION" ? r.state === "LOW" || r.state === "OUT" : r.state === sp.state)) && (!q || r.item.name.toLowerCase().includes(q) || r.item.nameAr.includes(q) || r.item.sku.toLowerCase() === q),
  );
  const items = [...new Map(all.map((r) => [r.itemId, r.item])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const canOperate = user.role !== "PURCHASER";
  const value = all.reduce((s, r) => s + r.value, 0);
  const attention = all.filter((r) => r.state === "LOW" || r.state === "OUT").length;
  const over = all.filter((r) => r.state === "OVER").length;

  return (
    <>
      <PageHeader title={tx("Inventory", "المخزون")} subtitle={tx("Live stock per branch, updated by every sale, delivery, transfer, waste entry and count.", "مخزون لحظي لكل فرع يتحدث مع كل بيع واستلام وتحويل وهدر وجرد.")} />
      <BranchFilter branches={branches} current={branchId} locale={locale} basePath="/inventory" params={{ state: sp.state, q: sp.q }} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="plum" label={tx("Stock value", "قيمة المخزون")} value={sar(value, locale)} />
        <Stat label={tx("Items tracked", "الأصناف المتتبعة")} value={String(all.length)} />
        <Stat tone={attention ? "danger" : "default"} label={tx("Below reorder point", "تحت حد الطلب")} value={String(attention)} />
        <Stat tone="orange" label={tx("Overstocked", "فائض")} value={String(over)} />
      </div>

      <Card className="mt-6">
        <form className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          {branchId && <input type="hidden" name="branch" value={branchId} />}
          <input name="q" defaultValue={sp.q} placeholder={tx("Search items", "ابحث عن صنف")} className="input max-w-xs" />
          <select name="state" defaultValue={sp.state ?? ""} className="input max-w-[220px]">
            <option value="">{tx("All statuses", "كل الحالات")}</option>
            <option value="ATTENTION">{tx("Needs attention", "يحتاج متابعة")}</option>
            <option value="OK">{label(locale, "OK")}</option>
            <option value="OVER">{label(locale, "OVER")}</option>
          </select>
          <button className="btn-outline">{tx("Filter", "تصفية")}</button>
        </form>
        <TableWrap>
          <table className="table-base">
            <thead>
              <tr>
                <th>{tx("Item", "الصنف")}</th>
                {!branchId && branches.length > 1 && <th>{tx("Branch", "الفرع")}</th>}
                <th className="text-end">{tx("On hand", "المتوفر")}</th>
                <th className="text-end">{tx("On order", "قيد الطلب")}</th>
                <th className="text-end">{tx("Reorder / par", "حد الطلب / الأعلى")}</th>
                <th className="text-end">{tx("Daily use", "الاستهلاك اليومي")}</th>
                <th className="text-end">{tx("Days left", "أيام متبقية")}</th>
                <th className="text-end">{tx("Avg cost", "متوسط التكلفة")}</th>
                <th className="text-end">{tx("Value", "القيمة")}</th>
                <th>{tx("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody className="num">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pickName(locale, r.item)}</span>
                      {r.item.highValue && <Badge tone="orange">{tx("High value", "عالي القيمة")}</Badge>}
                    </div>
                    <span className="text-xs text-metal">{r.item.sku} · {label(locale, r.item.category)}</span>
                  </td>
                  {!branchId && branches.length > 1 && <td>{pickName(locale, r.branch)}</td>}
                  <td className="text-end font-medium">{num(r.onHand, locale)} {label(locale, r.item.unit)}</td>
                  <td className="text-end text-metal">{r.onOrder ? num(r.onOrder, locale) : "—"}</td>
                  <td className="text-end text-metal">{num(r.reorderPoint, locale, 0)} / {num(r.parLevel, locale, 0)}</td>
                  <td className="text-end">{num(r.avgDaily, locale)}</td>
                  <td className={`text-end ${r.daysCover < 2 ? "font-medium text-danger" : ""}`}>{Number.isFinite(r.daysCover) ? num(r.daysCover, locale) : "∞"}</td>
                  <td className="text-end">{sar(r.item.avgCost, locale, 2)}</td>
                  <td className="text-end">{sar(r.value, locale)}</td>
                  <td><StatusBadge status={r.state} locale={locale} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {canOperate && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title={tx("Record waste", "تسجيل هدر")}>
            <ActionForm action={wasteAction} resetOnSuccess className="grid gap-3 p-5 sm:grid-cols-2">
              <BranchSelect name="branchId" branches={branches} locale={locale} defaultValue={branchId ?? user.branchId ?? branches[0]?.id} label={tx("Branch", "الفرع")} />
              <ItemSelect items={items} locale={locale} label={tx("Item", "الصنف")} />
              <div>
                <label className="label">{tx("Quantity", "الكمية")}</label>
                <input name="qty" type="number" step="0.01" min="0.01" required className="input" />
              </div>
              <div>
                <label className="label">{tx("Reason", "السبب")}</label>
                <select name="reason" className="input">
                  {[["Spoiled", "تالف"], ["Expired", "منتهي الصلاحية"], ["Dropped or burnt", "سقط أو احترق"], ["Customer return", "مرتجع من العميل"]].map(([en, ar]) => (
                    <option key={en} value={en}>{locale === "ar" ? ar : en}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2"><SubmitButton className="btn-primary">{tx("Record waste", "تسجيل الهدر")}</SubmitButton></div>
            </ActionForm>
          </Card>
          <Card title={tx("Transfer between branches", "تحويل بين الفروع")}>
            <ActionForm action={transferAction} resetOnSuccess className="grid gap-3 p-5 sm:grid-cols-2">
              <BranchSelect name="fromBranchId" branches={branches} locale={locale} defaultValue={user.branchId ?? branches[0]?.id} label={tx("From", "من")} />
              <BranchSelect
                name="toBranchId"
                branches={await db.branch.findMany({ where: { orgId: user.orgId! }, orderBy: { code: "desc" } })}
                locale={locale}
                defaultValue={undefined}
                label={tx("To", "إلى")}
              />
              <ItemSelect items={items} locale={locale} label={tx("Item", "الصنف")} />
              <div>
                <label className="label">{tx("Quantity", "الكمية")}</label>
                <input name="qty" type="number" step="0.01" min="0.01" required className="input" />
              </div>
              <div className="sm:col-span-2"><SubmitButton className="btn-primary">{tx("Post transfer", "ترحيل التحويل")}</SubmitButton></div>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  );
}

function BranchSelect({ name, branches, locale, defaultValue, label: l }: { name: string; branches: { id: string; name: string; nameAr: string }[]; locale: "en" | "ar"; defaultValue?: string; label: string }) {
  return (
    <div>
      <label className="label">{l}</label>
      <select name={name} defaultValue={defaultValue} className="input" required>
        {!defaultValue && <option value="">—</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{pickName(locale, b)}</option>
        ))}
      </select>
    </div>
  );
}

function ItemSelect({ items, locale, label: l }: { items: { id: string; name: string; nameAr: string; unit: string }[]; locale: "en" | "ar"; label: string }) {
  return (
    <div>
      <label className="label">{l}</label>
      <select name="itemId" className="input" required>
        {items.map((i) => (
          <option key={i.id} value={i.id}>{pickName(locale, i)} ({label(locale, i.unit)})</option>
        ))}
      </select>
    </div>
  );
}
