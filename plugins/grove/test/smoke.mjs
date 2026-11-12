// Smoke test: builds a throwaway repo with a remote, then runs every grove command against it.
// Run: node test/smoke.mjs   (Linux, macOS, Windows; needs git and node only)
import { spawnSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const IS_WIN = process.platform === 'win32'
const GROVE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'bin', 'grove.mjs')
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'grove-test-')))
const binDir = path.join(tmp, 'bin')
fs.mkdirSync(binDir)
// A `grove` on PATH for the git hooks, like npm i -g makes.
if (IS_WIN) fs.writeFileSync(path.join(binDir, 'grove.cmd'), `@node "${GROVE}" %*\r\n`), fs.writeFileSync(path.join(binDir, 'grove'), `#!/bin/sh\nexec node "${GROVE}" "$@"\n`)
else fs.writeFileSync(path.join(binDir, 'grove'), `#!/bin/sh\nexec node "${GROVE}" "$@"\n`, { mode: 0o755 })
const env = {
  ...process.env,
  PATH: binDir + path.delimiter + process.env.PATH,
  XDG_CONFIG_HOME: path.join(tmp, 'config'),
  XDG_CACHE_HOME: path.join(tmp, 'cache'),
  APPDATA: path.join(tmp, 'config'),
  LOCALAPPDATA: path.join(tmp, 'cache'),
  HOME: tmp,
  USERPROFILE: tmp,
  CLAUDE_CONFIG_DIR: path.join(tmp, 'claude'),
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
  NO_COLOR: '1',
}
const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, env, encoding: 'utf8' })
const git = (args, cwd) => {
  const r = sh('git', args, cwd)
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}
const grove = (args, cwd) => sh(process.execPath, [GROVE, ...args], cwd)
const ok = (args, cwd) => {
  const r = grove(args, cwd)
  assert.equal(r.status, 0, `grove ${args.join(' ')} failed:\n${r.stdout}\n${r.stderr}`)
  return r.stdout
}
const json = (args, cwd) => JSON.parse(ok([...args, '--json'], cwd))
let n = 0
const step = (name, fn) => {
  fn()
  console.log(`ok ${++n} ${name}`)
}

// remote with main, internal, prod
const origin = path.join(tmp, 'origin.git')
git(['init', '--bare', '-b', 'main', origin], tmp)
const main = path.join(tmp, 'app')
git(['clone', origin, main], tmp)
fs.writeFileSync(path.join(main, '.gitignore'), 'node_modules\n.env\n')
fs.writeFileSync(path.join(main, 'package.json'), '{"name":"app"}\n')
fs.writeFileSync(path.join(main, 'yarn.lock'), '# lock v1\n')
fs.writeFileSync(path.join(main, 'app.js'), 'const a = 1\nconst b = 2\nconst c = 3\n')
git(['add', '.'], main)
git(['commit', '-m', 'init'], main)
git(['push', '-u', 'origin', 'main'], main)
for (const b of ['internal', 'prod']) git(['push', 'origin', `main:${b}`], main)
git(['fetch'], main)
git(['checkout', '-b', 'internal', 'origin/internal'], main)
fs.mkdirSync(path.join(main, 'node_modules', 'left-pad'), { recursive: true })
fs.writeFileSync(path.join(main, 'node_modules', 'left-pad', 'index.js'), 'module.exports = 1\n')
fs.writeFileSync(path.join(main, 'node_modules', '.yarn-integrity'), '{}\n') // installed after the lockfile, as yarn leaves it
fs.writeFileSync(path.join(main, '.env'), 'API=1\nSECRET=main\n')

step('setup writes config and installs the git gate', () => {
  ok(['setup', '--yes'], main)
  const cfg = JSON.parse(fs.readFileSync(path.join(tmp, 'config', 'grove', 'repos', 'app.json'), 'utf8'))
  assert.ok(cfg.protected.includes('internal') && cfg.protected.includes('prod'))
  assert.ok(fs.readFileSync(path.join(main, '.git', 'hooks', 'pre-commit'), 'utf8').includes('grove hook'))
})

let wt
step('new creates branch, folder, links node_modules to main, copies .env', () => {
  ok(['new', 'T-1', '--base', 'internal'], main)
  wt = path.join(tmp, 'app.worktrees', 't-1-internal')
  assert.ok(fs.existsSync(wt))
  assert.equal(git(['branch', '--show-current'], wt), 'fix/internal/T-1')
  assert.ok(fs.lstatSync(path.join(wt, 'node_modules')).isSymbolicLink())
  assert.ok(fs.existsSync(path.join(wt, 'node_modules', 'left-pad', 'index.js')))
  assert.equal(fs.readFileSync(path.join(wt, '.env'), 'utf8'), 'API=1\nSECRET=main\n')
  assert.equal(git(['status', '--porcelain'], wt), '', 'links and env must not show in git status')
})

step('ls --json lists both, here is marked', () => {
  const ls = json(['ls'], wt)
  assert.equal(ls.trees.length, 2)
  assert.ok(ls.trees.find(t => t.name === 't-1-internal').here)
  assert.equal(ls.trees.find(t => t.name === 'app').main, true)
})

step('diff shows a changed and an untracked file as not committed', () => {
  fs.writeFileSync(path.join(wt, 'app.js'), 'const a = 1\nconst b = 20\nconst c = 3\n')
  fs.writeFileSync(path.join(wt, 'new.js'), 'export {}\n')
  const d = json(['diff'], wt)
  assert.deepEqual(d.files.map(f => [f.path, f.status, f.uncommitted]), [['app.js', 'M', true], ['new.js', 'A', true]])
  assert.match(JSON.parse(ok(['diff', 't-1', 'app.js', '--json'], main)).patch, /\+const b = 20/)
})

step('review marks the uncommitted line', () => {
  const r = json(['review', 't-1', 'app.js'], main)
  assert.ok(r.lines.find(l => l.code === 'const b = 20').mine)
  assert.ok(r.lines.find(l => l.code === 'const a = 1' && !l.mine))
  assert.equal(r.timeline[0].subject, 'init')
})

step('plain git commit is blocked by the gate', () => {
  git(['add', '-A'], wt)
  const r = sh('git', ['commit', '-m', 'fix: sneaky'], wt)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /need your OK/)
  git(['reset', '-q'], wt)
})

step('commit without a terminal and without --ui is refused', () => {
  const r = grove(['commit', '-m', 'fix(t-1): change b'], wt)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /needs you/)
})

let wt2
step('commit --ui commits the chosen files and ports to another worktree', () => {
  ok(['new', 'T-1', '--base', 'prod', '--name', 't-1-prod'], main)
  wt2 = path.join(tmp, 'app.worktrees', 't-1-prod')
  const out = ok(['commit', 't-1-internal', '-m', 'fix(t-1): change b', '--files', 'app.js', '--port', 't-1-prod', '--ui'], main)
  assert.match(out, /commit {2}\w+ fix\(t-1\): change b · 1 files/)
  assert.match(out, /port {4}✓ t-1-prod/)
  assert.equal(git(['status', '--porcelain'], wt), '?? new.js', 'only the chosen file was committed')
  assert.equal(git(['log', '-1', '--format=%s'], wt2), 'fix(t-1): change b')
})

step('cmp sees the cherry-pick as ported', () => {
  const c = json(['cmp', 't-1-internal', 't-1-prod'], main)
  assert.deepEqual(c.commits.map(x => x.state), ['ported'])
  assert.equal(c.files.find(f => f.path === 'app.js').state, 'same')
})

step('protected branch commits are refused', () => {
  fs.writeFileSync(path.join(main, 'app.js'), 'changed\n')
  const r = grove(['commit', 'app', '-m', 'fix(x): on base', '--ui'], main)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /protected/)
  git(['checkout', '--', 'app.js'], main)
})

step('new chat starts from the worktree notes: new writes them, note adds a handoff, open sends them first', () => {
  const task = path.join(wt, '.grove-task.md')
  assert.match(fs.readFileSync(task, 'utf8'), /^# T-1\n[\s\S]*- Branch: fix\/internal\/T-1\n- Base: internal/)
  assert.ok(!git(['status', '--porcelain'], wt).includes('.grove-task.md'), 'task file stays out of git status')
  const r = spawnSync(process.execPath, [GROVE, 'note', 't-1-internal'], { cwd: main, env, encoding: 'utf8', input: 'Fix the login toast.\n' })
  assert.equal(r.status, 0, r.stderr)
  assert.match(fs.readFileSync(task, 'utf8'), /## Handoff \([^)]+\)\n\nFix the login toast\.\n$/)

  // open runs the agent through the configured terminal; capture the command instead of opening a tab
  const cfgDir = path.join(env.XDG_CONFIG_HOME, 'grove')
  const opened = path.join(tmp, 'opened.txt')
  fs.mkdirSync(cfgDir, { recursive: true })
  fs.writeFileSync(path.join(cfgDir, 'config.json'), JSON.stringify({ terminal: `echo {cmd} > ${opened}` }))
  try {
    ok(['open', 't-1-internal'], main)
    for (let i = 0; i < 50 && !fs.existsSync(opened); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100)
    const cmd = fs.readFileSync(opened, 'utf8')
    assert.match(cmd, /^claude You are starting in grove worktree t-1-internal \(branch fix\/internal\/T-1, base internal\)\./)
    assert.match(cmd, /Read \.grove-task\.md at the worktree root first/)
    assert.match(cmd, /The ticket is T-1: read it from Jira/)
  } finally {
    fs.rmSync(path.join(cfgDir, 'config.json'), { force: true })
  }
})

step('link-session and here give the resume command', () => {
  ok(['link-session', 'empty-chat'], wt)
  assert.equal(json(['here'], wt).session, null, 'chat closed before its first message is no link')
  assert.match(ok(['link-session', 'abc-123'], wt), /linked/, 'dead link does not block a new one')
  const chatDir = path.join(env.CLAUDE_CONFIG_DIR, 'projects', path.resolve(wt).replace(/[^a-zA-Z0-9]/g, '-'))
  fs.mkdirSync(chatDir, { recursive: true })
  fs.writeFileSync(path.join(chatDir, 'abc-123.jsonl'), '{}\n')
  const h = json(['here'], wt)
  assert.equal(h.session, 'abc-123')
  assert.ok(h.resume.includes('claude --resume abc-123') && h.resume.includes(wt))
  assert.match(ok(['link-session', 'other'], wt), /kept/)
})

step('different lockfile is not linked to main', () => {
  fs.writeFileSync(path.join(wt2, 'yarn.lock'), '# lock v2\n')
  git(['commit', '-qam', 'chore: bump lock', '--no-verify'], wt2)
  const t = json(['ls'], main).trees.find(x => x.name === 't-1-prod')
  assert.equal(t.deps[0].state, 'drift')
  ok(['sync', 't-1-prod'], main)
  assert.ok(!fs.existsSync(path.join(wt2, 'node_modules')), 'no shared copy yet, so no link')
})

step('env diff and pull', () => {
  fs.writeFileSync(path.join(main, '.env'), 'API=1\nSECRET=main\nNEW_KEY=x\n')
  assert.match(ok(['env', 't-1-internal'], main), /new in main: NEW_KEY/)
  ok(['env', 'pull', 't-1-internal'], main)
  assert.match(fs.readFileSync(path.join(wt, '.env'), 'utf8'), /NEW_KEY=x/)
})

step('rm refuses unpushed work, --force keeps main node_modules safe and stops servers running there', () => {
  const r = grove(['rm', 't-1-internal'], main)
  assert.notEqual(r.status, 0)
  // A detached dev server listening on a port, working folder inside the worktree.
  const server = IS_WIN ? null : spawn(process.execPath, ['-e', "require('net').createServer().listen(0,()=>console.log('up'))"], { cwd: wt, detached: true, stdio: ['ignore', 'pipe', 'ignore'] })
  if (server) {
    const until = Date.now() + 5000
    while (!server.stdout.read() && Date.now() < until) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},50)'])
  }
  const out = ok(['rm', 't-1-internal', '--force'], main)
  assert.ok(!fs.existsSync(wt))
  if (server) {
    assert.match(out, new RegExp(`stopped 1 server process still running from .*pid ${server.pid}`))
    // It is our child, so once killed it stays a zombie until reaped: gone or state Z both mean stopped.
    const state = sh('ps', ['-o', 'stat=', '-p', String(server.pid)]).stdout.trim()
    assert.ok(!state || state.startsWith('Z'), `server in the removed worktree must be stopped (ps stat: ${state})`)
  }
  assert.ok(fs.existsSync(path.join(main, 'node_modules', 'left-pad', 'index.js')), 'main node_modules must survive')
})

step('running services show on their worktree, move runs the move command there', () => {
  const cfgFile = path.join(tmp, 'config', 'grove', 'repos', 'app.json')
  const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'))
  const status = path.join(tmp, 'status.json')
  fs.writeFileSync(status, JSON.stringify({ services: [{ name: 'api', state: 'up', root: wt2 }, { name: 'old', state: 'stopped', root: main }] }))
  cfg.run = { status: `node -e "process.stdout.write(require('fs').readFileSync(process.argv[1],'utf8'))" "${status}"`, move: `node -e "require('fs').writeFileSync('moved.txt', process.argv[1])" "{services}"` }
  fs.writeFileSync(cfgFile, JSON.stringify(cfg))
  const ls = json(['ls'], main)
  assert.deepEqual(ls.trees.find(t => t.name === 't-1-prod').running, ['api'])
  assert.deepEqual(ls.trees.find(t => t.name === 'app').running, [])
  ok(['move', 'app', '--ui'], main)
  assert.equal(fs.readFileSync(path.join(main, 'moved.txt'), 'utf8'), 'api')
  fs.rmSync(path.join(main, 'moved.txt'))
})

step('new pulls the latest base (and fast-forwards local base); --no-pull keeps what is here', () => {
  const other = path.join(tmp, 'other')
  git(['clone', '-q', '-b', 'prod', origin, other], tmp)
  fs.writeFileSync(path.join(other, 'later.js'), 'x\n')
  git(['add', '.'], other)
  git(['commit', '-qm', 'later on prod', '--no-verify'], other)
  git(['push', '-q', 'origin', 'prod'], other)
  ok(['new', 'T-3', '--base', 'prod', '--no-pull', '--no-install'], main)
  assert.ok(!fs.existsSync(path.join(tmp, 'app.worktrees', 't-3-prod', 'later.js')), '--no-pull must not fetch')
  git(['branch', '-f', 'prod', git(['rev-parse', 'HEAD~1'], other)], main) // local base branch, behind origin
  assert.match(ok(['new', 'T-2', '--base', 'prod', '--no-install'], main), /local prod updated/)
  assert.ok(fs.existsSync(path.join(tmp, 'app.worktrees', 't-2-prod', 'later.js')))
  assert.equal(git(['rev-parse', 'prod'], main), git(['rev-parse', 'origin/prod'], main))
})

step('a key main lacks but another worktree has is added to a new worktree', () => {
  fs.appendFileSync(path.join(tmp, 'app.worktrees', 't-2-prod', '.env'), 'ONLY_IN_WT=yes\n')
  assert.match(ok(['new', 'T-4', '--base', 'prod', '--no-pull', '--no-install'], main), /added ONLY_IN_WT/)
  const env = fs.readFileSync(path.join(tmp, 'app.worktrees', 't-4-prod', '.env'), 'utf8')
  assert.match(env, /^SECRET=main$/m)
  assert.match(env, /^ONLY_IN_WT=yes$/m)
})

step('main node_modules older than its lockfile is not shared', () => {
  const nm = path.join(main, 'node_modules', '.yarn-integrity')
  const old = new Date(Date.now() - 60000)
  fs.utimesSync(nm, old, old) // a branch switch rewrote yarn.lock after the last install
  assert.match(ok(['new', 'T-5', '--base', 'internal', '--no-pull', '--no-install'], main), /differs from main, no shared copy yet/)
  fs.utimesSync(nm, new Date(), new Date())
})

step('shell-init prints a wrapper for each shell', () => {
  for (const s of ['bash', 'zsh', 'fish', 'pwsh']) assert.match(ok(['shell-init', s], main), /grove/)
})

fs.rmSync(tmp, { recursive: true, force: true })
console.log(`all ${n} passed`)
