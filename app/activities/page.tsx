import Link from "next/link";
import { createActivity, deleteActivity, updateActivity } from "@/app/activities/actions";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";

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
  let activities: Awaited<ReturnType<typeof prisma.activity.findMany>> = [];

  try {
    activities = await prisma.activity.findMany({ orderBy: { date: "asc" } });
  } catch {
    databaseAvailable = false;
  }

  const filteredActivities = searchQuery
    ? activities.filter((activity) => {
        const haystack = [activity.titre, activity.type, activity.contact ?? "", activity.details ?? ""]
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
                <label>Contact<input name="contact" maxLength={120} placeholder="Sophie Laurent" /></label>
                <label>Date<input name="date" type="date" /></label>
                <label style={{ gridColumn: "1 / -1" }}>Détails<input name="details" maxLength={500} placeholder="Résumé de l’activité..." /></label>
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
                    <thead><tr><th>TITRE</th><th>TYPE</th><th>CONTACT</th><th>DATE</th><th>DÉTAILS</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {filteredActivities.map((activity) => (
                        <tr key={activity.id}>
                          <td><b>{activity.titre}</b></td>
                          <td>{activity.type}</td>
                          <td>{activity.contact || "—"}</td>
                          <td>{formatDate(activity.date)}</td>
                          <td>{activity.details || "—"}</td>
                          <td>
                            <div className={`contact-row-actions${canWrite ? "" : " permission-hidden"}`}>
                              <details className="contact-edit-details">
                                <summary>Modifier</summary>
                                <form action={updateActivity} className="contact-edit-form">
                                  <input type="hidden" name="id" value={activity.id} />
                                  <label>Titre<input name="titre" defaultValue={activity.titre} required minLength={2} maxLength={120} /></label>
                                  <label>Type<input name="type" defaultValue={activity.type} required minLength={2} maxLength={40} /></label>
                                  <label>Contact<input name="contact" defaultValue={activity.contact ?? ""} maxLength={120} /></label>
                                  <label>Date<input name="date" type="date" defaultValue={activity.date ? new Date(activity.date).toISOString().slice(0, 10) : ""} /></label>
                                  <label>Détails<input name="details" defaultValue={activity.details ?? ""} maxLength={500} /></label>
                                  <button className="contact-primary-button" type="submit">Enregistrer</button>
                                </form>
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
