import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Activity,
  Bike,
  BookOpen,
  CalendarDays,
  Camera,
  Dumbbell,
  FileUp,
  Flag,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  LogOut,
  Mail,
  Medal,
  MessageSquare,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
 
interface NavItem {
  to: string;
  key: string;
  icon: LucideIcon;
  shortKey?: string;
}
 
const ATHLETE_NAV: NavItem[] = [
  { to: "/dashboard", key: "nav.dashboard", shortKey: "nav.short.home", icon: LayoutDashboard },
  { to: "/plan", key: "nav.plan", shortKey: "nav.short.plan", icon: CalendarDays },
  { to: "/checkin", key: "nav.checkin", icon: HeartPulse },
  { to: "/matchday", key: "nav.matchday", icon: Timer },
  { to: "/gym", key: "nav.gym", shortKey: "nav.short.gym", icon: Dumbbell },
  { to: "/sport", key: "nav.sport", icon: Trophy },
  { to: "/nutrition", key: "nav.nutrition", shortKey: "nav.short.food", icon: Utensils },
  { to: "/scan", key: "nav.scan", icon: Camera },
  { to: "/journal", key: "nav.journal", icon: BookOpen },
  { to: "/insights", key: "nav.insights", icon: TrendingUp },
  { to: "/activities", key: "nav.activities", icon: Activity },
  { to: "/courses", key: "nav.courses", icon: Flag },
  { to: "/analytics", key: "nav.analytics", icon: LineChart },
  { to: "/records", key: "nav.records", icon: Trophy },
  { to: "/leaderboard", key: "nav.leaderboard", icon: Medal },
  { to: "/triathlon", key: "nav.triathlon", icon: Bike },
  { to: "/races", key: "nav.races", icon: Flag },
  { to: "/equipment", key: "nav.equipment", icon: Wrench },
  { to: "/import", key: "nav.import", icon: FileUp },
  { to: "/invites", key: "nav.invites", icon: Mail },
  { to: "/chat", key: "nav.chat", icon: MessageSquare },
  { to: "/privacy", key: "nav.privacy", icon: ShieldCheck },
];
 
const COACH_NAV: NavItem[] = [
  { to: "/team", key: "nav.teams", icon: Users },
  { to: "/chat", key: "nav.chat", icon: MessageSquare },
];
 
export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();
 
  const { data: role } = useQuery({
    queryKey: ["me-role-nav"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return "athlete" as const;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", u.user.id)
        .maybeSingle();
      return (data?.role ?? "athlete") as "athlete" | "coach";
    },
  });
 
  const [moreOpen, setMoreOpen] = useState(false);
 
  const NAV = role === "coach" ? COACH_NAV : ATHLETE_NAV;
  const findNav = (to: string) => ATHLETE_NAV.find((n) => n.to === to)!;
  const MOBILE_NAV =
    role === "coach"
      ? COACH_NAV
      : [findNav("/dashboard"), findNav("/plan"), findNav("/gym"), findNav("/nutrition")];
  const MORE_NAV = role === "coach" ? [] : NAV.filter((n) => !MOBILE_NAV.includes(n));
 
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success(t("nav.signedOut"));
    router.navigate({ to: "/auth", replace: true });
  }
 
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neon focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-neon-foreground">
        {t("nav.skip")}
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-sidebar px-3 py-5 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-neon-foreground font-display text-lg font-bold glow">
            H
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">Hybrid</div>
            <div className="text-xs text-muted-foreground">
              {role === "coach" ? t("nav.roleCoach") : t("nav.roleAthlete")}
            </div>
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
                )}>
                <Icon className="h-4 w-4" />
                {t(n.key)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-elevated hover:text-foreground">
            <Settings className="h-4 w-4" />
            {t("nav.settings")}
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-elevated hover:text-foreground">
            <LogOut className="h-4 w-4" />
            {t("nav.signout")}
          </button>
        </div>
      </aside>
 
      <main id="main-content" className="md:pl-60 pb-24 md:pb-6">
        <div className="mx-auto max-w-5xl px-4 pt-4 md:pt-8 md:px-8">{children}</div>
      </main>
 
      {moreOpen && MORE_NAV.length > 0 && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-16 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-border bg-card"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 justify-center py-2">
              <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pt-0"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
              <div className="grid grid-cols-3 gap-2">
                {MORE_NAV.map((n) => {
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-1.5 rounded-lg bg-elevated px-2 py-3 text-xs font-medium text-muted-foreground">
                      <Icon className="h-5 w-5 text-neon" />
                      <span className="text-center leading-tight">{t(n.key)}</span>
                    </Link>
                  );
                })}
                <Link
                  to="/settings"
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-lg bg-elevated px-2 py-3 text-xs font-medium text-muted-foreground">
                  <Settings className="h-5 w-5 text-neon" />
                  {t("nav.settings")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
 
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${MOBILE_NAV.length + (MORE_NAV.length ? 1 : 0)}, minmax(0, 1fr))`,
          }}>
          {MOBILE_NAV.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium",
                  active ? "text-neon" : "text-muted-foreground",
                )}>
                <Icon className="h-5 w-5" />
                {t(n.shortKey ?? n.key)}
              </Link>
            );
          })}
          {MORE_NAV.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label={t("nav.moreAria")}
              aria-expanded={moreOpen}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium",
                moreOpen ? "text-neon" : "text-muted-foreground",
              )}>
              <MoreHorizontal className="h-5 w-5" />
              {t("nav.more")}
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
 
