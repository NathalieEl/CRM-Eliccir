"use client";

import { useState } from "react";

type BirthdateAgeFieldsProps = {
  initialDate: string;
};

function calculateAge(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [birthYear, birthMonth, birthDay] = value.split("-").map(Number);
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
  if (birthDate.getFullYear() !== birthYear || birthDate.getMonth() !== birthMonth - 1 || birthDate.getDate() !== birthDay) return null;

  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)) age -= 1;
  return age >= 0 ? age : null;
}

export function BirthdateAgeFields({ initialDate }: BirthdateAgeFieldsProps) {
  const [birthdate, setBirthdate] = useState(initialDate);
  const age = calculateAge(birthdate);

  return <>
    <label>Date de naissance<input name="dateNaissance" type="date" value={birthdate} onChange={(event) => setBirthdate(event.target.value)} /></label>
    <label>Âge calculé<input value={age === null ? "" : `${age} ans`} readOnly placeholder="Calculé depuis la date de naissance" /></label>
  </>;
}
