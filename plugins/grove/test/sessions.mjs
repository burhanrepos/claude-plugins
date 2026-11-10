// Run: node test/sessions.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { encode, sources, merge, readSession } from '../bin/sessions.mjs'

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'grove-sessions-')))
const dir = path.join(tmp, 'projects')
const main = path.join(tmp, 'zeus')
const live = path.join(main, '.claude', 'worktrees', 'live-one')
const dead = path.join(tmp, 'zeus-dead') // deleted sibling worktree
const sub = path.join(main, 'apps', 'web') // subfolder of main: not a worktree
fs.mkdirSync(live, { recursive: true })
fs.mkdirSync(sub, { recursive: true })

const old = Date.now() / 1000 - 3600
function chat(cwd, id, lines) {
  const d = path.join(dir, encode(cwd))
  fs.mkdirSync(path.join(d, id, 'subagents'), { recursive: true })
  fs.writeFileSync(path.join(d, id, 'subagents', 'a.jsonl'), '{}\n')
  const f = path.join(d, `${id}.jsonl`)
  fs.writeFileSync(f, lines.map(l => JSON.stringify({ cwd, sessionId: id, ...l })).join('\n') + '\n')
  fs.utimesSync(f, old, old)
  return f
}
const liveF = chat(live, 'aaa', [{ type: 'user', gitBranch: 'fix/x', message: { content: 'fix the pin bug' } }, { type: 'ai-title', aiTitle: 'PIN masking fix' }])
const deadF = chat(dead, 'bbb', [{ type: 'user', message: { content: [{ type: 'text', text: 'audit locations' }] } }, { type: 'custom-title', customTitle: 'Location audit' }])
chat(sub, 'ccc', [{ type: 'user', message: { content: 'web only' } }])

const src = sources(main, [main, live], dir)
assert.deepEqual([...src.values()].sort(), [dead, live].sort())

merge(main, src, { dir })
const to = path.join(dir, encode(main))
assert.equal(readSession(path.join(to, 'aaa.jsonl')).title, '[live-one] PIN masking fix')
assert.equal(readSession(path.join(to, 'bbb.jsonl')).title, '[zeus-dead] Location audit')
assert.ok(fs.existsSync(path.join(to, 'aaa', 'subagents', 'a.jsonl')))
assert.ok(fs.existsSync(liveF), 'live worktree keeps its original')
assert.ok(!fs.existsSync(deadF) && !fs.existsSync(path.dirname(deadF)), 'deleted worktree original removed')
assert.equal(Math.round(fs.statSync(path.join(to, 'aaa.jsonl')).mtimeMs / 1000), Math.round(old), 'keeps place in resume list')

// second run: nothing new, title not stacked
assert.match(merge(main, sources(main, [main, live], dir), { dir }).at(-1), /^0 merged, 1 already/)
assert.equal(readSession(path.join(to, 'aaa.jsonl')).title, '[live-one] PIN masking fix')

fs.rmSync(tmp, { recursive: true, force: true })
console.log('ok')
