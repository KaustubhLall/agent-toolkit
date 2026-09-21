---
name: obsidian
description: Maintain and reorganize the user's Obsidian vault at {{VAULT}}. Use when updating indexes, moving notes into archives, adding or consolidating projects, career, food, or recipe notes, or propagating new information across related nodes while preserving canonical-source boundaries and verifying links.
---

# Maintain Obsidian Vault

## Purpose

Keep the vault navigable, internally consistent, and honest about what is current, historical, canonical, duplicated, or unverified. Treat a user-provided fact as a change to the relevant source note plus every affected index, alias, archive link, tracker, and related node.

Read [references/vault-layout.md](references/vault-layout.md) when the task crosses more than one area or when the target node is unclear.

Read [references/index-snapshot.md](references/index-snapshot.md) for the public bundle navigation boundary. No private index snapshot is included. Inspect the live vault Home.md and relevant Index.md files before making changes.

## Start with evidence

1. Set the vault root to `{{VAULT}}`.
2. Inspect the live directory and relevant `Index.md` files with `rg --files`, `Get-ChildItem`, and `Get-Content` before editing.
3. Search incoming links and stale names with `rg`; do not assume a filename move is self-contained.
4. For Project Management work, read `Project Management/General Preferences.md` and `Project Management/Index.md` first. Read the matching project control note when one exists.
5. Separate source-of-truth types:
   - Linear/GitHub/runtime: volatile status, history, and external evidence.
   - `Project Management/`: durable conventions, ownership boundaries, and control links.
   - `Projects/`, `Career/`, `Food/`: readable content, plans, specs, evidence, and historical notes.

## Update workflow

### 1. Build the impact map

Before changing a node, identify:

- the canonical note to edit;
- parent indexes and MOCs;
- incoming and outgoing links;
- aliases, duplicate repository names, worktrees, and archive paths;
- related control/content notes;
- claims that are current, historical, or still unverified.

### 2. Update the canonical node

Use `apply_patch` for content edits. Make the smallest complete change that establishes the new fact, preserves useful history, and states uncertainty when evidence is incomplete. Use `Move-Item` only for an explicitly requested move, after checking the source and destination are inside the intended vault folder.

### 3. Propagate deliberately

After the canonical node changes, update every affected consumer:

- area index and parent MOC;
- Project Management control note and index when the item is an active project;
- content note and project aliases when a repository is renamed, consolidated, or split;
- current/archive links when a note moves;
- related trackers, plans, shopping lists, and historical notes when their links or durable meaning changed.

Do not copy volatile task status into every content note. Link to the live tracker instead.

### 4. Verify independently

Run targeted checks after editing:

- every moved or newly linked path exists;
- `rg` finds no old paths or stale names in the affected area;
- frontmatter has `title`, `tags`, and `updated` where the area uses them;
- duplicate basename links are path-qualified;
- Markdown tables contain no unescaped wikilink display pipes;
- archives contain historical material only, while current hubs point to current notes;
- the final report separates Changed, Verified, and Deferred.

## Cross-node propagation rules

| New information | Update first | Then update |
|---|---|---|
| New active project/repository | `Projects/<project>.md` | `Project Management/Projects/<project>.md`, both indexes, repository aliases, related work notes |
| Project status or ownership | Project Management control note | Project Management index; content note only if the durable meaning changed |
| Repository consolidation/worktree | Canonical project note | Projects index, Project Management index, old-name references; do not create a duplicate project |
| Career fact or positioning change | Current 2026 Career note | Career Index, Narrative/Resume, Evidence Portfolio, Interview Prep, Search Tracker |
| Historical career material | `Career/archive/` | Career Index and all inbound links; never leave stale root links |
| New recipe | `Food/Recipes/<recipe>.md` | `Food/Recipes/Index.md`, `Food/Index.md` meal plan and bulk list |
| Recipe ingredient or serving change | Recipe note | Recipe Index, selected Food plan, consolidated shopping list, and any affected meal-log note |
| Pantry-only item | `Food/Shopping List.md` | Food Index only when it changes the bulk-shopping workflow |

## Formatting and safety rules

- Prefer path-qualified wikilinks when the same basename exists in control/content or current/archive layers.
- In Markdown tables, use bare wikilinks such as `[[Food/Recipes/Salmon with Rice]]`; do not put `|Display Text` inside a table cell unless it is escaped correctly.
- Preserve UTF-8 content, frontmatter, useful historical context, and unrelated user changes.
- Consolidate aliases and thin stubs when the canonical meaning is clear; do not duplicate live state.
- Keep editable planning fields separate from historical records.
- Do not claim a project, publication, metric, runtime result, sponsorship fact, or completion state without evidence.
- Do not create or change Linear/GitHub records unless the user explicitly asks for that external mutation.

## Closeout

Use this compact handoff:

```text
Status: [current verdict]
Changed: [canonical notes, indexes, moves, and propagated links]
Verified: [path checks, stale-link search, frontmatter/table checks]
Deferred: [facts or runtime behavior intentionally not verified]
Next action: [one concrete follow-up]
```
