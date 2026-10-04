import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateProperty } from "@/app/properties/actions";
import { PropertyForm } from "@/app/properties/property-form";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";

const notices: Record<string, string> = {
  created: "Le projet a été créé.",
  updated: "Les modifications ont été enregistrées.",
};

const errors: Record<string, string> = {
  invalid: "Vérifie les champs du projet, du titre foncier et des documents.",
  "reference-exists": "Cette référence de projet existe déjà.",
  "not-found": "Ce projet n’existe plus.",
  "confirm-delete": "Confirme la suppression du projet.",
};

export default async function ProjectProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requirePermission("crm.read");
  const canWrite = hasPermission(user.role, "crm.write");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [property, contacts, entreprises] = await Promise.all([
    prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
        entreprise: true,
        legacyProject: { include: { contacts: { where: { interesse: true }, include: { contact: true } } } },
        landTitle: true,
        documents: { orderBy: { createdAt: "asc" } },
        mandates: { orderBy: { createdAt: "desc" } },
        deals: { orderBy: { createdAt: "desc" } },
        viewings: { orderBy: { scheduledAt: "desc" } },
      },
    }),
    prisma.contact.findMany({ select: { id: true, prenom: true, nom: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);

  if (!property) {
    const legacyProject = await prisma.project.findUnique({ where: { id }, select: { property: { select: { id: true } } } });
    if (legacyProject?.property) redirect(`/projects/${legacyProject.property.id}`);
    notFound();
  }

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/projects">← Projets</Link>
      </header>

      <div className="contacts-content contact-profile-page">
        <section className="contacts-title-row">
          <div>
            <p className="section-index">ESPACE DE TRAVAIL · FICHE PROJET</p>
            <h1>{property.title}</h1>
            <p className="contacts-intro">Référence {property.reference} · Toutes les informations immobilières et foncières du projet.</p>
          </div>
          <span className="contacts-total">{property.documents.length}<small>DOCS</small></span>
        </section>

        {query.notice && notices[query.notice] ? <p className="contacts-message" role="status">{notices[query.notice]}</p> : null}
        {query.error && errors[query.error] ? <p className="contacts-message contacts-message-error" role="alert">{errors[query.error]}</p> : null}

        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 · FICHE COMPLÈTE</p><h2>{canWrite ? "Modifier toutes les informations" : "Toutes les informations"}</h2></div></div>
          <PropertyForm action={updateProperty} property={property} contacts={contacts} entreprises={entreprises} submitLabel="Enregistrer le projet" cancelHref="/projects" editable={canWrite} />
        </section>

        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">10 · CONTACTS</p><h2>Personnes intéressées</h2></div></div>
          {property.legacyProject?.contacts.length ? (
            <div className="contact-note-list">
              {property.legacyProject.contacts.map(({ contact }) => (
                <article className="contact-note-item" key={contact.id}>
                  <Link href={`/contacts/${contact.id}`}><b>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</b></Link>
                  <p>{[contact.email, contact.telephone].filter(Boolean).join(" · ") || "Contact du CRM"}</p>
                </article>
              ))}
            </div>
          ) : <p className="contacts-empty">Aucun contact intéressé par ce projet pour le moment.</p>}
        </section>
      </div>
    </main>
  );
}