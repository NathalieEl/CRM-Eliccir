"use client";

import { useState } from "react";

type CoordinateFieldProps = {
  label: string;
  name: "latitude" | "longitude";
  initialValue: string;
};

type CoordinateParts = {
  degrees: string;
  minutes: string;
  seconds: string;
};

const directions = {
  latitude: [
    { value: "N", label: "Nord" },
    { value: "S", label: "Sud" },
  ],
  longitude: [
    { value: "E", label: "Est" },
    { value: "W", label: "Ouest" },
  ],
} as const;

function splitDecimalDegrees(value: string, name: CoordinateFieldProps["name"]): { parts: CoordinateParts; direction: string } {
  if (!value.trim()) return { parts: { degrees: "", minutes: "", seconds: "" }, direction: name === "latitude" ? "N" : "E" };
  const decimal = Number(value);
  if (!Number.isFinite(decimal)) return { parts: { degrees: "", minutes: "", seconds: "" }, direction: name === "latitude" ? "N" : "E" };

  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const totalMinutes = (absolute - degrees) * 60;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60 * 100) / 100;
  let normalizedDegrees = degrees;
  let normalizedMinutes = minutes;
  let normalizedSeconds = seconds;
  if (normalizedSeconds >= 60) {
    normalizedSeconds = 0;
    normalizedMinutes += 1;
    if (normalizedMinutes >= 60) {
      normalizedMinutes = 0;
      normalizedDegrees += 1;
    }
  }

  return {
    parts: {
      degrees: String(normalizedDegrees),
      minutes: String(normalizedMinutes),
      seconds: normalizedSeconds ? normalizedSeconds.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") : "0",
    },
    direction: name === "latitude"
      ? decimal < 0 ? "S" : "N"
      : decimal < 0 ? "W" : "E",
  };
}

export function CoordinateField({ label, name, initialValue }: CoordinateFieldProps) {
  const initial = splitDecimalDegrees(initialValue, name);
  const [parts, setParts] = useState(initial.parts);
  const [direction, setDirection] = useState(initial.direction);
  const maxDegrees = name === "latitude" ? 90 : 180;
  const isEmpty = !parts.degrees && !parts.minutes && !parts.seconds;
  const degrees = Number(parts.degrees || 0);
  const minutes = Number(parts.minutes || 0);
  const seconds = Number(parts.seconds || 0);
  const isValid = degrees >= 0 && degrees <= maxDegrees && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60 &&
    (degrees < maxDegrees || (minutes === 0 && seconds === 0));
  const sign = direction === "S" || direction === "W" ? -1 : 1;
  const decimalValue = isEmpty || !isValid ? "" : (sign * (degrees + minutes / 60 + seconds / 3600)).toFixed(6);
  const partsId = `${name}-parts`;
  const selectedDirection = directions[name].find((item) => item.value === direction)?.label ?? directions[name][0].label;

  const updatePart = (part: keyof CoordinateParts, value: string) => {
    const validInput = part === "seconds" ? /^\d*(?:\.\d{0,2})?$/.test(value) : /^\d*$/.test(value);
    if (validInput) {
      setParts((current) => ({ ...current, [part]: value }));
    }
  };

  return (
    <div className="coordinate-field" role="group" aria-labelledby={`${partsId}-label`}>
      <span className="coordinate-field-title" id={`${partsId}-label`}>{label}</span>
      <div className="coordinate-dms-row" id={partsId}>
        <label><span>Degrés</span><input aria-label={`${label}, degrés`} inputMode="numeric" type="number" min="0" max={maxDegrees} step="1" value={parts.degrees} onChange={(event) => updatePart("degrees", event.target.value)} placeholder="0" /></label>
        <span className="coordinate-unit" aria-hidden="true">°</span>
        <label><span>Minutes</span><input aria-label={`${label}, minutes`} inputMode="numeric" type="number" min="0" max="59" step="1" value={parts.minutes} onChange={(event) => updatePart("minutes", event.target.value)} placeholder="0" /></label>
        <span className="coordinate-unit" aria-hidden="true">′</span>
        <label><span>Secondes</span><input aria-label={`${label}, secondes`} inputMode="decimal" type="number" min="0" max="59.99" step="0.01" value={parts.seconds} onChange={(event) => updatePart("seconds", event.target.value)} placeholder="0" /></label>
        <span className="coordinate-unit" aria-hidden="true">″</span>
        <label><span>Hémisphère</span><select aria-label={`${label}, hémisphère`} value={direction} onChange={(event) => setDirection(event.target.value)}>
          {directions[name].map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
        </select></label>
      </div>
      <input type="hidden" name={name} value={decimalValue} />
      <span className="coordinate-preview">{isEmpty ? "Non renseignée" : isValid ? `${parts.degrees || "0"}° ${parts.minutes || "0"}′ ${parts.seconds || "0"}″ ${selectedDirection}` : "Valeur hors limites"}</span>
    </div>
  );
}
