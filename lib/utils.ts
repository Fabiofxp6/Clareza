import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number | bigint, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(Number(cents) / 100);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + "%";
}

export function parseMoneyToCents(value: string | number) {
  if (typeof value === "number") return Math.round(value * 100);
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) throw new Error("Valor monetário inválido.");
  return Math.round(amount * 100);
}

export function monthLabel(month: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(2024, month - 1, 1),
  );
}

export function isoDate(value: Date = new Date()) {
  return value.toISOString().slice(0, 10);
}
