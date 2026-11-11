# grove

Git worktrees made easy, for people and for any coding agent.

grove gives every branch its own folder, shares `node_modules` between worktrees with the same lockfile, keeps one agent chat per worktree, and stops agents from editing or committing outside their own worktree. In Claude Code, a band above the prompt lets you switch, diff, review, compare and commit with buttons.

Works on Linux, macOS and Windows. Needs git 2.36+ and Node 18+.

## Features

- **One folder per branch**, named after the ticket. `grove ls` shows them all, with lines changed and commits to pull or push.
- **Shared `node_modules`.** A worktree with the same lockfile as the main checkout gets a link, not an install. A different lockfile gets one shared install, reused by every worktree with that lockfile.
- **`.env` files copied** from the main checkout. `grove env` shows what differs, `grove env pull` brings changes in.
- **One agent chat per worktree.** `grove open` opens a new terminal tab and resumes that worktree's chat.
- **Review in Claude Code.** A band above the prompt with **diff**, **review** (who changed each line, and when), **compare** (port check), **commit**, **push** and **$ shell** (run a command in that worktree; output streams into the pane).
- **Guards.** Agents edit only their own worktree, and nothing is committed or pushed without you.

## Install

### 1. CLI

```bash
git clone https://github.com/burhanrepos/claude-plugins.git
npm install -g ./claude-plugins/plugins/grove
# or, without npm: ln -s "$PWD/claude-plugins/plugins/grove/bin/grove.mjs" ~/.local/bin/grove
```

### 2. Per repo, once

Run this from inside the repo. It asks before every change:

```bash
grove setup
```

It writes `~/.config/grove/repos/<repo>.json` (worktree folder, protected branches), installs the commit gate, and adds the `grove` shell function so `grove` alone can `cd`.

Nothing is added to your repo's `package.json` or `.gitignore`. All grove files live in your home folder or inside `.git`.

### 3. Claude Code plugin

Send each line as its own message:

```
/plugin marketplace add burhanrepos/claude-plugins
/plugin install grove@burhanrepos
/reload-plugins
```

## Everyday use

| You want | Band (Claude Code) | Terminal |
|---|---|---|
| See all worktrees | always shown above the prompt | `grove ls` |
| Go to one | press its chip, then **switch here** | `grove` (picker) or `grove go proj-123` |
| Its own chat | **open session** | `grove open proj-123` |
| New ticket | **+ new** (pulls latest base first; untick to skip) | `grove new PROJ-123 --base main` (`--no-pull` to skip) |
| What changed | **diff**, then click a file | `grove diff` / `grove diff proj-123 app.ts` |
| Who changed it and when | **review**, then click a file | `grove review proj-123 app.ts` |
| Did the port happen | **compare** | `grove cmp proj-123-main proj-123-release` |
| Commit | **commit** (form with files, message, target branch, ports) | `grove commit -m "fix(proj-123): …"` |
| Run a command | **$ shell**: type a command, Enter; one-shot, no prompts or editors | `cd "$(grove path <name>)" && …` |
| Push | **push** | `grove push` |
| Copy branch, path or resume command | ⧉ icons on the band | `grove here --copy branch` |
| Keep worktree chats in the main checkout | automatic on every remove | `grove sessions` (`--dry-run` to preview) |

Chip numbers: `+73 −9` is lines changed against the base branch; `2↓ 0↑` is commits to pull and to push. A quiet fetch every 10 minutes keeps `↓` current.

Run `grove help` for every command and flag.

### Sessions in another terminal

Each worktree remembers the first Claude chat opened in it (`.git/worktrees/<name>/grove.json`). The ⧉ after the session copies a full line such as:

```bash
cd '/home/you/work/myapp/.claude/worktrees/proj-123' && claude --resume 7f3a…
```

Paste it in any terminal. Claude Code keeps chats per folder, so the `cd` matters. The band there shows the same worktrees and numbers, because everything is read from git, not from the session.

### Merge chats into the main checkout

`grove sessions` copies every worktree's chats, including chats of worktrees already deleted, into the main checkout's chat list. Each copy is titled `[<worktree>] <title>`, so `claude --resume` in the main checkout finds it. Running it again is safe: chats already merged are left alone.

You rarely need to run it yourself. Chats are merged automatically:

- **`grove rm` and the band's remove button** merge the chats, remove the worktree, then delete the original chats.
- **`git worktree remove` or ExitWorktree run by Claude** is caught by the grove hook, which runs `grove before-rm` first: it stops the worktree's services and merges its chats.
- **Worktrees removed outside Claude** (terminal, other tools): every new Claude session runs `grove sessions --quiet`, which merges their chats and deletes the originals.

## Other coding agents

`rules/AGENTS.md` holds the rules for agents. Load it into each tool once:

| Tool | How |
|---|---|
| Claude Code | the plugin's skill and hooks; nothing else needed |
| Codex | `ln -s /path/to/grove/rules/AGENTS.md ~/.codex/AGENTS.md`, and in `~/.codex/config.toml`: `sandbox_mode = "workspace-write"`, `approval_policy = "on-request"` |
| Gemini CLI | `ln -s /path/to/grove/rules/AGENTS.md ~/.gemini/GEMINI.md` |
| Cursor | paste `rules/AGENTS.md` into Settings › Rules › User Rules |

To make `grove open` start Codex, set this in `~/.config/grove/config.json`:

```json
{ "agent": { "resume": "codex resume {session}", "fresh": "codex" } }
```

## Safety

- **Commit gate.** A git hook refuses every commit (and push, where the repo lets grove add a pre-push hook) unless it carries a one-time pass. Only you create passes: the band's **commit** / **push** buttons, `grove commit` / `grove push` answered in your own terminal, or `grove allow 10m` before using another git tool (VS Code, a rebase). For a real merge or backsync: `GROVE_ALLOW=1 git commit …`.
- **Protected branches** (from your config, for example `main` and `release`) refuse commits even with a pass.
- **Write fence (Claude Code).** Edits outside the chat's own worktree are refused. A chat in the main checkout cannot edit a worktree nested inside it, and the other way round.
- **Git ask (Claude Code).** `git add / commit / push / checkout / reset --hard / rebase / cherry-pick …` from the agent shows you an Allow / Deny question first.
- **Safe remove.** Every remove (`grove rm`, the band, or a `git worktree remove` by Claude) merges the worktree's chats into the main checkout first. `grove rm` refuses when there are uncommitted changes or unpushed commits. It unlinks shared `node_modules` before removing, so the shared copy is never deleted. It also stops what runs from the worktree first: services that `run.status` places there (through `run.stop`), then any process still listening on a port from inside the folder (Linux and macOS).

These guard against accidents, not against a tool built to get around them.

## Config

Per repo: `~/.config/grove/repos/<repo>.json` (Windows: `%APPDATA%\grove\repos\<repo>.json`).

```json
{
  "root": ".claude/worktrees",
  "protected": ["main", "release"],
  "defaultBase": "main",
  "branch": "{type}/{base}/{ticket}",
  "type": "fix",
  "commitGate": true
}
```

- `root`: where worktrees go, relative to the main checkout. Default `../<repo>.worktrees`. Inside the repo only if `.gitignore` covers it (`grove setup` checks).
- `run` (optional): hooks into your dev stack.
  - `status` prints JSON `[{name, state, root}]` (or `{services: […]}`).
  - `move` restarts services in the selected worktree. `{services}` is replaced; it runs inside that worktree.
  - `stop` stops services. `grove rm` runs it for the services in the worktree it removes.

  The band then shows `▶4` on the running worktree and **move here** on the others. Example:

  ```json
  "run": {
    "status": "./scripts/dev.sh status --json",
    "move": "./scripts/dev.sh restart {services}",
    "stop": "./scripts/dev.sh down {services}"
  }
  ```

Machine-wide: `~/.config/grove/config.json` holds `agent` and `terminal` (for example `"wezterm cli spawn --cwd {path} -- {cmd}"`).

A team can commit the same per-repo keys as `.grove.json` at the repo root. Your own file wins.

## Windows

- `node_modules` links are directory junctions: no admin rights or Developer Mode needed.
- `grove new` sets `core.longpaths` for the worktree.
- Git runs the hooks with its own `sh`, so the gate works from PowerShell, cmd and Git Bash.
- PowerShell: add `grove shell-init pwsh | Out-String | Invoke-Expression` to `$PROFILE`.
- New tabs open in Windows Terminal.

## Uninstall

1. `/plugin uninstall grove@burhanrepos` in Claude Code.
2. `npm rm -g @burhan/grove`.
3. Delete `~/.config/grove` and `~/.cache/grove`.
4. Remove the grove line from your shell profile and from `~/.huskyrc` (or `.git/hooks/pre-commit`).

## Develop

```bash
node test/smoke.mjs     # throwaway repo, runs every command
npm run typecheck       # type-checks the Claude Code band
```

## License

[MIT](LICENSE)
