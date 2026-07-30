"use server";

import { eq } from "drizzle-orm";
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

async function confirmPassword(userId: string, password: string) {
  const [record] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  return Boolean(record && (await verifyPassword(record.passwordHash, password)));
}

export async function resetFinancialDataAction(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  if (!(await confirmPassword(user.id, String(formData.get("password") ?? "")))) {
    return { error: "Senha atual incorreta." };
  }
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(transactions).where(eq(transactions.userId, user.id));
    await tx.delete(creditCardPurchases).where(eq(creditCardPurchases.userId, user.id));
    await tx.delete(monthlyBudgets).where(eq(monthlyBudgets.userId, user.id));
    await tx.delete(fixedExpenses).where(eq(fixedExpenses.userId, user.id));
    await tx.delete(financialGoals).where(eq(financialGoals.userId, user.id));
    await tx.delete(debts).where(eq(debts.userId, user.id));
    await tx.delete(subcategories).where(eq(subcategories.userId, user.id));
    await tx.delete(paymentMethods).where(eq(paymentMethods.userId, user.id));
    await tx.delete(creditCards).where(eq(creditCards.userId, user.id));
    await tx.delete(categories).where(eq(categories.userId, user.id));
    await tx.delete(wallets).where(eq(wallets.userId, user.id));
    await tx.delete(accounts).where(eq(accounts.userId, user.id));
    await tx.delete(settings).where(eq(settings.userId, user.id));
    await tx.insert(settings).values({ userId: user.id });
  });
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
