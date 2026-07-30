"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!mounted) return <span className="h-10 w-10" aria-hidden />;
  const dark = resolvedTheme === "dark";
  return (
    <button
      className="btn btn-secondary h-10 w-10 !p-0"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      type="button"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
