"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <label className="label">
        E-mail
        <input className="field" name="email" type="email" autoComplete="email" maxLength={320} required placeholder="voce@exemplo.com" />
      </label>
      <label className="label">
        Senha
        <input className="field" name="password" type="password" autoComplete="current-password" maxLength={200} required placeholder="Sua senha" />
      </label>
      {state.error && <p className="rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-3 text-sm text-[var(--danger)]" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar com segurança"}
      </button>
    </form>
  );
}
