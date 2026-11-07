// Cat at the Window. Code: MIT-0 (see LICENSE). Copy, change and share anywhere, with no credit needed.
// Finds a song's tempo, its first strong bass entry (the drop) and where each bar starts.
(function () {
'use strict';
const SR = 22050, HOP = Math.floor(SR * 0.0025), STEP = HOP / SR, WIN = Math.floor(SR * 0.02);

async function mono(buffer, seconds) {
  const n = Math.ceil(Math.min(buffer.duration, seconds || Infinity) * SR);
  const ctx = new OfflineAudioContext(1, n, SR);
  const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(ctx.destination); src.start();
  return (await ctx.startRendering()).getChannelData(0);
}

function energy(x) {
  const nfr = Math.max(0, Math.floor((x.length - WIN) / HOP)), c = new Float64Array(x.length + 1), e = new Float64Array(nfr);
  for (let i = 0; i < x.length; i++) c[i + 1] = c[i] + x[i] * x[i];
  for (let i = 0; i < nfr; i++) e[i] = (c[i * HOP + WIN] - c[i * HOP]) / WIN;
  return e;
}
function flux(e, gain) {
  const f = new Float64Array(Math.max(0, e.length - 1));
  for (let i = 1; i < e.length; i++) f[i - 1] = Math.max(0, Math.log1p(gain * e[i]) - Math.log1p(gain * e[i - 1]));
  return f;
}

function lowBand(x) {
  const k = Math.floor(SR / 150), h = (k - 1) >> 1, c = new Float64Array(x.length + 1), y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) c[i + 1] = c[i] + x[i];
  for (let i = 0; i < x.length; i++) y[i] = (c[Math.min(x.length, i + h + 1)] - c[Math.max(0, i - h)]) / k;
  return y;
}

function tempo(x) {
  const f = flux(energy(x), 1e3); let m = 0; f.forEach((v) => { m += v; }); m /= f.length || 1;
  const g = f.map((v) => v - m), maxLag = Math.min(g.length - 1, 1602), ac = new Float64Array(maxLag + 1);
  for (let L = 0; L <= maxLag; L++) { let s = 0; for (let i = 0, n = g.length - L; i < n; i++) s += g[i] * g[i + L]; ac[L] = s; }
  const at = (lag) => { const i = Math.floor(lag), u = lag - i; return i + 1 < ac.length ? ac[i] * (1 - u) + ac[i + 1] * u : ac[ac.length - 1]; };
  let best = [-Infinity, 120];
  for (let k = 0; k <= 1400; k++) {
    const bpm = 60 + 0.1 * k, lag = 60 / bpm / STEP;
    if (4 * lag >= g.length - 1) continue;
    const s = (at(lag) + 0.5 * at(2 * lag) + 0.25 * at(4 * lag)) * Math.exp(-0.5 * Math.log2(bpm / 120) ** 2);
    if (s > best[0]) best = [s, Math.round(bpm * 10) / 10];
  }
  return best[1];
}

function drop(x) {
  const step = 0.05, hop = Math.floor(SR * step), win = Math.floor(SR * 0.1), nb = Math.ceil(150 * win / SR);
  const hann = Float64Array.from({ length: win }, (_, n) => 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (win - 1)));
  const cs = [], sn = [];
  for (let k = 0; k < nb; k++) { cs.push(Float64Array.from({ length: win }, (_, n) => Math.cos(2 * Math.PI * k * n / win))); sn.push(Float64Array.from({ length: win }, (_, n) => Math.sin(2 * Math.PI * k * n / win))); }
  const nfr = Math.max(0, Math.floor((x.length - win) / hop)), low = new Float64Array(nfr);
  for (let i = 0; i < nfr; i++) {
    let p = 0;
    for (let k = 0; k < nb; k++) { let re = 0, im = 0; const C = cs[k], S = sn[k]; for (let n = 0; n < win; n++) { const v = x[i * hop + n] * hann[n]; re += v * C[n]; im -= v * S[n]; } p += re * re + im * im; }
    low[i] = Math.sqrt(p / nb);
  }
  const sorted = Array.from(low).sort((a, b) => a - b), pos = 0.75 * (sorted.length - 1), lo = Math.floor(pos);
  const ref = (sorted.length ? sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (pos - lo) : 0) || 1;
  const rel = low.map((v) => v / ref), smooth = rel.map((_, i) => { let s = 0; for (let j = i - 3; j <= i + 2; j++) if (j >= 0 && j < rel.length) s += rel[j]; return s / 6; });
  const hold = Math.floor(2 / step);
  for (let i = 0; i < smooth.length - hold; i++) {
    let ok = true; for (let j = i; j < i + hold; j++) if (!(smooth[j] > 0.6)) { ok = false; break; }
    if (!ok) continue;
    let first = i; for (let j = Math.max(0, i - 3); j < i + 6; j++) if (rel[j] >= 0.6) { first = j; break; }
    return Math.round(first * step * 100) / 100;
  }
  return null;
}

function fold(kick, period, start, t1 = Infinity, soft = false) {
  const prof = new Float64Array(100);
  for (let i = 0; i < kick.length; i++) { const t = i * STEP; if (t < start || t > t1) continue; prof[Math.floor((t % period) / period * 100)] += kick[i]; }
  if (!soft) return prof;
  return prof.map((v, i) => prof[(i + 99) % 100] + v + prof[(i + 1) % 100]);
}
const argmax = (a) => { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; };

function middle(n) {
  const want = Math.min(n, Math.max(30 * SR, Math.floor(n / 2))), a = Math.floor((n - want) / 2);
  return [a / SR, (a + want) / SR];
}

function refine(kick, bpm, start, end) {
  let best = [-1, bpm];
  for (let k = -75; k <= 75; k++) {
    const b = bpm + k * 0.002, prof = fold(kick, 60 / b, start, end, true), peak = prof[argmax(prof)];
    if (peak > best[0]) best = [peak, b];
  }
  return Math.round(best[1] * 1000) / 1000;
}

function barOf(kick, period, offset, start, end) {
  const sums = [0, 0, 0, 0], w = Math.round(0.02 / STEP);
  for (let k = 0; ; k++) {
    const t = offset + k * period, i = Math.round(t / STEP);
    if (i + w >= kick.length || t > end) break;
    if (t < start) continue;
    for (let j = i - w; j <= i + w; j++) if (j >= 0) sums[k % 4] += kick[j];
  }
  return argmax(sums);
}

async function analyse(buffer, opts = {}) {
  const x = await mono(buffer, opts.seconds);
  const d = drop(x), kick = flux(energy(lowBand(x)), 1e4);
  if (opts.coarseOnly) {
    const coarseBpm = tempo(x), period0 = Math.round(60 / coarseBpm * 1e4) / 1e4;
    return { bpm: coarseBpm, period: period0, offset: Math.round(argmax(fold(kick, period0, d || 0)) / 100 * period0 * 1000) / 1000, drop: d, seconds: x.length / SR };
  }

  const [m0, m1] = middle(x.length), coarseBpm = tempo(x.subarray(Math.floor(m0 * SR), Math.floor(m1 * SR)));
  const bpm = refine(kick, coarseBpm, m0, m1), period = 60 / bpm;

  const lead = (WIN + HOP) / SR, offset = (argmax(fold(kick, period, m0, m1, true)) / 100 * period + lead) % period;
  const bar = barOf(kick, period, offset - lead, m0, m1);

  const k = d ? Math.round((d - offset) / period) : bar, bar0 = offset + k * period;
  return { bpm, period, offset, drop: d, bar: ((k % 4) + 4) % 4, bar0, seconds: x.length / SR, coarseBpm, kick, STEP };
}

function phases(r, win = 15, period = r.period) {
  const out = [];
  for (let t = r.drop || 0; t + win <= r.seconds; t += win) out.push(+(argmax(fold(r.kick, period, t, t + win, true)) / 100 * period).toFixed(3));
  return out;
}

function drift(r, period = r.period) {
  const end = r.seconds, start = r.drop || 0;
  const a = argmax(fold(r.kick, period, start, start + 30, true)) / 100 * period, b = argmax(fold(r.kick, period, end - 30, end, true)) / 100 * period;
  let d = b - a; if (d > period / 2) d -= period; if (d < -period / 2) d += period;
  return d;
}
window.Beats = { analyse, drift, phases };
})();
