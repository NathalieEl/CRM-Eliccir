import Link from "next/link";
import { createActivity, deleteActivity, updateActivity } from "@/app/activities/actions";
import { createGoogleCalendarTestEventAction, disconnectGoogleCalendar } from "@/app/calendar/actions";
import { DateTimeField } from "@/app/activities/date-time-field";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { CancelEditButton, UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import { googleCalendarIsConfigured } from "@/lib/google-calendar";
import type { Prisma } from "@/app/generated/prisma/client";

type ActivityRecord = Prisma.ActivityGetPayload<{ include: { contact: true; entreprise: true; responsable: true } }>;
type ContactOption = { id: string; prenom: string | null; nom: string };
type EntrepriseOption = { id: string; nom: string };
type ResponsibleOption = { id: string; username: string };

type ActivitiesPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string; calendarTestEventUrl?: string }>;
};

const notices: Record<string, string> = {
  created: "L’activité a été ajoutée.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "L’activité a été supprimée.",
  "calendar-connected": "Ton agenda Google est connecté.",
  "calendar-disconnected": "Ton agenda Google a été déconnecté.",
  "calendar-test-created": "Événement de test créé dans ton agenda Google. Supprime-le après vérification.",
};

const errors: Record<string, string> = {
  invalid: "Vérifie le titre, le type et la date de l’activité.",
  "not-found": "Cette activité n’existe plus. Actualise la liste.",
  "confirm-delete": "Confirme la suppression avant de continuer.",
  "calendar-not-configured": "La connexion Google Agenda n’est pas encore configurée sur le serveur.",
  "calendar-oauth-state": "La connexion Google a expiré ou a été interrompue. Réessaie.",
  "calendar-oauth": "Google Agenda n’a pas pu être connecté. Vérifie l’autorisation puis réessaie.",
  "calendar-sync": "L’activité est enregistrée, mais Google Agenda n’a pas pu être synchronisé. Vérifie la connexion du responsable et les champs requis.",
  "calendar-delete": "L’activité n’a pas été supprimée, car son événement Google n’a pas pu être retiré.",
  "calendar-test": "L’événement de test n’a pas pu être créé. Vérifie la connexion de ton agenda Google et réessaie.",
};

const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const formatDateOnly = (date: Date | null) => date ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date) : "—";

export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  let calendarTestEventUrl: string | null = null;
  try {
    const parsedUrl = new URL(params.calendarTestEventUrl ?? "");
    if (parsedUrl.protocol === "https:" && ["calendar.google.com", "www.google.com"].includes(parsedUrl.hostname)) {
      calendarTestEventUrl = parsedUrl.toString();
    }
  } catch {
    calendarTestEventUrl = null;
  }
  let databaseAvailable = true;
  let activities: ActivityRecord[] = [];
  let contacts: ContactOption[] = [];
  let entreprises: EntrepriseOption[] = [];
  let users: ResponsibleOption[] = [];
  let googleCalendarConnection: { googleEmail: string | null } | null = null;

  try {
    [activities, contacts, entreprises, users, googleCalendarConnection] = await Promise.all([
      prisma.activity.findMany({ include: { contact: true, entreprise: true, responsable: true }, orderBy: { date: "asc" } }),
      prisma.contact.findMany({ select: { id: true, prenom: true, nom: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
      prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
      prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } }),
      prisma.googleCalendarConnection.findUnique({ where: { userId: currentUser.id }, select: { googleEmail: true } }),
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
        <Link className="contacts-brand" href="/" aria-label="MANTA CRM, tableau de bord">
          <span className="brand-mark">M</span>
          <span className="brand-name">MANTA<small>CRM</small></span>
        </Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>

      <div className="contacts-content">
        <section className="contacts-title-row">
          <div>
            <p className="section-index">ESPACE DE TRAVAIL <i>·</i> ACTIVITÉS</p>
            <h1>Planification des activités</h1>
            <p className="contacts-intro">Suis les rendez-vous, appels et tâches à venir.</p>
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

        <section className="activity-calendar-connection" aria-label="Connexion Google Agenda">
          <div><strong>Google Agenda</strong><small>Les événements sont envoyés à l’agenda du responsable, ou au tien si aucun responsable n’est choisi.</small></div>
          {!googleCalendarIsConfigured() ? <span className="support-privacy-note">Connexion Google à configurer sur le serveur</span> : googleCalendarConnection ? (
            <div className="activity-calendar-connected">
              <span>Connecté{googleCalendarConnection.googleEmail ? ` : ${googleCalendarConnection.googleEmail}` : ""}</span>
              <form action={createGoogleCalendarTestEventAction}><button type="submit">Créer un événement test</button></form>
              <form action={disconnectGoogleCalendar}><button type="submit">Déconnecter</button></form>
            </div>
          ) : <Link className="contact-primary-button" href="/api/google-calendar/connect">Connecter mon agenda Google</Link>}
        </section>

        {searchQuery ? <p className="contacts-search-results">Résultats pour “{searchQuery}” : {filteredActivities.length} activité{filteredActivities.length > 1 ? "s" : ""}</p> : null}

        {params.notice && notices[params.notice] && <p className="contacts-message" role="status">{notices[params.notice]}{params.notice === "calendar-test-created" && calendarTestEventUrl ? <> <a href={calendarTestEventUrl} target="_blank" rel="noreferrer">Ouvrir l’événement</a></> : null}</p>}
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
                <div><p className="section-index">01 <i>·</i> NOUVELLE</p><h2>Ajouter une activité</h2></div>
              </div>

              <form action={createActivity} className={`contact-form${canWrite ? "" : " permission-hidden"}`}>
                <label><span className="field-title">Titre</span><input name="titre" required minLength={2} maxLength={120} placeholder="Ex. Appel de suivi" /></label>
                <label><span className="field-title">Type</span><input name="type" required minLength={2} maxLength={40} placeholder="Rendez-vous" /></label>
                <label><span className="field-title">Contact</span><select name="contactId" defaultValue=""><option value="">Aucun contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</option>)}</select></label>
                <label><span className="field-title">Entreprise</span><select name="entrepriseId" defaultValue=""><option value="">Aucune entreprise</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                <DateTimeField name="date" label="Date et heure" />
                <label><span className="field-title">Canal</span><input name="canal" maxLength={80} placeholder="Téléphone, e-mail…" /></label>
                <label><span className="field-title">Durée (minutes)</span><input name="dureeMinutes" type="number" min={0} max={1440} step={5} /></label>
                <label><span className="field-title">Responsable</span><select name="responsableId" defaultValue=""><option value="">Non attribué</option>{users.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}</select></label>
                <label><span className="field-title">Statut</span><select name="statut" defaultValue="Planifiée"><option value="Planifiée">Planifiée</option><option value="En cours">En cours</option><option value="Réalisée">Réalisée</option><option value="Annulée">Annulée</option></select></label>
                <label><span className="field-title">Date de réalisation</span><input name="dateRealisation" type="date" /></label>
                <label className="activity-next-action-field"><span className="field-title">Prochaine action</span><textarea name="prochaineAction" maxLength={1000} rows={2} /></label>
                <DateTimeField name="prochaineActionDate" label="Date et heure de la prochaine action" />
                <label><span className="field-title">Durée de la prochaine action (minutes)</span><input name="prochaineActionDureeMinutes" type="number" min={1} max={1440} step={5} /></label>
                {googleCalendarIsConfigured() ? <>
                  <label className="activity-calendar-toggle"><input name="pushActivityToGoogle" type="checkbox" /><span>Ajouter l’activité à Google Agenda</span></label>
                  <label className="activity-calendar-toggle"><input name="pushNextActionToGoogle" type="checkbox" /><span>Ajouter la prochaine action à Google Agenda</span></label>
                </> : null}
                <label style={{ gridColumn: "1 / -1" }}><span className="field-title">Détails</span><input name="details" maxLength={500} placeholder="Résumé de l’activité..." /></label>
                <label style={{ gridColumn: "1 / -1" }}><span className="field-title">Résultat</span><textarea name="resultat" maxLength={10000} rows={3} /></label>
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
                    ? `Aucun résultat pour “${searchQuery}”. Essaie une autre recherche.`
                    : "Aucune activité pour le moment. Ajoute ta première activité ci-dessus."}
                </p>
              ) : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records contacts-data-table activities-data-table">
                    <thead><tr><th>TITRE</th><th>TYPE / CANAL</th><th>CONTACT</th><th>ENTREPRISE</th><th>STATUT</th><th>RESPONSABLE</th><th>DATE PRÉVUE / RÉALISÉE</th><th>DURÉE</th><th>PROCHAINE ACTION / RÉSULTAT</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {filteredActivities.map((activity) => (
                        <tr key={activity.id}>
                          <td data-label="Titre"><b>{activity.titre}</b></td>
                          <td data-label="Type / canal">{activity.type}<small>{activity.canal || "Canal non renseigné"}</small></td>
                          <td data-label="Contact">{activity.contact ? [activity.contact.prenom, activity.contact.nom].filter(Boolean).join(" ") : activity.contactLabel || "—"}</td>
                          <td data-label="Entreprise">{activity.entreprise?.nom || "—"}</td>
                          <td data-label="Statut">{activity.statut || "—"}</td>
                          <td data-label="Responsable">{activity.responsable?.username || "—"}</td>
                          <td data-label="Date prévue / réalisation">{formatDate(activity.date)}<small>Réalisation : {formatDateOnly(activity.dateRealisation)}</small></td>
                          <td data-label="Durée">{activity.dureeMinutes == null ? "—" : `${activity.dureeMinutes} min`}</td>
                          <td data-label="Prochaine action / résultat">{activity.prochaineAction || activity.resultat || activity.details || "—"}{activity.prochaineActionDate ? <small>{formatDate(activity.prochaineActionDate)} · {activity.prochaineActionDureeMinutes ?? "—"} min</small> : null}</td>
                          <td data-label="Gestion">
                            <div className={`contact-row-actions${canWrite ? "" : " permission-hidden"}`}>
                              <details className="contact-edit-details">
                                <summary>Modifier</summary>
                                <UnsavedChangesForm action={updateActivity} className="contact-edit-form">
                                  <input type="hidden" name="id" value={activity.id} />
                                  <input type="hidden" name="legacyContact" value={activity.contactLabel ?? ""} />
                                  <label><span className="field-title">Titre</span><input name="titre" defaultValue={activity.titre} required minLength={2} maxLength={120} /></label>
                                  <label><span className="field-title">Type</span><input name="type" defaultValue={activity.type} required minLength={2} maxLength={40} /></label>
                                  <label><span className="field-title">Contact</span><select name="contactId" defaultValue={activity.contactId ?? ""}><option value="">Aucun contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</option>)}</select></label>
                                  <label><span className="field-title">Entreprise</span><select name="entrepriseId" defaultValue={activity.entrepriseId ?? ""}><option value="">Aucune entreprise</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                                  <DateTimeField name="date" label="Date et heure" initialValue={activity.date?.toISOString() ?? null} />
                                  <label><span className="field-title">Canal</span><input name="canal" defaultValue={activity.canal ?? ""} maxLength={80} /></label>
                                  <label><span className="field-title">Durée (minutes)</span><input name="dureeMinutes" type="number" min={0} max={1440} step={5} defaultValue={activity.dureeMinutes ?? ""} /></label>
                                  <label><span className="field-title">Responsable</span><select name="responsableId" defaultValue={activity.responsableId ?? ""}><option value="">Non attribué</option>{users.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}</select></label>
                                  <label><span className="field-title">Statut</span><select name="statut" defaultValue={activity.statut ?? "Planifiée"}><option value="Planifiée">Planifiée</option><option value="En cours">En cours</option><option value="Réalisée">Réalisée</option><option value="Annulée">Annulée</option></select></label>
                                  <label><span className="field-title">Date de réalisation</span><input name="dateRealisation" type="date" defaultValue={activity.dateRealisation ? new Date(activity.dateRealisation).toISOString().slice(0, 10) : ""} /></label>
                                  <label className="activity-next-action-field"><span className="field-title">Prochaine action</span><textarea name="prochaineAction" defaultValue={activity.prochaineAction ?? ""} maxLength={1000} rows={2} /></label>
                                  <DateTimeField name="prochaineActionDate" label="Date et heure de la prochaine action" initialValue={activity.prochaineActionDate?.toISOString() ?? null} />
                                  <label><span className="field-title">Durée de la prochaine action (minutes)</span><input name="prochaineActionDureeMinutes" type="number" min={1} max={1440} step={5} defaultValue={activity.prochaineActionDureeMinutes ?? ""} /></label>
                                  {googleCalendarIsConfigured() ? <>
                                    <label className="activity-calendar-toggle"><input name="pushActivityToGoogle" type="checkbox" defaultChecked={activity.pushActivityToGoogle} /><span>Ajouter l’activité à Google Agenda</span></label>
                                    <label className="activity-calendar-toggle"><input name="pushNextActionToGoogle" type="checkbox" defaultChecked={activity.pushNextActionToGoogle} /><span>Ajouter la prochaine action à Google Agenda</span></label>
                                  </> : null}
                                  <label><span className="field-title">Détails</span><input name="details" defaultValue={activity.details ?? ""} maxLength={500} /></label>
                                  <label><span className="field-title">Résultat</span><textarea name="resultat" defaultValue={activity.resultat ?? ""} maxLength={10000} rows={3} /></label>
                                  <CancelEditButton />
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
