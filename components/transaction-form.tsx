import { createTransactionAction, updateTransactionAction } from "@/actions/finance";
import { MutationForm } from "@/components/mutation-form";
import { Field, Submit } from "@/components/page";
import { isoDate } from "@/lib/utils";
import type { AwaitedReturn } from "@/types/helpers";
import type { Transaction } from "@/db/schema";

export function TransactionForm({ masters, transaction }: { masters: AwaitedReturn<typeof import("@/lib/queries").getMasters>; transaction?: Transaction }) {
  const action = transaction ? updateTransactionAction : createTransactionAction;
  return (
    <MutationForm action={action} successMessage={transaction ? "Lançamento atualizado." : "Lançamento adicionado."} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <Field label="Data"><input className="field" name="date" type="date" defaultValue={transaction?.date ?? isoDate()} required /></Field>
      <Field label="Tipo">
        <select className="field" name="type" defaultValue={transaction?.type ?? "EXPENSE"} required>
          <option value="INCOME">Receita</option><option value="EXPENSE">Despesa</option><option value="INVESTMENT">Investimento</option><option value="TRANSFER">Transferência</option>
        </select>
      </Field>
      <Field label="Descrição"><input className="field" name="description" defaultValue={transaction?.description} required placeholder="Ex.: Supermercado" /></Field>
      <Field label="Valor"><input className="field" name="amount" defaultValue={transaction ? (transaction.amount / 100).toFixed(2) : undefined} inputMode="decimal" required placeholder="0,00" /></Field>
      <Field label="Categoria">
        <select className="field" name="categoryId" defaultValue={transaction?.categoryId ?? ""}><option value="">Sem categoria</option>{masters.categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Subcategoria">
        <select className="field" name="subcategoryId" defaultValue={transaction?.subcategoryId ?? ""}><option value="">Sem subcategoria</option>{masters.subcategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Conta de origem">
        <select className="field" name="accountId" defaultValue={transaction?.accountId ?? ""}><option value="">Nenhuma</option>{masters.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Carteira de origem">
        <select className="field" name="walletId" defaultValue={transaction?.walletId ?? ""}><option value="">Nenhuma</option>{masters.wallets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Conta de destino">
        <select className="field" name="destinationAccountId" defaultValue={transaction?.destinationAccountId ?? ""}><option value="">Nenhuma</option>{masters.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Carteira de destino">
        <select className="field" name="destinationWalletId" defaultValue={transaction?.destinationWalletId ?? ""}><option value="">Nenhuma</option>{masters.wallets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Forma de pagamento">
        <select className="field" name="paymentMethodId" defaultValue={transaction?.paymentMethodId ?? ""}><option value="">Não informada</option>{masters.paymentMethods.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Cartão">
        <select className="field" name="creditCardId" defaultValue={transaction?.creditCardId ?? ""}><option value="">Nenhum</option>{masters.creditCards.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Situação">
        <select className="field" name="status" defaultValue={transaction?.status ?? "PENDING"} required><option value="PENDING">Pendente</option><option value="PAID">Pago</option><option value="RECEIVED">Recebido</option><option value="OVERDUE">Atrasado</option><option value="CANCELED">Cancelado</option></select>
      </Field>
      <Field label="Vencimento"><input className="field" name="dueDate" type="date" defaultValue={transaction?.dueDate ?? ""} /></Field>
      <Field label="Data de pagamento/recebimento"><input className="field" name="paymentDate" type="date" defaultValue={transaction?.paymentDate ?? ""} /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input name="isFixed" type="checkbox" value="true" defaultChecked={transaction?.isFixed} /> Fixa</label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input name="isEssential" type="checkbox" value="true" defaultChecked={transaction?.isEssential} /> Essencial</label>
      <Field label="Observações"><textarea className="field min-h-24" name="notes" defaultValue={transaction?.notes ?? ""} /></Field>
      <div className="flex items-end"><Submit>{transaction ? "Salvar alterações" : "Adicionar lançamento"}</Submit></div>
    </MutationForm>
  );
}
