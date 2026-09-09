(function () {
  var HUD_API = 'https://ironmath-glasses.vercel.app/api/hud';
  var HUD_VERSION = 'v6';
  var stage = document.getElementById('stage');
  var root = document.getElementById('root');
  var dots = document.getElementById('dots');
  var view = 'load';
  var lastTs = 0;
  var liveSearch = location.search || '';
  var pollTimer = 0;
  var tickTimer = 0;
  var timerState = null;
  var timerAuto = false;

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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function plateLook(item) {
    var id = String(item.plateId || '');
    var w = Number(item.weight) || 0;
    var kg = id.indexOf('kg-') === 0;
    var fill = '#3F3F46';
    var stroke = '#71717A';
    var text = '#FAFAFA';
    if ((kg && w === 25) || (!kg && w === 55)) {
      fill = '#DC2626';
      stroke = '#7F1D1D';
      text = '#FFFFFF';
    } else if ((kg && w === 20) || (!kg && w === 45)) {
      fill = '#2563EB';
      stroke = '#1E3A8A';
      text = '#FFFFFF';
    } else if ((kg && w === 15) || (!kg && w === 35)) {
      fill = '#EAB308';
      stroke = '#854D0E';
      text = '#18181B';
    } else if ((kg && w === 10) || (!kg && w === 25)) {
      fill = '#16A34A';
      stroke = '#14532D';
      text = '#FFFFFF';
    } else if (!kg && w === 10) {
      fill = '#18181B';
      stroke = '#FAFAFA';
      text = '#FAFAFA';
    } else if (w <= 5) {
      fill = '#E4E4E7';
      stroke = '#71717A';
      text = '#18181B';
    }
    var lb = kg ? w * 2.2046226218 : w;
    var height = lb >= 40 ? 96 : lb >= 20 ? 82 : lb >= 8 ? 64 : 50;
    var width = lb >= 40 ? 46 : lb >= 20 ? 40 : lb >= 8 ? 30 : 24;
    var label = Number.isInteger(w) ? String(w) : String(Number(w.toFixed(2)));
    var font = width >= 34 ? 18 : width >= 28 ? 14 : 0;
    return { fill: fill, stroke: stroke, text: text, height: height, width: width, label: label, font: font };
  }

  function expandDisks(plates) {
    var disks = [];
    (plates || []).forEach(function (item) {
      var count = Number(item.count) || 0;
      for (var i = 0; i < count; i += 1) {
        disks.push(item);
      }
    });
    return disks;
  }

  function plateHtml(item, key) {
    var look = plateLook(item);
    return (
      '<div class="plate" style="width:' +
      look.width +
      'px;height:' +
      look.height +
      'px;background:' +
      look.fill +
      ';border-color:' +
      look.stroke +
      ';color:' +
      look.text +
      ';font-size:' +
      (look.font || 1) +
      'px">' +
      (look.font ? escapeHtml(look.label) : '') +
      '</div>'
    );
  }

  function renderBar(plates) {
    var disks = expandDisks(plates);
    if (!disks.length) {
      return (
        '<div class="bar-stage">' +
        '<div class="bar"><div class="sleeve left"><span class="tip"></span><span class="collar"></span></div>' +
        '<div class="shaft"><span class="knurl"></span></div>' +
        '<div class="sleeve right"><span class="collar"></span><span class="tip"></span></div></div>' +
        '<div class="side">No plates on the bar yet.</div></div>'
      );
    }
    var stack = disks.map(function (item, index) {
      return plateHtml(item, index);
    }).join('');
    return (
      '<div class="bar-stage">' +
      '<div class="bar">' +
      '<div class="sleeve left"><span class="tip"></span>' + stack + '<span class="collar"></span></div>' +
      '<div class="shaft"><span class="knurl"></span></div>' +
      '<div class="sleeve right"><span class="collar"></span>' + stack + '<span class="tip"></span></div>' +
      '</div></div>'
    );
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function fmtClock(totalSec) {
    var s = Math.max(0, Math.ceil(Number(totalSec) || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function timerLeftSec() {
    if (!timerState) return -1;
    if (timerState.running && timerState.end) {
      return Math.max(0, Math.ceil((Number(timerState.end) - Date.now()) / 1000));
    }
    return Math.max(0, Math.round(Number(timerState.remaining) || 0));
  }

  function timerActive() {
    if (!timerState) return false;
    if (timerState.running) return true;
    var duration = Number(timerState.duration) || 0;
    var left = timerLeftSec();
    return duration > 0 && left < duration;
  }

  function searchView() {
    var api = window.IronMath;
    if (!api) return 'load';
    var parsed = api.hudFromSearch(liveSearch || '');
    return parsed.view === 'convert' ? 'convert' : 'load';
  }

  function autoView() {
    if (timerActive()) {
      view = 'timer';
      timerAuto = true;
    } else if (timerAuto && view === 'timer') {
      timerAuto = false;
      view = searchView();
    }
  }

  function timerHtml() {
    var head = '<div class="head"><div class="brand">IRONMATH</div><div class="screen">REST</div></div>';
    if (!timerState) {
      return head + '<p class="hint">Start a rest timer on the phone. It shows up here.</p>' + stampHtml();
    }
    var left = timerLeftSec();
    var duration = Number(timerState.duration) || 0;
    var done = left <= 0;
    var state = done ? 'TIME TO LIFT' : timerState.running ? 'REST' : 'PAUSED';
    var pct = duration > 0 ? Math.min(100, Math.max(0, (1 - left / duration) * 100)) : 0;
    return (
      head +
      '<div class="timerstate' + (done ? ' go' : '') + '">' + state + '</div>' +
      '<div class="timerbig' + (done ? ' go' : '') + '">' + fmtClock(left) + '</div>' +
      '<div class="timertrack"><div class="timerfill" style="width:' + pct + '%"></div></div>' +
      '<div class="timerof">of ' + fmtClock(duration) + '</div>' +
      stampHtml()
    );
  }

  function stampHtml() {
    var when = lastTs ? 'updated ' + fmtTime(lastTs) : 'waiting for phone';
    return '<div class="stamp">' + HUD_VERSION + ' · ' + when + '</div>';
  }

  function paint() {
    var api = window.IronMath;
    if (!api || !root) return;
    var parsed = api.hudFromSearch(liveSearch || '');
    if (view !== 'timer') {
      view = parsed.view === 'convert' ? 'convert' : 'load';
    }
    var hud = parsed.hud;
    var emptyLoad = !hud.targetRaw;
    var emptyConvert = !String(hud.convertLb || '').replace(/[^\d.]/g, '') && !String(hud.convertKg || '').replace(/[^\d.]/g, '');
    if (view === 'timer') {
      root.innerHTML = timerHtml();
    } else if (view === 'load') {
      root.innerHTML =
        '<div class="head"><div class="brand">IRONMATH</div><div class="screen">LOAD</div></div>' +
        (emptyLoad
          ? '<p class="hint">Type Load on the phone, then tap Open on glasses.</p>'
          : '<div class="huge">' + escapeHtml(hud.loadedLabel) + '</div>' +
            '<div class="otherbig">' + escapeHtml(hud.otherLoadedLabel) + '</div>' +
            renderBar(hud.plates) +
            '<div class="side">' + escapeHtml(hud.eachSide) + '</div>' +
            '<div class="miss ' + (hud.exact ? 'exact' : 'missed') + '">' + escapeHtml(hud.miss) + '</div>' +
            (hud.warmup
              ? '<div class="warmup"><span class="warmup-tag">WARM UP</span>' + escapeHtml(hud.warmup) + '</div>'
              : '')) +
        stampHtml();
    } else {
      root.innerHTML =
        '<div class="head"><div class="brand">IRONMATH</div><div class="screen">LB / KG</div></div>' +
        (emptyConvert && emptyLoad
          ? '<p class="hint">Type Convert on the phone, then tap Open on glasses.</p>'
          : '<div class="convert"><div class="col"><div class="huge">' +
            escapeHtml(hud.convertLb.replace(' LB', '')) +
            '</div><div class="other">LB</div></div><div class="col"><div class="huge">' +
            escapeHtml(hud.convertKg.replace(' KG', '')) +
            '</div><div class="other">KG</div></div></div>') +
        stampHtml();
    }
    if (dots) {
      dots.innerHTML =
        '<span class="dot' + (view === 'load' ? ' on' : '') + '"></span>' +
        '<span class="dot' + (view === 'convert' ? ' on' : '') + '"></span>' +
        '<span class="dot' + (view === 'timer' ? ' on' : '') + '"></span>';
    }
  }

  function applySearch(search) {
    var qs = String(search || '');
    if (!qs) return;
    if (qs.charAt(0) !== '?') qs = '?' + qs;
    liveSearch = qs;
    try {
      if (qs !== location.search) {
        history.replaceState({}, '', qs);
      }
    } catch (err) {
      // Meta webview may ignore history. liveSearch still paints the set.
    }
    paint();
  }

  function setView(next) {
    if (next === 'timer') {
      view = 'timer';
      timerAuto = false;
      paint();
      return;
    }
    view = next;
    timerAuto = false;
    var params = new URLSearchParams((liveSearch || '').replace(/^\?/, ''));
    params.set('view', next);
    applySearch('?' + params.toString());
  }

  function cycleView() {
    setView(view === 'load' ? 'convert' : view === 'convert' ? 'timer' : 'load');
  }

  function poll() {
    fetch(HUD_API + '?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (!data) return;
        var ts = Number(data.ts) || 0;
        if (ts && ts === lastTs) return;
        if (!data.search && !data.timer) return;
        lastTs = ts || Date.now();
        if (Object.prototype.hasOwnProperty.call(data, 'timer')) {
          timerState = data.timer && typeof data.timer === 'object' ? data.timer : null;
        }
        if (data.search) {
          applySearch(data.search);
        }
        autoView();
        paint();
      })
      .catch(function () {});
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      cycleView();
    }
  });

  window.addEventListener('resize', fitStage);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);
  fitStage();
  paint();
  poll();
  pollTimer = setInterval(poll, 1000);
  tickTimer = setInterval(function () {
    if (view === 'timer' && timerState && timerState.running) {
      paint();
    }
  }, 500);
  window.addEventListener('pagehide', function () {
    if (pollTimer) clearInterval(pollTimer);
    if (tickTimer) clearInterval(tickTimer);
  });
})();
