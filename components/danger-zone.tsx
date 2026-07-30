"use client";

import { useActionState } from "react";
import { deleteUserAction, resetFinancialDataAction } from "@/actions/danger";

export function DangerZone() {
  const [resetState, resetAction, resetPending] = useActionState(resetFinancialDataAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteUserAction, {});
  return <div className="grid gap-5 lg:grid-cols-2">
    <form action={resetAction} onSubmit={(event) => { if (!window.confirm("Apagar definitivamente todos os dados financeiros? Exporte um backup antes.")) event.preventDefault(); }} className="rounded-xl border border-red-500/20 p-4">
      <h3 className="font-semibold">Redefinir dados financeiros</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Mantém seu acesso, mas remove lançamentos, cadastros, metas e configurações.</p>
      <input className="field mt-4" name="password" type="password" placeholder="Confirme sua senha" required />
      {resetState.error && <p className="mt-2 text-xs text-[var(--danger)]">{resetState.error}</p>}{resetState.ok && <p className="mt-2 text-xs text-[var(--success)]">Dados redefinidos.</p>}
      <button className="btn btn-danger mt-3" disabled={resetPending}>{resetPending ? "Redefinindo…" : "Redefinir sistema"}</button>
    </form>
    <form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Excluir o usuário e todos os dados? Esta ação não pode ser desfeita.")) event.preventDefault(); }} className="rounded-xl border border-red-500/20 p-4">
      <h3 className="font-semibold">Excluir usuário único</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Remove a conta, encerra a sessão e apaga todos os dados em cascata.</p>
      <input className="field mt-4" name="password" type="password" placeholder="Confirme sua senha" required />
      {deleteState.error && <p className="mt-2 text-xs text-[var(--danger)]">{deleteState.error}</p>}
      <button className="btn btn-danger mt-3" disabled={deletePending}>{deletePending ? "Excluindo…" : "Excluir usuário"}</button>
    </form>
  </div>;
}
