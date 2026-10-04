import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import type { Prisma } from "@/app/generated/prisma/client";

type PropertyListRecord = Prisma.PropertyGetPayload<{
  include: {
    owner: { select: { id: true; prenom: true; nom: true } };
    entreprise: { select: { id: true; nom: true } };
  };
}>;

type PropertiesPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
};

const errors: Record<string, string> = {
  invalid: "Vérifie les champs du projet, du titre foncier et des documents.",
  "reference-exists": "Cette référence de projet existe déjà.",
  "not-found": "Ce projet n’existe plus.",
};

const notices: Record<string, string> = {
  created: "Le projet a été créé.",
  updated: "Les modifications ont été enregistrées.",
};

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const user = await requirePermission("crm.read");
  const canWrite = hasPermission(user.role, "crm.write");
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  let databaseAvailable = true;
  let properties: PropertyListRecord[] = [];

  try {
    properties = await prisma.property.findMany({
      include: {
        owner: { select: { id: true, prenom: true, nom: true } },
        entreprise: { select: { id: true, nom: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    databaseAvailable = false;
  }

  const visibleProperties = query
    ? properties.filter((property) => [property.reference, property.title, property.type, property.status, property.projectStatus ?? "", property.projectBudget ?? "", property.country ?? "", property.province ?? "", property.kabupaten ?? "", property.neighborhood ?? "", property.entreprise?.nom ?? "", property.owner ? [property.owner.prenom, property.owner.nom].filter(Boolean).join(" ") : ""].join(" ").toLowerCase().includes(query))
    : properties;

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>
      <div className="contacts-content">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL · PROJETS</p><h1>Projets immobiliers</h1><p className="contacts-intro">Projets, propriétaires et informations foncières.</p></div>
          <span className="contacts-total">{databaseAvailable ? properties.length : "—"}<small>PROJETS</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search" action="/projects" method="get">
            <label htmlFor="properties-search" className="sr-only">Rechercher un projet</label>
            <input id="properties-search" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Référence, projet, secteur, propriétaire" autoComplete="off" />
            <button type="submit">Rechercher</button>
          </form>
          {canWrite ? <Link className="contact-primary-button" href="/projects/new">Ajouter un projet <span>+</span></Link> : null}
        </section>

        {params.notice && notices[params.notice] ? <p className="contacts-message" role="status">{notices[params.notice]}</p> : null}
        {params.error && errors[params.error] ? <p className="contacts-message contacts-message-error" role="alert">{errors[params.error]}</p> : null}

        {!databaseAvailable ? (
          <section className="contacts-database-error" role="alert"><h2>La base de données est inaccessible</h2><p>Recharge la page lorsque PostgreSQL est disponible.</p></section>
        ) : (
          <section className="contacts-list-section">
            <div className="contacts-section-heading"><div><p className="section-index">01 · PORTEFEUILLE</p><h2>Projets enregistrés</h2></div><span className="contacts-list-count">{visibleProperties.length}</span></div>
            {visibleProperties.length ? <div className="contacts-records-wrap"><table className="contacts-records contacts-data-table projects-data-table"><thead><tr><th>PROJET</th><th>ENTREPRISE</th><th>LOCALISATION</th><th>STATUT</th><th>PROGRESSION</th><th>BUDGET</th><th>GESTION</th></tr></thead><tbody>{visibleProperties.map((property) => <tr key={property.id}>
              <td data-label="Projet"><b>{property.title}</b><small>{property.reference}</small></td>
              <td data-label="Entreprise">{property.entreprise?.nom || "—"}</td>
              <td data-label="Localisation">{[property.neighborhood, property.kabupaten, property.province, property.country].filter(Boolean).join(" · ") || "—"}</td>
              <td data-label="Statut"><span className="status-pill status-active"><i />{property.projectStatus || property.status}</span></td>
              <td data-label="Progression">{property.projectProgression === null ? "—" : `${property.projectProgression}%`}</td>
              <td data-label="Budget">{property.projectBudget || "—"}</td>
              <td data-label="Gestion"><Link className="contact-profile-link" href={`/projects/${property.id}`}>{canWrite ? "Modifier" : "Consulter"}</Link></td>
            </tr>)}</tbody></table></div> : <p className="contacts-empty">{query ? "Aucun bien ne correspond à cette recherche." : "Aucun bien immobilier pour le moment."}</p>}
          </section>
        )}
      </div>
    </main>
  );
}