"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { deleteUserAction, resetFinancialDataAction } from "@/actions/danger";
import { RequiredMark } from "@/components/page";

export function DangerZone() {
  const [resetState, resetAction, resetPending] = useActionState(resetFinancialDataAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteUserAction, {});
  useEffect(() => {
    if (resetState.error) toast.error("Não foi possível redefinir os dados.", { description: resetState.error });
    if (resetState.ok) toast.success("Dados financeiros redefinidos.");
  }, [resetState]);
  useEffect(() => {
    if (deleteState.error) toast.error("Não foi possível excluir o usuário.", { description: deleteState.error });
  }, [deleteState]);
  return <div className="grid gap-5 lg:grid-cols-2">
    <form action={resetAction} onSubmit={(event) => { if (!window.confirm("Apagar definitivamente todos os dados financeiros? Exporte um backup antes.")) event.preventDefault(); }} className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] p-4">
      <h3 className="font-semibold">Redefinir dados financeiros</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Mantém seu acesso, mas remove lançamentos, cadastros, metas e configurações.</p>
      <label className="label mt-4"><span>Confirme sua senha<RequiredMark /></span><input className="field" name="password" type="password" autoComplete="current-password" maxLength={200} required /></label>
      {resetState.error && <p className="mt-2 text-xs text-[var(--danger)]" role="alert">{resetState.error}</p>}{resetState.ok && <p className="mt-2 text-xs text-[var(--success)]" role="status">Dados redefinidos.</p>}
      <button className="btn btn-danger mt-3" disabled={resetPending}>{resetPending ? "Redefinindo…" : "Redefinir sistema"}</button>
    </form>
    <form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Excluir o usuário e todos os dados? Esta ação não pode ser desfeita.")) event.preventDefault(); }} className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] p-4">
      <h3 className="font-semibold">Excluir usuário único</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Remove a conta, encerra a sessão e apaga todos os dados em cascata.</p>
      <label className="label mt-4"><span>Confirme sua senha<RequiredMark /></span><input className="field" name="password" type="password" autoComplete="current-password" maxLength={200} required /></label>
      {deleteState.error && <p className="mt-2 text-xs text-[var(--danger)]" role="alert">{deleteState.error}</p>}
      <button className="btn btn-danger mt-3" disabled={deletePending}>{deletePending ? "Excluindo…" : "Excluir usuário"}</button>
    </form>
  </div>;
}
