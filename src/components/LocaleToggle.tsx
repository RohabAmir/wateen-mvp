import { toggleLocale } from "@/app/actions/auth";

export function LocaleToggle({ label }: { label: string }) {
  return (
    <form action={toggleLocale}>
      <button type="submit" className="btn-ghost px-3 py-2 text-sm" aria-label="Switch language">
        {label}
      </button>
    </form>
  );
}
