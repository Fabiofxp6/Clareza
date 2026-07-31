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
  if (typeof value === "number") {
    const cents = Math.round(value * 100);
    if (!Number.isFinite(value) || !Number.isSafeInteger(cents)) {
      throw new Error("Valor monetário inválido.");
    }
    return cents;
  }

  let input = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  const negative = input.startsWith("-");
  if (negative) input = input.slice(1);
  if (!input || !/^\d[\d.,]*$/.test(input)) throw new Error("Valor monetário inválido.");

  const commaCount = (input.match(/,/g) ?? []).length;
  const dotCount = (input.match(/\./g) ?? []).length;
  const lastComma = input.lastIndexOf(",");
  const lastDot = input.lastIndexOf(".");
  let normalized: string;

  if (commaCount && dotCount) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    const validGrouped = decimalSeparator === ","
      ? /^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(input)
      : /^\d{1,3}(,\d{3})*\.\d{1,2}$/.test(input);
    if (!validGrouped || (input.match(new RegExp(`\\${decimalSeparator}`, "g")) ?? []).length !== 1) {
      throw new Error("Valor monetário inválido.");
    }
    normalized = input.replaceAll(thousandsSeparator, "").replace(decimalSeparator, ".");
  } else if (commaCount === 1) {
    normalized = input.replace(",", ".");
  } else if (commaCount > 1) {
    throw new Error("Valor monetário inválido.");
  } else if (dotCount === 1) {
    const [integer, fraction] = input.split(".");
    normalized = fraction.length === 3 && integer.length <= 3 ? `${integer}${fraction}` : input;
  } else if (dotCount > 1) {
    if (!/^\d{1,3}(\.\d{3})+$/.test(input)) throw new Error("Valor monetário inválido.");
    normalized = input.replaceAll(".", "");
  } else {
    normalized = input;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Valor monetário inválido.");
  const amount = Number(`${negative ? "-" : ""}${normalized}`);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents)) {
    throw new Error("Valor monetário inválido.");
  }
  return cents;
}

export function clampInteger(value: string | number | undefined, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function isIsoDate(value: string | undefined): value is string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
}

export function isoDateForMonthDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(lastDay, Math.max(1, Math.trunc(day)));
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function monthLabel(month: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(2024, month - 1, 1),
  );
}

export function isoDate(value: Date = new Date()) {
  const timeZone = process.env.APP_TIMEZONE ?? "America/Maceio";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return value.toISOString().slice(0, 10);
  }
}
