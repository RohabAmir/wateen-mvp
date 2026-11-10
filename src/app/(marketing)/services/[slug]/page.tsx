import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/locale";
import { SERVICES } from "@/content/marketing";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: SERVICES.find((x) => x.slug === slug)?.title.en ?? "Service" };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SERVICES.find((x) => x.slug === slug);
  if (!s) notFound();
  const { locale, tx } = await getI18n();
  const others = SERVICES.filter((x) => x.slug !== slug);

  return (
    <>
      <section className="bg-gradient-to-b from-mist to-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center md:px-6 lg:py-20">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-plum text-2xl text-white">{s.icon}</div>
          <p className="mt-5 text-sm font-bold tracking-wide text-orange uppercase">{s.title[locale]}</p>
          <h1 className="mt-2 text-4xl font-bold text-plum-deep md:text-5xl">{s.hero[locale]}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-soft">{s.short[locale]}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={s.demo.href} className="btn-primary px-6 py-3">{s.demo.label[locale]}</Link>
            <Link href="/demo" className="btn-orange px-6 py-3">{tx("Book a demo", "احجز عرضاً")}</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-14 md:grid-cols-2 md:px-6">
        {s.points.map((p, i) => (
          <div key={p.title.en} className="rounded-2xl border border-line p-7">
            <span className="num text-sm font-bold text-orange">0{i + 1}</span>
            <h2 className="mt-2 text-xl font-bold text-ink">{p.title[locale]}</h2>
            <p className="mt-2 leading-relaxed text-metal">{p.body[locale]}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-20 md:px-6">
        <p className="mb-4 font-bold text-ink">{tx("Works together with", "يعمل جنباً إلى جنب مع")}</p>
        <div className="grid gap-4 md:grid-cols-3">
          {others.map((o) => (
            <Link key={o.slug} href={`/services/${o.slug}`} className="rounded-2xl bg-mist p-5 hover:bg-lilac/40">
              <p className="font-bold text-plum">{o.icon} {o.title[locale]}</p>
              <p className="mt-1 text-sm text-ink-soft">{o.short[locale]}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
