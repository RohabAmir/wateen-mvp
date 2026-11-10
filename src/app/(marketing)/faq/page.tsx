import Link from "next/link";
import { getI18n } from "@/lib/locale";
import { FAQS } from "@/content/marketing";

export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  const { locale, tx } = await getI18n();
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:py-20">
      <h1 className="text-4xl font-bold text-plum-deep">{tx("Frequently asked questions", "الأسئلة الشائعة")}</h1>
      <div className="mt-10 divide-y divide-line rounded-2xl border border-line">
        {FAQS.map((f, i) => (
          <details key={f.q.en} className="group px-6 py-5" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink">
              {f.q[locale]}
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mist text-plum transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-ink-soft">{f.a[locale]}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-ink-soft">
        {tx("Still have a question?", "لديك سؤال آخر؟")}{" "}
        <Link href="/demo" className="font-medium text-plum underline">{tx("Talk to our team", "تحدث مع فريقنا")}</Link>
      </p>
    </section>
  );
}
