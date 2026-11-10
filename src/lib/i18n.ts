import type { Locale } from "./format";

export type { Locale };
export const LOCALE_COOKIE = "wateen_locale";

export type Tx = (en: string, ar: string) => string;

export const makeTx =
  (locale: Locale): Tx =>
  (en, ar) =>
    locale === "ar" ? ar : en;

/** Picks the localised name from a record with name and nameAr fields. */
export const pickName = (locale: Locale, r: { name: string; nameAr: string }) => (locale === "ar" ? r.nameAr : r.name);

const LABELS: Record<string, [string, string]> = {
  OWNER: ["Owner", "المالك"],
  MANAGER: ["Branch manager", "مدير فرع"],
  PURCHASER: ["Purchasing manager", "مدير المشتريات"],
  SUPPLIER: ["Supplier", "مورد"],
  ADMIN: ["Platform admin", "مسؤول المنصة"],
  DRAFT: ["Draft", "مسودة"],
  PENDING_APPROVAL: ["Pending approval", "بانتظار الموافقة"],
  SENT: ["Sent to supplier", "أُرسل للمورد"],
  CONFIRMED: ["Confirmed", "مؤكد"],
  SHIPPED: ["Out for delivery", "قيد التوصيل"],
  RECEIVED: ["Received", "تم الاستلام"],
  REJECTED: ["Rejected", "مرفوض"],
  CANCELLED: ["Cancelled", "ملغي"],
  POSTED: ["Posted", "مُرحّل"],
  OPEN: ["Open", "مفتوح"],
  AWARDED: ["Awarded", "تمت الترسية"],
  CLOSED: ["Closed", "مغلق"],
  SUBMITTED: ["Submitted", "مُقدّم"],
  LOST: ["Not selected", "لم يتم اختياره"],
  NEW: ["New", "جديد"],
  CONTACTED: ["Contacted", "تم التواصل"],
  QUALIFIED: ["Qualified", "مؤهل"],
  OUT: ["Out of stock", "نفد"],
  LOW: ["Below reorder point", "تحت حد الطلب"],
  OK: ["Healthy", "جيد"],
  OVER: ["Overstocked", "فائض"],
  SUGGESTION: ["Smart reorder", "طلب ذكي"],
  MARKETPLACE: ["Marketplace", "السوق"],
  RFQ: ["RFQ award", "ترسية عرض سعر"],
  MANUAL: ["Manual", "يدوي"],
  STAR: ["Star", "نجم"],
  PLOWHORSE: ["Plowhorse", "حصان عمل"],
  PUZZLE: ["Puzzle", "لغز"],
  DOG: ["Dog", "ضعيف"],
  OPENING: ["Opening balance", "رصيد افتتاحي"],
  RECEIVE: ["Received", "استلام"],
  SALE: ["POS sales", "مبيعات نقاط البيع"],
  WASTE: ["Waste", "هدر"],
  TRANSFER_IN: ["Transfer in", "تحويل وارد"],
  TRANSFER_OUT: ["Transfer out", "تحويل صادر"],
  COUNT_ADJUST: ["Count adjustment", "تسوية جرد"],
  CREATED: ["Created", "تم الإنشاء"],
  APPROVED: ["Approved", "تمت الموافقة"],
  QUOTED: ["Quote submitted", "تم تقديم عرض"],
  "Meat & poultry": ["Meat & poultry", "لحوم ودواجن"],
  Seafood: ["Seafood", "مأكولات بحرية"],
  "Dry goods": ["Dry goods", "مواد جافة"],
  Produce: ["Produce", "خضار وفواكه"],
  Bakery: ["Bakery", "مخبوزات"],
  Dairy: ["Dairy", "ألبان"],
  Coffee: ["Coffee", "قهوة"],
  Mains: ["Mains", "أطباق رئيسية"],
  Starters: ["Starters", "مقبلات"],
  Sides: ["Sides", "أطباق جانبية"],
  Drinks: ["Drinks", "مشروبات"],
  Desserts: ["Desserts", "حلويات"],
  kg: ["kg", "كجم"],
  L: ["L", "لتر"],
  pcs: ["pcs", "حبة"],
};

export function label(locale: Locale, key: string): string {
  const l = LABELS[key];
  return l ? l[locale === "ar" ? 1 : 0] : key;
}
