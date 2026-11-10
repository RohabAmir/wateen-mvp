import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { dateTime, sar } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { catalogAction } from "@/app/actions/ops";

export const metadata = { title: "Catalogue" };

export default async function SupplierCatalogPage() {
  const user = await requireUser(["SUPPLIER"]);
  const { locale, tx } = await getI18n();
  const catalog = await db.catalogItem.findMany({ where: { supplierId: user.supplierId! }, include: { item: true }, orderBy: { item: { name: "asc" } } });

  return (
    <>
      <PageHeader title={tx("Your catalogue", "الكتالوج الخاص بك")} subtitle={tx("Buyers see these prices immediately. Price changes are shown to buyers next to the old price.", "يرى المشترون هذه الأسعار فوراً، وتظهر تغييرات الأسعار بجانب السعر السابق.")} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((c) => (
          <Card key={c.id}>
            <ActionForm action={catalogAction} className="p-5">
              <input type="hidden" name="id" value={c.id} />
              <p className="font-bold">{pickName(locale, c.item)}</p>
              <p className="text-xs text-metal">
                {tx("Pack", "العبوة")} {c.packSize} {label(locale, c.item.unit)} · {tx("min", "الحد الأدنى")} {c.minQty} · {tx("updated", "تحديث")} {dateTime(c.updatedAt, locale)}
              </p>
              {c.previousPrice && <p className="mt-1 text-xs text-warning">{tx("Previous price", "السعر السابق")} {sar(c.previousPrice, locale, 2)}</p>}
              <div className="mt-4 flex items-end gap-3">
                <div className="flex-1">
                  <label className="label">{tx(`Price per ${c.item.unit}`, `السعر لكل ${label("ar", c.item.unit)}`)}</label>
                  <input name="price" type="number" step="0.01" min="0.01" defaultValue={c.price} className="input" />
                </div>
                <label className="mb-2.5 flex items-center gap-2 text-sm">
                  <input type="checkbox" name="inStock" defaultChecked={c.inStock} className="h-4 w-4 accent-plum" />
                  {tx("In stock", "متوفر")}
                </label>
              </div>
              <SubmitButton className="btn-outline mt-3 w-full">{tx("Save", "حفظ")}</SubmitButton>
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
