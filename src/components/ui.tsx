import clsx from "clsx";
import Link from "next/link";
import { label, type Locale } from "@/lib/i18n";
import { dateTime } from "@/lib/format";

const TONES = {
  neutral: "bg-canvas text-metal border-line",
  info: "bg-info-light text-info border-info/20",
  warning: "bg-warning-light text-warning border-warning/20",
  danger: "bg-danger-light text-danger border-danger/20",
  success: "bg-success-light text-success-dark border-success/20",
  plum: "bg-mist text-plum border-plum/15",
  orange: "bg-orange-light text-orange-dark border-orange/20",
} as const;
export type Tone = keyof typeof TONES;

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  SENT: "info",
  CONFIRMED: "plum",
  SHIPPED: "orange",
  RECEIVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  POSTED: "success",
  OPEN: "info",
  AWARDED: "success",
  CLOSED: "neutral",
  SUBMITTED: "info",
  LOST: "neutral",
  NEW: "orange",
  CONTACTED: "info",
  QUALIFIED: "success",
  OUT: "danger",
  LOW: "warning",
  OK: "success",
  OVER: "plum",
  STAR: "success",
  PLOWHORSE: "info",
  PUZZLE: "warning",
  DOG: "danger",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", TONES[tone])}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label(locale, status)}
    </Badge>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-metal hover:text-plum">
            <span className="rtl:hidden">&larr;</span>
            <span className="hidden rtl:inline">&rarr;</span> {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-ink md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-metal">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children, title, action }: { className?: string; children: React.ReactNode; title?: string; action?: React.ReactNode }) {
  return (
    <section className={clsx("card", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-bold text-ink">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: "default" | "plum" | "orange" | "danger";
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border p-5",
        tone === "plum" && "border-plum bg-plum text-white",
        tone === "orange" && "border-orange/30 bg-orange-light",
        tone === "danger" && "border-danger/20 bg-danger-light",
        tone === "default" && "border-line bg-white",
      )}
    >
      <p className={clsx("text-sm", tone === "plum" ? "text-white/75" : "text-metal")}>{label}</p>
      <p className={clsx("num mt-1 text-2xl font-bold", tone === "plum" ? "text-white" : tone === "danger" ? "text-danger" : "text-ink")}>{value}</p>
      {hint && <p className={clsx("mt-1 text-xs", tone === "plum" ? "text-white/70" : "text-metal")}>{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-mist text-xl text-plum">&#10003;</div>
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-metal">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function KeyValue({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs text-metal">{i.label}</dt>
          <dd className="mt-0.5 font-medium text-ink">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, tone = "plum" }: { value: number; tone?: "plum" | "orange" | "success" | "danger" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div
        className={clsx("h-full rounded-full", { plum: "bg-plum", orange: "bg-orange", success: "bg-success", danger: "bg-danger" }[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export interface TimelineEvent {
  id: string;
  action: string;
  note: string | null;
  userName: string | null;
  createdAt: Date;
}

export function Timeline({ events, locale }: { events: TimelineEvent[]; locale: Locale }) {
  return (
    <ol className="relative space-y-5 ps-6">
      <span className="absolute start-[7px] top-1 bottom-1 w-px bg-line" />
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={clsx(
              "absolute -start-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white",
              e.action === "REJECTED" || e.action === "CANCELLED" ? "bg-danger" : e.action === "RECEIVED" || e.action === "APPROVED" || e.action === "AWARDED" ? "bg-success" : "bg-plum",
            )}
          />
          <p className="text-sm font-medium text-ink">{label(locale, e.action)}</p>
          <p className="text-xs text-metal">
            {e.userName ?? "System"} · {dateTime(e.createdAt, locale)}
          </p>
          {e.note && <p className="mt-1 rounded-lg bg-canvas px-3 py-2 text-sm text-ink-soft">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Minimal bar chart rendered with divs, so it works in server components and right-to-left. */
export function BarChart({
  data,
  height = 160,
  format,
}: {
  data: { key: string; label: string; value: number; secondary?: number }[];
  height?: number;
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${format(d.value)}`}>
            <div className="w-full rounded-t-md bg-plum/85 transition group-hover:bg-orange" style={{ height: `${(d.value / max) * 100}%` }}>
              {d.secondary !== undefined && (
                <div className="w-full rounded-t-md bg-orange/80" style={{ height: `${d.value ? (d.secondary / d.value) * 100 : 0}%` }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-metal">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function SeverityDot({ severity }: { severity: "high" | "medium" | "low" }) {
  return <span className={clsx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", severity === "high" ? "bg-danger" : severity === "medium" ? "bg-orange" : "bg-plum-soft")} />;
}
