import type { Entreprise } from "@/app/generated/prisma/client";
import { CountrySelect } from "@/app/components/country-select";

type CompanyFieldsValues = Pick<
  Entreprise,
  "nom" | "email" | "telephone" | "siteWeb" | "secteur" | "adresse" | "ville" | "departement" | "pays"
>;

export function CompanyFields({ entreprise }: { entreprise?: CompanyFieldsValues }) {
  return (
    <>
      <label><span className="field-title">Nom de l’entreprise</span><input name="nom" defaultValue={entreprise?.nom ?? ""} required minLength={2} maxLength={160} /></label>
      <label><span className="field-title">E-mail</span><input name="email" type="email" defaultValue={entreprise?.email ?? ""} maxLength={254} /></label>
      <label><span className="field-title">Téléphone</span><input name="telephone" type="tel" defaultValue={entreprise?.telephone ?? ""} maxLength={40} /></label>
      <label><span className="field-title">Site web</span><input name="siteWeb" type="url" defaultValue={entreprise?.siteWeb ?? ""} maxLength={254} /></label>
      <label><span className="field-title">Secteur</span><input name="secteur" defaultValue={entreprise?.secteur ?? ""} maxLength={80} /></label>
      <label><span className="field-title">Adresse</span><input name="adresse" defaultValue={entreprise?.adresse ?? ""} maxLength={160} /></label>
      <label><span className="field-title">Ville</span><input name="ville" defaultValue={entreprise?.ville ?? ""} maxLength={80} /></label>
      <label><span className="field-title">Département</span><input name="departement" defaultValue={entreprise?.departement ?? ""} maxLength={20} /></label>
      <label><span className="field-title">Pays</span><CountrySelect name="pays" value={entreprise?.pays} /></label>
    </>
  );
}
