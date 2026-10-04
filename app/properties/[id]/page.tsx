import Link from "next/link";
import { notFound } from "next/navigation";
import { updateProperty } from "@/app/properties/actions";
import { PropertyForm } from "@/app/properties/property-form";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function PropertyPage({ params, searchParams }: PropertyPageProps) {
  const user = await requirePermission("crm.read");
  const canWrite = hasPermission(user.role, "crm.write");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [property, contacts, entreprises] = await Promise.all([
    prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
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
  if (!property) notFound();

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/projects">← Projets</Link>
      </header>
      <div className="contacts-content property-profile-page">
        <section className="contacts-title-row"><div><p className="section-index">ESPACE DE TRAVAIL · FICHE PROJET</p><h1>{property.title}</h1><p className="contacts-intro">Référence {property.reference} · {canWrite ? "Tous les champs du projet et de son titre foncier." : "Consultation des informations du projet."}</p></div><span className="contacts-total">{property.documents.length}<small>DOCS</small></span></section>
        {query.notice === "created" ? <p className="contacts-message" role="status">Le projet a été créé.</p> : null}
        {query.notice === "updated" ? <p className="contacts-message" role="status">Les modifications ont été enregistrées.</p> : null}
        {query.error === "invalid" ? <p className="contacts-message contacts-message-error" role="alert">Vérifie les champs, les dates et les valeurs numériques.</p> : null}
        {query.error === "reference-exists" ? <p className="contacts-message contacts-message-error" role="alert">Cette référence est déjà utilisée.</p> : null}
        {query.error === "not-found" ? <p className="contacts-message contacts-message-error" role="alert">Ce bien n’existe plus.</p> : null}
        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 · FICHE COMPLÈTE</p><h2>{canWrite ? "Modifier toutes les informations" : "Toutes les informations"}</h2></div></div>
          <PropertyForm action={updateProperty} property={property} contacts={contacts} entreprises={entreprises} submitLabel="Enregistrer le projet" cancelHref="/projects" editable={canWrite} />
        </section>
      </div>
    </main>
  );
}