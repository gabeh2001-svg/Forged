# Swell (formerly Forged) – working notes

Single-file web app: everything lives in `index.html` (HTML, CSS, JS, LocalStorage only). Netlify publishes the `main` branch to everythings-swell.netlify.app (renamed from forgedtest; users added the app from the new address). Push notifications run through OneSignal (App ID in the v31 block), sharing sw.js with the offline cache. Label scanning runs on the phone: `ocr/` holds the self-hosted Tesseract core, English model and `worker.js`; the table parser and image clean-up live in the v37 block (`lblPrep`, `lblParse`). Barcodes are read on the phone too (`BCD` in the v48 block, with `BarcodeDetector` where the phone has it) and looked up straight from the phone on Open Food Facts, capped at 15 lookups a minute (`BCMAX`), so they cost no Netlify credits. `lib/` holds `qrcode.js` and `jsqr.js`, loaded only when sharing or adding a plan or meal as an image.

## How updates are handled
- Build and test every change on the `pending` branch. Push `pending` freely.
- Never push or merge to `main` until the owner explicitly says to roll out ("send it", "roll out the update"). Each publish to `main` costs Netlify credits (about 15 of 300 a month).
- After each change, tell the owner what's waiting in the next update and roughly how many free updates are left.
- Also republish the Claude preview artifact so the owner can try changes for free.
- Reminder types the server knows are listed in `MSG` in `netlify/functions/remind.mjs`. The water, supplement and bedtime reminders (v48) need that function deployed with them.
- Saver mode (v38 + `netlify/lib/meter.mjs`): Netlify has no credit API, so the site estimates its own monthly credits in Netlify Blobs (deploys counted automatically at 15 each, traffic reported by phones once a day). Levels by credits left: 30 saver, 20 low, 12 stop. If the owner gives a real figure from the Netlify dashboard, put it in `START` for that month. Credits reset on the 22nd (billing cycle, not calendar month). Check `/.netlify/functions/budget` before any rollout, and don't roll out if it would leave fewer than about 15 credits.

## When adding a user-facing feature
- Add an entry to `RELEASES` (and bump `APP_VER`) in the "what's new" block: a short title and line per feature, plus optional mini-tour steps. Existing users then see a "What's new" pop-up on next open with a "Show me how" walkthrough.
- Update the full guided tour (`TOUR`) if the feature changes how a screen works.
- If a new piece of user info becomes essential, add it to `REQS` so existing users get the one-time required pop-up.

## Research-backed changes
- The owner wants changes grounded in real-world research. For any UX or behaviour change, look up the relevant studies or guidance (or recall them and verify), cite them in the reply, and note them in a comment at the top of the code block.
- The research write-up "Swell: what brings people back" (claude.ai Docs) holds the principles and plan.

## Code conventions
- New behaviour is appended as a new versioned block before the final `render();...</script>`, overriding earlier function declarations where needed.
- Test headlessly with Playwright (Chromium at /opt/pw-browsers/chromium) before committing; check `node --check` on the extracted script.
- UK spelling, plain friendly copy, no emoji in the UI.
