import "server-only";
import { and, asc, count, desc, eq, gte, ilike, lte, ne, sql } from "drizzle-orm";
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
  wallets,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function getMasters() {
  const user = await requireUser();
  const db = getDb();
  const [accountRows, walletRows, categoryRows, subcategoryRows, methodRows, cardRows] =
    await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, user.id)).orderBy(accounts.name),
      db.select().from(wallets).where(eq(wallets.userId, user.id)).orderBy(wallets.name),
      db.select().from(categories).where(eq(categories.userId, user.id)).orderBy(categories.name),
      db
        .select()
        .from(subcategories)
        .where(eq(subcategories.userId, user.id))
        .orderBy(subcategories.name),
      db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.userId, user.id))
        .orderBy(paymentMethods.name),
      db.select().from(creditCards).where(eq(creditCards.userId, user.id)).orderBy(creditCards.name),
    ]);
  return {
    accounts: accountRows,
    wallets: walletRows,
    categories: categoryRows,
    subcategories: subcategoryRows,
    paymentMethods: methodRows,
    creditCards: cardRows,
  };
}

function period(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { start, end };
}

export async function getDashboardData(month: number, year: number) {
  const user = await requireUser();
  const db = getDb();
  const { start, end } = period(month, year);
  const realized = and(
    eq(transactions.userId, user.id),
    gte(transactions.paymentDate, start),
    lte(transactions.paymentDate, end),
  );

  const [
    totalsRows,
    accountRows,
    walletRows,
    debtRows,
    goalRows,
    budgetRows,
    categoryRows,
    monthlyRows,
    methodRows,
    overdueRows,
    dueSoonRows,
    cardRows,
    settingsRows,
    overBudgetRows,
    activeGoalRows,
    overdueDebtRows,
  ] = await Promise.all([
    db
      .select({
        income: sql<number>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${transactions.status} = 'RECEIVED' then ${transactions.amount} else 0 end), 0)`,
        expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} = 'PAID' then ${transactions.amount} else 0 end), 0)`,
        investments: sql<number>`coalesce(sum(case when ${transactions.type} = 'INVESTMENT' and ${transactions.status} = 'PAID' then ${transactions.amount} else 0 end), 0)`,
        fixed: sql<number>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} = 'PAID' and ${transactions.isFixed} then ${transactions.amount} else 0 end), 0)`,
        variable: sql<number>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} = 'PAID' and not ${transactions.isFixed} then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(realized),
    db
      .select({ total: sql<number>`coalesce(sum(${accounts.currentBalance}), 0)` })
      .from(accounts)
      .where(and(eq(accounts.userId, user.id), eq(accounts.isActive, true))),
    db
      .select({ total: sql<number>`coalesce(sum(${wallets.currentBalance}), 0)` })
      .from(wallets)
      .where(and(eq(wallets.userId, user.id), eq(wallets.isActive, true))),
    db
      .select({ total: sql<number>`coalesce(sum(${debts.currentBalance}), 0)` })
      .from(debts)
      .where(and(eq(debts.userId, user.id), ne(debts.status, "PAID"))),
    db
      .select({
        current: sql<number>`coalesce(sum(${financialGoals.currentAmount}), 0)`,
        target: sql<number>`coalesce(sum(${financialGoals.targetAmount}), 0)`,
      })
      .from(financialGoals)
      .where(and(eq(financialGoals.userId, user.id), eq(financialGoals.status, "ACTIVE"))),
    db
      .select({ planned: sql<number>`coalesce(sum(${monthlyBudgets.plannedAmount}), 0)` })
      .from(monthlyBudgets)
      .where(
        and(
          eq(monthlyBudgets.userId, user.id),
          eq(monthlyBudgets.month, month),
          eq(monthlyBudgets.year, year),
        ),
      ),
    db
      .select({
        name: categories.name,
        color: categories.color,
        value: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(realized, eq(transactions.type, "EXPENSE"), eq(transactions.status, "PAID")))
      .groupBy(categories.id, categories.name, categories.color)
      .orderBy(desc(sql`sum(${transactions.amount})`)),
    db
      .select({
        month: sql<string>`to_char(${transactions.paymentDate}, 'YYYY-MM')`,
        income: sql<number>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${transactions.status} = 'RECEIVED' then ${transactions.amount} else 0 end), 0)`,
        expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} = 'PAID' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.paymentDate, `${year - 1}-01-01`),
          ne(transactions.status, "CANCELED"),
        ),
      )
      .groupBy(sql`to_char(${transactions.paymentDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${transactions.paymentDate}, 'YYYY-MM')`),
    db
      .select({
        name: paymentMethods.name,
        value: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(paymentMethods, eq(paymentMethods.id, transactions.paymentMethodId))
      .where(and(realized, eq(transactions.type, "EXPENSE"), eq(transactions.status, "PAID")))
      .groupBy(paymentMethods.id, paymentMethods.name),
    db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.status, "OVERDUE"),
        ),
      ),
    db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.status, "PENDING"),
          gte(transactions.dueDate, new Date().toISOString().slice(0, 10)),
          lte(
            transactions.dueDate,
            new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
          ),
        ),
      ),
    db
      .select({
        name: creditCards.name,
        limit: creditCards.totalLimit,
        used: sql<number>`coalesce(sum(case when ${transactions.status} not in ('PAID','CANCELED') then ${transactions.amount} else 0 end), 0)`,
      })
      .from(creditCards)
      .leftJoin(transactions, eq(transactions.creditCardId, creditCards.id))
      .where(and(eq(creditCards.userId, user.id), eq(creditCards.isActive, true)))
      .groupBy(creditCards.id, creditCards.name, creditCards.totalLimit),
    db.select().from(settings).where(eq(settings.userId, user.id)).limit(1),
    db
      .select({
        category: categories.name,
        planned: monthlyBudgets.plannedAmount,
        realized: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(monthlyBudgets)
      .innerJoin(categories, eq(categories.id, monthlyBudgets.categoryId))
      .innerJoin(
        transactions,
        and(
          eq(transactions.categoryId, monthlyBudgets.categoryId),
          eq(transactions.userId, user.id),
          eq(transactions.type, "EXPENSE"),
          eq(transactions.status, "PAID"),
          gte(transactions.paymentDate, start),
          lte(transactions.paymentDate, end),
        ),
      )
      .where(
        and(
          eq(monthlyBudgets.userId, user.id),
          eq(monthlyBudgets.month, month),
          eq(monthlyBudgets.year, year),
        ),
      )
      .groupBy(categories.name, monthlyBudgets.plannedAmount)
      .having(sql`sum(${transactions.amount}) > ${monthlyBudgets.plannedAmount}`),
    db
      .select({
        name: financialGoals.name,
        current: financialGoals.currentAmount,
        target: financialGoals.targetAmount,
        start: financialGoals.startDate,
        end: financialGoals.targetDate,
      })
      .from(financialGoals)
      .where(and(eq(financialGoals.userId, user.id), eq(financialGoals.status, "ACTIVE"))),
    db
      .select({ value: count() })
      .from(debts)
      .where(
        and(
          eq(debts.userId, user.id),
          lte(debts.nextDueDate, new Date().toISOString().slice(0, 10)),
          ne(debts.status, "PAID"),
        ),
      ),
  ]);

  const totals = totalsRows[0] ?? { income: 0, expenses: 0, investments: 0, fixed: 0, variable: 0 };
  const income = Number(totals.income);
  const expenses = Number(totals.expenses);
  const investments = Number(totals.investments);
  const planned = Number(budgetRows[0]?.planned ?? 0);
  const debtTotal = Number(debtRows[0]?.total ?? 0);
  const patrimony =
    Number(accountRows[0]?.total ?? 0) + Number(walletRows[0]?.total ?? 0) - debtTotal;
  const goalCurrent = Number(goalRows[0]?.current ?? 0);
  const goalTarget = Number(goalRows[0]?.target ?? 0);
  const emergencyTarget = Number(settingsRows[0]?.emergencyFundTarget ?? 0);
  const investmentAccounts = await db
    .select({ total: sql<number>`coalesce(sum(${accounts.currentBalance}), 0)` })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, user.id),
        eq(accounts.type, "INVESTMENT"),
        eq(accounts.isActive, true),
      ),
    );
  const emergency = Number(investmentAccounts[0]?.total ?? 0);

  const alerts: { level: "danger" | "warning" | "info"; title: string; detail: string }[] = [];
  if (income - expenses - investments < 0)
    alerts.push({ level: "danger", title: "Saldo mensal negativo", detail: "As saídas superaram as entradas realizadas." });
  if (Number(overdueRows[0]?.value ?? 0) > 0)
    alerts.push({ level: "danger", title: "Contas vencidas", detail: `${overdueRows[0].value} lançamento(s) precisam de atenção.` });
  if (Number(dueSoonRows[0]?.value ?? 0) > 0)
    alerts.push({ level: "warning", title: "Vencimento próximo", detail: `${dueSoonRows[0].value} conta(s) vencem em até cinco dias.` });
  for (const card of cardRows) {
    const percent = card.limit ? (Number(card.used) / card.limit) * 100 : 0;
    if (percent >= 70)
      alerts.push({
        level: percent >= 100 ? "danger" : "warning",
        title: `${card.name}: ${percent.toFixed(0)}% do limite`,
        detail: percent >= 100 ? "O limite foi atingido." : "Acompanhe as próximas compras.",
      });
  }
  if (emergencyTarget > 0 && emergency < emergencyTarget)
    alerts.push({ level: "info", title: "Reserva abaixo da meta", detail: "Continue os aportes para sua reserva de emergência." });
  if (income > 0 && (expenses / income) * 100 > 80)
    alerts.push({ level: "warning", title: "Renda comprometida", detail: "Mais de 80% da renda realizada já foi utilizada." });
  for (const budget of overBudgetRows)
    alerts.push({
      level: "danger",
      title: `${budget.category} acima do orçamento`,
      detail: `Realizado de ${Number(budget.realized) / 100} para um limite de ${budget.planned / 100}.`,
    });
  const nowTime = Date.now();
  for (const goal of activeGoalRows) {
    const startTime = new Date(`${goal.start}T12:00:00`).getTime();
    const endTime = new Date(`${goal.end}T12:00:00`).getTime();
    const expected = Math.max(0, Math.min(1, (nowTime - startTime) / Math.max(1, endTime - startTime)));
    const actual = goal.target > 0 ? goal.current / goal.target : 0;
    if (actual + 0.05 < expected)
      alerts.push({ level: "warning", title: `${goal.name} abaixo do ritmo`, detail: "O progresso está abaixo do esperado para o prazo atual." });
  }
  if (Number(overdueDebtRows[0]?.value ?? 0) > 0)
    alerts.push({ level: "danger", title: "Dívida com vencimento atrasado", detail: `${overdueDebtRows[0].value} dívida(s) precisam de atualização.` });

  return {
    income,
    expenses,
    investments,
    fixed: Number(totals.fixed),
    variable: Number(totals.variable),
    balance: income - expenses - investments,
    savings: Math.max(0, income - expenses - investments),
    commitment: income > 0 ? (expenses / income) * 100 : 0,
    investedPercent: income > 0 ? (investments / income) * 100 : 0,
    cardInvoice: cardRows.reduce((sum, row) => sum + Number(row.used), 0),
    debts: debtTotal,
    patrimony,
    goalProgress: goalTarget > 0 ? (goalCurrent / goalTarget) * 100 : 0,
    budgetUsed: planned > 0 ? (expenses / planned) * 100 : 0,
    emergency,
    emergencyTarget,
    categories: categoryRows.map((row) => ({ ...row, value: Number(row.value) })),
    monthly: monthlyRows.map((row) => ({
      ...row,
      income: Number(row.income),
      expenses: Number(row.expenses),
      balance: Number(row.income) - Number(row.expenses),
    })),
    methods: methodRows.map((row) => ({ ...row, value: Number(row.value) })),
    cards: cardRows.map((row) => ({ ...row, used: Number(row.used) })),
    alerts,
  };
}

export type TransactionFilters = {
  page?: string;
  q?: string;
  type?: string;
  status?: string;
  category?: string;
  subcategory?: string;
  account?: string;
  paymentMethod?: string;
  card?: string;
  from?: string;
  to?: string;
  month?: string;
  year?: string;
  sort?: string;
};

export async function getTransactions(filters: TransactionFilters) {
  const user = await requireUser();
  const db = getDb();
  const page = Math.max(1, Number(filters.page) || 1);
  const conditions = [eq(transactions.userId, user.id)];
  if (filters.q) conditions.push(ilike(transactions.description, `%${filters.q.slice(0, 80)}%`));
  if (["INCOME", "EXPENSE", "INVESTMENT", "TRANSFER"].includes(filters.type ?? ""))
    conditions.push(eq(transactions.type, filters.type as typeof transactions.type.enumValues[number]));
  if (["PAID", "RECEIVED", "PENDING", "OVERDUE", "CANCELED"].includes(filters.status ?? ""))
    conditions.push(eq(transactions.status, filters.status as typeof transactions.status.enumValues[number]));
  if (filters.category) conditions.push(eq(transactions.categoryId, filters.category));
  if (filters.subcategory) conditions.push(eq(transactions.subcategoryId, filters.subcategory));
  if (filters.account) conditions.push(eq(transactions.accountId, filters.account));
  if (filters.paymentMethod) conditions.push(eq(transactions.paymentMethodId, filters.paymentMethod));
  if (filters.card) conditions.push(eq(transactions.creditCardId, filters.card));
  if (filters.from) conditions.push(gte(transactions.date, filters.from));
  if (filters.to) conditions.push(lte(transactions.date, filters.to));
  if (filters.month && filters.year) {
    const { start, end } = period(Number(filters.month), Number(filters.year));
    conditions.push(gte(transactions.date, start), lte(transactions.date, end));
  }
  const where = and(...conditions);
  const ordering =
    filters.sort === "date_asc"
      ? asc(transactions.date)
      : filters.sort === "amount_desc"
        ? desc(transactions.amount)
        : filters.sort === "amount_asc"
          ? asc(transactions.amount)
          : desc(transactions.date);
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        transaction: transactions,
        categoryName: categories.name,
        accountName: accounts.name,
        walletName: wallets.name,
        cardName: creditCards.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(accounts, eq(accounts.id, transactions.accountId))
      .leftJoin(wallets, eq(wallets.id, transactions.walletId))
      .leftJoin(creditCards, eq(creditCards.id, transactions.creditCardId))
      .where(where)
      .orderBy(ordering, desc(transactions.createdAt))
      .limit(25)
      .offset((page - 1) * 25),
    db.select({ value: count() }).from(transactions).where(where),
  ]);
  return { rows, page, pages: Math.max(1, Math.ceil(Number(totalRows[0]?.value ?? 0) / 25)) };
}

export async function getTransaction(id: string) {
  const user = await requireUser();
  const [row] = await getDb()
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  return row;
}

export async function getBudgetData(month: number, year: number) {
  const user = await requireUser();
  const db = getDb();
  const { start, end } = period(month, year);
  const [rows, config] = await Promise.all([
    db
      .select({
        id: monthlyBudgets.id,
        categoryId: categories.id,
        category: categories.name,
        color: categories.color,
        planned: monthlyBudgets.plannedAmount,
        realized: sql<number>`coalesce(sum(case when ${transactions.status} = 'PAID' and ${transactions.paymentDate} >= ${start} and ${transactions.paymentDate} < ${end} then ${transactions.amount} else 0 end), 0)`,
      })
      .from(monthlyBudgets)
      .innerJoin(categories, eq(categories.id, monthlyBudgets.categoryId))
      .leftJoin(
        transactions,
        and(
          eq(transactions.categoryId, monthlyBudgets.categoryId),
          eq(transactions.userId, user.id),
          eq(transactions.type, "EXPENSE"),
        ),
      )
      .where(
        and(
          eq(monthlyBudgets.userId, user.id),
          eq(monthlyBudgets.month, month),
          eq(monthlyBudgets.year, year),
        ),
      )
      .groupBy(monthlyBudgets.id, categories.id, categories.name, categories.color)
      .orderBy(categories.name),
    db.select().from(settings).where(eq(settings.userId, user.id)).limit(1),
  ]);
  return {
    rows: rows.map((row) => ({ ...row, realized: Number(row.realized) })),
    settings: config[0],
  };
}

export async function getFixedExpenses() {
  const user = await requireUser();
  return getDb()
    .select({ item: fixedExpenses, category: categories.name, account: accounts.name })
    .from(fixedExpenses)
    .innerJoin(categories, eq(categories.id, fixedExpenses.categoryId))
    .leftJoin(accounts, eq(accounts.id, fixedExpenses.accountId))
    .where(eq(fixedExpenses.userId, user.id))
    .orderBy(asc(fixedExpenses.dueDay));
}

export async function getCardsData() {
  const user = await requireUser();
  const db = getDb();
  const [cards, purchases] = await Promise.all([
    db
      .select({
        card: creditCards,
        used: sql<number>`coalesce(sum(case when ${transactions.status} not in ('PAID','CANCELED') then ${transactions.amount} else 0 end), 0)`,
        invoice: sql<number>`coalesce(sum(case when ${transactions.status} = 'PENDING' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(creditCards)
      .leftJoin(transactions, eq(transactions.creditCardId, creditCards.id))
      .where(eq(creditCards.userId, user.id))
      .groupBy(creditCards.id)
      .orderBy(creditCards.name),
    db
      .select({ purchase: creditCardPurchases, cardName: creditCards.name, category: categories.name })
      .from(creditCardPurchases)
      .innerJoin(creditCards, eq(creditCards.id, creditCardPurchases.creditCardId))
      .innerJoin(categories, eq(categories.id, creditCardPurchases.categoryId))
      .where(eq(creditCardPurchases.userId, user.id))
      .orderBy(desc(creditCardPurchases.purchaseDate)),
  ]);
  return { cards: cards.map((row) => ({ ...row, used: Number(row.used), invoice: Number(row.invoice) })), purchases };
}

export async function getGoals() {
  const user = await requireUser();
  return getDb().select().from(financialGoals).where(eq(financialGoals.userId, user.id)).orderBy(desc(financialGoals.priority));
}

export async function getDebts() {
  const user = await requireUser();
  return getDb().select().from(debts).where(eq(debts.userId, user.id)).orderBy(desc(debts.priority));
}

export async function getSettingsData() {
  const user = await requireUser();
  const db = getDb();
  const [config, masters] = await Promise.all([
    db.select().from(settings).where(eq(settings.userId, user.id)).limit(1),
    getMasters(),
  ]);
  return { user, settings: config[0], ...masters };
}

export async function getAnnualData(year: number) {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      month: sql<number>`extract(month from ${transactions.paymentDate})`,
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${transactions.status} = 'RECEIVED' then ${transactions.amount} else 0 end), 0)`,
      expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} = 'PAID' then ${transactions.amount} else 0 end), 0)`,
      investments: sql<number>`coalesce(sum(case when ${transactions.type} = 'INVESTMENT' and ${transactions.status} = 'PAID' then ${transactions.amount} else 0 end), 0)`,
      fixed: sql<number>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} = 'PAID' and ${transactions.isFixed} then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        gte(transactions.paymentDate, `${year}-01-01`),
        lte(transactions.paymentDate, `${year + 1}-01-01`),
      ),
    )
    .groupBy(sql`extract(month from ${transactions.paymentDate})`)
    .orderBy(sql`extract(month from ${transactions.paymentDate})`);
  const byMonth = new Map(rows.map((row) => [Number(row.month), row]));
  return Array.from({ length: 12 }, (_, index) => {
    const row = byMonth.get(index + 1);
    const income = Number(row?.income ?? 0);
    const expenses = Number(row?.expenses ?? 0);
    const investments = Number(row?.investments ?? 0);
    return {
      month: index + 1,
      income,
      expenses,
      investments,
      fixed: Number(row?.fixed ?? 0),
      variable: Math.max(0, expenses - Number(row?.fixed ?? 0)),
      balance: income - expenses - investments,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    };
  });
}
