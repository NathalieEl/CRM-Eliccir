import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function normalise(value: string) {
  return value.toLowerCase().trim();
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  await requirePermission("crm.read");
  const params = await searchParams;
  const query = normalise(params.q ?? "");

  let databaseAvailable = true;
  let contacts: Awaited<ReturnType<typeof prisma.contact.findMany>> = [];
  let projects: Awaited<ReturnType<typeof prisma.project.findMany>> = [];
  let activities: Awaited<ReturnType<typeof prisma.activity.findMany>> = [];
  let actions: Awaited<ReturnType<typeof prisma.actionItem.findMany>> = [];

  try {
    const [contactsData, projectsData, activitiesData, actionsData] = await Promise.all([
      prisma.contact.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.project.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.activity.findMany({ orderBy: { date: "asc" } }),
      prisma.actionItem.findMany({ orderBy: [{ dateEcheance: "asc" }, { updatedAt: "desc" }] }),
    ]);

    contacts = contactsData;
    projects = projectsData;
    activities = activitiesData;
    actions = actionsData;
  } catch {
    databaseAvailable = false;
  }

  const filteredContacts = query
    ? contacts.filter((contact) => {
        const haystack = [contact.prenom ?? "", contact.nom, contact.email ?? "", contact.telephone ?? "", contact.entreprise ?? ""].join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : contacts.slice(0, 4);

  const filteredProjects = query
    ? projects.filter((project) => {
        const haystack = [project.nom, project.ville ?? "", project.pays ?? "", project.statut, project.budget ?? ""].join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : projects.slice(0, 3);

  const filteredActivities = query
    ? activities.filter((activity) => {
        const haystack = [activity.titre, activity.type, activity.contact ?? "", activity.details ?? ""].join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : activities.slice(0, 3);

  const filteredActions = query
    ? actions.filter((action) => {
        const haystack = [action.titre, action.priorite, action.statut, action.contact ?? "", action.details ?? ""].join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : actions.slice(0, 3);

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
            <p className="section-index">ESPACE DE TRAVAIL <i>·</i> RECHERCHE</p>
            <h1>Recherche globale</h1>
            <p className="contacts-intro">Trouvez rapidement un contact, un projet, une activité ou une action.</p>
          </div>
          <span className="contacts-total">{databaseAvailable ? (contacts.length + projects.length + activities.length + actions.length) : "—"}<small>RÉSULTATS</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search" action="/search" method="get">
            <label htmlFor="global-search" className="sr-only">Rechercher dans le CRM</label>
            <input id="global-search" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Rechercher dans tout le CRM" autoComplete="off" />
            <button type="submit">Rechercher</button>
          </form>
          {query ? <a className="contacts-search-reset" href="/search">Réinitialiser</a> : null}
        </section>

        {!databaseAvailable ? (
          <section className="contacts-database-error" role="alert">
            <h2>La base de données est inaccessible</h2>
            <p>Ajoutez la variable <code>DATABASE_URL</code> puis rechargez la page pour activer la recherche globale sur les données vivantes.</p>
          </section>
        ) : (
          <>
            {!query ? (
              <p className="contacts-search-results">Saisissez un mot-clé pour lancer une recherche dans tout le CRM.</p>
            ) : (
              <p className="contacts-search-results">Résultats pour “{params.q}”</p>
            )}

            <div className="search-results-grid">
              <section className="search-results-section">
                <h2>Contacts</h2>
                {filteredContacts.length === 0 ? <p>Aucun contact.</p> : (
                  <ul>
                    {filteredContacts.map((contact) => (
                      <li key={contact.id}>
                        <strong>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</strong>
                        <span>{contact.email || "Aucun e-mail"}</span>
                        <small>{contact.entreprise || "Entreprise non renseignée"}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="search-results-section">
                <h2>Projets</h2>
                {filteredProjects.length === 0 ? <p>Aucun projet.</p> : (
                  <ul>
                    {filteredProjects.map((project) => (
                      <li key={project.id}>
                        <strong>{project.nom}</strong>
                        <span>{[project.ville, project.pays].filter(Boolean).join(" · ") || "Localisation non définie"}</span>
                        <small>{project.statut}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="search-results-section">
                <h2>Activités</h2>
                {filteredActivities.length === 0 ? <p>Aucune activité.</p> : (
                  <ul>
                    {filteredActivities.map((activity) => (
                      <li key={activity.id}>
                        <strong>{activity.titre}</strong>
                        <span>{activity.type}</span>
                        <small>{activity.contact || "Contact non renseigné"}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="search-results-section">
                <h2>Actions</h2>
                {filteredActions.length === 0 ? <p>Aucune action.</p> : (
                  <ul>
                    {filteredActions.map((action) => (
                      <li key={action.id}>
                        <strong>{action.titre}</strong>
                        <span>{action.priorite}</span>
                        <small>{action.statut}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
