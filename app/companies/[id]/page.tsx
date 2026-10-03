import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEntreprise, linkContactToEntreprise, unlinkContactFromEntreprise, updateEntreprise } from "@/app/companies/actions";
import { CompanyFields } from "@/app/companies/company-fields";
import { UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import type { Prisma } from "@/app/generated/prisma/client";

type CompanyProfile = Prisma.EntrepriseGetPayload<{
  include: {
    contacts: { include: { contact: true } };
    projects: { include: { contacts: { include: { contact: true } } } };
    activities: { include: { contact: true; responsable: true } };
    actionItems: { include: { contact: true; responsable: true } };
  };
}>;

type CompanyPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

const notices: Record<string, string> = {
  updated: "Les informations de l’entreprise ont été enregistrées.",
  linked: "Le contact a été rattaché à l’entreprise.",
  unlinked: "Le contact a été détaché de l’entreprise.",
};

const errors: Record<string, string> = {
  invalid: "Vérifie les coordonnées et les dates saisies.",
  exists: "Une entreprise porte déjà ce nom.",
  "not-found": "Cette entreprise n’existe plus.",
  "confirm-unlink": "Confirme le retrait du contact.",
  "invalid-link": "Sélectionne une entreprise et un contact valides.",
};

function contactName(contact: { prenom: string | null; nom: string }) {
  return [contact.prenom, contact.nom].filter(Boolean).join(" ");
}

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date) : "—";
}

export default async function CompanyPage({ params, searchParams }: CompanyPageProps) {
  const user = await requirePermission("crm.read");
  const canWrite = hasPermission(user.role, "crm.write");
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [entrepriseData, contacts] = await Promise.all([
    prisma.entreprise.findUnique({
      where: { id },
      include: {
        contacts: { include: { contact: true } },
        projects: { include: { contacts: { include: { contact: true } } }, orderBy: { updatedAt: "desc" } },
        activities: { include: { contact: true, responsable: true }, orderBy: [{ date: "desc" }, { updatedAt: "desc" }] },
        actionItems: { include: { contact: true, responsable: true }, orderBy: [{ dateEcheance: "asc" }, { updatedAt: "desc" }] },
      },
    }),
    prisma.contact.findMany({
      select: { id: true, prenom: true, nom: true, email: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
  ]);
  const entreprise: CompanyProfile | null = entrepriseData;
  if (!entreprise) notFound();

  const attachedContactIds = new Set(entreprise.contacts.map(({ contactId }) => contactId));
  const availableContacts = contacts.filter((contact) => !attachedContactIds.has(contact.id));

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/companies">← Entreprises</Link>
      </header>
      <div className="contacts-content company-profile-page">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL · FICHE ENTREPRISE</p><h1>{entreprise.nom}</h1><p className="contacts-intro">Coordonnées, contacts et suivi associés à cette entreprise.</p></div>
          <span className="contacts-total">{entreprise.contacts.length}<small>CONTACTS</small></span>
        </section>

        {query.notice && notices[query.notice] ? <p className="contacts-message" role="status">{notices[query.notice]}</p> : null}
        {query.error && errors[query.error] ? <p className="contacts-message contacts-message-error" role="alert">{errors[query.error]}</p> : null}

        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 · COORDONNÉES</p><h2>Informations de l’entreprise</h2></div></div>
          <dl className="company-profile-summary">
            <dt>E-mail</dt><dd>{entreprise.email || "—"}</dd>
            <dt>Téléphone</dt><dd>{entreprise.telephone || "—"}</dd>
            <dt>Site web</dt><dd>{entreprise.siteWeb ? <a href={entreprise.siteWeb} target="_blank" rel="noreferrer">{entreprise.siteWeb}</a> : "—"}</dd>
            <dt>Secteur</dt><dd>{entreprise.secteur || "—"}</dd>
            <dt>Adresse</dt><dd>{entreprise.adresse || "—"}</dd>
            <dt>Ville</dt><dd>{entreprise.ville || "—"}</dd>
            <dt>Département</dt><dd>{entreprise.departement || "—"}</dd>
            <dt>Pays</dt><dd>{entreprise.pays || "—"}</dd>
            <dt>Créée le</dt><dd>{formatDate(entreprise.createdAt)}</dd>
            <dt>Modifiée le</dt><dd>{formatDate(entreprise.updatedAt)}</dd>
          </dl>
        </section>

        {canWrite ? <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">02 · MODIFICATION</p><h2>Modifier les coordonnées</h2></div></div>
          <UnsavedChangesForm action={updateEntreprise} className="company-profile-form">
            <input type="hidden" name="id" value={entreprise.id} />
            <div className="profile-fields-grid"><CompanyFields entreprise={entreprise} /></div>
            <div className="profile-form-actions"><Link className="contact-cancel-link" href="/companies">Annuler</Link><button className="contact-primary-button profile-save-button" type="submit">Enregistrer</button></div>
          </UnsavedChangesForm>
        </section> : null}

        <section className="contacts-list-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">03 · RELATIONS</p><h2>Contacts rattachés</h2></div><span className="contacts-list-count">{entreprise.contacts.length}</span></div>
          {entreprise.contacts.length ? <div className="contacts-records-wrap"><table className="contacts-records company-profile-table"><thead><tr><th>CONTACT</th><th>POSTE</th><th>SERVICE</th><th>TYPE</th><th>DÉBUT</th><th>FIN</th><th>GESTION</th></tr></thead><tbody>{entreprise.contacts.map(({ contact, poste, service, type, dateDebut, dateFin }) => <tr key={contact.id}><td><b>{contactName(contact)}</b><small>{contact.email || "Aucun e-mail"}</small></td><td>{poste || "—"}</td><td>{service || "—"}</td><td>{type}</td><td>{formatDate(dateDebut)}</td><td>{formatDate(dateFin)}</td><td>{canWrite ? <form action={unlinkContactFromEntreprise} className="company-unlink-row"><input type="hidden" name="entrepriseId" value={entreprise.id} /><input type="hidden" name="contactId" value={contact.id} /><label><input name="confirmed" type="checkbox" value="yes" required /> Confirmer</label><button type="submit">Détacher</button></form> : "—"}</td></tr>)}</tbody></table></div> : <p className="contacts-empty">Aucun contact rattaché.</p>}
          {canWrite ? <UnsavedChangesForm action={linkContactToEntreprise} className="company-link-form company-link-form-full"><input type="hidden" name="entrepriseId" value={entreprise.id} /><label>Ajouter un contact<select name="contactId" required defaultValue=""><option value="" disabled>Choisir un contact</option>{availableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contactName(contact)}{contact.email ? ` · ${contact.email}` : ""}</option>)}</select></label><label>Poste dans l’entreprise<input name="poste" maxLength={120} placeholder="Consultant, conseiller…" /></label><Link className="contact-cancel-link" href={`/companies/${entreprise.id}`}>Annuler</Link><button className="contact-primary-button" type="submit">Rattacher le contact</button></UnsavedChangesForm> : null}
        </section>

        <section className="contacts-list-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">04 · ACTIVITÉ</p><h2>Projets associés</h2></div><span className="contacts-list-count">{entreprise.projects.length}</span></div>
          {entreprise.projects.length ? <div className="contacts-records-wrap"><table className="contacts-records company-profile-table"><thead><tr><th>PROJET</th><th>STATUT</th><th>PROGRESSION</th><th>BUDGET</th><th>CONTACTS INTÉRESSÉS</th></tr></thead><tbody>{entreprise.projects.map((project) => <tr key={project.id}><td><b>{project.nom}</b><small>{[project.ville, project.pays].filter(Boolean).join(" · ") || "—"}</small></td><td>{project.statut}</td><td>{project.progression}%</td><td>{project.budget || "—"}</td><td>{project.contacts.map(({ contact }) => contactName(contact)).join(", ") || "—"}</td></tr>)}</tbody></table></div> : <p className="contacts-empty">Aucun projet associé.</p>}
          <div className="company-activity-counts"><span>{entreprise.activities.length} activité{entreprise.activities.length === 1 ? "" : "s"}</span><span>{entreprise.actionItems.length} action{entreprise.actionItems.length === 1 ? "" : "s"}</span></div>
        </section>

        {canWrite ? <section className="contacts-list-section company-delete-section"><h2>Suppression</h2><form action={deleteEntreprise} className="company-delete-form-full"><input type="hidden" name="id" value={entreprise.id} /><label><input name="confirmed" value="yes" type="checkbox" required /> Confirmer la suppression de l’entreprise</label><button type="submit">Supprimer définitivement</button></form></section> : null}
      </div>
    </main>
  );
}
