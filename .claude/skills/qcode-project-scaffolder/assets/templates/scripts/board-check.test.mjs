// Fixture tests for board-check.mjs — every rule proves it FAILS on the shape of defect it
// exists for, then proves it is SILENT on the corrected shape. The negative case matters as
// much as the positive one: a rule that fires on everything gets disabled within a week, and a
// rule nobody has ever seen fail is a rule nobody knows is actually wired up.
//
// Fixtures below are small, invented fragments written to illustrate one specific defect each
// — not content lifted from any real project's history. See scripts/OBSERVED-DEFECTS.md for
// the real shape of defect each rule is guarding against, in general terms.
//
//   node --test scripts/board-check.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  rule1_noIdOpenAndClosed,
  rule2_idsResolve,
  rule3_statusCellIsAToken,
  rule4_statusInVocab,
  rule5_linksResolve,
  rule6_indexShape,
  rule8_doneEpicHasNoOpenStories,
  tableRows,
  cells,
  extractId,
  parseActive,
  parseClosed,
  loadBoardCheckConfig,
  DEFAULT_STORY_ID_PATTERN,
  DEFAULT_FILE_BUDGET,
  DEFAULT_MAX_STATUS_CELL,
  DEFAULT_MAX_INDEX_ROW,
  MAX_INDEX_ROW,
} from './board-check.mjs';
import { STATUS_VOCAB } from './status-vocab.mjs';

describe('rule 1 — a story is open or closed, never both', () => {
  const active = [
    { id: '03.2', status: 'in-progress', statusCell: '`in-progress`', row: '| 03.2 — Sample story | `in-progress` | [x](backlog/epic-03-sample/03.2.md) |' },
  ];
  const closed = [
    { ids: ['03.2'], detail: '[x](epic-03-sample/03.2.md)', row: '| 03.2 | 2026-01-01 | [PR #1](x) | [x](epic-03-sample/03.2.md) |', storyCell: '03.2' },
  ];

  it('fires when the same id is on the open board and in CLOSED.md', () => {
    const v = rule1_noIdOpenAndClosed(active, closed);
    assert.equal(v.length, 1);
    assert.match(v[0], /03\.2/);
  });

  it('is silent once the story has left the open board', () => {
    assert.equal(rule1_noIdOpenAndClosed([], closed).length, 0);
  });

  it('does not confuse 03.2 with 03.20 — ids are matched whole, not by prefix', () => {
    const other = [{ id: '03.20', status: 'in-progress', statusCell: '`in-progress`', row: '' }];
    assert.equal(rule1_noIdOpenAndClosed(other, closed).length, 0);
  });
});

describe('rule 2 — every id resolves to a file; every file is indexed exactly once', () => {
  const files = [{ dir: 'epic-03-sample', id: '03.2', rel: 'backlog/epic-03-sample/03.2.md' }];
  const index = [{ dir: 'epic-03-sample', id: '03.2', row: '| [03.2](03.2.md) | Sample story |' }];

  it('fires on an Active row whose id resolves to no story file', () => {
    const active = [{ id: '03.9', status: 'planned', statusCell: '`planned`', row: '' }];
    const v = rule2_idsResolve(active, [], files, index);
    assert.ok(v.some((x) => x.includes('03.9') && x.includes('resolves to no story file')));
  });

  it('fires on an Active row with no parseable story id', () => {
    const active = [{ id: null, status: 'planned', statusCell: '`planned`', row: '| loose prose, no id here | `planned` | |' }];
    const v = rule2_idsResolve(active, [], files, index);
    assert.ok(v.some((x) => x.includes('no parseable story id')));
  });

  it('fires on a story file that appears on no epic README index', () => {
    const v = rule2_idsResolve([], [], files, []);
    assert.ok(v.some((x) => x.includes('appears on no epic README index')));
  });

  it('fires on a story file indexed twice', () => {
    const v = rule2_idsResolve([], [], files, [...index, ...index]);
    assert.ok(v.some((x) => x.includes('appears 2 times')));
  });

  it("fires when a CLOSED row's Story cell yields no id at all", () => {
    const closed = [{ ids: [], detail: '[x](epic-03-sample/03.2.md)', row: '', storyCell: 're-gate' }];
    const v = rule2_idsResolve([], closed, files, index);
    assert.ok(v.some((x) => x.includes('yields no story id')));
  });

  it('fires on a CLOSED row whose Detail link points at a file that does not exist', () => {
    const closed = [{ ids: ['03.2'], detail: '[x](epic-99-does-not-exist/99.9.md)', row: '', storyCell: '03.2' }];
    const v = rule2_idsResolve([], closed, files, index);
    assert.ok(v.some((x) => x.includes('03.2') && x.includes('links to a missing file')));
  });

  it("is silent on a CLOSED row whose Detail link resolves to a real file (relative to backlog/)", () => {
    // Points at this project's own templates/backlog/epic-01-foundation/01.1.md, which really
    // exists — proving the resolution is relative to backlog/, matching where CLOSED.md lives.
    const closed = [{ ids: ['01.1'], detail: '[x](epic-01-foundation/01.1.md)', row: '', storyCell: '01.1' }];
    const knownFiles = [{ dir: 'epic-01-foundation', id: '01.1', rel: 'backlog/epic-01-foundation/01.1.md' }];
    const knownIndex = [{ dir: 'epic-01-foundation', id: '01.1', row: '' }];
    const v = rule2_idsResolve([], closed, knownFiles, knownIndex);
    assert.equal(v.filter((x) => x.includes('missing file')).length, 0);
  });

  it('is silent on a correctly indexed, correctly resolving board', () => {
    const active = [{ id: '03.2', status: 'planned', statusCell: '`planned`', row: '' }];
    assert.equal(rule2_idsResolve(active, [], files, index).length, 0);
  });
});

describe('rule 3 — a Status cell holds a token, not a paragraph', () => {
  const PARAGRAPH_CELL =
    '`in-progress` (waiting on a design review before this can move to `in-qa` — ping the ' +
    'reviewer if it sits past Friday, otherwise assume still blocked on their feedback)';

  it('fires on a status cell that grew into a paragraph', () => {
    const v = rule3_statusCellIsAToken([{ statusCell: PARAGRAPH_CELL, status: 'x', row: '' }]);
    assert.equal(v.length, 1);
    assert.match(v[0], /a token, not a paragraph/);
  });

  it('is silent on every legitimate token', () => {
    const rows = STATUS_VOCAB.map((t) => ({ statusCell: '`' + t + '`', status: t, row: '' }));
    assert.equal(rule3_statusCellIsAToken(rows).length, 0);
  });
});

describe('rule 4 — the status vocabulary is closed (checked after alias resolution — the C1 fix)', () => {
  it('fires on a token that is neither a vocabulary word nor a known alias', () => {
    const v = rule4_statusInVocab([{ status: 'ready-for-review', statusCell: '`ready-for-review`', row: '' }]);
    assert.equal(v.length, 1);
    assert.match(v[0], /is not a status/);
  });

  it('is silent on `open` — resolves to `in-progress` before the vocabulary check', () => {
    const v = rule4_statusInVocab([{ status: 'open', statusCell: '`open`', row: '' }]);
    assert.equal(v.length, 0);
  });

  it('is silent on `needs product-check` — resolves to `raised` before the vocabulary check', () => {
    const v = rule4_statusInVocab([{ status: 'needs product-check', statusCell: '`needs product-check`', row: '' }]);
    assert.equal(v.length, 0);
  });

  it('accepts every token in the vocabulary and nothing else', () => {
    const rows = STATUS_VOCAB.map((t) => ({ status: t, statusCell: '`' + t + '`', row: '' }));
    assert.equal(rule4_statusInVocab(rows).length, 0);
  });
});

describe('rule 5 — delegates link-checking to check-links.mjs rather than reimplementing it', () => {
  it('reports "not yet wired" (no violation) when check-links.mjs is absent', () => {
    // check-links.mjs genuinely does not exist yet in this repo — it ships in the next story,
    // 02.3. This exercises the real, current behavior rather than a simulation of it.
    const result = rule5_linksResolve();
    assert.equal(result.violations.length, 0);
    assert.match(result.note, /not yet wired/);
  });

  it('fires when the delegated script exits non-zero', () => {
    // Dependency-injected so this is testable without creating any check-links.mjs stub: point
    // scriptPath at a file that genuinely exists (this test file itself) so the existence guard
    // passes, and inject a `run` that throws the way execFileSync would on a non-zero exit.
    const anExistingFile = fileURLToPath(import.meta.url);
    const result = rule5_linksResolve({
      scriptPath: anExistingFile,
      run: () => {
        throw new Error('simulated: check-links.mjs exited non-zero');
      },
    });
    assert.equal(result.violations.length, 1);
    assert.match(result.violations[0], /^rule 5 —/);
  });

  it('is silent when the delegated script exits zero', () => {
    const anExistingFile = fileURLToPath(import.meta.url);
    const result = rule5_linksResolve({ scriptPath: anExistingFile, run: () => {} });
    assert.equal(result.violations.length, 0);
    assert.equal(result.note, null);
  });
});

describe('rule 6 — an index file, and every row inside one, stays an index', () => {
  it('fires when a bounded index file blows its byte budget', () => {
    const v = rule6_indexShape({ 'PROJECT-STATUS.md': 30 * 1024 }, []);
    assert.equal(v.length, 1);
    assert.match(v[0], /It is an INDEX/);
  });

  it('fires on a paragraph-length row inside an index file', () => {
    const row = '| 05 | Reporting | ' + 'x'.repeat(MAX_INDEX_ROW) + ' |';
    const v = rule6_indexShape({}, [{ file: 'backlog/00-roadmap.md', row, len: row.length }]);
    assert.equal(v.length, 1);
    assert.match(v[0], /An index row is one line/);
  });

  it('fires on a CLOSED row that packs two story ids into one row', () => {
    const v = rule6_indexShape({}, [], [{ ids: ['03.1', '03.2'], storyCell: '03.1/03.2' }]);
    assert.equal(v.length, 1);
    assert.match(v[0], /names exactly one/);
  });

  it('is silent at ordinary, healthy sizes with one id per CLOSED row', () => {
    const v = rule6_indexShape(
      { 'PROJECT-STATUS.md': 3000, 'backlog/ACCEPTED.md': 1400 },
      [],
      [{ ids: ['03.1'], storyCell: '03.1' }]
    );
    assert.equal(v.length, 0);
  });
});

describe('rule 8 — a `done` epic has no open stories left under it', () => {
  const epicDone = [{ num: '05', status: 'done', statusCell: '`done`', row: '' }];

  it('fires when a done epic still has an open story', () => {
    const active = [{ id: '05.3', status: 'raised', statusCell: '`raised`', row: '' }];
    const v = rule8_doneEpicHasNoOpenStories(epicDone, active);
    assert.equal(v.length, 1);
    assert.match(v[0], /05\.3/);
  });

  it('is silent when the epic is honestly in-progress', () => {
    const active = [{ id: '05.3', status: 'raised', statusCell: '`raised`', row: '' }];
    const epic = [{ num: '05', status: 'in-progress', statusCell: '`in-progress`', row: '' }];
    assert.equal(rule8_doneEpicHasNoOpenStories(epic, active).length, 0);
  });

  it("does not attribute epic 01's open stories to epic 05 (no numeric-prefix false match)", () => {
    const active = [{ id: '01.5', status: 'raised', statusCell: '`raised`', row: '' }];
    assert.equal(rule8_doneEpicHasNoOpenStories(epicDone, active).length, 0);
  });
});

describe('the parsers read structure, never prose', () => {
  it('takes the status from the token and the id from the Story cell', () => {
    const board = [
      '## Active increments',
      '',
      '| Story | Status | Link |',
      '|-------|--------|------|',
      '| 03.2 — Sample story that has never actually run | `in-progress` | [x](backlog/epic-03-sample/03.2.md) |',
      '',
    ].join('\n');
    const rows = parseActive(board);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, '03.2');
    assert.equal(rows[0].status, 'in-progress');
  });

  it('falls back to the ## Active increments heading when no table header is present, and reads zero rows from prose', () => {
    const board = ['## Active increments', '', 'Nothing pulled yet. **None yet.**', '', '## Needs status review', ''].join('\n');
    assert.equal(parseActive(board).length, 0);
  });

  // The parser stays tolerant of the packed shape so rule 6 can REPORT it; silently taking
  // only the first id is exactly how a two-id row would render its second story as
  // never-shipped to any downstream reader.
  it('reads both ids out of a combined CLOSED row like 03.1/03.2', () => {
    const md = [
      '| Story | Date | PR | Detail |',
      '|---|---|---|---|',
      '| 03.1/03.2 | 2026-01-01 | [PR #1](x) | [d](epic-03-sample/03.1.md) |',
    ].join('\n');
    assert.deepEqual(parseClosed(md)[0].ids, ['03.1', '03.2']);
  });

  it('reads a lettered id like 02.3a', () => {
    const md = [
      '| Story | Date | PR | Detail |',
      '|---|---|---|---|',
      '| 02.3a | 2026-01-01 | [PR #2](x) | [d](epic-02-sample/02.3.md) |',
    ].join('\n');
    assert.deepEqual(parseClosed(md)[0].ids, ['02.3a']);
  });

  it('skips the CLOSED.md header row itself rather than reading it as a data row', () => {
    const md = ['| Story | Date | PR | Detail |', '|---|---|---|---|'].join('\n');
    assert.equal(parseClosed(md).length, 0);
  });

  it('extractId finds the longer id, not a shorter one that is a prefix of it', () => {
    assert.equal(extractId('see 01.10 for the follow-up'), '01.10');
    assert.equal(extractId('01.1 — Repository & app structure'), '01.1');
  });

  it('cells() splits a pipe-delimited row and trims each cell', () => {
    assert.deepEqual(cells('| a | b  |  c |'), ['a', 'b', 'c']);
  });

  it('tableRows() stops at the next ## heading and ignores prose after the table', () => {
    const md = ['## Stories', '', '| Story | Title |', '|---|---|', '| [01.1](01.1.md) | Sample |', '', '## Definition of done', 'some prose'].join('\n');
    assert.deepEqual(tableRows(md, '## Stories'), ['| [01.1](01.1.md) | Sample |']);
  });
});

describe('loadBoardCheckConfig — .qcode/config.json "boardCheck" overrides, merged over defaults', () => {
  function withTempRoot(fn) {
    const dir = mkdtempSync(join(tmpdir(), 'board-check-config-'));
    try {
      fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it('uses the built-in defaults when .qcode/config.json is absent', () => {
    withTempRoot((dir) => {
      const cfg = loadBoardCheckConfig(dir);
      assert.equal(cfg.storyIdPattern, DEFAULT_STORY_ID_PATTERN);
      assert.deepEqual(cfg.fileBudgets, DEFAULT_FILE_BUDGET);
      assert.equal(cfg.maxStatusCell, DEFAULT_MAX_STATUS_CELL);
      assert.equal(cfg.maxIndexRow, DEFAULT_MAX_INDEX_ROW);
    });
  });

  it('overrides only the keys a project actually sets, leaving the rest at defaults', () => {
    withTempRoot((dir) => {
      mkdirSync(join(dir, '.qcode'));
      writeFileSync(join(dir, '.qcode', 'config.json'), JSON.stringify({ boardCheck: { maxIndexRow: 400 } }));
      const cfg = loadBoardCheckConfig(dir);
      assert.equal(cfg.maxIndexRow, 400);
      assert.equal(cfg.maxStatusCell, DEFAULT_MAX_STATUS_CELL);
      assert.deepEqual(cfg.fileBudgets, DEFAULT_FILE_BUDGET);
    });
  });

  it('merges fileBudgets per key rather than replacing the whole map', () => {
    withTempRoot((dir) => {
      mkdirSync(join(dir, '.qcode'));
      writeFileSync(
        join(dir, '.qcode', 'config.json'),
        JSON.stringify({ boardCheck: { fileBudgets: { 'PROJECT-STATUS.md': 40 * 1024 } } })
      );
      const cfg = loadBoardCheckConfig(dir);
      assert.equal(cfg.fileBudgets['PROJECT-STATUS.md'], 40 * 1024);
      assert.equal(cfg.fileBudgets['backlog/ACCEPTED.md'], DEFAULT_FILE_BUDGET['backlog/ACCEPTED.md']);
    });
  });

  it('falls back to defaults, without throwing, when config.json is not valid JSON', () => {
    withTempRoot((dir) => {
      mkdirSync(join(dir, '.qcode'));
      writeFileSync(join(dir, '.qcode', 'config.json'), '{ not valid json');
      const cfg = loadBoardCheckConfig(dir);
      assert.equal(cfg.maxIndexRow, DEFAULT_MAX_INDEX_ROW);
      assert.deepEqual(cfg.fileBudgets, DEFAULT_FILE_BUDGET);
    });
  });
});
