// Swell reminders: schedules and cancels a person's own push notifications through OneSignal.
// The OneSignal REST API key lives in the Netlify environment variable ONESIGNAL_REST_API_KEY, never in the app.
import { currentLevel } from '../lib/meter.mjs';
const APP = '77fd5321-a090-4c4e-93c4-2568f5524442';
const SITE = 'https://everythings-swell.netlify.app/';
const ICON = SITE + 'swell-icon-512.png';
const clip = (v, n) => String(v || '').replace(/[<>]/g, '').slice(0, n);
// all wording is written here, so the app can only ask for these messages
const MSG = {
  meal: p => [`Time for ${clip(p.n, 30) || 'your next meal'}`, 'Log it in Swell once you’ve eaten.'],
  workout: p => [`Workout day: ${clip(p.n, 40) || 'today’s session'}`, 'Your session is planned for today. Tap to get going.'],
  log: () => ['Log your day', 'Add today’s food so your totals and streak stay right.'],
  rest: p => ['Rest’s over', p.n ? `Next up: ${clip(p.n, 40)}.` : 'Time for your next set.'],
  miss: () => ['Your plan’s still here', 'It’s been a few days. A quick log gets you back on track.'],
  week: () => ['Weekly check-in', 'Log your weight and see how your week went.'],
  wrap: p => [`Your ${clip(p.m, 12) || 'monthly'} Wrapped is ready`, 'Open Swell to see how your month went.'],
  water: () => ['Time for some water', 'Top up your bottle and log it in Swell.'],
  supp: p => [`Supplements: ${clip(p.n, 60) || 'time to take yours'}`, 'Tick them off in Swell once you’ve taken them.'],
  bed: p => ['Time to wind down', p.n ? `Bedtime is ${clip(p.n, 10)}. Put the phone down soon.` : 'Bedtime is coming up. Put the phone down soon.'],
  cafw: p => ['Coffee time', `Your caffeine window is open. Plan: ${clip(p.n, 12) || 'one coffee'}.`],
  cafp: p => ['Pre-workout caffeine', `Have it now and it peaks for your session${p.n ? ` (${clip(p.n, 12)})` : ''}.`],
  cafl: p => ['Last call for caffeine', p.n ? `Anything after ${clip(p.n, 10)} will still be in you at bedtime.` : 'Anything later will still be in you at bedtime.'],
  mealb: () => ['Log today’s meals', 'A quick catch-up keeps your totals right.'],
  test: () => ['Notifications are working', 'This is how Swell reminders will look.']
};
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const KEY = process.env.ONESIGNAL_REST_API_KEY;
  if (!KEY) return json({ error: 'not set up' }, 503);
  let b; try { b = await req.json() } catch { return json({ error: 'bad json' }, 400) }
  const uid = String(b.uid || '');
  if (!/^u[a-z0-9]{6,24}$/.test(uid)) return json({ error: 'bad user' }, 400);
  const cancel = (Array.isArray(b.cancel) ? b.cancel : []).filter(x => /^[0-9a-f-]{36}$/.test(x)).slice(0, 60);
  const add = (Array.isArray(b.add) ? b.add : []).slice(0, 40);
  const H = { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' };
  // saving credits: reminders and rest-timer pushes keep going until the full stop (10 credits left); cancelling always works
  const L = await currentLevel(context && context.deploy && context.deploy.id);
  const paused = L.lv >= 3, noRest = L.lv >= 3;
  await Promise.all(cancel.map(id => fetch(`https://api.onesignal.com/notifications/${id}?app_id=${APP}`, { method: 'DELETE', headers: H }).catch(() => null)));
  const now = Date.now(), ids = [];
  for (const it of add) {
    if ((paused && !(it && it.t === 'test' && L.lv < 3)) || (noRest && it && it.t === 'rest')) { ids.push(null); continue }
    const f = MSG[it && it.t]; const at = Date.parse(it && it.at);
    if (!f || !(at > now - 60e3 && at < now + 35 * 864e5)) { ids.push(null); continue }
    const [h, c] = f(it.p || {});
    const body = { app_id: APP, include_aliases: { external_id: [uid] }, target_channel: 'push', headings: { en: h }, contents: { en: c },
      web_url: SITE, chrome_web_icon: ICON, data: { type: it.t }, web_push_topic: it.t === 'rest' ? 'rest' : undefined };
    if (at > now + 30e3) body.send_after = new Date(at).toISOString();
    try { const r = await fetch('https://api.onesignal.com/notifications?c=push', { method: 'POST', headers: H, body: JSON.stringify(body) }); const j = await r.json(); ids.push(j && j.id || null) } catch { ids.push(null) }
  }
  return json({ ids, lv: L.lv });
};
