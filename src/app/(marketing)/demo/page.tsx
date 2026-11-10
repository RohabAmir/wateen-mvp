import Link from "next/link";
import { getI18n } from "@/lib/locale";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { leadAction } from "@/app/actions/ops";
import { SEGMENTS } from "@/server/leads";

export const metadata = { title: "Book a demo" };

const SEGMENT_AR: Record<string, string> = {
  "Fine & casual dining": "المطاعم الراقية والعائلية",
  QSR: "الوجبات السريعة",
  "Cafes & roasteries": "المقاهي والمحامص",
  "Cloud kitchens": "المطابخ السحابية",
  Catering: "خدمات التموين",
  "Hotel restaurants": "مطاعم الفنادق",
};

export default async function DemoPage() {
  const { locale, tx } = await getI18n();
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:px-6 lg:grid-cols-5 lg:py-20">
      <div className="lg:col-span-2">
        <h1 className="text-4xl font-bold text-plum-deep">{tx("Book a demo", "احجز عرضاً توضيحياً")}</h1>
        <p className="mt-4 text-lg text-ink-soft">
          {tx(
            "Tell us about your restaurants. We will show you the platform with your own menu and suppliers.",
            "أخبرنا عن مطاعمك وسنعرض لك المنصة بقائمتك ومورديك.",
          )}
        </p>
        <ul className="mt-8 space-y-4 text-ink-soft">
          {[
            tx("30-minute call with a back-of-house specialist", "مكالمة 30 دقيقة مع مختص في الإدارة الخلفية"),
            tx("A food cost health check on one of your branches", "فحص صحة تكلفة الطعام في أحد فروعك"),
            tx("A setup plan and a quote per branch", "خطة إعداد وعرض سعر لكل فرع"),
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-light text-sm text-orange">✓</span>
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-10 rounded-2xl bg-mist p-5 text-sm text-ink-soft">
          {tx("Prefer to look around first?", "تفضّل الاستكشاف أولاً؟")}{" "}
          <Link href="/login" className="font-medium text-plum underline">{tx("Open the live demo", "افتح العرض المباشر")}</Link>
        </div>
      </div>
      <div className="card p-6 md:p-8 lg:col-span-3">
        <ActionForm action={leadAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">{tx("Full name", "الاسم الكامل")}</label>
            <input id="name" name="name" required className="input" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="company">{tx("Restaurant or company", "المطعم أو الشركة")}</label>
            <input id="company" name="company" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">{tx("Work email", "البريد الإلكتروني")}</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="phone">{tx("Phone", "الجوال")}</label>
            <input id="phone" name="phone" required className="input" placeholder="+966 5x xxx xxxx" dir="ltr" />
          </div>
          <div>
            <label className="label" htmlFor="segment">{tx("Type of business", "نوع النشاط")}</label>
            <select id="segment" name="segment" className="input" defaultValue={SEGMENTS[0]}>
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>{locale === "ar" ? SEGMENT_AR[s] : s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="branches">{tx("Number of branches", "عدد الفروع")}</label>
            <input id="branches" name="branches" type="number" min={1} defaultValue={1} required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="message">{tx("What would you like to fix first? (optional)", "ما الذي تريد حله أولاً؟ (اختياري)")}</label>
            <textarea id="message" name="message" rows={4} className="input" />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton className="btn-orange w-full py-3" pendingLabel={tx("Sending…", "جارٍ الإرسال…")}>
              {tx("Request my demo", "اطلب العرض")}
            </SubmitButton>
          </div>
        </ActionForm>
      </div>
    </section>
  );
}
