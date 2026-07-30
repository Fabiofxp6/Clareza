import { eq } from "drizzle-orm";
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
import { financialBackupV1Schema } from "@/schemas/backup";

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
  return rows.map((row) => ({ ...row, userId, createdAt: new Date(String(row.createdAt)), updatedAt: new Date(String(row.updatedAt)) }));
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const password = String(form.get("password") ?? "");
  const mode = form.get("mode") === "merge" ? "merge" : "replace";
  if (!(file instanceof File) || file.size > 4_000_000) return NextResponse.json({ error: "Arquivo ausente ou maior que 4 MB." }, { status: 400 });
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, password))) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
  let input: unknown;
  try { input = JSON.parse(await file.text()); } catch { return NextResponse.json({ error: "JSON corrompido." }, { status: 400 }); }
  const parsed = financialBackupV1Schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Backup incompatível ou inválido." }, { status: 400 });
  const data = parsed.data;
  try {
    await db.transaction(async (tx) => {
      if (mode === "replace") {
        await tx.delete(transactions).where(eq(transactions.userId, current.id));
        await tx.delete(creditCardPurchases).where(eq(creditCardPurchases.userId, current.id));
        await tx.delete(monthlyBudgets).where(eq(monthlyBudgets.userId, current.id));
        await tx.delete(fixedExpenses).where(eq(fixedExpenses.userId, current.id));
        await tx.delete(financialGoals).where(eq(financialGoals.userId, current.id));
        await tx.delete(debts).where(eq(debts.userId, current.id));
        await tx.delete(settings).where(eq(settings.userId, current.id));
        await tx.delete(subcategories).where(eq(subcategories.userId, current.id));
        await tx.delete(paymentMethods).where(eq(paymentMethods.userId, current.id));
        await tx.delete(creditCards).where(eq(creditCards.userId, current.id));
        await tx.delete(categories).where(eq(categories.userId, current.id));
        await tx.delete(wallets).where(eq(wallets.userId, current.id));
        await tx.delete(accounts).where(eq(accounts.userId, current.id));
      }
      const insert = async (table: typeof accounts, rows: Record<string, unknown>[]) => {
        if (!rows.length) return;
        await tx.insert(table).values(withUser(rows, current.id) as typeof accounts.$inferInsert[]).onConflictDoNothing();
      };
      await insert(accounts, data.accounts);
      await tx.insert(wallets).values(withUser(data.wallets, current.id) as typeof wallets.$inferInsert[]).onConflictDoNothing();
      await tx.insert(categories).values(withUser(data.categories, current.id) as typeof categories.$inferInsert[]).onConflictDoNothing();
      await tx.insert(subcategories).values(withUser(data.subcategories, current.id) as typeof subcategories.$inferInsert[]).onConflictDoNothing();
      await tx.insert(paymentMethods).values(withUser(data.paymentMethods, current.id) as typeof paymentMethods.$inferInsert[]).onConflictDoNothing();
      await tx.insert(creditCards).values(withUser(data.creditCards, current.id) as typeof creditCards.$inferInsert[]).onConflictDoNothing();
      await tx.insert(fixedExpenses).values(withUser(data.fixedExpenses, current.id) as typeof fixedExpenses.$inferInsert[]).onConflictDoNothing();
      await tx.insert(financialGoals).values(withUser(data.financialGoals, current.id) as typeof financialGoals.$inferInsert[]).onConflictDoNothing();
      await tx.insert(debts).values(withUser(data.debts, current.id) as typeof debts.$inferInsert[]).onConflictDoNothing();
      await tx.insert(settings).values(withUser(data.settings, current.id) as typeof settings.$inferInsert[]).onConflictDoNothing();
      await tx.insert(creditCardPurchases).values(withUser(data.creditCardPurchases, current.id) as typeof creditCardPurchases.$inferInsert[]).onConflictDoNothing();
      await tx.insert(monthlyBudgets).values(withUser(data.monthlyBudgets, current.id) as typeof monthlyBudgets.$inferInsert[]).onConflictDoNothing();
      await tx.insert(transactions).values(withUser(data.transactions, current.id) as typeof transactions.$inferInsert[]).onConflictDoNothing();
    });
    return NextResponse.json({ ok: true, mode });
  } catch {
    return NextResponse.json({ error: "A restauração foi cancelada sem alterar os dados. Verifique conflitos e referências." }, { status: 409 });
  }
}
