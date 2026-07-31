import { describe, expect, it } from "vitest";
import { budgetLevel, goalMetrics, monthlyRate, simulateDebt } from "@/lib/finance";
import { formatCurrency, isIsoDate, isoDateForMonthDay, parseMoneyToCents } from "@/lib/utils";
import { debtSchema, goalSchema, settingsSchema, transactionSchema } from "@/schemas/finance";

describe("valores monetários", () => {
  it("converte reais sem usar ponto flutuante como armazenamento", () => {
    expect(parseMoneyToCents("R$ 1.234,56")).toBe(123456);
    expect(parseMoneyToCents("1234.56")).toBe(123456);
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
    expect(parseMoneyToCents("1.234")).toBe(123400);
    expect(parseMoneyToCents("0,01")).toBe(1);
  });
  it("recusa formatos ambíguos ou acima de duas casas decimais", () => {
    expect(() => parseMoneyToCents("12,3,4")).toThrow("Valor monetário inválido");
    expect(() => parseMoneyToCents("10,123")).toThrow("Valor monetário inválido");
    expect(() => parseMoneyToCents("12,34.56")).toThrow("Valor monetário inválido");
  });
  it("formata centavos em reais", () => {
    expect(formatCurrency(123456)).toContain("1.234,56");
  });
});

describe("datas financeiras", () => {
  it("preserva vencimentos no último dia disponível do mês", () => {
    expect(isoDateForMonthDay(2027, 2, 31)).toBe("2027-02-28");
    expect(isoDateForMonthDay(2028, 2, 31)).toBe("2028-02-29");
    expect(isoDateForMonthDay(2026, 4, 31)).toBe("2026-04-30");
  });
  it("valida datas reais no formato ISO", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
  });
});

describe("lançamentos", () => {
  const valid = {
    date: "2026-07-31",
    type: "TRANSFER",
    description: "Transferência",
    amount: "100,00",
    status: "PENDING",
    accountId: "11111111-1111-4111-8111-111111111111",
    destinationAccountId: "22222222-2222-4222-8222-222222222222",
  };

  it("exige origem e destino distintos em transferências", () => {
    expect(transactionSchema.safeParse(valid).success).toBe(true);
    expect(transactionSchema.safeParse({ ...valid, accountId: "" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, destinationAccountId: valid.accountId }).success).toBe(false);
  });

  it("impede múltiplas origens no mesmo lançamento", () => {
    expect(transactionSchema.safeParse({
      ...valid,
      walletId: "33333333-3333-4333-8333-333333333333",
    }).success).toBe(false);
  });

  it("mantém situação e data de liquidação coerentes", () => {
    expect(transactionSchema.safeParse({ ...valid, type: "INCOME", status: "PAID", paymentDate: "2026-07-31", destinationAccountId: "" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, type: "EXPENSE", status: "RECEIVED", paymentDate: "2026-07-31", destinationAccountId: "" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, paymentDate: "2026-07-31" }).success).toBe(false);
  });
});

describe("validação financeira", () => {
  it("exige que a distribuição de orçamento some 100%", () => {
    const settings = {
      monthlyIncome: "5000,00",
      maximumMonthlySpending: "4000,00",
      emergencyFundTarget: "30000,00",
      emergencyFundMonths: "6",
      needsPercentage: "50",
      wantsPercentage: "30",
      investmentPercentage: "20",
      debtPercentage: "0",
      safetyMarginPercentage: "0",
      theme: "SYSTEM",
    };
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    expect(settingsSchema.safeParse({ ...settings, wantsPercentage: "40" }).success).toBe(false);
  });

  it("recusa metas com prazo invertido e dívidas com parcelas excedentes", () => {
    expect(goalSchema.safeParse({
      name: "Reserva",
      category: "Segurança",
      targetAmount: "1000,00",
      currentAmount: "0,00",
      startDate: "2026-08-01",
      targetDate: "2026-07-31",
      priority: "HIGH",
    }).success).toBe(false);
    expect(debtSchema.safeParse({
      name: "Financiamento",
      creditor: "Banco",
      debtType: "Crédito",
      originalAmount: "1000,00",
      currentBalance: "500,00",
      totalInstallments: "10",
      paidInstallments: "11",
      installmentAmount: "100,00",
      interestRate: "1",
      interestRatePeriod: "MONTHLY",
      startDate: "2026-01-01",
      priority: "MEDIUM",
    }).success).toBe(false);
  });
});

describe("orçamento", () => {
  it("aplica as três faixas", () => {
    expect(budgetLevel(80)).toBe("success");
    expect(budgetLevel(81)).toBe("warning");
    expect(budgetLevel(100.01)).toBe("danger");
  });
});

describe("simulação de dívida", () => {
  it("reduz prazo e juros com valor extra", () => {
    const base = simulateDebt({
      balanceCents: 1_000_000,
      installmentCents: 60_000,
      extraCents: 0,
      interestRate: 1,
      ratePeriod: "MONTHLY",
      startDate: new Date("2026-01-01T12:00:00Z"),
    });
    const accelerated = simulateDebt({
      balanceCents: 1_000_000,
      installmentCents: 60_000,
      extraCents: 30_000,
      interestRate: 1,
      ratePeriod: "MONTHLY",
      startDate: new Date("2026-01-01T12:00:00Z"),
    });
    expect(accelerated.months).toBeLessThan(base.months);
    expect(accelerated.totalInterestCents).toBeLessThan(base.totalInterestCents);
  });
  it("converte taxa anual em equivalente mensal", () => {
    expect(monthlyRate(12, "ANNUAL")).toBeCloseTo(0.009489, 5);
  });
});

describe("metas", () => {
  it("calcula aporte restante e progresso esperado", () => {
    const result = goalMetrics(
      300_000,
      1_200_000,
      new Date("2026-01-01"),
      new Date("2026-12-01"),
      new Date("2026-06-01"),
    );
    expect(result.progress).toBe(25);
    expect(result.remaining).toBe(900_000);
    expect(result.monthsRemaining).toBe(6);
    expect(result.monthlyNeeded).toBe(150_000);
    expect(result.onTrack).toBe(false);
  });
});
