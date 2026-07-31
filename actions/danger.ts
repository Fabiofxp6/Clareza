"use server";

import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { deleteSession, requireUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

type State = { ok?: boolean; error?: string };
type PgBatchItem = BatchItem<"pg">;

async function confirmPassword(userId: string, password: string) {
  if (!password || password.length > 200) return false;
  const [record] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  return Boolean(record && (await verifyPassword(record.passwordHash, password)));
}

export async function resetFinancialDataAction(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  if (!(await confirmPassword(user.id, String(formData.get("password") ?? "")))) {
    return { error: "Senha atual incorreta." };
  }
  const db = getDb();
  const queries: [PgBatchItem, ...PgBatchItem[]] = [
    db.delete(transactions).where(eq(transactions.userId, user.id)),
    db.delete(creditCardPurchases).where(eq(creditCardPurchases.userId, user.id)),
    db.delete(monthlyBudgets).where(eq(monthlyBudgets.userId, user.id)),
    db.delete(fixedExpenses).where(eq(fixedExpenses.userId, user.id)),
    db.delete(financialGoals).where(eq(financialGoals.userId, user.id)),
    db.delete(debts).where(eq(debts.userId, user.id)),
    db.delete(subcategories).where(eq(subcategories.userId, user.id)),
    db.delete(paymentMethods).where(eq(paymentMethods.userId, user.id)),
    db.delete(creditCards).where(eq(creditCards.userId, user.id)),
    db.delete(categories).where(eq(categories.userId, user.id)),
    db.delete(wallets).where(eq(wallets.userId, user.id)),
    db.delete(accounts).where(eq(accounts.userId, user.id)),
    db.delete(settings).where(eq(settings.userId, user.id)),
    db.insert(settings).values({ userId: user.id }),
  ];
  await db.batch(queries);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteUserAction(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  if (!(await confirmPassword(user.id, String(formData.get("password") ?? "")))) {
    return { error: "Senha atual incorreta." };
  }
  await deleteSession();
  await getDb().delete(users).where(eq(users.id, user.id));
  redirect("/login");
}
