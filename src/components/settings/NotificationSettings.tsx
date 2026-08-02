import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/lib/push.functions";
import { pushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/pwa/push";
import { humanError } from "@/lib/errors";

/** Ein-/Ausschalten der Push-Benachrichtigungen für dieses Gerät. */
export function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(true);

  const vapid = useServerFn(getVapidPublicKey);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const test = useServerFn(sendTestPush);

  useEffect(() => {
    setSupported(pushSupported());
    if (!pushSupported()) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      setInstalled(!!reg);
      const sub = await reg?.pushManager.getSubscription();
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
          In der Vorschau ist der Service Worker deaktiviert, deshalb lässt sich Push hier nicht
          einschalten. Öffne die veröffentlichte App (oder installiere sie auf dem Home-Bildschirm)
          und aktiviere die Benachrichtigungen dort.
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            if (active) {
              const res = await test();
              toast[res.ok ? "success" : "error"](
                res.ok ? "Testnachricht gesendet" : "Kein aktives Gerät gefunden",
              );
              return;
            }
            const perm =
              Notification.permission === "granted"
                ? "granted"
                : await Notification.requestPermission();
            if (perm !== "granted") {
              toast.error("Benachrichtigungen wurden im Browser blockiert.");
              return;
            }
            const reg = await navigator.serviceWorker?.getRegistration();
            if (reg) {
              // Android/Chrome erlaubt nur Notifications über den Service Worker.
              await reg.showNotification("Synergy Athlete", {
                body: "Test-Benachrichtigung – so sehen deine Erinnerungen aus.",
                icon: "/pwa-192.png",
                badge: "/pwa-192.png",
              });
              toast.success("Lokale Testnachricht ausgelöst");
              return;
            }
            try {
              new Notification("Synergy Athlete", {
                body: "Test-Benachrichtigung – so sehen deine Erinnerungen aus.",
                icon: "/pwa-192.png",
              });
              toast.success("Lokale Testnachricht ausgelöst");
            } catch {
              toast.error(
                "Testnachricht braucht die installierte bzw. veröffentlichte App – in der Vorschau ist der Service Worker deaktiviert.",
              );
            }

          } catch (e) {
            toast.error(humanError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Test-Benachrichtigung senden
      </Button>

    </div>
  );
}
