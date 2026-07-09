import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Zap } from "lucide-react";

// Beta namespace typing for supabase.auth.oauth
type OAuthDetails = {
  client?: { name?: string; redirect_uris?: string[] } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scopes?: string[] | null;
} | null;
type OAuthResult<T> = { data: T; error: null } | { data: null; error: { message: string } };
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult<OAuthDetails>>;
  approveAuthorization: (id: string) => Promise<OAuthResult<OAuthDetails>>;
  denyAuthorization: (id: string) => Promise<OAuthResult<OAuthDetails>>;
};

function oauth(): OAuthNs {
  return (supabase.auth as unknown as { oauth: OAuthNs }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Fehlende authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + (location.searchStr ?? "");
      throw redirect({ href: `/auth?next=${encodeURIComponent(next)}` });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      throw new Error("Weiterleitung…");
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card-elevated max-w-md p-6 text-sm">
        <h1 className="font-display text-lg font-bold">Authorisierung fehlgeschlagen</h1>
        <p className="mt-2 text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </div>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "Ein externer Client";

  async function decide(approve: boolean) {
    setError(null);
    setBusy(approve ? "approve" : "deny");
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("Keine Weiterleitungs-URL vom Auth-Server erhalten.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon text-neon-foreground glow">
            <Zap className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Hybrid Athlete</h1>
            <p className="text-sm text-muted-foreground">Zugriff erlauben?</p>
          </div>
        </div>
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-neon shrink-0 mt-0.5" />
            <div className="text-sm">
              <p>
                <span className="font-semibold">{clientName}</span> möchte auf dein Hybrid-Athlete-Konto
                zugreifen und Aktionen als du ausführen.
              </p>
              <p className="mt-2 text-muted-foreground">
                Der Zugriff läuft über deine bestehenden App-Rechte (Row-Level-Security). Deine App-Regeln
                entscheiden weiterhin, welche Daten sichtbar sind.
              </p>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => decide(false)}
              disabled={busy !== null}
            >
              {busy === "deny" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ablehnen
            </Button>
            <Button
              className="flex-1 bg-neon text-neon-foreground hover:bg-neon/90 glow"
              onClick={() => decide(true)}
              disabled={busy !== null}
            >
              {busy === "approve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erlauben
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
