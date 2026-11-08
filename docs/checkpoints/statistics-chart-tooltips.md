# Statistics chart tooltips

Completed 2026-11-08.

- Hovering a green segment shows its date and study duration. Hovering purple
  shows the same date's break duration. Durations retain seconds (HH:MM:SS).
- Shared TimeChart supports full statistics and the compact dashboard panel,
  Thai/English, light/dark and reduced motion. No additional package is needed.
- Tooltips sit outside the horizontal scroll viewport and clamp horizontally
  to their chart. They anchor above the whole stack so switching between its
  green/purple segments is unobstructed; near the viewport top they flip below.
- Keyboard focus shows both durations, including zero days. Escape dismisses
  the tooltip before dismissing an enclosing native dialog. Hovering the
  tooltip keeps it open. Existing click selection and daily details remain.
- Browser checks used actual components with temporary sample props: a
  30-day chart, compact chart, and compact chart inside a native drawer.
  Verified study 01:05:09 versus break 00:12:34, zero values, focus, immediate
  Escape, leaving/hovering tooltip, monthly scrolling, 390px dark/English
  layout, native-dialog layering and reduced motion. Temporary route removed.
- Final validation: ESLint on the changed TimeChart component and production
  build (including TypeScript) passed. The production home returns 200 and the
  removed preview route returns 404.
