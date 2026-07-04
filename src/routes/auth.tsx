import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Anmelden – Hybrid Athlete" },
      { name: "description", content: "Melde dich an und plane Training, Recovery und Ernährung." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"athlete" | "coach">("athlete");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name, role },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").update({ role, name }).eq("id", data.user.id);
        }
        toast.success("Konto erstellt");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Willkommen zurück");
      }
      nav({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      toast.error(res.error.message);
      setLoading(false);
      return;
    }
    if (res.redirected) return;
    nav({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon text-neon-foreground glow">
            <Zap className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Hybrid Athlete</h1>
            <p className="text-sm text-muted-foreground">Performance Planner</p>
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="mb-4 flex gap-1 rounded-lg bg-elevated p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "login" ? "bg-neon text-neon-foreground" : "text-muted-foreground"
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "signup" ? "bg-neon text-neon-foreground" : "text-muted-foreground"
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Konto erstellen" : "Einloggen"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            oder
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google} disabled={loading}>
            <GoogleIcon className="mr-2 h-4 w-4" /> Mit Google fortfahren
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Mit dem Fortfahren stimmst du der Nutzung deiner Trainings- und Ernährungsdaten zur Planung zu.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#EA4335" d="M12 10v4h5.7c-.2 1.3-1.6 3.8-5.7 3.8-3.4 0-6.2-2.8-6.2-6.3s2.8-6.3 6.2-6.3c2 0 3.3.8 4 1.6l2.7-2.6C16.9 2.7 14.6 1.7 12 1.7 6.6 1.7 2.2 6 2.2 11.5S6.6 21.3 12 21.3c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.4-.2-2H12z"/>
    </svg>
  );
}
