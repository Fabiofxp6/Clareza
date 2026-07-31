import { upsertBudgetAction } from "@/actions/finance";
import { MutationForm } from "@/components/mutation-form";
import { Field, FormDetails, PageHeader, Submit } from "@/components/page";
import { budgetLevel } from "@/lib/finance";
import { getBudgetData, getMasters } from "@/lib/queries";
import { clampInteger, formatCurrency, formatPercent, monthLabel } from "@/lib/utils";

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const params = await searchParams;
  const now = new Date();
  const month = clampInteger(params.month, now.getMonth() + 1, 1, 12);
  const year = clampInteger(params.year, now.getFullYear(), 2000, 2200);
  const [data, masters] = await Promise.all([getBudgetData(month, year), getMasters()]);
  const totalPlanned = data.rows.reduce((sum, row) => sum + row.planned, 0);
  const totalRealized = data.rows.reduce((sum, row) => sum + row.realized, 0);
  const config = data.settings;
  return (
    <>
      <PageHeader
        eyebrow="Planejamento"
        title="Orçamento mensal"
        description="Defina limites por categoria e acompanhe o realizado pelo regime de caixa."
        actions={
          <form className="flex gap-2">
            <select className="field" name="month" defaultValue={month}>{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{monthLabel(i + 1)}</option>)}</select>
            <input className="field w-24" name="year" type="number" min="2000" max="2200" defaultValue={year} />
            <button className="btn btn-secondary">Aplicar</button>
          </form>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Renda prevista", formatCurrency(config?.monthlyIncome ?? 0)],
          ["Orçamento total", formatCurrency(totalPlanned)],
          ["Realizado", formatCurrency(totalRealized)],
          ["Saldo disponível", formatCurrency(totalPlanned - totalRealized)],
        ].map(([label, value]) => <div className="card p-4" key={label}><div className="text-xs font-semibold text-[var(--muted)]">{label}</div><div className="mt-2 text-xl font-bold">{value}</div></div>)}
      </div>
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Regra de distribuição</h2><p className="text-xs text-[var(--muted)]">Percentuais editáveis nas configurações.</p></div><span className="badge">50 · 30 · 20</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Necessidades", config?.needsPercentage ?? "50"],
            ["Desejos", config?.wantsPercentage ?? "30"],
            ["Investimentos", config?.investmentPercentage ?? "20"],
            ["Dívidas", config?.debtPercentage ?? "0"],
            ["Margem", config?.safetyMarginPercentage ?? "0"],
          ].map(([label, value]) => <div className="rounded-xl bg-[var(--surface-soft)] p-3" key={label}><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-1 font-bold">{Number(value).toFixed(1)}%</div></div>)}
        </div>
      </div>
      <FormDetails title="Planejar categoria">
        <MutationForm action={upsertBudgetAction} successMessage="Orçamento salvo." className="grid gap-4 sm:grid-cols-4">
          <Field label="Categoria"><select className="field" name="categoryId" required>{masters.categories.filter((item) => item.type === "EXPENSE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Valor planejado"><input className="field" name="plannedAmount" required placeholder="0,00" /></Field>
          <input type="hidden" name="month" value={month} /><input type="hidden" name="year" value={year} />
          <div className="flex items-end"><Submit>Salvar orçamento</Submit></div>
        </MutationForm>
      </FormDetails>
      <section className="card table-wrap">
        <table className="data-table">
          <thead><tr><th>Categoria</th><th>Planejado</th><th>Realizado</th><th>Diferença</th><th>Utilizado</th><th>Status</th></tr></thead>
          <tbody>
            {data.rows.map((row) => {
              const percent = row.planned ? (row.realized / row.planned) * 100 : 0;
              const level = budgetLevel(percent);
              return <tr key={row.id}>
                <td><span className="flex items-center gap-2 font-semibold"><i className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />{row.category}</span></td>
                <td>{formatCurrency(row.planned)}</td><td>{formatCurrency(row.realized)}</td><td>{formatCurrency(row.planned - row.realized)}</td>
                <td><div className="w-40"><div className="mb-1 text-xs font-semibold">{formatPercent(percent)}</div><div className="h-2 rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, percent)}%`, background: level === "danger" ? "var(--danger)" : level === "warning" ? "var(--warning)" : "var(--success)" }} /></div></div></td>
                <td><span className="badge" style={{ color: level === "danger" ? "var(--danger)" : level === "warning" ? "var(--warning)" : "var(--success)" }}>{level === "danger" ? "Ultrapassado" : level === "warning" ? "Atenção" : "Dentro do orçamento"}</span></td>
              </tr>;
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
