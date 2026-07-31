"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { loginAction } from "@/actions/auth";
import { RequiredMark } from "@/components/page";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  useEffect(() => {
    if (state.error) toast.error("Não foi possível entrar.", { description: state.error });
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      <label className="label">
        <span>E-mail<RequiredMark /></span>
        <input className="field" name="email" type="email" autoComplete="email" maxLength={320} required placeholder="voce@exemplo.com" />
      </label>
      <label className="label">
        <span>Senha<RequiredMark /></span>
        <input className="field" name="password" type="password" autoComplete="current-password" maxLength={200} required placeholder="Sua senha" />
      </label>
      {state.error && <p className="rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-3 text-sm text-[var(--danger)]" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar com segurança"}
      </button>
    </form>
  );
}
