import type { Metadata } from "next";
import { login } from "@/app/login/actions";
import { PasswordField } from "@/app/components/password-field";
import { isTwoFactorActive } from "@/lib/auth";
import { getDeploymentInfo } from "@/lib/deployment-info";

const messages = {
  invalid: "Identifiants invalides ou authentification incorrecte.",
  unavailable: "Le service d’authentification est momentanément indisponible.",
  "password-setup-required": "Définis ton mot de passe depuis le lien reçu par e-mail avant de te connecter.",
  "session-expired": "Ta session a expiré ou ton mot de passe a été réinitialisé. Reconnecte-toi.",
};

const notices = {
  "password-set": "Ton mot de passe a été défini. Tu peux maintenant te connecter.",
};

export const metadata: Metadata = {
  referrer: "no-referrer",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: keyof typeof messages; notice?: keyof typeof notices }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice } = await searchParams;
  const deploymentInfo = getDeploymentInfo();

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">E</span>
          <span className="brand-copy">
            <span className="brand-name">MANTA<small>CRM</small></span>
            <span
              className="brand-release"
              title={`${deploymentInfo.environment} · version ${deploymentInfo.version} · build ${deploymentInfo.buildId}${deploymentInfo.commitMessage ? ` · ${deploymentInfo.commitMessage}` : ""}`}
            >
              v{deploymentInfo.version} · {deploymentInfo.environmentLabel} · {deploymentInfo.buildId}
            </span>
          </span>
        </div>
        <p className="section-index">ESPACE SÉCURISÉ</p>
        <h1>Connexion</h1>
        <p className="auth-intro">Accède à ton espace de travail.</p>
        {notice && notices[notice] ? <p className="contacts-message" role="status">{notices[notice]}</p> : null}
        {error && messages[error] ? <p className="auth-error" role="alert">{messages[error]}</p> : null}
        <form action={login} className="auth-form">
          <label><span className="field-title">Nom d’utilisateur</span><input name="username" autoComplete="username" required /></label>
          <PasswordField name="password" label="Mot de passe" autoComplete="current-password" />
          {isTwoFactorActive() ? <label><span className="field-title">Code 2FA</span><input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required /></label> : null}
          <button className="contact-primary-button" type="submit">Se connecter <span>↗</span></button>
        </form>
      </section>
    </main>
  );
}
