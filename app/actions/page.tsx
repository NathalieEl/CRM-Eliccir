import Link from "next/link";
import { createAction, deleteAction, updateAction } from "@/app/actions/actions";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import type { Prisma } from "@/app/generated/prisma/client";

type ActionRecord = Prisma.ActionItemGetPayload<{ include: { contact: true; entreprise: true } }>;
type ContactOption = { id: string; prenom: string | null; nom: string };
type EntrepriseOption = { id: string; nom: string };

type ActionsPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
};

const notices: Record<string, string> = {
  created: "L’action a été créée.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "L’action a été supprimée.",
};

const errors: Record<string, string> = {
  invalid: "Vérifiez le titre, la priorité et les dates saisies.",
  "not-found": "Cette action n’existe plus. Actualisez la liste.",
  "confirm-delete": "Confirmez la suppression avant de continuer.",
};

const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
};

const priorityClasses: Record<string, string> = {
  Prioritaire: "action-tag action-tag-alert",
  Importante: "action-tag",
  Normale: "action-tag",
};

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  let databaseAvailable = true;
  let actions: ActionRecord[] = [];
  let contacts: ContactOption[] = [];
  let entreprises: EntrepriseOption[] = [];

  try {
    [actions, contacts, entreprises] = await Promise.all([
      prisma.actionItem.findMany({ include: { contact: true, entreprise: true }, orderBy: [{ dateEcheance: "asc" }, { updatedAt: "desc" }] }),
      prisma.contact.findMany({ select: { id: true, prenom: true, nom: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
      prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    ]);
  } catch {
    databaseAvailable = false;
  }

  const filteredActions = searchQuery
    ? actions.filter((action) => {
        const haystack = [action.titre, action.priorite, action.statut, action.contactLabel ?? "", action.contact?.prenom ?? "", action.contact?.nom ?? "", action.entreprise?.nom ?? "", action.details ?? ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
      })
    : actions;

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
            <p className="section-index">ESPACE DE TRAVAIL <i>·</i> ACTIONS</p>
            <h1>Suivi des tâches</h1>
            <p className="contacts-intro">Gardez un œil sur les priorités à traiter et les échéances à venir.</p>
          </div>
          <span className="contacts-total">{databaseAvailable ? actions.length : "—"}<small>ACTIONS</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search" action="/actions" method="get">
            <label htmlFor="actions-search" className="sr-only">Rechercher une action</label>
            <input id="actions-search" name="q" type="search" defaultValue={searchQuery} placeholder="Rechercher une action, priorité ou contact" autoComplete="off" />
            <button type="submit">Rechercher</button>
          </form>
          {searchQuery ? <a className="contacts-search-reset" href="/actions">Réinitialiser</a> : null}
        </section>

        {searchQuery ? <p className="contacts-search-results">Résultats pour “{searchQuery}” : {filteredActions.length} action{filteredActions.length > 1 ? "s" : ""}</p> : null}

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
                <div><p className="section-index">01 <i>·</i> NOUVELLE</p><h2>Ajouter une action</h2></div>
              </div>

              <form action={createAction} className={`contact-form${canWrite ? "" : " permission-hidden"}`}>
                <label>Titre<input name="titre" required minLength={2} maxLength={160} placeholder="Ex. Relancer Sophie Laurent" /></label>
                <label>Priorité<select name="priorite" defaultValue="Normale">
                  <option value="Prioritaire">Prioritaire</option>
                  <option value="Importante">Importante</option>
                  <option value="Normale">Normale</option>
                </select></label>
                <label>Statut<select name="statut" defaultValue="À faire">
                  <option value="À faire">À faire</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminée">Terminée</option>
                </select></label>
                <label>Contact<select name="contactId" defaultValue=""><option value="">Aucun contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</option>)}</select></label>
                <label>Entreprise<select name="entrepriseId" defaultValue=""><option value="">Aucune entreprise</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                <label>Date d’échéance<input name="dateEcheance" type="date" /></label>
                <label style={{ gridColumn: "1 / -1" }}>Détails<input name="details" maxLength={500} placeholder="Informations complémentaires..." /></label>
                <button className="contact-primary-button" type="submit">Ajouter l’action <span>+</span></button>
              </form>
            </section>

            <section className="contacts-list-section">
              <div className="contacts-section-heading">
                <div><p className="section-index">02 <i>·</i> LISTE</p><h2>Actions à traiter</h2></div>
                <span className="contacts-list-count">{filteredActions.length}</span>
              </div>

              {filteredActions.length === 0 ? (
                <p className="contacts-empty">
                  {searchQuery
                    ? `Aucun résultat pour “${searchQuery}”. Essayez une autre recherche.`
                    : "Aucune action pour le moment. Ajoutez votre première action ci-dessus."}
                </p>
              ) : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records">
                    <thead><tr><th>TITRE</th><th>PRIORITÉ</th><th>STATUT</th><th>CONTACT</th><th>ENTREPRISE</th><th>ÉCHÉANCE</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {filteredActions.map((action) => (
                        <tr key={action.id}>
                          <td><b>{action.titre}</b><small>{action.details || "Aucun détail"}</small></td>
                          <td><span className={priorityClasses[action.priorite] ?? "action-tag"}>{action.priorite}</span></td>
                          <td>{action.statut}</td>
                          <td>{action.contact ? [action.contact.prenom, action.contact.nom].filter(Boolean).join(" ") : action.contactLabel || "—"}</td>
                          <td>{action.entreprise?.nom || "—"}</td>
                          <td>{formatDate(action.dateEcheance)}</td>
                          <td>
                            <div className={`contact-row-actions${canWrite ? "" : " permission-hidden"}`}>
                              <details className="contact-edit-details">
                                <summary>Modifier</summary>
                                <form action={updateAction} className="contact-edit-form">
                                  <input type="hidden" name="id" value={action.id} />
                                  <input type="hidden" name="legacyContact" value={action.contactLabel ?? ""} />
                                  <label>Titre<input name="titre" defaultValue={action.titre} required minLength={2} maxLength={160} /></label>
                                  <label>Priorité<select name="priorite" defaultValue={action.priorite}>
                                    <option value="Prioritaire">Prioritaire</option>
                                    <option value="Importante">Importante</option>
                                    <option value="Normale">Normale</option>
                                  </select></label>
                                  <label>Statut<select name="statut" defaultValue={action.statut}>
                                    <option value="À faire">À faire</option>
                                    <option value="En cours">En cours</option>
                                    <option value="Terminée">Terminée</option>
                                  </select></label>
                                  <label>Contact<select name="contactId" defaultValue={action.contactId ?? ""}><option value="">Aucun contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</option>)}</select></label>
                                  <label>Entreprise<select name="entrepriseId" defaultValue={action.entrepriseId ?? ""}><option value="">Aucune entreprise</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                                  <label>Date d’échéance<input name="dateEcheance" type="date" defaultValue={action.dateEcheance ? new Date(action.dateEcheance).toISOString().slice(0, 10) : ""} /></label>
                                  <label>Détails<input name="details" defaultValue={action.details ?? ""} maxLength={500} /></label>
                                  <button className="contact-primary-button" type="submit">Enregistrer</button>
                                </form>
                              </details>
                              <details className="contact-delete-details">
                                <summary>Supprimer</summary>
                                <form action={deleteAction} className="contact-delete-form">
                                  <input type="hidden" name="id" value={action.id} />
                                  <label><input type="checkbox" name="confirmed" value="yes" required /> Confirmer la suppression</label>
                                  <button type="submit">Supprimer</button>
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
