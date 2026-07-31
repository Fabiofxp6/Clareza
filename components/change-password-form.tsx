"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/auth";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return <form action={action} className="grid gap-4 sm:grid-cols-3">
    <label className="label">Senha atual<input className="field" name="currentPassword" type="password" autoComplete="current-password" maxLength={200} required /></label>
    <label className="label">Nova senha<input className="field" name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={200} required /></label>
    <div className="flex items-end"><button className="btn btn-primary" disabled={pending}>{pending ? "Alterando…" : "Alterar senha"}</button></div>
    {state.error && <p className="text-sm text-[var(--danger)] sm:col-span-3" role="alert">{state.error}</p>}
    {state.ok && <p className="text-sm text-[var(--success)] sm:col-span-3" role="status">Senha alterada e sessões anteriores encerradas.</p>}
  </form>;
}
