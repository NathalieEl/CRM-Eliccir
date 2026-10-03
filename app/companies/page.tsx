import Link from "next/link";
import {
  createEntreprise,
  deleteEntreprise,
  linkContactToEntreprise,
  unlinkContactFromEntreprise,
  updateEntreprise,
} from "@/app/companies/actions";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import type { Prisma } from "@/app/generated/prisma/client";

type EntrepriseRecord = Prisma.EntrepriseGetPayload<{
  include: {
    contacts: { include: { contact: true } };
    _count: { select: { activities: true; actionItems: true; projects: true } };
  };
}>;

type ContactOption = Prisma.ContactGetPayload<{
  select: { id: true; prenom: true; nom: true; email: true };
}>;

type CompaniesPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
};

const notices: Record<string, string> = {
  created: "L’entreprise a été créée.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "L’entreprise a été supprimée.",
  linked: "Le contact a été rattaché à l’entreprise.",
  unlinked: "Le contact a été détaché de l’entreprise.",
};

const errors: Record<string, string> = {
  invalid: "Vérifiez le nom et les coordonnées de l’entreprise.",
  exists: "Une entreprise porte déjà ce nom.",
  "not-found": "Cette entreprise n’existe plus. Actualisez la liste.",
  "confirm-delete": "Confirmez la suppression de l’entreprise.",
  "invalid-link": "Sélectionnez une entreprise et un contact valides.",
  "confirm-unlink": "Confirmez le retrait du contact.",
};

function contactName(contact: ContactOption | EntrepriseRecord["contacts"][number]["contact"]) {
  return [contact.prenom, contact.nom].filter(Boolean).join(" ");
}

function CompanyFields({ entreprise }: { entreprise?: EntrepriseRecord }) {
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

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  let databaseAvailable = true;
  let entreprises: EntrepriseRecord[] = [];
  let contacts: ContactOption[] = [];

  try {
    [entreprises, contacts] = await Promise.all([
      prisma.entreprise.findMany({
        include: {
          contacts: { include: { contact: true } },
          _count: { select: { activities: true, actionItems: true, projects: true } },
        },
        orderBy: { nom: "asc" },
      }),
      prisma.contact.findMany({
        select: { id: true, prenom: true, nom: true, email: true },
        orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      }),
    ]);
  } catch {
    databaseAvailable = false;
  }

  const filtered = query
    ? entreprises.filter((entreprise) => {
        const haystack = [
          entreprise.nom,
          entreprise.email ?? "",
          entreprise.telephone ?? "",
          entreprise.secteur ?? "",
          entreprise.ville ?? "",
          entreprise.pays ?? "",
          ...entreprise.contacts.flatMap(({ contact }) => [contact.prenom ?? "", contact.nom, contact.email ?? ""]),
        ].join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : entreprises;

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>
      <div className="contacts-content">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL · ORGANISATIONS</p><h1>Entreprises</h1><p className="contacts-intro">Gérez les organisations, leurs contacts et leur suivi commercial.</p></div>
          <span className="contacts-total">{databaseAvailable ? entreprises.length : "—"}<small>ENTREPRISES</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search" action="/companies" method="get">
            <label htmlFor="companies-search" className="sr-only">Rechercher une entreprise</label>
            <input id="companies-search" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Rechercher une entreprise ou un contact" autoComplete="off" />
            <button type="submit">Rechercher</button>
          </form>
          {query ? <a className="contacts-search-reset" href="/companies">Réinitialiser</a> : null}
        </section>

        {params.notice && notices[params.notice] && <p className="contacts-message" role="status">{notices[params.notice]}</p>}
        {params.error && errors[params.error] && <p className="contacts-message contacts-message-error" role="alert">{errors[params.error]}</p>}

        {!databaseAvailable ? (
          <section className="contacts-database-error" role="alert"><h2>La base de données est inaccessible</h2><p>Vérifiez la configuration PostgreSQL puis rechargez cette page.</p></section>
        ) : (
          <>
            <section className="contacts-create-section">
              <div className="contacts-section-heading"><div><p className="section-index">01 · NOUVEAU</p><h2>Ajouter une entreprise</h2></div></div>
              <form action={createEntreprise} className={`contact-form${canWrite ? "" : " permission-hidden"}`}>
                <CompanyFields />
                <button className="contact-primary-button" type="submit">Créer l’entreprise <span>+</span></button>
              </form>
            </section>

            <section className="contacts-list-section">
              <div className="contacts-section-heading"><div><p className="section-index">02 · PORTFEUILLE</p><h2>Entreprises enregistrées</h2></div><span className="contacts-list-count">{filtered.length}</span></div>
              {filtered.length === 0 ? <p className="contacts-empty">Aucune entreprise ne correspond à la recherche.</p> : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records companies-records">
                    <thead><tr><th>ENTREPRISE</th><th>CONTACTS</th><th>SUIVI</th><th>GESTION</th></tr></thead>
                    <tbody>{filtered.map((entreprise) => (
                      <tr key={entreprise.id}>
                        <td><b>{entreprise.nom}</b><small>{[entreprise.ville, entreprise.pays].filter(Boolean).join(" · ") || entreprise.secteur || "Coordonnées non renseignées"}</small></td>
                        <td><b>{entreprise.contacts.length} contact{entreprise.contacts.length === 1 ? "" : "s"}</b><small>{entreprise.contacts.slice(0, 3).map(({ contact }) => contactName(contact)).join(", ")}{entreprise.contacts.length > 3 ? "…" : ""}</small></td>
                        <td><span>{entreprise._count.activities} activité{entreprise._count.activities === 1 ? "" : "s"}</span><small>{entreprise._count.actionItems} action{entreprise._count.actionItems === 1 ? "" : "s"} · {entreprise._count.projects} projet{entreprise._count.projects === 1 ? "" : "s"}</small></td>
                        <td>
                          <div className="contact-row-actions">
                            <details className="contact-edit-details">
                              <summary>Gérer</summary>
                              <div className="company-manage-panel">
                                <h3>Contacts rattachés</h3>
                                {entreprise.contacts.length ? entreprise.contacts.map(({ contact, poste }) => (
                                  canWrite ? <form action={unlinkContactFromEntreprise} className="company-contact-row" key={contact.id}>
                                    <input type="hidden" name="entrepriseId" value={entreprise.id} />
                                    <input type="hidden" name="contactId" value={contact.id} />
                                    <span><b>{contactName(contact)}</b><small>{poste || contact.email || "Fonction non renseignée"}</small></span>
                                    <label className="company-unlink-confirm"><input name="confirmed" value="yes" type="checkbox" required /> Retirer</label>
                                    <button type="submit">Détacher</button>
                                  </form> : <div className="company-contact-row" key={contact.id}><span><b>{contactName(contact)}</b><small>{poste || contact.email || "Fonction non renseignée"}</small></span></div>
                                )) : <p className="contacts-empty">Aucun contact rattaché.</p>}
                                {canWrite ? <UnsavedChangesForm action={linkContactToEntreprise} className="company-link-form">
                                  <input type="hidden" name="entrepriseId" value={entreprise.id} />
                                  <label>Contact<select name="contactId" required defaultValue=""><option value="" disabled>Choisir un contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contactName(contact)}{contact.email ? ` · ${contact.email}` : ""}</option>)}</select></label>
                                  <label>Fonction dans cette entreprise<input name="poste" maxLength={120} placeholder="Consultant, conseiller…" /></label>
                                  <Link className="contact-cancel-link" href="/companies">Annuler</Link>
                                  <button className="contact-primary-button" type="submit">Rattacher le contact</button>
                                </UnsavedChangesForm> : null}
                                {canWrite ? <>
                                  <details className="company-edit-details"><summary>Modifier l’entreprise</summary><UnsavedChangesForm action={updateEntreprise} className="company-edit-form"><input type="hidden" name="id" value={entreprise.id} /><CompanyFields entreprise={entreprise} /><Link className="contact-cancel-link" href="/companies">Annuler</Link><button className="contact-primary-button" type="submit">Enregistrer</button></UnsavedChangesForm></details>
                                  <form action={deleteEntreprise} className="company-delete-form"><input type="hidden" name="id" value={entreprise.id} /><label><input name="confirmed" value="yes" type="checkbox" required /> Confirmer la suppression</label><button type="submit">Supprimer l’entreprise</button></form>
                                </> : null}
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
