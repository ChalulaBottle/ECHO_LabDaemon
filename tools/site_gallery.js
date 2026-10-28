#!/usr/bin/env node
// Writes the creatures gallery on docs/index.html from the bench itself, so the site shows every animation
// the bench defines instead of a hand kept subset. Run from the repo root after the bench, the GIFs or the
// firmware table change:
//
//   node tools/site_gallery.js [--flashed <rev>] [--next <rev>] [--check]
//
// Sources: docs/bench/anims*.js (every animation, key and lattice), tools/echo_anims/_index.json (firmware
// name and category), tools/site_gallery_captions.json (the one plain caption and alt text per key, the only
// hand written part), firmware/src/splash_animations.h at --next <rev> (the table the next flash carries; default the
// NEXT_REV below, since this branch is the site and the firmware moves on release branches) and the same file
// at --flashed <rev> (the table on the board now; default the FLASHED_REV below). The block between the
// gallery:start and gallery:end markers is replaced; nothing else on the page is touched.
//
// State per tile: on device (in the flashed table), next flash (in the current table only), retired (no
// longer in either table, kept for the record). The stock reference animation is left off: it is not ours.
// --check prints the counts and every key with no GIF or no caption and writes nothing.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BENCH_DIR = path.join(ROOT, 'docs', 'bench');
const PAGE = path.join(ROOT, 'docs', 'index.html');
const CAPTIONS = path.join(__dirname, 'site_gallery_captions.json');
// The firmware table that was last flashed to the 4 inch board (2026-10-01). Move it on after every flash.
const FLASHED_REV = '11e2bc2';
// The branch whose firmware table the next flash carries.
const NEXT_REV = 'release/increment-4';
const LEAVE_OFF = new Set(['idle_blink']);

const args = process.argv.slice(2);
const check = args.includes('--check');
const opt = (name, dflt) => args.includes(name) ? args[args.indexOf(name) + 1] : dflt;
const flashedRev = opt('--flashed', FLASHED_REV);
const nextRev = opt('--next', NEXT_REV);

const BENCH = require(path.join(BENCH_DIR, 'anims.js'));
for (const f of fs.readdirSync(BENCH_DIR).filter(n => /^anims_.*\.js$/.test(n)).sort()) require(path.join(BENCH_DIR, f));
// Two groups come from the file prefix, not the category: the culture files (paintings, memes, formats) and
// the lab files (CTF life, the lab's hardware, the season). The mood files keep their own category (Idle).
const keysIn = prefix => {
  const keys = new Set();
  for (const f of fs.readdirSync(BENCH_DIR).filter(n => n.startsWith(prefix) && n.endsWith('.js'))) {
    for (const m of fs.readFileSync(path.join(BENCH_DIR, f), 'utf8').matchAll(/key:\s*'([a-z0-9_]+)'/g)) keys.add(m[1]);
  }
  return keys;
};
const culture = keysIn('anims_culture_');
const lab = keysIn('anims_lab_');

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'echo_anims', '_index.json'), 'utf8'));
const meta = new Map(index.map(e => [e.filename.replace(/\.html$/, ''), e]));
const tableNames = src => new Set([...src.matchAll(/\{"([a-z0-9 ]+)"/g)].map(m => m[1]));
const tableAt = rev => tableNames(execFileSync('git', ['show', `${rev}:firmware/src/splash_animations.h`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }));
const nextTable = tableAt(nextRev);
const flashedTable = tableAt(flashedRev);
const captions = JSON.parse(fs.readFileSync(CAPTIONS, 'utf8'));

const gifFor = key => {
  const anims = path.join(ROOT, 'docs', 'media', 'anims', `${key}.gif`);
  if (fs.existsSync(anims)) return `media/anims/${key}.gif`;
  const short = key.replace(/^echo_/, '');
  if (fs.existsSync(path.join(ROOT, 'docs', 'media', 'culture', `${short}.gif`))) return `media/culture/${short}.gif`;
  return null;
};

const GROUPS = [
  ['Idle', 'Idle', 'What the splash plays while nothing is happening.'],
  ['Active', 'Active', 'Working, dancing and the busy states.'],
  ['Thinking', 'Thinking', 'While the model is thinking.'],
  ['Mode', 'Modes and moments', 'Played once or held while a mode is on: ultracode, agents, Opus, the boot build, the limits.'],
  ['Model', 'Model tiers', 'One family, four signatures: the creature the desk shows while each model tier is in use.'],
  ['Culture', 'Culture', 'The ECHO creature in famous paintings, memes and pop culture moments. Public domain works are credited by maker, title and date; everything else lends its format only, and the creature plays every role.'],
  ['Lab', 'Lab, CTF and the season', 'The creature at work in the lab and on the range: a flag captured, a packet caught, a hash cracked, a terminal glow, a rack, a fan, a chat ping, and October.'],
  ['Retired', 'Retired', 'Earlier versions that left the firmware table on 28 and 29 September 2026, when every creature was redrawn from scratch. Kept here for the record.'],
];

const rows = [];
const problems = [];
for (const a of BENCH.anims) {
  if (LEAVE_OFF.has(a.key)) continue;
  const m = meta.get(a.key);
  const fw = m ? m.name : a.key.replace(/_/g, ' ');
  const state = flashedTable.has(fw) ? 'On device' : nextTable.has(fw) ? 'Next flash' : 'Retired';
  const group = state === 'Retired' ? 'Retired' : culture.has(a.key) ? 'Culture' : lab.has(a.key) ? 'Lab' : (m ? m.category : 'Active');
  const gif = gifFor(a.key);
  const cap = captions[a.key];
  if (!gif) problems.push(`${a.key}: no GIF`);
  if (!cap) problems.push(`${a.key}: no caption in ${path.basename(CAPTIONS)}`);
  rows.push({ key: a.key, fw, state, group, gif, cap, big: a.tier === 'big' });
}

const counts = {};
for (const r of rows) counts[r.state] = (counts[r.state] || 0) + 1;
console.log(`${rows.length} animations: ${Object.entries(counts).map(([s, n]) => `${n} ${s.toLowerCase()}`).join(', ')}`);
if (problems.length) { console.log(problems.join('\n')); process.exitCode = 1; }
if (check || problems.length) process.exit();

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tile = r => `      <figure class="media" style="margin:0"><img src="${r.gif}" width="240" height="240" loading="lazy" alt="${esc(r.cap[1])}"><figcaption>${esc(r.fw)}<span class="state">${r.state}</span>${r.big ? '<span class="state">4 inch</span>' : ''}<br>${esc(r.cap[0])}</figcaption></figure>`;

const out = ['<!-- gallery:start, written by tools/site_gallery.js; edit captions in tools/site_gallery_captions.json, not here -->'];
const onDevice = counts['On device'] || 0, next = counts['Next flash'] || 0;
out.push(`    <p class="muted" style="max-width:70ch">Every animation drawn for the ECHO edition, ${rows.length} in all, grouped by when the splash plays them. ${onDevice} are on the board now and ${next} more ride the next flash. Tiles marked 4 inch are the big tier, drawn on a 60 cell lattice, which only the 4 inch board has the flash for. The GIFs loop at the real holds.</p>`);
for (const [cat, title, blurb] of GROUPS) {
  const g = rows.filter(r => r.group === cat);
  if (!g.length) continue;
  out.push(`    <h3 style="font-weight:400;margin:34px 0 6px">${title} <span class="muted">(${g.length})</span></h3>`);
  out.push(`    <p class="muted" style="max-width:70ch;margin:0 0 14px">${esc(blurb)}</p>`);
  if (cat === 'Model') {
    out.push('    <figure class="media" style="margin:0 0 14px">');
    out.push('      <img src="media/sheets/model-tiers.png" width="1010" height="310" loading="lazy" alt="Four ECHO creatures side by side: Haiku smaller with a light visor, Sonnet with a second visor line, Opus brighter with a flash visor, Fable with amber antenna tip and ear and sideways eyes" style="image-rendering:pixelated">');
    out.push('    </figure>');
  }
  out.push(`    <div class="tiles"${cat === 'Idle' ? ' id="creatures"' : ''}>`);
  out.push(...g.map(tile));
  out.push('    </div>');
}
out.push('    <!-- gallery:end -->');

let page = fs.readFileSync(PAGE, 'utf8');
const start = page.indexOf('<!-- gallery:start');
const end = page.indexOf('<!-- gallery:end -->');
if (start < 0 || end < 0) throw new Error('gallery markers not found on docs/index.html');
page = page.slice(0, start) + out.join('\n').replace(/^\s+/, '') + page.slice(end + '<!-- gallery:end -->'.length);
fs.writeFileSync(PAGE, page);
console.log(`wrote ${rows.length} tiles in ${GROUPS.filter(([c]) => rows.some(r => r.group === c)).length} groups`);
