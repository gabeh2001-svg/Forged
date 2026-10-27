// Swell credit meter. Netlify has no API for a site's credit balance, so Swell keeps its own estimate here,
// using Netlify Blobs (built into Netlify Functions, no extra setup) to store a running total for the month.
// Rates from Netlify's pricing: production deploy 15 credits, bandwidth 20 credits per GB,
// web requests 2 credits per 10,000, function compute 10 credits per GB-hour.
export const CAP = 300;
// credits already used before the meter existed (from the Netlify dashboard), including the deploy that added it
const START = { '2026-10-22': 256 };
// levels go by credits left, with a buffer kept back so the site never hits the hard limit
// v71: the owner wants server reminders to keep going as long as possible, so the full stop is at 10 left (was 12)
const LEVELS = [{ left: 30, lv: 1 }, { left: 20, lv: 2 }, { left: 10, lv: 3 }];
// real figures from the Netlify dashboard, applied once to that month's running record: credits used at that moment
const FIX = { '2026-10-22': 271 };
const ctx = () => {
  const raw = globalThis.netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT;
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) } catch { return null }
};
const url = (c, key) => new URL(`/${c.siteID}/site:swell-meter/${encodeURIComponent(key)}`, c.uncachedEdgeURL || c.edgeURL);
export async function bget(key) {
  const c = ctx(); if (!c || !c.token || !(c.edgeURL || c.uncachedEdgeURL)) throw Error('no blobs');
  const r = await fetch(url(c, key), { headers: { authorization: `Bearer ${c.token}` } });
  if (r.status === 404) return null; if (!r.ok) throw Error('blobs get ' + r.status);
  const t = await r.text(); try { return JSON.parse(t) } catch { return null }
}
export async function bset(key, val) {
  const c = ctx(); if (!c || !c.token) throw Error('no blobs');
  const r = await fetch(url(c, key), { method: 'PUT', headers: { authorization: `Bearer ${c.token}` }, body: JSON.stringify(val) });
  if (!r.ok) throw Error('blobs put ' + r.status);
}
// Netlify credits reset on the 22nd of each month for this account, so a "month" here is a billing cycle
export const RESET_DAY = 22;
export const month = (d = new Date()) => { const y = d.getUTCFullYear(), m = d.getUTCMonth(); return new Date(Date.UTC(y, d.getUTCDate() >= RESET_DAY ? m : m - 1, RESET_DAY)).toISOString().slice(0, 10) };
export function estimate(m) {
  return (m.base || 0) + (m.dep || 0) * 15 + (m.mb || 0) / 1024 * 20 + (m.req || 0) * 2 / 1e4 + (m.fn || 0) * 0.0003;
}
export function level(m, now = new Date()) {
  const est = estimate(m), left = CAP - est;
  let lv = 0; for (const L of LEVELS) if (left <= L.left) lv = L.lv;
  // on course to run out before the month ends? ease off early
  const st = new Date(month(now) + 'T00:00:00Z'), en = new Date(Date.UTC(st.getUTCFullYear(), st.getUTCMonth() + 1, RESET_DAY));
  const day = (now - st) / 864e5, dim = (en - st) / 864e5;
  const traffic = est - (m.base || 0) - (m.dep || 0) * 15, proj = est + traffic / Math.max(1, day) * (dim - day);
  if (lv === 0 && CAP - proj <= 30) lv = 1;
  return { lv, est: Math.round(est * 10) / 10, left: Math.round(left * 10) / 10, proj: Math.round(proj), month: month(now), resets: en.toISOString().slice(0, 10) };
}
// load this month's record, counting any new production deploy once
export async function load(deployId) {
  const k = 'm-' + month(), m = (await bget(k)) || { base: START[month()] || 0, dep: 0, mb: 0, req: 0, fn: 0, opens: 0, devices: {} };
  let changed = false;
  if (FIX[month()] != null && !m.fixed) { const traffic = estimate(m) - (m.base || 0) - (m.dep || 0) * 15; m.base = Math.max(0, FIX[month()] - traffic - (m.dep || 0) * 15); m.fixed = 1; changed = true }
  if (deployId) {
    const g = (await bget('deploy')) || {};
    if (g.id !== deployId) { if (g.id) { m.dep++; } g.id = deployId; await bset('deploy', g); changed = true }
  }
  return { k, m, changed };
}
// cached level for the reminder helper, so it doesn't read storage on every call
let CACHE = null;
export async function currentLevel(deployId) {
  if (CACHE && Date.now() - CACHE.t < 10 * 60e3) return CACHE.v;
  try { const { k, m, changed } = await load(deployId); m.fn = (m.fn || 0) + 1; await bset(k, m); CACHE = { t: Date.now(), v: level(m) } }
  catch { CACHE = { t: Date.now(), v: { lv: 0, err: true } } }
  return CACHE.v;
}
