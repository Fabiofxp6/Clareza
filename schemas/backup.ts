import { z } from "zod";

const recordArray = z.array(z.record(z.string(), z.unknown())).max(100_000);

export const financialBackupV1Schema = z.object({
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  user: z.object({ name: z.string(), email: z.string().email() }),
  accounts: recordArray,
  wallets: recordArray,
  categories: recordArray,
  subcategories: recordArray,
  paymentMethods: recordArray,
  transactions: recordArray,
  monthlyBudgets: recordArray,
  fixedExpenses: recordArray,
  creditCards: recordArray,
  creditCardPurchases: recordArray,
  financialGoals: recordArray,
  debts: recordArray,
  settings: recordArray,
});

export type FinancialBackupV1 = z.infer<typeof financialBackupV1Schema>;
