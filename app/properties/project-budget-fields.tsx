"use client";

import { useEffect, useState } from "react";
import { convertBudgetAmounts, formatCurrencyAmount, formatLegacyBudget, formatNumberWithThousands, parseAmount, type BudgetCurrency, type BudgetExchangeRates } from "@/lib/number-format";

type ProjectBudgetFieldsProps = {
  legacyBudget: string | null;
  initialAmount: string | null;
  initialCurrency: string | null;
  initialEur: string | null;
  initialUsd: string | null;
  initialIdr: string | null;
  initialEurUsd: string | null;
  initialEurIdr: string | null;
  initialUsdIdr: string | null;
  initialRateDate: string | null;
};

const currencies: BudgetCurrency[] = ["EUR", "USD", "IDR"];

function isBudgetCurrency(value: string | null): value is BudgetCurrency {
  return value === "EUR" || value === "USD" || value === "IDR";
}

function makeSavedRates(props: ProjectBudgetFieldsProps): BudgetExchangeRates | null {
  const eurUsd = Number(props.initialEurUsd);
  const eurIdr = Number(props.initialEurIdr);
  const usdIdr = Number(props.initialUsdIdr);
  if (!props.initialRateDate || ![eurUsd, eurIdr, usdIdr].every((value) => Number.isFinite(value) && value > 0)) return null;
  return { date: props.initialRateDate, eurUsd, eurIdr, usdIdr, source: "Taux enregistrés" };
}

export function ProjectBudgetFields(props: ProjectBudgetFieldsProps) {
  const initialCurrency = isBudgetCurrency(props.initialCurrency) ? props.initialCurrency : "EUR";
  const [amount, setAmount] = useState(props.initialAmount ? formatNumberWithThousands(props.initialAmount, 2) : "");
  const [currency, setCurrency] = useState<BudgetCurrency>(initialCurrency);
  const [rates, setRates] = useState<BudgetExchangeRates | null>(() => makeSavedRates(props));
  const [loadingRates, setLoadingRates] = useState(true);
  const [rateError, setRateError] = useState(false);
  const amountValue = parseAmount(amount);
  const converted = convertBudgetAmounts(amountValue, currency, rates);
  const savedBudgetUnchanged = amountValue !== null && props.initialAmount !== null &&
    amountValue === parseAmount(props.initialAmount) && currency === initialCurrency;
  const savedAmounts = {
    EUR: parseAmount(props.initialEur),
    USD: parseAmount(props.initialUsd),
    IDR: parseAmount(props.initialIdr),
  };
  const displayAmounts = rates || !savedBudgetUnchanged
    ? converted
    : savedAmounts;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/project-budget-rates", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Exchange rates unavailable");
        return response.json() as Promise<BudgetExchangeRates>;
      })
      .then((latestRates) => {
        if (!Number.isFinite(latestRates.eurUsd) || !Number.isFinite(latestRates.eurIdr) || !Number.isFinite(latestRates.usdIdr)) {
          throw new Error("Invalid exchange rates");
        }
        setRates(latestRates);
        setRateError(false);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setRateError(true);
      })
      .finally(() => setLoadingRates(false));
    return () => controller.abort();
  }, []);

  const handleCurrencyChange = (nextCurrency: BudgetCurrency) => {
    if (amountValue !== null && rates) {
      const nextAmount = converted[nextCurrency];
      if (nextAmount !== null) setAmount(formatNumberWithThousands(nextAmount, 2));
    }
    setCurrency(nextCurrency);
  };

  const handleAmountChange = (value: string) => {
    const normalized = value.replaceAll(",", "");
    if (/^\d*(?:\.\d*)?$/.test(normalized)) setAmount(normalized);
  };

  const handleAmountBlur = () => {
    if (amountValue !== null) setAmount(formatNumberWithThousands(amountValue, 2));
    else if (amount) setAmount("");
  };

  const budgetLabel = amountValue === null
    ? props.legacyBudget ?? ""
    : formatCurrencyAmount(amountValue, currency);
  const rateDate = rates?.date ?? "";

  return (
    <div className="project-budget-fields">
      <div className="property-fields-grid">
        <label>Devise de saisie<select name="projectBudgetCurrency" value={currency} disabled={amountValue !== null && rates === null} onChange={(event) => handleCurrencyChange(event.target.value as BudgetCurrency)}>
          {currencies.map((item) => <option value={item} key={item}>{item}</option>)}
        </select></label>
        {currencies.map((item) => {
          const isSource = item === currency;
          const value = isSource
            ? amount
            : displayAmounts[item] === null
              ? ""
              : formatNumberWithThousands(displayAmounts[item], 2);
          const label = item === "USD" ? "Montant US$" : item === "EUR" ? "Montant Euro" : "Montant IDR";
          return <label key={item}>{isSource ? `Budget du projet (${item})` : label}<input
            aria-label={label}
            type="text"
            inputMode="decimal"
            value={value}
            readOnly={!isSource}
            onFocus={isSource ? () => setAmount(amount.replaceAll(",", "")) : undefined}
            onChange={isSource ? (event) => handleAmountChange(event.target.value) : undefined}
            onBlur={isSource ? handleAmountBlur : undefined}
          /></label>;
        })}
      </div>

      {props.legacyBudget && amountValue === null ? <p className="contacts-search-results">Budget précédent sans devise confirmée : {formatLegacyBudget(props.legacyBudget)}. Saisis un montant et choisis sa devise pour activer les conversions.</p> : null}

      <div className="property-related-list" aria-live="polite">
        {loadingRates ? <p>Récupération des derniers cours de change…</p> : null}
        {rates ? <>
          <p><b>Taux de change</b><span>1 EUR = {formatNumberWithThousands(rates.eurUsd, 4, 4)} USD · 1 EUR = {formatNumberWithThousands(rates.eurIdr, 2)} IDR · 1 USD = {formatNumberWithThousands(rates.usdIdr, 2)} IDR</span></p>
          <p><b>Cours du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${rateDate}T00:00:00Z`))}</b><span>{rates.source}</span></p>
        </> : null}
        {rateError && !rates ? <p role="status">Cours indisponibles. Le montant saisi sera conservé; les conversions apparaîtront dès que la source de taux sera accessible.</p> : null}
        {rateError && rates ? <p role="status">La source est momentanément inaccessible; dernier cours enregistré du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${rateDate}T00:00:00Z`))} utilisé.</p> : null}
      </div>

      <input type="hidden" name="projectBudgetAmount" value={amountValue === null ? "" : amountValue.toFixed(2)} />
      <input type="hidden" name="projectBudget" value={budgetLabel} />
      <input type="hidden" name="projectBudgetRateEurUsd" value={rates?.eurUsd ?? ""} />
      <input type="hidden" name="projectBudgetRateEurIdr" value={rates?.eurIdr ?? ""} />
      <input type="hidden" name="projectBudgetRateUsdIdr" value={rates?.usdIdr ?? ""} />
      <input type="hidden" name="projectBudgetRateDate" value={rateDate} />
    </div>
  );
}
