"use client";

import { useState } from "react";
import { createTransactionAction, updateTransactionAction } from "@/actions/finance";
import { MutationForm } from "@/components/mutation-form";
import { Field, Submit } from "@/components/page";
import { isoDate } from "@/lib/utils";
import type { AwaitedReturn } from "@/types/helpers";
import type { Transaction } from "@/db/schema";

export function TransactionForm({ masters, transaction }: { masters: AwaitedReturn<typeof import("@/lib/queries").getMasters>; transaction?: Transaction }) {
  const action = transaction ? updateTransactionAction : createTransactionAction;
  const [type, setType] = useState<Transaction["type"]>(transaction?.type ?? "EXPENSE");
  const [status, setStatus] = useState<Transaction["status"]>(() => {
    if (transaction?.type === "INCOME" && transaction.status === "PAID") return "RECEIVED";
    if (transaction?.type !== "INCOME" && transaction?.status === "RECEIVED") return "PAID";
    return transaction?.status ?? "PENDING";
  });
  const [paymentDate, setPaymentDate] = useState(transaction?.paymentDate ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(transaction?.subcategoryId ?? "");
  const [accountId, setAccountId] = useState(transaction?.accountId ?? "");
  const [walletId, setWalletId] = useState(transaction?.walletId ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState(transaction?.destinationAccountId ?? "");
  const [destinationWalletId, setDestinationWalletId] = useState(transaction?.destinationWalletId ?? "");
  const [creditCardId, setCreditCardId] = useState(transaction?.creditCardId ?? "");
  const isIncome = type === "INCOME";
  const isRealized = status === "PAID" || status === "RECEIVED";
  const allowsDestination = type === "TRANSFER" || type === "INVESTMENT";
  const availableCategories = type === "TRANSFER"
    ? masters.categories
    : masters.categories.filter((item) => item.type === type);
  const availableSubcategories = categoryId
    ? masters.subcategories.filter((item) => item.categoryId === categoryId)
    : [];

  function changeType(nextType: Transaction["type"]) {
    setType(nextType);
    if (nextType !== "EXPENSE") setCreditCardId("");
    if (nextType !== "TRANSFER" && nextType !== "INVESTMENT") {
      setDestinationAccountId("");
      setDestinationWalletId("");
    }
    const compatibleCategory = !categoryId || nextType === "TRANSFER" || masters.categories.some((item) => item.id === categoryId && item.type === nextType);
    if (!compatibleCategory) {
      setCategoryId("");
      setSubcategoryId("");
    }
    setStatus((current) => {
      if (nextType === "INCOME" && current === "PAID") {
        if (!paymentDate) setPaymentDate(isoDate());
        return "RECEIVED";
      }
      if (nextType !== "INCOME" && current === "RECEIVED") {
        if (!paymentDate) setPaymentDate(isoDate());
        return "PAID";
      }
      return current;
    });
  }

  function changeCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setSubcategoryId((current) => masters.subcategories.some((item) => item.id === current && item.categoryId === nextCategoryId) ? current : "");
  }

  function changeAccount(nextAccountId: string) {
    setAccountId(nextAccountId);
    if (nextAccountId) {
      setWalletId("");
      setCreditCardId("");
    }
  }

  function changeWallet(nextWalletId: string) {
    setWalletId(nextWalletId);
    if (nextWalletId) {
      setAccountId("");
      setCreditCardId("");
    }
  }

  function changeCard(nextCardId: string) {
    setCreditCardId(nextCardId);
    if (nextCardId) {
      setAccountId("");
      setWalletId("");
    }
  }

  function changeDestinationAccount(nextAccountId: string) {
    setDestinationAccountId(nextAccountId);
    if (nextAccountId) setDestinationWalletId("");
  }

  function changeDestinationWallet(nextWalletId: string) {
    setDestinationWalletId(nextWalletId);
    if (nextWalletId) setDestinationAccountId("");
  }

  function changeStatus(nextStatus: Transaction["status"]) {
    setStatus(nextStatus);
    if (nextStatus === "PAID" || nextStatus === "RECEIVED") {
      if (!paymentDate) setPaymentDate(isoDate());
    } else {
      setPaymentDate("");
    }
  }

  return (
    <MutationForm action={action} successMessage={transaction ? "Lançamento atualizado." : "Lançamento adicionado."} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <Field label="Data"><input className="field" name="date" type="date" defaultValue={transaction?.date ?? isoDate()} required /></Field>
      <Field label="Tipo">
        <select className="field" name="type" value={type} onChange={(event) => changeType(event.target.value as Transaction["type"])} required>
          <option value="INCOME">Receita</option><option value="EXPENSE">Despesa</option><option value="INVESTMENT">Investimento</option><option value="TRANSFER">Transferência</option>
        </select>
      </Field>
      <Field label="Descrição"><input className="field" name="description" defaultValue={transaction?.description} required placeholder="Ex.: Supermercado" /></Field>
      <Field label="Valor"><input className="field" name="amount" defaultValue={transaction ? (transaction.amount / 100).toFixed(2) : undefined} inputMode="decimal" required placeholder="0,00" /></Field>
      <Field label="Categoria">
        <select className="field" name="categoryId" value={categoryId} onChange={(event) => changeCategory(event.target.value)}><option value="">Sem categoria</option>{availableCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Subcategoria">
        <select className="field" name="subcategoryId" value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} disabled={!categoryId}><option value="">Sem subcategoria</option>{availableSubcategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label={isIncome ? "Conta de recebimento" : "Conta de origem"}>
        <select className="field" name="accountId" value={accountId} onChange={(event) => changeAccount(event.target.value)}><option value="">Nenhuma</option>{masters.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label={isIncome ? "Carteira de recebimento" : "Carteira de origem"}>
        <select className="field" name="walletId" value={walletId} onChange={(event) => changeWallet(event.target.value)}><option value="">Nenhuma</option>{masters.wallets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      {allowsDestination && <Field label="Conta de destino">
        <select className="field" name="destinationAccountId" value={destinationAccountId} onChange={(event) => changeDestinationAccount(event.target.value)}><option value="">Nenhuma</option>{masters.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>}
      {allowsDestination && <Field label="Carteira de destino">
        <select className="field" name="destinationWalletId" value={destinationWalletId} onChange={(event) => changeDestinationWallet(event.target.value)}><option value="">Nenhuma</option>{masters.wallets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>}
      <Field label="Forma de pagamento">
        <select className="field" name="paymentMethodId" defaultValue={transaction?.paymentMethodId ?? ""}><option value="">Não informada</option>{masters.paymentMethods.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>
      {type === "EXPENSE" && <Field label="Cartão">
        <select className="field" name="creditCardId" value={creditCardId} onChange={(event) => changeCard(event.target.value)}><option value="">Nenhum</option>{masters.creditCards.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      </Field>}
      <Field label="Situação">
        <select className="field" name="status" value={status} onChange={(event) => changeStatus(event.target.value as Transaction["status"])} required>
          <option value="PENDING">Pendente</option>
          {isIncome ? <option value="RECEIVED">Recebido</option> : <option value="PAID">Pago</option>}
          <option value="OVERDUE">Atrasado</option>
          <option value="CANCELED">Cancelado</option>
        </select>
      </Field>
      <Field label="Vencimento"><input className="field" name="dueDate" type="date" defaultValue={transaction?.dueDate ?? ""} /></Field>
      <Field label={isIncome ? "Data de recebimento" : "Data de pagamento"} required={isRealized}>
        <input className="field" name="paymentDate" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required={isRealized} />
        {!isRealized && <span className="text-[11px] font-normal text-[var(--muted)]">Obrigatória somente ao liquidar o lançamento.</span>}
      </Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input name="isFixed" type="checkbox" value="true" defaultChecked={transaction?.isFixed} /> Fixa</label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input name="isEssential" type="checkbox" value="true" defaultChecked={transaction?.isEssential} /> Essencial</label>
      <Field label="Observações"><textarea className="field min-h-24" name="notes" defaultValue={transaction?.notes ?? ""} /></Field>
      <div className="flex items-end"><Submit>{transaction ? "Salvar alterações" : "Adicionar lançamento"}</Submit></div>
    </MutationForm>
  );
}
