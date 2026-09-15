/*
 * IronMath HUD v11 — an operable heads-up display, not a read-only mirror.
 *
 * v10 could only show what the phone pushed. That meant every adjustment —
 * bumping the weight, moving to the next warm-up rung, starting rest — sent you
 * back to your pocket with your hands full of plates. This version does the
 * plate math on the glasses: engine.js already ships the whole solver, so
 * re-solving for a new target is a local call, not a round trip.
 *
 * Input is deliberately one-dimensional. The Neural Band and the temple
 * touchpad give us, reliably, "previous / next / select" — so the whole UI is a
 * single horizontal strip of actions with one highlighted. No cursors, no
 * two-axis navigation, nothing that needs precision while you are under a bar.
 */
(function () {
  var HUD_API = 'https://ironmath-glasses.vercel.app/api/hud';
  var HUD_VERSION = 'v11';
  var stage = document.getElementById('stage');
  var root = document.getElementById('root');
  var dots = document.getElementById('dots');

  var VIEWS = ['load', 'warmup', 'rest', 'convert'];
  var view = 'load';
  var cursor = 0;
  var liveSearch = location.search || '';
  var lastTs = 0;
  var pollTimer = 0;
  var tickTimer = 0;

  // Rest timer state, run locally so it keeps counting even if the network or
  // the phone drops away mid-set.
  var rest = { duration: 120, remaining: 120, running: false, endTs: null };
  var REST_STEPS = [60, 90, 120, 180, 300];

  // Warm-up rung the lifter is currently on; null means "not laddering".
  // The ladder itself is frozen on entry: warmupLine() derives its rungs from
  // the current target, so recomputing it after stepping onto a rung would make
  // the ladder walk away from under the lifter.
  var warmupIndex = null;
  var warmupFrozen = null;
  var warmupWorking = null;

  // Timestamp of our own last write, so a slow echo of it coming back from the
  // store cannot overwrite a newer local adjustment.
  var lastLocalWrite = 0;

  function fitStage() {
    if (!stage) return;
    var w = document.documentElement.clientWidth || window.innerWidth || 600;
    var h = document.documentElement.clientHeight || window.innerHeight || 600;
    if (w === 600 && h === 600) {
      stage.style.left = '0px';
      stage.style.top = '0px';
      stage.style.transform = 'none';
      return;
    }
    var s = Math.min(w / 600, h / 600);
    stage.style.left = ((w - 600 * s) / 2) + 'px';
    stage.style.top = ((h - 600 * s) / 2) + 'px';
    stage.style.transform = 'scale(' + s + ')';
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function params() {
    return new URLSearchParams(String(liveSearch || '').replace(/^\?/, ''));
  }

  function hud() {
    var api = window.IronMath;
    if (!api) return null;
    try {
      return api.hudFromSearch(liveSearch || '');
    } catch (err) {
      return null;
    }
  }

  function inputUnit() {
    var u = params().get('iu');
    return u === 'kg' ? 'kg' : 'lb';
  }

  function gymUnit() {
    var u = params().get('gu');
    return u === 'lb' ? 'lb' : 'kg';
  }

  function targetValue() {
    var raw = Number(params().get('t'));
    return isFinite(raw) ? raw : 0;
  }

  // `t` is in the unit the lifter types in (iu); `bar` and `col` arrive in the
  // gym's plate unit (gu). Those are frequently different — typing in pounds
  // against kilo plates is the common case — so anything crossing between them
  // has to convert or the numbers are silently wrong.
  var KG_PER_LB = 0.45359237;

  function gymToInput(value) {
    var iu = inputUnit();
    var gu = gymUnit();
    if (iu === gu) return value;
    return gu === 'kg' ? value / KG_PER_LB : value * KG_PER_LB;
  }

  function barPlusCollarsInInputUnit() {
    var bar = Number(params().get('bar'));
    var col = Number(params().get('col'));
    return gymToInput((isFinite(bar) ? bar : 0) + (isFinite(col) ? col : 0));
  }

  /* ------------------------------------------------------------------ edit */

  // Re-solve locally by rewriting the target in the query string and letting
  // the bundled engine do the same maths the phone would have done.
  function setTarget(next) {
    var p = params();
    var clean = Math.max(0, Math.round(next * 100) / 100);
    p.set('t', String(clean));
    liveSearch = '?' + p.toString();
    try {
      history.replaceState({}, '', liveSearch);
    } catch (err) {
      /* Meta webview may refuse history; liveSearch still drives the paint. */
    }
    pushBack();
    paint();
  }

  function bumpTarget(delta) {
    var step = inputUnit() === 'kg' ? 2.5 : 5;
    setTarget(Math.max(0, targetValue() + delta * step));
  }

  // Best-effort mirror back to the phone so the Live Activity and the app agree
  // with the lens. Never blocks the UI — the glasses stay correct regardless.
  function pushBack() {
    var ts = Date.now();
    lastLocalWrite = ts;
    var payload = { search: liveSearch, ts: ts };
    // The store rebuilds each record from the posted body, so a write without a
    // timer would wipe a rest countdown the phone is still showing on the lock
    // screen. Carry it along whenever one is live.
    if (rest.running || rest.remaining < rest.duration) {
      payload.timer = {
        duration: rest.duration,
        remaining: restRemaining(),
        running: rest.running,
        end: rest.running ? rest.endTs : null,
      };
    }
    try {
      fetch(HUD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }).catch(function () {});
    } catch (err) {
      /* Offline is fine — the lens already solved it locally. */
    }
  }

  /* --------------------------------------------------------------- warm-up */

  // Ramp percentages and the reps to do at each, matching the phone's
  // Standard scheme. The last rung is the working set itself.
  var WARMUP_PERCENTS = [0, 0.4, 0.6, 0.75, 0.85, 1];
  var WARMUP_REPS = [10, 8, 5, 3, 2, null];

  // Computed here rather than via the engine's warmupLine(): that helper mixes
  // units — it takes the working weight in the typed unit but the bar in the
  // gym's unit — which lands far off whenever those differ, and it returns
  // gym-unit numbers that cannot be written straight back into `t`. Everything
  // below stays in the typed unit, which is the unit `t` is read in.
  function warmupRungs() {
    if (warmupFrozen) return warmupFrozen;
    var working = warmupWorking != null ? warmupWorking : targetValue();
    if (!(working > 0)) return [];
    var floor = barPlusCollarsInInputUnit();
    return WARMUP_PERCENTS.map(function (p) {
      var raw = p === 0 ? floor : working * p;
      return Math.max(floor, Math.round(raw * 100) / 100);
    });
  }

  function warmupRepsFor(index) {
    return WARMUP_REPS[index] != null ? WARMUP_REPS[index] + ' reps' : 'Work set';
  }

  function enterWarmup() {
    warmupFrozen = null;
    // Capture the working weight before building the ladder — the rungs are
    // percentages of it, and setTarget() below will move `t` off it.
    warmupWorking = targetValue();
    var rungs = warmupRungs();
    warmupFrozen = rungs.length ? rungs : null;
    warmupIndex = 0;
    if (warmupFrozen) setTarget(warmupFrozen[0]);
    // Set the view directly rather than via go(): go() routes an unladdered
    // warmup back here, and with no rungs to freeze that would recurse.
    view = 'warmup';
    cursor = 0;
    paint();
  }

  function exitWarmup() {
    // Put the working weight back — the ladder was a detour, not a new target.
    if (warmupWorking) setTarget(warmupWorking);
    warmupFrozen = null;
    warmupIndex = null;
    warmupWorking = null;
    go('load');
  }

  /* ------------------------------------------------------------------ rest */

  function restRemaining() {
    if (rest.running && rest.endTs) {
      return Math.max(0, Math.ceil((rest.endTs - Date.now()) / 1000));
    }
    return Math.max(0, Math.round(rest.remaining));
  }

  function restStart() {
    var left = restRemaining() > 0 ? restRemaining() : rest.duration;
    rest.running = true;
    rest.remaining = left;
    rest.endTs = Date.now() + left * 1000;
    paint();
  }

  function restPause() {
    rest.remaining = restRemaining();
    rest.running = false;
    rest.endTs = null;
    paint();
  }

  function restReset() {
    rest.running = false;
    rest.endTs = null;
    rest.remaining = rest.duration;
    paint();
  }

  function restCycleDuration() {
    var i = REST_STEPS.indexOf(rest.duration);
    rest.duration = REST_STEPS[(i + 1) % REST_STEPS.length];
    rest.running = false;
    rest.endTs = null;
    rest.remaining = rest.duration;
    paint();
  }

  function fmtClock(total) {
    var s = Math.max(0, Math.ceil(total || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* --------------------------------------------------------------- actions */

  // Each view is a flat list of actions. Left/right walks the list, select
  // fires. That is the entire interaction model.
  function actionsFor(v) {
    if (v === 'load') {
      return [
        { label: '−', hint: 'lighter', run: function () { bumpTarget(-1); } },
        { label: '+', hint: 'heavier', run: function () { bumpTarget(1); } },
        { label: 'Warm', run: enterWarmup },
        { label: 'Rest', run: function () { go('rest'); restStart(); } },
        { label: 'LB/KG', run: function () { go('convert'); } },
      ];
    }
    if (v === 'warmup') {
      var rungs = warmupRungs();
      return [
        { label: '◀ Prev', run: function () {
            if (!rungs.length) return;
            warmupIndex = Math.max(0, (warmupIndex || 0) - 1);
            setTarget(rungs[warmupIndex]);
          } },
        { label: 'Next ▶', run: function () {
            if (!rungs.length) return;
            warmupIndex = Math.min(rungs.length - 1, (warmupIndex || 0) + 1);
            setTarget(rungs[warmupIndex]);
          } },
        { label: 'Rest', run: function () { go('rest'); restStart(); } },
        { label: 'Done', run: exitWarmup },
      ];
    }
    if (v === 'rest') {
      return [
        { label: rest.running ? 'Pause' : (restRemaining() <= 0 ? 'Again' : 'Start'), run: function () {
            if (rest.running) { restPause(); return; }
            if (restRemaining() <= 0) { restReset(); }
            restStart();
          } },
        { label: '+30s', run: function () {
            rest.remaining = restRemaining() + 30;
            if (rest.running) rest.endTs = Date.now() + rest.remaining * 1000;
            paint();
          } },
        { label: fmtClock(rest.duration), hint: 'length', run: restCycleDuration },
        { label: 'Reset', run: restReset },
        { label: 'Back', run: function () { go('load'); } },
      ];
    }
    return [{ label: 'Back', run: function () { go('load'); } }];
  }

  function go(next) {
    // Arriving at the ladder by cycling views has to behave the same as
    // arriving via the Warm chip, or you get a warm-up screen showing the
    // working weight and a rung counter that means nothing.
    if (next === 'warmup' && !warmupFrozen) {
      enterWarmup();
      return;
    }
    view = next;
    cursor = 0;
    paint();
  }

  function moveCursor(delta) {
    var list = actionsFor(view);
    if (!list.length) return;
    cursor = (cursor + delta + list.length) % list.length;
    paint();
  }

  function activate() {
    var list = actionsFor(view);
    var action = list[cursor];
    if (action && typeof action.run === 'function') action.run();
  }

  /* ----------------------------------------------------------------- paint */

  function plateLook(item) {
    var id = String(item.plateId || '');
    var w = Number(item.weight) || 0;
    var kg = id.indexOf('kg-') === 0;
    var fill = '#3F3F46', stroke = '#71717A', text = '#FAFAFA';
    if ((kg && w === 25) || (!kg && w === 55)) { fill = '#DC2626'; stroke = '#7F1D1D'; text = '#FFFFFF'; }
    else if ((kg && w === 20) || (!kg && w === 45)) { fill = '#2563EB'; stroke = '#1E3A8A'; text = '#FFFFFF'; }
    else if ((kg && w === 15) || (!kg && w === 35)) { fill = '#EAB308'; stroke = '#854D0E'; text = '#18181B'; }
    else if ((kg && w === 10) || (!kg && w === 25)) { fill = '#16A34A'; stroke = '#14532D'; text = '#FFFFFF'; }
    else if (!kg && w === 10) { fill = '#18181B'; stroke = '#FAFAFA'; text = '#FAFAFA'; }
    else if (w <= 5) { fill = '#E4E4E7'; stroke = '#71717A'; text = '#18181B'; }
    var lb = kg ? w * 2.2046226218 : w;
    var label = Number.isInteger(w) ? String(w) : String(Number(w.toFixed(2)));
    var height = lb >= 40 ? 64 : lb >= 20 ? 55 : lb >= 8 ? 45 : lb >= 2 ? 39 : 34;
    var width = lb >= 40 ? 34 : lb >= 20 ? 30 : lb >= 8 ? 27 : 29;
    var font = label.length >= 4 ? 11 : label.indexOf('.') !== -1 ? 12 : label.length >= 2 ? 13 : 14;
    return { fill: fill, stroke: stroke, text: text, height: height, width: width, label: label, font: font };
  }

  function barHtml(plates) {
    var disks = [];
    (plates || []).forEach(function (item) {
      var n = Number(item.count) || 0;
      for (var i = 0; i < n; i += 1) disks.push(item);
    });
    if (!disks.length) {
      return '<div class="bar-stage"><div class="bar">' +
        '<div class="sleeve left"><span class="tip"></span><span class="collar"></span></div>' +
        '<div class="shaft"><span class="knurl"></span></div>' +
        '<div class="sleeve right"><span class="collar"></span><span class="tip"></span></div></div></div>';
    }
    var stack = disks.map(function (item) {
      var l = plateLook(item);
      return '<div class="plate" style="background:' + l.fill + ';border-color:' + l.stroke +
        ';color:' + l.text + ';height:' + l.height + 'px;width:' + l.width + 'px;font-size:' + l.font +
        'px"><span class="plate-label">' + esc(l.label) + '</span></div>';
    }).join('');
    return '<div class="bar-stage"><div class="bar">' +
      '<div class="sleeve left"><span class="tip"></span>' + stack + '<span class="collar"></span></div>' +
      '<div class="shaft"><span class="knurl"></span></div>' +
      '<div class="sleeve right"><span class="collar"></span>' + stack + '<span class="tip"></span></div>' +
      '</div></div>';
  }

  function stripHtml() {
    var list = actionsFor(view);
    return '<div class="strip">' + list.map(function (a, i) {
      return '<div class="chip' + (i === cursor ? ' on' : '') + '">' + esc(a.label) + '</div>';
    }).join('') + '</div>';
  }

  function headHtml(label) {
    return '<div class="head"><div class="brand">IRONMATH</div>' +
      '<div class="screen">' + esc(label) + '</div></div>';
  }

  function paint() {
    if (!root) return;
    var h = hud();
    var body = '';

    if (view === 'rest') {
      var left = restRemaining();
      var pct = rest.duration > 0 ? Math.min(100, Math.max(0, (1 - left / rest.duration) * 100)) : 0;
      var done = left <= 0;
      body = headHtml('REST') +
        '<div class="timerstate' + (done ? ' go' : '') + '">' +
          (done ? 'TIME TO LIFT' : rest.running ? 'RESTING' : 'READY') + '</div>' +
        '<div class="timerbig' + (done ? ' go' : '') + '">' + fmtClock(left) + '</div>' +
        '<div class="timertrack"><div class="timerfill" style="width:' + pct + '%"></div></div>' +
        '<div class="timerof">of ' + fmtClock(rest.duration) + '</div>';
    } else if (view === 'convert') {
      body = headHtml('LB / KG') +
        '<div class="convert"><div class="col"><div class="huge">' +
        esc(String((h && h.hud.convertLb) || '').replace(' LB', '')) +
        '</div><div class="other">LB</div></div><div class="col"><div class="huge">' +
        esc(String((h && h.hud.convertKg) || '').replace(' KG', '')) +
        '</div><div class="other">KG</div></div></div>';
    } else if (view === 'warmup') {
      var rungs = warmupRungs();
      var idx = warmupIndex == null ? 0 : warmupIndex;
      var bare = !h || !h.hud.plates || !h.hud.plates.length;
      // The first rung is the empty bar by definition. The solver's stock
      // "No plates on the bar yet." reads like an error there, when it is
      // actually the instruction: warm up on the bar.
      var sideCopy = bare ? 'Just the bar — no plates' : h.hud.eachSide;
      body = headHtml('WARM-UP ' + (rungs.length ? (idx + 1) + '/' + rungs.length : '')) +
        '<div class="load-block"><div class="kicker">' + esc(warmupRepsFor(idx)) + '</div>' +
        '<div class="loaded">' + esc(h ? h.hud.loadedLabel : '--') + '</div></div>' +
        (h ? barHtml(h.hud.plates) : '') +
        '<div class="side">' + esc(sideCopy) + '</div>';
    } else {
      // No screen label here: the LOAD kicker sits directly under it, and two
      // "LOAD"s on a lens is one more word than the glance can spare.
      body = headHtml('') +
        '<div class="load-block"><div class="kicker">LOAD</div>' +
        '<div class="loaded">' + esc(h ? h.hud.loadedLabel : '--') + '</div></div>' +
        '<div class="target-block"><div class="target-row">' +
        '<div class="kicker target-kicker">TARGET</div>' +
        '<div class="target-weight">' + esc(h ? h.hud.targetLabel : '--') + '</div></div></div>' +
        (h ? barHtml(h.hud.plates) : '') +
        '<div class="side">' + esc(h ? h.hud.eachSide : '') + '</div>' +
        (h ? '<div class="miss ' + (h.hud.exact ? 'exact' : 'missed') + '">' + esc(h.hud.miss) + '</div>' : '');
    }

    root.className = 'hud';
    root.innerHTML = body + stripHtml();

    if (dots) {
      dots.innerHTML = VIEWS.map(function (v) {
        return '<span class="dot' + (v === view ? ' on' : '') + '"></span>';
      }).join('');
    }
  }

  /* ----------------------------------------------------------------- input */

  document.addEventListener('keydown', function (event) {
    var k = event.key;
    if (k === 'ArrowLeft') { moveCursor(-1); event.preventDefault(); }
    else if (k === 'ArrowRight') { moveCursor(1); event.preventDefault(); }
    else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { activate(); event.preventDefault(); }
    else if (k === 'ArrowUp') { go(VIEWS[(VIEWS.indexOf(view) + VIEWS.length - 1) % VIEWS.length]); event.preventDefault(); }
    else if (k === 'ArrowDown') { go(VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]); event.preventDefault(); }
  });

  // Tapping a chip directly, for touchpad taps that land as clicks.
  document.addEventListener('click', function (event) {
    var el = event.target;
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains('chip')) {
        var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
        var i = chips.indexOf(el);
        if (i >= 0) { cursor = i; activate(); }
        return;
      }
      el = el.parentNode;
    }
    activate();
  });

  /* ------------------------------------------------------- phone push sync */

  function applySearch(search) {
    var qs = String(search || '');
    if (!qs) return;
    if (qs.charAt(0) !== '?') qs = '?' + qs;
    liveSearch = qs;
    try {
      if (qs !== location.search) history.replaceState({}, '', qs);
    } catch (err) {}
    // Honour the view the phone asked for. Without this, "Open on glasses"
    // from Convert or Warm-Up silently lands on whatever the lens happened to
    // be showing — the set arrives, the screen never changes.
    applyRequestedView();
    paint();
  }

  // A pushed warm-up arrives as a working weight plus view=warmup; build the
  // ladder from it the same way entering warm-up on the lens would.
  function applyRequestedView() {
    var asked = params().get('view');
    if (asked === 'convert' && view !== 'convert') {
      view = 'convert';
      cursor = 0;
    } else if (asked === 'warmup' && view !== 'warmup') {
      // Only on arrival. Rebuilding the ladder on every later push would drop
      // someone who is already three rungs in back onto the empty bar.
      warmupFrozen = null;
      warmupWorking = null;
      enterWarmup();
    } else if (asked === 'load' && view !== 'load') {
      view = 'load';
      cursor = 0;
    }
  }

  function poll() {
    fetch(HUD_API + '?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data) return;
        var ts = Number(data.ts) || 0;
        if (ts && ts === lastTs) return;
        lastTs = ts || Date.now();
        // The store rebuilds records and drops any origin marker, so our own
        // writes come back indistinguishable from the phone's. Anything not
        // newer than our last local edit is an echo or is stale; dropping it
        // stops a slow round trip from undoing a fresh adjustment.
        if (ts && lastLocalWrite && ts <= lastLocalWrite) return;
        if (data.timer && typeof data.timer === 'object') {
          var d = Number(data.timer.duration);
          var rem = Number(data.timer.remaining);
          if (isFinite(d) && d > 0) rest.duration = d;
          if (isFinite(rem) && rem >= 0) rest.remaining = rem;
          rest.running = data.timer.running === true;
          rest.endTs = rest.running && data.timer.end ? Number(data.timer.end) : null;
          if (rest.running) view = 'rest';
        }
        if (data.search) applySearch(data.search);
        paint();
      })
      .catch(function () {});
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    if (tickTimer) clearInterval(tickTimer);
    poll();
    pollTimer = setInterval(poll, 2000);
    tickTimer = setInterval(function () {
      if (view === 'rest' && rest.running) paint();
    }, 500);
  }

  window.addEventListener('resize', fitStage);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);
  fitStage();
  // Opening the lens straight from a phone link carries the view in the URL,
  // so honour it before the first paint rather than defaulting to Load.
  applyRequestedView();
  paint();
  startPolling();
  window.addEventListener('pageshow', function () { lastTs = 0; startPolling(); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { lastTs = 0; startPolling(); }
  });
})();
