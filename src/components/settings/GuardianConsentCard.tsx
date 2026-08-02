import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { GUARDIAN_CONSENT_KIND, isMinor, youthBlockReason } from "@/lib/youth";
import { humanError } from "@/lib/errors";

/** Jugendschutz: Einwilligung der Erziehungsberechtigten für unter 16-Jährige. */
export function GuardianConsentCard() {
  const qc = useQueryClient();
  const [guardian, setGuardian] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const { data } = useQuery({
    queryKey: ["guardian-consent"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [prof, consent] = await Promise.all([
        supabase.from("profiles").select("birth_date").eq("id", u.user.id).maybeSingle(),
        supabase
          .from("consents")
          .select("granted, changed_at")
          .eq("user_id", u.user.id)
          .eq("kind", GUARDIAN_CONSENT_KIND)
          .order("changed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        birthDate: prof.data?.birth_date ?? null,
        granted: consent.data?.granted === true,
        changedAt: consent.data?.changed_at ?? null,
      };
    },
  });

  const grant = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { error } = await supabase.from("consents").insert({
        user_id: u.user.id,
        kind: GUARDIAN_CONSENT_KIND,
        granted: true,
        version: `v1:${guardian.trim()}|${email.trim()}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Einwilligung gespeichert");
      qc.invalidateQueries({ queryKey: ["guardian-consent"] });
      qc.invalidateQueries({ queryKey: ["profile-leaderboard"] });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  if (!data || !isMinor(data.birthDate)) return null;

  if (data.granted) {
    return (
      <div className="card-elevated flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-neon" />
        <div>
          <h2 className="font-display text-lg font-semibold">Jugendschutz</h2>
          <p className="text-sm text-muted-foreground">
            Die Einwilligung der Erziehungsberechtigten liegt vor
            {data.changedAt
              ? ` (seit ${new Date(data.changedAt).toLocaleDateString("de-DE")})`
              : ""}
            . Öffentliche Funktionen sind freigeschaltet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated space-y-4 p-5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 text-warning" />
        <div>
          <h2 className="font-display text-lg font-semibold">Jugendschutz</h2>
          <p className="text-sm text-muted-foreground">{youthBlockReason(data.birthDate)}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Name der erziehungsberechtigten Person</Label>
          <Input value={guardian} onChange={(e) => setGuardian(e.target.value)} />
        </div>
        <div>
          <Label>E-Mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          aria-label="Einwilligung bestätigen"
        />
        <span>
          Ich bestätige, dass meine Eltern bzw. Erziehungsberechtigten der Nutzung öffentlicher
          Funktionen (Bestenliste, Teilen von Gesundheitsdaten) zugestimmt haben.
        </span>
      </label>
      <Button
        className="w-full"
        disabled={!confirmed || !guardian.trim() || !email.trim() || grant.isPending}
        onClick={() => grant.mutate()}
      >
        Einwilligung speichern
      </Button>
    </div>
  );
}
