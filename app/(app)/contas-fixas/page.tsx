import { createFixedExpenseAction, generateFixedExpenseAction, toggleActiveAction } from "@/actions/finance";
import { MutationForm } from "@/components/mutation-form";
import { EmptyState, Field, FormDetails, PageHeader, Submit } from "@/components/page";
import { getFixedExpenses, getMasters } from "@/lib/queries";
import { clampInteger, formatCurrency, monthLabel } from "@/lib/utils";

export default async function FixedExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const params = await searchParams;
  const now = new Date();
  const month = clampInteger(params.month, now.getMonth() + 1, 1, 12);
  const year = clampInteger(params.year, now.getFullYear(), 2000, 2200);
  const [rows, masters] = await Promise.all([getFixedExpenses(), getMasters()]);
  return (
    <>
      <PageHeader eyebrow="Rotina" title="Contas fixas" description="Mantenha os compromissos recorrentes organizados e gere cada mês sob confirmação." />
      <FormDetails title="Nova conta fixa">
        <MutationForm action={createFixedExpenseAction} successMessage="Conta fixa cadastrada." className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome"><input className="field" name="name" required placeholder="Ex.: Energia elétrica" /></Field>
          <Field label="Categoria"><select className="field" name="categoryId" required>{masters.categories.filter((item) => item.type === "EXPENSE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Valor médio"><input className="field" name="averageAmount" required placeholder="0,00" /></Field>
          <Field label="Dia do vencimento"><input className="field" name="dueDay" type="number" min="1" max="31" required /></Field>
          <Field label="Forma de pagamento"><select className="field" name="paymentMethodId" defaultValue=""><option value="">Não informada</option>{masters.paymentMethods.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Conta"><select className="field" name="accountId" defaultValue=""><option value="">Não informada</option>{masters.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Reajuste previsto"><input className="field" name="adjustmentDate" type="date" /></Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input name="automaticDebit" type="checkbox" value="true" /> Débito automático</label>
          <Field label="Observações"><textarea className="field" name="notes" /></Field>
          <div className="flex items-end"><Submit>Cadastrar conta</Submit></div>
        </MutationForm>
      </FormDetails>
      <section className="card">
        {rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Conta</th><th>Categoria</th><th>Valor médio</th><th>Vencimento</th><th>Pagamento</th><th>Gerar lançamento</th></tr></thead><tbody>
          {rows.map(({ item, category, account }) => <tr key={item.id}><td><div className="font-semibold">{item.name}</div><div className="text-xs text-[var(--muted)]">{item.automaticDebit ? "Débito automático" : "Pagamento manual"}</div></td><td>{category}</td><td>{formatCurrency(item.averageAmount)}</td><td>Dia {item.dueDay}</td><td>{account ?? "—"}</td><td><div className="flex gap-2"><MutationForm action={generateFixedExpenseAction} successMessage="Lançamento mensal gerado." className="flex gap-2"><input type="hidden" name="id" value={item.id} /><select className="field !min-h-8 !py-1" name="month" defaultValue={month} aria-label={`Mês de ${item.name}`} required>{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{monthLabel(i + 1)}</option>)}</select><input className="field w-20 !min-h-8 !py-1" name="year" type="number" value={year} aria-label={`Ano de ${item.name}`} readOnly required /><button className="btn btn-secondary !min-h-8 !px-2 text-xs">Gerar</button></MutationForm><MutationForm action={toggleActiveAction} successMessage={item.isActive ? "Conta fixa desativada." : "Conta fixa reativada."}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="entity" value="fixed" /><input type="hidden" name="active" value={String(!item.isActive)} /><button className="btn btn-secondary !min-h-8 !px-2 text-xs">{item.isActive ? "Desativar" : "Reativar"}</button></MutationForm></div></td></tr>)}
        </tbody></table></div> : <EmptyState title="Nenhuma conta fixa" description="Cadastre compromissos recorrentes para facilitar o controle mensal." />}
      </section>
    </>
  );
}
