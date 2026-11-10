"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";

export type FormState = { ok: boolean; message?: string; error?: string } | null;

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="mt-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger" role="alert">{state.error}</p>}
      {state?.ok && state.message && <p className="mt-3 rounded-lg bg-success-light px-3 py-2 text-sm text-success-dark" role="status">{state.message}</p>}
    </form>
  );
}

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={clsx(className)}>
      {pending ? (pendingLabel ?? "…") : children}
    </button>
  );
}
