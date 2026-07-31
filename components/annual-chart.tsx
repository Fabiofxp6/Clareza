"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, monthLabel } from "@/lib/utils";

export function AnnualCharts({ data }: { data: Array<{ month: number; income: number; expenses: number; investments: number; balance: number }> }) {
  const rows = data.map((item) => ({ ...item, label: monthLabel(item.month).slice(0, 3) }));
  return <div className="grid gap-4 xl:grid-cols-2">
    <section className="card p-5"><h2 className="font-bold">Receitas e despesas</h2><div className="mt-5 h-72" role="img" aria-label="Gráfico anual de receitas e despesas por mês"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} /><YAxis hide /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Legend /><Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[5, 5, 0, 0]} /><Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="card p-5"><h2 className="font-bold">Saldo e investimentos</h2><div className="mt-5 h-72" role="img" aria-label="Gráfico anual de saldo e investimentos por mês"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} /><YAxis hide /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Legend /><Line dataKey="balance" name="Saldo" stroke="#22c55e" strokeWidth={2} /><Line dataKey="investments" name="Investimentos" stroke="#38bdf8" strokeWidth={2} /></LineChart></ResponsiveContainer></div></section>
  </div>;
}
