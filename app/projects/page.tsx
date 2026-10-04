import Link from "next/link";
import { createProject, deleteProject } from "@/app/projects/actions";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import type { Prisma } from "@/app/generated/prisma/client";

type ProjectRecord = Prisma.ProjectGetPayload<{ include: { entreprise: true } }>;

type ProjectsPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
};

const notices: Record<string, string> = {
  created: "Le projet a été ajouté.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "Le projet a été supprimé.",
};

const errors: Record<string, string> = {
  invalid: "Vérifie le nom du projet et les champs numériques.",
  "not-found": "Ce projet n’existe plus. Actualise la liste.",
  "confirm-delete": "Confirme la suppression avant de continuer.",
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  let databaseAvailable = true;
  let projects: ProjectRecord[] = [];
  let entreprises: { id: string; nom: string }[] = [];

  try {
    [projects, entreprises] = await Promise.all([
      prisma.project.findMany({ include: { entreprise: true }, orderBy: { updatedAt: "desc" } }),
      prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    ]);
  } catch {
    databaseAvailable = false;
  }

  const filteredProjects = searchQuery
    ? projects.filter((project) => {
        const haystack = [project.nom, project.entreprise?.nom ?? "", project.pays ?? "", project.ville ?? "", project.statut, project.budget ?? ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
      })
    : projects;

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
            <p className="section-index">ESPACE DE TRAVAIL <i>·</i> PROJETS</p>
            <h1>Suivi des projets</h1>
            <p className="contacts-intro">Suis les investissements, leur statut et leur avancement.</p>
          </div>
          <span className="contacts-total">{databaseAvailable ? projects.length : "—"}<small>PROJETS</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search" action="/projects" method="get">
            <label htmlFor="projects-search" className="sr-only">Rechercher un projet</label>
            <input id="projects-search" name="q" type="search" defaultValue={searchQuery} placeholder="Rechercher un projet, pays ou ville" autoComplete="off" />
            <button type="submit">Rechercher</button>
          </form>
          {searchQuery ? <Link className="contacts-search-reset" href="/projects">Réinitialiser</Link> : null}
        </section>

        {searchQuery ? <p className="contacts-search-results">Résultats pour “{searchQuery}” : {filteredProjects.length} projet{filteredProjects.length > 1 ? "s" : ""}</p> : null}

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
                <div><p className="section-index">01 <i>·</i> NOUVEAU</p><h2>Ajouter un projet</h2></div>
              </div>

              <form action={createProject} className={`contact-form${canWrite ? "" : " permission-hidden"}`}>
                <label>Nom du projet<input name="nom" required minLength={2} maxLength={120} placeholder="Ex. Lombok Residences" /></label>
                <label>Entreprise<select name="entrepriseId" defaultValue=""><option value="">Aucune entreprise</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                <label>Pays<input name="pays" maxLength={80} placeholder="Indonésie" /></label>
                <label>Ville<input name="ville" maxLength={80} placeholder="Kuta Selatan" /></label>
                <label>Budget<input name="budget" maxLength={80} placeholder="€ 2.4M" /></label>
                <label>Statut<input name="statut" maxLength={40} defaultValue="En cours" /></label>
                <label>Progression (%)<input name="progression" type="number" min={0} max={100} defaultValue={35} /></label>
                <button className="contact-primary-button" type="submit">Ajouter le projet <span>+</span></button>
              </form>
            </section>

            <section className="contacts-list-section">
              <div className="contacts-section-heading">
                <div><p className="section-index">02 <i>·</i> PORTEFEUILLE</p><h2>Projets enregistrés</h2></div>
                <span className="contacts-list-count">{filteredProjects.length}</span>
              </div>

              {filteredProjects.length === 0 ? (
                <p className="contacts-empty">
                  {searchQuery
                    ? `Aucun résultat pour “${searchQuery}”. Essaie une autre recherche.`
                    : "Aucun projet pour le moment. Ajoute ton premier projet ci-dessus."}
                </p>
              ) : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records contacts-data-table projects-data-table">
                    <thead><tr><th>PROJET</th><th>ENTREPRISE</th><th>LOCALISATION</th><th>STATUT</th><th>PROGRESSION</th><th>BUDGET</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {filteredProjects.map((project) => (
                        <tr key={project.id}>
                          <td data-label="Projet">
                            <b><Link href={`/projects/${project.id}`}>{project.nom}</Link></b>
                            <small>{project.updatedAt.toLocaleDateString("fr-FR")}</small>
                          </td>
                          <td data-label="Entreprise">{project.entreprise?.nom || "—"}</td>
                          <td data-label="Localisation">{[project.ville, project.pays].filter(Boolean).join(" · ") || "—"}</td>
                          <td data-label="Statut"><span className="status-pill status-active"><i />{project.statut}</span></td>
                          <td data-label="Progression">{project.progression}%</td>
                          <td data-label="Budget">{project.budget || "—"}</td>
                          <td data-label="Gestion">
                            <div className="contact-row-actions">
                              <Link className="contacts-search-reset" href={`/projects/${project.id}`}>{canWrite ? "Modifier" : "Voir"}</Link>
                              {canWrite ? <details className="contact-delete-details">
                                  <summary>Supprimer</summary>
                                  <form action={deleteProject} className="contact-delete-form">
                                    <input type="hidden" name="id" value={project.id} />
                                    <label><input type="checkbox" name="confirmed" value="yes" required /> Confirmer la suppression</label>
                                    <button type="submit">Supprimer ce projet</button>
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
