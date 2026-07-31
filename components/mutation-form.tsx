"use client";

import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";

type Result = { ok: true; message?: string } | { ok: false; error: string } | void;
type State = { submission: number; ok?: boolean; error?: string; message?: string };

export function MutationForm({
  action,
  successMessage,
  children,
  onSubmit,
  ...props
}: Omit<React.ComponentProps<"form">, "action"> & {
  action: (formData: FormData) => Promise<Result>;
  successMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(async (previous: State, formData: FormData): Promise<State> => {
    try {
      const result = await action(formData);
      if (result && !result.ok) {
        return { submission: previous.submission + 1, ok: false, error: result.error };
      }
      return {
        submission: previous.submission + 1,
        ok: true,
        message: result?.message ?? successMessage,
      };
    } catch {
      return {
        submission: previous.submission + 1,
        ok: false,
        error: "Não foi possível concluir a operação. Tente novamente.",
      };
    }
  }, { submission: 0 });

  useEffect(() => {
    if (!state.submission) return;
    if (state.ok) toast.success(state.message ?? "Operação concluída com sucesso.");
    else toast.error("Não foi possível salvar.", { description: state.error });
  }, [state]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    onSubmit?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form {...props} action={formAction} onSubmit={submit} aria-busy={pending || undefined}>
      <fieldset className="contents" disabled={pending}>{children}</fieldset>
    </form>
  );
}
