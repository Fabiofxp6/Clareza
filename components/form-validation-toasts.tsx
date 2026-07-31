"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function FormValidationToasts() {
  useEffect(() => {
    let notifying = false;
    const handleInvalid = (event: Event) => {
      if (notifying) return;
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      notifying = true;
      window.setTimeout(() => { notifying = false; }, 0);
      const fieldLabel = field.labels?.[0];
      const label = (fieldLabel?.querySelector(":scope > span")?.textContent ?? fieldLabel?.textContent)?.replace("*", "").trim();
      toast.error("Preencha os campos obrigatórios.", {
        id: "required-fields",
        description: label ? `Revise o campo “${label}”.` : "Revise os campos destacados antes de continuar.",
      });
    };
    document.addEventListener("invalid", handleInvalid, true);
    return () => document.removeEventListener("invalid", handleInvalid, true);
  }, []);
  return null;
}
