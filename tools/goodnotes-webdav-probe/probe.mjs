/* global process, console, Buffer, URL */
// Minimal WebDAV server that stores whatever a client (Goodnotes Auto
// Backup) uploads and logs every request, so we can see exactly which
// methods, paths, file names and folder layout Goodnotes uses before
// building the real integration. Not part of the Schulmanager app.
// Usage: see README.md next to this file.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

const PORT = Number(process.env.PORT ?? 6970)
const DATA_DIR = path.resolve(process.env.DATA_DIR ?? './probe-data')
const FILES_DIR = path.join(DATA_DIR, 'files')
const LOG_FILE = path.join(DATA_DIR, 'requests.jsonl')
const USER = process.env.PROBE_USER ?? 'goodnotes'
const PASS = process.env.PROBE_PASS ?? randomBytes(9).toString('base64url')
const MAX_LOGGED_BODY = 4000

fs.mkdirSync(FILES_DIR, { recursive: true })

const log = fs.createWriteStream(LOG_FILE, { flags: 'a' })

function safeEqual(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function checkAuth(req) {
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Basic ')) return { ok: false, user: null }
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const sep = decoded.indexOf(':')
  const user = decoded.slice(0, sep)
  const pass = decoded.slice(sep + 1)
  return { ok: safeEqual(user, USER) && safeEqual(pass, PASS), user }
}

/** Maps a request path (or a Destination URL) to a location inside
 * FILES_DIR, refusing anything that would escape it. */
function resolvePath(rawPath) {
  const pathname = decodeURIComponent(new URL(rawPath, 'http://x').pathname)
  const full = path.resolve(FILES_DIR, '.' + path.posix.normalize(pathname))
  if (full !== FILES_DIR && !full.startsWith(FILES_DIR + path.sep)) return null
  return full
}

function hrefFor(fullPath, isDir) {
  const rel = path.relative(FILES_DIR, fullPath).split(path.sep).map(encodeURIComponent).join('/')
  const href = '/' + rel
  return isDir && !href.endsWith('/') ? href + '/' : href
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])
}

function propResponse(fullPath, stat) {
  const isDir = stat.isDirectory()
  const name = path.basename(fullPath) || '/'
  return `<d:response>
<d:href>${escapeXml(hrefFor(fullPath, isDir))}</d:href>
<d:propstat><d:prop>
<d:displayname>${escapeXml(name)}</d:displayname>
<d:resourcetype>${isDir ? '<d:collection/>' : ''}</d:resourcetype>
${isDir ? '' : `<d:getcontentlength>${stat.size}</d:getcontentlength>`}
${isDir ? '' : `<d:getcontenttype>${name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'}</d:getcontenttype>`}
<d:getlastmodified>${stat.mtime.toUTCString()}</d:getlastmodified>
<d:creationdate>${stat.birthtime.toISOString()}</d:creationdate>
<d:getetag>"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"</d:getetag>
</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
</d:response>`
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function exists(p) {
  return fsp.stat(p).then(
    (s) => s,
    () => null,
  )
}

async function handle(req, res, entry) {
  const target = resolvePath(req.url)
  if (!target) return send(res, 403)

  switch (req.method) {
    case 'OPTIONS':
      res.setHeader('DAV', '1, 2')
      res.setHeader('MS-Author-Via', 'DAV')
      res.setHeader('Allow', 'OPTIONS, GET, HEAD, PUT, DELETE, MKCOL, COPY, MOVE, PROPFIND, PROPPATCH, LOCK, UNLOCK')
      return send(res, 200)

    case 'PROPFIND': {
      const body = await readBody(req)
      entry.requestBody = body.toString('utf8').slice(0, MAX_LOGGED_BODY)
      const stat = await exists(target)
      if (!stat) return send(res, 404)
      const depth = req.headers.depth ?? 'infinity'
      const parts = [propResponse(target, stat)]
      if (stat.isDirectory() && depth !== '0') {
        for (const name of await fsp.readdir(target)) {
          const child = path.join(target, name)
          parts.push(propResponse(child, await fsp.stat(child)))
        }
      }
      const xml = `<?xml version="1.0" encoding="utf-8"?>\n<d:multistatus xmlns:d="DAV:">\n${parts.join('\n')}\n</d:multistatus>`
      res.writeHead(207, { 'Content-Type': 'application/xml; charset=utf-8' })
      return res.end(xml)
    }

    case 'PROPPATCH': {
      const body = await readBody(req)
      entry.requestBody = body.toString('utf8').slice(0, MAX_LOGGED_BODY)
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:"><d:response><d:href>${escapeXml(hrefFor(target, false))}</d:href>
<d:propstat><d:prop/><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`
      res.writeHead(207, { 'Content-Type': 'application/xml; charset=utf-8' })
      return res.end(xml)
    }

    case 'MKCOL': {
      if (await exists(target)) return send(res, 405)
      if (!(await exists(path.dirname(target)))) return send(res, 409)
      await fsp.mkdir(target)
      return send(res, 201)
    }

    case 'PUT': {
      const existed = Boolean(await exists(target))
      const parentExisted = Boolean(await exists(path.dirname(target)))
      entry.parentExisted = parentExisted
      await fsp.mkdir(path.dirname(target), { recursive: true })
      const hash = createHash('sha256')
      let size = 0
      const out = fs.createWriteStream(target)
      for await (const chunk of req) {
        hash.update(chunk)
        size += chunk.length
        if (!out.write(chunk)) await new Promise((r) => out.once('drain', r))
      }
      await new Promise((r) => out.end(r))
      entry.bytes = size
      entry.sha256 = hash.digest('hex')
      entry.overwrote = existed
      return send(res, existed ? 204 : 201)
    }

    case 'GET':
    case 'HEAD': {
      const stat = await exists(target)
      if (!stat) return send(res, 404)
      if (stat.isDirectory()) return send(res, 200)
      res.writeHead(200, { 'Content-Length': stat.size, 'Last-Modified': stat.mtime.toUTCString() })
      if (req.method === 'HEAD') return res.end()
      return fs.createReadStream(target).pipe(res)
    }

    case 'DELETE': {
      if (!(await exists(target))) return send(res, 404)
      await fsp.rm(target, { recursive: true, force: true })
      return send(res, 204)
    }

    case 'MOVE':
    case 'COPY': {
      const dest = req.headers.destination ? resolvePath(String(req.headers.destination)) : null
      if (!dest) return send(res, 400)
      if (!(await exists(target))) return send(res, 404)
      const destExisted = Boolean(await exists(dest))
      if (destExisted && req.headers.overwrite === 'F') return send(res, 412)
      if (destExisted) await fsp.rm(dest, { recursive: true, force: true })
      await fsp.mkdir(path.dirname(dest), { recursive: true })
      if (req.method === 'MOVE') await fsp.rename(target, dest)
      else await fsp.cp(target, dest, { recursive: true })
      return send(res, destExisted ? 204 : 201)
    }

    case 'LOCK': {
      const body = await readBody(req)
      entry.requestBody = body.toString('utf8').slice(0, MAX_LOGGED_BODY)
      const token = `opaquelocktoken:${randomBytes(16).toString('hex')}`
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<d:prop xmlns:d="DAV:"><d:lockdiscovery><d:activelock>
<d:locktype><d:write/></d:locktype><d:lockscope><d:exclusive/></d:lockscope>
<d:depth>${escapeXml(String(req.headers.depth ?? '0'))}</d:depth><d:timeout>Second-3600</d:timeout>
<d:locktoken><d:href>${token}</d:href></d:locktoken>
</d:activelock></d:lockdiscovery></d:prop>`
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Lock-Token': `<${token}>` })
      return res.end(xml)
    }

    case 'UNLOCK':
      return send(res, 204)

    default:
      return send(res, 405)
  }
}

function send(res, status) {
  res.writeHead(status)
  res.end()
}

const server = http.createServer(async (req, res) => {
  const started = Date.now()
  const entry = {
    time: new Date().toISOString(),
    method: req.method,
    path: decodeURIComponent(req.url ?? ''),
    destination: req.headers.destination ? decodeURIComponent(String(req.headers.destination)) : undefined,
    depth: req.headers.depth,
    overwrite: req.headers.overwrite,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    userAgent: req.headers['user-agent'],
    // Which IP the reverse proxy saw - tells us whether the home-network-only
    // rule would let the iPad through.
    forwardedFor: req.headers['x-forwarded-for'],
    remoteAddress: req.socket.remoteAddress,
    otherHeaders: Object.fromEntries(
      Object.entries(req.headers).filter(([k]) => /^(if|lock|x-oc|oc-|x-goodnotes)/i.test(k)),
    ),
  }

  res.on('finish', () => {
    entry.status = res.statusCode
    entry.ms = Date.now() - started
    log.write(JSON.stringify(entry) + '\n')
    const extra = entry.destination ? ` -> ${entry.destination}` : entry.bytes !== undefined ? ` (${entry.bytes} B)` : ''
    console.log(`${entry.time} ${entry.status} ${entry.method} ${entry.path}${extra}`)
  })

  const auth = checkAuth(req)
  entry.user = auth.user
  try {
    if (!auth.ok) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="goodnotes-probe"' })
      res.end()
    } else {
      await handle(req, res, entry)
    }
  } catch (err) {
    entry.error = err instanceof Error ? err.message : String(err)
    if (!res.headersSent) send(res, 500)
    else res.end()
  }
})

server.listen(PORT, () => {
  console.log(`Goodnotes WebDAV probe on port ${PORT}`)
  console.log(`Files: ${FILES_DIR}`)
  console.log(`Log:   ${LOG_FILE}`)
  console.log(`Login: ${USER} / ${process.env.PROBE_PASS ? '(from PROBE_PASS)' : PASS}`)
})
