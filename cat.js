// Cat at the Window. Code: MIT-0 (see LICENSE). Copy, change and share anywhere, with no credit needed.
// The stage and the cat: every moving part is drawn from one clock, Stage.now.t, in seconds.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  window.Stage = {
    W: 1080, H: 330, now: { t: 0 },
    mk(tag, cls, css, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; if (parent) parent.appendChild(e); return e; },
    svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; },
  };
})();
(function () {
'use strict';
const S = window.Stage;
if (!S) throw new Error('cat.js: the stage is missing');
const PENCIL = '#4a4b4f';
const f1 = (v) => v.toFixed(1);

const HEIGHT = 330;
const PANE = { x0: 316, x1: 844, y0: 18, y1: 258 };

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function smooth(pts, per = 14) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const u = k / per, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)));
    }
  }
  return out;
}
const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const pathOf = (poly) => 'M' + poly.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'Z';

const COATS = {
  ginger: { tones: { light: '#f7c992', mid: '#dc8a45', dark: '#a85a24', rim: '#ffe2b5' }, body: ['#c06b2e', '#d4843f', '#eba762', '#f6c88e'], head: ['#c97535', '#dc8e4a', '#f4c189'], ear: ['#a3531f', '#e09a58'], shadow: '#6f3612', patch: '#eeac69', band: '#9c4f1c', crease: '#7a3b14', tail: ['#d98a47', '#94491b', '#8a4519'], stripes: 1 },
  black: { tones: { light: '#4d4846', mid: '#2a2726', dark: '#141212', rim: '#c9c2bb' }, body: ['#141213', '#1c1a1a', '#2c2928', '#4a4543'], head: ['#171515', '#232120', '#45403e'], ear: ['#100f0f', '#35312f'], shadow: '#000000', patch: '#3a3634', band: '#0a0909', crease: '#050505', tail: ['#242120', '#0f0e0e', '#0b0a0a'], stripes: 0.25 },
  'grey-tabby': { tones: { light: '#e3e3df', mid: '#a4a5a3', dark: '#626463', rim: '#f7f6f2' }, body: ['#7a7c7c', '#8f9190', '#b9bab6', '#dcdcd7'], head: ['#808281', '#999b99', '#d6d6d1'], ear: ['#5d5f5f', '#a9aaa7'], shadow: '#2c2e2f', patch: '#c3c4c0', band: '#4a4c4d', crease: '#3a3c3d', tail: ['#9b9c9a', '#505253', '#45474a'], stripes: 1.2 },
  'brown-tabby': { tones: { light: '#d8bf9a', mid: '#8f6f4c', dark: '#4e3a26', rim: '#f1e2c8' }, body: ['#4f3d2b', '#65503a', '#8f7556', '#c2a985'], head: ['#574430', '#705a40', '#b49b78'], ear: ['#3e2f21', '#8a7154'], shadow: '#1e1610', patch: '#9c8262', band: '#2b2016', crease: '#231a12', tail: ['#76603f', '#2e2318', '#281e15'], stripes: 1.2 },
  white: { tones: { light: '#ffffff', mid: '#ece9e3', dark: '#c9c3ba', rim: '#ffffff' }, body: ['#b8b2a9', '#cdc8bf', '#e6e2db', '#f7f5f0'], head: ['#c2bcb3', '#d8d3cb', '#f3f0ea'], ear: ['#aca59b', '#e2ddd5'], shadow: '#7c766d', patch: '#f5f3ee', band: '#a19a90', crease: '#968f85', tail: ['#e2ded6', '#bdb6ac', '#b0a99f'], stripes: 0 },
  cream: { tones: { light: '#fbe9cf', mid: '#eecb9f', dark: '#cfa678', rim: '#fff6e6' }, body: ['#c99e70', '#d9b185', '#ebcaa2', '#f8e3c6'], head: ['#d0a678', '#e1bb90', '#f5ddbd'], ear: ['#b98d61', '#eac9a2'], shadow: '#8a6744', patch: '#f2d7b3', band: '#b58a5e', crease: '#9a734c', tail: ['#e3bf93', '#b48a5f', '#a98058'], stripes: 0.8 },
};

const hsl = (c) => { const n = parseInt(c.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  return [!d ? 0 : 60 * (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4), d ? d / (1 - Math.abs(2 * l - 1)) : 0, l]; };
const hex = ([h, s, l]) => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join(''); };
function coatFrom(colour) {
  const [h0, s0, l0] = hsl(COATS.ginger.tones.mid), [h1, s1, l1] = hsl(colour), k = Math.min(1, l1 / l0, (1 - l1) / (1 - l0));
  const turn = (c) => { const [h, s, l] = hsl(c); return hex([((h - h0 + h1) % 360 + 360) % 360, Math.min(1, s * s1 / s0), Math.max(0, Math.min(1, l1 + (l - l0) * k))]); };
  const map = (v) => typeof v === 'string' ? turn(v) : Array.isArray(v) ? v.map(map) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, map(b)])) : v;
  return map(COATS.ginger);
}

function coatOf(c) {
  if (c === undefined || c === null) return COATS.ginger;
  if (typeof c === 'string' && Object.prototype.hasOwnProperty.call(COATS, c)) return COATS[c];
  if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) return coatFrom(c);
  if (c && typeof c === 'object' && !Array.isArray(c)) return { ...COATS.ginger, ...c, tones: { ...COATS.ginger.tones, ...(c.tones || {}) } };
  throw new Error(`cat.js: no coat ${JSON.stringify(c)}: ${Object.keys(COATS).join(', ')}, a colour like "#3a7bd5", or an object of colours`);
}

const stripe = (fur, v) => String(+Math.min(1, v * fur.stripes).toFixed(3)).replace(/^0\./, '.');
const pick = (rnd) => { const v = rnd(); return v < 0.4 ? 'light' : v < 0.85 ? 'mid' : 'dark'; };

function strand(x, y, l, a, b) { const r = a * Math.PI / 180, ex = x + Math.cos(r) * l, ey = y + Math.sin(r) * l, mx = (x + ex) / 2 - Math.sin(r) * b, my = (y + ey) / 2 + Math.cos(r) * b; return `M${f1(x)} ${f1(y)}Q${f1(mx)} ${f1(my)} ${f1(ex)} ${f1(ey)}`; }

function coat(fur) {
  const g = {};
  return {
    add(tone, w, d) { const k = tone + '|' + w; (g[k] = g[k] || []).push(d); },
    svg(op) { return Object.entries(g).map(([k, ds]) => { const [tone, w] = k.split('|'); return `<path d="${ds.join('')}" fill="none" stroke="${fur.tones[tone]}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`; }).join(''); },
  };
}

function room() {
  const out = [`<defs><clipPath id="cat-pane"><rect x="${PANE.x0}" y="${PANE.y0}" width="${PANE.x1 - PANE.x0}" height="${PANE.y1 - PANE.y0}"/></clipPath>
    <filter id="cat-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter></defs>`];

  out.push(`<rect x="${PANE.x0}" y="${PANE.y0}" width="${PANE.x1 - PANE.x0}" height="${PANE.y1 - PANE.y0}" fill="#8fa5bf"/>`);
  out.push(`<g clip-path="url(#cat-pane)"><circle cx="760" cy="62" r="20" fill="#f4f1e4" stroke="${PENCIL}" stroke-width="2.5"/>`);
  out.push(`<path d="M316 258 L316 196 L360 196 L360 170 L392 150 L424 170 L424 204 L470 204 L470 182 L540 182 L540 210 L600 210 L600 160 L650 160 L650 196 L700 196 L700 172 L744 150 L788 172 L788 200 L844 200 L844 258 Z" fill="#6f849c" stroke="${PENCIL}" stroke-width="2.5" stroke-linejoin="round"/>`);
  out.push(`<path d="M360 170 L392 150 L424 170 M470 182 L540 182 M600 160 L650 160 M700 172 L744 150 L788 172" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>`);
  [[372, 206], [404, 214], [484, 216], [612, 178], [628, 222], [716, 196], [760, 214], [804, 216]].forEach(([x, y]) => out.push(`<rect x="${x}" y="${y}" width="12" height="15" fill="#ffe45c" stroke="${PENCIL}" stroke-width="1.5"/>`));
  out.push(`<g class="cat-snow"></g></g>`);

  out.push(`<path d="M300 4 H860 V262 H300 Z M${PANE.x0} ${PANE.y0} H${PANE.x1} V${PANE.y1} H${PANE.x0} Z" fill="#f3ede0" fill-rule="evenodd" stroke="${PENCIL}" stroke-width="4" stroke-linejoin="round"/>`);
  out.push(`<path d="M580 ${PANE.y0} V${PANE.y1} M${PANE.x0} 138 H${PANE.x1}" stroke="#f3ede0" stroke-width="12"/><path d="M574 ${PANE.y0} V${PANE.y1} M586 ${PANE.y0} V${PANE.y1} M${PANE.x0} 132 H574 M586 132 H${PANE.x1} M${PANE.x0} 144 H574 M586 144 H${PANE.x1}" stroke="${PENCIL}" stroke-width="2.5"/>`);
  out.push(`<path d="M300 4 C270 70 300 140 282 300 L262 300 C278 150 248 60 270 4 Z M860 4 C890 70 860 140 878 300 L898 300 C882 150 912 60 890 4 Z" fill="#efe3d4" stroke="${PENCIL}" stroke-width="3" stroke-linejoin="round"/>`);
  out.push(`<path d="M272 262 H888 L924 302 H236 Z" fill="#f4eddd" stroke="${PENCIL}" stroke-width="3" stroke-linejoin="round"/><path d="M236 302 H924 V326 H236 Z" fill="#e8dfca" stroke="${PENCIL}" stroke-width="3.5" stroke-linejoin="round"/>`);

  out.push(`<g filter="url(#cat-soft)"><ellipse cx="763" cy="292" rx="52" ry="6" fill="#5b4630" opacity=".25"/><ellipse cx="470" cy="291" rx="84" ry="9" fill="#5b4630" opacity=".3"/></g>`);
  out.push(`<g transform="translate(0 24)"><path d="M716 268 L726 222 H800 L810 268 Z" fill="#d98a5f" stroke="${PENCIL}" stroke-width="3" stroke-linejoin="round"/><path d="M720 222 H806 V232 H720 Z" fill="#cf7c52" stroke="${PENCIL}" stroke-width="3"/><g class="cat-flowers"></g></g>`);
  return out.join('');
}
const FLAKES = (() => { const r = mulberry(41); return Array.from({ length: 70 }, () => ({ x: PANE.x0 + r() * (PANE.x1 - PANE.x0), y0: r() * 400, r: 2 + r() * 3.2, v: 18 + r() * 26, ph: r() * 6.28 })); })();
function snow(t) {
  const h = PANE.y1 - PANE.y0 + 20;
  return FLAKES.map((f) => `<circle cx="${f1(f.x + Math.sin(t * 0.9 + f.ph) * 6)}" cy="${f1(PANE.y0 - 10 + ((f.y0 + f.v * t) % h))}" r="${f1(f.r)}" fill="#ffffff" opacity=".95"/>`).join('');
}

const FLOWERS = [{ x: 742, y: 168, c: '#c8372a', s: 1 }, { x: 772, y: 150, c: '#ffe45c', s: 0.9 }, { x: 800, y: 176, c: '#c8372a', s: 0.85 }, { x: 716, y: 190, c: '#ffe45c', s: 0.75 }];
function flowers(t) {
  const sway = Math.sin(t * 1.1) * 3, out = [];
  FLOWERS.forEach((fl, i) => {
    const x = fl.x + sway * (1 + i * 0.2), y = fl.y + Math.cos(t * 1.1 + i) * 1.2, base = 754 + (i - 1.5) * 12;
    out.push(`<path d="M${base} 222 Q${f1((base + x) / 2 - 8)} ${f1((222 + y) / 2)} ${f1(x)} ${f1(y)}" fill="none" stroke="#0b6b5d" stroke-width="3.5" stroke-linecap="round"/>`);
    out.push(`<path d="M${f1((base + x) / 2)} ${f1((222 + y) / 2 + 8)} q-16 -10 -22 2 q14 8 22 -2 Z" fill="#3f8f7e" stroke="${PENCIL}" stroke-width="1.8"/>`);
    for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2 + i; out.push(`<circle cx="${f1(x + Math.cos(a) * 9 * fl.s)}" cy="${f1(y + Math.sin(a) * 9 * fl.s)}" r="${f1(7 * fl.s)}" fill="${fl.c}" stroke="${PENCIL}" stroke-width="1.6"/>`); }
    out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4.5 * fl.s)}" fill="#f6c453" stroke="${PENCIL}" stroke-width="1.6"/>`);
  });
  return out.join('');
}

const BODY = smooth([[470, 64], [497, 66], [504, 80], [507, 96], [512, 112], [519, 132], [526, 154], [531, 178], [535, 204], [537, 228], [537, 248], [532, 262], [518, 271], [496, 274], [470, 274], [444, 274], [422, 271], [408, 262], [403, 248], [403, 228], [405, 204], [409, 178], [414, 154], [421, 132], [428, 112], [433, 96], [436, 80], [443, 66]], 10);
const HEAD = smooth([[470, 64], [500, 68], [517, 86], [522, 110], [516, 132], [496, 146], [470, 150], [444, 146], [424, 132], [418, 110], [423, 86], [440, 68]]);

const HAUNCH = [[508, 240, 28, 26, 1], [432, 240, 28, 26, -1]];

const onHaunch = ([cx, cy, rx, ry, s], a, k = 1) => [cx + s * Math.cos(a * Math.PI / 180) * rx * k, cy + Math.sin(a * Math.PI / 180) * ry * k];
const arcPath = (h, a0, a1, k = 1) => 'M' + Array.from({ length: 13 }, (_, i) => onHaunch(h, a0 + (a1 - a0) * i / 12, k).map(f1).join(' ')).join('L');

const EARS = [[[424, 94], [428, 48], [437, 44], [460, 70]], [[516, 94], [512, 48], [503, 44], [480, 70]]];
function body(fur) {
  const rnd = mulberry(7), out = [];
  out.push(`<defs><radialGradient id="cat-furB" cx="470" cy="180" r="128" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${fur.body[0]}"/><stop offset=".62" stop-color="${fur.body[1]}"/><stop offset=".9" stop-color="${fur.body[2]}"/><stop offset="1" stop-color="${fur.body[3]}"/></radialGradient>
    <radialGradient id="cat-furH" cx="470" cy="96" r="70" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${fur.head[0]}"/><stop offset=".7" stop-color="${fur.head[1]}"/><stop offset="1" stop-color="${fur.head[2]}"/></radialGradient>
    <clipPath id="cat-body"><path d="${pathOf(BODY)}"/></clipPath><clipPath id="cat-head"><path d="${pathOf(HEAD)}"/></clipPath></defs>`);

  out.push(`<path d="${pathOf(BODY)}" fill="url(#cat-furB)"/>`);
  out.push(`<g clip-path="url(#cat-body)"><g filter="url(#cat-soft)"><ellipse cx="470" cy="268" rx="68" ry="10" fill="${fur.shadow}" opacity=".4"/><ellipse cx="470" cy="100" rx="24" ry="7" fill="${fur.shadow}" opacity=".2"/>
    <ellipse cx="452" cy="140" rx="16" ry="12" fill="${fur.patch}" opacity=".35"/><ellipse cx="488" cy="140" rx="16" ry="12" fill="${fur.patch}" opacity=".35"/>
    ${[[150, 40], [172, 46], [196, 52]].map(([y, w]) => `<path d="M${470 - w - 14} ${y + 12} Q470 ${y - 10} ${470 + w + 14} ${y + 12}" fill="none" stroke="${fur.band}" stroke-width="11" opacity="${stripe(fur, 0.42)}"/>`).join('')}
    ${HAUNCH.map((h) => { const [x, y] = onHaunch(h, 270, 0.55);
      return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="26" ry="12" fill="${fur.patch}" opacity=".28"/>` +
        [0.62, 0.92].map((k) => `<path d="${arcPath(h, 235, 350, k)}" fill="none" stroke="${fur.band}" stroke-width="9" opacity="${stripe(fur, 0.4)}"/>`).join('') +
        `<path d="${arcPath(h, 240, 345, 1.04)}" fill="none" stroke="${fur.crease}" stroke-width="6" opacity=".3"/>`; }).join('')}
    <path d="M470 100 V252" stroke="${fur.band}" stroke-width="10" opacity=".35"/></g></g>`);

  const c = coat(fur);
  for (let n = 0; n < 560;) {
    const x = 380 + rnd() * 180, y = 96 + rnd() * 176;
    if (!inside(BODY, x, y)) continue;
    n++;
    const side = Math.max(-1, Math.min(1, (x - 470) / 70));
    let a = 90 - side * 38;
    const h = HAUNCH[x > 470 ? 0 : 1], [cx, cy, rx, ry, s] = h, d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d < 1.25) {
      const th = Math.atan2((y - cy) / ry, s * (x - cx) / rx) * 180 / Math.PI, ta = Math.max(-10, Math.min(100, th + 90)), w = Math.min(1, (1.25 - d) / 0.4);
      a = a * (1 - w) + (s > 0 ? ta : 180 - ta) * w;
    }
    c.add(pick(rnd), (1.0 + rnd() * 0.6).toFixed(1), strand(x, y, 5 + rnd() * 6, a + (rnd() - 0.5) * 22, (rnd() - 0.5) * 3));
  }
  out.push(c.svg(0.35));

  const e = coat(fur);
  BODY.forEach(([x, y], i) => {
    const [px, py] = BODY[(i - 1 + BODY.length) % BODY.length], [nx, ny] = BODY[(i + 1) % BODY.length];
    let ox = ny - py, oy = -(nx - px); const l = Math.hypot(ox, oy) || 1; ox /= l; oy /= l;
    if (y > 264) {
      for (let k = 0; k < 3; k++) e.add(rnd() < 0.5 ? 'light' : 'mid', '1.2', strand(x + (rnd() - 0.5) * 6, y - 3 - rnd() * 4, 4 + rnd() * 6, 90 + (x - 470) * 0.35 + (rnd() - 0.5) * 50, (rnd() - 0.5) * 6));
      return;
    }
    for (let k = 0; k < 2; k++) {
      const a = Math.atan2(oy + 0.5, ox) * 180 / Math.PI + (rnd() - 0.5) * 30;
      const clump = rnd() < 0.3 ? 3 : 1, tone = rnd() < 0.55 ? 'rim' : 'light', l0 = 4 + rnd() * 8, b0 = (rnd() - 0.5) * 9;
      for (let q = 0; q < clump; q++) e.add(tone, '1.1', strand(x - ox * 4 + q * 1.5, y - oy * 4, l0 * (1 - q * 0.15), a + q * 6, b0));
    }
  });
  for (let k = 0; k < 130; k++) { const x = 412 + rnd() * 116, y = 264 + rnd() * 6; e.add(rnd() < 0.5 ? 'light' : 'mid', '1.2', strand(x, y, 4 + rnd() * 6, 90 + (x - 470) * 0.4 + (rnd() - 0.5) * 50, (rnd() - 0.5) * 6)); }
  out.push(e.svg(0.75));
  return out.join('');
}

function neck(fur) {
  const rnd = mulberry(13), r = coat(fur);
  for (let k = 0; k < 150; k++) { const x = 444 + rnd() * 52, y = 86 + rnd() * 16; r.add(rnd() < 0.2 ? 'light' : pick(rnd), '1.2', strand(x, y, 6 + rnd() * 7, 90 + (x - 470) * 0.8 + (rnd() - 0.5) * 20, (rnd() - 0.5) * 4)); }
  return r.svg(0.5);
}
function ear([b0, t0, t1, b1], fur) {
  const rnd = mulberry(b0[0]), c = coat(fur), tip = [(t0[0] + t1[0]) / 2, (t0[1] + t1[1]) / 2 - 4];
  const shape = smooth([b0, [(b0[0] + t0[0]) / 2 - 2, (b0[1] + t0[1]) / 2], tip, [(b1[0] + t1[0]) / 2 + 2, (b1[1] + t1[1]) / 2], b1, [(b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2 + 6]], 8);
  const gid = 'cat-ear' + b0[0];

  shape.forEach(([x, y]) => { if (y > Math.min(b0[1], b1[1]) - 4) return; const a = Math.atan2(y - (b0[1] + b1[1]) / 2, x - (b0[0] + b1[0]) / 2) * 180 / Math.PI; c.add(rnd() < 0.5 ? 'rim' : 'light', '1.1', strand(x, y, 3 + rnd() * 5, a + (rnd() - 0.5) * 30, (rnd() - 0.5) * 4)); });
  for (let k = 0; k < 14; k++) { const u = 0.2 + rnd() * 0.6, x = t1[0] + (b1[0] - t1[0]) * u, y = t1[1] + (b1[1] - t1[1]) * u; c.add('rim', '1.0', strand(x, y, 6 + rnd() * 7, -90 + (tip[0] > x ? -25 : 25) + (rnd() - 0.5) * 20, 3)); }
  return `<radialGradient id="${gid}" cx="${f1(tip[0])}" cy="${f1((tip[1] + b0[1]) / 2 + 6)}" r="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${fur.ear[0]}"/><stop offset="1" stop-color="${fur.ear[1]}"/></radialGradient><path d="${pathOf(shape)}" fill="url(#${gid})"/>${c.svg(0.75)}`;
}
function head(fur) {

  const rnd = mulberry(11), c = coat(fur), out = [`<path d="${pathOf(HEAD)}" fill="url(#cat-furH)"/>`,
    `<linearGradient id="cat-headfade" x1="0" y1="118" x2="0" y2="146" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${fur.body[1]}" stop-opacity="0"/><stop offset="1" stop-color="${fur.body[1]}"/></linearGradient><path d="${pathOf(HEAD)}" fill="url(#cat-headfade)"/>`,
    `<g clip-path="url(#cat-head)"><g filter="url(#cat-soft)">${[[84, 26], [100, 34]].map(([y, w]) => `<path d="M${470 - w} ${y + 8} Q470 ${y - 8} ${470 + w} ${y + 8}" fill="none" stroke="${fur.band}" stroke-width="9" opacity="${stripe(fur, 0.45)}"/>`).join('')}</g></g>`];
  for (let n = 0; n < 240;) {
    const x = 418 + rnd() * 104, y = 64 + rnd() * 86;
    if (!inside(HEAD, x, y)) continue;
    n++;
    c.add(pick(rnd), (1.0 + rnd() * 0.5).toFixed(1), strand(x, y, 4 + rnd() * 5, Math.atan2(y - 86, x - 470) * 180 / Math.PI + (rnd() - 0.5) * 24, (rnd() - 0.5) * 2));
  }
  out.push(c.svg(0.35));
  const e = coat(fur);
  HEAD.forEach(([x, y]) => {
    if (rnd() < 0.15 || y > 138) return;
    const a = Math.atan2(y - 100, x - 470) * 180 / Math.PI + (rnd() - 0.5) * 26, cheek = y > 105 ? 1.6 : 1;
    e.add(rnd() < 0.55 ? 'rim' : 'light', '1.1', strand(x, y, (4 + rnd() * 6) * cheek, a, (rnd() - 0.5) * 8));
  });
  out.push(e.svg(0.75));
  return out.join('');
}

const T_LAG = 0.07, TAIL_ROOT = [470, 260], T_LEN = [24, 22, 22, 21, 19, 17, 14], T_REST = [24, 6, 0, -3, -8, -18, -36], T_CURL = [24, 6, -2, -30, -62, -92, -118], T_W = [12, 13, 14, 14, 13, 12, 10, 7];

const T_SHADOW = (() => { let [x, y] = TAIL_ROOT; const pts = [[x, y + 12]]; T_LEN.forEach((L, i) => { const r = T_REST[i] * Math.PI / 180; x += Math.cos(r) * L; y += Math.sin(r) * L * 0.3; pts.push([x, y + 12]); }); return 'M' + pts.map(([a, b]) => f1(a) + ' ' + f1(b)).join('L'); })();
function tail(t, swishAt, fur, lag = T_LAG) {
  const idle = Math.sin(t * 1.4) * 5;
  let [x, y] = TAIL_ROOT; const spine = [[x, y]];
  T_LEN.forEach((L, i) => { const k = swishAt(t - i * lag), r = (T_REST[i] + (T_CURL[i] - T_REST[i]) * k + (i > 3 ? idle * (i - 3) / 3 : 0)) * Math.PI / 180; x += Math.cos(r) * L; y += Math.sin(r) * L; spine.push([x, y]); });
  const Ls = [], Rs = [];
  spine.forEach((p, i) => { const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; Ls.push([p[0] - dy * T_W[i], p[1] + dx * T_W[i], dx, dy]); Rs.push([p[0] + dy * T_W[i], p[1] - dx * T_W[i]]); });
  const tip = spine[spine.length - 1], [, , tdx, tdy] = Ls[Ls.length - 1];
  const shape = smooth([...Ls.map(([a, b]) => [a, b]), [tip[0] + tdx * 12, tip[1] + tdy * 12], ...Rs.slice().reverse()], 6);
  const rnd = mulberry(3), c = coat(fur), lift = swishAt(t - 3 * lag);
  const out = [`<path d="${T_SHADOW}" fill="none" stroke="#5b4630" stroke-width="18" stroke-linecap="round" opacity="${(0.22 - lift * 0.1).toFixed(3)}" filter="url(#cat-soft)"/>`, `<path d="${pathOf(shape)}" fill="${fur.tail[0]}"/>`];

  out.push(`<clipPath id="cat-tail"><path d="${pathOf(shape)}"/></clipPath><g clip-path="url(#cat-tail)"><g filter="url(#cat-soft)">${[2, 4].map((i) => `<path d="M${f1(Ls[i][0])} ${f1(Ls[i][1])} L${f1(Rs[i][0])} ${f1(Rs[i][1])}" stroke="${fur.tail[1]}" stroke-width="11" opacity="${stripe(fur, 0.45)}"/>`).join('')}<circle cx="${f1(tip[0])}" cy="${f1(tip[1])}" r="16" fill="${fur.tail[2]}" opacity=".35"/></g></g>`);

  for (let i = 0; i < spine.length - 1; i++) {
    const [ax, ay] = spine[i], [bx, by] = spine[i + 1], dir = Math.atan2(by - ay, bx - ax) * 180 / Math.PI, dr = dir * Math.PI / 180;
    for (let k = 0; k < 26; k++) {
      const u = rnd(), s = rnd() * 2 - 1, w = T_W[i] + (T_W[i + 1] - T_W[i]) * u;
      c.add(Math.abs(s) > 0.7 ? (rnd() < 0.5 ? 'rim' : 'light') : pick(rnd), '1.3', strand(ax + (bx - ax) * u - Math.sin(dr) * s * w, ay + (by - ay) * u + Math.cos(dr) * s * w, 5 + rnd() * 6 + Math.abs(s) * 5, dir + s * 45 + (rnd() - 0.5) * 16, (rnd() - 0.5) * 3));
    }
  }
  out.push(c.svg(0.6));
  const e = coat(fur);
  shape.forEach(([px0, py0], i) => {
    const [px, py] = shape[(i - 1 + shape.length) % shape.length], [nx, ny] = shape[(i + 1) % shape.length];
    let ox = ny - py, oy = -(nx - px); const l = Math.hypot(ox, oy) || 1; ox /= l; oy /= l;
    if (px0 < TAIL_ROOT[0] + 8) return;
    e.add(rnd() < 0.5 ? 'rim' : 'light', '1.1', strand(px0 - ox * 3, py0 - oy * 3, 4 + rnd() * 7, Math.atan2(oy + 0.4, ox) * 180 / Math.PI + (rnd() - 0.5) * 30, (rnd() - 0.5) * 8));
  });
  out.push(e.svg(0.7));

  const r = coat(fur), rr = mulberry(5);
  for (let k = 0; k < 46; k++) { const x = TAIL_ROOT[0] - 16 + rr() * 30, y = TAIL_ROOT[1] - 14 + rr() * 12; r.add(rr() < 0.5 ? 'light' : 'mid', '1.2', strand(x, y, 7 + rr() * 8, 70 + (rr() - 0.5) * 50, (rr() - 0.5) * 5)); }
  out.push(r.svg(0.6));
  return out.join('');
}

function cat(cfg) {
  const fur = coatOf(cfg.coat), stage = document.getElementById('stage'), wipe = document.getElementById('wipe');
  const layer = S.mk('div', 'cat-layer', 'position:absolute;inset:0;pointer-events:none');
  if (wipe) stage.insertBefore(layer, wipe); else stage.appendChild(layer);
  const svg = S.svgEl('svg', { class: 'layer', width: S.W, height: S.H, viewBox: `0 0 ${S.W} ${S.H}` }, layer);
  const g = S.svgEl('g', { transform: `translate(0 ${cfg.top})` }, svg);

  g.innerHTML = room() + '<g transform="translate(0 22)"><g class="cat-body">' + body(fur) + '<g transform="translate(470 68) scale(0.72) translate(-470 -107)"><g class="cat-ear0"></g><g class="cat-ear1"></g>' + head(fur) + '</g>' + neck(fur) + '</g><g class="cat-tail"></g></g>';
  const snowG = g.querySelector('.cat-snow'), flowerG = g.querySelector('.cat-flowers'), tailG = g.querySelector('.cat-tail'), bodyG = g.querySelector('.cat-body');
  const ear0 = g.querySelector('.cat-ear0'), ear1 = g.querySelector('.cat-ear1');

  ear0.innerHTML = ear(EARS[0], fur);
  ear1.innerHTML = ear(EARS[1], fur);
  const BAR = 4 * cfg.period, PER = cfg.every * BAR;
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

  const LAG = cfg.onTheBeat ? 0.15 * cfg.period : T_LAG, TIP = 0.46 * cfg.period;
  const swishAt = (t) => {
    if (cfg.onTheBeat) {
      const s = ((t - cfg.bar0 + cfg.period + TIP) % PER + PER) % PER, up = cfg.period, hold = cfg.period, down = 2 * cfg.period;
      return s < up ? ease(s / up) : s < up + hold ? 1 : s < up + hold + down ? 1 - ease((s - up - hold) / down) : 0;
    }
    if (t < cfg.bar0 + BAR) return 0;
    const s = ((t - cfg.bar0 - BAR) % PER + PER) % PER, up = 1.5 * cfg.period, hold = cfg.period, down = 2 * cfg.period;
    return s < up ? ease(s / up) : s < up + hold ? 1 : s < up + hold + down ? 1 - ease((s - up - hold) / down) : 0;
  };
  return {
    layer, svg, height: HEIGHT,
    render() {
      const t = S.now.t;
      snowG.innerHTML = snow(t);
      flowerG.innerHTML = flowers(t);
      tailG.innerHTML = tail(t, swishAt, fur, LAG);

      const breath = 1 + 0.008 * Math.sin(t * 2 * Math.PI / 3.4);
      bodyG.setAttribute('transform', `translate(470 268) scale(1 ${breath.toFixed(4)}) translate(-470 -268)`);
      const e = cfg.onTheBeat ? ((t - cfg.bar0 - PER / 2 + 0.15) % PER + PER) % PER : ((t - cfg.bar0 - 3 * BAR) % PER + PER) % PER;
      const flick = (cfg.onTheBeat ? Number.isFinite(cfg.bar0) : t > cfg.bar0 + 3 * BAR) && e < 0.3 ? Math.sin(e / 0.3 * Math.PI) * -14 : 0;
      ear0.setAttribute('transform', `rotate(${f1(flick)} 440 82)`);
    },
  };
}

S.cat = cat;
S.CAT_HEIGHT = HEIGHT;
S.CAT_COATS = Object.keys(COATS);
S.catCoat = coatOf;
})();
