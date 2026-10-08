import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { formatCurrencyAmount, formatLegacyBudget } from "@/lib/number-format";
import type { Prisma } from "@/app/generated/prisma/client";

type ProjectRecord = Prisma.PropertyGetPayload<{ include: { entreprise: true } }>;

type ProjectsPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
};

const errors: Record<string, string> = {
  invalid: "Vérifie les champs du projet, du titre foncier et des documents.",
  "reference-exists": "Cette référence de projet existe déjà.",
  "not-found": "Ce projet n’existe plus. Actualise la liste.",
};

import { deleteProperty } from "@/app/properties/actions";
const notices: Record<string, string> = {
  created: "Le projet a été créé.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "Le projet et ses données immobilières liées ont été supprimés.",
  "confirm-delete": "Confirme la suppression du projet.",
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  let databaseAvailable = true;
  let projects: ProjectRecord[] = [];

  try {
    projects = await prisma.property.findMany({ include: { entreprise: true }, orderBy: { updatedAt: "desc" } });
  } catch {
    databaseAvailable = false;
  }

  const filteredProjects = searchQuery
    ? projects.filter((project) => {
        const haystack = [project.title, project.reference, project.entreprise?.nom ?? "", project.country ?? "", project.kabupaten ?? "", project.province ?? "", project.projectStatus ?? "", project.projectBudget ?? "", project.type, project.status]
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
            <p className="contacts-intro">Retrouve les informations immobilières, foncières et financières de chaque projet.</p>
          </div>
          <span className="contacts-total">{databaseAvailable ? projects.length : "—"}<small>PROJETS</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search" action="/projects" method="get">
            <label htmlFor="projects-search" className="sr-only">Rechercher un projet</label>
            <input id="projects-search" name="q" type="search" defaultValue={searchQuery} placeholder="Rechercher un projet, pays ou ville" autoComplete="off" />
            <button type="submit">Rechercher</button>
          </form>
          {canWrite ? <Link className="contact-primary-button" href="/projects/new">Ajouter un projet <span>+</span></Link> : null}
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
            <section className="contacts-list-section">
              <div className="contacts-section-heading">
                <div><p className="section-index">01 <i>·</i> PORTEFEUILLE</p><h2>Projets enregistrés</h2></div>
                <span className="contacts-list-count">{filteredProjects.length}</span>
              </div>

              {filteredProjects.length === 0 ? (
                <p className="contacts-empty">
                  {searchQuery
                    ? `Aucun résultat pour “${searchQuery}”. Essaie une autre recherche.`
                    : "Aucun projet pour le moment. Ajoute ton premier projet."}
                </p>
              ) : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records contacts-data-table projects-data-table">
                    <thead><tr><th>PROJET</th><th>ENTREPRISE</th><th>LOCALISATION</th><th>STATUT</th><th>PROGRESSION</th><th>BUDGET</th><th>GESTION</th></tr></thead>
                    <tbody>
                      {filteredProjects.map((project) => (
                        <tr key={project.id}>
                          <td data-label="Projet">
                            <b><Link href={`/projects/${project.id}`}>{project.title}</Link></b>
                            <small>{project.reference}</small>
                          </td>
                          <td data-label="Entreprise">{project.entreprise?.nom || "—"}</td>
                          <td data-label="Localisation">{[project.neighborhood, project.kabupaten, project.province, project.country].filter(Boolean).join(" · ") || "—"}</td>
                          <td data-label="Statut"><span className="status-pill status-active"><i />{project.projectStatus || project.status}</span></td>
                          <td data-label="Progression">{project.projectProgression === null ? "—" : `${project.projectProgression}%`}</td>
                          <td data-label="Budget">{project.projectBudgetAmount !== null && project.projectBudgetCurrency
                            ? formatCurrencyAmount(project.projectBudgetAmount.toString(), project.projectBudgetCurrency)
                            : formatLegacyBudget(project.projectBudget)}</td>
                          <td data-label="Gestion">
                            <div className="contact-row-actions">
                              <Link className="contact-profile-link" href={`/projects/${project.id}`}>{canWrite ? "Modifier" : "Voir"}</Link>
                              {canWrite ? <details className="contact-delete-details">
                                <summary>Supprimer</summary>
                                <form action={deleteProperty} className="contact-delete-form">
                                  <input type="hidden" name="id" value={project.id} />
                                  <p>Supprime aussi les titres, documents, mandats, dossiers et visites liés.</p>
                                  <label><input type="checkbox" name="confirmed" value="yes" required /> Confirmer la suppression</label>
                                  <button type="submit">Supprimer le projet</button>
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
