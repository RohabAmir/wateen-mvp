import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/locale";
import { label, pickName } from "@/lib/i18n";
import { db } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { LocaleToggle } from "@/components/LocaleToggle";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { locale, tx } = await getI18n();

  let items: NavItem[] = [];
  let context = "";
  if (user.role === "SUPPLIER") {
    const supplier = await db.supplier.findUnique({ where: { id: user.supplierId! } });
    const [incoming, rfqs] = await Promise.all([
      db.purchaseOrder.count({ where: { supplierId: user.supplierId!, status: { in: ["SENT", "CONFIRMED"] } } }),
      db.rfq.count({ where: { status: "OPEN", quotes: { none: { supplierId: user.supplierId! } }, item: { catalog: { some: { supplierId: user.supplierId! } } } } }),
    ]);
    context = supplier ? pickName(locale, supplier) : "";
    items = [
      { href: "/supplier", label: tx("Orders", "الطلبات"), icon: "\u2630", badge: incoming },
      { href: "/supplier/catalog", label: tx("Catalogue", "الكتالوج"), icon: "\u25A4" },
      { href: "/supplier/rfqs", label: tx("Requests for quote", "طلبات العروض"), icon: "\u2696", badge: rfqs },
    ];
  } else if (user.role === "ADMIN") {
    const leads = await db.lead.count({ where: { status: "NEW" } });
    context = "Wateen-MVP";
    items = [{ href: "/leads", label: tx("Demo requests", "طلبات العروض التوضيحية"), icon: "\u2709", badge: leads }];
  } else {
    const org = await db.organization.findUnique({ where: { id: user.orgId! } });
    const branch = user.branchId ? await db.branch.findUnique({ where: { id: user.branchId } }) : null;
    context = [org && pickName(locale, org), branch && pickName(locale, branch)].filter(Boolean).join(" · ");
    const branchFilter = user.role === "MANAGER" ? { branchId: user.branchId! } : {};
    const [pending, toReceive] = await Promise.all([
      db.purchaseOrder.count({ where: { orgId: user.orgId!, status: "PENDING_APPROVAL", ...branchFilter } }),
      db.purchaseOrder.count({ where: { orgId: user.orgId!, status: { in: ["SENT", "CONFIRMED", "SHIPPED"] }, ...branchFilter } }),
    ]);
    const all: (NavItem & { roles: string[] })[] = [
      { href: "/dashboard", label: tx("Dashboard", "لوحة التحكم"), icon: "\u25A6", roles: ["OWNER", "MANAGER", "PURCHASER"] },
      { href: "/procurement", label: tx("Purchasing", "المشتريات"), icon: "\u21C4", roles: ["OWNER", "MANAGER", "PURCHASER"], badge: user.role === "MANAGER" ? toReceive : pending },
      { href: "/marketplace", label: tx("Marketplace", "السوق"), icon: "\u25C8", roles: ["OWNER", "MANAGER", "PURCHASER"] },
      { href: "/rfq", label: tx("Requests for quote", "طلبات العروض"), icon: "\u2696", roles: ["OWNER", "PURCHASER"] },
      { href: "/inventory", label: tx("Inventory", "المخزون"), icon: "\u25A4", roles: ["OWNER", "MANAGER", "PURCHASER"] },
      { href: "/sales", label: tx("POS sales", "مبيعات نقاط البيع"), icon: "\u2318", roles: ["OWNER", "MANAGER"] },
      { href: "/counts", label: tx("Stock counts", "الجرد"), icon: "\u2611", roles: ["OWNER", "MANAGER"] },
      { href: "/recipes", label: tx("Recipes and costing", "الوصفات والتكلفة"), icon: "\u2668", roles: ["OWNER", "MANAGER", "PURCHASER"] },
      { href: "/reports", label: tx("Reports", "التقارير"), icon: "\u25D4", roles: ["OWNER", "PURCHASER"] },
    ];
    items = all.filter((i) => i.roles.includes(user.role));
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Logo href="/" />
            {context && <span className="hidden rounded-lg bg-mist px-2.5 py-1 text-sm text-plum md:inline">{context}</span>}
          </div>
          <div className="flex items-center gap-2">
            <LocaleToggle label={tx("العربية", "English")} />
            <Link href="/login" className="hidden items-center gap-3 rounded-xl border border-line px-3 py-1.5 hover:border-plum/40 sm:flex" title={tx("Switch persona", "تبديل الشخصية")}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-plum text-sm font-bold text-white">{user.name.charAt(0)}</span>
              <span className="leading-tight">
                <span className="block text-sm font-medium">{pickName(locale, user)}</span>
                <span className="block text-xs text-metal">{label(locale, user.role)}</span>
              </span>
            </Link>
            <form action={logout}>
              <button className="btn-outline px-3 py-2" type="submit">{tx("Log out", "خروج")}</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
        <aside className="md:w-60 md:shrink-0">
          <div className="md:sticky md:top-22">
            <NavLinks items={items} />
            <div className="mt-6 hidden rounded-2xl bg-mist p-4 text-xs text-ink-soft md:block">
              <p className="font-medium text-plum">{tx("Demo environment", "بيئة تجريبية")}</p>
              <p className="mt-1">
                {tx("POS sales are simulated. Switch persona from your name at the top.", "مبيعات نقاط البيع محاكاة. بدّل الشخصية من اسمك بالأعلى.")}
              </p>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
