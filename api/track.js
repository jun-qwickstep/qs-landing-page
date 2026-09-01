/*
 * Analytics ingestion: receives event batches from js/track.js, enriches
 * them with Vercel's geo headers and a light user-agent parse, and inserts
 * into Supabase public.site_events.
 *
 * The key below is the project's PUBLISHABLE anon key (safe to commit —
 * it is the same key any browser client would carry). RLS on site_events
 * lets the anon role INSERT and nothing else; reads happen only from the
 * QwickStep OS with the service-role key.
 */

const SUPABASE_URL = "https://wvdvnvpcjzgtsanedsig.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZHZudnBjanpndHNhbmVkc2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzk4NTgsImV4cCI6MjA5MzcxNTg1OH0.PCPaxBjn7OIc1ee-oMQ-ycYuSS2BGEPzNOZQi7440dY";

const EVENTS = new Set(["pageview", "section_time", "click", "scroll"]);
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|monitor|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python-requests/i;

const s = (v, max) => (typeof v === "string" && v.length ? v.slice(0, max) : null);
const n = (v, max) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x) : null;
};

function parseUa(ua) {
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android/i.test(ua) ? "mobile" : "desktop";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /SamsungBrowser/i.test(ua) ? "Samsung"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Other";
  const os = /Windows/.test(ua) ? "Windows"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Android/.test(ua) ? "Android"
    : /Linux/.test(ua) ? "Linux"
    : "Other";
  return { device, browser, os };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  let payload = req.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch { return res.status(204).end(); }
  }
  if (!payload || typeof payload !== "object") return res.status(204).end();

  const ua = req.headers["user-agent"] || "";
  if (BOT_RE.test(ua)) return res.status(204).end();

  const visitorId = s(payload.v, 64);
  const sessionId = s(payload.s, 64);
  const events = Array.isArray(payload.events) ? payload.events.slice(0, 100) : [];
  if (!visitorId || !sessionId || !events.length) return res.status(204).end();

  const { device, browser, os } = parseUa(ua);
  const geo = {
    country: s(req.headers["x-vercel-ip-country"], 2),
    region: s(req.headers["x-vercel-ip-country-region"], 8),
    city: (() => {
      try { return s(decodeURIComponent(req.headers["x-vercel-ip-city"] || ""), 80); }
      catch { return null; }
    })(),
    lat: Number.isFinite(parseFloat(req.headers["x-vercel-ip-latitude"]))
      ? parseFloat(req.headers["x-vercel-ip-latitude"]) : null,
    lon: Number.isFinite(parseFloat(req.headers["x-vercel-ip-longitude"]))
      ? parseFloat(req.headers["x-vercel-ip-longitude"]) : null,
  };

  const rows = [];
  for (const ev of events) {
    if (!ev || !EVENTS.has(ev.e)) continue;
    const page = s(ev.p, 120);
    if (!page) continue;
    // PostgREST bulk inserts require identical keys on every row.
    const row = {
      visitor_id: visitorId,
      session_id: sessionId,
      event: ev.e,
      page,
      device, browser, os,
      ...geo,
      section: null, ms: null, depth: null, target: null, href: null,
      referrer: null, utm: null, screen_w: null, screen_h: null,
    };
    if (ev.e === "pageview") {
      row.referrer = s(ev.r, 300);
      row.utm = ev.u && typeof ev.u === "object" && !Array.isArray(ev.u) ? ev.u : null;
      row.screen_w = n(ev.sw, 20000);
      row.screen_h = n(ev.sh, 20000);
    } else if (ev.e === "section_time") {
      row.section = s(ev.k, 64);
      row.ms = n(ev.ms, 86400000);
      if (!row.section || row.ms == null) continue;
    } else if (ev.e === "click") {
      row.target = s(ev.t, 120);
      row.href = s(ev.h, 300);
      if (!row.target) continue;
    } else if (ev.e === "scroll") {
      row.depth = n(ev.d, 100);
      if (row.depth == null) continue;
    }
    rows.push(row);
  }
  if (!rows.length) return res.status(204).end();

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_events`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
    });
    if (!r.ok) console.error("site_events insert failed", r.status, await r.text());
  } catch (err) {
    console.error("site_events insert error", err);
  }
  return res.status(204).end();
};
