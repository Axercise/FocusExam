# Ten-minute daily Streak

Requested: award one Streak day after ten minutes of real study and show a
centered, dismissible previous → new Streak notification.

## Contract

- Accumulate actual server-timed focus/Lock in intervals across rounds and
  Tracks, including a running round. Pauses and break-mode rounds do not count.
- Each calendar date needs 600,000 credited active milliseconds. Split at local
  midnight in each run's timezone snapshot, preserving exact millisecond credit.
- Streak awards do not depend on later Track save. Discarding a round does not
  undo time actually studied or an already-earned day.
- One immutable earned row per owner/date, server-verified and inaccessible to
  direct authenticated writes. Serialize using the existing per-owner timer lock.
- Consecutive qualifying dates determine current/longest Streak. Missing a date
  resets the next run of days. Old incomplete timelines never receive guesses.
- One server-claimed celebration per current day across tabs/devices. Closing
  does not revoke credit. Claim when visible and no other modal is open.
- Centered notification, X and acknowledgement button, Thai/English, both
  themes, reduced motion, accessible focus; visible inside timer fullscreen.
- Check at timer transitions, next threshold/midnight and visibility return.
  No database write or network request for every timer tick.
- Stage the app safely if the hosted migration is unavailable; keep timer/save
  functionality usable, and report the pending hosted step explicitly.

Status: complete. Hosted migration applied and real Auth/Data API/browser flows
verified on 2026-11-08 through the project-scoped Supabase connection.

## Implementation

- Migration `20261108030410_ten_minute_streaks.sql` adds immutable owner/date
  awards, private server calculations, an authenticated status/claim RPC, and
  changes statistics Streaks to qualifying days. Existing verified timelines
  are backfilled. Existing timers, saved sessions, Tracks and goals are retained.
- The browser schedules a check from the server's next threshold/midnight and
  wakes on timer transitions or returning to the page. It never writes each
  timer tick. Hidden tabs defer claiming, and open dialogs defer celebrations.
- A returned server notice opens inside the timer's fullscreen surface. The
  X, acknowledgement button and Escape dismiss it; native focus is restored.
- While the migration is absent, a missing-RPC response disables the new
  monitor without interrupting existing timers. Database types have now been
  regenerated from the hosted schema, including the earned-day table and RPC.
- Added pinned **development-only** `@electric-sql/pglite@0.5.15` to test the
  actual SQL migrations using disposable in-memory PostgreSQL. It is not used
  by the app or shipped as a client database.

## Verification

- `npm run build` and `npm run lint` pass. Build includes TypeScript checking.
- `node --test "scripts/*.test.mjs"`: **48 passed**, including 13 new Streak
  tests. The ten database tests apply the complete migration chain to a minimal
  Supabase Auth fixture. Cases cover 599999+1 milliseconds across rounds,
  pause/break/legacy exclusion, countdown caps, unsaved running Lock in,
  local midnight and year rollover, DST, timezone snapshots, gap/consecutive
  streaks, backfill, notice claims/retries, owner isolation, permission denial,
  and saving a qualified round without duplicate credit.
- Actual celebration component tested in a temporary local preview route:
  Thai/light desktop, English/dark mobile, native fullscreen in landscape,
  X/acknowledgement/Escape, focus restoration and reduced motion. Short
  landscape view fits without internal scrolling. Preview route removed
  before the final build.
- Final production server on port 3000: home returns 200, preview returns 404,
  no browser runtime errors, and a one-second guest countdown completes
  without showing a permanent-account Streak reward.
- Hosted `scripts/streak-hosted-check.sql` passed. It creates disposable Auth
  users inside a transaction, asserts the actual threshold, aggregation,
  consecutive days, single claim, owner isolation, write denial, running Lock
  in and grants, then rolls all fixtures back.
- Two parallel hosted claim requests for one isolated owner returned exactly
  one notice. Two signed-in browser tabs likewise produced one celebration.
  The notice was observed in the second tab; automation reported both pages
  visible, so this check asserts uniqueness rather than which tab wins.
- Actual hosted browser flow: 590 seconds of seeded QA study plus 10 seconds
  in a real UI-started Lock in earned 1 → 2 without saving first. With the
  sound settings dialog open, the award was recorded and the celebration
  deferred. Closing sound settings displayed the popup in native fullscreen;
  background audio and the timer continued. X dismissed it. Saving to the QA
  Track retained Streak 2, reloading did not replay it, and `/statistics`
  showed current/longest 2 with the ten-minute rule. No browser errors were
  observed in this complete single-tab flow.
- `npm run check:supabase` now verifies anonymous denial for the earned-day
  table and streak RPC through the real Data API, alongside existing tables.
- Hosted generated types, migration history and local filename are aligned.
  Build (including TypeScript), lint and all 13 Streak tests passed again after
  regeneration; the earlier full suite passed all 48 tests.
- Post-migration performance advisors are clear. Security advisors contain only
  the pre-existing Auth setting warning: [leaked password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
  No new database advisories were reported. Auth settings were not changed.

## Data preservation and cleanup

The applied migration preserved the existing two users, five timer runs, six
segments, five saved sessions, two Tracks and two goals. It backfilled one
qualifying real earned day. Hosted tests used two additional randomly named
Auth fixtures marked in server-maintained app metadata, then deleted only
those exact fixture identities with a matching marker guard. Their cascading
test rows and local credential file were removed. Final counts match the
original data plus the one real earned day; no QA identities remain.

The local production app is available on port 3000. No separate public hosting
deployment was requested or performed.

Claiming is atomic and delivery is at most once across devices. A response lost
after the claim commits can lose the popup; the earned day remains saved. The
notification is intentionally not replayed on each refresh or on older dates.
