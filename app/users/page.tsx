import Link from "next/link";
import { createUser, deleteUser, resetTwoFactor, updateUser } from "@/app/users/actions";
import { isTwoFactorActive, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PasswordField } from "@/app/components/password-field";
import { UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import { roleLabels, type UserRole } from "@/lib/permissions";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ created?: string; reset2fa?: string; username?: string; error?: string; notice?: string }> }) {
  await requireAdmin();
  const twoFactorActive = isTwoFactorActive();
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
          <div><p className="section-index">ESPACE DE TRAVAIL <i>·</i> ADMINISTRATION</p><h1>Utilisateurs</h1><p className="contacts-intro">Crée les accès de ton équipe. Double authentification : {twoFactorActive ? "Active" : "En sommeil"}.</p></div>
          <span className="contacts-total">{users.length}<small>COMPTES</small></span>
        </section>

        {params.error === "invalid" && <p className="auth-error" role="alert">Renseigne le prénom, un nom d’utilisateur valide et un mot de passe d’au moins 8 caractères.</p>}
        {params.error === "exists" && <p className="auth-error" role="alert">Ce nom d’utilisateur existe déjà.</p>}
        {params.error === "self" && <p className="auth-error" role="alert">Tu ne peux pas désactiver ou rétrograder ton propre compte.</p>}
        {params.error === "confirm-delete" && <p className="auth-error" role="alert">Confirme la suppression du compte avant de continuer.</p>}
        {params.error === "confirm-2fa" && <p className="auth-error" role="alert">Confirme la réinitialisation de la double authentification.</p>}
        {params.error === "2fa-inactive" && <p className="auth-error" role="alert">La double authentification est en sommeil.</p>}
        {params.notice === "updated" && <p className="contacts-message" role="status">Le compte a été mis à jour.</p>}
        {params.notice === "created" && <p className="contacts-message" role="status">Le compte a été créé. Le 2FA est en sommeil.</p>}
        {twoFactorActive && params.created && params.username && <section className="users-setup-note"><h2>Compte créé pour {params.username}</h2><p>Ajoute ce secret dans ton application d’authentification pour ce compte. Il ne sera plus affiché après cette page.</p><code>{params.created}</code></section>}
        {twoFactorActive && params.reset2fa && params.username && <section className="users-setup-note"><h2>2FA réinitialisée pour {params.username}</h2><p>Ajoute ce nouveau secret dans ton application d’authentification pour ce compte. L’ancien secret est désormais invalide.</p><code>{params.reset2fa}</code></section>}

        <section className="contacts-create-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 <i>·</i> NOUVEAU</p><h2>Créer un accès</h2></div></div>
          <form action={createUser} className="contact-form">
            <label>Prénom<input name="prenom" required maxLength={80} autoComplete="given-name" placeholder="ex. Sophie" /></label>
            <label>Nom d’utilisateur<input name="username" required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" placeholder="ex. sophie.laurent" /></label>
            <PasswordField name="password" label="Mot de passe temporaire" minLength={8} autoComplete="new-password" placeholder="8 caractères minimum" />
            <label>Profil<select name="role" defaultValue="member"><option value="member">Membre</option><option value="sales">Opérations commerciales</option><option value="management">Direction</option><option value="admin">Administrateur</option></select></label>
            <button className="contact-primary-button" type="submit">Créer le compte <span>+</span></button>
          </form>
        </section>

        <section className="contacts-list-section">
          <div className="contacts-section-heading"><div><p className="section-index">02 <i>·</i> ACCÈS ACTIFS</p><h2>Comptes existants</h2></div></div>
          <div className="users-table-wrap">
            <table className="contacts-records contacts-data-table users-data-table">
              <thead><tr><th>UTILISATEUR</th><th>PROFIL</th><th>ÉTAT</th><th>GESTION</th></tr></thead>
              <tbody>{users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Utilisateur"><b>{user.prenom || user.username}</b><small>{user.username} · {twoFactorActive ? "2FA active" : "2FA en sommeil"}</small></td>
                  <td data-label="Profil">{roleLabels[user.role as UserRole] ?? roleLabels.member}</td>
                  <td data-label="État">{user.active ? "Actif" : "Désactivé"}</td>
                  <td data-label="Gestion"><div className="user-row-actions">
                    <details>
                      <summary>Modifier</summary>
                      <UnsavedChangesForm action={updateUser} className="user-edit-form">
                        <input type="hidden" name="id" value={user.id} />
                        <label>Prénom<input name="prenom" defaultValue={user.prenom ?? ""} maxLength={80} autoComplete="given-name" /></label>
                        <label>Profil<select name="role" defaultValue={user.role}><option value="member">Membre</option><option value="sales">Opérations commerciales</option><option value="management">Direction</option><option value="admin">Administrateur</option></select></label>
                        <label>Nouveau mot de passe<input name="password" type="password" minLength={8} placeholder="Laisser vide pour conserver" /></label>
                        <label className="user-active-toggle"><input name="active" type="checkbox" defaultChecked={user.active} /> Compte actif</label>
                        <div className="profile-form-actions"><Link className="contact-cancel-link" href="/users">Annuler</Link><button className="contact-primary-button" type="submit">Enregistrer</button></div>
                      </UnsavedChangesForm>
                    </details>
                    {twoFactorActive ? <details><summary>Réinitialiser 2FA</summary><form action={resetTwoFactor} className="user-delete-form"><input type="hidden" name="id" value={user.id} /><label><input name="confirmed" value="yes" type="checkbox" required /> Confirmer la réinitialisation</label><button type="submit">Générer un nouveau secret</button></form></details> : null}
                    <details><summary className="user-delete-button">Supprimer</summary><form action={deleteUser} className="user-delete-form"><input type="hidden" name="id" value={user.id} /><label><input name="confirmed" value="yes" type="checkbox" required /> Confirmer la suppression</label><button type="submit">Supprimer définitivement</button></form></details>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
