# Dashboard utility drawers

Approved UI change: move only the right-side weekly statistics and soundscape
cards into floating game-style controls. Keep timer and Daily Goals together
as the main workspace. Preserve existing top summaries and Track functionality.

- Two circular bottom-right buttons open a single right-edge drawer.
- Translucent panel, fading/blurred backdrop, slide-in/out and reduced motion.
- Statistics/sound tabs switch content within the drawer; full statistics route
  and existing timer audio settings remain available.
- Outside click, close button and Esc dismiss; native modal focus isolation,
  restored trigger focus, scroll lock and bounded mobile scrolling.
- Ambient playback and timer state outlive drawer open/close. No autoplay.
- On Home the sound button indicates playback and opens controls. Hide the
  separate audio dock there; it remains available on other routes.
- Daily Goals sit at timer height on desktop; stack directly after timer on
  smaller viewports. Track overview follows the main timer/goals grid.
- Existing /#music links open sound settings; sidebar sound entry opens drawer.
- No database changes or new packages.

Status: implemented and verified.

## Verification

- Lint, TypeScript and production build pass.
- Isolated guest browser: no statistics/audio cards inside main; timer and
  Goals are together, Track overview follows; exactly two floating controls.
- Both panels at 375/768/1440 × Thai/English × Light/Dark: no horizontal
  overflow, viewport-bounded panel and accessible close control.
- Confirmed actual right-edge slide and translucent/blurred backdrop animation.
  Reduced-motion preference removes panel/scrim animation.
- Escape, X and outside click dismiss; original trigger focus and body scroll
  restored. Sidebar sound action and /#music deep link open the drawer.
- Switch panels while audio plays: one source continues. Close panel: audio
  continues. Running countdown advances through opening and closing.
- Landscape 812×375: drawer scrolls to all settings and source credit links.
- Fullscreen fallback still enters/exits; utility controls become inert and
  timer ancestors remain untransformed.
- Screenshots inspected in desktop light and mobile dark. No DB changes,
  package additions or changes to timer/statistics calculation.
- Home uses only the two floating buttons even while audio plays. Navigation
  to Login reveals the existing dock without restarting the source.
- The global audio dialog is mounted beside its dock so browser Back to Home
  cannot hide an open modal. Verified visible, dismissible dialog after Back,
  restored body scroll and continuous single-source playback.

