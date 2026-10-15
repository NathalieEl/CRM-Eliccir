"use client";

import { useEffect, useRef } from "react";

function toLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toUtcValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function DateTimeField({ name, label, initialValue = null }: { name: string; label: string; initialValue?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const localValue = toLocalValue(initialValue);
    if (inputRef.current) {
      inputRef.current.value = localValue;
      inputRef.current.defaultValue = localValue;
    }
    if (hiddenInputRef.current) {
      const utcValue = toUtcValue(localValue);
      hiddenInputRef.current.value = utcValue;
      hiddenInputRef.current.defaultValue = utcValue;
    }
  }, [initialValue]);

  return (
    <label className="activity-datetime-field">
      <span className="field-title">{label}</span>
      <input ref={inputRef} type="datetime-local" defaultValue="" onChange={(event) => {
        if (hiddenInputRef.current) hiddenInputRef.current.value = toUtcValue(event.target.value);
      }} />
      <input ref={hiddenInputRef} type="hidden" name={name} defaultValue="" />
    </label>
  );
}