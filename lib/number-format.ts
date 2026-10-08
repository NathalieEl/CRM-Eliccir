export type BudgetCurrency = "EUR" | "USD" | "IDR";
export type BudgetExchangeRates = {
  date: string;
  eurUsd: number;
  eurIdr: number;
  usdIdr: number;
  source: string;
};
export type BudgetRateValues = Pick<BudgetExchangeRates, "eurUsd" | "eurIdr" | "usdIdr">;
export type ConvertedBudgetAmounts = Record<BudgetCurrency, number | null>;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertBudgetAmounts(amount: number | null, currency: BudgetCurrency | null, rates: BudgetRateValues | null): ConvertedBudgetAmounts {
  if (amount === null || currency === null) return { EUR: null, USD: null, IDR: null };
  if (!rates) return { EUR: currency === "EUR" ? amount : null, USD: currency === "USD" ? amount : null, IDR: currency === "IDR" ? amount : null };

  const unitsPerEur: Record<BudgetCurrency, number> = { EUR: 1, USD: rates.eurUsd, IDR: rates.eurIdr };
  const eurAmount = amount / unitsPerEur[currency];
  return {
    EUR: roundMoney(eurAmount),
    USD: roundMoney(eurAmount * rates.eurUsd),
    IDR: roundMoney(eurAmount * rates.eurIdr),
  };
}

export function parseAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = typeof value === "number" ? value : Number(value.replaceAll(",", ""));
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatNumberWithThousands(value: string | number | null | undefined, minimumFractionDigits = 0, maximumFractionDigits = 2) {
  const numericValue = parseAmount(value);
  if (numericValue === null) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits: Math.max(minimumFractionDigits, maximumFractionDigits),
  }).format(numericValue);
}

export function formatCurrencyAmount(value: string | number | null | undefined, currency: string) {
  const numericValue = parseAmount(value);
  if (numericValue === null) return "—";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${currency} ${formatNumberWithThousands(numericValue, 2)}`;
  }
}

export function formatLegacyBudget(value: string | null | undefined) {
  if (!value?.trim()) return "—";
  const match = value.match(/^(\s*(?:US\$|USD|EUR|IDR|€|\$)?\s*)(-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(\s*(?:[KMB]|USD|EUR|IDR)?\s*)$/i);
  if (!match) return value;
  return `${match[1]}${formatNumberWithThousands(match[2].replaceAll(",", ""))}${match[3]}`;
}