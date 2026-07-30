"use client";

import { useMemo, useState } from "react";
import { simulateDebt } from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";

export function DebtSimulator({
  balance,
  installment,
  interestRate,
  ratePeriod,
}: {
  balance: number;
  installment: number;
  interestRate: number;
  ratePeriod: "MONTHLY" | "ANNUAL";
}) {
  const [extra, setExtra] = useState(0);
  const result = useMemo(() => {
    try {
      const base = simulateDebt({ balanceCents: balance, installmentCents: installment, extraCents: 0, interestRate, ratePeriod });
      const accelerated = simulateDebt({ balanceCents: balance, installmentCents: installment, extraCents: Math.round(extra * 100), interestRate, ratePeriod });
      return { base, accelerated };
    } catch { return null; }
  }, [balance, installment, interestRate, ratePeriod, extra]);
  return (
    <div className="rounded-xl bg-[var(--surface-soft)] p-4">
      <label className="label">Valor extra mensal<input className="field" type="number" min="0" step="10" value={extra} onChange={(event) => setExtra(Number(event.target.value))} /></label>
      {result ? <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div><span className="text-[var(--muted)]">Novo prazo</span><div className="mt-1 font-bold">{result.accelerated.months} meses</div></div>
        <div><span className="text-[var(--muted)]">Parcelas eliminadas</span><div className="mt-1 font-bold">{Math.max(0, result.base.months - result.accelerated.months)}</div></div>
        <div><span className="text-[var(--muted)]">Quitação estimada</span><div className="mt-1 font-bold">{new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(result.accelerated.payoffDate)}</div></div>
        <div><span className="text-[var(--muted)]">Juros economizados</span><div className="mt-1 font-bold text-[var(--success)]">{formatCurrency(Math.max(0, result.base.totalInterestCents - result.accelerated.totalInterestCents))}</div></div>
      </div> : <p className="mt-3 text-xs text-[var(--danger)]">A parcela informada não cobre os juros mensais.</p>}
      <p className="mt-4 text-[10px] leading-4 text-[var(--muted)]">Estimativa educativa. Contratos podem usar tarifas e métodos de amortização diferentes.</p>
    </div>
  );
}
