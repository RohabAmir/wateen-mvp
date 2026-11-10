import Link from "next/link";
import type { Insight } from "@/lib/insights";
import type { Locale } from "@/lib/i18n";
import { sar } from "@/lib/format";
import { EmptyState, SeverityDot } from "./ui";

export function InsightList({ insights, locale, limit }: { insights: Insight[]; locale: Locale; limit?: number }) {
  const list = limit ? insights.slice(0, limit) : insights;
  if (list.length === 0) {
    return <EmptyState title={locale === "ar" ? "لا توجد تنبيهات" : "Nothing needs attention"} body={locale === "ar" ? "كل المؤشرات ضمن الحدود." : "All indicators are within limits."} />;
  }
  return (
    <ul className="divide-y divide-line">
      {list.map((i) => (
        <li key={i.id}>
          <Link href={i.href} className="flex gap-3 px-5 py-4 transition hover:bg-canvas">
            <SeverityDot severity={i.severity} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{i.title[locale]}</p>
              <p className="mt-0.5 text-sm text-metal">{i.body[locale]}</p>
            </div>
            {i.impact > 0 && (
              <span className="num shrink-0 self-start rounded-lg bg-canvas px-2 py-1 text-xs text-ink-soft" title={locale === "ar" ? "المبلغ المعرض للخطر شهرياً" : "Money at stake per month"}>
                ~{sar(i.impact, locale)}/{locale === "ar" ? "شهر" : "mo"}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
