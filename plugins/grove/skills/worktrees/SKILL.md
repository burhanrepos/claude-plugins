---
name: worktrees
description: Git worktrees with grove. Use when the user asks to create, list, switch, open, compare, review, diff, port, commit or remove a worktree or branch folder, asks "which worktree has X", or before editing in a repo that has several worktrees.
---

The `grove` CLI does the work. Its output is short on purpose; read it and act on it. If `grove` is not on PATH, run `node <this plugin's folder>/bin/grove.mjs` instead.

Rules (the user's, enforced by hooks):
- Run `grove here` before editing. Edit only inside that worktree's folder.
- Never stage, commit, push, cherry-pick or rebase unless the user asks in this chat. The user commits with the band's **commit** button. Never bypass the gate (`--no-verify`, `HUSKY=0`, `GROVE_ALLOW`, `grove allow`, `grove grant`, `--ui`).
- `grove here` or `grove ls` shows deps `missing` or `unlinked`: run `grove install <name>` before running or building anything there. A missing nested `node_modules` (for example `apps/portal/web-dash/node_modules`) shows up as `Cannot find module` at boot.
- Read `.grove-task.md` at the worktree root when you start; update it before you finish (ticket, decisions, files touched, what is left).

| Ask | Run |
|---|---|
| list worktrees | `grove ls` |
| where am I | `grove here` |
| new worktree for a ticket | `grove new SAB-123 --base internal` (add `--type feat`; it installs deps when a lockfile differs from main, `--no-install` skips) |
| what changed | `grove diff --stat` or `grove diff <name> <file>` |
| who changed these lines | `grove review <name> <file>` |
| is the fix ported | `grove cmp <a> <b>` |
| which worktree has X | `grove find <text>` |
| env differs from main | `grove env <name>`; `grove env pull <name>` after the user agrees |
| deps drift | `grove sync <name>`, or `grove install <name>` |
| open a worktree's own chat | `grove open <name>` |
| remove | `grove rm <name>` (refuses when work would be lost; ask before `--force`; stops dev servers running from it) |

The band above the prompt shows every worktree; the user can do all of this with buttons. Point them to it instead of doing git writes yourself.
