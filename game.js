/* 중국어 탐험대 · 10차시 「판다네 집, 我喜欢!」 (game.js)
   고치지 않아도 됩니다. 방과 문제는 game-data.js에서 바꿔요. */
(() => {
'use strict';
const D = window.GAME_DATA;
const $ = s => document.querySelector(s);
const Net = window.PandaNet || { enabled:false, push(){}, studentStart(){ return Promise.resolve(null); }, watchBoard(cb){ cb(null); return () => {}; }, onStatus(fn){ fn('off'); }, status(){ return 'off'; }, flush(){}, uid(){ return null; } };
const STORE_KEY = D.saveKey || 'panda-lesson10', PREF_KEY = 'panda-stage1-prefs';
const WORDS = D.words;
const SOUNDS = D.audio.sounds;
/* 낱말 소리 · "我喜欢○○。" · "我想吃○○。" 소리를 자동으로 만들어요 */
Object.keys(WORDS).forEach(id => {
  const w = WORDS[id];
  if (!SOUNDS[id]) SOUNDS[id] = { text: w.text, pinyin: w.pinyin };
  if (!SOUNDS['like_' + id]) SOUNDS['like_' + id] = { text: `我喜欢${w.text}。`, pinyin: `Wǒ xǐhuan ${w.pinyin}.`, kr: `워 시환 ${w.kr}.` };
  if (!SOUNDS['chi_' + id]) SOUNDS['chi_' + id] = { text: `我想吃${w.text}。`, pinyin: `Wǒ xiǎng chī ${w.pinyin}.`, kr: `워 샹 츠 ${w.kr}.` };
});
Object.keys(SOUNDS).forEach(id => { if (!SOUNDS[id].file) SOUNDS[id].file = `audio/${id}.mp3`; });
const IMG = id => (window.WORD_IMAGES && window.WORD_IMAGES[id]) || `img/${id}.jpg`;
const ROOMS = D.rooms;
const MOM = D.mom;
const MISSIONS = [];
ROOMS.forEach((r, i) => { MISSIONS.push({ ...r.mission, zone: i, room: r.id }); if (r.mission2) MISSIONS.push({ ...r.mission2, zone: i, room: r.id, second: true }); });
MISSIONS.push({ ...MOM.mission, zone: ROOMS.length, room: 'mom' });
const ALL = MISSIONS;
const QUESTION_COUNT = MISSIONS.length;
const PICK_SLOTS = [{ id: 'mom', cat: '사람', choices: MOM.choices }, ...ROOMS.map(r => ({ id: r.id, cat: r.cat, choices: r.choices }))];
const DEX_IDS = Object.keys(WORDS).filter(id => !['guotie', 'baozi'].includes(id));

/* ================= 저장 (이 기기 + 온라인) ================= */
const store = {
  load(){ try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch(e){ return null; } },
  save(s){ try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); return true; } catch(e){ return false; } }
};
let prefs = { bgm:45, sfx:70, voice:100, mute:false };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch(e){}
const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch(e){} };
const emptyRec = () => ({ first:null, firstCorrect:null, tries:0, wrongs:[], points:0, done:false, doneAt:null });
function newState(name){
  const results = {}; ALL.forEach(m => results[m.id] = emptyRec());
  return { name, tag:String(Math.floor(1000 + Math.random()*9000)), startedAt:Date.now(), learn:0, starPts:0,
           picks:{}, rooms:{}, order:[], momDone:false, room:null, coins:(D.coins && D.coins.start) || 0, items:[], equip:{}, votes:{}, preds:{}, pulls:0, results, finished:false, finishedAt:null };
}
let S = null;
const doneCount = () => MISSIONS.filter(m => S.results[m.id].done).length;
const roomDone = r => !!(S.rooms[r.id] && S.rooms[r.id].cleared);
const roomsCleared = () => ROOMS.filter(roomDone).length;
const pickText = () => PICK_SLOTS.filter(p => S.picks[p.id]).map(p => `${p.cat}:${WORDS[S.picks[p.id]].text}`).join(', ');
function summary(){
  const res = {};
  ALL.forEach(m => { const r = S.results[m.id]; res[m.id] = { first: r.first, firstCorrect: r.firstCorrect, tries: r.tries, wrongs: (r.wrongs || []).slice(0, 12), points: r.points, done: r.done }; });
  const firstCorrect = MISSIONS.filter(m => S.results[m.id].firstCorrect === true).length;
  return { name: S.name, tag: S.tag, lesson: D.lessonId || 'lesson', learn: S.learn, star: S.starPts, total: S.learn + S.starPts,
    bells: doneCount(), bellsTotal: MISSIONS.length, bossDone: !!S.finished,
    finished: !!S.finished, finishedAt: S.finishedAt || null, startedAt: S.startedAt, firstCorrect, questions: QUESTION_COUNT,
    coins: S.coins || 0, items: (S.items || []).length, predOk: Object.values(S.preds || {}).filter(p => p && p.ok).length,
    roomsDone: roomsCleared(), pickCount: Object.keys(S.picks).length, pickTotal: PICK_SLOTS.length, picks: pickText(),
    order: (S.order || []).join('>'), results: res };
}
const persist = (now) => { if (!S) return; store.save(S); Net.push(summary(), now === true); };
/* ================= 소리 ================= */
const Snd = (() => {
  let ctx = null, master, bgmGain, sfxGain, duck = 1, bgmOn = false, nextNote = 0, step = 0;
  const bad = {}; let lastSource = '';
  function ensure(){
    if (ctx){ if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    bgmGain = ctx.createGain(); bgmGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.connect(master);
    apply();
  }
  function apply(){
    if (!ctx) return; const t = ctx.currentTime;
    master.gain.setTargetAtTime(prefs.mute ? 0 : 1, t, .05);
    bgmGain.gain.setTargetAtTime(prefs.bgm/100 * .2 * duck, t, .15);
    sfxGain.gain.setTargetAtTime(prefs.sfx/100 * .6, t, .05);
  }
  const setDuck = d => { duck = d; apply(); };
  function tone(f, start, dur, type='sine', vol=.3, dest=sfxGain, atk=.01){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, start);
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start + atk);
    g.gain.exponentialRampToValueAtTime(.0008, start + dur);
    o.connect(g); g.connect(dest); o.start(start); o.stop(start + dur + .05); return o;
  }
  const hz = n => 440 * Math.pow(2, (n - 69)/12);
  // 배경음악: 오음계 반복 곡 (코드로 직접 생성, 저작권 문제 없음)
  const MEL = [76,79,81,79, 76,74,72,74, 76,79,84,81, 79,76,74,-1, 72,74,76,79, 81,79,76,74, 72,76,74,72, 69,72,74,-1];
  const BASS = [48,55,45,52, 48,55,43,50];
  function schedule(){
    if (!ctx || !bgmOn) return;
    const spb = 60/112/2;
    while (nextNote < ctx.currentTime + .25){
      const n = MEL[step % MEL.length];
      if (n > 0) tone(hz(n), nextNote, spb*1.6, 'triangle', .16, bgmGain, .02);
      if (step % 4 === 0) tone(hz(BASS[(step/4) % BASS.length]), nextNote, spb*3.6, 'sine', .22, bgmGain, .03);
      if (step % 2 === 1) tone(hz(96), nextNote, .05, 'square', .01, bgmGain, .002);
      nextNote += spb; step++;
    }
  }
  function startBgm(){ ensure(); if (!ctx || bgmOn) return; bgmOn = true; nextNote = ctx.currentTime + .1; setInterval(schedule, 90); }
  const fx = fn => () => { ensure(); if (ctx) fn(ctx.currentTime); };
  const sfx = {
    correct: fx(t => { [72,76,79,84].forEach((n,i) => tone(hz(n), t+i*.07, .35, 'triangle', .25)); tone(hz(96), t+.3, .5, 'sine', .12); }),
    wrong:   fx(t => { tone(hz(64), t, .18, 'sine', .18); tone(hz(60), t+.12, .25, 'sine', .15); }),
    bell:    fx(t => { [[523,.3],[1046,.14],[1568,.08],[2093,.05]].forEach(([f,v]) => tone(f, t, 2.2, 'sine', v, sfxGain, .003)); }),
    star:    fx(t => { tone(hz(88), t, .08, 'square', .045); tone(hz(93), t+.06, .14, 'square', .045); }),
    jump:    fx(t => { const o = tone(300, t, .16, 'sine', .1); o.frequency.exponentialRampToValueAtTime(620, t+.14); }),
    bump:    fx(t => { const o = tone(220, t, .25, 'triangle', .14); o.frequency.exponentialRampToValueAtTime(110, t+.22); }),
    stomp:   fx(t => { tone(hz(67), t, .1, 'square', .06); tone(hz(74), t+.08, .12, 'square', .06); }),
    place:   fx(t => { tone(hz(79), t, .12, 'triangle', .18); }),
    door:    fx(t => { tone(hz(48), t, 1.2, 'sawtooth', .05); [60,64,67,72,76].forEach((n,i) => tone(hz(n), t+.25+i*.12, .8, 'triangle', .16)); }),
    bonus:   fx(t => { [79,83,86,91,95].forEach((n,i) => tone(hz(n), t+i*.06, .3, 'sine', .18)); }),
    fanfare: fx(t => { [[72,0],[76,.15],[79,.3],[84,.45],[79,.7],[84,.85]].forEach(([n,d]) => tone(hz(n), t+d, .5, 'triangle', .22)); }),
    hop:     fx(t => { const o = tone(420, t, .12, 'sine', .09); o.frequency.exponentialRampToValueAtTime(760, t+.1); }),
    dice:    fx(t => { for (let i = 0; i < 6; i++) tone(hz(84 + (i % 3)*3), t + i*.07, .05, 'square', .03); }),
    back:    fx(t => { const o = tone(520, t, .4, 'triangle', .12); o.frequency.exponentialRampToValueAtTime(200, t+.38); }),
    party:   fx(t => { [[67,0],[67,.18],[69,.36],[67,.6],[72,.84],[71,1.08]].forEach(([n,d]) => tone(hz(n), t+d, .4, 'triangle', .2)); }),
    blip:    fx(t => tone(hz(88), t, .06, 'sine', .08)),
    munch:   fx(t => { for (let i = 0; i < 4; i++){ const o = tone(180 + (i % 2)*70, t + i*.16, .1, 'square', .05); o.frequency.exponentialRampToValueAtTime(90, t + i*.16 + .09); } }),
    burp:    fx(t => { const o = tone(150, t, .35, 'sawtooth', .07); o.frequency.exponentialRampToValueAtTime(70, t+.32); }),
    yawn:    fx(t => { const o = tone(hz(72), t, 1.1, 'sine', .12, sfxGain, .2); o.frequency.exponentialRampToValueAtTime(hz(60), t+1); }),
    pop:     fx(t => { const o = tone(600, t, .1, 'sine', .12); o.frequency.exponentialRampToValueAtTime(1200, t+.08); })
  };
  // 중국어 음성: ① 녹음 파일 → ② 온라인 음성 → ③ 기기 내장 음성
  // 휴대폰은 화면을 누르기 전에는 소리를 막아요. 첫 터치 때 재생기 하나를 '깨워 두고' 계속 다시 씁니다.
  const SILENT = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
  const voiceEl = new Audio(); voiceEl.preload = 'auto';
  try { voiceEl.preservesPitch = true; voiceEl.webkitPreservesPitch = true; } catch(e){}
  let unlocked = false;
  function unlock(){
    ensure();
    if (ctx){ try { const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0); } catch(e){} }
    if (unlocked) return; unlocked = true;
    try {
      voiceEl.muted = true; voiceEl.src = SILENT;
      const p = voiceEl.play();
      if (p && p.then) p.then(() => { voiceEl.pause(); voiceEl.muted = false; }).catch(() => { voiceEl.muted = false; unlocked = false; });
    } catch(e){ unlocked = false; }
    try { if (window.speechSynthesis){ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } } catch(e){}
  }
  ['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture:true, passive:true }));
  const errKind = err => !err ? 'load' : err.name === 'NotAllowedError' ? 'blocked' : err.name === 'AbortError' ? 'abort' : 'load';
  function playUrl(url, rate){
    return new Promise((res, rej) => {
      const a = voiceEl; let started = false, done = false;
      const fail = kind => { const e = new Error(kind); e.kind = kind; return e; };
      const fin = (fn, v) => { if (done) return; done = true; clearTimeout(to); a.onerror = a.onended = a.onplaying = null; fn(v); };
      const to = setTimeout(() => { if (!started){ try { a.pause(); } catch(e){} fin(rej, fail('timeout')); } }, 6000);
      try { a.pause(); } catch(e){}
      a.muted = false; a.volume = prefs.mute ? 0 : prefs.voice/100;
      a.onerror = () => fin(rej, fail('load'));
      a.onended = () => fin(res);
      a.onplaying = () => { started = true; clearTimeout(to); a.playbackRate = rate; };
      a.src = url; a.defaultPlaybackRate = rate; a.playbackRate = rate;
      const p = a.play(); if (p && p.catch) p.catch(err => fin(rej, fail(errKind(err))));
    });
  }
  function synth(text, rate){
    return new Promise((res, rej) => {
      const ss = window.speechSynthesis; if (!ss) return rej(new Error('nosynth'));
      const vs = ss.getVoices();
      const v = vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || vs.find(v => /cmn/i.test(v.lang));
      if (!v && vs.length) return rej(new Error('novoice'));
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN'; if (v) u.voice = v; u.rate = rate < 1 ? .55 : .85; u.volume = prefs.mute ? 0 : prefs.voice/100;
      u.onend = () => res(); u.onerror = e => rej(e);
      ss.cancel(); ss.speak(u); setTimeout(res, 4500);
    });
  }
  let busy = Promise.resolve();
  async function say(id, slow=false){
    const s = SOUNDS[id]; if (!s) return;
    ensure(); setDuck(.12);
    const rate = slow ? (D.audio.slowRate || .7) : 1;
    const blockedErr = () => { lastSource = 'blocked'; const e = new Error('blocked'); e.kind = 'blocked'; return e; };
    try {
      if (D.audio.useLocalFiles && !bad[id]){
        try { await playUrl(s.file, rate); lastSource = 'file'; return; }
        catch(e){ if (e.kind === 'blocked') throw blockedErr(); if (e.kind === 'load') bad[id] = true; }
      }
      if (D.audio.useOnlineVoice && D.audio.onlineVoiceUrl && !bad.online){
        try { await playUrl(D.audio.onlineVoiceUrl + encodeURIComponent(s.text), rate); lastSource = 'online'; return; }
        catch(e){ if (e.kind === 'blocked') throw blockedErr(); if (e.kind === 'load') bad.online = true; }
      }
      await synth(s.text, rate); lastSource = 'device';
    } catch(e){ if (e.kind !== 'blocked') lastSource = 'fail'; throw e; }
    finally { setTimeout(() => setDuck(1), 250); }
  }
  const sayQ = (id, slow) => (busy = busy.catch(() => {}).then(() => say(id, slow)));
  async function saySeq(ids, slow, gap=420){ for (const id of ids){ await sayQ(id, slow); await new Promise(r => setTimeout(r, gap)); } }
  const retry = () => Object.keys(bad).forEach(k => delete bad[k]);
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
  return { ensure, unlock, apply, startBgm, sfx, say:sayQ, saySeq, retry, source:() => lastSource };
})();
const SOURCE_TEXT = {
  file:    ['녹음 파일로 재생 중', true],
  online:  ['임시 음성(온라인 자동 음성, 성조 검수 전)', false],
  device:  ['임시 음성(기기 내장 음성, 성조 검수 전)', false],
  blocked: ['휴대폰이 자동 재생을 막았어요. ▶ 듣기를 눌러 주세요.', false],
  fail:    ['소리를 재생하지 못했어요. 무음 모드와 음량을 확인하고 ↻ 다시를 눌러 주세요.', false]
};
function sourceBadge(){ const v = SOURCE_TEXT[Snd.source()]; if (!v) return '';
  return `<span class="badge-temp ${v[1] ? 'badge-ok' : ''}">${v[1] ? '✔' : '⚠'} ${v[0]}</span>`; }


/* ================= 작은 도구 ================= */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random()*a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const img = (id, cls = 'fimg') => `<img class="${cls}" src="${IMG(id)}" alt="${esc(WORDS[id] ? WORDS[id].ko : '')}" draggable="false">`;
const tri = id => `<b class="zhl">${esc(WORDS[id].text)}</b><span class="py">${esc(WORDS[id].pinyin)}</span><span class="kr">${esc(WORDS[id].kr)}</span>`;
const triS = (t, p, k) => `<b class="zhl">${esc(t)}</b><span class="py">${esc(p)}</span>${k ? `<span class="kr">${esc(k)}</span>` : ''}`;
/* 동글동글 판다. belly: 0~8 (먹을수록 배가 나와요) · mood: happy / wow / sleepy · cap: 빨간 모자 */
let pid = 0;
function pandaSVG(o = {}){
  const u = 'pd' + (++pid), k = `url(#${u}k)`, w = `url(#${u}w)`, b = clamp(o.belly || 0, 0, 9);
  const mouth = o.mood === 'wow' ? `<ellipse cx="60" cy="70.5" rx="4.2" ry="5" fill="#d9586f"/><ellipse cx="60" cy="72.5" rx="2.6" ry="2.2" fill="#ff9aa9"/>`
    : o.mood === 'eat' ? `<ellipse cx="60" cy="70" rx="6" ry="4.2" fill="#d9586f"/>`
    : `<path d="M53.5 67.5q3.2 4.2 6.5 0q3.3 4.2 6.5 0" stroke="#2a2c30" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const eye = (x, d) => o.mood === 'sleepy'
    ? `<path d="M${x - 5} ${51} q5 4 10 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : `<circle cx="${x}" cy="51" r="6.3" fill="#141518"/><circle cx="${x + 2.2*d}" cy="48.4" r="2.6" fill="#fff"/><circle cx="${x - 1.8*d}" cy="54.2" r="1.2" fill="#fff"/>`;
  const brx = 32 + b*3.8, bry = 27.5 + b*2.1, bcy = 90 + b*.9;
  return `<svg class="panda" viewBox="-16 -18 152 146" aria-hidden="true">
    <defs>
      <radialGradient id="${u}w" cx="42%" cy="32%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset=".72" stop-color="#f7f5f2"/><stop offset="1" stop-color="#e2ddd8"/></radialGradient>
      <radialGradient id="${u}k" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#55585e"/><stop offset="1" stop-color="#1d1f23"/></radialGradient>
      <filter id="${u}f" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.8"/></filter>
    </defs>
    <ellipse cx="60" cy="121" rx="${33 + b*3.6}" ry="4.5" fill="rgba(0,0,0,.22)"/>
    <g filter="url(#${u}f)">
      <ellipse cx="${41 - b*2.6}" cy="${112 + b*.3}" rx="12.5" ry="9.5" fill="${k}"/><ellipse cx="${79 + b*2.6}" cy="${112 + b*.3}" rx="12.5" ry="9.5" fill="${k}"/>
      <ellipse cx="60" cy="${bcy}" rx="${brx}" ry="${bry}" fill="${w}"/>
      <ellipse cx="${31 - b*3.4}" cy="87" rx="10.5" ry="13.5" transform="rotate(${28 + b*4} ${31 - b*3.4} 87)" fill="${k}"/><ellipse cx="${89 + b*3.4}" cy="87" rx="10.5" ry="13.5" transform="rotate(${-28 - b*4} ${89 + b*3.4} 87)" fill="${k}"/>
      <circle cx="26" cy="19" r="13.5" fill="${k}"/><circle cx="94" cy="19" r="13.5" fill="${k}"/>
      <ellipse cx="60" cy="50" rx="43" ry="37.5" fill="${w}"/>
    </g>
    <circle cx="27" cy="20.5" r="6" fill="#f2a9b8" opacity=".5"/><circle cx="93" cy="20.5" r="6" fill="#f2a9b8" opacity=".5"/>
    <ellipse cx="41" cy="52" rx="11.5" ry="14" transform="rotate(-30 41 52)" fill="#26282c"/><ellipse cx="79" cy="52" rx="11.5" ry="14" transform="rotate(30 79 52)" fill="#26282c"/>
    ${eye(42, 1)}${eye(78, 1)}
    <ellipse cx="31" cy="66" rx="7.5" ry="4.6" fill="#ff98ab" opacity="${.62 + b*.03}"/><ellipse cx="89" cy="66" rx="7.5" ry="4.6" fill="#ff98ab" opacity="${.62 + b*.03}"/>
    <ellipse cx="60" cy="61.5" rx="5" ry="3.6" fill="#26282c"/><ellipse cx="58.6" cy="60.4" rx="1.6" ry="1" fill="#8b8f96"/>
    ${mouth}
    <ellipse cx="60" cy="${bcy + 5}" rx="${18 + b*3.3}" ry="${14 + b*2.1}" fill="#fff" opacity=".8"/>
    ${b >= 3 ? `<circle cx="60" cy="${bcy + 6 + b*.4}" r="1.6" fill="#e2c9c0"/>` : ''}
    ${o.apron ? `<path d="M${44 - (o.belly||0)} 80 h${32 + 2*(o.belly||0)} l4 34 h${-40 - 2*(o.belly||0)} z" fill="#ff9ec0" opacity=".92"/><path d="M46 80 Q60 70 74 80" stroke="#ff6f9b" stroke-width="3" fill="none"/><circle cx="60" cy="98" r="4" fill="#fff"/>` : ''}
    ${o.bow ? `<g transform="translate(92 31) rotate(18)"><path d="M0 0 L-13 -8 Q-16 0 -13 8 Z" fill="#ff7aa5"/><path d="M0 0 L13 -8 Q16 0 13 8 Z" fill="#ff7aa5"/><circle r="4" fill="#ff4f86"/></g>` : ''}
    ${o.heart ? `<path d="M100 0 c-4-7-14-4-12 3 c1 5 12 11 12 11 s11-6 12-11 c2-7-8-10-12-3z" fill="#ff4f86"/>` : ''}
    ${o.cap ? `<g transform="rotate(-10 60 8)"><path d="M34 16 Q60 -8 86 16 Z" fill="#e2483b"/><rect x="30" y="13" width="60" height="6" rx="3" fill="#b8322a"/><circle cx="60" cy="-1" r="4" fill="#ffd54f"/></g>` : ''}
  </svg>`;
}

/* ================= 화면 효과 ================= */
function flash(kind='win'){ const el = $('#flash'); el.className = ''; void el.offsetWidth; el.className = kind; }
let toastTimer;
function toast(txt, ms=2400){ const el = $('#toast'); el.textContent = txt; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, ms); }
function hearts(n = 24){
  const box = $('#confetti'); if (!box) return;
  for (let i = 0; i < n; i++){ const c = document.createElement('i'); c.className = 'heart';
    c.textContent = pick(['❤', '💗', '💖', '⭐', '✨']);
    c.style.left = Math.random()*100 + '%'; c.style.animationDelay = (Math.random()*.6) + 's';
    c.style.setProperty('--r', (Math.random()*80 - 40) + 'deg'); c.style.setProperty('--x', (Math.random()*80 - 40) + 'px');
    box.appendChild(c); setTimeout(() => c.remove(), 2800); }
}
function floatAt(txt, x, y, cls = ''){
  const p = document.createElement('div'); p.className = 'floatpts ' + cls; p.textContent = txt;
  p.style.left = x + 'px'; p.style.top = y + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1400);
}
async function say(id, slow){ try { await Snd.say(id, slow); updateSrc(); } catch(e){ showPlayError(); } }

/* ================= 코인 · 판다 꾸미기 ================= */
const GACHA = D.gacha || [];
const RARE = { 1: ['일반', 'r1'], 2: ['희귀', 'r2'], 3: ['전설', 'r3'] };
function dressed(o = {}, eq = S ? S.equip : {}){
  const it = slot => { const g = GACHA.find(x => x.id === eq[slot]); return g ? `<span class="acc ${slot}">${g.e}</span>` : ''; };
  return `<div class="dressed">${pandaSVG(o)}${it('head')}${it('face')}${it('hold')}</div>`;
}
function addCoins(n, why, el){
  if (!n) return;
  S.coins = (S.coins || 0) + n; persist();
  const r = el ? el.getBoundingClientRect() : $('#coinBox').getBoundingClientRect();
  floatAt(`🪙 +${n}${why ? ' ' + why : ''}`, r.left + r.width/2, r.top, 'coin');
  Snd.sfx.star(); renderHud();
  const cb = $('#coinBox'); if (cb){ cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); }
}

/* ================= 우리 반 집계 (이름 없이 몇 명만) ================= */
let TALLY = null, tallyOk = Net.enabled, tallyListeners = [];
function startTally(){
  if (!Net.enabled) return;
  Net.watchTally(t => { if (t === null){ tallyOk = false; } else { tallyOk = true; TALLY = t; } tallyListeners.forEach(fn => { try { fn(); } catch(e){} }); });
}
/* 온라인 저장이 꺼져 있을 때 보여 주는 '판다 마을 친구들' 예시 숫자 (실제 반 결과가 아님) */
function demoCounts(round, a, b){
  let h = 7; for (const c of round + a + b) h = (h*31 + c.charCodeAt(0)) % 9973;
  return { [a]: 6 + h % 9, [b]: 6 + Math.floor(h/9) % 9 };
}
function counts(round, a, b){
  const live = Net.enabled && tallyOk;
  let c;
  if (live){ const t = (TALLY && TALLY[round]) || {}; c = { [a]: t[a] || 0, [b]: t[b] || 0 }; }
  else { c = demoCounts(round, a, b); const v = S.votes[round]; if (v) c[v] += 1; }
  return { c, live };
}
function barsHTML(round, a, b, mine){
  const { c, live } = counts(round, a, b), tot = c[a] + c[b] || 1;
  const pa = Math.round(c[a]*100/tot), pb = 100 - pa;
  return `<div class="tally">
    <div class="tbar"><span class="tlab">${img(a, 'timg')}<b class="zhl">${esc(WORDS[a].text)}</b>${mine === a ? '<i>나</i>' : ''}</span><span class="track"><span class="fill fa" style="width:${c[a] ? Math.max(pa, 6) : 0}%"></span></span><span class="pct">${c[a] + c[b] ? pa : 0}%<small>${c[a]}명</small></span></div>
    <div class="tbar"><span class="tlab">${img(b, 'timg')}<b class="zhl">${esc(WORDS[b].text)}</b>${mine === b ? '<i>나</i>' : ''}</span><span class="track"><span class="fill fb" style="width:${c[b] ? Math.max(pb, 6) : 0}%"></span></span><span class="pct">${c[a] + c[b] ? pb : 0}%<small>${c[b]}명</small></span></div>
    <p class="tnote">${live ? `🔴 LIVE · 우리 반 ${c[a] + c[b]}명이 골랐어요 (이름은 저장하지 않아요)` : Net.enabled ? '⚠️ 우리 반 결과를 불러오지 못해 판다 마을 예시 숫자를 보여 줘요' : '판다 마을 친구들 결과(예시 숫자) · 온라인 저장을 켜면 우리 반 결과가 나와요'}</p>
  </div>`;
}

/* ================= 판다네 집 (방 지도) ================= */
let curRoom = null, busy = false;
function roomCard(r){
  const i = ROOMS.indexOf(r), p = S.picks[r.id], cl = roomDone(r);
  return `<button type="button" class="hroom ${cl ? 'cleared' : p ? 'started' : ''}" data-room="${i}" style="--wall:${r.wall};--floorc:${r.floorc}">
    <span class="hname">${r.icon} ${esc(r.name)}</span><span class="hcat">${esc(WORDS[r.choices[0]].text)} VS ${esc(WORDS[r.choices[1]].text)}</span>
    <span class="frame">${p ? img(p) : '<i>VS</i>'}</span>
    ${cl ? '<span class="hstamp">❤</span>' : ''}
  </button>`;
}
function renderHouse(){
  curRoom = null; S.room = null; persist(); stopTimers();
  $('#roomv').hidden = true; $('#roomv').innerHTML = ''; $('#house').hidden = false;
  const up = ROOMS.filter(r => r.floor === 2), down = ROOMS.filter(r => r.floor !== 2);
  const all = roomsCleared() === ROOMS.length && S.momDone;
  $('#house').innerHTML = `<div class="houseIn">
    <div class="hroof"><span class="chim"></span><div class="hsign">판다네 집 🐼 VS</div></div>
    <div class="hfloor">${up.map(roomCard).join('')}</div>
    <div class="hfloor">${down.map(roomCard).join('')}</div>
    <div class="hground"></div>
    <div class="hbottom">
      <div class="hguide">${dressed({ mood: all ? 'wow' : 'happy', bow: !S.equip.head })}<div class="bubble"><p>${
        all ? '우리 집 밸런스 게임 끝! 프로필이랑 우리 반 결과를 보러 가자!'
        : roomsCleared() ? `방 ${roomsCleared()}개 클리어! 다음은 어느 방?` : '어느 방부터 갈까? 방을 눌러 들어가 봐!'}</p>
        ${all ? '<button class="btn primary" type="button" id="profileBtn">💖 프로필 · 우리 반 결과 보기</button>' : ''}</div></div>
      <button type="button" class="gachabtn" id="gachaBtn"><span class="gm">🎰</span><b>판다 뽑기</b><small>🪙 ${D.coins.gachaCost}개로 한 번!</small></button>
    </div>
  </div>`;
  $('#house').querySelectorAll('.hroom').forEach(b => b.onclick = () => enterRoom(+b.dataset.room));
  if ($('#profileBtn')) $('#profileBtn').onclick = () => finishGame();
  $('#gachaBtn').onclick = openGacha;
  renderHud();
  if (!S.momDone && roomsCleared() >= MOM.after) setTimeout(() => { if (!$('#house').hidden && !busy && $('#evt').hidden) momEvent(); }, 900);
}

/* ================= 방 안: 밸런스 게임 ================= */
let timers = [];
function stopTimers(){ timers.forEach(t => clearInterval(t)); timers = []; if (tallyRender){ tallyListeners = tallyListeners.filter(f => f !== tallyRender); tallyRender = null; } }
let tallyRender = null;
function countdown(el, secs, onEnd){
  const t0 = Date.now(), tot = secs*1000;
  const tick = () => { const left = Math.max(0, tot - (Date.now() - t0)); if (!el.isConnected){ clearInterval(id); return; }
    el.style.setProperty('--p', (left/tot*100) + '%'); el.querySelector('b').textContent = Math.ceil(left/1000);
    if (left <= 0){ clearInterval(id); onEnd && onEnd(); } };
  const id = setInterval(tick, 100); timers.push(id); tick();
}
function enterRoom(i){
  if (busy) return;
  Snd.ensure(); Snd.startBgm(); Snd.sfx.door();
  curRoom = i; const r = ROOMS[i]; S.room = r.id; $('#toast').hidden = true;
  if (!S.order.includes(r.id)) S.order.push(r.id);
  persist();
  $('#house').hidden = true; $('#roomv').hidden = false;
  renderRoom(true);
}
function renderRoom(greet){
  stopTimers();
  const r = ROOMS[curRoom], p = S.picks[r.id], cl = roomDone(r);
  const ms = MISSIONS.filter(m => m.room === r.id);
  $('#roomv').innerHTML = `
    <div class="roombar"><button class="btn backbtn" type="button" id="backHouse">← 집 지도</button>
      <div class="rtitle"><b>${r.icon} ${esc(r.name)}</b><small>좋아하는 ${esc(r.cat)} · 밸런스 게임</small></div>
      <div class="rprog">${ms.map(m => `<i class="${S.results[m.id].done ? 'on' : ''}">${S.results[m.id].done ? '❤' : '?'}</i>`).join('')}</div></div>
    <div class="rscene small" style="--wall:${r.wall};--floorc:${r.floorc}">
      <div class="rwall"></div><div class="rfloor"></div>
      <span class="rdeco d0">${r.deco[0]}</span><span class="rdeco d1">${r.deco[1]}</span><span class="rdeco d2">${r.deco[2]}</span>
      <div class="bigframe ${p ? 'filled' : ''}" id="bigframe">${p ? img(p) + `<span class="fcap zhl">${esc(WORDS[p].text)}</span>` : '<i>VS</i>'}</div>
      <div class="rpanda" id="rpanda">${dressed({ mood: cl ? 'wow' : 'happy', heart: cl })}<div class="pbubble" id="pbubble" hidden></div></div>
    </div>
    <div class="rpanel" id="rpanel"></div>`;
  $('#backHouse').onclick = () => { Snd.sfx.blip(); renderHouse(); };
  if (!p) vsStage(r, greet);
  else if (!S.preds[r.id]) predictStage(r);
  else if (!cl && MISSIONS.some(m => m.room === r.id && !S.results[m.id].done)) renderNextStep(r);
  else if (!cl) clearRoom(r);
  else renderCleared(r);
  renderHud();
}
function pBubble(html, ms){ const b = $('#pbubble'); if (!b) return; b.innerHTML = html; b.hidden = false; clearTimeout(pBubble.t); if (ms) pBubble.t = setTimeout(() => { if ($('#pbubble')) $('#pbubble').hidden = true; }, ms); }
/* 1단계: VS! 5초 안에 고르기 (정답 없음) */
function vsHTML(a, b, title, cls = ''){
  const card = id => `<button type="button" class="vscard ${cls}" data-vs="${id}">${img(id)}<span class="tri">${tri(id)}</span><span class="pko">${esc(WORDS[id].ko)}</span></button>`;
  return `<div class="vshead"><div class="timer" id="vsTimer"><b>5</b></div><div><p class="ptitle">${title}</p>
      <div class="ask"><button class="btn mini" type="button" id="askSay">▶</button><b class="zhl">你喜欢什么？</b><small>Nǐ xǐhuan shénme? 니 시환 선머?</small></div></div></div>
    <div class="vs">${card(a)}<span class="vsmark">VS</span>${card(b)}</div>`;
}
function vsStage(r, greet){
  const [a, b] = r.choices;
  $('#rpanel').innerHTML = vsHTML(a, b, `⚡ ${D.pickSeconds}초 안에 고르면 번개 보너스! <small>정답 없어요, 좋아하는 쪽을 골라요</small>`);
  $('#askSay').onclick = () => say('nixihuan');
  let fast = true;
  countdown($('#vsTimer'), D.pickSeconds, () => { fast = false; const t = $('#vsTimer'); if (t){ t.classList.add('over'); t.querySelector('b').textContent = '!'; } });
  $('#rpanel').querySelectorAll('[data-vs]').forEach(btn => btn.onclick = () => choosePick(r, btn.dataset.vs, fast, btn));
  if (greet){ pBubble(`<b class="zhl">你喜欢什么？</b><small>뭐가 더 좋아?</small>`, 2400); setTimeout(() => say('nixihuan'), 300); }
}
async function choosePick(r, id, fast, btn){
  if (busy) return; busy = true; stopTimers();
  $('#rpanel').querySelectorAll('[data-vs]').forEach(x => x.classList.toggle('sel', x === btn));
  $('#rpanel').querySelectorAll('[data-vs]').forEach(x => x.classList.toggle('lose', x !== btn));
  S.picks[r.id] = id; S.starPts += D.points.pick;
  if (!S.votes[r.id]){ S.votes[r.id] = id; Net.vote(r.id, id); }
  persist(true);
  const fr = $('#bigframe'); fr.classList.add('filled', 'popin'); fr.innerHTML = img(id) + `<span class="fcap zhl">${esc(WORDS[id].text)}</span>`;
  Snd.sfx.bonus(); hearts(10);
  if (fast) addCoins(D.coins.fast, '번개!', btn);
  pBubble(`<b class="zhl">我喜欢${esc(WORDS[id].text)}！</b>`, 2200);
  renderHud();
  await say('like_' + id);
  await wait(300);
  busy = false;
  predictStage(r);
}
/* 2단계: 우리 반 다수 예측 → 실시간 결과 */
function predictStage(r){
  stopTimers();
  const [a, b] = r.choices;
  $('#rpanel').innerHTML = `<div class="vshead"><div class="timer" id="vsTimer"><b>6</b></div><p class="ptitle">🔮 우리 반 친구들은 뭘 <b>더 많이</b> 골랐을까?<small>맞히면 🪙 +${D.coins.predict} · 별 +${D.points.predict}</small></p></div>
    <div class="vs pred">${[a, b].map(id => `<button type="button" class="vscard small" data-pr="${id}">${img(id)}<span class="tri">${tri(id)}</span></button>`).join('<span class="vsmark">?</span>')}</div>`;
  let done = false;
  const go = v => { if (done) return; done = true; stopTimers(); reveal(r, v); };
  countdown($('#vsTimer'), D.predictSeconds, () => go(null));
  $('#rpanel').querySelectorAll('[data-pr]').forEach(btn => btn.onclick = () => { Snd.sfx.pop(); btn.classList.add('sel'); go(btn.dataset.pr); });
}
async function reveal(r, guess){
  busy = true;
  const [a, b] = r.choices, mine = S.picks[r.id];
  $('#rpanel').innerHTML = `<p class="ptitle">📊 우리 반 결과 발표!</p><div id="tallyBox">${barsHTML(r.id, a, b, mine)}</div><div id="predRes" class="predres"></div>`;
  // 막대가 차오르는 연출
  $('#tallyBox').querySelectorAll('.fill').forEach(f => { const w = f.style.width; f.style.width = '0%'; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.width = w; })); });
  Snd.sfx.dice ? Snd.sfx.dice() : Snd.sfx.blip();
  await wait(1300);
  const { c } = counts(r.id, a, b);
  const top = c[a] === c[b] ? 'tie' : c[a] > c[b] ? a : b;
  const ok = !!guess && (top === 'tie' || top === guess);
  S.preds[r.id] = { guess, ok }; persist(true);
  $('#predRes').innerHTML = !guess ? '⏰ 예측 시간이 지났어요. 다음 방에서 맞혀 봐요!'
    : ok ? `🎉 예언 성공! ${top === 'tie' ? '딱 반반이에요!' : `우리 반은 <b class="zhl">${esc(WORDS[top].text)}</b>파가 더 많아요!`}`
    : `😮 아깝다! 우리 반은 <b class="zhl">${esc(WORDS[top].text)}</b>파가 더 많아요.`;
  if (ok){ Snd.sfx.fanfare(); hearts(18); S.starPts += D.points.predict; addCoins(D.coins.predict, '예언!', $('#predRes')); }
  else Snd.sfx.blip();
  $('#predRes').insertAdjacentHTML('beforeend', `<div class="row center"><button class="btn primary" type="button" id="goNext">다음: 판다의 문제 ✏️</button></div>`);
  tallyRender = () => { const tb = $('#tallyBox'); if (tb) tb.innerHTML = barsHTML(r.id, a, b, mine); };
  tallyListeners.push(tallyRender);
  busy = false;
  $('#goNext').onclick = () => renderNextStep(r);
}
function likeLine(id){ const s2 = SOUNDS['like_' + id]; return `<div class="likeline"><span class="tri big">${triS(s2.text, s2.pinyin, s2.kr)}</span><button class="btn mini" type="button" id="likeSay">▶</button></div>`; }
function renderNextStep(r){
  stopTimers();
  const m = MISSIONS.find(x => x.room === r.id && !S.results[x.id].done);
  if (!m) return clearRoom(r);
  $('#rpanel').innerHTML = likeLine(S.picks[r.id]) + `<div class="row center"><button class="btn primary" type="button" id="goQuiz">${m.second ? '🧊 냉장고 열어 보기' : '✏️ 판다의 문제 풀기'}</button></div>`;
  $('#likeSay').onclick = () => say('like_' + S.picks[r.id]);
  $('#goQuiz').onclick = () => openQuiz(m);
  setTimeout(() => { if (!quizOpen && curRoom != null && ROOMS[curRoom] === r && $('#goQuiz')) openQuiz(m); }, 450);
}
function clearRoom(r){
  if (!roomDone(r)){
    S.rooms[r.id] = { cleared: true, at: Date.now() }; persist(true);
    Snd.sfx.fanfare(); hearts(24); flash('win');
    setTimeout(() => addCoins(D.coins.room, '방 클리어!'), 300);
  }
  renderRoom();
}
function renderCleared(r){
  const [a, b] = r.choices, p = S.picks[r.id];
  $('#rpanel').innerHTML = likeLine(p) + `<div id="tallyBox">${barsHTML(r.id, a, b, p)}</div>
    <p class="center done-msg">❤ ${esc(r.name)} 클리어!</p>
    <div class="row center"><button class="btn primary" type="button" id="toHouse">집 지도로 🏠</button></div>`;
  $('#likeSay').onclick = () => say('like_' + p);
  $('#toHouse').onclick = () => { Snd.sfx.blip(); renderHouse(); };
  tallyRender = () => { const tb = $('#tallyBox'); if (tb) tb.innerHTML = barsHTML(r.id, a, b, p); };
  tallyListeners.push(tallyRender);
}

/* ================= 깜짝 손님: 엄마 판다 ================= */
async function momEvent(){
  if (busy || S.momDone) return; busy = true;
  Snd.sfx.door();
  $('#evt').innerHTML = `<div class="card evtcard momcard"><div class="ding">🔔 띵동!</div>
    <div class="momwrap mystery" id="momArt">${pandaSVG({ mood: 'happy', apron: true, bow: true })}<span class="qmark">?</span></div>
    <h2>깜짝 손님이 왔어요!</h2><p>"<b class="zhl">我是谁？</b> Wǒ shì shéi? 나는 누구게?"</p>
    <div class="row center"><button class="btn primary" type="button" id="momGo">누군지 맞혀 볼래요!</button></div></div>`;
  $('#evt').hidden = false;
  say('woshishei');
  $('#momGo').onclick = () => { $('#evt').hidden = true; busy = false; openQuiz(MISSIONS.find(m => m.room === 'mom')); };
}
async function momReveal(){
  busy = true;
  const [a, b] = MOM.choices;
  $('#evt').innerHTML = `<div class="card evtcard momcard"><div class="momwrap" id="momArt">${pandaSVG({ mood: 'wow', apron: true, bow: true, heart: true })}</div>
    <h2>엄마 판다였어요! <span class="zhl">妈妈</span></h2>
    <div id="momPick">${vsHTML(a, b, '엄마 판다의 밸런스 게임! 누가 더 좋아?', 'small')}</div></div>`;
  $('#evt').hidden = false; hearts(16); Snd.sfx.bonus();
  $('#askSay').onclick = () => say('nixihuan');
  let fast = true;
  countdown($('#vsTimer'), D.pickSeconds, () => { fast = false; });
  $('#evt').querySelectorAll('[data-vs]').forEach(btn => btn.onclick = async () => {
    stopTimers();
    const id = btn.dataset.vs;
    S.picks.mom = id; S.momDone = true; S.starPts += D.points.pick;
    if (!S.votes.mom){ S.votes.mom = id; Net.vote('mom', id); }
    persist(true);
    if (fast) addCoins(D.coins.fast, '번개!', btn);
    $('#momPick').innerHTML = likeLine(id) + `<div id="tallyBox">${barsHTML('mom', a, b, id)}</div>
      <p class="center">${id === 'mama' ? '엄마 판다가 꼬옥 안아 줘요! 🤗 <b class="zhl">谢谢！</b>' : '엄마 판다: "친구도 좋지! 다음에 친구랑 같이 놀러 와~" 😊'}</p>
      <div class="row center"><button class="btn primary" type="button" id="momBye">계속하기!</button></div>`;
    $('#likeSay').onclick = () => say('like_' + id);
    hearts(26); Snd.sfx.fanfare(); renderHud();
    tallyRender = () => { const tb = $('#tallyBox'); if (tb) tb.innerHTML = barsHTML('mom', a, b, id); };
    tallyListeners.push(tallyRender);
    await say('like_' + id);
    if (id === 'mama') say('xiexie');
    $('#momBye').onclick = () => { $('#evt').hidden = true; busy = false; stopTimers(); renderHouse(); };
  });
}

/* ================= 판다 뽑기 ================= */
function openGacha(){
  if (busy) return;
  const cost = D.coins.gachaCost;
  const owned = S.items || [];
  $('#evt').innerHTML = `<div class="card evtcard gachacard">
    <h2>🎰 판다 뽑기</h2>
    <div class="gtop"><div class="gpreview" id="gPrev">${dressed({ mood: 'happy' })}</div>
      <div class="machine" id="machine"><div class="globe"><span>🔴</span><span>🟡</span><span>🔵</span><span>🟢</span><span>🟣</span></div><div class="mbody"><span class="slot"></span></div></div></div>
    <p class="center">내 코인 <b class="coinnum">🪙 ${S.coins || 0}</b> · 한 번에 🪙 ${cost}</p>
    <div class="row center"><button class="btn primary" type="button" id="pullBtn" ${S.coins >= cost ? '' : 'disabled'}>뽑기! (🪙 ${cost})</button><button class="btn ghost" type="button" id="gClose">닫기</button></div>
    <p class="note center">${S.coins >= cost ? '이미 가진 아이템이 나오면 코인 2개를 돌려받아요.' : '코인이 모자라요. 밸런스 게임에서 우리 반 다수를 맞히거나 문제를 맞히면 코인을 받아요!'}</p>
    <div id="gResult"></div>
    <h3>내 옷장 <small>${owned.length} / ${GACHA.length}</small> · 눌러서 입기/벗기</h3>
    <div class="closet">${GACHA.map(g => { const has = owned.includes(g.id), on = S.equip[g.slot] === g.id;
      return `<button type="button" class="citem ${RARE[g.rare][1]} ${has ? 'has' : ''} ${on ? 'on' : ''}" data-item="${g.id}" ${has ? '' : 'disabled'}><span class="ce">${has ? g.e : '❔'}</span><small>${has ? esc(g.name) : RARE[g.rare][0]}</small></button>`; }).join('')}</div>
  </div>`;
  $('#evt').hidden = false;
  $('#gClose').onclick = () => { $('#evt').hidden = true; renderHouse(); };
  $('#pullBtn').onclick = pull;
  $('#evt').querySelectorAll('[data-item]').forEach(b => b.onclick = () => {
    const g = GACHA.find(x => x.id === b.dataset.item); if (!S.items.includes(g.id)) return;
    S.equip[g.slot] = S.equip[g.slot] === g.id ? null : g.id; persist(); Snd.sfx.place(); openGacha();
  });
}
async function pull(){
  const cost = D.coins.gachaCost;
  if (busy || (S.coins || 0) < cost) return;
  busy = true; S.coins -= cost; S.pulls = (S.pulls || 0) + 1; persist(); renderHud();
  $('#pullBtn').disabled = true;
  const m = $('#machine'); m.classList.add('shake2'); Snd.sfx.dice ? Snd.sfx.dice() : Snd.sfx.blip();
  // 희귀도: 일반 70% · 희귀 25% · 전설 5%
  const roll = Math.random(), rare = roll < .05 ? 3 : roll < .30 ? 2 : 1;
  const pool = GACHA.filter(g => g.rare === rare), g = pick(pool.length ? pool : GACHA);
  await wait(1100); m.classList.remove('shake2');
  const dup = S.items.includes(g.id);
  if (!dup){ S.items.push(g.id); if (!S.equip[g.slot]) S.equip[g.slot] = g.id; } else S.coins += 2;
  persist(true);
  $('#gResult').innerHTML = `<div class="capsule ${RARE[g.rare][1]}"><span class="ce">${g.e}</span><b>${esc(g.name)}</b><small>${RARE[g.rare][0]}${dup ? ' · 이미 있어서 🪙 2개 돌려받았어요' : ' · NEW!'}</small></div>`;
  if (g.rare === 3) { Snd.sfx.fanfare(); hearts(40); } else Snd.sfx.bonus();
  await wait(1500);
  busy = false; renderHud();
  const keep = $('#gResult').innerHTML;
  openGacha(); $('#gResult').innerHTML = keep;
}

/* ================= 퀴즈 ================= */
let quizOpen = false, Q = null;
function openQuiz(m){
  const rec = S.results[m.id];
  Q = { m, rec, locked:false, build:[] };
  const r = ROOMS.find(x => x.id === m.room), p = r ? S.picks[r.id] : null;
  Q.pick = p;
  switch (m.type){
    case 'order': { const w = WORDS[p]; Q.tiles = ['我', '喜欢', w.text]; Q.answer = Q.tiles.join('|'); Q.opts = shuffle([...Q.tiles, ...(m.extra || [])]); Q.main = 'like_' + p; break; }
    case 'ask': Q.opts = shuffle(m.options.map((o, i) => ({ ...o, i }))); Q.main = m.sound; break;
    case 'pickWord': case 'hearPhoto': Q.opts = shuffle(m.options); Q.main = m.sound; break;
    case 'verb': Q.opts = m.options.map((o, i) => ({ ...o, i })); break;
    case 'situation': { const f = p || 'jiaozi';
      Q.opts = shuffle([ { sid: 'chi_' + f, correct: true }, { sid: 'like_' + f } ]); break; }
  }
  quizOpen = true; renderQuiz(); $('#quiz').hidden = false;
  if (m.type === 'ask' || m.type === 'hearPhoto') setTimeout(() => { if (quizOpen && Q && Q.m === m) playMain(false); }, 380);
}
function playMain(slow){ return Snd.say(Q.main, slow).then(updateSrc).catch(showPlayError); }
function updateSrc(){ const el = $('#srcnote'); if (el) el.innerHTML = sourceBadge(); const qp = $('#qplay'); if (qp && Snd.source() !== 'blocked') qp.classList.remove('pulse'); }
function showPlayError(){ const el = $('#srcnote'); if (el) el.innerHTML = sourceBadge(); const qp = $('#qplay'); if (qp) qp.classList.add('pulse'); }
function renderQuiz(){
  const { m } = Q, box = $('#qbox');
  const idx = MISSIONS.indexOf(MISSIONS.find(x => x.id === m.id));
  let h = `<div class="stars" id="stars"></div>
    <div class="qhead"><span class="place">${m.room === 'mom' ? '🔔' : ROOMS.find(r => r.id === m.room).icon} ${esc(m.place)}</span><span class="count">문제 ${idx + 1} / ${QUESTION_COUNT}</span>
    <button class="qclose" id="qclose" type="button" aria-label="닫기">✕</button></div><div class="qtext">${esc(m.question)}</div>`;
  const listen = `<div class="listen"><button class="btn play" type="button" id="qplay">▶ 듣기</button><button class="btn" type="button" id="qslow">🐢 천천히</button><button class="btn" type="button" id="qretry">↻ 다시</button></div>`;
  const src = `<div class="srcnote" id="srcnote">${sourceBadge()}</div>`;
  switch (m.type){
    case 'order':
      h += `<div class="orderpic">${img(Q.pick)}<span class="tri">${tri(Q.pick)}</span></div>
        <div class="sentence" id="sentence">${Q.tiles.map((_, i) => `<span class="wslot" data-i="${i}">　</span>`).join('')}<span class="wend">。</span></div>
        <div class="tiles">${Q.opts.map((t, i) => `<button class="tile" type="button" data-tile="${esc(t)}" data-ti="${i}"><span class="zhl">${esc(t)}</span></button>`).join('')}</div>
        <div class="row center"><button class="btn ghost" type="button" id="wordClear">다시 놓기</button></div>` + src; break;
    case 'ask':
      h += listen + src + `<div class="choices c3 textopts">${Q.opts.map(o => `<button class="opt" type="button" data-v="${o.i}"><span class="lbl">${esc(o.text)}</span></button>`).join('')}</div>`; break;
    case 'pickWord':
      h += `<div class="note-card">${img(m.photo)}</div>
        <div class="choices c3 textopts">${Q.opts.map(id => `<div class="topt"><button class="opt tri" type="button" data-v="${id}">${tri(id)}</button><button class="mini-listen" type="button" data-say="${id}">▶ 듣기</button></div>`).join('')}</div>` + src; break;
    case 'hearPhoto':
      h += listen + src + `<div class="choices c3 photos">${Q.opts.map(id => `<button class="opt photo" type="button" data-v="${id}">${img(id)}<span class="tri">${tri(id)}</span></button>`).join('')}</div>`; break;
    case 'verb':
      h += `<div class="orderpic">${img(m.photo)}</div>
        <div class="sentence fill"><span class="zhl">${esc(m.sentence[0])}</span><span class="wslot big" id="vslot">？</span><span class="zhl">${esc(m.sentence[1])}</span></div>
        <div class="choices c2 verbs">${Q.opts.map(o => `<button class="opt" type="button" data-v="${o.i}"><span class="lbl zhl">${esc(o.text)}</span><span class="tri"><span class="py">${esc(o.sub)}</span><span class="kr">${esc(o.kr)}</span></span></button>`).join('')}</div>` + src; break;
    case 'situation':
      h += `<div class="situ"><span class="tummy">😋</span><span>꼬르륵~</span>${img(Q.pick || 'jiaozi', 'situimg')}</div>
        <div class="choices c2 textopts sents">${Q.opts.map((o, i) => `<div class="topt"><button class="opt tri" type="button" data-v="${i}">${triS(SOUNDS[o.sid].text, SOUNDS[o.sid].pinyin, SOUNDS[o.sid].kr)}</button><button class="mini-listen" type="button" data-say="${o.sid}">▶ 듣기</button></div>`).join('')}</div>` + src; break;
  }
  h += `<div class="feedback" id="feedback" aria-live="polite"></div><div id="hintArea"></div>`;
  box.innerHTML = h;
  $('#qclose').onclick = () => closeQuiz();
  const qp = $('#qplay');
  if (qp){ qp.onclick = () => playMain(false); $('#qslow').onclick = () => playMain(true); $('#qretry').onclick = () => { Snd.retry(); playMain(false); }; }
  box.querySelectorAll('[data-say]').forEach(b => b.onclick = () => Snd.say(b.dataset.say).then(updateSrc).catch(showPlayError));
  box.querySelectorAll('.opt[data-v]').forEach(b => b.onclick = () => {
    const v = b.dataset.v; let ok, val;
    if (m.type === 'ask'){ ok = !!m.options[+v].correct; val = m.options[+v].text; }
    else if (m.type === 'verb'){ ok = !!m.options[+v].correct; val = m.options[+v].text; if (ok) $('#vslot').textContent = m.options[+v].text; }
    else if (m.type === 'situation'){ const o = Q.opts[+v]; ok = !!o.correct; val = SOUNDS[o.sid].text; }
    else { ok = v === m.answer; val = WORDS[v].text; }
    submit(val, ok, b);
  });
  if (m.type === 'order'){
    const paint = () => { box.querySelectorAll('.wslot').forEach((sl, i) => { sl.textContent = Q.build[i] ? Q.build[i].t : '　'; sl.classList.toggle('on', !!Q.build[i]); });
      box.querySelectorAll('.tile').forEach(b => b.disabled = Q.build.some(x => x.i === b.dataset.ti)); };
    box.querySelectorAll('.tile').forEach(b => b.onclick = () => {
      if (Q.locked || Q.build.length >= Q.tiles.length) return;
      Q.build.push({ t: b.dataset.tile, i: b.dataset.ti }); Snd.sfx.place(); paint();
      if (Q.build.length === Q.tiles.length){
        const v = Q.build.map(x => x.t).join('|'), ok = v === Q.answer;
        submit(Q.build.map(x => x.t).join(' '), ok, $('#sentence'), { keepEl: true });
        if (ok) $('#sentence').classList.add('done');
        else { $('#sentence').classList.add('shake'); setTimeout(() => { if (!Q) return; $('#sentence').classList.remove('shake'); Q.build = []; paint(); }, 800); }
      }
    });
    $('#wordClear').onclick = () => { if (!Q.locked){ Q.build = []; paint(); } };
  }
}
function submit(v, correct, el, opt = {}){
  if (!Q || Q.locked || !el) return;
  if (!opt.keepEl && el.classList.contains('wrong')) return;
  Snd.ensure();
  const { m, rec } = Q;
  if (!rec.done){
    rec.tries += 1;
    if (rec.first === null){ rec.first = String(v); rec.firstCorrect = correct; }
    if (!correct) rec.wrongs.push(String(v));
    persist();
  }
  if (correct){
    Q.locked = true; if (!opt.keepEl) el.classList.add('right');
    const pts = rec.wrongs.length === 0 ? D.points.firstTry : D.points.retry;
    if (!rec.done){ rec.points = pts; rec.done = true; rec.doneAt = Date.now(); S.learn += pts; persist(true); setTimeout(() => addCoins(rec.wrongs.length === 0 ? D.coins.quiz : D.coins.quizRetry, '정답!'), 200); }
    Snd.sfx.correct(); setTimeout(Snd.sfx.bell, 300);
    const fb = $('#feedback'); fb.className = 'feedback good'; fb.textContent = `정답! 학습 점수 +${pts}`;
    burst(pts);
    const after = m.type === 'order' ? 'like_' + Q.pick : m.type === 'situation' ? 'chi_' + (Q.pick || 'jiaozi') : m.type === 'verb' ? 'like_tizuqiu' : m.type === 'pickWord' && m.room === 'study' ? 'like_' + m.answer : null;
    if (after) setTimeout(() => Snd.say(after).catch(() => {}), 350);
    setTimeout(() => {
      closeQuiz(true); renderHud();
      if (m.room === 'mom') momReveal();
      else if (curRoom != null) renderNextStep(ROOMS[curRoom]);
    }, after ? 2000 : 1500);
  } else {
    if (!opt.keepEl) el.classList.add('wrong');
    Snd.sfx.wrong();
    const fb = $('#feedback'); fb.className = 'feedback bad'; fb.textContent = '아깝다! 힌트를 보고 다시 해 봐요.';
    $('#hintArea').innerHTML = `<div class="hint"><span>💡</span><div><b>힌트</b> ${esc(m.hint)}</div></div>`;
  }
}
function burst(pts){
  const st = $('#stars'); if (!st) return;
  for (let i = 0; i < 18; i++){ const s = document.createElement('i'), a = Math.random()*Math.PI*2, r = 90 + Math.random()*120;
    s.style.left = '50%'; s.style.top = '45%'; s.style.setProperty('--dx', Math.cos(a)*r + 'px'); s.style.setProperty('--dy', Math.sin(a)*r + 'px'); st.appendChild(s); }
  if (pts > 0){ const p = document.createElement('div'); p.className = 'plus'; p.textContent = '+' + pts; st.appendChild(p); }
}
function closeQuiz(solved){
  const m = Q && Q.m;
  if (Q && !Q.rec.done && solved !== true) toast(m && m.room === 'mom' ? '엄마 판다가 기다려요! 집 지도에서 다시 맞혀 봐요.' : '아래 버튼을 누르면 다시 풀 수 있어요.', 2600);
  $('#quiz').hidden = true; quizOpen = false; Q = null;
  if (m && m.room === 'mom' && solved !== true && !$('#house').hidden) setTimeout(() => { if (!quizOpen) momEvent(); }, 2600);
}
$('#quiz').addEventListener('click', e => { if (e.target.id === 'quiz' && Q) closeQuiz(); });

/* ================= 점수판 ================= */
function renderHud(){
  $('#learnScore').textContent = S.learn; $('#starScore').textContent = S.starPts; $('#coinScore').textContent = S.coins || 0;
  $('#bells').innerHTML = PICK_SLOTS.map(p => `<i class="bw ${S.picks[p.id] ? 'on' : ''}" title="${esc(p.cat)}">💖</i>`).join('');
  $('#zoneName').textContent = curRoom == null ? `고른 취향 ${Object.keys(S.picks).length}/${PICK_SLOTS.length}` : `${ROOMS[curRoom].name} · ${ROOMS[curRoom].cat}`;
  $('#total').textContent = `${doneCount()}/${QUESTION_COUNT}`;
  $('#who').textContent = `${S.name} #${S.tag}`;
}
const NET_TEXT = { online: ['on', '선생님께 연결됨'], connecting: ['wait', '연결 중…'], offline: ['wait', '인터넷이 끊겼어요. 다시 연결되면 자동으로 보내요'], error: ['bad', '연결 오류 (결과는 이 기기에 저장돼요)'], off: ['off', '이 기기에만 저장 중'] };
Net.onStatus(st => { const el = $('#netDot'); if (!el) return; const v = NET_TEXT[st] || NET_TEXT.off; el.className = 'netdot ' + v[0]; el.title = v[1]; el.setAttribute('aria-label', v[1]); });

/* ================= 반 순위표 ================= */
const SHOW_RANK = window.SHOW_RANKING !== false;
function rankRows(list){
  if (!list) return `<p class="note center">${Net.enabled ? '순위를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.' : '선생님이 온라인 저장을 켜면 반 친구들의 순위가 보여요.'}</p>
    ${S ? `<ol class="ranklist"><li class="me"><span class="rk">-</span><span class="nm">${esc(S.name)} #${esc(S.tag)} (나)</span><span class="sc">${S.learn + S.starPts}</span></li></ol>` : ''}`;
  if (!list.length) return '<p class="note center">아직 아무도 없어요. 첫 번째 손님이 되어 보세요!</p>';
  let rank = 0, prev = null;
  const uid = Net.uid();
  return `<ol class="ranklist">${list.map((r, i) => { if (r.total !== prev){ rank = i + 1; prev = r.total; }
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    return `<li class="${r.id === uid ? 'me' : ''}"><span class="rk">${medal}</span><span class="nm">${esc(r.name || '?')} #${esc(r.tag || '')}${r.id === uid ? ' (나)' : ''}${r.finished ? ' 💖' : ''}</span><span class="pr">❓${r.bells || 0}</span><span class="sc">${r.total || 0}</span></li>`; }).join('')}</ol>`;
}
let rankUnsub = null, endRankUnsub = null;
function openRanking(){
  $('#rankPanel').hidden = false; $('#rankList').innerHTML = '<p class="note center">불러오는 중…</p>';
  if (rankUnsub) rankUnsub();
  rankUnsub = Net.watchBoard(list => { $('#rankList').innerHTML = rankRows(list); });
}
function closeRanking(){ $('#rankPanel').hidden = true; if (rankUnsub){ rankUnsub(); rankUnsub = null; } }

/* ================= 화면 흐름 ================= */
function show(id){ ['#startScreen','#storyScreen','#play','#endScreen'].forEach(s => $(s).hidden = s !== id); }
const cleanName = v => v.replace(/[<>"'&]/g, '').trim().slice(0, 12);
function fixState(s){ ALL.forEach(m => { if (!s.results[m.id]) s.results[m.id] = emptyRec(); }); s.picks = s.picks || {}; s.rooms = s.rooms || {}; s.order = s.order || []; s.items = s.items || []; s.equip = s.equip || {}; s.votes = s.votes || {}; s.preds = s.preds || {}; s.coins = s.coins || 0; return s; }
function initStart(){
  $('#stageLabel').textContent = `중국어 탐험대 · ${D.stageLabel}`;
  $('#gameTitle').innerHTML = `${esc(D.title)}<small>${esc(D.subtitle)}</small>`;
  $('#heroArt').innerHTML = `<div class="herorow">${img('mao', 'heroimg')}${pandaSVG({ mood:'wow', bow: true, heart: true })}${img('huahua', 'heroimg')}</div>`;
  $('#zoneList').innerHTML = [...ROOMS.map(r => `${r.icon} ${r.name} · ${r.cat}`), '🔔 깜짝 손님', `문제 ${QUESTION_COUNT}개`].map(t => `<span>${esc(t)}</span>`).join('');
  if (!SHOW_RANK) $('#rankBtn').hidden = true;
  const saved = store.load();
  if (saved && saved.name && saved.results){
    $('#resumeBox').hidden = false; $('#newBox').hidden = true;
    $('#resumeBtn').textContent = `이어서 하기 (${saved.name} #${saved.tag})`;
  }
  $('#resumeBtn').onclick = () => { Snd.ensure(); Snd.startBgm(); S = fixState(saved);
    Net.studentStart(D.lessonId).then(() => { persist(true); startTally(); });
    if (S.finished) finishGame(); else enterPlay(); };
  $('#newBtn').onclick = () => { $('#resumeBox').hidden = true; $('#newBox').hidden = false; $('#nameInput').focus(); };
  $('#testBtn').onclick = () => {
    Snd.ensure(); $('#testResult').textContent = '재생 중…';
    Snd.say('nixihuan').then(() => $('#testResult').innerHTML = '들리나요? ' + sourceBadge()).catch(() => $('#testResult').innerHTML = sourceBadge());
  };
  $('#startBtn').onclick = startNew;
  $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') startNew(); });
}
function startNew(){
  const name = cleanName($('#nameInput').value);
  if (!name){ $('#nameInput').focus(); $('#nameInput').placeholder = '이름을 먼저 써 주세요!'; return; }
  Snd.ensure(); Snd.startBgm();
  S = newState(name); persist();
  Net.studentStart(D.lessonId).then(() => { persist(true); startTally(); });
  storyStep = 0; show('#storyScreen'); renderStory();
}
let storyStep = 0;
function renderStory(){
  $('#storyText').textContent = D.story[storyStep];
  $('#storyDots').innerHTML = D.story.map((_, i) => `<b class="${i === storyStep ? 'on' : ''}"></b>`).join('');
  $('#nextBtn').textContent = storyStep === D.story.length - 1 ? '판다네 집에 들어가기!' : '다음';
  $('#storyArt').innerHTML = storyStep === 0 ? `<div class="herorow"><span class="bigico">🏡</span>${pandaSVG({ mood:'wow', bow: true })}</div>`
    : storyStep === 1 ? `<div class="herorow">${img('xiongmao', 'heroimg')}${img('tiyu', 'heroimg')}${img('qingtian', 'heroimg')}</div>`
    : `<div class="herorow">${pandaSVG({ bow: true })}<div class="bubble"><p><b class="zhl">你喜欢什么？</b><br><small>Nǐ xǐhuan shénme? 니 시환 선머?</small></p></div></div>`;
  if (storyStep === 2) Snd.say('nixihuan').catch(() => {});
}
$('#nextBtn').onclick = () => { Snd.sfx.blip(); if (storyStep < D.story.length - 1){ storyStep++; renderStory(); } else enterPlay(); };
$('#skipBtn').onclick = () => enterPlay();
function enterPlay(){
  show('#play');
  const i = ROOMS.findIndex(r => r.id === S.room);
  if (i >= 0){ curRoom = i; $('#house').hidden = true; $('#roomv').hidden = false; renderRoom(); }
  else { renderHouse(); if (!doneCount()) toast('🏠 방을 눌러 들어가요! 순서는 마음대로!', 2800); }
}
function finishGame(){
  if (!S.finished){ S.finished = true; S.finishedAt = Date.now(); }
  S.room = null; persist(true);
  Snd.sfx.fanfare(); show('#endScreen'); hearts(30);
  const first = MISSIONS.filter(m => S.results[m.id].firstCorrect === true).length;
  $('#endArt').innerHTML = `<div class="herorow">${dressed({ mood: 'wow', heart: true })}${pandaSVG({ mood: 'happy', apron: true, bow: true })}</div>`;
  $('#endLearn').textContent = S.learn; $('#endStar').textContent = S.starPts; $('#endTotal').textContent = S.learn + S.starPts;
  $('#endName').textContent = `${S.name} #${S.tag}`;
  $('#endFirst').textContent = `처음에 맞힌 문제 ${first} / ${MISSIONS.length}`;
  $('#profileName').textContent = `${S.name}의 취향 프로필`;
  $('#endZones').innerHTML = PICK_SLOTS.filter(p => S.picks[p.id]).map(p => { const id = S.picks[p.id], s = SOUNDS['like_' + id];
    return `<button type="button" class="prow" data-like="${id}">${img(id)}<span class="pcat">${esc(p.cat)}</span><span class="tri">${triS(s.text, s.pinyin, s.kr)}</span><span class="spk">▶</span></button>`; }).join('') || '<p class="note center">아직 고른 것이 없어요.</p>';
  $('#endZones').querySelectorAll('[data-like]').forEach(b => b.onclick = () => Snd.say('like_' + b.dataset.like).catch(() => {}));
  $('#endBonus').textContent = `예언 성공 ${Object.values(S.preds).filter(p => p && p.ok).length} / ${ROOMS.length} · 옷장 ${S.items.length} / ${GACHA.length} · 남은 코인 🪙 ${S.coins || 0}`;
  renderDex();
  $('#saveStatus').innerHTML = !Net.enabled ? '💾 결과가 이 기기에 저장되었어요.' : Net.status() === 'online' ? '✅ 결과를 선생님께 보냈어요.' : '⏳ 결과를 선생님께 보내는 중이에요. 인터넷이 연결되면 자동으로 보내요.';
  Net.onStatus(s2 => { if ($('#endScreen').hidden || !Net.enabled) return; $('#saveStatus').innerHTML = s2 === 'online' ? '✅ 결과를 선생님께 보냈어요.' : '⏳ 결과를 선생님께 보내는 중이에요. 인터넷이 연결되면 자동으로 보내요.'; });
  $('#endRank').hidden = !SHOW_RANK;
  if (SHOW_RANK){ if (endRankUnsub) endRankUnsub(); setTimeout(() => { endRankUnsub = Net.watchBoard(list => {
    $('#endRankList').innerHTML = rankRows(list ? list.slice(0, 10) : list);
    const uid = Net.uid(), mine = list && list.findIndex(r => r.id === uid);
    $('#myRank').textContent = list && mine >= 0 ? `나는 ${list.length}명 중 ${list.filter(r => r.total > list[mine].total).length + 1}등!` : ''; }); }, 600); }
}
/* 끝난 뒤: 10차시 낱말 도감 (눌러서 "我喜欢○○" 듣기) */
function renderDex(){
  const mine = Object.values(S.picks);
  const rounds = [...ROOMS.map(r => ({ id: r.id, name: r.name, c: r.choices })), { id: 'mom', name: '사람', c: MOM.choices }];
  const classRes = () => rounds.map(r => `<div class="cres"><h4>${esc(r.name)}</h4>${barsHTML(r.id, r.c[0], r.c[1], S.picks[r.id])}</div>`).join('');
  stopTimers();
  $('#speedBox').innerHTML = `<h3 class="center">📊 우리 반 밸런스 게임 결과</h3><div class="classres" id="classRes">${classRes()}</div><button class="btn" type="button" id="endGacha">🎰 남은 코인으로 뽑기 (🪙 ${S.coins || 0})</button><h3 class="center">📖 我喜欢 낱말 도감 <small>${DEX_IDS.length}개</small></h3>
    <p class="note center">친구들을 기다리는 동안 사진을 눌러 들어 봐요. 💖는 내가 고른 것!</p>
    <div class="dex">${DEX_IDS.map(id => `<button type="button" class="dexitem on ${mine.includes(id) ? 'mine' : ''}" data-dex="${id}">${img(id)}<span class="tri">${tri(id)}</span></button>`).join('')}</div>`;
  tallyRender = () => { const cr = $('#classRes'); if (cr) cr.innerHTML = classRes(); }; tallyListeners.push(tallyRender);
  $('#endGacha').onclick = () => { openGacha(); $('#gClose').onclick = () => { $('#evt').hidden = true; finishGame(); }; };
  $('#speedBox').querySelectorAll('[data-dex]').forEach(b => b.onclick = () => Snd.say('like_' + b.dataset.dex).catch(() => {}));
}
$('#byeBtn').onclick = () => Snd.say('zaijian').catch(() => {});

/* ================= 설정·도움말 ================= */
function syncSliders(){
  ['bgm','sfx','voice'].forEach(k => { const id = 'vol' + k[0].toUpperCase() + k.slice(1); $('#' + id).value = prefs[k]; $('#' + id + 'V').textContent = prefs[k]; });
  $('#muteAll').checked = prefs.mute;
  const src = SOURCE_TEXT[Snd.source()];
  $('#voiceSourceNote').textContent = '중국어 소리: ' + (src ? src[0] : '아직 재생 전');
  $('#renameInput').value = S ? S.name : ''; $('#renameMsg').textContent = '';
}
['bgm','sfx','voice'].forEach(k => { const id = 'vol' + k[0].toUpperCase() + k.slice(1);
  $('#' + id).addEventListener('input', e => { prefs[k] = +e.target.value; $('#' + id + 'V').textContent = prefs[k]; Snd.apply(); savePrefs(); }); });
$('#muteAll').addEventListener('change', e => { prefs.mute = e.target.checked; Snd.apply(); savePrefs(); });
$('#soundBtn').onclick = () => { syncSliders(); $('#soundPanel').hidden = false; };
$('#soundClose').onclick = () => $('#soundPanel').hidden = true;
$('#renameBtn').onclick = () => { const n = cleanName($('#renameInput').value); if (!n){ $('#renameMsg').textContent = '이름을 써 주세요.'; return; } S.name = n; persist(); renderHud(); $('#renameMsg').textContent = '저장했어요.'; };
$('#helpBtn').onclick = () => { $('#helpPanel').hidden = false; };
$('#helpClose').onclick = () => $('#helpPanel').hidden = true;
$('#rankBtn').onclick = openRanking;
$('#rankClose').onclick = closeRanking;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ if (quizOpen && Q) closeQuiz(); $('#soundPanel').hidden = true; $('#helpPanel').hidden = true; closeRanking(); }
});

window.__PANDA = { busy: () => busy || quizOpen, state: () => S, missions: MISSIONS, rooms: ROOMS };   // 테스트용 (읽기 전용)
initStart();
})();
