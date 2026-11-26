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
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf',
  '.properties': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

function loadLibrary() {
  try {
    if (fs.existsSync(LIBRARY_FILE)) {
      const raw = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
      if (raw && typeof raw === 'object') {
        return {
          books: Array.isArray(raw.books) ? raw.books : [],
          settings: raw.settings && typeof raw.settings === 'object' ? raw.settings : {},
        };
      }
    }
  } catch {
    // ignore corrupt library and reset cleanly
  }
  return { books: [], settings: {} };
}

function saveLibrary(lib) {
  const tmp = `${LIBRARY_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(lib, null, 2), 'utf8');
  fs.renameSync(tmp, LIBRARY_FILE);
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
  const title = path.basename(resolved, '.pdf');
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
      lastOpened: now,
    });
  }

  // Keep most recent 40 books
  lib.books.sort((a, b) => (b.lastOpened || '').localeCompare(a.lastOpened || ''));
  if (lib.books.length > 40) lib.books = lib.books.slice(0, 40);
  saveLibrary(lib);
  return lib.books.find((b) => b.id === id);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
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

function sendStaticFile(res, rootDir, relPath) {
  const safeRel = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.resolve(rootDir, safeRel);
  if (!fullPath.startsWith(path.resolve(rootDir))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(fullPath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(fullPath).pipe(res);
  });
}

function streamPdfWithRanges(req, res, filePath) {
  let stat;
  try {
    stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
  } catch {
    res.writeHead(404);
    res.end('PDF not found on disk');
    return;
  }

  const total = stat.size;
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` });
      res.end();
      return;
    }
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
    if (start > end || start >= total) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      'Content-Type': 'application/pdf',
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': end - start + 1,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Accept-Ranges': 'bytes',
      'Content-Length': total,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

function pickPdfWithMacDialog() {
  return new Promise((resolve) => {
    const script = 'POSIX path of (choose file with prompt "Select a PDF book to read" of type {"com.adobe.pdf", "pdf"})';
    execFile('/usr/bin/osascript', ['-e', script], (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const chosen = stdout.trim();
      resolve(chosen || null);
    });
  });
}

const cliArgs = process.argv.slice(2);
let requestedPort = 0;
let initialFile = null;
let initialPage = null;
let registerOnly = false;

for (let i = 0; i < cliArgs.length; i++) {
  const arg = cliArgs[i];
  if (arg === '--port' && cliArgs[i + 1]) {
    requestedPort = parseInt(cliArgs[++i], 10) || 0;
  } else if (arg === '--page' && cliArgs[i + 1]) {
    initialPage = parseInt(cliArgs[++i], 10) || null;
  } else if (arg === '--register') {
    registerOnly = true;
  } else if (!arg.startsWith('--') && !initialFile) {
    initialFile = arg;
  }
}

if (registerOnly) {
  if (!initialFile || !fs.existsSync(initialFile)) {
    console.error('File not found:', initialFile || '');
    process.exit(1);
  }
  const book = registerLocalPdf(initialFile, initialPage);
  console.log(JSON.stringify(book));
  process.exit(0);
}

let activeBook = null;
if (initialFile && fs.existsSync(initialFile)) {
  try {
    activeBook = registerLocalPdf(initialFile, initialPage);
  } catch (err) {
    console.error(`Warning: Could not register initial file ${initialFile}:`, err.message);
  }
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || '';
  if (!/^127\.0\.0\.1(:\d+)?$|^localhost(:\d+)?$/.test(host)) {
    res.writeHead(403);
    res.end('Forbidden host');
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://${host}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/' || pathname === '/index.html') {
    sendStaticFile(res, PUBLIC_DIR, 'index.html');
    return;
  }

  if (pathname.startsWith('/assets/')) {
    sendStaticFile(res, PUBLIC_DIR, pathname.slice('/assets/'.length));
    return;
  }

  if (pathname.startsWith('/vendor/pdfjs/')) {
    sendStaticFile(res, path.join(NODE_MODULES, 'pdfjs-dist'), pathname.slice('/vendor/pdfjs/'.length));
    return;
  }

  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true, pid: process.pid });
    return;
  }

  if (pathname === '/api/library' && req.method === 'GET') {
    const lib = loadLibrary();
    const validBooks = lib.books.filter((b) => b.path && fs.existsSync(b.path));
    sendJson(res, 200, {
      books: validBooks.map((b) => ({
        ...b,
        url: `/api/book/${b.id}.pdf`,
      })),
      settings: lib.settings,
      activeBookId: activeBook ? activeBook.id : null,
    });
    return;
  }

  if (pathname === '/api/book-state' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const lib = loadLibrary();
      if (body.settings && typeof body.settings === 'object') {
        lib.settings = { ...lib.settings, ...body.settings };
      }
      if (body.id) {
        const entry = lib.books.find((b) => b.id === body.id);
        if (entry) {
          if (Number.isFinite(body.lastPage) && body.lastPage >= 1) {
            entry.lastPage = Math.floor(body.lastPage);
          }
          if (Number.isFinite(body.totalPages) && body.totalPages >= 1) {
            entry.totalPages = Math.floor(body.totalPages);
          }
          if (Array.isArray(body.bookmarks)) {
            entry.bookmarks = body.bookmarks.filter((n) => Number.isInteger(n) && n >= 1);
          }
          entry.lastOpened = new Date().toISOString();
        }
      }
      saveLibrary(lib);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (pathname === '/api/open' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (!body.path) {
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
    const chosen = await pickPdfWithMacDialog();
    if (!chosen) {
      sendJson(res, 200, { cancelled: true });
      return;
    }
    try {
      const book = registerLocalPdf(chosen);
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

  const bookMatch = /^\/api\/book\/([a-f0-9]{16})\.pdf$/.exec(pathname);
  if (bookMatch && (req.method === 'GET' || req.method === 'HEAD')) {
    const lib = loadLibrary();
    const entry = lib.books.find((b) => b.id === bookMatch[1]);
    if (!entry || !entry.path) {
      res.writeHead(404);
      res.end('Unknown book');
      return;
    }
    if (req.method === 'HEAD') {
      try {
        const stat = fs.statSync(entry.path);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Accept-Ranges': 'bytes',
          'Content-Length': stat.size,
        });
        res.end();
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }
    streamPdfWithRanges(req, res, entry.path);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(requestedPort, '127.0.0.1', () => {
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : requestedPort;
  const info = { port, pid: process.pid, startedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(SERVER_INFO_FILE, JSON.stringify(info, null, 2), 'utf8');
  } catch {
    // ignore
  }
  console.log(`FLIPBOOK_READY port=${port} url=http://127.0.0.1:${port}/`);
});

function cleanup() {
  try {
    if (fs.existsSync(SERVER_INFO_FILE)) {
      const current = JSON.parse(fs.readFileSync(SERVER_INFO_FILE, 'utf8'));
      if (current.pid === process.pid) fs.unlinkSync(SERVER_INFO_FILE);
    }
  } catch {
    // ignore
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
