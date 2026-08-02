/**
 * Einladungslinks verwalten (nur Trainer).
 * Der Klartext-Link wird einmalig nach dem Erstellen angezeigt – danach existiert
 * in der Datenbank nur noch der Hash.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Link2, Loader2, QrCode, Share2, Trash2 } from "lucide-react";
import { generateInviteToken, hashToken } from "@/lib/invites";
import { humanError } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";

type InviteRow = Tables<"team_invites">;

const EXPIRY_OPTIONS = [
  { label: "7 Tage", days: 7 },
  { label: "30 Tage", days: 30 },
  { label: "Unbegrenzt", days: 0 },
];

export function TeamInvites({ teamId }: { teamId: string }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(30);
  const [maxUses, setMaxUses] = useState("");
  const [freshLink, setFreshLink] = useState<string | null>(null);

  const { data: invites } = useQuery({
    queryKey: ["team-invites", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const token = generateInviteToken();
      const parsedMax = maxUses.trim() ? Math.max(1, Number(maxUses)) : null;
      const { error } = await supabase.from("team_invites").insert({
        team_id: teamId,
        created_by: u.user!.id,
        token_hash: await hashToken(token),
        label: label.trim() || null,
        max_uses: Number.isFinite(parsedMax as number) ? parsedMax : null,
        expires_at: days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
      });
      if (error) throw error;
      return `${window.location.origin}/join/${token}`;
    },
    onSuccess: (url) => {
      setFreshLink(url);
      setLabel("");
      setMaxUses("");
      qc.invalidateQueries({ queryKey: ["team-invites", teamId] });
      toast.success("Einladungslink erstellt");
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_invites").update({ revoked: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-invites", teamId] }),
    onError: (e: Error) => toast.error(humanError(e)),
  });

  return (
    <div className="card-elevated space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="h-4 w-4" /> Spieler per Link einladen
      </h2>
      <p className="text-xs text-muted-foreground">
        Teile den Link oder den QR-Code. Wer ihn öffnet, kann sich registrieren und tritt direkt
        dem Team bei – ein Konto ist vorher nicht nötig.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="invite-label">Bezeichnung (optional)</Label>
          <Input
            id="invite-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z. B. WhatsApp-Gruppe"
          />
        </div>
        <div>
          <Label htmlFor="invite-expiry">Gültig</Label>
          <select
            id="invite-expiry"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-0 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="invite-max">Max. Nutzungen</Label>
          <Input
            id="invite-max"
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="unbegrenzt"
          />
        </div>
      </div>

      <Button onClick={() => create.mutate()} disabled={create.isPending}>
        {create.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="mr-2 h-4 w-4" />
        )}
        Link erstellen
      </Button>

      {freshLink && <FreshLink url={freshLink} onClose={() => setFreshLink(null)} />}

      <ul className="divide-y divide-border">
        {(invites ?? []).map((inv) => {
          const expired = inv.expires_at ? Date.parse(inv.expires_at) < Date.now() : false;
          const exhausted = inv.max_uses != null && inv.uses >= inv.max_uses;
          const state = inv.revoked
            ? "zurückgezogen"
            : expired
              ? "abgelaufen"
              : exhausted
                ? "aufgebraucht"
                : "aktiv";
          return (
            <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="font-medium">{inv.label ?? "Einladungslink"}</div>
                <div className="text-xs text-muted-foreground">
                  {state} · {inv.uses} Beitritte
                  {inv.max_uses != null && ` von ${inv.max_uses}`}
                  {inv.expires_at &&
                    ` · bis ${new Date(inv.expires_at).toLocaleDateString("de-DE")}`}
                </div>
              </div>
              {!inv.revoked && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Link zurückziehen"
                  onClick={() => revoke.mutate(inv.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          );
        })}
        {(invites ?? []).length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">Noch kein Einladungslink erstellt.</li>
        )}
      </ul>
    </div>
  );
}

function FreshLink({ url, onClose }: { url: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (showQr && canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 1 });
    }
  }, [showQr, url]);

  return (
    <div className="rounded-lg border border-neon/40 bg-neon-soft p-3">
      <p className="text-xs text-muted-foreground">
        Dieser Link wird nur jetzt angezeigt. Kopiere ihn dir weg.
      </p>
      <code className="mt-2 block break-all rounded bg-background/60 px-2 py-1 text-xs">{url}</code>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(url);
            toast.success("Link kopiert");
          }}
        >
          <Copy className="mr-2 h-4 w-4" /> Kopieren
        </Button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigator.share({ title: "Team-Einladung", url })}
          >
            <Share2 className="mr-2 h-4 w-4" /> Teilen
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setShowQr((v) => !v)}>
          <QrCode className="mr-2 h-4 w-4" /> QR-Code
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Schließen
        </Button>
      </div>
      {showQr && (
        <div className="mt-3 w-fit rounded-lg bg-white p-2">
          <canvas ref={canvasRef} aria-label="QR-Code des Einladungslinks" />
        </div>
      )}
    </div>
  );
}
