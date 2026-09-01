#!/usr/bin/env node
// QCode - Method — Build Cockpit generator.
//
// Internal tooling: renders a progress diagram colored by LIVE build status, parsed straight from
// the repo's own status docs. Zero dependencies. Run `node cockpit/generate.mjs` (or `npm run
// cockpit`) to (re)build the self-contained `cockpit/index.html`, then open it.
//
// Reads (never duplicates): PROJECT-STATUS.md (epics + Active increments + Needs status review),
// backlog/CLOSED.md (the done index), and each backlog/<epic-dir>/README.md's `## Stories` index.
//
// Two readers of the same board must never disagree about what a status IS or how a table row
// parses — so this file imports its vocabulary from `../scripts/status-vocab.mjs` and its table
// parsers from `../scripts/board-check.mjs` rather than declaring its own copies. That's not
// stylistic: a checker and a renderer that each maintain their own parsing logic are exactly how a
// board cell can pass one reader and fail the other.
//
// By default it renders an EPIC view (one node per epic). To render an ARCHITECTURE-LAYER view
// instead, fill the LAYERS config below (a (to define) gap) mapping each layer to the epics that
// build it — see cockpit instructions in the scaffolder's filling-the-gaps reference.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

import { STATUS_VOCAB, STATUS_ALIAS, resolveStatus } from '../scripts/status-vocab.mjs';
import { tableRows, cells, extractId, parseActive, parseClosed } from '../scripts/board-check.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'cockpit', 'index.html');

// (to define: the architecture-layer view. Leave null for the default epic view. To enable, set to an
// array of { key, title, sub, epics:[<epic numbers>] } describing your layers top→bottom.)
const LAYERS = null;

const stripMd = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').trim();
const fail = (m) => { console.error(`❌ cockpit: ${m}`); process.exit(1); };

// ── Parse PROJECT-STATUS.md ────────────────────────────────────────────────

function parseBoard() {
  const boardPath = join(ROOT, 'PROJECT-STATUS.md');
  if (!existsSync(boardPath)) fail('cannot read PROJECT-STATUS.md');
  const md = readFileSync(boardPath, 'utf8');
  const lines = md.split(/\r?\n/);

  const metaLine = lines.find((l) => /\*\*Updated:\*\*/.test(l)) || '';
  const grab = (label) => {
    const m = metaLine.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^·]+?)\\s*(?:·|$)`));
    return m ? stripMd(m[1]) : '';
  };
  const meta = { updated: grab('Updated'), phase: grab('Phase'), active: grab('Active'), next: grab('Next up') };

  // Epics table: `| # | Epic | Status | Detail |`.
  const epics = {};
  const rowRe = /^\|\s*(\d{2})\s*\|\s*(.+?)\s*\|\s*`?([\w -]+)`?\s*\|\s*(.+?)\s*\|/;
  for (const l of lines) {
    const m = l.match(rowRe);
    if (!m) continue;
    const status = resolveStatus(m[3].toLowerCase());
    if (!STATUS_VOCAB.includes(status)) console.warn(`⚠️  cockpit: epic ${m[1]} unknown status "${m[3]}"`);
    epics[parseInt(m[1], 10)] = { num: parseInt(m[1], 10), name: stripMd(m[2]), status };
  }
  if (!Object.keys(epics).length) fail('parsed 0 epics — the Epics table format may have changed.');

  // Active increments — the same parser board-check.mjs uses, so the two can never disagree about
  // what a row means. Status is alias-resolved the same way.
  const active = parseActive(md);
  const storyStatus = {};
  for (const a of active) {
    if (!a.id) continue;
    storyStatus[a.id] = resolveStatus(a.status);
  }

  // Needs status review — flagged ids, layered on top of (not replacing) their normal status. A
  // fresh scaffold's section is bare prose ("None yet"), so `tableRows` correctly returns nothing
  // to flag rather than erroring — this section has no required table shape, it's a human/AI
  // maintained to-do list, not a machine-verified one.
  const flagged = new Set();
  for (const row of tableRows(md, '## Needs status review')) {
    const id = extractId(cells(row)[0] || '');
    if (id) flagged.add(id);
  }

  return { meta, epics, storyStatus, flagged };
}

// ── The closed-work index ──────────────────────────────────────────────────
//
// Absence is fatal (every scaffolded project has this file — a missing one is a real error, not a
// fresh-project state); PRESENCE with zero data rows is valid and common (a fresh project has
// shipped nothing yet). These are different conditions and must be checked separately — conflating
// "empty" with "missing" would either crash a healthy new scaffold or silently accept a genuinely
// broken one.
function parseClosedIndex() {
  const closedPath = join(ROOT, 'backlog', 'CLOSED.md');
  if (!existsSync(closedPath)) fail(`cannot read backlog/CLOSED.md — the closed-work index`);
  const closed = parseClosed(readFileSync(closedPath, 'utf8'));
  const doneIds = new Set(closed.flatMap((r) => r.ids));
  return { closed, doneIds };
}

// ── Parse the backlog: one directory per epic, a README `## Stories` index per epic ───────────
//
// A story's id/title come from its epic README's index row — the same structural source
// board-check.mjs's rule 2 already treats as authoritative — never from reading every story file
// individually (that's the per-epic-file read tax the directory shape exists to avoid).

function parseBacklog() {
  const backlogDir = join(ROOT, 'backlog');
  const byEpic = {}, titles = {};
  if (!existsSync(backlogDir)) return { byEpic, titles };

  for (const dirName of readdirSync(backlogDir)) {
    const abs = join(backlogDir, dirName);
    if (!statSync(abs).isDirectory()) continue;
    const readmePath = join(abs, 'README.md');
    if (!existsSync(readmePath)) continue;

    const md = readFileSync(readmePath, 'utf8');
    const h1 = md.split(/\r?\n/).find((l) => /^#\s+(Epic\s+)?\d{2}\b/.test(l));
    if (!h1) continue;
    const m = h1.match(/^#\s+(?:Epic\s+)?(\d{2})\S*\s*[—-]\s*(.+?)\s*$/);
    if (!m) continue;
    const epicNum = parseInt(m[1], 10);
    titles[epicNum] = stripMd(m[2]);

    const stories = [];
    for (const row of tableRows(md, '## Stories')) {
      const c = cells(row);
      const linkMatch = /\[([^\]]+)\]\(/.exec(c[0] || '');
      if (!linkMatch) continue;
      stories.push({ id: linkMatch[1].trim(), title: stripMd(c[1] || '') });
    }
    byEpic[epicNum] = stories;
  }
  return { byEpic, titles };
}

// ── Roll up a set of epics into one node's status/progress ────────────────

function rollup(epicNums, epics, byEpic, storyStatus, doneIds) {
  const statuses = epicNums.map((n) => epics[n]?.status).filter(Boolean);
  let total = 0, done = 0;
  for (const n of epicNums) {
    for (const s of byEpic[n] || []) {
      total++;
      if (doneIds.has(s.id) || storyStatus[s.id] === 'done') done++;
    }
  }
  let status;
  if (statuses.length && statuses.every((s) => s === 'done')) status = 'done';
  else if (statuses.some((s) => s === 'in-progress' || s === 'in-qa' || s === 'raised') || done > 0) status = 'in-progress';
  else if (statuses.some((s) => s === 'blocked')) status = 'blocked';
  else if (statuses.length && statuses.every((s) => s === 'deferred')) status = 'deferred';
  else status = 'planned';
  return { status, progress: total ? done / total : 0, total, done };
}

// ── Build the render model ─────────────────────────────────────────────────

function build() {
  const { meta, epics, storyStatus, flagged } = parseBoard();
  const { doneIds } = parseClosedIndex();
  const { byEpic, titles } = parseBacklog();

  const epicDetail = (n) => ({
    num: n,
    name: epics[n]?.name || titles[n] || `Epic ${String(n).padStart(2, '0')}`,
    status: epics[n]?.status || 'planned',
    stories: (byEpic[n] || []).map((s) => {
      const done = doneIds.has(s.id);
      const status = done ? 'done' : storyStatus[s.id] || epics[n]?.status || 'planned';
      return { ...s, status, flagged: flagged.has(s.id) };
    }),
  });

  let nodes;
  if (Array.isArray(LAYERS) && LAYERS.length) {
    nodes = LAYERS.map((d) => ({
      ...d,
      ...rollup(d.epics, epics, byEpic, storyStatus, doneIds),
      epicsDetail: d.epics.map(epicDetail),
    }));
  } else {
    nodes = Object.values(epics)
      .sort((a, b) => a.num - b.num)
      .map((e) => {
        const r = rollup([e.num], epics, byEpic, storyStatus, doneIds);
        return {
          key: `epic-${e.num}`,
          title: `Epic ${String(e.num).padStart(2, '0')} — ${e.name}`,
          sub: '',
          epics: [e.num],
          ...r,
          epicsDetail: [epicDetail(e.num)],
        };
      });
  }

  let git = 'no-git';
  try { git = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}

  return {
    meta,
    generatedAt: new Date().toISOString(),
    git,
    mode: Array.isArray(LAYERS) && LAYERS.length ? 'layers' : 'epics',
    flaggedCount: flagged.size,
    nodes,
  };
}

// ── Render ──────────────────────────────────────────────────────────────────

function render(model) {
  const data = JSON.stringify(model).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>QCode - Method — Build Cockpit</title>
<style>
:root{--bg:#0d1117;--panel:#161b22;--panel2:#1c2230;--border:#30363d;--text:#e6edf3;--muted:#8b949e;
--raised:#58a6ff;--planned:#6e7681;--in-progress:#d29922;--in-qa:#a371f7;--done:#2ea043;--blocked:#f85149;--deferred:#484f58;--seam:#1f6feb;--flag:#f85149}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif}
.wrap{max-width:940px;margin:0 auto;padding:32px 20px 80px}header h1{margin:0 0 4px;font-size:24px}
.meta{color:var(--muted);font-size:13px}.meta b{color:var(--text)}.meta .warn{color:var(--flag);font-weight:600}
.legend{display:flex;flex-wrap:wrap;gap:14px;margin:18px 0 24px;font-size:12px;color:var(--muted)}
.legend span{display:inline-flex;align-items:center;gap:6px}.dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.flow{display:flex;flex-direction:column;gap:0}.arrow{text-align:center;color:var(--muted);height:22px;line-height:22px}
.layer{background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer}
.layer:hover,.layer.open{border-color:var(--seam)}.layer.seam{border-style:dashed;background:#11182a}
.row{display:flex}.stripe{width:6px;flex:0 0 6px}.body{padding:12px 16px;flex:1;min-width:0}
.titleline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.titleline h3{margin:0;font-size:16px}
.badge{font-size:11px;padding:2px 8px;border-radius:999px;font-weight:600;color:#0d1117}
.sub{color:var(--muted);font-size:13px;margin-top:3px}
.bar{height:5px;background:#0d1117;border-radius:3px;margin-top:10px;overflow:hidden;flex:1}.bar>i{display:block;height:100%;background:var(--done)}
.pct{font-size:11px;color:var(--muted);margin-left:8px}
.detail{display:none;padding:0 16px 14px 22px;border-top:1px solid var(--border);background:var(--panel2)}
.layer.open .detail{display:block}.epicblock{margin-top:12px}.epicblock h4{margin:0 0 6px;font-size:13px;display:flex;align-items:center;gap:8px}
.stories{list-style:none;margin:0;padding:0}.stories li{display:flex;align-items:center;gap:8px;font-size:13px;padding:2px 0;color:var(--muted)}
.stories li.flagged{color:var(--flag)}.stories .id{color:var(--text);font-size:12px;min-width:38px}
.stories .flagmark{color:var(--flag);font-weight:700}footer{margin-top:28px;color:var(--muted);font-size:12px;text-align:center}
</style></head><body><div class="wrap">
<header><h1>QCode - Method — Build Cockpit</h1><div class="meta" id="meta"></div></header>
<div class="legend" id="legend"></div><div class="flow" id="flow"></div><footer id="footer"></footer></div>
<script>
var MODEL=${data};
var LABELS={'raised':'raised','planned':'planned','in-progress':'in progress','in-qa':'in QA','done':'done','blocked':'blocked','deferred':'deferred'};
var COLORS={'raised':'var(--raised)','planned':'var(--planned)','in-progress':'var(--in-progress)','in-qa':'var(--in-qa)','done':'var(--done)','blocked':'var(--blocked)','deferred':'var(--deferred)'};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
function color(s){return COLORS[s]||'var(--planned)'}
function meta(){var m=MODEL.meta,warn=MODEL.flaggedCount?' · <span class="warn">'+MODEL.flaggedCount+' need status review</span>':'';document.getElementById('meta').innerHTML='Updated <b>'+(m.updated||'?')+'</b> · Phase <b>'+(m.phase||'?')+'</b> · Active <b>'+(m.active||'?')+'</b> · Next <b>'+(m.next||'?')+'</b>'+warn+'<br>Repo at <b>'+MODEL.git+'</b> · '+MODEL.mode+' view · generated '+new Date(MODEL.generatedAt).toLocaleString()}
function legend(){var o=['done','in-progress','in-qa','raised','planned','blocked','deferred'],b=document.getElementById('legend');o.forEach(function(s){var sp=el('span');sp.appendChild(el('i','dot'));sp.lastChild.style.background=color(s);sp.appendChild(document.createTextNode(LABELS[s]));b.appendChild(sp)});var f=el('span');f.innerHTML='<b style="color:var(--flag)">▲</b> needs status review';b.appendChild(f)}
function detail(n){var d=el('div','detail');n.epicsDetail.forEach(function(ep){var blk=el('div','epicblock'),h=el('h4'),b=el('span','badge');b.textContent=LABELS[ep.status];b.style.background=color(ep.status);h.appendChild(b);h.appendChild(document.createTextNode('Epic '+String(ep.num).padStart(2,'0')+' — '+ep.name));blk.appendChild(h);var ul=el('ul','stories');ep.stories.forEach(function(st){var li=el('li'+(st.flagged?' flagged':'')),dot=el('i','dot');dot.style.background=color(st.status);li.appendChild(dot);var id=el('span','id');id.textContent=st.id;li.appendChild(id);li.appendChild(document.createTextNode(st.title));if(st.flagged){var fm=el('span','flagmark',' ▲ verify');li.appendChild(fm)}ul.appendChild(li)});if(!ep.stories.length)ul.appendChild(el('li',null,'<i>no stories listed</i>'));blk.appendChild(ul);d.appendChild(blk)});return d}
function card(n){var c=el('div','layer'+(n.seam?' seam':'')),row=el('div','row'),stripe=el('div','stripe');stripe.style.background=color(n.status);row.appendChild(stripe);var body=el('div','body'),tl=el('div','titleline');tl.appendChild(el('h3',null,n.title));var b=el('span','badge');b.textContent=LABELS[n.status];b.style.background=color(n.status);tl.appendChild(b);body.appendChild(tl);if(n.sub)body.appendChild(el('div','sub',n.sub));if(n.total){var holder=el('div');holder.style.display='flex';holder.style.alignItems='center';var bar=el('div','bar'),fill=el('i');fill.style.width=Math.round(n.progress*100)+'%';bar.appendChild(fill);holder.appendChild(bar);holder.appendChild(el('span','pct',n.done+'/'+n.total+' stories'));body.appendChild(holder)}row.appendChild(body);c.appendChild(row);c.appendChild(detail(n));c.addEventListener('click',function(){c.classList.toggle('open')});return c}
function run(){meta();legend();var flow=document.getElementById('flow');MODEL.nodes.forEach(function(n,i){flow.appendChild(card(n));if(i<MODEL.nodes.length-1)flow.appendChild(el('div','arrow','\\u25bc'))});document.getElementById('footer').innerHTML='Generated from PROJECT-STATUS.md + backlog/ · re-run <b>node cockpit/generate.mjs</b> to refresh · click any node for its stories'}
run();
</script></body></html>`;
}

const model = build();
writeFileSync(OUT, render(model));
console.log(`✅ cockpit: wrote ${OUT}`);
console.log(`   ${model.nodes.length} ${model.mode} · repo @ ${model.git} · status updated ${model.meta.updated || '?'}${model.flaggedCount ? ` · ⚠ ${model.flaggedCount} need status review` : ''}`);
