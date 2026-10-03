import Link from "next/link";
import { createActivity, deleteActivity, updateActivity } from "@/app/activities/actions";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import type { Prisma } from "@/app/generated/prisma/client";

type ActivityRecord = Prisma.ActivityGetPayload<{ include: { contact: true; entreprise: true; responsable: true } }>;
type ContactOption = { id: string; prenom: string | null; nom: string };
type EntrepriseOption = { id: string; nom: string };
type ResponsibleOption = { id: string; username: string };

type ActivitiesPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
};

const notices: Record<string, string> = {
  created: "L’activité a été ajoutée.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "L’activité a été supprimée.",
};

const errors: Record<string, string> = {
  invalid: "Vérifiez le titre, le type et la date de l’activité.",
  "not-found": "Cette activité n’existe plus. Actualisez la liste.",
  "confirm-delete": "Confirmez la suppression avant de continuer.",
};

const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
};

export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  let databaseAvailable = true;
  let activities: ActivityRecord[] = [];
  let contacts: ContactOption[] = [];
  let entreprises: EntrepriseOption[] = [];
  let users: ResponsibleOption[] = [];

  try {
    [activities, contacts, entreprises, users] = await Promise.all([
      prisma.activity.findMany({ include: { contact: true, entreprise: true, responsable: true }, orderBy: { date: "asc" } }),
      prisma.contact.findMany({ select: { id: true, prenom: true, nom: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
      prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
      prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } }),
    ]);
  } catch {
    databaseAvailable = false;
  }

  const filteredActivities = searchQuery
    ? activities.filter((activity) => {
        const haystack = [activity.titre, activity.type, activity.canal ?? "", activity.resultat ?? "", activity.prochaineAction ?? "", activity.statut ?? "", activity.responsable?.username ?? "", activity.contactLabel ?? "", activity.contact?.prenom ?? "", activity.contact?.nom ?? "", activity.entreprise?.nom ?? "", activity.details ?? ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
      })
    : activities;

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
            <p className="section-index">ESPACE DE TRAVAIL <i>·</i> ACTIVITÉS</p>
            <h1>Planification des activités</h1>
            <p className="contacts-intro">Suivez les rendez-vous, appels et tâches à venir.</p>
          </div>
          <span className="contacts-total">{databaseAvailable ? activities.length : "—"}<small>ACTIVITÉS</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search" action="/activities" method="get">
            <label htmlFor="activities-search" className="sr-only">Rechercher une activité</label>
            <input id="activities-search" name="q" type="search" defaultValue={searchQuery} placeholder="Rechercher une activité, type ou contact" autoComplete="off" />
            <button type="submit">Rechercher</button>
          </form>
          {searchQuery ? <a className="contacts-search-reset" href="/activities">Réinitialiser</a> : null}
        </section>

        {searchQuery ? <p className="contacts-search-results">Résultats pour “{searchQuery}” : {filteredActivities.length} activité{filteredActivities.length > 1 ? "s" : ""}</p> : null}

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
                <div><p className="section-index">01 <i>·</i> NOUVELLE</p><h2>Ajouter une activité</h2></div>
              </div>

              <form action={createActivity} className={`contact-form${canWrite ? "" : " permission-hidden"}`}>
                <label>Titre<input name="titre" required minLength={2} maxLength={120} placeholder="Ex. Appel de suivi" /></label>
                <label>Type<input name="type" required minLength={2} maxLength={40} placeholder="Rendez-vous" /></label>
                <label>Contact<select name="contactId" defaultValue=""><option value="">Aucun contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</option>)}</select></label>
                <label>Entreprise<select name="entrepriseId" defaultValue=""><option value="">Aucune entreprise</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                <label>Date<input name="date" type="date" /></label>
                <label>Canal<input name="canal" maxLength={80} placeholder="Téléphone, e-mail…" /></label>
                <label>Durée (minutes)<input name="dureeMinutes" type="number" min={0} max={1440} step={5} /></label>
                <label>Responsable<select name="responsableId" defaultValue=""><option value="">Non attribué</option>{users.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}</select></label>
                <label>Statut<select name="statut" defaultValue="Planifiée"><option value="Planifiée">Planifiée</option><option value="En cours">En cours</option><option value="Réalisée">Réalisée</option><option value="Annulée">Annulée</option></select></label>
                <label>Date de réalisation<input name="dateRealisation" type="date" /></label>
                <label>Prochaine action<input name="prochaineAction" maxLength={1000} /></label>
                <label style={{ gridColumn: "1 / -1" }}>Détails<input name="details" maxLength={500} placeholder="Résumé de l’activité..." /></label>
                <label style={{ gridColumn: "1 / -1" }}>Résultat<textarea name="resultat" maxLength={10000} rows={3} /></label>
                <button className="contact-primary-button" type="submit">Ajouter l’activité <span>+</span></button>
              </form>
            </section>

            <section className="contacts-list-section">
              <div className="contacts-section-heading">
                <div><p className="section-index">02 <i>·</i> CALENDRIER</p><h2>Activités enregistrées</h2></div>
                <span className="contacts-list-count">{filteredActivities.length}</span>
              </div>

              {filteredActivities.length === 0 ? (
                <p className="contacts-empty">
                  {searchQuery
                    ? `Aucun résultat pour “${searchQuery}”. Essayez une autre recherche.`
                    : "Aucune activité pour le moment. Ajoutez votre première activité ci-dessus."}
                </p>
              ) : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records">
                    <thead><tr><th>TITRE</th><th>TYPE / CANAL</th><th>CONTACT</th><th>ENTREPRISE</th><th>STATUT</th><th>RESPONSABLE</th><th>DATE PRÉVUE / RÉALISÉE</th><th>DURÉE</th><th>PROCHAINE ACTION / RÉSULTAT</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {filteredActivities.map((activity) => (
                        <tr key={activity.id}>
                          <td><b>{activity.titre}</b></td>
                          <td>{activity.type}<small>{activity.canal || "Canal non renseigné"}</small></td>
                          <td>{activity.contact ? [activity.contact.prenom, activity.contact.nom].filter(Boolean).join(" ") : activity.contactLabel || "—"}</td>
                          <td>{activity.entreprise?.nom || "—"}</td>
                          <td>{activity.statut || "—"}</td>
                          <td>{activity.responsable?.username || "—"}</td>
                          <td>{formatDate(activity.date)}<small>Réalisation : {formatDate(activity.dateRealisation)}</small></td>
                          <td>{activity.dureeMinutes == null ? "—" : `${activity.dureeMinutes} min`}</td>
                          <td>{activity.prochaineAction || activity.resultat || activity.details || "—"}</td>
                          <td>
                            <div className={`contact-row-actions${canWrite ? "" : " permission-hidden"}`}>
                              <details className="contact-edit-details">
                                <summary>Modifier</summary>
                                <UnsavedChangesForm action={updateActivity} className="contact-edit-form">
                                  <input type="hidden" name="id" value={activity.id} />
                                  <input type="hidden" name="legacyContact" value={activity.contactLabel ?? ""} />
                                  <label>Titre<input name="titre" defaultValue={activity.titre} required minLength={2} maxLength={120} /></label>
                                  <label>Type<input name="type" defaultValue={activity.type} required minLength={2} maxLength={40} /></label>
                                  <label>Contact<select name="contactId" defaultValue={activity.contactId ?? ""}><option value="">Aucun contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</option>)}</select></label>
                                  <label>Entreprise<select name="entrepriseId" defaultValue={activity.entrepriseId ?? ""}><option value="">Aucune entreprise</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                                  <label>Date<input name="date" type="date" defaultValue={activity.date ? new Date(activity.date).toISOString().slice(0, 10) : ""} /></label>
                                  <label>Canal<input name="canal" defaultValue={activity.canal ?? ""} maxLength={80} /></label>
                                  <label>Durée (minutes)<input name="dureeMinutes" type="number" min={0} max={1440} step={5} defaultValue={activity.dureeMinutes ?? ""} /></label>
                                  <label>Responsable<select name="responsableId" defaultValue={activity.responsableId ?? ""}><option value="">Non attribué</option>{users.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}</select></label>
                                  <label>Statut<select name="statut" defaultValue={activity.statut ?? "Planifiée"}><option value="Planifiée">Planifiée</option><option value="En cours">En cours</option><option value="Réalisée">Réalisée</option><option value="Annulée">Annulée</option></select></label>
                                  <label>Date de réalisation<input name="dateRealisation" type="date" defaultValue={activity.dateRealisation ? new Date(activity.dateRealisation).toISOString().slice(0, 10) : ""} /></label>
                                  <label>Prochaine action<input name="prochaineAction" defaultValue={activity.prochaineAction ?? ""} maxLength={1000} /></label>
                                  <label>Détails<input name="details" defaultValue={activity.details ?? ""} maxLength={500} /></label>
                                  <label>Résultat<textarea name="resultat" defaultValue={activity.resultat ?? ""} maxLength={10000} rows={3} /></label>
                                  <Link className="contact-cancel-link" href="/activities">Annuler</Link>
                                  <button className="contact-primary-button" type="submit">Enregistrer</button>
                                </UnsavedChangesForm>
                              </details>
                              <details className="contact-delete-details">
                                <summary>Supprimer</summary>
                                <form action={deleteActivity} className="contact-delete-form">
                                  <input type="hidden" name="id" value={activity.id} />
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
