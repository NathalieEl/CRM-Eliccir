import Link from "next/link";
import { completePasswordSetup } from "@/app/set-password/actions";
import { PasswordField } from "@/app/components/password-field";
import { hashPasswordSetupToken } from "@/lib/password-setup";
import { prisma } from "@/lib/prisma";

const errors: Record<string, string> = {
  invalid: "Ce lien n’est pas valide. Demande un nouveau lien à l’administrateur.",
  expired: "Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien à l’administrateur.",
  password: "Les deux mots de passe doivent être identiques et contenir au moins 8 caractères.",
};

export default async function SetPasswordPage({ searchParams }: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const query = await searchParams;
  const token = query.token ?? "";
  const tokenHash = hashPasswordSetupToken(token);
  const user = tokenHash
    ? await prisma.user.findFirst({
        where: { passwordSetupTokenHash: tokenHash, passwordSetupExpiresAt: { gt: new Date() }, mustChangePassword: true },
        select: { prenom: true, nom: true, username: true },
      })
    : null;
  const error = query.error && errors[query.error]
    ? errors[query.error]
    : null;

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <Link className="contacts-brand auth-brand" href="/login" aria-label="MANTA CRM, connexion"><span className="brand-mark">M</span><span className="brand-name">MANTA<small>CRM</small></span></Link>
        <p className="section-index">SÉCURISATION DU COMPTE</p>
        <h1>Choisir un mot de passe</h1>
        {user ? (
          <>
            <p className="auth-intro">Bonjour {[user.prenom, user.nom].filter(Boolean).join(" ") || user.username}. Choisis ton mot de passe personnel.</p>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
            <form action={completePasswordSetup} className="auth-form">
              <input type="hidden" name="token" value={token} />
              <PasswordField name="password" label="Nouveau mot de passe" minLength={8} autoComplete="new-password" />
              <PasswordField name="confirmation" label="Confirmer le mot de passe" minLength={8} autoComplete="new-password" />
              <button className="contact-primary-button" type="submit">Enregistrer le mot de passe</button>
            </form>
            <p className="auth-intro">Ce lien à usage unique expire après 24 heures.</p>
          </>
        ) : (
          <>
            <p className="auth-error" role="alert">{error || errors.invalid}</p>
            <p className="auth-intro">Demande à l’administrateur de renvoyer le lien de définition du mot de passe.</p>
            <Link className="contact-cancel-link" href="/login">Retour à la connexion</Link>
          </>
        )}
      </section>
    </main>
  );
}