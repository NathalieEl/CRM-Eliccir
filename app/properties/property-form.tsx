import Link from "next/link";
import { UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import { ProjectBudgetFields } from "@/app/properties/project-budget-fields";
import { CoordinateField } from "@/app/properties/coordinate-field";
import { formatCurrencyAmount } from "@/lib/number-format";
import type { Prisma } from "@/app/generated/prisma/client";

type PropertyRecord = Prisma.PropertyGetPayload<{
  include: {
    owner: true;
    landTitle: true;
    documents: true;
    mandates: true;
    deals: true;
    viewings: true;
  };
}>;

type PropertyFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  property?: PropertyRecord;
  contacts: { id: string; prenom: string | null; nom: string }[];
  entreprises: { id: string; nom: string }[];
  submitLabel: string;
  cancelHref: string;
  editable?: boolean;
};

const propertyTypes = ["PROJECT", "VILLA", "HOUSE", "APARTMENT", "LAND", "COMMERCIAL", "BUILDING", "WAREHOUSE", "GUESTHOUSE_HOTEL"];
const propertyStatuses = ["AVAILABLE", "UNDER_OFFER", "SOLD", "RENTED", "WITHDRAWN"];
const propertyConditions = ["NEW", "GOOD", "TO_RENOVATE", "OFF_PLAN"];
const furnishings = ["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"];
const waterSources = ["PDAM", "WELL", "BOTH", "NONE"];
const zoningTypes = ["RESIDENTIAL", "TOURISM", "COMMERCIAL", "MIXED", "AGRICULTURAL_PROTECTED", "UNKNOWN"];
const buildingPermitStatuses = ["PBG_OBTAINED", "SLF_OBTAINED", "LEGACY_IMB", "NONE", "UNKNOWN"];
const landRightTypes = ["HAK_MILIK", "HGB", "HAK_PAKAI", "HAK_SEWA", "HMSRS", "GIRIK", "UNKNOWN"];
const holdingStructures = ["INDIVIDUAL", "LOCAL_COMPANY", "PT_PMA"];
const documentTypes = ["LAND_CERTIFICATE", "PBG", "SLF", "PBB_RECEIPT", "MANDATE", "PPJB", "AJB", "LEASE_AGREEMENT", "OTHER"];

const labels: Record<string, string> = {
  PROJECT: "Projet immobilier",
  VILLA: "Villa",
  HOUSE: "Maison",
  APARTMENT: "Appartement",
  LAND: "Terrain",
  COMMERCIAL: "Local commercial",
  BUILDING: "Bâtiment",
  WAREHOUSE: "Entrepôt",
  GUESTHOUSE_HOTEL: "Maison d’hôtes / hôtel",
  AVAILABLE: "Disponible",
  UNDER_OFFER: "Sous offre",
  SOLD: "Vendu",
  RENTED: "Loué",
  WITHDRAWN: "Retiré",
  NEW: "Neuf",
  GOOD: "Bon état",
  TO_RENOVATE: "À rénover",
  OFF_PLAN: "Sur plan",
  FURNISHED: "Meublé",
  SEMI_FURNISHED: "Partiellement meublé",
  UNFURNISHED: "Non meublé",
  PDAM: "Réseau PDAM",
  WELL: "Puits",
  BOTH: "Réseau et puits",
  NONE: "Aucun",
  RESIDENTIAL: "Résidentiel",
  TOURISM: "Tourisme",
  MIXED: "Mixte",
  AGRICULTURAL_PROTECTED: "Agricole protégé",
  PBG_OBTAINED: "PBG obtenu",
  SLF_OBTAINED: "SLF obtenu",
  LEGACY_IMB: "Ancien IMB",
  HAK_MILIK: "Hak Milik (SHM)",
  HGB: "Hak Guna Bangunan (HGB)",
  HAK_PAKAI: "Hak Pakai",
  HAK_SEWA: "Hak Sewa",
  HMSRS: "HMSRS",
  GIRIK: "Girik / Letter C",
  INDIVIDUAL: "Particulier",
  LOCAL_COMPANY: "Société locale (PT)",
  PT_PMA: "Société PT PMA",
  LAND_CERTIFICATE: "Certificat foncier",
  PBG: "PBG",
  SLF: "SLF",
  PBB_RECEIPT: "Reçu PBB",
  MANDATE: "Mandat",
  PPJB: "PPJB",
  AJB: "AJB",
  LEASE_AGREEMENT: "Contrat de bail",
  OTHER: "Autre",
};

function dateValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function displayDate(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

function displayValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function SelectField({ label, name, value, options, required = false }: {
  label: string;
  name: string;
  value: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <label>{label}<select name={name} defaultValue={value} required={required}>
      {!required ? <option value="">Non renseigné</option> : null}
      {options.map((option) => <option value={option} key={option}>{labels[option] ?? option}</option>)}
    </select></label>
  );
}

function BooleanField({ label, name, value }: { label: string; name: string; value: boolean | null | undefined }) {
  return <label>{label}<select name={name} defaultValue={value === null || value === undefined ? "" : String(value)}><option value="">Non renseigné</option><option value="true">Oui</option><option value="false">Non</option></select></label>;
}

function CheckField({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return <label className="property-checkbox"><input type="checkbox" name={name} defaultChecked={checked} />{label}</label>;
}

export function PropertyForm({ action, property, contacts, entreprises, submitLabel, cancelHref, editable = true }: PropertyFormProps) {
  const landTitle = property?.landTitle;

  return (
    <UnsavedChangesForm action={action} className="property-edit-form">
      {property ? <input type="hidden" name="id" value={property.id} /> : null}
      <fieldset className="property-fieldset" disabled={!editable}>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">01 · IDENTIFICATION</p><h2>Informations générales</h2></div></div>
        <div className="property-fields-grid">
          <label>Référence du projet<input name="reference" defaultValue={property?.reference ?? ""} required minLength={2} maxLength={80} /></label>
          <label>Nom du projet<input name="title" defaultValue={property?.title ?? ""} required minLength={2} maxLength={200} /></label>
          <SelectField label="Type de projet" name="type" value={property?.type ?? "PROJECT"} options={propertyTypes} required />
          <SelectField label="Statut" name="status" value={property?.status ?? "AVAILABLE"} options={propertyStatuses} required />
          <SelectField label="État" name="condition" value={property?.condition ?? ""} options={propertyConditions} />
          <label>Année de construction<input name="yearBuilt" type="number" step="1" defaultValue={displayValue(property?.yearBuilt)} /></label>
          <label>Année de rénovation<input name="yearRenovated" type="number" step="1" defaultValue={displayValue(property?.yearRenovated)} /></label>
          <label>Propriétaire<select name="ownerId" defaultValue={property?.ownerId ?? ""}><option value="">Non renseigné</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</option>)}</select></label>
          <label>Entreprise<select name="entrepriseId" defaultValue={property?.entrepriseId ?? ""}><option value="">Non renseignée</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
          <label>Pays<input name="country" defaultValue={property?.country ?? ""} maxLength={80} /></label>
          <label>Statut du projet<input name="projectStatus" defaultValue={property?.projectStatus ?? "En cours"} maxLength={40} /></label>
          <label>Progression du projet (%)<input name="projectProgression" type="number" min="0" max="100" step="1" defaultValue={displayValue(property?.projectProgression ?? 0)} /></label>
          <label className="property-field-wide">Description<textarea name="description" rows={5} defaultValue={property?.description ?? ""} /></label>
        </div>
      </section>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">02 · LOCALISATION</p><h2>Adresse et accès</h2></div></div>
        <div className="property-fields-grid">
          <label className="property-field-wide">Adresse<input name="address" defaultValue={property?.address ?? ""} /></label>
          <label>Quartier<input name="neighborhood" defaultValue={property?.neighborhood ?? ""} /></label>
          <label>Kecamatan / district<input name="kecamatan" defaultValue={property?.kecamatan ?? ""} /></label>
          <label>Kabupaten / ville<input name="kabupaten" defaultValue={property?.kabupaten ?? ""} /></label>
          <label>Province<input name="province" defaultValue={property?.province ?? ""} /></label>
          <label>Code postal<input name="postalCode" defaultValue={property?.postalCode ?? ""} /></label>
          <CoordinateField label="Latitude" name="latitude" initialValue={displayValue(property?.latitude)} />
          <label>Distance de l’aéroport (km)<input name="distanceAirportKm" type="number" min="0" step="any" defaultValue={displayValue(property?.distanceAirportKm)} /></label>
          <label>Distance de la plage (km)<input name="distanceBeachKm" type="number" min="0" step="any" defaultValue={displayValue(property?.distanceBeachKm)} /></label>
          <CoordinateField label="Longitude" name="longitude" initialValue={displayValue(property?.longitude)} />
          <label>Largeur de la voie d’accès (m)<input name="accessRoadWidthM" type="number" min="0" step="any" defaultValue={displayValue(property?.accessRoadWidthM)} /></label>
          <label>Type de voie d’accès<input name="accessRoadType" defaultValue={property?.accessRoadType ?? ""} /></label>
          <label>Vues<textarea name="views" rows={3} placeholder="Une valeur par ligne" defaultValue={property?.views.join("\n") ?? ""} /></label>
          <BooleanField label="Risque d’inondation" name="floodRisk" value={property?.floodRisk} />
        </div>
      </section>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">03 · CARACTÉRISTIQUES</p><h2>Surfaces et équipements</h2></div></div>
        <div className="property-fields-grid">
          <label>Surface du terrain (m²)<input name="landAreaSqm" type="number" min="0" step="any" defaultValue={displayValue(property?.landAreaSqm)} /></label>
          <label>Surface bâtie (m²)<input name="buildingAreaSqm" type="number" min="0" step="any" defaultValue={displayValue(property?.buildingAreaSqm)} /></label>
          <label>Chambres<input name="bedrooms" type="number" min="0" step="1" defaultValue={displayValue(property?.bedrooms)} /></label>
          <label>Salles de bains<input name="bathrooms" type="number" min="0" step="1" defaultValue={displayValue(property?.bathrooms)} /></label>
          <label>Étages<input name="floors" type="number" min="0" step="1" defaultValue={displayValue(property?.floors)} /></label>
          <label>Places de parking<input name="parkingSpaces" type="number" min="0" step="1" defaultValue={displayValue(property?.parkingSpaces)} /></label>
          <SelectField label="Mobilier" name="furnishing" value={property?.furnishing ?? ""} options={furnishings} />
          <CheckField label="Piscine" name="hasPool" checked={property?.hasPool ?? false} />
          <CheckField label="Jardin" name="hasGarden" checked={property?.hasGarden ?? false} />
          <label className="property-field-wide">Équipements<textarea name="amenities" rows={4} placeholder="Un équipement par ligne" defaultValue={property?.amenities.join("\n") ?? ""} /></label>
        </div>
      </section>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">04 · RÉSEAUX ET SERVICES</p><h2>Raccordements et personnel</h2></div></div>
        <div className="property-fields-grid">
          <label>Puissance électrique (VA)<input name="electricityVA" type="number" min="0" step="1" defaultValue={displayValue(property?.electricityVA)} /></label>
          <SelectField label="Source d’eau" name="waterSource" value={property?.waterSource ?? ""} options={waterSources} />
          <label>Assainissement<input name="sanitation" defaultValue={property?.sanitation ?? ""} /></label>
          <label>Fournisseur Internet<input name="internetProvider" defaultValue={property?.internetProvider ?? ""} /></label>
          <label>Personnel inclus<textarea name="staffIncluded" rows={3} placeholder="Une fonction par ligne" defaultValue={property?.staffIncluded.join("\n") ?? ""} /></label>
        </div>
      </section>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">05 · INVESTISSEMENT</p><h2>Gestion locative et rendement</h2></div></div>
        <div className="property-fields-grid">
          <label>Société de gestion<input name="managementCompany" defaultValue={property?.managementCompany ?? ""} /></label>
          <label>Rendement estimé (%)<input name="estimatedYieldPct" type="number" step="any" defaultValue={displayValue(property?.estimatedYieldPct)} /></label>
          <label>Taux d’occupation (%)<input name="occupancyRatePct" type="number" step="any" defaultValue={displayValue(property?.occupancyRatePct)} /></label>
        </div>
      </section>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">06 · BUDGET</p><h2>Budget du projet · EUR / USD / IDR</h2></div></div>
        <ProjectBudgetFields
          legacyBudget={property?.projectBudget ?? null}
          initialAmount={displayValue(property?.projectBudgetAmount) || null}
          initialCurrency={property?.projectBudgetCurrency ?? null}
          initialEur={displayValue(property?.projectBudgetEur) || null}
          initialUsd={displayValue(property?.projectBudgetUsd) || null}
          initialIdr={displayValue(property?.projectBudgetIdr) || null}
          initialEurUsd={displayValue(property?.projectBudgetRateEurUsd) || null}
          initialEurIdr={displayValue(property?.projectBudgetRateEurIdr) || null}
          initialUsdIdr={displayValue(property?.projectBudgetRateUsdIdr) || null}
          initialRateDate={property?.projectBudgetRateDate?.toISOString().slice(0, 10) ?? null}
        />
      </section>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">07 · CONFORMITÉ</p><h2>Réglementation et risques</h2></div></div>
        <div className="property-fields-grid">
          <SelectField label="Zonage" name="zoning" value={property?.zoning ?? ""} options={zoningTypes} />
          <SelectField label="Permis de construire" name="buildingPermit" value={property?.buildingPermit ?? ""} options={buildingPermitStatuses} />
          <CheckField label="Contentieux en cours" name="hasLitigation" checked={property?.hasLitigation ?? false} />
          <CheckField label="Hypothèque / hak tanggungan" name="hasMortgageLien" checked={property?.hasMortgageLien ?? false} />
          <label>Frais Banjar mensuels<input name="banjarFeesMonthly" type="number" min="0" step="any" defaultValue={displayValue(property?.banjarFeesMonthly)} /></label>
          <BooleanField label="Éligible aux étrangers" name="foreignerEligible" value={property?.foreignerEligible} />
          <label className="property-field-wide">Détail de l’éligibilité<input name="foreignerEligibleNote" defaultValue={property?.foreignerEligibleNote ?? ""} /></label>
        </div>
      </section>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">08 · TITRE FONCIER</p><h2>Certificat et droits fonciers</h2></div></div>
        {landTitle ? <><input type="hidden" name="landTitleId" value={landTitle.id} /><div className="property-system-fields"><label>Identifiant du titre<input value={landTitle.id} readOnly /></label><label>Bien rattaché<input value={landTitle.propertyId} readOnly /></label></div><label className="property-delete-document"><input type="checkbox" name="deleteLandTitle" />Supprimer le titre foncier et ses informations</label></> : null}
        <div className="property-fields-grid">
          <SelectField label="Type de droit" name="rightType" value={landTitle?.rightType ?? ""} options={landRightTypes} />
          <label>Numéro du certificat<input name="certificateNumber" defaultValue={landTitle?.certificateNumber ?? ""} /></label>
          <label>NIB<input name="nib" defaultValue={landTitle?.nib ?? ""} /></label>
          <label>Nom du titulaire<input name="holderName" defaultValue={landTitle?.holderName ?? ""} /></label>
          <SelectField label="Structure de détention" name="holdingStructure" value={landTitle?.holdingStructure ?? ""} options={holdingStructures} />
          <CheckField label="Vérifié auprès du BPN" name="verifiedWithBpn" checked={landTitle?.verifiedWithBpn ?? false} />
          <label>Date de vérification<input name="verifiedAt" type="date" defaultValue={dateValue(landTitle?.verifiedAt)} /></label>
          <label>Date d’expiration du droit<input name="expiryDate" type="date" defaultValue={dateValue(landTitle?.expiryDate)} /></label>
          <label>Années restantes<input name="remainingYears" type="number" min="0" step="any" defaultValue={displayValue(landTitle?.remainingYears)} /></label>
          <BooleanField label="Prolongation possible" name="extensionPossible" value={landTitle?.extensionPossible} />
          <label>Coût de prolongation<input name="extensionCost" type="number" min="0" step="any" defaultValue={displayValue(landTitle?.extensionCost)} /></label>
          <label>Début du bail<input name="leaseStartDate" type="date" defaultValue={dateValue(landTitle?.leaseStartDate)} /></label>
          <label>Fin du bail<input name="leaseEndDate" type="date" defaultValue={dateValue(landTitle?.leaseEndDate)} /></label>
          <BooleanField label="Option de renouvellement" name="renewalOption" value={landTitle?.renewalOption} />
          <label>Nom du bailleur<input name="lessorName" defaultValue={landTitle?.lessorName ?? ""} /></label>
          <label className="property-field-wide">Notes sur le titre<textarea name="landTitleNotes" rows={4} defaultValue={landTitle?.notes ?? ""} /></label>
        </div>
      </section>

      <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">09 · DOCUMENTS</p><h2>Documents du bien</h2></div><span className="contacts-list-count">{property?.documents.length ?? 0}</span></div>
        {(property?.documents ?? []).map((document) => <div className="property-document-row" key={document.id}>
          <input type="hidden" name="documentId" value={document.id} />
          <div className="property-system-fields"><label>Identifiant<input value={document.id} readOnly /></label><label>Bien rattaché<input value={document.propertyId ?? "—"} readOnly /></label><label>Créé le<input value={displayDate(document.createdAt)} readOnly /></label></div>
          <div className="property-fields-grid">
            <SelectField label="Type de document" name="documentType" value={document.type} options={documentTypes} required />
            <label>Nom<input name="documentName" defaultValue={document.name} required maxLength={200} /></label>
            <label>URL<input name="documentUrl" type="url" defaultValue={document.url ?? ""} /></label>
            <label>Délivré le<input name="documentIssuedAt" type="date" defaultValue={dateValue(document.issuedAt)} /></label>
            <label>Expire le<input name="documentExpiresAt" type="date" defaultValue={dateValue(document.expiresAt)} /></label>
            <label>Dossier associé<select name="documentDealId" defaultValue={document.dealId ?? ""}><option value="">Aucun</option>{(property?.deals ?? []).map((deal) => <option value={deal.id} key={deal.id}>{deal.id} · {labels[deal.stage] ?? deal.stage}</option>)}</select></label>
          </div>
          <label className="property-delete-document"><input type="checkbox" name="deleteDocumentId" value={document.id} />Supprimer ce document</label>
        </div>)}
        <div className="property-document-row">
          <input type="hidden" name="documentId" value="" />
          <div className="property-fields-grid">
            <SelectField label="Type de document" name="documentType" value="" options={documentTypes} />
            <label>Nom<input name="documentName" maxLength={200} /></label>
            <label>URL<input name="documentUrl" type="url" /></label>
            <label>Délivré le<input name="documentIssuedAt" type="date" /></label>
            <label>Expire le<input name="documentExpiresAt" type="date" /></label>
            <label>Dossier associé<select name="documentDealId" defaultValue=""><option value="">Aucun</option>{(property?.deals ?? []).map((deal) => <option value={deal.id} key={deal.id}>{deal.id} · {labels[deal.stage] ?? deal.stage}</option>)}</select></label>
          </div>
        </div>
      </section>

      {property && (property.mandates.length > 0 || property.deals.length > 0 || property.viewings.length > 0) ? <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">10 · RELATIONS</p><h2>Mandats, dossiers et visites rattachés</h2></div></div>
        <div className="property-related-list">
          {property.mandates.map((mandate) => <p key={mandate.id}><b>Mandat · {mandate.id}</b><span>{mandate.transactionType} · {mandate.mandateType} · {mandate.isActive ? "Actif" : "Inactif"}</span></p>)}
          {property.deals.map((deal) => <p key={deal.id}><b>Dossier · {deal.id}</b><span>{deal.transactionType} · {deal.stage} · {formatCurrencyAmount((deal.finalPrice ?? deal.negotiatedPrice)?.toString() ?? null, deal.currency)}</span></p>)}
          {property.viewings.map((viewing) => <p key={viewing.id}><b>Visite · {viewing.id}</b><span>{displayDate(viewing.scheduledAt)} · Contact {viewing.contactId} · Intérêt {displayValue(viewing.interestLevel) || "—"}</span></p>)}
        </div>
      </section> : null}

      {property ? <section className="contacts-create-section profile-section">
        <div className="contacts-section-heading"><div><p className="section-index">11 · SYSTÈME</p><h2>Informations système</h2></div></div>
        <div className="property-system-fields">
          <label>Identifiant<input value={property.id} readOnly /></label>
          {property.legacyProjectId ? <label>Ancien identifiant projet<input value={property.legacyProjectId} readOnly /></label> : null}
          <label>Créé le<input value={displayDate(property.createdAt)} readOnly /></label>
          <label>Modifié le<input value={displayDate(property.updatedAt)} readOnly /></label>
        </div>
      </section> : null}

      <div className="profile-form-actions"><Link className="contact-cancel-link" href={cancelHref}>Annuler</Link>{editable ? <button className="contact-primary-button profile-save-button" type="submit">{submitLabel}</button> : null}</div>
      </fieldset>
    </UnsavedChangesForm>
  );
}