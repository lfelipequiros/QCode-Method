#!/usr/bin/env node
// {{PROJECT_NAME}} — Build Cockpit generator.
//
// Internal tooling: renders a progress diagram colored by LIVE build status, parsed straight from
// the repo's own status docs. Zero dependencies. Run `node cockpit/generate.mjs` (or `npm run
// cockpit`) to (re)build the self-contained `cockpit/index.html`, then open it.
//
// Reads (never duplicates): PROJECT-STATUS.md (epic statuses + Active/Recently-done) and
// backlog/epic-*.md (stories per epic).
//
// By default it renders an EPIC view (one node per epic). To render an ARCHITECTURE-LAYER view
// instead, fill the LAYERS config below (a (to define) gap) mapping each layer to the epics that
// build it — see cockpit instructions in the scaffolder's filling-the-gaps reference.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'cockpit', 'index.html');
const STATUS_VOCAB = ['planned', 'in-progress', 'in-qa', 'done', 'blocked', 'deferred'];

// (to define: the architecture-layer view. Leave null for the default epic view. To enable, set to an
// array of { key, title, sub, epics:[<epic numbers>] } describing your layers top→bottom.)
const LAYERS = null;

const stripMd = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').trim();
const fail = (m) => { console.error(`❌ cockpit: ${m}`); process.exit(1); };

function parseStatus() {
  let md;
  try { md = readFileSync(join(ROOT, 'PROJECT-STATUS.md'), 'utf8'); } catch { fail('cannot read PROJECT-STATUS.md'); }
  const lines = md.split(/\r?\n/);
  const metaLine = lines.find((l) => /\*\*Updated:\*\*/.test(l)) || '';
  const grab = (label) => {
    const m = metaLine.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^·]+?)\\s*(?:·|$)`));
    return m ? stripMd(m[1]) : '';
  };
  const meta = { updated: grab('Updated'), phase: grab('Phase'), next: grab('Next up') };

  const epics = {};
  const rowRe = /^\|\s*(\d{2})\s*\|\s*(.+?)\s*\|\s*`?([\w-]+)`?\s*\|\s*(.+?)\s*\|/;
  for (const l of lines) {
    const m = l.match(rowRe);
    if (!m) continue;
    const status = m[3].toLowerCase();
    if (!STATUS_VOCAB.includes(status)) console.warn(`⚠️  cockpit: epic ${m[1]} unknown status "${status}"`);
    epics[parseInt(m[1], 10)] = { num: parseInt(m[1], 10), name: stripMd(m[2]), status };
  }
  if (!Object.keys(epics).length) fail('parsed 0 epics — the Epics table format may have changed.');

  const storyStatus = {};
  const section = (start) => {
    const i = lines.findIndex((l) => l.trim().startsWith(start));
    if (i === -1) return [];
    const rest = lines.slice(i + 1);
    const end = rest.findIndex((l) => /^##\s/.test(l));
    return end === -1 ? rest : rest.slice(0, end);
  };
  for (const l of section('## Active increments')) {
    const ids = l.match(/\b(\d{2}\.\d+)\b/g);
    if (ids) for (const id of ids) storyStatus[id] = /in[- ]?qa|\bqa\b/i.test(l) ? 'in-qa' : 'in-progress';
  }
  for (const l of section('## Recently done')) {
    const ids = l.match(/\b(\d{2}\.\d+)\b/g);
    if (ids) for (const id of ids) storyStatus[id] = 'done';
  }
  return { meta, epics, storyStatus };
}

function parseStories() {
  const dir = join(ROOT, 'backlog');
  const byEpic = {}, titles = {};
  for (const f of readdirSync(dir).filter((f) => /^epic-\d{2}-.*\.md$/.test(f))) {
    const lines = readFileSync(join(dir, f), 'utf8').split(/\r?\n/);
    const h1 = lines.find((l) => /^# Epic \d{2}/.test(l));
    if (h1) { const m = h1.match(/^# Epic (\d{2})\s+[—-]\s+(.+)$/); if (m) titles[parseInt(m[1], 10)] = stripMd(m[2]); }
    for (const l of lines) {
      const m = l.match(/^###\s+(\d{2})\.(\d+)\s+[—-]\s+(.+)$/);
      if (m) (byEpic[parseInt(m[1], 10)] ||= []).push({ id: `${m[1]}.${m[2]}`, title: stripMd(m[3]) });
    }
  }
  return { byEpic, titles };
}

function rollup(epicNums, epics, byEpic, storyStatus) {
  const statuses = epicNums.map((n) => epics[n]?.status).filter(Boolean);
  let total = 0, done = 0;
  for (const n of epicNums) for (const s of (byEpic[n] || [])) {
    total++;
    if ((storyStatus[s.id] || epics[n]?.status) === 'done') done++;
  }
  let status;
  if (statuses.length && statuses.every((s) => s === 'done')) status = 'done';
  else if (statuses.some((s) => s === 'in-progress' || s === 'in-qa') || done > 0) status = 'in-progress';
  else if (statuses.some((s) => s === 'blocked')) status = 'blocked';
  else if (statuses.length && statuses.every((s) => s === 'deferred')) status = 'deferred';
  else status = 'planned';
  return { status, progress: total ? done / total : 0, total, done };
}

function build() {
  const { meta, epics, storyStatus } = parseStatus();
  const { byEpic, titles } = parseStories();
  const epicDetail = (n) => ({
    num: n, name: epics[n]?.name || titles[n] || `Epic ${String(n).padStart(2, '0')}`,
    status: epics[n]?.status || 'planned',
    stories: (byEpic[n] || []).map((s) => ({ ...s, status: storyStatus[s.id] || epics[n]?.status || 'planned' })),
  });
  let nodes;
  if (Array.isArray(LAYERS) && LAYERS.length) {
    nodes = LAYERS.map((d) => ({ ...d, ...rollup(d.epics, epics, byEpic, storyStatus), epicsDetail: d.epics.map(epicDetail) }));
  } else {
    nodes = Object.values(epics).sort((a, b) => a.num - b.num).map((e) => {
      const r = rollup([e.num], epics, byEpic, storyStatus);
      return { key: `epic-${e.num}`, title: `Epic ${String(e.num).padStart(2, '0')} — ${e.name}`, sub: '', epics: [e.num], ...r, epicsDetail: [epicDetail(e.num)] };
    });
  }
  let git = 'no-git';
  try { git = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}
  return { meta, generatedAt: new Date().toISOString(), git, mode: (Array.isArray(LAYERS) && LAYERS.length) ? 'layers' : 'epics', nodes };
}

function render(model) {
  const data = JSON.stringify(model).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{{PROJECT_NAME}} — Build Cockpit</title>
<style>
:root{--bg:#0d1117;--panel:#161b22;--panel2:#1c2230;--border:#30363d;--text:#e6edf3;--muted:#8b949e;
--planned:#6e7681;--in-progress:#d29922;--in-qa:#a371f7;--done:#2ea043;--blocked:#f85149;--deferred:#484f58;--seam:#1f6feb}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif}
.wrap{max-width:940px;margin:0 auto;padding:32px 20px 80px}header h1{margin:0 0 4px;font-size:24px}
.meta{color:var(--muted);font-size:13px}.meta b{color:var(--text)}
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
.stories .id{color:var(--text);font-size:12px;min-width:38px}footer{margin-top:28px;color:var(--muted);font-size:12px;text-align:center}
</style></head><body><div class="wrap">
<header><h1>{{PROJECT_NAME}} — Build Cockpit</h1><div class="meta" id="meta"></div></header>
<div class="legend" id="legend"></div><div class="flow" id="flow"></div><footer id="footer"></footer></div>
<script>
var MODEL=${data};
var LABELS={'planned':'planned','in-progress':'in progress','in-qa':'in QA','done':'done','blocked':'blocked','deferred':'deferred'};
var COLORS={'planned':'var(--planned)','in-progress':'var(--in-progress)','in-qa':'var(--in-qa)','done':'var(--done)','blocked':'var(--blocked)','deferred':'var(--deferred)'};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
function color(s){return COLORS[s]||'var(--planned)'}
function meta(){var m=MODEL.meta;document.getElementById('meta').innerHTML='Updated <b>'+(m.updated||'?')+'</b> · Phase <b>'+(m.phase||'?')+'</b> · Next <b>'+(m.next||'?')+'</b><br>Repo at <b>'+MODEL.git+'</b> · '+MODEL.mode+' view · generated '+new Date(MODEL.generatedAt).toLocaleString()}
function legend(){var o=['done','in-progress','in-qa','planned','blocked','deferred'],b=document.getElementById('legend');o.forEach(function(s){var sp=el('span');sp.appendChild(el('i','dot'));sp.lastChild.style.background=color(s);sp.appendChild(document.createTextNode(LABELS[s]));b.appendChild(sp)})}
function detail(n){var d=el('div','detail');n.epicsDetail.forEach(function(ep){var blk=el('div','epicblock'),h=el('h4'),b=el('span','badge');b.textContent=LABELS[ep.status];b.style.background=color(ep.status);h.appendChild(b);h.appendChild(document.createTextNode('Epic '+String(ep.num).padStart(2,'0')+' — '+ep.name));blk.appendChild(h);var ul=el('ul','stories');ep.stories.forEach(function(st){var li=el('li'),dot=el('i','dot');dot.style.background=color(st.status);li.appendChild(dot);var id=el('span','id');id.textContent=st.id;li.appendChild(id);li.appendChild(document.createTextNode(st.title));ul.appendChild(li)});if(!ep.stories.length)ul.appendChild(el('li',null,'<i>no stories listed</i>'));blk.appendChild(ul);d.appendChild(blk)});return d}
function card(n){var c=el('div','layer'+(n.seam?' seam':'')),row=el('div','row'),stripe=el('div','stripe');stripe.style.background=color(n.status);row.appendChild(stripe);var body=el('div','body'),tl=el('div','titleline');tl.appendChild(el('h3',null,n.title));var b=el('span','badge');b.textContent=LABELS[n.status];b.style.background=color(n.status);tl.appendChild(b);body.appendChild(tl);if(n.sub)body.appendChild(el('div','sub',n.sub));if(n.total){var holder=el('div');holder.style.display='flex';holder.style.alignItems='center';var bar=el('div','bar'),fill=el('i');fill.style.width=Math.round(n.progress*100)+'%';bar.appendChild(fill);holder.appendChild(bar);holder.appendChild(el('span','pct',n.done+'/'+n.total+' stories'));body.appendChild(holder)}row.appendChild(body);c.appendChild(row);c.appendChild(detail(n));c.addEventListener('click',function(){c.classList.toggle('open')});return c}
function run(){meta();legend();var flow=document.getElementById('flow');MODEL.nodes.forEach(function(n,i){flow.appendChild(card(n));if(i<MODEL.nodes.length-1)flow.appendChild(el('div','arrow','\\u25bc'))});document.getElementById('footer').innerHTML='Generated from PROJECT-STATUS.md + backlog/ · re-run <b>node cockpit/generate.mjs</b> to refresh · click any node for its stories'}
run();
</script></body></html>`;
}

const model = build();
writeFileSync(OUT, render(model));
console.log(`✅ cockpit: wrote ${OUT}`);
console.log(`   ${model.nodes.length} ${model.mode} · repo @ ${model.git} · status updated ${model.meta.updated || '?'}`);
