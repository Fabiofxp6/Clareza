"use client";

import { useState } from "react";
import { toast } from "sonner";

export function BackupForm() {
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function inspect(file?: File) {
    if (!file) return setSummary(null);
    try {
      const json = JSON.parse(await file.text()) as Record<string, unknown>;
      if (json.version !== 1) throw new Error();
      const collections = ["accounts", "wallets", "categories", "transactions", "monthlyBudgets", "creditCards", "financialGoals", "debts"];
      setSummary(collections.map((key) => `${key}: ${Array.isArray(json[key]) ? json[key].length : 0}`).join(" · "));
    } catch { setSummary("Arquivo incompatível ou corrompido."); }
  }
  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Confirmar restauração? No modo substituir, os dados financeiros atuais serão removidos.")) return;
    setBusy(true);
    const response = await fetch("/api/backup", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json() as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok) return toast.error(result.error ?? "Não foi possível restaurar.");
    toast.success("Backup restaurado com sucesso.");
    window.location.reload();
  }
  return <form onSubmit={restore} className="space-y-4">
    <label className="label">Arquivo JSON<input className="field" name="file" type="file" accept="application/json,.json" required onChange={(event) => inspect(event.target.files?.[0])} /></label>
    {summary && <p className="rounded-xl bg-[var(--surface-soft)] p-3 text-xs text-[var(--muted)]">{summary}</p>}
    <label className="label">Estratégia<select className="field" name="mode"><option value="replace">Substituir todos os dados financeiros</option><option value="merge">Mesclar por identificador</option></select></label>
    <label className="label">Confirme sua senha<input className="field" name="password" type="password" required /></label>
    <button className="btn btn-danger" disabled={busy}>{busy ? "Restaurando…" : "Validar e restaurar"}</button>
  </form>;
}
