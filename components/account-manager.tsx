"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteAccountAction,
  toggleAccountAction,
  updateAccountAction,
  type AccountMutationState,
} from "@/actions/finance";
import { RequiredMark } from "@/components/page";
import type { Account } from "@/db/schema";
import { formatCurrency } from "@/lib/utils";

const accountTypeLabel: Record<Account["type"], string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  PAYMENT: "Conta de pagamento",
  INVESTMENT: "Investimentos",
  OTHER: "Outra",
};

const initialState: AccountMutationState = {};

function AccountItem({ account }: { account: Account }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateAccountAction,
    initialState,
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleAccountAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAccountAction,
    initialState,
  );

  useEffect(() => {
    if (updateState.ok) toast.success("Conta atualizada.");
    if (updateState.error) toast.error("Não foi possível atualizar a conta.", { description: updateState.error });
  }, [updateState]);

  useEffect(() => {
    if (toggleState.ok && toggleState.message) toast.success(toggleState.message);
    if (toggleState.error) toast.error("Não foi possível alterar a conta.", { description: toggleState.error });
  }, [toggleState]);

  useEffect(() => {
    if (deleteState.error) toast.error("Não foi possível excluir a conta.", { description: deleteState.error });
  }, [deleteState]);

  return (
    <div className="rounded-xl border bg-[var(--surface-soft)] p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-full"
            style={{ background: account.color }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{account.name}</span>
              {!account.isActive && <span className="badge">Inativa</span>}
            </div>
            <div className="mt-0.5 text-xs text-[var(--muted)]">
              {account.institution || "Instituição não informada"} · {accountTypeLabel[account.type]}
            </div>
            <div className="mt-1 font-semibold">{formatCurrency(account.currentBalance)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-secondary !min-h-8 !px-2 text-xs"
            type="button"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Cancelar edição" : "Editar"}
          </button>
          <form action={toggleAction}>
            <input type="hidden" name="id" value={account.id} />
            <button
              className={`btn !min-h-8 !px-2 text-xs ${account.isActive ? "btn-danger" : "btn-success"}`}
              disabled={togglePending}
            >
              {togglePending ? "Salvando…" : account.isActive ? "Desativar" : "Reativar"}
            </button>
          </form>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Excluir a conta "${account.name}"? Contas fixas vinculadas ficarão sem conta. Esta ação não pode ser desfeita.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={account.id} />
            <button className="btn btn-danger !min-h-8 !px-2 text-xs" disabled={deletePending}>
              {deletePending ? "Excluindo…" : "Excluir"}
            </button>
          </form>
        </div>
      </div>

      {(toggleState.error || deleteState.error) && (
        <p className="mt-3 text-xs text-[var(--danger)]" role="alert">
          {toggleState.error || deleteState.error}
        </p>
      )}

      {editing && (
        <form action={updateAction} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={account.id} />
          <label className="label">
            <span>Nome<RequiredMark /></span>
            <input className="field" name="name" defaultValue={account.name} required />
          </label>
          <label className="label">
            Instituição
            <input className="field" name="institution" defaultValue={account.institution ?? ""} />
          </label>
          <label className="label">
            <span>Tipo<RequiredMark /></span>
            <select className="field" name="type" defaultValue={account.type} required>
              {Object.entries(accountTypeLabel).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="label">
            <span>Saldo inicial<RequiredMark /></span>
            <input
              className="field"
              name="initialBalance"
              defaultValue={(account.initialBalance / 100).toFixed(2).replace(".", ",")}
              inputMode="decimal"
              required
            />
          </label>
          <label className="label">
            <span>Cor<RequiredMark /></span>
            <input className="field h-11" name="color" type="color" defaultValue={account.color} required />
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary" disabled={updatePending}>
              {updatePending ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
          {updateState.error && (
            <p className="text-xs text-[var(--danger)] sm:col-span-2" role="alert">
              {updateState.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export function AccountManager({ accounts }: { accounts: Account[] }) {
  if (!accounts.length) {
    return <p className="mt-5 text-sm text-[var(--muted)]">Nenhuma conta bancária cadastrada.</p>;
  }

  return (
    <div className="mt-5 space-y-3">
      {accounts.map((account) => <AccountItem account={account} key={account.id} />)}
    </div>
  );
}
