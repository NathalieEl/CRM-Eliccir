import Link from "next/link";
import { createUser, deleteUser, resetTwoFactor, sendUserPasswordSetupLink, updateUser } from "@/app/users/actions";
import { isTwoFactorActive, requireAdmin, usernamesMatch } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CancelEditButton, UnsavedChangesForm } from "@/app/components/unsaved-changes-form";
import { hasPermission, roleDefinitions, roleLabels, type UserRole } from "@/lib/permissions";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ created?: string; reset2fa?: string; username?: string; error?: string; notice?: string }> }) {
  await requireAdmin();
  const twoFactorActive = isTwoFactorActive();
  const configuredAdminUsername = process.env.ADMIN_USERNAME?.trim();
  const params = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="MANTA CRM, tableau de bord"><span className="brand-mark">M</span><span className="brand-name">MANTA<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>
      <div className="contacts-content">
        <section className="contacts-title-row">
          <div><p className="section-index">ESPACE DE TRAVAIL <i>·</i> ADMINISTRATION</p><h1>Utilisateurs</h1><p className="contacts-intro">Crée les accès de ton équipe. Double authentification : {twoFactorActive ? "Active" : "En sommeil"}.</p></div>
          <span className="contacts-total">{users.length}<small>COMPTES</small></span>
        </section>

        {params.error === "invalid" && <p className="auth-error" role="alert">Renseigne le prénom, le nom, une adresse e-mail valide et un nom d’utilisateur valide.</p>}
        {params.error === "exists" && <p className="auth-error" role="alert">Ce nom d’utilisateur existe déjà.</p>}
        {params.error === "email-required" && <p className="auth-error" role="alert">Ajoute une adresse e-mail à ce compte avant d’envoyer un lien.</p>}
        {params.error === "setup-email-failed" && <p className="auth-error" role="alert">Le lien n’a pas pu être envoyé. Vérifie le relais e-mail et réessaie.</p>}
        {params.error === "admin-password-managed" && <p className="auth-error" role="alert">Le mot de passe du compte principal se gère dans les variables Railway `ADMIN_PASSWORD`.</p>}
        {params.error === "self" && <p className="auth-error" role="alert">Tu ne peux pas désactiver ou rétrograder ton propre compte.</p>}
        {params.error === "confirm-delete" && <p className="auth-error" role="alert">Confirme la suppression du compte avant de continuer.</p>}
        {params.error === "confirm-2fa" && <p className="auth-error" role="alert">Confirme la réinitialisation de la double authentification.</p>}
        {params.error === "2fa-inactive" && <p className="auth-error" role="alert">La double authentification est en sommeil.</p>}
        {params.notice === "updated" && <p className="contacts-message" role="status">Le compte a été mis à jour.</p>}
        {params.notice === "setup-sent" && <p className="contacts-message" role="status">Le lien sécurisé a été envoyé par e-mail. Il expire dans 24 heures.</p>}
        {params.notice === "setup-pending" && <p className="contacts-message contacts-message-error" role="status">Le compte est créé mais l’e-mail n’a pas pu être envoyé. Mets à jour le relais Apps Script, puis renvoie le lien depuis la fiche utilisateur.</p>}
        {twoFactorActive && params.created && params.username && <section className="users-setup-note"><h2>Compte créé pour {params.username}</h2><p>Ajoute ce secret dans ton application d’authentification pour ce compte. Il ne sera plus affiché après cette page.</p><code>{params.created}</code></section>}
        {twoFactorActive && params.reset2fa && params.username && <section className="users-setup-note"><h2>2FA réinitialisée pour {params.username}</h2><p>Ajoute ce nouveau secret dans ton application d’authentification pour ce compte. L’ancien secret est désormais invalide.</p><code>{params.reset2fa}</code></section>}

        <section className="contacts-create-section">
          <div className="contacts-section-heading"><div><p className="section-index">01 <i>·</i> NOUVEAU</p><h2>Créer un accès</h2></div></div>
          <form action={createUser} className="contact-form">
            <label><span className="field-title">Prénom</span><input name="prenom" required maxLength={80} autoComplete="given-name" placeholder="ex. Sophie" /></label>
            <label><span className="field-title">Nom</span><input name="nom" required maxLength={120} autoComplete="family-name" placeholder="ex. Martin" /></label>
            <label><span className="field-title">E-mail</span><input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="sophie.martin@example.com" /></label>
            <label><span className="field-title">Nom d’utilisateur</span><input name="username" required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" placeholder="ex. sophie.laurent" /></label>
            <label><span className="field-title">Profil</span><select name="role" defaultValue="member"><option value="member">Membre</option><option value="sales">Opérations commerciales</option><option value="management">Direction</option><option value="admin">Administrateur</option></select></label>
            <button className="contact-primary-button" type="submit">Créer et envoyer le lien <span>+</span></button>
          </form>
        </section>

        <section className="contacts-list-section">
          <div className="contacts-section-heading"><div><p className="section-index">PROFILS</p><h2>Définitions et droits</h2></div></div>
          <div className="users-role-definitions">
            {(Object.keys(roleLabels) as UserRole[]).map((role) => (
              <article className="users-role-definition" key={role}>
                <h3>{roleLabels[role]}</h3>
                <p>{roleDefinitions[role]}</p>
                <p className="users-role-capabilities">
                  CRM : {hasPermission(role, "crm.read") ? "lecture" : "aucun accès"}{hasPermission(role, "crm.write") ? " et écriture" : ""}
                  {hasPermission(role, "users.manage") ? " · gestion des utilisateurs" : " · pas de gestion des utilisateurs"}
                  {hasPermission(role, "maintenance.manage") ? " · gestion des options" : " · pas de gestion des options"}
                </p>
              </article>
            ))}
          </div>
          <p className="support-privacy-note">Direction et Opérations commerciales ont actuellement les mêmes droits techniques ; leur séparation par portefeuille n’est pas encore configurée.</p>
        </section>

        <section className="contacts-list-section">
          <div className="contacts-section-heading"><div><p className="section-index">02 <i>·</i> ACCÈS ACTIFS</p><h2>Comptes existants</h2></div></div>
          <div className="users-table-wrap">
            <table className="contacts-records contacts-data-table users-data-table">
              <thead><tr><th>UTILISATEUR</th><th>PROFIL</th><th>ÉTAT</th><th>GESTION</th></tr></thead>
              <tbody>{users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Utilisateur"><b><Link href={`/users/${user.id}`}>{[user.prenom, user.nom].filter(Boolean).join(" ") || user.username}</Link></b><small>{user.username} · {user.email || "E-mail non renseigné"} · {twoFactorActive ? "2FA active" : "2FA en sommeil"}</small></td>
                  <td data-label="Profil">{roleLabels[user.role as UserRole] ?? roleLabels.member}</td>
                  <td data-label="État">{user.active ? "Actif" : "Désactivé"}</td>
                  <td data-label="Gestion"><div className="user-row-actions">
                    <details>
                      <summary>Modifier</summary>
                      <UnsavedChangesForm action={updateUser} className="user-edit-form">
                        <input type="hidden" name="id" value={user.id} />
                        <label><span className="field-title">Prénom</span><input name="prenom" defaultValue={user.prenom ?? ""} maxLength={80} autoComplete="given-name" /></label>
                        <label><span className="field-title">Nom</span><input name="nom" defaultValue={user.nom ?? ""} maxLength={120} autoComplete="family-name" /></label>
                        <label><span className="field-title">E-mail</span><input name="email" type="email" defaultValue={user.email ?? ""} maxLength={254} autoComplete="email" /></label>
                        <label><span className="field-title">Profil</span><select name="role" defaultValue={user.role}><option value="member">Membre</option><option value="sales">Opérations commerciales</option><option value="management">Direction</option><option value="admin">Administrateur</option></select></label>
                        <label className="user-active-toggle"><input name="active" type="checkbox" defaultChecked={user.active} /><span className="field-title">Compte actif</span></label>
                        <div className="profile-form-actions"><CancelEditButton /><button className="contact-primary-button" type="submit">Enregistrer</button></div>
                      </UnsavedChangesForm>
                    </details>
                    {usernamesMatch(user.username, configuredAdminUsername) ? <span className="support-privacy-note">Mot de passe géré dans Railway</span> : <form action={sendUserPasswordSetupLink} className="user-resend-setup-form"><input type="hidden" name="id" value={user.id} /><button type="submit">Envoyer un lien mot de passe</button></form>}
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
