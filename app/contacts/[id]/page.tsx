import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addContactNote, deleteContactNote, deleteContactPhoto, saveContactProfile, uploadContactPhoto } from "@/app/contacts/profile-actions";
import { BirthdateAgeFields } from "@/app/contacts/birthdate-age-fields";
import { CountrySelect } from "@/app/components/country-select";
import { UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import { contactProfileOptions, investmentLevelOptions, investorTypeOptions } from "@/lib/contact-options";
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
  invalid: "Vérifie les rubriques saisies et les valeurs sélectionnées.",
  "email-exists": "Cette adresse e-mail est déjà associée à un autre contact.",
  "invalid-note": "Vérifie la date, la nature et le contenu de la note.",
  "confirm-note-delete": "Confirme la suppression de la note.",
  "invalid-photo": "Choisis une image JPEG, PNG ou WebP de moins de 10 Mo.",
  "photo-too-large": "L’image est trop complexe. Choisis une image plus légère.",
};

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function todayInParis() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

function genderOption(value: string | null) {
  const normalized = value?.trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
  if (["masculin", "homme", "male", "m"].includes(normalized)) return "Masculin";
  if (["feminin", "femme", "female", "f"].includes(normalized)) return "Féminin";
  return value ? "Autre" : "";
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
        <Link className="contacts-brand" href="/" aria-label="MANTA CRM, tableau de bord"><span className="brand-mark">M</span><span className="brand-name">MANTA<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/contacts">← Contacts</Link>
      </header>
      <div className="contacts-content contact-profile-page">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL · FICHE CONTACT</p><h1>{[contact.titre, contact.prenom, contact.deuxiemePrenom, contact.nom].filter(Boolean).join(" ")}</h1><p className="contacts-intro">Modifie les informations et consulte l’historique des échanges.</p></div>
          <span className="contacts-total">{contact.notes.length}<small>NOTES</small></span>
        </section>

        {query.notice && messages[query.notice] ? <p className="contacts-message" role="status">{messages[query.notice]}</p> : null}
        {query.error && errors[query.error] ? <p className="contacts-message contacts-message-error" role="alert">{errors[query.error]}</p> : null}

        <section className="contacts-create-section contact-photo-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 · PHOTO</p><h2>Photo de profil</h2></div></div>
          <div className="contact-photo-row">
            {photo?.photoProfil ? <Image src={`/contacts/${id}/photo`} alt={`Photo de ${contact.prenom ?? ""} ${contact.nom}`} width={144} height={144} unoptimized className="contact-profile-photo" /> : <span className="contact-profile-photo-placeholder">{[contact.prenom?.[0], contact.nom[0]].filter(Boolean).join("").toUpperCase()}</span>}
            {canWrite ? <div className="contact-photo-actions">
              <UnsavedChangesForm action={uploadContactPhoto} encType="multipart/form-data"><input type="hidden" name="contactId" value={id} /><label><span className="field-title">Choisir une image</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label><div className="profile-form-actions"><Link className="contact-cancel-link" href="/contacts">Annuler</Link><button className="contact-primary-button" type="submit">Téléverser la photo</button></div></UnsavedChangesForm>
              {photo?.photoProfil ? <form action={deleteContactPhoto}><input type="hidden" name="contactId" value={id} /><button type="submit" className="company-photo-delete">Supprimer la photo</button></form> : null}
            </div> : null}
          </div>
        </section>

        <UnsavedChangesForm action={saveContactProfile} className="contact-profile-form">
          <input type="hidden" name="contactId" value={id} />
          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">02 · IDENTITÉ</p><h2>Informations personnelles</h2></div></div>
            <div className="profile-fields-grid">
              <label><span className="field-title">Titre</span><select name="titre" defaultValue={contact.titre ?? ""}><option value="">Sans titre</option>{titleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label><span className="field-title">Prénom</span><input name="prenom" autoComplete="given-name" defaultValue={contact.prenom ?? ""} required maxLength={80} /></label>
              <label><span className="field-title">Nom</span><input name="nom" autoComplete="family-name" defaultValue={contact.nom} required maxLength={120} /></label>
              <label><span className="field-title">Type d’investisseur</span><select name="typeInvestisseur" defaultValue={contact.typeInvestisseur ?? ""}><option value="">Non renseigné</option>{investorTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <label><span className="field-title">Profil du contact</span><select name="profilContact" defaultValue={contact.profilContact ?? ""}><option value="">Non renseigné</option>{contactProfileOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <label><span className="field-title">Niveau d’investissement</span><select name="niveauInvestissement" defaultValue={contact.niveauInvestissement ?? ""}><option value="">Non renseigné</option>{investmentLevelOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <label><span className="field-title">E-mail principal</span><input name="email" type="email" defaultValue={contact.email ?? ""} maxLength={254} /></label>
              <label><span className="field-title">Téléphone principal</span><input name="telephone" type="tel" defaultValue={contact.telephone ?? ""} maxLength={80} /></label>
              <label><span className="field-title">Secteur</span><input name="secteur" defaultValue={contact.secteur ?? ""} maxLength={80} /></label>
              <label><span className="field-title">Ville</span><input name="ville" defaultValue={contact.ville ?? ""} maxLength={80} /></label>
              <label><span className="field-title">Région / département</span><input name="departement" defaultValue={contact.departement ?? ""} maxLength={20} /></label>
              <label><span className="field-title">Pays</span><CountrySelect name="pays" value={contact.pays} /></label>
              <label><span className="field-title">LinkedIn</span><input name="linkedin" type="url" defaultValue={contact.linkedin ?? ""} maxLength={254} /></label>
              <label><span className="field-title">Facebook</span><input name="facebook" type="url" defaultValue={contact.facebook ?? ""} maxLength={254} placeholder="https://facebook.com/…" /></label>
              <label><span className="field-title">Instagram</span><input name="instagram" type="url" defaultValue={contact.instagram ?? ""} maxLength={254} placeholder="https://instagram.com/…" /></label>
              <label><span className="field-title">X</span><input name="x" type="url" defaultValue={contact.x ?? ""} maxLength={254} placeholder="https://x.com/…" /></label>
              <label><span className="field-title">Prénom intermédiaire</span><input name="deuxiemePrenom" defaultValue={contact.deuxiemePrenom ?? ""} maxLength={120} /></label>
              <label><span className="field-title">Surnom</span><input name="surnom" defaultValue={contact.surnom ?? ""} maxLength={120} /></label>
              <BirthdateAgeFields initialDate={dateInput(contact.dateNaissance)} />
              <label><span className="field-title">Genre</span><select name="genre" defaultValue={genderOption(contact.genre)}><option value="">Non renseigné</option><option value="Masculin">Masculin</option><option value="Féminin">Féminin</option><option value="Autre">Autre</option></select></label>
              <label><span className="field-title">Métier / profession</span><input name="metier" defaultValue={contact.metier ?? ""} maxLength={160} /></label>
              <label><span className="field-title">Langue préférée</span><input name="languePreferee" defaultValue={contact.languePreferee ?? ""} maxLength={40} placeholder="fr, en…" /></label>
            </div>
            <label><span className="field-title">Biographie</span><textarea name="biographie" defaultValue={contact.biographie ?? ""} rows={4} maxLength={20000} /></label>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">03 · ORGANISATIONS</p><h2>Entreprises et fonctions</h2></div></div>
            {companyRows.map((row) => <div className="profile-fields-grid profile-repeat-row" key={row.entrepriseId}>
              <input type="hidden" name="entrepriseId" value={row.entrepriseId} />
              <label><span className="field-title">Entreprise</span><input value={row.nom} readOnly /></label>
              <label><span className="field-title">Type</span><select name="companyType" defaultValue={row.type}><option value="work">Travail</option><option value="school">École</option><option value="other">Autre</option></select></label>
              <label><span className="field-title">Poste</span><input name="companyPoste" defaultValue={row.poste ?? ""} maxLength={120} /></label>
              <label><span className="field-title">Service</span><input name="companyService" defaultValue={row.service ?? ""} maxLength={120} /></label>
              <label><span className="field-title">Date de début</span><input name="companyStart" type="date" defaultValue={dateInput(row.dateDebut)} /></label>
              <label><span className="field-title">Date de fin</span><input name="companyEnd" type="date" defaultValue={dateInput(row.dateFin)} /></label>
            </div>)}
            <div className="profile-fields-grid profile-repeat-row">
              <label><span className="field-title">Nouvelle entreprise</span><select name="entrepriseId" defaultValue=""><option value="">Aucune</option>{entreprises.filter((company) => !companyRows.some((row) => row.entrepriseId === company.id)).map((company) => <option key={company.id} value={company.id}>{company.nom}</option>)}</select></label>
              <label><span className="field-title">Type</span><select name="companyType" defaultValue="work"><option value="work">Travail</option><option value="school">École</option><option value="other">Autre</option></select></label>
              <label><span className="field-title">Poste</span><input name="companyPoste" maxLength={120} /></label><label><span className="field-title">Service</span><input name="companyService" maxLength={120} /></label>
              <label><span className="field-title">Date de début</span><input name="companyStart" type="date" /></label><label><span className="field-title">Date de fin</span><input name="companyEnd" type="date" /></label>
            </div>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">04 · COORDONNÉES</p><h2>Adresses et téléphones supplémentaires</h2></div></div>
            <div className="profile-fields-grid">
              <label><span className="field-title">Type de l’e-mail principal</span><select name="typeEmail" defaultValue={contact.typeEmail ?? "other"}><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label>
              <label><span className="field-title">Libellé de l’e-mail principal</span><input name="libelleEmail" defaultValue={contact.libelleEmail ?? ""} maxLength={80} /></label>
              <div className="profile-phone-fields">
                <label><span className="field-title">Type du téléphone principal</span><select name="typeTelephone" defaultValue={contact.typeTelephone ?? "mobile"}><option value="mobile">Mobile</option><option value="home">Personnel</option><option value="work">Travail</option><option value="fax">Fax</option><option value="other">Autre</option></select></label>
                <label><span className="field-title">Libellé du téléphone principal</span><input name="libelleTelephone" defaultValue={contact.libelleTelephone ?? ""} maxLength={80} /></label>
              </div>
            </div>
            {contact.emails.map((entry) => <div className="profile-fields-grid profile-repeat-row" key={entry.id}><label><span className="field-title">E-mail</span><input name="emailAddress" type="email" defaultValue={entry.address} /></label><label><span className="field-title">Type</span><select name="emailType" defaultValue={entry.type}><option value={entry.type}>{entry.type}</option><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label><span className="field-title">Libellé</span><input name="emailLabel" defaultValue={entry.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label><span className="field-title">Ajouter un e-mail</span><input name="emailAddress" type="email" /></label><label><span className="field-title">Type</span><select name="emailType" defaultValue="other"><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label><span className="field-title">Libellé</span><input name="emailLabel" /></label></div>
            {contact.telephones.map((entry) => <div className="profile-fields-grid profile-repeat-row" key={entry.id}><label><span className="field-title">Téléphone</span><input name="phoneNumber" type="tel" defaultValue={entry.number} /></label><label><span className="field-title">Type</span><select name="phoneType" defaultValue={entry.type}><option value={entry.type}>{entry.type}</option><option value="mobile">Mobile</option><option value="home">Personnel</option><option value="work">Travail</option><option value="fax">Fax</option><option value="other">Autre</option></select></label><label><span className="field-title">Libellé</span><input name="phoneLabel" defaultValue={entry.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label><span className="field-title">Ajouter un téléphone</span><input name="phoneNumber" type="tel" /></label><label><span className="field-title">Type</span><select name="phoneType" defaultValue="mobile"><option value="mobile">Mobile</option><option value="home">Personnel</option><option value="work">Travail</option><option value="fax">Fax</option><option value="other">Autre</option></select></label><label><span className="field-title">Libellé</span><input name="phoneLabel" /></label></div>
            {contact.adresses.map((address) => <div className="profile-fields-grid profile-repeat-row" key={address.id}><label><span className="field-title">Rue</span><input name="addressStreet" defaultValue={address.street ?? ""} /></label><label><span className="field-title">Complément</span><input name="addressExtendedAddress" defaultValue={address.extendedAddress ?? ""} /></label><label><span className="field-title">Boîte postale</span><input name="addressPoBox" defaultValue={address.poBox ?? ""} /></label><label><span className="field-title">Ville</span><input name="addressLocality" defaultValue={address.locality ?? ""} /></label><label><span className="field-title">Région</span><input name="addressRegion" defaultValue={address.region ?? ""} /></label><label><span className="field-title">Code postal</span><input name="addressPostalCode" defaultValue={address.postalCode ?? ""} /></label><label><span className="field-title">Pays</span><CountrySelect name="addressCountry" value={address.country} /></label><label><span className="field-title">Type</span><select name="addressType" defaultValue={address.type}><option value={address.type}>{address.type}</option><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label><span className="field-title">Libellé</span><input name="addressLabel" defaultValue={address.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label><span className="field-title">Ajouter une rue</span><input name="addressStreet" /></label><label><span className="field-title">Complément</span><input name="addressExtendedAddress" /></label><label><span className="field-title">Boîte postale</span><input name="addressPoBox" /></label><label><span className="field-title">Ville</span><input name="addressLocality" /></label><label><span className="field-title">Région</span><input name="addressRegion" /></label><label><span className="field-title">Code postal</span><input name="addressPostalCode" /></label><label><span className="field-title">Pays</span><CountrySelect name="addressCountry" /></label><label><span className="field-title">Type</span><select name="addressType" defaultValue="home"><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option><option value="custom">Personnalisé</option></select></label><label><span className="field-title">Libellé</span><input name="addressLabel" /></label></div>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">05 · PROJETS</p><h2>Intéressé par le projet</h2></div></div>
            <label><span className="field-title">Projets qui intéressent ce contact</span><select name="projectIds" multiple size={Math.min(Math.max(projects.length, 3), 8)} defaultValue={interestedProjectIds}>{projects.map((project) => <option key={project.id} value={project.id}>{project.nom}</option>)}</select></label>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">06 · DATES ET RELATIONS</p><h2>Événements importants</h2></div></div>
            {contact.evenements.map((event) => <div className="profile-fields-grid profile-repeat-row" key={event.id}><label><span className="field-title">Événement</span><input name="eventLabel" defaultValue={event.label} /></label><label><span className="field-title">Date</span><input name="eventDate" type="date" defaultValue={dateInput(event.date)} /></label><label><span className="field-title">Type</span><select name="eventType" defaultValue={event.type}><option value={event.type}>{event.type}</option><option value="birthday">Anniversaire</option><option value="anniversary">Anniversaire de mariage</option><option value="other">Autre</option></select></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label><span className="field-title">Ajouter un événement</span><input name="eventLabel" placeholder="Anniversaire, autre date importante" /></label><label><span className="field-title">Date</span><input name="eventDate" type="date" /></label><label><span className="field-title">Type</span><select name="eventType" defaultValue="other"><option value="birthday">Anniversaire</option><option value="anniversary">Anniversaire de mariage</option><option value="other">Autre</option></select></label></div>
            {contact.relations.map((relation) => <div className="profile-fields-grid profile-repeat-row" key={relation.id}><label><span className="field-title">Relation</span><input name="relationType" defaultValue={relation.type} /></label><label><span className="field-title">Contact lié</span><select name="relatedContactId" defaultValue={relation.relatedContactId ?? ""}><option value="">Personne hors CRM</option>{contacts.map((option) => <option key={option.id} value={option.id}>{[option.prenom, option.nom].filter(Boolean).join(" ")}</option>)}</select></label><label><span className="field-title">Nom de la personne liée</span><input name="relatedName" defaultValue={relation.relatedName ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label><span className="field-title">Ajouter une relation</span><input name="relationType" placeholder="Conjoint, enfant, assistant…" /></label><label><span className="field-title">Contact lié</span><select name="relatedContactId" defaultValue=""><option value="">Personne hors CRM</option>{contacts.map((option) => <option key={option.id} value={option.id}>{[option.prenom, option.nom].filter(Boolean).join(" ")}</option>)}</select></label><label><span className="field-title">Nom de la personne liée</span><input name="relatedName" /></label></div>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">07 · PROFIL</p><h2>Liens, messageries et groupes</h2></div></div>
            {contact.urls.map((item) => <div className="profile-fields-grid profile-repeat-row" key={item.id}><label><span className="field-title">URL</span><input name="urlValue" type="url" defaultValue={item.url} /></label><label><span className="field-title">Type</span><select name="urlType" defaultValue={item.type}><option value={item.type}>{item.type}</option><option value="home">Personnel</option><option value="work">Travail</option><option value="blog">Blog</option><option value="profile">Profil</option><option value="other">Autre</option></select></label><label><span className="field-title">Libellé</span><input name="urlLabel" defaultValue={item.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label><span className="field-title">Ajouter une URL</span><input name="urlValue" type="url" placeholder="https://…" /></label><label><span className="field-title">Type</span><select name="urlType" defaultValue="other"><option value="home">Personnel</option><option value="work">Travail</option><option value="blog">Blog</option><option value="profile">Profil</option><option value="other">Autre</option></select></label><label><span className="field-title">Libellé</span><input name="urlLabel" /></label></div>
            {contact.messageries.map((item) => <div className="profile-fields-grid profile-repeat-row" key={item.id}><label><span className="field-title">Identifiant</span><input name="imUsername" defaultValue={item.username} /></label><label><span className="field-title">Protocole</span><input name="imProtocol" defaultValue={item.protocol ?? ""} /></label><label><span className="field-title">Type</span><select name="imType" defaultValue={item.type}><option value={item.type}>{item.type}</option><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option></select></label><label><span className="field-title">Libellé</span><input name="imLabel" defaultValue={item.label ?? ""} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label><span className="field-title">Ajouter une messagerie</span><input name="imUsername" /></label><label><span className="field-title">Protocole</span><input name="imProtocol" /></label><label><span className="field-title">Type</span><select name="imType" defaultValue="other"><option value="home">Personnel</option><option value="work">Travail</option><option value="other">Autre</option></select></label><label><span className="field-title">Libellé</span><input name="imLabel" /></label></div>
            <div className="profile-fields-grid profile-repeat-row">{contact.groupes.map(({ group }) => <label key={group.id}><span className="field-title">Groupe</span><input name="groupName" defaultValue={group.nom} /></label>)}<label><span className="field-title">Ajouter un groupe</span><input name="groupName" /></label></div>
          </section>

          <section className="contacts-create-section profile-section">
            <div className="contacts-section-heading"><div><p className="section-index">08 · CENTRES D’INTÉRÊT ET COMPÉTENCES</p><h2>Informations complémentaires</h2></div></div>
            <div className="profile-fields-grid profile-repeat-row">{contact.centresInteret.map((item) => <label key={item.id}><span className="field-title">Centre d’intérêt</span><input name="interestValue" defaultValue={item.value} /></label>)}<label><span className="field-title">Ajouter un centre d’intérêt</span><input name="interestValue" /></label></div>
            <div className="profile-fields-grid profile-repeat-row">{contact.competences.map((item) => <label key={item.id}><span className="field-title">Compétence</span><input name="skillValue" defaultValue={item.value} /></label>)}<label><span className="field-title">Ajouter une compétence</span><input name="skillValue" /></label></div>
            {contact.champsPersonnalises.map((item) => <div className="profile-fields-grid profile-repeat-row" key={item.id}><label><span className="field-title">Clé personnalisée</span><input name="customKey" defaultValue={item.key} /></label><label><span className="field-title">Valeur</span><input name="customValue" defaultValue={item.value} /></label></div>)}
            <div className="profile-fields-grid profile-repeat-row"><label><span className="field-title">Nouvelle clé personnalisée</span><input name="customKey" /></label><label><span className="field-title">Valeur</span><input name="customValue" /></label></div>
          </section>
          {canWrite ? <div className="profile-form-actions"><Link className="contact-cancel-link" href="/contacts">Annuler</Link><button className="contact-primary-button profile-save-button" type="submit">Enregistrer la fiche</button></div> : null}
        </UnsavedChangesForm>

        <section className="contacts-list-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">09 · HISTORIQUE</p><h2>Notes de rencontre</h2></div><span className="contacts-list-count">{contact.notes.length}</span></div>
          {canWrite ? <UnsavedChangesForm action={addContactNote} className="contact-note-form"><input type="hidden" name="contactId" value={id} /><label><span className="field-title">Date de rencontre</span><input name="date" type="date" defaultValue={todayInParis()} required /></label><label><span className="field-title">Nature</span><select name="nature" required defaultValue="Telephonique"><option value="Telephonique">Téléphonique</option><option value="Email">Email</option><option value="WhatsApps">WhatsApps</option><option value="Presentiel">Présentiel</option><option value="Autre">Autre</option></select></label><label className="note-content-field"><span className="field-title">Note</span><textarea name="contenu" rows={4} maxLength={20000} required placeholder="Compte rendu de l’échange…" /></label><div className="profile-form-actions"><Link className="contact-cancel-link" href="/contacts">Annuler</Link><button className="contact-primary-button" type="submit">Ajouter la note <span>+</span></button></div></UnsavedChangesForm> : null}
          {contact.notes.length ? <div className="contact-note-list">{contact.notes.map((note) => <article className="contact-note-item" key={note.id}><header><div><b>{noteNatureLabels[note.nature] ?? note.nature}</b><time dateTime={dateInput(note.date)}>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(note.date)}</time></div><small>Par {note.authorUsername}</small></header><p>{note.contenu}</p>{canWrite ? <form action={deleteContactNote}><input type="hidden" name="contactId" value={id} /><input type="hidden" name="noteId" value={note.id} /><label><input name="confirmed" value="yes" type="checkbox" required /> Confirmer la suppression</label><button type="submit">Supprimer la note</button></form> : null}</article>)}</div> : <p className="contacts-empty">Aucune note enregistrée pour ce contact.</p>}
        </section>
      </div>
    </main>
  );
}
