import { createDebtAction, updateDebtProgressAction } from "@/actions/finance";
import { DebtSimulator } from "@/components/debt-simulator";
import { EmptyState, Field, FormDetails, PageHeader, Submit } from "@/components/page";
import { getDebts, getSettingsData } from "@/lib/queries";
import { formatCurrency, formatPercent, isoDate } from "@/lib/utils";

export default async function DebtsPage() {
  const [debts, config] = await Promise.all([getDebts(), getSettingsData()]);
  const total = debts.filter((item) => item.status !== "PAID").reduce((sum, item) => sum + item.currentBalance, 0);
  const original = debts.reduce((sum, item) => sum + item.originalAmount, 0);
  const monthly = debts.reduce((sum, item) => sum + (item.installmentAmount ?? 0), 0);
  const income = config.settings?.monthlyIncome ?? 0;
  async function save(formData: FormData) { "use server"; await createDebtAction(formData); }
  return (
    <>
      <PageHeader eyebrow="Compromissos" title="Dívidas e parcelamentos" description="Visualize o saldo devedor e teste como aportes extras podem reduzir o prazo." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Saldo devedor", formatCurrency(total)], ["Total pago", formatCurrency(Math.max(0, original - total))], ["Compromisso mensal", formatCurrency(monthly)], ["Renda comprometida", formatPercent(income ? monthly / income * 100 : 0)]].map(([label, value]) => <div className="card p-4" key={label}><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-2 text-xl font-bold">{value}</div></div>)}
      </div>
      <FormDetails title="Cadastrar dívida">
        <form action={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome"><input className="field" name="name" required /></Field><Field label="Credor"><input className="field" name="creditor" required /></Field><Field label="Tipo"><input className="field" name="debtType" required placeholder="Empréstimo, financiamento…" /></Field><Field label="Valor original"><input className="field" name="originalAmount" required placeholder="0,00" /></Field>
          <Field label="Saldo devedor"><input className="field" name="currentBalance" required placeholder="0,00" /></Field><Field label="Total de parcelas"><input className="field" name="totalInstallments" type="number" min="1" required /></Field><Field label="Parcelas pagas"><input className="field" name="paidInstallments" type="number" min="0" defaultValue="0" required /></Field><Field label="Valor da parcela"><input className="field" name="installmentAmount" required placeholder="0,00" /></Field>
          <Field label="Taxa de juros (%)"><input className="field" name="interestRate" type="number" step="0.01" min="0" defaultValue="0" required /></Field><Field label="Período da taxa"><select className="field" name="interestRatePeriod"><option value="MONTHLY">Ao mês</option><option value="ANNUAL">Ao ano</option></select></Field><Field label="Data inicial"><input className="field" name="startDate" type="date" defaultValue={isoDate()} required /></Field><Field label="Quitação prevista"><input className="field" name="estimatedPayoffDate" type="date" /></Field>
          <Field label="Próximo vencimento"><input className="field" name="nextDueDate" type="date" /></Field><Field label="Prioridade"><select className="field" name="priority"><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></Field><Field label="Observações"><textarea className="field" name="notes" /></Field><div className="flex items-end"><Submit>Cadastrar dívida</Submit></div>
        </form>
      </FormDetails>
      {debts.length ? <div className="grid gap-4 xl:grid-cols-2">
        {debts.map((debt) => {
          const paidPercent = debt.originalAmount ? Math.max(0, (debt.originalAmount - debt.currentBalance) / debt.originalAmount * 100) : 0;
          return <article className="card grid gap-5 p-5 md:grid-cols-[1fr_280px]" key={debt.id}>
            <div><div className="flex items-start justify-between"><div><h2 className="font-bold">{debt.name}</h2><p className="text-xs text-[var(--muted)]">{debt.creditor} · {debt.debtType}</p></div><span className="badge">{debt.status === "ACTIVE" ? "Ativa" : debt.status}</span></div>
            <div className="mt-5 text-2xl font-bold">{formatCurrency(debt.currentBalance)}</div><div className="text-xs text-[var(--muted)]">saldo de {formatCurrency(debt.originalAmount)}</div>
            <div className="mt-4 h-2 rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${Math.min(100, paidPercent)}%` }} /></div>
            <div className="mt-2 flex justify-between text-xs"><span>{formatPercent(paidPercent)} pago</span><span>{debt.paidInstallments}/{debt.totalInstallments ?? "—"} parcelas</span></div></div>
            <DebtSimulator balance={debt.currentBalance} installment={debt.installmentAmount ?? 0} interestRate={Number(debt.interestRate)} ratePeriod={debt.interestRatePeriod} />
            <form action={updateDebtProgressAction} className="grid gap-2 border-t pt-4 md:col-span-2 sm:grid-cols-4"><input type="hidden" name="id" value={debt.id} /><Field label="Saldo atual"><input className="field" name="currentBalance" defaultValue={(debt.currentBalance / 100).toFixed(2)} /></Field><Field label="Parcelas pagas"><input className="field" name="paidInstallments" type="number" min="0" defaultValue={debt.paidInstallments} /></Field><Field label="Situação"><select className="field" name="status" defaultValue={debt.status}><option value="ACTIVE">Ativa</option><option value="OVERDUE">Atrasada</option><option value="PAID">Quitada</option><option value="RENEGOTIATED">Renegociada</option></select></Field><div className="flex items-end"><button className="btn btn-secondary">Atualizar</button></div></form>
          </article>;
        })}
      </div> : <div className="card"><EmptyState title="Nenhuma dívida cadastrada" description="Cadastre parcelamentos para visualizar o comprometimento e simular antecipações." /></div>}
    </>
  );
}
