import Link from "next/link";
import { createContact, deleteContact } from "@/app/contacts/actions";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import type { Prisma } from "@/app/generated/prisma/client";

type ContactRecord = Prisma.ContactGetPayload<{
  include: { entreprises: { include: { entreprise: true } } };
}>;

type ContactsPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string; statut?: string; secteur?: string; ville?: string; source?: string }>;
};

const notices: Record<string, string> = {
  created: "Le contact a été ajouté.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "Le contact a été supprimé.",
};

const errors: Record<string, string> = {
  invalid: "Vérifie le prénom, le nom, l’adresse e-mail et la longueur des champs.",
  "email-exists": "Cette adresse e-mail est déjà associée à un contact.",
  "not-found": "Ce contact n’existe plus. Actualise la liste.",
  "confirm-delete": "Confirme la suppression avant de continuer.",
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  const filters = { statut: params.statut ?? "", secteur: params.secteur ?? "", ville: params.ville ?? "", source: params.source ?? "" };
  let databaseAvailable = true;
  let contacts: ContactRecord[] = [];
  let titleOptions: { value: string; label: string }[] = [];
  let entrepriseOptions: { id: string; nom: string }[] = [];

  try {
    [contacts, titleOptions, entrepriseOptions] = await Promise.all([
      prisma.contact.findMany({ include: { entreprises: { include: { entreprise: true } } }, orderBy: { updatedAt: "desc" } }),
      prisma.lookupOption.findMany({ where: { category: "contact_title", active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }], select: { value: true, label: true } }),
      prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    ]);
  } catch {
    databaseAvailable = false;
  }

  const filterOptions = {
    statut: [...new Set(contacts.map((contact) => contact.statut).filter(Boolean))].sort(),
    secteur: [...new Set(contacts.map((contact) => contact.secteur).filter(Boolean))].sort(),
    ville: [...new Set(contacts.map((contact) => contact.ville).filter(Boolean))].sort(),
    source: [...new Set(contacts.map((contact) => contact.sourceAcquisition).filter(Boolean))].sort(),
  };

  const filteredContacts = searchQuery
    ? contacts.filter((contact) => {
        const haystack = [
          contact.prenom ?? "",
          contact.nom,
          ...contact.entreprises.flatMap(({ entreprise }) => [entreprise.nom]),
          contact.email ?? "",
          contact.telephone ?? "",
          contact.secteur ?? "",
          contact.ville ?? "",
          contact.statut ?? "",
          contact.sourceAcquisition ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchQuery.toLowerCase());
      })
    : contacts;
  const visibleContacts = filteredContacts.filter((contact) =>
    (!filters.statut || contact.statut === filters.statut) &&
    (!filters.secteur || contact.secteur === filters.secteur) &&
    (!filters.ville || contact.ville === filters.ville) &&
    (!filters.source || contact.sourceAcquisition === filters.source)
  );

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord">
          <span className="brand-mark">E</span>
          <span className="brand-name">eliccir<small>CRM</small></span>
        </Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>

      <div className="contacts-content">
        <section className="contacts-title-row">
          <div>
            <p className="section-index">ESPACE DE TRAVAIL <i>·</i> CONTACTS</p>
            <h1>Ton carnet de contacts</h1>
            <p className="contacts-intro">Retrouve et mets à jour les informations de ton portefeuille.</p>
          </div>
          <span className="contacts-total">{databaseAvailable ? contacts.length : "—"}<small>CONTACTS</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search contacts-filter-form" action="/contacts" method="get">
            <label htmlFor="contacts-search" className="sr-only">Rechercher un contact</label>
            <input
              id="contacts-search"
              name="q"
              type="search"
              defaultValue={searchQuery}
              placeholder="Rechercher un contact, email ou entreprise"
              autoComplete="off"
            />
            <button type="submit">Rechercher</button>
            <select name="statut" defaultValue={filters.statut}><option value="">Tous les statuts</option>{filterOptions.statut.map((value) => <option key={value} value={value ?? ""}>{value}</option>)}</select>
            <select name="secteur" defaultValue={filters.secteur}><option value="">Tous les secteurs</option>{filterOptions.secteur.map((value) => <option key={value} value={value ?? ""}>{value}</option>)}</select>
            <select name="ville" defaultValue={filters.ville}><option value="">Toutes les villes</option>{filterOptions.ville.map((value) => <option key={value} value={value ?? ""}>{value}</option>)}</select>
            <select name="source" defaultValue={filters.source}><option value="">Toutes les sources</option>{filterOptions.source.map((value) => <option key={value} value={value ?? ""}>{value}</option>)}</select>
          </form>
          {searchQuery || Object.values(filters).some(Boolean) ? (
            <Link className="contacts-search-reset" href="/contacts">Réinitialiser</Link>
          ) : null}
        </section>

        {searchQuery ? (
          <p className="contacts-search-results">{searchQuery ? `Résultats pour “${searchQuery}” : ` : "Résultats filtrés : "}{visibleContacts.length} contact{visibleContacts.length > 1 ? "s" : ""}</p>
        ) : null}

        {params.notice && notices[params.notice] && <p className="contacts-message" role="status">{notices[params.notice]}</p>}
        {params.error && errors[params.error] && <p className="contacts-message contacts-message-error" role="alert">{errors[params.error]}</p>}

        {!databaseAvailable ? (
          <section className="contacts-database-error" role="alert">
            <h2>La base de données est inaccessible</h2>
            <p>Vérifie que <code>DATABASE_URL</code> dans le fichier <code>.env</code> contient les bons identifiants PostgreSQL, puis recharge cette page.</p>
          </section>
        ) : (
          <>
            <section className="contacts-create-section">
              <div className="contacts-section-heading">
                <div><p className="section-index">01 <i>·</i> NOUVEAU</p><h2>Ajouter un contact</h2></div>
              </div>
              <form action={createContact} className={`contact-form${canWrite ? "" : " permission-hidden"}`}>
                <label>Titre<select name="titre" defaultValue=""><option value="">Sans titre</option>{titleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label>Prénom<input name="prenom" autoComplete="given-name" required maxLength={80} placeholder="Ex. Camille" /></label>
                <label>Nom<input name="nom" autoComplete="family-name" required maxLength={120} placeholder="Ex. Martin" /></label>
                <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="camille@exemple.com" /></label>
                <label>Téléphone<input name="telephone" type="tel" autoComplete="tel" maxLength={40} placeholder="+33 6 12 34 56 78" /></label>
                <label>Entreprises<select name="entrepriseIds" multiple size={3}>{entrepriseOptions.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                <label>Secteur<input name="secteur" maxLength={80} placeholder="Secteur" /></label>
                <label>Ville<input name="ville" maxLength={80} placeholder="Ville" /></label>
                <label>Statut<input name="statut" maxLength={80} placeholder="Prospect" /></label>
                <button className="contact-primary-button" type="submit">Ajouter le contact <span>+</span></button>
              </form>
            </section>

            <section className="contacts-list-section">
              <div className="contacts-section-heading">
                <div><p className="section-index">02 <i>·</i> PORTEFEUILLE</p><h2>Contacts enregistrés</h2></div>
                <span className="contacts-list-count">{visibleContacts.length}</span>
              </div>

              {visibleContacts.length === 0 ? (
                <p className="contacts-empty">
                  {searchQuery
                    ? `Aucun résultat pour “${searchQuery}”. Essaie une autre recherche.`
                    : "Aucun contact pour le moment. Ajoute ton premier contact ci-dessus."}
                </p>
              ) : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records contacts-data-table">
                    <thead><tr><th>CONTACT</th><th>TÉLÉPHONE</th><th>ENTREPRISE / POSTE</th><th>SECTEUR</th><th>VILLE</th><th>STATUT</th><th>SOURCE</th><th>MODIFIÉ</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {visibleContacts.map((contact) => (
                        <tr key={contact.id}>
                          <td data-label="Contact"><b>{[contact.titre, contact.prenom, contact.nom].filter(Boolean).join(" ")}</b><small>{contact.email || "Aucun e-mail"}</small></td>
                          <td data-label="Téléphone">{contact.telephone || "—"}</td>
                          <td data-label="Entreprise / poste"><b>{contact.entreprises.map(({ entreprise }) => entreprise.nom).join(", ") || "—"}</b><small>{contact.entreprises.map(({ poste }) => poste).filter(Boolean).join(", ") || "Fonction non renseignée"}</small></td>
                          <td data-label="Secteur">{contact.secteur || "—"}</td>
                          <td data-label="Ville">{[contact.ville, contact.departement].filter(Boolean).join(" · ") || "—"}</td>
                          <td data-label="Statut"><span className="contact-status-label">{contact.statut || "Non défini"}</span></td>
                          <td data-label="Source">{contact.sourceAcquisition || "—"}</td>
                          <td data-label="Modifié"><time dateTime={contact.updatedAt.toISOString()}>{contact.updatedAt.toLocaleDateString("fr-FR")}</time></td>
                          <td data-label="Gestion">
                            <div className="contact-row-actions">
                              <Link className="contact-profile-link" href={`/contacts/${contact.id}`}>Profil complet</Link>
                              {canWrite ? <details className="contact-delete-details">
                                <summary>Supprimer</summary>
                                <form action={deleteContact} className="contact-delete-form">
                                  <input type="hidden" name="id" value={contact.id} />
                                  <label><input type="checkbox" name="confirmed" value="yes" required /> Confirmer la suppression</label>
                                  <button type="submit">Supprimer ce contact</button>
                                </form>
                              </details> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
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