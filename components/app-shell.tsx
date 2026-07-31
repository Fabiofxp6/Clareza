"use client";

import {
  BadgeHelp,
  CalendarRange,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  DatabaseBackup,
  Goal,
  LayoutDashboard,
  Menu,
  PiggyBank,
  ReceiptText,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: ReceiptText },
  { href: "/orcamento", label: "Orçamento mensal", icon: PiggyBank },
  { href: "/contas-fixas", label: "Contas fixas", icon: CalendarRange },
  { href: "/cartoes", label: "Cartões de crédito", icon: CreditCard },
  { href: "/metas", label: "Metas financeiras", icon: Goal },
  { href: "/dividas", label: "Dívidas e parcelas", icon: CircleDollarSign },
  { href: "/resumo-anual", label: "Resumo anual", icon: ChartNoAxesCombined },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/backup", label: "Backup", icon: DatabaseBackup },
  { href: "/ajuda", label: "Ajuda", icon: BadgeHelp },
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; theme: "LIGHT" | "DARK" | "SYSTEM" | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    setTheme((user.theme ?? "SYSTEM").toLowerCase());
  }, [setTheme, user.theme]);
  useEffect(() => {
    if (!mobile) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobile]);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
  };
  return (
    <div className="min-h-screen lg:grid" style={{ gridTemplateColumns: collapsed ? "84px 1fr" : "252px 1fr" }}>
      {mobile && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobile(false)} aria-label="Fechar menu" />}
      <aside
        id="main-navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r bg-[var(--surface)] transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
          mobile ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[74px] items-center gap-3 border-b px-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-[#f8fafc]">
            <WalletCards size={19} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold tracking-tight">Clareza</div>
              <div className="text-[11px] text-[var(--muted)]">Finanças pessoais</div>
            </div>
          )}
          <button className="ml-auto lg:hidden" onClick={() => setMobile(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação principal">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                onClick={() => setMobile(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          {!collapsed && (
            <div className="mb-2 truncate px-3">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-[var(--muted)]">{user.email}</div>
            </div>
          )}
          <form action={logoutAction}>
            <button className="btn btn-secondary w-full" type="submit">
              {collapsed ? "Sair" : "Encerrar sessão"}
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-[74px] items-center border-b bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button className="btn btn-secondary mr-3 h-10 w-10 !p-0 lg:hidden" onClick={() => setMobile(true)} aria-label="Abrir menu" aria-expanded={mobile} aria-controls="main-navigation"><Menu size={18} /></button>
          <button className="hidden h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] lg:grid" onClick={toggle} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
