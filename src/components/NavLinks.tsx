"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = items.filter((i) => matches(i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap transition",
              active ? "bg-plum font-medium text-white" : "text-ink-soft hover:bg-mist",
            )}
          >
            <span className={clsx("grid h-7 w-7 place-items-center rounded-lg text-base", active ? "bg-white/10" : "bg-mist text-plum")}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className={clsx("rounded-full px-2 text-xs", active ? "bg-orange text-white" : "bg-orange text-white")}>{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
