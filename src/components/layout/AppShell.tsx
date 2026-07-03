import { Link, useLocation, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Dumbbell,
  Utensils,
  Camera,
  BookOpen,
  HeartPulse,
  Settings,
  LogOut,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  shortLabel?: string;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortLabel: "Home" },
  { to: "/plan", label: "Wochenplan", icon: CalendarDays, shortLabel: "Plan" },
  { to: "/checkin", label: "Check-in", icon: HeartPulse, shortLabel: "Check" },
  { to: "/gym", label: "Gym-Log", icon: Dumbbell, shortLabel: "Gym" },
  { to: "/sport", label: "Sport-Log", icon: Trophy, shortLabel: "Sport" },
  { to: "/nutrition", label: "Ernährung", icon: Utensils, shortLabel: "Food" },
  { to: "/scan", label: "Scanner", icon: Camera, shortLabel: "Scan" },
  { to: "/journal", label: "Tagebuch", icon: BookOpen, shortLabel: "Diary" },
];

const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[4], NAV[5]];

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Abgemeldet");
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-sidebar px-3 py-5 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-neon-foreground font-display text-lg font-bold glow">
            H
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">Hybrid</div>
            <div className="text-xs text-muted-foreground">Athlete</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-neon-soft text-neon"
                    : "text-muted-foreground hover:bg-elevated hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-elevated hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Einstellungen
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-elevated hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md:pl-60 pb-24 md:pb-6">
        <div className="mx-auto max-w-5xl px-4 pt-4 md:pt-8 md:px-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
                  active ? "text-neon" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {n.shortLabel ?? n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
