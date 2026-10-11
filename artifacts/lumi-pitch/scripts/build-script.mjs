import fs from 'node:fs';
const entries=JSON.parse(fs.readFileSync('research/narration.json','utf8'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const time=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
let elapsed=0;
const blocks=entries.map(e=>{
 const start=elapsed;elapsed+=e.seconds;
 return `<section><p class="time">${time(start)}–${time(elapsed)} · SLIDE ${e.slide} · ${e.seconds} SECONDS</p><h2>${esc(e.title)}</h2><p>${esc(e.script)}</p></section>`;
}).join('');
fs.writeFileSync('research/speaker-script.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lumi — Two-minute pitch script</title><style>body{background:#faf9f4;color:#2d4059;font:20px/1.7 system-ui;margin:0}main{max-width:870px;margin:auto;padding:55px 28px}h1{font:700 44px/1.15 Georgia}h2{font-size:25px}.time{font-size:14px;letter-spacing:1px;font-weight:700}section{padding:25px 0;border-top:2px solid #e5eef5}.note{background:#f3d982;padding:20px;border-radius:12px}small{font-size:15px}@media print{section{break-inside:avoid}body{background:white}}</style><main><p>LUMI · PRESENTER SCRIPT</p><h1>Two minutes of speech.<br>One minute of product.</h1><p class="note">230 spoken words · 120-second speaking budget · 60-second demo · 3:00 total. Aim for an unhurried delivery; rehearse transitions against a timer. Do not read the source footnotes aloud.</p>${blocks}<section><h2>Video handoff</h2><p>Slide 4 is a labeled placeholder, not an embedded video. Supply a 60-second, 16:9 MP4 with audible speech and English captions. Show fictional demo records, not real child data. Play it after slide 3 and resume at slide 5; keep the MP4 locally available as a fallback.</p><p>Suggested edit: adult context (0–10s), child question and adapted response (10–35s), mode contrast (35–48s), adult observations (48–60s).</p></section><small>Numbers described as scenarios are not forecasts. Early-interest figures are founder-reported. Pricing is proposed.</small></main></html>`);
console.log('Created self-contained speaker-script.html');
