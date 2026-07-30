import { z } from "zod";

const uuidOptional = z.string().uuid().optional().or(z.literal(""));
const moneyString = z
  .string()
  .min(1)
  .refine((value) => Number.isFinite(Number(value.replace(/\./g, "").replace(",", "."))), {
    message: "Informe um valor válido.",
  });

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(200),
});

export const transactionSchema = z
  .object({
    date: z.iso.date(),
    type: z.enum(["INCOME", "EXPENSE", "INVESTMENT", "TRANSFER"]),
    description: z.string().trim().min(2).max(160),
    categoryId: uuidOptional,
    subcategoryId: uuidOptional,
    accountId: uuidOptional,
    walletId: uuidOptional,
    destinationAccountId: uuidOptional,
    destinationWalletId: uuidOptional,
    paymentMethodId: uuidOptional,
    creditCardId: uuidOptional,
    amount: moneyString,
    status: z.enum(["PAID", "RECEIVED", "PENDING", "OVERDUE", "CANCELED"]),
    dueDate: z.iso.date().optional().or(z.literal("")),
    paymentDate: z.iso.date().optional().or(z.literal("")),
    isFixed: z.coerce.boolean().default(false),
    isEssential: z.coerce.boolean().default(false),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (["PAID", "RECEIVED"].includes(data.status) && !data.paymentDate) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentDate"],
        message: "Informe a data de liquidação.",
      });
    }
    if (data.type === "TRANSFER" && !data.destinationAccountId && !data.destinationWalletId) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationAccountId"],
        message: "Informe o destino da transferência.",
      });
    }
  });

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  institution: z.string().trim().max(80).optional(),
  type: z.enum(["CHECKING", "SAVINGS", "PAYMENT", "INVESTMENT", "OTHER"]),
  initialBalance: moneyString,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["INCOME", "EXPENSE", "INVESTMENT"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().max(50).default("circle"),
  budgetGroup: z.enum(["NEEDS", "WANTS", "INVESTMENTS", "DEBTS"]),
});

export const budgetSchema = z.object({
  categoryId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
  plannedAmount: moneyString,
});

export const fixedExpenseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().uuid(),
  averageAmount: moneyString,
  dueDay: z.coerce.number().int().min(1).max(31),
  paymentMethodId: uuidOptional,
  accountId: uuidOptional,
  automaticDebit: z.coerce.boolean().default(false),
  adjustmentDate: z.iso.date().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const cardSchema = z.object({
  name: z.string().trim().min(2).max(80),
  institution: z.string().trim().max(80).optional(),
  totalLimit: moneyString,
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  bestPurchaseDay: z.coerce.number().int().min(1).max(31),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const purchaseSchema = z.object({
  creditCardId: z.string().uuid(),
  purchaseDate: z.iso.date(),
  description: z.string().trim().min(2).max(160),
  categoryId: z.string().uuid(),
  totalAmount: moneyString,
  totalInstallments: z.coerce.number().int().min(1).max(120),
});

export const goalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(500).optional(),
  category: z.string().trim().min(2).max(80),
  targetAmount: moneyString,
  currentAmount: moneyString,
  startDate: z.iso.date(),
  targetDate: z.iso.date(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: z.string().max(1000).optional(),
});

export const debtSchema = z.object({
  name: z.string().trim().min(2).max(120),
  creditor: z.string().trim().min(2).max(120),
  debtType: z.string().trim().min(2).max(80),
  originalAmount: moneyString,
  currentBalance: moneyString,
  totalInstallments: z.coerce.number().int().min(1).max(1200),
  paidInstallments: z.coerce.number().int().min(0),
  installmentAmount: moneyString,
  interestRate: z.coerce.number().min(0).max(10000),
  interestRatePeriod: z.enum(["MONTHLY", "ANNUAL"]),
  startDate: z.iso.date(),
  estimatedPayoffDate: z.iso.date().optional().or(z.literal("")),
  nextDueDate: z.iso.date().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: z.string().max(1000).optional(),
});
