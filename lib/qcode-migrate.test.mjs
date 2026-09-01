import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseV1Epic,
  parseEpicFilename,
  renderStoryFile,
  renderEpicReadme,
  compareStoryIds,
  parseEpicsTable,
  parseRecentlyDone,
  renderClosedRow,
} from './qcode-migrate.mjs';

describe('parseV1Epic — the normal case (one story, one closure, in order)', () => {
  const fixture = `# Epic 01 — Secure the base

**Goal.** Land the board.

**Depends on.** Nothing.

---

## Stories

### 01.1 — Commit token discipline

**What & why.** Two things needed to happen.

**Acceptance criteria.**
- A thing is true.

#### Closed: 01.1 — 2026-08-13

Done as part of this same bootstrap pass.
`;

  it('extracts the title and preamble verbatim, minus the trailing --- separator', () => {
    const { title, preamble } = parseV1Epic(fixture);
    assert.equal(title, 'Epic 01 — Secure the base');
    assert.equal(preamble, '**Goal.** Land the board.\n\n**Depends on.** Nothing.');
  });

  it('finds exactly one story with its own id, title, and body', () => {
    const { stories } = parseV1Epic(fixture);
    assert.equal(stories.length, 1);
    assert.equal(stories[0].id, '01.1');
    assert.equal(stories[0].title, 'Commit token discipline');
    assert.match(stories[0].body, /\*\*What & why\.\*\* Two things needed to happen\./);
    assert.match(stories[0].body, /- A thing is true\./);
  });

  it('finds exactly one closure with its own id, date, and body', () => {
    const { closures } = parseV1Epic(fixture);
    assert.equal(closures.length, 1);
    assert.equal(closures[0].id, '01.1');
    assert.equal(closures[0].date, '2026-08-13');
    assert.match(closures[0].body, /Done as part of this same bootstrap pass\./);
  });

  it('a story body never swallows the next block\'s heading or content (negative case)', () => {
    const { stories } = parseV1Epic(fixture);
    assert.doesNotMatch(stories[0].body, /Closed: 01\.1/);
    assert.doesNotMatch(stories[0].body, /Done as part of this same bootstrap pass/);
  });
});

describe('parseV1Epic — closures out of story order (this repo\'s real epic-02 shape)', () => {
  // Real shape: closures appear in the order 02.1 / 02.3 / 02.4 / 02.2 — NOT matching story order,
  // and NOT the order the stories themselves were written. A parser that assumes "the Nth closure
  // belongs to the Nth story" gets this silently wrong.
  const fixture = `# Epic 02 — The shape

**Goal.** Land the shape.

---

## Stories

### 02.1 — Information architecture

Story 02.1 body.

### 02.2 — Port board-check

Story 02.2 body.

### 02.3 — Rebuild the guard

Story 02.3 body.

### 02.4 — Cockpit evolution

Story 02.4 body.

#### Closed: 02.1 — 2026-08-13

Closure for 02.1.

#### Closed: 02.3 — 2026-08-14

Closure for 02.3.

#### Closed: 02.4 — 2026-08-14

Closure for 02.4.

#### Closed: 02.2 — 2026-08-13

Closure for 02.2.
`;

  it('finds all four stories, each with only its own body', () => {
    const { stories } = parseV1Epic(fixture);
    assert.equal(stories.length, 4);
    const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
    assert.match(byId['02.1'].body, /Story 02\.1 body\./);
    assert.match(byId['02.2'].body, /Story 02\.2 body\./);
    assert.match(byId['02.3'].body, /Story 02\.3 body\./);
    assert.match(byId['02.4'].body, /Story 02\.4 body\./);
  });

  it('matches each closure to the RIGHT id regardless of the order closures appear in the file', () => {
    const { closures } = parseV1Epic(fixture);
    assert.equal(closures.length, 4);
    const byId = Object.fromEntries(closures.map((c) => [c.id, c]));
    assert.match(byId['02.1'].body, /Closure for 02\.1\./);
    assert.match(byId['02.2'].body, /Closure for 02\.2\./);
    assert.match(byId['02.3'].body, /Closure for 02\.3\./);
    assert.match(byId['02.4'].body, /Closure for 02\.4\./);
  });
});

describe('parseV1Epic — a closure block sitting BEFORE its own story heading (real epic-03 shape)', () => {
  // Real shape: `#### Closed: 03.2` sits textually between 03.1's story section and 03.2's OWN
  // `### 03.2` heading (both 03.1 and 03.2 were closed in one pass; 03.2's spec section was filled
  // in further down afterward). A parser assuming "a closure always follows its own story heading"
  // would misfile this one, or worse, silently attach it to 03.1.
  const fixture = `# Epic 03 — The gates

**Goal.** Carry the gates.

---

## Stories

### 03.1 — tech-planning rewrite

Story 03.1 body.

#### Closed: 03.1 — 2026-08-14

Closure for 03.1.

#### Closed: 03.2 — 2026-08-14

Closure for 03.2, written before 03.2's own heading below.

### 03.2 — tech-build rewrite

Story 03.2 body.
`;

  it('still finds 03.2 as its own story, unaffected by the closure sitting above it', () => {
    const { stories } = parseV1Epic(fixture);
    const s32 = stories.find((s) => s.id === '03.2');
    assert.ok(s32, '03.2 should be found as a story');
    assert.match(s32.body, /Story 03\.2 body\./);
    assert.doesNotMatch(s32.body, /Closure for 03\.2/);
  });

  it('matches the out-of-position closure to 03.2, not to 03.1 (its textual neighbor)', () => {
    const { closures } = parseV1Epic(fixture);
    const c31 = closures.find((c) => c.id === '03.1');
    const c32 = closures.find((c) => c.id === '03.2');
    assert.match(c31.body, /Closure for 03\.1\./);
    assert.doesNotMatch(c31.body, /Closure for 03\.2/);
    assert.match(c32.body, /written before 03\.2's own heading/);
  });
});

describe('parseV1Epic — no closures at all (real epic-06 shape: nothing shipped yet)', () => {
  const fixture = `# Epic 06 — Assembly

**Goal.** Assemble it.

---

## Stories

### 06.1 — CLAUDE.md rewrite

Story 06.1 body.

### 06.2 — Docs and release

Story 06.2 body.
`;

  it('finds both stories and zero closures — not an error, a valid in-progress epic', () => {
    const { stories, closures } = parseV1Epic(fixture);
    assert.equal(stories.length, 2);
    assert.equal(closures.length, 0);
  });
});

describe('parseV1Epic — the trailing placeholder stub (real epic-05/epic-06 shape)', () => {
  const fixture = `# Epic 05 — Generation engine

**Goal.** Build the engine.

---

## Stories

### 05.1 — The unified renderer core

Story 05.1 body.

#### Closed: 05.1 — 2026-08-14

Closure for 05.1.

### 05.4 — migrate + check modes

Story 05.4 body, still in progress.

#### Closed: 05.1–05.4

_Filled in as each story's subagent pass is QA'd and lands._
`;

  it('drops the range-shaped placeholder heading rather than parsing it as a real closure', () => {
    const { closures, droppedStubs } = parseV1Epic(fixture);
    assert.equal(closures.length, 1, 'only the real 05.1 closure should be found');
    assert.equal(closures[0].id, '05.1');
    assert.equal(droppedStubs.length, 1);
    assert.match(droppedStubs[0], /Closed: 05\.1–05\.4/);
  });

  it('the placeholder\'s body text never leaks into any real story or closure (negative case)', () => {
    const { stories, closures } = parseV1Epic(fixture);
    for (const block of [...stories, ...closures]) {
      assert.doesNotMatch(block.body, /Filled in as each story/);
    }
  });
});

describe('parseV1Epic — preamble extraction', () => {
  it('keeps every preamble line (Goal/Value archetype/Depends on/Reference) verbatim, in order', () => {
    const fixture = `# Epic 04 — Product layer

**Goal.** Ship product-check.

**Value archetype.** Extraction.

**Depends on.** Epic 03.

**Reference.** Theme T6.

---

## Stories

### 04.1 — Generalize product-check

Body.
`;
    const { preamble } = parseV1Epic(fixture);
    assert.equal(
      preamble,
      '**Goal.** Ship product-check.\n\n**Value archetype.** Extraction.\n\n**Depends on.** Epic 03.\n\n**Reference.** Theme T6.'
    );
  });

  it('handles an epic with no ## Stories heading at all (defensive — not expected in real content)', () => {
    const { title, stories, closures } = parseV1Epic('# Epic 09 — Empty\n\nJust a preamble, nothing built yet.\n');
    assert.equal(title, 'Epic 09 — Empty');
    assert.equal(stories.length, 0);
    assert.equal(closures.length, 0);
  });
});

describe('parseV1Epic — leading blank line right after a heading (the real, universal source shape)', () => {
  // Every real story/closure heading in this repo's actual epic files is immediately followed by
  // one blank line before the real content starts. If the parser keeps that as part of the body,
  // renderStoryFile's own "heading\n\n{body}" separator produces a double blank line — cosmetic,
  // but a real deviation from clean, hand-authored formatting.
  const fixture = `# Epic 09 — Test

**Goal.** Test.

---

## Stories

### 09.1 — A story

**What & why.** Real content starts right after one blank line.

#### Closed: 09.1 — 2026-08-14

Closure content, also right after one blank line.
`;

  it('story body has no leading blank line', () => {
    const { stories } = parseV1Epic(fixture);
    assert.equal(stories[0].body[0], '*', 'body should start with the real content, not a newline');
  });

  it('closure body has no leading blank line', () => {
    const { closures } = parseV1Epic(fixture);
    assert.equal(closures[0].body[0], 'C', 'body should start with "Closure...", not a newline');
  });

  it('renderStoryFile never produces a double blank line after either heading', () => {
    const { stories, closures } = parseV1Epic(fixture);
    const out = renderStoryFile(stories[0], closures[0]);
    assert.doesNotMatch(out, /\n\n\n/, 'no run of two blank lines anywhere in the rendered file');
  });
});

describe('parseEpicFilename', () => {
  it('splits a real v1 epic filename into its number and full slug', () => {
    assert.deepEqual(parseEpicFilename('epic-05-generation-engine.md'), {
      slug: 'epic-05-generation-engine',
      num: '05',
    });
  });

  it('rejects a non-epic filename rather than silently returning nonsense (negative case)', () => {
    assert.throws(() => parseEpicFilename('README.md'), /not a v1 epic filename/);
  });
});

describe('renderStoryFile', () => {
  it('renders a closed story as its spec heading + body, then its closure heading + body', () => {
    const story = { id: '01.1', title: 'Commit token discipline', body: '**What & why.** Stuff.' };
    const closure = { id: '01.1', date: '2026-08-13', body: 'Done.' };
    const out = renderStoryFile(story, closure);
    assert.equal(
      out,
      '### 01.1 — Commit token discipline\n\n**What & why.** Stuff.\n\n#### Closed: 01.1 — 2026-08-13\n\nDone.\n'
    );
  });

  it('renders an open story (no closure yet) with no Closed block at all', () => {
    const story = { id: '05.4', title: 'migrate + check modes', body: '**What & why.** Stuff.' };
    const out = renderStoryFile(story, null);
    assert.equal(out, '### 05.4 — migrate + check modes\n\n**What & why.** Stuff.\n');
    assert.doesNotMatch(out, /Closed:/);
  });
});

describe('renderEpicReadme', () => {
  it('generates the Stories index table FROM the story list, in the given order', () => {
    const storiesById = new Map([
      ['01.1', { title: 'Commit token discipline' }],
      ['01.2', { title: 'Second thing' }],
    ]);
    const out = renderEpicReadme({
      title: 'Epic 01 — Secure the base',
      preamble: '**Goal.** Land the board.',
      storyOrder: ['01.1', '01.2'],
      storiesById,
    });
    assert.match(out, /^# Epic 01 — Secure the base\n/);
    assert.match(out, /\*\*Goal\.\*\* Land the board\./);
    assert.match(out, /## Stories\n\n\| Story \| Title \|\n\|---\|---\|\n/);
    assert.match(out, /\| \[01\.1\]\(01\.1\.md\) \| Commit token discipline \|/);
    assert.match(out, /\| \[01\.2\]\(01\.2\.md\) \| Second thing \|/);
  });

  it('never invents a description beyond the story\'s own title (negative case)', () => {
    const storiesById = new Map([['01.1', { title: 'Commit token discipline' }]]);
    const out = renderEpicReadme({ title: 'Epic 01', preamble: 'x', storyOrder: ['01.1'], storiesById });
    // the row holds exactly the id link + the title — nothing else appended
    assert.match(out, /\| \[01\.1\]\(01\.1\.md\) \| Commit token discipline \|\n/);
  });
});

describe('compareStoryIds', () => {
  it('sorts numerically within an epic, not lexically (05.10 after 05.2, not before)', () => {
    const ids = ['05.10', '05.2', '05.1'];
    assert.deepEqual([...ids].sort(compareStoryIds), ['05.1', '05.2', '05.10']);
  });

  it('sorts by epic number first', () => {
    const ids = ['10.1', '02.3', '02.1'];
    assert.deepEqual([...ids].sort(compareStoryIds), ['02.1', '02.3', '10.1']);
  });
});

describe('parseEpicsTable + parseRecentlyDone — reusing board-check.mjs\'s own table reader', () => {
  const board = `# Project Status

## Epics

| # | Epic | Status | Detail |
|---|------|--------|--------|
| 01 | Secure the base | \`done\` | [epic-01](backlog/epic-01-secure-base.md) |
| 02 | The shape | \`in-progress\` | [epic-02](backlog/epic-02-shape-and-enforcement.md) |

## Recently done — the increment log

| Story | Date | Detail |
|-------|------|--------|
| 02.1 | 2026-08-13 | [epic-02 § 02.1](backlog/epic-02-shape-and-enforcement.md#021--information-architecture) — the ADR-059 shape |
| 01.1 | 2026-08-13 | [epic-01 § 01.1](backlog/epic-01-secure-base.md#011--commit-token-discipline) |
`;

  it('parses the Epics table rows with status and detail link', () => {
    const rows = parseEpicsTable(board);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].num, '01');
    assert.equal(rows[0].status, 'done');
    assert.equal(rows[0].detailHref, 'backlog/epic-01-secure-base.md');
    assert.equal(rows[1].status, 'in-progress');
  });

  it('parses Recently-done rows in their existing (reverse-chronological) order, ids extracted', () => {
    const rows = parseRecentlyDone(board);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].id, '02.1');
    assert.equal(rows[0].date, '2026-08-13');
    assert.equal(rows[1].id, '01.1');
  });

  it('detailText is the readable label + trailing prose, with the OLD link syntax stripped out — ' +
     'not the raw cell (negative case: a raw-cell bug produces a link nested inside a link once ' +
     'renderClosedRow wraps it in a NEW one)', () => {
    const rows = parseRecentlyDone(board);
    assert.equal(rows[0].detailText, 'epic-02 § 02.1 — the ADR-059 shape');
    assert.equal(rows[0].detailHref, 'backlog/epic-02-shape-and-enforcement.md#021--information-architecture');
    assert.doesNotMatch(rows[0].detailText, /[[\]()]/, 'no markdown link syntax should survive into detailText');
  });

  it('a Detail cell that is ONLY a link (no trailing prose) still parses cleanly', () => {
    const rows = parseRecentlyDone(board);
    assert.equal(rows[1].detailText, 'epic-01 § 01.1');
  });
});

describe('renderClosedRow', () => {
  it('renders a four-column CLOSED.md row with an honest "—" PR (no real PR exists for these)', () => {
    const row = renderClosedRow({
      id: '01.1',
      date: '2026-08-13',
      detailLinkText: 'epic-01 § 01.1',
      detailHref: 'epic-01-secure-base/01.1.md',
    });
    assert.equal(row, '| 01.1 | 2026-08-13 | — | [epic-01 § 01.1](epic-01-secure-base/01.1.md) |');
  });
});
