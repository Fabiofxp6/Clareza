import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "CHECKING",
  "SAVINGS",
  "PAYMENT",
  "INVESTMENT",
  "OTHER",
]);
export const categoryTypeEnum = pgEnum("category_type", ["INCOME", "EXPENSE", "INVESTMENT"]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "INCOME",
  "EXPENSE",
  "INVESTMENT",
  "TRANSFER",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "PAID",
  "RECEIVED",
  "PENDING",
  "OVERDUE",
  "CANCELED",
]);
export const priorityEnum = pgEnum("priority", ["LOW", "MEDIUM", "HIGH"]);
export const goalStatusEnum = pgEnum("goal_status", ["ACTIVE", "PAUSED", "COMPLETED", "CANCELED"]);
export const debtStatusEnum = pgEnum("debt_status", ["ACTIVE", "OVERDUE", "PAID", "RENEGOTIATED"]);
export const ratePeriodEnum = pgEnum("rate_period", ["MONTHLY", "ANNUAL"]);
export const themeEnum = pgEnum("theme", ["LIGHT", "DARK", "SYSTEM"]);
export const purchaseStatusEnum = pgEnum("purchase_status", ["OPEN", "PAID", "CANCELED"]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    ...auditColumns,
  },
  (table) => [uniqueIndex("users_email_uidx").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uidx").on(table.tokenHash),
    index("sessions_user_expires_idx").on(table.userId, table.expiresAt),
  ],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    ipHash: text("ip_hash").notNull(),
    succeeded: boolean("succeeded").default(false).notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("login_attempts_lookup_idx").on(table.email, table.ipHash, table.attemptedAt)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    institution: text("institution"),
    type: accountTypeEnum("type").notNull(),
    initialBalance: bigint("initial_balance", { mode: "number" }).default(0).notNull(),
    currentBalance: bigint("current_balance", { mode: "number" }).default(0).notNull(),
    color: text("color").default("#6366f1").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...auditColumns,
  },
  (table) => [index("accounts_user_active_idx").on(table.userId, table.isActive)],
);

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    initialBalance: bigint("initial_balance", { mode: "number" }).default(0).notNull(),
    currentBalance: bigint("current_balance", { mode: "number" }).default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...auditColumns,
  },
  (table) => [index("wallets_user_active_idx").on(table.userId, table.isActive)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: categoryTypeEnum("type").notNull(),
    color: text("color").default("#64748b").notNull(),
    icon: text("icon").default("circle").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    budgetGroup: text("budget_group").default("NEEDS").notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("categories_user_name_type_uidx").on(table.userId, table.name, table.type),
    index("categories_user_active_idx").on(table.userId, table.isActive),
  ],
);

export const subcategories = pgTable(
  "subcategories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("subcategories_category_name_uidx").on(table.categoryId, table.name),
    index("subcategories_user_category_idx").on(table.userId, table.categoryId),
  ],
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").default("wallet-cards").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...auditColumns,
  },
  (table) => [uniqueIndex("payment_methods_user_name_uidx").on(table.userId, table.name)],
);

export const creditCards = pgTable(
  "credit_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    institution: text("institution"),
    totalLimit: bigint("total_limit", { mode: "number" }).notNull(),
    closingDay: integer("closing_day").notNull(),
    dueDay: integer("due_day").notNull(),
    bestPurchaseDay: integer("best_purchase_day"),
    color: text("color").default("#111827").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...auditColumns,
  },
  (table) => [
    index("credit_cards_user_active_idx").on(table.userId, table.isActive),
    check("credit_cards_limit_ck", sql`${table.totalLimit} > 0`),
    check("credit_cards_closing_day_ck", sql`${table.closingDay} between 1 and 31`),
    check("credit_cards_due_day_ck", sql`${table.dueDay} between 1 and 31`),
  ],
);

export const fixedExpenses = pgTable(
  "fixed_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    averageAmount: bigint("average_amount", { mode: "number" }).notNull(),
    dueDay: integer("due_day").notNull(),
    paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    automaticDebit: boolean("automatic_debit").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    adjustmentDate: date("adjustment_date"),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    index("fixed_expenses_user_active_idx").on(table.userId, table.isActive),
    check("fixed_expenses_amount_ck", sql`${table.averageAmount} >= 0`),
    check("fixed_expenses_due_day_ck", sql`${table.dueDay} between 1 and 31`),
  ],
);

export const financialGoals = pgTable(
  "financial_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
    currentAmount: bigint("current_amount", { mode: "number" }).default(0).notNull(),
    startDate: date("start_date").notNull(),
    targetDate: date("target_date").notNull(),
    priority: priorityEnum("priority").default("MEDIUM").notNull(),
    status: goalStatusEnum("status").default("ACTIVE").notNull(),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    index("financial_goals_user_status_idx").on(table.userId, table.status),
    check("financial_goals_amounts_ck", sql`${table.targetAmount} > 0 and ${table.currentAmount} >= 0`),
    check("financial_goals_dates_ck", sql`${table.targetDate} >= ${table.startDate}`),
  ],
);

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    creditor: text("creditor").notNull(),
    debtType: text("debt_type").notNull(),
    originalAmount: bigint("original_amount", { mode: "number" }).notNull(),
    currentBalance: bigint("current_balance", { mode: "number" }).notNull(),
    totalInstallments: integer("total_installments"),
    paidInstallments: integer("paid_installments").default(0).notNull(),
    installmentAmount: bigint("installment_amount", { mode: "number" }),
    interestRate: numeric("interest_rate", { precision: 9, scale: 4 }).default("0").notNull(),
    interestRatePeriod: ratePeriodEnum("interest_rate_period").default("MONTHLY").notNull(),
    startDate: date("start_date").notNull(),
    estimatedPayoffDate: date("estimated_payoff_date"),
    nextDueDate: date("next_due_date"),
    status: debtStatusEnum("status").default("ACTIVE").notNull(),
    priority: priorityEnum("priority").default("MEDIUM").notNull(),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    index("debts_user_status_due_idx").on(table.userId, table.status, table.nextDueDate),
    check("debts_amounts_ck", sql`${table.originalAmount} >= 0 and ${table.currentBalance} >= 0`),
    check("debts_installments_ck", sql`${table.paidInstallments} >= 0 and (${table.totalInstallments} is null or ${table.totalInstallments} > 0)`),
  ],
);

export const monthlyBudgets = pgTable(
  "monthly_budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    plannedAmount: bigint("planned_amount", { mode: "number" }).notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("monthly_budgets_user_category_period_uidx").on(
      table.userId,
      table.categoryId,
      table.month,
      table.year,
    ),
    index("monthly_budgets_user_period_idx").on(table.userId, table.year, table.month),
    check("monthly_budgets_month_ck", sql`${table.month} between 1 and 12`),
    check("monthly_budgets_year_ck", sql`${table.year} between 2000 and 2200`),
    check("monthly_budgets_amount_ck", sql`${table.plannedAmount} >= 0`),
  ],
);

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currency: text("currency").default("BRL").notNull(),
    monthlyIncome: bigint("monthly_income", { mode: "number" }).default(0).notNull(),
    maximumMonthlySpending: bigint("maximum_monthly_spending", { mode: "number" })
      .default(0)
      .notNull(),
    desiredInvestmentPercentage: numeric("desired_investment_percentage", {
      precision: 5,
      scale: 2,
    })
      .default("20")
      .notNull(),
    emergencyFundTarget: bigint("emergency_fund_target", { mode: "number" }).default(0).notNull(),
    emergencyFundMonths: integer("emergency_fund_months").default(6).notNull(),
    controlStartMonth: date("control_start_month"),
    theme: themeEnum("theme").default("SYSTEM").notNull(),
    needsPercentage: numeric("needs_percentage", { precision: 5, scale: 2 })
      .default("50")
      .notNull(),
    wantsPercentage: numeric("wants_percentage", { precision: 5, scale: 2 })
      .default("30")
      .notNull(),
    investmentPercentage: numeric("investment_percentage", { precision: 5, scale: 2 })
      .default("20")
      .notNull(),
    debtPercentage: numeric("debt_percentage", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    safetyMarginPercentage: numeric("safety_margin_percentage", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("settings_user_uidx").on(table.userId),
    check(
      "settings_percentages_ck",
      sql`${table.needsPercentage} >= 0 and ${table.wantsPercentage} >= 0 and ${table.investmentPercentage} >= 0 and ${table.debtPercentage} >= 0 and ${table.safetyMarginPercentage} >= 0 and ${table.needsPercentage} + ${table.wantsPercentage} + ${table.investmentPercentage} + ${table.debtPercentage} + ${table.safetyMarginPercentage} = 100`,
    ),
  ],
);

export const creditCardPurchases = pgTable(
  "credit_card_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creditCardId: uuid("credit_card_id")
      .notNull()
      .references(() => creditCards.id, { onDelete: "restrict" }),
    purchaseDate: date("purchase_date").notNull(),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
    installmentAmount: bigint("installment_amount", { mode: "number" }).notNull(),
    currentInstallment: integer("current_installment").default(1).notNull(),
    totalInstallments: integer("total_installments").default(1).notNull(),
    invoiceMonth: integer("invoice_month").notNull(),
    invoiceYear: integer("invoice_year").notNull(),
    status: purchaseStatusEnum("status").default("OPEN").notNull(),
    ...auditColumns,
  },
  (table) => [
    index("card_purchases_user_invoice_idx").on(table.userId, table.invoiceYear, table.invoiceMonth),
    index("card_purchases_card_status_idx").on(table.creditCardId, table.status),
    check("card_purchases_amounts_ck", sql`${table.totalAmount} > 0 and ${table.installmentAmount} > 0`),
    check("card_purchases_installments_ck", sql`${table.currentInstallment} > 0 and ${table.totalInstallments} > 0 and ${table.currentInstallment} <= ${table.totalInstallments}`),
    check("card_purchases_invoice_month_ck", sql`${table.invoiceMonth} between 1 and 12`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: transactionTypeEnum("type").notNull(),
    description: text("description").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }),
    subcategoryId: uuid("subcategory_id").references(() => subcategories.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "restrict" }),
    walletId: uuid("wallet_id").references(() => wallets.id, { onDelete: "restrict" }),
    destinationAccountId: uuid("destination_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    destinationWalletId: uuid("destination_wallet_id").references(() => wallets.id, {
      onDelete: "restrict",
    }),
    transferGroupId: uuid("transfer_group_id"),
    paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.id, {
      onDelete: "set null",
    }),
    creditCardId: uuid("credit_card_id").references(() => creditCards.id, {
      onDelete: "restrict",
    }),
    creditCardPurchaseId: uuid("credit_card_purchase_id").references(
      () => creditCardPurchases.id,
      { onDelete: "cascade" },
    ),
    fixedExpenseId: uuid("fixed_expense_id").references(() => fixedExpenses.id, {
      onDelete: "set null",
    }),
    referenceMonth: integer("reference_month"),
    referenceYear: integer("reference_year"),
    amount: bigint("amount", { mode: "number" }).notNull(),
    status: transactionStatusEnum("status").default("PENDING").notNull(),
    dueDate: date("due_date"),
    paymentDate: date("payment_date"),
    isFixed: boolean("is_fixed").default(false).notNull(),
    isEssential: boolean("is_essential").default(false).notNull(),
    installmentNumber: integer("installment_number"),
    totalInstallments: integer("total_installments"),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    index("transactions_user_date_idx").on(table.userId, table.date),
    index("transactions_user_payment_date_idx").on(table.userId, table.paymentDate),
    index("transactions_user_status_due_idx").on(table.userId, table.status, table.dueDate),
    index("transactions_user_category_idx").on(table.userId, table.categoryId),
    uniqueIndex("transactions_fixed_expense_period_uidx").on(
      table.fixedExpenseId,
      table.referenceYear,
      table.referenceMonth,
    ),
    check("transactions_amount_ck", sql`${table.amount} > 0`),
    check(
      "transactions_liquidation_ck",
      sql`${table.status} not in ('PAID', 'RECEIVED') or ${table.paymentDate} is not null`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type CreditCard = typeof creditCards.$inferSelect;
