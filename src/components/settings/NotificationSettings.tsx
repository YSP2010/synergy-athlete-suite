import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getVapidPublicKey,
  getReminderPrefs,
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
  setReminderPrefs,
} from "@/lib/push.functions";
import { pushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/pwa/push";
import {
  getReadyServiceWorkerRegistration,
  registerServiceWorker,
} from "@/lib/pwa/register";
import { humanError } from "@/lib/errors";

const TEST_TIMEOUT_MS = 5000;

function withTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
  return Promise.race([
    operation,
    new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error(message)), TEST_TIMEOUT_MS),
    ),
  ]);
}

interface Prefs {
  topic_checkin: boolean;
  topic_plan: boolean;
  topic_matchday: boolean;
  quiet_start: number;
  quiet_end: number;
}

/** Ein-/Ausschalten der Push-Benachrichtigungen für dieses Gerät. */
export function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const vapid = useServerFn(getVapidPublicKey);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const test = useServerFn(sendTestPush);
  const loadPrefs = useServerFn(getReminderPrefs);
  const savePrefsFn = useServerFn(setReminderPrefs);

  useEffect(() => {
    const canPush = pushSupported();
    setSupported(canPush);
    if (!canPush) return;
    let mounted = true;
    void (async () => {
      // Wartet hier explizit auf die Registrierung. Zuvor konnte diese Prüfung
      // schneller sein als die globale PWA-Registrierung und blieb dann dauerhaft false.
      const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.getRegistration());
      if (!mounted) return;
      setInstalled(!!reg);
      const readyReg = reg
        ? await getReadyServiceWorkerRegistration().catch((error) => {
            console.warn("[push] Statusprüfung des Service Workers fehlgeschlagen:", error);
            return reg.active?.state === "activated" ? reg : null;
          })
        : null;
      const sub = await readyReg?.pushManager.getSubscription();

      if (!mounted) return;
      setActive(!!sub);
      if (!sub) return;
      // Vorhandene Abos erneut speichern, damit alte, falsch kodierte Schlüssel korrigiert werden.
      try {
        const { key } = await vapid();
        if (!key) return;
        const keys = await subscribeToPush(key);
        await save({ data: { ...keys, userAgent: navigator.userAgent.slice(0, 300) } });
      } catch {
        // Nicht kritisch – der Nutzer kann Push manuell neu aktivieren.
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Erinnerungs-Präferenzen laden, sobald Push aktiv ist.
  useEffect(() => {
    if (!active) {
      setPrefs(null);
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const p = await loadPrefs();
        if (mounted) setPrefs(p as Prefs);
      } catch {
        // nicht kritisch
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function updatePref(patch: Partial<Prefs>) {
    if (!prefs) return;
    const previous = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSavingPrefs(true);
    try {
      await savePrefsFn({ data: next });
    } catch (e) {
      setPrefs(previous); // Rollback bei Fehler
      toast.error(humanError(e));
    } finally {
      setSavingPrefs(false);
    }
  }

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.error("Benachrichtigungen wurden im Browser blockiert.");
          return;
        }
        const { key } = await vapid();
        if (!key) {
          toast.error("Push ist auf diesem Server nicht konfiguriert.");
          return;
        }
        const keys = await subscribeToPush(key);
        await save({ data: { ...keys, userAgent: navigator.userAgent.slice(0, 300) } });
        setActive(true);
        toast.success("Benachrichtigungen aktiviert");
      } else {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await remove({ data: { endpoint } });
        setActive(false);
        toast.success("Benachrichtigungen deaktiviert");
      }
    } catch (e) {
      toast.error(humanError(e));
    } finally {
      setBusy(false);
    }
  }

  async function showBrowserFallback(): Promise<void> {
    try {
      new Notification("Synergy Athlete", {
        body: "Test-Benachrichtigung – Browser-Mitteilungen sind erlaubt.",
        icon: "/pwa-192.png",
      });
      toast.success("Browser-Testnachricht ausgelöst");
    } catch (error) {
      console.error("[push] Browser-Fallback nicht verfügbar:", error);
      throw new Error(
        "Der Service Worker reagiert nicht und dieser Browser erlaubt Mitteilungen nur über die installierte App.",
      );
    }
  }

  async function runNotificationTest(): Promise<void> {
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(
        permission === "denied"
          ? "Benachrichtigungen sind in den Browser- oder App-Einstellungen blockiert."
          : "Die Benachrichtigungs-Berechtigung wurde nicht erteilt.",
      );
    }

    if (active) {
      const result = await test();
      if (!result.ok) throw new Error("Kein aktives Push-Gerät gefunden.");
      toast.success("Testnachricht gesendet");
      return;
    }

    const registration =
      (await registerServiceWorker()) ??
      (await navigator.serviceWorker?.getRegistration());
    if (!registration) {
      console.warn("[push] Kein Service Worker registriert – Browser-Fallback wird getestet.");
      await showBrowserFallback();
      return;
    }

    try {
      const readyRegistration = await getReadyServiceWorkerRegistration();
      await readyRegistration.showNotification("Synergy Athlete", {
        body: "Test-Benachrichtigung – so sehen deine Erinnerungen aus.",
        icon: "/pwa-192.png",
        badge: "/pwa-192.png",
      });
      toast.success("Lokale Testnachricht ausgelöst");
    } catch (error) {
      console.error("[push] Service-Worker-Test fehlgeschlagen, nutze Browser-Fallback:", error);
      await showBrowserFallback();
    }
  }

  if (!supported) {
    return (
      <div className="card-elevated space-y-2 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <BellOff className="h-4 w-4" /> Benachrichtigungen
        </h2>
        <p className="text-sm text-muted-foreground">
          Dieser Browser unterstützt keine Push-Benachrichtigungen. Auf dem iPhone funktioniert es,
          sobald du die App über „Zum Home-Bildschirm" installierst.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Bell className="h-4 w-4" /> Benachrichtigungen
          </h2>
          <p className="text-sm text-muted-foreground">
            Erinnerungen zu Check-in, Planänderungen und Spieltagen – nur auf diesem Gerät.
          </p>
        </div>
        <Switch checked={active} disabled={busy || !installed} onCheckedChange={toggle} aria-label="Benachrichtigungen aktivieren" />
      </div>
      {!installed && (
        <p className="rounded-lg border border-border bg-elevated p-3 text-xs text-muted-foreground">
          Der Service Worker ist noch nicht aktiv. Lade die Seite neu – Push braucht HTTPS und eine
          erfolgreiche Registrierung. Details stehen in der Browser-Konsole.
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await withTimeout(
              runNotificationTest(),
              "Zeitüberschreitung: Der Benachrichtigungsdienst hat nach 5 Sekunden nicht reagiert.",
            );
          } catch (e) {
            console.error("[push] Testbenachrichtigung fehlgeschlagen:", e);
            toast.error(humanError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Test-Benachrichtigung senden
      </Button>

      {active && prefs && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Welche Erinnerungen?
          </div>
          <TopicRow
            label="Täglicher Check-in"
            desc="Abends, wenn für heute noch kein Eintrag vorliegt."
            checked={prefs.topic_checkin}
            disabled={savingPrefs}
            onChange={(v) => updatePref({ topic_checkin: v })}
          />
          <TopicRow
            label="Geplantes Training"
            desc="Morgens, wenn eine Gym- oder Sporteinheit ansteht."
            checked={prefs.topic_plan}
            disabled={savingPrefs}
            onChange={(v) => updatePref({ topic_plan: v })}
          />
          <TopicRow
            label="Spieltag"
            desc="Am Tag deines Spiels bzw. Wettkampfs."
            checked={prefs.topic_matchday}
            disabled={savingPrefs}
            onChange={(v) => updatePref({ topic_matchday: v })}
          />

          <div className="pt-1 text-xs uppercase tracking-widest text-muted-foreground">
            Ruhezeit (keine Erinnerungen)
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Von</span>
            <HourSelect
              value={prefs.quiet_start}
              disabled={savingPrefs}
              onChange={(v) => updatePref({ quiet_start: v })}
            />
            <span className="text-muted-foreground">bis</span>
            <HourSelect
              value={prefs.quiet_end}
              disabled={savingPrefs}
              onChange={(v) => updatePref({ quiet_end: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TopicRow({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function HourSelect({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))} disabled={disabled}>
      <SelectTrigger className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 24 }, (_, h) => (
          <SelectItem key={h} value={String(h)}>
            {String(h).padStart(2, "0")}:00
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
