import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Users, Zap } from "lucide-react";
import { peekInvite, redeemInvite, inviteReasonText } from "@/lib/invites";
import { humanError } from "@/lib/errors";

export const Route = createFileRoute("/join/$token")({
  head: () => ({
    meta: [
      { title: "Team beitreten – Hybrid Athlete" },
      {
        name: "description",
        content: "Tritt über deinen Einladungslink dem Team deines Trainers bei.",
      },
      { property: "og:title", content: "Team beitreten – Hybrid Athlete" },
      {
        property: "og:description",
        content: "Einladung deines Trainers annehmen und Training gemeinsam planen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (alive) setUserId(data.user?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const preview = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => peekInvite(token),
    retry: false,
  });

  const join = useMutation({
    mutationFn: () => redeemInvite(token),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(inviteReasonText(res.reason));
        return;
      }
      toast.success(inviteReasonText(res.reason));
      const { data: u } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", u.user!.id)
        .maybeSingle();
      void navigate({ to: prof?.onboarded ? "/dashboard" : "/onboarding" });
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const authHref = `/auth?next=${encodeURIComponent(`/join/${token}`)}`;

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon text-neon-foreground glow">
            <Zap className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Team-Einladung</h1>
            <p className="text-sm text-muted-foreground">Hybrid Athlete Performance Planner</p>
          </div>
        </div>

        <div className="card-elevated p-6">
          {preview.isPending && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Einladung wird geprüft…
            </p>
          )}

          {preview.isError && (
            <p className="text-sm text-muted-foreground">
              Die Einladung konnte gerade nicht geprüft werden. Bitte später erneut versuchen.
            </p>
          )}

          {preview.data && (
            <>
              <h2 className="font-display text-xl font-semibold">
                {preview.data.team_name ?? "Unbekanntes Team"}
              </h2>
              {preview.data.coach_name && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Eingeladen von {preview.data.coach_name}
                </p>
              )}
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> {preview.data.member_count} aktive Mitglieder
              </p>

              {!preview.data.valid ? (
                <p className="mt-5 rounded-lg border border-border bg-elevated p-3 text-sm">
                  {inviteReasonText(preview.data.reason)}
                </p>
              ) : userId === undefined ? (
                <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Einen Moment…
                </p>
              ) : userId ? (
                <Button
                  className="mt-6 w-full"
                  onClick={() => join.mutate()}
                  disabled={join.isPending}
                >
                  {join.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Team beitreten
                </Button>
              ) : (
                <div className="mt-6 space-y-2">
                  <Button asChild className="w-full">
                    <a href={authHref}>Anmelden und beitreten</a>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <a href={authHref}>Neues Konto erstellen</a>
                  </Button>
                </div>
              )}
            </>
          )}

          <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Dein Trainer sieht deine Trainingsbelastung und dein Befinden – nicht deine Ernährung,
            Scans oder Tagebucheinträge.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">
            Zur Startseite
          </Link>
        </p>
      </div>
    </div>
  );
}
