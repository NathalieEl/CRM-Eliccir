import Link from "next/link";
import { notFound } from "next/navigation";
import { updateProject } from "@/app/projects/actions";
import { UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";

const notices: Record<string, string> = {
  updated: "Les modifications ont été enregistrées.",
};

const errors: Record<string, string> = {
  invalid: "Vérifie le nom du projet et les champs numériques.",
  "not-found": "Ce projet n’existe plus. Actualise la liste.",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(date);
}

export default async function ProjectProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requirePermission("crm.read");
  const canWrite = hasPermission(user.role, "crm.write");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [project, entreprises] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        entreprise: true,
        contacts: { where: { interesse: true }, include: { contact: true } },
      },
    }),
    prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);

  if (!project) notFound();

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
            <h1>{project.nom}</h1>
            <p className="contacts-intro">Consulte et modifie toutes les informations du projet.</p>
          </div>
          <span className="contacts-total">{project.contacts.length}<small>CONTACTS</small></span>
        </section>

        {query.notice && notices[query.notice] ? <p className="contacts-message" role="status">{notices[query.notice]}</p> : null}
        {query.error && errors[query.error] ? <p className="contacts-message contacts-message-error" role="alert">{errors[query.error]}</p> : null}

        <UnsavedChangesForm action={updateProject} className="contact-profile-form">
          <input type="hidden" name="id" value={project.id} />
          <input type="hidden" name="returnTo" value="profile" />
          <fieldset disabled={!canWrite} style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}>
            <section className="contacts-create-section profile-section">
              <div className="contacts-section-heading"><div><p className="section-index">01 · INFORMATIONS DU PROJET</p><h2>Détails et suivi</h2></div></div>
              <div className="profile-fields-grid">
                <label>Nom du projet<input name="nom" defaultValue={project.nom} required minLength={2} maxLength={120} /></label>
                <label>Entreprise<select name="entrepriseId" defaultValue={project.entrepriseId ?? ""}><option value="">Aucune entreprise</option>{entreprises.map((entreprise) => <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>)}</select></label>
                <label>Pays<input name="pays" defaultValue={project.pays ?? ""} maxLength={80} /></label>
                <label>Ville<input name="ville" defaultValue={project.ville ?? ""} maxLength={80} /></label>
                <label>Budget<input name="budget" defaultValue={project.budget ?? ""} maxLength={80} /></label>
                <label>Statut<input name="statut" defaultValue={project.statut} maxLength={40} /></label>
                <label>Progression (%)<input name="progression" type="number" min={0} max={100} defaultValue={project.progression} /></label>
              </div>
            </section>
          </fieldset>
          {canWrite ? <div className="profile-form-actions"><Link className="contact-cancel-link" href="/projects">Annuler</Link><button className="contact-primary-button profile-save-button" type="submit">Enregistrer la fiche</button></div> : null}
        </UnsavedChangesForm>

        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">02 · CONTACTS</p><h2>Personnes intéressées</h2></div></div>
          {project.contacts.length ? (
            <div className="contact-note-list">
              {project.contacts.map(({ contact }) => (
                <article className="contact-note-item" key={contact.id}>
                  <Link href={`/contacts/${contact.id}`}><b>{[contact.prenom, contact.nom].filter(Boolean).join(" ")}</b></Link>
                  <p>{[contact.email, contact.telephone].filter(Boolean).join(" · ") || "Contact du CRM"}</p>
                </article>
              ))}
            </div>
          ) : <p className="contacts-empty">Aucun contact intéressé par ce projet pour le moment.</p>}
        </section>

        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">03 · SYSTÈME</p><h2>Identifiants et dates</h2></div></div>
          <div className="profile-fields-grid">
            <label>Identifiant<input readOnly value={project.id} /></label>
            <label>Créé le<input readOnly value={formatDate(project.createdAt)} /></label>
            <label>Modifié le<input readOnly value={formatDate(project.updatedAt)} /></label>
          </div>
        </section>
      </div>
    </main>
  );
}