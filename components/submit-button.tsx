"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children = "Salvar" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Salvando…" : children}
    </button>
  );
}
