import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { updateProperty } from "@/app/properties/actions";
import { PropertyForm } from "@/app/properties/property-form";
import { deleteProjectPhoto, moveProjectPhoto, setProjectCoverPhoto, updateProjectPhotoCaption, uploadProjectPhoto } from "@/app/projects/photo-actions";
import { isProjectPhotoStorageConfigured } from "@/lib/project-photo-storage";
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

const photoNotices: Record<string, string> = {
  added: "La photo a été ajoutée.",
  updated: "La légende a été enregistrée.",
  "cover-updated": "La photo principale a été modifiée.",
  "order-updated": "L’ordre des photos a été modifié.",
  deleted: "La photo a été supprimée.",
};

const photoErrors: Record<string, string> = {
  storage: "Le stockage de photos R2 n’est pas configuré dans cet environnement.",
  "invalid-file": "Choisis une image JPEG, PNG ou WebP valide de 10 Mo maximum.",
  "invalid-caption": "La légende ne peut pas dépasser 240 caractères.",
  limit: "Un projet peut contenir jusqu’à 20 photos.",
  "too-large": "L’image reste trop volumineuse après optimisation.",
  "upload-failed": "La photo n’a pas pu être enregistrée. Réessaie plus tard.",
  "delete-failed": "La photo n’a pas pu être supprimée du stockage.",
  "invalid-order": "L’ordre de cette photo ne peut pas être modifié.",
  "not-found": "Cette photo n’existe plus.",
};

export default async function ProjectProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string; photoError?: string; photoNotice?: string }>;
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
        photos: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
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
  const reorderablePhotos = property.photos.filter((photo) => !photo.isCover);

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">Eliccir<small>CRM</small></span></Link>
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
        {query.photoNotice && photoNotices[query.photoNotice] ? <p className="contacts-message" role="status">{photoNotices[query.photoNotice]}</p> : null}
        {query.photoError && photoErrors[query.photoError] ? <p className="contacts-message contacts-message-error" role="alert">{photoErrors[query.photoError]}</p> : null}

        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 · FICHE COMPLÈTE</p><h2>{canWrite ? "Modifier toutes les informations" : "Toutes les informations"}</h2></div></div>
          <PropertyForm action={updateProperty} property={property} contacts={contacts} entreprises={entreprises} submitLabel="Enregistrer le projet" cancelHref="/projects" editable={canWrite} />
        </section>

        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">PHOTOS</p><h2>Photos du projet</h2></div><span className="contacts-total">{property.photos.length}<small>PHOTOS</small></span></div>
          {canWrite && isProjectPhotoStorageConfigured() ? (
            <form action={uploadProjectPhoto} className="project-photo-upload-form" encType="multipart/form-data">
              <input type="hidden" name="propertyId" value={property.id} />
              <label>Image du projet<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
              <label>Légende (facultative)<input name="caption" maxLength={240} placeholder="Ex. Vue principale du projet" /></label>
              <button className="contact-primary-button" type="submit">Ajouter la photo</button>
              <p className="support-privacy-note">JPEG, PNG ou WebP · 10 Mo maximum · 20 photos par projet</p>
            </form>
          ) : null}
          {!isProjectPhotoStorageConfigured() ? (
            <p className="contacts-message contacts-message-error" role="status">Le stockage R2 doit être configuré dans Railway avant de pouvoir ajouter des photos.</p>
          ) : null}
          {property.photos.length ? (
            <div className="project-photo-grid">
              {property.photos.map((photo) => {
                const orderIndex = reorderablePhotos.findIndex((entry) => entry.id === photo.id);
                return (
                  <article className="project-photo-card" key={photo.id}>
                    <Image src={`/projects/${property.id}/photos/${photo.id}`} alt={photo.caption || property.title} width={960} height={720} unoptimized className="project-photo-image" />
                    {photo.isCover ? <span className="project-photo-cover-label">Photo principale</span> : null}
                    {photo.caption ? <p className="project-photo-caption">{photo.caption}</p> : null}
                    {canWrite ? (
                      <>
                        <form action={updateProjectPhotoCaption} className="project-photo-caption-form">
                          <input type="hidden" name="propertyId" value={property.id} />
                          <input type="hidden" name="photoId" value={photo.id} />
                          <label>Légende<input name="caption" defaultValue={photo.caption ?? ""} maxLength={240} /></label>
                          <button type="submit" className="contact-cancel-link">Enregistrer</button>
                        </form>
                        <div className="project-photo-actions">
                          {!photo.isCover ? <form action={setProjectCoverPhoto}><input type="hidden" name="propertyId" value={property.id} /><input type="hidden" name="photoId" value={photo.id} /><button type="submit" className="contact-cancel-link">Définir comme principale</button></form> : null}
                          {!photo.isCover ? <>
                            <form action={moveProjectPhoto}><input type="hidden" name="propertyId" value={property.id} /><input type="hidden" name="photoId" value={photo.id} /><button type="submit" name="direction" value="up" aria-label="Monter la photo" disabled={orderIndex === 0}>Monter</button></form>
                            <form action={moveProjectPhoto}><input type="hidden" name="propertyId" value={property.id} /><input type="hidden" name="photoId" value={photo.id} /><button type="submit" name="direction" value="down" aria-label="Descendre la photo" disabled={orderIndex === reorderablePhotos.length - 1}>Descendre</button></form>
                          </> : null}
                          <details className="project-photo-delete">
                            <summary>Supprimer</summary>
                            <form action={deleteProjectPhoto}><input type="hidden" name="propertyId" value={property.id} /><input type="hidden" name="photoId" value={photo.id} /><p>Confirme la suppression de cette photo.</p><button type="submit" className="company-photo-delete">Confirmer</button></form>
                          </details>
                        </div>
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : <p className="contacts-empty">Aucune photo n’est enregistrée pour ce projet.</p>}
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