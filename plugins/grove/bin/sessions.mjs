// Moves Claude Code chats from worktrees into the main checkout's chat list, so `claude --resume` in the main
// checkout still finds them after the worktree is gone. Each merged chat gets the title "[<worktree>] <its title>".
// Claude Code keeps chats in <config>/projects/<cwd with every non-alphanumeric char as "-">/<session>.jsonl,
// plus a <session>/ folder (subagents, tool results).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// ponytail: Claude Code shortens very long folder names (>200 chars) with a hash; those are not found here.
export const encode = p => path.resolve(p).replace(/[^a-zA-Z0-9]/g, '-')
export const projectsDir = () => path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects')
const inside = (child, parent) => {
  const r = path.relative(parent, child)
  return r === '' || (!!r && !r.startsWith('..') && !path.isAbsolute(r))
}

const RECENT_MS = 60000 // a chat written to this recently may still be open: it is copied, never deleted

export function readSession(file) {
  let custom = '', ai = '', prompt = '', cwd = '', branch = '', turns = 0
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue
    let o
    try { o = JSON.parse(line) } catch { continue }
    if (o.type === 'custom-title' && o.customTitle) custom = o.customTitle
    else if (o.type === 'ai-title' && o.aiTitle) ai = o.aiTitle
    if (o.cwd && !cwd) cwd = o.cwd // where the chat started, which is the folder it is filed under
    if (o.gitBranch) branch = o.gitBranch
    if (o.type === 'user' || o.type === 'assistant') turns++
    if (!prompt && o.type === 'user' && !o.isMeta) {
      const c = o.message?.content
      const text = typeof c === 'string' ? c : Array.isArray(c) ? c.find(x => x.type === 'text')?.text || '' : ''
      if (text && !text.startsWith('<')) prompt = text.replace(/\s+/g, ' ').trim().slice(0, 60)
    }
  }
  return { title: custom || ai || prompt, cwd, branch, turns }
}

export const titleFor = (name, title) => (title.startsWith(`[${name}]`) ? title : `[${name}] ${title || 'untitled'}`.trim())

// The chat folders that belong to worktrees of the repo whose main checkout is `main`:
// the live worktrees, plus folders of worktrees already deleted (their recorded cwd is gone and was a worktree,
// not a subfolder of the main checkout).
export function sources(main, live, dir = projectsDir()) {
  const out = new Map()
  for (const w of live) if (path.resolve(w) !== path.resolve(main)) out.set(encode(w), w)
  const prefix = encode(main) + '-'
  if (!fs.existsSync(dir)) return out
  for (const d of fs.readdirSync(dir)) {
    if (!d.startsWith(prefix) || out.has(d)) continue
    const cwd = fs.readdirSync(path.join(dir, d)).filter(f => f.endsWith('.jsonl')).map(f => readSession(path.join(dir, d, f)).cwd).find(Boolean)
    if (!cwd || fs.existsSync(cwd)) continue
    if (!inside(cwd, main) || inside(cwd, path.join(main, '.claude', 'worktrees'))) out.set(d, cwd)
  }
  return out
}

// Merges the chats of each source folder into the main checkout's folder.
// Copies while the worktree exists; once it is gone, the originals are deleted after the copy.
export function merge(main, srcs, { dryRun = false, dir = projectsDir(), now = Date.now() } = {}) {
  const dest = path.join(dir, encode(main))
  const lines = []
  let merged = 0, current = 0, cleaned = 0
  for (const [d, wt] of srcs) {
    const from = path.join(dir, d)
    if (!fs.existsSync(from)) continue
    const gone = !fs.existsSync(wt)
    for (const f of fs.readdirSync(from).filter(f => f.endsWith('.jsonl'))) {
      const src = path.join(from, f), to = path.join(dest, f)
      const s = readSession(src)
      if (!s.turns) continue
      const st = fs.statSync(src)
      // already merged: the copy is as new and at least as long (copy + title line)
      const fresh = fs.existsSync(to) && fs.statSync(to).mtimeMs >= st.mtimeMs && fs.statSync(to).size >= st.size
      const title = titleFor(path.basename(s.cwd || wt), s.title)
      if (!fresh) {
        lines.push(`  ${gone ? 'move' : 'copy'}  ${title}${s.branch ? `  (${s.branch})` : ''}`)
        merged++
        if (!dryRun) {
          fs.mkdirSync(dest, { recursive: true })
          fs.copyFileSync(src, to)
          const side = src.slice(0, -'.jsonl'.length)
          if (fs.existsSync(side)) fs.cpSync(side, to.slice(0, -'.jsonl'.length), { recursive: true, force: true })
          fs.appendFileSync(to, JSON.stringify({ type: 'custom-title', customTitle: title, sessionId: f.slice(0, -'.jsonl'.length) }) + '\n')
          fs.utimesSync(to, st.atime, st.mtime) // keeps its place in the resume list
        }
      } else current++
      if (gone && now - st.mtimeMs > RECENT_MS) {
        cleaned++
        if (!dryRun) {
          fs.rmSync(src, { force: true })
          fs.rmSync(src.slice(0, -'.jsonl'.length), { recursive: true, force: true })
        }
      }
    }
    if (gone && !dryRun) try { fs.rmdirSync(from) } catch {} // only when nothing else (memory/, …) is left
  }
  lines.push(`${dryRun ? 'dry run: ' : ''}${merged} merged, ${current} already in ${path.basename(main)}, ${cleaned} originals ${dryRun ? 'to delete' : 'deleted'} (worktree gone)`)
  return lines
}
