import { AnnualCharts } from "@/components/annual-chart";
import { PageHeader } from "@/components/page";
import { getAnnualData } from "@/lib/queries";
import { formatCurrency, formatPercent, monthLabel } from "@/lib/utils";

export default async function AnnualPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const year = Number((await searchParams).year) || new Date().getFullYear();
  const data = await getAnnualData(year);
  const income = data.reduce((sum, item) => sum + item.income, 0);
  const expenses = data.reduce((sum, item) => sum + item.expenses, 0);
  const investments = data.reduce((sum, item) => sum + item.investments, 0);
  const best = data.reduce((a, b) => a.balance > b.balance ? a : b);
  const worst = data.reduce((a, b) => a.expenses > b.expenses ? a : b);
  return <>
    <PageHeader eyebrow="Evolução" title={`Resumo anual de ${year}`} description="Compare os meses e identifique os períodos de maior gasto e economia." actions={<form className="flex gap-2"><input className="field w-28" name="year" type="number" defaultValue={year} /><button className="btn btn-secondary">Aplicar</button></form>} />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {[["Receita anual", formatCurrency(income)], ["Despesa anual", formatCurrency(expenses)], ["Saldo anual", formatCurrency(income - expenses - investments)], ["Média de gastos", formatCurrency(expenses / 12)], ["Maior gasto", monthLabel(worst.month)], ["Taxa de poupança", formatPercent(income ? (income - expenses) / income * 100 : 0)]].map(([label, value]) => <div className="card p-4" key={label}><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-2 truncate text-lg font-bold">{value}</div></div>)}
    </div>
    <AnnualCharts data={data} />
    <section className="card mt-4 table-wrap"><table className="data-table"><thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo</th><th>Investimentos</th><th>Fixas</th><th>Variáveis</th><th>Economizado</th></tr></thead><tbody>{data.map((item) => <tr key={item.month}><td className="font-semibold capitalize">{monthLabel(item.month)}</td><td>{formatCurrency(item.income)}</td><td>{formatCurrency(item.expenses)}</td><td className={item.balance >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>{formatCurrency(item.balance)}</td><td>{formatCurrency(item.investments)}</td><td>{formatCurrency(item.fixed)}</td><td>{formatCurrency(item.variable)}</td><td>{formatPercent(item.savingsRate)}</td></tr>)}</tbody></table></section>
    <p className="mt-3 text-xs text-[var(--muted)]">Melhor mês: <b className="capitalize">{monthLabel(best.month)}</b>. Os valores seguem o regime de caixa.</p>
  </>;
}
