import type { Entreprise } from "@/app/generated/prisma/client";

type CompanyFieldsValues = Pick<
  Entreprise,
  "nom" | "email" | "telephone" | "siteWeb" | "secteur" | "adresse" | "ville" | "departement" | "pays"
>;

export function CompanyFields({ entreprise }: { entreprise?: CompanyFieldsValues }) {
  return (
    <>
      <label>Nom de l’entreprise<input name="nom" defaultValue={entreprise?.nom ?? ""} required minLength={2} maxLength={160} /></label>
      <label>E-mail<input name="email" type="email" defaultValue={entreprise?.email ?? ""} maxLength={254} /></label>
      <label>Téléphone<input name="telephone" type="tel" defaultValue={entreprise?.telephone ?? ""} maxLength={40} /></label>
      <label>Site web<input name="siteWeb" type="url" defaultValue={entreprise?.siteWeb ?? ""} maxLength={254} /></label>
      <label>Secteur<input name="secteur" defaultValue={entreprise?.secteur ?? ""} maxLength={80} /></label>
      <label>Adresse<input name="adresse" defaultValue={entreprise?.adresse ?? ""} maxLength={160} /></label>
      <label>Ville<input name="ville" defaultValue={entreprise?.ville ?? ""} maxLength={80} /></label>
      <label>Département<input name="departement" defaultValue={entreprise?.departement ?? ""} maxLength={20} /></label>
      <label>Pays<input name="pays" defaultValue={entreprise?.pays ?? ""} maxLength={80} /></label>
    </>
  );
}
