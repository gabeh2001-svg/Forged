# Swell (formerly Forged) – working notes

Single-file web app: everything lives in `index.html` (HTML, CSS, JS, LocalStorage only). Netlify publishes the `main` branch to forgedtest.netlify.app.

## How updates are handled
- Build and test every change on the `pending` branch. Push `pending` freely.
- Never push or merge to `main` until the owner explicitly says to roll out ("send it", "roll out the update"). Each publish to `main` costs Netlify credits (about 15 of 300 a month).
- After each change, tell the owner what's waiting in the next update and roughly how many free updates are left.
- Also republish the Claude preview artifact so the owner can try changes for free.

## When adding a user-facing feature
- Add an entry to `RELEASES` (and bump `APP_VER`) in the "what's new" block: a short title and line per feature, plus optional mini-tour steps. Existing users then see a "What's new" pop-up on next open with a "Show me how" walkthrough.
- Update the full guided tour (`TOUR`) if the feature changes how a screen works.
- If a new piece of user info becomes essential, add it to `REQS` so existing users get the one-time required pop-up.

## Code conventions
- New behaviour is appended as a new versioned block before the final `render();...</script>`, overriding earlier function declarations where needed.
- Test headlessly with Playwright (Chromium at /opt/pw-browsers/chromium) before committing; check `node --check` on the extracted script.
- UK spelling, plain friendly copy, no emoji in the UI.
