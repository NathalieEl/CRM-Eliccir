import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addContactNote, deleteContactNote, deleteContactPhoto, saveContactProfile, uploadContactPhoto } from "@/app/contacts/profile-actions";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import type { Prisma } from "@/app/generated/prisma/client";

type ContactProfile = Prisma.ContactGetPayload<{
  include: {
    entreprises: { include: { entreprise: true } };
    surnoms: true;
    emails: true;
    telephones: true;
    adresses: true;
    evenements: true;
    relations: { include: { relatedContact: true } };
    urls: true;
    messageries: true;
    groupes: { include: { group: true } };
    champsPersonnalises: true;
    centresInteret: true;
    competences: true;
    projets: { include: { project: true } };
    notes: { include: { author: true } };
  };
}>;

const noteNatureLabels: Record<string, string> = {
  Telephonique: "Téléphonique",
  Email: "Email",
  WhatsApps: "WhatsApps",
  Presentiel: "Présentiel",
  Autre: "Autre",
};

const messages: Record<string, string> = {
  updated: "La fiche contact a été mise à jour.",
  "note-created": "La note a été ajoutée.",
  "note-deleted": "La note a été supprimée.",
  "photo-updated": "La photo de profil a été mise à jour.",
  "photo-deleted": "La photo de profil a été supprimée.",
};

const errors: Record<string, string> = {
  invalid: "Vérifiez les rubriques saisies et les valeurs sélectionnées.",
  "email-exists": "Cette adresse e-mail est déjà associée à un autre contact.",
  "invalid-note": "Vérifiez la date, la nature et le contenu de la note.",
  "confirm-note-delete": "Confirmez la suppression de la note.",
  "invalid-photo": "Choisissez une image JPEG, PNG ou WebP de moins de 10 Mo.",
  "photo-too-large": "L’image est trop complexe. Choisissez une image plus légère.",
};

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function todayInParis() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export default async function ContactProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requirePermission("crm.read");
  const canWrite = hasPermission(user.role, "crm.write");
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [contactData, projects, contacts, entreprises, photo, titleOptions] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        entreprises: { include: { entreprise: true } },
        surnoms: true,
        emails: true,
        telephones: true,
        adresses: true,
        evenements: { orderBy: { date: "asc" } },
        relations: { include: { relatedContact: true } },
        urls: true,
        messageries: true,
        groupes: { include: { group: true } },
        champsPersonnalises: true,
        centresInteret: true,
        competences: true,
        projets: { include: { project: true } },
        notes: { include: { author: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
      },
    }),
    prisma.project.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    prisma.contact.findMany({ where: { id: { not: id } }, select: { id: true, prenom: true, nom: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    prisma.contact.findUnique({ where: { id }, select: { photoProfil: true } }),
    prisma.lookupOption.findMany({ where: { category: "contact_title", active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }], select: { value: true, label: true } }),
  ]);
  const contact: ContactProfile | null = contactData;
  if (!contact) notFound();

  const companyRows = contact.entreprises.map(({ entreprise, poste, service, dateDebut, dateFin, type }) => ({ entrepriseId: entreprise.id, nom: entreprise.nom, poste, service, dateDebut, dateFin, type }));
  const interestedProjectIds = contact.projets.filter(({ interesse }) => interesse).map(({ projectId }) => projectId);

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/contacts">← Contacts</Link>
      </header>
      <div className="contacts-content contact-profile-page">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL · FICHE CONTACT</p><h1>{[contact.titre, contact.prenom, contact.deuxiemePrenom, contact.nom].filter(Boolean).join(" ")}</h1><p className="contacts-intro">Modifiez les informations et consultez l’historique des échanges.</p></div>
          <span className="contacts-total">{contact.notes.length}<small>NOTES</small></span>
        </section>

        {query.notice && messages[query.notice] ? <p className="contacts-message" role="status">{messages[query.notice]}</p> : null}
        {query.error && errors[query.error] ? <p className="contacts-message contacts-message-error" role="alert">{errors[query.error]}</p> : null}

        <section className="contacts-create-section contact-photo-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 · PHOTO</p><h2>Photo de profil</h2></div></div>
          <div className="contact-photo-row">
            {photo?.photoProfil ? <Image src={`/contacts/${id}/photo`} alt={`Photo de ${contact.prenom ?? ""} ${contact.nom}`} width={144} height={144} unoptimized className="contact-profile-photo" /> : <span className="contact-profile-photo-placeholder">{[contact.prenom?.[0], contact.nom[0]].filter(Boolean).join("").toUpperCase()}</span>}
            {canWrite ? <div className="contact-photo-actions">
              <form action={uploadContactPhoto} encType="multipart/form-data"><input type="hidden" name="contactId" value={id} /><label>Choisir une image<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label><button className="contact-primary-button" type="submit">Téléverser la photo</button></form>
              {photo?.photoProfil ? <form action={deleteContactPhoto}><input type="hidden" name="contactId" value={id} /><button type="submit" className="company-photo-delete">Supprimer la photo</button></form> : null}
            </div> : null}
          </div>
        </section>

        <form action={saveContactProfile} className="contact-profile-form">
          <input type="hidden" name="contactId" value={id} />
          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">02 · IDENTITÉ</p><h2>Informations personnelles</h2></div></div>
            <div className="profile-fields-grid">
              <label>Titre<select name="titre" defaultValue={contact.titre ?? ""}><option value="">Sans titre</option>{titleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label>Prénom<input name="prenom" autoComplete="given-name" defaultValue={contact.prenom ?? ""} required maxLength={80} /></label>
              <label>Nom<input name="nom" autoComplete="family-name" defaultValue={contact.nom} required maxLength={120} /></label>
              <label>E-mail principal<input name="email" type="email" defaultValue={contact.email ?? ""} maxLength={254} /></label>
              <label>Téléphone principal<input name="telephone" type="tel" defaultValue={contact.telephone ?? ""} maxLength={80} /></label>
              <label>Secteur<input name="secteur" defaultValue={contact.secteur ?? ""} maxLength={80} /></label>
              <label>Ville<input name="ville" defaultValue={contact.ville ?? ""} maxLength={80} /></label>
              <label>Région / département<input name="departement" defaultValue={contact.departement ?? ""} maxLength={20} /></label>
              <label>Pays<input name="pays" defaultValue={contact.pays ?? ""} maxLength={80} /></label>
              <label>Source d’acquisition<input name="sourceAcquisition" defaultValue={contact.sourceAcquisition ?? ""} maxLength={120} /></label>
              <label>Statut<input name="statut" defaultValue={contact.statut ?? ""} maxLength={80} /></label>
              <label>LinkedIn<input name="linkedin" type="url" defaultValue={contact.linkedin ?? ""} maxLength={254} /></label>
              <label>Prénom intermédiaire<input name="deuxiemePrenom" defaultValue={contact.deuxiemePrenom ?? ""} maxLength={120} /></label>
              <label>Surnom<input name="surnom" defaultValue={contact.surnom ?? ""} maxLength={120} /></label>
              <label>Date de naissance<input name="dateNaissance" type="date" defaultValue={dateInput(contact.dateNaissance)} /></label>
              <label>Genre<input name="genre" defaultValue={contact.genre ?? ""} maxLength={80} /></label>
              <label>Métier / profession<input name="metier" defaultValue={contact.metier ?? ""} maxLength={160} /></label>
              <label>Langue préférée<input name="languePreferee" defaultValue={contact.languePreferee ?? ""} maxLength={40} placeholder="fr, en…" /></label>
              <label>Tranche d’âge<input name="trancheAge" defaultValue={contact.trancheAge ?? ""} maxLength={40} placeholder="ex. 35–44" /></label>
            </div>
            <label>Biographie<textarea name="biographie" defaultValue={contact.biographie ?? ""} rows={4} maxLength={20000} /></label>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">03 · ORGANISATIONS</p><h2>Entreprises et fonctions</h2></div></div>
            {companyRows.map((row) => <div className="profile-fields-grid profile-repeat-row" key={row.entrepriseId}>
              <input type="hidden" name="entrepriseId" value={row.entrepriseId} />
              <label>Entreprise<input value={row.nom} readOnly /></label>
              <label>Type<select name="companyType" defaultValue={row.type}><option value="work">Travail</option><option value="school">École</option><option value="other">Autre</option></select></label>
              <label>Poste<input name="companyPoste" defaultValue={row.poste ?? ""} maxLength={120} /></label>
              <label>Service<input name="companyService" defaultValue={row.service ?? ""} maxLength={120} /></label>
              <label>Date de début<input name="companyStart" type="date" defaultValue={dateInput(row.dateDebut)} /></label>
              <label>Date de fin<input name="companyEnd" type="date" defaultValue={dateInput(row.dateFin)} /></label>
            </div>)}
            <div className="profile-fields-grid profile-repeat-row">
              <label>Nouvelle entreprise<select name="entrepriseId" defaultValue=""><option value="">Aucune</option>{entreprises.filter((company) => !companyRows.some((row) => row.entrepriseId === company.id)).map((company) => <option key={company.id} value={company.id}>{company.nom}</option>)}</select></label>
              <label>Type<select name="companyType" defaultValue="work"><option value="work">Travail</option><option value="school">École</option><option value="other">Autre</option></select></label>
              <label>Poste<input name="companyPoste" maxLength={120} /></label><label>Service<input name="companyService" maxLength={120} /></label>
              <label>Date de début<input name="companyStart" type="date" /></label><label>Date de fin<input name="companyEnd" type="date" /></label>
            </div>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">04 · COORDONNÉES</p><h2>Adresses et téléphones supplémentaires</h2></div></div>
            <div className="profile-fields-grid"><label>Type de l’e-mail principal<select name="typeEmail" defaultValue={contact.typeEmail ?? "other"}><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label>Libellé de l’e-mail principal<input name="libelleEmail" defaultValue={contact.libelleEmail ?? ""} maxLength={80} /></label><label>Type du téléphone principal<select name="typeTelephone" defaultValue={contact.typeTelephone ?? "mobile"}><option value="mobile">Mobile</option><option value="home">Personnel</option><option value="work">Travail</option><option value="fax">Fax</option><option value="other">Autre</option></select></label><label>Libellé du téléphone principal<input name="libelleTelephone" defaultValue={contact.libelleTelephone ?? ""} maxLength={80} /></label></div>
            {contact.emails.map((entry) => <div className="profile-fields-grid profile-repeat-row" key={entry.id}><label>E-mail<input name="emailAddress" type="email" defaultValue={entry.address} /></label><label>Type<select name="emailType" defaultValue={entry.type}><option value={entry.type}>{entry.type}</option><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label>Libellé<input name="emailLabel" defaultValue={entry.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label>Ajouter un e-mail<input name="emailAddress" type="email" /></label><label>Type<select name="emailType" defaultValue="other"><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label>Libellé<input name="emailLabel" /></label></div>
            {contact.telephones.map((entry) => <div className="profile-fields-grid profile-repeat-row" key={entry.id}><label>Téléphone<input name="phoneNumber" type="tel" defaultValue={entry.number} /></label><label>Type<select name="phoneType" defaultValue={entry.type}><option value={entry.type}>{entry.type}</option><option value="mobile">Mobile</option><option value="home">Personnel</option><option value="work">Travail</option><option value="fax">Fax</option><option value="other">Autre</option></select></label><label>Libellé<input name="phoneLabel" defaultValue={entry.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label>Ajouter un téléphone<input name="phoneNumber" type="tel" /></label><label>Type<select name="phoneType" defaultValue="mobile"><option value="mobile">Mobile</option><option value="home">Personnel</option><option value="work">Travail</option><option value="fax">Fax</option><option value="other">Autre</option></select></label><label>Libellé<input name="phoneLabel" /></label></div>
            {contact.adresses.map((address) => <div className="profile-fields-grid profile-repeat-row" key={address.id}><label>Rue<input name="addressStreet" defaultValue={address.street ?? ""} /></label><label>Complément<input name="addressExtendedAddress" defaultValue={address.extendedAddress ?? ""} /></label><label>Boîte postale<input name="addressPoBox" defaultValue={address.poBox ?? ""} /></label><label>Ville<input name="addressLocality" defaultValue={address.locality ?? ""} /></label><label>Région<input name="addressRegion" defaultValue={address.region ?? ""} /></label><label>Code postal<input name="addressPostalCode" defaultValue={address.postalCode ?? ""} /></label><label>Pays<input name="addressCountry" defaultValue={address.country ?? ""} /></label><label>Type<select name="addressType" defaultValue={address.type}><option value={address.type}>{address.type}</option><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label>Libellé<input name="addressLabel" defaultValue={address.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label>Ajouter une rue<input name="addressStreet" /></label><label>Complément<input name="addressExtendedAddress" /></label><label>Boîte postale<input name="addressPoBox" /></label><label>Ville<input name="addressLocality" /></label><label>Région<input name="addressRegion" /></label><label>Code postal<input name="addressPostalCode" /></label><label>Pays<input name="addressCountry" /></label><label>Type<select name="addressType" defaultValue="home"><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label>Libellé<input name="addressLabel" /></label></div>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">05 · PROJETS</p><h2>Intéressé par le projet</h2></div></div>
            <label>Projets qui intéressent ce contact<select name="projectIds" multiple size={Math.min(Math.max(projects.length, 3), 8)} defaultValue={interestedProjectIds}>{projects.map((project) => <option key={project.id} value={project.id}>{project.nom}</option>)}</select></label>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">06 · DATES ET RELATIONS</p><h2>Événements importants</h2></div></div>
            {contact.evenements.map((event) => <div className="profile-fields-grid profile-repeat-row" key={event.id}><label>Événement<input name="eventLabel" defaultValue={event.label} /></label><label>Date<input name="eventDate" type="date" defaultValue={dateInput(event.date)} /></label><label>Type<select name="eventType" defaultValue={event.type}><option value={event.type}>{event.type}</option><option value="birthday">Anniversaire</option><option value="anniversary">Anniversaire de mariage</option><option value="other">Autre</option></select></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label>Ajouter un événement<input name="eventLabel" placeholder="Anniversaire, autre date importante" /></label><label>Date<input name="eventDate" type="date" /></label><label>Type<select name="eventType" defaultValue="other"><option value="birthday">Anniversaire</option><option value="anniversary">Anniversaire de mariage</option><option value="other">Autre</option></select></label></div>
            {contact.relations.map((relation) => <div className="profile-fields-grid profile-repeat-row" key={relation.id}><label>Relation<input name="relationType" defaultValue={relation.type} /></label><label>Contact lié<select name="relatedContactId" defaultValue={relation.relatedContactId ?? ""}><option value="">Personne hors CRM</option>{contacts.map((option) => <option key={option.id} value={option.id}>{[option.prenom, option.nom].filter(Boolean).join(" ")}</option>)}</select></label><label>Nom de la personne liée<input name="relatedName" defaultValue={relation.relatedName ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label>Ajouter une relation<input name="relationType" placeholder="Conjoint, enfant, assistant…" /></label><label>Contact lié<select name="relatedContactId" defaultValue=""><option value="">Personne hors CRM</option>{contacts.map((option) => <option key={option.id} value={option.id}>{[option.prenom, option.nom].filter(Boolean).join(" ")}</option>)}</select></label><label>Nom de la personne liée<input name="relatedName" /></label></div>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">07 · PROFIL</p><h2>Liens, messageries et groupes</h2></div></div>
            {contact.urls.map((item) => <div className="profile-fields-grid profile-repeat-row" key={item.id}><label>URL<input name="urlValue" type="url" defaultValue={item.url} /></label><label>Type<select name="urlType" defaultValue={item.type}><option value={item.type}>{item.type}</option><option value="home">Personnel</option><option value="work">Travail</option><option value="blog">Blog</option><option value="profile">Profil</option><option value="other">Autre</option></select></label><label>Libellé<input name="urlLabel" defaultValue={item.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label>Ajouter une URL<input name="urlValue" type="url" placeholder="https://…" /></label><label>Type<select name="urlType" defaultValue="other"><option value="home">Personnel</option><option value="work">Travail</option><option value="blog">Blog</option><option value="profile">Profil</option><option value="other">Autre</option></select></label><label>Libellé<input name="urlLabel" /></label></div>
            {contact.messageries.map((item) => <div className="profile-fields-grid profile-repeat-row" key={item.id}><label>Identifiant<input name="imUsername" defaultValue={item.username} /></label><label>Protocole<input name="imProtocol" defaultValue={item.protocol ?? ""} /></label><label>Type<select name="imType" defaultValue={item.type}><option value={item.type}>{item.type}</option><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option></select></label><label>Libellé<input name="imLabel" defaultValue={item.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label>Ajouter une messagerie<input name="imUsername" /></label><label>Protocole<input name="imProtocol" /></label><label>Type<select name="imType" defaultValue="other"><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option></select></label><label>Libellé<input name="imLabel" /></label></div>
            <div className="profile-fields-grid profile-repeat-row">{contact.groupes.map(({ group }) => <label key={group.id}>Groupe<input name="groupName" defaultValue={group.nom} /></label>)}<label>Ajouter un groupe<input name="groupName" /></label></div>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">08 · CENTRES D’INTÉRÊT ET COMPÉTENCES</p><h2>Informations complémentaires</h2></div></div>
            <div className="profile-fields-grid profile-repeat-row">{contact.centresInteret.map((item) => <label key={item.id}>Centre d’intérêt<input name="interestValue" defaultValue={item.value} /></label>)}<label>Ajouter un centre d’intérêt<input name="interestValue" /></label></div>
            <div className="profile-fields-grid profile-repeat-row">{contact.competences.map((item) => <label key={item.id}>Compétence<input name="skillValue" defaultValue={item.value} /></label>)}<label>Ajouter une compétence<input name="skillValue" /></label></div>
            {contact.champsPersonnalises.map((item) => <div className="profile-fields-grid profile-repeat-row" key={item.id}><label>Clé personnalisée<input name="customKey" defaultValue={item.key} /></label><label>Valeur<input name="customValue" defaultValue={item.value} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label>Nouvelle clé personnalisée<input name="customKey" /></label><label>Valeur<input name="customValue" /></label></div>
          </section>
          {canWrite ? <div className="profile-form-actions"><Link className="contact-cancel-link" href="/contacts">Annuler</Link><button className="contact-primary-button profile-save-button" type="submit">Enregistrer la fiche</button></div> : null}
        </form>

        <section className="contacts-list-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">09 · HISTORIQUE</p><h2>Notes de rencontre</h2></div><span className="contacts-list-count">{contact.notes.length}</span></div>
          {canWrite ? <form action={addContactNote} className="contact-note-form"><input type="hidden" name="contactId" value={id} /><label>Date de rencontre<input name="date" type="date" defaultValue={todayInParis()} required /></label><label>Nature<select name="nature" required defaultValue="Telephonique"><option value="Telephonique">Téléphonique</option><option value="Email">Email</option><option value="WhatsApps">WhatsApps</option><option value="Presentiel">Présentiel</option><option value="Autre">Autre</option></select></label><label className="note-content-field">Note<textarea name="contenu" rows={4} maxLength={20000} required placeholder="Compte rendu de l’échange…" /></label><button className="contact-primary-button" type="submit">Ajouter la note <span>+</span></button></form> : null}
          {contact.notes.length ? <div className="contact-note-list">{contact.notes.map((note) => <article className="contact-note-item" key={note.id}><header><div><b>{noteNatureLabels[note.nature] ?? note.nature}</b><time dateTime={dateInput(note.date)}>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(note.date)}</time></div><small>Par {note.authorUsername}</small></header><p>{note.contenu}</p>{canWrite ? <form action={deleteContactNote}><input type="hidden" name="contactId" value={id} /><input type="hidden" name="noteId" value={note.id} /><label><input name="confirmed" value="yes" type="checkbox" required /> Confirmer la suppression</label><button type="submit">Supprimer la note</button></form> : null}</article>)}</div> : <p className="contacts-empty">Aucune note enregistrée pour ce contact.</p>}
        </section>
      </div>
    </main>
  );
}
