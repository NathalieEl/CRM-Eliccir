import Link from "next/link";
import { createEntreprise } from "@/app/companies/actions";
import { CompanyFields } from "@/app/companies/company-fields";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import type { Prisma } from "@/app/generated/prisma/client";

type EntrepriseRecord = Prisma.EntrepriseGetPayload<{
  include: {
    contacts: { include: { contact: true } };
    _count: { select: { activities: true; actionItems: true; projects: true } };
  };
}>;

type CompaniesPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
};

const notices: Record<string, string> = {
  created: "L’entreprise a été créée.",
  updated: "Les modifications ont été enregistrées.",
  deleted: "L’entreprise a été supprimée.",
  linked: "Le contact a été rattaché à l’entreprise.",
  unlinked: "Le contact a été détaché de l’entreprise.",
};

const errors: Record<string, string> = {
  invalid: "Vérifiez le nom et les coordonnées de l’entreprise.",
  exists: "Une entreprise porte déjà ce nom.",
  "not-found": "Cette entreprise n’existe plus. Actualisez la liste.",
  "confirm-delete": "Confirmez la suppression de l’entreprise.",
  "invalid-link": "Sélectionnez une entreprise et un contact valides.",
  "confirm-unlink": "Confirmez le retrait du contact.",
};

function contactName(contact: EntrepriseRecord["contacts"][number]["contact"]) {
  return [contact.prenom, contact.nom].filter(Boolean).join(" ");
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const currentUser = await requirePermission("crm.read");
  const canWrite = hasPermission(currentUser.role, "crm.write");
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  let databaseAvailable = true;
  let entreprises: EntrepriseRecord[] = [];

  try {
    entreprises = await prisma.entreprise.findMany({
      include: {
        contacts: { include: { contact: true } },
        _count: { select: { activities: true, actionItems: true, projects: true } },
      },
      orderBy: { nom: "asc" },
    });
  } catch {
    databaseAvailable = false;
  }

  const filtered = query
    ? entreprises.filter((entreprise) => {
        const haystack = [
          entreprise.nom,
          entreprise.email ?? "",
          entreprise.telephone ?? "",
          entreprise.secteur ?? "",
          entreprise.ville ?? "",
          entreprise.pays ?? "",
          ...entreprise.contacts.flatMap(({ contact }) => [contact.prenom ?? "", contact.nom, contact.email ?? ""]),
        ].join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : entreprises;

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>
      <div className="contacts-content">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL · ORGANISATIONS</p><h1>Entreprises</h1><p className="contacts-intro">Gérez les organisations, leurs contacts et leur suivi commercial.</p></div>
          <span className="contacts-total">{databaseAvailable ? entreprises.length : "—"}<small>ENTREPRISES</small></span>
        </section>

        <section className="contacts-toolbar">
          <form className="contacts-search" action="/companies" method="get">
            <label htmlFor="companies-search" className="sr-only">Rechercher une entreprise</label>
            <input id="companies-search" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Rechercher une entreprise ou un contact" autoComplete="off" />
            <button type="submit">Rechercher</button>
          </form>
          {query ? <Link className="contacts-search-reset" href="/companies">Réinitialiser</Link> : null}
        </section>

        {params.notice && notices[params.notice] && <p className="contacts-message" role="status">{notices[params.notice]}</p>}
        {params.error && errors[params.error] && <p className="contacts-message contacts-message-error" role="alert">{errors[params.error]}</p>}

        {!databaseAvailable ? (
          <section className="contacts-database-error" role="alert"><h2>La base de données est inaccessible</h2><p>Vérifiez la configuration PostgreSQL puis rechargez cette page.</p></section>
        ) : (
          <>
            <section className="contacts-create-section">
              <div className="contacts-section-heading"><div><p className="section-index">01 · NOUVEAU</p><h2>Ajouter une entreprise</h2></div></div>
              <form action={createEntreprise} className={`contact-form${canWrite ? "" : " permission-hidden"}`}>
                <CompanyFields />
                <button className="contact-primary-button" type="submit">Créer l’entreprise <span>+</span></button>
              </form>
            </section>

            <section className="contacts-list-section">
              <div className="contacts-section-heading"><div><p className="section-index">02 · PORTFEUILLE</p><h2>Entreprises enregistrées</h2></div><span className="contacts-list-count">{filtered.length}</span></div>
              {filtered.length === 0 ? <p className="contacts-empty">Aucune entreprise ne correspond à la recherche.</p> : (
                <div className="contacts-records-wrap">
                  <table className="contacts-records companies-records">
                    <thead><tr><th>ENTREPRISE</th><th>CONTACTS</th><th>SUIVI</th><th>ACTIONS</th></tr></thead>
                    <tbody>{filtered.map((entreprise) => (
                      <tr key={entreprise.id}>
                        <td><b>{entreprise.nom}</b><small>{[entreprise.ville, entreprise.pays].filter(Boolean).join(" · ") || entreprise.secteur || "Coordonnées non renseignées"}</small></td>
                        <td><b>{entreprise.contacts.length} contact{entreprise.contacts.length === 1 ? "" : "s"}</b><small>{entreprise.contacts.slice(0, 3).map(({ contact }) => contactName(contact)).join(", ")}{entreprise.contacts.length > 3 ? "…" : ""}</small></td>
                        <td><span>{entreprise._count.activities} activité{entreprise._count.activities === 1 ? "" : "s"}</span><small>{entreprise._count.actionItems} action{entreprise._count.actionItems === 1 ? "" : "s"} · {entreprise._count.projects} projet{entreprise._count.projects === 1 ? "" : "s"}</small></td>
                        <td><Link className="contact-profile-link" href={`/companies/${entreprise.id}`}>Ouvrir la fiche</Link></td>
                      </tr>
                    ))}</tbody>
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
