import Link from "next/link";
import clsx from "clsx";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Wateen-MVP home">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
        <rect width="34" height="34" rx="10" className={light ? "fill-white" : "fill-plum"} />
        <path d="M8 11l4.2 12L17 13l4.8 10L26 11" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={light ? "stroke-plum" : "stroke-white"} />
        <circle cx="26" cy="11" r="2.4" className="fill-orange" />
      </svg>
      <span className={clsx("text-lg font-bold tracking-tight", light ? "text-white" : "text-plum")}>
        Wateen<span className="text-orange">-MVP</span>
      </span>
    </Link>
  );
}
