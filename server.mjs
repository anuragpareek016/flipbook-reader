import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const NODE_MODULES = path.join(__dirname, 'node_modules');
const DATA_DIR = path.join(process.env.DEVELOPER_ROOT || '/Users/openfrontierlabs/Developer', 'data', 'flipbook-reader');
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json');
const SERVER_INFO_FILE = path.join(DATA_DIR, 'server.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.properties': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

const COMFORT_SOUNDS_DIR = '/System/Library/PrivateFrameworks/HearingUtilities.framework/Resources';
const COMFORT_SOUND_FILES = new Map([
  ['Rain', 'Rain.m4a'],
  ['RainOnRoof', 'RainOnRoof.m4a'],
  ['Stream', 'Stream.m4a'],
  ['Ocean', 'Ocean.m4a'],
  ['Fire', 'Fire.m4a'],
  ['Night', 'Night.m4a'],
  ['QuietNight', 'QuietNight.m4a'],
  ['Steam', 'Steam.m4a'],
  ['BrownNoise', 'BrownNoise.m4a'],
  ['PinkNoise', 'PinkNoise.m4a'],
  ['WhiteNoise', 'WhiteNoise.m4a'],
  ['Train', 'Train.m4a'],
  ['Airplane', 'Airplane.m4a'],
  ['Boat', 'Boat.m4a'],
  ['Bus', 'Bus.m4a'],
  ['Babble', 'Babble.m4a'],
]);

function loadLibrary() {
  try {
    if (fs.existsSync(LIBRARY_FILE)) {
      const raw = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
      if (raw && typeof raw === 'object') {
        return {
          books: Array.isArray(raw.books) ? raw.books : [],
          settings: raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings) ? raw.settings : {},
        };
      }
    }
  } catch (err) {
    // Preserve corrupt library before resetting so user annotations are never silently lost
    try {
      if (fs.existsSync(LIBRARY_FILE)) {
        const backup = `${LIBRARY_FILE}.corrupt-${Date.now()}.bak`;
        fs.copyFileSync(LIBRARY_FILE, backup);
      }
    } catch {
      // ignore backup errors
    }
    console.error('Warning: Failed to parse library.json, reset cleanly:', err.message);
  }
  return { books: [], settings: {} };
}

function saveLibrary(lib) {
  const tmp = `${LIBRARY_FILE}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(lib, null, 2), 'utf8');
    fs.renameSync(tmp, LIBRARY_FILE);
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore cleanup error
    }
    throw err;
  }
}

function bookIdForPath(resolvedPath) {
  return crypto.createHash('sha256').update(resolvedPath).digest('hex').slice(0, 16);
}

function registerLocalPdf(filePath, initialPage = null) {
  const resolved = fs.realpathSync(path.resolve(filePath));
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error('Not a regular file');
  }
  if (path.extname(resolved).toLowerCase() !== '.pdf') {
    throw new Error('Only PDF files are supported');
  }

  const id = bookIdForPath(resolved);
  const title = path.basename(resolved).replace(/\.pdf$/i, '');
  const lib = loadLibrary();
  const existing = lib.books.find((b) => b.id === id);
  const now = new Date().toISOString();

  if (existing) {
    existing.path = resolved;
    existing.title = existing.title || title;
    existing.size = stat.size;
    existing.lastOpened = now;
    if (Number.isFinite(initialPage) && initialPage >= 1) {
      existing.lastPage = Math.floor(initialPage);
    }
  } else {
    lib.books.unshift({
      id,
      path: resolved,
      title,
      size: stat.size,
      lastPage: Number.isFinite(initialPage) && initialPage >= 1 ? Math.floor(initialPage) : 1,
      bookmarks: [],
      stickyTabs: [],
      highlights: [],
      marginNotes: [],
      pinnedRefs: [],
      lastOpened: now,
    });
  }

  // Keep most recent 40 books
  lib.books.sort((a, b) => (b.lastOpened || '').localeCompare(a.lastOpened || ''));
  if (lib.books.length > 40) lib.books = lib.books.slice(0, 40);
  saveLibrary(lib);
  return lib.books.find((b) => b.id === id);
}

const MAX_JSON_BODY_BYTES = 16 * 1024 * 1024;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    req.on('data', (chunk) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        fail(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      try {
        const raw = chunks.length ? Buffer.concat(chunks).toString('utf8') : '';
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', fail);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function pipeStreamSafely(res, filePath, streamOptions = undefined) {
  const stream = fs.createReadStream(filePath, streamOptions);
  const destroyStream = () => {
    if (!stream.destroyed) stream.destroy();
  };
  res.on('close', destroyStream);
  stream.on('error', () => {
    res.off('close', destroyStream);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Failed to read file');
    } else if (!res.destroyed) {
      res.destroy();
    }
  });
  stream.pipe(res);
}

function sendStaticFile(req, res, rootDir, relPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }

  let realRoot;
  let realFull;
  let stat;
  try {
    realRoot = fs.realpathSync(rootDir);
    const safeRel = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/, '');
    const fullPath = path.resolve(realRoot, safeRel);
    if (fullPath !== realRoot && !fullPath.startsWith(realRoot + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    realFull = fs.realpathSync(fullPath);
    if (realFull !== realRoot && !realFull.startsWith(realRoot + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    stat = fs.statSync(realFull);
    if (!stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  } catch (err) {
    if (err && (err.code === 'EACCES' || err.code === 'EPERM')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(realFull).toLowerCase();
  const isVendor = path.resolve(rootDir) === path.resolve(NODE_MODULES);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': isVendor ? 'public, max-age=3600' : 'no-store',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  pipeStreamSafely(res, realFull);
}

function streamFileWithRanges(
  req,
  res,
  filePath,
  contentType = 'application/pdf',
  cacheControl = 'no-cache',
  notFoundMessage = 'File not found on disk'
) {
  let stat;
  try {
    stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
  } catch {
    res.writeHead(404);
    res.end(notFoundMessage);
    return;
  }

  const total = stat.size;
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': total,
      'Cache-Control': cacheControl,
    });
    res.end();
    return;
  }

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` });
      res.end();
      return;
    }

    let start;
    let end;
    if (!match[1]) {
      const suffixLen = parseInt(match[2], 10);
      if (!Number.isFinite(suffixLen) || suffixLen <= 0 || total === 0) {
        res.writeHead(416, { 'Content-Range': `bytes */${total}` });
        res.end();
        return;
      }
      start = Math.max(0, total - suffixLen);
      end = total - 1;
    } else {
      start = parseInt(match[1], 10);
      end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
        res.writeHead(416, { 'Content-Range': `bytes */${total}` });
        res.end();
        return;
      }
    }

    res.writeHead(206, {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': end - start + 1,
      'Cache-Control': cacheControl,
    });
    pipeStreamSafely(res, filePath, { start, end });
  } else {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': total,
      'Cache-Control': cacheControl,
    });
    pipeStreamSafely(res, filePath);
  }
}

let pendingMacPickPromise = null;

function pickPdfWithMacDialog() {
  if (pendingMacPickPromise) return pendingMacPickPromise;
  pendingMacPickPromise = new Promise((resolve) => {
    const script = 'POSIX path of (choose file with prompt "Select a PDF book to read" of type {"com.adobe.pdf", "pdf"})';
    execFile('/usr/bin/osascript', ['-e', script], { timeout: 120000 }, (err, stdout, stderr) => {
      pendingMacPickPromise = null;
      if (err) {
        const msg = `${err.message || ''}\n${stderr || ''}`;
        if (/User canceled|\(-128\)/i.test(msg)) {
          resolve({ cancelled: true, path: null, error: null });
        } else {
          resolve({ cancelled: false, path: null, error: (stderr || err.message || 'osascript failed').trim() });
        }
        return;
      }
      const chosen = stdout.trim();
      resolve(chosen ? { cancelled: false, path: chosen, error: null } : { cancelled: true, path: null, error: null });
    });
  });
  return pendingMacPickPromise;
}

const cliArgs = process.argv.slice(2);
let requestedPort = 0;
let initialFile = null;
let initialPage = null;
let registerOnly = false;
let writeServerInfo = true;
let watchStdin = false;

for (let i = 0; i < cliArgs.length; i++) {
  const arg = cliArgs[i];
  if (arg === '--port' && cliArgs[i + 1]) {
    const parsedPort = parseInt(cliArgs[++i], 10);
    if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
      console.error('Invalid port:', cliArgs[i]);
      process.exit(1);
    }
    requestedPort = parsedPort;
  } else if (arg === '--page' && cliArgs[i + 1]) {
    const parsedPage = parseInt(cliArgs[++i], 10);
    initialPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : null;
  } else if (arg === '--register') {
    registerOnly = true;
  } else if (arg === '--no-server-info') {
    writeServerInfo = false;
  } else if (arg === '--watch-stdin') {
    watchStdin = true;
  } else if (!arg.startsWith('-') && !initialFile) {
    initialFile = arg;
  }
}

if (registerOnly) {
  if (!initialFile || !fs.existsSync(initialFile)) {
    console.error('File not found:', initialFile || '');
    process.exit(1);
  }
  try {
    const book = registerLocalPdf(initialFile, initialPage);
    console.log(JSON.stringify(book));
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

let activeBook = null;
if (initialFile && fs.existsSync(initialFile)) {
  try {
    activeBook = registerLocalPdf(initialFile, initialPage);
  } catch (err) {
    console.error(`Warning: Could not register initial file ${initialFile}:`, err.message);
  }
}

let boundPort = requestedPort;

function isAllowedLocalOrigin(originStr) {
  try {
    const u = new URL(originStr);
    if (u.protocol !== 'http:') return false;
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return false;
    const portNum = u.port ? Number(u.port) : 80;
    return !boundPort || portNum === boundPort;
  } catch {
    return false;
  }
}

function validateCsrf(req, res, { requireJson = false } = {}) {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && !isAllowedLocalOrigin(origin)) {
    sendJson(res, 403, { error: 'Forbidden cross-origin request' });
    return false;
  }
  const secFetchSite = req.headers['sec-fetch-site'];
  if (typeof secFetchSite === 'string' && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    sendJson(res, 403, { error: 'Forbidden cross-site request' });
    return false;
  }
  if (requireJson) {
    const ct = String(req.headers['content-type'] || '').toLowerCase();
    if (!ct.startsWith('application/json')) {
      sendJson(res, 415, { error: 'Content-Type must be application/json' });
      return false;
    }
  }
  return true;
}

function isRegularFile(filePath) {
  try {
    return Boolean(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || '';
    if (!/^127\.0\.0\.1(:\d+)?$|^localhost(:\d+)?$/.test(host)) {
      res.writeHead(403);
      res.end('Forbidden host');
      return;
    }

    let parsedUrl;
    let pathname;
    try {
      parsedUrl = new URL(req.url || '/', `http://${host}`);
      pathname = decodeURIComponent(parsedUrl.pathname);
    } catch {
      res.writeHead(400);
      res.end('Bad request URL');
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      sendStaticFile(req, res, PUBLIC_DIR, 'index.html');
      return;
    }

    if (pathname === '/favicon.ico' && (req.method === 'GET' || req.method === 'HEAD')) {
      if (isRegularFile(path.join(PUBLIC_DIR, 'favicon.ico'))) {
        sendStaticFile(req, res, PUBLIC_DIR, 'favicon.ico');
      } else {
        res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
        res.end();
      }
      return;
    }

    if (pathname.startsWith('/assets/')) {
      sendStaticFile(req, res, PUBLIC_DIR, pathname.slice('/assets/'.length));
      return;
    }

    if (pathname.startsWith('/vendor/pdfjs/')) {
      sendStaticFile(req, res, path.join(NODE_MODULES, 'pdfjs-dist'), pathname.slice('/vendor/pdfjs/'.length));
      return;
    }

    if (pathname === '/api/health') {
      sendJson(res, 200, { ok: true, pid: process.pid });
      return;
    }

    if (pathname === '/api/library' && req.method === 'GET') {
      const lib = loadLibrary();
      const validBooks = lib.books.filter((b) => isRegularFile(b.path));
      const activeStillValid = activeBook && validBooks.some((b) => b.id === activeBook.id);
      if (!activeStillValid) activeBook = null;
      sendJson(res, 200, {
        books: validBooks.map((b) => ({
          ...b,
          url: `/api/book/${b.id}.pdf`,
        })),
        settings: lib.settings,
        activeBookId: activeStillValid ? activeBook.id : null,
      });
      return;
    }

    if (pathname === '/api/book-state' && req.method === 'POST') {
      if (!validateCsrf(req, res, { requireJson: true })) return;
      try {
        const body = await readJsonBody(req);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          sendJson(res, 400, { error: 'Invalid JSON payload' });
          return;
        }
        const lib = loadLibrary();
        if (body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)) {
          lib.settings = { ...lib.settings, ...body.settings };
        }
        let missingBookId = false;
        if (body.id) {
          const entry = lib.books.find((b) => b.id === body.id);
          if (!entry) {
            missingBookId = true;
          } else {
            if (Number.isFinite(body.lastPage) && body.lastPage >= 1) {
              entry.lastPage = Math.floor(body.lastPage);
            }
            if (Number.isFinite(body.totalPages) && body.totalPages >= 1) {
              entry.totalPages = Math.floor(body.totalPages);
            }
            if (Array.isArray(body.bookmarks)) {
              entry.bookmarks = [...new Set(body.bookmarks.filter((n) => Number.isInteger(n) && n >= 1))]
                .sort((a, b) => a - b)
                .slice(0, 2000);
            }
            if (Array.isArray(body.stickyTabs)) {
              const validTabColors = new Set(['coral', 'amber', 'mint', 'sky', 'violet']);
              entry.stickyTabs = body.stickyTabs
                .filter((t) => t && typeof t === 'object' && Number.isInteger(t.page) && t.page >= 1)
                .slice(0, 200)
                .map((t) => ({
                  id: String(t.id || `tab-${t.page}`).slice(0, 64),
                  page: Math.floor(t.page),
                  label: String(t.label || `p.${t.page}`).trim().slice(0, 18) || `p.${t.page}`,
                  color: validTabColors.has(t.color) ? t.color : 'amber',
                }));
            }
            if (Array.isArray(body.highlights)) {
              const validColors = new Set(['yellow', 'green', 'blue', 'pink', 'orange']);
              const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) * 1000) / 1000));
              entry.highlights = body.highlights
                .filter((h) => h && typeof h === 'object' && Number.isInteger(h.page) && h.page >= 1 && Array.isArray(h.rects))
                .slice(0, 2000)
                .map((h) => {
                  const rects = h.rects
                    .filter((r) => r && Number.isFinite(Number(r.l)) && Number.isFinite(Number(r.t)) && Number(r.w) > 0 && Number(r.h) > 0)
                    .slice(0, 120)
                    .map((r) => ({ l: clampPct(r.l), t: clampPct(r.t), w: clampPct(r.w), h: clampPct(r.h) }));
                  return {
                    id: String(h.id || '').slice(0, 64),
                    page: Math.floor(h.page),
                    color: validColors.has(h.color) ? h.color : 'yellow',
                    text: String(h.text || '').slice(0, 600),
                    rects,
                    createdAt: typeof h.createdAt === 'string' ? h.createdAt.slice(0, 40) : '',
                  };
                })
                .filter((h) => h.id && h.rects.length > 0);
            }
            if (Array.isArray(body.marginNotes)) {
              const validNoteColors = new Set(['yellow', 'blue', 'mint', 'coral', 'violet']);
              const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) * 1000) / 1000));
              const sanitizeRect = (r) => (r && typeof r === 'object' && Number.isFinite(Number(r.l)) && Number.isFinite(Number(r.t)) && Number(r.w) > 0 && Number(r.h) > 0
                ? { l: clampPct(r.l), t: clampPct(r.t), w: clampPct(r.w), h: clampPct(r.h) }
                : null);
              entry.marginNotes = body.marginNotes
                .filter((n) => n && typeof n === 'object' && Number.isInteger(n.page) && n.page >= 1)
                .slice(0, 500)
                .map((n) => ({
                  id: String(n.id || `note-${n.page}-${Date.now().toString(36)}`).slice(0, 64),
                  page: Math.floor(n.page),
                  xPct: clampPct(Number.isFinite(Number(n.xPct)) ? n.xPct : 8),
                  yPct: clampPct(Number.isFinite(Number(n.yPct)) ? n.yPct : 14),
                  color: validNoteColors.has(n.color) ? n.color : 'yellow',
                  text: String(n.text || '').slice(0, 2000),
                  snipRect: sanitizeRect(n.snipRect),
                  createdAt: typeof n.createdAt === 'string' ? n.createdAt.slice(0, 40) : '',
                }))
                .filter((n) => n.id && (n.text.trim() || n.snipRect));
            }
            if (Array.isArray(body.pinnedRefs)) {
              const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) * 1000) / 1000));
              const sanitizeCrop = (r) => (r && typeof r === 'object' && Number.isFinite(Number(r.l)) && Number.isFinite(Number(r.t)) && Number(r.w) > 0 && Number(r.h) > 0
                ? { l: clampPct(r.l), t: clampPct(r.t), w: clampPct(r.w), h: clampPct(r.h) }
                : null);
              entry.pinnedRefs = body.pinnedRefs
                .filter((p) => p && typeof p === 'object' && Number.isInteger(p.page) && p.page >= 1)
                .slice(0, 12)
                .map((p) => ({
                  id: String(p.id || `pin-${p.page}`).slice(0, 64),
                  page: Math.floor(p.page),
                  label: String(p.label || `Page ${p.page}`).trim().slice(0, 48) || `Page ${p.page}`,
                  crop: sanitizeCrop(p.crop),
                  x: Number.isFinite(Number(p.x)) ? Math.round(Number(p.x)) : 24,
                  y: Number.isFinite(Number(p.y)) ? Math.round(Number(p.y)) : 64,
                  width: Math.max(220, Math.min(720, Math.round(Number(p.width) || 340))),
                  height: Math.max(180, Math.min(760, Math.round(Number(p.height) || 360))),
                  zoom: Math.max(0.75, Math.min(4.0, Math.round((Number(p.zoom) || 1) * 100) / 100)),
                  collapsed: Boolean(p.collapsed),
                }));
            }
            entry.lastOpened = new Date().toISOString();
          }
        }
        saveLibrary(lib);
        if (missingBookId) {
          sendJson(res, 404, { error: 'Unknown book id', settingsSaved: true });
          return;
        }
        sendJson(res, 200, { ok: true });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return;
    }

    if (pathname === '/api/open' && req.method === 'POST') {
      if (!validateCsrf(req, res, { requireJson: true })) return;
      try {
        const body = await readJsonBody(req);
        if (!body.path || typeof body.path !== 'string') {
          sendJson(res, 400, { error: 'Missing path' });
          return;
        }
        const book = registerLocalPdf(body.path, body.page || null);
        activeBook = book;
        sendJson(res, 200, {
          ...book,
          url: `/api/book/${book.id}.pdf`,
        });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return;
    }

    if (pathname === '/api/pick-file' && req.method === 'POST') {
      if (!validateCsrf(req, res, { requireJson: false })) return;
      const result = await pickPdfWithMacDialog();
      if (result.error) {
        sendJson(res, 500, { error: result.error });
        return;
      }
      if (result.cancelled || !result.path) {
        sendJson(res, 200, { cancelled: true });
        return;
      }
      try {
        const book = registerLocalPdf(result.path);
        activeBook = book;
        sendJson(res, 200, {
          ...book,
          url: `/api/book/${book.id}.pdf`,
        });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return;
    }

    const ambientMatch = /^\/api\/ambient-sound\/([A-Za-z0-9]+)\.m4a$/.exec(pathname);
    if (ambientMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      const filename = COMFORT_SOUND_FILES.get(ambientMatch[1]);
      if (!filename) {
        res.writeHead(404);
        res.end('Unknown ambient sound');
        return;
      }
      streamFileWithRanges(
        req,
        res,
        path.join(COMFORT_SOUNDS_DIR, filename),
        'audio/mp4',
        'public, max-age=86400',
        'Ambient sound not found on system'
      );
      return;
    }

    const bookMatch = /^\/api\/book\/([a-f0-9]{16})\.pdf$/.exec(pathname);
    if (bookMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      const lib = loadLibrary();
      const entry = lib.books.find((b) => b.id === bookMatch[1]);
      if (!entry || !entry.path) {
        res.writeHead(404);
        res.end('Unknown book');
        return;
      }
      streamFileWithRanges(req, res, entry.path, 'application/pdf', 'no-cache', 'PDF not found on disk');
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.error('Unhandled server request error:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal server error' });
    } else if (!res.destroyed) {
      res.destroy();
    }
  }
});

server.on('error', (err) => {
  console.error('FlipBook server failed:', err.message);
  process.exit(1);
});

server.listen(requestedPort, '127.0.0.1', () => {
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : requestedPort;
  boundPort = port;
  if (writeServerInfo) {
    const info = { port, pid: process.pid, startedAt: new Date().toISOString() };
    try {
      fs.writeFileSync(SERVER_INFO_FILE, JSON.stringify(info, null, 2), 'utf8');
    } catch {
      // ignore
    }
  }
  console.log(`FLIPBOOK_READY port=${port} url=http://127.0.0.1:${port}/`);
});

let isCleaningUp = false;
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  if (writeServerInfo) {
    try {
      if (fs.existsSync(SERVER_INFO_FILE)) {
        const current = JSON.parse(fs.readFileSync(SERVER_INFO_FILE, 'utf8'));
        if (current.pid === process.pid) fs.unlinkSync(SERVER_INFO_FILE);
      }
    } catch {
      // ignore
    }
  }
  server.close(() => process.exit(0));
  server.closeAllConnections?.();
  setTimeout(() => process.exit(0), 500).unref();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGHUP', cleanup);
if (watchStdin) {
  process.stdin.resume();
  process.stdin.on('end', cleanup);
  process.stdin.on('close', cleanup);
  process.stdin.on('error', cleanup);
}
