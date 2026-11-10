# Worktree rules (grove)

This repo uses git worktrees managed by `grove`. Each worktree is one ticket and has its own chat.

1. Before you edit, run `grove here`. Edit files only inside that worktree's folder. Never edit the main checkout or another worktree from here.
2. Never run `git add`, `git commit`, `git push`, `git cherry-pick`, `git rebase`, `git reset --hard` or any command that changes history, unless the user asks for it in this conversation. The user commits with the grove band or `grove commit` in their own terminal.
3. Never try to get around the commit gate: no `--no-verify`, `HUSKY=0`, `GROVE_ALLOW`, `grove allow`, `grove grant` or `--ui`.
4. To see what changed, use `grove diff --stat` (one line per file). To check a port between branches, use `grove cmp <a> <b>`.
5. Need code from another branch? Run `grove find <text>` to see which worktree has it, then tell the user. Do not switch branches here.
6. Keep notes for the next session in `.grove-task.md` at the worktree root: the ticket, decisions, files touched, what is left. Read it when you start.
7. Install dependencies with `grove install`, not `yarn` or `npm install`: the folder's `node_modules` is shared.
