import { db } from "@/lib/db";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { loginAs } from "@/app/actions/auth";

export const metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

const ORDER = ["OWNER", "MANAGER", "PURCHASER", "SUPPLIER", "ADMIN"];
const STORY: Record<string, [string, string]> = {
  "faisal@alnakheel.sa": ["Sees food cost, variance in riyals, menu engineering and AI insights across 3 branches.", "يرى تكلفة الطعام والفروقات بالريال وهندسة القائمة والرؤى الذكية لثلاثة فروع."],
  "noura@alnakheel.sa": ["Imports POS sales, records waste, runs stock counts and receives deliveries at Olaya.", "تستورد المبيعات وتسجل الهدر وتجري الجرد وتستلم الطلبات في فرع العليا."],
  "khalid@alnakheel.sa": ["Approves orders above SAR 5,000, sends RFQs and compares supplier quotes.", "يوافق على الطلبات فوق 5,000 ريال ويرسل طلبات العروض ويقارن عروض الموردين."],
  "saad@freshfarms.sa": ["Confirms and ships orders, and keeps the Fresh Farms catalogue and prices up to date.", "يؤكد الطلبات ويشحنها ويحدّث كتالوج وأسعار مزارع فريش."],
  "hassan@gulfseafood.sa": ["Answers the open shrimp RFQ against a competing seafood supplier.", "يرد على طلب عروض الروبيان المفتوح أمام مورد منافس."],
  "majed@alwadi.sa": ["Produce supplier with a delivery already on its way to Olaya.", "مورد خضار لديه طلب في طريقه إلى فرع العليا."],
  "omar@alnakheel.sa": ["Branch manager limited to the Al Malqa branch.", "مدير فرع يرى فرع الملقا فقط."],
  "sara@wateen-mvp.sa": ["Platform admin who follows up demo requests from the marketing site.", "مسؤولة المنصة تتابع طلبات العروض من الموقع."],
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { locale, tx } = await getI18n();
  const error = (await searchParams).error;
  const users = (await db.user.findMany({ include: { branch: true } })).sort(
    (a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role) || a.email.localeCompare(b.email),
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-14 md:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-plum-deep">{tx("Choose a demo persona", "اختر شخصية تجريبية")}</h1>
        <p className="mt-2 text-ink-soft">
          {tx(
            "Every persona sees the same live data from their own role. Start with Noura to run the daily loop, then switch to Khalid, Saad and Faisal.",
            "كل شخصية ترى نفس البيانات الحية من منظور دورها. ابدأ بنورة لتشغيل الدورة اليومية، ثم انتقل إلى خالد وسعد وفيصل.",
          )}
        </p>
        {error && <p className="mt-4 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{tx("That persona does not exist. Pick another one.", "هذه الشخصية غير موجودة. اختر أخرى.")}</p>}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {users.map((u) => (
          <form key={u.id} action={loginAs}>
            <input type="hidden" name="userId" value={u.id} />
            <button type="submit" className="group flex w-full items-start gap-4 rounded-2xl border border-line bg-white p-5 text-start transition hover:border-plum/40 hover:shadow-lg hover:shadow-plum/5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mist text-lg font-bold text-plum group-hover:bg-plum group-hover:text-white">
                {u.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-ink">{pickName(locale, u)}</span>
                  <span className="rounded-full bg-orange-light px-2 py-0.5 text-xs text-orange-dark">{label(locale, u.role)}</span>
                </span>
                <span className="mt-0.5 block text-sm text-metal">{locale === "ar" ? u.titleAr : u.title}</span>
                {STORY[u.email] && <span className="mt-2 block text-sm text-ink-soft">{STORY[u.email][locale === "ar" ? 1 : 0]}</span>}
              </span>
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
