# Track frames and hover glow

- Track list cards and dashboard Track links carry the saved subject color through `data-track-color`.
- Each of the twelve available colors has its own border and hover/focus glow. Dark-mode variants keep the frame visible. Seasonal website themes do not replace the chosen Track accent.
- Existing Track background patterns remain in place. Color-specific styling changes the frame/shadow, not the saved background.
- Mint, blue and peach swatches now retain their subject palettes on seasonal themes too.
- Keyboard focus produces the same colored glow. The stretched title-link outline uses the Track accent; Edit and Archive remain reachable above that link.
- Reduced-motion mode retains colored feedback and disables the transition and lift.

Validation: targeted ESLint passed. Browser CSS fixtures using the app styles verified all 12 colors on both card layouts in light/dark (48 combinations), keyboard focus, Edit hit targets, preserved patterned backgrounds and 375 px layout without horizontal overflow. No database changes were needed.

Production build (including TypeScript) passed. Coral and blue frames/glows were rechecked against the final compiled stylesheet without injected styles. Temporary browser fixtures were closed after QA.
