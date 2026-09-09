/**
 * 効果音エンジン。
 * public/sfx/ に音源ファイル（MP3）があればそちらを再生し、
 * 無ければ従来どおり WebAudio で合成する。
 */
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square",
              gain = .05, when = 0, slideTo?: number) {
  const c = ac(); if (!c || muted) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + .008);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0); o.stop(t0 + dur + .02);
}

function noise(dur: number, gain = .12, when = 0, hp = 800) {
  const c = ac(); if (!c || muted) return;
  const t0 = c.currentTime + when;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = c.createGain(); g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

// ── 音源ファイル再生 ──

/** ファイル名 → デコード済み AudioBuffer のキャッシュ */
const bufferCache = new Map<string, AudioBuffer | null>();

/** public/sfx/ 内の MP3 をフェッチ・デコードして返す（失敗時 null） */
async function loadBuffer(file: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(file)) return bufferCache.get(file)!;
  const c = ac();
  if (!c) return null;
  try {
    const res = await fetch(`/sfx/${file}`);
    if (!res.ok) { bufferCache.set(file, null); return null; }
    const ab = await res.arrayBuffer();
    const buf = await c.decodeAudioData(ab);
    bufferCache.set(file, buf);
    return buf;
  } catch {
    bufferCache.set(file, null);
    return null;
  }
}

/** AudioBuffer を即座に再生する */
function playBuffer(buf: AudioBuffer, vol = 0.5) {
  const c = ac(); if (!c || muted) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(g).connect(c.destination);
  src.start();
}

/**
 * ファイル再生を試み、ファイルが無ければ fallback（合成音）を鳴らすヘルパーを返す。
 * 初回呼び出し時にファイルをプリロードし、以降はキャッシュから即座に再生する。
 */
function withFile(file: string, vol: number, fallback: () => void): () => void {
  let preloaded = false;
  return () => {
    const cached = bufferCache.get(file);
    if (cached) { playBuffer(cached, vol); return; }
    if (cached === null) { fallback(); return; }
    if (!preloaded) {
      preloaded = true;
      loadBuffer(file).then((buf) => { if (buf) playBuffer(buf, vol); else fallback(); });
    } else {
      fallback();
    }
  };
}

// ── 合成音のフォールバック定義 ──

const synth = {
  tick: () => tone(1200, .035, "square", .03),
  confirm: () => { tone(660, .06, "square", .045); tone(990, .12, "square", .045, .06); },
  slash: () => { noise(.16, .18, 0, 1800); tone(2400, .08, "sawtooth", .03, 0, 200); },
  thud: () => { tone(90, .28, "sine", .25, 0, 40); noise(.12, .1, 0, 120); },
  boom: () => { noise(.35, .22, 0, 80); tone(60, .4, "sine", .3, 0, 30); },
  stamp: () => { tone(180, .1, "square", .12, 0, 90); noise(.08, .12, 0, 400); },
};

// ── プリロード（ページ読み込み時にバックグラウンドで取得） ──

const FILE_MAP: { key: keyof typeof synth; file: string }[] = [
  { key: "slash",   file: "sword.mp3" },
  { key: "thud",    file: "fall.mp3" },
  { key: "boom",    file: "cannon.mp3" },
  { key: "stamp",   file: "stamp.mp3" },
  { key: "confirm", file: "click.mp3" },
  { key: "tick",    file: "cursol.mp3" },
];

if (typeof window !== "undefined") {
  window.addEventListener("click", () => {
    for (const { file } of FILE_MAP) loadBuffer(file);
  }, { once: true });
}

// ── エクスポート ──

export const sfx = {
  /** カーソル移動 */
  tick: withFile("cursol.mp3", 0.3, synth.tick),
  /** 決定 */
  confirm: withFile("click.mp3", 0.4, synth.confirm),
  /** 戻る */
  cancel: () => { tone(440, .07, "square", .04); tone(300, .12, "square", .04, .07); },
  /** 台詞の文字送り */
  blip: () => tone(1500, .02, "square", .012),
  /** 斬撃 */
  slash: withFile("sword.mp3", 0.5, synth.slash),
  /** 落下・衝撃 */
  thud: withFile("fall.mp3", 0.5, synth.thud),
  /** 大砲 */
  boom: withFile("cannon.mp3", 0.6, synth.boom),
  /** スタンプ */
  stamp: withFile("stamp.mp3", 0.5, synth.stamp),
  /** 採用のファンファーレ */
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, "square", .05, i * .11)),
  /** 称号の出現 */
  reveal: () => { tone(220, .5, "sine", .12, 0, 110); tone(880, .3, "triangle", .05, .05); },
  /** 波しぶき（品を探している間）*/
  splash: () => { noise(.5, .06, 0, 300); tone(140, .4, "sine", .04, 0, 60); },
  /** 蹄の音（ロード中）*/
  hoof: () => { tone(320, .05, "triangle", .05, 0, 180); tone(280, .05, "triangle", .05, .1, 160); },
  isMuted: () => muted,
  toggle: () => { muted = !muted; return muted; },
};
