import { describe, expect, it } from "vitest";
import { budgetLevel, goalMetrics, monthlyRate, simulateDebt } from "@/lib/finance";
import { formatCurrency, parseMoneyToCents } from "@/lib/utils";

describe("valores monetários", () => {
  it("converte reais sem usar ponto flutuante como armazenamento", () => {
    expect(parseMoneyToCents("R$ 1.234,56")).toBe(123456);
    expect(parseMoneyToCents("0,01")).toBe(1);
  });
  it("formata centavos em reais", () => {
    expect(formatCurrency(123456)).toContain("1.234,56");
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
