"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

const UnsavedChangesContext = createContext<(formId: string, dirty: boolean) => void>(() => {});
const warningMessage = "Des modifications ne sont pas enregistrées. Veux-tu quitter cette page sans les enregistrer ?";

type UnsavedChangesProviderProps = {
  children: ReactNode;
};

export function UnsavedChangesProvider({ children }: UnsavedChangesProviderProps) {
  const [dirtyForms, setDirtyForms] = useState<Set<string>>(() => new Set());
  const dirtyRef = useRef(false);
  const lastHrefRef = useRef("");
  const restoringHistoryRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirtyForms.size > 0;
  }, [dirtyForms]);

  const markDirty = useCallback((formId: string, dirty: boolean) => {
    setDirtyForms((current) => {
      const next = new Set(current);
      if (dirty) next.add(formId);
      else next.delete(formId);
      return next;
    });
  }, []);

  const clearDirty = useCallback(() => {
    dirtyRef.current = false;
    setDirtyForms(new Set());
  }, []);

  useEffect(() => {
    lastHrefRef.current = window.location.href;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || (link.getAttribute("target") && link.getAttribute("target") !== "_self")) return;
      if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.href === window.location.href) return;
      if (!dirtyRef.current) {
        lastHrefRef.current = destination.href;
        return;
      }

      if (window.confirm(warningMessage)) {
        lastHrefRef.current = destination.href;
        clearDirty();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      lastHrefRef.current = window.location.href;
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = (event: PopStateEvent) => {
      if (restoringHistoryRef.current) {
        restoringHistoryRef.current = false;
        lastHrefRef.current = window.location.href;
        return;
      }
      if (!dirtyRef.current) {
        lastHrefRef.current = window.location.href;
        return;
      }
      if (window.confirm(warningMessage)) {
        clearDirty();
        lastHrefRef.current = window.location.href;
        return;
      }

      event.stopImmediatePropagation();
      restoringHistoryRef.current = true;
      window.history.go(1);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState, true);
    };
  }, [clearDirty]);

  return <UnsavedChangesContext.Provider value={markDirty}>{children}</UnsavedChangesContext.Provider>;
}

type EditAction = (formData: FormData) => void | Promise<void>;
type UnsavedChangesFormProps = Omit<ComponentProps<"form">, "action" | "onChange" | "onInput" | "onSubmit"> & {
  action: EditAction;
};

function snapshot(form: HTMLFormElement) {
  return JSON.stringify(Array.from(new FormData(form).entries(), ([key, value]) => [
    key,
    value instanceof File ? `${value.name}:${value.size}:${value.lastModified}` : value,
  ]));
}

export function UnsavedChangesForm({ action, children, ...props }: UnsavedChangesFormProps) {
  const formId = useId();
  const markDirty = useContext(UnsavedChangesContext);
  const formRef = useRef<HTMLFormElement>(null);
  const initialSnapshot = useRef("");

  useEffect(() => {
    if (formRef.current) initialSnapshot.current = snapshot(formRef.current);
  }, []);

  const checkChanges = () => {
    if (formRef.current) markDirty(formId, snapshot(formRef.current) !== initialSnapshot.current);
  };

  return (
    <form
      {...props}
      ref={formRef}
      action={action}
      onInput={checkChanges}
      onChange={checkChanges}
      onSubmit={() => markDirty(formId, false)}
    >
      {children}
    </form>
  );
}
