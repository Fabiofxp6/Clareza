import { Download, ShieldCheck, Upload } from "lucide-react";
import { BackupForm } from "@/components/backup-form";
import { PageHeader } from "@/components/page";

export default function BackupPage() {
  return <>
    <PageHeader eyebrow="Portabilidade" title="Backup e restauração" description="Mantenha uma cópia portátil dos seus dados sem expor senha, sessão ou segredos." />
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-6"><div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"><Download size={19} /></div><h2 className="font-bold">Exportar backup</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Gera um JSON versionado com todos os dados financeiros e preferências. O hash da senha nunca é incluído.</p><a className="btn btn-primary mt-6" href="/api/backup" download>Baixar backup completo</a></section>
      <section className="card p-6"><div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]"><Upload size={19} /></div><h2 className="font-bold">Restaurar backup</h2><p className="mt-2 mb-5 text-sm leading-6 text-[var(--muted)]">O arquivo é validado antes da gravação. A operação é atômica: em caso de erro, nada é alterado.</p><BackupForm /></section>
    </div>
    <div className="mt-4 flex gap-3 rounded-xl border border-[color-mix(in_srgb,var(--success)_20%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-4 text-sm"><ShieldCheck className="shrink-0 text-[var(--success)]" size={19} /><p><b>Dados protegidos:</b> tokens, cookies, senha e variáveis de ambiente nunca fazem parte do arquivo.</p></div>
  </>;
}
