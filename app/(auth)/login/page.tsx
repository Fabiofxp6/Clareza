import type { Metadata } from "next";
import { WalletCards } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20">
            <WalletCards size={23} />
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em]">Bem-vindo ao Clareza</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Seu patrimônio, decisões e metas em um só lugar.</p>
        </div>
        <div className="card p-6 sm:p-7">
          <LoginForm />
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-[var(--muted)]">
          Acesso pessoal protegido. Não há cadastro público.
        </p>
      </div>
    </main>
  );
}
