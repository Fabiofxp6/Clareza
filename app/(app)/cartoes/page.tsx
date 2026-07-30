import {
  createCardAction,
  createPurchaseAction,
  deleteCardAction,
  toggleActiveAction,
} from "@/actions/finance";
import { ConfirmButton } from "@/components/confirm-button";
import { EmptyState, Field, FormDetails, PageHeader, Submit } from "@/components/page";
import { getCardsData, getMasters } from "@/lib/queries";
import { formatCurrency, formatPercent, isoDate } from "@/lib/utils";

export default async function CardsPage() {
  const [data, masters] = await Promise.all([getCardsData(), getMasters()]);
  async function saveCard(formData: FormData) { "use server"; await createCardAction(formData); }
  async function savePurchase(formData: FormData) { "use server"; await createPurchaseAction(formData); }
  return (
    <>
      <PageHeader eyebrow="Crédito" title="Cartões de crédito" description="Acompanhe limites, faturas e a projeção de todas as compras parceladas." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.cards.map(({ card, used }) => {
          const percent = card.totalLimit ? (used / card.totalLimit) * 100 : 0;
          return <div className="card overflow-hidden p-5" key={card.id} style={{ borderTop: `4px solid ${card.color}` }}>
            <div className="flex items-start justify-between"><div><div className="font-bold">{card.name}</div><div className="text-xs text-[var(--muted)]">{card.institution ?? "Instituição não informada"}</div></div><span className="badge">{formatPercent(percent)}</span></div>
            <div className="mt-6 text-2xl font-bold">{formatCurrency(used)}</div><div className="text-xs text-[var(--muted)]">utilizado de {formatCurrency(card.totalLimit)}</div>
            <div className="mt-4 h-2 rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, percent)}%`, background: percent >= 100 ? "var(--danger)" : percent >= 70 ? "var(--warning)" : card.color }} /></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div><div className="text-[var(--muted)]">Fecha</div><b>Dia {card.closingDay}</b></div><div><div className="text-[var(--muted)]">Vence</div><b>Dia {card.dueDay}</b></div><div><div className="text-[var(--muted)]">Disponível</div><b>{formatCurrency(card.totalLimit - used)}</b></div></div>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={toggleActiveAction}>
                <input type="hidden" name="id" value={card.id} />
                <input type="hidden" name="entity" value="card" />
                <input type="hidden" name="active" value={String(!card.isActive)} />
                <button className={`btn !min-h-8 text-xs ${card.isActive ? "btn-danger" : "btn-success"}`}>
                  {card.isActive ? "Desativar cartão" : "Reativar cartão"}
                </button>
              </form>
              <form action={deleteCardAction}>
                <input type="hidden" name="id" value={card.id} />
                <ConfirmButton
                  message={`Excluir o cartão "${card.name}" e todas as compras e parcelas vinculadas? Esta ação não pode ser desfeita.`}
                  className="btn btn-danger !min-h-8 text-xs"
                >
                  Excluir cartão
                </ConfirmButton>
              </form>
            </div>
          </div>;
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormDetails title="Cadastrar cartão">
          <form action={saveCard} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome"><input className="field" name="name" required /></Field><Field label="Instituição"><input className="field" name="institution" /></Field>
            <Field label="Limite total"><input className="field" name="totalLimit" required placeholder="0,00" /></Field><Field label="Cor"><input className="field h-11" name="color" type="color" defaultValue="#111827" /></Field>
            <Field label="Dia de fechamento"><input className="field" name="closingDay" type="number" min="1" max="31" required /></Field><Field label="Dia de vencimento"><input className="field" name="dueDay" type="number" min="1" max="31" required /></Field>
            <Field label="Melhor dia de compra"><input className="field" name="bestPurchaseDay" type="number" min="1" max="31" required /></Field><div className="flex items-end"><Submit>Cadastrar</Submit></div>
          </form>
        </FormDetails>
        <FormDetails title="Registrar compra parcelada">
          <form action={savePurchase} className="grid gap-4 sm:grid-cols-2">
            <Field label="Cartão"><select className="field" name="creditCardId" required>{masters.creditCards.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Data da compra"><input className="field" name="purchaseDate" type="date" defaultValue={isoDate()} required /></Field>
            <Field label="Descrição"><input className="field" name="description" required /></Field>
            <Field label="Categoria"><select className="field" name="categoryId" required>{masters.categories.filter((item) => item.type === "EXPENSE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Valor total"><input className="field" name="totalAmount" required placeholder="0,00" /></Field>
            <Field label="Número de parcelas"><input className="field" name="totalInstallments" type="number" min="1" max="120" defaultValue="1" required /></Field>
            <div className="flex items-end"><Submit>Projetar parcelas</Submit></div>
          </form>
        </FormDetails>
      </div>
      <section className="card">
        <div className="border-b p-5"><h2 className="font-bold">Compras e parcelas futuras</h2></div>
        {data.purchases.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Descrição</th><th>Cartão</th><th>Categoria</th><th>Total</th><th>Parcelas</th><th>Primeira fatura</th><th>Status</th></tr></thead><tbody>
          {data.purchases.map(({ purchase, cardName, category }) => <tr key={purchase.id}><td>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${purchase.purchaseDate}T12:00:00`))}</td><td className="font-semibold">{purchase.description}</td><td>{cardName}</td><td>{category}</td><td>{formatCurrency(purchase.totalAmount)}</td><td>{purchase.totalInstallments} × {formatCurrency(purchase.installmentAmount)}</td><td>{String(purchase.invoiceMonth).padStart(2, "0")}/{purchase.invoiceYear}</td><td><span className="badge">{purchase.status === "OPEN" ? "Em aberto" : purchase.status}</span></td></tr>)}
        </tbody></table></div> : <EmptyState title="Nenhuma compra registrada" description="Compras parceladas aparecerão aqui com toda a projeção futura." />}
      </section>
    </>
  );
}
