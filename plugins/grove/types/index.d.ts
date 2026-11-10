// Shapes of what the grove CLI prints with --json, and the band's own state.
export type Dep = { rel: string; lock: string; state: string; shared: string }
export type Tree = {
  name: string; path: string; branch: string; main: boolean; here: boolean; session: string | null; missing: boolean
  base?: string; files?: number; add?: number; del?: number; uncommitted?: number; upstream?: boolean
  behind?: number; ahead?: number; baseMoved?: number; drift?: boolean; deps?: Dep[]; running?: string[]
}
export type Ls = { repo: string; main: string; root: string; protected: string[]; defaultBase: string; commitlint: boolean; trees: Tree[] }
// you: touched by your own commits since the base (git config user.email), or not committed
export type FileRow = { path: string; status: string; add: number; del: number; uncommitted: boolean; untracked?: boolean; you?: boolean }
// mine: not committed · you: written by you · changed: inside a hunk vs base (false = the 3 lines of context)
export type BlameLine = { n: number; sha: string; author: string; time: number; code: string; mine: boolean; you?: boolean; changed?: boolean }
export type Review = { file: string; lines: BlameLine[]; timeline: { sha: string; author: string; time: number; subject: string; you?: boolean }[]; uncommitted: boolean }
export type Cmp = { a: string; b: string; commits: { sha: string; subject: string; state: string; in: string | null }[]; files: { path: string; state: string }[] }
export type CommitForm = {
  kind: 'commit'; tree: string; branch: string; base: string
  files: (FileRow & { on: boolean })[]; target: 'current' | 'new'; newBase: string; newName: string; msg: string
  ports: string[]; mapping: string
}
export type View =
  | { kind: 'text'; title: string; text: string; tree?: string }
  | { kind: 'diff'; tree: string; files: FileRow[]; onlyYou?: boolean }
  | { kind: 'file'; tree: string; files: FileRow[]; idx: number; patch: string; offset: number }
  | { kind: 'review-list'; tree: string; files: FileRow[]; onlyYou?: boolean }
  | { kind: 'review'; tree: string; files: FileRow[]; data: Review; offset: number }
  | { kind: 'cmp'; tree: string; other: string; data: Cmp | null }
  | CommitForm
  | { kind: 'new'; ticket: string; base: string; type: string; pull: boolean }
  | { kind: 'push'; tree: string; branch: string }


declare module 'claude-code' {
  interface PluginState {
    grove: {
      data: Shaped<Ls | null>
      sel: Shaped<{ name: string | null; cwd: string }>
      view: Shaped<View | null>
      busy: string
      folded: Shaped<boolean>
      // the worktree whose "move here" was pressed once, waiting for the confirm press
      moving: string
      // the worktree whose "remove" was pressed once, waiting for the confirm press
      removing: string
      // shell pane: recent commands per worktree, newest first
      history: Shaped<Record<string, string[]>>
    }
  }
}
