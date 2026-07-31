import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
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
  users,
  wallets,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { isUuid } from "@/lib/utils";
import { financialBackupV1Schema, type FinancialBackupV1 } from "@/schemas/backup";

const ownedTables = [
  accounts,
  wallets,
  categories,
  subcategories,
  paymentMethods,
  transactions,
  monthlyBudgets,
  fixedExpenses,
  creditCards,
  creditCardPurchases,
  financialGoals,
  debts,
  settings,
] as const;
type PgBatchItem = BatchItem<"pg">;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const db = getDb();
  const rows = await Promise.all(ownedTables.map((table) => db.select().from(table).where(eq(table.userId, user.id))));
  const backup = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email },
    accounts: rows[0],
    wallets: rows[1],
    categories: rows[2],
    subcategories: rows[3],
    paymentMethods: rows[4],
    transactions: rows[5],
    monthlyBudgets: rows[6],
    fixedExpenses: rows[7],
    creditCards: rows[8],
    creditCardPurchases: rows[9],
    financialGoals: rows[10],
    debts: rows[11],
    settings: rows[12],
  };
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="clareza-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

function withUser(rows: Record<string, unknown>[], userId: string) {
  return rows.map((row) => {
    const createdAt = new Date(String(row.createdAt));
    const updatedAt = new Date(String(row.updatedAt));
    if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) {
      throw new Error("Datas de auditoria inválidas no backup.");
    }
    return { ...row, userId, createdAt, updatedAt };
  });
}

function backupIds(rows: Record<string, unknown>[], label: string) {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id : undefined;
    if (!isUuid(id) || ids.has(id)) throw new Error(`Identificador inválido ou duplicado em ${label}.`);
    ids.add(id);
  }
  return ids;
}

function addReferences(rows: Record<string, unknown>[], key: string, target: Set<string>, label: string) {
  for (const row of rows) {
    const value = row[key];
    if (value === null || value === undefined || value === "") continue;
    if (typeof value !== "string" || !isUuid(value)) throw new Error(`Referência inválida em ${label}.`);
    target.add(value);
  }
}

function requireReferences(rows: Record<string, unknown>[], key: string, allowed: Set<string>, label: string) {
  for (const row of rows) {
    const value = row[key];
    if (value === null || value === undefined || value === "") continue;
    if (typeof value !== "string" || !allowed.has(value)) throw new Error(`Referência desconhecida em ${label}.`);
  }
}

async function validateBackupRelations(data: FinancialBackupV1, userId: string, mode: "merge" | "replace") {
  if (data.settings.length > 1) throw new Error("O backup contém mais de uma configuração.");
  const imported = {
    accounts: backupIds(data.accounts, "contas"),
    wallets: backupIds(data.wallets, "carteiras"),
    categories: backupIds(data.categories, "categorias"),
    subcategories: backupIds(data.subcategories, "subcategorias"),
    paymentMethods: backupIds(data.paymentMethods, "formas de pagamento"),
    creditCards: backupIds(data.creditCards, "cartões"),
    fixedExpenses: backupIds(data.fixedExpenses, "contas fixas"),
    purchases: backupIds(data.creditCardPurchases, "compras"),
    budgets: backupIds(data.monthlyBudgets, "orçamentos"),
    goals: backupIds(data.financialGoals, "metas"),
    debts: backupIds(data.debts, "dívidas"),
    settings: backupIds(data.settings, "configurações"),
    transactions: backupIds(data.transactions, "lançamentos"),
  };
  const lookup = Object.fromEntries(Object.entries(imported).map(([key, values]) => [key, new Set(values)])) as Record<keyof typeof imported, Set<string>>;

  addReferences(data.subcategories, "categoryId", lookup.categories, "subcategorias");
  addReferences(data.fixedExpenses, "categoryId", lookup.categories, "contas fixas");
  addReferences(data.fixedExpenses, "paymentMethodId", lookup.paymentMethods, "contas fixas");
  addReferences(data.fixedExpenses, "accountId", lookup.accounts, "contas fixas");
  addReferences(data.creditCardPurchases, "creditCardId", lookup.creditCards, "compras");
  addReferences(data.creditCardPurchases, "categoryId", lookup.categories, "compras");
  addReferences(data.monthlyBudgets, "categoryId", lookup.categories, "orçamentos");
  for (const [key, target] of [
    ["categoryId", lookup.categories], ["subcategoryId", lookup.subcategories],
    ["accountId", lookup.accounts], ["destinationAccountId", lookup.accounts],
    ["walletId", lookup.wallets], ["destinationWalletId", lookup.wallets],
    ["paymentMethodId", lookup.paymentMethods], ["creditCardId", lookup.creditCards],
    ["creditCardPurchaseId", lookup.purchases], ["fixedExpenseId", lookup.fixedExpenses],
  ] as const) addReferences(data.transactions, key, target, "lançamentos");

  const db = getDb();
  const existing = await Promise.all([
    lookup.accounts.size ? db.select({ id: accounts.id, userId: accounts.userId }).from(accounts).where(inArray(accounts.id, [...lookup.accounts])) : [],
    lookup.wallets.size ? db.select({ id: wallets.id, userId: wallets.userId }).from(wallets).where(inArray(wallets.id, [...lookup.wallets])) : [],
    lookup.categories.size ? db.select({ id: categories.id, userId: categories.userId }).from(categories).where(inArray(categories.id, [...lookup.categories])) : [],
    lookup.subcategories.size ? db.select({ id: subcategories.id, userId: subcategories.userId }).from(subcategories).where(inArray(subcategories.id, [...lookup.subcategories])) : [],
    lookup.paymentMethods.size ? db.select({ id: paymentMethods.id, userId: paymentMethods.userId }).from(paymentMethods).where(inArray(paymentMethods.id, [...lookup.paymentMethods])) : [],
    lookup.creditCards.size ? db.select({ id: creditCards.id, userId: creditCards.userId }).from(creditCards).where(inArray(creditCards.id, [...lookup.creditCards])) : [],
    lookup.fixedExpenses.size ? db.select({ id: fixedExpenses.id, userId: fixedExpenses.userId }).from(fixedExpenses).where(inArray(fixedExpenses.id, [...lookup.fixedExpenses])) : [],
    lookup.purchases.size ? db.select({ id: creditCardPurchases.id, userId: creditCardPurchases.userId }).from(creditCardPurchases).where(inArray(creditCardPurchases.id, [...lookup.purchases])) : [],
    lookup.budgets.size ? db.select({ id: monthlyBudgets.id, userId: monthlyBudgets.userId }).from(monthlyBudgets).where(inArray(monthlyBudgets.id, [...lookup.budgets])) : [],
    lookup.goals.size ? db.select({ id: financialGoals.id, userId: financialGoals.userId }).from(financialGoals).where(inArray(financialGoals.id, [...lookup.goals])) : [],
    lookup.debts.size ? db.select({ id: debts.id, userId: debts.userId }).from(debts).where(inArray(debts.id, [...lookup.debts])) : [],
    lookup.settings.size ? db.select({ id: settings.id, userId: settings.userId }).from(settings).where(inArray(settings.id, [...lookup.settings])) : [],
    lookup.transactions.size ? db.select({ id: transactions.id, userId: transactions.userId }).from(transactions).where(inArray(transactions.id, [...lookup.transactions])) : [],
  ]);
  if (existing.flat().some((row) => row.userId !== userId)) throw new Error("O backup colide com dados de outro usuário.");

  const allowed = Object.fromEntries(Object.keys(imported).map((key, index) => {
    const values = new Set(imported[key as keyof typeof imported]);
    if (mode === "merge") for (const row of existing[index]) values.add(row.id);
    return [key, values];
  })) as Record<keyof typeof imported, Set<string>>;
  requireReferences(data.subcategories, "categoryId", allowed.categories, "subcategorias");
  requireReferences(data.fixedExpenses, "categoryId", allowed.categories, "contas fixas");
  requireReferences(data.fixedExpenses, "paymentMethodId", allowed.paymentMethods, "contas fixas");
  requireReferences(data.fixedExpenses, "accountId", allowed.accounts, "contas fixas");
  requireReferences(data.creditCardPurchases, "creditCardId", allowed.creditCards, "compras");
  requireReferences(data.creditCardPurchases, "categoryId", allowed.categories, "compras");
  requireReferences(data.monthlyBudgets, "categoryId", allowed.categories, "orçamentos");
  for (const [key, target] of [
    ["categoryId", allowed.categories], ["subcategoryId", allowed.subcategories],
    ["accountId", allowed.accounts], ["destinationAccountId", allowed.accounts],
    ["walletId", allowed.wallets], ["destinationWalletId", allowed.wallets],
    ["paymentMethodId", allowed.paymentMethods], ["creditCardId", allowed.creditCards],
    ["creditCardPurchaseId", allowed.purchases], ["fixedExpenseId", allowed.fixedExpenses],
  ] as const) requireReferences(data.transactions, key, target, "lançamentos");
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const password = String(form.get("password") ?? "");
  const mode = form.get("mode") === "merge" ? "merge" : "replace";
  if (!(file instanceof File) || file.size > 4_000_000) return NextResponse.json({ error: "Arquivo ausente ou maior que 4 MB." }, { status: 400 });
  if (!password || password.length > 200) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, password))) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
  let input: unknown;
  try { input = JSON.parse(await file.text()); } catch { return NextResponse.json({ error: "JSON corrompido." }, { status: 400 }); }
  const parsed = financialBackupV1Schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Backup incompatível ou inválido." }, { status: 400 });
  const data = parsed.data;
  try {
    await validateBackupRelations(data, current.id, mode);
    const queries: PgBatchItem[] = [];
    if (mode === "replace") {
      queries.push(
        db.delete(transactions).where(eq(transactions.userId, current.id)),
        db.delete(creditCardPurchases).where(eq(creditCardPurchases.userId, current.id)),
        db.delete(monthlyBudgets).where(eq(monthlyBudgets.userId, current.id)),
        db.delete(fixedExpenses).where(eq(fixedExpenses.userId, current.id)),
        db.delete(financialGoals).where(eq(financialGoals.userId, current.id)),
        db.delete(debts).where(eq(debts.userId, current.id)),
        db.delete(settings).where(eq(settings.userId, current.id)),
        db.delete(subcategories).where(eq(subcategories.userId, current.id)),
        db.delete(paymentMethods).where(eq(paymentMethods.userId, current.id)),
        db.delete(creditCards).where(eq(creditCards.userId, current.id)),
        db.delete(categories).where(eq(categories.userId, current.id)),
        db.delete(wallets).where(eq(wallets.userId, current.id)),
        db.delete(accounts).where(eq(accounts.userId, current.id)),
      );
    }
    if (data.accounts.length) queries.push(db.insert(accounts).values(withUser(data.accounts, current.id) as typeof accounts.$inferInsert[]).onConflictDoNothing());
    if (data.wallets.length) queries.push(db.insert(wallets).values(withUser(data.wallets, current.id) as typeof wallets.$inferInsert[]).onConflictDoNothing());
    if (data.categories.length) queries.push(db.insert(categories).values(withUser(data.categories, current.id) as typeof categories.$inferInsert[]).onConflictDoNothing());
    if (data.subcategories.length) queries.push(db.insert(subcategories).values(withUser(data.subcategories, current.id) as typeof subcategories.$inferInsert[]).onConflictDoNothing());
    if (data.paymentMethods.length) queries.push(db.insert(paymentMethods).values(withUser(data.paymentMethods, current.id) as typeof paymentMethods.$inferInsert[]).onConflictDoNothing());
    if (data.creditCards.length) queries.push(db.insert(creditCards).values(withUser(data.creditCards, current.id) as typeof creditCards.$inferInsert[]).onConflictDoNothing());
    if (data.fixedExpenses.length) queries.push(db.insert(fixedExpenses).values(withUser(data.fixedExpenses, current.id) as typeof fixedExpenses.$inferInsert[]).onConflictDoNothing());
    if (data.financialGoals.length) queries.push(db.insert(financialGoals).values(withUser(data.financialGoals, current.id) as typeof financialGoals.$inferInsert[]).onConflictDoNothing());
    if (data.debts.length) queries.push(db.insert(debts).values(withUser(data.debts, current.id) as typeof debts.$inferInsert[]).onConflictDoNothing());
    if (data.settings.length) queries.push(db.insert(settings).values(withUser(data.settings, current.id) as typeof settings.$inferInsert[]).onConflictDoNothing());
    if (data.creditCardPurchases.length) queries.push(db.insert(creditCardPurchases).values(withUser(data.creditCardPurchases, current.id) as typeof creditCardPurchases.$inferInsert[]).onConflictDoNothing());
    if (data.monthlyBudgets.length) queries.push(db.insert(monthlyBudgets).values(withUser(data.monthlyBudgets, current.id) as typeof monthlyBudgets.$inferInsert[]).onConflictDoNothing());
    if (data.transactions.length) queries.push(db.insert(transactions).values(withUser(data.transactions, current.id) as typeof transactions.$inferInsert[]).onConflictDoNothing());
    if (queries.length) await db.batch(queries as [PgBatchItem, ...PgBatchItem[]]);
    return NextResponse.json({ ok: true, mode });
  } catch {
    return NextResponse.json({ error: "A restauração foi cancelada sem alterar os dados. Verifique conflitos e referências." }, { status: 409 });
  }
}
