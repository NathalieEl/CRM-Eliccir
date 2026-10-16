import { getAlpha2Code, getNames, registerLocale } from "i18n-iso-countries";
import englishLocale from "i18n-iso-countries/langs/en.json";
import frenchLocale from "i18n-iso-countries/langs/fr.json";

registerLocale(englishLocale);
registerLocale(frenchLocale);

const countryNames = getNames("fr");
const alphabeticalCountries = Object.entries(countryNames)
  .map(([code, name]) => ({ code, name }))
  .sort((first, second) => first.name.localeCompare(second.name, "fr"));
const priorityCodes = ["FR", "ID"];
const countryOptions = [
  ...priorityCodes.map((code) => ({ code, name: countryNames[code] })),
  ...alphabeticalCountries.filter(({ code }) => !priorityCodes.includes(code)),
];

function normalizedCountry(value: string | null | undefined) {
  const country = value?.trim();
  if (!country) return "";
  const code = getAlpha2Code(country, "fr") ?? getAlpha2Code(country, "en");
  return code ? countryNames[code] ?? country : country;
}

type CountrySelectProps = {
  name: string;
  value?: string | null;
};

export function CountrySelect({ name, value }: CountrySelectProps) {
  const selectedCountry = normalizedCountry(value);
  const isKnownCountry = countryOptions.some(({ name: countryName }) => countryName === selectedCountry);

  return (
    <select name={name} defaultValue={selectedCountry}>
      <option value="">Sélectionner un pays</option>
      {countryOptions.map(({ code, name: countryName }) => (
        <option key={code} value={countryName}>{countryName}</option>
      ))}
      {selectedCountry && !isKnownCountry ? <option value={selectedCountry}>{selectedCountry}</option> : null}
    </select>
  );
}