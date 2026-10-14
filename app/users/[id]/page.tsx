import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleLabels, type UserRole } from "@/lib/permissions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(value);
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, prenom: true, nom: true, email: true, username: true, role: true, active: true, mustChangePassword: true, createdAt: true, updatedAt: true },
  });
  if (!user) notFound();

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">Eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/users">← Utilisateurs</Link>
      </header>
      <div className="contacts-content contact-profile-page">
        <section className="contacts-title-row"><div><p className="section-index">ESPACE DE TRAVAIL · FICHE UTILISATEUR</p><h1>{[user.prenom, user.nom].filter(Boolean).join(" ") || user.username}</h1><p className="contacts-intro">Compte consulté en lecture seule.</p></div></section>
        <section className="contacts-create-section profile-section">
          <div className="contacts-section-heading"><div><p className="section-index">IDENTITÉ</p><h2>Informations du compte</h2></div></div>
          <dl className="user-profile-summary">
            <dt>Prénom</dt><dd>{user.prenom || "—"}</dd>
            <dt>Nom</dt><dd>{user.nom || "—"}</dd>
            <dt>E-mail</dt><dd>{user.email || "—"}</dd>
            <dt>Nom d’utilisateur</dt><dd>{user.username}</dd>
            <dt>Profil</dt><dd>{roleLabels[user.role as UserRole] ?? roleLabels.member}</dd>
            <dt>État</dt><dd>{user.active ? "Actif" : "Désactivé"}</dd>
            <dt>Mot de passe</dt><dd>{user.mustChangePassword ? "À définir via le lien reçu par e-mail" : "Défini"}</dd>
            <dt>Créé le</dt><dd>{formatDate(user.createdAt)}</dd>
            <dt>Modifié le</dt><dd>{formatDate(user.updatedAt)}</dd>
          </dl>
        </section>
      </div>
    </main>
  );
}