import * as pdfjsLib from '/vendor/pdfjs/build/pdf.min.mjs';
import { flipSound, DEFAULT_SOUND_PRESET } from '/assets/sound.js';
import { FlipBookEngine } from '/assets/flip-engine.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/build/pdf.worker.min.mjs';

const MAX_CACHED_CANVASES = 18;
const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3];

const els = {
  app: document.getElementById('app'),
  topBar: document.getElementById('topBar'),
  topBarRight: document.getElementById('topBarRight'),
  btnOpenTop: document.getElementById('btnOpenTop'),
  bookTitleLabel: document.getElementById('bookTitleLabel'),
  btnBookmarkPage: document.getElementById('btnBookmarkPage'),
  zoomPill: document.getElementById('zoomPill'),
  zoomLabel: document.getElementById('zoomLabel'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnZoomInPill: document.getElementById('btnZoomInPill'),
  btnZoomReset: document.getElementById('btnZoomReset'),

  stage: document.getElementById('stage'),
  welcomeOverlay: document.getElementById('welcomeOverlay'),
  btnWelcomePick: document.getElementById('btnWelcomePick'),
  welcomeRecentWrap: document.getElementById('welcomeRecentWrap'),
  welcomeRecentList: document.getElementById('welcomeRecentList'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  dropOverlay: document.getElementById('dropOverlay'),

  zoomViewport: document.getElementById('zoomViewport'),
  bookCenterShift: document.getElementById('bookCenterShift'),
  bookShell: document.getElementById('bookShell'),
  bookDropShadow: document.getElementById('bookDropShadow'),
  bookStackLeft: document.getElementById('bookStackLeft'),
  bookStackRight: document.getElementById('bookStackRight'),
  bookContainer: document.getElementById('bookContainer'),
  bookSpineShadow: document.getElementById('bookSpineShadow'),

  btnPrevArrow: document.getElementById('btnPrevArrow'),
  btnNextArrow: document.getElementById('btnNextArrow'),
  btnFirstPage: document.getElementById('btnFirstPage'),
  btnLastPage: document.getElementById('btnLastPage'),

  moreMenu: document.getElementById('moreMenu'),
  menuOpenPdf: document.getElementById('menuOpenPdf'),
  menuLibrary: document.getElementById('menuLibrary'),
  menuPageMode: document.getElementById('menuPageMode'),
  valPageMode: document.getElementById('valPageMode'),
  menuHardCover: document.getElementById('menuHardCover'),
  valHardCover: document.getElementById('valHardCover'),
  menuClickMode: document.getElementById('menuClickMode'),
  valClickMode: document.getElementById('valClickMode'),
  menuAutoFlip: document.getElementById('menuAutoFlip'),
  valAutoFlip: document.getElementById('valAutoFlip'),

  thumbnailsStrip: document.getElementById('thumbnailsStrip'),
  btnCloseThumbs: document.getElementById('btnCloseThumbs'),
  btnThumbPrev: document.getElementById('btnThumbPrev'),
  btnThumbNext: document.getElementById('btnThumbNext'),
  thumbScroller: document.getElementById('thumbScroller'),

  sideDrawer: document.getElementById('sideDrawer'),
  btnCloseDrawer: document.getElementById('btnCloseDrawer'),
  tocList: document.getElementById('tocList'),
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  searchStatus: document.getElementById('searchStatus'),
  searchResults: document.getElementById('searchResults'),
  btnToggleCurrentBookmark: document.getElementById('btnToggleCurrentBookmark'),
  bookmarksList: document.getElementById('bookmarksList'),
  textPaneLabel: document.getElementById('textPaneLabel'),
  btnCopySpreadText: document.getElementById('btnCopySpreadText'),
  pageTextPreview: document.getElementById('pageTextPreview'),

  libraryModal: document.getElementById('libraryModal'),
  btnCloseLibrary: document.getElementById('btnCloseLibrary'),
  btnModalPickPdf: document.getElementById('btnModalPickPdf'),
  libraryList: document.getElementById('libraryList'),

  btnMore: document.getElementById('btnMore'),
  btnZoom: document.getElementById('btnZoom'),
  btnSearch: document.getElementById('btnSearch'),
  btnThumbs: document.getElementById('btnThumbs'),
  pageInput: document.getElementById('pageInput'),
  pageScrubber: document.getElementById('pageScrubber'),
  scrubberTooltip: document.getElementById('scrubberTooltip'),
  btnSound: document.getElementById('btnSound'),
  iconSoundOn: document.getElementById('iconSoundOn'),
  iconSoundOff: document.getElementById('iconSoundOff'),
  valSoundPreset: document.getElementById('valSoundPreset'),
  soundPresetPills: document.getElementById('soundPresetPills'),
  btnLibrary: document.getElementById('btnLibrary'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  btnDrawer: document.getElementById('btnDrawer'),
  fileInputHidden: document.getElementById('fileInputHidden'),
};

const state = {
  pdfDoc: null,
  pageFlip: null,
  bookId: null,
  bookTitle: 'FlipBook Reader',
  totalPages: 0,
  currentIndex: 0, // 0-based index reported by PageFlip
  pageAspect: 0.72,
  pageW: 400,
  pageH: 550,
  orientation: 'landscape', // 'landscape' | 'portrait'
  pageMode: 'auto', // 'auto' | 'double' | 'single'
  showCover: true,
  clickMode: 'smart', // 'smart' | 'anywhere'
  soundEnabled: true,
  soundPreset: DEFAULT_SOUND_PRESET,
  theme: 'charcoal',
  autoFlipTimer: null,

  zoom: 1,
  committedZoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStart: null,

  pageNodes: [],
  renderedMap: new Map(), // pageIdx -> { scale, renderTask, textPromise }
  textCache: new Map(), // 1-based pageNum -> string
  bookmarks: [],
  searchQuery: '',
  searchAbortId: 0,
  libraryBooks: [],

  thumbObserver: null,
  thumbRendered: new Set(),
  zoomRerenderTimer: null,
  persistTimer: null,
  resizeTimer: null,
  isFlipping: false,
};

/* ---------- Utility ---------- */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseHashPage() {
  const hash = window.location.hash || '';
  const m = /[#&]?p=(\d+)/i.exec(hash);
  if (m) return parseInt(m[1], 10);
  const qs = new URLSearchParams(window.location.search);
  const qp = qs.get('p') || qs.get('page');
  return qp ? parseInt(qp, 10) : null;
}

function isEffectiveSingleMode() {
  if (state.pageMode === 'single') return true;
  if (state.pageMode === 'double') return false;
  return els.stage.clientWidth < 760;
}

function getVisibleIndices(idx = state.currentIndex) {
  if (!state.totalPages) return [];
  const i = clamp(idx, 0, state.totalPages - 1);
  if (isEffectiveSingleMode() || state.orientation === 'portrait') {
    return [i];
  }
  if (state.showCover) {
    if (i === 0) return [0];
    const left = i % 2 === 1 ? i : i - 1;
    return left + 1 < state.totalPages ? [left, left + 1] : [left];
  }
  const left = i - (i % 2);
  return left + 1 < state.totalPages ? [left, left + 1] : [left];
}

function formatSpreadLabel(indices = getVisibleIndices()) {
  if (!state.totalPages || !indices.length) return '0/0';
  if (indices.length === 1) return `${indices[0] + 1}/${state.totalPages}`;
  return `${indices[0] + 1}-${indices[1] + 1}/${state.totalPages}`;
}

/* ---------- Persistence & Server API ---------- */
async function fetchLibrary() {
  try {
    const res = await fetch('/api/library');
    if (!res.ok) return null;
    const data = await res.json();
    state.libraryBooks = data.books || [];
    applySavedSettings(data.settings || {});
    renderLibraryLists();
    return data;
  } catch {
    return null;
  }
}

function applySavedSettings(settings) {
  if (settings.theme) setTheme(settings.theme, false);
  if (settings.soundPreset) {
    state.soundPreset = settings.soundPreset;
  }
  if (typeof settings.soundEnabled === 'boolean') {
    state.soundEnabled = settings.soundEnabled;
  }
  updateSoundUi();
  if (settings.pageMode) state.pageMode = settings.pageMode;
  if (typeof settings.showCover === 'boolean') state.showCover = settings.showCover;
  if (settings.clickMode) state.clickMode = settings.clickMode;
  updateMenuValues();
}

function schedulePersistState() {
  clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(() => {
    const payload = {
      settings: {
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        soundPreset: state.soundPreset,
        pageMode: state.pageMode,
        showCover: state.showCover,
        clickMode: state.clickMode,
      },
    };
    if (state.bookId) {
      payload.id = state.bookId;
      payload.lastPage = state.currentIndex + 1;
      payload.totalPages = state.totalPages;
      payload.bookmarks = state.bookmarks;
    }
    fetch('/api/book-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    if (state.bookId && state.totalPages > 0) {
      try {
        localStorage.setItem(`flipbook:${state.bookId}`, JSON.stringify({
          lastPage: state.currentIndex + 1,
          bookmarks: state.bookmarks,
        }));
      } catch {
        // ignore storage errors
      }
    }
  }, 350);
}

/* ---------- Book Sizing & PageFlip Lifecycle ---------- */
function computeBookGeometry() {
  const stageW = Math.max(320, els.stage.clientWidth);
  const stageH = Math.max(260, els.stage.clientHeight);
  const single = isEffectiveSingleMode();

  const horizReserve = single ? 140 : 190;
  const vertReserve = 104;
  const maxBookW = Math.max(240, stageW - horizReserve);
  const maxBookH = Math.max(200, stageH - vertReserve);

  const aspect = clamp(state.pageAspect || 0.72, 0.35, 2.2);
  let pageH = maxBookH;
  let pageW = pageH * aspect;

  const spreadCols = single ? 1 : 2;
  if (pageW * spreadCols > maxBookW) {
    pageW = maxBookW / spreadCols;
    pageH = pageW / aspect;
  }

  state.pageW = Math.max(160, Math.floor(pageW));
  state.pageH = Math.max(220, Math.floor(pageH));
  state.orientation = single ? 'portrait' : 'landscape';
}

function disposeBook() {
  stopAutoFlip();
  state.searchAbortId++;
  for (const entry of state.renderedMap.values()) {
    try { entry.renderTask?.cancel(); } catch {}
  }
  state.renderedMap.clear();
  state.textCache.clear();
  state.thumbRendered.clear();
  if (state.thumbObserver) {
    state.thumbObserver.disconnect();
    state.thumbObserver = null;
  }
  if (state.pageFlip) {
    try { state.pageFlip.destroy(); } catch {}
    state.pageFlip = null;
  }
  els.bookContainer.innerHTML = '';
  els.thumbScroller.innerHTML = '';
  els.tocList.innerHTML = '';
  els.searchResults.innerHTML = '';
  els.searchStatus.textContent = '';
  state.pageNodes = [];
}

function buildPageElements() {
  const frag = document.createDocumentFragment();
  const nodes = [];
  for (let i = 0; i < state.totalPages; i++) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'fb-page';
    pageDiv.dataset.pageIndex = String(i);
    if (state.showCover && (i === 0 || i === state.totalPages - 1)) {
      pageDiv.dataset.density = 'hard';
    }
    const inner = document.createElement('div');
    inner.className = 'fb-page-inner';
    const ph = document.createElement('div');
    ph.className = 'fb-page-num-placeholder';
    ph.textContent = String(i + 1);
    inner.appendChild(ph);
    pageDiv.appendChild(inner);
    nodes.push(pageDiv);
    frag.appendChild(pageDiv);
  }
  state.pageNodes = nodes;
  return frag;
}

function initPageFlip(startIndex = 0) {
  if (!state.pdfDoc) return;

  for (const entry of state.renderedMap.values()) {
    try { entry.renderTask?.cancel(); } catch {}
  }
  state.renderedMap.clear();

  if (state.pageFlip) {
    try { state.pageFlip.destroy(); } catch {}
    state.pageFlip = null;
  }

  // Keep spine shadow node safe before clearing host, then place inside .stf__block
  if (els.bookSpineShadow.parentElement !== els.bookShell) {
    els.bookShell.appendChild(els.bookSpineShadow);
  }

  // Ensure clean container for PageFlip.destroy() which removes its root element
  let host = document.getElementById('flipHost');
  if (host) host.remove();
  host = document.createElement('div');
  host.id = 'flipHost';
  els.bookContainer.innerHTML = '';
  els.bookContainer.appendChild(host);

  computeBookGeometry();

  const sw = Math.round(state.pageW * state.committedZoom);
  const sh = Math.round(state.pageH * state.committedZoom);
  const single = isEffectiveSingleMode();
  const totalBookW = single ? sw : sw * 2;
  els.bookShell.style.width = `${totalBookW}px`;
  els.bookShell.style.height = `${sh}px`;
  els.bookContainer.style.width = `${totalBookW}px`;
  els.bookContainer.style.height = `${sh}px`;

  host.appendChild(buildPageElements());

  const safeStart = clamp(startIndex, 0, Math.max(0, state.totalPages - 1));
  const pf = new FlipBookEngine(host, {
    width: sw,
    height: sh,
    usePortrait: single,
    startPage: safeStart,
    flippingTime: 300,
    showCover: state.showCover,
    showPageCorners: true,
    disableFlipByClick: state.clickMode === 'smart',
  });

  pf.loadFromHTML(state.pageNodes);

  // Layer spine shadow inside .fh-stage at z-index:3 (above static slots [z:1], below flip layer [z:6])
  // plus top landing overlay [z:7] so the final settling deceleration blends seamlessly with zero cutoff line.
  const fhStage = host.querySelector('.fh-stage');
  if (fhStage) {
    if (!els.bookSpineTop) {
      els.bookSpineTop = document.createElement('div');
      els.bookSpineTop.className = 'book-spine-shadow book-spine-top';
      els.bookSpineTop.id = 'bookSpineTop';
    }
    fhStage.appendChild(els.bookSpineShadow);
    fhStage.appendChild(els.bookSpineTop);
  }

  pf.on('init', (e) => {
    state.orientation = pf.getOrientation();
    state.currentIndex = clamp(e.data?.page ?? safeStart, 0, state.totalPages - 1);
    onSpreadChanged(false);
  });

  pf.on('spineBlend', (e) => {
    if (!els.bookSpineTop) return;
    if (!state.allowSpine) {
      els.bookSpineShadow.style.opacity = '0';
      els.bookSpineTop.style.opacity = '0';
      return;
    }
    const b = clamp(e.data ?? 0, 0, 1);
    els.bookSpineShadow.style.opacity = String(1 - b);
    els.bookSpineTop.style.opacity = String(b);
  });

  pf.on('flipStart', (e) => {
    flipSound.playFlip();
    if (Number.isFinite(e.data?.page)) {
      const fromIdx = clamp(e.data?.from ?? state.currentIndex, 0, state.totalPages - 1);
      state.currentIndex = clamp(e.data.page, 0, state.totalPages - 1);
      onSpreadChanged(false, 6);
      const vis = getVisibleIndices();
      const touchingCover =
        state.showCover &&
        (vis.includes(0) ||
          fromIdx === 0 ||
          (state.totalPages % 2 === 0 && (vis.includes(state.totalPages - 1) || fromIdx >= state.totalPages - 1)));
      if (touchingCover) {
        state.allowSpine = false;
        els.bookSpineShadow.style.opacity = '0';
        if (els.bookSpineTop) els.bookSpineTop.style.opacity = '0';
      }
    }
  });

  pf.on('flip', (e) => {
    const nextIdx = clamp(e.data, 0, state.totalPages - 1);
    state.currentIndex = nextIdx;
    onSpreadChanged(true, 6);
  });

  pf.on('changeState', (e) => {
    state.isFlipping = e.data === 'flipping' || e.data === 'user_fold';
    if (e.data === 'user_fold') {
      // Pre-render pages revealed during corner drag
      queueNearbyRenders(state.currentIndex, 4);
    }
    if (state.isFlipping) {
      const vis = getVisibleIndices();
      const hasHard = !!(pf.interactiveFlip?.isHard || pf.flyingFlips?.some((f) => f.isHard));
      const touchingCover =
        state.showCover &&
        (hasHard || vis.includes(0) || (state.totalPages % 2 === 0 && vis.includes(state.totalPages - 1)));
      if (touchingCover) {
        state.allowSpine = false;
        els.bookSpineShadow.style.opacity = '0';
        if (els.bookSpineTop) els.bookSpineTop.style.opacity = '0';
      }
    }
    if (e.data === 'read') {
      updateCenterShift();
      updateBookDepthChrome();
    }
  });

  pf.on('changeOrientation', (e) => {
    state.orientation = e.data;
    onSpreadChanged(false);
  });

  state.pageFlip = pf;
  els.bookShell.hidden = false;
  els.welcomeOverlay.hidden = true;
  els.topBarRight.hidden = false;
  els.btnPrevArrow.hidden = false;
  els.btnNextArrow.hidden = false;
  els.btnFirstPage.hidden = false;
  els.btnLastPage.hidden = false;

  // Immediate render for initial spread
  state.currentIndex = safeStart;
  onSpreadChanged(false);
}

/* ---------- On-Demand PDF Canvas + TextLayer Rendering ---------- */
async function renderPageNode(idx) {
  if (!state.pdfDoc || idx < 0 || idx >= state.totalPages) return;
  const pageNode = state.pageNodes[idx];
  if (!pageNode) return;
  const inner = pageNode.querySelector('.fb-page-inner');
  if (!inner) return;

  const sw = Math.max(120, Math.round(state.pageW * state.committedZoom));
  const sh = Math.max(160, Math.round(state.pageH * state.committedZoom));
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const maxDim = 4096;
  const maxScaleByDim = Math.min(maxDim / sw, maxDim / sh);
  const pixelScale = Math.max(1, Math.min(dpr, maxScaleByDim));
  const renderKey = `${sw}x${sh}@${pixelScale.toFixed(2)}`;

  const existing = state.renderedMap.get(idx);
  if (existing && existing.renderKey === renderKey && inner.querySelector('canvas.fb-canvas')) {
    paintSearchHighlightsOnPage(idx);
    return;
  }

  if (existing?.renderTask) {
    try { existing.renderTask.cancel(); } catch {}
  }

  const token = { renderKey, renderTask: null };
  state.renderedMap.set(idx, token);

  try {
    const pdfPage = await state.pdfDoc.getPage(idx + 1);
    if (state.renderedMap.get(idx) !== token) return;

    const rawVp = pdfPage.getViewport({ scale: 1 });
    const cssScale = sw / rawVp.width;
    const cssVp = pdfPage.getViewport({ scale: cssScale });
    const renderVp = pdfPage.getViewport({ scale: cssScale * pixelScale });

    const canvas = document.createElement('canvas');
    canvas.className = 'fb-canvas';
    canvas.width = Math.max(1, Math.floor(renderVp.width));
    canvas.height = Math.max(1, Math.floor(renderVp.height));

    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderTask = pdfPage.render({ canvasContext: ctx, viewport: renderVp });
    token.renderTask = renderTask;
    await renderTask.promise;
    if (state.renderedMap.get(idx) !== token) return;

    // Build TextLayer matched 1:1 to scaled CSS dimensions
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.setProperty('--scale-factor', String(cssVp.scale));

    const hlLayer = document.createElement('div');
    hlLayer.className = 'fb-search-highlights';

    inner.innerHTML = '';
    inner.appendChild(canvas);
    inner.appendChild(hlLayer);
    inner.appendChild(textLayerDiv);

    const textLayer = new pdfjsLib.TextLayer({
      textContentSource: pdfPage.streamTextContent(),
      container: textLayerDiv,
      viewport: cssVp,
    });
    await textLayer.render();
    if (state.renderedMap.get(idx) !== token) return;

    paintSearchHighlightsOnPage(idx);
    evictDistantPages(state.currentIndex);
  } catch (err) {
    if (err?.name !== 'RenderingCancelledException') {
      // ignore cancelled renders cleanly
    }
  }
}

function evictDistantPages(centerIdx) {
  const maxKeep = state.committedZoom > 1.2 ? 6 : Math.max(MAX_CACHED_CANVASES, 24);
  if (state.renderedMap.size <= maxKeep) return;
  const entries = Array.from(state.renderedMap.keys())
    .sort((a, b) => Math.abs(b - centerIdx) - Math.abs(a - centerIdx));

  while (state.renderedMap.size > maxKeep && entries.length) {
    const farIdx = entries.shift();
    if (Math.abs(farIdx - centerIdx) <= (state.committedZoom > 1.2 ? 1 : 10)) break;
    const rec = state.renderedMap.get(farIdx);
    try { rec?.renderTask?.cancel(); } catch {}
    state.renderedMap.delete(farIdx);
    const node = state.pageNodes[farIdx];
    const inner = node?.querySelector('.fb-page-inner');
    if (inner) {
      const oldCanvas = inner.querySelector('canvas');
      if (oldCanvas) {
        oldCanvas.width = 0;
        oldCanvas.height = 0;
      }
      inner.innerHTML = `<div class="fb-page-num-placeholder">${farIdx + 1}</div>`;
    }
  }
}

function queueNearbyRenders(centerIdx, radius = 5) {
  const effectiveRadius = state.committedZoom > 1.2 ? 1 : radius;
  const visible = getVisibleIndices(centerIdx);
  const priority = [...visible];
  for (let d = 1; d <= effectiveRadius; d++) {
    const next = centerIdx + d;
    const prev = centerIdx - d;
    if (next < state.totalPages && !priority.includes(next)) priority.push(next);
    if (prev >= 0 && !priority.includes(prev)) priority.push(prev);
  }
  priority.forEach((idx, order) => {
    if (order < visible.length + 2) {
      renderPageNode(idx);
    } else {
      setTimeout(() => {
        if (Math.abs(idx - state.currentIndex) <= effectiveRadius + 2) {
          renderPageNode(idx);
        }
      }, 12 * order);
    }
  });
}

/* ---------- Book Visual Chrome: Stacks, Spine, Centering, Toolbar ---------- */
function updateCenterShift() {
  if (!state.totalPages) return;
  const visible = getVisibleIndices();
  const single = isEffectiveSingleMode() || state.orientation === 'portrait';
  const sw = Math.round(state.pageW * state.committedZoom);

  let shiftX = 0;
  if (!single && state.showCover && visible.length === 1) {
    // Center single front cover or single back cover smoothly
    shiftX = visible[0] === 0 ? -sw / 2 : sw / 2;
  }
  els.bookCenterShift.style.transform = `translate3d(${shiftX}px, 0, 0)`;
}

function updateBookDepthChrome() {
  if (!state.totalPages) return;
  const visible = getVisibleIndices();
  const single = isEffectiveSingleMode() || state.orientation === 'portrait';
  const sw = Math.round(state.pageW * state.committedZoom);

  const leftIdx = visible[0];
  const rightIdx = visible[visible.length - 1];

  const maxStack = 13;
  const leftThick = leftIdx > 0 ? clamp(Math.round((leftIdx / state.totalPages) * maxStack), 2, maxStack) : 0;
  const rightRemain = state.totalPages - 1 - rightIdx;
  const rightThick = rightRemain > 0 ? clamp(Math.round((rightRemain / state.totalPages) * maxStack), 2, maxStack) : 0;

  if (single) {
    els.bookStackLeft.style.opacity = leftThick > 0 ? '1' : '0';
    els.bookStackLeft.style.width = `${leftThick}px`;
    els.bookStackLeft.style.left = `${-leftThick}px`;
    els.bookStackLeft.style.right = 'auto';

    els.bookStackRight.style.opacity = rightThick > 0 ? '1' : '0';
    els.bookStackRight.style.width = `${rightThick}px`;
    els.bookStackRight.style.right = `${-rightThick}px`;
    els.bookStackRight.style.left = 'auto';

    state.allowSpine = false;
    els.bookSpineShadow.style.opacity = '0';
    if (els.bookSpineTop) els.bookSpineTop.style.opacity = '0';
    els.bookDropShadow.style.left = `${-leftThick}px`;
    els.bookDropShadow.style.right = `${-rightThick}px`;
    return;
  }

  // Landscape 2-page spread
  if (state.showCover && visible.length === 1) {
    state.allowSpine = false;
    if (visible[0] === 0) {
      // Front cover sits on right half of 2*pageW
      els.bookStackLeft.style.opacity = '0';
      els.bookStackLeft.style.width = '0px';

      els.bookStackRight.style.opacity = rightThick > 0 ? '1' : '0';
      els.bookStackRight.style.width = `${rightThick}px`;
      els.bookStackRight.style.right = `${-rightThick}px`;
      els.bookStackRight.style.left = 'auto';

      els.bookSpineShadow.style.opacity = '0';
      if (els.bookSpineTop) els.bookSpineTop.style.opacity = '0';
      els.bookDropShadow.style.left = `${sw}px`;
      els.bookDropShadow.style.right = `${-rightThick}px`;
    } else {
      // Back cover sits on left half of 2*pageW
      els.bookStackLeft.style.opacity = leftThick > 0 ? '1' : '0';
      els.bookStackLeft.style.width = `${leftThick}px`;
      els.bookStackLeft.style.left = `${-leftThick}px`;

      els.bookStackRight.style.opacity = '0';
      els.bookStackRight.style.width = '0px';

      els.bookSpineShadow.style.opacity = '0';
      if (els.bookSpineTop) els.bookSpineTop.style.opacity = '0';
      els.bookDropShadow.style.left = `${-leftThick}px`;
      els.bookDropShadow.style.right = `${sw}px`;
    }
  } else {
    state.allowSpine = true;
    els.bookStackLeft.style.opacity = leftThick > 0 ? '1' : '0';
    els.bookStackLeft.style.width = `${leftThick}px`;
    els.bookStackLeft.style.left = `${-leftThick}px`;

    els.bookStackRight.style.opacity = rightThick > 0 ? '1' : '0';
    els.bookStackRight.style.width = `${rightThick}px`;
    els.bookStackRight.style.right = `${-rightThick}px`;

    if (!state.isFlipping) {
      els.bookSpineShadow.style.opacity = '1';
      if (els.bookSpineTop) els.bookSpineTop.style.opacity = '0';
    }
    els.bookDropShadow.style.left = `${-leftThick}px`;
    els.bookDropShadow.style.right = `${-rightThick}px`;
  }
}

function onSpreadChanged(persist = true, renderRadius = 5) {
  const visible = getVisibleIndices();
  const label = formatSpreadLabel(visible);
  if (document.activeElement !== els.pageInput) {
    els.pageInput.value = label;
  }

  els.pageScrubber.max = String(Math.max(1, state.totalPages));
  els.pageScrubber.value = String((visible[0] ?? 0) + 1);

  const atStart = (visible[0] ?? 0) === 0;
  const atEnd = (visible[visible.length - 1] ?? 0) >= state.totalPages - 1;
  els.btnPrevArrow.disabled = atStart;
  els.btnFirstPage.disabled = atStart;
  els.btnNextArrow.disabled = atEnd;
  els.btnLastPage.disabled = atEnd;

  updateCenterShift();
  updateBookDepthChrome();
  updateBookmarkUi();
  highlightActiveThumbnail(visible);
  queueNearbyRenders(state.currentIndex, renderRadius);

  if (els.sideDrawer && !els.sideDrawer.hidden && document.querySelector('.drawer-tab[data-tab="text"]').classList.contains('active')) {
    refreshTextPane();
  }

  if (state.totalPages > 0) {
    const p = (visible[0] ?? 0) + 1;
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#p=${p}`);
  }
  if (persist) schedulePersistState();
}

/* ---------- Navigation Actions ---------- */
function goPrev() {
  if (!state.pageFlip) return;
  if (state.zoom > 1) {
    state.pageFlip.turnToPrevPage();
    return;
  }
  state.pageFlip.flipPrev('bottom');
}

function goNext() {
  if (!state.pageFlip) return;
  if (state.zoom > 1) {
    state.pageFlip.turnToNextPage();
    return;
  }
  state.pageFlip.flipNext('bottom');
}

function jumpToPage(oneBasedPage, animate = false) {
  if (!state.pageFlip || !state.totalPages) return;
  const targetIdx = clamp(Math.floor(oneBasedPage) - 1, 0, state.totalPages - 1);
  if (animate && Math.abs(targetIdx - state.currentIndex) <= 2) {
    state.pageFlip.flip(targetIdx, 'bottom');
  } else {
    state.pageFlip.turnToPage(targetIdx);
  }
}

/* ---------- Zoom & Pan (True 1:1 Retina Layout Re-Render, Zero GPU Scale Blur) ---------- */
function commitZoomLayout() {
  if (!state.pdfDoc) return;
  state.committedZoom = state.zoom;
  const sw = Math.max(120, Math.round(state.pageW * state.committedZoom));
  const sh = Math.max(160, Math.round(state.pageH * state.committedZoom));
  const single = isEffectiveSingleMode();
  const totalBookW = single ? sw : sw * 2;

  els.bookShell.style.width = `${totalBookW}px`;
  els.bookShell.style.height = `${sh}px`;
  els.bookContainer.style.width = `${totalBookW}px`;
  els.bookContainer.style.height = `${sh}px`;
  state.pageFlip?.resize?.(sw, sh);

  // Reset CSS scale to exact 1 so WebKit/Blink paints native Retina pixels without upscaling blur
  els.zoomViewport.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0)`;
  updateCenterShift();
  updateBookDepthChrome();

  for (const idx of getVisibleIndices()) {
    renderPageNode(idx);
  }
}

function applyZoomTransform(rerender = true, immediate = false) {
  const previewScale = state.committedZoom ? state.zoom / state.committedZoom : state.zoom;
  if (Math.abs(previewScale - 1) < 0.002) {
    els.zoomViewport.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0)`;
  } else {
    els.zoomViewport.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${previewScale})`;
  }
  const zoomed = state.zoom > 1.01;
  els.zoomViewport.classList.toggle('is-zoomed', zoomed);
  els.zoomPill.hidden = !zoomed;
  els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;

  if (rerender && state.pdfDoc) {
    clearTimeout(state.zoomRerenderTimer);
    if (immediate) {
      commitZoomLayout();
    } else {
      state.zoomRerenderTimer = setTimeout(commitZoomLayout, 85);
    }
  }
}

function setZoom(nextZoom, immediate = false) {
  const prevZoom = state.zoom || 1;
  const z = clamp(Number(nextZoom) || 1, 1, 3.5);
  state.zoom = z;
  if (z <= 1.01) {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    if (!state.pdfDoc) state.committedZoom = 1;
  } else {
    state.panX *= z / prevZoom;
    state.panY *= z / prevZoom;
  }
  applyZoomTransform(true, immediate || state.zoom === 1);
}

function cycleZoom() {
  if (state.zoom >= 2) {
    setZoom(1, true);
  } else {
    const next = ZOOM_STEPS.find((s) => s > state.zoom + 0.05) || 1.75;
    setZoom(next, true);
  }
}

/* ---------- Thumbnails Strip ---------- */
function buildThumbnailsStrip() {
  els.thumbScroller.innerHTML = '';
  state.thumbRendered.clear();
  if (state.thumbObserver) state.thumbObserver.disconnect();

  const frag = document.createDocumentFragment();
  for (let i = 0; i < state.totalPages; i++) {
    const item = document.createElement('button');
    item.className = 'thumb-item';
    item.dataset.pageIndex = String(i);
    item.innerHTML = `<div class="thumb-canvas-box"><canvas width="72" height="96"></canvas></div><span class="thumb-num">${i + 1}</span>`;
    item.addEventListener('click', () => {
      jumpToPage(i + 1, false);
    });
    frag.appendChild(item);
  }
  els.thumbScroller.appendChild(frag);

  state.thumbObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const idx = Number(entry.target.dataset.pageIndex);
      if (!state.thumbRendered.has(idx)) {
        state.thumbRendered.add(idx);
        renderThumbnailCanvas(idx, entry.target.querySelector('canvas'));
      }
    }
  }, { root: els.thumbScroller, rootMargin: '160px' });

  for (const el of els.thumbScroller.children) {
    state.thumbObserver.observe(el);
  }
  highlightActiveThumbnail(getVisibleIndices());
}

async function renderThumbnailCanvas(idx, canvas) {
  if (!state.pdfDoc || !canvas) return;
  try {
    const page = await state.pdfDoc.getPage(idx + 1);
    const vp1 = page.getViewport({ scale: 1 });
    const scale = Math.min(130 / vp1.width, 180 / vp1.height);
    const vp = page.getViewport({ scale });
    canvas.width = Math.max(1, Math.floor(vp.width));
    canvas.height = Math.max(1, Math.floor(vp.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
  } catch {
    // ignore
  }
}

function highlightActiveThumbnail(visible) {
  if (els.thumbnailsStrip.hidden) return;
  const set = new Set(visible);
  let activeEl = null;
  for (const el of els.thumbScroller.children) {
    const isAct = set.has(Number(el.dataset.pageIndex));
    el.classList.toggle('active', isAct);
    if (isAct && !activeEl) activeEl = el;
  }
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

/* ---------- Outline (TOC), Bookmarks, Search & Copy Text ---------- */
async function buildOutline() {
  els.tocList.innerHTML = '';
  if (!state.pdfDoc) return;
  try {
    const outline = await state.pdfDoc.getOutline();
    if (!outline || !outline.length) {
      els.tocList.innerHTML = '<div class="search-status">This PDF has no embedded table of contents.</div>';
      return;
    }

    const walk = async (items, depth) => {
      for (const item of items) {
        let pageNum = null;
        try {
          let dest = item.dest;
          if (typeof dest === 'string') {
            dest = await state.pdfDoc.getDestination(dest);
          }
          if (Array.isArray(dest) && dest[0]) {
            const pageIdx = await state.pdfDoc.getPageIndex(dest[0]);
            pageNum = pageIdx + 1;
          }
        } catch {
          // ignore unresolvable destination
        }
        const btn = document.createElement('button');
        btn.className = 'toc-item';
        btn.style.paddingLeft = `${8 + depth * 14}px`;
        btn.innerHTML = `<span>${escapeHtml(item.title || 'Untitled')}</span><span class="toc-page">${pageNum ?? ''}</span>`;
        if (pageNum) {
          btn.addEventListener('click', () => jumpToPage(pageNum, false));
        }
        els.tocList.appendChild(btn);
        if (item.items?.length && depth < 4) {
          await walk(item.items, depth + 1);
        }
      }
    };
    await walk(outline, 0);
  } catch {
    els.tocList.innerHTML = '<div class="search-status">Unable to load table of contents.</div>';
  }
}

async function getPagePlainText(pageNum) {
  if (state.textCache.has(pageNum)) return state.textCache.get(pageNum);
  const page = await state.pdfDoc.getPage(pageNum);
  const tc = await page.getTextContent();
  const str = tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').trim();
  state.textCache.set(pageNum, str);
  return str;
}

async function runSearch(query) {
  const q = query.trim();
  state.searchQuery = q;
  const abortId = ++state.searchAbortId;
  els.searchResults.innerHTML = '';

  for (const idx of getVisibleIndices()) {
    paintSearchHighlightsOnPage(idx);
  }

  if (!q || !state.pdfDoc) {
    els.searchStatus.textContent = q ? 'No book loaded.' : '';
    return;
  }

  const lowerQ = q.toLowerCase();
  let matchPages = 0;
  els.searchStatus.textContent = `Searching 0 / ${state.totalPages} pages…`;

  for (let p = 1; p <= state.totalPages; p++) {
    if (abortId !== state.searchAbortId) return;
    if (p % 12 === 0 || p === state.totalPages) {
      els.searchStatus.textContent = `Searching ${p} / ${state.totalPages} pages (${matchPages} matches)…`;
      await new Promise((r) => setTimeout(r, 0));
    }

    const txt = await getPagePlainText(p);
    if (abortId !== state.searchAbortId) return;
    const low = txt.toLowerCase();
    const pos = low.indexOf(lowerQ);
    if (pos !== -1) {
      matchPages++;
      const start = Math.max(0, pos - 42);
      const end = Math.min(txt.length, pos + q.length + 68);
      const rawSnippet = (start > 0 ? '…' : '') + txt.slice(start, end) + (end < txt.length ? '…' : '');
      const hitBtn = document.createElement('button');
      hitBtn.className = 'search-hit';
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      hitBtn.innerHTML = `
        <div class="search-hit-page">Page ${p}</div>
        <div class="search-hit-snippet">${escapeHtml(rawSnippet).replace(re, '<mark>$1</mark>')}</div>
      `;
      hitBtn.addEventListener('click', () => {
        jumpToPage(p, false);
        setTimeout(() => paintSearchHighlightsOnPage(p - 1), 60);
      });
      els.searchResults.appendChild(hitBtn);
    }
  }

  els.searchStatus.textContent = matchPages
    ? `Found ${matchPages} page${matchPages === 1 ? '' : 's'} matching "${q}"`
    : `No matches found for "${q}"`;

  for (const idx of getVisibleIndices()) {
    paintSearchHighlightsOnPage(idx);
  }
}

function paintSearchHighlightsOnPage(idx) {
  const node = state.pageNodes[idx];
  if (!node) return;
  const textLayer = node.querySelector('.textLayer');
  const hlLayer = node.querySelector('.fb-search-highlights');
  if (!textLayer || !hlLayer) return;

  hlLayer.innerHTML = '';
  const q = state.searchQuery.trim().toLowerCase();
  if (!q) return;

  const pageRect = node.getBoundingClientRect();
  if (!pageRect.width || !pageRect.height) return;

  const spans = textLayer.querySelectorAll('span');
  for (const span of spans) {
    const raw = span.textContent || '';
    const lower = raw.toLowerCase();
    if (!lower || !lower.includes(q)) continue;
    const textNode = span.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) continue;

    let from = 0;
    while (from < lower.length) {
      const pos = lower.indexOf(q, from);
      if (pos === -1) break;
      const range = document.createRange();
      range.setStart(textNode, pos);
      range.setEnd(textNode, pos + q.length);
      for (const r of range.getClientRects()) {
        if (!r.width || !r.height) continue;
        const box = document.createElement('div');
        box.className = 'fb-search-box';
        box.style.left = `${((r.left - pageRect.left) / pageRect.width) * 100}%`;
        box.style.top = `${((r.top - pageRect.top) / pageRect.height) * 100}%`;
        box.style.width = `${(r.width / pageRect.width) * 100}%`;
        box.style.height = `${(r.height / pageRect.height) * 100}%`;
        hlLayer.appendChild(box);
      }
      from = pos + q.length;
    }
  }
}

async function refreshTextPane() {
  if (!state.pdfDoc) return;
  const visible = getVisibleIndices();
  els.textPaneLabel.textContent = `Page ${formatSpreadLabel(visible)}`;
  const parts = [];
  for (const idx of visible) {
    const txt = await getPagePlainText(idx + 1);
    parts.push(`--- Page ${idx + 1} ---\n${txt || '(No selectable text on this page)'}`);
  }
  els.pageTextPreview.textContent = parts.join('\n\n');
}

function updateBookmarkUi() {
  const visible = getVisibleIndices().map((i) => i + 1);
  const isBookmarked = visible.some((p) => state.bookmarks.includes(p));
  els.btnBookmarkPage.classList.toggle('active', isBookmarked);
  els.btnToggleCurrentBookmark.textContent = isBookmarked ? '★ Remove Bookmark' : '+ Bookmark Current Page';

  els.bookmarksList.innerHTML = '';
  if (!state.bookmarks.length) {
    els.bookmarksList.innerHTML = '<div class="search-status">No bookmarks saved for this book yet.</div>';
    return;
  }
  const sorted = [...state.bookmarks].sort((a, b) => a - b);
  for (const p of sorted) {
    const row = document.createElement('div');
    row.className = 'toc-item';
    row.innerHTML = `<span>Bookmark — Page ${p}</span><button class="drawer-close" title="Remove">✕</button>`;
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        state.bookmarks = state.bookmarks.filter((x) => x !== p);
        updateBookmarkUi();
        schedulePersistState();
        return;
      }
      jumpToPage(p, false);
    });
    els.bookmarksList.appendChild(row);
  }
}

function toggleBookmarkCurrent() {
  if (!state.totalPages) return;
  const primary = (getVisibleIndices()[0] ?? 0) + 1;
  if (state.bookmarks.includes(primary)) {
    state.bookmarks = state.bookmarks.filter((p) => p !== primary);
  } else {
    state.bookmarks.push(primary);
  }
  updateBookmarkUi();
  schedulePersistState();
}

/* ---------- Opening Books ---------- */
async function openPdfSource(source, { title = 'Book', bookId = null, startPage = 1, bookmarks = [] } = {}) {
  els.loadingText.textContent = `Opening ${title}…`;
  els.loadingOverlay.hidden = false;
  els.libraryModal.hidden = true;
  els.moreMenu.hidden = true;

  disposeBook();
  state.pdfDoc = null;
  state.committedZoom = 1;
  setZoom(1, true);

  try {
    const loadingTask = pdfjsLib.getDocument({
      ...(typeof source === 'string' ? { url: source } : { data: source }),
      cMapUrl: '/vendor/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
    });
    const pdf = await loadingTask.promise;

    state.pdfDoc = pdf;
    state.totalPages = pdf.numPages;
    state.bookTitle = title;
    state.bookId = bookId;
    state.bookmarks = Array.isArray(bookmarks) ? [...bookmarks] : [];

    // Recover saved local progress if no explicit startPage
    let targetPage = startPage;
    if (!targetPage && bookId) {
      try {
        const local = JSON.parse(localStorage.getItem(`flipbook:${bookId}`) || 'null');
        if (local?.lastPage) targetPage = local.lastPage;
        if (Array.isArray(local?.bookmarks) && !state.bookmarks.length) state.bookmarks = local.bookmarks;
      } catch {
        // ignore
      }
    }

    const firstPage = await pdf.getPage(1);
    const vp1 = firstPage.getViewport({ scale: 1 });
    state.pageAspect = vp1.width / vp1.height;

    els.bookTitleLabel.textContent = title;
    document.title = `${title} — FlipBook Reader`;

    const startIdx = clamp((targetPage || 1) - 1, 0, Math.max(0, state.totalPages - 1));
    initPageFlip(startIdx);
    buildOutline();
    if (!els.thumbnailsStrip.hidden) buildThumbnailsStrip();
    updateBookmarkUi();
    fetchLibrary();
  } catch (err) {
    alert(`Failed to open PDF: ${err.message || err}`);
    els.welcomeOverlay.hidden = false;
  } finally {
    els.loadingOverlay.hidden = true;
  }
}

async function openBookById(bookId, overridePage = null) {
  const lib = await fetchLibrary();
  const books = lib?.books || state.libraryBooks || [];
  const book = books.find((b) => b.id === bookId);
  if (!book) return;
  const targetPage = overridePage || parseHashPage() || book.lastPage || 1;
  await openPdfSource(book.url || `/api/book/${book.id}.pdf`, {
    title: book.title,
    bookId: book.id,
    startPage: targetPage,
    bookmarks: book.bookmarks || [],
  });
}

window.openBookById = openBookById;

async function openLocalFileBlob(file) {
  if (!file) return;
  const buf = await file.arrayBuffer();
  const id = `blob-${file.name}-${file.size}`;
  await openPdfSource(new Uint8Array(buf), {
    title: file.name.replace(/\.pdf$/i, ''),
    bookId: id,
    startPage: 1,
  });
}

async function pickFileViaHost() {
  if (window.webkit?.messageHandlers?.flipbook) {
    window.webkit.messageHandlers.flipbook.postMessage({ action: 'pickFile' });
    return;
  }
  try {
    const res = await fetch('/api/pick-file', { method: 'POST' });
    const data = await res.json();
    if (data && !data.cancelled && data.id) {
      await openPdfSource(data.url, {
        title: data.title,
        bookId: data.id,
        startPage: data.lastPage || 1,
        bookmarks: data.bookmarks || [],
      });
    }
  } catch {
    els.fileInputHidden.click();
  }
}

function renderLibraryLists() {
  const books = state.libraryBooks || [];
  const renderInto = (container) => {
    container.innerHTML = '';
    if (!books.length) {
      container.innerHTML = '<div class="search-status">No recent books yet. Open any PDF file to get started.</div>';
      return;
    }
    for (const book of books) {
      const btn = document.createElement('button');
      btn.className = 'recent-row';
      const pageLabel = book.totalPages ? `p. ${book.lastPage || 1} / ${book.totalPages}` : `p. ${book.lastPage || 1}`;
      btn.innerHTML = `<span class="recent-title">${escapeHtml(book.title)}</span><span class="recent-meta">${pageLabel}</span>`;
      btn.addEventListener('click', () => openBookById(book.id, book.lastPage || 1));
      container.appendChild(btn);
    }
  };

  els.welcomeRecentWrap.hidden = books.length === 0;
  renderInto(els.welcomeRecentList);
  renderInto(els.libraryList);
}

/* ---------- UI Modes & Theme ---------- */
function setTheme(theme, persist = true) {
  state.theme = theme;
  document.body.className = `theme-${theme}`;
  document.querySelectorAll('.theme-dot').forEach((d) => {
    d.classList.toggle('active', d.dataset.theme === theme);
  });
  if (persist) schedulePersistState();
}

function updateSoundUi() {
  flipSound.setPreset(state.soundPreset);
  flipSound.setEnabled(state.soundEnabled);
  els.iconSoundOn.hidden = !state.soundEnabled;
  els.iconSoundOff.hidden = state.soundEnabled;

  const info = flipSound.getPresetInfo(state.soundPreset);
  state.soundPreset = info.id;
  if (els.valSoundPreset) {
    els.valSoundPreset.textContent = state.soundEnabled ? info.label : 'Off';
  }
  if (els.btnSound) {
    els.btnSound.title = state.soundEnabled
      ? `Page Turn Sound: ${info.fullName} (Click to mute, Right-click for presets)`
      : 'Page Turn Sound: Off (Click to enable, Right-click for presets)';
  }
  if (els.soundPresetPills) {
    els.soundPresetPills.querySelectorAll('.sound-pill').forEach((btn) => {
      const id = btn.dataset.sound;
      const active = state.soundEnabled ? id === state.soundPreset : id === 'off';
      btn.classList.toggle('active', active);
    });
  }
}

function updateMenuValues() {
  els.valPageMode.textContent = state.pageMode === 'single' ? 'Single' : state.pageMode === 'double' ? 'Double' : 'Auto (Double)';
  els.valHardCover.textContent = state.showCover ? 'On' : 'Off';
  els.valClickMode.textContent = state.clickMode === 'smart' ? 'Corner + Select' : 'Click Anywhere';
  els.valAutoFlip.textContent = state.autoFlipTimer ? 'On (4s)' : 'Off';
}

function stopAutoFlip() {
  if (state.autoFlipTimer) {
    clearInterval(state.autoFlipTimer);
    state.autoFlipTimer = null;
    updateMenuValues();
  }
}

function toggleAutoFlip() {
  if (state.autoFlipTimer) {
    stopAutoFlip();
    return;
  }
  state.autoFlipTimer = setInterval(() => {
    if (!state.pageFlip || state.currentIndex >= state.totalPages - 1) {
      stopAutoFlip();
      return;
    }
    goNext();
  }, 4000);
  updateMenuValues();
}

function openDrawerTab(tabName) {
  els.sideDrawer.hidden = false;
  els.btnDrawer.classList.add('active');
  document.querySelectorAll('.drawer-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  document.querySelectorAll('.drawer-pane').forEach((p) => p.classList.remove('active'));
  const targetMap = {
    toc: 'paneToc',
    search: 'paneSearch',
    bookmarks: 'paneBookmarks',
    text: 'paneText',
  };
  document.getElementById(targetMap[tabName])?.classList.add('active');
  if (tabName === 'search') {
    setTimeout(() => els.searchInput.focus(), 40);
  } else if (tabName === 'text') {
    refreshTextPane();
  } else if (tabName === 'bookmarks') {
    updateBookmarkUi();
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

/* ---------- Event Wiring ---------- */
function wireEvents() {
  els.btnPrevArrow.addEventListener('click', goPrev);
  els.btnNextArrow.addEventListener('click', goNext);
  els.btnFirstPage.addEventListener('click', () => jumpToPage(1, false));
  els.btnLastPage.addEventListener('click', () => jumpToPage(state.totalPages, false));

  // Page Input jump
  els.pageInput.addEventListener('focus', () => {
    els.pageInput.value = String((getVisibleIndices()[0] ?? 0) + 1);
    els.pageInput.select();
  });
  els.pageInput.addEventListener('blur', () => {
    els.pageInput.value = formatSpreadLabel();
  });
  els.pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = parseInt(els.pageInput.value, 10);
      if (Number.isFinite(val)) jumpToPage(val, false);
      els.pageInput.blur();
    } else if (e.key === 'Escape') {
      els.pageInput.value = formatSpreadLabel();
      els.pageInput.blur();
    }
  });

  // Scrubber Slider
  const updateScrubberTooltip = () => {
    const val = Number(els.pageScrubber.value);
    const max = Math.max(1, Number(els.pageScrubber.max));
    const pct = max > 1 ? (val - 1) / (max - 1) : 0;
    els.scrubberTooltip.style.left = `${pct * 100}%`;
    els.scrubberTooltip.textContent = `Page ${val}`;
  };
  els.pageScrubber.addEventListener('input', () => {
    els.scrubberTooltip.hidden = false;
    updateScrubberTooltip();
    els.pageInput.value = `${els.pageScrubber.value}/${state.totalPages}`;
  });
  els.pageScrubber.addEventListener('change', () => {
    els.scrubberTooltip.hidden = true;
    jumpToPage(Number(els.pageScrubber.value), false);
  });
  els.pageScrubber.addEventListener('pointerup', () => {
    els.scrubberTooltip.hidden = true;
  });

  // Toolbar Buttons
  els.btnMore.addEventListener('click', (e) => {
    e.stopPropagation();
    els.moreMenu.hidden = !els.moreMenu.hidden;
    els.btnMore.classList.toggle('active', !els.moreMenu.hidden);
  });
  els.btnZoom.addEventListener('click', cycleZoom);
  els.btnZoomOut.addEventListener('click', () => setZoom(state.zoom - 0.25, true));
  els.btnZoomInPill.addEventListener('click', () => setZoom(state.zoom + 0.25, true));
  els.btnZoomReset.addEventListener('click', () => setZoom(1, true));

  els.btnSearch.addEventListener('click', () => {
    if (!els.sideDrawer.hidden && document.querySelector('.drawer-tab[data-tab="search"]').classList.contains('active')) {
      els.sideDrawer.hidden = true;
      els.btnDrawer.classList.remove('active');
    } else {
      openDrawerTab('search');
    }
  });

  els.btnThumbs.addEventListener('click', () => {
    els.thumbnailsStrip.hidden = !els.thumbnailsStrip.hidden;
    els.btnThumbs.classList.toggle('active', !els.thumbnailsStrip.hidden);
    if (!els.thumbnailsStrip.hidden && state.pdfDoc && !els.thumbScroller.children.length) {
      buildThumbnailsStrip();
    } else if (!els.thumbnailsStrip.hidden) {
      highlightActiveThumbnail(getVisibleIndices());
    }
  });
  els.btnCloseThumbs.addEventListener('click', () => {
    els.thumbnailsStrip.hidden = true;
    els.btnThumbs.classList.remove('active');
  });
  els.btnThumbPrev.addEventListener('click', () => {
    els.thumbScroller.scrollBy({ left: -360, behavior: 'smooth' });
  });
  els.btnThumbNext.addEventListener('click', () => {
    els.thumbScroller.scrollBy({ left: 360, behavior: 'smooth' });
  });

  els.btnSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    updateSoundUi();
    if (state.soundEnabled) flipSound.playFlip(true);
    schedulePersistState();
  });
  els.btnSound.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.moreMenu.hidden = false;
    els.btnMore.classList.toggle('active', true);
  });

  els.btnLibrary.addEventListener('click', () => {
    fetchLibrary();
    els.libraryModal.hidden = false;
  });
  els.btnOpenTop.addEventListener('click', () => {
    fetchLibrary();
    els.libraryModal.hidden = false;
  });
  els.btnCloseLibrary.addEventListener('click', () => {
    els.libraryModal.hidden = true;
  });
  els.libraryModal.addEventListener('click', (e) => {
    if (e.target === els.libraryModal) els.libraryModal.hidden = true;
  });

  els.btnFullscreen.addEventListener('click', toggleFullscreen);

  els.btnDrawer.addEventListener('click', () => {
    els.sideDrawer.hidden = !els.sideDrawer.hidden;
    els.btnDrawer.classList.toggle('active', !els.sideDrawer.hidden);
  });
  els.btnCloseDrawer.addEventListener('click', () => {
    els.sideDrawer.hidden = true;
    els.btnDrawer.classList.remove('active');
  });

  document.querySelectorAll('.drawer-tab').forEach((tab) => {
    tab.addEventListener('click', () => openDrawerTab(tab.dataset.tab));
  });

  els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch(els.searchInput.value);
  });

  els.btnBookmarkPage.addEventListener('click', toggleBookmarkCurrent);
  els.btnToggleCurrentBookmark.addEventListener('click', toggleBookmarkCurrent);
  els.btnCopySpreadText.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.pageTextPreview.textContent || '');
      els.btnCopySpreadText.textContent = 'Copied!';
      setTimeout(() => { els.btnCopySpreadText.textContent = 'Copy Text'; }, 1200);
    } catch {}
  });

  // '+' More Menu items
  els.menuOpenPdf.addEventListener('click', () => {
    els.moreMenu.hidden = true;
    pickFileViaHost();
  });
  els.menuLibrary.addEventListener('click', () => {
    els.moreMenu.hidden = true;
    fetchLibrary();
    els.libraryModal.hidden = false;
  });
  els.menuPageMode.addEventListener('click', () => {
    state.pageMode = state.pageMode === 'auto' ? 'single' : state.pageMode === 'single' ? 'double' : 'auto';
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc) initPageFlip(state.currentIndex);
  });
  els.menuHardCover.addEventListener('click', () => {
    state.showCover = !state.showCover;
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc) initPageFlip(state.currentIndex);
  });
  els.menuClickMode.addEventListener('click', () => {
    state.clickMode = state.clickMode === 'smart' ? 'anywhere' : 'smart';
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc) initPageFlip(state.currentIndex);
  });
  els.menuAutoFlip.addEventListener('click', toggleAutoFlip);

  if (els.soundPresetPills) {
    els.soundPresetPills.querySelectorAll('.sound-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = btn.dataset.sound;
        if (chosen === 'off') {
          state.soundEnabled = false;
          updateSoundUi();
          schedulePersistState();
          return;
        }
        state.soundPreset = chosen;
        state.soundEnabled = true;
        updateSoundUi();
        flipSound.unlock();
        flipSound.playFlip(true);
        schedulePersistState();
      });
    });
  }

  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => setTheme(dot.dataset.theme));
  });

  // File Pickers & Drag-Drop
  els.btnWelcomePick.addEventListener('click', pickFileViaHost);
  els.btnModalPickPdf.addEventListener('click', pickFileViaHost);
  els.fileInputHidden.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) openLocalFileBlob(file);
    els.fileInputHidden.value = '';
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropOverlay.hidden = false;
  });
  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) els.dropOverlay.hidden = true;
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropOverlay.hidden = true;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      openLocalFileBlob(file);
    }
  });

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    if (!els.moreMenu.hidden && !e.target.closest('#moreMenu') && !e.target.closest('#btnMore')) {
      els.moreMenu.hidden = true;
      els.btnMore.classList.remove('active');
    }
  });

  // Smart Text Selection + Zoom Pan isolation inside bookContainer
  let isSelectingText = false;
  const isOuterEdgeClick = (clientX, clientY) => {
    return !!state.pageFlip?.isPointInFlipZone?.(clientX, clientY);
  };
  const guardPageFlipPointer = (e) => {
    if (state.zoom > 1.01) {
      e.stopPropagation();
      return;
    }
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    if (state.clickMode === 'smart' && !isOuterEdgeClick(cx, cy) && e.target.closest('.textLayer span')) {
      // Allow clean text selection on words while outer edges/corners curl pages
      isSelectingText = true;
      e.stopPropagation();
    } else {
      isSelectingText = false;
    }
  };
  els.bookContainer.addEventListener('mousedown', guardPageFlipPointer, true);
  els.bookContainer.addEventListener('touchstart', guardPageFlipPointer, true);
  window.addEventListener('mousemove', (e) => {
    if (state.zoom > 1.01 || isSelectingText) {
      e.stopPropagation();
    }
  }, true);
  window.addEventListener('mouseup', () => {
    isSelectingText = false;
  }, true);

  // Unlock Web Audio cleanly on first user interaction (required in WebKit/Safari)
  const unlockAudioOnce = () => flipSound.unlock();
  window.addEventListener('pointerdown', unlockAudioOnce, { once: true, capture: true });
  window.addEventListener('keydown', unlockAudioOnce, { once: true, capture: true });

  // Panning when zoomed + double click to zoom
  els.zoomViewport.addEventListener('dblclick', (e) => {
    if (!state.pdfDoc) return;
    if (e.target.closest('.textLayer span')) return;
    setZoom(state.zoom > 1.05 ? 1 : 1.75, true);
  });

  els.zoomViewport.addEventListener('mousedown', (e) => {
    if (state.zoom <= 1.01) return;
    if (e.button !== 0) return;
    state.isPanning = true;
    state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    els.zoomViewport.classList.add('is-panning');
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.isPanning || !state.panStart) return;
    state.panX = e.clientX - state.panStart.x;
    state.panY = e.clientY - state.panStart.y;
    applyZoomTransform(false);
  });
  window.addEventListener('mouseup', () => {
    if (state.isPanning) {
      state.isPanning = false;
      state.panStart = null;
      els.zoomViewport.classList.remove('is-panning');
    }
  });

  // Trackpad pinch / Ctrl+Wheel zoom
  els.stage.addEventListener('wheel', (e) => {
    if (!state.pdfDoc) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.008;
      setZoom(state.zoom + delta);
    }
  }, { passive: false });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const editing = tag === 'INPUT' || tag === 'TEXTAREA';

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (state.pdfDoc) openDrawerTab('search');
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      pickFileViaHost();
      return;
    }

    if (editing) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'PageUp': {
        e.preventDefault();
        const now = performance.now();
        if (e.repeat && now - (state.lastKeyNavTime || 0) < 105) break;
        state.lastKeyNavTime = now;
        goPrev();
        break;
      }
      case 'ArrowRight':
      case 'PageDown':
      case ' ': {
        e.preventDefault();
        const now = performance.now();
        if (e.repeat && now - (state.lastKeyNavTime || 0) < 105) break;
        state.lastKeyNavTime = now;
        goNext();
        break;
      }
      case 'Home':
        e.preventDefault();
        jumpToPage(1, false);
        break;
      case 'End':
        e.preventDefault();
        jumpToPage(state.totalPages, false);
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 't':
      case 'T':
        els.btnThumbs.click();
        break;
      case 'b':
      case 'B':
        toggleBookmarkCurrent();
        break;
      case 'l':
      case 'L':
        els.btnLibrary.click();
        break;
      case '+':
      case '=':
        setZoom(state.zoom + 0.25, true);
        break;
      case '-':
        setZoom(state.zoom - 0.25, true);
        break;
      case '0':
        setZoom(1, true);
        break;
      case 'Escape':
        if (!els.moreMenu.hidden) els.moreMenu.hidden = true;
        else if (!els.libraryModal.hidden) els.libraryModal.hidden = true;
        else if (!els.sideDrawer.hidden) { els.sideDrawer.hidden = true; els.btnDrawer.classList.remove('active'); }
        else if (!els.thumbnailsStrip.hidden) { els.thumbnailsStrip.hidden = true; els.btnThumbs.classList.remove('active'); }
        else if (state.zoom > 1) setZoom(1, true);
        break;
    }
  });

  // Responsive Resize
  window.addEventListener('resize', () => {
    if (!state.pdfDoc) return;
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      initPageFlip(state.currentIndex);
    }, 180);
  });
}

/* ---------- Boot ---------- */
async function init() {
  wireEvents();
  const lib = await fetchLibrary();
  const qs = new URLSearchParams(window.location.search);
  const requestedBookId = qs.get('book') || lib?.activeBookId;
  const hashPage = parseHashPage();

  if (requestedBookId) {
    await openBookById(requestedBookId, hashPage);
  }
}

init();
