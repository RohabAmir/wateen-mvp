import Link from "next/link";
import clsx from "clsx";
import type { Branch } from "@prisma/client";
import { pickName, type Locale } from "@/lib/i18n";

/** Branch tabs that keep other query parameters. Hidden when the user only has one branch. */
export function BranchFilter({
  branches,
  current,
  locale,
  basePath,
  params = {},
}: {
  branches: Branch[];
  current?: string;
  locale: Locale;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (branches.length < 2) return null;
  const href = (branch?: string) => {
    const q = new URLSearchParams(Object.entries({ ...params, branch }).filter(([, v]) => v) as [string, string][]);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const tabs = [{ id: undefined, label: locale === "ar" ? "كل الفروع" : "All branches" }, ...branches.map((b) => ({ id: b.id, label: pickName(locale, b) }))];
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
      {tabs.map((t) => (
        <Link
          key={t.id ?? "all"}
          href={href(t.id)}
          className={clsx("rounded-lg px-3 py-1.5 text-sm", current === t.id ? "bg-plum text-white" : "text-ink-soft hover:bg-mist")}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
