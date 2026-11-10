import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LocaleToggle } from "@/components/LocaleToggle";
import { getI18n } from "@/lib/locale";
import { getCurrentUser, homeFor } from "@/lib/session";
import { SERVICES } from "@/content/marketing";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { locale, tx } = await getI18n();
  const user = await getCurrentUser();
  const nav = [
    ...SERVICES.map((s) => ({ href: `/services/${s.slug}`, label: s.title[locale] })),
    { href: "/pricing", label: tx("Pricing", "الأسعار") },
    { href: "/faq", label: tx("FAQ", "الأسئلة الشائعة") },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-mist hover:text-plum">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LocaleToggle label={tx("العربية", "English")} />
            <Link href={user ? homeFor(user.role) : "/login"} className="btn-outline hidden sm:inline-flex">
              {user ? tx("Open dashboard", "افتح لوحة التحكم") : tx("Log in", "تسجيل الدخول")}
            </Link>
            <Link href="/demo" className="btn-orange">
              {tx("Book a demo", "احجز عرضاً")}
            </Link>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 lg:hidden">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-ink-soft hover:bg-mist">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-plum-deep text-white/80">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
          <div className="md:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              {tx(
                "The back-of-house and inventory platform for restaurants, cafés and F&B groups in Saudi Arabia.",
                "منصة الإدارة الخلفية والمخزون للمطاعم والمقاهي ومجموعات الأغذية والمشروبات في السعودية.",
              )}
            </p>
            <p className="mt-6 text-xs text-white/50">
              {tx(
                "Demonstration product built as an MVP. Not affiliated with Wateen.",
                "منتج تجريبي تم بناؤه كنموذج أولي. غير مرتبط بشركة وتين.",
              )}
            </p>
          </div>
          <div>
            <p className="mb-3 font-bold text-white">{tx("Platform", "المنصة")}</p>
            <ul className="space-y-2 text-sm">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="hover:text-orange">{s.title[locale]}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 font-bold text-white">{tx("Company", "الشركة")}</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="hover:text-orange">{tx("Pricing", "الأسعار")}</Link></li>
              <li><Link href="/faq" className="hover:text-orange">{tx("FAQ", "الأسئلة الشائعة")}</Link></li>
              <li><Link href="/demo" className="hover:text-orange">{tx("Book a demo", "احجز عرضاً")}</Link></li>
              <li><Link href="/login" className="hover:text-orange">{tx("Live demo login", "دخول العرض المباشر")}</Link></li>
              <li><a href="/api/v1/health" className="hover:text-orange">{tx("API status", "حالة الواجهة البرمجية")}</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
