# Cosmetics — checkpoint 1

Current status: continued in [checkpoint 2](./cosmetics-checkpoint-2.md). Focus Space backgrounds and both Coin reward methods are now implemented there. The unresolved Coin-method notes below describe the end of checkpoint 1; only the Christmas event dates remain unspecified.

Implemented from the decoration requirements in AGENTS.md. Leaderboards remain a separate system.

## Available

- Dashboard sidebar entry and authenticated `/cosmetics` studio, Thai/English and light/dark.
- Essential default clock, Orbit (100 Coin), Flip studio (450 Coin), with previews before purchase. Skins also apply to the existing fullscreen timer.
- Default, Christmas (200 Coin) and Halloween (400 Coin) website palettes. Appearance persists per account in Supabase, independently of the existing light/dark preference.
- Nine free Track colors, three additional colors, three additional icons and three patterned backgrounds. The Track editor links to the studio and disables unowned options.
- Track list and dashboard cards render the saved background, icon and color. Existing Tracks retain their defaults.
- Shared read-only catalog, account-owned inventory and preferences, immutable Coin ledger. Server-checked purchases and equipping; owner advisory locks serialize purchases and unique source keys make duplicate purchases idempotent.
- PostgreSQL validates Track decoration entitlements on direct API writes, in addition to the UI controls. There are no client grants to mint Coins or inventory.
- Frost night is an event reward placeholder, previewable but unavailable for purchase or equipping until its event condition is implemented.

## Pending clarification before reward code

The user was asked whether Daily Quest should use saved focus/Lock in time allocated to actual study dates, with cumulative rewards of 5 + 10 + 20 + 30 = 65 Coin per day. This checkpoint does not award Coins or backfill historical rewards.

AGENTS.md mentions two ways of receiving Coins but describes only Daily Quest. The second method is unspecified. The proposed Christmas event window (24–26 December, two saved study hours) also awaits confirmation. No event date rule has been installed.

Production accounts start with no Coin credits. Temporary QA credits were confined to a marked test account and removed with that fixture. Do not manually grant real accounts free inventory to bypass the pending reward rules.

## Validation

- All 62 tests passed, including six new real PostgreSQL-compatible PGlite cases covering purchase replay, overspending, ownership, locked Track fields, guest/client write denial and event bypass attempts.
- TypeScript, targeted ESLint, production build and hosted guest Data API checks passed.
- Hosted authenticated browser checks: buy/equip Orbit and Flip; fullscreen fallback; Christmas/Halloween persistence after reload; buy/apply/persist gold color, Rocket icon and Aurora background.
- Five studio categories checked at 375, 768 and 1440 px with no horizontal page overflow. Mobile timer checked with Flip. No browser page errors observed.
- Security advisors: no new security issues. Existing leaked-password protection warning remains unrelated. The new reverse inventory FK index is expected to be initially unused.

Hosted migration: `20261108075503_cosmetics.sql`. Existing user study data was preserved.
