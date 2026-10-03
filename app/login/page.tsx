import { login } from "@/app/login/actions";
import { PasswordField } from "@/app/components/password-field";

const messages = {
  invalid: "Identifiants ou code de double authentification incorrects.",
  unavailable: "Le service d’authentification est momentanément indisponible.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: keyof typeof messages }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-brand"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></div>
        <p className="section-index">ESPACE SÉCURISÉ</p>
        <h1>Connexion</h1>
        <p className="auth-intro">Accédez à votre espace de travail.</p>
        {error && messages[error] ? <p className="auth-error" role="alert">{messages[error]}</p> : null}
        <form action={login} className="auth-form">
          <label>Nom d’utilisateur<input name="username" autoComplete="username" required /></label>
          <PasswordField name="password" label="Mot de passe" autoComplete="current-password" />
          {process.env.NODE_ENV === "development" ? null : <label>Code 2FA<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required /></label>}
          <button className="contact-primary-button" type="submit">Se connecter <span>↗</span></button>
        </form>
      </section>
    </main>
  );
}
