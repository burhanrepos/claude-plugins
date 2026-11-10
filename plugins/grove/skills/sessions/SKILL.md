---
name: sessions
description: Merge Claude Code chats from git worktrees into the main checkout's resume list, each titled "[<worktree>] <title>". Use when the user asks to merge, collect, move or rescue worktree chats/sessions, when chats of a deleted worktree cannot be resumed, and always before removing a worktree.
---

`grove sessions` does the work (`node <this plugin's folder>/bin/grove.mjs sessions` if `grove` is not on PATH). Run it from any folder of the repo.

- `grove sessions` every worktree's chats, plus chats of worktrees already deleted
- `grove sessions <name>` one worktree
- `--dry-run` list what would be copied or moved, change nothing

What it does:
- copies each chat (and its subagent / tool-result folder) into the main checkout's chat folder and gives the copy the title `[<worktree>] <its title>`, so `claude --resume` in the main checkout lists it
- while the worktree exists the original stays, so its own chat keeps working; once the folder is gone, the original is deleted after the copy (except chats written to in the last minute)
- runs again safely: a chat already merged and not changed since is left alone

Before removing a worktree:
- prefer `grove rm <name>`: it merges the chats, removes the worktree, then deletes the originals
- a plain `git worktree remove` run by Claude is caught by the grove hook, which merges first; after it, run `grove sessions` once to delete the originals
- worktrees removed outside Claude (terminal, other tools): run `grove sessions` afterwards; it still finds their chats

Show the user the summary line it prints.
