import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import logoVissimo from "@/assets/vissimo-mark.png.asset.json";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (ativo) setEmail(data.user?.email ?? null);
    });
    return () => {
      ativo = false;
    };
  }, []);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/painel" className="flex items-center gap-2.5">
          <img
            src={logoVissimo.url}
            alt="Víssimo Group"
            className="size-9 shrink-0 rounded-md object-contain"
          />
          <span className="font-display text-base leading-tight font-semibold">
            Fila de Aprovação de PO
          </span>
        </Link>

        <nav className="order-3 flex w-full gap-1 text-sm sm:order-none sm:w-auto">
          <Link
            to="/painel"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:font-medium data-[status=active]:text-accent-foreground"
          >
            Painel
          </Link>
          <Link
            to="/historico"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:font-medium data-[status=active]:text-accent-foreground"
          >
            Histórico
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {email && (
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
          )}
          <Button variant="outline" size="sm" onClick={sair}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
