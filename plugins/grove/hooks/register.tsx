import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

// grove for Claude Code: the worktree band above the prompt, a pane for diff / review / compare / commit,
// one chat linked per worktree, and guards that keep the agent inside its own worktree.
// Every button runs the grove CLI (bin/grove.mjs), so the terminal and other agents see the same data.

import type {
  BlameLine,
  Cmp,
  CommitForm,
  FileRow,
  Ls,
  Review,
  Tree,
  View,
} from "../types";

const PANE = "grove";
const data = atom({ plugin: "grove", key: "data" } as const, null, {
  shape: "ls-1",
});
const sel = atom(
  { plugin: "grove", key: "sel" } as const,
  { name: null, cwd: "" },
  { shape: "sel-1" },
);
const view = atom({ plugin: "grove", key: "view" } as const, null, {
  shape: "view-1",
});
const busy = atom({ plugin: "grove", key: "busy" } as const, "");
// Hidden by default: the summary lives in the status line. /grove shows the buttons, [−] hides them.
const folded = atom({ plugin: "grove", key: "folded" } as const, true, {
  shape: "fold-2",
});
const moving = atom({ plugin: "grove", key: "moving" } as const, "");
// the worktree whose "remove" was pressed once, waiting for the confirm press
const removing = atom({ plugin: "grove", key: "removing" } as const, "");
const history = atom(
  { plugin: "grove", key: "history" } as const,
  {},
  { shape: "history-1" },
);
const HISTORY_MAX = 15;
const SHELL_HINT = (tree: string) =>
  `Commands run in ${tree}. One-shot only: no prompts or editors. clear empties this pane · history lists past commands · !! reruns the last · !3 or !git reruns one.`;

// ---------- helpers ----------
const norm = (p: string) => {
  const s = p.replace(/\\/g, "/").replace(/\/+$/, "");
  return /^[a-z]:/i.test(s) ? s.toLowerCase() : s;
};
const inside = (child: string, parent: string) => {
  const c = norm(child),
    p = norm(parent);
  return c === p || c.startsWith(p + "/");
};
// The worktree a path belongs to: the deepest one holding it (zeus/.claude/worktrees/x lives inside zeus/).
const treeOf = (ls: Ls | null, p: string) =>
  (ls?.trees ?? [])
    .filter((t) => inside(p, t.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
// The band lists only the main checkout and worktrees under the repo's worktree root (.claude/worktrees).
// Guards still use the full list, so a chat in an older worktree elsewhere stays fenced.
const shownTrees = (ls: Ls) =>
  ls.trees.filter((t) => t.main || inside(t.path, ls.root));
const short = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;
const ago = (secs: number) => {
  if (!secs) return "";
  const d = Date.now() / 1000 - secs;
  for (const [n, u] of [
    [31536000, "y"],
    [2592000, "mo"],
    [604800, "w"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ] as const)
    if (d >= n) return `${Math.floor(d / n)}${u}`;
  return "now";
};
const isWinPath = (p: string) => /^[a-z]:[\\/]/i.test(p);
const resumeLine = (t: Tree) => {
  const cmd = t.session ? `claude --resume ${t.session}` : "claude";
  return isWinPath(t.path)
    ? `cd "${t.path}"; ${cmd}`
    : `cd '${t.path.replace(/'/g, `'\\''`)}' && ${cmd}`;
};

async function cli($: EngineInterface, args: string[], timeoutMs = 60000) {
  const cwd = await $.session.cwd();
  return $.process.run(["node", `${$.plugin.root}/bin/grove.mjs`, ...args], {
    cwd,
    timeoutMs: Math.min(600000, Math.max(1, Math.round(timeoutMs))), // host limit: 1 to 600000 ms
  });
}
async function cliJson<T>(
  $: EngineInterface,
  args: string[],
): Promise<T | null> {
  const r = await cli($, [...args, "--json"]);
  if (r.exitCode !== 0) {
    $.ui.toast(r.stderr.trim().split("\n").pop() || "grove failed");
    return null;
  }
  try {
    return JSON.parse(r.stdout) as T;
  } catch {
    return null;
  }
}

let refreshing = false;
let lastRefresh = 0;
async function refresh($: EngineInterface) {
  if (refreshing) return;
  refreshing = true;
  lastRefresh = Date.now();
  try {
    const cwd = await $.session.cwd();
    const r = await cli($, ["ls", "--json"], 60000);
    const ls: Ls | null = r.exitCode === 0 ? JSON.parse(r.stdout) : null;
    await update($, data, () => ls);
    // A new session, or one moved with /cd, starts with its own worktree selected.
    const s = await read($, sel);
    if (s.cwd !== cwd)
      await update($, sel, () => ({
        name: treeOf(ls, cwd)?.name ?? null,
        cwd,
      }));
  } catch {
    await update($, data, () => null);
  } finally {
    refreshing = false;
  }
}

const SEP = " · ";
async function act(
  $: EngineInterface,
  label: string,
  args: string[],
  timeoutMs = 600000,
) {
  if ((await read($, busy)).split(SEP).includes(label)) return null;
  await update($, busy, (b) => (b ? b + SEP + label : label));
  try {
    const r = await cli($, args, timeoutMs);
    return r;
  } finally {
    await update($, busy, (b) =>
      b
        .split(SEP)
        .filter((x) => x !== label)
        .join(SEP),
    );
    void refresh($);
  }
}
// Strips colour and cursor codes; hook tools write them even off a terminal.
// Keeps colour codes (SGR, `ESC[...m`) for the pane to draw; drops cursor moves and other codes.
const plain = (t: string) =>
  // eslint-disable-next-line no-control-regex
  t.replace(/\x1b\[[0-9;?]*[A-Za-ln-z]/g, "").replace(/\r(?!\n)/g, "\n");

/** Ask commands for colour even though they write to a pipe: git, chalk-based tools (nx, eslint, jest), BSD ls. */
const COLOR_ENV = {
  FORCE_COLOR: "1",
  CLICOLOR_FORCE: "1",
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "color.ui",
  GIT_CONFIG_VALUE_0: "always",
  TERM: "xterm-256color",
};

// The standard 16 terminal colours (VS Code dark palette), for codes 30-37 / 90-97.
const ANSI16 = [
  "#000000",
  "#cd3131",
  "#0dbc79",
  "#e5e510",
  "#2472c8",
  "#bc3fbc",
  "#11a8cd",
  "#e5e5e5",
  "#666666",
  "#f14c4c",
  "#23d18b",
  "#f5f543",
  "#3b8eea",
  "#d670d6",
  "#29b8db",
  "#ffffff",
];
const ansi256 = (n: number) => {
  if (n < 16) return ANSI16[n] ?? ANSI16[7];
  if (n >= 232) {
    const g = (8 + (n - 232) * 10).toString(16).padStart(2, "0");
    return `#${g}${g}${g}`;
  }
  const c = n - 16;
  const v = (x: number) => (x ? 55 + x * 40 : 0).toString(16).padStart(2, "0");
  return `#${v(Math.floor(c / 36))}${v(Math.floor(c / 6) % 6)}${v(c % 6)}`;
};
type Seg = { text: string; color?: string; bold?: boolean; dim?: boolean };
/** Splits a line on its colour codes into styled pieces, the way a terminal paints it. */
function ansiSegments(line: string): Seg[] {
  const out: Seg[] = [];
  let st: Omit<Seg, "text"> = {};
  // eslint-disable-next-line no-control-regex
  const re = /\x1b\[([0-9;]*)m/g;
  let at = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > at) out.push({ text: line.slice(at, m.index), ...st });
    at = re.lastIndex;
    const codes = (m[1] || "0").split(";").map(Number);
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i] ?? 0;
      if (c === 0) st = {};
      else if (c === 1) st = { ...st, bold: true };
      else if (c === 2) st = { ...st, dim: true };
      else if (c === 22) st = { ...st, bold: false, dim: false };
      else if (c === 39) st = { ...st, color: undefined };
      else if (c >= 30 && c <= 37) st = { ...st, color: ANSI16[c - 30] };
      else if (c >= 90 && c <= 97) st = { ...st, color: ANSI16[c - 82] };
      else if (c === 38 && codes[i + 1] === 5) {
        st = { ...st, color: ansi256(codes[i + 2] ?? 7) };
        i += 2;
      } else if (c === 38 && codes[i + 1] === 2) {
        const hex = (x?: number) => (x || 0).toString(16).padStart(2, "0");
        st = {
          ...st,
          color: `#${hex(codes[i + 2])}${hex(codes[i + 3])}${hex(codes[i + 4])}`,
        };
        i += 4;
      }
    }
  }
  if (at < line.length) out.push({ text: line.slice(at), ...st });
  return out;
}

/**
 * Runs a grove command and shows its output in the pane while it runs, like a terminal would.
 * Used for commit, where repo hooks can run for minutes and their log is the only clue when one fails.
 */
async function streamToPane(
  $: EngineInterface,
  label: string,
  title: string,
  args: string[],
  intro: string,
  opts: { argv?: string[]; cwd?: string; tree?: string; before?: string } = {},
) {
  if ((await read($, busy)).split(SEP).includes(label))
    return $.ui.toast("Already running.");
  await update($, busy, (b) => (b ? b + SEP + label : label));
  let text = (opts.before ?? "") + intro + "\n";
  let shown = 0;
  const show = () =>
    openPane($, { kind: "text", title, text, tree: opts.tree });
  await show();
  try {
    const cwd = opts.cwd ?? (await $.session.cwd());
    const child = $.process.spawn({
      argv: opts.argv ?? ["node", `${$.plugin.root}/bin/grove.mjs`, ...args],
      cwd,
      env: COLOR_ENV,
    });
    for await (const { text: piece } of child) {
      text += plain(piece);
      // ponytail: redraw at most every 300 ms; hooks can print thousands of lines.
      if (Date.now() - shown > 300) {
        shown = Date.now();
        await show();
      }
    }
    const { code } = await child.result;
    text += code === 0 ? "\n✓ done" : `\n✗ failed (exit ${code})`;
  } catch (err) {
    text += `\n✗ could not run grove: ${String(err)}`;
  } finally {
    await show();
    await update($, busy, (b) =>
      b
        .split(SEP)
        .filter((x) => x !== label)
        .join(SEP),
    );
    void refresh($);
  }
}

// ponytail: one-shot commands, not a PTY (the pane API has none): no prompts, editors or colours.
async function runShell(
  $: EngineInterface,
  tree: string,
  cmd: string,
  before = "",
) {
  // Bash-style history, since the pane's field gets no arrow keys:
  // `history` lists, `!!` reruns the last, `!3` the third in that list, `!git` the last starting with "git".
  const past = (await read($, history))[tree] ?? [];
  if (cmd === "history")
    return openPane($, {
      kind: "text",
      title: `shell: ${tree}`,
      text:
        before +
        "$ history\n" +
        (past.length
          ? past.map((c, i) => `${String(i + 1).padStart(3)}  ${c}`).join("\n")
          : "(no commands yet)") +
        "\n",
      tree,
    });
  if (cmd.startsWith("!")) {
    const q = cmd.slice(1);
    const hit =
      q === "!"
        ? past[0]
        : /^\d+$/.test(q)
          ? past[Number(q) - 1]
          : past.find((c) => c.startsWith(q));
    if (!hit) return $.ui.toast(`history: no match for ${cmd}`);
    cmd = hit;
  }
  // `clear` only prints screen codes, which the pane drops: handle it here, as a terminal would.
  if (/^(clear|cls|reset)$/.test(cmd))
    return openPane($, {
      kind: "text",
      title: `shell: ${tree}`,
      text: SHELL_HINT(tree),
      tree,
    });
  await update($, history, (h) => ({
    ...h,
    [tree]: [cmd, ...(h[tree] ?? []).filter((x) => x !== cmd)].slice(
      0,
      HISTORY_MAX,
    ),
  }));
  const where = await cli($, ["path", tree]);
  if (where.exitCode !== 0) return $.ui.toast(`No folder for ${tree}.`);
  // Keep the last ~400 lines of history above the new command, like a scrolled terminal.
  const kept = before.split("\n").slice(-400).join("\n");
  await streamToPane($, `shell ${tree}`, `shell: ${tree}`, [], `$ ${cmd}`, {
    argv: ["bash", "-lc", cmd],
    cwd: where.stdout.trim(),
    tree,
    before: kept ? kept + "\n" : "",
  });
}

const outputOf = (
  r: { exitCode: number; stdout: string; stderr: string } | null | undefined,
) =>
  r
    ? (r.stdout + (r.stderr ? "\n" + r.stderr : "")).trim()
    : "Already running.";

async function openPane($: EngineInterface, next: View) {
  await update($, view, () => next);
  await $.ui.open({ id: PANE, title: "grove" });
}

async function showDiff($: EngineInterface, tree: string) {
  const d = await cliJson<{ files: FileRow[] }>($, ["diff", tree]);
  if (d) await openPane($, { kind: "diff", tree, files: d.files });
}
async function showFile(
  $: EngineInterface,
  tree: string,
  files: FileRow[],
  idx: number,
) {
  const d = await cliJson<{ patch: string }>($, [
    "diff",
    tree,
    files[idx]?.path ?? "",
  ]);
  if (d)
    await openPane($, {
      kind: "file",
      tree,
      files,
      idx,
      patch: d.patch,
      offset: 0,
    });
}
/** Chip colours, shared by the band and the pane toolbar. */
const C = {
  diff: "#c2410c",
  review: "#a16207",
  cmp: "#0e7490",
  commit: "#be185d",
  push: "#4d7c0f",
  open: "#7c3aed",
  sw: "#2563eb",
  add: "#15803d",
  fold: "#475569",
  rm: "#b91c1c",
  shell: "#334155",
};

/** The per-worktree actions: drawn on the band and again on top of the pane. */
function treeActions($: EngineInterface, t: Tree, ls: Ls) {
  return [
    {
      key: "diff",
      label: "diff",
      color: C.diff,
      run: () => showDiff($, t.name),
    },
    {
      key: "review",
      label: "review",
      color: C.review,
      run: () => showReviewList($, t.name),
    },
    {
      key: "cmp",
      label: "compare",
      color: C.cmp,
      run: () =>
        openPane($, { kind: "cmp", tree: t.name, other: "", data: null }),
    },
    {
      key: "commit",
      label: "commit",
      color: C.commit,
      run: () => showCommit($, t),
    },
    {
      key: "shell",
      label: "$ shell",
      color: C.shell,
      run: () =>
        openPane($, {
          kind: "text",
          title: `shell: ${t.name}`,
          text: SHELL_HINT(t.name),
          tree: t.name,
        }),
    },
    {
      key: "push",
      label: "push",
      color: C.push,
      run: () => openPane($, { kind: "push", tree: t.name, branch: t.branch }),
    },
    {
      key: "open",
      label: "open session",
      color: C.open,
      run: async () => {
        const r = await cli($, ["open", t.name]);
        $.ui.toast(r.exitCode === 0 ? r.stdout.trim() : r.stderr.trim());
      },
    },
    {
      key: "switch",
      label: "switch here",
      color: C.sw,
      run: async () => {
        const here = treeOf(ls, await $.session.cwd());
        if (here && here.session && here.name !== t.name) {
          const a = await $.ui
            .ask(
              `This chat is linked to ${here.name}. Moving it to ${t.name} mixes two tickets in one chat. Move anyway?`,
              {
                options: ["Move", "Open its own session instead"],
                header: "switch",
              },
            )
            .catch(() => "");
          if (a !== "Move") {
            if (a) await cli($, ["open", t.name]);
            return;
          }
        }
        try {
          await $.command.run({ command: "cd", args: t.path });
        } catch {
          await $.ui.copy({ text: `/cd ${t.path}` });
          $.ui.toast(`Type /cd ${t.path} (copied)`);
        }
        void refresh($);
      },
    },
  ];
}

/**
 * Terminal-like colours for a log line. Only the shape of a line decides, never a word inside it,
 * so a branch named "...-error" stays plain.
 */
function lineStyle(l: string): {
  color?: string;
  bold?: boolean;
  dim?: boolean;
} {
  if (/^(Commands run in|Committing…)/.test(l)) return { dim: true }; // the pane's own hint
  if (l.startsWith("$ ")) return { color: "#38bdf8", bold: true }; // the command, like a prompt
  if (/^\s*✓/.test(l)) return { color: "#4ade80", bold: true };
  if (/^\s*✗/.test(l)) return { color: "#f87171", bold: true };
  if (/^\s*(error|fatal|ERR!?)\b|\berror( TS\d+)?:|^\s*✖|\bFAIL\b/i.test(l))
    return { color: "#f87171" };
  if (/^\s*(warn(ing)?|⚠)\b|\bwarning:/i.test(l)) return { color: "#fbbf24" };
  if (/^\s*(✔|PASS\b|Successfully|commit {2}[0-9a-f]{7})/.test(l))
    return { color: "#4ade80" };
  if (/^\s*(>|→|\[\w[\w:-]*\])/.test(l)) return { color: "#a78bfa" }; // task headers: nx, lint-staged
  return {};
}

/** Opens the pane on what it last showed, or closes it when it is up. */
async function togglePane($: EngineInterface) {
  const isUp = (await $.ui.panes()).some((p) => p.id === PANE);
  if (isUp) return $.ui.close({ id: PANE });
  const last = await read($, view);
  await openPane(
    $,
    last ?? {
      kind: "text",
      title: "grove",
      text: "Pick a worktree on the band, then press a button.",
    },
  );
}

async function showReviewList($: EngineInterface, tree: string) {
  const d = await cliJson<{ files: FileRow[] }>($, ["diff", tree]);
  if (d) await openPane($, { kind: "review-list", tree, files: d.files });
}
async function showReview(
  $: EngineInterface,
  tree: string,
  files: FileRow[],
  file: string,
) {
  const d = await cliJson<Review>($, ["review", tree, file]);
  if (d) await openPane($, { kind: "review", tree, files, data: d, offset: 0 });
}
async function showCmp($: EngineInterface, tree: string, other: string) {
  await openPane($, { kind: "cmp", tree, other, data: null });
  const d = await cliJson<Cmp>($, ["cmp", tree, other]);
  await update($, view, (v) =>
    v?.kind === "cmp" && v.tree === tree ? { ...v, other, data: d } : v,
  );
}
const ticketOf = (branch: string) =>
  (branch.match(/[A-Z][A-Z0-9]+-\d+/) || [""])[0];
const typeOf = (branch: string) =>
  branch.match(/(?:^|\/)(fix|feat|chore|refactor)\//)?.[1] ?? "fix";
async function showCommit($: EngineInterface, t: Tree) {
  const d = await cliJson<{ files: FileRow[] }>($, [
    "diff",
    t.name,
    "--uncommitted",
  ]);
  if (!d) return;
  if (!d.files.length) return $.ui.toast(`Nothing to commit in ${t.name}.`);
  const ls = await read($, data);
  const ticket = ticketOf(t.branch);
  await openPane($, {
    kind: "commit",
    tree: t.name,
    branch: t.branch,
    base: t.base || ls?.defaultBase || "main",
    files: d.files.map((f) => ({ ...f, on: true })),
    target: ls?.protected.includes(t.branch) ? "new" : "current",
    newBase: t.base || ls?.defaultBase || "main",
    newName: `${typeOf(t.branch)}/${t.base || ls?.defaultBase || "main"}/${ticket || "TICKET"}-short-name`,
    msg: `${typeOf(t.branch)}(${(ticket || "scope").toLowerCase()}): `,
    ports: [],
    mapping: "",
  });
}

// ---------- register ----------
// git commands that change the repo, and ways around the repo's commit hooks: both need the person's OK first.
const GIT_WRITE =
  /\bgit\b(?:\s+-[Cc]\s+\S+)*\s+(add|commit|push|reset\s+--hard|checkout|switch|rebase|merge|cherry-pick|stash|clean|restore|revert|am|worktree\s+(?:add|remove|move)|branch\s+-[dDmM])\b/;
const BYPASS =
  /GROVE_ALLOW|grove-pass|HUSKY=0|--no-verify|core\.hooksPath|\.huskyrc|\bgrove(\.mjs)?\b[^|;&]*(--ui\b|\bgrant\b|\ballow\b)/;

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await update($, busy, () => "");
    const registered = await Promise.allSettled([
      $.command.register({
        name: "grove",
        description:
          "Worktrees: ls, new, diff, review, cmp, env, find… (runs the grove CLI, no tokens)",
        argumentHint:
          "(no args: show/hide buttons) | ls | new | here | diff | review | cmp | env | find | help",
      }),
      $.command.register({
        name: "grove-panel",
        description: "Open the grove pane",
      }),
    ]);
    for (const r of registered)
      if (r.status === "rejected") $.ui.toast(`grove: ${String(r.reason)}`);
    await refresh($);
    // Link this chat to its worktree, so "open session" there resumes it later.
    const ls = await read($, data);
    const t = treeOf(ls, await $.session.cwd());
    if (t && !t.session) {
      const id = await $.session.id();
      await cli($, ["link-session", id, "--agent", "claude"]);
      void refresh($);
    }
    // Chats of worktrees removed since last time (terminal, ExitWorktree, git): into the main list, originals deleted.
    void cli($, ["sessions", "--quiet"], 120000);
    // Numbers stay fresh: every minute, after each turn, and a quiet fetch every 10 minutes for the ↓ counts.
    let lastFetch = 0;
    $.clock.every(15000, () => {
      void (async () => {
        if (!(await read($, data))) {
          if (Date.now() - lastRefresh > 30000) await refresh($);
          return;
        }
        if (Date.now() - lastFetch > 600000) {
          lastFetch = Date.now();
          await cli($, ["fetch"], 120000);
          await refresh($);
        } else if (Date.now() - lastRefresh > 60000) await refresh($);
      })();
    });
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    void refresh($);
    return next(e);
  });

  on("command.run", { command: "grove-panel" }, async ($) => {
    const ls = await read($, data);
    if (!ls) return { text: "Not inside a git repository." };
    const s = await read($, sel);
    await openPane($, {
      kind: "text",
      title: "grove",
      text: s.name
        ? `Selected: ${s.name}. Use the band buttons.`
        : "Pick a worktree on the band.",
    });
    return { text: "grove pane opened." };
  });

  on("command.run", { command: "grove" }, async ($, e) => {
    const args = e.args.trim().split(/\s+/).filter(Boolean);
    if (!args.length) {
      const hidden = await read($, folded);
      await update($, folded, () => !hidden);
      void refresh($);
      return {
        text: hidden
          ? "Worktrees shown above the prompt. Type /grove again to hide them."
          : "Worktrees hidden.",
      };
    }
    const first = args[0] ?? "";
    if (["commit", "push", "allow", "grant"].includes(first))
      return {
        text: `Use the band's ${first === "grant" ? "buttons" : first} button, or run grove ${first} in your own terminal.`,
      };
    const r = await cli($, args.length ? args : ["ls"], 300000);
    void refresh($);
    return { text: outputOf(r) || "Done." };
  });

  // ---------- git writes ask first ----------
  // Claude Code's own "Allow / Deny" prompt before any git write the agent runs, also in auto mode: the person decides
  // each time, instead of a hard no. Commands that skip the repo's commit hooks ask too, and say so.
  on("classic.PreToolUse", async ($, e, next) => {
    if (String(e.tool) !== "Bash" || !(await read($, data))) return next(e);
    const cmd = String((e as Record<string, unknown>).command ?? "");
    const shown = short(cmd.replace(/\s+/g, " "), 140);
    if (BYPASS.test(cmd))
      return { ask: `grove: this skips the repo's commit hooks or grove's gate. Allow only if you meant it: ${shown}` };
    const m = GIT_WRITE.exec(cmd);
    if (m) return { ask: `grove: Claude wants to run git ${m[1]}: ${shown}` };
    return next(e);
  });

  // ---------- guards: the agent edits only its own worktree, and git writes need your OK ----------
  on("tool.call", async ($, e, next) => {
    const ls = await read($, data);
    if (!ls) return next(e);
    const tool = String(e.tool);
    if (
      tool === "Write" ||
      tool === "Edit" ||
      tool === "MultiEdit" ||
      tool === "NotebookEdit"
    ) {
      const file = String(
        (e as Record<string, unknown>).file_path ??
          (e as Record<string, unknown>).notebook_path ??
          "",
      );
      if (!file) return next(e);
      const own = treeOf(ls, await $.session.cwd());
      const target = treeOf(ls, file);
      if (own && target && target.path !== own.path)
        return {
          deny: `grove: this chat works in worktree "${own.name}" (${own.path}). ${file} belongs to worktree "${target.name}". Edit files only inside ${own.path}. If the user wants that other worktree changed, tell them to open its own chat with the band's "open session" button.`,
        };
      return next(e);
    }
    // Removals grove does not run itself (`git worktree remove`, ExitWorktree): first merge that worktree's chats
    // into the main checkout's list and stop services running from it, like `grove rm` does.
    // The originals are deleted by the quiet `grove sessions` at the next session start.
    if (tool === "ExitWorktree" && (e as Record<string, unknown>).action === "remove") {
      await cli($, ["before-rm", "--path", await $.session.cwd()], 180000);
      return next(e);
    }
    if (tool !== "Bash") return next(e);
    const rm = /\bgit\b(?:\s+-C\s+("[^"]+"|'[^']+'|\S+))?[^|;&]*?\bworktree\s+remove\s+(?:-\S+\s+)*("[^"]+"|'[^']+'|[^\s|;&]+)/.exec(
      String((e as Record<string, unknown>).command ?? ""),
    );
    if (rm) {
      const unq = (s?: string) => (s ?? "").replace(/^["']|["']$/g, "");
      const base = rm[1] ? unq(rm[1]) : await $.session.cwd();
      const target = unq(rm[2]);
      await cli($, ["before-rm", "--path", target.startsWith("/") ? target : `${base}/${target}`], 180000);
    }
    // The OK itself is Claude Code's own permission prompt (classic.PreToolUse above); this runs once it was given.
    const m = GIT_WRITE.exec(String((e as Record<string, unknown>).command ?? ""));
    if (m && /^(commit|push|cherry-pick|merge|rebase|revert|am)/.test(m[1] ?? "")) {
      const own = treeOf(ls, await $.session.cwd());
      if (own)
        await cli($, ["grant", own.branch, "any", "--ms", "120000", "--ui"]);
    }
    return next(e);
  });

  // ---------- the band ----------
  // Only one hook draws the band: grove draws its rows and stacks any other plugin's band (zeus-dev) under them.
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const rest = await next(e);
    const mine = await (async () => {
      const ls = await read($, data);
      if (e.props.hasSurvey || !ls || !shownTrees(ls).length) return null;
      const { Box, Text, Button } = $.ui.resolve(e);
      const s = await read($, sel);
      const running = await read($, busy);
      const fold = await read($, folded);
      const askMove = await read($, moving);
      const askRm = await read($, removing);
      const chip = (label: string, bg: string) => (
        <Text backgroundColor={bg} color="#ffffff" bold>
          {` ${label} `}
        </Text>
      );
      // Hidden until /grove: the status line under the prompt carries the summary.
      if (fold) return null;
      const t = ls.trees.find((x) => x.name === s.name);
      const mainTree = ls.trees.find((x) => x.main);
      // removing the worktree this chat runs in: the chat moves to the main checkout first
      const rmHere = !!t && treeOf(ls, await $.session.cwd())?.path === t.path;
      const copy = async (what: string, text: string) => {
        const { isCopied } = await $.ui.copy({ text });
        $.ui.toast(
          isCopied ? `Copied ${what}` : `Could not copy here. ${what}: ${text}`,
        );
      };
      return (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
            <Text dimColor>grove</Text>
            {shownTrees(ls).map((x) => {
              const picked = x.name === s.name;
              const dot = x.missing
                ? "red"
                : x.main
                  ? "gray"
                  : x.uncommitted
                    ? "yellow"
                    : "green";
              return (
                <Button
                  plain
                  key={`grove-chip-${x.name}`}
                  label={x.name}
                  onPress={() =>
                    void update($, sel, (v) => ({
                      ...v,
                      name: v.name === x.name ? null : x.name,
                    }))
                  }
                >
                  <Text
                    backgroundColor={picked ? "#2563eb" : undefined}
                    color={picked ? "#ffffff" : undefined}
                  >
                    <Text color={picked ? "#ffffff" : dot}>●</Text>
                    <Text bold> {x.name}</Text>
                    {x.files ? (
                      <Text color={picked ? "#dbeafe" : "green"}>
                        {" "}
                        +{x.add}
                      </Text>
                    ) : null}
                    {x.files ? (
                      <Text color={picked ? "#dbeafe" : "red"}> −{x.del}</Text>
                    ) : null}
                    <Text color={picked ? "#dbeafe" : "cyan"}>
                      {" "}
                      {x.behind ?? 0}↓ {x.ahead ?? 0}↑
                    </Text>
                    {x.running?.length ? (
                      <Text color={picked ? "#bbf7d0" : "green"} bold>
                        {" "}
                        ▶{x.running.length}
                      </Text>
                    ) : null}
                    {x.drift ? <Text color="yellow"> drift</Text> : null}{" "}
                  </Text>
                </Button>
              );
            })}
            <Button
              plain
              key="grove-new-top"
              label="new worktree"
              onPress={() =>
                void openPane($, {
                  kind: "new",
                  ticket: "",
                  base: ls.defaultBase || "main",
                  type: "fix",
                  pull: true,
                })
              }
            >
              {chip("+ new worktree", C.add)}
            </Button>
            <Button
              plain
              key="grove-refresh"
              label="refresh"
              onPress={async () => {
                $.ui.toast("Refreshing worktrees…");
                const r = await act($, "refreshing", ["fetch"], 120000);
                $.ui.toast(
                  r && r.exitCode === 0
                    ? "Worktrees refreshed."
                    : `Refreshed from disk; fetch failed: ${outputOf(r).split("\n").pop()}`,
                );
              }}
            >
              {chip("⟳ refresh", C.fold)}
            </Button>
            <Button
              plain
              key="grove-pane"
              label="pane"
              onPress={() => void togglePane($)}
            >
              {chip("▤ pane", C.fold)}
            </Button>
            <Button
              plain
              key="grove-fold"
              label="hide"
              onPress={() => void update($, folded, () => true)}
            >
              <Text dimColor>[−]</Text>
            </Button>
            {running ? <Text color="yellow"> {running}…</Text> : null}
          </Box>
          {t ? (
            <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
              <Text dimColor>selected:</Text>
              <Text bold>{t.name}</Text>
              {treeActions($, t, ls).map((a) => (
                <Button
                  plain
                  key={`grove-${a.key}`}
                  label={a.label}
                  onPress={() => void a.run()}
                >
                  {chip(a.label, a.color)}
                </Button>
              ))}
              {(() => {
                const runsHere = t.running ?? [];
                const elsewhere = ls.trees.filter(
                  (o) => o.name !== t.name && o.running?.length,
                );
                if (runsHere.length)
                  return (
                    <Text color="green">
                      ▶ running here: {runsHere.join(", ")}
                    </Text>
                  );
                if (!elsewhere.length) return null;
                const from = elsewhere.map((o) => o.name).join(", ");
                return askMove === t.name ? (
                  <Box flexDirection="row" columnGap={1}>
                    <Button
                      plain
                      key="grove-move-yes"
                      label="move here"
                      onPress={async () => {
                        await update($, moving, () => "");
                        const r = await act($, `moving services to ${t.name}`, [
                          "move",
                          t.name,
                          "--ui",
                        ]);
                        $.ui.toast(
                          r && r.exitCode === 0
                            ? `Services now run from ${t.name}`
                            : outputOf(r).split("\n").pop() || "move failed",
                        );
                      }}
                    >
                      {chip(`move here from ${short(from, 30)}`, C.open)}
                    </Button>
                    <Button
                      plain
                      key="grove-move-no"
                      label="cancel"
                      onPress={() => void update($, moving, () => "")}
                    >
                      {chip("cancel", C.fold)}
                    </Button>
                  </Box>
                ) : (
                  <Button
                    plain
                    key="grove-move"
                    label="move here"
                    onPress={async () => {
                      await update($, moving, () => t.name);
                      $.clock.after(
                        6000,
                        () =>
                          void update($, moving, (m) =>
                            m === t.name ? "" : m,
                          ),
                      );
                    }}
                  >
                    {chip("move here", C.open)}
                  </Button>
                );
              })()}
              {t.main ? null : askRm === t.name ? (
                (() => {
                  const loss = [
                    t.uncommitted ? `${t.uncommitted} uncommitted` : "",
                    t.ahead ? `${t.ahead} unpushed` : "",
                    t.running?.length
                      ? `services running: ${t.running.join(", ")}`
                      : "",
                    rmHere
                      ? `this chat moves to ${mainTree?.name ?? "the main checkout"} and is merged there`
                      : "chats merged into " + (mainTree?.name ?? "the main checkout"),
                  ].filter(Boolean);
                  const force = !!(t.uncommitted || t.ahead);
                  return (
                    <Box flexDirection="row" columnGap={1}>
                      <Text color="red" bold>
                        Are you sure?
                        {loss.length ? ` (${loss.join(" · ")})` : ""}
                      </Text>
                      <Button
                        plain
                        key="grove-rm-yes"
                        label="yes, remove"
                        onPress={async () => {
                          $.ui.toast(`Removing ${t.name}…`);
                          try {
                            const here = treeOf(ls, await $.session.cwd());
                            if (here && here.path === t.path && mainTree) {
                              try {
                                await $.command.run({ command: "cd", args: mainTree.path });
                              } catch {
                                await $.ui.copy({ text: `/cd ${mainTree.path}` });
                                $.ui.toast(
                                  `This chat runs in ${t.name}. Type /cd ${mainTree.path} (copied), then remove again.`,
                                );
                                return;
                              }
                            }
                            const r = await act($, `removing ${t.name}`, [
                              "rm",
                              t.name,
                              ...(force ? ["--force"] : []),
                            ]);
                            $.ui.log(
                              `grove remove ${t.name}: ${r ? `exit ${r.exitCode}: ${outputOf(r)}` : "skipped, already running"}`,
                              { to: "debug" },
                            );
                            const ok = !!r && r.exitCode === 0;
                            if (ok)
                              await update($, sel, (v) =>
                                v.name === t.name ? { ...v, name: null } : v,
                              );
                            $.ui.toast(
                              ok
                                ? `Removed ${t.name}. Branch ${t.branch} kept.`
                                : outputOf(r).split("\n").pop() ||
                                    "remove failed",
                            );
                          } catch (err) {
                            $.ui.toast(
                              `Remove failed: ${String(err).slice(0, 200)}`,
                            );
                          } finally {
                            await update($, removing, () => "");
                          }
                        }}
                      >
                        {chip(
                          force ? "yes, remove and lose work" : "yes, remove",
                          C.rm,
                        )}
                      </Button>
                      <Button
                        plain
                        key="grove-rm-no"
                        label="cancel"
                        onPress={() => void update($, removing, () => "")}
                      >
                        {chip("cancel", C.fold)}
                      </Button>
                    </Box>
                  );
                })()
              ) : (
                <Button
                  plain
                  key="grove-rm"
                  label="remove"
                  onPress={async () => {
                    await update($, removing, () => t.name);
                    $.clock.after(
                      8000,
                      () =>
                        void update($, removing, (m) =>
                          m === t.name ? "" : m,
                        ),
                    );
                  }}
                >
                  {chip("remove", C.rm)}
                </Button>
              )}
            </Box>
          ) : null}
          {t ? (
            <Box flexDirection="column" marginTop={1} paddingLeft={4}>
              <Box flexDirection="row" columnGap={1}>
                <Text dimColor>{"branch    "}</Text>
                <Text>{t.branch}</Text>
                <Button
                  plain
                  key="grove-copy-branch"
                  label="copy branch"
                  onPress={() => void copy("branch", t.branch)}
                >
                  <Text color="cyan">⧉</Text>
                </Button>
              </Box>
              <Box flexDirection="row" columnGap={1}>
                <Text dimColor>{"session   "}</Text>
                <Text>{t.session ?? "none"}</Text>
                {t.session ? (
                  <Button
                    plain
                    key="grove-copy-session"
                    label="copy resume command"
                    onPress={() => void copy("resume command", resumeLine(t))}
                  >
                    <Text color="cyan">⧉</Text>
                  </Button>
                ) : null}
              </Box>
              <Box flexDirection="row" columnGap={1}>
                <Text dimColor>{"path      "}</Text>
                <Text wrap="truncate-middle">{t.path}</Text>
                <Button
                  plain
                  key="grove-copy-path"
                  label="copy path"
                  onPress={() => void copy("path", t.path)}
                >
                  <Text color="cyan">⧉</Text>
                </Button>
              </Box>
              {t.uncommitted ? (
                <Text>
                  <Text dimColor>{"changes    "}</Text>
                  <Text color="yellow">{t.uncommitted} not committed</Text>
                </Text>
              ) : null}
              {t.baseMoved ? (
                <Text>
                  <Text dimColor>{"base       "}</Text>moved {t.baseMoved}{" "}
                  commits since you branched
                </Text>
              ) : null}
              {t.drift ? (
                <Text>
                  <Text dimColor>{"deps       "}</Text>
                  <Text color="yellow">drift: /grove sync {t.name}</Text>
                </Text>
              ) : null}
            </Box>
          ) : null}
        </Box>
      );
    })();
    if (!mine) return rest;
    const { Box, Text } = $.ui.resolve(e);
    return (
      <Box flexDirection="column">
        {(() => {
          // Gradient divider above grove's rows (sits under zeus-dev's band): dim edges, bright middle, a ✦ in the centre.
          const w = Math.max(20, e.props.bodyColumns - 2);
          const half = Math.floor((w - 3) / 2);
          const stops = [
            "#1e293b",
            "#334155",
            "#475569",
            "#6366f1",
            "#8b5cf6",
            "#a78bfa",
            "#c4b5fd",
          ];
          const seg = (n: number, rev: boolean) => {
            const cols = rev ? [...stops].reverse() : stops;
            const per = Math.max(1, Math.ceil(n / cols.length));
            return cols.map((c, i) => {
              const len = Math.max(0, Math.min(per, n - i * per));
              return len ? (
                <Text key={`gd-${rev ? "r" : "l"}-${i}`} color={c}>
                  {"━".repeat(len)}
                </Text>
              ) : null;
            });
          };
          return (
            <Text>
              {seg(half, false)}
              <Text color="#f0abfc" bold>
                {" "}
                ✦{" "}
              </Text>
              {seg(w - 3 - half, true)}
            </Text>
          );
        })()}
        {mine}
        {rest}
      </Box>
    );
  });

  // A clickable "▸ grove" at the end of the hint line under the prompt: shows or hides the buttons above it.
  // Always there, also while typing or while Claude works; the engine's hint text stays in front of it.
  on("ui.render", { component: "PromptHint" }, async ($, e, next) => {
    const ls = await read($, data);
    if (!ls || e.surface !== "terminal") return next(e);
    const { Box, Button, Text } = $.ui.resolve(e);
    const hidden = await read($, folded);
    // Draw the line as the engine and the other plugins drew it (zeus-dev adds "▾ Hide dev"), then this button after it.
    const rest = await next(e);
    return (
      <Box flexDirection="row" columnGap={1}>
        {rest}
        <Button
          plain
          key="grove-hint"
          label="grove"
          onPress={() => void update($, folded, () => !hidden)}
        >
          <Text color="#c084fc">
            {hidden ? "▸ Worktrees" : "▾ Hide worktrees"}
          </Text>
        </Button>
      </Box>
    );
  });

  // ---------- the pane ----------
  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    const body = await (async () => {
      const els = $.ui.resolve(e);
      const { Box, Text, Button } = els;
      // Text fields and pickers exist in the terminal, desktop and VS Code; on mobile the forms say where to go.
      const Input = "Input" in els ? els.Input : null;
      const Select = "Select" in els ? els.Select : null;
      const v = await read($, view);
      const ls = await read($, data);
      const rows = Math.max(10, (e.viewport?.rows ?? 30) - 6);
      const back = (label: string, to: () => void) => (
        <Button
          plain
          dimColor
          key={`back-${label}`}
          label={`← ${label}`}
          onPress={to}
        />
      );
      const close = (
        <Button
          plain
          dimColor
          key="pane-close"
          label="close"
          onPress={() => void $.ui.close({ id: PANE })}
        />
      );
      if (!v || !ls)
        return (
          <Text dimColor>
            Pick a worktree on the band, then press a button.
          </Text>
        );
      const setV = (f: (x: View) => View) =>
        void update($, view, (x) => (x ? f(x) : x));

      if (v.kind === "text") {
        const recent = v.tree ? ((await read($, history))[v.tree] ?? []) : [];
        return (
          <Box flexDirection="column">
            <Box flexDirection="row" columnGap={2}>
              <Text bold>{v.title}</Text>
              {close}
            </Box>
            {v.text
              .split("\n")
              .slice(-rows)
              .map((l) => {
                // Coloured output keeps the tool's own colours; plain lines (ours, or tools without colour) get lineStyle.
                // eslint-disable-next-line no-control-regex
                if (/\x1b\[/.test(l))
                  return (
                    <Text>
                      {ansiSegments(l).map((g) => (
                        <Text color={g.color} bold={g.bold} dimColor={g.dim}>
                          {g.text}
                        </Text>
                      ))}
                    </Text>
                  );
                const st = lineStyle(l);
                return (
                  <Text color={st.color} bold={st.bold} dimColor={st.dim}>
                    {l}
                  </Text>
                );
              })}
            {v.tree && Input ? (
              <Input
                key={`shell-${v.tree}`}
                label="$"
                placeholder="command, e.g. git status · yarn nx lint web-dash"
                onSubmit={(cmd: string) => {
                  const c = cmd.trim();
                  if (c) void runShell($, v.tree!, c, v.text);
                }}
                submitLabel="run"
                autoFocus
              />
            ) : null}
          </Box>
        );
      }

      if (v.kind === "diff" || v.kind === "review-list") {
        const review = v.kind === "review-list";
        let lastDir = "";
        const yoursN = v.files.filter((f) => f.you).length;
        const shown = v.files
          .map((f, i) => ({ f, i }))
          .filter(({ f }) => !v.onlyYou || f.you);
        return (
          <Box flexDirection="column">
            <Box flexDirection="row" columnGap={2}>
              <Text bold>
                {review ? "review" : "diff"}: {v.tree}
              </Text>
              <Text dimColor>
                {v.files.length} files · {yoursN} yours
              </Text>
              <Button
                plain
                key="only-you"
                label={v.onlyYou ? "show all" : "only yours"}
                onPress={() =>
                  setV((x) =>
                    x.kind === "diff" || x.kind === "review-list"
                      ? { ...x, onlyYou: !x.onlyYou }
                      : x,
                  )
                }
              >
                <Text
                  backgroundColor={v.onlyYou ? "#0e7490" : "#334155"}
                  color="#ffffff"
                >
                  {v.onlyYou ? " ✓ only yours " : " only yours "}
                </Text>
              </Button>
              {close}
            </Box>
            <Text dimColor>
              <Text color="cyan">●</Text> yours <Text color="gray">○</Text>{" "}
              others <Text color="yellow">◆</Text> not committed{" "}
              <Text color="green">A</Text> added <Text color="yellow">M</Text>{" "}
              modified <Text color="red">D</Text> deleted
            </Text>
            {!v.files.length ? (
              <Text color="green">No changes vs base.</Text>
            ) : null}
            {shown.map(({ f, i }) => {
              const dir = f.path.includes("/")
                ? f.path.slice(0, f.path.lastIndexOf("/") + 1)
                : "./";
              const head =
                dir !== lastDir ? <Text color="blue">{dir}</Text> : null;
              lastDir = dir;
              return (
                <Box flexDirection="column">
                  {head}
                  <Button
                    plain
                    key={`f-${i}`}
                    label={f.path}
                    onPress={() =>
                      void (review
                        ? showReview($, v.tree, v.files, f.path)
                        : showFile($, v.tree, v.files, i))
                    }
                  >
                    <Text dimColor={!f.you}>
                      {" "}
                      {f.uncommitted ? (
                        <Text color="yellow">◆</Text>
                      ) : f.you ? (
                        <Text color="cyan">●</Text>
                      ) : (
                        <Text color="gray">○</Text>
                      )}{" "}
                      <Text
                        color={
                          f.status === "A"
                            ? "green"
                            : f.status === "D"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {f.status}
                      </Text>{" "}
                      <Text bold={f.you}>
                        {f.path.slice(dir === "./" ? 0 : dir.length)}
                      </Text>
                      <Text color="green"> +{f.add}</Text>
                      <Text color="red"> −{f.del}</Text>
                      {f.uncommitted ? (
                        <Text color="yellow"> not committed</Text>
                      ) : null}
                    </Text>
                  </Button>
                </Box>
              );
            })}
          </Box>
        );
      }

      if (v.kind === "file") {
        const lines = v.patch
          .split("\n")
          .filter((l) => !/^(diff --git|index |--- |\+\+\+ )/.test(l));
        const page = lines.slice(v.offset, v.offset + rows - 2);
        const f = v.files[v.idx] ?? {
          path: "",
          status: "M",
          add: 0,
          del: 0,
          uncommitted: false,
        };
        return (
          <Box flexDirection="column">
            <Box flexDirection="row" columnGap={2}>
              {back(
                "files",
                () =>
                  void openPane($, {
                    kind: "diff",
                    tree: v.tree,
                    files: v.files,
                  }),
              )}
              {v.idx > 0 ? (
                <Button
                  plain
                  dimColor
                  key="prev"
                  label="‹ prev"
                  onPress={() => void showFile($, v.tree, v.files, v.idx - 1)}
                />
              ) : null}
              {v.idx < v.files.length - 1 ? (
                <Button
                  plain
                  dimColor
                  key="next"
                  label="next ›"
                  onPress={() => void showFile($, v.tree, v.files, v.idx + 1)}
                />
              ) : null}
              {v.offset > 0 ? (
                <Button
                  plain
                  dimColor
                  key="up"
                  label="▲ page"
                  onPress={() =>
                    setV((x) =>
                      x.kind === "file"
                        ? { ...x, offset: Math.max(0, x.offset - (rows - 2)) }
                        : x,
                    )
                  }
                />
              ) : null}
              {v.offset + rows - 2 < lines.length ? (
                <Button
                  plain
                  dimColor
                  key="down"
                  label="▼ page"
                  onPress={() =>
                    setV((x) =>
                      x.kind === "file"
                        ? { ...x, offset: x.offset + rows - 2 }
                        : x,
                    )
                  }
                />
              ) : null}
              {close}
            </Box>
            <Text bold>
              {f.path}
              {f.uncommitted ? (
                <Text color="yellow"> (not committed)</Text>
              ) : null}
            </Text>
            <Text dimColor>
              <Text backgroundColor="#14532d" color="#bbf7d0">
                {" "}
                + added{" "}
              </Text>{" "}
              <Text backgroundColor="#7f1d1d" color="#fecaca">
                {" "}
                − removed{" "}
              </Text>{" "}
              <Text color="cyan">@@ where in the file</Text>
            </Text>
            {page.map((l) => {
              const add = l.startsWith("+"),
                del = l.startsWith("-"),
                hunk = l.startsWith("@@");
              return (
                <Text
                  wrap="truncate-end"
                  backgroundColor={
                    add ? "#14532d" : del ? "#7f1d1d" : undefined
                  }
                  color={
                    add
                      ? "#bbf7d0"
                      : del
                        ? "#fecaca"
                        : hunk
                          ? "cyan"
                          : undefined
                  }
                  bold={hunk}
                  dimColor={!add && !del && !hunk}
                >
                  {(l || " ").padEnd(
                    Math.max(10, (e.viewport?.columns ?? 100) - 4),
                  )}
                </Text>
              );
            })}
          </Box>
        );
      }

      if (v.kind === "review") {
        const page = v.data.lines.slice(v.offset, v.offset + rows - 8);
        let prev = 0;
        return (
          <Box flexDirection="column">
            <Box flexDirection="row" columnGap={2}>
              {back(
                "files",
                () =>
                  void openPane($, {
                    kind: "review-list",
                    tree: v.tree,
                    files: v.files,
                  }),
              )}
              {v.offset > 0 ? (
                <Button
                  plain
                  dimColor
                  key="rup"
                  label="▲ page"
                  onPress={() =>
                    setV((x) =>
                      x.kind === "review"
                        ? { ...x, offset: Math.max(0, x.offset - (rows - 8)) }
                        : x,
                    )
                  }
                />
              ) : null}
              {v.offset + rows - 8 < v.data.lines.length ? (
                <Button
                  plain
                  dimColor
                  key="rdown"
                  label="▼ page"
                  onPress={() =>
                    setV((x) =>
                      x.kind === "review"
                        ? { ...x, offset: x.offset + rows - 8 }
                        : x,
                    )
                  }
                />
              ) : null}
              {close}
            </Box>
            <Text bold>{v.data.file}</Text>
            <Text dimColor>
              <Text color="green">▌</Text>changed on this branch{" "}
              <Text color="cyan" bold>
                You
              </Text>{" "}
              your commits <Text color="yellow">◆ You</Text> not committed dim =
              3 lines of context
            </Text>
            {page.map((l) => {
              const gap = prev && l.n > prev + 1;
              prev = l.n;
              const changed = l.changed ?? true;
              const who = l.mine
                ? "◆ You · not committed"
                : `${l.sha} ${l.you ? "You" : short(l.author || "", 11)}`;
              const whoColor = l.mine ? "yellow" : l.you ? "cyan" : "gray";
              const bg = !changed
                ? undefined
                : l.mine
                  ? "#3f3a12"
                  : l.you
                    ? "#0c3440"
                    : "#1f2937";
              return (
                <Box flexDirection="column">
                  {gap ? <Text dimColor>{"      ⋮"}</Text> : null}
                  <Text wrap="truncate-end" dimColor={!changed}>
                    <Text
                      color={
                        changed
                          ? l.mine
                            ? "yellow"
                            : l.you
                              ? "cyan"
                              : "green"
                          : undefined
                      }
                    >
                      {changed ? "▌" : " "}
                    </Text>
                    <Text color={whoColor} bold={l.you && changed}>
                      {who.padEnd(22).slice(0, 22)}
                    </Text>
                    <Text dimColor>
                      {" "}
                      {(l.mine ? "now" : ago(l.time)).padStart(4)}{" "}
                    </Text>
                    <Text dimColor> {String(l.n).padStart(4)} </Text>
                    <Text backgroundColor={bg}>
                      {(l.code || " ").padEnd(
                        Math.max(10, (e.viewport?.columns ?? 100) - 40),
                      )}
                    </Text>
                  </Text>
                </Box>
              );
            })}
            <Text bold>timeline</Text>
            {v.data.uncommitted ? (
              <Text color="yellow"> now not committed</Text>
            ) : null}
            {v.data.timeline.slice(0, 6).map((t) => (
              <Text wrap="truncate-end" dimColor={!t.you}>
                <Text dimColor> {ago(t.time).padEnd(5)} </Text>
                <Text color="yellow">{t.sha}</Text>{" "}
                <Text color={t.you ? "cyan" : "gray"} bold={t.you}>
                  {(t.you ? "You" : short(t.author, 14)).padEnd(14)}
                </Text>{" "}
                {t.subject}
              </Text>
            ))}
          </Box>
        );
      }

      if (!Input || !Select) {
        if (v.kind === "cmp" || v.kind === "commit" || v.kind === "new")
          return (
            <Text dimColor>
              This form needs the terminal, desktop app or VS Code.
            </Text>
          );
      }

      if (v.kind === "cmp" && Select) {
        const others = shownTrees(ls).filter(
          (x) => x.name !== v.tree && !x.missing,
        );
        return (
          <Box flexDirection="column">
            <Box flexDirection="row" columnGap={2}>
              <Text bold>compare: {v.tree} →</Text>
              {close}
            </Box>
            <Select
              key="cmp-other"
              label="with"
              value={v.other || undefined}
              options={others.map((x) => ({
                value: x.name,
                label: `${x.name}  ${short(x.branch, 50)}`,
              }))}
              onSelect={(o: string) => void showCmp($, v.tree, o)}
            />
            {v.other && !v.data ? <Text dimColor>comparing…</Text> : null}
            {v.data ? (
              <Box flexDirection="column">
                <Text bold>commits</Text>
                {!v.data.commits.length ? (
                  <Text dimColor> {v.tree} has no commits of its own yet</Text>
                ) : null}
                {v.data.commits.map((c) => (
                  <Text wrap="truncate-end">
                    {"  "}
                    <Text
                      color={
                        c.state === "missing"
                          ? "red"
                          : c.state === "ported"
                            ? "green"
                            : "yellow"
                      }
                    >
                      {c.state === "missing"
                        ? "✗ missing "
                        : c.state === "ported"
                          ? "✓ ported  "
                          : "≈ edited  "}
                    </Text>
                    <Text dimColor>{c.sha}</Text> {c.subject}
                  </Text>
                ))}
                <Text bold>files</Text>
                {v.data.files
                  .filter((f) => f.state !== "same")
                  .map((f) => (
                    <Text wrap="truncate-end">
                      {"  "}
                      {f.path}{" "}
                      <Text
                        color={f.state === "differs" ? "yellow" : undefined}
                        dimColor={f.state !== "differs"}
                      >
                        {f.state === "only-a"
                          ? `only in ${v.data!.a}`
                          : f.state === "only-b"
                            ? `only in ${v.data!.b}`
                            : f.state}
                      </Text>
                    </Text>
                  ))}
                <Text dimColor>
                  {" "}
                  same in both:{" "}
                  {v.data.files.filter((f) => f.state === "same").length}
                </Text>
              </Box>
            ) : null}
          </Box>
        );
      }

      if (v.kind === "commit" && Input && Select) {
        const target = v.target === "new" ? v.newName.trim() : v.branch;
        const protectedTarget = ls.protected.includes(target);
        const chosen = v.files.filter((f) => f.on);
        const msgOk = ls.commitlint
          ? /^(feat|fix|chore|refactor|docs|test|perf|style|ci|build|revert)(\([^)]+\))?!?: \S.{2,}/.test(
              v.msg.trim(),
            )
          : v.msg.trim().length > 3;
        const others = shownTrees(ls).filter(
          (x) => x.name !== v.tree && !x.main && !x.missing,
        );
        const canGo =
          !protectedTarget && chosen.length > 0 && msgOk && !!target;
        const set = (patch: Partial<CommitForm>) =>
          setV((x) => (x.kind === "commit" ? { ...x, ...patch } : x));
        const go = async () => {
          if (!canGo) return;
          const args = [
            "commit",
            v.tree,
            "-m",
            v.msg.trim(),
            "--files",
            chosen.map((f) => f.path).join(","),
            "--ui",
          ];
          if (v.target === "new")
            args.push("--to", target, "--base", v.newBase);
          if (v.ports.length) args.push("--port", v.ports.join(","));
          if (v.mapping) args.push("--new-mapping", v.mapping);
          await streamToPane(
            $,
            `committing ${v.tree}`,
            `commit: ${v.tree}`,
            args,
            "Committing… repo hooks (lint-staged, prettier, commitlint) log below as they run.",
          );
        };
        return (
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="row" columnGap={2}>
              <Text bold>commit: {v.tree}</Text>
              {close}
            </Box>
            <Select
              key="c-target"
              label="Commit to"
              value={v.target}
              options={[
                { value: "current", label: `${v.branch} (this worktree)` },
                { value: "new", label: "+ new branch from a base…" },
              ]}
              onSelect={(o: string) => set({ target: o as "current" | "new" })}
            />
            {v.target === "new" ? (
              <Box flexDirection="column">
                <Select
                  key="c-base"
                  label="Base branch"
                  value={v.newBase}
                  options={ls.protected.map((b) => ({ value: b, label: b }))}
                  onSelect={(o: string) => set({ newBase: o })}
                />
                <Input
                  key="c-name"
                  label="New branch"
                  value={v.newName}
                  onInput={(x: string) => set({ newName: x })}
                  onSubmit={(x: string) => set({ newName: x })}
                  submitLabel="ok"
                />
              </Box>
            ) : null}
            <Box flexDirection="column">
              <Text dimColor>Files (press to leave one out)</Text>
              {v.files.map((f, i) => (
                <Button
                  plain
                  key={`c-f-${i}`}
                  label={f.path}
                  onPress={() =>
                    set({
                      files: v.files.map((g, j) =>
                        j === i ? { ...g, on: !g.on } : g,
                      ),
                    })
                  }
                >
                  <Text color={f.on ? undefined : "gray"}>
                    {f.on ? "[x]" : "[ ]"} {f.path}{" "}
                    <Text color="green">+{f.add}</Text>{" "}
                    <Text color="red">−{f.del}</Text>
                  </Text>
                </Button>
              ))}
            </Box>
            <Input
              key="c-msg"
              label="Message"
              rows={2}
              value={v.msg}
              placeholder="fix(sab-123): what changed"
              onInput={(x: string) => set({ msg: x })}
              onSubmit={() => void go()}
              submitLabel="commit"
              autoFocus
            />
            {!msgOk ? (
              <Text color="red">
                {ls.commitlint
                  ? "commitlint: type(scope): subject, for example fix(sab-3808): show server login error"
                  : "Write a message."}
              </Text>
            ) : null}
            {others.length ? (
              <Box flexDirection="column">
                <Text dimColor>
                  Also port to (cherry-pick after the commit)
                </Text>
                {others.map((o) => (
                  <Button
                    plain
                    key={`c-p-${o.name}`}
                    label={o.name}
                    onPress={() =>
                      set({
                        ports: v.ports.includes(o.name)
                          ? v.ports.filter((p) => p !== o.name)
                          : [...v.ports, o.name],
                      })
                    }
                  >
                    <Text color={v.ports.includes(o.name) ? undefined : "gray"}>
                      {v.ports.includes(o.name) ? "[x]" : "[ ]"} {o.name}{" "}
                      <Text dimColor>{short(o.branch, 50)}</Text>
                    </Text>
                  </Button>
                ))}
              </Box>
            ) : null}
            <Select
              key="c-map"
              label="+ new mapping branch"
              value={v.mapping || "none"}
              options={[
                { value: "none", label: "none" },
                ...ls.protected
                  .filter((b) => b !== v.base)
                  .map((b) => ({ value: b, label: `mapping/${b}/…` })),
              ]}
              onSelect={(o: string) => set({ mapping: o === "none" ? "" : o })}
            />
            <Box flexDirection="column">
              {protectedTarget ? (
                <Text color="red" bold>
                  {target} is protected. Choose "+ new branch from a base".
                </Text>
              ) : (
                <Text>
                  <Text bold>{target}</Text>
                  {v.target === "new" ? (
                    <Text dimColor> (new, from {v.newBase})</Text>
                  ) : null}{" "}
                  ← will commit <Text bold>{chosen.length}</Text> file
                  {chosen.length === 1 ? "" : "s"}
                </Text>
              )}
              {v.ports.length || v.mapping ? (
                <Text dimColor>
                  then port to:{" "}
                  {[
                    ...v.ports,
                    ...(v.mapping ? [`new mapping/${v.mapping}/…`] : []),
                  ].join(", ")}
                </Text>
              ) : null}
              <Text dimColor>push: no (separate button)</Text>
            </Box>
            <Box flexDirection="row" columnGap={2}>
              <Button
                plain
                variant="primary"
                key="c-go"
                label="commit"
                onPress={() => void go()}
              >
                <Text
                  backgroundColor={canGo ? "#be185d" : "#475569"}
                  color="#ffffff"
                  bold
                >
                  {canGo
                    ? ` Commit ${chosen.length} file${chosen.length === 1 ? "" : "s"} to ${short(target.split("/").pop() || target, 30)} `
                    : " Commit blocked "}
                </Text>
              </Button>
              <Button
                plain
                dimColor
                key="c-cancel"
                label="cancel"
                onPress={() => void $.ui.close({ id: PANE })}
              />
            </Box>
          </Box>
        );
      }

      if (v.kind === "push") {
        return (
          <Box flexDirection="column" gap={1}>
            <Text bold>push: {v.tree}</Text>
            <Text>
              Push <Text bold>{v.branch}</Text> to origin?
            </Text>
            <Box flexDirection="row" columnGap={2}>
              <Button
                plain
                key="p-go"
                label="push"
                onPress={async () => {
                  await openPane($, {
                    kind: "text",
                    title: `push: ${v.tree}`,
                    text: "Pushing…",
                  });
                  const r = await act($, `pushing ${v.tree}`, [
                    "push",
                    v.tree,
                    "--ui",
                  ]);
                  await openPane($, {
                    kind: "text",
                    title: `push: ${v.tree}`,
                    text: outputOf(r),
                  });
                }}
              >
                <Text backgroundColor="#4d7c0f" color="#ffffff" bold>
                  {" "}
                  Push{" "}
                </Text>
              </Button>
              <Button
                plain
                dimColor
                key="p-cancel"
                label="cancel"
                onPress={() => void $.ui.close({ id: PANE })}
              />
            </Box>
          </Box>
        );
      }

      if (v.kind === "new" && Input && Select) {
        const set = (patch: Partial<Extract<View, { kind: "new" }>>) =>
          setV((x) => (x.kind === "new" ? { ...x, ...patch } : x));
        // This chat is "busy" when it already has prompts and is linked to a worktree (not the main
        // checkout). Then the new worktree gets its own chat; otherwise this chat moves there.
        const myId = await $.session.id();
        const here = treeOf(ls, await $.session.cwd());
        const busyChat =
          (await $.session.turns()) > 0 &&
          !!here &&
          !here.main &&
          here.session === myId;
        const go = async () => {
          const ticket = v.ticket.trim();
          if (!ticket) return $.ui.toast("Type a ticket or branch name.");
          await openPane($, {
            kind: "text",
            title: "new worktree",
            text: `Creating ${ticket} from ${v.base}…`,
          });
          const r = await act($, `creating ${ticket}`, [
            "new",
            ticket,
            "--base",
            v.base,
            "--type",
            v.type,
            ...(v.pull ? [] : ["--no-pull"]),
          ]);
          const dir = r?.exitCode === 0 ? /^folder\s+(.+)$/m.exec(r.stdout)?.[1]?.trim() : undefined;
          let note = "";
          if (dir) {
            const name = dir.split(/[\\/]/).pop()!;
            if (busyChat) {
              // This chat knows why the worktree exists: it writes the handoff the new chat starts from, then opens it.
              const grove = `node ${$.plugin.root}/bin/grove.mjs`;
              void $.prompt.submit({
                text:
                  `Grove created worktree ${name} (${dir}) from this chat for: ${ticket}. ` +
                  `Write a short handoff for its new chat: pipe markdown into \`${grove} note ${name}\` with what I want done there, ` +
                  `the context and decisions from this chat that matter for it, relevant files, and open questions (no secrets). ` +
                  `Then run \`${grove} open ${name}\` to open its chat. Do not edit files in that worktree.`,
              });
              note = `\n\nThis chat has work on ${here!.name}, so ${name} gets its own chat: this chat writes its handoff, then opens it.`;
            } else {
              await cli($, ["link-session", myId, "--in", name, "--force"]);
              try {
                await $.command.run({ command: "cd", args: dir });
                note = `\n\nThis chat moved to ${name} and is linked to it.`;
              } catch {
                await $.ui.copy({ text: `/cd ${dir}` });
                note = `\n\nLinked this chat to ${name}. Type /cd ${dir} (copied) to move it there.`;
              }
              void refresh($);
            }
          }
          await openPane($, {
            kind: "text",
            title: "new worktree",
            text: outputOf(r) + note,
          });
        };
        return (
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="row" columnGap={2}>
              <Text bold>new worktree</Text>
              {close}
            </Box>
            <Input
              key="n-ticket"
              label="Ticket or branch"
              value={v.ticket}
              placeholder="SAB-3901 or fix/internal/SAB-3901-login"
              onInput={(x: string) => set({ ticket: x })}
              onSubmit={() => void go()}
              submitLabel="create"
              autoFocus
            />
            <Select
              key="n-base"
              label="Base branch"
              value={v.base}
              options={ls.protected.map((b) => ({ value: b, label: b }))}
              onSelect={(o: string) => set({ base: o })}
            />
            <Button
              plain
              key="n-pull"
              label="pull latest"
              onPress={() => set({ pull: !v.pull })}
            >
              <Text>
                {v.pull ? "[x]" : "[ ]"} pull latest {v.base} from origin first
              </Text>
            </Button>
            <Select
              key="n-type"
              label="Type"
              value={v.type}
              options={["fix", "feat", "chore", "refactor"].map((x) => ({
                value: x,
                label: x,
              }))}
              onSelect={(o: string) => set({ type: o })}
            />
            <Text color="cyan">
              {busyChat
                ? `This chat has work on ${here!.name}: a new chat opens in the new worktree, linked to it.`
                : "This chat moves into the new worktree and is linked to it."}
            </Text>
            <Text dimColor>
              Folder: {ls.root}/
              {(v.ticket.split("/").pop() || "ticket").toLowerCase()}-{v.base} ·
              node_modules shared by lockfile · .env copied from main
            </Text>
            <Button plain key="n-go" label="create" onPress={() => void go()}>
              <Text backgroundColor="#15803d" color="#ffffff" bold>
                {" "}
                Create{" "}
              </Text>
            </Button>
          </Box>
        );
      }
      return <Text dimColor>Nothing to show.</Text>;
    })();
    // Every pane view gets the selected worktree's actions on top, the same ones the band has.
    const s = await read($, sel);
    const ls = await read($, data);
    const t = ls?.trees.find((x) => x.name === s.name);
    if (!t || !ls) return body;
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          <Text bold>{t.name}</Text>
          {treeActions($, t, ls).map((a) => (
            <Button
              plain
              key={`pane-${a.key}`}
              label={a.label}
              onPress={() => void a.run()}
            >
              <Text backgroundColor={a.color} color="#ffffff" bold>
                {` ${a.label} `}
              </Text>
            </Button>
          ))}
        </Box>
        {body}
      </Box>
    );
  });
};
