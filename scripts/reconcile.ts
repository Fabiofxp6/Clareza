import { and, eq, sql } from "drizzle-orm";
import { accounts, transactions, users, wallets } from "../db/schema";
import { scriptDb } from "./db";

const [user] = await scriptDb.select().from(users).limit(1);
if (!user) throw new Error("Nenhum usuário encontrado.");
const accountRows = await scriptDb.select().from(accounts).where(eq(accounts.userId, user.id));
for (const account of accountRows) {
  const [source] = await scriptDb
    .select({
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else -${transactions.amount} end), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.accountId, account.id), sql`${transactions.status} in ('PAID','RECEIVED')`));
  const [destination] = await scriptDb
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.destinationAccountId, account.id), sql`${transactions.status} in ('PAID','RECEIVED')`));
  await scriptDb.update(accounts).set({ currentBalance: account.initialBalance + Number(source.income) + Number(destination.total), updatedAt: new Date() }).where(eq(accounts.id, account.id));
}
const walletRows = await scriptDb.select().from(wallets).where(eq(wallets.userId, user.id));
for (const wallet of walletRows) {
  const [source] = await scriptDb
    .select({ total: sql<number>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else -${transactions.amount} end), 0)` })
    .from(transactions)
    .where(and(eq(transactions.walletId, wallet.id), sql`${transactions.status} in ('PAID','RECEIVED')`));
  const [destination] = await scriptDb
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.destinationWalletId, wallet.id), sql`${transactions.status} in ('PAID','RECEIVED')`));
  await scriptDb.update(wallets).set({ currentBalance: wallet.initialBalance + Number(source.total) + Number(destination.total), updatedAt: new Date() }).where(eq(wallets.id, wallet.id));
}
console.log("Saldos reconciliados com o livro financeiro.");
