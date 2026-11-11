#!/usr/bin/env node
// grove: git worktrees made easy, for people and for any coding agent.
// One file, no dependencies. Needs git 2.36+ and Node 18+. Linux, macOS and Windows.
import { spawnSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import * as chats from './sessions.mjs'

const VERSION = '0.3.0'
const IS_WIN = process.platform === 'win32'
const HOME = os.homedir()
const CONFIG_DIR = IS_WIN ? path.join(process.env.APPDATA || HOME, 'grove') : path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'grove')
const CACHE_DIR = IS_WIN ? path.join(process.env.LOCALAPPDATA || HOME, 'grove') : path.join(process.env.XDG_CACHE_HOME || path.join(HOME, '.cache'), 'grove')
const PASS_FILE = 'grove-pass.json'
const PASS_MS = 15000
const LOCKS = {
  'yarn.lock': 'yarn install --frozen-lockfile',
  'package-lock.json': 'npm ci',
  'pnpm-lock.yaml': 'pnpm install --frozen-lockfile',
  'bun.lock': 'bun install --frozen-lockfile',
  'bun.lockb': 'bun install --frozen-lockfile',
}
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nx', '.claude', '.turbo', '.cache', 'tmp'])

// ---------- small helpers ----------
class Fail extends Error {}
const die = msg => { throw new Fail(msg) }
const color = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s))
const dim = s => c(2, s), red = s => c(31, s), green = s => c(32, s), yellow = s => c(33, s), blue = s => c(34, s), bold = s => c(1, s)
const say = (...a) => console.log(...a)
const isTTY = () => !!(process.stdin.isTTY && process.stderr.isTTY)

function run(cmd, args, cwd, opts = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 256 << 20, windowsHide: true, ...opts })
  if (r.error && r.error.code === 'ENOENT') return { ok: false, out: '', err: `${cmd} not found`, code: 127, missing: true }
  return { ok: r.status === 0, out: (r.stdout || '').replace(/\r?\n$/, ''), err: (r.stderr || '').trim(), code: r.status }
}
const git = (args, cwd, opts) => run('git', args, cwd, opts)
const gitOut = (args, cwd) => {
  const r = git(args, cwd)
  return r.ok ? r.out : ''
}
const hasCache = {}
const has = cmd => (hasCache[cmd] ??= run(IS_WIN ? 'where' : 'which', [cmd]).ok)
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() || path.resolve(a) === path.resolve(b)
const inside = (child, parent) => {
  const rel = path.relative(path.resolve(parent), path.resolve(child))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}
const readJSON = (f, d = {}) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'))
  } catch {
    return d
  }
}
const writeJSON = (f, v) => {
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n')
}
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12)
const lstat = p => {
  try {
    return fs.lstatSync(p)
  } catch {
    return null
  }
}
const isLink = p => !!lstat(p)?.isSymbolicLink()
const exists = p => !!lstat(p)
const age = secs => {
  const d = Date.now() / 1000 - secs
  for (const [n, u] of [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'min']])
    if (d >= n) return `${Math.floor(d / n)} ${u}${Math.floor(d / n) > 1 ? 's' : ''}`
  return 'now'
}
// padEnd by what is visible, so colour codes do not break the columns.
const padV = (s, n) => s + ' '.repeat(Math.max(0, n - String(s).replace(/\x1b\[[0-9;]*m/g, '').length))
const quote = s => (IS_WIN ? `"${s}"` : `'${String(s).replace(/'/g, `'\\''`)}'`)

function parseArgs(argv) {
  const pos = [], flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') {
      pos.push(...argv.slice(i + 1))
      break
    }
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split(/=(.*)/s)
      if (v !== undefined) flags[k] = v
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('-') && VALUE_FLAGS.has(k)) flags[k] = argv[++i]
      else flags[k] = true
    } else if (a === '-m' && argv[i + 1] !== undefined) flags.message = argv[++i]
    else pos.push(a)
  }
  return { pos, flags }
}
const VALUE_FLAGS = new Set(['wrap', 'services', 'ms', 'base', 'branch', 'type', 'name', 'message', 'files', 'port', 'new-mapping', 'copy', 'agent', 'to', 'for', 'path'])

function ask(question) {
  if (!isTTY()) return ''
  process.stderr.write(question)
  const buf = Buffer.alloc(1024)
  let s = ''
  for (;;) {
    let n = 0
    try {
      n = fs.readSync(0, buf, 0, buf.length, null)
    } catch (e) {
      if (e.code === 'EAGAIN') continue
      return s.trim()
    }
    if (!n) break
    s += buf.toString('utf8', 0, n)
    if (s.includes('\n')) break
  }
  return s.trim()
}
const yes = q => /^y(es)?$/i.test(ask(`${q} [y/N] `))

// ---------- repo, config, metadata ----------
function worktreesRaw(cwd) {
  const r = git(['worktree', 'list', '--porcelain', '-z'], cwd)
  if (!r.ok) die('Not inside a git repository (or git is older than 2.36).')
  const list = []
  let cur = null
  for (const field of r.out.split('\0')) {
    if (!field) {
      if (cur) list.push(cur)
      cur = null
      continue
    }
    const [k, ...rest] = field.split(' ')
    const v = rest.join(' ')
    if (k === 'worktree') cur = { path: path.resolve(v) }
    else if (!cur) continue
    else if (k === 'branch') cur.branch = v.replace(/^refs\/heads\//, '')
    else if (k === 'HEAD') cur.head = v
    else if (k === 'detached') cur.detached = true
    else if (k === 'bare') cur.bare = true
    else if (k === 'prunable') cur.prunable = true
  }
  if (cur) list.push(cur)
  return list.filter(w => !w.bare)
}

function repo(cwd = process.cwd()) {
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd)
  if (!common.ok) die('Not inside a git repository.')
  const list = worktreesRaw(cwd)
  const main = list[0].path
  const name = path.basename(main)
  return { common: path.resolve(common.out), main, name, cfg: loadConfig(name, main), list, cwd: path.resolve(cwd) }
}

function loadConfig(name, main) {
  const global = readJSON(path.join(CONFIG_DIR, 'config.json'))
  const inRepo = readJSON(path.join(main, '.grove.json'))
  const mine = readJSON(path.join(CONFIG_DIR, 'repos', `${name}.json`))
  const cfg = {
    root: `../${name}.worktrees`,
    protected: ['main', 'master'],
    defaultBase: '',
    branch: '{type}/{base}/{ticket}',
    type: 'fix',
    agent: { resume: 'claude --resume {session}', fresh: 'claude' },
    terminal: '',
    commitGate: true,
    ...global,
    ...inRepo,
    ...mine,
  }
  cfg.agent = { resume: 'claude --resume {session}', fresh: 'claude', ...(global.agent || {}), ...(inRepo.agent || {}), ...(mine.agent || {}) }
  return cfg
}
const rootDir = R => (path.isAbsolute(R.cfg.root) ? R.cfg.root : path.resolve(R.main, R.cfg.root))

function gitDirOf(wt) {
  return gitOut(['rev-parse', '--absolute-git-dir'], wt)
}
const metaFile = wt => path.join(gitDirOf(wt), 'grove.json')
const readMeta = wt => readJSON(metaFile(wt))
function writeMeta(wt, patch) {
  const m = { ...readMeta(wt), ...patch }
  writeJSON(metaFile(wt), m)
  return m
}

const refExists = (cwd, ref) => git(['rev-parse', '--verify', '--quiet', ref], cwd).ok
function remoteHead(cwd) {
  return gitOut(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], cwd).replace(/^origin\//, '')
}
function baseOf(R, branch, meta) {
  if (meta.base) return meta.base
  for (const seg of (branch || '').split('/')) if (R.cfg.protected.includes(seg) && refExists(R.main, `refs/remotes/origin/${seg}`)) return seg
  return R.cfg.defaultBase || remoteHead(R.main) || 'main'
}
const baseRef = (R, base) => (refExists(R.main, `refs/remotes/origin/${base}`) ? `origin/${base}` : base)

function nameOf(R, w) {
  return same(w.path, R.main) ? R.name : path.basename(w.path)
}
function find(R, query) {
  if (!query) {
    const here = R.list.filter(w => inside(R.cwd, w.path)).sort((a, b) => b.path.length - a.path.length)[0]
    if (!here) die('Not inside a worktree. Name one, for example: grove diff sab-3808')
    return here
  }
  if (query === '-') return R.list[0]
  const q = query.toLowerCase()
  const exact = R.list.find(w => nameOf(R, w).toLowerCase() === q || (w.branch || '').toLowerCase() === q)
  if (exact) return exact
  const hits = R.list.filter(w => nameOf(R, w).toLowerCase().includes(q) || (w.branch || '').toLowerCase().includes(q))
  if (hits.length === 1) return hits[0]
  if (!hits.length) die(`No worktree matches "${query}". Run: grove ls`)
  die(`"${query}" matches ${hits.length} worktrees: ${hits.map(w => nameOf(R, w)).join(', ')}. Be more specific.`)
}

// ---------- status ----------
function parseStatus(out) {
  const f = out.split('\0'), res = []
  for (let i = 0; i < f.length; i++) {
    const e = f[i]
    if (!e) continue
    const xy = e.slice(0, 2)
    res.push({ xy, path: e.slice(3) })
    if (xy[0] === 'R' || xy[0] === 'C') i++
  }
  return res
}
function parseNumstat(out) {
  const f = out.split('\0'), res = []
  for (let i = 0; i < f.length; i++) {
    if (!f[i]) continue
    const [a, d, p] = f[i].split('\t')
    let file = p
    if (p === '') {
      i += 2
      file = f[i]
    }
    res.push({ path: file, add: a === '-' ? 0 : +a, del: d === '-' ? 0 : +d, binary: a === '-' })
  }
  return res
}
function countLines(file) {
  try {
    const st = fs.statSync(file)
    if (!st.isFile() || st.size > 1 << 20) return 0
    const t = fs.readFileSync(file, 'utf8')
    return t ? t.split('\n').length - (t.endsWith('\n') ? 1 : 0) : 0
  } catch {
    return 0
  }
}

// Changed files of a worktree vs its base: committed and not committed, untracked included.
function changes(R, w) {
  const meta = readMeta(w.path)
  const base = baseOf(R, w.branch, meta)
  const ref = baseRef(R, base)
  const onBase = w.branch === base
  const mb = onBase ? 'HEAD' : gitOut(['merge-base', ref, 'HEAD'], w.path) || 'HEAD'
  const status = parseStatus(git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], w.path).out)
  const uncommitted = new Set(status.map(s => s.path))
  const files = new Map()
  const kinds = new Map()
  const ns = git(['diff', '--name-status', '-z', '--no-renames', mb], w.path).out.split('\0')
  for (let i = 0; i + 1 < ns.length; i += 2) kinds.set(ns[i + 1], ns[i][0])
  for (const f of parseNumstat(git(['diff', '--numstat', '-z', '--no-renames', mb], w.path).out))
    files.set(f.path, { ...f, status: kinds.get(f.path) || 'M', uncommitted: uncommitted.has(f.path) })
  for (const s of status) {
    if (s.xy !== '??' || files.has(s.path)) continue
    files.set(s.path, { path: s.path, add: countLines(path.join(w.path, s.path)), del: 0, status: 'A', uncommitted: true, untracked: true })
  }
  // Files touched by your own commits since the base (author = git config user.email), plus anything not committed.
  const me = gitOut(['config', 'user.email'], w.path)
  const yours = new Set(
    me && mb !== 'HEAD'
      ? git(['log', '--no-merges', `--author=${me}`, '--format=', '--name-only', `${mb}..HEAD`], w.path).out.split('\n').filter(Boolean)
      : [],
  )
  for (const f of files.values()) f.you = f.uncommitted || yours.has(f.path)
  return { base, ref, mergeBase: mb, me, files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) }
}

function info(R, w, full = true) {
  const meta = readMeta(w.path)
  const t = {
    name: nameOf(R, w),
    path: w.path,
    branch: w.branch || (w.detached ? '(detached)' : ''),
    main: same(w.path, R.main),
    here: inside(R.cwd, w.path),
    session: meta.session || null,
    agent: meta.agent || null,
    missing: !fs.existsSync(w.path),
  }
  if (t.missing || !full) return t
  const ch = changes(R, w)
  t.base = ch.base
  t.files = ch.files.length
  t.add = ch.files.reduce((n, f) => n + f.add, 0)
  t.del = ch.files.reduce((n, f) => n + f.del, 0)
  t.uncommitted = ch.files.filter(f => f.uncommitted).length
  const ab = git(['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], w.path)
  if (ab.ok) {
    const [b, a] = ab.out.split(/\s+/).map(Number)
    Object.assign(t, { upstream: true, behind: b, ahead: a })
  } else Object.assign(t, { upstream: false, behind: 0, ahead: t.branch === ch.base ? 0 : Number(gitOut(['rev-list', '--count', `${ch.mergeBase}..HEAD`], w.path) || 0) })
  t.baseMoved = t.branch === ch.base ? 0 : Number(gitOut(['rev-list', '--count', `${ch.mergeBase}..${ch.ref}`], w.path) || 0)
  t.deps = depsState(R, w.path)
  t.drift = t.deps.some(d => d.state === 'drift')
  return t
}

// ---------- dependencies ----------
function lockfiles(wt) {
  const out = git(['ls-files', '-z', '--', ...Object.keys(LOCKS).map(l => `*${l}`)], wt).out
  return out
    .split('\0')
    .filter(f => f && LOCKS[path.basename(f)] && !f.split('/').includes('node_modules'))
    .map(f => ({ rel: path.dirname(f) === '.' ? '' : path.dirname(f), lock: path.basename(f) }))
}
// Main's node_modules matches its lockfile only if it was installed after the lockfile last changed
// (a branch switch rewrites the lockfile and leaves node_modules behind). Each package manager leaves a marker.
function installedAfter(nm, lock) {
  for (const m of ['.yarn-integrity', '.package-lock.json', '.modules.yaml', '.yarn-state.yml']) {
    const f = path.join(nm, m)
    if (exists(f)) return fs.statSync(f).mtimeMs >= fs.statSync(lock).mtimeMs
  }
  return false
}
function depsPlan(R, wt, { rel, lock }) {
  const lockPath = path.join(wt, rel, lock)
  const target = path.join(wt, rel, 'node_modules')
  const content = exists(lockPath) ? fs.readFileSync(lockPath) : Buffer.from('')
  const hash = sha(content)
  const mainLock = path.join(R.main, rel, lock)
  const mainNm = path.join(R.main, rel, 'node_modules')
  let source
  if (!same(wt, R.main) && exists(mainLock) && exists(mainNm) && sha(fs.readFileSync(mainLock)) === hash && installedAfter(mainNm, mainLock)) source = fs.realpathSync(mainNm)
  else source = path.join(CACHE_DIR, R.name, 'deps', hash, 'node_modules')
  return { rel, lock, target, source, hash, cmd: LOCKS[lock] }
}
function depsState(R, wt) {
  if (same(wt, R.main)) return []
  return lockfiles(wt).map(l => {
    const p = depsPlan(R, wt, l)
    const st = lstat(p.target)
    let state
    if (!st) state = exists(p.source) ? 'unlinked' : 'missing'
    else if (!st.isSymbolicLink()) state = 'own'
    else {
      let real = ''
      try {
        real = fs.realpathSync(p.target)
      } catch {}
      state = real && same(real, fs.existsSync(p.source) ? fs.realpathSync(p.source) : p.source) ? 'linked' : 'drift'
    }
    return { rel: p.rel || '.', lock: p.lock, state, shared: p.source.startsWith(CACHE_DIR) ? 'cache' : 'main' }
  })
}
function link(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.symlinkSync(source, target, IS_WIN ? 'junction' : 'dir')
}
function unlinkDir(p) {
  if (!isLink(p)) return false
  try {
    fs.unlinkSync(p)
  } catch {
    fs.rmdirSync(p)
  }
  return true
}
function nodeWanted(dir, stop) {
  for (let d = dir; ; d = path.dirname(d)) {
    for (const f of ['.nvmrc', '.node-version']) if (exists(path.join(d, f))) return fs.readFileSync(path.join(d, f), 'utf8').trim().replace(/^v/, '')
    if (same(d, stop) || path.dirname(d) === d) return ''
  }
}
// The newest nvm-installed node matching `want` ("22" or "22.23.4"), as its bin folder.
function nvmBin(want) {
  const roots = IS_WIN
    ? [process.env.NVM_HOME].filter(Boolean)
    : [path.join(process.env.NVM_DIR || path.join(os.homedir(), '.nvm'), 'versions', 'node')]
  for (const root of roots) {
    let vs = []
    try {
      vs = fs.readdirSync(root).filter(v => (v.replace(/^v/, '') + '.').startsWith(want + '.'))
    } catch {
      continue
    }
    const v = vs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop()
    if (v) return IS_WIN ? path.join(root, v) : path.join(root, v, 'bin')
  }
  return ''
}
function installCmd(dir, wt, cmd) {
  const want = nodeWanted(dir, wt)
  const have = run('node', ['-v']).out.replace(/^v/, '')
  if (want && !have.startsWith(want)) {
    if (has('fnm')) return { cmd: `fnm exec --using=${want} -- ${cmd}`, note: `node ${want} via fnm` }
    // nvm (and nvm-windows): put that version's bin first on PATH, no shell sourcing needed.
    const bin = nvmBin(want)
    if (bin) return { cmd, note: `node ${want} via nvm`, env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH } }
    return { cmd, note: yellow(`node ${have} on PATH but ${want} wanted (install it with nvm or fnm)`) }
  }
  return { cmd, note: want ? `node ${want}` : '' }
}
// Links every lockfile's node_modules to a shared copy. install=true installs a missing copy once.
function syncDeps(R, wt, { install = false, log = say } = {}) {
  let missing = 0
  for (const l of lockfiles(wt)) {
    const p = depsPlan(R, wt, l)
    const label = (p.rel || '.') + '/' + p.lock
    const st = lstat(p.target)
    if (st && !st.isSymbolicLink()) {
      log(`deps    ${label}: own node_modules here, left as is`)
      continue
    }
    if (exists(p.source)) {
      if (st) unlinkDir(p.target)
      link(p.source, p.target)
      log(`deps    ${label}: linked to ${p.source.startsWith(CACHE_DIR) ? 'shared copy ' + p.hash : 'main checkout'}`)
      continue
    }
    if (!install) {
      missing++
      // A link to the copy made for another lockfile is worse than none: code would run on the wrong versions.
      if (st) unlinkDir(p.target)
      log(`deps    ${label}: ${yellow('differs from main, no shared copy yet')}. Run: grove install`)
      continue
    }
    if (st) unlinkDir(p.target)
    const dir = path.join(wt, p.rel)
    const ic = installCmd(dir, wt, p.cmd)
    log(`deps    ${label}: installing once (${ic.cmd})${ic.note ? ' · ' + ic.note : ''}`)
    const r = spawnSync(ic.cmd, { cwd: dir, shell: true, env: ic.env, stdio: ['ignore', 'inherit', 'inherit'] })
    if (r.status !== 0) {
      log(red(`deps    ${label}: install failed (exit ${r.status}). Fix it, then run grove install again.`))
      missing++
      continue
    }
    try {
      fs.mkdirSync(path.dirname(p.source), { recursive: true })
      fs.renameSync(p.target, p.source)
      link(p.source, p.target)
      log(`deps    ${label}: ${green('installed')} and shared as ${p.hash}`)
    } catch (e) {
      log(yellow(`deps    ${label}: installed, but could not move it to the shared cache (${e.code}). Kept here.`))
    }
  }
  return missing
}

// ---------- env files ----------
function envFiles(root, depth = 4, rel = '') {
  let out = []
  let ents = []
  try {
    ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of ents) {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory() && !e.isSymbolicLink()) {
      if (depth > 0 && !SKIP_DIRS.has(e.name)) out = out.concat(envFiles(root, depth - 1, r))
    } else if (/^\.env(\..+)?$/.test(e.name) && !/(sample|example|template|dist|bak)/i.test(e.name)) out.push(r)
  }
  return out
}
// Only files git ignores and does not track: secrets never get copied into something git would commit.
function copyableEnv(R) {
  const files = envFiles(R.main)
  if (!files.length) return []
  const tracked = new Set(git(['ls-files', '-z', '--', ...files], R.main).out.split('\0'))
  const ignored = new Set(git(['check-ignore', '-z', '--stdin'], R.main, { input: files.join('\0') + '\0' }).out.split('\0'))
  return files.filter(f => ignored.has(f) && !tracked.has(f))
}
function copyEnv(R, wt, log = say) {
  const files = copyableEnv(R)
  let n = 0
  for (const f of files) {
    const to = path.join(wt, f)
    if (exists(to) || !exists(path.dirname(to))) continue
    fs.copyFileSync(path.join(R.main, f), to)
    n++
  }
  log(`env     copied ${n} of ${files.length} env file${files.length === 1 ? '' : 's'} from main (existing ones kept)`)
  // Main's .env can lag behind: a key a newer branch needs often lives only in another worktree's copy.
  // Add such keys (newest copy wins); never change a key that is already there.
  const others = R.list.filter(w => !same(w.path, R.main) && !same(w.path, wt)).map(w => w.path)
  for (const f of files) {
    const to = path.join(wt, f)
    if (!exists(to)) continue
    const have = envKeys(to)
    const add = new Map()
    const copies = others.map(o => path.join(o, f)).filter(exists).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    for (const c of copies) for (const [k, v] of envKeys(c)) if (!have.has(k) && !add.has(k)) add.set(k, v)
    if (!add.size) continue
    const txt = fs.readFileSync(to, 'utf8')
    fs.appendFileSync(to, `${txt.endsWith('\n') || !txt ? '' : '\n'}\n# added by grove: missing in main, found in other worktrees\n${[...add].map(([k, v]) => `${k}=${v}`).join('\n')}\n`)
    log(`env     ${f}: added ${[...add.keys()].join(', ')} ${dim('(missing in main, taken from other worktrees)')}`)
  }
}
const envKeys = file => {
  const m = new Map()
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const k = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=(.*)$/.exec(line)
      if (k) m.set(k[1], k[2])
    }
  } catch {}
  return m
}
function envDiff(R, wt) {
  return copyableEnv(R).map(f => {
    const a = envKeys(path.join(R.main, f)), b = envKeys(path.join(wt, f))
    const missing = [...a.keys()].filter(k => !b.has(k))
    const changed = [...a.keys()].filter(k => b.has(k) && a.get(k) !== b.get(k))
    const extra = [...b.keys()].filter(k => !a.has(k))
    return { file: f, exists: exists(path.join(wt, f)), missing, changed, extra }
  })
}

// ---------- passes (the commit gate) ----------
const passPath = R => path.join(R.common, PASS_FILE)
function grantPass(R, branch, op, ms = PASS_MS) {
  writeJSON(passPath(R), { branch, op, expires: Date.now() + ms })
}
function takePass(R, branch, op) {
  const p = readJSON(passPath(R), null)
  if (!p || p.expires < Date.now() || p.branch !== branch || (p.op !== op && p.op !== 'any')) return false
  if (p.op !== 'any') fs.rmSync(passPath(R), { force: true })
  return true
}

// ---------- terminal + agent ----------
function agentCmd(R, meta) {
  return meta.session ? R.cfg.agent.resume.replace('{session}', meta.session) : R.cfg.agent.fresh
}
function resumeLine(dir, cmd) {
  return IS_WIN ? `cd ${quote(dir)}; ${cmd}` : `cd ${quote(dir)} && ${cmd}`
}
// A tab opened from inside Claude Code must not inherit its session markers: the new chat would not be saved.
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDECODE|CLAUDE_CODE_)/.test(k)))
function detach(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false, env: cleanEnv(), ...opts })
  p.on('error', () => {})
  p.unref()
}
function openTerminal(R, dir, cmd) {
  const sh = `${cmd}; exec "\${SHELL:-bash}"`
  if (R.cfg.terminal) {
    detach(R.cfg.terminal.replace('{path}', quote(dir)).replace('{cmd}', cmd), [], { shell: true, cwd: dir })
    return 'your terminal setting'
  }
  if (process.env.TMUX && has('tmux')) {
    run('tmux', ['new-window', '-c', dir, cmd], undefined, { env: cleanEnv() })
    return 'tmux'
  }
  if (IS_WIN) {
    const shell = has('pwsh') ? 'pwsh' : 'powershell'
    if (has('wt')) detach('wt', ['-w', '0', 'new-tab', '-d', dir, shell, '-NoExit', '-Command', cmd])
    else detach('cmd', ['/c', 'start', shell, '-NoExit', '-Command', `cd ${quote(dir)}; ${cmd}`], { shell: false })
    return 'Windows Terminal'
  }
  if (process.platform === 'darwin') {
    const line = `cd ${quote(dir)} && ${cmd}`.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    if (process.env.TERM_PROGRAM === 'iTerm.app')
      run('osascript', ['-e', `tell application "iTerm2" to tell current window to create tab with default profile command "bash -lc \\"${line.replace(/"/g, '\\"')}; exec bash\\""`])
    else run('osascript', ['-e', `tell application "Terminal" to do script "${line}"`, '-e', 'tell application "Terminal" to activate'])
    return 'Terminal'
  }
  const tries = [
    ['wezterm', ['cli', 'spawn', '--cwd', dir, '--', 'bash', '-lc', sh], () => process.env.WEZTERM_PANE],
    ['kitty', ['@', 'launch', '--type=tab', '--cwd', dir, 'bash', '-lc', sh], () => process.env.KITTY_WINDOW_ID],
    ['ptyxis', ['--tab', '--working-directory', dir, '--', 'bash', '-lc', sh]],
    ['gnome-terminal', ['--tab', `--working-directory=${dir}`, '--', 'bash', '-lc', sh]],
    ['konsole', ['--new-tab', '--workdir', dir, '-e', 'bash', '-lc', sh]],
    ['x-terminal-emulator', ['-e', 'bash', '-lc', `cd ${quote(dir)} && ${sh}`]],
  ]
  for (const [bin, args, when] of tries) {
    if ((when && !when()) || !has(bin)) continue
    detach(bin, args, { cwd: dir })
    return bin
  }
  die(`No terminal app found. Set one in ${path.join(CONFIG_DIR, 'config.json')}: {"terminal": "my-term --cwd {path} -e {cmd}"}`)
}

// ---------- dev stack: where it runs (optional, from config "run") ----------
const expandHome = cmd => cmd.replace(/(^|\s)~(?=\/)/g, `$1${HOME}`)
// Services per worktree path, read from the configured status command. Accepts {services:[…]} or […] of {name, state, root}.
function runStatus(R) {
  if (!R.cfg.run?.status) return null
  const r = spawnSync(expandHome(R.cfg.run.status), { shell: true, cwd: R.main, encoding: 'utf8', timeout: 30000 })
  try {
    const j = JSON.parse(r.stdout)
    const rows = Array.isArray(j) ? j : j.services || []
    return rows.filter(x => x.root && !/^(stopped|exited)$/.test(x.state)).map(x => ({ name: x.name, root: path.resolve(x.root), state: x.state }))
  } catch {
    return null
  }
}

// Stops what runs from a worktree before it is removed, so no dev server outlives its folder.
// 1. services the configured status command places there, through "run.stop" ({services} replaced);
// 2. any process still listening on a TCP port with its working folder inside the worktree
//    (servers the status command lost track of), with its process group when the group leader lives there too.
// ponytail: step 2 is Linux/macOS only (ss or lsof + ps); Windows would need netstat -ano + wmic.
const cwdOf = pid =>
  process.platform === 'linux'
    ? (() => { try { return fs.readlinkSync(`/proc/${pid}/cwd`).replace(/ \(deleted\)$/, '') } catch { return '' } })()
    : (run('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']).out.split('\n').find(l => l.startsWith('n')) || '').slice(1)
const pgidOf = pid => +run('ps', ['-o', 'pgid=', '-p', String(pid)]).out.trim()
function listeningPids() {
  if (process.platform === 'linux' && has('ss')) return [...new Set([...run('ss', ['-ltnpH']).out.matchAll(/pid=(\d+)/g)].map(m => +m[1]))]
  if (has('lsof')) return [...new Set(run('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-Fp']).out.split('\n').filter(l => l.startsWith('p')).map(l => +l.slice(1)))]
  return []
}
function stopServices(R, w) {
  const names = (runStatus(R) || []).filter(x => same(x.root, w.path)).map(x => x.name)
  if (names.length && R.cfg.run?.stop) {
    spawnSync(expandHome(R.cfg.run.stop).replace('{services}', names.join(' ')), { shell: true, cwd: R.main, stdio: 'ignore', timeout: 120000 })
    say(`stopped ${names.join(', ')}`)
  }
  if (IS_WIN) return
  // never this process or any parent of it: Claude Code itself may run from inside the worktree
  const mine = new Set()
  for (let p = process.pid; p > 1 && !mine.has(p); p = +run('ps', ['-o', 'ppid=', '-p', String(p)]).out.trim() || 0) mine.add(p)
  const myGroups = new Set([...mine].map(pgidOf))
  const killed = []
  for (const pid of listeningPids()) {
    if (mine.has(pid) || !inside(cwdOf(pid) || '/', w.path)) continue
    const pgid = pgidOf(pid)
    const group = pgid > 1 && !myGroups.has(pgid) && inside(cwdOf(pgid) || '/', w.path)
    try {
      process.kill(group ? -pgid : pid, 'SIGTERM')
      killed.push(pid)
    } catch {}
  }
  if (killed.length) say(`stopped ${killed.length} server process${killed.length > 1 ? 'es' : ''} still running from ${nameOf(R, w)} (pid ${killed.join(', ')})`)
}

// ---------- commands ----------
const COMMANDS = {}

COMMANDS.ls = ({ flags }) => {
  const R = repo()
  const all = R.list.map(w => info(R, w, !flags.quick))
  const svc = runStatus(R)
  if (svc) for (const t of all) t.running = svc.filter(x => same(x.root, t.path)).map(x => x.name)
  if (flags.json) return say(JSON.stringify({ repo: R.name, main: R.main, root: rootDir(R), protected: R.cfg.protected, defaultBase: R.cfg.defaultBase || remoteHead(R.main), commitlint: commitlintOn(R.main), trees: all }))
  const nw = Math.max(...all.map(t => t.name.length)), bw = Math.min(48, Math.max(...all.map(t => t.branch.length)))
  for (const t of all) {
    if (t.missing) {
      say(`  ${t.name.padEnd(nw)}  ${red('folder missing')} ${dim('(git worktree prune cleans it)')}`)
      continue
    }
    const extra0 = []
    const ch = t.files ? `${green('+' + t.add)} ${red('−' + t.del)}` : dim('clean')
    const ud = `${t.behind}↓ ${t.ahead}↑`
    if (!t.upstream && t.ahead) extra0.push(dim('not pushed'))
    const extra = [t.running?.length ? green(`▶ running ${t.running.join(', ')}`) : '', t.uncommitted ? yellow(`${t.uncommitted} uncommitted`) : '', t.drift ? yellow('deps drift') : '', t.baseMoved ? dim(`base moved ${t.baseMoved}`) : '', t.session ? dim('chat linked') : '']
      .concat(extra0)
      .filter(Boolean)
      .join('  ')
    say(`${t.here ? blue('▶') : ' '} ${bold(t.name.padEnd(nw))}  ${dim(t.branch.slice(0, bw).padEnd(bw))}  ${padV(ch, 14)} ${padV(ud, 9)}  ${extra}`)
  }
}

COMMANDS.here = ({ flags }) => {
  const R = repo()
  const w = find(R)
  const t = info(R, w)
  const resume = resumeLine(t.path, agentCmd(R, readMeta(w.path)))
  if (flags.copy) {
    const v = { path: t.path, branch: t.branch, session: resume }[flags.copy]
    if (v === undefined) die('Use --copy path, --copy branch or --copy session')
    copy(v)
    return say(`copied ${flags.copy}`)
  }
  if (flags.json) return say(JSON.stringify({ ...t, resume }))
  say(`${blue(t.path)}\nbranch  ${t.branch}   (base ${t.base})\nsession ${t.session || 'none linked'}\nresume  ${resume}`)
  say(`state   ${t.uncommitted ? yellow(t.uncommitted + ' uncommitted') : green('clean')} · ${t.files} files changed vs base (${green('+' + t.add)} ${red('−' + t.del)})`)
  say(`remote  ${t.behind}↓ to pull · ${t.ahead}↑ ${t.upstream ? 'to push' : 'not pushed yet'}${t.baseMoved ? ` · base moved ${t.baseMoved} commits since you branched` : ''}`)
  for (const d of t.deps) say(`deps    ${d.rel}/${d.lock}: ${d.state}${d.state === 'linked' ? ` (${d.shared})` : ''}`)
}

function copy(text) {
  if (process.stdout.isTTY) process.stdout.write(`\x1b]52;c;${Buffer.from(text).toString('base64')}\x07`)
  const tools = IS_WIN ? [['clip', []]] : process.platform === 'darwin' ? [['pbcopy', []]] : [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['-b', '-i']]]
  for (const [cmd, args] of tools) if (has(cmd) && run(cmd, args, undefined, { input: text }).ok) return true
  return !!process.stdout.isTTY
}

COMMANDS.path = ({ pos }) => {
  const R = repo()
  let q = pos[0] === 'go' ? pos[1] : pos[0]
  if (q === undefined) {
    const picked = pick(R)
    if (!picked) process.exit(1)
    return say(picked)
  }
  say(find(R, q).path)
}

function pick(R) {
  const rows = R.list.map(w => {
    const t = info(R, w, false)
    return `${t.name}\t${t.branch}\t${t.path}`
  })
  if (has('fzf')) {
    const r = spawnSync('fzf', ['--delimiter=\t', '--with-nth=1,2', '--height=40%', '--reverse', '--prompt=worktree> '], { input: rows.join('\n'), stdio: ['pipe', 'pipe', 'inherit'], encoding: 'utf8' })
    return r.status === 0 ? r.stdout.trim().split('\t')[2] : ''
  }
  rows.forEach((r, i) => process.stderr.write(`${String(i + 1).padStart(2)}  ${r.split('\t')[0].padEnd(28)} ${dim(r.split('\t')[1])}\n`))
  const n = Number(ask('number: '))
  return n >= 1 && n <= rows.length ? rows[n - 1].split('\t')[2] : ''
}

COMMANDS.new = ({ pos, flags }) => {
  const R = repo()
  const arg = pos[0]
  if (!arg) die('Usage: grove new <ticket or branch> [--base <branch>] [--type fix|feat] [--name <folder>] [--no-install]')
  const base = flags.base || R.cfg.defaultBase || remoteHead(R.main) || 'main'
  const branch = flags.branch || (arg.includes('/') ? arg : R.cfg.branch.replace('{type}', flags.type || R.cfg.type).replace('{base}', base).replace('{ticket}', arg))
  const folder = flags.name || `${arg.split('/').pop()}-${base}`.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
  const dir = path.join(rootDir(R), folder)
  if (exists(dir)) die(`Folder already exists: ${dir}`)
  // --no-pull: branch from what this machine already has (offline, or to pin an older base).
  let from = base
  if (flags['no-pull']) say(dim(`base    local ${base}, not pulled`))
  else {
    const f = git(['fetch', '--quiet', 'origin', base], R.main)
    if (!f.ok) say(yellow(`pull    failed, using what is here: ${f.err.split('\n')[0]}`))
    else {
      // Also fast-forward the local base branch when no worktree has it checked out (fetch refuses otherwise, and never rewrites local commits).
      const ff = git(['fetch', '--quiet', 'origin', `${base}:${base}`], R.main)
      say(`pull    origin/${base}${ff.ok ? ` · local ${base} updated` : ''}`)
    }
    from = baseRef(R, base)
  }
  const existing = refExists(R.main, `refs/heads/${branch}`)
  const r = existing ? git(['worktree', 'add', dir, branch], R.main) : git(['worktree', 'add', '--no-track', '-b', branch, dir, from], R.main)
  if (!r.ok) die(r.err)
  say(`branch  ${branch}${existing ? ' (existing)' : ` from ${from}`}`)
  say(`folder  ${dir}`)
  writeMeta(dir, { base, created: new Date().toISOString() })
  if (IS_WIN) git(['config', 'core.longpaths', 'true'], dir)
  excludeTaskFile(R)
  const want = nodeWanted(dir, dir)
  if (want) say(`node    ${want} (from .nvmrc)${has('fnm') || nvmBin(want) ? '' : dim(' · install it with nvm or fnm to switch automatically')}`)
  // Install a lockfile that differs from main by default: a worktree without its node_modules fails at first run.
  const install = !flags['no-install']
  const missing = syncDeps(R, dir, { install })
  copyEnv(R, dir)
  say(green(`ready   ${dir}`))
  if (missing) say(yellow(`        deps missing: cd into it and run grove install`))
  if (flags.open) COMMANDS.open({ pos: [folder], flags: {} })
}

function excludeTaskFile(R) {
  const f = path.join(R.common, 'info', 'exclude')
  const txt = exists(f) ? fs.readFileSync(f, 'utf8') : ''
  if (!txt.includes('.grove-task.md')) {
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.appendFileSync(f, `${txt.endsWith('\n') || !txt ? '' : '\n'}# grove: per-worktree notes for agents\n.grove-task.md\n`)
  }
}

// Everything a folder needs before services start there, with no questions: run by dev scripts before each start.
// Worktree: link or install node_modules, add .env keys main lacks. Main checkout: reinstall node_modules
// that are older than their lockfile (left behind by a branch switch).
COMMANDS.prep = ({ pos }) => {
  const R = repo()
  const w = find(R, pos[0])
  let bad = 0
  if (same(w.path, R.main)) {
    for (const l of lockfiles(w.path)) {
      const dir = path.join(w.path, l.rel)
      const nm = path.join(dir, 'node_modules')
      if (!exists(nm) || installedAfter(nm, path.join(dir, l.lock))) continue // never installed here = not used here
      const ic = installCmd(dir, w.path, LOCKS[l.lock])
      say(`deps    ${l.rel || '.'}/${l.lock}: node_modules older than the lockfile, installing (${ic.cmd})${ic.note ? ' · ' + ic.note : ''}`)
      if (spawnSync(ic.cmd, { cwd: dir, shell: true, env: ic.env, stdio: ['ignore', 'inherit', 'inherit'] }).status !== 0) bad++
    }
  } else {
    bad = syncDeps(R, w.path, { install: true })
    copyEnv(R, w.path, s => s.includes(': added ') && say(s))
  }
  if (bad) die(`${nameOf(R, w)}: node_modules install failed (see above).`)
  say(green(`ready   ${nameOf(R, w)}`))
}

COMMANDS.install = ({ pos }) => {
  const R = repo()
  const w = find(R, pos[0])
  if (same(w.path, R.main)) die('This is the main checkout: run your package manager here as usual.')
  syncDeps(R, w.path, { install: true })
}
COMMANDS.sync = ({ pos }) => {
  const R = repo()
  const w = find(R, pos[0])
  if (same(w.path, R.main)) die('Nothing to sync in the main checkout.')
  syncDeps(R, w.path, { install: false })
}

COMMANDS.open = ({ pos, flags }) => {
  const R = repo()
  const w = find(R, pos[0])
  const meta = readMeta(w.path)
  const cmd = flags.shell ? '' : agentCmd(R, meta)
  const via = openTerminal(R, w.path, cmd || (IS_WIN ? 'Get-Location' : 'true'))
  say(`opened  ${nameOf(R, w)} in a new ${via} tab${cmd ? ` · ${cmd}` : ''}`)
}

COMMANDS['link-session'] = ({ pos, flags }) => {
  const R = repo()
  const w = find(R, flags.in)
  const id = pos[0]
  if (!id) die('Usage: grove link-session <session-id> [--in <worktree>] [--agent claude] [--force]')
  const meta = readMeta(w.path)
  if (meta.session && meta.session !== id && !flags.force) return say(`kept    ${meta.session} (use --force to link ${id})`)
  writeMeta(w.path, { session: id, agent: flags.agent || 'claude', linked: new Date().toISOString() })
  say(`linked  ${nameOf(R, w)} → ${id}`)
}

COMMANDS.rm = ({ pos, flags }) => {
  const R = repo()
  const w = find(R, pos[0])
  if (same(w.path, R.main)) die('The main checkout cannot be removed.')
  const t = info(R, w)
  if (!flags.force) {
    if (t.uncommitted) die(`${t.name} has ${t.uncommitted} uncommitted files. Commit them, or use --force to throw them away.`)
    if (t.ahead) die(`${t.name} has ${t.ahead} commit${t.ahead > 1 ? 's' : ''} not pushed. Push first, or use --force.`)
  }
  const src = beforeRemove(R, w)
  for (const l of lockfiles(w.path)) unlinkDir(path.join(w.path, l.rel, 'node_modules'))
  const r = git(['worktree', 'remove', ...(flags.force ? ['--force'] : []), w.path], R.main)
  if (!r.ok) die(r.err)
  chats.merge(R.main, src) // folder gone now: deletes the originals that were copied
  say(`removed ${t.name} · branch ${t.branch} kept (delete it with: git branch -D ${t.branch})`)
}

// What every removal does first, whoever removes: the worktree's chats go into the main checkout's resume list,
// and services running from it are stopped.
function beforeRemove(R, w) {
  if (same(w.path, R.main)) die('The main checkout cannot be removed.')
  const src = new Map([[chats.encode(w.path), w.path]])
  chats.merge(R.main, src).forEach(l => say(l))
  stopServices(R, w)
  return src
}
// For removals grove does not run itself (git worktree remove, ExitWorktree): the grove hook calls this first.
COMMANDS['before-rm'] = ({ pos, flags }) => {
  const R = repo()
  const w = flags.path ? R.list.find(x => same(x.path, path.resolve(R.cwd, flags.path))) : find(R, pos[0])
  if (!w) return say(`not a worktree of ${R.name}: ${flags.path}`)
  beforeRemove(R, w)
}

// Chats of every worktree (and of worktrees already deleted) into the main checkout's resume list.
COMMANDS.sessions = ({ pos, flags }) => {
  const R = repo()
  let src
  if (flags.path) src = new Map([[chats.encode(path.resolve(R.cwd, flags.path)), path.resolve(R.cwd, flags.path)]])
  else if (pos[0]) {
    const w = find(R, pos[0])
    if (same(w.path, R.main)) die('The main checkout is where chats are merged to. Name a worktree, or leave it out for all.')
    src = new Map([[chats.encode(w.path), w.path]])
  } else src = chats.sources(R.main, R.list.map(w => w.path))
  if (!src.size) return flags.quiet || say('no worktree chats to merge')
  const out = chats.merge(R.main, src, { dryRun: !!flags['dry-run'] })
  if (!flags.quiet) out.forEach(l => say(l))
}

COMMANDS.diff = ({ pos, flags }) => {
  const R = repo()
  const w = find(R, pos[0])
  const ch = changes(R, w)
  const file = pos[1]
  if (file) {
    const known = git(['ls-files', '--error-unmatch', '--', file], w.path).ok || git(['cat-file', '-e', `${ch.mergeBase}:${file}`], w.path).ok
    const args = known ? ['diff', ch.mergeBase, '--', file] : ['diff', '--no-index', '--', IS_WIN ? 'NUL' : '/dev/null', file]
    if (flags.json) return say(JSON.stringify({ file, patch: git(['-c', 'color.ui=never', ...args], w.path).out }))
    if (process.stdout.isTTY && has('delta')) return void spawnSync('git', ['-c', 'core.pager=delta --side-by-side', ...args], { cwd: w.path, stdio: 'inherit' })
    return void spawnSync('git', ['-c', `color.ui=${color ? 'always' : 'never'}`, ...args], { cwd: w.path, stdio: 'inherit' })
  }
  let files = ch.files
  if (flags.uncommitted) files = files.filter(f => f.uncommitted)
  if (flags.json) return say(JSON.stringify({ name: nameOf(R, w), base: ch.base, files }))
  if (!files.length) return say(green(`No changes vs ${ch.ref}.`))
  if (flags.stat) {
    for (const f of files) say(`${f.status} ${f.path} +${f.add} -${f.del}${f.uncommitted ? ' *' : ''}`)
    return
  }
  say(dim(`${nameOf(R, w)} vs ${ch.ref}`))
  let last = null
  for (const f of files) {
    const dir = path.posix.dirname(f.path)
    if (dir !== last) say(blue(dir === '.' ? './' : dir + '/'))
    last = dir
    const st = f.status === 'A' ? green('A') : f.status === 'D' ? red('D') : yellow(f.status)
    say(`  ${st}  ${path.posix.basename(f.path).padEnd(32)} ${green('+' + f.add)} ${red('−' + f.del)}${f.uncommitted ? yellow('  not committed') : ''}`)
  }
  const a = files.reduce((n, f) => n + f.add, 0), d = files.reduce((n, f) => n + f.del, 0)
  say(dim(`${files.length} files · +${a} −${d} · ${files.filter(f => f.uncommitted).length} not committed · grove diff ${nameOf(R, w)} <file> to see one`))
}

// Each changed line with who changed it and when (git blame), plus the file's commit timeline.
COMMANDS.review = ({ pos, flags }) => {
  const R = repo()
  const w = find(R, pos[0])
  const file = pos[1]
  const ch = changes(R, w)
  if (!file) {
    if (flags.json) return say(JSON.stringify({ files: ch.files.map(f => f.path) }))
    say(dim('Pick a file: grove review ' + nameOf(R, w) + ' <file>'))
    for (const f of ch.files) say('  ' + f.path)
    return
  }
  const entry = ch.files.find(f => f.path === file)
  let lines = []
  if (entry?.untracked) {
    lines = fs.readFileSync(path.join(w.path, file), 'utf8').split('\n').slice(0, 300).map((code, i) => ({ n: i + 1, sha: '', author: 'not committed', time: 0, summary: 'new file', code, mine: true, you: true, changed: true }))
  } else {
    const ranges = []
    const hunks = []
    for (const m of git(['diff', '-U0', ch.mergeBase, '--', file], w.path).out.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
      const start = +m[1], len = m[2] === undefined ? 1 : +m[2]
      if (len === 0) continue
      hunks.push([start, start + len - 1])
      ranges.push([Math.max(1, start - 3), start + len - 1 + 3])
    }
    var inHunk = n => hunks.some(([a, b]) => n >= a && n <= b)
    const total = countLines(path.join(w.path, file))
    const L = ranges.length ? ranges.flatMap(([a, b]) => ['-L', `${a},${Math.min(b, total || b)}`]) : []
    const bl = git(['blame', '--line-porcelain', ...L, '--', file], w.path)
    if (!bl.ok) die(bl.err)
    let cur = {}
    const commits = {}
    for (const line of bl.out.split('\n')) {
      const h = /^([0-9a-f]{40}) \d+ (\d+)/.exec(line)
      if (h) {
        cur = { sha: h[1], n: +h[2], ...(commits[h[1]] || {}) }
        continue
      }
      if (line.startsWith('author ')) cur.author = line.slice(7)
      else if (line.startsWith('author-mail ')) cur.mail = line.slice(12).replace(/[<>]/g, '')
      else if (line.startsWith('author-time ')) cur.time = +line.slice(12)
      else if (line.startsWith('summary ')) cur.summary = line.slice(8)
      else if (line.startsWith('\t')) {
        commits[cur.sha] = { author: cur.author, mail: cur.mail, time: cur.time, summary: cur.summary }
        const mine = /^0+$/.test(cur.sha)
        const you = mine || (!!ch.me && cur.mail === ch.me)
        lines.push({ ...cur, sha: mine ? '' : cur.sha.slice(0, 7), author: mine ? 'not committed' : cur.author, code: line.slice(1), mine, you, changed: inHunk(cur.n) })
      }
    }
  }
  const timeline = git(['log', '--follow', '-n', '15', '--format=%h%x09%an%x09%at%x09%ae%x09%s', '--', file], w.path)
    .out.split('\n')
    .filter(Boolean)
    .map(l => {
      const [sha_, author, at, mail, ...rest] = l.split('\t')
      return { sha: sha_, author, time: +at, subject: rest.join('\t'), you: !!ch.me && mail === ch.me }
    })
  if (flags.json) return say(JSON.stringify({ file, lines, timeline, uncommitted: !!entry?.uncommitted }))
  say(blue(file) + dim(' · lines changed vs base, with 3 lines around'))
  let prev = 0
  for (const l of lines) {
    if (prev && l.n > prev + 1) say(dim('   ⋮'))
    prev = l.n
    const who = l.mine ? yellow('not committed'.padEnd(28)) : dim(`${l.sha} ${(l.author || '').slice(0, 12).padEnd(12)} ${age(l.time).padEnd(8)}`)
    say(`${who} ${String(l.n).padStart(4)} ${l.mine ? yellow(l.code) : l.code}`)
  }
  say(blue('\ntimeline'))
  if (entry?.uncommitted) say(`  ${yellow('now'.padEnd(10))} ${yellow('not committed')}`)
  for (const t of timeline) say(`  ${dim(age(t.time).padEnd(10))} ${t.sha} ${t.author.padEnd(14).slice(0, 14)} ${t.subject}`)
}

// Port check: which of a's ticket commits are in b (by patch, so cherry-picks count), and which files still differ.
COMMANDS.cmp = ({ pos, flags }) => {
  const R = repo()
  const a = find(R, pos[0]), b = find(R, pos[1] || '-')
  if (same(a.path, b.path)) die('Pick two different worktrees.')
  const own = w => {
    const ch = changes(R, w)
    const shas = gitOut(['rev-list', '--reverse', `${ch.mergeBase}..HEAD`], w.path).split('\n').filter(Boolean)
    return shas.map(s => ({
      sha: s,
      subject: gitOut(['log', '-1', '--format=%s', s], w.path),
      pid: (git(['patch-id', '--stable'], w.path, { input: gitOut(['show', s], w.path) }).out.split(' ')[0] || ''),
      files: gitOut(['show', '--name-only', '--format=', s], w.path).split('\n').filter(Boolean),
    }))
  }
  const A = own(a), B = own(b)
  const commits = A.map(x => {
    const byPatch = B.find(y => y.pid && y.pid === x.pid)
    const bySubject = !byPatch && B.find(y => y.subject === x.subject)
    return { sha: x.sha.slice(0, 7), subject: x.subject, state: byPatch ? 'ported' : bySubject ? 'ported-edited' : 'missing', in: byPatch?.sha.slice(0, 7) || bySubject?.sha?.slice(0, 7) || null }
  })
  const touched = [...new Set([...A, ...B].flatMap(x => x.files))].sort()
  const files = touched.map(f => {
    const ba = git(['rev-parse', `HEAD:${f}`], a.path), bb = git(['rev-parse', `HEAD:${f}`], b.path)
    const state = !ba.ok && !bb.ok ? 'deleted-both' : !ba.ok ? 'only-b' : !bb.ok ? 'only-a' : ba.out === bb.out ? 'same' : 'differs'
    return { path: f, state }
  })
  const na = nameOf(R, a), nb = nameOf(R, b)
  if (flags.json) return say(JSON.stringify({ a: na, b: nb, commits, files }))
  say(dim(`${na} → ${nb}  (committed work only)`))
  say(bold('commits'))
  if (!commits.length) say(dim(`  ${na} has no commits of its own`))
  for (const x of commits)
    say(`  ${x.state === 'missing' ? red('✗ missing      ') : x.state === 'ported' ? green('✓ ported       ') : yellow('≈ ported, edited')} ${x.sha} ${x.subject}`)
  say(bold('files'))
  for (const f of files.filter(f => f.state !== 'same'))
    say(`  ${f.path}  ${f.state === 'differs' ? yellow('differs') : f.state === 'only-a' ? `only in ${na}` : f.state === 'only-b' ? `only in ${nb}` : dim('deleted in both')}`)
  const sameN = files.filter(f => f.state === 'same').length
  say(dim(`  same in both: ${sameN} file${sameN === 1 ? '' : 's'}`))
}

function commitlintOn(dir) {
  return fs.readdirSync(dir).some(f => /^(commitlint\.config\.|\.commitlintrc)/.test(f))
}
const CONVENTIONAL = /^(feat|fix|chore|refactor|docs|test|perf|style|ci|build|revert)(\([^)]+\))?!?: \S.{2,}/

// The only way an agent-free commit happens: you confirm in your terminal, or press the band's button (--ui).
COMMANDS.commit = ({ pos, flags }) => {
  const R = repo()
  const w = find(R, pos[0])
  const ch = changes(R, w)
  const status = parseStatus(git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], w.path).out)
  let files = status.map(s => s.path)
  if (flags.files) {
    const want = String(flags.files).split(',').map(s => s.trim()).filter(Boolean)
    const bad = want.filter(f => !files.includes(f))
    if (bad.length) die(`Not changed here: ${bad.join(', ')}`)
    files = want
  }
  if (!files.length) die('Nothing to commit.')
  let target = w.branch
  const newBranch = flags.to && flags.to !== w.branch ? flags.to : null
  if (newBranch) target = newBranch
  if (R.cfg.protected.includes(target)) die(`${target} is protected. Commit to a new branch: --to <name> --base <branch>`)
  const msg = String(flags.message || '').trim()
  if (!msg) die('Add a message: -m "fix(sab-123): what changed"')
  if (commitlintOn(R.main) && !CONVENTIONAL.test(msg)) die('commitlint: use type(scope): subject, for example fix(sab-3808): show server login error')
  const ports = String(flags.port || '').split(',').map(s => s.trim()).filter(Boolean)
  const lines = [`${bold(target)}${newBranch ? ` (new, from ${flags.base || ch.base})` : ''} ← will commit ${files.length} file${files.length === 1 ? '' : 's'}:`, ...files.map(f => '  ' + f), `message: ${msg}`]
  if (ports.length) lines.push(`then port to: ${ports.join(', ')}`)
  if (flags['new-mapping']) lines.push(`then create mapping branch on ${flags['new-mapping']} and port to it`)
  lines.push('push: no (separate step)')
  if (!flags.ui) {
    if (!isTTY()) die('A commit needs you: run grove commit in your own terminal, or press commit in the Claude band.')
    say(lines.join('\n'))
    if (!flags.yes && !yes('Commit now?')) return say('cancelled, nothing changed')
  }
  if (newBranch) {
    const from = baseRef(R, flags.base || ch.base)
    const sw = git(['switch', '--no-track', '-c', newBranch, from], w.path)
    if (!sw.ok) die(`Could not create ${newBranch} from ${from}: ${sw.err}`)
    writeMeta(w.path, { base: flags.base || ch.base })
    say(`branch  created ${newBranch} from ${from}`)
  }
  const add = git(['add', '-A', '--', ...files], w.path)
  if (!add.ok) die(add.err)
  grantPass(R, target, 'commit')
  // Hook output (lint-staged, prettier, commitlint) goes straight through, so the band shows it as it runs.
  const cm = spawnSync('git', ['commit', '-m', msg, '--', ...files], { cwd: w.path, stdio: ['ignore', 'inherit', 'inherit'] })
  fs.rmSync(passPath(R), { force: true })
  if (cm.status !== 0) die(`commit failed (exit ${cm.status}): see the hook output above`)
  const head = gitOut(['rev-parse', '--short', 'HEAD'], w.path)
  say(`commit  ${green(head)} ${msg.split('\n')[0]} · ${files.length} files on ${target}`)
  const sha_ = gitOut(['rev-parse', 'HEAD'], w.path)
  const targets = ports.map(p => find(R, p))
  if (flags['new-mapping']) {
    const mb = flags['new-mapping']
    const mBranch = `mapping/${mb}/${target.replace(/^mapping\/[^/]+\//, '')}`
    const folder = `${target.split('/').pop()}-${mb}`.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
    const dir = path.join(rootDir(R), folder)
    git(['fetch', '--quiet', 'origin', mb], R.main)
    const r = git(['worktree', 'add', '--no-track', '-b', mBranch, dir, baseRef(R, mb)], R.main)
    if (!r.ok) say(red(`port    could not create ${mBranch}: ${r.err}`))
    else {
      writeMeta(dir, { base: mb, created: new Date().toISOString() })
      syncDeps(R, dir, { log: () => {} })
      copyEnv(R, dir, () => {})
      say(`branch  created ${mBranch} in ${dir}`)
      targets.push({ path: dir, branch: mBranch })
    }
  }
  for (const t of targets) {
    const tname = nameOf(R, t)
    if (parseStatus(git(['status', '--porcelain=v1', '-z'], t.path).out).length) {
      say(yellow(`port    ✗ ${tname} has uncommitted changes, skipped. Nothing else changed.`))
      break
    }
    const cp = git(['cherry-pick', sha_], t.path)
    if (cp.ok) say(`port    ${green('✓')} ${tname} (${t.branch})`)
    else {
      say(yellow(`port    ✗ conflict in ${tname}. Resolve it there, then git cherry-pick --continue. Stopped here.`))
      break
    }
  }
  say(dim('not pushed. Push when ready: grove push'))
}

COMMANDS.push = ({ pos, flags }) => {
  const R = repo()
  const w = find(R, pos[0])
  if (R.cfg.protected.includes(w.branch)) die(`${w.branch} is protected.`)
  if (!flags.ui) {
    if (!isTTY()) die('A push needs you: run grove push in your own terminal, or press push in the Claude band.')
    if (!flags.yes && !yes(`Push ${w.branch} to origin?`)) return say('cancelled')
  }
  grantPass(R, w.branch, 'push')
  const p = spawnSync('git', ['push', '-u', 'origin', 'HEAD'], { cwd: w.path, stdio: flags.ui ? 'pipe' : 'inherit', encoding: 'utf8' })
  fs.rmSync(passPath(R), { force: true })
  if (p.status !== 0) die(`push failed${flags.ui ? ': ' + (p.stderr || '').trim().split('\n').slice(-4).join('\n') : ''}`)
  say(`pushed  ${w.branch}`)
}

// Lets your own git tools (VS Code, a rebase) commit on this branch for a while.
COMMANDS.allow = ({ pos }) => {
  const R = repo()
  const w = find(R)
  if (!isTTY()) die('Only you can allow commits: run grove allow in your own terminal.')
  const mins = Number(String(pos[0] || '10').replace(/m$/, '')) || 10
  grantPass(R, w.branch, 'any', mins * 60000)
  say(`commits and pushes allowed on ${w.branch} for ${mins} min`)
}

// Moves the running dev services to this worktree (stops them where they run, starts them here).
COMMANDS.move = ({ pos, flags }) => {
  const R = repo()
  if (!R.cfg.run?.move) die('No "run" setting for this repo. Add "run": {"status": "…", "move": "… {services}"} to its grove config.')
  const w = find(R, pos[0])
  const svc = runStatus(R) || []
  const elsewhere = svc.filter(x => !same(x.root, w.path))
  const names = flags.services ? String(flags.services).split(',') : [...new Set(elsewhere.map(x => x.name))]
  if (!names.length) return say(`Nothing to move: no services run outside ${nameOf(R, w)}.`)
  const from = [...new Set(elsewhere.map(x => path.basename(x.root)))].join(', ')
  if (!flags.ui && !flags.yes) {
    if (!isTTY()) die('Moving services needs you: press move here in the band, or add --yes.')
    if (!yes(`Move ${names.join(', ')} from ${from} to ${nameOf(R, w)}?`)) return say('cancelled')
  }
  // Services started without their node_modules all fail ("Cannot find module …"): link or install first.
  if (!same(w.path, R.main) && syncDeps(R, w.path, { install: true }))
    die(`Not moved: ${nameOf(R, w)} is missing node_modules and the install failed. Run "grove install ${nameOf(R, w)}" in a terminal to see why.`)
  const cmd = expandHome(R.cfg.run.move).replace('{services}', names.join(' ')).replace('{path}', quote(w.path))
  say(`moving  ${names.join(', ')} from ${from} → ${nameOf(R, w)}`)
  const r = spawnSync(cmd, { shell: true, cwd: w.path, stdio: flags.ui ? 'pipe' : 'inherit', encoding: 'utf8', timeout: 900000 })
  if (r.status !== 0) die(`move failed${flags.ui ? ': ' + ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-4).join('\n') : ''}`)
  say(green(`moved   services now run from ${nameOf(R, w)}`))
}

// Claude Code status line: runs your existing status line (--wrap "<cmd>"), then adds one grove line.
// Must stay fast, so it reads only this worktree and caches the line for 20 seconds.
COMMANDS.statusline = ({ flags }) => {
  let input = ''
  try {
    input = fs.readFileSync(0, 'utf8')
  } catch {}
  if (flags.wrap) {
    const r = spawnSync(String(flags.wrap), { shell: true, input, encoding: 'utf8', timeout: 8000 })
    if (r.stdout) process.stdout.write(r.stdout.replace(/\n*$/, '\n'))
  }
  let cwd = process.cwd()
  try {
    const j = JSON.parse(input)
    cwd = j.workspace?.current_dir || j.cwd || cwd
  } catch {}
  const cacheFile = path.join(CACHE_DIR, 'statusline', sha(cwd) + '.json')
  const cached = readJSON(cacheFile, null)
  if (cached && Date.now() - cached.at < 20000) return cached.line && say(cached.line)
  let line = ''
  try {
    const R = repo(cwd)
    const w = find(R)
    const dirty = parseStatus(git(['status', '--porcelain=v1', '-z'], w.path).out).length
    const ab = git(['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], w.path)
    const [behind, ahead] = ab.ok ? ab.out.split(/\s+/).map(Number) : [0, 0]
    const svc = runStatus(R) || []
    const runRoot = svc[0]?.root
    const runName = runRoot ? nameOf(R, R.list.find(x => same(x.path, runRoot)) || { path: runRoot }) : ''
    const c2 = (code, t) => `\x1b[${code}m${t}\x1b[0m`
    line = [
      c2(36, 'grove'),
      c2(1, nameOf(R, w)),
      dirty ? c2(33, `${dirty} not committed`) : c2(32, 'clean'),
      `${behind}↓ ${ahead}↑${ab.ok ? '' : ' not pushed'}`,
      runName ? c2(32, runName === nameOf(R, w) ? '▶ dev here' : `▶ dev in ${runName}`) : '',
      c2(2, `${R.list.length} worktrees`),
    ]
      .filter(Boolean)
      .join(c2(2, ' | '))
  } catch {}
  writeJSON(cacheFile, { at: Date.now(), line })
  if (line) say(line)
}

// Used by the Claude band after you press Allow on an agent's git command. The band blocks agents from calling it.
COMMANDS.grant = ({ pos, flags }) => {
  if (!flags.ui) die('Only the band can grant a pass. In a terminal use: grove allow')
  const R = repo()
  grantPass(R, pos[0] || find(R).branch, pos[1] || 'any', Number(flags.ms) || 60000)
  say('granted')
}

// Quiet fetch for the band's ↓ counts: never asks for a password.
COMMANDS.fetch = () => {
  const R = repo()
  const r = spawnSync('git', ['fetch', '--quiet', '--prune', 'origin'], { cwd: R.main, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || 'ssh -o BatchMode=yes' }, timeout: 120000 })
  if (r.status !== 0) die(`fetch failed: ${(r.stderr || '').trim().split('\n').pop()}`)
  say('fetched')
}

// Called by git hooks. Exit 1 blocks the commit or push.
COMMANDS.hook = ({ pos }) => {
  const op = pos[0] === 'pre-push' ? 'push' : 'commit'
  let R
  try {
    R = repo()
  } catch {
    return
  }
  const branch = gitOut(['branch', '--show-current'], R.cwd)
  if (process.env.GROVE_ALLOW === '1') return
  if (R.cfg.protected.includes(branch)) {
    console.error(`grove: ${branch} is protected. Commit on a branch of your own. Real merge or backsync: GROVE_ALLOW=1 git ${op} …`)
    process.exit(1)
  }
  if (!R.cfg.commitGate || takePass(R, branch, op)) return
  console.error(`grove: ${op}s need your OK. Press ${op} in the Claude band, run grove ${op} in your terminal, or grove allow for 10 minutes.`)
  process.exit(1)
}

COMMANDS.env = ({ pos, flags }) => {
  const R = repo()
  const pull = pos[0] === 'pull'
  const w = find(R, pull ? pos[1] : pos[0])
  if (same(w.path, R.main)) die('This is the main checkout: it is the source of the env files.')
  const d = envDiff(R, w.path)
  if (flags.json) return say(JSON.stringify(d))
  if (!pull) {
    for (const f of d) {
      if (!f.exists) say(`${yellow(f.file)}  missing here (grove env pull copies it)`)
      else if (f.missing.length || f.changed.length) say(`${f.file}  ${f.missing.length ? `new in main: ${f.missing.join(', ')}  ` : ''}${f.changed.length ? `different: ${f.changed.join(', ')}` : ''}`)
    }
    if (!d.some(f => !f.exists || f.missing.length || f.changed.length)) say(green('env files match main (values not shown)'))
    return
  }
  for (const f of d) {
    const src = path.join(R.main, f.file), dst = path.join(w.path, f.file)
    if (!f.exists) {
      if (exists(path.dirname(dst))) fs.copyFileSync(src, dst), say(`copied  ${f.file}`)
      continue
    }
    const main = envKeys(src)
    let text = fs.readFileSync(dst, 'utf8')
    const add = f.missing.map(k => `${k}=${main.get(k)}`)
    for (const k of f.changed) if (yes(`${f.file}: replace ${k} with main's value?`)) text = text.replace(new RegExp(`^(\\s*(?:export\\s+)?${k.replace(/[.-]/g, '\\$&')}\\s*=).*$`, 'm'), `$1${main.get(k)}`)
    if (add.length) text += (text.endsWith('\n') ? '' : '\n') + add.join('\n') + '\n'
    fs.writeFileSync(dst, text)
    say(`updated ${f.file}${add.length ? ` · added ${f.missing.join(', ')}` : ''}`)
  }
  if (!same(w.path, R.main)) copyEnv(R, w.path, s => s.includes(': added ') && say(s)) // then keys main lacks but other worktrees have
}

COMMANDS.find = ({ pos }) => {
  const R = repo()
  const q = pos.join(' ')
  if (!q) die('Usage: grove find <text or file name>')
  for (const w of R.list) {
    if (!fs.existsSync(w.path)) continue
    const names = git(['ls-files'], w.path).out.split('\n').filter(f => f.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    const hits = git(['grep', '-n', '-I', '-F', '--max-count=2', '-e', q], w.path).out.split('\n').filter(Boolean).slice(0, 5)
    if (!names.length && !hits.length) continue
    say(bold(nameOf(R, w)) + dim(`  ${w.branch}`))
    for (const n of names) say(`  file  ${n}`)
    for (const h of hits) say(`  ${dim(h.slice(0, 160))}`)
  }
}

COMMANDS['shell-init'] = ({ pos }) => {
  const sh = pos[0] || (IS_WIN ? 'pwsh' : path.basename(process.env.SHELL || 'bash'))
  const posix = `grove() {
  if [ $# -eq 0 ] || [ "$1" = go ] || [ "$1" = - ]; then
    local p; p="$(command grove path "$@")" || return $?
    [ -n "$p" ] && cd "$p"
  else command grove "$@"; fi
}`
  const out = {
    bash: posix,
    zsh: posix,
    fish: `function grove
  if test (count $argv) -eq 0; or test "$argv[1]" = go; or test "$argv[1]" = -
    set -l p (command grove path $argv); and test -n "$p"; and cd $p
  else
    command grove $argv
  end
end`,
    pwsh: `function grove {
  $exe = (Get-Command grove -CommandType Application | Select-Object -First 1).Source
  if ($args.Count -eq 0 -or $args[0] -eq 'go' -or $args[0] -eq '-') {
    $p = & $exe path @args
    if ($LASTEXITCODE -eq 0 -and $p) { Set-Location $p }
  } else { & $exe @args }
}`,
  }
  out.powershell = out.pwsh
  if (!out[sh]) die(`Unknown shell ${sh}. Use bash, zsh, fish or pwsh.`)
  say(out[sh])
}

// One-time setup per machine and repo. Asks before every change.
COMMANDS.setup = ({ flags }) => {
  const R = repo()
  const auto = !!flags.yes
  const ok = q => auto || yes(q)
  say(bold(`grove setup for ${R.name}`))
  // 1. repo config
  const cfgFile = path.join(CONFIG_DIR, 'repos', `${R.name}.json`)
  if (!exists(cfgFile)) {
    const nested = git(['check-ignore', '-q', '.claude/worktrees/x'], R.main).ok
    const proposal = {
      root: nested ? '.claude/worktrees' : `../${R.name}.worktrees`,
      protected: [...new Set(['main', 'master', ...['internal', 'develop', 'dev', 'prod', 'production', 'staging', 'stagev2', 'uatv3', 'dashboardv2'].filter(b => refExists(R.main, `refs/remotes/origin/${b}`))])],
      defaultBase: remoteHead(R.main) || 'main',
    }
    say(`config  ${cfgFile}\n${JSON.stringify(proposal, null, 2)}`)
    if (ok('Write this config?')) writeJSON(cfgFile, proposal)
  } else say(`config  ${cfgFile} (exists, kept)`)
  // 2. commit gate
  const hooksPath = gitOut(['config', '--get', 'core.hooksPath'], R.main)
  if (hooksPath && exists(path.join(R.main, hooksPath, '_', 'husky.sh'))) {
    const rc = path.join(HOME, '.huskyrc')
    const line = `# grove commit gate\n[ "$(basename -- "$0")" = pre-commit ] && command -v grove >/dev/null 2>&1 && { grove hook pre-commit || exit 1; }\n`
    const cur = exists(rc) ? fs.readFileSync(rc, 'utf8') : ''
    if (cur.includes('grove hook')) say('gate    ~/.huskyrc already has the grove gate')
    else if (ok('Add the commit gate to ~/.huskyrc (husky runs it before every commit)?')) fs.appendFileSync(rc, line), say('gate    added to ~/.huskyrc')
  } else if (hooksPath && exists(path.join(R.main, hooksPath, '_', 'h'))) {
    const rc = path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'husky', 'init.sh')
    const cur = exists(rc) ? fs.readFileSync(rc, 'utf8') : ''
    if (cur.includes('grove hook')) say('gate    husky init.sh already has the grove gate')
    else if (ok(`Add the commit gate to ${rc}?`)) {
      fs.mkdirSync(path.dirname(rc), { recursive: true })
      fs.appendFileSync(rc, `# grove commit gate\ncase "$(basename -- "$0")" in pre-commit|pre-push) command -v grove >/dev/null 2>&1 && { grove hook "$(basename -- "$0")" || exit 1; };; esac\n`)
      say(`gate    added to ${rc}`)
    }
  } else if (hooksPath) say(yellow(`gate    core.hooksPath is ${hooksPath}: add this line to its pre-commit hook yourself: grove hook pre-commit || exit 1`))
  else {
    for (const h of ['pre-commit', 'pre-push']) {
      const f = path.join(R.common, 'hooks', h)
      const cur = exists(f) ? fs.readFileSync(f, 'utf8') : ''
      if (cur.includes('grove hook')) continue
      if (!ok(`Install the ${h} gate in ${f}?`)) continue
      if (cur) fs.renameSync(f, f + '.grove-orig')
      fs.mkdirSync(path.dirname(f), { recursive: true })
      fs.writeFileSync(f, `#!/bin/sh\ngrove hook ${h} || exit 1\n[ -x "$0.grove-orig" ] && exec "$0.grove-orig" "$@"\nexit 0\n`, { mode: 0o755 })
      say(`gate    ${h} installed`)
    }
  }
  // 3. shell
  const shell = IS_WIN ? 'pwsh' : path.basename(process.env.SHELL || 'bash')
  const rcFile = { bash: '.bashrc', zsh: '.zshrc' }[shell]
  if (rcFile) {
    const f = path.join(HOME, rcFile)
    const cur = exists(f) ? fs.readFileSync(f, 'utf8') : ''
    if (cur.includes('grove shell-init')) say(`shell   ${rcFile} already loads grove`)
    else if (ok(`Add grove to ~/${rcFile} (so "grove" alone can cd)?`)) fs.appendFileSync(f, `\n# grove: pick and cd into worktrees\ncommand -v grove >/dev/null && eval "$(grove shell-init ${shell})"\n`), say(`shell   added to ~/${rcFile}, open a new terminal`)
  } else say(`shell   add this to your profile: grove shell-init ${shell} | Invoke-Expression (pwsh) or grove shell-init fish | source`)
  excludeTaskFile(R)
  say(green('done'))
}

COMMANDS.help = () =>
  say(`grove ${VERSION}: git worktrees made easy

  grove                       pick a worktree and cd there (after: grove setup)
  grove ls [--json]           every worktree: changes, ↓ to pull ↑ to push, drift
  grove here [--copy path|branch|session]
  grove new <ticket> --base <branch> [--type fix|feat] [--no-pull] [--no-install] [--open]
  grove open [name]           new terminal tab + the chat linked to that worktree
  grove diff [name] [file]    changed files vs base, then one file
  grove review [name] <file>  who changed each line and when, plus the file timeline
  grove cmp <a> [b]           port check: commits ported or missing, files that differ
  grove commit [name] -m "msg" [--files a,b] [--to branch --base b] [--port t1,t2] [--new-mapping base]
  grove push [name]           push, after you confirm
  grove allow [10m]           let your own git tools commit here for a while
  grove env [name] | grove env pull [name]
  grove install | sync [name] shared node_modules for this worktree's lockfiles
  grove find <text>           which worktree has this code or file
  grove move [name]           move the running dev services here (needs "run" in config)
  grove rm <name> [--force]   remove (refuses when work would be lost); merges its chats first
  grove sessions [name] [--dry-run]  chats of worktrees (live and deleted) into the main checkout's resume list
  grove setup                 one-time: config, commit gate, shell
  grove shell-init <shell>    the cd wrapper for bash, zsh, fish or pwsh

Docs: ${path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'README.md')}`)

COMMANDS['--version'] = COMMANDS.version = () => say(VERSION)

// ---------- main ----------
const [cmd = 'help', ...rest] = process.argv.slice(2)
const fn = COMMANDS[cmd] || COMMANDS[{ '-h': 'help', '--help': 'help', '-v': 'version' }[cmd]]
try {
  if (!fn) die(`Unknown command "${cmd}". Run: grove help`)
  fn(parseArgs(rest))
} catch (e) {
  if (e instanceof Fail) {
    console.error(red('grove: ') + e.message)
    process.exit(1)
  }
  throw e
}
