import { createGoalAction, updateGoalProgressAction } from "@/actions/finance";
import { EmptyState, Field, FormDetails, PageHeader, Submit } from "@/components/page";
import { goalMetrics } from "@/lib/finance";
import { getGoals } from "@/lib/queries";
import { formatCurrency, formatPercent, isoDate } from "@/lib/utils";

export default async function GoalsPage() {
  const goals = await getGoals();
  async function save(formData: FormData) { "use server"; await createGoalAction(formData); }
  return (
    <>
      <PageHeader eyebrow="Objetivos" title="Metas financeiras" description="Transforme planos em contribuições mensais possíveis de acompanhar." />
      <FormDetails title="Nova meta">
        <form action={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome"><input className="field" name="name" required /></Field>
          <Field label="Categoria"><input className="field" name="category" required placeholder="Ex.: Reserva" /></Field>
          <Field label="Valor objetivo"><input className="field" name="targetAmount" required placeholder="0,00" /></Field>
          <Field label="Valor acumulado"><input className="field" name="currentAmount" required defaultValue="0,00" /></Field>
          <Field label="Data inicial"><input className="field" name="startDate" type="date" required defaultValue={isoDate()} /></Field>
          <Field label="Prazo final"><input className="field" name="targetDate" type="date" required /></Field>
          <Field label="Prioridade"><select className="field" name="priority" defaultValue="MEDIUM"><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></Field>
          <Field label="Descrição"><input className="field" name="description" /></Field>
          <Field label="Observações"><textarea className="field" name="notes" /></Field>
          <div className="flex items-end"><Submit>Criar meta</Submit></div>
        </form>
      </FormDetails>
      {goals.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal) => {
          const metrics = goalMetrics(goal.currentAmount, goal.targetAmount, new Date(`${goal.startDate}T12:00:00`), new Date(`${goal.targetDate}T12:00:00`));
          return <article className="card p-5" key={goal.id}>
            <div className="flex items-start justify-between"><div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">{goal.category}</span><h2 className="mt-1 font-bold">{goal.name}</h2></div><span className="badge">{goal.priority === "HIGH" ? "Alta" : goal.priority === "MEDIUM" ? "Média" : "Baixa"}</span></div>
            <div className="mt-6 flex items-baseline justify-between"><strong className="text-xl">{formatCurrency(goal.currentAmount)}</strong><span className="text-xs text-[var(--muted)]">de {formatCurrency(goal.targetAmount)}</span></div>
            <div className="mt-3 h-2.5 rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${metrics.progress}%` }} /></div>
            <div className="mt-2 flex justify-between text-xs"><b>{formatPercent(metrics.progress)}</b><span style={{ color: metrics.onTrack ? "var(--success)" : "var(--warning)" }}>{metrics.onTrack ? "No ritmo esperado" : "Abaixo do esperado"}</span></div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-xs"><div><span className="text-[var(--muted)]">Restante</span><b className="mt-1 block">{formatCurrency(metrics.remaining)}</b></div><div><span className="text-[var(--muted)]">Meses</span><b className="mt-1 block">{metrics.monthsRemaining}</b></div><div><span className="text-[var(--muted)]">Por mês</span><b className="mt-1 block">{formatCurrency(metrics.monthlyNeeded)}</b></div></div>
            <form action={updateGoalProgressAction} className="mt-4 grid grid-cols-[1fr_110px_auto] gap-2 border-t pt-4"><input type="hidden" name="id" value={goal.id} /><input className="field !min-h-9 !py-1" name="currentAmount" defaultValue={(goal.currentAmount / 100).toFixed(2)} aria-label={`Valor acumulado de ${goal.name}`} /><select className="field !min-h-9 !py-1" name="status" defaultValue={goal.status}><option value="ACTIVE">Ativa</option><option value="PAUSED">Pausada</option><option value="COMPLETED">Concluída</option><option value="CANCELED">Cancelada</option></select><button className="btn btn-secondary !min-h-9 !px-2 text-xs">Atualizar</button></form>
          </article>;
        })}
      </div> : <div className="card"><EmptyState title="Nenhuma meta criada" description="Defina seu primeiro objetivo e acompanhe o progresso ao longo do tempo." /></div>}
    </>
  );
}
