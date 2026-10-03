import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const actionLabels: Record<string, string> = {
  created: "Création",
  updated: "Modification",
  deleted: "Suppression",
  reset_2fa: "Réinitialisation 2FA",
};

const entityLabels: Record<string, string> = {
  user: "Utilisateur",
};

export default async function AuditPage() {
  await requireAdmin();
  const entries = await prisma.auditLog.findMany({ take: 100, orderBy: { createdAt: "desc" } });

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>
      <div className="contacts-content">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL <i>·</i> SÉCURITÉ</p><h1>Journal d’audit</h1><p className="contacts-intro">Les dernières actions d’administration enregistrées dans le CRM.</p></div>
          <span className="contacts-total">{entries.length}<small>ÉVÉNEMENTS</small></span>
        </section>
        <section className="contacts-list-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 <i>·</i> ACTIVITÉ</p><h2>Historique récent</h2></div></div>
          {entries.length === 0 ? <p className="contacts-empty">Aucun événement enregistré.</p> : (
            <div className="contacts-records-wrap"><table className="contacts-records"><thead><tr><th>DATE</th><th>ACTEUR</th><th>ACTION</th><th>OBJET</th><th>DÉTAILS</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td><time dateTime={entry.createdAt.toISOString()}>{entry.createdAt.toLocaleString("fr-FR")}</time></td><td>{entry.actorUsername}</td><td>{actionLabels[entry.action] ?? entry.action}</td><td>{entityLabels[entry.entity] ?? entry.entity}</td><td>{entry.details ?? "—"}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </main>
  );
}