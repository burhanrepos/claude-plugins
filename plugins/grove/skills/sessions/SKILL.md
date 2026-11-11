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

Every worktree removal stops the services running from it and merges its chats into the main checkout first:
- `grove rm <name>` and the band's remove button do both, remove the worktree, then delete the originals
- the band's remove button also works from the worktree's own chat: the chat moves to the main checkout (/cd) first, and its history is merged there
- a `git worktree remove` or ExitWorktree (remove) run by Claude: the grove hook runs `grove before-rm` first
- worktrees removed outside Claude (terminal, other tools): every new session runs `grove sessions --quiet`, which merges their chats and deletes the originals

Show the user the summary line it prints.
