# Screens Map

A one-page index of every product surface: what it's *for*, in one line, and who owns the full
reasoning behind it. This file is a **pointer, not a duplicate** — the epic linked in each row is the
source of truth for *why* the surface exists and how it works; this table exists so a new product idea
can be checked against every surface's job in one read, without re-deriving it from scratch across a
dozen epic files each time.

**Maintained by the [`product-check`](../.claude/skills/product-check/SKILL.md) skill.** Add or
update a row whenever a requirement ships a new surface/route or changes what an existing one is for.
Status mirrors [`PROJECT-STATUS.md`](../PROJECT-STATUS.md)'s epic table — the board is the single
source for status; don't hand-edit status here without it.

*(to define: "surface" means whatever this project's product actually has — a screen, a route, a CLI
subcommand, an API-facing capability. Rename the table's "Surface" column header to match if that
reads better for this project; the shape stays the same.)*

---

## Surfaces

| Route / Entry point | Surface | Job to be done (one line) | Owning epic | Status |
|---|---|---|---|---|
| *(none yet — `product-check` adds a row per surface as requirements land)* | | | | |

**Not a product surface (infra only, no job of its own):** *(list auth gates, redirects, or other
plumbing routes here as they appear — not tracked in the table above.)*
