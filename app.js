// Cat at the Window. Code: MIT-0 (see LICENSE). Copy, change and share anywhere, with no credit needed.
// The page's controls: the songs, your own song, coats, petting, saving a picture and full screen.
(function () {
'use strict';
const S = window.Stage, $ = (id) => document.getElementById(id);
const dots = Array.from(document.querySelectorAll('.beats i'));
// Songs play through an audio element: it starts while the file is still arriving, and a
// phone treats it as music, not as a sound effect.
const audio = new Audio();
audio.preload = 'auto';
let cat = null, beat = null, songUrl = null, ownUrl = false, ctx = null;
const freeClock = performance.now();

S.CAT_COATS.forEach((name) => { const o = document.createElement('option'); o.value = name; o.textContent = name.replace('-', ' '); $('coat').appendChild(o); });
$('coat').insertAdjacentHTML('beforeend', '<option value="any">any colour</option>');
const coatPicked = () => $('coat').value === 'any' ? $('colour').value : $('coat').value;
function furOf() { const fur = S.catCoat(coatPicked()); return { ...fur, stripes: $('stripes').checked ? fur.stripes || 1 : 0 }; }

function makeCat(timing) {
  if (cat) cat.layer.remove();
  cat = S.cat({ ...(timing || (beat ? { period: beat.period, bar0: beat.bar0, every: +$('every').value } : { period: 0.5, bar0: Infinity, every: 2 })), onTheBeat: true, top: 0, coat: furOf() });
}
$('coat').onchange = () => { $('stripes').checked = S.catCoat(coatPicked()).stripes > 0; makeCat(); };
$('colour').oninput = () => { $('coat').value = 'any'; makeCat(); };
$('stripes').onchange = () => makeCat();
$('every').onchange = () => makeCat();

// The song's clock. Some browsers move an audio element's time on in coarse ticks, so between
// ticks the clock runs on from the last one, but never while the song is paused or waiting for data.
let tickAt = 0, tickWall = 0;
function songTime() {
  const ct = audio.currentTime, now = performance.now();
  if (ct !== tickAt || audio.paused || audio.readyState < 3) { tickAt = ct; tickWall = now; return ct; }
  return ct + Math.min(0.5, (now - tickWall) / 1000);
}
function frame() {
  const t = beat ? songTime() : (performance.now() - freeClock) / 1000;
  S.now.t = t;
  cat.render();

  const k = beat && !audio.paused ? Math.floor((t - beat.offset) / beat.period) : -1, on = k >= 0 && (t - beat.offset) % beat.period < 0.12;
  dots.forEach((d, i) => { d.classList.toggle('on', on && ((k - beat.bar) % 4 + 4) % 4 === i); d.classList.toggle('one', i === 0); });
  requestAnimationFrame(frame);
}

audio.addEventListener('play', () => { $('play').textContent = 'Pause'; });
audio.addEventListener('pause', () => { $('play').textContent = 'Play'; });
audio.addEventListener('error', () => { if (beat) $('status').textContent = 'That song could not be played' + (audio.error && audio.error.message ? ' (' + audio.error.message + ')' : '') + '.'; });
function play() {
  const p = audio.play();
  if (p) p.catch((e) => { $('status').textContent = 'The browser did not start the song (' + e.message + '). Press Play.'; });
}
$('play').onclick = () => { if (audio.paused) play(); else audio.pause(); };
$('restart').onclick = () => { audio.currentTime = 0; play(); };

const lineUp = (r) => `${r.bpm.toFixed(1)} BPM. The tail lands its flick on a bar's first beat, lined up with ` + (r.drop ? `the drop at ${r.drop.toFixed(1)} s` : 'the first bar') + '.';
function useSong(url, own, r, text) {
  audio.pause();
  if (songUrl && ownUrl) URL.revokeObjectURL(songUrl);
  songUrl = url; ownUrl = own;
  audio.src = url;
  beat = r; makeCat();
  $('play').disabled = $('restart').disabled = false;
  $('status').textContent = text;
}

async function load(file) {
  if (!file) return;
  audio.pause();
  $('play').disabled = $('restart').disabled = true; $('status').textContent = 'Listening for the beat in ' + file.name + '...';
  try {
    ctx = ctx || new AudioContext();
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    const t0 = performance.now(), r = await window.Beats.analyse(buf);
    useSong(URL.createObjectURL(file), true, r, lineUp(r) + ` Measured in ${((performance.now() - t0) / 1000).toFixed(1)} s.`);
    window.__beat = { name: file.name, bpm: r.bpm, coarseBpm: r.coarseBpm, period: r.period, offset: r.offset, drop: r.drop, bar: r.bar, bar0: r.bar0, seconds: r.seconds, ms: performance.now() - t0 };
  } catch (e) {
    $('status').textContent = 'That file could not be read as a song (' + e.message + ').';
    if (beat) $('play').disabled = $('restart').disabled = false;
    window.__beat = { error: e.message };
  }
}
$('file').onchange = (e) => { load(e.target.files[0]); e.target.value = ''; };

// A song dropped anywhere on the page is loaded; without this, a browser opens the file in place of the page.
const dz = $('drop');
window.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) dz.classList.remove('over'); });
window.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); load(e.dataTransfer && e.dataTransfer.files[0]); });

function bytesOf(b64) { const bin = atob(b64), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
(window.CAT_SONGS || []).forEach((s) => {
  const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = s.name; $('songs').appendChild(btn); $('songs').hidden = false;
  btn.onclick = () => {
    const url = s.src || URL.createObjectURL(new Blob([bytesOf(s.data)], { type: s.type }));
    if (!s.beat) { fetch(url).then((r) => r.blob()).then((b) => load(new File([b], s.name, { type: s.type }))); return; }
    useSong(url, !s.src, s.beat, lineUp(s.beat));
    window.__beat = { name: s.name, ...s.beat, ms: 0 };
    play();
  };
});

function purr(seconds = 2.2) {
  ctx = ctx || new AudioContext();
  const now = ctx.currentTime, n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0, b = 0; i < n; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 4; }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
  const pulse = ctx.createGain(); pulse.gain.value = 0.5;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 26; const depth = ctx.createGain(); depth.gain.value = 0.5; lfo.connect(depth).connect(pulse.gain);
  const env = ctx.createGain(); env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(0.5, now + 0.4); env.gain.setValueAtTime(0.5, now + seconds - 0.7); env.gain.linearRampToValueAtTime(0, now + seconds);
  src.connect(lp).connect(pulse).connect(env).connect(ctx.destination);
  src.start(now); lfo.start(now); src.stop(now + seconds); lfo.stop(now + seconds);
}

let petTimer = null;
async function pet() {
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  // Newer iPhones mute page sound effects under the silent switch unless the page asks to be heard.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  ctx = ctx || new AudioContext(); await ctx.resume(); purr();
  if (beat) return;
  const t = (performance.now() - freeClock) / 1000;
  makeCat({ period: 0.5, bar0: t + 0.5 + 0.23, every: 8 });
  clearTimeout(petTimer); petTimer = setTimeout(() => makeCat(), 3200);
}
const stage = $('stage');
stage.onclick = pet;
stage.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pet(); } };

$('surprise').onclick = () => {
  if (Math.random() < 0.3) { $('coat').value = 'any'; $('colour').value = '#' + Array.from({ length: 3 }, () => Math.floor(60 + Math.random() * 170).toString(16).padStart(2, '0')).join(''); }
  else $('coat').value = S.CAT_COATS[Math.floor(Math.random() * S.CAT_COATS.length)];
  $('stripes').checked = Math.random() < 0.6;
  makeCat();
};

$('save').onclick = () => {
  const svg = new XMLSerializer().serializeToString(cat.svg), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = S.W * 2; c.height = S.H * 2;
    const g = c.getContext('2d'); g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob((png) => { const a = document.createElement('a'); a.href = URL.createObjectURL(png); a.download = 'cat-at-the-window.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
  };
  img.src = url;
};

// Full screen, where the device offers it (iPhones do not, for anything but video).
const fullOn = stage.requestFullscreen || stage.webkitRequestFullscreen;
if (fullOn && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) $('full').onclick = () => fullOn.call(stage);
else $('full').hidden = true;

// Space bar: play and pause, unless a control has the focus and the key belongs to it.
document.onkeydown = (e) => {
  if (e.code !== 'Space' || !beat) return;
  if (e.target.closest && e.target.closest('button, input, select, textarea, label, a, [role="button"]')) return;
  e.preventDefault(); $('play').click();
};

makeCat();
requestAnimationFrame(frame);
})();
