import Link from "next/link";
import {
  deleteTransactionAction,
  duplicateTransactionAction,
  updateTransactionStatusAction,
} from "@/actions/finance";
import { ConfirmButton } from "@/components/confirm-button";
import { MutationForm } from "@/components/mutation-form";
import { EmptyState, FormDetails, PageHeader } from "@/components/page";
import { TransactionForm } from "@/components/transaction-form";
import { getMasters, getTransactions, type TransactionFilters } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

const statusLabel = {
  PAID: "Pago",
  RECEIVED: "Recebido",
  PENDING: "Pendente",
  OVERDUE: "Atrasado",
  CANCELED: "Cancelado",
};
const typeLabel = { INCOME: "Receita", EXPENSE: "Despesa", INVESTMENT: "Investimento", TRANSFER: "Transferência" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<TransactionFilters> }) {
  const filters = await searchParams;
  const [data, masters] = await Promise.all([getTransactions(filters), getMasters()]);
  return (
    <>
      <PageHeader eyebrow="Livro financeiro" title="Lançamentos" description="Registre, pesquise e acompanhe cada movimentação financeira." />
      <FormDetails title="Novo lançamento"><TransactionForm masters={masters} /></FormDetails>
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input className="field lg:col-span-2" name="q" defaultValue={filters.q} placeholder="Pesquisar descrição…" aria-label="Pesquisar" />
        <select className="field" name="type" defaultValue={filters.type ?? ""} aria-label="Tipo"><option value="">Todos os tipos</option>{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className="field" name="status" defaultValue={filters.status ?? ""} aria-label="Situação"><option value="">Todas as situações</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className="field" name="category" defaultValue={filters.category ?? ""} aria-label="Categoria"><option value="">Todas as categorias</option>{masters.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="field" name="subcategory" defaultValue={filters.subcategory ?? ""} aria-label="Subcategoria"><option value="">Todas as subcategorias</option>{masters.subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="field" name="account" defaultValue={filters.account ?? ""} aria-label="Conta"><option value="">Todas as contas</option>{masters.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="field" name="paymentMethod" defaultValue={filters.paymentMethod ?? ""} aria-label="Forma de pagamento"><option value="">Todas as formas</option>{masters.paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="field" name="card" defaultValue={filters.card ?? ""} aria-label="Cartão"><option value="">Todos os cartões</option>{masters.creditCards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input className="field" name="from" type="date" defaultValue={filters.from} aria-label="Data inicial" />
        <input className="field" name="to" type="date" defaultValue={filters.to} aria-label="Data final" />
        <select className="field" name="month" defaultValue={filters.month ?? ""} aria-label="Mês"><option value="">Todos os meses</option>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index}>{index + 1}</option>)}</select>
        <input className="field" name="year" type="number" min="2000" max="2200" defaultValue={filters.year} placeholder="Ano" aria-label="Ano" />
        <select className="field" name="sort" defaultValue={filters.sort ?? "date_desc"} aria-label="Ordenação"><option value="date_desc">Mais recentes</option><option value="date_asc">Mais antigos</option><option value="amount_desc">Maior valor</option><option value="amount_asc">Menor valor</option></select>
        <button className="btn btn-secondary">Aplicar filtros</button>
      </form>
      <section className="card">
        {data.rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Origem</th><th>Situação</th><th className="text-right">Valor</th><th>Ações</th></tr></thead>
              <tbody>
                {data.rows.map(({ transaction, categoryName, accountName, walletName, cardName }) => (
                  <tr key={transaction.id}>
                    <td>{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${transaction.date}T12:00:00Z`))}</td>
                    <td><div className="font-semibold">{transaction.description}</div><div className="text-xs text-[var(--muted)]">{typeLabel[transaction.type]}{transaction.installmentNumber ? ` · ${transaction.installmentNumber}/${transaction.totalInstallments}` : ""}</div></td>
                    <td>{categoryName ?? "—"}</td>
                    <td>{accountName ?? walletName ?? cardName ?? "—"}</td>
                    <td><span className="badge">{statusLabel[transaction.status]}</span></td>
                    <td className={`text-right font-bold ${transaction.type === "INCOME" ? "text-[var(--success)]" : ""}`}>{transaction.type === "INCOME" ? "+" : "−"} {formatCurrency(transaction.amount)}</td>
                    <td>
                      <div className="flex gap-1">
                        {transaction.status === "PENDING" && (
                          <MutationForm action={updateTransactionStatusAction} successMessage="Lançamento liquidado.">
                            <input type="hidden" name="id" value={transaction.id} />
                            <input type="hidden" name="status" value={transaction.type === "INCOME" ? "RECEIVED" : "PAID"} />
                            <button className="btn btn-secondary !min-h-8 !px-2 text-xs">Liquidar</button>
                          </MutationForm>
                        )}
                        <Link className="btn btn-secondary !min-h-8 !px-2 text-xs" href={`/lancamentos/${transaction.id}/editar`}>Editar</Link>
                        <MutationForm action={duplicateTransactionAction} successMessage="Lançamento duplicado."><input type="hidden" name="id" value={transaction.id} /><button className="btn btn-secondary !min-h-8 !px-2 text-xs">Duplicar</button></MutationForm>
                        <MutationForm action={deleteTransactionAction} successMessage="Lançamento excluído."><input type="hidden" name="id" value={transaction.id} /><ConfirmButton message="Excluir este lançamento e recalcular o saldo?" className="btn btn-danger !min-h-8 !px-2 text-xs">Excluir</ConfirmButton></MutationForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Nenhum lançamento encontrado" description="Adicione o primeiro lançamento ou ajuste os filtros." />}
      </section>
      <div className="mt-4 flex items-center justify-between text-sm text-[var(--muted)]">
        <span>Página {data.page} de {data.pages}</span>
        <div className="flex gap-2">
          {data.page > 1 && <Link className="btn btn-secondary" href={{ query: { ...filters, page: data.page - 1 } }}>Anterior</Link>}
          {data.page < data.pages && <Link className="btn btn-secondary" href={{ query: { ...filters, page: data.page + 1 } }}>Próxima</Link>}
        </div>
      </div>
    </>
  );
}
