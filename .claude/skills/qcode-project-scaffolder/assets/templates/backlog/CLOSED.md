# Closed

The append-only index of shipped stories — the record of what's `done`. A story's row lands here the
moment `tech-qa` passes it, in the same commit that removes its row from
[`PROJECT-STATUS.md`](../PROJECT-STATUS.md).

- **Append-only.** Add a row when a story ships; never edit, reorder, or delete a row once it's
  written. Correcting a mistake means a new row, not a rewrite of an old one.
- **One story, one row.** Never pack two story ids into a single row — even for stories that shipped
  together, each gets its own line. A two-id row breaks any parser or script that reads the first id
  on a line as *the* id for that row.
- **Carries ids, links and a status — not the story.** For *why* and *how* it shipped, follow the
  Detail link to the story file itself; this index never restates that reasoning.

| Story | Date | PR | Detail |
|---|---|---|---|
