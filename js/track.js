/*
 * First-party visitor analytics for qwickstep.ai.
 * Batches events and posts them to /api/track (same origin), which adds
 * geo from Vercel headers and writes to Supabase. No cookies, no raw IPs.
 *
 * Events:
 *   pageview      on load (referrer, utm, screen)
 *   section_time  visible-time deltas per <section>, flushed every 15s + on hide
 *   click         any <a> or <button> (label + href)
 *   scroll        max scroll depth %, sent on hide
 */
(function () {
  "use strict";
  var debug = /[?&]qs_debug=1/.test(location.search);
  if (navigator.webdriver && !debug) return;
  if (/^(localhost|127\.|192\.168\.)/.test(location.hostname) && !debug) return;

  // Owner opt-out: visit any page once with ?qs_off=1 and that browser stops
  // being counted (persists via localStorage); ?qs_off=0 turns it back on.
  try {
    var off = /[?&]qs_off=([01])/.exec(location.search);
    if (off) localStorage.setItem("qs_no_track", off[1]);
    if (localStorage.getItem("qs_no_track") === "1") return;
  } catch (e) { /* storage blocked — keep tracking */ }

  var uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  };
  var store = function (kind, key) {
    try {
      var v = kind.getItem(key);
      if (!v) { v = uuid(); kind.setItem(key, v); }
      return v;
    } catch (e) { return uuid(); }
  };

  var visitorId = store(window.localStorage, "qs_vid");
  var sessionId = store(window.sessionStorage, "qs_sid");
  var page = location.pathname.replace(/\.html$/, "").replace(/^\/index$/, "") || "/";

  var queue = [];
  function push(ev) {
    ev.p = page;
    queue.push(ev);
    if (queue.length >= 25) flush();
  }
  function flush(useBeacon) {
    if (!queue.length) return;
    var body = JSON.stringify({ v: visitorId, s: sessionId, events: queue });
    queue = [];
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true
      }).catch(function () {});
    }
  }

  // ---- pageview -----------------------------------------------------------
  var params = new URLSearchParams(location.search);
  var utm = {};
  ["source", "medium", "campaign", "term", "content"].forEach(function (k) {
    var v = params.get("utm_" + k);
    if (v) utm[k] = v.slice(0, 120);
  });
  push({
    e: "pageview",
    r: (document.referrer || "").slice(0, 300),
    u: Object.keys(utm).length ? utm : null,
    sw: screen.width,
    sh: screen.height
  });

  // ---- section visible time ----------------------------------------------
  // Sections without an id are named from their first heading so nothing on
  // the page needs a markup change to be trackable.
  var slug = function (t) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  };
  var sections = [];
  var seen = {};
  Array.prototype.forEach.call(document.querySelectorAll("section, [data-track-section]"), function (el, i) {
    var name = el.getAttribute("data-track-section") || el.id;
    if (!name) {
      var h = el.querySelector("h1,h2,h3");
      name = h ? slug(h.textContent || "") : "";
    }
    if (!name) name = "section-" + (i + 1);
    if (seen[name]) return;
    seen[name] = true;
    sections.push({ el: el, name: name, since: 0, acc: 0 });
  });

  if ("IntersectionObserver" in window && sections.length) {
    var byEl = new Map();
    sections.forEach(function (s) { byEl.set(s.el, s); });
    var io = new IntersectionObserver(function (entries) {
      var now = performance.now();
      entries.forEach(function (en) {
        var s = byEl.get(en.target);
        if (!s) return;
        // A section counts as "being read" at >=25% of itself in view, OR
        // when it fills most of the viewport (tall sections never reach 25%).
        var reading = en.isIntersecting &&
          (en.intersectionRatio >= 0.25 ||
            en.intersectionRect.height >= window.innerHeight * 0.45);
        if (reading) {
          s.vis = true;
          if (!s.since && document.visibilityState === "visible") s.since = now;
        } else {
          s.vis = false;
          if (s.since) { s.acc += now - s.since; s.since = 0; }
        }
      });
    }, { threshold: [0, 0.1, 0.15, 0.2, 0.25] });
    sections.forEach(function (s) { io.observe(s.el); });
  }

  // stop=true (tab hidden): bank the time and stop the clocks — a background
  // tab must not accrue dwell or keep emitting heartbeats.
  function foldSections(stop) {
    var now = performance.now();
    sections.forEach(function (s) {
      if (s.since) { s.acc += now - s.since; s.since = stop ? 0 : now; }
      if (s.acc >= 500) {
        push({ e: "section_time", k: s.name, ms: Math.round(s.acc) });
        s.acc = 0;
      }
    });
  }

  // ---- scroll depth -------------------------------------------------------
  var maxDepth = 0;
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var doc = document.documentElement;
      var total = doc.scrollHeight - window.innerHeight;
      if (total > 0) {
        var d = Math.min(100, Math.round(((window.scrollY || doc.scrollTop) / total) * 100));
        if (d > maxDepth) maxDepth = d;
      }
    });
  }, { passive: true });

  // ---- clicks -------------------------------------------------------------
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("a,button") : null;
    if (!el) return;
    var label = el.getAttribute("data-track") ||
      el.getAttribute("aria-label") ||
      (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) ||
      el.tagName.toLowerCase();
    push({
      e: "click",
      t: label,
      h: (el.getAttribute("href") || "").slice(0, 300) || null
    });
  }, true);

  // ---- flushing -----------------------------------------------------------
  setInterval(function () { foldSections(); flush(); }, 15000);

  var sentDepth = 0;
  function onHide() {
    if (document.visibilityState === "visible") {
      // Tab came back: restart the clock on sections still in view.
      var now = performance.now();
      sections.forEach(function (s) { if (s.vis && !s.since) s.since = now; });
      return;
    }
    foldSections(true);
    if (maxDepth > sentDepth) {
      sentDepth = maxDepth;
      push({ e: "scroll", d: maxDepth });
    }
    flush(true);
  }
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
})();
