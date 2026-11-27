import * as pdfjsLib from '/vendor/pdfjs/build/pdf.min.mjs';
import { flipSound, DEFAULT_SOUND_PRESET } from '/assets/sound.js';
import { FlipBookEngine } from '/assets/flip-engine.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/build/pdf.worker.min.mjs';

const MAX_CACHED_CANVASES = 18;
const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange'];

const els = {
  app: document.getElementById('app'),
  topBar: document.getElementById('topBar'),
  bottomBar: document.getElementById('bottomBar'),
  topBarRight: document.getElementById('topBarRight'),
  btnOpenTop: document.getElementById('btnOpenTop'),
  bookTitleLabel: document.getElementById('bookTitleLabel'),
  btnDarkRead: document.getElementById('btnDarkRead'),
  btnHighlightsTop: document.getElementById('btnHighlightsTop'),
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
  scrollViewport: document.getElementById('scrollViewport'),
  scrollPages: document.getElementById('scrollPages'),
  bookCenterShift: document.getElementById('bookCenterShift'),
  bookShell: document.getElementById('bookShell'),
  bookDropShadow: document.getElementById('bookDropShadow'),
  bookStackLeft: document.getElementById('bookStackLeft'),
  bookStackRight: document.getElementById('bookStackRight'),
  bookContainer: document.getElementById('bookContainer'),
  bookSpineShadow: document.getElementById('bookSpineShadow'),
  singleCollectedStack: document.getElementById('singleCollectedStack'),
  scsTopCard: document.getElementById('scsTopCard'),
  scsBadge: document.getElementById('scsBadge'),
  singleFlightLayer: document.getElementById('singleFlightLayer'),

  btnPrevArrow: document.getElementById('btnPrevArrow'),
  btnNextArrow: document.getElementById('btnNextArrow'),
  btnFirstPage: document.getElementById('btnFirstPage'),
  btnLastPage: document.getElementById('btnLastPage'),

  moreMenu: document.getElementById('moreMenu'),
  menuOpenPdf: document.getElementById('menuOpenPdf'),
  menuLibrary: document.getElementById('menuLibrary'),
  menuPageNotes: document.getElementById('menuPageNotes'),
  valPageNotesCount: document.getElementById('valPageNotesCount'),
  menuScrollMode: document.getElementById('menuScrollMode'),
  valScrollMode: document.getElementById('valScrollMode'),
  menuPageMode: document.getElementById('menuPageMode'),
  valPageMode: document.getElementById('valPageMode'),
  menuHardCover: document.getElementById('menuHardCover'),
  valHardCover: document.getElementById('valHardCover'),
  menuClickMode: document.getElementById('menuClickMode'),
  valClickMode: document.getElementById('valClickMode'),
  menuAutoHideBars: document.getElementById('menuAutoHideBars'),
  valAutoHideBars: document.getElementById('valAutoHideBars'),
  menuAutoBlock: document.getElementById('menuAutoBlock'),
  menuAutoFlipGroup: document.getElementById('menuAutoFlipGroup'),
  menuAutoFlip: document.getElementById('menuAutoFlip'),
  valAutoFlip: document.getElementById('valAutoFlip'),
  btnFlipTimeDec: document.getElementById('btnFlipTimeDec'),
  autoFlipRange: document.getElementById('autoFlipRange'),
  btnFlipTimeInc: document.getElementById('btnFlipTimeInc'),
  autoFlipInput: document.getElementById('autoFlipInput'),
  autoFlipPresets: document.getElementById('autoFlipPresets'),
  menuAutoScrollGroup: document.getElementById('menuAutoScrollGroup'),
  menuAutoScrollToggle: document.getElementById('menuAutoScrollToggle'),
  valAutoScroll: document.getElementById('valAutoScroll'),
  btnScrollSpeedDec: document.getElementById('btnScrollSpeedDec'),
  autoScrollRange: document.getElementById('autoScrollRange'),
  btnScrollSpeedInc: document.getElementById('btnScrollSpeedInc'),
  autoScrollInput: document.getElementById('autoScrollInput'),
  autoScrollPresets: document.getElementById('autoScrollPresets'),
  autoPlaybackHud: document.getElementById('autoPlaybackHud'),
  btnHudPlayPause: document.getElementById('btnHudPlayPause'),
  iconHudPlay: document.getElementById('iconHudPlay'),
  iconHudPause: document.getElementById('iconHudPause'),
  hudModeLabel: document.getElementById('hudModeLabel'),
  btnHudDec: document.getElementById('btnHudDec'),
  hudRange: document.getElementById('hudRange'),
  btnHudInc: document.getElementById('btnHudInc'),
  hudReadout: document.getElementById('hudReadout'),
  btnHudStop: document.getElementById('btnHudStop'),

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
  highlightsSummary: document.getElementById('highlightsSummary'),
  btnToggleNotesView: document.getElementById('btnToggleNotesView'),
  btnCopyPageNotes: document.getElementById('btnCopyPageNotes'),
  btnClearPageHighlights: document.getElementById('btnClearPageHighlights'),
  btnClearHighlights: document.getElementById('btnClearHighlights'),
  hlPageChips: document.getElementById('hlPageChips'),
  hlPageSelect: document.getElementById('hlPageSelect'),
  highlightsList: document.getElementById('highlightsList'),
  hlNotesSheet: document.getElementById('hlNotesSheet'),
  hlPopover: document.getElementById('hlPopover'),
  hlPopoverDivider: document.getElementById('hlPopoverDivider'),
  btnHlDelete: document.getElementById('btnHlDelete'),
  textPaneLabel: document.getElementById('textPaneLabel'),
  btnCopySpreadText: document.getElementById('btnCopySpreadText'),
  pageTextPreview: document.getElementById('pageTextPreview'),

  libraryModal: document.getElementById('libraryModal'),
  btnCloseLibrary: document.getElementById('btnCloseLibrary'),
  btnModalPickPdf: document.getElementById('btnModalPickPdf'),
  libraryList: document.getElementById('libraryList'),

  btnMore: document.getElementById('btnMore'),
  btnThumbs: document.getElementById('btnThumbs'),
  pageInput: document.getElementById('pageInput'),
  pageScrubber: document.getElementById('pageScrubber'),
  scrubberTooltip: document.getElementById('scrubberTooltip'),
  btnSound: document.getElementById('btnSound'),
  iconSoundOn: document.getElementById('iconSoundOn'),
  iconSoundOff: document.getElementById('iconSoundOff'),
  valSoundPreset: document.getElementById('valSoundPreset'),
  soundPresetPills: document.getElementById('soundPresetPills'),
  btnFullscreen: document.getElementById('btnFullscreen'),
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
  scrollMode: 'flip', // 'flip' | 'scroll'
  pageMode: 'auto', // 'auto' | 'double' | 'single'
  showCover: true,
  clickMode: 'smart', // 'smart' | 'anywhere'
  readDark: false,
  autoHideBars: true,
  soundEnabled: true,
  soundPreset: DEFAULT_SOUND_PRESET,
  theme: 'charcoal',
  autoFlipTimer: null,
  autoFlipEnabled: false,
  autoFlipPaused: false,
  autoFlipSeconds: 4,
  autoFlipLastTickAt: 0,
  autoScrollSpeed: 1.0,
  autoScrollPlaying: false,
  autoScrollRafId: 0,
  autoScrollLastTs: 0,
  autoScrollPosY: 0,
  autoScrollPauseUntil: 0,
  autoScrollRenderTickAt: 0,
  scrollUserSelecting: false,

  zoom: 1,
  committedZoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panMoved: false,
  panStart: null,
  lastStagePointer: null,
  lastBarPointer: null,
  headerHideTimer: null,
  footerHideTimer: null,

  pageNodes: [],
  renderedMap: new Map(), // pageIdx -> { scale, renderTask, textPromise }
  textCache: new Map(), // 1-based pageNum -> string
  bookmarks: [],
  highlights: [],
  hlFilterMode: 'all', // 'all' | 'current' | 'page'
  hlFilterPage: null,
  hlNotesView: false,
  activeHlDraft: null,
  searchQuery: '',
  searchAbortId: 0,
  libraryBooks: [],

  thumbObserver: null,
  thumbRendered: new Set(),
  scrollObserver: null,
  scrollSyncTimer: null,
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
  if (state.scrollMode === 'scroll' || isEffectiveSingleMode() || state.orientation === 'portrait') {
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
  if (typeof settings.readDark === 'boolean') setReadDark(settings.readDark, false);
  if (typeof settings.autoHideBars === 'boolean') state.autoHideBars = settings.autoHideBars;
  if (settings.soundPreset) {
    state.soundPreset = settings.soundPreset;
  }
  if (typeof settings.soundEnabled === 'boolean') {
    state.soundEnabled = settings.soundEnabled;
  }
  updateSoundUi();
  if (settings.scrollMode === 'scroll' || settings.scrollMode === 'flip') {
    state.scrollMode = settings.scrollMode;
  }
  if (settings.pageMode) state.pageMode = settings.pageMode;
  if (typeof settings.showCover === 'boolean') state.showCover = settings.showCover;
  if (settings.clickMode) state.clickMode = settings.clickMode;
  if (Number.isFinite(Number(settings.autoFlipSeconds))) {
    state.autoFlipSeconds = clamp(Math.round(Number(settings.autoFlipSeconds) * 10) / 10, 0.5, 300);
  }
  if (Number.isFinite(Number(settings.autoScrollSpeed))) {
    state.autoScrollSpeed = clamp(Math.round(Number(settings.autoScrollSpeed) * 10) / 10, 0.2, 5);
  }
  updateMenuValues();
}

function schedulePersistState() {
  clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(() => {
    const payload = {
      settings: {
        theme: state.theme,
        readDark: state.readDark,
        autoHideBars: state.autoHideBars,
        scrollMode: state.scrollMode,
        soundEnabled: state.soundEnabled,
        soundPreset: state.soundPreset,
        pageMode: state.pageMode,
        showCover: state.showCover,
        clickMode: state.clickMode,
        autoFlipSeconds: state.autoFlipSeconds,
        autoScrollSpeed: state.autoScrollSpeed,
      },
    };
    if (state.bookId) {
      payload.id = state.bookId;
      payload.lastPage = state.currentIndex + 1;
      payload.totalPages = state.totalPages;
      payload.bookmarks = state.bookmarks;
      payload.highlights = state.highlights;
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
          highlights: state.highlights,
        }));
      } catch {
        // ignore storage errors
      }
    }
  }, 350);
}

/* ---------- Book Sizing & PageFlip Lifecycle ---------- */
function computeBookGeometry(forceSingle = false) {
  const stageW = Math.max(320, els.stage.clientWidth);
  const stageH = Math.max(260, els.stage.clientHeight);
  const single = forceSingle || isEffectiveSingleMode();

  const horizReserve = forceSingle ? 96 : single ? 140 : 190;
  const vertReserve = forceSingle ? 116 : 132;
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
  stopAutoScroll({ resetPlaying: true });
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
  if (state.scrollObserver) {
    state.scrollObserver.disconnect();
    state.scrollObserver = null;
  }
  if (state.pageFlip) {
    try { state.pageFlip.destroy(); } catch {}
    state.pageFlip = null;
  }
  els.bookContainer.innerHTML = '';
  els.scrollPages.innerHTML = '';
  els.scrollViewport.hidden = true;
  document.body.classList.remove('mode-scroll');
  clearSingleFlights();
  updateSingleCollectedStack();
  els.thumbScroller.innerHTML = '';
  els.tocList.innerHTML = '';
  els.searchResults.innerHTML = '';
  els.searchStatus.textContent = '';
  state.pageNodes = [];
  state.highlights = [];
  state.hlFilterMode = 'all';
  state.hlFilterPage = null;
  hideHighlightPopover();
  showBars(false);
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

function initReaderView(startIndex = 0) {
  if (!state.pdfDoc) return;
  if (state.scrollMode === 'scroll') {
    initScrollView(startIndex);
  } else {
    initPageFlip(startIndex);
  }
  showBars(true);
}

function initScrollView(startIndex = 0) {
  if (!state.pdfDoc) return;

  for (const entry of state.renderedMap.values()) {
    try { entry.renderTask?.cancel(); } catch {}
  }
  state.renderedMap.clear();
  if (state.scrollObserver) {
    state.scrollObserver.disconnect();
    state.scrollObserver = null;
  }
  if (state.pageFlip) {
    try { state.pageFlip.destroy(); } catch {}
    state.pageFlip = null;
  }

  els.bookContainer.innerHTML = '';
  els.bookShell.hidden = true;
  els.zoomViewport.hidden = true;
  document.body.classList.add('mode-scroll');
  clearSingleFlights();
  updateSingleCollectedStack();

  computeBookGeometry(true);
  state.committedZoom = state.zoom;
  const sw = Math.max(120, Math.round(state.pageW * state.zoom));
  const sh = Math.max(160, Math.round(state.pageH * state.zoom));

  buildPageElements();
  els.scrollPages.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < state.pageNodes.length; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'scroll-page-wrap';
    wrap.dataset.pageIndex = String(i);
    wrap.style.width = `${sw}px`;
    wrap.style.height = `${sh}px`;
    wrap.appendChild(state.pageNodes[i]);
    frag.appendChild(wrap);
  }
  els.scrollPages.appendChild(frag);
  els.scrollViewport.hidden = false;

  els.welcomeOverlay.hidden = true;
  els.topBarRight.hidden = false;
  els.btnPrevArrow.hidden = false;
  els.btnNextArrow.hidden = false;
  els.btnFirstPage.hidden = false;
  els.btnLastPage.hidden = false;

  state.scrollObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const idx = Number(entry.target.dataset.pageIndex);
      if (Number.isFinite(idx)) {
        renderPageNode(idx);
      }
    }
  }, { root: els.scrollViewport, rootMargin: '1200px 0px' });

  for (const wrap of els.scrollPages.children) {
    state.scrollObserver.observe(wrap);
  }

  const safeStart = clamp(startIndex, 0, Math.max(0, state.totalPages - 1));
  state.currentIndex = safeStart;
  const targetWrap = els.scrollPages.children[safeStart];
  if (targetWrap) {
    els.scrollViewport.scrollTop = Math.max(0, targetWrap.offsetTop - 54);
  }
  state.autoScrollPosY = els.scrollViewport.scrollTop;
  onSpreadChanged(false, 4);
  if (state.autoScrollPlaying) {
    startAutoScrollLoop();
  } else {
    updatePlaybackUi();
  }
}

function initPageFlip(startIndex = 0) {
  if (!state.pdfDoc) return;
  stopAutoScroll({ resetPlaying: true });

  for (const entry of state.renderedMap.values()) {
    try { entry.renderTask?.cancel(); } catch {}
  }
  state.renderedMap.clear();
  if (state.scrollObserver) {
    state.scrollObserver.disconnect();
    state.scrollObserver = null;
  }
  els.scrollPages.innerHTML = '';
  els.scrollViewport.hidden = true;
  els.zoomViewport.hidden = false;
  document.body.classList.remove('mode-scroll');

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
    disableFlipByClick: !single && state.clickMode === 'smart',
    hasCollectedStack: () => canShowSingleCollectedStack(0),
  });

  pf.setInteractionDisabled(state.zoom > 1.01);
  pf.loadFromHTML(state.pageNodes);

  // Layer spine shadow inside .fh-stage at z-index:3 (above static slots [z:1], below flip layer [z:6]).
  // Turning leaves carry their own edge-aligned binding spine inside .fh-flip-layer so no static
  // overlay ever slices across mid-turn or tilted dragged pages.
  const fhStage = host.querySelector('.fh-stage');
  if (fhStage) {
    fhStage.appendChild(els.bookSpineShadow);
  }

  pf.on('init', (e) => {
    state.orientation = pf.getOrientation();
    state.currentIndex = clamp(e.data?.page ?? safeStart, 0, state.totalPages - 1);
    onSpreadChanged(false);
  });

  pf.on('flipStart', (e) => {
    flipSound.playFlip();
    hideHighlightPopover();
    if (Number.isFinite(e.data?.page)) {
      const fromIdx = clamp(e.data?.from ?? state.currentIndex, 0, state.totalPages - 1);
      const nextIdx = clamp(e.data.page, 0, state.totalPages - 1);
      state.currentIndex = nextIdx;

      let skipSingleStackSwap = false;
      if (e.data?.reversed || fromIdx === nextIdx) {
        clearSingleFlights();
      } else if (nextIdx > fromIdx && !e.data?.fromDragLift) {
        if (canShowSingleCollectedStack(fromIdx)) {
          singleStackMeta.pendingNextFlight = { fromIdx, toIdx: nextIdx };
          skipSingleStackSwap = true;
        } else {
          clearSingleFlights();
        }
      } else {
        const launched = spawnSingleCollectedFlight({
          fromIdx,
          toIdx: nextIdx,
          fromDragLift: !!e.data?.fromDragLift,
        });
        if (!launched) {
          clearSingleFlights();
        } else if (nextIdx > fromIdx) {
          skipSingleStackSwap = true;
        }
      }

      onSpreadChanged(false, 6, { skipSingleStackSwap });
      const vis = getVisibleIndices();
      const touchingCover =
        state.showCover &&
        (vis.includes(0) ||
          fromIdx === 0 ||
          (state.totalPages % 2 === 0 && (vis.includes(state.totalPages - 1) || fromIdx >= state.totalPages - 1)));
      if (touchingCover) {
        state.allowSpine = false;
        els.bookSpineShadow.style.opacity = '0';
      }
    }
    if (state.autoFlipEnabled && !state.autoFlipPaused) {
      state.autoFlipLastTickAt = performance.now();
      scheduleAutoFlipTick(false);
    }
  });

  pf.on('nextLiftStart', (e) => {
    const p = singleStackMeta.pendingNextFlight;
    if (!p) return;
    if (Number.isFinite(e.data?.fromIdx) && e.data.fromIdx !== p.fromIdx) return;
    singleStackMeta.pendingNextFlight = null;
    spawnSingleCollectedFlight({ fromIdx: p.fromIdx, toIdx: p.toIdx, fromPeelRelay: true });
  });

  pf.on('dragLift', (e) => {
    updateSingleDragPickup(e.data);
  });

  pf.on('flip', (e) => {
    const nextIdx = clamp(e.data, 0, state.totalPages - 1);
    state.currentIndex = nextIdx;
    singleStackMeta.pendingNextFlight = null;
    onSpreadChanged(true, 6, { skipSingleStackSwap: singleStackMeta.activeFlights > 0 });
  });

  pf.on('changeState', (e) => {
    state.isFlipping = e.data === 'flipping' || e.data === 'user_fold';
    document.body.classList.toggle('is-flip-dragging', e.data === 'user_fold');
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

/* ---------- On-Demand PDF Canvas + TextLayer Rendering + Selection Stabilizer ---------- */
const textLayerEndMap = new Map();
let textSelectionGuardWired = false;
let prevSelectionRange = null;

function pruneDisconnectedTextLayers() {
  for (const div of textLayerEndMap.keys()) {
    if (!div.isConnected) textLayerEndMap.delete(div);
  }
}

function resetAllTextLayersSelecting() {
  document.body.classList.remove('is-selecting-text');
  for (const [div, endDiv] of textLayerEndMap.entries()) {
    if (!div.isConnected) {
      textLayerEndMap.delete(div);
      continue;
    }
    if (endDiv.parentElement !== div || endDiv.nextSibling !== null) {
      div.append(endDiv);
    }
    endDiv.style.width = '';
    endDiv.style.height = '';
    div.classList.remove('selecting', 'selecting-origin');
  }
  prevSelectionRange = null;
}

function wireGlobalTextLayerSelectionGuard() {
  if (textSelectionGuardWired) return;
  textSelectionGuardWired = true;
  let isPointerDown = false;

  document.addEventListener('pointerdown', () => {
    isPointerDown = true;
  });
  document.addEventListener('pointerup', () => {
    isPointerDown = false;
    resetAllTextLayersSelecting();
  });
  window.addEventListener('blur', () => {
    isPointerDown = false;
    resetAllTextLayersSelecting();
  });
  document.addEventListener('keyup', () => {
    if (!isPointerDown) resetAllTextLayersSelecting();
  });

  // Dynamically anchor .endOfContent right beside the live selection boundary so dragging
  // into word/line gaps never snaps selection to top/bottom of page or random blocks.
  document.addEventListener('selectionchange', () => {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      if (!isPointerDown) resetAllTextLayersSelecting();
      return;
    }

    const activeLayers = new Set();
    for (let i = 0; i < selection.rangeCount; i++) {
      const r = selection.getRangeAt(i);
      for (const div of textLayerEndMap.keys()) {
        if (!div.isConnected) {
          textLayerEndMap.delete(div);
          continue;
        }
        if (!activeLayers.has(div) && r.intersectsNode(div)) {
          activeLayers.add(div);
        }
      }
    }

    for (const [div, endDiv] of textLayerEndMap.entries()) {
      if (activeLayers.has(div)) {
        div.classList.add('selecting');
      } else if (!div.classList.contains('selecting-origin')) {
        if (endDiv.parentElement !== div || endDiv.nextSibling !== null) div.append(endDiv);
        endDiv.style.width = '';
        endDiv.style.height = '';
        div.classList.remove('selecting');
      }
    }

    const range = selection.getRangeAt(0);
    const modifyStart = prevSelectionRange && (
      range.compareBoundaryPoints(Range.END_TO_END, prevSelectionRange) === 0 ||
      range.compareBoundaryPoints(Range.START_TO_END, prevSelectionRange) === 0
    );
    let anchor = modifyStart ? range.startContainer : range.endContainer;
    if (anchor && anchor.nodeType === Node.TEXT_NODE) {
      anchor = anchor.parentNode;
    }
    const parentLayer = anchor?.parentElement?.closest?.('.textLayer');
    const endDiv = parentLayer ? textLayerEndMap.get(parentLayer) : null;
    if (endDiv && anchor?.parentElement && (anchor.parentElement === parentLayer || parentLayer.contains(anchor.parentElement))) {
      endDiv.style.width = `${parentLayer.clientWidth || parentLayer.offsetWidth}px`;
      endDiv.style.height = `${parentLayer.clientHeight || parentLayer.offsetHeight}px`;
      anchor.parentElement.insertBefore(endDiv, modifyStart ? anchor : anchor.nextSibling);
    }
    try {
      prevSelectionRange = range.cloneRange();
    } catch {
      prevSelectionRange = null;
    }
  });
}

function registerTextLayerForSelection(textLayerDiv) {
  wireGlobalTextLayerSelectionGuard();
  pruneDisconnectedTextLayers();
  const endOfContent = document.createElement('div');
  endOfContent.className = 'endOfContent';
  textLayerDiv.append(endOfContent);
  textLayerEndMap.set(textLayerDiv, endOfContent);

  textLayerDiv.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    resetAllTextLayersSelecting();
    textLayerDiv.classList.add('selecting', 'selecting-origin');
    document.body.classList.add('is-selecting-text');
  });
}

function isClientNearSelectableText(targetEl, clientX, clientY) {
  if (!targetEl) return false;
  const directSpan = targetEl.closest('.textLayer span');
  if (directSpan && !directSpan.classList.contains('markedContent')) return true;
  const textLayer = targetEl.closest('.textLayer');
  if (!textLayer) return false;
  const spans = textLayer.querySelectorAll('span:not(.markedContent)');
  const padX = 10;
  const padY = 8;
  for (const s of spans) {
    if (!s.textContent) continue;
    const r = s.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (clientY >= r.top - padY && clientY <= r.bottom + padY && clientX >= r.left - padX && clientX <= r.right + padX) {
      return true;
    }
  }
  return false;
}

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

    const userHlLayer = document.createElement('div');
    userHlLayer.className = 'fb-user-highlights';

    const hlLayer = document.createElement('div');
    hlLayer.className = 'fb-search-highlights';

    inner.innerHTML = '';
    inner.appendChild(canvas);
    inner.appendChild(userHlLayer);
    inner.appendChild(hlLayer);
    inner.appendChild(textLayerDiv);
    paintUserHighlightsOnPage(idx);

    const textLayer = new pdfjsLib.TextLayer({
      textContentSource: pdfPage.streamTextContent(),
      container: textLayerDiv,
      viewport: cssVp,
    });
    await textLayer.render();
    if (state.renderedMap.get(idx) !== token) return;

    registerTextLayerForSelection(textLayerDiv);
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
  const leftThick = leftIdx > 0
    ? clamp(Math.round((leftIdx / Math.max(1, state.totalPages - 1)) * maxStack), single ? 3 : 2, maxStack)
    : 0;
  const rightRemain = state.totalPages - 1 - rightIdx;
  const rightThick = rightRemain > 0
    ? clamp(Math.round((rightRemain / Math.max(1, state.totalPages - 1)) * maxStack), single ? 3 : 2, maxStack)
    : 0;

  els.bookShell.classList.toggle('has-left-stack', leftThick > 0);

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
    }
    els.bookDropShadow.style.left = `${-leftThick}px`;
    els.bookDropShadow.style.right = `${-rightThick}px`;
  }
}

const singleStackMeta = {
  renderedIdx: null,
  renderToken: 0,
  activeFlights: 0,
  pendingNextFlight: null,
  dragCard: null,
  dragPose: null,
};

function clearSingleDragCard() {
  if (singleStackMeta.dragCard) {
    singleStackMeta.dragCard.remove();
    singleStackMeta.dragCard = null;
  }
  singleStackMeta.dragPose = null;
  els.singleCollectedStack?.classList.remove('is-drop-ready');
}

function clearSingleFlights() {
  clearSingleDragCard();
  singleStackMeta.activeFlights = 0;
  singleStackMeta.pendingNextFlight = null;
  if (els.singleFlightLayer) {
    els.singleFlightLayer.innerHTML = '';
  }
  els.singleCollectedStack?.classList.remove('is-waiting', 'is-drop-ready');
}

function getSingleStackMetrics() {
  const stageW = els.stage?.clientWidth || 0;
  const w = clamp(Math.round(stageW * 0.072), 68, 94);
  const aspect = clamp(state.pageAspect || 0.72, 0.45, 1.45);
  const h = Math.round(w / aspect);
  return { w, h, stageW };
}

function canShowSingleCollectedStack(collectedIdx = state.currentIndex - 1) {
  if (!state.pdfDoc || state.scrollMode !== 'flip') return false;
  if (!(isEffectiveSingleMode() || state.orientation === 'portrait')) return false;
  if (state.zoom > 1.05) return false;
  if (collectedIdx < 0 || collectedIdx >= state.totalPages) return false;
  const { w, stageW } = getSingleStackMetrics();
  const bookLeft = Math.round((stageW - state.pageW) / 2);
  return bookLeft >= w + 34;
}

function createFlightSnapshotCanvas(pageIdx, targetW, targetH, className) {
  const srcCanvas = state.pageNodes[pageIdx]?.querySelector('canvas.fb-canvas');
  const mini = document.createElement('canvas');
  mini.className = className;
  mini.width = Math.max(2, Math.round(targetW));
  mini.height = Math.max(2, Math.round(targetH));
  if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
    const ctx = mini.getContext('2d', { alpha: false });
    ctx.drawImage(srcCanvas, 0, 0, mini.width, mini.height);
    return mini;
  }
  return null;
}

function paintSingleStackTopCard(pageIdx) {
  if (!els.singleCollectedStack || !els.scsTopCard || !els.scsBadge) return;
  if (pageIdx < 0 || pageIdx >= state.totalPages || !state.pdfDoc) return;

  const { w, h } = getSingleStackMetrics();
  els.scsBadge.textContent = `Pg ${pageIdx + 1}`;
  els.singleCollectedStack.title = `Page ${pageIdx + 1} — Click to pull back (←)`;

  const depth = pageIdx >= 30 ? '4' : pageIdx >= 10 ? '3' : pageIdx >= 3 ? '2' : '1';
  els.singleCollectedStack.dataset.depth = depth;

  if (singleStackMeta.renderedIdx === pageIdx && els.scsTopCard.firstChild) {
    return;
  }
  singleStackMeta.renderedIdx = pageIdx;
  const token = ++singleStackMeta.renderToken;

  const fastCanvas = createFlightSnapshotCanvas(pageIdx, w * 2, h * 2, 'scs-mini-canvas');
  if (fastCanvas) {
    els.scsTopCard.innerHTML = '';
    els.scsTopCard.appendChild(fastCanvas);
    return;
  }

  els.scsTopCard.innerHTML = `<div class="fb-page-num-placeholder">${pageIdx + 1}</div>`;
  state.pdfDoc.getPage(pageIdx + 1).then((pdfPage) => {
    if (singleStackMeta.renderToken !== token || singleStackMeta.renderedIdx !== pageIdx) return null;
    const rawVp = pdfPage.getViewport({ scale: 1 });
    const vp = pdfPage.getViewport({ scale: (w * 2) / Math.max(1, rawVp.width) });
    const canvas = document.createElement('canvas');
    canvas.className = 'scs-mini-canvas';
    canvas.width = Math.max(2, Math.floor(vp.width));
    canvas.height = Math.max(2, Math.floor(vp.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return pdfPage.render({ canvasContext: ctx, viewport: vp }).promise.then(() => {
      if (singleStackMeta.renderToken !== token || singleStackMeta.renderedIdx !== pageIdx) return;
      els.scsTopCard.innerHTML = '';
      els.scsTopCard.appendChild(canvas);
    });
  }).catch(() => {});
}

function updateSingleCollectedStack({ skipSwap = false } = {}) {
  if (!els.singleCollectedStack) return;
  const collectedIdx = state.currentIndex - 1;
  if (!canShowSingleCollectedStack(collectedIdx)) {
    if (!singleStackMeta.activeFlights && !singleStackMeta.pendingNextFlight) {
      els.singleCollectedStack.hidden = true;
      els.singleCollectedStack.classList.remove('is-waiting');
    }
    return;
  }

  const { w, h } = getSingleStackMetrics();
  els.singleCollectedStack.style.width = `${w}px`;
  els.singleCollectedStack.style.height = `${h}px`;
  els.singleCollectedStack.hidden = false;
  if (!skipSwap && singleStackMeta.activeFlights === 0 && !singleStackMeta.pendingNextFlight) {
    els.singleCollectedStack.classList.remove('is-waiting');
    paintSingleStackTopCard(collectedIdx);
  }
}

function getSingleStackCenterCoords(bookRect, stageRect) {
  const stackW = els.singleCollectedStack.offsetWidth;
  const stackH = els.singleCollectedStack.offsetHeight;
  const dstCenterX = els.singleCollectedStack.offsetLeft + stackW / 2;
  const dstCenterY = els.singleCollectedStack.offsetTop + stackH / 2;
  const srcX = bookRect.left - stageRect.left;
  const srcY = bookRect.top - stageRect.top;
  const dstX = dstCenterX - bookRect.width / 2;
  const dstY = dstCenterY - bookRect.height / 2;
  const sx = stackW / bookRect.width;
  const sy = stackH / bookRect.height;
  return { srcX, srcY, dstX, dstY, sx, sy, stackW, stackH };
}

function updateSingleDragPickup(data) {
  const isPrev = data?.side === 'left';
  const checkIdx = isPrev ? data?.toIdx : data?.fromIdx;
  if (!data || !data.active || !canShowSingleCollectedStack(checkIdx)) {
    const hadDrag = !!singleStackMeta.dragCard;
    clearSingleDragCard();
    if (hadDrag) updateSingleCollectedStack();
    return;
  }
  if (!els.singleFlightLayer || !els.singleCollectedStack || !els.stage || !els.bookContainer) return;

  const pageToDraw = isPrev ? data.toIdx : data.fromIdx;
  const underStackIdx = pageToDraw - 1;
  const { w, h } = getSingleStackMetrics();
  els.singleCollectedStack.style.width = `${w}px`;
  els.singleCollectedStack.style.height = `${h}px`;
  if (underStackIdx < 0) {
    els.singleCollectedStack.classList.add('is-waiting');
  } else {
    els.singleCollectedStack.classList.remove('is-waiting');
    paintSingleStackTopCard(underStackIdx);
  }
  els.singleCollectedStack.hidden = false;

  const stageRect = els.stage.getBoundingClientRect();
  const bookRect = els.bookContainer.getBoundingClientRect();
  if (!stageRect.width || !bookRect.width || !els.singleCollectedStack.offsetWidth) return;

  let card = singleStackMeta.dragCard;
  if (!card || Number(card.dataset.pageIdx) !== pageToDraw) {
    clearSingleDragCard();
    card = document.createElement('div');
    card.id = 'singleDragCard';
    card.className = 'scs-flying-card';
    card.dataset.pageIdx = String(pageToDraw);
    card.style.width = `${bookRect.width}px`;
    card.style.height = `${bookRect.height}px`;
    const snap = createFlightSnapshotCanvas(
      pageToDraw,
      Math.min(bookRect.width * 1.5, 640),
      Math.min(bookRect.height * 1.5, 900),
      'scs-flying-canvas'
    );
    if (snap) card.appendChild(snap);
    else card.innerHTML = `<div class="fb-page-num-placeholder">${pageToDraw + 1}</div>`;
    const shade = document.createElement('div');
    shade.className = 'scs-flying-shade';
    card.appendChild(shade);
    els.singleFlightLayer.appendChild(card);
    singleStackMeta.dragCard = card;
  }

  const r = clamp(data.liftRatio || 0, 0, 1);
  const { srcX, srcY, dstX, dstY, sx } = getSingleStackCenterCoords(bookRect, stageRect);

  let x;
  let y;
  let scale;
  let rotY;
  let rotZ;
  let op;

  if (isPrev) {
    scale = sx + r * (0.94 - sx);
    const ptrX = (data.clientX ? data.clientX - stageRect.left : (dstX + (srcX - dstX) * r + bookRect.width / 2)) - bookRect.width / 2;
    const ptrY = (data.clientY ? data.clientY - stageRect.top : (dstY + (srcY - dstY) * r + bookRect.height / 2)) - bookRect.height / 2;
    const targetX = dstX + (srcX - dstX) * r;
    const targetY = dstY + (srcY - dstY) * r;
    x = targetX + (ptrX - targetX) * Math.sin(r * Math.PI) * 0.55;
    y = targetY + (ptrY - targetY) * Math.sin(r * Math.PI) * 0.55;
    rotY = Math.sin(r * Math.PI) * 24 + (1 - r) * 8;
    rotZ = -1.5 + Math.sin(r * Math.PI) * 4.5;
    op = 1;
    els.singleCollectedStack.classList.remove('is-drop-ready');
  } else {
    scale = 0.88 - r * (0.88 - Math.max(sx * 1.12, 0.36));
    const ptrX = (data.clientX ? data.clientX - stageRect.left : srcX + bookRect.width / 2) - bookRect.width / 2;
    const ptrY = (data.clientY ? data.clientY - stageRect.top : srcY + bookRect.height / 2) - bookRect.height / 2;
    const follow = clamp(r * 1.2, 0, 1);
    x = (srcX - 24) + (ptrX - (srcX - 24)) * follow * 0.72 + (dstX - (srcX - 24)) * Math.max(0, r - 0.35) * 0.45;
    y = (srcY - 8) + (ptrY - (srcY - 8)) * follow * 0.72 + (dstY - (srcY - 8)) * Math.max(0, r - 0.35) * 0.45;
    rotY = -18 - r * 8;
    rotZ = -3 - r * 2.5;
    op = clamp(r * 4.5, 0, 0.98);
    els.singleCollectedStack.classList.toggle('is-drop-ready', r > 0.25);
  }

  const transformStr = `translate3d(${x}px, ${y}px, 0) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`;
  card.style.opacity = String(op);
  card.style.transform = transformStr;
  singleStackMeta.dragPose = { transform: transformStr, opacity: op, x, y, scale, rotY, rotZ };
}

function spawnSingleCollectedFlight({ fromIdx, toIdx, fromDragLift = false, fromPeelRelay = false }) {
  if (!els.singleCollectedStack || !els.singleFlightLayer || !els.stage || !els.bookContainer) {
    clearSingleDragCard();
    return false;
  }
  const dragPose = fromDragLift ? singleStackMeta.dragPose : null;
  clearSingleDragCard();

  const goingNext = toIdx > fromIdx;
  const checkIdx = goingNext ? fromIdx : toIdx;
  if (!canShowSingleCollectedStack(checkIdx)) return false;

  const { w, h } = getSingleStackMetrics();
  const stageRect = els.stage.getBoundingClientRect();
  const bookRect = els.bookContainer.getBoundingClientRect();
  if (!stageRect.width || !bookRect.width || !bookRect.height) return false;

  // Ensure destination stack has layout rect without flashing empty on Page 1->2 before arrival
  els.singleCollectedStack.style.width = `${w}px`;
  els.singleCollectedStack.style.height = `${h}px`;
  if (goingNext) {
    if (fromIdx === 0) {
      els.singleCollectedStack.classList.add('is-waiting');
    } else {
      paintSingleStackTopCard(fromIdx - 1);
    }
    els.singleCollectedStack.hidden = false;
  } else {
    // Lifting toIdx back off the top-left stack immediately reveals toIdx - 1 underneath
    if (toIdx - 1 >= 0) {
      paintSingleStackTopCard(toIdx - 1);
      els.singleCollectedStack.hidden = false;
    } else {
      els.singleCollectedStack.classList.add('is-waiting');
    }
  }

  if (!els.singleCollectedStack.offsetWidth || !els.singleCollectedStack.offsetHeight) return false;

  // Cap concurrent rapid flights so spamming arrows stays 60fps
  while (els.singleFlightLayer.children.length >= 3) {
    els.singleFlightLayer.firstElementChild?.remove();
  }

  const flyingPageIdx = goingNext ? fromIdx : toIdx;
  const card = document.createElement('div');
  card.className = 'scs-flying-card';
  card.style.width = `${bookRect.width}px`;
  card.style.height = `${bookRect.height}px`;

  const snapCanvas = createFlightSnapshotCanvas(
    flyingPageIdx,
    Math.min(bookRect.width * 1.5, 640),
    Math.min(bookRect.height * 1.5, 900),
    'scs-flying-canvas'
  );
  if (snapCanvas) {
    card.appendChild(snapCanvas);
  } else {
    card.innerHTML = `<div class="fb-page-num-placeholder">${flyingPageIdx + 1}</div>`;
  }
  const shade = document.createElement('div');
  shade.className = 'scs-flying-shade';
  card.appendChild(shade);
  els.singleFlightLayer.appendChild(card);

  const { srcX, srcY, dstX, dstY, sx, sy } = getSingleStackCenterCoords(bookRect, stageRect);
  const midX = (srcX + dstX) / 2 - 22;
  const midY = (srcY + dstY) * 0.5 - 12;
  const midScale = (1 + sx) * 0.52;

  singleStackMeta.activeFlights += 1;

  let keyframes;
  let duration;
  if (goingNext && dragPose) {
    const mx = (dragPose.x + dstX) * 0.5 - 10;
    const my = (dragPose.y + dstY) * 0.5 - 8;
    const ms = (dragPose.scale + sx) * 0.5;
    keyframes = [
      { transform: dragPose.transform, opacity: Math.max(0.92, dragPose.opacity), offset: 0 },
      { transform: `translate3d(${mx}px, ${my}px, 0) rotateY(-12deg) rotateZ(-2.5deg) scale(${ms})`, opacity: 0.99, offset: 0.5 },
      { transform: `translate3d(${dstX}px, ${dstY}px, 0) rotateY(0deg) rotateZ(-1.5deg) scale(${sx}, ${sy})`, opacity: 1, offset: 1 },
    ];
    duration = 270;
  } else if (!goingNext && dragPose) {
    const mx = (dragPose.x + srcX) * 0.5 - 6;
    const my = (dragPose.y + srcY) * 0.5 - 8;
    const ms = (dragPose.scale + 1) * 0.5;
    keyframes = [
      { transform: dragPose.transform, opacity: 1, offset: 0 },
      { transform: `translate3d(${mx}px, ${my}px, 0) rotateY(14deg) rotateX(2deg) rotateZ(1deg) scale(${ms})`, opacity: 1, offset: 0.52 },
      { transform: `translate3d(${srcX}px, ${srcY}px, 0) rotateY(0deg) rotateX(0deg) rotateZ(0deg) scale(1)`, opacity: 1, offset: 1 },
    ];
    duration = 285;
  } else if (goingNext && fromPeelRelay) {
    const mx = (srcX + dstX) * 0.46 - 20;
    const my = (srcY + dstY) * 0.5 - 12;
    keyframes = [
      { transform: `translate3d(${srcX - 24}px, ${srcY - 6}px, 0) rotateY(-20deg) rotateZ(-2.5deg) scale(0.88)`, opacity: 0.18, offset: 0 },
      { transform: `translate3d(${srcX - 42}px, ${srcY - 14}px, 0) rotateY(-22deg) rotateZ(-3.5deg) scale(0.81)`, opacity: 0.98, offset: 0.14 },
      { transform: `translate3d(${mx}px, ${my}px, 0) rotateY(-24deg) rotateZ(-5deg) scale(${midScale})`, opacity: 0.99, offset: 0.48 },
      { transform: `translate3d(${dstX}px, ${dstY}px, 0) rotateY(0deg) rotateZ(-1.5deg) scale(${sx}, ${sy})`, opacity: 1, offset: 1 },
    ];
    duration = 310;
  } else {
    keyframes = goingNext
      ? [
          { transform: `translate3d(${srcX - 28}px, ${srcY - 6}px, 0) rotateY(-20deg) rotateZ(-3deg) scale(0.86)`, opacity: 0.94, offset: 0 },
          { transform: `translate3d(${midX}px, ${midY}px, 0) rotateY(-24deg) rotateZ(-5deg) scale(${midScale})`, opacity: 0.99, offset: 0.46 },
          { transform: `translate3d(${dstX}px, ${dstY}px, 0) rotateY(0deg) rotateZ(-1.5deg) scale(${sx}, ${sy})`, opacity: 1, offset: 1 },
        ]
      : [
          { transform: `translate3d(${dstX}px, ${dstY}px, 0) rotateY(0deg) rotateZ(-1.5deg) scale(${sx}, ${sy})`, opacity: 1, offset: 0 },
          { transform: `translate3d(${(dstX + srcX) * 0.40}px, ${midY}px, 0) rotateY(24deg) rotateX(6deg) rotateZ(4deg) scale(${midScale})`, opacity: 1, offset: 0.34 },
          { transform: `translate3d(${srcX - 10}px, ${srcY - 4}px, 0) rotateY(15deg) rotateX(2deg) rotateZ(1deg) scale(0.95)`, opacity: 1, offset: 0.72 },
          { transform: `translate3d(${srcX}px, ${srcY}px, 0) rotateY(0deg) rotateX(0deg) rotateZ(0deg) scale(1)`, opacity: 1, offset: 1 },
        ];
    duration = goingNext ? 340 : 430;
  }

  const anim = card.animate(keyframes, {
    duration,
    easing: 'cubic-bezier(0.25, 0.80, 0.35, 1)',
    fill: 'forwards',
  });

  const finishFlight = () => {
    singleStackMeta.activeFlights = Math.max(0, singleStackMeta.activeFlights - 1);
    if (singleStackMeta.activeFlights === 0) {
      updateSingleCollectedStack();
    }
    requestAnimationFrame(() => {
      card.remove();
    });
  };
  anim.addEventListener('finish', finishFlight, { once: true });
  anim.addEventListener('cancel', finishFlight, { once: true });
  return true;
}

function onSpreadChanged(persist = true, renderRadius = 5, { skipSingleStackSwap = false } = {}) {
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
  updateSingleCollectedStack({ skipSwap: skipSingleStackSwap });
  updateBookmarkUi();
  if (els.valPageNotesCount || (els.sideDrawer && !els.sideDrawer.hidden)) {
    updateHighlightsUi();
  }
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
  if (state.scrollMode === 'scroll') {
    if (state.totalPages > 0) jumpToPage(Math.max(1, state.currentIndex), true);
    return;
  }
  if (!state.pageFlip) return;
  state.pageFlip.flipPrev('bottom');
}

function goNext() {
  if (state.scrollMode === 'scroll') {
    if (state.totalPages > 0) jumpToPage(Math.min(state.totalPages, state.currentIndex + 2), true);
    return;
  }
  if (!state.pageFlip) return;
  state.pageFlip.flipNext('bottom');
}

function jumpToPage(oneBasedPage, animate = false) {
  if (!state.totalPages) return;
  const targetIdx = clamp(Math.floor(oneBasedPage) - 1, 0, state.totalPages - 1);
  if (state.scrollMode === 'scroll') {
    const wrap = els.scrollPages.children[targetIdx];
    if (wrap) {
      const destTop = Math.max(0, wrap.offsetTop - 54);
      if (animate) {
        state.autoScrollPauseUntil = performance.now() + 460;
      } else {
        state.autoScrollPosY = destTop;
      }
      els.scrollViewport.scrollTo({
        top: destTop,
        behavior: animate ? 'smooth' : 'auto',
      });
    }
    state.currentIndex = targetIdx;
    onSpreadChanged(true, 4);
    return;
  }
  if (!state.pageFlip) return;
  if (animate && Math.abs(targetIdx - state.currentIndex) <= 2) {
    state.pageFlip.flip(targetIdx, 'bottom');
  } else {
    clearSingleFlights();
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
  if (state.zoom > 1.05) clearSingleFlights();
  updateSingleCollectedStack();

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
  state.pageFlip?.setInteractionDisabled?.(zoomed);
  hideHighlightPopover();

  if (rerender && state.pdfDoc) {
    clearTimeout(state.zoomRerenderTimer);
    if (immediate) {
      commitZoomLayout();
    } else {
      state.zoomRerenderTimer = setTimeout(commitZoomLayout, 85);
    }
  }
}

function setZoom(nextZoom, immediate = false, anchor = null) {
  const prevZoom = state.zoom || 1;
  const z = clamp(Number(nextZoom) || 1, 1, 3.5);
  state.zoom = z <= 1.01 ? 1 : z;

  if (state.scrollMode === 'scroll') {
    hideHighlightPopover();
    const zoomed = state.zoom > 1.01;
    els.zoomPill.hidden = !zoomed;
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;

    if (state.pdfDoc && els.scrollPages.children.length) {
      const sv = els.scrollViewport;
      const svRect = sv.getBoundingClientRect();
      const targetX = anchor && Number.isFinite(anchor.clientX) ? anchor.clientX : svRect.left + svRect.width / 2;
      const targetY = anchor && Number.isFinite(anchor.clientY) ? anchor.clientY : svRect.top + svRect.height / 2;
      const vpX = targetX - svRect.left;
      const vpY = targetY - svRect.top;

      let anchorWrap = els.scrollPages.children[state.currentIndex] || els.scrollPages.children[0];
      let bestDist = Infinity;
      const approxIdx = clamp(state.currentIndex, 0, els.scrollPages.children.length - 1);
      const lo = Math.max(0, approxIdx - 6);
      const hi = Math.min(els.scrollPages.children.length - 1, approxIdx + 6);
      for (let i = lo; i <= hi; i++) {
        const w = els.scrollPages.children[i];
        const r = w.getBoundingClientRect();
        const dist = targetY < r.top ? r.top - targetY : targetY > r.bottom ? targetY - r.bottom : 0;
        if (dist < bestDist) {
          bestDist = dist;
          anchorWrap = w;
        }
      }

      const prevR = anchorWrap.getBoundingClientRect();
      const relX = prevR.width > 0 ? (targetX - prevR.left) / prevR.width : 0.5;
      const relY = prevR.height > 0 ? (targetY - prevR.top) / prevR.height : 0.5;

      const sw = Math.max(120, Math.round(state.pageW * state.zoom));
      const sh = Math.max(160, Math.round(state.pageH * state.zoom));
      for (const wrap of els.scrollPages.children) {
        wrap.style.width = `${sw}px`;
        wrap.style.height = `${sh}px`;
      }

      sv.scrollLeft = Math.max(0, anchorWrap.offsetLeft + relX * sw - vpX);
      sv.scrollTop = Math.max(0, anchorWrap.offsetTop + relY * sh - vpY);
      state.autoScrollPosY = sv.scrollTop;

      clearTimeout(state.zoomRerenderTimer);
      const commitScroll = () => {
        state.committedZoom = state.zoom;
        queueNearbyRenders(state.currentIndex, 3);
      };
      if (immediate) commitScroll();
      else state.zoomRerenderTimer = setTimeout(commitScroll, 85);
    }
    return;
  }

  if (state.zoom === 1) {
    state.panX = 0;
    state.panY = 0;
    if (!state.pdfDoc) state.committedZoom = 1;
  } else {
    const ratio = state.zoom / prevZoom;
    let dx = 0;
    let dy = 0;
    if (anchor && Number.isFinite(anchor.clientX) && Number.isFinite(anchor.clientY)) {
      const zvRect = els.zoomViewport.getBoundingClientRect();
      if (zvRect.width > 0 && zvRect.height > 0) {
        const cx0 = zvRect.left + zvRect.width / 2 - state.panX;
        const cy0 = zvRect.top + zvRect.height / 2 - state.panY;
        dx = anchor.clientX - cx0;
        dy = anchor.clientY - cy0;
      }
    }
    state.panX = dx + (state.panX - dx) * ratio;
    state.panY = dy + (state.panY - dy) * ratio;
  }
  applyZoomTransform(true, immediate || state.zoom === 1);
}

function getStageZoomAnchor() {
  const p = state.lastStagePointer;
  if (!p) return null;
  const r = els.stage.getBoundingClientRect();
  if (p.clientX < r.left || p.clientX > r.right || p.clientY < r.top || p.clientY > r.bottom) {
    return null;
  }
  return p;
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

/* ---------- Text Highlights (Multi-Color + Persistence) ---------- */
function normalizeHighlightsList(list) {
  if (!Array.isArray(list)) return [];
  const roundPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) * 1000) / 1000));
  return list
    .filter((h) => h && typeof h === 'object' && Number.isInteger(h.page) && h.page >= 1 && Array.isArray(h.rects))
    .slice(0, 2000)
    .map((h) => ({
      id: String(h.id || '').slice(0, 64),
      page: Math.floor(h.page),
      color: HIGHLIGHT_COLORS.includes(h.color) ? h.color : 'yellow',
      text: String(h.text || '').slice(0, 600),
      createdAt: typeof h.createdAt === 'string' ? h.createdAt.slice(0, 40) : '',
      rects: h.rects
        .filter((r) => r && Number.isFinite(Number(r.l)) && Number.isFinite(Number(r.t)) && r.w > 0 && r.h > 0)
        .slice(0, 120)
        .map((r) => ({ l: roundPct(r.l), t: roundPct(r.t), w: roundPct(r.w), h: roundPct(r.h) })),
    }))
    .filter((h) => h.id && h.rects.length > 0);
}

function paintUserHighlightsOnPage(idx) {
  const node = state.pageNodes[idx];
  if (!node) return;
  const layer = node.querySelector('.fb-user-highlights');
  if (!layer) return;
  layer.innerHTML = '';
  const pageNum = idx + 1;
  for (const hl of state.highlights) {
    if (hl.page !== pageNum) continue;
    const color = HIGHLIGHT_COLORS.includes(hl.color) ? hl.color : 'yellow';
    for (const r of hl.rects) {
      const box = document.createElement('div');
      box.className = `fb-hl-box color-${color}`;
      box.dataset.hlId = hl.id;
      box.style.left = `${r.l}%`;
      box.style.top = `${r.t}%`;
      box.style.width = `${r.w}%`;
      box.style.height = `${r.h}%`;
      layer.appendChild(box);
    }
  }
}

function repaintRenderedHighlights() {
  const idxs = new Set([...state.renderedMap.keys(), ...getVisibleIndices()]);
  for (const idx of idxs) {
    paintUserHighlightsOnPage(idx);
  }
}

function getFilteredSortedHighlights() {
  const visiblePages = new Set(getVisibleIndices().map((i) => i + 1));
  let list = state.highlights;
  if (state.hlFilterMode === 'current') {
    list = state.highlights.filter((h) => visiblePages.has(h.page));
  } else if (state.hlFilterMode === 'page' && Number.isInteger(state.hlFilterPage) && state.hlFilterPage >= 1) {
    list = state.highlights.filter((h) => h.page === state.hlFilterPage);
  }
  return [...list].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const dt = (a.rects[0]?.t ?? 0) - (b.rects[0]?.t ?? 0);
    if (Math.abs(dt) > 0.35) return dt;
    return (a.rects[0]?.l ?? 0) - (b.rects[0]?.l ?? 0);
  });
}

function formatHighlightsAsNotesText(list) {
  if (!list.length) return '';
  const groups = new Map();
  for (const hl of list) {
    if (!groups.has(hl.page)) groups.set(hl.page, []);
    groups.get(hl.page).push(hl);
  }
  const sections = [];
  for (const [pageNum, items] of groups.entries()) {
    const lines = items.map((hl) => `- ${hl.text || '(Highlighted region)'}`);
    sections.push(`Page ${pageNum}\n${lines.join('\n')}`);
  }
  return sections.join('\n\n');
}

function removeHighlightById(id) {
  const target = state.highlights.find((h) => h.id === id);
  if (!target) return;
  state.highlights = state.highlights.filter((x) => x.id !== id);
  if (state.activeHlDraft?.mode === 'edit' && state.activeHlDraft.id === id) {
    hideHighlightPopover();
  }
  paintUserHighlightsOnPage(target.page - 1);
  updateHighlightsUi();
  schedulePersistState();
}

function updateHighlightsUi() {
  if (els.valPageNotesCount) {
    els.valPageNotesCount.textContent = String(state.highlights.length);
  }
  if (!els.highlightsList || !els.highlightsSummary) return;

  const totalCount = state.highlights.length;
  const filtered = getFilteredSortedHighlights();
  const visiblePages = getVisibleIndices().map((i) => i + 1);
  const perPageCounts = new Map();
  for (const hl of state.highlights) {
    perPageCounts.set(hl.page, (perPageCounts.get(hl.page) || 0) + 1);
  }

  if (state.hlFilterMode === 'page' && state.hlFilterPage) {
    els.highlightsSummary.textContent = `Page ${state.hlFilterPage}: ${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`;
  } else if (state.hlFilterMode === 'current') {
    const lbl = visiblePages.length === 2 ? `Pages ${visiblePages[0]}-${visiblePages[1]}` : `Page ${visiblePages[0] || 1}`;
    els.highlightsSummary.textContent = `${lbl}: ${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`;
  } else {
    els.highlightsSummary.textContent = totalCount === 1 ? '1 highlight' : `${totalCount} highlights`;
  }

  els.btnClearHighlights.hidden = totalCount === 0;
  if (els.btnClearPageHighlights) {
    els.btnClearPageHighlights.hidden = !(state.hlFilterMode !== 'all' && filtered.length > 0);
  }
  if (els.btnCopyPageNotes) els.btnCopyPageNotes.hidden = filtered.length === 0;
  if (els.btnToggleNotesView) {
    els.btnToggleNotesView.classList.toggle('active', !!state.hlNotesView);
    els.btnToggleNotesView.textContent = state.hlNotesView ? 'List View' : 'Notes View';
  }
  if (els.btnHighlightsTop) {
    const spreadHasHl = visiblePages.some((p) => perPageCounts.has(p));
    els.btnHighlightsTop.classList.toggle('has-hl', spreadHasHl);
    els.btnHighlightsTop.classList.toggle('active', !els.sideDrawer.hidden);
  }

  // Compact filter chips (All / This Page) + dropdown select for specific highlighted pages
  if (els.hlPageChips) {
    els.hlPageChips.innerHTML = '';
    const addChip = (label, active, onClick) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hl-page-chip${active ? ' active' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      els.hlPageChips.appendChild(btn);
    };

    addChip(`All (${totalCount})`, state.hlFilterMode === 'all', () => {
      state.hlFilterMode = 'all';
      state.hlFilterPage = null;
      updateHighlightsUi();
    });
    addChip('This Page', state.hlFilterMode === 'current', () => {
      state.hlFilterMode = 'current';
      state.hlFilterPage = null;
      updateHighlightsUi();
    });
  }

  if (els.hlPageSelect) {
    const pages = Array.from(perPageCounts.keys()).sort((a, b) => a - b);
    els.hlPageSelect.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = pages.length ? `Filter by page (${pages.length})` : 'No pages highlighted';
    els.hlPageSelect.appendChild(defaultOpt);

    for (const p of pages) {
      const n = perPageCounts.get(p);
      const opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = `Page ${p} (${n} ${n === 1 ? 'note' : 'notes'})`;
      els.hlPageSelect.appendChild(opt);
    }
    els.hlPageSelect.value = state.hlFilterMode === 'page' && state.hlFilterPage && perPageCounts.has(state.hlFilterPage)
      ? String(state.hlFilterPage)
      : '';
    els.hlPageSelect.disabled = pages.length === 0;
  }

  els.highlightsList.hidden = !!state.hlNotesView;
  if (els.hlNotesSheet) els.hlNotesSheet.hidden = !state.hlNotesView;

  if (!filtered.length) {
    const emptyMsg = totalCount === 0
      ? 'Select any text on a PDF page and pick a color to highlight it.'
      : 'No highlights on the selected page yet.';
    els.highlightsList.innerHTML = `<div class="search-status">${emptyMsg}</div>`;
    if (els.hlNotesSheet) els.hlNotesSheet.innerHTML = `<div class="search-status">${emptyMsg}</div>`;
    return;
  }

  if (!state.hlNotesView) {
    els.highlightsList.innerHTML = '';
    for (const hl of filtered) {
      const color = HIGHLIGHT_COLORS.includes(hl.color) ? hl.color : 'yellow';
      const row = document.createElement('div');
      row.className = 'hl-item';
      row.dataset.hlId = hl.id;
      row.innerHTML = `
        <span class="hl-item-dot color-${color}"></span>
        <div class="hl-item-body">
          <div class="hl-item-meta">Page ${hl.page}</div>
          <div class="hl-item-snippet">${escapeHtml(hl.text || '(Highlighted region)')}</div>
        </div>
        <button class="drawer-close hl-row-del" title="Delete highlight" aria-label="Delete highlight">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      `;
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) {
          removeHighlightById(hl.id);
          return;
        }
        jumpToPage(hl.page, false);
      });
      els.highlightsList.appendChild(row);
    }
    return;
  }

  // Consolidated reading-order Page Notes view
  if (els.hlNotesSheet) {
    els.hlNotesSheet.innerHTML = '';
    const groups = new Map();
    for (const hl of filtered) {
      if (!groups.has(hl.page)) groups.set(hl.page, []);
      groups.get(hl.page).push(hl);
    }
    for (const [pageNum, items] of groups.entries()) {
      const card = document.createElement('section');
      card.className = 'hl-notes-group';

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'hl-notes-group-head';
      head.innerHTML = `<span>Page ${pageNum} Notes</span><span class="toc-page">${items.length} ${items.length === 1 ? 'note' : 'notes'}</span>`;
      head.addEventListener('click', () => jumpToPage(pageNum, false));
      card.appendChild(head);

      const listEl = document.createElement('div');
      listEl.className = 'hl-notes-entries';
      for (const hl of items) {
        const color = HIGHLIGHT_COLORS.includes(hl.color) ? hl.color : 'yellow';
        const entry = document.createElement('div');
        entry.className = `hl-note-entry color-${color}`;
        entry.innerHTML = `
          <div class="hl-note-text">${escapeHtml(hl.text || '(Highlighted region)')}</div>
          <button class="drawer-close hl-row-del hl-note-del" title="Delete highlight" aria-label="Delete highlight">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        `;
        entry.querySelector('.hl-note-del')?.addEventListener('click', () => removeHighlightById(hl.id));
        listEl.appendChild(entry);
      }
      card.appendChild(listEl);
      els.hlNotesSheet.appendChild(card);
    }
  }
}

function mergeSelectionLineRects(clientRects, pageRect) {
  const valid = [];
  for (const r of clientRects) {
    if (!r || r.width < 1.5 || r.height < 2 || r.height > pageRect.height * 0.35) continue;
    const left = Math.max(r.left, pageRect.left);
    const right = Math.min(r.right, pageRect.right);
    const top = Math.max(r.top, pageRect.top);
    const bottom = Math.min(r.bottom, pageRect.bottom);
    if (right - left < 1.5 || bottom - top < 2) continue;
    valid.push({ left, top, right, bottom, height: bottom - top });
  }
  if (!valid.length) return [];

  valid.sort((a, b) => {
    const cyA = (a.top + a.bottom) / 2;
    const cyB = (b.top + b.bottom) / 2;
    if (Math.abs(cyA - cyB) > Math.min(a.height, b.height) * 0.5) return cyA - cyB;
    return a.left - b.left;
  });

  const merged = [];
  for (const cur of valid) {
    const prev = merged[merged.length - 1];
    if (prev) {
      const cyPrev = (prev.top + prev.bottom) / 2;
      const cyCur = (cur.top + cur.bottom) / 2;
      const maxH = Math.max(prev.bottom - prev.top, cur.height);
      const sameLine = Math.abs(cyPrev - cyCur) <= maxH * 0.55;
      const closeHoriz = cur.left <= prev.right + maxH * 0.9 && cur.right >= prev.left - maxH * 0.5;
      if (sameLine && closeHoriz) {
        prev.left = Math.min(prev.left, cur.left);
        prev.right = Math.max(prev.right, cur.right);
        prev.top = Math.min(prev.top, cur.top);
        prev.bottom = Math.max(prev.bottom, cur.bottom);
        continue;
      }
    }
    merged.push({ ...cur });
  }

  const pct = (v, total) => Math.max(0, Math.min(100, Math.round((v / total) * 100000) / 1000));
  return merged.map((b) => ({
    l: pct(b.left - pageRect.left, pageRect.width),
    t: pct(b.top - pageRect.top, pageRect.height),
    w: pct(b.right - b.left, pageRect.width),
    h: pct(b.bottom - b.top, pageRect.height),
  })).filter((b) => b.w > 0 && b.h > 0);
}

function extractSelectionHighlightDraft() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const range = sel.getRangeAt(0);
  const startEl = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  const endEl = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
  if (!startEl?.closest('.fb-page .textLayer') || !endEl?.closest('.fb-page .textLayer')) {
    return null;
  }

  const candidateIndices = new Set(getVisibleIndices());
  const startPageIdx = Number(startEl.closest('.fb-page')?.dataset.pageIndex);
  const endPageIdx = Number(endEl.closest('.fb-page')?.dataset.pageIndex);
  if (Number.isInteger(startPageIdx) && Number.isInteger(endPageIdx)) {
    const lo = clamp(Math.min(startPageIdx, endPageIdx), 0, Math.max(0, state.totalPages - 1));
    const hi = clamp(Math.max(startPageIdx, endPageIdx), 0, Math.max(0, state.totalPages - 1));
    for (let idx = lo; idx <= hi; idx++) candidateIndices.add(idx);
  }
  const pageEntries = [];
  for (const idx of candidateIndices) {
    const node = state.pageNodes[idx];
    if (!node) continue;
    const pageRect = node.getBoundingClientRect();
    if (!pageRect.width || !pageRect.height) continue;
    pageEntries.push({ idx, pageRect, rawRects: [] });
  }
  if (!pageEntries.length) return null;

  const allClientRects = Array.from(range.getClientRects());
  for (const r of allClientRects) {
    if (!r.width || !r.height) continue;
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    for (const p of pageEntries) {
      if (cx >= p.pageRect.left && cx <= p.pageRect.right && cy >= p.pageRect.top && cy <= p.pageRect.bottom) {
        p.rawRects.push(r);
        break;
      }
    }
  }

  const entries = [];
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;

  for (const p of pageEntries) {
    if (!p.rawRects.length) continue;
    const rects = mergeSelectionLineRects(p.rawRects, p.pageRect);
    if (!rects.length) continue;
    entries.push({ page: p.idx + 1, text, rects });
    for (const r of p.rawRects) {
      if (r.left < minL) minL = r.left;
      if (r.top < minT) minT = r.top;
      if (r.right > maxR) maxR = r.right;
      if (r.bottom > maxB) maxB = r.bottom;
    }
  }

  if (!entries.length || !Number.isFinite(minL)) return null;
  return {
    entries,
    anchorRect: {
      left: minL,
      top: minT,
      right: maxR,
      bottom: maxB,
      width: maxR - minL,
      height: maxB - minT,
    },
  };
}

function hideHighlightPopover() {
  if (!els.hlPopover) return;
  els.hlPopover.hidden = true;
  state.activeHlDraft = null;
}

function findOverlappingHighlightIds(entries) {
  if (!Array.isArray(entries) || !entries.length) return [];
  const ids = new Set();
  for (const ent of entries) {
    for (const hl of state.highlights) {
      if (hl.page !== ent.page) continue;
      for (const er of ent.rects) {
        const overlaps = hl.rects.some((hr) =>
          er.l < hr.l + hr.w && er.l + er.w > hr.l &&
          er.t < hr.t + hr.h && er.t + er.h > hr.t
        );
        if (overlaps) {
          ids.add(hl.id);
          break;
        }
      }
    }
  }
  return Array.from(ids);
}

function showHighlightPopover(anchorRect, draft) {
  if (!els.hlPopover || !anchorRect) return;
  const isEdit = draft.mode === 'edit';
  const overlapIds = !isEdit && Array.isArray(draft.entries) ? findOverlappingHighlightIds(draft.entries) : [];
  state.activeHlDraft = isEdit ? draft : { ...draft, overlapIds };
  const canDelete = isEdit || overlapIds.length > 0;
  els.hlPopoverDivider.hidden = !canDelete;
  els.btnHlDelete.hidden = !canDelete;

  els.hlPopover.querySelectorAll('.hl-swatch').forEach((btn) => {
    btn.classList.toggle('active', isEdit && btn.dataset.color === draft.color);
  });

  els.hlPopover.style.left = '-9999px';
  els.hlPopover.style.top = '-9999px';
  els.hlPopover.hidden = false;

  const popRect = els.hlPopover.getBoundingClientRect();
  const margin = 10;
  let left = anchorRect.left + anchorRect.width / 2 - popRect.width / 2;
  left = clamp(left, margin, Math.max(margin, window.innerWidth - popRect.width - margin));

  let top = anchorRect.top - popRect.height - 10;
  if (top < 48) {
    top = anchorRect.bottom + 10;
  }
  top = clamp(top, 48, Math.max(48, window.innerHeight - popRect.height - 62));

  els.hlPopover.style.left = `${Math.round(left)}px`;
  els.hlPopover.style.top = `${Math.round(top)}px`;
}

function applyHighlightColor(color) {
  const safeColor = HIGHLIGHT_COLORS.includes(color) ? color : 'yellow';
  const draft = state.activeHlDraft;
  if (!draft) return;

  if (draft.mode === 'edit') {
    const target = state.highlights.find((h) => h.id === draft.id);
    if (target) {
      target.color = safeColor;
      paintUserHighlightsOnPage(target.page - 1);
    }
  } else if (draft.mode === 'create' && Array.isArray(draft.entries)) {
    const now = new Date().toISOString();
    for (const ent of draft.entries) {
      const id = `hl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      state.highlights.push({
        id,
        page: ent.page,
        color: safeColor,
        text: ent.text,
        rects: ent.rects,
        createdAt: now,
      });
      paintUserHighlightsOnPage(ent.page - 1);
    }
    try {
      window.getSelection()?.removeAllRanges?.();
    } catch {}
  }

  updateHighlightsUi();
  schedulePersistState();
  hideHighlightPopover();
}

function deleteActiveHighlight() {
  const draft = state.activeHlDraft;
  if (!draft) return;
  const idsToDelete = draft.mode === 'edit'
    ? [draft.id]
    : Array.isArray(draft.overlapIds)
      ? draft.overlapIds
      : [];
  if (!idsToDelete.length) return;
  const delSet = new Set(idsToDelete);
  const affectedPages = new Set(state.highlights.filter((h) => delSet.has(h.id)).map((h) => h.page - 1));
  state.highlights = state.highlights.filter((h) => !delSet.has(h.id));
  for (const idx of affectedPages) {
    paintUserHighlightsOnPage(idx);
  }
  try {
    window.getSelection()?.removeAllRanges?.();
  } catch {}
  updateHighlightsUi();
  schedulePersistState();
  hideHighlightPopover();
}

function findHighlightAtClientPoint(pageNode, clientX, clientY) {
  if (!pageNode) return null;
  const pageIdx = Number(pageNode.dataset.pageIndex);
  if (!Number.isFinite(pageIdx)) return null;
  const pageNum = pageIdx + 1;
  const pageRect = pageNode.getBoundingClientRect();
  if (!pageRect.width || !pageRect.height) return null;

  const px = ((clientX - pageRect.left) / pageRect.width) * 100;
  const py = ((clientY - pageRect.top) / pageRect.height) * 100;

  for (let i = state.highlights.length - 1; i >= 0; i--) {
    const hl = state.highlights[i];
    if (hl.page !== pageNum) continue;
    for (const r of hl.rects) {
      if (px >= r.l - 0.4 && px <= r.l + r.w + 0.4 && py >= r.t - 0.5 && py <= r.t + r.h + 0.5) {
        return {
          hl,
          anchorRect: {
            left: pageRect.left + (r.l / 100) * pageRect.width,
            top: pageRect.top + (r.t / 100) * pageRect.height,
            width: (r.w / 100) * pageRect.width,
            height: (r.h / 100) * pageRect.height,
            right: pageRect.left + ((r.l + r.w) / 100) * pageRect.width,
            bottom: pageRect.top + ((r.t + r.h) / 100) * pageRect.height,
          },
        };
      }
    }
  }
  return null;
}

/* ---------- Opening Books ---------- */
async function openPdfSource(source, { title = 'Book', bookId = null, startPage = 1, bookmarks = [], highlights = [] } = {}) {
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
    state.highlights = normalizeHighlightsList(highlights);

    // Recover saved local progress if missing from server entry
    let targetPage = startPage;
    if (bookId) {
      try {
        const local = JSON.parse(localStorage.getItem(`flipbook:${bookId}`) || 'null');
        if (!targetPage && local?.lastPage) targetPage = local.lastPage;
        if (Array.isArray(local?.bookmarks) && !state.bookmarks.length) state.bookmarks = local.bookmarks;
        if (Array.isArray(local?.highlights) && !state.highlights.length) {
          state.highlights = normalizeHighlightsList(local.highlights);
        }
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
    initReaderView(startIdx);
    buildOutline();
    if (!els.thumbnailsStrip.hidden) buildThumbnailsStrip();
    updateBookmarkUi();
    updateHighlightsUi();
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
    highlights: book.highlights || [],
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
        highlights: data.highlights || [],
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

/* ---------- Toolbar Auto-Hide ---------- */
const HEADER_WAKE_PX = 56;
const FOOTER_WAKE_PX = 60;

function isBarInputFocused(barEl) {
  const active = document.activeElement;
  if (!active || !barEl?.contains(active)) return false;
  return active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA';
}

function shouldKeepBarVisible(zone) {
  if (!state.pdfDoc || !state.autoHideBars) return true;
  if (!els.libraryModal.hidden) return false;
  const p = state.lastBarPointer;
  if (zone === 'header') {
    if (isBarInputFocused(els.topBar)) return true;
    if (els.topBar?.matches(':hover')) return true;
    return Boolean(p && p.clientY <= HEADER_WAKE_PX);
  }
  if (!els.moreMenu.hidden || !els.thumbnailsStrip.hidden) return true;
  if (isBarInputFocused(els.bottomBar)) return true;
  if (els.bottomBar?.matches(':hover') || els.autoPlaybackHud?.matches(':hover')) return true;
  return Boolean(p && p.clientY >= window.innerHeight - FOOTER_WAKE_PX);
}

function showBar(zone, scheduleAutoHide = true, delayMs = 2200) {
  const cls = zone === 'header' ? 'header-hidden' : 'footer-hidden';
  const timerKey = zone === 'header' ? 'headerHideTimer' : 'footerHideTimer';
  document.body.classList.remove(cls);
  clearTimeout(state[timerKey]);
  state[timerKey] = null;
  if (scheduleAutoHide) {
    scheduleHideBar(zone, delayMs);
  }
}

function hideBar(zone) {
  const cls = zone === 'header' ? 'header-hidden' : 'footer-hidden';
  const timerKey = zone === 'header' ? 'headerHideTimer' : 'footerHideTimer';
  clearTimeout(state[timerKey]);
  state[timerKey] = null;
  if (shouldKeepBarVisible(zone)) {
    scheduleHideBar(zone, 420);
    return;
  }
  document.body.classList.add(cls);
}

function scheduleHideBar(zone, delayMs = 420) {
  const cls = zone === 'header' ? 'header-hidden' : 'footer-hidden';
  const timerKey = zone === 'header' ? 'headerHideTimer' : 'footerHideTimer';
  clearTimeout(state[timerKey]);
  state[timerKey] = null;
  if (shouldKeepBarVisible(zone)) {
    document.body.classList.remove(cls);
    return;
  }
  state[timerKey] = setTimeout(() => hideBar(zone), delayMs);
}

function showBars(scheduleAutoHide = true, delayMs = 1800) {
  showBar('header', scheduleAutoHide, delayMs);
  showBar('footer', scheduleAutoHide, delayMs);
}

/* ---------- UI Modes & Theme ---------- */
function setTheme(theme, persist = true) {
  state.theme = theme;
  document.body.classList.remove('theme-charcoal', 'theme-slate', 'theme-obsidian', 'theme-warm');
  document.body.classList.add(`theme-${theme}`);
  document.querySelectorAll('.theme-dot').forEach((d) => {
    d.classList.toggle('active', d.dataset.theme === theme);
  });
  if (persist) schedulePersistState();
}

function setReadDark(enabled, persist = true) {
  state.readDark = !!enabled;
  document.body.classList.toggle('read-dark', state.readDark);
  if (els.btnDarkRead) {
    els.btnDarkRead.classList.toggle('active', state.readDark);
  }
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

function formatFlipSeconds(sec) {
  const rounded = Math.round(clamp(Number(sec) || 4, 0.5, 300) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
}

function formatScrollSpeed(speed) {
  const rounded = Math.round(clamp(Number(speed) || 1, 0.2, 5) * 10) / 10;
  return `${rounded.toFixed(1)}×`;
}

function stepFlipInterval(currentSec, dir) {
  const cur = clamp(Number(currentSec) || 4, 0.5, 300);
  const step = cur < 10 || (cur === 10 && dir < 0) ? 0.5 : cur < 30 || (cur === 30 && dir < 0) ? 1 : 5;
  return clamp(Math.round((cur + dir * step) * 10) / 10, 0.5, 300);
}

function stepScrollSpeed(currentSpeed, dir) {
  const cur = clamp(Number(currentSpeed) || 1, 0.2, 5);
  return clamp(Math.round((cur + dir * 0.2) * 10) / 10, 0.2, 5);
}

function updatePlaybackUi() {
  const isScroll = state.scrollMode === 'scroll';
  const secLabel = formatFlipSeconds(state.autoFlipSeconds);
  const spdLabel = formatScrollSpeed(state.autoScrollSpeed);

  if (els.menuAutoFlipGroup) els.menuAutoFlipGroup.hidden = isScroll;
  if (els.menuAutoScrollGroup) els.menuAutoScrollGroup.hidden = !isScroll;

  if (els.valAutoFlip) {
    els.valAutoFlip.textContent = !state.autoFlipEnabled
      ? `Off • ${secLabel}`
      : state.autoFlipPaused
        ? `Paused • ${secLabel}`
        : `On • ${secLabel}`;
  }
  if (els.autoFlipRange) {
    els.autoFlipRange.value = String(clamp(state.autoFlipSeconds, 0.5, 30));
  }
  if (els.autoFlipInput && document.activeElement !== els.autoFlipInput) {
    els.autoFlipInput.value = Number.isInteger(state.autoFlipSeconds)
      ? String(state.autoFlipSeconds)
      : state.autoFlipSeconds.toFixed(1);
  }
  if (els.autoFlipPresets) {
    els.autoFlipPresets.querySelectorAll('.auto-pill').forEach((btn) => {
      btn.classList.toggle('active', Math.abs(Number(btn.dataset.sec) - state.autoFlipSeconds) < 0.05);
    });
  }

  if (els.valAutoScroll) {
    els.valAutoScroll.textContent = state.autoScrollPlaying
      ? `Playing • ${spdLabel}`
      : `Paused • ${spdLabel}`;
  }
  if (els.autoScrollRange) {
    els.autoScrollRange.value = String(clamp(state.autoScrollSpeed, 0.2, 5));
  }
  if (els.autoScrollInput && document.activeElement !== els.autoScrollInput) {
    els.autoScrollInput.value = state.autoScrollSpeed.toFixed(1);
  }
  if (els.autoScrollPresets) {
    els.autoScrollPresets.querySelectorAll('.auto-pill').forEach((btn) => {
      btn.classList.toggle('active', Math.abs(Number(btn.dataset.speed) - state.autoScrollSpeed) < 0.05);
    });
  }

  if (els.autoPlaybackHud) {
    const showHud = Boolean(state.pdfDoc && (isScroll || state.autoFlipEnabled));
    els.autoPlaybackHud.hidden = !showHud;
    if (showHud) {
      const playing = isScroll ? state.autoScrollPlaying : (state.autoFlipEnabled && !state.autoFlipPaused);
      if (els.iconHudPlay) els.iconHudPlay.hidden = playing;
      if (els.iconHudPause) els.iconHudPause.hidden = !playing;
      if (els.btnHudPlayPause) {
        els.btnHudPlayPause.title = isScroll
          ? (playing ? 'Pause Auto-Scroll (Space)' : 'Resume Auto-Scroll (Space)')
          : (playing ? 'Pause Auto-Flip' : 'Resume Auto-Flip');
      }
      if (els.hudModeLabel) els.hudModeLabel.textContent = isScroll ? 'Auto-Scroll' : 'Auto-Flip';
      if (els.hudRange) {
        if (isScroll) {
          els.hudRange.min = '0.2';
          els.hudRange.max = '5';
          els.hudRange.step = '0.1';
          els.hudRange.value = String(clamp(state.autoScrollSpeed, 0.2, 5));
        } else {
          els.hudRange.min = '0.5';
          els.hudRange.max = '30';
          els.hudRange.step = '0.5';
          els.hudRange.value = String(clamp(state.autoFlipSeconds, 0.5, 30));
        }
      }
      if (els.hudReadout) els.hudReadout.textContent = isScroll ? spdLabel : secLabel;
      if (els.btnHudStop) {
        els.btnHudStop.title = isScroll ? 'Back to Book Flip' : 'Stop Auto-Flip';
        els.btnHudStop.setAttribute('aria-label', els.btnHudStop.title);
      }
    }
  }
}

function updateMenuValues() {
  if (els.valScrollMode) {
    els.valScrollMode.textContent = state.scrollMode === 'scroll' ? 'Smooth Auto-Scroll' : 'Book Flip';
  }
  els.valPageMode.textContent = state.pageMode === 'single' ? 'Single' : state.pageMode === 'double' ? 'Double' : 'Auto (Double)';
  els.valHardCover.textContent = state.showCover ? 'On' : 'Off';
  els.valClickMode.textContent = state.clickMode === 'smart' ? 'Corner + Select' : 'Click Anywhere';
  if (els.valAutoHideBars) {
    els.valAutoHideBars.textContent = state.autoHideBars ? 'On' : 'Off';
  }
  updatePlaybackUi();
}

function setAutoFlipSeconds(seconds, { persist = true, reschedule = true, syncInputText = true } = {}) {
  const num = Number(seconds);
  if (!Number.isFinite(num)) return;
  state.autoFlipSeconds = clamp(Math.round(num * 10) / 10, 0.5, 300);
  if (syncInputText && els.autoFlipInput) {
    els.autoFlipInput.value = Number.isInteger(state.autoFlipSeconds)
      ? String(state.autoFlipSeconds)
      : state.autoFlipSeconds.toFixed(1);
  }
  updatePlaybackUi();
  if (reschedule && state.autoFlipEnabled && !state.autoFlipPaused) {
    scheduleAutoFlipTick(true);
  }
  if (persist) schedulePersistState();
}

function scheduleAutoFlipTick(preserveElapsed = false) {
  if (state.autoFlipTimer) {
    clearTimeout(state.autoFlipTimer);
    state.autoFlipTimer = null;
  }
  if (!state.autoFlipEnabled || state.autoFlipPaused || state.scrollMode !== 'flip') return;
  const delayMs = Math.round(clamp(state.autoFlipSeconds, 0.5, 300) * 1000);
  const elapsed = preserveElapsed && state.autoFlipLastTickAt ? Math.max(0, performance.now() - state.autoFlipLastTickAt) : 0;
  const waitMs = Math.max(80, delayMs - elapsed);

  const arm = (ms) => {
    state.autoFlipTimer = setTimeout(() => {
      state.autoFlipTimer = null;
      if (!state.autoFlipEnabled || state.autoFlipPaused || state.scrollMode !== 'flip') return;
      if (!state.pageFlip || state.currentIndex >= state.totalPages - 1) {
        stopAutoFlip();
        return;
      }
      if (state.isFlipping || singleStackMeta.activeFlights > 0 || !els.libraryModal.hidden || !els.hlPopover.hidden) {
        arm(140);
        return;
      }
      state.autoFlipLastTickAt = performance.now();
      goNext();
      scheduleAutoFlipTick(false);
    }, ms);
  };
  arm(waitMs);
}

function stopAutoFlip() {
  const wasActive = state.autoFlipEnabled || Boolean(state.autoFlipTimer);
  if (state.autoFlipTimer) {
    clearTimeout(state.autoFlipTimer);
    state.autoFlipTimer = null;
  }
  state.autoFlipEnabled = false;
  state.autoFlipPaused = false;
  state.autoFlipLastTickAt = 0;
  if (wasActive) updatePlaybackUi();
}

function startAutoFlip() {
  if (!state.pdfDoc || state.scrollMode !== 'flip') return;
  if (!state.pageFlip || state.currentIndex >= state.totalPages - 1) {
    stopAutoFlip();
    return;
  }
  state.autoFlipEnabled = true;
  state.autoFlipPaused = false;
  state.autoFlipLastTickAt = performance.now();
  scheduleAutoFlipTick(false);
  updatePlaybackUi();
}

function toggleAutoFlipPause() {
  if (!state.autoFlipEnabled) {
    startAutoFlip();
    return;
  }
  state.autoFlipPaused = !state.autoFlipPaused;
  if (state.autoFlipPaused) {
    if (state.autoFlipTimer) {
      clearTimeout(state.autoFlipTimer);
      state.autoFlipTimer = null;
    }
  } else {
    state.autoFlipLastTickAt = performance.now();
    scheduleAutoFlipTick(false);
  }
  updatePlaybackUi();
}

function toggleAutoFlip() {
  if (state.autoFlipEnabled) {
    stopAutoFlip();
  } else {
    startAutoFlip();
  }
}

function setAutoScrollSpeed(speed, { persist = true, syncInputText = true } = {}) {
  const num = Number(speed);
  if (!Number.isFinite(num)) return;
  state.autoScrollSpeed = clamp(Math.round(num * 10) / 10, 0.2, 5);
  if (syncInputText && els.autoScrollInput) {
    els.autoScrollInput.value = state.autoScrollSpeed.toFixed(1);
  }
  updatePlaybackUi();
  if (persist) schedulePersistState();
}

function stopAutoScroll({ resetPlaying = false } = {}) {
  if (state.autoScrollRafId) {
    cancelAnimationFrame(state.autoScrollRafId);
    state.autoScrollRafId = 0;
  }
  state.autoScrollLastTs = 0;
  if (resetPlaying) {
    state.autoScrollPlaying = false;
  }
  updatePlaybackUi();
}

function startAutoScrollLoop() {
  if (state.scrollMode !== 'scroll' || !state.pdfDoc || !state.autoScrollPlaying) return;
  const sv = els.scrollViewport;
  const maxScrollStart = Math.max(0, sv.scrollHeight - sv.clientHeight);
  if (maxScrollStart > 0 && sv.scrollTop >= maxScrollStart - 2) {
    sv.scrollTop = 0;
  }
  state.autoScrollPosY = sv.scrollTop;
  if (state.autoScrollRafId) {
    updatePlaybackUi();
    return;
  }

  state.autoScrollLastTs = 0;
  const step = (now) => {
    if (state.scrollMode !== 'scroll' || !state.pdfDoc || !state.autoScrollPlaying) {
      state.autoScrollRafId = 0;
      updatePlaybackUi();
      return;
    }
    if (!state.autoScrollLastTs) state.autoScrollLastTs = now;
    const dt = Math.min(0.05, Math.max(0, (now - state.autoScrollLastTs) / 1000));
    state.autoScrollLastTs = now;

    if (now < state.autoScrollPauseUntil || state.scrollUserSelecting || !els.libraryModal.hidden || !els.hlPopover.hidden) {
      state.autoScrollPosY = sv.scrollTop;
      state.autoScrollRafId = requestAnimationFrame(step);
      return;
    }

    const maxScroll = Math.max(0, sv.scrollHeight - sv.clientHeight);
    if (Math.abs(sv.scrollTop - state.autoScrollPosY) > 3) {
      state.autoScrollPosY = sv.scrollTop;
    }
    if (maxScroll > 0) {
      const zoomFactor = 0.65 + 0.35 * clamp(state.zoom, 1, 3);
      const pxPerSec = clamp(state.autoScrollSpeed, 0.2, 5) * 48 * zoomFactor;
      state.autoScrollPosY = Math.min(maxScroll, state.autoScrollPosY + pxPerSec * dt);
      sv.scrollTop = state.autoScrollPosY;
      if (state.autoScrollPosY >= maxScroll - 0.5) {
        state.autoScrollPlaying = false;
        state.autoScrollRafId = 0;
        updatePlaybackUi();
        return;
      }
    }
    state.autoScrollRafId = requestAnimationFrame(step);
  };

  updatePlaybackUi();
  state.autoScrollRafId = requestAnimationFrame(step);
}

function setAutoScrollPlaying(playing) {
  if (state.scrollMode !== 'scroll' || !state.pdfDoc) return;
  state.autoScrollPlaying = !!playing;
  if (state.autoScrollPlaying) {
    startAutoScrollLoop();
  } else {
    stopAutoScroll({ resetPlaying: false });
  }
}

function toggleAutoScrollPlay() {
  setAutoScrollPlaying(!state.autoScrollPlaying);
}

function openDrawerTab(tabName) {
  els.sideDrawer.hidden = false;
  els.btnHighlightsTop?.classList.add('active');
  document.querySelectorAll('.drawer-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  document.querySelectorAll('.drawer-pane').forEach((p) => p.classList.remove('active'));
  const targetMap = {
    toc: 'paneToc',
    search: 'paneSearch',
    bookmarks: 'paneBookmarks',
    highlights: 'paneHighlights',
    text: 'paneText',
  };
  document.getElementById(targetMap[tabName])?.classList.add('active');
  if (tabName === 'search') {
    setTimeout(() => els.searchInput.focus(), 40);
  } else if (tabName === 'text') {
    refreshTextPane();
  } else if (tabName === 'bookmarks') {
    updateBookmarkUi();
  } else if (tabName === 'highlights') {
    updateHighlightsUi();
  }
}

function toggleFullscreen() {
  if (document.documentElement.classList.contains('mac-native-window') &&
      window.webkit?.messageHandlers?.flipbook) {
    window.webkit.messageHandlers.flipbook.postMessage({ action: 'toggleFullscreen' });
    return;
  }
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
  if (els.singleCollectedStack) {
    let scsDrag = null;
    els.singleCollectedStack.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || state.currentIndex <= 0 || state.isFlipping) return;
      e.preventDefault();
      scsDrag = { startX: e.clientX, startY: e.clientY, moved: false, liftRatio: 0 };
    });
    window.addEventListener('mousemove', (e) => {
      if (!scsDrag) return;
      const dx = e.clientX - scsDrag.startX;
      const dy = e.clientY - scsDrag.startY;
      if (Math.hypot(dx, dy) > 6) scsDrag.moved = true;
      if (!scsDrag.moved) return;
      scsDrag.liftRatio = clamp((Math.max(0, dx) * 0.78 + Math.max(0, dy) * 0.45) / 260, 0.04, 1);
      updateSingleDragPickup({
        active: true,
        side: 'left',
        fromIdx: state.currentIndex,
        toIdx: state.currentIndex - 1,
        liftRatio: scsDrag.liftRatio,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    });
    window.addEventListener('mouseup', (e) => {
      if (!scsDrag) return;
      const d = scsDrag;
      scsDrag = null;
      if (!d.moved) {
        goPrev();
        return;
      }
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if ((dx > 45 || dy > 45 || d.liftRatio > 0.25) && state.pageFlip?.flipPrevFromStackDrag) {
        state.pageFlip.flipPrevFromStackDrag(275);
      } else {
        updateSingleDragPickup({ active: false });
      }
    });
  }
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
    els.pageScrubber.blur();
  });
  els.pageScrubber.addEventListener('pointerup', () => {
    els.scrubberTooltip.hidden = true;
    els.pageScrubber.blur();
  });

  // Toolbar Buttons
  els.btnMore.addEventListener('click', (e) => {
    e.stopPropagation();
    els.moreMenu.hidden = !els.moreMenu.hidden;
    els.btnMore.classList.toggle('active', !els.moreMenu.hidden);
  });
  els.btnZoomOut.addEventListener('click', () => setZoom(state.zoom - 0.25, true));
  els.btnZoomInPill.addEventListener('click', () => setZoom(state.zoom + 0.25, true));
  els.btnZoomReset.addEventListener('click', () => setZoom(1, true));

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

  els.btnCloseDrawer.addEventListener('click', () => {
    els.sideDrawer.hidden = true;
    els.btnHighlightsTop?.classList.remove('active');
    updateHighlightsUi();
  });

  document.querySelectorAll('.drawer-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      openDrawerTab(tab.dataset.tab);
      updateHighlightsUi();
    });
  });

  els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch(els.searchInput.value);
  });

  els.btnDarkRead?.addEventListener('click', () => {
    setReadDark(!state.readDark, true);
  });
  els.btnHighlightsTop?.addEventListener('click', () => {
    if (!els.sideDrawer.hidden) {
      els.sideDrawer.hidden = true;
      els.btnHighlightsTop?.classList.remove('active');
      updateHighlightsUi();
    } else {
      const activeTab = document.querySelector('.drawer-tab.active')?.dataset.tab || 'highlights';
      openDrawerTab(activeTab);
    }
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
  els.menuPageNotes?.addEventListener('click', () => {
    els.moreMenu.hidden = true;
    els.btnMore.classList.remove('active');
    state.hlFilterMode = 'current';
    state.hlFilterPage = null;
    state.hlNotesView = true;
    openDrawerTab('highlights');
  });
  els.menuScrollMode?.addEventListener('click', () => {
    if (state.scrollMode === 'scroll') {
      stopAutoScroll({ resetPlaying: true });
      state.scrollMode = 'flip';
    } else {
      stopAutoFlip();
      state.scrollMode = 'scroll';
      state.autoScrollPlaying = true;
    }
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc) initReaderView(state.currentIndex);
  });
  els.menuPageMode.addEventListener('click', () => {
    state.pageMode = state.pageMode === 'auto' ? 'single' : state.pageMode === 'single' ? 'double' : 'auto';
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc) initReaderView(state.currentIndex);
  });
  els.menuHardCover.addEventListener('click', () => {
    state.showCover = !state.showCover;
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc) initReaderView(state.currentIndex);
  });
  els.menuClickMode.addEventListener('click', () => {
    state.clickMode = state.clickMode === 'smart' ? 'anywhere' : 'smart';
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc) initReaderView(state.currentIndex);
  });
  els.menuAutoFlip?.addEventListener('click', toggleAutoFlip);
  els.btnFlipTimeDec?.addEventListener('click', () => setAutoFlipSeconds(stepFlipInterval(state.autoFlipSeconds, -1)));
  els.btnFlipTimeInc?.addEventListener('click', () => setAutoFlipSeconds(stepFlipInterval(state.autoFlipSeconds, 1)));
  els.autoFlipRange?.addEventListener('input', () => setAutoFlipSeconds(els.autoFlipRange.value));
  els.autoFlipRange?.addEventListener('change', () => els.autoFlipRange.blur());
  els.autoFlipRange?.addEventListener('pointerup', () => els.autoFlipRange.blur());
  els.autoFlipInput?.addEventListener('input', () => {
    const v = Number(els.autoFlipInput.value);
    if (Number.isFinite(v) && v >= 0.5 && v <= 300) {
      setAutoFlipSeconds(v, { syncInputText: false });
    }
  });
  els.autoFlipInput?.addEventListener('change', () => setAutoFlipSeconds(els.autoFlipInput.value));
  els.autoFlipInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      setAutoFlipSeconds(els.autoFlipInput.value);
      els.autoFlipInput.blur();
    }
  });
  els.autoFlipPresets?.querySelectorAll('.auto-pill').forEach((btn) => {
    btn.addEventListener('click', () => setAutoFlipSeconds(Number(btn.dataset.sec)));
  });

  els.menuAutoScrollToggle?.addEventListener('click', toggleAutoScrollPlay);
  els.btnScrollSpeedDec?.addEventListener('click', () => setAutoScrollSpeed(stepScrollSpeed(state.autoScrollSpeed, -1)));
  els.btnScrollSpeedInc?.addEventListener('click', () => setAutoScrollSpeed(stepScrollSpeed(state.autoScrollSpeed, 1)));
  els.autoScrollRange?.addEventListener('input', () => setAutoScrollSpeed(els.autoScrollRange.value));
  els.autoScrollRange?.addEventListener('change', () => els.autoScrollRange.blur());
  els.autoScrollRange?.addEventListener('pointerup', () => els.autoScrollRange.blur());
  els.autoScrollInput?.addEventListener('input', () => {
    const v = Number(els.autoScrollInput.value);
    if (Number.isFinite(v) && v >= 0.2 && v <= 5) {
      setAutoScrollSpeed(v, { syncInputText: false });
    }
  });
  els.autoScrollInput?.addEventListener('change', () => setAutoScrollSpeed(els.autoScrollInput.value));
  els.autoScrollInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      setAutoScrollSpeed(els.autoScrollInput.value);
      els.autoScrollInput.blur();
    }
  });
  els.autoScrollPresets?.querySelectorAll('.auto-pill').forEach((btn) => {
    btn.addEventListener('click', () => setAutoScrollSpeed(Number(btn.dataset.speed)));
  });

  els.btnHudPlayPause?.addEventListener('click', () => {
    if (state.scrollMode === 'scroll') toggleAutoScrollPlay();
    else toggleAutoFlipPause();
    els.btnHudPlayPause.blur();
  });
  els.btnHudDec?.addEventListener('click', () => {
    if (state.scrollMode === 'scroll') setAutoScrollSpeed(stepScrollSpeed(state.autoScrollSpeed, -1));
    else setAutoFlipSeconds(stepFlipInterval(state.autoFlipSeconds, -1));
    els.btnHudDec.blur();
  });
  els.btnHudInc?.addEventListener('click', () => {
    if (state.scrollMode === 'scroll') setAutoScrollSpeed(stepScrollSpeed(state.autoScrollSpeed, 1));
    else setAutoFlipSeconds(stepFlipInterval(state.autoFlipSeconds, 1));
    els.btnHudInc.blur();
  });
  els.hudRange?.addEventListener('input', () => {
    if (state.scrollMode === 'scroll') setAutoScrollSpeed(els.hudRange.value);
    else setAutoFlipSeconds(els.hudRange.value);
  });
  els.hudRange?.addEventListener('change', () => els.hudRange.blur());
  els.hudRange?.addEventListener('pointerup', () => els.hudRange.blur());
  els.btnHudStop?.addEventListener('click', () => {
    if (state.scrollMode === 'scroll') {
      stopAutoScroll({ resetPlaying: true });
      state.scrollMode = 'flip';
      updateMenuValues();
      schedulePersistState();
      if (state.pdfDoc) initReaderView(state.currentIndex);
    } else {
      stopAutoFlip();
    }
    els.btnHudStop.blur();
  });
  els.menuAutoHideBars?.addEventListener('click', () => {
    state.autoHideBars = !state.autoHideBars;
    updateMenuValues();
    schedulePersistState();
    if (state.autoHideBars) {
      scheduleHideBar('header', 420);
      scheduleHideBar('footer', 420);
    } else {
      showBars(false);
    }
  });

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

  // Close popover when clicking outside, or edit existing highlight on click
  document.addEventListener('click', (e) => {
    if (!els.moreMenu.hidden && !e.target.closest('#moreMenu') && !e.target.closest('#btnMore')) {
      els.moreMenu.hidden = true;
      els.btnMore.classList.remove('active');
    }

    const sel = window.getSelection();
    const hasSelection = !!(sel && !sel.isCollapsed && sel.toString().trim());
    if (!e.target.closest('#hlPopover') && !hasSelection) {
      const wasPanDrag = state.panMoved;
      state.panMoved = false;
      const pageNode = !wasPanDrag && !state.pageFlip?.pointerMoved
        ? e.target.closest('.fb-page')
        : null;
      const hit = pageNode ? findHighlightAtClientPoint(pageNode, e.clientX, e.clientY) : null;
      if (hit) {
        showHighlightPopover(hit.anchorRect, {
          mode: 'edit',
          id: hit.hl.id,
          color: hit.hl.color,
        });
      } else {
        hideHighlightPopover();
      }
    } else {
      state.panMoved = false;
    }
  });

  // Floating highlight color picker & clear button
  els.hlPopover.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  els.hlPopover.addEventListener('click', (e) => {
    e.stopPropagation();
    const swatch = e.target.closest('.hl-swatch');
    if (swatch?.dataset.color) {
      applyHighlightColor(swatch.dataset.color);
      return;
    }
    if (e.target.closest('#btnHlDelete')) {
      deleteActiveHighlight();
    }
  });
  els.btnToggleNotesView?.addEventListener('click', () => {
    state.hlNotesView = !state.hlNotesView;
    updateHighlightsUi();
  });
  els.btnCopyPageNotes?.addEventListener('click', async () => {
    const txt = formatHighlightsAsNotesText(getFilteredSortedHighlights());
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      els.btnCopyPageNotes.textContent = 'Copied!';
      setTimeout(() => { els.btnCopyPageNotes.textContent = 'Copy'; }, 1200);
    } catch {}
  });
  els.hlPageSelect?.addEventListener('change', () => {
    const raw = els.hlPageSelect.value.trim();
    if (!raw) {
      state.hlFilterMode = 'all';
      state.hlFilterPage = null;
      updateHighlightsUi();
      return;
    }
    const p = parseInt(raw, 10);
    if (Number.isInteger(p) && p >= 1) {
      state.hlFilterMode = 'page';
      state.hlFilterPage = clamp(p, 1, Math.max(1, state.totalPages || p));
      jumpToPage(state.hlFilterPage, false);
      updateHighlightsUi();
    }
  });
  els.btnClearPageHighlights?.addEventListener('click', () => {
    const targets = new Set(getFilteredSortedHighlights().map((h) => h.id));
    if (!targets.size) return;
    state.highlights = state.highlights.filter((h) => !targets.has(h.id));
    hideHighlightPopover();
    repaintRenderedHighlights();
    updateHighlightsUi();
    schedulePersistState();
  });
  els.btnClearHighlights.addEventListener('click', () => {
    if (!state.highlights.length) return;
    state.highlights = [];
    hideHighlightPopover();
    repaintRenderedHighlights();
    updateHighlightsUi();
    schedulePersistState();
  });

  // Scroll tracking & on-demand buffering in Smooth Auto-Scroll mode
  els.scrollViewport.addEventListener('scroll', () => {
    if (state.scrollMode !== 'scroll' || !state.totalPages || !els.scrollPages.children.length) return;
    hideHighlightPopover();
    const sv = els.scrollViewport;
    const now = performance.now();
    if (!state.autoScrollRafId || now < state.autoScrollPauseUntil) {
      state.autoScrollPosY = sv.scrollTop;
    }
    const itemStride = Math.round(state.pageH * state.zoom) + 18;
    const centerOffset = sv.scrollTop + sv.clientHeight * 0.38 - 54;
    const estIdx = clamp(Math.floor(centerOffset / Math.max(40, itemStride)), 0, state.totalPages - 1);
    if (estIdx !== state.currentIndex) {
      state.currentIndex = estIdx;
      onSpreadChanged(true, 4);
    }
    if (now - (state.autoScrollRenderTickAt || 0) >= 180) {
      state.autoScrollRenderTickAt = now;
      queueNearbyRenders(state.currentIndex, 4);
    }
    clearTimeout(state.scrollSyncTimer);
    state.scrollSyncTimer = setTimeout(() => {
      queueNearbyRenders(state.currentIndex, 4);
    }, 90);
  }, { passive: true });
  els.scrollViewport.addEventListener('wheel', (e) => {
    if (state.scrollMode !== 'scroll' || e.ctrlKey || e.metaKey) return;
    state.autoScrollPauseUntil = performance.now() + (e.deltaY < 0 ? 750 : 320);
  }, { passive: true });
  els.scrollViewport.addEventListener('touchstart', () => {
    if (state.scrollMode !== 'scroll') return;
    state.autoScrollPauseUntil = performance.now() + 900;
  }, { passive: true });
  els.scrollViewport.addEventListener('mousedown', (e) => {
    if (state.scrollMode !== 'scroll') return;
    if (e.target === els.scrollViewport || e.target.closest('.textLayer')) {
      state.scrollUserSelecting = true;
    }
  });
  window.addEventListener('mouseup', () => {
    if (state.scrollUserSelecting) {
      state.scrollUserSelecting = false;
      state.autoScrollPauseUntil = performance.now() + 360;
    }
  });

  // Right-click any existing highlight on a page to recolor or delete it cleanly
  els.stage.addEventListener('contextmenu', (e) => {
    const pageNode = e.target.closest('.fb-page');
    const hit = pageNode ? findHighlightAtClientPoint(pageNode, e.clientX, e.clientY) : null;
    if (!hit) return;
    e.preventDefault();
    showHighlightPopover(hit.anchorRect, {
      mode: 'edit',
      id: hit.hl.id,
      color: hit.hl.color,
    });
  });

  // Independent edge-triggered auto-hide for header (top) & footer (bottom)
  window.addEventListener('mousemove', (e) => {
    state.lastBarPointer = { clientX: e.clientX, clientY: e.clientY };
    const inHeaderZone = e.clientY <= HEADER_WAKE_PX;
    const inFooterZone = e.clientY >= window.innerHeight - FOOTER_WAKE_PX;

    if (inHeaderZone || els.topBar?.matches(':hover')) {
      showBar('header', false);
    } else if (!state.headerHideTimer && !document.body.classList.contains('header-hidden')) {
      scheduleHideBar('header', 420);
    }

    if (inFooterZone || els.bottomBar?.matches(':hover') || els.autoPlaybackHud?.matches(':hover')) {
      showBar('footer', false);
    } else if (!state.footerHideTimer && !document.body.classList.contains('footer-hidden')) {
      scheduleHideBar('footer', 420);
    }
  }, { passive: true });
  window.addEventListener('touchstart', (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    const inHeaderZone = t.clientY <= HEADER_WAKE_PX;
    const inFooterZone = t.clientY >= window.innerHeight - FOOTER_WAKE_PX;
    if (inHeaderZone || inFooterZone) {
      state.lastBarPointer = { clientX: t.clientX, clientY: t.clientY };
      if (inHeaderZone) showBar('header', true, 2200);
      if (inFooterZone) showBar('footer', true, 2200);
    }
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    state.lastBarPointer = null;
    if (state.pdfDoc) {
      scheduleHideBar('header', 420);
      scheduleHideBar('footer', 420);
    }
  });
  els.topBar?.addEventListener('mouseenter', () => showBar('header', false));
  els.topBar?.addEventListener('mouseleave', () => scheduleHideBar('header', 420));
  els.topBar?.addEventListener('focusin', () => {
    if (isBarInputFocused(els.topBar)) showBar('header', false);
  });
  els.topBar?.addEventListener('focusout', () => scheduleHideBar('header', 420));

  [els.bottomBar, els.autoPlaybackHud].forEach((bar) => {
    if (!bar) return;
    bar.addEventListener('mouseenter', () => showBar('footer', false));
    bar.addEventListener('mouseleave', () => scheduleHideBar('footer', 420));
    bar.addEventListener('focusin', () => {
      if (isBarInputFocused(els.bottomBar)) showBar('footer', false);
    });
    bar.addEventListener('focusout', () => scheduleHideBar('footer', 420));
  });

  const overlayObserver = new MutationObserver(() => {
    if (shouldKeepBarVisible('header')) showBar('header', false);
    else scheduleHideBar('header', 420);
    if (shouldKeepBarVisible('footer')) showBar('footer', false);
    else scheduleHideBar('footer', 420);
  });
  [els.moreMenu, els.thumbnailsStrip, els.libraryModal]
    .filter(Boolean)
    .forEach((panel) => overlayObserver.observe(panel, { attributes: true, attributeFilter: ['hidden'] }));

  // Track pointer position inside stage so keyboard +/- zoom anchors at cursor
  els.stage.addEventListener('mousemove', (e) => {
    state.lastStagePointer = { clientX: e.clientX, clientY: e.clientY };
  });
  els.stage.addEventListener('mouseleave', () => {
    state.lastStagePointer = null;
  });

  // Smart Text Selection + Zoom Pan isolation inside bookContainer
  let isSelectingText = false;
  const isOuterEdgeClick = (clientX, clientY, onTextSpan) => {
    return !!state.pageFlip?.isPointInFlipZone?.(clientX, clientY, onTextSpan);
  };
  const guardPageFlipPointer = (e) => {
    if (state.zoom > 1.01) {
      return;
    }
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const nearText = isClientNearSelectableText(e.target, cx, cy);
    if (state.clickMode === 'smart' && nearText && !isOuterEdgeClick(cx, cy, true)) {
      // Allow clean text selection on words/inter-line gaps while outer edges/corners curl pages
      isSelectingText = true;
      e.stopPropagation();
    } else {
      isSelectingText = false;
    }
  };
  els.bookContainer.addEventListener('mousedown', guardPageFlipPointer, true);
  els.bookContainer.addEventListener('touchstart', guardPageFlipPointer, true);
  window.addEventListener('mousemove', (e) => {
    if (state.zoom <= 1.01 && isSelectingText) {
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

  // Panning when zoomed + double click to zoom anchored at cursor + text highlight selection trigger
  els.zoomViewport.addEventListener('dblclick', (e) => {
    if (!state.pdfDoc) return;
    if (e.target.closest('#hlPopover') || isClientNearSelectableText(e.target, e.clientX, e.clientY)) return;
    setZoom(state.zoom > 1.05 ? 1 : 1.75, true, { clientX: e.clientX, clientY: e.clientY });
  });

  let panDownPos = null;
  els.zoomViewport.addEventListener('mousedown', (e) => {
    if (state.zoom <= 1.01) return;
    if (e.button !== 0) return;
    if (e.target.closest('#hlPopover') || isClientNearSelectableText(e.target, e.clientX, e.clientY)) return;
    state.isPanning = true;
    state.panMoved = false;
    panDownPos = { x: e.clientX, y: e.clientY };
    state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    els.zoomViewport.classList.add('is-panning');
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.isPanning || !state.panStart) return;
    if (panDownPos && Math.hypot(e.clientX - panDownPos.x, e.clientY - panDownPos.y) > 4) {
      state.panMoved = true;
    }
    state.panX = e.clientX - state.panStart.x;
    state.panY = e.clientY - state.panStart.y;
    applyZoomTransform(false);
  });
  window.addEventListener('mouseup', (e) => {
    const panWasMoved = state.panMoved;
    if (state.isPanning) {
      state.isPanning = false;
      state.panStart = null;
      panDownPos = null;
      els.zoomViewport.classList.remove('is-panning');
    }
    if (!e.target?.closest?.('#hlPopover')) {
      setTimeout(() => {
        if (panWasMoved || state.isFlipping) return;
        const draft = extractSelectionHighlightDraft();
        if (draft) {
          showHighlightPopover(draft.anchorRect, { mode: 'create', entries: draft.entries });
        }
      }, 0);
    }
  });

  // Trackpad pinch / Ctrl+Wheel zoom anchored at cursor
  els.stage.addEventListener('wheel', (e) => {
    if (!state.pdfDoc) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (!e.deltaY) return;
      state.lastStagePointer = { clientX: e.clientX, clientY: e.clientY };
      const nextZoom = clamp(state.zoom * Math.exp(-e.deltaY * 0.003), 1, 3.5);
      setZoom(nextZoom, false, { clientX: e.clientX, clientY: e.clientY });
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
      case 'PageDown': {
        e.preventDefault();
        const now = performance.now();
        if (e.repeat && now - (state.lastKeyNavTime || 0) < 105) break;
        state.lastKeyNavTime = now;
        goNext();
        break;
      }
      case ' ': {
        e.preventDefault();
        if (state.scrollMode === 'scroll') {
          toggleAutoScrollPlay();
          break;
        }
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
      case 'd':
      case 'D':
        setReadDark(!state.readDark, true);
        showBar('header', true, 1400);
        break;
      case 'h':
      case 'H':
        els.btnHighlightsTop?.click();
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
        showBar('header', true, 1400);
        break;
      case 'l':
      case 'L':
        fetchLibrary();
        els.libraryModal.hidden = false;
        break;
      case '+':
      case '=':
        setZoom(state.zoom + 0.25, true, getStageZoomAnchor());
        showBar('header', true, 1400);
        break;
      case '-':
        setZoom(state.zoom - 0.25, true, getStageZoomAnchor());
        showBar('header', true, 1400);
        break;
      case '0':
        setZoom(1, true);
        showBar('header', true, 1400);
        break;
      case 'Escape':
        if (!els.hlPopover.hidden) hideHighlightPopover();
        else if (!els.moreMenu.hidden) els.moreMenu.hidden = true;
        else if (!els.libraryModal.hidden) els.libraryModal.hidden = true;
        else if (!els.sideDrawer.hidden) {
          els.sideDrawer.hidden = true;
          els.btnHighlightsTop?.classList.remove('active');
        }
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
      initReaderView(state.currentIndex);
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
