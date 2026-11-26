# FlipBook Reader

A local macOS PDF flipbook reader with smooth spring-damped page curl physics, dynamic multi-layer fold shadows, and a minimal charcoal reading UI.

## Features

- **Smooth Spring-Damped Page Turning (`public/flip-engine.js`)**: GPU dual-mask page curl with `requestAnimationFrame` interpolation (`0.22` lerp), dynamic edge grab anywhere along the leftmost/rightmost page edges (`0%–100%` height), subtle corner-tip hover cue (`aroundCorner`), and 3D perspective turns for hard covers.
- **Dynamic Multi-Layer Lighting & Shadows**:
  - Cast shadow falling from the fold crease onto the revealed page underneath
  - Feathered drop shadow beneath the lifted turning flap
  - Crease-aligned cylindrical highlight and trough shading across the curved paper
  - Bound-book center spine shadow and dynamic stacked page-edge thickness
- **Full PDF Reading Suite (via Mozilla PDF.js)**:
  - Lazy on-demand page rendering and bounded canvas cache for large multi-hundred-page books
  - Selectable text layer at rest (click/drag inside text to copy without accidental flips)
  - Full-text search with exact-word highlights on pages
  - Table of contents (PDF outline), thumbnails filmstrip, bookmarks, copy-spread text drawer, zoom & pan, fullscreen, auto-flip, backdrop themes, and synthesized Web Audio paper-turn sound
- **Native macOS Wrapper & CLI**:
  - Standalone `FlipBook Reader.app` (`AppKit` + `WKWebView`) supporting Finder **Open With**, `⌘O` file dialog, and drag-and-drop
  - `flipbook` CLI supporting `book.pdf#p=50` and `--web` browser mode

## Project Structure

- `server.mjs` — Localhost HTTP static + byte-range PDF streaming server and library state persistence
- `public/flip-engine.js` — Standalone page-curl geometry, spring loop, and shadow engine
- `public/app.js` — PDF.js rendering pipeline, search, outline, thumbnails, zoom/pan, and UI controller
- `public/sound.js` — Offline Web Audio paper-turn sound synthesizer
- `public/styles.css` & `public/index.html` — Reader layout and chrome
- `macos/` — Swift `WKWebView` app shell (`FlipBookReader.swift`), icon generator (`make_icon.swift`), `Info.plist`, and `build.sh`
- `bin/flipbook` — macOS CLI launcher

## Setup (macOS)

```bash
npm install
./macos/build.sh
```

Or run the web server directly:

```bash
node server.mjs /path/to/book.pdf --page 1
```

## Shortcuts

- `←` / `→` or `Space`: Previous / Next spread
- `Home` / `End`: First / Last page
- `⌘F`: Search in book
- `⌘O`: Open PDF file
- `T`: Toggle thumbnails strip
- `B`: Bookmark current page
- `+` / `-` / `0`: Zoom in / out / reset
- `F`: Fullscreen
