import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { env } from "../../config/env.js";
import { verifyAppPassword } from "../appPasswords/appPasswords.service.js";
import {
  currentVersion,
  createFolder,
  getEntry,
  kindForName,
  listChildren,
  MAX_STORED_OTHER_BYTES,
  move,
  storeUpload,
  type DavEntry,
  type FileKind,
} from "./dav.service.js";
import { baseName, hrefFor, normalizeDavPath, parentPath } from "./davPath.js";
import { absoluteDavPath, ensureDavDirs, newTempPath, removeTempFile } from "./davStorage.js";

/*
 * The WebDAV target for Goodnotes Auto-Backup. Implements what Goodnotes
 * was observed to use (OPTIONS, PROPFIND, MKCOL, PUT, GET/HEAD, MOVE, and
 * LOCK/UNLOCK/PROPPATCH answered with harmless fakes); everything is
 * scoped to the user the app password belongs to. Runs as its own plain
 * node:http server so big uploads stream straight to disk without Express
 * body parsing, and so it can live on its own port at the root path
 * behind the reverse proxy.
 *
 * DELETE is refused on purpose: Goodnotes never sends it, and letting any
 * WebDAV client wipe Hefte (and every link into them) is worse than making
 * the user archive them in the app.
 */

const REALM = "Schulmanager";
const PDF_MAGIC = Buffer.from("%PDF");

function send(res: ServerResponse, status: number, headers: Record<string, string> = {}) {
  res.writeHead(status, headers);
  res.end();
}

function escapeXml(value: string) {
  return value.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

function contentTypeFor(path: string) {
  return path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
}

function propResponse(path: string, entry: DavEntry) {
  const isCollection = entry.type !== "file";
  const name = path === "" ? "/" : baseName(path);
  const modified = entry.type === "file" ? entry.file.modifiedAt : entry.type === "folder" ? entry.folder.updatedAt : new Date(0);
  const created = entry.type === "file" ? entry.file.createdAt : entry.type === "folder" ? entry.folder.createdAt : new Date(0);
  const fileProps =
    entry.type === "file"
      ? `<d:getcontentlength>${entry.file.size}</d:getcontentlength>
<d:getcontenttype>${contentTypeFor(path)}</d:getcontenttype>
<d:getetag>"${entry.file.sha256 ?? `${entry.file.size.toString(16)}-${entry.file.modifiedAt.getTime().toString(16)}`}"</d:getetag>`
      : "";
  return `<d:response>
<d:href>${escapeXml(hrefFor(path, isCollection))}</d:href>
<d:propstat><d:prop>
<d:displayname>${escapeXml(name)}</d:displayname>
<d:resourcetype>${isCollection ? "<d:collection/>" : ""}</d:resourcetype>
<d:getlastmodified>${modified.toUTCString()}</d:getlastmodified>
<d:creationdate>${created.toISOString()}</d:creationdate>
${fileProps}
</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
</d:response>`;
}

function sendXml(res: ServerResponse, status: number, xml: string, headers: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "application/xml; charset=utf-8", ...headers });
  res.end(`<?xml version="1.0" encoding="utf-8"?>\n${xml}`);
}

async function drainBody(req: IncomingMessage) {
  for await (const chunk of req) void chunk;
}

function basicCredentials(req: IncomingMessage) {
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return { email: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

/** Streams the request body to a temp file (or nowhere, for placeholders)
 * while hashing it. Resolves null if it exceeds the upload limit. */
async function receiveUpload(req: IncomingMessage, keepBytes: boolean) {
  const limit = env.DAV_MAX_UPLOAD_MB * 1024 * 1024;
  const tempPath = keepBytes ? newTempPath() : null;
  const out = tempPath ? fs.createWriteStream(tempPath) : null;
  const hash = createHash("sha256");
  let size = 0;
  let head = Buffer.alloc(0);
  try {
    for await (const chunk of req as AsyncIterable<Buffer>) {
      size += chunk.length;
      if (size > limit) {
        out?.destroy();
        if (tempPath) await removeTempFile(tempPath);
        return null;
      }
      if (head.length < PDF_MAGIC.length) head = Buffer.concat([head, chunk.subarray(0, PDF_MAGIC.length)]);
      hash.update(chunk);
      if (out && !out.write(chunk)) await new Promise<void>((resolve) => out.once("drain", () => resolve()));
    }
    if (out) await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
  } catch (err) {
    out?.destroy();
    if (tempPath) await removeTempFile(tempPath);
    throw err;
  }
  return { tempPath, size, sha256: hash.digest("hex"), head };
}

async function handlePut(req: IncomingMessage, res: ServerResponse, userId: string, path: string) {
  if (path === "") return send(res, 405);
  const entry = await getEntry(userId, path);
  if (entry?.type === "folder") return send(res, 405);
  const parent = parentPath(path);
  if (parent !== "") {
    const parentEntry = await getEntry(userId, parent);
    if (parentEntry?.type === "file") return send(res, 409);
  }

  let kind: FileKind = kindForName(path);
  const upload = await receiveUpload(req, kind !== "PLACEHOLDER");
  if (!upload) return send(res, 413);

  // A ".pdf" that isn't one (or a huge unknown file) isn't worth keeping.
  if (kind === "PDF" && !upload.head.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) kind = "OTHER";
  if (kind === "OTHER" && upload.size > MAX_STORED_OTHER_BYTES) kind = "PLACEHOLDER";

  const { existed } = await storeUpload(userId, path, kind, upload);
  send(res, existed ? 204 : 201);
}

async function handleGet(req: IncomingMessage, res: ServerResponse, userId: string, path: string) {
  const entry = await getEntry(userId, path);
  if (!entry) return send(res, 404);
  if (entry.type !== "file") return send(res, 200, { "Content-Length": "0" });
  const version = entry.file.kind === "PLACEHOLDER" ? null : await currentVersion(entry.file.id);
  // Placeholders exist for PROPFIND/MOVE only - their bytes were never kept.
  if (!version) return send(res, 404);
  const headers = {
    "Content-Type": contentTypeFor(path),
    "Content-Length": String(version.size),
    "Last-Modified": entry.file.modifiedAt.toUTCString(),
    ETag: `"${version.sha256}"`,
  };
  res.writeHead(200, headers);
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(absoluteDavPath(version.storagePath))
    .on("error", () => res.destroy())
    .pipe(res);
}

async function handlePropfind(req: IncomingMessage, res: ServerResponse, userId: string, path: string) {
  await drainBody(req);
  const entry = await getEntry(userId, path);
  if (!entry) return send(res, 404);
  const depth = String(req.headers.depth ?? "infinity");
  const parts = [propResponse(path, entry)];
  if (entry.type !== "file" && depth !== "0") {
    const { folders, files } = await listChildren(userId, path, depth === "infinity");
    for (const folder of folders) parts.push(propResponse(folder.path, { type: "folder", folder }));
    for (const file of files) parts.push(propResponse(file.path, { type: "file", file }));
  }
  sendXml(res, 207, `<d:multistatus xmlns:d="DAV:">\n${parts.join("\n")}\n</d:multistatus>`);
}

async function handleMkcol(req: IncomingMessage, res: ServerResponse, userId: string, path: string) {
  await drainBody(req);
  if (path === "" || (await getEntry(userId, path))) return send(res, 405);
  const parent = parentPath(path);
  if (parent !== "") {
    const parentEntry = await getEntry(userId, parent);
    if (!parentEntry || parentEntry.type === "file") return send(res, 409);
  }
  await createFolder(userId, path);
  send(res, 201);
}

async function handleMove(req: IncomingMessage, res: ServerResponse, userId: string, path: string) {
  await drainBody(req);
  const destination = req.headers.destination ? normalizeDavPath(String(req.headers.destination)) : null;
  if (destination === null) return send(res, 400);
  const overwrite = String(req.headers.overwrite ?? "T").toUpperCase() !== "F";
  const result = await move(userId, path, destination, overwrite);
  const status = { created: 201, replaced: 204, "not-found": 404, "precondition-failed": 412, conflict: 409 }[result];
  send(res, status);
}

async function handleLock(req: IncomingMessage, res: ServerResponse) {
  await drainBody(req);
  // Goodnotes is the only writer, so locks aren't enforced - but clients
  // expect a well-formed answer with a token they can send back.
  const token = `opaquelocktoken:${randomBytes(16).toString("hex")}`;
  sendXml(
    res,
    200,
    `<d:prop xmlns:d="DAV:"><d:lockdiscovery><d:activelock>
<d:locktype><d:write/></d:locktype><d:lockscope><d:exclusive/></d:lockscope>
<d:depth>${escapeXml(String(req.headers.depth ?? "0"))}</d:depth><d:timeout>Second-3600</d:timeout>
<d:locktoken><d:href>${token}</d:href></d:locktoken>
</d:activelock></d:lockdiscovery></d:prop>`,
    { "Lock-Token": `<${token}>` },
  );
}

async function handleProppatch(req: IncomingMessage, res: ServerResponse, path: string) {
  await drainBody(req);
  // Goodnotes may try to set modification dates; nothing it sets matters.
  sendXml(
    res,
    207,
    `<d:multistatus xmlns:d="DAV:"><d:response><d:href>${escapeXml(hrefFor(path, false))}</d:href>
<d:propstat><d:prop/><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`,
  );
}

async function route(req: IncomingMessage, res: ServerResponse, userId: string, path: string) {
  switch (req.method) {
    case "OPTIONS":
      return send(res, 200, {
        DAV: "1, 2",
        "MS-Author-Via": "DAV",
        Allow: "OPTIONS, GET, HEAD, PUT, MKCOL, MOVE, PROPFIND, PROPPATCH, LOCK, UNLOCK",
        "Content-Length": "0",
      });
    case "PROPFIND":
      return handlePropfind(req, res, userId, path);
    case "PROPPATCH":
      return handleProppatch(req, res, path);
    case "MKCOL":
      return handleMkcol(req, res, userId, path);
    case "PUT":
      return handlePut(req, res, userId, path);
    case "GET":
    case "HEAD":
      return handleGet(req, res, userId, path);
    case "MOVE":
      return handleMove(req, res, userId, path);
    case "LOCK":
      return handleLock(req, res);
    case "UNLOCK":
      await drainBody(req);
      return send(res, 204);
    case "DELETE":
      await drainBody(req);
      return send(res, 403);
    default:
      await drainBody(req);
      return send(res, 405);
  }
}

const LOGGED_METHODS = new Set(["PUT", "MKCOL", "MOVE", "DELETE"]);

export function createDavHandler() {
  ensureDavDirs();
  return async (req: IncomingMessage, res: ServerResponse) => {
    const started = Date.now();
    const path = normalizeDavPath(req.url ?? "/");
    if (env.NODE_ENV !== "test" && LOGGED_METHODS.has(req.method ?? "")) {
      res.on("finish", () => {
        const dest = req.headers.destination ? ` -> ${normalizeDavPath(String(req.headers.destination))}` : "";
        console.log(`[dav] ${res.statusCode} ${req.method} /${path ?? "?"}${dest} (${Date.now() - started} ms)`);
      });
    }

    try {
      // Goodnotes starts every batch unauthenticated and only sends
      // credentials after a 401 with a challenge - never just reject.
      const credentials = basicCredentials(req);
      const userId = credentials ? await verifyAppPassword(credentials.email, credentials.password) : null;
      if (!userId) {
        await drainBody(req);
        return send(res, 401, { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` });
      }
      if (path === null) {
        await drainBody(req);
        return send(res, 400);
      }
      await route(req, res, userId, path);
    } catch (err) {
      console.error("[dav] Fehler", req.method, path, err);
      if (!res.headersSent) send(res, 500);
      else res.destroy();
    }
  };
}

export function startDavServer() {
  if (!env.DAV_PORT) return null;
  const server = http.createServer(createDavHandler());
  // Hefte reach ~200 MB; don't let Node's default 5-minute request timeout
  // cut off a slow upload.
  server.requestTimeout = 0;
  server.listen(env.DAV_PORT, () => {
    console.log(`Schulmanager WebDAV (Goodnotes) listening on port ${env.DAV_PORT}`);
  });
  return server;
}
