import Link from "next/link";
import { createContact, deleteContact, updateContact } from "@/app/contacts/actions";
import { prisma } from "@/lib/prisma";

type ContactsPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
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
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  let databaseAvailable = true;
  let contacts: Awaited<ReturnType<typeof prisma.contact.findMany>> = [];

  try {
    contacts = await prisma.contact.findMany({ orderBy: { updatedAt: "desc" } });
  } catch {
    databaseAvailable = false;
  }

  const filteredContacts = searchQuery
    ? contacts.filter((contact) => {
        const haystack = [
          contact.nom,
          contact.email ?? "",
          contact.telephone ?? "",
          contact.entreprise ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchQuery.toLowerCase());
      })
    : contacts;

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
          <form className="contacts-search" action="/contacts" method="get">
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
          </form>
          {searchQuery ? (
            <a className="contacts-search-reset" href="/contacts">Réinitialiser</a>
          ) : null}
        </section>

        {searchQuery ? (
          <p className="contacts-search-results">Résultats pour “{searchQuery}” : {filteredContacts.length} contact{filteredContacts.length > 1 ? "s" : ""}</p>
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
              <form action={createContact} className="contact-form">
                <label>Nom complet<input name="nom" autoComplete="name" required minLength={2} maxLength={120} placeholder="Ex. Camille Martin" /></label>
                <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="camille@exemple.com" /></label>
                <label>Téléphone<input name="telephone" type="tel" autoComplete="tel" maxLength={40} placeholder="+33 6 12 34 56 78" /></label>
                <label>Entreprise<input name="entreprise" autoComplete="organization" maxLength={120} placeholder="Nom de l’entreprise" /></label>
                <button className="contact-primary-button" type="submit">Ajouter le contact <span>+</span></button>
              </form>
            </section>

            <section className="contacts-list-section">
              <div className="contacts-section-heading">
                <div><p className="section-index">02 <i>·</i> PORTEFEUILLE</p><h2>Contacts enregistrés</h2></div>
                <span className="contacts-list-count">{filteredContacts.length}</span>
              </div>

              {filteredContacts.length === 0 ? (
                <p className="contacts-empty">
                  {searchQuery
                    ? `Aucun résultat pour “${searchQuery}”. Essayez une autre recherche.`
                    : "Aucun contact pour le moment. Ajoutez votre premier contact ci-dessus."}
                </p>
              ) : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records">
                    <thead><tr><th>CONTACT</th><th>TÉLÉPHONE</th><th>ENTREPRISE</th><th>MODIFIÉ</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id}>
                          <td><b>{contact.nom}</b><small>{contact.email || "Aucun e-mail"}</small></td>
                          <td>{contact.telephone || "—"}</td>
                          <td>{contact.entreprise || "—"}</td>
                          <td><time dateTime={contact.updatedAt.toISOString()}>{contact.updatedAt.toLocaleDateString("fr-FR")}</time></td>
                          <td>
                            <div className="contact-row-actions">
                              <details className="contact-edit-details">
                                <summary>Modifier</summary>
                                <form action={updateContact} className="contact-edit-form">
                                  <input type="hidden" name="id" value={contact.id} />
                                  <label>Nom complet<input name="nom" defaultValue={contact.nom} required minLength={2} maxLength={120} /></label>
                                  <label>E-mail<input name="email" type="email" defaultValue={contact.email ?? ""} maxLength={254} /></label>
                                  <label>Téléphone<input name="telephone" type="tel" defaultValue={contact.telephone ?? ""} maxLength={40} /></label>
                                  <label>Entreprise<input name="entreprise" defaultValue={contact.entreprise ?? ""} maxLength={120} /></label>
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