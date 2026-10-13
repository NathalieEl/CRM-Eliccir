import Link from "next/link";
import { submitSupportRequest } from "@/app/support/actions";
import { requirePermission } from "@/lib/permissions";

type SupportPageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function SupportPage({ searchParams }: SupportPageProps) {
  await requirePermission("crm.read");
  const params = await searchParams;

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord">
          <span className="brand-mark">E</span>
          <span className="brand-name">Eliccir<small>CRM</small></span>
        </Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>
      <div className="contacts-content">
        <section className="contacts-title-row">
          <div>
            <p className="section-index">ESPACE DE TRAVAIL <i>·</i> RETOUR UTILISATEUR</p>
            <h1>Signaler un problème ou poser une question</h1>
            <p className="contacts-intro">Choisis un sujet et décris ce que tu rencontres ou souhaites améliorer.</p>
          </div>
        </section>

        {params.error === "invalid" ? <p className="contacts-message contacts-message-error" role="alert">Choisis une catégorie et saisis les détails de ta demande.</p> : null}
        {params.notice === "sent" ? <p className="contacts-message" role="status">Ta demande est enregistrée et envoyée par e-mail à marc.issan@gmail.com.</p> : null}
        {params.notice === "email-pending" ? <p className="contacts-message contacts-message-error" role="alert">Ta demande est enregistrée, mais l’e-mail n’a pas pu être envoyé. L’administrateur doit vérifier la configuration SMTP.</p> : null}

        <section className="contacts-create-section">
          <form action={submitSupportRequest} className="contact-form support-form">
            <fieldset className="support-category-set">
              <legend>Type de demande</legend>
              <label><input name="category" type="radio" value="problem" required />Problèmes/Bugs</label>
              <label><input name="category" type="radio" value="improvement" required />Modifications/Améliorations</label>
            </fieldset>
            <label className="support-details-field">Détails<textarea name="details" rows={8} maxLength={10000} required placeholder="Décris le problème rencontré ou l’amélioration souhaitée…" /></label>
            <p className="support-privacy-note">Ton nom d’utilisateur et la date/heure d’envoi seront ajoutés automatiquement. Ta demande sera conservée dans le journal d’audit. N’inscris aucun mot de passe ni code de sécurité dans le message.</p>
            <button className="contact-primary-button" type="submit">Envoyer le message <span>↗</span></button>
          </form>
        </section>
      </div>
    </main>
  );
}