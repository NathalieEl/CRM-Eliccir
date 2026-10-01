import Link from "next/link";
import { createContact, deleteContact, updateContact } from "@/app/contacts/actions";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";

type ContactsPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string; statut?: string; secteur?: string; ville?: string; source?: string }>;
};

const notices: Record<string, string> = {
  created: "Le contact a été ajouté.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "Le contact a été supprimé.",
};

const errors: Record<string, string> = {
  invalid: "Vérifiez le nom, l’adresse e-mail et la longueur des champs.",
  "email-exists": "Cette adresse e-mail est déjà associée à un contact.",
  "not-found": "Ce contact n’existe plus. Actualisez la liste.",
  "confirm-delete": "Confirmez la suppression avant de continuer.",
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  const filters = { statut: params.statut ?? "", secteur: params.secteur ?? "", ville: params.ville ?? "", source: params.source ?? "" };
  let databaseAvailable = true;
  let contacts: Awaited<ReturnType<typeof prisma.contact.findMany>> = [];
  let titleOptions: { value: string; label: string }[] = [];

  try {
    contacts = await prisma.contact.findMany({ orderBy: { updatedAt: "desc" } });
    titleOptions = await prisma.lookupOption.findMany({ where: { category: "contact_title", active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }], select: { value: true, label: true } });
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
          contact.nom,
          contact.email ?? "",
          contact.telephone ?? "",
          contact.entreprise ?? "",
          contact.poste ?? "",
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
            <h1>Votre carnet de contacts</h1>
            <p className="contacts-intro">Retrouvez et mettez à jour les informations de votre portefeuille.</p>
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
            <a className="contacts-search-reset" href="/contacts">Réinitialiser</a>
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
            <p>Vérifiez que <code>DATABASE_URL</code> dans le fichier <code>.env</code> contient les bons identifiants PostgreSQL, puis rechargez cette page.</p>
          </section>
        ) : (
          <>
            <section className="contacts-create-section">
              <div className="contacts-section-heading">
                <div><p className="section-index">01 <i>·</i> NOUVEAU</p><h2>Ajouter un contact</h2></div>
              </div>
              <form action={createContact} className={`contact-form${canWrite ? "" : " permission-hidden"}`}>
                <label>Titre<select name="titre" defaultValue=""><option value="">Sans titre</option>{titleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label>Nom complet<input name="nom" autoComplete="name" required minLength={2} maxLength={120} placeholder="Ex. Camille Martin" /></label>
                <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="camille@exemple.com" /></label>
                <label>Téléphone<input name="telephone" type="tel" autoComplete="tel" maxLength={40} placeholder="+33 6 12 34 56 78" /></label>
                <label>Entreprise<input name="entreprise" autoComplete="organization" maxLength={120} placeholder="Nom de l’entreprise" /></label>
                <label>Poste<input name="poste" maxLength={120} placeholder="Fonction" /></label>
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
                    ? `Aucun résultat pour “${searchQuery}”. Essayez une autre recherche.`
                    : "Aucun contact pour le moment. Ajoutez votre premier contact ci-dessus."}
                </p>
              ) : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records">
                    <thead><tr><th>CONTACT</th><th>TÉLÉPHONE</th><th>ENTREPRISE / POSTE</th><th>SECTEUR</th><th>VILLE</th><th>STATUT</th><th>SOURCE</th><th>MODIFIÉ</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {visibleContacts.map((contact) => (
                        <tr key={contact.id}>
                          <td><b>{[contact.titre, contact.nom].filter(Boolean).join(" ")}</b><small>{contact.email || "Aucun e-mail"}</small></td>
                          <td>{contact.telephone || "—"}</td>
                          <td><b>{contact.entreprise || "—"}</b><small>{contact.poste || "Poste non renseigné"}</small></td>
                          <td>{contact.secteur || "—"}</td>
                          <td>{[contact.ville, contact.departement].filter(Boolean).join(" · ") || "—"}</td>
                          <td><span className="contact-status-label">{contact.statut || "Non défini"}</span></td>
                          <td>{contact.sourceAcquisition || "—"}</td>
                          <td><time dateTime={contact.updatedAt.toISOString()}>{contact.updatedAt.toLocaleDateString("fr-FR")}</time></td>
                          <td>
                            <div className={`contact-row-actions${canWrite ? "" : " permission-hidden"}`}>
                              <details className="contact-view-details">
                                <summary>Fiche</summary>
                                <div className="contact-detail-card"><h3>{contact.nom}</h3><dl><dt>E-mail</dt><dd>{contact.email || "—"}</dd><dt>Téléphone</dt><dd>{contact.telephone || "—"}</dd><dt>Entreprise</dt><dd>{contact.entreprise || "—"}</dd><dt>Poste</dt><dd>{contact.poste || "—"}</dd><dt>Secteur</dt><dd>{contact.secteur || "—"}</dd><dt>Ville</dt><dd>{[contact.ville, contact.departement, contact.pays].filter(Boolean).join(" · ") || "—"}</dd><dt>Source</dt><dd>{contact.sourceAcquisition || "—"}</dd><dt>Statut</dt><dd>{contact.statut || "—"}</dd><dt>LinkedIn</dt><dd>{contact.linkedin ? <a href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noreferrer">Voir le profil</a> : "—"}</dd></dl></div>
                              </details>
                              <details className="contact-edit-details">
                                <summary>Modifier</summary>
                                <form action={updateContact} className="contact-edit-form">
                                  <input type="hidden" name="id" value={contact.id} />
                                  <label>Titre<select name="titre" defaultValue={contact.titre ?? ""}><option value="">Sans titre</option>{titleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                                  <label>Nom complet<input name="nom" defaultValue={contact.nom} required minLength={2} maxLength={120} /></label>
                                  <label>E-mail<input name="email" type="email" defaultValue={contact.email ?? ""} maxLength={254} /></label>
                                  <label>Téléphone<input name="telephone" type="tel" defaultValue={contact.telephone ?? ""} maxLength={40} /></label>
                                  <label>Entreprise<input name="entreprise" defaultValue={contact.entreprise ?? ""} maxLength={120} /></label>
                                  <label>Poste<input name="poste" defaultValue={contact.poste ?? ""} maxLength={120} /></label>
                                  <label>Secteur<input name="secteur" defaultValue={contact.secteur ?? ""} maxLength={80} /></label>
                                  <label>Ville<input name="ville" defaultValue={contact.ville ?? ""} maxLength={80} /></label>
                                  <label>Département<input name="departement" defaultValue={contact.departement ?? ""} maxLength={20} /></label>
                                  <label>Pays<input name="pays" defaultValue={contact.pays ?? ""} maxLength={80} /></label>
                                  <label>Source<input name="sourceAcquisition" defaultValue={contact.sourceAcquisition ?? ""} maxLength={120} /></label>
                                  <label>Statut<input name="statut" defaultValue={contact.statut ?? ""} maxLength={80} /></label>
                                  <label>LinkedIn<input name="linkedin" type="url" defaultValue={contact.linkedin ?? ""} maxLength={254} /></label>
                                  <button className="contact-primary-button" type="submit">Enregistrer</button>
                                </form>
                              </details>
                              <details className="contact-delete-details">
                                <summary>Supprimer</summary>
                                <form action={deleteContact} className="contact-delete-form">
                                  <input type="hidden" name="id" value={contact.id} />
                                  <label><input type="checkbox" name="confirmed" value="yes" required /> Confirmer la suppression</label>
                                  <button type="submit">Supprimer ce contact</button>
                                </form>
                              </details>
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