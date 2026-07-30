import { addMonths } from "date-fns";

export type DebtSimulationInput = {
  balanceCents: number;
  installmentCents: number;
  extraCents: number;
  interestRate: number;
  ratePeriod: "MONTHLY" | "ANNUAL";
  startDate?: Date;
};

export type DebtSimulation = {
  months: number;
  payoffDate: Date;
  totalInterestCents: number;
};

export function monthlyRate(rate: number, period: "MONTHLY" | "ANNUAL") {
  const decimal = rate / 100;
  return period === "MONTHLY" ? decimal : Math.pow(1 + decimal, 1 / 12) - 1;
}

export function simulateDebt(input: DebtSimulationInput): DebtSimulation {
  const rate = monthlyRate(input.interestRate, input.ratePeriod);
  const payment = input.installmentCents + input.extraCents;
  if (input.balanceCents <= 0) {
    return { months: 0, payoffDate: input.startDate ?? new Date(), totalInterestCents: 0 };
  }
  if (payment <= input.balanceCents * rate) {
    throw new Error("A parcela não cobre os juros mensais.");
  }
  let balance = input.balanceCents;
  let interestTotal = 0;
  let months = 0;
  while (balance > 0 && months < 1_200) {
    const interest = Math.round(balance * rate);
    interestTotal += interest;
    balance = Math.max(0, balance + interest - payment);
    months++;
  }
  return {
    months,
    payoffDate: addMonths(input.startDate ?? new Date(), months),
    totalInterestCents: interestTotal,
  };
}

export function goalMetrics(current: number, target: number, start: Date, end: Date, now = new Date()) {
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.max(0, Math.min(total, now.getTime() - start.getTime()));
  const progress = target > 0 ? (current / target) * 100 : 0;
  const expected = (elapsed / total) * 100;
  const monthsRemaining = Math.max(
    0,
    (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth(),
  );
  return {
    remaining: Math.max(0, target - current),
    monthsRemaining,
    monthlyNeeded: monthsRemaining > 0 ? Math.ceil(Math.max(0, target - current) / monthsRemaining) : 0,
    progress: Math.min(100, progress),
    expected,
    onTrack: progress >= expected,
  };
}

export function budgetLevel(percent: number) {
  if (percent > 100) return "danger" as const;
  if (percent > 80) return "warning" as const;
  return "success" as const;
}
