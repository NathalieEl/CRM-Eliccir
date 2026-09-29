import Link from "next/link";
import { createUser, deleteUser } from "@/app/users/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ created?: string; username?: string; error?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>
      <div className="contacts-content">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL <i>·</i> ADMINISTRATION</p><h1>Utilisateurs</h1><p className="contacts-intro">Créez les accès de votre équipe et activez leur double authentification.</p></div>
          <span className="contacts-total">{users.length}<small>COMPTES</small></span>
        </section>

        {params.error === "invalid" && <p className="auth-error" role="alert">Le nom doit contenir 3 à 40 caractères et le mot de passe au moins 8 caractères.</p>}
        {params.error === "exists" && <p className="auth-error" role="alert">Ce nom d’utilisateur existe déjà.</p>}
        {params.created && params.username && <section className="users-setup-note"><h2>Compte créé pour {params.username}</h2><p>Ajoutez ce secret dans l’application d’authentification de l’utilisateur. Il ne sera plus affiché après cette page.</p><code>{params.created}</code></section>}

        <section className="contacts-create-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 <i>·</i> NOUVEAU</p><h2>Créer un accès</h2></div></div>
          <form action={createUser} className="contact-form">
            <label>Nom d’utilisateur<input name="username" required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" placeholder="ex. sophie.laurent" /></label>
            <label>Mot de passe temporaire<input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="8 caractères minimum" /></label>
            <label>Rôle<select name="role" defaultValue="member"><option value="member">Membre</option><option value="admin">Administrateur</option></select></label>
            <button className="contact-primary-button" type="submit">Créer le compte <span>+</span></button>
          </form>
        </section>

        <section className="contacts-list-section">
          <div className="contacts-section-heading"><div><p className="section-index">02 <i>·</i> ACCÈS ACTIFS</p><h2>Comptes existants</h2></div></div>
          <div className="users-table-wrap"><table className="contacts-records"><thead><tr><th>UTILISATEUR</th><th>RÔLE</th><th>ÉTAT</th><th>GESTION</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><b>{user.username}</b><small>2FA activée</small></td><td>{user.role === "admin" ? "Administrateur" : "Membre"}</td><td>{user.active ? "Actif" : "Désactivé"}</td><td><form action={deleteUser}><input type="hidden" name="id" value={user.id} /><button className="user-delete-button" type="submit">Supprimer</button></form></td></tr>)}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}
