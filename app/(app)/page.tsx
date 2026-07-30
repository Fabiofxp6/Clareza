import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { PageHeader, SectionTitle } from "@/components/page";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency, formatPercent, monthLabel } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(params.month) || now.getMonth() + 1));
  const year = Math.min(2200, Math.max(2000, Number(params.year) || now.getFullYear()));
  const data = await getDashboardData(month, year);
  const cards = [
    { label: "Receita total", value: formatCurrency(data.income), icon: ArrowUpRight, tone: "var(--success)" },
    { label: "Despesas totais", value: formatCurrency(data.expenses), icon: ArrowDownRight, tone: "var(--danger)" },
    { label: "Saldo do mês", value: formatCurrency(data.balance), icon: Wallet, tone: data.balance >= 0 ? "var(--primary)" : "var(--danger)" },
    { label: "Valor economizado", value: formatCurrency(data.savings), icon: PiggyBank, tone: "var(--success)" },
    { label: "Renda comprometida", value: formatPercent(data.commitment), icon: CircleDollarSign, tone: data.commitment > 80 ? "var(--warning)" : "var(--primary)" },
    { label: "Percentual investido", value: formatPercent(data.investedPercent), icon: TrendingUp, tone: "var(--primary)" },
    { label: "Fixas · Variáveis", value: `${formatCurrency(data.fixed)} · ${formatCurrency(data.variable)}`, icon: Landmark, tone: "var(--muted)" },
    { label: "Fatura em aberto", value: formatCurrency(data.cardInvoice), icon: CreditCard, tone: "var(--warning)" },
    { label: "Dívidas pendentes", value: formatCurrency(data.debts), icon: AlertTriangle, tone: "var(--danger)" },
    { label: "Patrimônio financeiro", value: formatCurrency(data.patrimony), icon: ShieldCheck, tone: "var(--success)" },
    { label: "Progresso das metas", value: formatPercent(data.goalProgress), icon: Target, tone: "var(--primary)" },
    { label: "Orçamento utilizado", value: formatPercent(data.budgetUsed), icon: PiggyBank, tone: data.budgetUsed > 100 ? "var(--danger)" : "var(--primary)" },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title={`${monthLabel(month)} de ${year}`}
        description="Acompanhe o que entrou, saiu e avançou nos seus objetivos."
        actions={
          <form className="flex gap-2">
            <select className="field min-w-36" name="month" defaultValue={month} aria-label="Mês">
              {Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{monthLabel(i + 1)}</option>)}
            </select>
            <input className="field w-24" name="year" type="number" min="2000" max="2200" defaultValue={year} aria-label="Ano" />
            <button className="btn btn-secondary">Aplicar</button>
          </form>
        }
      />
      <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div className="card p-4" key={label}>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-soft)]" style={{ color: tone }}><Icon size={16} /></span>
            </div>
            <div className="truncate text-lg font-bold tracking-tight" title={value}>{value}</div>
          </div>
        ))}
      </div>
      <section className="card mb-7 p-5">
        <SectionTitle title="Alertas do mês" description="Situações calculadas automaticamente a partir dos seus dados." />
        {data.alerts.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.alerts.map((alert, index) => (
              <div className="flex gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5" key={`${alert.title}-${index}`}>
                <span className="mt-0.5"><AlertTriangle size={17} color={alert.level === "danger" ? "var(--danger)" : alert.level === "warning" ? "var(--warning)" : "var(--primary)"} /></span>
                <div><div className="text-sm font-semibold">{alert.title}</div><p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{alert.detail}</p></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-500/8 p-4 text-sm text-[var(--success)]">Tudo sob controle neste período.</div>
        )}
      </section>
      <DashboardCharts
        monthly={data.monthly}
        categories={data.categories}
        methods={data.methods}
        fixed={data.fixed}
        variable={data.variable}
        investments={data.investments}
      />
    </>
  );
}
