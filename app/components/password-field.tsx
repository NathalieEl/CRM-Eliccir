"use client";

import { useState } from "react";

type PasswordFieldProps = {
  name: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
};

export function PasswordField({ name, label, placeholder, autoComplete, minLength }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="password-field">
      {label}
      <span className="password-input-wrap">
        <input name={name} type={visible ? "text" : "password"} minLength={minLength} placeholder={placeholder} autoComplete={autoComplete} required />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {visible ? "Masquer" : "Afficher"}
        </button>
      </span>
    </label>
  );
}
