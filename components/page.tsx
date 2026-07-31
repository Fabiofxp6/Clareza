import { ChevronRight } from "lucide-react";
import { Children, isValidElement } from "react";
import { SubmitButton } from "@/components/submit-button";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-[-0.035em] sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-40 place-items-center p-8 text-center">
      <div>
        <div className="font-semibold">{title}</div>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

export function FormDetails({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="card group mb-6">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold">
        {title}
        <ChevronRight className="transition-transform group-open:rotate-90" size={18} />
      </summary>
      <div className="border-t p-4 sm:p-5">
        <p className="mb-4 text-xs text-[var(--muted)]"><RequiredMark /> Campos obrigatórios</p>
        {children}
      </div>
    </details>
  );
}

export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  const isRequired = required ?? Children.toArray(children).some((child) => (
    isValidElement(child) && Boolean((child.props as { required?: boolean }).required)
  ));
  return <label className="label"><span>{label}{isRequired && <RequiredMark />}</span>{children}</label>;
}

export function RequiredMark() {
  return <span className="ml-1 text-[var(--danger)]" aria-hidden="true">*</span>;
}

export function Submit({ children = "Salvar" }: { children?: React.ReactNode }) {
  return <SubmitButton>{children}</SubmitButton>;
}
