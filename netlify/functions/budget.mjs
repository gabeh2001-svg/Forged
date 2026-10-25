// Swell budget: phones report roughly how much they fetched from the site, and get back the saver level.
// Called about once a day per phone (less when saving), so it costs almost nothing itself.
import { load, bset, level } from '../lib/meter.mjs';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const num = (v, max) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0 };
export default async (req, context) => {
  let b = {};
  if (req.method === 'POST') { try { b = await req.json() } catch { b = {} } }
  try {
    const { k, m } = await load(context && context.deploy && context.deploy.id);
    const uid = /^u[a-z0-9]{6,24}$/.test(String(b.uid || '')) ? b.uid : null;
    m.mb += num(b.b, 300 * 1024 * 1024) / 1048576;
    m.req += num(b.r, 20000) + 1;
    m.fn += num(b.f, 2000) + 1;
    m.opens += num(b.o, 2000);
    if (uid) { m.devices = m.devices || {}; m.devices[uid] = Date.now() }
    await bset(k, m);
    return json({ ...level(m), devices: Object.keys(m.devices || {}).length });
  } catch (e) {
    // storage unavailable: say so, and let the app carry on normally
    return json({ lv: 0, err: String(e && e.message || e) });
  }
};
