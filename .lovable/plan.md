## Status

Migration ist durchgelaufen:
- Tabelle `progress_insights` (mit RLS + Trigger) angelegt.
- FKs von `chat_participants.user_id`, `chat_messages.sender_id`, `team_members.user_id`, `teams.coach_id` auf `public.profiles(id)` gesetzt.
- RPC `create_team_with_chat(_name)` erstellt (Coach-Guard, atomar Team + Chat + Coach-Teilnahme).

Die neuen FKs heißen z. B. `chat_participants_user_id_profiles_fkey`. Der Code referenziert aber alte Hint-Namen (`chat_participants_user_id_fkey` etc.), deshalb bleiben Build-Fehler.

## Verbleibende Code-Fixes (Bitte auf Build-Modus umschalten)

1. **Profil-Embed-Hints umbenennen** in:
   - `src/routes/_authenticated/chat.tsx`
   - `src/routes/_authenticated/chat.$id.tsx`
   - `src/routes/_authenticated/invites.tsx`
   - `src/routes/_authenticated/team.tsx`

   Ersetzungen:
   - `profiles!chat_participants_user_id_fkey` → `profiles!chat_participants_user_id_profiles_fkey`
   - `profiles!chat_messages_sender_id_fkey` → `profiles!chat_messages_sender_id_profiles_fkey`
   - `profiles!teams_coach_id_fkey` → `profiles!teams_coach_id_profiles_fkey`
   - `profiles!team_members_user_id_fkey` → `profiles!team_members_user_id_profiles_fkey`

2. **`SportSession`-Typ** (`src/lib/planner.ts`) um optionales `id?: string` erweitern – wird in `plan.tsx` beim Update genutzt.

Danach `bunx tsgo --noEmit` grün.

## Bitte

Auf **Build-Modus** umschalten, dann setze ich diese kleinen Änderungen um.
