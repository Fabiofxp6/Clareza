"use server";

import { addMonths, getMonth, getYear, setDate } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
import { parseMoneyToCents } from "@/lib/utils";
import {
  accountSchema,
  budgetSchema,
  cardSchema,
  categorySchema,
  debtSchema,
  fixedExpenseSchema,
  goalSchema,
  purchaseSchema,
  transactionSchema,
} from "@/schemas/finance";

type MutationResult = { ok: true } | { ok: false; error: string };

function optional(value?: string) {
  return value || null;
}

function isRealized(status: Transaction["status"]) {
  return status === "PAID" || status === "RECEIVED";
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function applyBalance(tx: Tx, record: Pick<Transaction, "type" | "status" | "amount" | "accountId" | "walletId" | "destinationAccountId" | "destinationWalletId">, multiplier = 1) {
  if (!isRealized(record.status)) return;
  const sourceDelta =
    record.type === "INCOME" ? record.amount * multiplier : -record.amount * multiplier;
  if (record.accountId) {
    await tx
      .update(accounts)
      .set({ currentBalance: sql`${accounts.currentBalance} + ${sourceDelta}`, updatedAt: new Date() })
      .where(eq(accounts.id, record.accountId));
  }
  if (record.walletId) {
    await tx
      .update(wallets)
      .set({ currentBalance: sql`${wallets.currentBalance} + ${sourceDelta}`, updatedAt: new Date() })
      .where(eq(wallets.id, record.walletId));
  }
  if ((record.type === "TRANSFER" || record.type === "INVESTMENT") && record.destinationAccountId) {
    await tx
      .update(accounts)
      .set({
        currentBalance: sql`${accounts.currentBalance} + ${record.amount * multiplier}`,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, record.destinationAccountId));
  }
  if ((record.type === "TRANSFER" || record.type === "INVESTMENT") && record.destinationWalletId) {
    await tx
      .update(wallets)
      .set({
        currentBalance: sql`${wallets.currentBalance} + ${record.amount * multiplier}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, record.destinationWalletId));
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
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(transactions).values(record).returning();
    await applyBalance(tx, created);
  });
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
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .limit(1);
    if (!existing) throw new Error("Lançamento não encontrado.");
    await applyBalance(tx, existing, -1);
    const [updated] = await tx
      .update(transactions)
      .set({
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
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .returning();
    await applyBalance(tx, updated);
  });
  revalidatePath("/");
  revalidatePath("/lancamentos");
  return { ok: true };
}

export async function updateTransactionStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Transaction["status"];
  const paymentDate = String(formData.get("paymentDate") ?? new Date().toISOString().slice(0, 10));
  if (!["PAID", "RECEIVED", "PENDING", "CANCELED"].includes(status)) return;
  const db = getDb();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .limit(1);
    if (!existing) throw new Error("Lançamento não encontrado.");
    await applyBalance(tx, existing, -1);
    const [updated] = await tx
      .update(transactions)
      .set({
        status,
        paymentDate: ["PAID", "RECEIVED"].includes(status) ? paymentDate : null,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .returning();
    await applyBalance(tx, updated);
  });
  revalidatePath("/");
  revalidatePath("/lancamentos");
}

export async function deleteTransactionAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const db = getDb();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .limit(1);
    if (!existing) return;
    await applyBalance(tx, existing, -1);
    await tx
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
  });
  revalidatePath("/");
  revalidatePath("/lancamentos");
}

export async function duplicateTransactionAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const db = getDb();
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!existing) return;
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

export async function createWalletAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return;
  const balance = parseMoneyToCents(String(formData.get("initialBalance") ?? "0"));
  await getDb().insert(wallets).values({
    userId: user.id,
    name,
    initialBalance: balance,
    currentBalance: balance,
  });
  revalidatePath("/configuracoes");
}

export async function createCategoryAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await getDb().insert(categories).values({ userId: user.id, ...parsed.data });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function createSubcategoryAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  if (name.length < 2) return;
  await getDb().insert(subcategories).values({ userId: user.id, categoryId, name });
  revalidatePath("/configuracoes");
}

export async function createPaymentMethodAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return;
  await getDb().insert(paymentMethods).values({ userId: user.id, name });
  revalidatePath("/configuracoes");
}

export async function upsertBudgetAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const db = getDb();
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
  await getDb().insert(fixedExpenses).values({
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

export async function generateFixedExpenseAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const db = getDb();
  const [fixed] = await db
    .select()
    .from(fixedExpenses)
    .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, user.id)))
    .limit(1);
  if (!fixed) return;
  const due = setDate(new Date(year, month - 1, 1), Math.min(fixed.dueDay, 28));
  await db
    .insert(transactions)
    .values({
      userId: user.id,
      date: due.toISOString().slice(0, 10),
      type: "EXPENSE",
      description: fixed.name,
      categoryId: fixed.categoryId,
      accountId: fixed.accountId,
      paymentMethodId: fixed.paymentMethodId,
      amount: fixed.averageAmount,
      status: "PENDING",
      dueDate: due.toISOString().slice(0, 10),
      isFixed: true,
      isEssential: true,
      fixedExpenseId: fixed.id,
      referenceMonth: month,
      referenceYear: year,
    })
    .onConflictDoNothing();
  revalidatePath("/contas-fixas");
  revalidatePath("/lancamentos");
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

export async function deleteCardAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const db = getDb();

  const [card] = await db
    .select({ id: creditCards.id })
    .from(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id)))
    .limit(1);
  if (!card) return;

  // The Neon HTTP driver does not support interactive transactions. Each step
  // is idempotent so a retry can safely finish an interrupted deletion.
  await db
    .delete(creditCardPurchases)
    .where(
      and(
        eq(creditCardPurchases.creditCardId, card.id),
        eq(creditCardPurchases.userId, user.id),
      ),
    );
  await db
    .update(transactions)
    .set({ creditCardId: null, updatedAt: new Date() })
    .where(and(eq(transactions.creditCardId, card.id), eq(transactions.userId, user.id)));
  await db
    .delete(creditCards)
    .where(and(eq(creditCards.id, card.id), eq(creditCards.userId, user.id)));

  revalidatePath("/");
  revalidatePath("/cartoes");
  revalidatePath("/lancamentos");
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
  const purchaseDate = new Date(`${data.purchaseDate}T12:00:00`);
  const firstInvoice = addMonths(
    purchaseDate,
    purchaseDate.getDate() >= card.closingDay ? 1 : 0,
  );
  await db.transaction(async (tx) => {
    const [purchase] = await tx
      .insert(creditCardPurchases)
      .values({
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
      })
      .returning();
    for (let i = 0; i < data.totalInstallments; i++) {
      const invoice = addMonths(firstInvoice, i);
      const amount = i === data.totalInstallments - 1 ? total - installment * i : installment;
      const due = setDate(invoice, Math.min(card.dueDay, 28));
      await tx.insert(transactions).values({
        userId: user.id,
        date: due.toISOString().slice(0, 10),
        type: "EXPENSE",
        description: `${data.description} ${i + 1}/${data.totalInstallments}`,
        categoryId: data.categoryId,
        creditCardId: card.id,
        creditCardPurchaseId: purchase.id,
        amount,
        status: "PENDING",
        dueDate: due.toISOString().slice(0, 10),
        installmentNumber: i + 1,
        totalInstallments: data.totalInstallments,
        referenceMonth: getMonth(invoice) + 1,
        referenceYear: getYear(invoice),
      });
    }
  });
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
  const values = {
    monthlyIncome: parseMoneyToCents(String(formData.get("monthlyIncome") ?? "0")),
    maximumMonthlySpending: parseMoneyToCents(String(formData.get("maximumMonthlySpending") ?? "0")),
    emergencyFundTarget: parseMoneyToCents(String(formData.get("emergencyFundTarget") ?? "0")),
    emergencyFundMonths: Number(formData.get("emergencyFundMonths") ?? 6),
    desiredInvestmentPercentage: String(formData.get("investmentPercentage") ?? "20"),
    needsPercentage: String(formData.get("needsPercentage") ?? "50"),
    wantsPercentage: String(formData.get("wantsPercentage") ?? "30"),
    investmentPercentage: String(formData.get("investmentPercentage") ?? "20"),
    debtPercentage: String(formData.get("debtPercentage") ?? "0"),
    safetyMarginPercentage: String(formData.get("safetyMarginPercentage") ?? "0"),
    theme: String(formData.get("theme") ?? "SYSTEM") as "LIGHT" | "DARK" | "SYSTEM",
    updatedAt: new Date(),
  };
  const total =
    Number(values.needsPercentage) +
    Number(values.wantsPercentage) +
    Number(values.investmentPercentage) +
    Number(values.debtPercentage) +
    Number(values.safetyMarginPercentage);
  if (Math.abs(total - 100) > 0.01) return { ok: false, error: "Os percentuais devem somar 100%." };
  await getDb()
    .insert(settings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: settings.userId, set: values });
  revalidatePath("/configuracoes");
  revalidatePath("/orcamento");
  return { ok: true };
}

export async function updateGoalProgressAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const currentAmount = parseMoneyToCents(String(formData.get("currentAmount") ?? "0"));
  await getDb()
    .update(financialGoals)
    .set({ currentAmount, status: String(formData.get("status")) as "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELED", updatedAt: new Date() })
    .where(and(eq(financialGoals.id, id), eq(financialGoals.userId, user.id)));
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function updateDebtProgressAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const currentBalance = parseMoneyToCents(String(formData.get("currentBalance") ?? "0"));
  const paidInstallments = Math.max(0, Number(formData.get("paidInstallments") ?? 0));
  const status = String(formData.get("status")) as "ACTIVE" | "OVERDUE" | "PAID" | "RENEGOTIATED";
  await getDb()
    .update(debts)
    .set({ currentBalance, paidInstallments, status, updatedAt: new Date() })
    .where(and(eq(debts.id, id), eq(debts.userId, user.id)));
  revalidatePath("/dividas");
  revalidatePath("/");
}

export async function toggleActiveAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const entity = String(formData.get("entity") ?? "");
  const isActive = formData.get("active") === "true";
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
}
