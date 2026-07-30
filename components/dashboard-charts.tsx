"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const palette = ["#5557e8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs shadow-xl">
      {label && <div className="mb-2 font-semibold">{label}</div>}
      {payload.map((item) => (
        <div className="flex min-w-40 justify-between gap-5 py-0.5" key={item.name}>
          <span style={{ color: item.color }}>{item.name}</span>
          <strong>{formatCurrency(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function DashboardCharts({
  monthly,
  categories,
  methods,
  fixed,
  variable,
  investments,
}: {
  monthly: Array<{ month: string; income: number; expenses: number; balance: number }>;
  categories: Array<{ name: string; value: number; color: string }>;
  methods: Array<{ name: string; value: number }>;
  fixed: number;
  variable: number;
  investments: number;
}) {
  const distribution = [
    { name: "Fixas", value: fixed },
    { name: "Variáveis", value: variable },
    { name: "Investimentos", value: investments },
  ].filter((item) => item.value > 0);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="card p-5">
        <h2 className="font-bold">Receitas versus despesas</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Evolução dos últimos meses com dados realizados.</p>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis hide />
              <Tooltip content={<MoneyTooltip />} />
              <Area name="Receitas" type="monotone" dataKey="income" stroke="#10b981" fill="url(#income)" strokeWidth={2} />
              <Area name="Despesas" type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expenses)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-bold">Despesas por categoria</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Onde seu dinheiro foi utilizado neste mês.</p>
        <div className="mt-5 grid min-h-72 items-center gap-3 sm:grid-cols-[1fr_1fr]">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categories} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                {categories.map((entry, index) => <Cell key={entry.name} fill={entry.color || palette[index % palette.length]} />)}
              </Pie>
              <Tooltip content={<MoneyTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {categories.slice(0, 7).map((item) => (
              <div className="flex items-center justify-between gap-3 text-xs" key={item.name}>
                <span className="flex items-center gap-2 text-[var(--muted)]"><i className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>
                <strong>{formatCurrency(item.value)}</strong>
              </div>
            ))}
            {!categories.length && <span className="text-sm text-[var(--muted)]">Sem despesas realizadas.</span>}
          </div>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-bold">Saldo mensal</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Resultado entre entradas, despesas e aportes.</p>
        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis hide />
              <Tooltip content={<MoneyTooltip />} />
              <Bar name="Saldo" dataKey="balance" fill="#5557e8" radius={[6, 6, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-bold">Distribuição e pagamentos</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Composição das saídas e formas de pagamento.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            {distribution.map((item, index) => (
              <div key={item.name}>
                <div className="mb-1.5 flex justify-between text-xs"><span>{item.name}</span><strong>{formatCurrency(item.value)}</strong></div>
                <div className="h-2 rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, item.value / Math.max(1, ...distribution.map((x) => x.value)) * 100)}%`, background: palette[index] }} /></div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {methods.map((item, index) => (
              <div className="flex justify-between rounded-lg bg-[var(--surface-soft)] p-2.5 text-xs" key={item.name}>
                <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ background: palette[index % palette.length] }} />{item.name}</span>
                <strong>{formatCurrency(item.value)}</strong>
              </div>
            ))}
            {!methods.length && <span className="text-sm text-[var(--muted)]">Nenhum pagamento realizado.</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
