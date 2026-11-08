# Cosmetics — checkpoint 2

The approved design separates four main categories: Clock skins, Focus Space backgrounds, Website themes, and Track decorations. Track decorations retain their color/icon/background subcategories.

## Appearance

- Added `space:default` (free), `space:garden` (100 Coin) and `space:night` (200 Coin). `focus_background` is stored independently of `clock_skin` and `site_theme`.
- The studio combines draft clock/background choices in its large preview. Drafts survive category switches, including for locked items. Previewing does not write preferences, buy items or change the actual dashboard. Reset returns to the saved setup.
- Equipping one category changes only that selection. Fixed item palettes remain independent of website palettes. Light/dark remains available; the night background keeps its readable dark palette in both modes.
- Orbit now has a circular face that sizes its text for Focus, Break and Lock in. Flip keeps its own materials and colors. Focus Space backgrounds cover the complete timer panel and expand to fullscreen with it.
- Responsive previews use a smaller clock in small catalog cards. Fullscreen backgrounds retain their selected artwork with square viewport corners.

## Coin rewards

- Rewards are automatic after saving a valid Focus/Lock in session. Breaks, pauses, discarded rounds and unsaved time do not earn Coin.
- Daily Quest: 600 saved focus seconds = 5 Coin, 1800 = 10 more, 3600 = 20 more, 7200 = 30 more; maximum 65 Coin per actual study date. All Tracks contribute to the same account's Daily Quest.
- Every 36000 saved focus seconds in an individual Track awards another 50 Coin. A long save can cross several milestones at once. Each Track grows independently; archiving and restoring preserve progress.
- Daily progress uses the existing captured-timezone `session_day_allocations`. Saving after midnight or changing profile timezone does not move prior study time. Legacy time with unknown daily allocation counts only toward trusted all-time Track totals, not guessed daily dates.
- Existing saved progress is backfilled once. Unique ledger source keys prevent repeat rewards. Credits and purchases share an owner advisory lock; clients cannot assign Coin amounts, rewards or counters.
- Counters update on session save, with one daily rollup per study date and one Track rollup per subject. There are no per-second reward writes or history rescans on every save. Reward rows remain immutable to clients.
- Studio shows today's four quest goals, wallet and paginated Track milestones (six per page). It refreshes on return to the tab, at the profile's midnight and on manual Refresh. Saving a timer revalidates the studio.
- Christmas/Frost remains a preview-only event placeholder. No date range or event award is assumed; its window must be specified before implementing the event.

## Database

Hosted migrations match local files:

- `20261108085115_focus_space_backgrounds.sql`
- `20261108085117_study_coin_rewards.sql`

New `daily_quest_progress` and `track_reward_progress` tables are SELECT-only for their owner under RLS, including admin accounts. `study_rewards` is an authenticated, owner-filtered, stable read RPC. Coin writes occur only in a private trigger after validated session allocation. The `zz_` trigger name explicitly orders it after `allocate_session_days`.

## Verification

- Full suite: **74 tests passed**, zero failures. Targeted ESLint and the final production build (including TypeScript) passed.
- Seven cosmetics database cases cover ownership, purchase replay, overspending, invalid/event items, direct API tampering and independent appearance selections.
- Eleven reward database cases cover backfill, exact thresholds, duplicate saves, pauses/breaks/discards, midnight/timezone/DST, multiple Track milestones, legacy data, archive/restore, permissions, cross-Track Daily Quest accumulation, spending earned Coin and pagination.
- Existing account/audio/timer/goals/statistics/streak/Track tests remain passing.
- Hosted UI test used a marked temporary account with real saved fixture timelines, without manually granting Coin. A two-second timer saved through the UI crossed both the daily two-hour goal and a Track ten-hour milestone: wallet increased by 80 Coin, exactly 30 + 50. Reloading did not award again.
- UI verified four main categories, combined locked-item previews, independent purchases/equipping, persistence after reload, midnight artwork with Flip on Halloween, mobile circular Lock in, and fullscreen background preservation.
- Thirty-six layout combinations (six categories/subcategories × three viewport widths × light/dark), including English labels, had no horizontal page overflow. Thai desktop/mobile screenshots were also inspected. Reduced-motion mode disabled the page entrance animation.
- Switching the website from Halloween to Default preserved the exact computed clock and panel backgrounds/colors. Signing out reset guest appearance to Default without leaking the previous account's selections. No browser page errors were recorded.
- Hosted guest API checks deny new tables/RPCs. Security advisors have no new warnings; the existing Auth leaked-password setting is unchanged.

Temporary fixtures were removed after QA; hosted checks confirmed zero remaining fixture users, sessions, Coin rows, inventory or reward counters. Existing real study history is preserved.
