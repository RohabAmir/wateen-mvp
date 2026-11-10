"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/ActionForm";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { sar } from "@/lib/format";
import { errorMessage } from "@/server/errors";
import { createCount, importSales, parseSalesCsv, postCount, recordWaste, sampleDay, saveCount, transferStock } from "@/server/inventory";
import { actOnPurchaseOrder, createPurchaseOrder, receivePurchaseOrder } from "@/server/procurement";
import { awardQuote, createRfq, submitQuote, updateCatalogItem } from "@/server/marketplace";
import { createLead, updateLeadStatus } from "@/server/leads";

const fail = (e: unknown): FormState => ({ ok: false, error: errorMessage(e).message });
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function importSalesAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { locale, tx } = await getI18n();
  try {
    const branchId = str(fd, "branchId");
    const lines = fd.get("mode") === "sample" ? await sampleDay(user.orgId!, branchId) : parseSalesCsv(str(fd, "csv"));
    const r = await importSales(user, { branchId, lines });
    revalidatePath("/", "layout");
    const low = r.lowItems.map((i) => (locale === "ar" ? i.nameAr : i.name)).join(locale === "ar" ? "، " : ", ");
    return {
      ok: true,
      message:
        tx(
          `Imported ${r.lines} menu lines: ${sar(r.revenue)} revenue, ${sar(r.cost)} recipe cost. ${r.ingredients} ingredients deducted from stock.`,
          `تم استيراد ${r.lines} صنف: إيرادات ${sar(r.revenue, "ar")} وتكلفة وصفات ${sar(r.cost, "ar")}. تم خصم ${r.ingredients} مكوّن من المخزون.`,
        ) + (low ? tx(` Now below reorder point: ${low}.`, ` أصبح تحت حد الطلب: ${low}.`) : ""),
    };
  } catch (e) {
    return fail(e);
  }
}

export async function wasteAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { tx, locale } = await getI18n();
  try {
    const r = await recordWaste(user, Object.fromEntries(fd));
    revalidatePath("/", "layout");
    return { ok: true, message: tx(`Waste recorded: ${sar(r.value, "en", 2)}.`, `تم تسجيل الهدر: ${sar(r.value, locale, 2)}.`) };
  } catch (e) {
    return fail(e);
  }
}

export async function transferAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { tx } = await getI18n();
  try {
    const r = await transferStock(user, Object.fromEntries(fd));
    revalidatePath("/", "layout");
    return { ok: true, message: tx(`Transfer ${r.ref} posted to both branches.`, `تم ترحيل التحويل ${r.ref} للفرعين.`) };
  } catch (e) {
    return fail(e);
  }
}

export async function createCountAction(fd: FormData) {
  const user = await requireUser();
  const count = await createCount(user, str(fd, "branchId"));
  redirect(`/counts/${count.id}`);
}

const countEntries = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([k, v]) => k.startsWith("line_") && String(v).trim() !== "").map(([k, v]) => [k.slice(5), v]));

export async function countAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { tx, locale } = await getI18n();
  const id = str(fd, "countId");
  try {
    if (fd.get("intent") === "post") {
      const r = await postCount(user, id, countEntries(fd));
      revalidatePath("/", "layout");
      return {
        ok: true,
        message: tx(
          `Count posted. ${r.lines} items adjusted, net ${r.lossValue >= 0 ? "loss" : "gain"} of ${sar(Math.abs(r.lossValue), "en", 2)}.`,
          `تم ترحيل الجرد. تمت تسوية ${r.lines} صنف، صافي ${r.lossValue >= 0 ? "خسارة" : "زيادة"} ${sar(Math.abs(r.lossValue), locale, 2)}.`,
        ),
      };
    }
    await saveCount(user, id, countEntries(fd));
    revalidatePath(`/counts/${id}`);
    return { ok: true, message: tx("Progress saved.", "تم حفظ التقدم.") };
  } catch (e) {
    return fail(e);
  }
}

/** Raises a purchase order from posted line inputs named qty_<itemId>. */
export async function createOrderAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  let id: string;
  try {
    const lines = [...fd.entries()]
      .filter(([k, v]) => k.startsWith("qty_") && Number(v) > 0)
      .map(([k, v]) => ({ itemId: k.slice(4), qty: Number(v) }));
    const po = await createPurchaseOrder(user, {
      branchId: str(fd, "branchId"),
      supplierId: str(fd, "supplierId"),
      source: str(fd, "source") || "MANUAL",
      note: str(fd, "note") || undefined,
      lines,
    });
    id = po.id;
    revalidatePath("/", "layout");
  } catch (e) {
    return fail(e);
  }
  redirect(`/procurement/${id}`);
}

export async function poAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { tx } = await getI18n();
  const id = str(fd, "poId");
  try {
    const action = str(fd, "action");
    await actOnPurchaseOrder(user, id, { action, note: str(fd, "note") || undefined, expectedDate: str(fd, "expectedDate") || undefined });
    revalidatePath("/", "layout");
    const msg: Record<string, [string, string]> = {
      APPROVE: ["Approved and sent to the supplier.", "تمت الموافقة والإرسال للمورد."],
      REJECT: ["Order rejected.", "تم رفض الطلب."],
      CANCEL: ["Order cancelled.", "تم إلغاء الطلب."],
      CONFIRM: ["Order confirmed. The buyer can see your delivery date.", "تم تأكيد الطلب. يمكن للمشتري رؤية موعد التوصيل."],
      SHIP: ["Marked as out for delivery.", "تم تحديده كقيد التوصيل."],
    };
    const [en, ar] = msg[action] ?? ["Done.", "تم."];
    return { ok: true, message: tx(en, ar) };
  } catch (e) {
    return fail(e);
  }
}

export async function receiveAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { tx, locale } = await getI18n();
  const id = str(fd, "poId");
  try {
    const lineIds = [...fd.keys()].filter((k) => k.startsWith("rq_")).map((k) => k.slice(3));
    const r = await receivePurchaseOrder(user, id, {
      note: str(fd, "note") || undefined,
      lines: lineIds.map((lineId) => ({ lineId, receivedQty: fd.get(`rq_${lineId}`), receivedPrice: fd.get(`rp_${lineId}`) })),
    });
    revalidatePath("/", "layout");
    const issues = r.flags.filter((f) => f.short || f.priceUp || f.over).length;
    return {
      ok: true,
      message: tx(
        `Received ${sar(r.receivedValue, "en", 2)} into stock.${issues ? ` ${issues} line(s) flagged for the supplier scorecard.` : " No variances."}`,
        `تم استلام ${sar(r.receivedValue, locale, 2)} في المخزون.${issues ? ` تم تسجيل ${issues} ملاحظة في تقييم المورد.` : " لا توجد فروقات."}`,
      ),
    };
  } catch (e) {
    return fail(e);
  }
}

export async function catalogAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["SUPPLIER"]);
  const { tx } = await getI18n();
  try {
    await updateCatalogItem(user, str(fd, "id"), { price: fd.get("price"), inStock: fd.get("inStock") === "on" });
    revalidatePath("/", "layout");
    return { ok: true, message: tx("Saved. Buyers see the new price now.", "تم الحفظ. يرى المشترون السعر الجديد الآن.") };
  } catch (e) {
    return fail(e);
  }
}

export async function rfqAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["OWNER", "PURCHASER"]);
  let id: string;
  try {
    const rfq = await createRfq(user, Object.fromEntries(fd));
    id = rfq.id;
    revalidatePath("/rfq");
  } catch (e) {
    return fail(e);
  }
  redirect(`/rfq/${id}`);
}

export async function quoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["SUPPLIER"]);
  const { tx } = await getI18n();
  try {
    await submitQuote(user, str(fd, "rfqId"), Object.fromEntries(fd));
    revalidatePath("/", "layout");
    return { ok: true, message: tx("Quote submitted. The buyer can compare it now.", "تم تقديم العرض. يمكن للمشتري مقارنته الآن.") };
  } catch (e) {
    return fail(e);
  }
}

export async function awardAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["OWNER", "PURCHASER"]);
  let id: string;
  try {
    const po = await awardQuote(user, str(fd, "rfqId"), str(fd, "quoteId"));
    id = po.id;
    revalidatePath("/", "layout");
  } catch (e) {
    return fail(e);
  }
  redirect(`/procurement/${id}`);
}

export async function leadAction(_: FormState, fd: FormData): Promise<FormState> {
  const { tx } = await getI18n();
  try {
    await createLead(Object.fromEntries(fd));
    revalidatePath("/leads");
    return { ok: true, message: tx("Thank you. Our team will call you within one working day to book your demo.", "شكراً لك. سيتواصل معك فريقنا خلال يوم عمل لحجز العرض التوضيحي.") };
  } catch (e) {
    return fail(e);
  }
}

export async function leadStatusAction(fd: FormData) {
  const user = await requireUser(["ADMIN"]);
  await updateLeadStatus(user, str(fd, "id"), str(fd, "status") as "NEW" | "CONTACTED" | "QUALIFIED");
  revalidatePath("/leads");
}
