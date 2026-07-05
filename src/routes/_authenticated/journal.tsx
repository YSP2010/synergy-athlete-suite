import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Download,
  Flame,
  Tag as TagIcon,
  Pencil,
  X,
  Loader2,
} from "lucide-react";
import { toISODate, addDays, WEEKDAY_LONG, isoDow } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [{ title: "Tagebuch – Hybrid Athlete" }] }),
  component: JournalPage,
});

interface Entry {
  id: string;
  date: string;
  title: string | null;
  content: string;
  tags: string[] | null;
  mood: number | null;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 20;

const MOODS = [
  { v: 1, emoji: "😞", label: "mies" },
  { v: 2, emoji: "😕", label: "ok" },
  { v: 3, emoji: "😐", label: "neutral" },
  { v: 4, emoji: "🙂", label: "gut" },
  { v: 5, emoji: "🔥", label: "top" },
];

function JournalPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Paginierte Hauptliste (mit content) – 20 Einträge pro Seite.
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["journal"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const from = pageParam * PAGE_SIZE;
      const { data: rows, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", u.user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { uid: u.user.id, rows: (rows ?? []) as Entry[] };
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.rows.length === PAGE_SIZE ? allPages.length : undefined,
  });

  const uid = data?.pages[0]?.uid ?? "";
  const loadedEntries = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.rows),
    [data],
  );

  // Leichtgewichtige Meta-Query über ALLE Einträge (nur date + tags, kein content)
  // für Streak-Berechnung und Tag-Übersicht – unabhängig von der Pagination.
  const { data: metaRows } = useQuery({
    queryKey: ["journal-meta"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { data: rows, error } = await supabase
        .from("journal_entries")
        .select("date,tags")
        .eq("user_id", u.user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return (rows ?? []) as { date: string; tags: string[] | null }[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loadedEntries.filter((e) => {
      if (activeTag && !(e.tags ?? []).includes(activeTag)) return false;
      if (!q) return true;
      return (
        (e.title ?? "").toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [loadedEntries, search, activeTag]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    (metaRows ?? []).forEach((e) =>
      (e.tags ?? []).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)),
    );
    return [...m.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [metaRows]);

  const totalCount = metaRows?.length ?? 0;

  const streak = useMemo(() => {
    if (!metaRows || !metaRows.length) return { current: 0, best: 0 };
    const dates = new Set(metaRows.map((r) => r.date));
    let current = 0;
    let cursor = new Date();
    // if no entry today, streak may still be counted from yesterday only if today is empty and it's not yet late — simple: require today for current
    if (!dates.has(toISODate(cursor))) {
      // allow "yesterday" tolerance
      cursor = addDays(cursor, -1);
      if (!dates.has(toISODate(cursor))) return { current: 0, best: bestStreak(dates) };
    }
    while (dates.has(toISODate(cursor))) {
      current++;
      cursor = addDays(cursor, -1);
    }
    return { current, best: Math.max(current, bestStreak(dates)) };
  }, [metaRows]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["journal-meta"] });
      toast.success("Eintrag gelöscht");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Export lädt bewusst ALLE Einträge frisch (nicht nur die paginierten Seiten).
  async function exportJson() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: rows } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", u.user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!rows?.length) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tagebuch-${toISODate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Tagebuch</h1>
          <p className="text-sm text-muted-foreground">
            Reflektiere Training, Regeneration & Mindset.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportJson}
            disabled={totalCount === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <Button
            size="sm"
            className="bg-neon text-neon-foreground hover:bg-neon/90 glow"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Neu
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Aktuelle Serie"
          value={`${streak.current} ${streak.current === 1 ? "Tag" : "Tage"}`}
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Einträge gesamt"
          value={String(totalCount)}
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Bester Streak"
          value={`${streak.best} ${streak.best === 1 ? "Tag" : "Tage"}`}
        />
      </div>

      {showForm && (
        <EntryForm
          uid={uid}
          entry={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["journal"] });
            qc.invalidateQueries({ queryKey: ["journal-meta"] });
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <div className="card-elevated p-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche in Titel, Inhalt oder Tags…"
            className="border-0 bg-transparent focus-visible:ring-0"
          />
          {(search || activeTag) && (
            <button
              onClick={() => {
                setSearch("");
                setActiveTag(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {search && hasNextPage && (
          <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
            Durchsucht die geladenen Einträge – ggf. weiter laden für ältere Treffer.
          </div>
        )}
        {allTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
            {allTags.slice(0, 20).map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                  activeTag === tag
                    ? "bg-neon text-neon-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                #{tag} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Lade…</div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-neon-soft text-neon">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="font-display font-semibold">
            {loadedEntries.length ? "Keine Treffer" : "Noch keine Einträge"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {loadedEntries.length
              ? "Passe Suche oder Tag-Filter an."
              : "Halte deinen ersten Tag fest — Training, Schlaf, Stimmung."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              onEdit={() => {
                setEditing(e);
                setShowForm(true);
              }}
              onDelete={() => {
                if (confirm("Eintrag wirklich löschen?")) del.mutate(e.id);
              }}
            />
          ))}
          {hasNextPage && (
            <div className="pt-1 text-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mehr laden
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function bestStreak(dates: Set<string>): number {
  const sorted = [...dates].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && toISODate(addDays(new Date(prev), 1)) === d) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card-elevated p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="text-neon">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular">{value}</div>
    </div>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const d = new Date(entry.date);
  const mood = MOODS.find((m) => m.v === entry.mood);
  return (
    <article className="card-elevated p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {WEEKDAY_LONG[isoDow(d)]} ·{" "}
            {d.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
          <h3 className="mt-0.5 font-display text-lg font-semibold">
            {entry.title || "Ohne Titel"}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {mood && (
            <span
              className="rounded-full bg-muted px-2 py-1 text-sm"
              title={mood.label}
            >
              {mood.emoji}
            </span>
          )}
          <button
            onClick={onEdit}
            className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Bearbeiten"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:text-danger"
            aria-label="Löschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {entry.content && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {entry.content}
        </p>
      )}
      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-neon-soft px-2 py-0.5 text-[10px] font-medium text-neon"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function EntryForm({
  uid,
  entry,
  onClose,
  onSaved,
}: {
  uid: string;
  entry: Entry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(entry?.date ?? toISODate(new Date()));
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, "").toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Nicht eingeloggt");
      if (!content.trim() && !title.trim())
        throw new Error("Titel oder Inhalt erforderlich");
      const payload = {
        user_id: uid,
        date,
        title: title.trim() || null,
        content: content.trim(),
        tags,
        mood,
      };
      if (entry) {
        const { error } = await supabase
          .from("journal_entries")
          .update(payload)
          .eq("id", entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journal_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(entry ? "Eintrag aktualisiert" : "Eintrag gespeichert");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="card-elevated space-y-3 border-neon/30 p-4">
      <div className="flex items-center justify-between">
        <div className="font-display font-semibold">
          {entry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
        </div>
        <button
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Datum</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Titel (optional)</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
            placeholder="Was war heute prägend?"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Stimmung</Label>
        <div className="mt-1 flex gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setMood(mood === m.v ? null : m.v)}
              className={`grid h-10 w-10 place-items-center rounded-lg border text-lg transition ${
                mood === m.v
                  ? "border-neon bg-neon-soft"
                  : "border-border bg-card hover:border-neon/50"
              }`}
              title={m.label}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs">Inhalt</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="mt-1 resize-y"
          placeholder="Wie lief das Training? Wie war die Regeneration? Was hast du gelernt?"
        />
      </div>
      <div>
        <Label className="text-xs">Tags</Label>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2">
          {tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-neon-soft px-2 py-0.5 text-[11px] font-medium text-neon"
            >
              #{t}
              <button
                type="button"
                onClick={() => setTags(tags.filter((x) => x !== t))}
                className="hover:text-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="flex flex-1 items-center gap-1">
            <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                } else if (e.key === "Backspace" && !tagInput && tags.length) {
                  setTags(tags.slice(0, -1));
                }
              }}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder="Tag + Enter"
              className="min-w-[100px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>
          Abbrechen
        </Button>
        <Button
          size="sm"
          className="bg-neon text-neon-foreground hover:bg-neon/90 glow"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {entry ? "Speichern" : "Eintrag anlegen"}
        </Button>
      </div>
    </div>
  );
}

