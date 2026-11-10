# claude-plugins

Claude Code plugins by Burhan Shaheen, in one marketplace.

## Install

Add the marketplace once:

```
/plugin marketplace add burhanrepos/claude-plugins
```

Then install any plugin from it, for example:

```
/plugin install grove@burhanrepos
/reload-plugins
```

## Plugins

| Plugin | What it does |
|---|---|
| [grove](plugins/grove) | Git worktrees made easy: a band above the prompt to switch, diff, review, compare and commit, one chat per worktree (merged back with `grove sessions`), shared `node_modules`, and guards that keep agents in their own worktree. |

Each plugin folder has its own README with setup and usage.

## License

[MIT](LICENSE)
