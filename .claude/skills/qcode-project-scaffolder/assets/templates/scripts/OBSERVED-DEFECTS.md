# Observed defects — why each `board-check` rule exists

`scripts/board-check.mjs` enforces seven rules (numbered 1–6 and 8 — see that file's header
comment for why there is no 7 in this list). None of them is speculative hygiene. Each exists
because a failure shaped exactly like it was actually observed in real use of this board/backlog
convention, on the platform this checker was ported from — not because it seemed prudent in the
abstract.

This file is where the *evidence* lives, in full, one section per rule: what shape of defect
happened, in general terms, and why the rule is shaped the way it is in response. The comment
above each rule in `board-check.mjs` is deliberately one line and points here rather than
re-telling the story — this is the file to read to understand *why*, not just *what*.

Nothing below names a specific company, dollar figure, PR number, or ADR id. QCode-Method is a
generic framework; what matters for anyone reading this is the *shape* of the failure, which
generalizes, not the specific incident, which doesn't.

---

## Rule 1 — a story is open or closed, never both

A board that records status in more than one place can drift into giving two different answers
to the same question. The observed shape: a story's row in the open-work section carried one
status token, its epic's summary row carried another, and a "recently done" section carried a
third — three surfaces, three answers, with nothing forcing them to agree. A shipped story kept
reading as still-in-progress in one place and done in another, and a reader had no way to tell
which one was current without going and checking the actual code or PR history by hand.

The structural fix is the append-only-index shape itself: the moment a story ships, its row
leaves the open board entirely, and a single line in an append-only index is the only record
from then on. Rule 1 is what makes it impossible for both records to exist on the same id at
once — it doesn't just discourage the drift, it fails the build over it.

## Rule 2 — ids resolve, and every file is indexed exactly once

Two mirror-image defects, both about an id and a file falling out of sync with each other. In
one direction: a status board named a story id that no file backed — the id existed only as a
promise in a table cell, because a batch of stories had been logged one heading level too
shallow for the tool that turns headings into files, so the split step silently produced nothing
for them. Their ids kept appearing and resolving to nothing for a long stretch before anyone
noticed the content itself had never actually been split out.

In the other direction: a story file existed on disk with no index anywhere pointing at it — a
file created directly, or left behind after a restructure, that no epic README's story table
ever listed. It was invisible to anyone reading the board top-down, which is the only way anyone
actually reads a board of this size. Rule 2 checks both directions, and also refuses to let an
id-shaped cell that fails to parse just silently vanish from the check — an unparseable cell is
reported, not skipped, because skipping it is exactly how the first version of this defect went
unnoticed for as long as it did.

## Rule 3 — a status cell holds a token, not a paragraph

Nothing enforced that a Status cell stay a single word. Once it's possible to append "just one
more clause" — which PR it shipped in, a note about who's waiting on what, a parenthetical
explaining the current round of review — a status cell has no natural stopping point. One,
observed over months of exactly that kind of incremental append, grew from a short token into
tens of thousands of characters: a single table cell longer than most of the files it was
supposed to summarize. It was still syntactically valid markdown the whole way there, so nothing
ever rendered as broken. It just silently stopped being a status and became a running diary
that happened to live inside a table cell.

## Rule 4 — the status token is in the vocabulary, after alias resolution

Two different programs read the same status cell, and each maintained its own idea of which
tokens were legal — including which informal synonyms for a canonical token (a plain-English
"open" in place of the real in-progress token, for instance) were accepted and silently
translated. The two lists drifted out of step with each other: one reader accepted and resolved
a synonym, the other did not, so the exact same cell in the exact same commit was simultaneously
"fine" (as far as the renderer was concerned) and "an error" (as far as the checker was
concerned) depending only on which script happened to read it that day.

The fix here is structural, not a longer list bolted onto each reader: there is now exactly one
file (`scripts/status-vocab.mjs`) that declares both the vocabulary and its aliases, and every
reader — the checker and, from a later story on, the cockpit — imports it rather than declaring
its own copy. It is no longer possible for the two to disagree, because there is only one
declaration left to disagree with itself.

## Rule 5 — every relative link resolves

Cross-references between planning documents accumulate quickly, and a rename or a file move
silently breaks every relative link that pointed at the old path. With nothing checking them, a
broken link just sits there indefinitely — the text still renders as a link, and only a reader
who actually clicks it (or an anchor, scrolls to nothing) ever discovers it goes nowhere. In the
observed case, a meaningful fraction of a large cross-reference set had been dead for months,
found only when someone happened to follow one while chasing an unrelated question.

A second, sharper variant of the same defect: a link that resolves on one machine because its
target happens to exist there — untracked, left over from a branch, or otherwise not part of
what's actually committed — while the same link is dead in a clean checkout of the same commit.
Any check that answers "does this file exist?" by asking the filesystem, rather than the
repository's own tracked-file list, can legitimately give two different answers to the same
question on the same commit depending only on which machine asks. That is fatal for anything
meant to be a single predicate shared between a local hook and CI.

## Rule 6 — an index file, and every row inside one, stays an index

Three related shapes of the same underlying defect, all against files whose entire purpose is to
be a short, skimmable map to where the real detail lives — never the detail itself.

- **A whole index file outgrows its purpose.** With no bound on it, a board or a decisions-log
  file kept absorbing content that belonged in the individual story or decision file it was
  supposed to just point at, until it reached hundreds of kilobytes — no longer something a
  person, or a model working within a context budget, can skim in one pass. That is the entire
  reason an index file exists in the first place, and past a certain size it simply stops
  serving that purpose while still technically being "the board."
- **A single index row does the same thing in miniature.** A roadmap or backlog row is supposed
  to be one line. Without a check, one row can quietly grow into a paragraph while every
  neighboring row on the same page stays properly short — which means the defect hides in plain
  sight, camouflaged by dozens of well-behaved rows around it, rather than standing out.
- **An index row packs two ids into one line.** An append-only shipped-work log is meant to hold
  one id per row. When two stories ship together, it's tempting to log them on a single combined
  row to save a line. Any downstream reader that treats "the id on this line" as that row's
  identity — which is the natural, simplest way to write such a reader — then silently
  attributes the whole row to only the first of the two ids. The second story quietly renders as
  never-shipped even though it merged in the same commit as the first.

Rule 6 also checks a project's product-surface map, once one exists, for the same per-row
budget — closing a gap that the platform this checker was ported from still has today: its own
product-surface map grew unchecked into rows thousands of characters long, the exact defect rule
6 exists to catch everywhere else. Checking a file that doesn't exist yet is a no-op here, not an
error, so this coverage is in place from a project's very first commit rather than needing to be
remembered and wired in later, once the file finally shows up.

## Rule 8 — a `done` epic has no open stories left under it

A renderer that shows per-story status commonly falls back to the parent epic's status for any
story that has no row of its own yet — a reasonable default, since a story nobody has started
has nothing else to show. That fallback quietly becomes a lie the moment the epic's own status is
marked `done` while some of its stories were only ever product-shaped and never actually built:
every one of those never-built stories then renders as shipped, purely by inheriting a color from
a summary row that stopped being accurate. The observed case was found only by accident, while
adding file-backed entries for stories that had been missing them — already-"complete"-looking
work suddenly needed to be built, because it had never actually been done in the first place.
