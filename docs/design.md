# Design direction

PennyPal borrows Apple's habits and keeps the brief's playful palette (lavender, sky, sunshine, mint).

- **One hero moment per screen.** Penny, or the wallet balance, is the focal point; everything else steps back.
- **Large, confident type** (Fredoka headings, Inter body) and generous whitespace.
- **Concentric radii.** Cards 28px, controls 16px, modals 32px; inner radius is always smaller than the outer.
- **Translucent chrome.** Top bar and bottom tab bar use a blurred glass material.
- **Motion answers a touch.** Spring-eased modals, coins on deposit, confetti on goal completion. No ambient clutter.
- **Accessible.** 44px minimum targets, visible focus rings, labeled controls, `prefers-reduced-motion` respected, plus an in-app animation toggle.
- **Plain copy.** Errors say what happened and what to try next ("You do not have enough coins for that. Try a smaller amount!").
