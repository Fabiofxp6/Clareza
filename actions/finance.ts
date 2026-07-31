"use server";

import { randomUUID } from "node:crypto";
import { addMonths, getMonth, getYear } from "date-fns";
import { and, eq, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getDb, type Database } from "@/db";
import {
  accounts,
  categories,
  creditCardPurchases,
  creditCards,
  debts,
  financialGoals,
  fixedExpenses,
  monthlyBudgets,
  paymentMethods,
  settings,
  subcategories,
  transactions,
  wallets,
  type Transaction,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isIsoDate, isUuid, isoDate, isoDateForMonthDay, parseMoneyToCents } from "@/lib/utils";
import {
  accountSchema,
  budgetSchema,
  cardSchema,
  categorySchema,
  debtSchema,
  debtProgressSchema,
  fixedExpenseGenerationSchema,
  fixedExpenseSchema,
  goalSchema,
  goalProgressSchema,
  paymentMethodSchema,
  purchaseSchema,
  settingsSchema,
  subcategorySchema,
  transactionSchema,
  walletSchema,
} from "@/schemas/finance";

export type MutationResult = { ok: true; message?: string } | { ok: false; error: string };
export type AccountMutationState = { ok?: boolean; error?: string; message?: string };

function optional(value?: string) {
  return value || null;
}

function isRealized(status: Transaction["status"]) {
  return status === "PAID" || status === "RECEIVED";
}

type PgBatchItem = BatchItem<"pg">;
type TransactionInput = z.infer<typeof transactionSchema>;
type BalanceRecord = Pick<Transaction, "type" | "status" | "amount" | "accountId" | "walletId" | "destinationAccountId" | "destinationWalletId">;

async function runBatch(db: Database, queries: PgBatchItem[]) {
  if (!queries.length) return;
  await db.batch(queries as [PgBatchItem, ...PgBatchItem[]]);
}

function balanceQueries(db: Database, userId: string, record: BalanceRecord, multiplier = 1): PgBatchItem[] {
  if (!isRealized(record.status)) return [];
  const queries: PgBatchItem[] = [];
  const sourceDelta =
    record.type === "INCOME" ? record.amount * multiplier : -record.amount * multiplier;
  if (record.accountId) {
    queries.push(db
      .update(accounts)
      .set({ currentBalance: sql`${accounts.currentBalance} + ${sourceDelta}`, updatedAt: new Date() })
      .where(and(eq(accounts.id, record.accountId), eq(accounts.userId, userId))));
  }
  if (record.walletId) {
    queries.push(db
      .update(wallets)
      .set({ currentBalance: sql`${wallets.currentBalance} + ${sourceDelta}`, updatedAt: new Date() })
      .where(and(eq(wallets.id, record.walletId), eq(wallets.userId, userId))));
  }
  if ((record.type === "TRANSFER" || record.type === "INVESTMENT") && record.destinationAccountId) {
    queries.push(db
      .update(accounts)
      .set({
        currentBalance: sql`${accounts.currentBalance} + ${record.amount * multiplier}`,
        updatedAt: new Date(),
      })
      .where(and(eq(accounts.id, record.destinationAccountId), eq(accounts.userId, userId))));
  }
  if ((record.type === "TRANSFER" || record.type === "INVESTMENT") && record.destinationWalletId) {
    queries.push(db
      .update(wallets)
      .set({
        currentBalance: sql`${wallets.currentBalance} + ${record.amount * multiplier}`,
        updatedAt: new Date(),
      })
      .where(and(eq(wallets.id, record.destinationWalletId), eq(wallets.userId, userId))));
  }
  return queries;
}

async function validateTransactionReferences(db: Database, userId: string, data: TransactionInput) {
  const [categoryRows, subcategoryRows, accountRows, walletRows, destinationAccountRows, destinationWalletRows, paymentMethodRows, cardRows] = await Promise.all([
    data.categoryId ? db.select({ id: categories.id, type: categories.type }).from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.userId, userId))).limit(1) : [],
    data.subcategoryId ? db.select({ id: subcategories.id, categoryId: subcategories.categoryId }).from(subcategories).where(and(eq(subcategories.id, data.subcategoryId), eq(subcategories.userId, userId))).limit(1) : [],
    data.accountId ? db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, data.accountId), eq(accounts.userId, userId))).limit(1) : [],
    data.walletId ? db.select({ id: wallets.id }).from(wallets).where(and(eq(wallets.id, data.walletId), eq(wallets.userId, userId))).limit(1) : [],
    data.destinationAccountId ? db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, data.destinationAccountId), eq(accounts.userId, userId))).limit(1) : [],
    data.destinationWalletId ? db.select({ id: wallets.id }).from(wallets).where(and(eq(wallets.id, data.destinationWalletId), eq(wallets.userId, userId))).limit(1) : [],
    data.paymentMethodId ? db.select({ id: paymentMethods.id }).from(paymentMethods).where(and(eq(paymentMethods.id, data.paymentMethodId), eq(paymentMethods.userId, userId))).limit(1) : [],
    data.creditCardId ? db.select({ id: creditCards.id }).from(creditCards).where(and(eq(creditCards.id, data.creditCardId), eq(creditCards.userId, userId))).limit(1) : [],
  ]);

  if (data.categoryId && !categoryRows[0]) return "Categoria não encontrada.";
  if (data.subcategoryId && !subcategoryRows[0]) return "Subcategoria não encontrada.";
  if (data.subcategoryId && data.categoryId && subcategoryRows[0]?.categoryId !== data.categoryId) return "A subcategoria não pertence à categoria informada.";
  if (data.accountId && !accountRows[0]) return "Conta de origem não encontrada.";
  if (data.walletId && !walletRows[0]) return "Carteira de origem não encontrada.";
  if (data.destinationAccountId && !destinationAccountRows[0]) return "Conta de destino não encontrada.";
  if (data.destinationWalletId && !destinationWalletRows[0]) return "Carteira de destino não encontrada.";
  if (data.paymentMethodId && !paymentMethodRows[0]) return "Forma de pagamento não encontrada.";
  if (data.creditCardId && !cardRows[0]) return "Cartão não encontrado.";
  if (data.type !== "TRANSFER" && categoryRows[0] && categoryRows[0].type !== data.type) {
    return "A categoria não é compatível com o tipo de lançamento.";
  }
}

export async function createTransactionAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  const record = {
    userId: user.id,
    date: data.date,
    type: data.type,
    description: data.description,
    categoryId: optional(data.categoryId),
    subcategoryId: optional(data.subcategoryId),
    accountId: optional(data.accountId),
    walletId: optional(data.walletId),
    destinationAccountId: optional(data.destinationAccountId),
    destinationWalletId: optional(data.destinationWalletId),
    paymentMethodId: optional(data.paymentMethodId),
    creditCardId: optional(data.creditCardId),
    amount: parseMoneyToCents(data.amount),
    status: data.status,
    dueDate: optional(data.dueDate),
    paymentDate: optional(data.paymentDate),
    isFixed: data.isFixed,
    isEssential: data.isEssential,
    notes: data.notes || null,
  };
  const db = getDb();
  const referenceError = await validateTransactionReferences(db, user.id, data);
  if (referenceError) return { ok: false, error: referenceError };
  await runBatch(db, [db.insert(transactions).values(record), ...balanceQueries(db, user.id, record)]);
  revalidatePath("/");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function updateTransactionAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  const db = getDb();
  if (!isUuid(id)) return { ok: false, error: "Lançamento inválido." };
  const referenceError = await validateTransactionReferences(db, user.id, data);
  if (referenceError) return { ok: false, error: referenceError };
  const [existing] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id))).limit(1);
  if (!existing) return { ok: false, error: "Lançamento não encontrado." };
  const changes = {
    date: data.date,
    type: data.type,
    description: data.description,
    categoryId: optional(data.categoryId),
    subcategoryId: optional(data.subcategoryId),
    accountId: optional(data.accountId),
    walletId: optional(data.walletId),
    destinationAccountId: optional(data.destinationAccountId),
    destinationWalletId: optional(data.destinationWalletId),
    paymentMethodId: optional(data.paymentMethodId),
    creditCardId: optional(data.creditCardId),
    amount: parseMoneyToCents(data.amount),
    status: data.status,
    dueDate: optional(data.dueDate),
    paymentDate: optional(data.paymentDate),
    isFixed: data.isFixed,
    isEssential: data.isEssential,
    notes: data.notes || null,
    updatedAt: new Date(),
  };
  const updated: BalanceRecord = { ...existing, ...changes };
  await runBatch(db, [
    ...balanceQueries(db, user.id, existing, -1),
    db.update(transactions).set(changes).where(and(eq(transactions.id, id), eq(transactions.userId, user.id))),
    ...balanceQueries(db, user.id, updated),
  ]);
  revalidatePath("/");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function updateTransactionStatusAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Transaction["status"];
  const paymentDate = String(formData.get("paymentDate") ?? isoDate());
  if (!isUuid(id) || !["PAID", "RECEIVED", "PENDING", "CANCELED"].includes(status) || !isIsoDate(paymentDate)) {
    return { ok: false, error: "Situação ou data de liquidação inválida." };
  }
  const db = getDb();
  const [existing] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id))).limit(1);
  if (!existing) return { ok: false, error: "Lançamento não encontrado." };
  if ((existing.type === "INCOME" && status === "PAID") || (existing.type !== "INCOME" && status === "RECEIVED")) {
    return { ok: false, error: existing.type === "INCOME" ? "Receitas devem ser marcadas como recebidas." : "Somente receitas podem ser marcadas como recebidas." };
  }
  const changes = { status, paymentDate: ["PAID", "RECEIVED"].includes(status) ? paymentDate : null, updatedAt: new Date() };
  const updated: BalanceRecord = { ...existing, ...changes };
  await runBatch(db, [
    ...balanceQueries(db, user.id, existing, -1),
    db.update(transactions).set(changes).where(and(eq(transactions.id, id), eq(transactions.userId, user.id))),
    ...balanceQueries(db, user.id, updated),
  ]);
  revalidatePath("/");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function deleteTransactionAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, error: "Lançamento inválido." };
  const db = getDb();
  const [existing] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id))).limit(1);
  if (!existing) return { ok: false, error: "Lançamento não encontrado." };
  await runBatch(db, [
    ...balanceQueries(db, user.id, existing, -1),
    db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id))),
  ]);
  revalidatePath("/");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function duplicateTransactionAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, error: "Lançamento inválido." };
  const db = getDb();
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!existing) return { ok: false, error: "Lançamento não encontrado." };
  const { id: _, createdAt: __, updatedAt: ___, ...copy } = existing;
  void _;
  void __;
  void ___;
  await db.insert(transactions).values({
    ...copy,
    description: `${copy.description} (cópia)`,
    status: "PENDING",
    paymentDate: null,
  });
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function createAccountAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const balance = parseMoneyToCents(parsed.data.initialBalance);
  await getDb().insert(accounts).values({
    userId: user.id,
    name: parsed.data.name,
    institution: parsed.data.institution || null,
    type: parsed.data.type,
    initialBalance: balance,
    currentBalance: balance,
    color: parsed.data.color,
  });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function updateAccountAction(
  _previousState: AccountMutationState,
  formData: FormData,
): Promise<AccountMutationState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Conta bancária inválida." };
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ initialBalance: accounts.initialBalance })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
    .limit(1);
  if (!existing) return { error: "Conta bancária não encontrada." };

  const data = parsed.data;
  const initialBalance = parseMoneyToCents(data.initialBalance);
  const balanceDifference = initialBalance - existing.initialBalance;
  await db
    .update(accounts)
    .set({
      name: data.name,
      institution: data.institution || null,
      type: data.type,
      initialBalance,
      currentBalance: sql`${accounts.currentBalance} + ${balanceDifference}`,
      color: data.color,
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  revalidatePath("/");
  revalidatePath("/configuracoes");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function toggleAccountAction(
  _previousState: AccountMutationState,
  formData: FormData,
): Promise<AccountMutationState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Conta bancária inválida." };
  const db = getDb();
  const [existing] = await db
    .select({ isActive: accounts.isActive })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
    .limit(1);
  if (!existing) return { error: "Conta bancária não encontrada." };

  await db
    .update(accounts)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/configuracoes");
  return { ok: true, message: existing.isActive ? "Conta desativada." : "Conta reativada." };
}

export async function deleteAccountAction(
  _previousState: AccountMutationState,
  formData: FormData,
): Promise<AccountMutationState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Conta bancária inválida." };
  const db = getDb();
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
    .limit(1);
  if (!existing) return { error: "Conta bancária não encontrada." };

  const [linked] = await db
    .select({ total: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        or(eq(transactions.accountId, id), eq(transactions.destinationAccountId, id)),
      ),
    );
  const linkedTransactions = Number(linked?.total ?? 0);
  if (linkedTransactions > 0) {
    return {
      error: `Esta conta possui ${linkedTransactions} lançamento${linkedTransactions === 1 ? "" : "s"} vinculado${linkedTransactions === 1 ? "" : "s"}. Desative a conta para preservar o histórico financeiro.`,
    };
  }

  await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function createWalletAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = walletSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const balance = parseMoneyToCents(parsed.data.initialBalance);
  await getDb().insert(wallets).values({
    userId: user.id,
    name: parsed.data.name,
    initialBalance: balance,
    currentBalance: balance,
  });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function createCategoryAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await getDb().insert(categories).values({ userId: user.id, ...parsed.data });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function createSubcategoryAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = subcategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const db = getDb();
  const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, parsed.data.categoryId), eq(categories.userId, user.id))).limit(1);
  if (!category) return { ok: false, error: "Categoria não encontrada." };
  await db.insert(subcategories).values({ userId: user.id, ...parsed.data });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function createPaymentMethodAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = paymentMethodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await getDb().insert(paymentMethods).values({ userId: user.id, name: parsed.data.name });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function upsertBudgetAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const db = getDb();
  const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, parsed.data.categoryId), eq(categories.userId, user.id), eq(categories.type, "EXPENSE"))).limit(1);
  if (!category) return { ok: false, error: "Categoria de despesa não encontrada." };
  await db
    .insert(monthlyBudgets)
    .values({
      userId: user.id,
      categoryId: parsed.data.categoryId,
      month: parsed.data.month,
      year: parsed.data.year,
      plannedAmount: parseMoneyToCents(parsed.data.plannedAmount),
    })
    .onConflictDoUpdate({
      target: [
        monthlyBudgets.userId,
        monthlyBudgets.categoryId,
        monthlyBudgets.month,
        monthlyBudgets.year,
      ],
      set: {
        plannedAmount: parseMoneyToCents(parsed.data.plannedAmount),
        updatedAt: new Date(),
      },
    });
  revalidatePath("/orcamento");
  return { ok: true };
}

export async function createFixedExpenseAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = fixedExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  const db = getDb();
  const [categoryRows, paymentRows, accountRows] = await Promise.all([
    db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.userId, user.id), eq(categories.type, "EXPENSE"))).limit(1),
    data.paymentMethodId ? db.select({ id: paymentMethods.id }).from(paymentMethods).where(and(eq(paymentMethods.id, data.paymentMethodId), eq(paymentMethods.userId, user.id))).limit(1) : [],
    data.accountId ? db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, data.accountId), eq(accounts.userId, user.id))).limit(1) : [],
  ]);
  if (!categoryRows[0]) return { ok: false, error: "Categoria de despesa não encontrada." };
  if (data.paymentMethodId && !paymentRows[0]) return { ok: false, error: "Forma de pagamento não encontrada." };
  if (data.accountId && !accountRows[0]) return { ok: false, error: "Conta bancária não encontrada." };
  await db.insert(fixedExpenses).values({
    userId: user.id,
    name: data.name,
    categoryId: data.categoryId,
    averageAmount: parseMoneyToCents(data.averageAmount),
    dueDay: data.dueDay,
    paymentMethodId: optional(data.paymentMethodId),
    accountId: optional(data.accountId),
    automaticDebit: data.automaticDebit,
    adjustmentDate: optional(data.adjustmentDate),
    notes: data.notes || null,
  });
  revalidatePath("/contas-fixas");
  return { ok: true };
}

export async function generateFixedExpenseAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = fixedExpenseGenerationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Período inválido." };
  const { id, month, year } = parsed.data;
  const db = getDb();
  const [fixed] = await db
    .select()
    .from(fixedExpenses)
    .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, user.id)))
    .limit(1);
  if (!fixed) return { ok: false, error: "Conta fixa não encontrada." };
  const due = isoDateForMonthDay(year, month, fixed.dueDay);
  await db
    .insert(transactions)
    .values({
      userId: user.id,
      date: due,
      type: "EXPENSE",
      description: fixed.name,
      categoryId: fixed.categoryId,
      accountId: fixed.accountId,
      paymentMethodId: fixed.paymentMethodId,
      amount: fixed.averageAmount,
      status: "PENDING",
      dueDate: due,
      isFixed: true,
      isEssential: true,
      fixedExpenseId: fixed.id,
      referenceMonth: month,
      referenceYear: year,
    })
    .onConflictDoNothing();
  revalidatePath("/contas-fixas");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function createCardAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = cardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  await getDb().insert(creditCards).values({
    userId: user.id,
    name: data.name,
    institution: data.institution || null,
    totalLimit: parseMoneyToCents(data.totalLimit),
    closingDay: data.closingDay,
    dueDay: data.dueDay,
    bestPurchaseDay: data.bestPurchaseDay,
    color: data.color,
  });
  revalidatePath("/cartoes");
  return { ok: true };
}

export async function deleteCardAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, error: "Cartão inválido." };
  const db = getDb();

  const [card] = await db
    .select({ id: creditCards.id })
    .from(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id)))
    .limit(1);
  if (!card) return { ok: false, error: "Cartão não encontrado." };

  await runBatch(db, [
    db.delete(creditCardPurchases).where(
      and(
        eq(creditCardPurchases.creditCardId, card.id),
        eq(creditCardPurchases.userId, user.id),
      ),
    ),
    db.update(transactions).set({ creditCardId: null, updatedAt: new Date() }).where(and(eq(transactions.creditCardId, card.id), eq(transactions.userId, user.id))),
    db.delete(creditCards).where(and(eq(creditCards.id, card.id), eq(creditCards.userId, user.id))),
  ]);

  revalidatePath("/");
  revalidatePath("/cartoes");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function createPurchaseAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  const total = parseMoneyToCents(data.totalAmount);
  const installment = Math.floor(total / data.totalInstallments);
  const db = getDb();
  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, data.creditCardId), eq(creditCards.userId, user.id)))
    .limit(1);
  if (!card) return { ok: false, error: "Cartão não encontrado." };
  const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.userId, user.id), eq(categories.type, "EXPENSE"))).limit(1);
  if (!category) return { ok: false, error: "Categoria de despesa não encontrada." };
  const purchaseDate = new Date(`${data.purchaseDate}T12:00:00`);
  const firstInvoice = addMonths(
    purchaseDate,
    purchaseDate.getDate() >= card.closingDay ? 1 : 0,
  );
  const purchaseId = randomUUID();
  const purchaseQuery = db.insert(creditCardPurchases).values({
    id: purchaseId,
    userId: user.id,
    creditCardId: card.id,
    purchaseDate: data.purchaseDate,
    description: data.description,
    categoryId: data.categoryId,
    totalAmount: total,
    installmentAmount: installment,
    totalInstallments: data.totalInstallments,
    invoiceMonth: getMonth(firstInvoice) + 1,
    invoiceYear: getYear(firstInvoice),
  });
  const installmentQueries = Array.from({ length: data.totalInstallments }, (_, i) => {
    const invoice = addMonths(firstInvoice, i);
    const amount = i === data.totalInstallments - 1 ? total - installment * i : installment;
    const invoiceMonth = getMonth(invoice) + 1;
    const invoiceYear = getYear(invoice);
    const due = isoDateForMonthDay(invoiceYear, invoiceMonth, card.dueDay);
    return db.insert(transactions).values({
        userId: user.id,
        date: due,
        type: "EXPENSE",
        description: `${data.description} ${i + 1}/${data.totalInstallments}`,
        categoryId: data.categoryId,
        creditCardId: card.id,
        creditCardPurchaseId: purchaseId,
        amount,
        status: "PENDING",
        dueDate: due,
        installmentNumber: i + 1,
        totalInstallments: data.totalInstallments,
        referenceMonth: invoiceMonth,
        referenceYear: invoiceYear,
      });
  });
  await runBatch(db, [purchaseQuery, ...installmentQueries]);
  revalidatePath("/cartoes");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function createGoalAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  await getDb().insert(financialGoals).values({
    userId: user.id,
    ...data,
    targetAmount: parseMoneyToCents(data.targetAmount),
    currentAmount: parseMoneyToCents(data.currentAmount),
    description: data.description || null,
    notes: data.notes || null,
  });
  revalidatePath("/metas");
  return { ok: true };
}

export async function createDebtAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = debtSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  await getDb().insert(debts).values({
    userId: user.id,
    ...data,
    originalAmount: parseMoneyToCents(data.originalAmount),
    currentBalance: parseMoneyToCents(data.currentBalance),
    installmentAmount: parseMoneyToCents(data.installmentAmount),
    interestRate: String(data.interestRate),
    estimatedPayoffDate: optional(data.estimatedPayoffDate),
    nextDueDate: optional(data.nextDueDate),
    notes: data.notes || null,
  });
  revalidatePath("/dividas");
  return { ok: true };
}

export async function updateSettingsAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  const values = {
    monthlyIncome: parseMoneyToCents(data.monthlyIncome),
    maximumMonthlySpending: parseMoneyToCents(data.maximumMonthlySpending),
    emergencyFundTarget: parseMoneyToCents(data.emergencyFundTarget),
    emergencyFundMonths: data.emergencyFundMonths,
    desiredInvestmentPercentage: String(data.investmentPercentage),
    needsPercentage: String(data.needsPercentage),
    wantsPercentage: String(data.wantsPercentage),
    investmentPercentage: String(data.investmentPercentage),
    debtPercentage: String(data.debtPercentage),
    safetyMarginPercentage: String(data.safetyMarginPercentage),
    theme: data.theme,
    updatedAt: new Date(),
  };
  await getDb()
    .insert(settings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: settings.userId, set: values });
  revalidatePath("/configuracoes");
  revalidatePath("/orcamento");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateGoalProgressAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = goalProgressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { id, status } = parsed.data;
  const currentAmount = parseMoneyToCents(parsed.data.currentAmount);
  await getDb()
    .update(financialGoals)
    .set({ currentAmount, status, updatedAt: new Date() })
    .where(and(eq(financialGoals.id, id), eq(financialGoals.userId, user.id)));
  revalidatePath("/metas");
  revalidatePath("/");
  return { ok: true };
}

export async function updateDebtProgressAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = debtProgressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { id, paidInstallments, status } = parsed.data;
  const currentBalance = parseMoneyToCents(parsed.data.currentBalance);
  const db = getDb();
  const [debt] = await db.select({ totalInstallments: debts.totalInstallments }).from(debts).where(and(eq(debts.id, id), eq(debts.userId, user.id))).limit(1);
  if (!debt) return { ok: false, error: "Dívida não encontrada." };
  if (debt.totalInstallments !== null && paidInstallments > debt.totalInstallments) {
    return { ok: false, error: "As parcelas pagas não podem superar o total de parcelas." };
  }
  await db
    .update(debts)
    .set({ currentBalance, paidInstallments, status, updatedAt: new Date() })
    .where(and(eq(debts.id, id), eq(debts.userId, user.id)));
  revalidatePath("/dividas");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleActiveAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const entity = String(formData.get("entity") ?? "");
  const isActive = formData.get("active") === "true";
  if (!isUuid(id) || !["card", "fixed", "account", "wallet", "category"].includes(entity)) {
    return { ok: false, error: "Cadastro inválido." };
  }
  const db = getDb();
  if (entity === "card")
    await db.update(creditCards).set({ isActive, updatedAt: new Date() }).where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id)));
  if (entity === "fixed")
    await db.update(fixedExpenses).set({ isActive, updatedAt: new Date() }).where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, user.id)));
  if (entity === "account")
    await db.update(accounts).set({ isActive, updatedAt: new Date() }).where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
  if (entity === "wallet")
    await db.update(wallets).set({ isActive, updatedAt: new Date() }).where(and(eq(wallets.id, id), eq(wallets.userId, user.id)));
  if (entity === "category")
    await db.update(categories).set({ isActive, updatedAt: new Date() }).where(and(eq(categories.id, id), eq(categories.userId, user.id)));
  revalidatePath("/configuracoes");
  revalidatePath("/cartoes");
  revalidatePath("/contas-fixas");
  return { ok: true };
}
