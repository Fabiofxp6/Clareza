import { z } from "zod";
import { parseMoneyToCents } from "@/lib/utils";

const uuidOptional = z.string().uuid().optional().or(z.literal(""));

function moneyString(minimumCents?: number) {
  return z.string().trim().min(1).refine((value) => {
    try {
      return minimumCents === undefined || parseMoneyToCents(value) >= minimumCents;
    } catch {
      return false;
    }
  }, { message: minimumCents === 1 ? "Informe um valor maior que zero." : "Informe um valor válido." });
}

const anyMoney = moneyString();
const nonNegativeMoney = moneyString(0);
const positiveMoney = moneyString(1);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
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
    amount: positiveMoney,
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
    if (data.subcategoryId && !data.categoryId) {
      ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Informe a categoria da subcategoria." });
    }
    if (data.type === "INCOME" && data.status === "PAID") {
      ctx.addIssue({ code: "custom", path: ["status"], message: "Receitas realizadas devem usar a situação Recebido." });
    }
    if (data.type !== "INCOME" && data.status === "RECEIVED") {
      ctx.addIssue({ code: "custom", path: ["status"], message: "Somente receitas podem usar a situação Recebido." });
    }
    if (!["PAID", "RECEIVED"].includes(data.status) && data.paymentDate) {
      ctx.addIssue({ code: "custom", path: ["paymentDate"], message: "A data de liquidação só se aplica a lançamentos realizados." });
    }
    const sources = [data.accountId, data.walletId, data.creditCardId].filter(Boolean);
    const destinations = [data.destinationAccountId, data.destinationWalletId].filter(Boolean);
    if (sources.length > 1) {
      ctx.addIssue({ code: "custom", path: ["accountId"], message: "Informe apenas uma origem." });
    }
    if (destinations.length > 1) {
      ctx.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Informe apenas um destino." });
    }
    if (data.type === "TRANSFER" && !data.accountId && !data.walletId) {
      ctx.addIssue({ code: "custom", path: ["accountId"], message: "Informe a origem da transferência." });
    }
    if (!["TRANSFER", "INVESTMENT"].includes(data.type) && destinations.length) {
      ctx.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Este tipo de lançamento não aceita destino." });
    }
    if (data.type !== "EXPENSE" && data.creditCardId) {
      ctx.addIssue({ code: "custom", path: ["creditCardId"], message: "Cartões só podem ser usados em despesas." });
    }
    if (data.accountId && data.accountId === data.destinationAccountId) {
      ctx.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Origem e destino devem ser diferentes." });
    }
    if (data.walletId && data.walletId === data.destinationWalletId) {
      ctx.addIssue({ code: "custom", path: ["destinationWalletId"], message: "Origem e destino devem ser diferentes." });
    }
  });

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  institution: z.string().trim().max(80).optional(),
  type: z.enum(["CHECKING", "SAVINGS", "PAYMENT", "INVESTMENT", "OTHER"]),
  initialBalance: anyMoney,
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
  plannedAmount: nonNegativeMoney,
});

export const fixedExpenseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().uuid(),
  averageAmount: nonNegativeMoney,
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
  totalLimit: positiveMoney,
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
  totalAmount: positiveMoney,
  totalInstallments: z.coerce.number().int().min(1).max(120),
});

export const goalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(500).optional(),
  category: z.string().trim().min(2).max(80),
  targetAmount: positiveMoney,
  currentAmount: nonNegativeMoney,
  startDate: z.iso.date(),
  targetDate: z.iso.date(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.targetDate >= data.startDate, {
  path: ["targetDate"],
  message: "O prazo final deve ser igual ou posterior à data inicial.",
});

export const debtSchema = z.object({
  name: z.string().trim().min(2).max(120),
  creditor: z.string().trim().min(2).max(120),
  debtType: z.string().trim().min(2).max(80),
  originalAmount: nonNegativeMoney,
  currentBalance: nonNegativeMoney,
  totalInstallments: z.coerce.number().int().min(1).max(1200),
  paidInstallments: z.coerce.number().int().min(0),
  installmentAmount: nonNegativeMoney,
  interestRate: z.coerce.number().min(0).max(10000),
  interestRatePeriod: z.enum(["MONTHLY", "ANNUAL"]),
  startDate: z.iso.date(),
  estimatedPayoffDate: z.iso.date().optional().or(z.literal("")),
  nextDueDate: z.iso.date().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.paidInstallments <= data.totalInstallments, {
  path: ["paidInstallments"],
  message: "As parcelas pagas não podem superar o total de parcelas.",
});

export const settingsSchema = z.object({
  monthlyIncome: nonNegativeMoney,
  maximumMonthlySpending: nonNegativeMoney,
  emergencyFundTarget: nonNegativeMoney,
  emergencyFundMonths: z.coerce.number().int().min(1).max(120),
  needsPercentage: z.coerce.number().min(0).max(100),
  wantsPercentage: z.coerce.number().min(0).max(100),
  investmentPercentage: z.coerce.number().min(0).max(100),
  debtPercentage: z.coerce.number().min(0).max(100),
  safetyMarginPercentage: z.coerce.number().min(0).max(100),
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
}).refine((data) => Math.abs(
  data.needsPercentage
  + data.wantsPercentage
  + data.investmentPercentage
  + data.debtPercentage
  + data.safetyMarginPercentage
  - 100,
) <= 0.01, { message: "Os percentuais devem somar 100%." });

export const goalProgressSchema = z.object({
  id: z.string().uuid(),
  currentAmount: nonNegativeMoney,
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELED"]),
});

export const debtProgressSchema = z.object({
  id: z.string().uuid(),
  currentBalance: nonNegativeMoney,
  paidInstallments: z.coerce.number().int().min(0).max(1200),
  status: z.enum(["ACTIVE", "OVERDUE", "PAID", "RENEGOTIATED"]),
});

export const fixedExpenseGenerationSchema = z.object({
  id: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
});

export const walletSchema = z.object({
  name: z.string().trim().min(2).max(80),
  initialBalance: anyMoney,
});

export const subcategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryId: z.string().uuid(),
});

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
});
