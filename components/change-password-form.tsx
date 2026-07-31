"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { changePasswordAction } from "@/actions/auth";
import { RequiredMark } from "@/components/page";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  useEffect(() => {
    if (state.error) toast.error("Não foi possível alterar a senha.", { description: state.error });
    if (state.ok) toast.success("Senha alterada com sucesso.");
  }, [state]);
  return <form action={action} className="grid gap-4 sm:grid-cols-3">
    <label className="label"><span>Senha atual<RequiredMark /></span><input className="field" name="currentPassword" type="password" autoComplete="current-password" maxLength={200} required /></label>
    <label className="label"><span>Nova senha<RequiredMark /></span><input className="field" name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={200} required /></label>
    <div className="flex items-end"><button className="btn btn-primary" disabled={pending}>{pending ? "Alterando…" : "Alterar senha"}</button></div>
    {state.error && <p className="text-sm text-[var(--danger)] sm:col-span-3" role="alert">{state.error}</p>}
    {state.ok && <p className="text-sm text-[var(--success)] sm:col-span-3" role="status">Senha alterada e sessões anteriores encerradas.</p>}
  </form>;
}
