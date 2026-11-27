import * as pdfjsLib from '/vendor/pdfjs/build/pdf.min.mjs';
import { flipSound, ambientSound, DEFAULT_SOUND_PRESET, AMBIENT_PRESETS, normalizeAmbientPresetId } from '/assets/sound.js';
import { FlipBookEngine, bakeDarkCanvasInPlace, getBakedDarkCanvas } from '/assets/flip-engine.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/build/pdf.worker.min.mjs';

const MAX_CACHED_CANVASES = 32;
const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange'];
const STICKY_TAB_COLORS = ['coral', 'amber', 'mint', 'sky', 'violet'];
const PAPER_GRAIN_STYLES = ['cotton', 'linen', 'parchment', 'kraft'];
const PAPER_GRAIN_PRESETS = { fine: 110, medium: 160, coarse: 235 };

const els = {
  app: document.getElementById('app'),
  topBar: document.getElementById('topBar'),
  bottomBar: document.getElementById('bottomBar'),
  topBarRight: document.getElementById('topBarRight'),
  btnOpenTop: document.getElementById('btnOpenTop'),
  bookTitleLabel: document.getElementById('bookTitleLabel'),
  btnDarkRead: document.getElementById('btnDarkRead'),
  btnMagnifier: document.getElementById('btnMagnifier'),
  btnFocusCurtain: document.getElementById('btnFocusCurtain'),
  magnifierOverlay: document.getElementById('magnifierOverlay'),
  magControlsPill: document.getElementById('magControlsPill'),
  btnMagShapeCircle: document.getElementById('btnMagShapeCircle'),
  btnMagShapeBar: document.getElementById('btnMagShapeBar'),
  focusCurtainOverlay: document.getElementById('focusCurtainOverlay'),
  focusCurtainBookBox: document.getElementById('focusCurtainBookBox'),
  focusCurtainSvg: document.getElementById('focusCurtainSvg'),
  focusCurtainVeilPath: document.getElementById('focusCurtainVeilPath'),
  focusCurtainBand: document.getElementById('focusCurtainBand'),
  focusCurtainPill: document.getElementById('focusCurtainPill'),
  btnCurtain1L: document.getElementById('btnCurtain1L'),
  btnCurtain2L: document.getElementById('btnCurtain2L'),
  btnCurtain3L: document.getElementById('btnCurtain3L'),
  btnCurtain4L: document.getElementById('btnCurtain4L'),
  btnCurtainHeightDec: document.getElementById('btnCurtainHeightDec'),
  curtainHeightLabel: document.getElementById('curtainHeightLabel'),
  btnCurtainHeightInc: document.getElementById('btnCurtainHeightInc'),
  btnCurtainLengthDec: document.getElementById('btnCurtainLengthDec'),
  curtainLengthLabel: document.getElementById('curtainLengthLabel'),
  btnCurtainLengthInc: document.getElementById('btnCurtainLengthInc'),
  btnCurtainDimDec: document.getElementById('btnCurtainDimDec'),
  curtainDimLabel: document.getElementById('curtainDimLabel'),
  btnCurtainDimInc: document.getElementById('btnCurtainDimInc'),
  btnCurtainTone: document.getElementById('btnCurtainTone'),
  btnCurtainGuide: document.getElementById('btnCurtainGuide'),
  btnCurtainFollow: document.getElementById('btnCurtainFollow'),
  btnCurtainClose: document.getElementById('btnCurtainClose'),
  btnMagPowerDec: document.getElementById('btnMagPowerDec'),
  magPowerLabel: document.getElementById('magPowerLabel'),
  btnMagPowerInc: document.getElementById('btnMagPowerInc'),
  btnMagSizeDec: document.getElementById('btnMagSizeDec'),
  magSizeLabel: document.getElementById('magSizeLabel'),
  btnMagSizeInc: document.getElementById('btnMagSizeInc'),
  btnMagFollow: document.getElementById('btnMagFollow'),
  btnMagClose: document.getElementById('btnMagClose'),
  magLens: document.getElementById('magLens'),
  magGlassFrame: document.getElementById('magGlassFrame'),
  magCanvas: document.getElementById('magCanvas'),
  btnHighlightsTop: document.getElementById('btnHighlightsTop'),
  stickyTabPopover: document.getElementById('stickyTabPopover'),
  stickyTabPageTag: document.getElementById('stickyTabPageTag'),
  stickyTabSpreadPick: document.getElementById('stickyTabSpreadPick'),
  btnStickySideLeft: document.getElementById('btnStickySideLeft'),
  btnStickySideRight: document.getElementById('btnStickySideRight'),
  stickyTabLabelInput: document.getElementById('stickyTabLabelInput'),
  stickyQuickChips: document.getElementById('stickyQuickChips'),
  stickyColorSwatches: document.getElementById('stickyColorSwatches'),
  btnStickyTabRemove: document.getElementById('btnStickyTabRemove'),
  btnStickyTabSave: document.getElementById('btnStickyTabSave'),
  pageContextMenu: document.getElementById('pageContextMenu'),
  ctxPageHeading: document.getElementById('ctxPageHeading'),
  ctxMarginNote: document.getElementById('ctxMarginNote'),
  ctxPinPage: document.getElementById('ctxPinPage'),
  ctxPinPageLabel: document.getElementById('ctxPinPageLabel'),
  ctxSnipTool: document.getElementById('ctxSnipTool'),
  ctxStickyTab: document.getElementById('ctxStickyTab'),
  ctxStickyTabLabel: document.getElementById('ctxStickyTabLabel'),
  ctxStickyRemove: document.getElementById('ctxStickyRemove'),
  ctxBookmark: document.getElementById('ctxBookmark'),
  ctxBookmarkLabel: document.getElementById('ctxBookmarkLabel'),
  ctxSelDivider: document.getElementById('ctxSelDivider'),
  ctxLookUp: document.getElementById('ctxLookUp'),
  ctxLookUpLabel: document.getElementById('ctxLookUpLabel'),
  ctxTranslate: document.getElementById('ctxTranslate'),
  ctxTranslateLabel: document.getElementById('ctxTranslateLabel'),
  ctxCopyText: document.getElementById('ctxCopyText'),
  marginNoteHoverCard: document.getElementById('marginNoteHoverCard'),
  marginHoverColorDot: document.getElementById('marginHoverColorDot'),
  marginHoverTitle: document.getElementById('marginHoverTitle'),
  marginHoverText: document.getElementById('marginHoverText'),
  marginHoverThumb: document.getElementById('marginHoverThumb'),
  marginNotePopover: document.getElementById('marginNotePopover'),
  marginNotePageTag: document.getElementById('marginNotePageTag'),
  marginNoteTextInput: document.getElementById('marginNoteTextInput'),
  marginNoteSnipPreviewWrap: document.getElementById('marginNoteSnipPreviewWrap'),
  marginNoteSnipPreviewCanvas: document.getElementById('marginNoteSnipPreviewCanvas'),
  btnMarginNoteCopySnip: document.getElementById('btnMarginNoteCopySnip'),
  btnMarginNoteDetachSnip: document.getElementById('btnMarginNoteDetachSnip'),
  marginNoteColors: document.getElementById('marginNoteColors'),
  btnMarginNoteDelete: document.getElementById('btnMarginNoteDelete'),
  btnMarginNoteSave: document.getElementById('btnMarginNoteSave'),
  refPinsLayer: document.getElementById('refPinsLayer'),
  snipOverlay: document.getElementById('snipOverlay'),
  snipSelectionBox: document.getElementById('snipSelectionBox'),
  snipSizeBadge: document.getElementById('snipSizeBadge'),
  snipResultCard: document.getElementById('snipResultCard'),
  snipResultStatus: document.getElementById('snipResultStatus'),
  snipPreviewCanvas: document.getElementById('snipPreviewCanvas'),
  btnSnipCancel: document.getElementById('btnSnipCancel'),
  btnSnipResultClose: document.getElementById('btnSnipResultClose'),
  btnSnipCopy: document.getElementById('btnSnipCopy'),
  btnSnipSave: document.getElementById('btnSnipSave'),
  btnSnipPin: document.getElementById('btnSnipPin'),
  btnSnipAttachNote: document.getElementById('btnSnipAttachNote'),
  btnSnipAgain: document.getElementById('btnSnipAgain'),

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
  bookEdgeTabsLeft: document.getElementById('bookEdgeTabsLeft'),
  bookEdgeTabsRight: document.getElementById('bookEdgeTabsRight'),
  scrollTabsRail: document.getElementById('scrollTabsRail'),
  bookStackLeft: document.getElementById('bookStackLeft'),
  bookStackRight: document.getElementById('bookStackRight'),
  bookContainer: document.getElementById('bookContainer'),
  bookSpineShadow: document.getElementById('bookSpineShadow'),
  singleCollectedStack: document.getElementById('singleCollectedStack'),
  scsTopCard: document.getElementById('scsTopCard'),
  scsTabsRail: document.getElementById('scsTabsRail'),
  scsBadge: document.getElementById('scsBadge'),
  singleFlightLayer: document.getElementById('singleFlightLayer'),
  navBackPill: document.getElementById('navBackPill'),
  btnNavBack: document.getElementById('btnNavBack'),
  navBackLabel: document.getElementById('navBackLabel'),
  navBackCount: document.getElementById('navBackCount'),
  btnNavBackDismiss: document.getElementById('btnNavBackDismiss'),

  btnPrevArrow: document.getElementById('btnPrevArrow'),
  btnNextArrow: document.getElementById('btnNextArrow'),
  btnFirstPage: document.getElementById('btnFirstPage'),
  btnLastPage: document.getElementById('btnLastPage'),

  moreMenu: document.getElementById('moreMenu'),
  menuLibrary: document.getElementById('menuLibrary'),
  menuScrollMode: document.getElementById('menuScrollMode'),
  valScrollMode: document.getElementById('valScrollMode'),
  menuPageMode: document.getElementById('menuPageMode'),
  valPageMode: document.getElementById('valPageMode'),
  menuHardCover: document.getElementById('menuHardCover'),
  menuClickMode: document.getElementById('menuClickMode'),
  valClickMode: document.getElementById('valClickMode'),
  menuAutoHideBars: document.getElementById('menuAutoHideBars'),
  menuTwoFingerPan: document.getElementById('menuTwoFingerPan'),
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
  btnAddStickyTabDrawer: document.getElementById('btnAddStickyTabDrawer'),
  btnAddMarginNoteDrawer: document.getElementById('btnAddMarginNoteDrawer'),
  bookmarksList: document.getElementById('bookmarksList'),
  valPaperWarmth: document.getElementById('valPaperWarmth'),
  btnPaperWarmDec: document.getElementById('btnPaperWarmDec'),
  paperWarmthRange: document.getElementById('paperWarmthRange'),
  btnPaperWarmInc: document.getElementById('btnPaperWarmInc'),
  paperWarmthPresets: document.getElementById('paperWarmthPresets'),
  menuPaperGrain: document.getElementById('menuPaperGrain'),
  valPaperGrain: document.getElementById('valPaperGrain'),
  paperFiberControls: document.getElementById('paperFiberControls'),
  btnPaperGrainDec: document.getElementById('btnPaperGrainDec'),
  paperGrainRange: document.getElementById('paperGrainRange'),
  btnPaperGrainInc: document.getElementById('btnPaperGrainInc'),
  paperGrainInput: document.getElementById('paperGrainInput'),
  paperGrainStylePills: document.getElementById('paperGrainStylePills'),
  valPaperScale: document.getElementById('valPaperScale'),
  btnPaperScaleDec: document.getElementById('btnPaperScaleDec'),
  paperGrainScaleRange: document.getElementById('paperGrainScaleRange'),
  btnPaperScaleInc: document.getElementById('btnPaperScaleInc'),
  paperGrainScaleInput: document.getElementById('paperGrainScaleInput'),
  paperGrainScalePills: document.getElementById('paperGrainScalePills'),
  savesSummary: document.getElementById('savesSummary'),
  savesCategoryChips: document.getElementById('savesCategoryChips'),
  savesClearRow: document.getElementById('savesClearRow'),
  btnToggleNotesView: document.getElementById('btnToggleNotesView'),
  btnCopyPageNotes: document.getElementById('btnCopyPageNotes'),
  btnExportMarkdown: document.getElementById('btnExportMarkdown'),
  btnClearPageHighlights: document.getElementById('btnClearPageHighlights'),
  btnClearHighlights: document.getElementById('btnClearHighlights'),
  hlPageChips: document.getElementById('hlPageChips'),
  hlPageSelect: document.getElementById('hlPageSelect'),
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
  btnAboutApp: document.getElementById('btnAboutApp'),
  menuAboutCard: document.getElementById('menuAboutCard'),
  btnShortcutsApp: document.getElementById('btnShortcutsApp'),
  shortcutsModal: document.getElementById('shortcutsModal'),
  btnCloseShortcuts: document.getElementById('btnCloseShortcuts'),
  lookupModal: document.getElementById('lookupModal'),
  btnCloseLookup: document.getElementById('btnCloseLookup'),
  lookupWordTitle: document.getElementById('lookupWordTitle'),
  lookupPhonetic: document.getElementById('lookupPhonetic'),
  lookupBody: document.getElementById('lookupBody'),
  lookupWebDictLink: document.getElementById('lookupWebDictLink'),
  lookupTranslateLink: document.getElementById('lookupTranslateLink'),
  aboutModal: document.getElementById('aboutModal'),
  btnCloseAbout: document.getElementById('btnCloseAbout'),
  appToast: document.getElementById('appToast'),

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
  valAmbientSound: document.getElementById('valAmbientSound'),
  ambientPresetSelect: document.getElementById('ambientPresetSelect'),
  ambientVolRow: document.getElementById('ambientVolRow'),
  btnAmbientVolDec: document.getElementById('btnAmbientVolDec'),
  ambientVolRange: document.getElementById('ambientVolRange'),
  btnAmbientVolInc: document.getElementById('btnAmbientVolInc'),
  valAmbientVol: document.getElementById('valAmbientVol'),
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
  paperWarmth: 0, // 0..100 sepia/warmth eye-comfort slider
  paperGrain: false, // subtle cellulose fiber paper texture
  paperGrainStrength: 50, // 10..100 texture intensity %
  paperGrainStyle: 'cotton', // 'cotton' | 'linen' | 'parchment' | 'kraft'
  paperGrainScalePx: 160, // 90..280px tile size
  leftStackThick: 0,
  rightStackThick: 0,
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
  autoScrollEnabled: false,
  autoScrollPlaying: false,
  autoScrollRafId: 0,
  autoScrollLastTs: 0,
  autoScrollPosY: 0,
  autoScrollPauseUntil: 0,
  autoScrollRenderTickAt: 0,
  scrollUserSelecting: false,
  isScrollingActive: false,
  pinchLockScrollUntil: 0,
  nativePinchActive: false,
  scrollPinchPreview: null,

  zoom: 1,
  committedZoom: 1,
  twoFingerPan: true,
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
  stickyTabs: [], // [{ id, page, label, color }]
  stickyEditPage: null,
  stickyEditColor: 'coral',
  ctxTargetPage: null,
  ctxPos: null,
  ctxActionText: '',
  ctxActionCoords: null,
  navHistory: [], // [{ page, reason }]
  highlights: [],
  marginNotes: [], // [{ id, page, xPct, yPct, color, text, snipRect, createdAt }]
  pinnedRefs: [], // [{ id, page, label, crop, x, y, width, height, zoom, collapsed }]
  marginEditDraft: null,
  ctxPageCoords: null,
  snipActive: false,
  snipCapture: null, // { page, rect, canvas }
  savesCategory: 'all', // 'all' | 'sticky' | 'highlights' | 'bookmarks'
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
  nearbyRenderTimer: null,
  lastNavDir: 1,
  isFlipping: false,
  hoveringTopBar: false,
  hoveringBottomBar: false,
  bookmarksUiDirty: true,
  highlightsUiDirty: true,

  magEnabled: false,
  magStyle: 'circle', // 'circle' | 'bar'
  magPower: 2.4,
  magCircleSize: 196,
  magBarWidth: 420,
  magBarHeight: 86,
  magFollow: false, // false = drag & place on book, true = follow cursor
  curtainEnabled: false,
  curtainX: null,
  curtainY: null,
  curtainHeight: 54, // 22..360px
  curtainLengthPct: 100, // 20..100% of book width
  curtainDim: 30, // 15..75% dim curtain
  curtainTone: 'clean', // 'clean' | 'warm' | 'deep'
  curtainGuide: true,
  curtainFollow: true, // follow cursor Y (and X when length < 100%)
  curtainResizing: null,
  curtainDragging: false,
  ambientPreset: 'off', // 'off' | macOS ComfortSounds asset id
  ambientVolume: 30, // 0..100
  lastCurtainPointerX: null,
  lastCurtainPointerY: null,
  curtainAnimUntil: 0,
  curtainSyncRaf: 0,
  magX: null,
  magY: null,
  magDragging: false,
  magResizing: null,
  magRedrawRaf: 0,
  magAnimUntil: 0,
  magHiResCache: new Map(), // idx -> { targetW, canvas, renderTask }
};

/* ---------- Utility ---------- */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

let toastTimer = 0;
function showToast(message, { isError = false, durationMs = 3800 } = {}) {
  if (!els.appToast || !message) return;
  clearTimeout(toastTimer);
  els.appToast.textContent = String(message);
  els.appToast.classList.toggle('is-error', Boolean(isError));
  els.appToast.hidden = false;
  toastTimer = setTimeout(() => {
    if (els.appToast) els.appToast.hidden = true;
  }, durationMs);
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

function getScrollWrapOffset(wrapEl) {
  if (!wrapEl) return { left: 0, top: 0 };
  const sp = els.scrollPages;
  if (sp && wrapEl.offsetParent === sp) {
    return { left: sp.offsetLeft + wrapEl.offsetLeft, top: sp.offsetTop + wrapEl.offsetTop };
  }
  return { left: wrapEl.offsetLeft, top: wrapEl.offsetTop };
}

function getVisibleScrollIndices() {
  if (!state.totalPages || state.scrollMode !== 'scroll' || !els.scrollViewport || !els.scrollPages) {
    return [];
  }
  const n = els.scrollPages.children.length;
  if (!n || !els.scrollViewport.clientHeight) return getVisibleIndices(state.currentIndex);
  const sv = els.scrollViewport;
  const pageH = Math.max(160, Math.round(state.pageH * (state.committedZoom || state.zoom || 1)));
  const stride = pageH + 18;
  const firstWrap = els.scrollPages.children[0];
  const baseTop = firstWrap ? getScrollWrapOffset(firstWrap).top : 54;
  const viewTop = sv.scrollTop - 120;
  const viewBottom = sv.scrollTop + sv.clientHeight + 120;
  const firstIdx = clamp(Math.floor((viewTop - baseTop) / stride), 0, n - 1);
  const lastIdx = clamp(Math.floor((viewBottom - baseTop) / stride), firstIdx, n - 1);
  const hits = [];
  for (let i = firstIdx; i <= lastIdx; i++) {
    const top = baseTop + i * stride;
    if (top + pageH >= viewTop && top <= viewBottom) {
      hits.push(i);
    }
  }
  return hits.length ? hits : getVisibleIndices(state.currentIndex);
}

const MAX_PAGE_ZOOM = 5.0;

function getZoomStepDelta(dir) {
  const step = state.zoom >= 2.5 && (dir > 0 || state.zoom > 2.5) ? 0.5 : 0.25;
  return dir * step;
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
let hasAppliedInitialSettings = false;

async function fetchLibrary({ applySettings = false } = {}) {
  try {
    const res = await fetch('/api/library');
    if (!res.ok) return null;
    const data = await res.json();
    state.libraryBooks = data.books || [];
    if (!hasAppliedInitialSettings || applySettings) {
      hasAppliedInitialSettings = true;
      applySavedSettings(data.settings || {});
    }
    renderLibraryLists();
    return data;
  } catch {
    return null;
  }
}

function applySavedSettings(settings) {
  if (settings.theme) setTheme(settings.theme, false);
  if (typeof settings.readDark === 'boolean') setReadDark(settings.readDark, false);
  if (Number.isFinite(Number(settings.paperWarmth))) {
    setPaperWarmth(Number(settings.paperWarmth), false);
  }
  if (Number.isFinite(Number(settings.paperGrainStrength))) {
    state.paperGrainStrength = clamp(Math.round(Number(settings.paperGrainStrength)), 10, 100);
  }
  if (PAPER_GRAIN_STYLES.includes(settings.paperGrainStyle)) {
    state.paperGrainStyle = settings.paperGrainStyle;
  }
  if (Number.isFinite(Number(settings.paperGrainScalePx))) {
    state.paperGrainScalePx = clamp(Math.round(Number(settings.paperGrainScalePx)), 90, 280);
  } else if (settings.paperGrainScale && PAPER_GRAIN_PRESETS[settings.paperGrainScale]) {
    state.paperGrainScalePx = PAPER_GRAIN_PRESETS[settings.paperGrainScale];
  }
  if (typeof settings.paperGrain === 'boolean') {
    setPaperGrain(settings.paperGrain, false);
  }
  if (typeof settings.autoHideBars === 'boolean') state.autoHideBars = settings.autoHideBars;
  if (typeof settings.twoFingerPan === 'boolean') state.twoFingerPan = settings.twoFingerPan;
  if (settings.soundPreset) {
    state.soundPreset = settings.soundPreset;
  }
  if (typeof settings.soundEnabled === 'boolean') {
    state.soundEnabled = settings.soundEnabled;
  }
  updateSoundUi();
  if (typeof settings.ambientPreset === 'string') {
    state.ambientPreset = normalizeAmbientPresetId(settings.ambientPreset);
  }
  if (Number.isFinite(Number(settings.ambientVolume))) {
    state.ambientVolume = clamp(Math.round(Number(settings.ambientVolume)), 0, 100);
  }
  updateAmbientSoundUi();
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
  if (settings.magStyle === 'circle' || settings.magStyle === 'bar') {
    state.magStyle = settings.magStyle;
  }
  if (Number.isFinite(Number(settings.magPower))) {
    state.magPower = clamp(Math.round(Number(settings.magPower) * 10) / 10, 1.4, 4.5);
  }
  if (Number.isFinite(Number(settings.magCircleSize))) {
    state.magCircleSize = clamp(Math.round(Number(settings.magCircleSize)), 110, 420);
  }
  if (Number.isFinite(Number(settings.magBarWidth))) {
    state.magBarWidth = clamp(Math.round(Number(settings.magBarWidth)), 180, 780);
  }
  if (Number.isFinite(Number(settings.magBarHeight))) {
    state.magBarHeight = clamp(Math.round(Number(settings.magBarHeight)), 48, 240);
  }
  if (Number.isFinite(Number(settings.curtainHeight))) {
    state.curtainHeight = clamp(Math.round(Number(settings.curtainHeight)), 22, 360);
  }
  if (Number.isFinite(Number(settings.curtainLengthPct))) {
    state.curtainLengthPct = clamp(Math.round(Number(settings.curtainLengthPct)), 20, 100);
  }
  if (Number.isFinite(Number(settings.curtainDim))) {
    state.curtainDim = clamp(Math.round(Number(settings.curtainDim)), 15, 75);
  }
  if (settings.curtainTone === 'clean' || settings.curtainTone === 'warm' || settings.curtainTone === 'deep') {
    state.curtainTone = settings.curtainTone;
  }
  if (typeof settings.curtainGuide === 'boolean') {
    state.curtainGuide = settings.curtainGuide;
  }
  if (typeof settings.curtainFollow === 'boolean') {
    state.curtainFollow = settings.curtainFollow;
  }
  updateMenuValues();
  updateMagnifierUi();
  updateFocusCurtainUi();
}

function buildPersistPayload() {
  const payload = {
    settings: {
      theme: state.theme,
      readDark: state.readDark,
      paperWarmth: state.paperWarmth,
      paperGrain: state.paperGrain,
      paperGrainStrength: state.paperGrainStrength,
      paperGrainStyle: state.paperGrainStyle,
      paperGrainScalePx: state.paperGrainScalePx,
      autoHideBars: state.autoHideBars,
      twoFingerPan: state.twoFingerPan,
      scrollMode: state.scrollMode,
      soundEnabled: state.soundEnabled,
      soundPreset: state.soundPreset,
      ambientPreset: state.ambientPreset,
      ambientVolume: state.ambientVolume,
      pageMode: state.pageMode,
      showCover: state.showCover,
      clickMode: state.clickMode,
      autoFlipSeconds: state.autoFlipSeconds,
      autoScrollSpeed: state.autoScrollSpeed,
      magStyle: state.magStyle,
      magPower: state.magPower,
      magCircleSize: state.magCircleSize,
      magBarWidth: state.magBarWidth,
      magBarHeight: state.magBarHeight,
      curtainHeight: state.curtainHeight,
      curtainLengthPct: state.curtainLengthPct,
      curtainDim: state.curtainDim,
      curtainTone: state.curtainTone,
      curtainGuide: state.curtainGuide,
      curtainFollow: state.curtainFollow,
    },
  };
  if (state.bookId && state.totalPages > 0) {
    payload.id = state.bookId;
    payload.lastPage = state.currentIndex + 1;
    payload.totalPages = state.totalPages;
    payload.bookmarks = state.bookmarks;
    payload.stickyTabs = state.stickyTabs;
    payload.highlights = state.highlights;
    payload.marginNotes = state.marginNotes;
    payload.pinnedRefs = state.pinnedRefs;
  }
  return payload;
}

function isLocalOnlyBookId(bookId) {
  return typeof bookId === 'string' && bookId.startsWith('blob-');
}

function flushPersistState({ keepalive = false } = {}) {
  clearTimeout(state.persistTimer);
  state.persistTimer = null;
  const payload = buildPersistPayload();
  if (payload.id) {
    try {
      localStorage.setItem(`flipbook:${payload.id}`, JSON.stringify({
        lastPage: payload.lastPage,
        bookmarks: payload.bookmarks,
        stickyTabs: payload.stickyTabs,
        highlights: payload.highlights,
        marginNotes: payload.marginNotes,
        pinnedRefs: payload.pinnedRefs,
      }));
    } catch {
      // ignore storage errors
    }
  }
  const serverPayload = isLocalOnlyBookId(payload.id)
    ? { settings: payload.settings }
    : payload;
  if (!serverPayload.id && !hasAppliedInitialSettings) return;
  fetch('/api/book-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serverPayload),
    keepalive,
  }).catch(() => {});
}

function schedulePersistState() {
  clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(() => {
    state.persistTimer = null;
    flushPersistState();
  }, 350);
}

/* ---------- Book Sizing & PageFlip Lifecycle ---------- */
function computeBookGeometry(forceSingle = false) {
  const stageW = Math.max(320, els.stage.clientWidth);
  const stageH = Math.max(260, els.stage.clientHeight);
  const single = forceSingle || isEffectiveSingleMode();

  const horizReserve = forceSingle
    ? 96
    : single
      ? (stageW >= 960 ? 196 : 140)
      : (stageW >= 1120 ? 256 : stageW >= 900 ? 220 : 190);
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
  clearTimeout(state.persistTimer);
  state.persistTimer = null;
  clearTimeout(state.zoomRerenderTimer);
  state.zoomRerenderTimer = null;
  clearTimeout(state.scrollSyncTimer);
  state.scrollSyncTimer = null;
  state.isScrollingActive = false;
  state.nativePinchActive = false;
  state.scrollPinchPreview = null;
  if (els.scrollPages) els.scrollPages.style.transform = '';
  if (els.scrollViewport) els.scrollViewport.classList.remove('is-pinch-locked');
  document.body.classList.remove('is-scrolling');
  clearTimeout(state.nearbyRenderTimer);
  state.nearbyRenderTimer = null;

  stopAutoFlip();
  stopAutoScroll({ resetPlaying: true });
  setMagnifierEnabled(false, { persist: false });
  if (typeof setFocusCurtainEnabled === 'function') setFocusCurtainEnabled(false, { persist: false });
  if (typeof setSnipToolActive === 'function') setSnipToolActive(false);
  if (typeof hideMarginNoteHoverCard === 'function') hideMarginNoteHoverCard();
  if (typeof closeMarginNotePopover === 'function') closeMarginNotePopover();
  if (typeof closeStickyTabPopover === 'function') closeStickyTabPopover();
  if (typeof closePageContextMenu === 'function') closePageContextMenu();

  state.curtainX = null;
  state.curtainY = null;
  state.curtainDragging = false;
  state.curtainResizing = null;
  state.pinnedRefs = [];
  if (els.refPinsLayer) els.refPinsLayer.innerHTML = '';
  clearMagnifierCache();
  state.magX = null;
  state.magY = null;
  state.searchAbortId++;
  for (const entry of state.renderedMap.values()) {
    try { entry.renderTask?.cancel(); } catch {}
  }
  state.renderedMap.clear();
  nearbyPrefetchState.inFlight.clear();
  nearbyPrefetchState.scheduled = false;
  state.textCache.clear();
  state.thumbRendered.clear();
  snipThumbCache.clear();
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
  els.bookShell.hidden = true;
  if (els.bookEdgeTabsLeft) els.bookEdgeTabsLeft.innerHTML = '';
  if (els.bookEdgeTabsRight) els.bookEdgeTabsRight.innerHTML = '';
  if (els.scrollTabsRail) {
    els.scrollTabsRail.innerHTML = '';
    els.scrollTabsRail.hidden = true;
  }
  if (els.stickyTabPopover) els.stickyTabPopover.hidden = true;
  if (els.pageContextMenu) els.pageContextMenu.hidden = true;
  clearNavHistory();
  els.scrollPages.innerHTML = '';
  if (els.shortcutsModal) els.shortcutsModal.hidden = true;
  if (els.lookupModal) els.lookupModal.hidden = true;
  if (els.aboutModal) els.aboutModal.hidden = true;
  els.scrollViewport.hidden = true;
  document.body.classList.remove('mode-scroll');
  clearSingleFlights();
  updateSingleCollectedStack();
  els.thumbScroller.innerHTML = '';
  els.tocList.innerHTML = '';
  els.searchResults.innerHTML = '';
  els.searchStatus.textContent = '';
  state.searchQuery = '';
  if (els.searchInput) els.searchInput.value = '';
  if (els.pageTextPreview) els.pageTextPreview.textContent = '';

  state.bookId = null;
  state.bookTitle = 'FlipBook Reader';
  state.totalPages = 0;
  state.currentIndex = 0;
  state.pageNodes = [];
  state.bookmarks = [];
  state.stickyTabs = [];
  state.highlights = [];
  state.marginNotes = [];
  state.savesCategory = 'all';
  state.hlFilterMode = 'all';
  state.hlFilterPage = null;
  state.hlNotesView = false;
  state.zoom = 1;
  state.committedZoom = 1;
  state.panX = 0;
  state.panY = 0;
  state.isPanning = false;
  state.panMoved = false;
  if (els.zoomViewport) {
    els.zoomViewport.style.transform = '';
    els.zoomViewport.classList.remove('is-zoomed', 'is-panning');
  }
  if (els.topBarRight) els.topBarRight.hidden = true;
  if (els.btnPrevArrow) els.btnPrevArrow.hidden = true;
  if (els.btnNextArrow) els.btnNextArrow.hidden = true;
  if (els.btnFirstPage) els.btnFirstPage.hidden = true;
  if (els.btnLastPage) els.btnLastPage.hidden = true;
  if (els.sideDrawer) els.sideDrawer.hidden = true;
  if (els.thumbnailsStrip) els.thumbnailsStrip.hidden = true;
  if (els.moreMenu) els.moreMenu.hidden = true;
  els.btnHighlightsTop?.classList.remove('active', 'has-hl');
  els.btnThumbs?.classList.remove('active');
  els.btnMore?.classList.remove('active');
  if (els.bookTitleLabel) els.bookTitleLabel.textContent = 'FlipBook Reader';
  document.title = 'FlipBook Reader';
  if (els.pageInput) els.pageInput.value = '0/0';
  if (els.pageScrubber) {
    els.pageScrubber.max = '1';
    els.pageScrubber.value = '1';
  }
  if (window.location.hash) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
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

  clearTimeout(state.zoomRerenderTimer);
  state.zoomRerenderTimer = null;
  for (const entry of state.renderedMap.values()) {
    try { entry.renderTask?.cancel(); } catch {}
  }
  state.renderedMap.clear();
  nearbyPrefetchState.inFlight.clear();
  nearbyPrefetchState.scheduled = false;
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
  els.scrollPages.style.transform = '';
  state.scrollPinchPreview = null;
  if (els.shortcutsModal) els.shortcutsModal.hidden = true;
  if (els.lookupModal) els.lookupModal.hidden = true;
  if (els.aboutModal) els.aboutModal.hidden = true;
  els.scrollPages.style.setProperty('--scroll-page-w', `${sw}px`);
  els.scrollPages.style.setProperty('--scroll-page-h', `${sh}px`);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < state.pageNodes.length; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'scroll-page-wrap';
    wrap.dataset.pageIndex = String(i);
    wrap.appendChild(state.pageNodes[i]);
    frag.appendChild(wrap);
  }
  els.scrollPages.appendChild(frag);
  els.scrollViewport.hidden = false;
  els.scrollViewport.scrollLeft = 0;

  els.welcomeOverlay.hidden = true;
  els.topBarRight.hidden = false;
  els.btnPrevArrow.hidden = false;
  els.btnNextArrow.hidden = false;
  els.btnFirstPage.hidden = false;
  els.btnLastPage.hidden = false;

  state.scrollObserver = new IntersectionObserver((entries) => {
    if (state.isScrollingActive || state.scrollPinchPreview) return;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const idx = Number(entry.target.dataset.pageIndex);
      if (Number.isFinite(idx)) {
        renderPageNode(idx, { withText: false });
      }
    }
  }, { root: els.scrollViewport, rootMargin: '420px 0px' });

  for (const wrap of els.scrollPages.children) {
    state.scrollObserver.observe(wrap);
  }

  const safeStart = clamp(startIndex, 0, Math.max(0, state.totalPages - 1));
  state.currentIndex = safeStart;
  const targetWrap = els.scrollPages.children[safeStart];
  if (targetWrap) {
    state.programmaticScrollUntil = performance.now() + 120;
    els.scrollViewport.scrollTop = Math.max(0, getScrollWrapOffset(targetWrap).top - 54);
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

  clearTimeout(state.zoomRerenderTimer);
  state.zoomRerenderTimer = null;
  for (const entry of state.renderedMap.values()) {
    try { entry.renderTask?.cancel(); } catch {}
  }
  state.renderedMap.clear();
  nearbyPrefetchState.inFlight.clear();
  nearbyPrefetchState.scheduled = false;
  if (state.scrollObserver) {
    state.scrollObserver.disconnect();
    state.scrollObserver = null;
  }
  els.scrollPages.innerHTML = '';
  if (els.shortcutsModal) els.shortcutsModal.hidden = true;
  if (els.lookupModal) els.lookupModal.hidden = true;
  if (els.aboutModal) els.aboutModal.hidden = true;
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
  state.committedZoom = state.zoom;
  if (state.zoom <= 1.01) {
    state.panX = 0;
    state.panY = 0;
  } else {
    const clampedPan = clampZoomPan(state.panX, state.panY);
    state.panX = clampedPan.x;
    state.panY = clampedPan.y;
  }

  const sw = Math.round(state.pageW * state.committedZoom);
  const sh = Math.round(state.pageH * state.committedZoom);
  const single = isEffectiveSingleMode();
  const totalBookW = single ? sw : sw * 2;
  els.bookShell.style.width = `${totalBookW}px`;
  els.bookShell.style.height = `${sh}px`;
  els.bookContainer.style.width = `${totalBookW}px`;
  els.bookContainer.style.height = `${sh}px`;
  syncStickyTabScale(sw);

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
    isDarkMode: () => state.readDark,
    onRenderSheetTabs: renderTurningSheetTabs,
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

  pf.on('activeFlipsChange', () => {
    renderBookEdgeTabs();
    if (state.curtainEnabled) scheduleCurtainBoundsSync(180);
  });

  pf.on('frame', () => {
    if (state.magEnabled) scheduleMagnifierRedraw();
    if (state.curtainEnabled) positionFocusCurtain();
  });

  pf.on('flipStart', (e) => {
    flipSound.playFlip();
    hideHighlightPopover();
    if (state.magEnabled) scheduleMagnifierRedraw();
    if (Number.isFinite(e.data?.page)) {
      const fromIdx = clamp(e.data?.from ?? state.currentIndex, 0, state.totalPages - 1);
      const nextIdx = clamp(e.data.page, 0, state.totalPages - 1);
      if (nextIdx !== fromIdx) state.lastNavDir = nextIdx > fromIdx ? 1 : -1;
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

      onSpreadChanged(false, 8, { skipSingleStackSwap });
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
      queueNearbyRenders(state.currentIndex, state.committedZoom > 1.05 ? 1 : 6);
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
  applyZoomTransform(false);
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
      if (state.magEnabled) scheduleMagnifierRedraw();
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
    if (state.magEnabled) scheduleMagnifierRedraw();
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

const nearbyPrefetchState = {
  inFlight: new Set(),
  scheduled: false,
};

function attachThumbPreviewWhileLoading(inner, idx) {
  if (!inner || inner.querySelector('canvas.fb-canvas, canvas.fb-thumb-preview')) return;
  const thumbCanvas = els.thumbScroller?.children?.[idx]?.querySelector('canvas');
  if (!thumbCanvas || thumbCanvas.width <= 0 || thumbCanvas.height <= 0) return;
  const preview = document.createElement('canvas');
  preview.className = 'fb-thumb-preview';
  preview.width = thumbCanvas.width;
  preview.height = thumbCanvas.height;
  preview.getContext('2d', { alpha: false })?.drawImage(thumbCanvas, 0, 0);
  inner.prepend(preview);
}

async function ensureTextLayerForToken(idx, token) {
  if (!token || token.textRendered || token.textPromise) return token?.textPromise || null;
  if (!token.pdfPage || !token.textLayerDiv || !token.cssVp || state.renderedMap.get(idx) !== token) return null;
  token.textPromise = (async () => {
    try {
      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: token.pdfPage.streamTextContent(),
        container: token.textLayerDiv,
        viewport: token.cssVp,
      });
      await textLayer.render();
      if (state.renderedMap.get(idx) !== token) return;
      token.textRendered = true;
      registerTextLayerForSelection(token.textLayerDiv);
      paintSearchHighlightsOnPage(idx);
    } catch {
      // ignore cancelled/aborted text layer
    } finally {
      token.textPromise = null;
    }
  })();
  return token.textPromise;
}

function computePageRenderMetrics() {
  const sw = Math.max(120, Math.round(state.pageW * state.committedZoom));
  const sh = Math.max(160, Math.round(state.pageH * state.committedZoom));
  const devDpr = window.devicePixelRatio || 1;
  const z = Math.max(1, state.committedZoom || 1);
  // sw & sh already scale linearly with committedZoom, so oversampling factor scales down smoothly at high zoom
  const desiredDpr = z >= 2.2
    ? Math.min(devDpr, 1.35)
    : (z > 1.15 ? Math.min(devDpr, 1.65) : Math.min(2.25, Math.max(devDpr, 1.75)));
  const maxDim = 3840;
  const maxArea = 9_500_000;
  const maxScaleByDim = Math.min(maxDim / sw, maxDim / sh);
  const maxScaleByArea = Math.sqrt(maxArea / Math.max(1, sw * sh));
  const pixelScale = Math.max(1, Math.min(desiredDpr, maxScaleByDim, maxScaleByArea));
  return {
    sw,
    sh,
    pixelScale,
    renderKey: `${sw}x${sh}@${pixelScale.toFixed(3)}`,
  };
}

async function renderPageNode(idx, { withText = true } = {}) {
  if (!state.pdfDoc || idx < 0 || idx >= state.totalPages) return;
  const pageNode = state.pageNodes[idx];
  if (!pageNode) return;
  const inner = pageNode.querySelector('.fb-page-inner');
  if (!inner) return;

  const { sw, sh, pixelScale, renderKey } = computePageRenderMetrics();

  const existing = state.renderedMap.get(idx);
  if (existing && existing.renderKey === renderKey) {
    if (existing.renderingPromise) {
      await existing.renderingPromise;
    }
    if (state.renderedMap.get(idx) === existing && inner.querySelector('canvas.fb-canvas')) {
      if (withText && !existing.textRendered) {
        await ensureTextLayerForToken(idx, existing);
      } else {
        paintSearchHighlightsOnPage(idx);
      }
      return;
    }
  }

  if (existing?.renderTask) {
    try { existing.renderTask.cancel(); } catch {}
  }

  const token = {
    renderKey,
    renderTask: null,
    renderingPromise: null,
    pdfPage: null,
    cssVp: null,
    textLayerDiv: null,
    textRendered: false,
    textPromise: null,
  };
  state.renderedMap.set(idx, token);
  attachThumbPreviewWhileLoading(inner, idx);

  const run = (async () => {
    try {
      const pdfPage = await state.pdfDoc.getPage(idx + 1);
      if (state.renderedMap.get(idx) !== token) return;

      const rawVp = pdfPage.getViewport({ scale: 1 });
      const cssScale = sw / rawVp.width;
      const cssVp = pdfPage.getViewport({ scale: cssScale });
      const renderVp = pdfPage.getViewport({ scale: cssScale * pixelScale });

      const canvas = document.createElement('canvas');
      canvas.className = 'fb-canvas';
      canvas.width = Math.max(1, Math.round(renderVp.width));
      canvas.height = Math.max(1, Math.round(renderVp.height));

      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderTask = pdfPage.render({ canvasContext: ctx, viewport: renderVp });
      token.renderTask = renderTask;
      await renderTask.promise;
      if (state.renderedMap.get(idx) !== token) return;

      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.setProperty('--scale-factor', String(cssVp.scale));

      const userHlLayer = document.createElement('div');
      userHlLayer.className = 'fb-user-highlights';

      const hlLayer = document.createElement('div');
      hlLayer.className = 'fb-search-highlights';

      const marginLayer = document.createElement('div');
      marginLayer.className = 'fb-margin-notes';

      inner.innerHTML = '';
      inner.appendChild(canvas);
      inner.appendChild(userHlLayer);
      inner.appendChild(hlLayer);
      inner.appendChild(textLayerDiv);
      inner.appendChild(marginLayer);
      paintUserHighlightsOnPage(idx);
      paintMarginNotesOnPage(idx);
      state.pageFlip?.refreshPendingSnapshots?.();
      if (state.magEnabled) scheduleMagnifierRedraw();

      if (state.readDark && state.scrollMode === 'flip' && state.zoom <= 1.05) {
        setTimeout(() => {
          if (state.readDark && state.scrollMode === 'flip' && state.zoom <= 1.05 && canvas.width > 0) {
            getBakedDarkCanvas(canvas);
          }
        }, 40);
      }

      token.pdfPage = pdfPage;
      token.cssVp = cssVp;
      token.textLayerDiv = textLayerDiv;

      if (withText) {
        await ensureTextLayerForToken(idx, token);
      }
      if (state.renderedMap.get(idx) !== token) return;
      evictDistantPages(state.currentIndex);
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        // ignore cancelled renders cleanly
      }
    } finally {
      token.renderTask = null;
      token.renderingPromise = null;
    }
  })();

  token.renderingPromise = run;
  return run;
}

function getActiveFlipPageIndices() {
  const pf = state.pageFlip;
  if (!pf) return [];
  const active = [];
  const flips = [
    ...(pf.interactiveFlip ? [pf.interactiveFlip] : []),
    ...(Array.isArray(pf.flyingFlips) ? pf.flyingFlips : []),
  ];
  for (const f of flips) {
    for (const i of [f.fromIdx, f.toIdx, f.underIdx]) {
      if (Number.isInteger(i) && i >= 0 && i < state.totalPages && !active.includes(i)) {
        active.push(i);
      }
    }
  }
  return active;
}

function evictDistantPages(centerIdx) {
  const activeIndices = new Set([
    ...(state.scrollMode === 'scroll' ? getVisibleScrollIndices() : getVisibleIndices(centerIdx)),
    ...getActiveFlipPageIndices(),
  ]);
  const maxKeep = state.committedZoom >= 2.0
    ? Math.max(6, activeIndices.size + 4)
    : (state.committedZoom > 1.2 ? Math.max(10, activeIndices.size + 6) : Math.max(MAX_CACHED_CANVASES, 36));
  const keepRadius = state.committedZoom >= 2.0 ? 1 : (state.committedZoom > 1.2 ? 2 : 14);
  if (state.renderedMap.size <= maxKeep) return;
  const entries = Array.from(state.renderedMap.keys())
    .sort((a, b) => Math.abs(b - centerIdx) - Math.abs(a - centerIdx));

  while (state.renderedMap.size > maxKeep && entries.length) {
    const farIdx = entries.shift();
    if (activeIndices.has(farIdx) || Math.abs(farIdx - centerIdx) <= keepRadius) continue;
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

function getExpectedPageRenderKey() {
  return computePageRenderMetrics().renderKey;
}

function isPageCanvasReadyAtCurrentZoom(idx) {
  const rec = state.renderedMap.get(idx);
  return Boolean(
    rec &&
    !rec.renderTask &&
    rec.renderKey === getExpectedPageRenderKey() &&
    state.pageNodes[idx]?.querySelector('canvas.fb-canvas')
  );
}

function pumpNearbyRenders() {
  nearbyPrefetchState.scheduled = false;
  if (!state.pdfDoc || !state.totalPages) return;
  const centerIdx = state.currentIndex;
  const maxConc = state.committedZoom > 1.2 ? 1 : 2;
  if (nearbyPrefetchState.inFlight.size >= maxConc) return;

  const effectiveRadius = state.committedZoom >= 2.0 ? 1 : (state.committedZoom > 1.2 ? 2 : 8);
  if (effectiveRadius <= 0) return;

  const dir = state.lastNavDir >= 0 ? 1 : -1;
  const candidates = [];
  for (let d = 1; d <= effectiveRadius; d++) {
    candidates.push(centerIdx + d * dir);
    if (d <= 3) candidates.push(centerIdx - d * dir);
  }

  for (const idx of candidates) {
    if (nearbyPrefetchState.inFlight.size >= maxConc) break;
    if (idx < 0 || idx >= state.totalPages || nearbyPrefetchState.inFlight.has(idx)) continue;
    if (isPageCanvasReadyAtCurrentZoom(idx)) continue;

    nearbyPrefetchState.inFlight.add(idx);
    renderPageNode(idx, { withText: false }).finally(() => {
      nearbyPrefetchState.inFlight.delete(idx);
      if (!nearbyPrefetchState.scheduled) {
        nearbyPrefetchState.scheduled = true;
        setTimeout(pumpNearbyRenders, 8);
      }
    });
  }

  // After all lookahead canvases are warm and flip has settled, ensure TextLayer on immediate ±1 neighbors
  if (nearbyPrefetchState.inFlight.size === 0 && !state.isFlipping) {
    for (const nIdx of [centerIdx + dir, centerIdx - dir]) {
      if (nIdx < 0 || nIdx >= state.totalPages) continue;
      const rec = state.renderedMap.get(nIdx);
      if (rec && !rec.textRendered && !rec.textPromise && isPageCanvasReadyAtCurrentZoom(nIdx)) {
        renderPageNode(nIdx, { withText: true });
      }
    }
  }
}

function queueNearbyRenders(centerIdx, radius = 8, { withText = true } = {}) {
  clearTimeout(state.nearbyRenderTimer);
  const visible = state.scrollMode === 'scroll' ? getVisibleScrollIndices() : getVisibleIndices(centerIdx);
  const immediate = [...visible];
  for (const flipIdx of getActiveFlipPageIndices()) {
    if (!immediate.includes(flipIdx)) immediate.push(flipIdx);
  }
  const allowText = withText && !state.isFlipping && !state.isScrollingActive;
  const maxImmediate = state.isScrollingActive ? Math.min(3, immediate.length) : immediate.length;
  for (let k = 0; k < maxImmediate; k++) {
    const idx = immediate[k];
    renderPageNode(idx, { withText: allowText && visible.includes(idx) });
  }

  // Immediately pre-warm the very next page in flip direction without waiting so fast taps stay instant
  if (state.committedZoom <= 1.25 && !state.isScrollingActive && !state.scrollPinchPreview) {
    const dir = state.lastNavDir >= 0 ? 1 : -1;
    for (const ahead of [centerIdx + dir, centerIdx + dir * 2]) {
      if (ahead >= 0 && ahead < state.totalPages && !immediate.includes(ahead) && !isPageCanvasReadyAtCurrentZoom(ahead)) {
        renderPageNode(ahead, { withText: false });
      }
    }
  }

  if (radius > 0 && !state.isScrollingActive && !nearbyPrefetchState.scheduled) {
    nearbyPrefetchState.scheduled = true;
    setTimeout(pumpNearbyRenders, state.committedZoom > 1.2 ? 28 : 12);
  }
}

/* ---------- Book Visual Chrome: Stacks, Spine, Centering, Toolbar ---------- */
function updateCenterShift() {
  if (!state.totalPages) return;
  const visible = getVisibleIndices();
  const single = isEffectiveSingleMode() || state.orientation === 'portrait';
  const sw = Math.round(state.pageW * state.committedZoom);

  let shiftX = 0;
  if (!single && state.showCover && visible.length === 1) {
    // Center single front cover or single back cover smoothly on exact integer pixels
    shiftX = visible[0] === 0 ? -Math.round(sw / 2) : Math.round(sw / 2);
  }
  const nextTransform = `translate3d(${shiftX}px, 0, 0)`;
  els.bookCenterShift.classList.toggle('is-zoomed', state.zoom > 1.01);
  if (els.bookCenterShift.style.transform !== nextTransform) {
    els.bookCenterShift.style.transform = nextTransform;
    if (state.magEnabled) {
      state.magAnimUntil = Math.max(state.magAnimUntil, performance.now() + 560);
      scheduleMagnifierRedraw();
    }
    if (state.curtainEnabled) {
      scheduleCurtainBoundsSync(560);
    }
  }
}

function getBookMaxStackThickness(totalPages, single) {
  if (totalPages <= 2) return 0;
  // Sublinear thickness curve so a thin booklet feels light while a thick textbook looks substantial
  const rawBase = 3 + Math.sqrt(Math.max(0, totalPages - 2)) * 1.48;
  const maxUnzoomed = clamp(Math.round(rawBase), 5, single ? 24 : 30);
  const zoomScale = Math.min(2.0, 0.45 + 0.55 * (state.committedZoom || 1));
  return Math.max(2, Math.round(maxUnzoomed * zoomScale));
}

function setStackElementGeometry(stackEl, side, thicknessPx) {
  if (!stackEl) return;
  const key = `${side}:${thicknessPx}`;
  if (stackEl.dataset.stackGeom === key) return;
  stackEl.dataset.stackGeom = key;
  const visible = thicknessPx > 0;
  stackEl.classList.toggle('is-empty', !visible);
  stackEl.style.opacity = visible ? '1' : '0';
  stackEl.style.width = `${thicknessPx}px`;
  if (side === 'left') {
    stackEl.style.left = `${-thicknessPx}px`;
    stackEl.style.right = 'auto';
  } else {
    stackEl.style.right = `${-thicknessPx}px`;
    stackEl.style.left = 'auto';
  }
  const taperPx = visible ? Math.min(5, thicknessPx * 0.17).toFixed(1) : '0';
  els.bookShell.style.setProperty(`--stack-taper-${side}`, `${taperPx}px`);
}

function setShellVarIfChanged(name, value) {
  if (!els.bookShell) return;
  if (els.bookShell.style.getPropertyValue(name) !== value) {
    els.bookShell.style.setProperty(name, value);
  }
}

function updateBookDepthChrome() {
  if (!state.totalPages) return;
  const visible = getVisibleIndices();
  const single = isEffectiveSingleMode() || state.orientation === 'portrait';
  const sw = Math.round(state.pageW * state.committedZoom);

  const leftIdx = visible[0];
  const rightIdx = visible[visible.length - 1];
  const rightRemain = Math.max(0, state.totalPages - 1 - rightIdx);
  const maxStack = getBookMaxStackThickness(state.totalPages, single);
  const denom = Math.max(1, state.totalPages - 1);

  const minLeaf = maxStack >= 16 ? 2 : 1;
  const leftThick = leftIdx > 0 && maxStack > 0
    ? clamp(Math.round((leftIdx / denom) * maxStack), minLeaf, maxStack)
    : 0;
  const rightThick = rightRemain > 0 && maxStack > 0
    ? clamp(Math.round((rightRemain / denom) * maxStack), minLeaf, maxStack)
    : 0;

  state.leftStackThick = single ? 0 : (state.showCover && visible.length === 1 && visible[0] === 0 ? 0 : leftThick);
  state.rightStackThick = state.showCover && visible.length === 1 && visible[0] > 0 && !single ? 0 : rightThick;

  if (single) {
    // In single-page mode, read pages collect onto the top-left preview stack; the left edge is the
    // binding hinge, while the right stack represents remaining unread pages (0px once all pages end).
    const atSingleEnd = rightRemain === 0;
    els.bookShell.classList.toggle('has-left-stack', leftIdx > 0 && !atSingleEnd);
    els.bookShell.classList.toggle('is-single-end', atSingleEnd);
    setStackElementGeometry(els.bookStackLeft, 'left', 0);
    setStackElementGeometry(els.bookStackRight, 'right', rightThick);

    state.allowSpine = false;
    els.bookSpineShadow.style.opacity = '0';
    els.bookDropShadow.style.left = '0px';
    els.bookDropShadow.style.right = `${-rightThick}px`;
    setShellVarIfChanged('--stack-shadow-bias', `${Math.round(rightThick * 0.25)}px`);
    setShellVarIfChanged('--tabs-offset-left', '0px');
    setShellVarIfChanged('--tabs-offset-right', '0px');
    return;
  }

  els.bookShell.classList.remove('is-single-end');
  els.bookShell.classList.toggle('has-left-stack', leftThick > 0);

  // Landscape 2-page spread
  if (state.showCover && visible.length === 1) {
    state.allowSpine = false;
    if (visible[0] === 0) {
      // Front cover sits on right half of 2*pageW
      setStackElementGeometry(els.bookStackLeft, 'left', 0);
      setStackElementGeometry(els.bookStackRight, 'right', rightThick);
      els.bookSpineShadow.style.opacity = '0';
      els.bookDropShadow.style.left = `${sw}px`;
      els.bookDropShadow.style.right = `${-rightThick}px`;
      setShellVarIfChanged('--stack-shadow-bias', `${Math.round(rightThick * 0.25)}px`);
      setShellVarIfChanged('--tabs-offset-left', `${sw}px`);
      setShellVarIfChanged('--tabs-offset-right', '0px');
    } else {
      // Back cover sits on left half of 2*pageW
      setStackElementGeometry(els.bookStackLeft, 'left', leftThick);
      setStackElementGeometry(els.bookStackRight, 'right', 0);
      els.bookSpineShadow.style.opacity = '0';
      els.bookDropShadow.style.left = `${-leftThick}px`;
      els.bookDropShadow.style.right = `${sw}px`;
      setShellVarIfChanged('--stack-shadow-bias', `${Math.round(-leftThick * 0.25)}px`);
      setShellVarIfChanged('--tabs-offset-left', '0px');
      setShellVarIfChanged('--tabs-offset-right', `${sw}px`);
    }
  } else {
    state.allowSpine = true;
    setStackElementGeometry(els.bookStackLeft, 'left', leftThick);
    setStackElementGeometry(els.bookStackRight, 'right', rightThick);
    if (!state.isFlipping) {
      els.bookSpineShadow.style.opacity = '1';
    }
    els.bookDropShadow.style.left = `${-leftThick}px`;
    els.bookDropShadow.style.right = `${-rightThick}px`;
    els.bookShell.style.setProperty('--stack-shadow-bias', `${Math.round((rightThick - leftThick) * 0.25)}px`);
    els.bookShell.style.setProperty('--tabs-offset-left', '0px');
    els.bookShell.style.setProperty('--tabs-offset-right', '0px');
  }
  syncEdgeTabsViewportBounds();
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
  const hadCard = Boolean(singleStackMeta.dragCard);
  if (singleStackMeta.dragCard) {
    singleStackMeta.dragCard.remove();
    singleStackMeta.dragCard = null;
  }
  singleStackMeta.dragPose = null;
  els.singleCollectedStack?.classList.remove('is-drop-ready');
  if (hadCard) {
    renderBookEdgeTabs();
  }
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
    if (state.readDark) {
      bakeDarkCanvasInPlace(mini);
      mini.dataset.darkBaked = '1';
    }
    return mini;
  }
  return null;
}

function appendMiniPageOverlays(containerEl, pageIdx, { tinyStack = false } = {}) {
  if (!containerEl || !Number.isInteger(pageIdx)) return;
  containerEl.querySelectorAll('.fb-user-highlights, .fb-margin-notes').forEach((n) => n.remove());
  const srcNode = state.pageNodes[pageIdx];
  const srcHl = srcNode?.querySelector('.fb-user-highlights');
  if (srcHl && srcHl.children.length > 0) {
    containerEl.appendChild(srcHl.cloneNode(true));
  }
  const pageNotes = state.marginNotes.filter((n) => n.page === pageIdx + 1);
  if (pageNotes.length) {
    const layer = document.createElement('div');
    layer.className = `fb-margin-notes${tinyStack ? ' is-tiny-stack' : ''}`;
    for (const note of pageNotes) {
      const pin = document.createElement('div');
      pin.className = `fb-margin-note-pin color-${note.color}${note.snipRect ? ' has-snip' : ''}${tinyStack ? ' is-tiny-stack' : ''}`;
      pin.style.left = `${note.xPct}%`;
      pin.style.top = `${note.yPct}%`;
      pin.innerHTML = `<span class="margin-pin-sheet"><span class="margin-pin-fold"></span></span>`;
      layer.appendChild(pin);
    }
    containerEl.appendChild(layer);
  }
}

function paintSingleStackTopCard(pageIdx, { force = false } = {}) {
  if (!els.singleCollectedStack || !els.scsTopCard || !els.scsBadge) return;
  if (pageIdx < 0 || pageIdx >= state.totalPages || !state.pdfDoc) return;

  const { w, h } = getSingleStackMetrics();
  els.scsBadge.textContent = `Pg ${pageIdx + 1}`;
  els.singleCollectedStack.title = `Page ${pageIdx + 1} — Click to pull back (←)`;

  const readRatio = pageIdx / Math.max(1, state.totalPages - 1);
  const depth = pageIdx >= 20 || readRatio >= 0.7 ? '4' : pageIdx >= 7 || readRatio >= 0.35 ? '3' : pageIdx >= 2 || readRatio >= 0.1 ? '2' : '1';
  els.singleCollectedStack.dataset.depth = depth;

  if (!force && singleStackMeta.renderedIdx === pageIdx && els.scsTopCard.firstChild) {
    appendMiniPageOverlays(els.scsTopCard, pageIdx, { tinyStack: true });
    return;
  }
  singleStackMeta.renderedIdx = pageIdx;
  const token = ++singleStackMeta.renderToken;

  const fastCanvas = createFlightSnapshotCanvas(pageIdx, w * 2, h * 2, 'scs-mini-canvas');
  if (fastCanvas) {
    els.scsTopCard.innerHTML = '';
    els.scsTopCard.appendChild(fastCanvas);
    appendMiniPageOverlays(els.scsTopCard, pageIdx, { tinyStack: true });
    return;
  }

  els.scsTopCard.innerHTML = `<div class="fb-page-num-placeholder">${pageIdx + 1}</div>`;
  appendMiniPageOverlays(els.scsTopCard, pageIdx, { tinyStack: true });
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
      if (state.readDark) {
        bakeDarkCanvasInPlace(canvas);
        canvas.dataset.darkBaked = '1';
      }
      els.scsTopCard.innerHTML = '';
      els.scsTopCard.appendChild(canvas);
      appendMiniPageOverlays(els.scsTopCard, pageIdx, { tinyStack: true });
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
  let createdDragCard = false;
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
    appendMiniPageOverlays(card, pageToDraw, { tinyStack: false });
    const posMap = computeGlobalTabPositionsMap(state.stickyTabs);
    const dragTab = state.stickyTabs.find((t) => t.page === pageToDraw + 1);
    if (dragTab) {
      const topPct = posMap.get(dragTab.page) ?? 20;
      card.appendChild(createAttachedTurningTabEl(dragTab, topPct, 'right'));
    }
    els.singleFlightLayer.appendChild(card);
    singleStackMeta.dragCard = card;
    createdDragCard = true;
  }
  if (createdDragCard) {
    renderBookEdgeTabs();
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
  if (state.magEnabled) scheduleMagnifierRedraw();
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
  card.dataset.pageIdx = String(flyingPageIdx);
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
  appendMiniPageOverlays(card, flyingPageIdx, { tinyStack: false });

  const posMap = computeGlobalTabPositionsMap(state.stickyTabs);
  const flyingTab = state.stickyTabs.find((t) => t.page === flyingPageIdx + 1);
  if (flyingTab) {
    const topPct = posMap.get(flyingTab.page) ?? 20;
    card.appendChild(createAttachedTurningTabEl(flyingTab, topPct, 'right'));
  }

  els.singleFlightLayer.appendChild(card);
  renderBookEdgeTabs();

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
    card.remove();
    if (singleStackMeta.activeFlights === 0) {
      updateSingleCollectedStack();
    }
    renderBookEdgeTabs();
    requestAnimationFrame(() => {
      if (state.magEnabled) scheduleMagnifierRedraw();
    });
  };
  anim.addEventListener('finish', finishFlight, { once: true });
  anim.addEventListener('cancel', finishFlight, { once: true });
  if (state.magEnabled) {
    state.magAnimUntil = Math.max(state.magAnimUntil, performance.now() + duration + 60);
    scheduleMagnifierRedraw();
  }
  return true;
}

function updateScrollCurrentTabHighlights(visible1Based) {
  if (els.scrollTabsRail && !els.scrollTabsRail.hidden) {
    for (const el of els.scrollTabsRail.children) {
      if (!el.classList?.contains('sticky-edge-tab')) continue;
      const p = Number(el.dataset.page);
      el.classList.toggle('is-current', visible1Based.has(p));
    }
  }
  if (els.scrollPages) {
    for (const el of els.scrollPages.querySelectorAll('.scroll-page-edge-tabs .sticky-edge-tab')) {
      const p = Number(el.dataset.page);
      el.classList.toggle('is-current', visible1Based.has(p));
    }
  }
}

function onSpreadChanged(persist = true, renderRadius = 5, { skipSingleStackSwap = false, withText = true, lightScroll = false } = {}) {
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

  if (lightScroll) {
    updateScrollCurrentTabHighlights(new Set(visible.map((i) => i + 1)));
    queueNearbyRenders(state.currentIndex, 0, { withText: false });
    if (state.magEnabled) scheduleMagnifierRedraw();
    return;
  }

  updateCenterShift();
  updateBookDepthChrome();
  updateSingleCollectedStack({ skipSwap: skipSingleStackSwap });
  updateBookmarkUi();
  updateHighlightsUi();
  highlightActiveThumbnail(visible);
  queueNearbyRenders(state.currentIndex, renderRadius, { withText });

  if (els.sideDrawer && !els.sideDrawer.hidden && document.querySelector('.drawer-tab[data-tab="text"]').classList.contains('active')) {
    refreshTextPane();
  }

  if (state.totalPages > 0) {
    const p = (visible[0] ?? 0) + 1;
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#p=${p}`);
  }
  if (state.magEnabled) {
    scheduleMagnifierRedraw();
    setTimeout(() => { if (state.magEnabled) scheduleMagnifierRedraw(); }, 500);
  }
  if (state.curtainEnabled) {
    scheduleCurtainBoundsSync(540);
  }
  if (persist) schedulePersistState();
}

/* ---------- Navigation History (Browser-Style Jump Back Stack) ---------- */
function updateNavBackUi() {
  if (!els.navBackPill) return;
  const count = state.navHistory.length;
  const visible = Boolean(state.pdfDoc && count > 0);
  els.navBackPill.hidden = !visible;
  if (!visible) return;
  const top = state.navHistory[count - 1];
  if (els.navBackLabel) {
    els.navBackLabel.textContent = `Back to p. ${top.page}`;
  }
  if (els.navBackCount) {
    els.navBackCount.hidden = count <= 1;
    els.navBackCount.textContent = String(count);
  }
}

function pushNavHistory(fromPage, reason = 'jump') {
  const p = clamp(Math.floor(fromPage) || 1, 1, Math.max(1, state.totalPages));
  const top = state.navHistory[state.navHistory.length - 1];
  if (top && top.page === p) return;
  state.navHistory.push({ page: p, reason });
  if (state.navHistory.length > 25) state.navHistory.shift();
  updateNavBackUi();
}

function jumpBackHistory() {
  if (!state.navHistory.length || !state.pdfDoc) return;
  const prev = state.navHistory.pop();
  updateNavBackUi();
  if (prev?.page) {
    jumpToPage(prev.page, false, { recordHistory: false, reason: 'back' });
  }
}

function clearNavHistory() {
  state.navHistory = [];
  updateNavBackUi();
}

/* ---------- Navigation Actions ---------- */
function goPrev() {
  if (state.scrollMode === 'scroll') {
    if (state.totalPages > 0) jumpToPage(Math.max(1, state.currentIndex), true, { recordHistory: false });
    return;
  }
  if (!state.pageFlip) return;
  state.pageFlip.flipPrev('bottom');
}

function goNext() {
  if (state.scrollMode === 'scroll') {
    if (state.totalPages > 0) jumpToPage(Math.min(state.totalPages, state.currentIndex + 2), true, { recordHistory: false });
    return;
  }
  if (!state.pageFlip) return;
  state.pageFlip.flipNext('bottom');
}

function jumpToPage(oneBasedPage, animate = false, { recordHistory = true, reason = 'jump' } = {}) {
  if (!state.totalPages) return;
  const targetIdx = clamp(Math.floor(oneBasedPage) - 1, 0, state.totalPages - 1);
  if (targetIdx !== state.currentIndex) {
    state.lastNavDir = targetIdx > state.currentIndex ? 1 : -1;
  }
  const currentVisible = getVisibleIndices();
  const fromPage = (currentVisible[0] ?? state.currentIndex ?? 0) + 1;
  if (recordHistory && !currentVisible.includes(targetIdx)) {
    pushNavHistory(fromPage, reason);
  }
  if (state.scrollMode === 'scroll') {
    const wrap = els.scrollPages.children[targetIdx];
    if (wrap) {
      const destTop = Math.max(0, getScrollWrapOffset(wrap).top - 54);
      const dist = Math.abs(destTop - els.scrollViewport.scrollTop);
      const pauseMs = animate ? clamp(Math.round(460 + dist * 0.28), 460, 1200) : 120;
      state.programmaticScrollUntil = performance.now() + pauseMs;
      if (animate) {
        state.autoScrollPauseUntil = performance.now() + pauseMs;
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
function getSnappedPanCoords() {
  const devDpr = window.devicePixelRatio || 1;
  return {
    x: Math.round(state.panX * devDpr) / devDpr,
    y: Math.round(state.panY * devDpr) / devDpr,
  };
}

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
  syncStickyTabScale(sw);
  state.pageFlip?.resize?.(sw, sh);

  // Reset CSS scale to exact 1 and snap pan to device pixels so WebKit/Blink paints native 4K+ Retina text cleanly
  const { x: px, y: py } = getSnappedPanCoords();
  els.zoomViewport.style.transform = `translate3d(${px}px, ${py}px, 0)`;
  updateCenterShift();
  updateBookDepthChrome();
  if (state.zoom > 1.05) clearSingleFlights();
  updateSingleCollectedStack();
  renderBookEdgeTabs();

  for (const idx of getVisibleIndices()) {
    renderPageNode(idx);
  }
  queueNearbyRenders(state.currentIndex, state.committedZoom >= 2.0 ? 1 : (state.committedZoom > 1.2 ? 2 : 4));
}

function applyZoomTransform(rerender = true, immediate = false) {
  const previewScale = state.committedZoom ? state.zoom / state.committedZoom : state.zoom;
  const { x: px, y: py } = getSnappedPanCoords();
  if (Math.abs(previewScale - 1) < 0.002) {
    els.zoomViewport.style.transform = `translate3d(${px}px, ${py}px, 0)`;
  } else {
    els.zoomViewport.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${previewScale})`;
  }
  const zoomed = state.zoom > 1.01;
  els.zoomViewport.classList.toggle('is-zoomed', zoomed);
  els.bookCenterShift?.classList?.toggle('is-zoomed', zoomed);
  state.pageFlip?.setInteractionDisabled?.(zoomed);
  hideHighlightPopover();
  if (state.magEnabled) scheduleMagnifierRedraw();
  if (state.curtainEnabled) positionFocusCurtain();
  syncEdgeTabsViewportBounds();

  if (rerender && state.pdfDoc) {
    clearTimeout(state.zoomRerenderTimer);
    if (immediate) {
      commitZoomLayout();
    } else {
      state.zoomRerenderTimer = setTimeout(commitZoomLayout, 150);
    }
  }
}

function clampZoomPan(nextX, nextY) {
  const sw = Math.max(120, Math.round(state.pageW * state.zoom));
  const sh = Math.max(160, Math.round(state.pageH * state.zoom));
  const single = isEffectiveSingleMode();
  const bookW = single ? sw : sw * 2;
  const maxX = Math.max(180, Math.round(bookW * 0.55 + 180));
  const maxY = Math.max(120, Math.round(sh * 0.55 + 64));
  return {
    x: clamp(nextX, -maxX, maxX),
    y: clamp(nextY, -maxY, maxY),
  };
}

function panZoomBy(dx, dy) {
  if (state.zoom <= 1.01) return;
  const clamped = clampZoomPan(state.panX + dx, state.panY + dy);
  state.panX = clamped.x;
  state.panY = clamped.y;
  applyZoomTransform(false);
}

function setZoom(nextZoom, immediate = false, anchor = null) {
  const prevZoom = state.zoom || 1;
  const z = clamp(Number(nextZoom) || 1, 1, MAX_PAGE_ZOOM);
  state.zoom = z <= 1.01 ? 1 : z;

  if (state.scrollMode === 'scroll') {
    hideHighlightPopover();
    state.panX = 0;
    state.panY = 0;
    if (els.zoomViewport) {
      els.zoomViewport.style.transform = '';
      els.zoomViewport.classList.remove('is-zoomed', 'is-panning');
    }
    if (state.magEnabled) scheduleMagnifierRedraw();

    if (state.pdfDoc && els.scrollPages.children.length) {
      const sv = els.scrollViewport;
      const measureScrollAnchor = () => {
        const svRect = sv.getBoundingClientRect();
        const spRect0 = els.scrollPages.getBoundingClientRect();
        const targetX = anchor && Number.isFinite(anchor.clientX) ? anchor.clientX : svRect.left + svRect.width / 2;
        const targetY = anchor && Number.isFinite(anchor.clientY) ? anchor.clientY : svRect.top + svRect.height / 2;
        const vpX = targetX - svRect.left;
        const vpY = targetY - svRect.top;

        const visEst = getVisibleScrollIndices();
        const estIdx = visEst.length ? visEst[Math.floor(visEst.length / 2)] : state.currentIndex;
        const approxIdx = clamp(estIdx, 0, els.scrollPages.children.length - 1);
        let anchorWrap = els.scrollPages.children[approxIdx] || els.scrollPages.children[0];
        let bestDist = Infinity;
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
        return {
          anchorWrap,
          relX: prevR.width > 0 ? (targetX - prevR.left) / prevR.width : 0.5,
          relY: prevR.height > 0 ? (targetY - prevR.top) / prevR.height : 0.5,
          vpX,
          vpY,
          docX: targetX - spRect0.left,
          docY: targetY - spRect0.top,
          scrollLockLeft: sv.scrollLeft,
          scrollLockTop: sv.scrollTop,
        };
      };

      const commitScroll = (info = null) => {
        const snapInfo = info || state.scrollPinchPreview || measureScrollAnchor();
        state.scrollPinchPreview = null;
        els.scrollPages.style.transform = '';
        sv.classList.remove('is-pinch-locked');

        const sw = Math.max(120, Math.round(state.pageW * state.zoom));
        const sh = Math.max(160, Math.round(state.pageH * state.zoom));
        els.scrollPages.style.setProperty('--scroll-page-w', `${sw}px`);
        els.scrollPages.style.setProperty('--scroll-page-h', `${sh}px`);
        syncStickyTabScale(sw);

        state.programmaticScrollUntil = performance.now() + 220;
        const wrapOff = getScrollWrapOffset(snapInfo.anchorWrap);
        sv.scrollLeft = Math.max(0, wrapOff.left + snapInfo.relX * sw - snapInfo.vpX);
        sv.scrollTop = Math.max(0, wrapOff.top + snapInfo.relY * sh - snapInfo.vpY);
        state.autoScrollPosY = sv.scrollTop;
        state.committedZoom = state.zoom;

        const visScroll = getVisibleScrollIndices();
        for (const i of visScroll) renderPageNode(i);
        queueNearbyRenders(state.currentIndex, state.committedZoom >= 2.0 ? 1 : (state.committedZoom > 1.2 ? 2 : 3));
        syncEdgeTabsViewportBounds();
        if (state.curtainEnabled) positionFocusCurtain();
        if (state.magEnabled) scheduleMagnifierRedraw();
      };

      clearTimeout(state.zoomRerenderTimer);
      if (immediate) {
        if (state.scrollPinchPreview) {
          els.scrollPages.style.transform = '';
          state.scrollPinchPreview = null;
        }
        sv.classList.remove('is-pinch-locked');
        commitScroll(measureScrollAnchor());
      } else {
        state.pinchLockScrollUntil = performance.now() + 280;
        if (!state.scrollPinchPreview) {
          els.scrollPages.style.transform = '';
          state.scrollPinchPreview = measureScrollAnchor();
          if (sv.offsetWidth === sv.clientWidth && sv.offsetHeight === sv.clientHeight) {
            sv.classList.add('is-pinch-locked');
          }
        }
        const p = state.scrollPinchPreview;
        const baseZoom = state.committedZoom || 1;
        const s = state.zoom / baseZoom;
        if (sv.scrollTop !== p.scrollLockTop || sv.scrollLeft !== p.scrollLockLeft) {
          state.programmaticScrollUntil = performance.now() + 220;
          sv.scrollLeft = p.scrollLockLeft;
          sv.scrollTop = p.scrollLockTop;
        }
        if (Math.abs(s - 1) < 0.002) {
          els.scrollPages.style.transform = '';
        } else {
          // Use identical exact scale factor for both tx/ty and CSS scale() so large scrollTop values (~1e6 px) never vibrate from toFixed(4) mismatch
          const sExact = Number(s.toFixed(6));
          const tx = p.docX * (1 - sExact);
          const ty = p.docY * (1 - sExact);
          els.scrollPages.style.transform = `translate3d(${tx.toFixed(3)}px, ${ty.toFixed(3)}px, 0) scale(${sExact})`;
        }
        if (!state.nativePinchActive) {
          state.zoomRerenderTimer = setTimeout(() => commitScroll(), 260);
        }
      }
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
    const clamped = clampZoomPan(
      dx + (state.panX - dx) * ratio,
      dy + (state.panY - dy) * ratio
    );
    state.panX = clamped.x;
    state.panY = clamped.y;
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

const THUMB_MAX_CONCURRENT = 3;
let thumbActiveCount = 0;
const thumbPendingQueue = [];

function pumpThumbnailQueue() {
  while (thumbActiveCount < THUMB_MAX_CONCURRENT && thumbPendingQueue.length > 0) {
    const job = thumbPendingQueue.shift();
    if (!job || !job.canvas?.isConnected || state.pdfDoc !== job.doc) continue;
    thumbActiveCount++;
    (async () => {
      try {
        const page = await job.doc.getPage(job.idx + 1);
        if (state.pdfDoc !== job.doc || !job.canvas.isConnected) return;
        const vp1 = page.getViewport({ scale: 1 });
        const scale = Math.min(130 / vp1.width, 180 / vp1.height);
        const vp = page.getViewport({ scale });
        job.canvas.width = Math.max(1, Math.floor(vp.width));
        job.canvas.height = Math.max(1, Math.floor(vp.height));
        const ctx = job.canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, job.canvas.width, job.canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
      } catch {
        // ignore
      } finally {
        thumbActiveCount = Math.max(0, thumbActiveCount - 1);
        pumpThumbnailQueue();
      }
    })();
  }
}

async function renderThumbnailCanvas(idx, canvas) {
  const doc = state.pdfDoc;
  if (!doc || !canvas || !canvas.isConnected) return;
  thumbPendingQueue.push({ doc, idx, canvas });
  pumpThumbnailQueue();
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
  const doc = state.pdfDoc;
  if (!doc) return;
  try {
    const outline = await doc.getOutline();
    if (state.pdfDoc !== doc) return;
    if (!outline || !outline.length) {
      els.tocList.innerHTML = '<div class="search-status">This PDF has no embedded table of contents.</div>';
      return;
    }

    const walk = async (items, depth) => {
      for (const item of items) {
        if (state.pdfDoc !== doc) return;
        let pageNum = null;
        try {
          let dest = item.dest;
          if (typeof dest === 'string') {
            dest = await doc.getDestination(dest);
          }
          if (state.pdfDoc !== doc) return;
          if (Array.isArray(dest) && dest[0]) {
            const pageIdx = await doc.getPageIndex(dest[0]);
            if (state.pdfDoc !== doc) return;
            pageNum = pageIdx + 1;
          }
        } catch {
          // ignore unresolvable destination
        }
        if (state.pdfDoc !== doc) return;
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
    if (state.pdfDoc === doc) {
      els.tocList.innerHTML = '<div class="search-status">Unable to load table of contents.</div>';
    }
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

function buildHighlightedSnippetHtml(rawSnippet, query) {
  if (!query) return escapeHtml(rawSnippet);
  const lowerRaw = rawSnippet.toLowerCase();
  const lowerQ = query.toLowerCase();
  const qLen = lowerQ.length;
  let out = '';
  let cursor = 0;
  while (cursor < rawSnippet.length) {
    const idx = lowerRaw.indexOf(lowerQ, cursor);
    if (idx === -1) {
      out += escapeHtml(rawSnippet.slice(cursor));
      break;
    }
    if (idx > cursor) out += escapeHtml(rawSnippet.slice(cursor, idx));
    out += `<mark>${escapeHtml(rawSnippet.slice(idx, idx + qLen))}</mark>`;
    cursor = idx + qLen;
  }
  return out;
}

async function runSearch(query) {
  const q = query.trim();
  state.searchQuery = q;
  const abortId = ++state.searchAbortId;
  const doc = state.pdfDoc;
  els.searchResults.innerHTML = '';

  const visOnStart = state.scrollMode === 'scroll' ? getVisibleScrollIndices() : getVisibleIndices();
  for (const idx of visOnStart) {
    paintSearchHighlightsOnPage(idx);
  }

  if (!q || !doc) {
    els.searchStatus.textContent = q ? 'No book loaded.' : '';
    return;
  }

  const lowerQ = q.toLowerCase();
  let matchPages = 0;
  els.searchStatus.textContent = `Searching 0 / ${state.totalPages} pages…`;

  for (let p = 1; p <= state.totalPages; p++) {
    if (abortId !== state.searchAbortId || state.pdfDoc !== doc) return;
    if (p % 12 === 0 || p === state.totalPages) {
      els.searchStatus.textContent = `Searching ${p} / ${state.totalPages} pages (${matchPages} matches)…`;
      await new Promise((r) => setTimeout(r, 0));
    }

    let txt = '';
    try {
      txt = await getPagePlainText(p);
    } catch {
      continue;
    }
    if (abortId !== state.searchAbortId || state.pdfDoc !== doc) return;
    const low = txt.toLowerCase();
    const pos = low.indexOf(lowerQ);
    if (pos !== -1) {
      matchPages++;
      const start = Math.max(0, pos - 42);
      const end = Math.min(txt.length, pos + q.length + 68);
      const rawSnippet = (start > 0 ? '…' : '') + txt.slice(start, end) + (end < txt.length ? '…' : '');
      const hitBtn = document.createElement('button');
      hitBtn.className = 'search-hit';
      hitBtn.innerHTML = `
        <div class="search-hit-page">Page ${p}</div>
        <div class="search-hit-snippet">${buildHighlightedSnippetHtml(rawSnippet, q)}</div>
      `;
      hitBtn.addEventListener('click', () => {
        jumpToPage(p, false);
        setTimeout(() => paintSearchHighlightsOnPage(p - 1), 60);
      });
      els.searchResults.appendChild(hitBtn);
    }
  }

  if (abortId !== state.searchAbortId || state.pdfDoc !== doc) return;
  els.searchStatus.textContent = matchPages
    ? `Found ${matchPages} page${matchPages === 1 ? '' : 's'} matching "${q}"`
    : `No matches found for "${q}"`;

  const visOnEnd = state.scrollMode === 'scroll' ? getVisibleScrollIndices() : getVisibleIndices();
  for (const idx of visOnEnd) {
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

  // Build normalized concatenated text stream across TextLayer text nodes so split spans match accurately
  const segments = [];
  let normText = '';
  const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
  let tNode;
  while ((tNode = walker.nextNode())) {
    if (tNode.parentElement?.closest?.('.endOfContent')) continue;
    const raw = tNode.nodeValue || '';
    if (!raw) continue;
    const startNorm = normText.length;
    normText += raw.toLowerCase();
    segments.push({ node: tNode, startNorm, endNorm: normText.length });
  }
  if (!normText || !segments.length) return;

  const findSegIndex = (normPos) => {
    let lo = 0;
    let hi = segments.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const seg = segments[mid];
      if (normPos < seg.startNorm) hi = mid - 1;
      else if (normPos >= seg.endNorm) lo = mid + 1;
      else return mid;
    }
    return -1;
  };

  let from = 0;
  let count = 0;
  while (from < normText.length && count < 200) {
    const pos = normText.indexOf(q, from);
    if (pos === -1) break;
    count++;
    const endPos = pos + q.length - 1;
    const sIdx = findSegIndex(pos);
    const eIdx = findSegIndex(endPos);
    if (sIdx !== -1 && eIdx !== -1) {
      const sSeg = segments[sIdx];
      const eSeg = segments[eIdx];
      try {
        const range = document.createRange();
        range.setStart(sSeg.node, pos - sSeg.startNorm);
        range.setEnd(eSeg.node, endPos - eSeg.startNorm + 1);
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
      } catch {
        // ignore invalid range boundaries
      }
    }
    from = pos + q.length;
  }
}

let textPaneSeq = 0;
async function refreshTextPane() {
  const doc = state.pdfDoc;
  if (!doc) return;
  const seq = ++textPaneSeq;
  const visible = getVisibleIndices();
  els.textPaneLabel.textContent = `Page ${formatSpreadLabel(visible)}`;
  const parts = [];
  for (const idx of visible) {
    try {
      const txt = await getPagePlainText(idx + 1);
      if (state.pdfDoc !== doc || seq !== textPaneSeq) return;
      parts.push(`--- Page ${idx + 1} ---\n${txt || '(No selectable text on this page)'}`);
    } catch {
      if (state.pdfDoc !== doc || seq !== textPaneSeq) return;
      parts.push(`--- Page ${idx + 1} ---\n(Unable to extract text from this page)`);
    }
  }
  if (state.pdfDoc !== doc || seq !== textPaneSeq) return;
  els.pageTextPreview.textContent = parts.join('\n\n');
}

/* ---------- Bookmarks & Physical Edge Sticky Tabs ---------- */
function normalizeStickyTabs(list) {
  if (!Array.isArray(list)) return [];
  const byPage = new Map();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const p = Math.floor(Number(item.page));
    if (!Number.isInteger(p) || p < 1) continue;
    const label = String(item.label || `p.${p}`).trim().slice(0, 18) || `p.${p}`;
    const color = STICKY_TAB_COLORS.includes(item.color) ? item.color : 'amber';
    byPage.set(p, {
      id: String(item.id || `tab-${p}`).slice(0, 64),
      page: p,
      label,
      color,
    });
  }
  return [...byPage.values()].sort((a, b) => a.page - b.page).slice(0, 200);
}

function computeGlobalTabPositionsMap(tabs) {
  const map = new Map();
  if (!tabs.length) return map;
  const sorted = [...tabs].sort((a, b) => a.page - b.page);
  const minY = 11;
  const maxY = 87;
  const span = maxY - minY;
  const gap = Math.min(7.2, span / Math.max(1, sorted.length));
  const totalPagesDenom = Math.max(1, state.totalPages - 1);

  const ys = sorted.map((t, i) => {
    const ratio = state.totalPages > 1 ? (t.page - 1) / totalPagesDenom : (sorted.length > 1 ? i / (sorted.length - 1) : 0.5);
    return clamp(minY + ratio * span, minY, maxY);
  });

  for (let i = 1; i < ys.length; i++) {
    if (ys[i] - ys[i - 1] < gap) ys[i] = ys[i - 1] + gap;
  }
  if (ys[ys.length - 1] > maxY) {
    ys[ys.length - 1] = maxY;
    for (let i = ys.length - 2; i >= 0; i--) {
      if (ys[i + 1] - ys[i] < gap) ys[i] = ys[i + 1] - gap;
    }
  }
  sorted.forEach((tab, i) => map.set(tab.page, clamp(ys[i], minY, maxY)));
  return map;
}

function getTurningTabPages() {
  const activePages = new Set();
  const pf = state.pageFlip;
  const single = pf ? Boolean(pf.single) : (isEffectiveSingleMode() || state.orientation === 'portrait');
  if (pf) {
    const flips = [
      ...(pf.interactiveFlip && pf.interactiveFlip.mode !== 'hover' && pf.interactiveFlip.wasDragged ? [pf.interactiveFlip] : []),
      ...(Array.isArray(pf.flyingFlips) ? pf.flyingFlips : []),
    ];
    for (const f of flips) {
      if (single) {
        const movingIdx = f.singlePrev ? f.toIdx : f.fromIdx;
        if (Number.isInteger(movingIdx)) activePages.add(movingIdx + 1);
      } else {
        if (Number.isInteger(f.fromIdx)) activePages.add(f.fromIdx + 1);
        if (Number.isInteger(f.toIdx)) activePages.add(f.toIdx + 1);
      }
    }
  }
  if (singleStackMeta.dragCard) {
    const idx = Number(singleStackMeta.dragCard.dataset.pageIdx);
    if (Number.isInteger(idx)) activePages.add(idx + 1);
  }
  if (els.singleFlightLayer?.children?.length) {
    for (const card of els.singleFlightLayer.children) {
      const idx = Number(card.dataset.pageIdx);
      if (Number.isInteger(idx)) activePages.add(idx + 1);
    }
  }
  return activePages;
}

function syncStickyTabScale(pageWidthPx) {
  const scale = clamp((pageWidthPx || state.pageW || 460) / 460, 0.78, 1.15);
  const val = scale.toFixed(4);
  els.bookShell?.style.setProperty('--tab-zoom', val);
  els.singleFlightLayer?.style.setProperty('--tab-zoom', val);
  els.scrollPages?.style.setProperty('--tab-zoom', val);
}

function measureContainerTabReach(containerEl, fallbackReach) {
  if (!containerEl || !containerEl.children.length) return fallbackReach;
  let maxReach = 0;
  for (const btn of containerEl.children) {
    if (!btn.classList?.contains('sticky-edge-tab') || btn.hidden) continue;
    const stackX = Math.max(0, parseFloat(btn.style.getPropertyValue('--tab-x') || '0') || 0);
    const faceEl = btn.querySelector('.sticky-tab-face') || btn;
    const faceW = faceEl.offsetWidth || 72;
    maxReach = Math.max(maxReach, stackX + faceW);
  }
  return maxReach > 0 ? Math.ceil(maxReach) : fallbackReach;
}

function syncEdgeTabsViewportBounds() {
  if (!state.pdfDoc) return;
  const tabZoom = parseFloat(els.bookShell?.style.getPropertyValue('--tab-zoom') || els.scrollPages?.style.getPropertyValue('--tab-zoom') || '1') || 1;
  const tabMaxOut = Math.round(98 * tabZoom);
  const margin = 8;

  if (state.scrollMode === 'scroll') {
    if (!els.scrollPages) return;
    const vis = getVisibleScrollIndices();
    const probeWrap = els.scrollPages.children[vis[0] ?? state.currentIndex ?? 0];
    if (!probeWrap) return;
    const wr = probeWrap.getBoundingClientRect();
    let scrollClampX = 0;
    if (wr.right <= window.innerWidth + 28 && wr.right + tabMaxOut > window.innerWidth - margin) {
      scrollClampX = Math.round((window.innerWidth - margin) - (wr.right + tabMaxOut));
    }
    els.scrollPages.style.setProperty('--scroll-edge-clamp-x', `${scrollClampX}px`);
    return;
  }

  if (!els.bookShell || els.bookShell.hidden) return;
  const sr = els.bookShell.getBoundingClientRect();
  if (!sr.width) return;

  if (els.bookEdgeTabsLeft) {
    const leftBaseX = sr.left + (parseFloat(els.bookShell.style.getPropertyValue('--tabs-offset-left') || '0') || 0);
    const leftReach = measureContainerTabReach(els.bookEdgeTabsLeft, (state.leftStackThick || 0) + tabMaxOut);
    let clampLeftX = 0;
    if (leftBaseX >= -leftReach && leftBaseX - leftReach < margin) {
      clampLeftX = Math.round((margin + leftReach) - leftBaseX);
    }
    els.bookEdgeTabsLeft.style.setProperty('--edge-clamp-x', `${clampLeftX}px`);
    els.bookEdgeTabsLeft.classList.toggle('is-edge-clamped', clampLeftX > 2);
  }

  if (els.bookEdgeTabsRight) {
    const rightBaseX = sr.right - (parseFloat(els.bookShell.style.getPropertyValue('--tabs-offset-right') || '0') || 0);
    const rightReach = measureContainerTabReach(els.bookEdgeTabsRight, (state.rightStackThick || 0) + tabMaxOut);
    let clampRightX = 0;
    if (rightBaseX <= window.innerWidth + rightReach && rightBaseX + rightReach > window.innerWidth - margin) {
      clampRightX = Math.round((window.innerWidth - margin) - (rightBaseX + rightReach));
    }
    els.bookEdgeTabsRight.style.setProperty('--edge-clamp-x', `${clampRightX}px`);
    els.bookEdgeTabsRight.classList.toggle('is-edge-clamped', clampRightX < -2);
  }
}

function createAttachedTurningTabEl(tab, topPct, sideDir) {
  const el = document.createElement('div');
  el.className = `sticky-edge-tab tab-${tab.color} tab-side-${sideDir}`;
  el.dataset.topPct = String(topPct);
  el.dataset.tabColor = tab.color;
  el.dataset.tabLabel = tab.label;
  el.dataset.sideDir = sideDir;
  el.style.setProperty('--tab-top', `${topPct.toFixed(2)}%`);
  el.innerHTML = `<span class="sticky-tab-dot"></span><span class="sticky-tab-text">${escapeHtml(tab.label)}</span>`;
  return el;
}

function renderTurningSheetTabs({ isHard, singlePrev, side, fromIdx, toIdx, downTabs, upTabs, hardFront, hardBack }) {
  if (!state.stickyTabs.length) return;
  const single = isEffectiveSingleMode() || state.orientation === 'portrait';
  const sheetPages = new Set();
  if (single) {
    const movingIdx = singlePrev ? toIdx : fromIdx;
    if (Number.isInteger(movingIdx)) sheetPages.add(movingIdx + 1);
  } else {
    if (Number.isInteger(fromIdx)) sheetPages.add(fromIdx + 1);
    if (Number.isInteger(toIdx)) sheetPages.add(toIdx + 1);
  }
  const matching = state.stickyTabs.filter((t) => sheetPages.has(t.page));
  if (!matching.length) return;

  const posMap = computeGlobalTabPositionsMap(state.stickyTabs);
  const frontSide = single ? 'right' : side;
  const backSide = single ? 'left' : (side === 'right' ? 'left' : 'right');

  for (const tab of matching) {
    const topPct = posMap.get(tab.page) ?? 20;
    if (isHard) {
      if (hardFront) hardFront.appendChild(createAttachedTurningTabEl(tab, topPct, frontSide));
      if (hardBack) hardBack.appendChild(createAttachedTurningTabEl(tab, topPct, backSide));
    } else if (singlePrev) {
      if (downTabs) downTabs.appendChild(createAttachedTurningTabEl(tab, topPct, 'right'));
    } else {
      if (downTabs) downTabs.appendChild(createAttachedTurningTabEl(tab, topPct, frontSide));
      if (upTabs) upTabs.appendChild(createAttachedTurningTabEl(tab, topPct, backSide));
    }
  }
}

function updateStickyEdgeTabElement(btn, tab, topPct, isCurrent, { stackOutPx = 0, stackSpan = 0, zIndex = null, withTail = true } = {}) {
  const nextClass = `sticky-edge-tab tab-${tab.color}${isCurrent ? ' is-current' : ''}`;
  if (btn.className !== nextClass) btn.className = nextClass;

  const nextTop = `${topPct.toFixed(2)}%`;
  if (btn.style.getPropertyValue('--tab-top') !== nextTop) {
    btn.style.setProperty('--tab-top', nextTop);
  }
  const nextX = `${stackOutPx}px`;
  if (btn.style.getPropertyValue('--tab-x') !== nextX) {
    btn.style.setProperty('--tab-x', nextX);
  }
  const nextTail = `${stackSpan}px`;
  if (btn.style.getPropertyValue('--tab-tail') !== nextTail) {
    btn.style.setProperty('--tab-tail', nextTail);
  }

  const nextZ = zIndex !== null ? String(zIndex) : '';
  if (btn.style.zIndex !== nextZ) btn.style.zIndex = nextZ;

  const pageStr = String(tab.page);
  if (btn.dataset.page !== pageStr) btn.dataset.page = pageStr;

  const nextTitle = `${tab.label} — Page ${tab.page} (Click to jump, Right-click to edit)`;
  if (btn.title !== nextTitle) btn.title = nextTitle;

  const hitEl = btn.querySelector('.sticky-tab-hit');
  if (hitEl && hitEl.title !== nextTitle) hitEl.title = nextTitle;
  const tailEl = btn.querySelector('.sticky-tab-tail');
  if (tailEl) tailEl.hidden = !withTail;
  const textEl = btn.querySelector('.sticky-tab-text');
  if (textEl && textEl.textContent !== tab.label) textEl.textContent = tab.label;
}

function createStickyEdgeTabElement(tab, topPct, isCurrent, opts = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.tabKey = String(tab.page);
  btn.innerHTML = `<span class="sticky-tab-face"><span class="sticky-tab-tail" aria-hidden="true"></span><span class="sticky-tab-dot"></span><span class="sticky-tab-text"></span></span><span class="sticky-tab-hit" aria-hidden="true"></span>`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = Number(btn.dataset.page);
    if (Number.isInteger(p)) jumpToPage(p, false, { reason: 'sticky-tab' });
  });
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const p = Number(btn.dataset.page);
    if (Number.isInteger(p)) openStickyTabPopover(p, { x: e.clientX, y: e.clientY });
  });
  updateStickyEdgeTabElement(btn, tab, topPct, isCurrent, opts);
  return btn;
}

function reconcileEdgeTabContainer(containerEl, entries, posMap, visible1Based, stackThick, isRightSide) {
  if (!containerEl) return;
  const existing = new Map();
  for (const child of Array.from(containerEl.children)) {
    const k = child.dataset?.tabKey;
    if (k) existing.set(k, child);
  }
  const keepKeys = new Set(entries.map((e) => String(e.page)));
  for (const [k, child] of existing) {
    if (!keepKeys.has(k)) {
      child.remove();
      existing.delete(k);
    }
  }

  const ordered = [];
  for (let rank = 0; rank < entries.length; rank++) {
    const tab = entries[rank];
    const key = String(tab.page);
    const isCur = visible1Based.has(tab.page);
    const ratio = isRightSide
      ? (isCur || state.totalPages <= tab.curLast ? 0 : clamp((tab.page - tab.curLast) / Math.max(1, state.totalPages - tab.curLast), 0, 1))
      : (isCur || tab.curFirst <= 1 ? 0 : clamp((tab.curFirst - tab.page) / Math.max(1, tab.curFirst - 1), 0, 1));
    const rawDepth = Math.round(ratio * stackThick);
    const depthPx = isCur
      ? 0
      : clamp(rawDepth, stackThick >= 2 ? 1 : 0, stackThick);
    const seamTail = stackThick > 0 ? clamp(isCur ? 3 : 4, 2, 5) : 0;
    const zIndex = isCur ? 260 : 200 - Math.min(180, rank);
    const opts = {
      stackOutPx: depthPx,
      stackSpan: seamTail,
      zIndex,
      withTail: seamTail > 0,
    };

    let btn = existing.get(key);
    if (btn) {
      updateStickyEdgeTabElement(btn, tab, posMap.get(tab.page) ?? 20, isCur, opts);
    } else {
      btn = createStickyEdgeTabElement(tab, posMap.get(tab.page) ?? 20, isCur, opts);
    }
    ordered.push(btn);
  }

  // Reorder or append only when actual DOM sequence differs so resting tabs stay undisturbed
  for (let i = 0; i < ordered.length; i++) {
    const desired = ordered[i];
    const currentAtIdx = containerEl.children[i];
    if (currentAtIdx !== desired) {
      containerEl.insertBefore(desired, currentAtIdx || null);
    }
  }
}

function renderSingleCollectedStackTabs(entries, posMap) {
  if (!els.scsTabsRail) return;
  els.scsTabsRail.innerHTML = '';
  if (!entries.length) return;

  const { h } = getSingleStackMetrics();
  const minGapPct = clamp((18 / Math.max(70, h)) * 100, 14, 26);
  const byAsc = [...entries].sort((a, b) => a.page - b.page);
  const pcts = byAsc.map((t) => clamp(posMap.get(t.page) ?? 24, 12, 82));
  for (let i = 1; i < pcts.length; i++) {
    if (pcts[i] < pcts[i - 1] + minGapPct) {
      pcts[i] = pcts[i - 1] + minGapPct;
    }
  }
  const over = pcts[pcts.length - 1] - 84;
  if (over > 0) {
    pcts[pcts.length - 1] = 84;
    for (let i = pcts.length - 2; i >= 0; i--) {
      if (pcts[i] > pcts[i + 1] - minGapPct) {
        pcts[i] = Math.max(10, pcts[i + 1] - minGapPct);
      }
    }
  }
  const pctByPage = new Map();
  byAsc.forEach((t, idx) => pctByPage.set(t.page, clamp(pcts[idx], 10, 84)));

  for (let i = 0; i < entries.length; i++) {
    const tab = entries[i];
    const ratio = tab.curFirst > 1 ? clamp((tab.curFirst - tab.page) / Math.max(1, tab.curFirst - 1), 0, 1) : 0;
    const scsDepthPx = Math.round(ratio * 7);
    const chip = document.createElement('span');
    chip.className = `scs-mini-tab tab-${tab.color}`;
    chip.setAttribute('role', 'button');
    chip.dataset.page = String(tab.page);
    const pct = pctByPage.get(tab.page) ?? 24;
    chip.style.setProperty('--scs-tab-top', `${pct.toFixed(1)}%`);
    chip.style.setProperty('--scs-depth-x', `${-scsDepthPx}px`);
    chip.style.zIndex = String(50 - Math.min(40, i));
    chip.title = `${tab.label} — Page ${tab.page} (Click to jump, Right-click to edit)`;
    chip.innerHTML = `<span class="sticky-tab-dot"></span><span class="sticky-tab-text">${escapeHtml(tab.label)}</span>`;
    chip.addEventListener('mousedown', (e) => e.stopPropagation());
    chip.addEventListener('pointerdown', (e) => e.stopPropagation());
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      jumpToPage(tab.page, false, { reason: 'sticky-tab' });
    });
    chip.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openStickyTabPopover(tab.page, { x: e.clientX, y: e.clientY });
    });
    els.scsTabsRail.appendChild(chip);
  }
}

function renderBookEdgeTabs() {
  if (!els.bookEdgeTabsLeft || !els.bookEdgeTabsRight) return;

  const tabs = [...state.stickyTabs].sort((a, b) => a.page - b.page);
  const posMap = computeGlobalTabPositionsMap(tabs);
  const visible = getVisibleIndices();
  const visible1Based = new Set(visible.map((i) => i + 1));

  if (state.scrollMode === 'scroll') {
    els.bookEdgeTabsLeft.innerHTML = '';
    els.bookEdgeTabsRight.innerHTML = '';
    renderSingleCollectedStackTabs([], posMap);
    syncStickyTabScale(Math.round(state.pageW * (state.zoom || 1)));

    // Render physical sticky tabs directly on each matching scroll page
    if (els.scrollPages) {
      for (const oldHolder of els.scrollPages.querySelectorAll('.scroll-page-edge-tabs')) {
        oldHolder.remove();
      }
      if (state.pdfDoc && tabs.length) {
        const tabsByPage = new Map();
        for (const tab of tabs) {
          if (!tabsByPage.has(tab.page)) tabsByPage.set(tab.page, []);
          tabsByPage.get(tab.page).push(tab);
        }
        for (const [pageNum, pageTabs] of tabsByPage) {
          const wrap = els.scrollPages.children[pageNum - 1];
          if (!wrap) continue;
          const holder = document.createElement('div');
          holder.className = 'book-edge-tabs book-edge-tabs-right scroll-page-edge-tabs';
          for (const t of pageTabs) {
            const topPct = posMap.get(t.page) ?? 20;
            holder.appendChild(createStickyEdgeTabElement(t, topPct, visible1Based.has(t.page), { withTail: false }));
          }
          wrap.appendChild(holder);
        }
      }
    }

    if (els.scrollTabsRail) {
      const prevScrollTop = els.scrollTabsRail.scrollTop;
      const prevCurPage = els.scrollTabsRail.dataset.lastCurrentPage || '';
      els.scrollTabsRail.innerHTML = '';
      els.scrollTabsRail.hidden = tabs.length === 0 || !state.pdfDoc;
      let activeEl = null;
      let nextCurPage = '';
      for (const tab of tabs) {
        const isCur = visible1Based.has(tab.page);
        const tabEl = createStickyEdgeTabElement(tab, 50, isCur, { withTail: false });
        if (isCur && !activeEl) {
          activeEl = tabEl;
          nextCurPage = String(tab.page);
        }
        els.scrollTabsRail.appendChild(tabEl);
      }
      els.scrollTabsRail.dataset.lastCurrentPage = nextCurPage;
      els.scrollTabsRail.scrollTop = prevScrollTop;
      if (activeEl && nextCurPage !== prevCurPage) {
        const top = activeEl.offsetTop;
        const bottom = top + activeEl.offsetHeight;
        const viewH = els.scrollTabsRail.clientHeight;
        if (viewH > 0) {
          if (top < els.scrollTabsRail.scrollTop) {
            els.scrollTabsRail.scrollTop = Math.max(0, top - 4);
          } else if (bottom > els.scrollTabsRail.scrollTop + viewH) {
            els.scrollTabsRail.scrollTop = bottom - viewH + 6;
          }
        }
      }
    }
    syncEdgeTabsViewportBounds();
    if (state.magEnabled) scheduleMagnifierRedraw();
    return;
  }

  if (els.scrollPages) {
    for (const oldHolder of els.scrollPages.querySelectorAll('.scroll-page-edge-tabs')) {
      oldHolder.remove();
    }
  }

  if (els.scrollTabsRail) {
    els.scrollTabsRail.innerHTML = '';
    els.scrollTabsRail.hidden = true;
  }
  if (!state.pdfDoc || !tabs.length) {
    els.bookEdgeTabsLeft.innerHTML = '';
    els.bookEdgeTabsRight.innerHTML = '';
    renderSingleCollectedStackTabs([], posMap);
    if (state.magEnabled) scheduleMagnifierRedraw();
    return;
  }

  const turningPages = getTurningTabPages();
  const single = isEffectiveSingleMode() || state.orientation === 'portrait';
  const curFirst = (visible[0] ?? 0) + 1;
  const curLast = (visible[visible.length - 1] ?? 0) + 1;
  const singleStackShown =
    single &&
    (canShowSingleCollectedStack(curFirst - 2) ||
      (curFirst > 1 && els.singleCollectedStack && !els.singleCollectedStack.hidden));

  let leftTabs = [];
  let rightTabs = [];
  if (single) {
    leftTabs = tabs.filter((t) => !turningPages.has(t.page) && t.page < curFirst);
    rightTabs = tabs.filter((t) => !turningPages.has(t.page) && t.page >= curFirst);
  } else {
    const leftCutoff = visible.length === 2
      ? curFirst
      : (visible[0] === state.totalPages - 1 && state.totalPages > 1 ? state.totalPages : 0);
    leftTabs = tabs.filter((t) => !turningPages.has(t.page) && t.page <= leftCutoff);
    rightTabs = tabs.filter((t) => !turningPages.has(t.page) && t.page > leftCutoff);
  }

  const leftThick = state.leftStackThick || 0;
  const rightThick = state.rightStackThick || 0;

  // Left stack: descending page order; Right stack: ascending page order (closer-to-open pages above)
  const leftSorted = [...leftTabs].sort((a, b) => b.page - a.page).map((t) => ({ ...t, curFirst, curLast }));
  const rightSorted = [...rightTabs].sort((a, b) => a.page - b.page).map((t) => ({ ...t, curFirst, curLast }));

  if (singleStackShown) {
    reconcileEdgeTabContainer(els.bookEdgeTabsLeft, [], posMap, visible1Based, leftThick, false);
    renderSingleCollectedStackTabs(leftSorted, posMap);
  } else {
    renderSingleCollectedStackTabs([], posMap);
    reconcileEdgeTabContainer(els.bookEdgeTabsLeft, leftSorted, posMap, visible1Based, leftThick, false);
  }
  reconcileEdgeTabContainer(els.bookEdgeTabsRight, rightSorted, posMap, visible1Based, rightThick, true);
  syncEdgeTabsViewportBounds();
  if (state.magEnabled) {
    state.magAnimUntil = Math.max(state.magAnimUntil || 0, performance.now() + 380);
    scheduleMagnifierRedraw();
  }
}

function syncStickyPopoverPageFields(targetPage) {
  state.stickyEditPage = clamp(targetPage, 1, Math.max(1, state.totalPages));
  if (els.stickyTabPageTag) els.stickyTabPageTag.textContent = `Page ${state.stickyEditPage}`;

  const existing = state.stickyTabs.find((t) => t.page === state.stickyEditPage);
  state.stickyEditColor = existing ? existing.color : (state.stickyEditColor || 'coral');

  if (els.stickyTabLabelInput) {
    els.stickyTabLabelInput.value = existing ? existing.label : '';
  }
  if (els.btnStickyTabRemove) {
    els.btnStickyTabRemove.hidden = !existing;
  }
  if (els.btnStickyTabSave) {
    els.btnStickyTabSave.textContent = existing ? 'Update Tab' : 'Add Tab';
  }
  els.stickyColorSwatches?.querySelectorAll('.sticky-color-dot').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.color === state.stickyEditColor);
  });

  const visible = getVisibleIndices().map((i) => i + 1);
  if (els.stickyTabSpreadPick && els.btnStickySideLeft && els.btnStickySideRight) {
    const hasSpread = visible.length === 2;
    els.stickyTabSpreadPick.hidden = !hasSpread;
    if (hasSpread) {
      els.btnStickySideLeft.textContent = `Left p. ${visible[0]}`;
      els.btnStickySideRight.textContent = `Right p. ${visible[1]}`;
      els.btnStickySideLeft.classList.toggle('active', state.stickyEditPage === visible[0]);
      els.btnStickySideRight.classList.toggle('active', state.stickyEditPage === visible[1]);
    }
  }
}

function positionFloatingBoxAt(el, x, y, fallbackW = 240, fallbackH = 220) {
  const pad = 12;
  const rect = !el.hidden ? el.getBoundingClientRect() : null;
  const boxW = rect?.width > 10 ? rect.width : fallbackW;
  const boxH = rect?.height > 10 ? rect.height : fallbackH;
  const maxX = Math.max(pad, window.innerWidth - boxW - pad);
  const maxY = Math.max(pad, window.innerHeight - boxH - pad);
  el.style.left = `${clamp(Math.round(x), pad, maxX)}px`;
  el.style.top = `${clamp(Math.round(y), pad, maxY)}px`;
  el.style.right = 'auto';
}

function openStickyTabPopover(explicitPage = null, anchorPos = null) {
  if (!state.pdfDoc || !els.stickyTabPopover) return;
  closePageContextMenu();
  const visible = getVisibleIndices().map((i) => i + 1);
  const existingOnSpread = visible.find((p) => state.stickyTabs.some((t) => t.page === p));
  const initialPage = explicitPage ?? existingOnSpread ?? visible[0] ?? 1;
  syncStickyPopoverPageFields(initialPage);
  if (anchorPos && Number.isFinite(anchorPos.x) && Number.isFinite(anchorPos.y)) {
    els.stickyTabPopover.hidden = false;
    positionFloatingBoxAt(els.stickyTabPopover, anchorPos.x + 8, anchorPos.y + 8, 256, 265);
  } else {
    els.stickyTabPopover.style.left = '';
    els.stickyTabPopover.style.top = '';
    els.stickyTabPopover.style.right = '';
    els.stickyTabPopover.hidden = false;
  }
  showBar('header', false);
  setTimeout(() => {
    els.stickyTabLabelInput?.focus();
    els.stickyTabLabelInput?.select();
  }, 20);
}

function closeStickyTabPopover() {
  if (!els.stickyTabPopover || els.stickyTabPopover.hidden) return;
  els.stickyTabPopover.hidden = true;
}

function formatMenuSnippet(str, maxLen = 22) {
  const clean = (str || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

function extractWordAtClientPoint(clientX, clientY) {
  let node = null;
  let offset = 0;
  if (typeof document.caretPositionFromPoint === 'function') {
    const pos = document.caretPositionFromPoint(clientX, clientY);
    if (pos) {
      node = pos.offsetNode;
      offset = pos.offset;
    }
  } else if (typeof document.caretRangeFromPoint === 'function') {
    const r = document.caretRangeFromPoint(clientX, clientY);
    if (r) {
      node = r.startContainer;
      offset = r.startOffset;
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return '';
  const el = node.parentElement;
  if (!el || !el.closest('.textLayer')) return '';
  const str = node.textContent || '';
  if (!str) return '';
  const isWordChar = (ch) => /[\p{L}\p{N}’'-]/u.test(ch);
  let idx = clamp(offset, 0, Math.max(0, str.length - 1));
  if (!isWordChar(str[idx]) && idx > 0 && isWordChar(str[idx - 1])) {
    idx -= 1;
  }
  if (!isWordChar(str[idx])) return '';
  let start = idx;
  let end = idx + 1;
  while (start > 0 && isWordChar(str[start - 1])) start--;
  while (end < str.length && isWordChar(str[end])) end++;
  return str.slice(start, end).replace(/^[’'-]+|[’'-]+$/g, '').trim();
}

async function performLookUpText(rawText, clientX, clientY) {
  const clean = (rawText || '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  if (document.documentElement.classList.contains('mac-native-window') && window.webkit?.messageHandlers?.flipbook) {
    window.webkit.messageHandlers.flipbook.postMessage({
      action: 'lookUp',
      text: clean.slice(0, 120),
      x: Math.round(clientX || window.innerWidth / 2),
      y: Math.round(clientY || window.innerHeight / 2),
    });
    return;
  }
  if (!els.lookupModal) return;
  const word = clean.split(/\s+/)[0].slice(0, 64);
  if (els.lookupWordTitle) els.lookupWordTitle.textContent = `Look Up “${word}”`;
  if (els.lookupPhonetic) {
    els.lookupPhonetic.textContent = '';
    els.lookupPhonetic.hidden = true;
  }
  if (els.lookupBody) els.lookupBody.textContent = 'Looking up definition…';
  if (els.lookupWebDictLink) {
    els.lookupWebDictLink.href = `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
  }
  if (els.lookupTranslateLink) {
    els.lookupTranslateLink.href = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(clean.slice(0, 800))}`;
  }
  els.lookupModal.hidden = false;
  try {
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry) throw new Error('No entry');
    if (els.lookupPhonetic && entry.phonetic) {
      els.lookupPhonetic.textContent = entry.phonetic;
      els.lookupPhonetic.hidden = false;
    }
    const meanings = (entry.meanings || []).slice(0, 3);
    if (!meanings.length) throw new Error('No meanings');
    if (els.lookupBody) {
      els.lookupBody.innerHTML = meanings.map((m) => {
        const defs = (m.definitions || []).slice(0, 2).map((d) => `<div class="lookup-def">• ${escapeHtml(d.definition || '')}</div>`).join('');
        return `<div class="lookup-pos">${escapeHtml(m.partOfSpeech || '')}</div>${defs}`;
      }).join('');
    }
  } catch {
    if (els.lookupBody) {
      els.lookupBody.textContent = `No offline dictionary match for “${clean.slice(0, 120)}”. Use Dictionary Web or Translate below.`;
    }
  }
}

function performTranslateText(rawText, clientX, clientY) {
  const clean = (rawText || '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  if (document.documentElement.classList.contains('mac-native-window') && window.webkit?.messageHandlers?.flipbook) {
    window.webkit.messageHandlers.flipbook.postMessage({
      action: 'translate',
      text: clean.slice(0, 1500),
      x: Math.round(clientX || window.innerWidth / 2),
      y: Math.round(clientY || window.innerHeight / 2),
    });
    return;
  }
  const url = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(clean.slice(0, 1500))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openPageContextMenu(clientX, clientY, pageNum, coords = null) {
  if (!state.pdfDoc || !els.pageContextMenu) return;
  closeStickyTabPopover();
  closeMarginNotePopover();
  const p = clamp(Math.floor(pageNum) || 1, 1, state.totalPages);
  state.ctxTargetPage = p;
  state.ctxPos = { x: clientX, y: clientY };
  state.ctxPageCoords = coords;

  const existingTab = state.stickyTabs.find((t) => t.page === p);
  const existingPin = state.pinnedRefs.find((r) => r.page === p && !r.crop);
  const isBm = state.bookmarks.includes(p);
  const selText = window.getSelection()?.toString()?.trim() || '';
  const wordUnderCursor = selText ? '' : extractWordAtClientPoint(clientX, clientY);
  const actionText = selText || wordUnderCursor;
  state.ctxActionText = actionText;
  state.ctxActionCoords = { x: clientX, y: clientY };

  if (els.ctxPageHeading) els.ctxPageHeading.textContent = `Page ${p}`;
  if (els.ctxPinPageLabel) {
    els.ctxPinPageLabel.textContent = existingPin ? `Unpin Page ${p} Card` : `Pin Page ${p} as Reference`;
  }
  if (els.ctxStickyTabLabel) {
    els.ctxStickyTabLabel.textContent = existingTab ? `Edit Tab "${existingTab.label}"…` : 'Add Sticky Tab…';
  }
  if (els.ctxStickyRemove) els.ctxStickyRemove.hidden = !existingTab;
  if (els.ctxBookmarkLabel) {
    els.ctxBookmarkLabel.textContent = isBm ? `Remove Bookmark (p. ${p})` : `Bookmark Page ${p}`;
  }

  const labelPreview = formatMenuSnippet(actionText);
  if (els.ctxSelDivider) els.ctxSelDivider.hidden = !actionText;
  if (els.ctxLookUp) els.ctxLookUp.hidden = !actionText;
  if (els.ctxLookUpLabel) els.ctxLookUpLabel.textContent = labelPreview ? `Look Up “${labelPreview}”` : 'Look Up';
  if (els.ctxTranslate) els.ctxTranslate.hidden = !actionText;
  if (els.ctxTranslateLabel) els.ctxTranslateLabel.textContent = labelPreview ? `Translate “${labelPreview}”` : 'Translate';
  if (els.ctxCopyText) els.ctxCopyText.hidden = !selText;

  els.pageContextMenu.hidden = false;
  positionFloatingBoxAt(els.pageContextMenu, clientX + 4, clientY + 4, 236, 290);
}

function closePageContextMenu() {
  if (!els.pageContextMenu || els.pageContextMenu.hidden) return;
  els.pageContextMenu.hidden = true;
}

function saveStickyTabFromPopover() {
  if (!state.pdfDoc || !state.stickyEditPage) return;
  const page = clamp(state.stickyEditPage, 1, state.totalPages);
  const rawLabel = (els.stickyTabLabelInput?.value || '').trim();
  const label = rawLabel.slice(0, 18) || `p.${page}`;
  const color = STICKY_TAB_COLORS.includes(state.stickyEditColor) ? state.stickyEditColor : 'amber';

  state.stickyTabs = normalizeStickyTabs([
    ...state.stickyTabs.filter((t) => t.page !== page),
    { id: `tab-${page}-${Date.now().toString(36)}`, page, label, color },
  ]);
  closeStickyTabPopover();
  updateBookmarkUi();
  schedulePersistState();
}

function removeStickyTabForPage(page) {
  state.stickyTabs = state.stickyTabs.filter((t) => t.page !== page);
  closeStickyTabPopover();
  updateBookmarkUi();
  schedulePersistState();
}

function updateBookmarkUi() {
  renderBookEdgeTabs();
  renderSavesDrawerPane();
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

const MARGIN_NOTE_COLORS = ['yellow', 'blue', 'mint', 'coral', 'violet'];
const snipThumbCache = new Map(); // `${page}:${l},${t},${w},${h}` -> HTMLCanvasElement

async function renderPdfRegionToCanvas(pageNum, cropRect = null, targetCssW = 340, scaleMult = 3) {
  if (!state.pdfDoc || !Number.isInteger(pageNum) || pageNum < 1 || pageNum > state.totalPages) {
    return null;
  }
  const pdfPage = await state.pdfDoc.getPage(pageNum);
  const vp1 = pdfPage.getViewport({ scale: 1 });
  const baseW = Math.max(240, targetCssW || 340);
  const scale = clamp((baseW * scaleMult) / Math.max(1, vp1.width), 1.5, 4.5);

  if (!cropRect) {
    const vp = pdfPage.getViewport({ scale: Math.min(scale, 3600 / Math.max(vp1.width, vp1.height)) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(vp.width));
    canvas.height = Math.max(1, Math.round(vp.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
    return canvas;
  }

  // Crop strictly to normalized percentages { l, t, w, h } at crisp HD resolution
  const fullScale = clamp((baseW * scaleMult) / Math.max(1, vp1.width * (cropRect.w / 100)), 2.2, 6.0);
  const maxAllowed = 4096 / Math.max(vp1.width, vp1.height);
  const renderScale = Math.min(fullScale, maxAllowed);
  const fullVp = pdfPage.getViewport({ scale: renderScale });

  const sx = Math.max(0, Math.floor((cropRect.l / 100) * fullVp.width));
  const sy = Math.max(0, Math.floor((cropRect.t / 100) * fullVp.height));
  const sw = Math.max(2, Math.min(Math.round(fullVp.width) - sx, Math.round((cropRect.w / 100) * fullVp.width)));
  const sh = Math.max(2, Math.min(Math.round(fullVp.height) - sy, Math.round((cropRect.h / 100) * fullVp.height)));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sw, sh);
  await pdfPage.render({
    canvasContext: ctx,
    viewport: fullVp,
    transform: [1, 0, 0, 1, -sx, -sy],
  }).promise;
  return canvas;
}

function getSnipCacheKey(page, rect) {
  return `${page}:${rect.l.toFixed(2)},${rect.t.toFixed(2)},${rect.w.toFixed(2)},${rect.h.toFixed(2)}`;
}

const nativePendingCallbacks = new Map();
let nativeCallbackSeq = 0;

window.__flipbookResolveNative = (id, ok) => {
  const resolve = nativePendingCallbacks.get(id);
  if (!resolve) return;
  nativePendingCallbacks.delete(id);
  resolve(Boolean(ok));
};

function callNativeBridgeAsync(action, payload = {}) {
  const handler = window.webkit?.messageHandlers?.flipbook;
  if (!handler) return Promise.resolve(null);
  const callbackId = `cb-${++nativeCallbackSeq}-${Date.now().toString(36)}`;
  return new Promise((resolve) => {
    nativePendingCallbacks.set(callbackId, resolve);
    try {
      handler.postMessage({ action, callbackId, ...payload });
    } catch {
      nativePendingCallbacks.delete(callbackId);
      resolve(false);
    }
  });
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  const nativeResult = await callNativeBridgeAsync('copyText', { text: String(text) });
  if (nativeResult !== null) return nativeResult;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
  } catch {
    // ignore clipboard permission errors
  }
  return false;
}

async function copyCanvasPngToClipboard(canvas) {
  if (!canvas) return false;
  if (window.webkit?.messageHandlers?.flipbook) {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const nativeResult = await callNativeBridgeAsync('copyPng', { dataUrl });
      if (nativeResult !== null) return nativeResult;
    } catch {
      // fall through to browser clipboard API
    }
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
  } catch {
    // ignore clipboard permission blocks cleanly
  }
  return false;
}

async function downloadCanvasPng(canvas, filename) {
  if (!canvas) return false;
  const dataUrl = canvas.toDataURL('image/png');
  if (window.webkit?.messageHandlers?.flipbook) {
    const nativeResult = await callNativeBridgeAsync('saveFile', {
      filename,
      ext: 'png',
      dataBase64: dataUrl,
    });
    if (nativeResult !== null) return nativeResult;
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
  return true;
}

async function saveTextFileNativeOrDownload(text, filename, ext = 'md', mime = 'text/markdown;charset=utf-8') {
  if (!text) return false;
  if (window.webkit?.messageHandlers?.flipbook) {
    const nativeResult = await callNativeBridgeAsync('saveFile', {
      filename,
      ext,
      text: String(text),
    });
    if (nativeResult !== null) return nativeResult;
  }
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/* ---------- 4. Pin Page / Diagram Floating Reference Cards ---------- */
function normalizePinnedRefs(list) {
  if (!Array.isArray(list)) return [];
  const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) * 1000) / 1000));
  const byId = new Map();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const p = Math.floor(Number(item.page));
    if (!Number.isInteger(p) || p < 1) continue;
    const crop = item.crop && typeof item.crop === 'object' && item.crop.w > 0 && item.crop.h > 0
      ? { l: clampPct(item.crop.l), t: clampPct(item.crop.t), w: clampPct(item.crop.w), h: clampPct(item.crop.h) }
      : null;
    const id = String(item.id || `pin-${p}-${crop ? 'crop' : 'page'}`).slice(0, 64);
    byId.set(id, {
      id,
      page: p,
      label: String(item.label || (crop ? `Diagram p. ${p}` : `Page ${p}`)).trim().slice(0, 48) || `Page ${p}`,
      crop,
      x: Math.round(Number.isFinite(Number(item.x)) ? Number(item.x) : 24),
      y: Math.round(Number.isFinite(Number(item.y)) ? Number(item.y) : 64),
      width: clamp(Math.round(Number(item.width) || 340), 220, 720),
      height: clamp(Math.round(Number(item.height) || 360), 180, 760),
      zoom: clamp(Math.round((Number(item.zoom) || 1) * 100) / 100, 0.75, 4.0),
      collapsed: Boolean(item.collapsed),
    });
  }
  return [...byId.values()].slice(0, 12);
}

let activeHoveredPinCtrl = null;

async function paintRefPinCanvas(pin, canvasEl, wrapEl, bodyEl, renderTokenRef) {
  if (!pin || !canvasEl || !state.pdfDoc) return;
  const token = ++renderTokenRef.seq;
  const bodyW = Math.max(180, (pin.width || 340) - 20);
  const targetCssW = bodyW * (pin.zoom || 1);
  const srcCanvas = await renderPdfRegionToCanvas(pin.page, pin.crop, targetCssW, 2.5);
  if (!srcCanvas || !canvasEl.isConnected || token !== renderTokenRef.seq) return;

  const ratio = srcCanvas.height / Math.max(1, srcCanvas.width);
  pin.aspectRatio = ratio;
  const cssW = Math.round(targetCssW);
  const cssH = Math.round(cssW * ratio);
  canvasEl.width = srcCanvas.width;
  canvasEl.height = srcCanvas.height;
  canvasEl.style.width = `${cssW}px`;
  canvasEl.style.height = `${cssH}px`;
  const ctx = canvasEl.getContext('2d', { alpha: false });
  ctx.drawImage(srcCanvas, 0, 0);
  if (wrapEl) {
    wrapEl.style.width = `${cssW}px`;
    wrapEl.style.height = `${cssH}px`;
  }
  if (bodyEl) {
    const canPan = bodyEl.scrollWidth > bodyEl.clientWidth + 1 || bodyEl.scrollHeight > bodyEl.clientHeight + 1;
    bodyEl.classList.toggle('is-pannable', canPan);
  }
}

function createRefPinCardElement(pin) {
  const card = document.createElement('section');
  card.className = `ref-pin-card${pin.collapsed ? ' is-collapsed' : ''}`;
  card.dataset.pinId = pin.id;
  const sr = els.stage?.getBoundingClientRect();
  const maxX = Math.max(12, (sr?.width || window.innerWidth) - pin.width - 12);
  const maxY = Math.max(54, (sr?.height || window.innerHeight) - 100);
  pin.x = clamp(pin.x, 12, maxX);
  pin.y = clamp(pin.y, 54, maxY);

  card.style.left = `${pin.x}px`;
  card.style.top = `${pin.y}px`;
  card.style.width = `${pin.width}px`;
  card.style.height = `${pin.height}px`;

  card.innerHTML = `
    <div class="ref-pin-head" title="Drag to reposition">
      <button type="button" class="ref-pin-title-btn" title="Jump main book to Page ${pin.page}">
        <span>📌 ${escapeHtml(pin.label)}</span>
      </button>
      <div class="ref-pin-ctrls">
        <button type="button" class="ref-pin-mini-btn" data-pin-act="zdec" title="Zoom out">−</button>
        <span class="ref-pin-zoom-label">${Math.round((pin.zoom || 1) * 100)}%</span>
        <button type="button" class="ref-pin-mini-btn" data-pin-act="zinc" title="Zoom in">+</button>
        <button type="button" class="ref-pin-mini-btn" data-pin-act="collapse" title="${pin.collapsed ? 'Expand' : 'Collapse'}">${pin.collapsed ? '▢' : '–'}</button>
        <button type="button" class="ref-pin-mini-btn ref-pin-close" data-pin-act="close" title="Unpin card">✕</button>
      </div>
    </div>
    <div class="ref-pin-body">
      <div class="ref-pin-canvas-wrap">
        <canvas class="ref-pin-canvas"></canvas>
      </div>
    </div>
    <div class="ref-pin-resize" title="Drag corner to resize card" aria-hidden="true"></div>
  `;

  const head = card.querySelector('.ref-pin-head');
  const titleBtn = card.querySelector('.ref-pin-title-btn');
  const zoomLbl = card.querySelector('.ref-pin-zoom-label');
  const bodyEl = card.querySelector('.ref-pin-body');
  const wrapEl = card.querySelector('.ref-pin-canvas-wrap');
  const canvasEl = card.querySelector('.ref-pin-canvas');
  const resizeGrip = card.querySelector('.ref-pin-resize');
  const renderTokenRef = { seq: 0 };
  let paintDebounce = null;

  const updateBodyPannable = () => {
    if (!bodyEl) return;
    const canPan = bodyEl.scrollWidth > bodyEl.clientWidth + 1 || bodyEl.scrollHeight > bodyEl.clientHeight + 1;
    bodyEl.classList.toggle('is-pannable', canPan);
  };

  const rerenderCard = (immediate = true) => {
    zoomLbl.textContent = `${Math.round((pin.zoom || 1) * 100)}%`;
    clearTimeout(paintDebounce);
    if (immediate) {
      paintRefPinCanvas(pin, canvasEl, wrapEl, bodyEl, renderTokenRef);
    } else {
      paintDebounce = setTimeout(() => {
        paintRefPinCanvas(pin, canvasEl, wrapEl, bodyEl, renderTokenRef);
      }, 65);
    }
  };

  const setPinZoom = (nextZoom, anchorClient = null, immediatePaint = false, { forceRepaint = false } = {}) => {
    const oldW = wrapEl?.offsetWidth || Math.round(Math.max(180, (pin.width || 340) - 20) * (pin.zoom || 1));
    const oldH = wrapEl?.offsetHeight || Math.round(oldW * (pin.aspectRatio || 1.35));
    const clampedZoom = clamp(Math.round(nextZoom * 10000) / 10000, 0.75, 4.0);
    if (Math.abs(clampedZoom - pin.zoom) < 0.0002) {
      if (forceRepaint && immediatePaint) rerenderCard(true);
      return;
    }
    pin.zoom = clampedZoom;

    const bodyW = Math.max(180, (pin.width || 340) - 20);
    const ratio = pin.aspectRatio || (oldH / Math.max(1, oldW));
    const newW = Math.round(bodyW * pin.zoom);
    const newH = Math.round(newW * ratio);

    if (bodyEl && wrapEl && canvasEl && oldW > 0 && oldH > 0) {
      const br = bodyEl.getBoundingClientRect();
      const localX = anchorClient ? clamp(anchorClient.clientX - br.left, 0, br.width) : br.width / 2;
      const localY = anchorClient ? clamp(anchorClient.clientY - br.top, 0, br.height) : br.height / 2;
      const wrapOffsetLeft = wrapEl.offsetLeft;
      const wrapOffsetTop = wrapEl.offsetTop;
      const contentRelX = clamp((bodyEl.scrollLeft + localX - wrapOffsetLeft) / oldW, 0, 1);
      const contentRelY = clamp((bodyEl.scrollTop + localY - wrapOffsetTop) / oldH, 0, 1);

      canvasEl.style.width = `${newW}px`;
      canvasEl.style.height = `${newH}px`;
      wrapEl.style.width = `${newW}px`;
      wrapEl.style.height = `${newH}px`;

      const nextPadX = Math.max(8, wrapEl.offsetLeft);
      const nextPadY = Math.max(8, wrapEl.offsetTop);
      bodyEl.scrollLeft = Math.max(0, nextPadX + contentRelX * newW - localX);
      bodyEl.scrollTop = Math.max(0, nextPadY + contentRelY * newH - localY);
      updateBodyPannable();
    }

    rerenderCard(immediatePaint);
    schedulePersistState();
  };

  const pinController = {
    card,
    pin,
    setZoom: (z, anchor, immediate = true, opts = undefined) => setPinZoom(z, anchor, immediate, opts),
    resetZoom: () => setPinZoom(1, null, true, { forceRepaint: true }),
  };
  card.__pinCtrl = pinController;

  const setHoveredPin = () => { activeHoveredPinCtrl = pinController; };
  card.addEventListener('pointerenter', setHoveredPin);
  card.addEventListener('pointermove', setHoveredPin, { passive: true });
  card.addEventListener('pointerdown', setHoveredPin);
  card.addEventListener('pointerleave', () => {
    if (activeHoveredPinCtrl === pinController) activeHoveredPinCtrl = null;
  });

  rerenderCard(true);

  card.addEventListener('pointerdown', (e) => e.stopPropagation());
  card.addEventListener('mousedown', (e) => e.stopPropagation());
  card.addEventListener('dblclick', (e) => e.stopPropagation());

  titleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    jumpToPage(pin.page, false, { reason: 'ref-pin' });
  });

  card.querySelectorAll('[data-pin-act]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = btn.dataset.pinAct;
      if (act === 'close') {
        if (activeHoveredPinCtrl === pinController) activeHoveredPinCtrl = null;
        removePinnedRef(pin.id);
      } else if (act === 'collapse') {
        pin.collapsed = !pin.collapsed;
        card.classList.toggle('is-collapsed', pin.collapsed);
        btn.textContent = pin.collapsed ? '▢' : '–';
        schedulePersistState();
      } else if (act === 'zdec') {
        setPinZoom(pin.zoom - 0.25, null, true);
      } else if (act === 'zinc') {
        setPinZoom(pin.zoom + 0.25, null, true);
      }
    });
  });

  // Trackpad pinch/Ctrl+Wheel zoom + two-finger pan inside floating reference card
  let remWheelX = 0;
  let remWheelY = 0;
  let wheelRepaintTimer = null;
  card.addEventListener('wheel', (e) => {
    e.stopPropagation();
    if (!bodyEl || pin.collapsed) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (!e.deltaY) return;
      const nextZoom = pin.zoom * Math.exp(-e.deltaY * 0.004);
      setPinZoom(nextZoom, { clientX: e.clientX, clientY: e.clientY }, false);
      clearTimeout(wheelRepaintTimer);
      wheelRepaintTimer = setTimeout(() => rerenderCard(true), 200);
      return;
    }
    const canScrollX = bodyEl.scrollWidth > bodyEl.clientWidth + 1;
    const canScrollY = bodyEl.scrollHeight > bodyEl.clientHeight + 1;
    if (e.isTrusted && (canScrollX || canScrollY) && e.target?.closest?.('.ref-pin-body')) {
      // Allow WebKit/Blink native compositor 120Hz trackpad momentum panning inside bodyEl
      return;
    }
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? Math.max(120, bodyEl.clientHeight * 0.85) : 1;
    remWheelX += (e.deltaX || 0) * unit;
    remWheelY += (e.deltaY || 0) * unit;
    const stepX = remWheelX > 0 ? Math.floor(remWheelX) : Math.ceil(remWheelX);
    const stepY = remWheelY > 0 ? Math.floor(remWheelY) : Math.ceil(remWheelY);
    if (stepX) {
      bodyEl.scrollLeft += stepX;
      remWheelX -= stepX;
    }
    if (stepY) {
      bodyEl.scrollTop += stepY;
      remWheelY -= stepY;
    }
  }, { passive: false });

  // Two-finger double-click / Smart Zoom inside preview body (replaces single double-click)
  card.__pinZoomToggle = (clientX, clientY) => {
    setPinZoom(pin.zoom > 1.05 ? 1 : 1.75, { clientX, clientY }, true);
  };
  bodyEl?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Single-pointer drag pan + touchscreen two-finger pan inside preview body
  let bodyPanStart = null;
  bodyEl?.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    bodyPanStart = {
      px: e.clientX,
      py: e.clientY,
      sl: bodyEl.scrollLeft,
      st: bodyEl.scrollTop,
    };
    bodyEl.classList.add('is-panning');
    bodyEl.setPointerCapture?.(e.pointerId);
  });
  bodyEl?.addEventListener('pointermove', (e) => {
    if (!bodyPanStart) return;
    bodyEl.scrollLeft = bodyPanStart.sl - (e.clientX - bodyPanStart.px);
    bodyEl.scrollTop = bodyPanStart.st - (e.clientY - bodyPanStart.py);
  });
  const endBodyPan = (e) => {
    if (!bodyPanStart) return;
    bodyPanStart = null;
    bodyEl.classList.remove('is-panning');
    try { bodyEl.releasePointerCapture?.(e.pointerId); } catch {}
  };
  bodyEl?.addEventListener('pointerup', endBodyPan);
  bodyEl?.addEventListener('pointercancel', endBodyPan);

  let pinTouchMid = null;
  bodyEl?.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      pinTouchMid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else {
      pinTouchMid = null;
    }
  }, { passive: true });
  bodyEl?.addEventListener('touchmove', (e) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (pinTouchMid) {
        e.preventDefault();
        bodyEl.scrollLeft -= mx - pinTouchMid.x;
        bodyEl.scrollTop -= my - pinTouchMid.y;
      }
      pinTouchMid = { x: mx, y: my };
    }
  }, { passive: false });
  bodyEl?.addEventListener('touchend', (e) => {
    e.stopPropagation();
    pinTouchMid = null;
  }, { passive: true });

  // Drag header to reposition anywhere on stage
  let dragStart = null;
  head?.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart = { px: e.clientX, py: e.clientY, origX: pin.x, origY: pin.y };
    head.setPointerCapture?.(e.pointerId);
  });
  head?.addEventListener('pointermove', (e) => {
    if (!dragStart) return;
    const stageR = els.stage?.getBoundingClientRect();
    const maxCardX = Math.max(12, (stageR?.width || window.innerWidth) - pin.width - 12);
    const maxCardY = Math.max(54, (stageR?.height || window.innerHeight) - 48);
    pin.x = clamp(Math.round(dragStart.origX + (e.clientX - dragStart.px)), 8, maxCardX);
    pin.y = clamp(Math.round(dragStart.origY + (e.clientY - dragStart.py)), 48, maxCardY);
    card.style.left = `${pin.x}px`;
    card.style.top = `${pin.y}px`;
  });
  const endHeadDrag = (e) => {
    if (!dragStart) return;
    dragStart = null;
    try { head.releasePointerCapture?.(e.pointerId); } catch {}
    schedulePersistState();
  };
  head?.addEventListener('pointerup', endHeadDrag);
  head?.addEventListener('pointercancel', endHeadDrag);

  // SE grip resize
  let resizeStart = null;
  resizeGrip?.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeStart = { px: e.clientX, py: e.clientY, origW: pin.width, origH: pin.height };
    resizeGrip.setPointerCapture?.(e.pointerId);
  });
  resizeGrip?.addEventListener('pointermove', (e) => {
    if (!resizeStart) return;
    pin.width = clamp(Math.round(resizeStart.origW + (e.clientX - resizeStart.px)), 220, 720);
    pin.height = clamp(Math.round(resizeStart.origH + (e.clientY - resizeStart.py)), 180, 760);
    card.style.width = `${pin.width}px`;
    card.style.height = `${pin.height}px`;
  });
  const endResize = (e) => {
    if (!resizeStart) return;
    resizeStart = null;
    try { resizeGrip.releasePointerCapture?.(e.pointerId); } catch {}
    rerenderCard(true);
    schedulePersistState();
  };
  resizeGrip?.addEventListener('pointerup', endResize);
  resizeGrip?.addEventListener('pointercancel', endResize);

  return card;
}

function renderRefPinsLayer() {
  if (!els.refPinsLayer) return;
  els.refPinsLayer.innerHTML = '';
  for (const pin of state.pinnedRefs) {
    els.refPinsLayer.appendChild(createRefPinCardElement(pin));
  }
}

function clampRefPinsToStage() {
  if (!els.refPinsLayer || !state.pinnedRefs.length) return;
  const sr = els.stage?.getBoundingClientRect();
  const stageW = sr?.width || window.innerWidth;
  const stageH = sr?.height || window.innerHeight;
  for (const pin of state.pinnedRefs) {
    const maxX = Math.max(12, stageW - pin.width - 12);
    const maxY = Math.max(54, stageH - 100);
    pin.x = clamp(pin.x, 12, maxX);
    pin.y = clamp(pin.y, 54, maxY);
    const card = els.refPinsLayer.querySelector(`.ref-pin-card[data-pin-id="${CSS.escape(pin.id)}"]`);
    if (card) {
      card.style.left = `${pin.x}px`;
      card.style.top = `${pin.y}px`;
    }
  }
}

function pinReferenceCard({ page, label = null, crop = null }) {
  if (!state.pdfDoc || !page) return null;
  const p = clamp(Math.floor(page), 1, state.totalPages);
  if (!crop) {
    const existing = state.pinnedRefs.find((r) => r.page === p && !r.crop);
    if (existing) {
      existing.collapsed = false;
      renderRefPinsLayer();
      schedulePersistState();
      return existing;
    }
  }
  if (state.pinnedRefs.length >= 12) {
    showToast('Maximum of 12 pinned reference cards reached — unpin one first.', { isError: true });
    return null;
  }
  const sr = els.stage?.getBoundingClientRect();
  const drawerBlockingRight = Boolean(els.sideDrawer && !els.sideDrawer.hidden);
  const w = crop ? clamp(Math.round(280 + crop.w * 2), 260, 460) : 320;
  const h = crop ? clamp(Math.round(140 + crop.h * 3), 220, 420) : 410;
  const offset = state.pinnedRefs.length * 24;
  const defaultX = drawerBlockingRight
    ? 22 + offset
    : Math.max(16, Math.round((sr?.width || window.innerWidth) - w - 28 - offset));
  const defaultY = clamp(62 + offset, 54, Math.max(60, (sr?.height || 700) - h - 60));

  const pin = {
    id: `pin-${p}-${Date.now().toString(36)}`,
    page: p,
    label: label || (crop ? `Diagram p. ${p}` : `Page ${p}`),
    crop: crop || null,
    x: defaultX,
    y: defaultY,
    width: w,
    height: h,
    zoom: 1,
    collapsed: false,
  };
  state.pinnedRefs = normalizePinnedRefs([...state.pinnedRefs, pin]);
  renderRefPinsLayer();
  schedulePersistState();
  return pin;
}

function removePinnedRef(id) {
  state.pinnedRefs = state.pinnedRefs.filter((r) => r.id !== id);
  renderRefPinsLayer();
  schedulePersistState();
}

function togglePinCurrentPage() {
  if (!state.pdfDoc) return;
  const visible = getVisibleIndices().map((i) => i + 1);
  const existing = state.pinnedRefs.find((r) => !r.crop && visible.includes(r.page));
  if (existing) {
    removePinnedRef(existing.id);
    return;
  }
  const targetPage = visible[0] || 1;
  pinReferenceCard({ page: targetPage });
}

/* ---------- 5. 3D Folded Post-It Margin Sticky Notes ---------- */
function normalizeMarginNotes(list) {
  if (!Array.isArray(list)) return [];
  const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) * 1000) / 1000));
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const page = Math.floor(Number(item.page));
    if (!Number.isInteger(page) || page < 1) continue;
    const text = String(item.text || '').slice(0, 2000);
    const snipRect = item.snipRect && typeof item.snipRect === 'object' && item.snipRect.w > 0 && item.snipRect.h > 0
      ? { l: clampPct(item.snipRect.l), t: clampPct(item.snipRect.t), w: clampPct(item.snipRect.w), h: clampPct(item.snipRect.h) }
      : null;
    if (!text.trim() && !snipRect) continue;
    out.push({
      id: String(item.id || `note-${page}-${out.length}`).slice(0, 64),
      page,
      xPct: clampPct(Number.isFinite(Number(item.xPct)) ? item.xPct : 8),
      yPct: clampPct(Number.isFinite(Number(item.yPct)) ? item.yPct : 14),
      color: MARGIN_NOTE_COLORS.includes(item.color) ? item.color : 'yellow',
      text,
      snipRect,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt.slice(0, 40) : '',
    });
  }
  return out.slice(0, 500);
}

const previewCanvasTokens = new WeakMap();

async function paintRegionIntoPreviewCanvas(pageNum, rect, canvasEl) {
  if (!canvasEl || !rect) return;
  const seq = (previewCanvasTokens.get(canvasEl) || 0) + 1;
  previewCanvasTokens.set(canvasEl, seq);
  const key = getSnipCacheKey(pageNum, rect);
  let src = snipThumbCache.get(key);
  if (!src) {
    canvasEl.width = 1;
    canvasEl.height = 1;
    src = await renderPdfRegionToCanvas(pageNum, rect, 240, 2.0);
    if (src) snipThumbCache.set(key, src);
  }
  if (!src || !canvasEl.isConnected || previewCanvasTokens.get(canvasEl) !== seq) return;
  canvasEl.width = src.width;
  canvasEl.height = src.height;
  canvasEl.getContext('2d', { alpha: false }).drawImage(src, 0, 0);
}

function showMarginNoteHoverCard(note, pinEl) {
  if (!els.marginNoteHoverCard || !note || !pinEl) return;
  if (els.marginNotePopover && !els.marginNotePopover.hidden) return;
  if (els.marginHoverColorDot) {
    els.marginHoverColorDot.className = `margin-hover-dot color-${note.color}`;
  }
  if (els.marginHoverTitle) {
    els.marginHoverTitle.textContent = `Sticky Note · p. ${note.page}`;
  }
  if (els.marginHoverText) {
    els.marginHoverText.textContent = note.text.trim() || '(Attached diagram snip)';
  }
  if (els.marginHoverThumb) {
    if (note.snipRect) {
      els.marginHoverThumb.hidden = false;
      paintRegionIntoPreviewCanvas(note.page, note.snipRect, els.marginHoverThumb);
    } else {
      els.marginHoverThumb.hidden = true;
    }
  }
  const r = pinEl.getBoundingClientRect();
  const estH = note.snipRect ? 210 : 110;
  positionFloatingBoxAt(els.marginNoteHoverCard, r.right + 10, r.top - 10, 248, estH);
  els.marginNoteHoverCard.hidden = false;
}

function hideMarginNoteHoverCard() {
  if (els.marginNoteHoverCard) els.marginNoteHoverCard.hidden = true;
}

function findVisiblePageNodeAtClient(clientX, clientY) {
  const candidates = [];
  const indices = state.scrollMode === 'scroll' ? getVisibleScrollIndices() : getVisibleIndices();
  for (const idx of indices) {
    const pageEl = state.pageNodes[idx];
    if (!pageEl || !pageEl.isConnected) continue;
    const r = pageEl.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) candidates.push({ idx, pageEl, r });
  }
  const exact = candidates.find(
    (c) => clientX >= c.r.left && clientX <= c.r.right && clientY >= c.r.top && clientY <= c.r.bottom
  );
  if (exact) return exact;
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const dx = Math.max(c.r.left - clientX, 0, clientX - c.r.right);
    const dy = Math.max(c.r.top - clientY, 0, clientY - c.r.bottom);
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

function paintMarginNotesOnPage(idx) {
  const node = state.pageNodes[idx];
  if (!node) return;
  const layer = node.querySelector('.fb-margin-notes');
  if (!layer) return;
  layer.innerHTML = '';
  const pageNum = idx + 1;
  for (const note of state.marginNotes) {
    if (note.page !== pageNum) continue;
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.draggable = false;
    pin.className = `fb-margin-note-pin color-${note.color}${note.snipRect ? ' has-snip' : ''}`;
    pin.style.left = `${note.xPct}%`;
    pin.style.top = `${note.yPct}%`;
    pin.setAttribute('aria-label', `Sticky note on page ${note.page}`);
    pin.innerHTML = `<span class="margin-pin-sheet"><span class="margin-pin-fold"></span></span>`;

    let justDragged = false;
    pin.addEventListener('dragstart', (e) => e.preventDefault());
    pin.addEventListener('mousedown', (e) => e.stopPropagation());
    pin.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    pin.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button !== 0) return;

      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      let lastX = startX;
      let lastY = startY;
      let moveRaf = 0;

      const applyFloatPos = () => {
        moveRaf = 0;
        if (!dragging) return;
        pin.style.transform = `translate3d(${lastX}px, ${lastY}px, 0) translate(-50%, -50%) rotate(0deg) scale(1.22)`;
      };

      const onWinMove = (ev) => {
        if (ev.pointerId !== undefined && e.pointerId !== undefined && ev.pointerId !== e.pointerId) return;
        lastX = ev.clientX;
        lastY = ev.clientY;
        if (!dragging && Math.hypot(lastX - startX, lastY - startY) > 3) {
          dragging = true;
          hideMarginNoteHoverCard();
          pin.classList.add('is-dragging');
          document.body.appendChild(pin);
          applyFloatPos();
          return;
        }
        if (dragging && !moveRaf) {
          moveRaf = requestAnimationFrame(applyFloatPos);
        }
      };

      const finishPinDrag = (ev) => {
        if (ev && ev.type !== 'blur' && ev.pointerId !== undefined && e.pointerId !== undefined && ev.pointerId !== e.pointerId) {
          return;
        }
        window.removeEventListener('pointermove', onWinMove, true);
        window.removeEventListener('pointerup', finishPinDrag, true);
        window.removeEventListener('pointercancel', finishPinDrag, true);
        window.removeEventListener('blur', finishPinDrag);
        if (moveRaf) {
          cancelAnimationFrame(moveRaf);
          moveRaf = 0;
        }
        if (!dragging) return;

        dragging = false;
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 60);
        pin.classList.remove('is-dragging');
        pin.style.transform = '';

        const dropX = Number.isFinite(ev?.clientX) ? ev.clientX : lastX;
        const dropY = Number.isFinite(ev?.clientY) ? ev.clientY : lastY;
        const target = findVisiblePageNodeAtClient(dropX, dropY);
        const dropIdx = target ? target.idx : idx;
        const dropRect = target ? target.r : node.getBoundingClientRect();
        if (dropRect.width > 0 && dropRect.height > 0) {
          note.page = dropIdx + 1;
          note.xPct = clamp(((dropX - dropRect.left) / dropRect.width) * 100, 2, 98);
          note.yPct = clamp(((dropY - dropRect.top) / dropRect.height) * 100, 2, 98);
        }
        pin.remove();
        paintMarginNotesOnPage(idx);
        if (dropIdx !== idx) paintMarginNotesOnPage(dropIdx);
        if (Number.isInteger(singleStackMeta.renderedIdx) && (singleStackMeta.renderedIdx === idx || singleStackMeta.renderedIdx === dropIdx)) {
          appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
        }
        state.pageFlip?.refreshSnapshots?.();
        updateBookmarkUi();
        updateHighlightsUi();
        schedulePersistState();
      };

      window.addEventListener('pointermove', onWinMove, true);
      window.addEventListener('pointerup', finishPinDrag, true);
      window.addEventListener('pointercancel', finishPinDrag, true);
      window.addEventListener('blur', finishPinDrag);
    });
    pin.addEventListener('pointerenter', () => {
      if (!pin.classList.contains('is-dragging')) showMarginNoteHoverCard(note, pin);
    });
    pin.addEventListener('pointerleave', () => hideMarginNoteHoverCard());
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      if (justDragged) return;
      hideMarginNoteHoverCard();
      const pr = pin.getBoundingClientRect();
      openMarginNotePopover({
        id: note.id,
        page: note.page,
        xPct: note.xPct,
        yPct: note.yPct,
        color: note.color,
        text: note.text,
        snipRect: note.snipRect,
        clientX: pr.right + 8,
        clientY: pr.top - 12,
      });
    });
    layer.appendChild(pin);
  }
}

function repaintAllMarginNotes() {
  const idxs = new Set([...state.renderedMap.keys(), ...getVisibleIndices()]);
  for (const idx of idxs) {
    paintMarginNotesOnPage(idx);
  }
}

function openMarginNotePopover({ id = null, page, xPct = 8, yPct = 14, color = 'yellow', text = '', snipRect = null, clientX = null, clientY = null }) {
  if (!state.pdfDoc || !els.marginNotePopover) return;
  hideMarginNoteHoverCard();
  closePageContextMenu();
  const existing = id ? state.marginNotes.find((n) => n.id === id) : null;
  state.marginEditDraft = {
    id: existing ? existing.id : null,
    page: clamp(Math.floor(page) || 1, 1, state.totalPages),
    xPct: clamp(Number(xPct), 2, 98),
    yPct: clamp(Number(yPct), 2, 98),
    color: MARGIN_NOTE_COLORS.includes(color) ? color : 'yellow',
    snipRect: snipRect || null,
  };

  if (els.marginNotePageTag) els.marginNotePageTag.textContent = `Page ${state.marginEditDraft.page}`;
  if (els.marginNoteTextInput) els.marginNoteTextInput.value = existing ? existing.text : (text || '');
  if (els.btnMarginNoteDelete) els.btnMarginNoteDelete.hidden = !existing;
  els.marginNoteColors?.querySelectorAll('.sticky-color-dot').forEach((d) => {
    d.classList.toggle('active', d.dataset.color === state.marginEditDraft.color);
  });
  if (els.marginNoteSnipPreviewWrap) {
    if (state.marginEditDraft.snipRect) {
      els.marginNoteSnipPreviewWrap.hidden = false;
      paintRegionIntoPreviewCanvas(state.marginEditDraft.page, state.marginEditDraft.snipRect, els.marginNoteSnipPreviewCanvas);
    } else {
      els.marginNoteSnipPreviewWrap.hidden = true;
    }
  }

  const posX = Number.isFinite(clientX) ? clientX : window.innerWidth * 0.5 - 145;
  const posY = Number.isFinite(clientY) ? clientY : window.innerHeight * 0.3;
  els.marginNotePopover.hidden = false;
  positionFloatingBoxAt(els.marginNotePopover, posX, posY, 290, state.marginEditDraft.snipRect ? 380 : 250);
  requestAnimationFrame(() => els.marginNoteTextInput?.focus());
}

function closeMarginNotePopover() {
  if (els.marginNotePopover) els.marginNotePopover.hidden = true;
  state.marginEditDraft = null;
}

function saveMarginNoteFromPopover() {
  const draft = state.marginEditDraft;
  if (!draft || !state.pdfDoc) return;
  const text = (els.marginNoteTextInput?.value || '').trim();
  if (!text && !draft.snipRect) {
    if (draft.id) deleteMarginNoteById(draft.id);
    else closeMarginNotePopover();
    return;
  }
  const entry = {
    id: draft.id || `note-${draft.page}-${Date.now().toString(36)}`,
    page: draft.page,
    xPct: draft.xPct,
    yPct: draft.yPct,
    color: draft.color,
    text,
    snipRect: draft.snipRect || null,
    createdAt: new Date().toISOString(),
  };
  if (draft.id) {
    state.marginNotes = state.marginNotes.map((n) => (n.id === draft.id ? entry : n));
  } else {
    state.marginNotes = normalizeMarginNotes([...state.marginNotes, entry]);
  }
  closeMarginNotePopover();
  paintMarginNotesOnPage(draft.page - 1);
  if (Number.isInteger(singleStackMeta.renderedIdx) && singleStackMeta.renderedIdx === draft.page - 1) {
    appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
  }
  state.pageFlip?.refreshSnapshots?.();
  updateHighlightsUi();
  schedulePersistState();
}

function deleteMarginNoteById(id) {
  const target = state.marginNotes.find((n) => n.id === id);
  if (!target) return;
  state.marginNotes = state.marginNotes.filter((n) => n.id !== id);
  if (state.marginEditDraft?.id === id) closeMarginNotePopover();
  paintMarginNotesOnPage(target.page - 1);
  if (Number.isInteger(singleStackMeta.renderedIdx) && singleStackMeta.renderedIdx === target.page - 1) {
    appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
  }
  state.pageFlip?.refreshSnapshots?.();
  updateHighlightsUi();
  schedulePersistState();
}

/* ---------- 6. 3x HD Diagram / Equation Snip Tool ---------- */
function setSnipToolActive(active) {
  const next = Boolean(active && state.pdfDoc);
  state.snipActive = next;
  if (els.snipOverlay) els.snipOverlay.hidden = !next;
  if (els.snipSelectionBox) els.snipSelectionBox.hidden = true;
  if (!next && els.snipResultCard) {
    els.snipResultCard.hidden = true;
    state.snipCapture = null;
  }
}

function toggleSnipTool() {
  if (!state.pdfDoc) return;
  setSnipToolActive(!state.snipActive);
}

async function executeSnipCapture(pageNode, selClientRect) {
  if (!pageNode || !state.pdfDoc) return;
  const idx = Number(pageNode.dataset.pageIndex);
  if (!Number.isFinite(idx)) return;
  const pageNum = idx + 1;
  const pr = pageNode.getBoundingClientRect();
  if (!pr.width || !pr.height) return;

  const left = clamp(selClientRect.left, pr.left, pr.right);
  const right = clamp(selClientRect.right, pr.left, pr.right);
  const top = clamp(selClientRect.top, pr.top, pr.bottom);
  const bottom = clamp(selClientRect.bottom, pr.top, pr.bottom);
  const cw = right - left;
  const ch = bottom - top;
  if (cw < 12 || ch < 12) return;

  const rect = {
    l: Math.round(((left - pr.left) / pr.width) * 1000) / 10,
    t: Math.round(((top - pr.top) / pr.height) * 1000) / 10,
    w: Math.round((cw / pr.width) * 1000) / 10,
    h: Math.round((ch / pr.height) * 1000) / 10,
  };
  if (rect.w < 1 || rect.h < 1) return;

  const hdCanvas = await renderPdfRegionToCanvas(pageNum, rect, cw, 3);
  if (!hdCanvas || !state.snipActive) return;

  state.snipCapture = { page: pageNum, rect, canvas: hdCanvas, cssW: cw, cssH: ch };
  if (els.snipPreviewCanvas) {
    els.snipPreviewCanvas.width = hdCanvas.width;
    els.snipPreviewCanvas.height = hdCanvas.height;
    els.snipPreviewCanvas.getContext('2d', { alpha: false }).drawImage(hdCanvas, 0, 0);
  }
  const copied = await copyCanvasPngToClipboard(hdCanvas);
  if (els.snipResultStatus) {
    els.snipResultStatus.textContent = copied
      ? `Copied 3× HD (${hdCanvas.width}×${hdCanvas.height})`
      : `Captured 3× HD (${hdCanvas.width}×${hdCanvas.height})`;
  }
  if (els.snipResultCard) {
    els.snipResultCard.hidden = false;
    positionFloatingBoxAt(
      els.snipResultCard,
      Math.min(window.innerWidth - 396, Math.max(16, right + 14)),
      Math.max(58, top),
      380,
      360
    );
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

function getFilteredSortedMarginNotes() {
  const visiblePages = new Set(getVisibleIndices().map((i) => i + 1));
  let list = state.marginNotes;
  if (state.hlFilterMode === 'current') {
    list = state.marginNotes.filter((n) => visiblePages.has(n.page));
  } else if (state.hlFilterMode === 'page' && Number.isInteger(state.hlFilterPage) && state.hlFilterPage >= 1) {
    list = state.marginNotes.filter((n) => n.page === state.hlFilterPage);
  }
  return [...list].sort((a, b) => (a.page - b.page) || (a.yPct - b.yPct) || (a.xPct - b.xPct));
}

function formatStudyNotesMarkdown(hlList, noteList) {
  const pagesMap = new Map();
  for (const hl of hlList) {
    if (!pagesMap.has(hl.page)) pagesMap.set(hl.page, { highlights: [], notes: [] });
    pagesMap.get(hl.page).highlights.push(hl);
  }
  for (const note of noteList) {
    if (!pagesMap.has(note.page)) pagesMap.set(note.page, { highlights: [], notes: [] });
    pagesMap.get(note.page).notes.push(note);
  }
  const pages = Array.from(pagesMap.keys()).sort((a, b) => a - b);
  if (!pages.length) return '';

  const lines = [`# ${state.bookTitle || 'FlipBook Reader'} — Study Notes`, ''];
  for (const p of pages) {
    const grp = pagesMap.get(p);
    lines.push(`## Page ${p}`);
    if (grp.notes.length) {
      lines.push('### Sticky Notes');
      for (const n of grp.notes) {
        const body = (n.text || '').trim().replace(/\n+/g, ' ');
        const tag = n.color ? `(${n.color})` : '';
        lines.push(`- **Note ${tag}:** ${body || '(Attached diagram snip)'}`);
        if (n.snipRect) {
          lines.push(`  - _Attached diagram snippet (${Math.round(n.snipRect.w)}% × ${Math.round(n.snipRect.h)}%, Page ${p})_`);
        }
      }
    }
    if (grp.highlights.length) {
      lines.push('### Highlights');
      for (const h of grp.highlights) {
        lines.push(`- [${h.color || 'yellow'}] ${h.text || '(Highlighted region)'}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

function formatHighlightsAsNotesText(list) {
  return formatStudyNotesMarkdown(list, getFilteredSortedMarginNotes());
}

function removeHighlightById(id) {
  const target = state.highlights.find((h) => h.id === id);
  if (!target) return;
  state.highlights = state.highlights.filter((x) => x.id !== id);
  if (state.activeHlDraft?.mode === 'edit' && state.activeHlDraft.id === id) {
    hideHighlightPopover();
  }
  paintUserHighlightsOnPage(target.page - 1);
  if (Number.isInteger(singleStackMeta.renderedIdx) && singleStackMeta.renderedIdx === target.page - 1) {
    appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
  }
  state.pageFlip?.refreshSnapshots?.();
  updateHighlightsUi();
  schedulePersistState();
}

function passesSavesPageFilter(pageNum, visiblePages) {
  if (state.hlFilterMode === 'current') return visiblePages.has(pageNum);
  if (state.hlFilterMode === 'page' && Number.isInteger(state.hlFilterPage) && state.hlFilterPage >= 1) {
    return pageNum === state.hlFilterPage;
  }
  return true;
}

function getFilteredSortedStickyTabs() {
  const visiblePages = new Set(getVisibleIndices().map((i) => i + 1));
  return [...state.stickyTabs]
    .filter((t) => passesSavesPageFilter(t.page, visiblePages))
    .sort((a, b) => a.page - b.page);
}

function getFilteredSortedBookmarks() {
  const visiblePages = new Set(getVisibleIndices().map((i) => i + 1));
  return [...state.bookmarks]
    .filter((p) => passesSavesPageFilter(p, visiblePages))
    .sort((a, b) => a - b);
}

function updateHighlightsUi() {
  const visiblePages = getVisibleIndices().map((i) => i + 1);
  if (els.btnHighlightsTop) {
    const visibleSet = new Set(visiblePages);
    const spreadHasItems =
      state.highlights.some((h) => visibleSet.has(h.page)) ||
      state.marginNotes.some((n) => visibleSet.has(n.page));
    els.btnHighlightsTop.classList.toggle('has-hl', spreadHasItems);
    els.btnHighlightsTop.classList.toggle('active', Boolean(els.sideDrawer && !els.sideDrawer.hidden));
  }
  renderSavesDrawerPane();
}

function renderSavesDrawerPane() {
  const drawerOpen = Boolean(els.sideDrawer && !els.sideDrawer.hidden);
  const savesPaneActive = Boolean(document.getElementById('paneBookmarks')?.classList.contains('active'));
  if (!drawerOpen || !savesPaneActive || !els.bookmarksList) {
    state.bookmarksUiDirty = true;
    state.highlightsUiDirty = true;
    return;
  }
  state.bookmarksUiDirty = false;
  state.highlightsUiDirty = false;

  const visiblePages = getVisibleIndices().map((i) => i + 1);
  const isBookmarked = visiblePages.some((p) => state.bookmarks.includes(p));
  if (els.btnToggleCurrentBookmark) {
    els.btnToggleCurrentBookmark.textContent = isBookmarked ? '★ Remove Bookmark' : '+ Bookmark';
  }

  const filteredTabs = getFilteredSortedStickyTabs();
  const filteredNotes = getFilteredSortedMarginNotes();
  const filteredHls = getFilteredSortedHighlights();
  const filteredBookmarks = getFilteredSortedBookmarks();

  const cat = state.savesCategory || 'all';
  const showSticky = cat === 'all' || cat === 'sticky';
  const showHls = cat === 'all' || cat === 'highlights';
  const showBookmarks = cat === 'all' || cat === 'bookmarks';

  const stickyAllCount = state.stickyTabs.length + state.marginNotes.length;
  const hlsAllCount = state.highlights.length;
  const bmAllCount = state.bookmarks.length;
  const totalAllCount = stickyAllCount + hlsAllCount + bmAllCount;

  const stickyPageCount = filteredTabs.length + filteredNotes.length;
  const visibleCount =
    (showSticky ? stickyPageCount : 0) +
    (showHls ? filteredHls.length : 0) +
    (showBookmarks ? filteredBookmarks.length : 0);

  if (els.savesSummary) {
    if (state.hlFilterMode === 'page' && state.hlFilterPage) {
      els.savesSummary.textContent = `Page ${state.hlFilterPage}: ${visibleCount} saved`;
    } else if (state.hlFilterMode === 'current') {
      const lbl = visiblePages.length === 2 ? `Pages ${visiblePages[0]}-${visiblePages[1]}` : `Page ${visiblePages[0] || 1}`;
      els.savesSummary.textContent = `${lbl}: ${visibleCount} saved`;
    } else {
      els.savesSummary.textContent = `${totalAllCount} saved`;
    }
  }

  const notesAndHlPageCount = filteredHls.length + filteredNotes.length;
  const totalNotesAndHlCount = hlsAllCount + state.marginNotes.length;
  const isBmOnly = cat === 'bookmarks';
  if (els.btnCopyPageNotes) els.btnCopyPageNotes.hidden = isBmOnly || notesAndHlPageCount === 0;
  if (els.btnExportMarkdown) els.btnExportMarkdown.hidden = isBmOnly || notesAndHlPageCount === 0;
  if (els.btnToggleNotesView) {
    els.btnToggleNotesView.classList.toggle('active', !!state.hlNotesView);
    els.btnToggleNotesView.textContent = state.hlNotesView ? 'List View' : 'Notes View';
  }
  if (els.btnClearHighlights) els.btnClearHighlights.hidden = isBmOnly || totalNotesAndHlCount === 0;
  if (els.btnClearPageHighlights) {
    els.btnClearPageHighlights.hidden = isBmOnly || !(state.hlFilterMode !== 'all' && notesAndHlPageCount > 0);
  }
  if (els.savesClearRow) {
    els.savesClearRow.hidden = isBmOnly || totalNotesAndHlCount === 0;
  }

  // Category chips: All / Sticky / Highlights / Bookmarks
  if (els.savesCategoryChips) {
    els.savesCategoryChips.innerHTML = '';
    const cats = [
      { id: 'all', label: `All (${totalAllCount})` },
      { id: 'sticky', label: `Sticky (${stickyAllCount})` },
      { id: 'highlights', label: `Highlights (${hlsAllCount})` },
      { id: 'bookmarks', label: `Bookmarks (${bmAllCount})` },
    ];
    for (const c of cats) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hl-page-chip${cat === c.id ? ' active' : ''}`;
      btn.dataset.savesCat = c.id;
      btn.textContent = c.label;
      btn.addEventListener('click', () => {
        state.savesCategory = c.id;
        renderSavesDrawerPane();
      });
      els.savesCategoryChips.appendChild(btn);
    }
  }

  // Page filter chips (All Pages / This Page) + Page select dropdown
  const perPageCounts = new Map();
  for (const t of state.stickyTabs) perPageCounts.set(t.page, (perPageCounts.get(t.page) || 0) + 1);
  for (const n of state.marginNotes) perPageCounts.set(n.page, (perPageCounts.get(n.page) || 0) + 1);
  for (const hl of state.highlights) perPageCounts.set(hl.page, (perPageCounts.get(hl.page) || 0) + 1);
  for (const bp of state.bookmarks) perPageCounts.set(bp, (perPageCounts.get(bp) || 0) + 1);

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
    addChip('All Pages', state.hlFilterMode === 'all', () => {
      state.hlFilterMode = 'all';
      state.hlFilterPage = null;
      renderSavesDrawerPane();
    });
    addChip('This Page', state.hlFilterMode === 'current', () => {
      state.hlFilterMode = 'current';
      state.hlFilterPage = null;
      renderSavesDrawerPane();
    });
  }

  if (els.hlPageSelect) {
    const pages = Array.from(perPageCounts.keys()).sort((a, b) => a - b);
    els.hlPageSelect.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = pages.length ? `All pages (${pages.length})` : 'No saves yet';
    els.hlPageSelect.appendChild(defaultOpt);

    for (const p of pages) {
      const n = perPageCounts.get(p);
      const opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = `Page ${p} (${n} ${n === 1 ? 'item' : 'items'})`;
      els.hlPageSelect.appendChild(opt);
    }
    els.hlPageSelect.value =
      state.hlFilterMode === 'page' && state.hlFilterPage && perPageCounts.has(state.hlFilterPage)
        ? String(state.hlFilterPage)
        : '';
    els.hlPageSelect.disabled = pages.length === 0;
  }

  els.bookmarksList.hidden = !!state.hlNotesView;
  if (els.hlNotesSheet) els.hlNotesSheet.hidden = !state.hlNotesView;

  if (!state.hlNotesView) {
    els.bookmarksList.innerHTML = '';
    if (!visibleCount) {
      const emptyMsg = totalAllCount === 0
        ? 'No saves yet — add a Sticky Note, Sticky Tab, Highlight, or Bookmark on any page.'
        : 'No matching saves in this filter.';
      els.bookmarksList.innerHTML = `<div class="search-status">${emptyMsg}</div>`;
      return;
    }

    const addSectionHead = (label) => {
      if (cat !== 'all') return;
      const h = document.createElement('div');
      h.className = 'saves-section-head';
      h.textContent = label;
      els.bookmarksList.appendChild(h);
    };

    // 1. Sticky Tabs & Margin Sticky Notes
    if (showSticky && stickyPageCount > 0) {
      addSectionHead(`Sticky Tabs & Notes (${stickyPageCount})`);
      for (const tab of filteredTabs) {
        const row = document.createElement('div');
        row.className = 'toc-item';
        row.innerHTML = `
          <span class="drawer-tab-pill">
            <span class="drawer-tab-swatch color-${tab.color}"></span>
            <span>${escapeHtml(tab.label)} — p. ${tab.page}</span>
          </span>
          <span class="drawer-item-actions">
            <button class="drawer-edit-btn" data-action="edit" title="Edit sticky tab">✎</button>
            <button class="drawer-close" data-action="remove" title="Remove">✕</button>
          </span>
        `;
        row.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (btn?.dataset.action === 'remove') {
            e.stopPropagation();
            removeStickyTabForPage(tab.page);
            return;
          }
          if (btn?.dataset.action === 'edit') {
            e.stopPropagation();
            openStickyTabPopover(tab.page);
            return;
          }
          jumpToPage(tab.page, false, { reason: 'sticky-tab' });
        });
        els.bookmarksList.appendChild(row);
      }

      for (const n of filteredNotes) {
        const row = document.createElement('div');
        row.className = 'hl-item';
        row.innerHTML = `
          <span class="hl-item-dot color-${n.color === 'blue' ? 'blue' : n.color === 'mint' ? 'green' : n.color === 'coral' ? 'pink' : n.color === 'violet' ? 'orange' : 'yellow'}"></span>
          <div class="hl-item-body">
            <div class="hl-item-meta"><span class="hl-note-item-badge">Note</span>Page ${n.page}${n.snipRect ? ' · Diagram' : ''}</div>
            <div class="hl-item-snippet">${escapeHtml(n.text || '(Attached diagram snippet)')}</div>
          </div>
          <button class="drawer-close hl-row-del" title="Delete sticky note" aria-label="Delete sticky note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        `;
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          if (e.target.closest('button')) {
            deleteMarginNoteById(n.id);
            return;
          }
          jumpToPage(n.page, false);
          openMarginNotePopover({ id: n.id, page: n.page, xPct: n.xPct, yPct: n.yPct, color: n.color, text: n.text, snipRect: n.snipRect });
        });
        els.bookmarksList.appendChild(row);
      }
    }

    // 2. Highlights
    if (showHls && filteredHls.length > 0) {
      addSectionHead(`Highlights (${filteredHls.length})`);
      for (const hl of filteredHls) {
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
        els.bookmarksList.appendChild(row);
      }
    }

    // 3. Bookmarks
    if (showBookmarks && filteredBookmarks.length > 0) {
      addSectionHead(`Bookmarks (${filteredBookmarks.length})`);
      for (const p of filteredBookmarks) {
        const row = document.createElement('div');
        row.className = 'toc-item';
        row.innerHTML = `<span>★ Bookmark — Page ${p}</span><button class="drawer-close" title="Remove">✕</button>`;
        row.addEventListener('click', (e) => {
          if (e.target.closest('button')) {
            state.bookmarks = state.bookmarks.filter((x) => x !== p);
            updateBookmarkUi();
            schedulePersistState();
            return;
          }
          jumpToPage(p, false, { reason: 'bookmark' });
        });
        els.bookmarksList.appendChild(row);
      }
    }
    return;
  }

  // Consolidated reading-order Notes View (Sticky Notes + Highlights)
  if (els.hlNotesSheet) {
    els.hlNotesSheet.innerHTML = '';
    if (!notesAndHlPageCount) {
      const emptyNotes = totalNotesAndHlCount === 0
        ? 'No sticky notes or highlights yet — Alt+Click a page margin or select text to highlight.'
        : 'No sticky notes or highlights on the selected page yet.';
      els.hlNotesSheet.innerHTML = `<div class="search-status">${emptyNotes}</div>`;
      return;
    }
    const groups = new Map();
    for (const n of filteredNotes) {
      if (!groups.has(n.page)) groups.set(n.page, { notes: [], highlights: [] });
      groups.get(n.page).notes.push(n);
    }
    for (const hl of filteredHls) {
      if (!groups.has(hl.page)) groups.set(hl.page, { notes: [], highlights: [] });
      groups.get(hl.page).highlights.push(hl);
    }
    const pages = Array.from(groups.keys()).sort((a, b) => a - b);
    for (const pageNum of pages) {
      const grp = groups.get(pageNum);
      const count = grp.notes.length + grp.highlights.length;
      const card = document.createElement('section');
      card.className = 'hl-notes-group';

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'hl-notes-group-head';
      head.innerHTML = `<span>Page ${pageNum} Study Notes</span><span class="toc-page">${count} ${count === 1 ? 'item' : 'items'}</span>`;
      head.addEventListener('click', () => jumpToPage(pageNum, false));
      card.appendChild(head);

      const listEl = document.createElement('div');
      listEl.className = 'hl-notes-entries';
      for (const n of grp.notes) {
        const entry = document.createElement('div');
        entry.className = `hl-note-entry color-${n.color === 'blue' ? 'blue' : n.color === 'mint' ? 'green' : n.color === 'coral' ? 'pink' : n.color === 'violet' ? 'orange' : 'yellow'}`;
        entry.innerHTML = `
          <div class="hl-note-text"><span class="hl-note-item-badge">Note</span>${escapeHtml(n.text || '(Attached diagram snip)')}</div>
          <button class="drawer-close hl-row-del hl-note-del" title="Delete sticky note" aria-label="Delete sticky note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        `;
        entry.querySelector('.hl-note-del')?.addEventListener('click', () => deleteMarginNoteById(n.id));
        listEl.appendChild(entry);
      }
      for (const hl of grp.highlights) {
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
      if (Number.isInteger(singleStackMeta.renderedIdx) && singleStackMeta.renderedIdx === target.page - 1) {
        appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
      }
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
      if (Number.isInteger(singleStackMeta.renderedIdx) && singleStackMeta.renderedIdx === ent.page - 1) {
        appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
      }
    }
    try {
      window.getSelection()?.removeAllRanges?.();
    } catch {}
  }

  state.pageFlip?.refreshSnapshots?.();
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
    if (Number.isInteger(singleStackMeta.renderedIdx) && singleStackMeta.renderedIdx === idx) {
      appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
    }
  }
  try {
    window.getSelection()?.removeAllRanges?.();
  } catch {}
  state.pageFlip?.refreshSnapshots?.();
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
async function openPdfSource(source, { title = 'Book', bookId = null, startPage = 1, bookmarks = [], stickyTabs = [], highlights = [], marginNotes = [], pinnedRefs = [] } = {}) {
  flushPersistState();
  els.loadingText.textContent = `Opening ${title}…`;
  els.loadingOverlay.hidden = false;
  els.welcomeOverlay.hidden = true;
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
    state.stickyTabs = normalizeStickyTabs(stickyTabs);
    state.highlights = normalizeHighlightsList(highlights);
    state.marginNotes = normalizeMarginNotes(marginNotes);
    state.pinnedRefs = normalizePinnedRefs(pinnedRefs);
    clearNavHistory();

    // Recover saved local progress if missing from server entry
    let targetPage = Number.isFinite(Number(startPage)) && Number(startPage) >= 1 ? Math.floor(Number(startPage)) : null;
    if (bookId) {
      try {
        const local = JSON.parse(localStorage.getItem(`flipbook:${bookId}`) || 'null');
        if (!targetPage && local?.lastPage) targetPage = local.lastPage;
        if (Array.isArray(local?.bookmarks) && !state.bookmarks.length) state.bookmarks = local.bookmarks;
        if (Array.isArray(local?.stickyTabs) && !state.stickyTabs.length) {
          state.stickyTabs = normalizeStickyTabs(local.stickyTabs);
        }
        if (Array.isArray(local?.highlights) && !state.highlights.length) {
          state.highlights = normalizeHighlightsList(local.highlights);
        }
        if (Array.isArray(local?.marginNotes) && !state.marginNotes.length) {
          state.marginNotes = normalizeMarginNotes(local.marginNotes);
        }
        if (Array.isArray(local?.pinnedRefs) && !state.pinnedRefs.length) {
          state.pinnedRefs = normalizePinnedRefs(local.pinnedRefs);
        }
      } catch {
        // ignore
      }
    }
    if (!targetPage) targetPage = 1;

    const firstPage = await pdf.getPage(1);
    const vp1 = firstPage.getViewport({ scale: 1 });
    state.pageAspect = vp1.width / vp1.height;

    els.bookTitleLabel.textContent = title;
    document.title = `${title} — FlipBook Reader`;

    const startIdx = clamp(targetPage - 1, 0, Math.max(0, state.totalPages - 1));
    initReaderView(startIdx);
    buildOutline();
    if (!els.thumbnailsStrip.hidden) buildThumbnailsStrip();
    updateBookmarkUi();
    updateHighlightsUi();
    renderRefPinsLayer();
    fetchLibrary({ applySettings: false });
  } catch (err) {
    disposeBook();
    state.pdfDoc = null;
    els.welcomeOverlay.hidden = false;
    showToast(`Failed to open PDF: ${err?.message || err}`, { isError: true, durationMs: 5200 });
  } finally {
    els.loadingOverlay.hidden = true;
  }
}

async function openBookById(bookId, overridePage = null) {
  const lib = await fetchLibrary({ applySettings: false });
  const books = lib?.books || state.libraryBooks || [];
  const book = books.find((b) => b.id === bookId);
  if (!book) {
    showToast('Book not found in library.', { isError: true });
    return;
  }
  const targetPage = overridePage || book.lastPage || 1;
  await openPdfSource(book.url || `/api/book/${book.id}.pdf`, {
    title: book.title,
    bookId: book.id,
    startPage: targetPage,
    bookmarks: book.bookmarks || [],
    stickyTabs: book.stickyTabs || [],
    highlights: book.highlights || [],
    marginNotes: book.marginNotes || [],
    pinnedRefs: book.pinnedRefs || [],
  });
}

window.openBookById = openBookById;

async function openLocalFileBlob(file) {
  if (!file) return;
  els.loadingText.textContent = `Opening ${file.name}…`;
  els.loadingOverlay.hidden = false;
  els.libraryModal.hidden = true;
  els.moreMenu.hidden = true;
  try {
    const buf = await file.arrayBuffer();
    const id = `blob-${file.name}-${file.size}`;
    await openPdfSource(new Uint8Array(buf), {
      title: file.name.replace(/\.pdf$/i, ''),
      bookId: id,
      startPage: null,
    });
  } catch (err) {
    els.loadingOverlay.hidden = true;
    if (!state.pdfDoc) els.welcomeOverlay.hidden = false;
    showToast(`Failed to read PDF file: ${err?.message || err}`, { isError: true, durationMs: 5000 });
  }
}

async function pickFileViaHost() {
  if (window.webkit?.messageHandlers?.flipbook) {
    window.webkit.messageHandlers.flipbook.postMessage({ action: 'pickFile' });
    return;
  }
  try {
    const res = await fetch('/api/pick-file', { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
      throw new Error(data?.error || `Picker failed (${res.status})`);
    }
    if (data && !data.cancelled && data.id) {
      await openPdfSource(data.url, {
        title: data.title,
        bookId: data.id,
        startPage: data.lastPage || 1,
        bookmarks: data.bookmarks || [],
        stickyTabs: data.stickyTabs || [],
        highlights: data.highlights || [],
        marginNotes: data.marginNotes || [],
        pinnedRefs: data.pinnedRefs || [],
      });
    }
  } catch (err) {
    if (els.fileInputHidden) {
      els.fileInputHidden.click();
    } else {
      showToast(`${err?.message || 'System file picker unavailable'}`, { isError: true, durationMs: 4600 });
    }
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
const FOOTER_WAKE_PX = 48;

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
    if (els.stickyTabPopover && !els.stickyTabPopover.hidden) return true;
    if (isBarInputFocused(els.topBar) || els.topBar?.matches(':focus-within')) return true;
    if (els.topBar?.matches(':hover')) return true;
    return Boolean(p && p.clientY <= HEADER_WAKE_PX);
  }
  if (!els.moreMenu.hidden || !els.thumbnailsStrip.hidden) return true;
  if (isBarInputFocused(els.bottomBar) || els.bottomBar?.matches(':focus-within')) return true;
  if (els.bottomBar?.matches(':hover')) return true;
  if (els.autoPlaybackHud?.matches(':hover') || els.navBackPill?.matches(':hover')) {
    return false;
  }
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

const MAG_HL_FILLS_LIGHT = {
  yellow: 'rgba(255, 224, 51, 0.56)',
  green: 'rgba(105, 220, 118, 0.50)',
  blue: 'rgba(110, 185, 255, 0.52)',
  pink: 'rgba(255, 130, 185, 0.50)',
  orange: 'rgba(255, 175, 85, 0.52)',
};

const MAG_HL_FILLS_DARK = {
  yellow: 'rgba(255, 224, 51, 0.34)',
  green: 'rgba(105, 220, 118, 0.30)',
  blue: 'rgba(110, 185, 255, 0.34)',
  pink: 'rgba(255, 130, 185, 0.32)',
  orange: 'rgba(255, 175, 85, 0.34)',
};

// Gradient profiles matching styles.css spine, fold-crease, and cast-shadow curves
const MAG_GRADIENTS = {
  bookSpine: [
    [0, 0, 0, 0, 0], [0.196, 0, 0, 0, 0], [0.232, 0, 0, 0, 0.008], [0.263, 0, 0, 0, 0.035],
    [0.296, 0, 0, 0, 0.071], [0.330, 0, 0, 0, 0.118], [0.364, 0, 0, 0, 0.161], [0.398, 0, 0, 0, 0.200],
    [0.432, 0, 0, 0, 0.243], [0.466, 0, 0, 0, 0.278], [0.491, 0, 0, 0, 0.294], [0.500, 0, 0, 0, 0.298],
    [0.517, 0, 0, 0, 0.282], [0.534, 0, 0, 0, 0.255], [0.568, 0, 0, 0, 0.196], [0.602, 0, 0, 0, 0.129],
    [0.636, 0, 0, 0, 0.063], [0.670, 0, 0, 0, 0.012], [0.695, 0, 0, 0, 0], [1, 0, 0, 0, 0],
  ],
  innerSpineLeft: [
    [0, 0, 0, 0, 0], [0.392, 0, 0, 0, 0], [0.464, 0, 0, 0, 0.008], [0.526, 0, 0, 0, 0.035],
    [0.592, 0, 0, 0, 0.071], [0.660, 0, 0, 0, 0.118], [0.728, 0, 0, 0, 0.161], [0.796, 0, 0, 0, 0.200],
    [0.864, 0, 0, 0, 0.243], [0.932, 0, 0, 0, 0.278], [0.982, 0, 0, 0, 0.294], [1, 0, 0, 0, 0.298],
  ],
  innerSpineRight: [
    [0, 0, 0, 0, 0.298], [0.034, 0, 0, 0, 0.282], [0.068, 0, 0, 0, 0.255], [0.136, 0, 0, 0, 0.196],
    [0.204, 0, 0, 0, 0.129], [0.272, 0, 0, 0, 0.063], [0.340, 0, 0, 0, 0.012], [0.390, 0, 0, 0, 0], [1, 0, 0, 0, 0],
  ],
  singleSpineLeft: [
    [0, 0, 0, 0, 0.22], [0.24, 0, 0, 0, 0.11], [0.58, 0, 0, 0, 0.03], [1, 0, 0, 0, 0],
  ],
  singleSlotSpine: [
    [0, 0, 0, 0, 0.20], [0.24, 0, 0, 0, 0.10], [0.58, 0, 0, 0, 0.03], [1, 0, 0, 0, 0],
  ],
  cast: [
    [0, 0, 0, 0, 0.34], [0.14, 0, 0, 0, 0.20], [0.42, 0, 0, 0, 0.08], [0.72, 0, 0, 0, 0.02], [1, 0, 0, 0, 0],
  ],
  frontSheenLight: [
    [0, 0, 0, 0, 0.24], [0.015, 0, 0, 0, 0.08], [0.042, 255, 255, 255, 0.50], [0.085, 255, 255, 255, 0.16],
    [0.14, 0, 0, 0, 0.08], [0.22, 0, 0, 0, 0.02], [0.34, 0, 0, 0, 0],
  ],
  frontSheenDark: [
    [0, 0, 0, 0, 0.36], [0.015, 0, 0, 0, 0.14], [0.042, 255, 255, 255, 0.10], [0.085, 255, 255, 255, 0.03],
    [0.14, 0, 0, 0, 0.14], [0.22, 0, 0, 0, 0.04], [0.34, 0, 0, 0, 0],
  ],
  backSheenLight: [
    [0, 0, 0, 0, 0.28], [0.014, 0, 0, 0, 0.08], [0.044, 255, 255, 255, 0.68], [0.090, 255, 255, 255, 0.22],
    [0.15, 0, 0, 0, 0.11], [0.24, 0, 0, 0, 0.03], [0.38, 0, 0, 0, 0],
  ],
  backSheenDark: [
    [0, 0, 0, 0, 0.42], [0.014, 0, 0, 0, 0.14], [0.044, 255, 255, 255, 0.12], [0.090, 255, 255, 255, 0.04],
    [0.15, 0, 0, 0, 0.16], [0.24, 0, 0, 0, 0.05], [0.38, 0, 0, 0, 0],
  ],
  unfurlSheenLight: [
    [0, 0, 0, 0, 0.20], [0.008, 0, 0, 0, 0.06], [0.022, 255, 255, 255, 0.72], [0.052, 255, 255, 255, 0.24],
    [0.095, 0, 0, 0, 0.06], [0.15, 0, 0, 0, 0.02], [0.22, 0, 0, 0, 0],
  ],
  unfurlSheenDark: [
    [0, 0, 0, 0, 0.44], [0.009, 0, 0, 0, 0.16], [0.024, 255, 255, 255, 0.14], [0.055, 255, 255, 255, 0.04],
    [0.10, 0, 0, 0, 0.14], [0.22, 0, 0, 0, 0],
  ],
  flightShadeLight: [
    [0, 0, 0, 0, 0.18], [0.12, 255, 255, 255, 0.28], [0.28, 0, 0, 0, 0.04], [0.55, 0, 0, 0, 0],
  ],
  flightShadeDark: [
    [0, 0, 0, 0, 0.42], [0.14, 255, 255, 255, 0.10], [0.55, 0, 0, 0, 0],
  ],
};

let magCanvasFilterSupported = null;
const magDarkFallbackCache = new WeakMap();

/** Probe once whether Canvas2D ctx.filter works (false only on older WebKit builds). */
function supportsMagCanvasFilter() {
  if (magCanvasFilterSupported !== null) return magCanvasFilterSupported;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const tctx = c.getContext('2d');
    if (!tctx || typeof tctx.filter !== 'string') {
      magCanvasFilterSupported = false;
      return false;
    }
    tctx.filter = 'invert(1)';
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, 1, 1);
    magCanvasFilterSupported = tctx.getImageData(0, 0, 1, 1).data[0] < 32;
  } catch {
    magCanvasFilterSupported = false;
  }
  return magCanvasFilterSupported;
}

/** CPU fallback matching CSS invert(0.90) hue-rotate(180deg) contrast(0.93) brightness(0.98). */
function getMagDarkFallbackCanvas(srcCanvas) {
  return getBakedDarkCanvas(srcCanvas);
}

function clearMagnifierCache() {
  for (const entry of state.magHiResCache.values()) {
    try { entry.renderTask?.cancel(); } catch {}
    if (entry.canvas) {
      entry.canvas.width = 0;
      entry.canvas.height = 0;
    }
  }
  state.magHiResCache.clear();
}

function getDefaultMagnifierCenter() {
  const sr = els.stage.getBoundingClientRect();
  let targetRect = null;
  if (state.scrollMode === 'scroll') {
    const wrap = els.scrollPages.children[state.currentIndex];
    if (wrap) targetRect = wrap.getBoundingClientRect();
  } else if (!els.bookShell.hidden) {
    targetRect = els.bookShell.getBoundingClientRect();
  }
  if (targetRect && targetRect.width > 20 && targetRect.height > 20) {
    return {
      x: targetRect.left + targetRect.width * 0.5 - sr.left,
      y: targetRect.top + targetRect.height * 0.48 - sr.top,
    };
  }
  return { x: sr.width * 0.5, y: sr.height * 0.48 };
}

function getMagnifierDimensions() {
  const stageW = els.stage?.clientWidth || window.innerWidth || 1000;
  const stageH = els.stage?.clientHeight || window.innerHeight || 700;
  if (state.magStyle === 'bar') {
    return {
      w: clamp(Math.round(state.magBarWidth), 180, Math.max(180, stageW - 24)),
      h: clamp(Math.round(state.magBarHeight), 48, Math.max(60, Math.min(240, stageH - 90))),
    };
  }
  const sz = clamp(Math.round(state.magCircleSize), 110, Math.max(110, Math.min(420, Math.min(stageW, stageH) - 24)));
  return { w: sz, h: sz };
}

function positionMagnifier(cx, cy) {
  if (!els.magLens || !els.stage) return;
  const sr = els.stage.getBoundingClientRect();
  if (!sr.width || !sr.height) return;
  const { w: lw, h: lh } = getMagnifierDimensions();
  els.magLens.style.width = `${lw}px`;
  els.magLens.style.height = `${lh}px`;
  state.magX = clamp(cx, 32, Math.max(32, sr.width - 32));
  state.magY = clamp(cy, 48, Math.max(48, sr.height - 32));
  els.magLens.style.transform = `translate3d(${Math.round(state.magX - lw / 2)}px, ${Math.round(state.magY - lh / 2)}px, 0)`;
  scheduleMagnifierRedraw();
}

function getMagnifierVisibleIndices(frameRect) {
  if (!state.pdfDoc) return [];
  if (state.scrollMode !== 'scroll') {
    return getVisibleIndices().filter((idx) => {
      const n = state.pageNodes[idx];
      if (!n) return false;
      const r = n.getBoundingClientRect();
      return r.width > 10 && r.height > 10;
    });
  }
  const margin = Math.max(120, Math.round(Math.max(frameRect.width, frameRect.height) / Math.max(1, state.magPower)));
  const hits = [];
  for (let i = 0; i < els.scrollPages.children.length; i++) {
    const wrap = els.scrollPages.children[i];
    const r = wrap.getBoundingClientRect();
    if (r.width > 10 && r.height > 10 && r.bottom >= frameRect.top - margin && r.top <= frameRect.bottom + margin) {
      hits.push(i);
    }
  }
  return hits;
}

function ensureMagHiResPage(idx, desiredW) {
  if (!state.pdfDoc || idx < 0 || idx >= state.totalPages) return null;
  const clampedW = clamp(Math.round(desiredW), 800, 6144);
  const existing = state.magHiResCache.get(idx);
  if (existing && existing.targetW >= clampedW * 0.85) {
    // Refresh LRU order cleanly
    state.magHiResCache.delete(idx);
    state.magHiResCache.set(idx, existing);
    return existing.canvas;
  }
  if (existing && existing.rendering && existing.pendingW >= clampedW * 0.85) {
    return existing.canvas || null;
  }
  if (existing?.renderTask) {
    try { existing.renderTask.cancel(); } catch {}
  }

  const record = {
    targetW: existing?.canvas ? existing.targetW : 0,
    pendingW: clampedW,
    rendering: true,
    canvas: existing?.canvas || null,
    renderTask: null,
  };
  state.magHiResCache.delete(idx);
  state.magHiResCache.set(idx, record);
  while (state.magHiResCache.size > 8) {
    const oldestKey = state.magHiResCache.keys().next().value;
    const oldRec = state.magHiResCache.get(oldestKey);
    if (oldestKey === idx) break;
    try { oldRec?.renderTask?.cancel(); } catch {}
    if (oldRec?.canvas) {
      oldRec.canvas.width = 0;
      oldRec.canvas.height = 0;
    }
    state.magHiResCache.delete(oldestKey);
  }

  (async () => {
    try {
      const pdfPage = await state.pdfDoc.getPage(idx + 1);
      if (state.magHiResCache.get(idx) !== record || !state.magEnabled) {
        record.rendering = false;
        if (!record.canvas && state.magHiResCache.get(idx) === record) state.magHiResCache.delete(idx);
        return;
      }
      const vp1 = pdfPage.getViewport({ scale: 1 });
      const vp = pdfPage.getViewport({ scale: clampedW / Math.max(1, vp1.width) });
      const hiCanvas = document.createElement('canvas');
      hiCanvas.width = Math.max(1, Math.floor(vp.width));
      hiCanvas.height = Math.max(1, Math.floor(vp.height));
      const hctx = hiCanvas.getContext('2d', { alpha: false });
      hctx.fillStyle = '#ffffff';
      hctx.fillRect(0, 0, hiCanvas.width, hiCanvas.height);

      const task = pdfPage.render({ canvasContext: hctx, viewport: vp });
      record.renderTask = task;
      await task.promise;
      if (state.magHiResCache.get(idx) !== record || !state.magEnabled) {
        hiCanvas.width = 0;
        hiCanvas.height = 0;
        record.rendering = false;
        if (!record.canvas && state.magHiResCache.get(idx) === record) state.magHiResCache.delete(idx);
        return;
      }
      record.canvas = hiCanvas;
      record.targetW = clampedW;
      record.rendering = false;
      record.renderTask = null;
      scheduleMagnifierRedraw();
    } catch {
      record.rendering = false;
      record.renderTask = null;
      if (!record.canvas && state.magHiResCache.get(idx) === record) state.magHiResCache.delete(idx);
    }
  })();

  return record.canvas || null;
}

/** Paint a linear gradient stop table horizontally from gx0 to gx1 across (x, y, w, h). */
function drawMagGradientRect(ctx, x, y, w, h, gx0, gx1, stops, opacity = 1, blendOp = 'source-over') {
  if (opacity <= 0.004 || w <= 0 || h <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = blendOp;
  ctx.globalAlpha *= opacity;
  const grad = ctx.createLinearGradient(gx0, 0, gx1, 0);
  for (const [off, r, g, b, a] of stops) {
    grad.addColorStop(off, `rgba(${r}, ${g}, ${b}, ${a})`);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Draw an inner-edge or single-page left spine shadow matching CSS rules in light or dark mode. */
function drawMagInnerSpine(ctx, kind, x, y, w, h, opacity = 1) {
  if (!kind || opacity <= 0.004) return;
  const isSingle = kind === 'singleLeft' || kind === 'singleSlot';
  const sw = isSingle ? clamp(w * 0.055, 22, 42) : clamp(w * 0.112, 46, 170);
  const dark = state.readDark;
  const blend = dark ? 'source-over' : 'multiply';
  const op = opacity * (dark ? 0.72 : 1);

  if (kind === 'left') {
    drawMagGradientRect(ctx, x + w - sw, y, sw, h, x + w - sw, x + w, MAG_GRADIENTS.innerSpineLeft, op, blend);
  } else if (kind === 'right') {
    drawMagGradientRect(ctx, x, y, sw, h, x, x + sw, MAG_GRADIENTS.innerSpineRight, op, blend);
  } else if (kind === 'singleLeft') {
    drawMagGradientRect(ctx, x, y, sw, h, x, x + sw, MAG_GRADIENTS.singleSpineLeft, op, blend);
  } else if (kind === 'singleSlot') {
    drawMagGradientRect(ctx, x, y, sw, h, x, x + sw, MAG_GRADIENTS.singleSlotSpine, op, blend);
  }
}

/** Render a PDF page canvas (inverting only page pixels in Dark Mode so shadows stay un-inverted), highlights, and optional spine. */
function drawMagPageContent(
  ctx,
  idx,
  x,
  y,
  w,
  h,
  desiredHiResW,
  { reverseBack = false, drawHighlights = true, innerSpine = null, spineOpacity = 1 } = {}
) {
  const dark = state.readDark;
  const hasPage = idx !== null && idx !== undefined && idx >= 0 && idx < state.totalPages;
  const hiCanvas = hasPage ? ensureMagHiResPage(idx, desiredHiResW) : null;
  const srcCanvas = hiCanvas || (hasPage ? state.pageNodes[idx]?.querySelector('canvas.fb-canvas') : null);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (reverseBack) {
    ctx.fillStyle = dark ? '#191a1f' : getPaperSurfaceColor(true);
    ctx.fillRect(x, y, w, h);
    if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.globalAlpha *= dark ? 0.16 : 0.12;
      drawMagFilteredCanvas(ctx, srcCanvas, 0, 0, w, h);
      ctx.restore();
    }
    drawMagPaperGrain(ctx, x, y, w, h);
    ctx.restore();
    return;
  }

  ctx.fillStyle = dark ? '#17181c' : getPaperSurfaceColor(false);
  ctx.fillRect(x, y, w, h);

  if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
    drawMagFilteredCanvas(ctx, srcCanvas, x, y, w, h);
  }
  drawMagPaperGrain(ctx, x, y, w, h);

  if (drawHighlights && hasPage) {
    const pageNum = idx + 1;
    const hlPalette = dark ? MAG_HL_FILLS_DARK : MAG_HL_FILLS_LIGHT;
    let hlStarted = false;
    for (const hl of state.highlights) {
      if (hl.page !== pageNum || !Array.isArray(hl.rects)) continue;
      if (!hlStarted) {
        ctx.save();
        ctx.globalCompositeOperation = dark ? 'screen' : 'multiply';
        hlStarted = true;
      }
      ctx.fillStyle = hlPalette[hl.color] || hlPalette.yellow;
      const radPx = 5 * (w / Math.max(1, state.pageW || 400));
      for (const rect of hl.rects) {
        const hx = x + (rect.l / 100) * w;
        const hy = y + (rect.t / 100) * h;
        const hw = (rect.w / 100) * w;
        const hh = (rect.h / 100) * h;
        const r = Math.min(radPx, hw * 0.36, hh * 0.36);
        if (r > 0.3) {
          roundRectPathCustom(ctx, hx, hy, hw, hh, [r, r, r, r]);
          ctx.fill();
        } else {
          ctx.fillRect(hx, hy, hw, hh);
        }
      }
    }
    if (hlStarted) ctx.restore();

    // Active search match highlight boxes on this page
    const searchBoxes = state.searchQuery.trim()
      ? state.pageNodes[idx]?.querySelectorAll('.fb-search-highlights .fb-search-box')
      : null;
    if (searchBoxes?.length) {
      ctx.save();
      ctx.globalCompositeOperation = dark ? 'screen' : 'multiply';
      ctx.fillStyle = dark ? 'rgba(255, 214, 70, 0.36)' : 'rgba(255, 224, 51, 0.48)';
      const sRadPx = 4 * (w / Math.max(1, state.pageW || 400));
      for (const box of searchBoxes) {
        const lp = parseFloat(box.style.left);
        const tp = parseFloat(box.style.top);
        const wp = parseFloat(box.style.width);
        const hp = parseFloat(box.style.height);
        if (!Number.isFinite(lp) || !Number.isFinite(tp) || !Number.isFinite(wp) || !Number.isFinite(hp)) continue;
        const hx = x + (lp / 100) * w;
        const hy = y + (tp / 100) * h;
        const hw = (wp / 100) * w;
        const hh = (hp / 100) * h;
        const r = Math.min(sRadPx, hw * 0.36, hh * 0.36);
        if (r > 0.3) {
          roundRectPathCustom(ctx, hx, hy, hw, hh, [r, r, r, r]);
          ctx.fill();
        } else {
          ctx.fillRect(hx, hy, hw, hh);
        }
      }
      ctx.restore();
    }

    drawMagTextSelection(ctx, state.pageNodes[idx], x, y, w, h, dark);
    drawMagMarginNotes(ctx, pageNum, x, y, w, h);
  }

  if (innerSpine) {
    drawMagInnerSpine(ctx, innerSpine, x, y, w, h, spineOpacity);
  }

  ctx.restore();
}

const MAG_MARGIN_NOTE_COLORS = {
  yellow: { bg: '#fde067', fold: '#cfa91b', foldHi: '#fff2aa', ink: 'rgba(58, 43, 6, 0.55)' },
  blue: { bg: '#7ec4ff', fold: '#438fd4', foldHi: '#bce2ff', ink: 'rgba(11, 41, 74, 0.52)' },
  mint: { bg: '#74dfb1', fold: '#3caa7b', foldHi: '#b8f5da', ink: 'rgba(9, 46, 30, 0.52)' },
  coral: { bg: '#f49589', fold: '#ca5c50', foldHi: '#ffc4bd', ink: 'rgba(62, 16, 11, 0.52)' },
  violet: { bg: '#c2aef8', fold: '#8d72d6', foldHi: '#e2d8ff', ink: 'rgba(34, 18, 72, 0.52)' },
};

function drawMagMarginNotes(ctx, pageNum, x, y, w, h) {
  if (!state.marginNotes?.length) return;
  const pageNotes = state.marginNotes.filter((n) => n.page === pageNum);
  if (!pageNotes.length) return;
  const basePageW = Math.max(1, (state.pageW || 400) * (state.committedZoom || 1));
  const pinScale = w / basePageW;
  const sz = 24 * pinScale;
  const half = sz / 2;
  const fold = 8 * pinScale;

  for (const note of pageNotes) {
    const pal = MAG_MARGIN_NOTE_COLORS[note.color] || MAG_MARGIN_NOTE_COLORS.yellow;
    const cx = x + (note.xPct / 100) * w;
    const cy = y + (note.yPct / 100) * h;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-3 * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
    ctx.shadowBlur = 6 * pinScale;
    ctx.shadowOffsetY = 3 * pinScale;

    ctx.beginPath();
    ctx.moveTo(-half, -half);
    ctx.lineTo(half, -half);
    ctx.lineTo(half, half - fold);
    ctx.lineTo(half - fold, half);
    ctx.lineTo(-half, half);
    ctx.closePath();
    ctx.fillStyle = pal.bg;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = pal.fold;
    ctx.beginPath();
    ctx.moveTo(half - fold, half - fold);
    ctx.lineTo(half, half - fold);
    ctx.lineTo(half - fold, half);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.ink;
    const lineW = sz - 9 * pinScale;
    const lineH = Math.max(1, 2 * pinScale);
    for (let li = 0; li < 3; li++) {
      ctx.fillRect(-half + 4 * pinScale, -half + (7 + li * 4) * pinScale, lineW, lineH);
    }

    if (note.snipRect) {
      ctx.fillStyle = '#2d6cdf';
      ctx.beginPath();
      ctx.arc(half - 1.5 * pinScale, -half + 1.5 * pinScale, 3.5 * pinScale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawMagTextSelection(ctx, pageNode, x, y, w, h, dark) {
  const sel = document.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return;
  const textLayer = pageNode?.querySelector('.textLayer');
  if (!textLayer) return;
  const pr = pageNode.getBoundingClientRect();
  if (!pr.width || !pr.height) return;

  let started = false;
  const subRange = document.createRange();

  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i);
    if (range.collapsed || !range.intersectsNode(textLayer)) continue;

    const root = textLayer.contains(range.commonAncestorContainer) ? range.commonAncestorContainer : textLayer;
    let node = root.nodeType === Node.TEXT_NODE ? root : null;
    let walker = null;
    if (!node) {
      walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      node = walker.nextNode();
    }

    while (node) {
      if (textLayer.contains(node) && range.intersectsNode(node)) {
        const len = node.nodeValue?.length || 0;
        if (len > 0) {
          const start = node === range.startContainer ? range.startOffset : 0;
          const end = node === range.endContainer ? range.endOffset : len;
          if (end > start) {
            subRange.setStart(node, start);
            subRange.setEnd(node, end);
            for (const cr of subRange.getClientRects()) {
              if (cr.width < 0.5 || cr.height < 0.5) continue;
              const rx = (cr.left - pr.left) / pr.width;
              const ry = (cr.top - pr.top) / pr.height;
              const rw = cr.width / pr.width;
              const rh = cr.height / pr.height;
              if (rx + rw <= 0 || rx >= 1 || ry + rh <= 0 || ry >= 1) continue;
              if (!started) {
                ctx.save();
                ctx.fillStyle = dark ? 'rgba(138, 180, 248, 0.36)' : 'rgba(0, 122, 255, 0.28)';
                started = true;
              }
              ctx.fillRect(x + rx * w, y + ry * h, rw * w, rh * h);
            }
          }
        }
      }
      node = walker ? walker.nextNode() : null;
    }
  }

  if (started) ctx.restore();
}

function drawMagFilteredCanvas(ctx, srcCanvas, x, y, w, h) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (state.readDark) {
    if (supportsMagCanvasFilter()) {
      ctx.filter = 'invert(0.90) hue-rotate(180deg) contrast(0.93) brightness(0.98)';
      ctx.drawImage(srcCanvas, x, y, w, h);
    } else {
      ctx.drawImage(getMagDarkFallbackCanvas(srcCanvas), x, y, w, h);
    }
  } else {
    if (state.paperWarmth > 0 || state.paperGrain) {
      ctx.globalCompositeOperation = 'multiply';
    }
    ctx.drawImage(srcCanvas, x, y, w, h);
  }
  ctx.restore();
}

/** Draw resting double-spread center spine shadow across visible static slots. */
function drawMagCenterSpineShadow(ctx, stageW, pageW, pageH, leftVisible, rightVisible) {
  if (!leftVisible && !rightVisible) return;
  const spineOp = els.bookSpineShadow ? parseFloat(getComputedStyle(els.bookSpineShadow).opacity) : 0;
  if (!Number.isFinite(spineOp) || spineOp <= 0.005) return;

  const spineW = clamp(stageW * 0.112, 92, 340);
  const spineX = stageW / 2 - spineW / 2;
  const clipLeft = leftVisible ? 0 : pageW;
  const clipRight = rightVisible ? stageW : pageW;

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipLeft, 0, Math.max(0, clipRight - clipLeft), pageH);
  ctx.clip();
  drawMagGradientRect(ctx, spineX, 0, spineW, pageH, spineX, spineX + spineW, MAG_GRADIENTS.bookSpine, spineOp, 'multiply');
  ctx.restore();
}

const MAG_STICKY_TAB_COLORS = {
  coral: { bg: '#eb7d71', deep: '#d46559', ink: '#2b0f0b' },
  amber: { bg: '#efcb68', deep: '#d7ae42', ink: '#2c1f04' },
  mint: { bg: '#6ed2a4', deep: '#4db485', ink: '#082518' },
  sky: { bg: '#79bbf2', deep: '#5397d4', ink: '#091f36' },
  violet: { bg: '#b49ef2', deep: '#9077d8', ink: '#1c1039' },
};

function getStickyTabColorKey(el) {
  if (el?.dataset?.tabColor && MAG_STICKY_TAB_COLORS[el.dataset.tabColor]) {
    return el.dataset.tabColor;
  }
  for (const key of Object.keys(MAG_STICKY_TAB_COLORS)) {
    if (el?.classList?.contains(`tab-${key}`)) return key;
  }
  return 'amber';
}

function getStickyTabText(el) {
  return el?.dataset?.tabLabel || el?.querySelector('.sticky-tab-text')?.textContent || '';
}

function roundRectPathCustom(ctx, x, y, w, h, radii) {
  const [tl, tr, br, bl] = radii;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr > 0) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - br);
  if (br > 0) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl > 0) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + tl);
  if (tl > 0) ctx.quadraticCurveTo(x, y, x + tl, y);
  else ctx.lineTo(x, y);
  ctx.closePath();
}

/** Render a physical borderless matte paper sticky note + optional spine tail onto the magnifier canvas. */
function drawMagStickyTab(
  ctx,
  x,
  y,
  w,
  h,
  { color = 'amber', label = '', isRightSide = true, isCurrent = false, tailW = 0, zoomScale = 1, alpha = 1, fontSizePx = 0, domTruncated = null } = {}
) {
  if (w <= 0.5 || h <= 0.5 || alpha <= 0.01) return;
  const pal = MAG_STICKY_TAB_COLORS[color] || MAG_STICKY_TAB_COLORS.amber;
  const z = Math.max(0.25, zoomScale);
  const r = Math.min(3 * z, w * 0.35, h * 0.45);
  const radii = isRightSide ? [0, r, r, 0] : [r, 0, 0, r];

  ctx.save();
  ctx.globalAlpha *= alpha;

  // Tail strip linking edge stack tab cleanly to its deeper page offset (100% opaque matte paper)
  if (tailW > 0.5) {
    const tailX = isRightSide ? x - tailW : x + w;
    ctx.save();
    ctx.fillStyle = pal.deep;
    ctx.fillRect(tailX, y, tailW, h);
    const bevelG = ctx.createLinearGradient(0, y, 0, y + h);
    bevelG.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    bevelG.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = bevelG;
    ctx.fillRect(tailX, y, tailW, h);
    const tEdgeG = isRightSide
      ? ctx.createLinearGradient(tailX, 0, tailX + Math.min(4 * z, tailW), 0)
      : ctx.createLinearGradient(tailX + tailW, 0, tailX + tailW - Math.min(4 * z, tailW), 0);
    tEdgeG.addColorStop(0, 'rgba(0, 0, 0, 0.24)');
    tEdgeG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = tEdgeG;
    ctx.fillRect(tailX, y, tailW, h);
    ctx.restore();
  }

  // Drop shadow behind raised sticky note body
  ctx.save();
  ctx.shadowColor = isCurrent ? 'rgba(0, 0, 0, 0.42)' : 'rgba(0, 0, 0, 0.32)';
  ctx.shadowBlur = (isCurrent ? 12 : 8) * z;
  ctx.shadowOffsetX = (isRightSide ? (isCurrent ? 3 : 2) : (isCurrent ? -3 : -2)) * z;
  ctx.shadowOffsetY = (isCurrent ? 5 : 3) * z;
  roundRectPathCustom(ctx, x, y, w, h, radii);
  ctx.fillStyle = pal.bg;
  ctx.fill();
  ctx.restore();

  // Clip interior matte paper gradient & subtle inner spine shadow
  ctx.save();
  roundRectPathCustom(ctx, x, y, w, h, radii);
  ctx.clip();

  const stopOffset = clamp((10 * z) / Math.max(1, w), 0.05, 0.9);
  const bodyG = isRightSide
    ? ctx.createLinearGradient(x, 0, x + w, 0)
    : ctx.createLinearGradient(x + w, 0, x, 0);
  bodyG.addColorStop(0, pal.deep);
  bodyG.addColorStop(stopOffset, pal.bg);
  bodyG.addColorStop(1, pal.bg);
  ctx.fillStyle = bodyG;
  ctx.fillRect(x, y, w, h);

  const sheenG = ctx.createLinearGradient(0, y, 0, y + h);
  sheenG.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  sheenG.addColorStop(0.48, 'rgba(255, 255, 255, 0.02)');
  sheenG.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
  ctx.fillStyle = sheenG;
  ctx.fillRect(x, y, w, h);

  const seamW = Math.min(5 * z, w * 0.4);
  const seamG = isRightSide
    ? ctx.createLinearGradient(x, 0, x + seamW, 0)
    : ctx.createLinearGradient(x + w, 0, x + w - seamW, 0);
  seamG.addColorStop(0, `rgba(0, 0, 0, ${isCurrent ? 0.16 : 0.24})`);
  seamG.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = seamG;
  ctx.fillRect(isRightSide ? x : x + w - seamW, y, seamW, h);

  // Dot marker & crisp bold label
  const dotR = 2 * z;
  const gap = 3.5 * z;
  const innerPad = 6.5 * z;
  const outerPad = 9 * z;
  const midY = y + h / 2;
  const dotCx = isRightSide ? x + innerPad + dotR : x + w - innerPad - dotR;

  ctx.save();
  ctx.globalAlpha *= isCurrent ? 0.78 : 0.44;
  ctx.fillStyle = pal.ink;
  ctx.beginPath();
  ctx.arc(dotCx, midY, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (label) {
    const fontSize = Math.max(4.5, fontSizePx || 10 * z);
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = pal.ink;
    ctx.textBaseline = 'middle';
    const textMaxW = Math.max(4, w - innerPad - outerPad * 0.75 - dotR * 2 - gap);
    let drawLabel = label;
    if (domTruncated !== false && ctx.measureText(drawLabel).width > textMaxW + 0.5) {
      while (drawLabel.length > 1 && ctx.measureText(`${drawLabel}…`).width > textMaxW) {
        drawLabel = drawLabel.slice(0, -1);
      }
      drawLabel = `${drawLabel}…`;
    }
    if (isRightSide) {
      ctx.textAlign = 'left';
      ctx.fillText(drawLabel, dotCx + dotR + gap, midY + 0.3 * z, textMaxW);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(drawLabel, dotCx - dotR - gap, midY + 0.3 * z, textMaxW);
    }
  }
  ctx.restore();
  ctx.restore();
}

/** Draw physical stacked book page edges (#bookStackLeft & #bookStackRight) onto the magnifier canvas. */
function drawMagBookStacks(ctx, fw, fh, lensCx, lensCy, power) {
  const dark = state.readDark;
  const stacks = [
    { el: els.bookStackLeft, isRight: false, taperVar: '--stack-taper-left' },
    { el: els.bookStackRight, isRight: true, taperVar: '--stack-taper-right' },
  ];
  for (const { el, isRight, taperVar } of stacks) {
    if (!el || el.classList.contains('is-empty')) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0.5 || r.height <= 4) continue;
    const dx = fw / 2 + (r.left - lensCx) * power;
    const dy = fh / 2 + (r.top - lensCy) * power;
    const dw = r.width * power;
    const dh = r.height * power;
    if (dx + dw <= 0 || dx >= fw || dy + dh <= 0 || dy >= fh) continue;

    const taperPx = Math.max(0, (parseFloat(els.bookShell?.style.getPropertyValue(taperVar)) || 0) * power);
    ctx.save();
    ctx.beginPath();
    if (!isRight) {
      ctx.moveTo(dx, dy + taperPx);
      ctx.lineTo(dx + dw, dy);
      ctx.lineTo(dx + dw, dy + dh);
      ctx.lineTo(dx, dy + dh - taperPx);
    } else {
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + dw, dy + taperPx);
      ctx.lineTo(dx + dw, dy + dh - taperPx);
      ctx.lineTo(dx, dy + dh);
    }
    ctx.closePath();
    ctx.clip();

    if (dark) {
      ctx.fillStyle = isRight ? '#1d1f26' : '#1b1c22';
      ctx.fillRect(dx, dy, dw, dh);
      const stripeStep = Math.max(1.5, 2 * power);
      for (let sx = 0; sx < dw; sx += stripeStep) {
        const px = isRight ? dx + sx : dx + dw - sx - stripeStep / 2;
        ctx.fillStyle = Math.floor(sx / stripeStep) % 2 === 0 ? '#252730' : '#121318';
        ctx.fillRect(px, dy, Math.max(0.8, stripeStep * 0.55), dh);
      }
      const shadeG = isRight
        ? ctx.createLinearGradient(dx, 0, dx + dw, 0)
        : ctx.createLinearGradient(dx + dw, 0, dx, 0);
      shadeG.addColorStop(0, 'rgba(0, 0, 0, 0.34)');
      shadeG.addColorStop(0.45, 'rgba(255, 255, 255, 0.02)');
      shadeG.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
      ctx.fillStyle = shadeG;
      ctx.fillRect(dx, dy, dw, dh);
    } else {
      ctx.fillStyle = getPaperSurfaceColor(true);
      ctx.fillRect(dx, dy, dw, dh);
      const stripeStep = Math.max(1.5, 2 * power);
      for (let sx = 0; sx < dw; sx += stripeStep) {
        const px = isRight ? dx + sx : dx + dw - sx - stripeStep / 2;
        ctx.fillStyle = Math.floor(sx / stripeStep) % 2 === 0 ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(px, dy, Math.max(0.8, stripeStep * 0.48), dh);
      }
      const shadeG = isRight
        ? ctx.createLinearGradient(dx, 0, dx + dw, 0)
        : ctx.createLinearGradient(dx + dw, 0, dx, 0);
      shadeG.addColorStop(0, 'rgba(0, 0, 0, 0.20)');
      shadeG.addColorStop(0.36, 'rgba(0, 0, 0, 0.04)');
      shadeG.addColorStop(0.72, 'rgba(255, 255, 255, 0.14)');
      shadeG.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
      ctx.fillStyle = shadeG;
      ctx.fillRect(dx, dy, dw, dh);
    }

    const vertG = ctx.createLinearGradient(0, dy, 0, dy + dh);
    vertG.addColorStop(0, `rgba(0, 0, 0, ${dark ? 0.34 : 0.16})`);
    vertG.addColorStop(0.045, 'rgba(0, 0, 0, 0)');
    vertG.addColorStop(0.94, 'rgba(0, 0, 0, 0)');
    vertG.addColorStop(1, `rgba(0, 0, 0, ${dark ? 0.42 : 0.24})`);
    ctx.fillStyle = vertG;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.restore();
  }
}

/** Project and draw axis-aligned DOM sticky edge tabs (resting edge stacks or scroll rail) onto magCanvas. */
function drawMagProjectedEdgeTabs(ctx, containerEl, isRightSide, fw, fh, lensCx, lensCy, power) {
  if (!containerEl || containerEl.hidden || !containerEl.children.length) return;
  const clipRailRect = containerEl === els.scrollTabsRail ? containerEl.getBoundingClientRect() : null;
  const items = [];
  for (let idx = 0; idx < containerEl.children.length; idx++) {
    const btn = containerEl.children[idx];
    if (btn.hidden) continue;
    const faceEl = btn.querySelector('.sticky-tab-face') || btn;
    const cs = getComputedStyle(btn);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) <= 0.01) continue;
    const r = faceEl.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    if (clipRailRect && (r.bottom <= clipRailRect.top + 1 || r.top >= clipRailRect.bottom - 1)) continue;
    const tailEl = btn.querySelector('.sticky-tab-tail');
    const tailRect = tailEl && !tailEl.hidden ? tailEl.getBoundingClientRect() : null;
    items.push({
      btn,
      faceEl,
      r,
      tailW: tailRect && tailRect.width > 0.5 ? tailRect.width : 0,
      z: parseInt(cs.zIndex, 10) || 0,
      idx,
    });
  }
  items.sort((a, b) => (a.z - b.z) || (a.idx - b.idx));

  const scopeEl = containerEl.closest('.book-shell, .scroll-tabs-rail');
  const domTabZoom = parseFloat(scopeEl?.style.getPropertyValue('--tab-zoom') || '1') || 1;
  const tabZoomScale = Math.max(0.32, domTabZoom * power);

  for (const item of items) {
    const { btn, faceEl, r, tailW } = item;
    const dx = fw / 2 + (r.left - lensCx) * power;
    const dy = fh / 2 + (r.top - lensCy) * power;
    const dw = r.width * power;
    const dh = r.height * power;
    const dTail = tailW * power;
    const minX = isRightSide ? dx - dTail : dx;
    const maxX = isRightSide ? dx + dw : dx + dw + dTail;
    if (maxX < -30 || minX > fw + 30 || dy + dh < -30 || dy > fh + 30) continue;

    const textEl = btn.querySelector('.sticky-tab-text');
    const domTruncated = textEl ? textEl.scrollWidth > textEl.clientWidth + 1.5 : null;
    const domFontPx = (parseFloat(getComputedStyle(faceEl).fontSize) || 10 * domTabZoom) * power;
    const isMini = btn.classList.contains('scs-mini-tab');

    drawMagStickyTab(ctx, dx, dy, dw, dh, {
      color: getStickyTabColorKey(btn),
      label: getStickyTabText(btn),
      isRightSide,
      isCurrent: btn.classList.contains('is-current'),
      tailW: dTail,
      zoomScale: isMini ? Math.max(0.24, (dh / 23)) : tabZoomScale,
      fontSizePx: domFontPx,
      domTruncated,
    });
  }
}

/** Draw attached turning sticky tabs within an unrotated/transformed page box (x0, y0, pageW, pageH). */
function drawMagTurningTabsForLeaf(ctx, containerEl, x0, y0, pageW, pageH, tabZoom, skipHidden = true) {
  if (!containerEl || !containerEl.children.length) return;
  for (const el of containerEl.children) {
    if (!el.classList?.contains('sticky-edge-tab')) continue;
    if (skipHidden && el.hidden) continue;
    const topPct = Number(el.dataset.topPct);
    const yCenter = y0 + (Number.isFinite(topPct) ? topPct / 100 : 0.2) * pageH;
    const sideDir = el.dataset.sideDir || (el.classList.contains('tab-side-left') ? 'left' : 'right');
    const isRightSide = sideDir !== 'left';
    const tabH = el.offsetHeight || 27 * tabZoom;
    const tabW = el.offsetWidth || 58 * tabZoom;
    const tuck = 3 * tabZoom;
    const tabX = isRightSide ? x0 + pageW - tuck : x0 + tuck - tabW;
    const tabY = yCenter - tabH / 2;

    drawMagStickyTab(ctx, tabX, tabY, tabW, tabH, {
      color: getStickyTabColorKey(el),
      label: getStickyTabText(el),
      isRightSide,
      isCurrent: el.classList.contains('is-current'),
      tailW: 0,
      zoomScale: tabZoom,
    });
  }
}

/** Draw perspective-foreshortened hard cover flip around the book's center spine hinge. */
function drawMagHardFlip(ctx, f, geom, pf, desiredHiResW) {
  const { pageW, pageH } = pf;
  const hingeX = pageW;
  const hingeY = pageH / 2;
  const showingBack = geom.progress > 0.5;
  const pageIdx = showingBack ? f.toIdx : f.fromIdx;
  if (pageIdx === null || pageIdx === undefined) return;

  const dirSign = f.side === 'right' ? 1 : -1;
  const rad = (geom.deg * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinAbs = Math.abs(Math.sin(rad));
  const P = 3600;
  const slices = 24;
  const hasPage = pageIdx >= 0 && pageIdx < state.totalPages;
  const hiCanvas = hasPage ? ensureMagHiResPage(pageIdx, desiredHiResW) : null;
  const srcCanvas = hiCanvas || (hasPage ? state.pageNodes[pageIdx]?.querySelector('canvas.fb-canvas') : null);
  const dark = state.readDark;

  const projPoint = (u) => {
    const k = P / Math.max(120, P - u * sinAbs);
    return {
      x: hingeX + dirSign * u * cosR * k,
      hh: (pageH / 2) * k,
    };
  };

  const pEdge = projPoint(pageW);
  const pHinge = projPoint(0);
  const mirrorTex = f.side === 'right' ? showingBack : !showingBack;

  for (let i = 0; i < slices; i++) {
    const t0 = i / slices;
    const t1 = (i + 1) / slices;
    const q0 = projPoint(t0 * pageW);
    const q1 = projPoint(t1 * pageW);
    const leftX = Math.min(q0.x, q1.x);
    const stripW = Math.abs(q1.x - q0.x);
    if (stripW < 0.05) continue;
    const topY = hingeY - (q0.hh + q1.hh) / 2;
    const stripH = q0.hh + q1.hh;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(q0.x, hingeY - q0.hh);
    ctx.lineTo(q1.x, hingeY - q1.hh);
    ctx.lineTo(q1.x, hingeY + q1.hh);
    ctx.lineTo(q0.x, hingeY + q0.hh);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = dark ? '#17181c' : getPaperSurfaceColor(false);
    ctx.fillRect(leftX - 0.5, topY - 1, stripW + 1, stripH + 2);

    if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
      const sU0 = mirrorTex ? 1 - t1 : t0;
      const sU1 = mirrorTex ? 1 - t0 : t1;
      const sx = sU0 * srcCanvas.width;
      const sw = Math.max(1, (sU1 - sU0) * srcCanvas.width);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (dark) {
        if (supportsMagCanvasFilter()) {
          ctx.filter = 'invert(0.90) hue-rotate(180deg) contrast(0.93) brightness(0.98)';
          ctx.drawImage(srcCanvas, sx, 0, sw, srcCanvas.height, leftX - 0.35, topY, stripW + 0.7, stripH);
        } else {
          ctx.drawImage(getMagDarkFallbackCanvas(srcCanvas), sx, 0, sw, srcCanvas.height, leftX - 0.35, topY, stripW + 0.7, stripH);
        }
      } else {
        if (state.paperWarmth > 0 || state.paperGrain) {
          ctx.globalCompositeOperation = 'multiply';
        }
        ctx.drawImage(srcCanvas, sx, 0, sw, srcCanvas.height, leftX - 0.35, topY, stripW + 0.7, stripH);
      }
      ctx.restore();
    }
    drawMagPaperGrain(ctx, leftX - 0.5, topY - 1, stripW + 1, stripH + 2);
    ctx.restore();
  }

  if (geom.shadeAlpha > 0.004) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pHinge.x, hingeY - pHinge.hh);
    ctx.lineTo(pEdge.x, hingeY - pEdge.hh);
    ctx.lineTo(pEdge.x, hingeY + pEdge.hh);
    ctx.lineTo(pHinge.x, hingeY + pHinge.hh);
    ctx.closePath();
    ctx.fillStyle = `rgba(0, 0, 0, ${geom.shadeAlpha})`;
    ctx.fill();
    ctx.restore();
  }

  // Attached sticky tabs riding on the turning hard cover outer edge
  if (f.hardCard && !f.hardCard.classList.contains('is-hover-curl')) {
    const activeFace = f.hardCard.querySelector(showingBack ? '.fh-hard-back' : '.fh-hard-front');
    const faceTabs = activeFace ? Array.from(activeFace.querySelectorAll('.sticky-edge-tab')) : [];
    if (faceTabs.length) {
      const kEdge = P / Math.max(120, P - pageW * sinAbs);
      const tabZoom = clamp((pageW || state.pageW || 460) / 460, 0.58, 4.5);
      const protrudeRight = dirSign * cosR >= 0;
      const sx = Math.max(0.08, Math.abs(cosR) * kEdge);
      const sy = kEdge;
      const edgeTopY = hingeY - (pageH / 2) * sy;
      for (const el of faceTabs) {
        const topPct = Number(el.dataset.topPct);
        const tabY = edgeTopY + (Number.isFinite(topPct) ? topPct / 100 : 0.2) * (pageH * sy);
        const tabW = el.offsetWidth || 58 * tabZoom;
        const tabH = el.offsetHeight || 27 * tabZoom;
        const tuck = 3 * tabZoom;
        ctx.save();
        ctx.translate(pEdge.x, tabY);
        ctx.scale(sx, sy);
        drawMagStickyTab(ctx, protrudeRight ? -tuck : tuck - tabW, -tabH / 2, tabW, tabH, {
          color: getStickyTabColorKey(el),
          label: getStickyTabText(el),
          isRightSide: protrudeRight,
          isCurrent: el.classList.contains('is-current'),
          zoomScale: tabZoom,
        });
        ctx.restore();
      }
    }
  }
}

/** Collect and render all active FlipBookEngine turning leaves & cast/crease shadows sorted by z-index. */
function drawMagActiveFlipLayers(ctx, pf, desiredHiResW, stageScaleX) {
  const activeFlips = [
    ...(Array.isArray(pf.flyingFlips) ? pf.flyingFlips : []),
    ...(pf.interactiveFlip ? [pf.interactiveFlip] : []),
  ];
  if (!activeFlips.length) return;

  const { pageW, pageH, maskSize } = pf;
  const stageW = pf.single ? pageW : pageW * 2;
  const spineOriginX = pf.single ? 0 : pageW;
  const spineOriginY = pageH / 2;
  const lightW = maskSize;
  const lightH = maskSize * 2;
  const dark = state.readDark;
  const tasks = [];
  let order = 0;

  for (const f of activeFlips) {
    const geom = f.frameGeom;
    if (!geom) continue;

    if (f.underEl && f.underIdx !== null && f.underIdx !== undefined && f.underEl.style.display !== 'none') {
      const ux = pf.single || f.side === 'left' ? 0 : pageW;
      const underSpine = f.underSpine
        ? (pf.single ? 'singleLeft' : (f.side === 'right' ? 'right' : 'left'))
        : null;
      const underShadowOp = geom.underShadowOpacity || 0;
      tasks.push({
        z: 1,
        order: order++,
        draw: () => {
          drawMagPageContent(ctx, f.underIdx, ux, 0, pageW, pageH, desiredHiResW, { innerSpine: underSpine });
          if (underShadowOp > 0.004) {
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${underShadowOp})`;
            ctx.fillRect(ux, 0, pageW, pageH);
            ctx.restore();
          }
        },
      });
    }

    if (geom.kind === 'hard') {
      tasks.push({
        z: geom.zIndex || 2000,
        order: order++,
        draw: () => drawMagHardFlip(ctx, f, geom, pf, desiredHiResW),
      });
      continue;
    }

    const baseUp = f.singlePrev ? 4000 + (f.seq || 0) * 4 : 2000 - (f.seq || 0) * 4;
    const layerOp = geom.layerOpacity ?? 1;
    if (layerOp <= 0.005 || geom.kind === 'singlePrevHidden') continue;

    const rad = (geom.deg * Math.PI) / 180;
    const castW = 140 * (geom.castScale ?? geom.widthScale ?? 1);

    // 1) Cast shadow on underlying page
    if (geom.castOpacity > 0.005) {
      tasks.push({
        z: baseUp - 1,
        order: order++,
        draw: () => {
          ctx.save();
          ctx.globalAlpha *= layerOp;
          ctx.beginPath();
          ctx.rect(0, 0, stageW, pageH);
          ctx.clip();
          ctx.translate(spineOriginX + geom.maskTranX, spineOriginY + geom.maskTranY);
          ctx.rotate(rad);
          drawMagGradientRect(ctx, 0, -maskSize * 1.1, castW, maskSize * 2.2, 0, castW, MAG_GRADIENTS.cast, geom.castOpacity);
          ctx.restore();
        },
      });
    }

    // 2) Departing front sheet (or single-prev unfurling sheet) inside downMask
    tasks.push({
      z: baseUp,
      order: order++,
      draw: () => {
        ctx.save();
        ctx.globalAlpha *= layerOp;
        if (pf.single) {
          ctx.beginPath();
          ctx.rect(0, -44, stageW + 44, pageH + 88);
          ctx.clip();
        }
        ctx.translate(spineOriginX + geom.maskTranX, spineOriginY + geom.maskTranY);
        ctx.rotate(rad);
        ctx.beginPath();
        ctx.rect(-maskSize, -maskSize / 2, maskSize, maskSize);
        ctx.clip();

        ctx.translate(-pageW / 2 - geom.pageTranX, 0);
        ctx.rotate(-rad);
        const downIdx = f.singlePrev ? f.toIdx : f.fromIdx;
        const downSpine = f.singlePrev
          ? 'singleLeft'
          : (f.fromHasSpine && !pf.single ? (f.side === 'right' ? 'right' : 'left') : null);
        drawMagPageContent(ctx, downIdx, -pageW / 2, -pageH / 2, pageW, pageH, desiredHiResW, { innerSpine: downSpine });

        if (geom.frontOpacity > 0.004) {
          ctx.beginPath();
          ctx.rect(-pageW / 2, -pageH / 2, pageW, pageH);
          ctx.clip();
          ctx.rotate(rad);
          ctx.translate(geom.distCenter, 0);
          const sheenStops = f.singlePrev
            ? (dark ? MAG_GRADIENTS.unfurlSheenDark : MAG_GRADIENTS.unfurlSheenLight)
            : (dark ? MAG_GRADIENTS.frontSheenDark : MAG_GRADIENTS.frontSheenLight);
          drawMagGradientRect(ctx, -lightW, -lightH / 2, lightW, lightH, 0, -lightW, sheenStops, geom.frontOpacity);
        }
        ctx.restore();
      },
    });

    const tabZoom = clamp((pageW || state.pageW || 460) / 460, 0.58, 4.5);
    const tabsAllowed = !f.downTabs?.classList?.contains('is-hover-curl');

    // 2b) Flat uncurled sticky tabs on departing sheet (or clipped singlePrev unfurling sheet)
    if (tabsAllowed && f.downTabs?.children?.length) {
      tasks.push({
        z: baseUp + 0.1,
        order: order++,
        draw: () => {
          ctx.save();
          ctx.globalAlpha *= layerOp;
          if (f.singlePrev) {
            ctx.beginPath();
            ctx.rect(0, -44 * tabZoom, stageW + 130 * tabZoom, pageH + 88 * tabZoom);
            ctx.clip();
            ctx.translate(spineOriginX + geom.maskTranX, spineOriginY + geom.maskTranY);
            ctx.rotate(rad);
            ctx.beginPath();
            ctx.rect(-maskSize, -maskSize / 2, maskSize, maskSize);
            ctx.clip();
            ctx.translate(-pageW / 2 - geom.pageTranX, 0);
            ctx.rotate(-rad);
            drawMagTurningTabsForLeaf(ctx, f.downTabs, -pageW / 2, -pageH / 2, pageW, pageH, tabZoom, false);
          } else {
            const slotX = !pf.single && f.side === 'right' ? pageW : 0;
            drawMagTurningTabsForLeaf(ctx, f.downTabs, slotX, 0, pageW, pageH, tabZoom, true);
          }
          ctx.restore();
        },
      });
    }

    if (f.singlePrev) continue;

    // 3) Soft flap drop shadow cast underneath curled-over flap
    if (geom.flapOpacity > 0.01) {
      tasks.push({
        z: 3000 + (f.seq || 0) * 4,
        order: order++,
        draw: () => {
          ctx.save();
          ctx.globalAlpha *= layerOp;
          ctx.beginPath();
          ctx.rect(0, 0, stageW, pageH);
          ctx.clip();
          ctx.translate(spineOriginX + geom.maskTranX, spineOriginY + geom.maskTranY);
          ctx.rotate(rad);
          ctx.beginPath();
          ctx.rect(-maskSize, -maskSize / 2, maskSize, maskSize);
          ctx.clip();

          ctx.translate(geom.distCenter, 0);
          ctx.rotate(rad);
          // Even-odd exclusion keeps the interior flap area clear when layerOp < 1
          ctx.beginPath();
          ctx.rect(-maskSize * 2, -maskSize * 2, maskSize * 4, maskSize * 4);
          ctx.rect(-pageW / 2, -pageH / 2, pageW, pageH);
          ctx.clip('evenodd');
          ctx.shadowColor = `rgba(0, 0, 0, ${0.36 * geom.flapOpacity})`;
          ctx.shadowBlur = 34 * state.magPower * stageScaleX;
          ctx.shadowOffsetX = -4 * state.magPower * stageScaleX;
          ctx.fillStyle = '#000000';
          ctx.fillRect(-pageW / 2, -pageH / 2, pageW, pageH);
          ctx.restore();
        },
      });
    }

    // 4) Curled-over back sheet inside upMask
    tasks.push({
      z: 3000 + (f.seq || 0) * 4 + 1,
      order: order++,
      draw: () => {
        ctx.save();
        ctx.globalAlpha *= layerOp;
        if (pf.single) {
          ctx.beginPath();
          ctx.rect(0, -44, stageW + 44, pageH + 88);
          ctx.clip();
        }
        ctx.translate(spineOriginX + geom.maskTranX, spineOriginY + geom.maskTranY);
        ctx.rotate(rad);
        ctx.beginPath();
        ctx.rect(-maskSize, -maskSize / 2, maskSize, maskSize);
        ctx.clip();

        ctx.translate(geom.distCenter, 0);
        ctx.rotate(rad);
        const upIdx = pf.single ? f.fromIdx : f.toIdx;
        const upSpine = !pf.single && f.upSpine ? (f.side === 'right' ? 'left' : 'right') : null;
        drawMagPageContent(ctx, upIdx, -pageW / 2, -pageH / 2, pageW, pageH, desiredHiResW, {
          reverseBack: pf.single,
          innerSpine: upSpine,
          spineOpacity: geom.spineAppear || 0,
        });

        if (geom.backOpacity > 0.004) {
          ctx.beginPath();
          ctx.rect(-pageW / 2, -pageH / 2, pageW, pageH);
          ctx.clip();
          ctx.rotate(-rad);
          ctx.translate(-geom.distCenter, 0);
          const backStops = dark ? MAG_GRADIENTS.backSheenDark : MAG_GRADIENTS.backSheenLight;
          drawMagGradientRect(ctx, -lightW, -lightH / 2, lightW, lightH, 0, -lightW, backStops, geom.backOpacity);
        }
        ctx.restore();
      },
    });

    // 4b) Unclipped curled-over sticky tabs riding with upTabsWrap
    if (tabsAllowed && f.upTabs?.children?.length) {
      tasks.push({
        z: 3000 + (f.seq || 0) * 4 + 1.2,
        order: order++,
        draw: () => {
          ctx.save();
          ctx.globalAlpha *= layerOp;
          if (pf.single) {
            ctx.beginPath();
            ctx.rect(0, -44 * tabZoom, stageW + 130 * tabZoom, pageH + 88 * tabZoom);
            ctx.clip();
          }
          ctx.translate(spineOriginX + geom.maskTranX, spineOriginY + geom.maskTranY);
          ctx.rotate(rad);
          ctx.translate(geom.distCenter, 0);
          ctx.rotate(rad);
          drawMagTurningTabsForLeaf(ctx, f.upTabs, -pageW / 2, -pageH / 2, pageW, pageH, tabZoom, true);
          ctx.restore();
        },
      });
    }
  }

  tasks.sort((a, b) => (a.z - b.z) || (a.order - b.order));
  for (const t of tasks) t.draw();
}

/** Draw the Single-Page collected stack mini-card & any in-flight flying cards under the lens. */
function drawMagSingleStackLayers(ctx, fw, fh, dpr, lensCx, lensCy, power) {
  if (
    els.singleCollectedStack &&
    !els.singleCollectedStack.hidden &&
    !els.singleCollectedStack.classList.contains('is-waiting') &&
    Number.isInteger(singleStackMeta.renderedIdx)
  ) {
    const stackLayers = els.singleCollectedStack.querySelectorAll('.scs-layer');
    for (let i = 0; i < stackLayers.length; i++) {
      const lr = stackLayers[i].getBoundingClientRect();
      if (lr.width <= 4 || lr.height <= 4) continue;
      const lx = fw / 2 + (lr.left - lensCx) * power;
      const ly = fh / 2 + (lr.top - lensCy) * power;
      const lw = lr.width * power;
      const lh = lr.height * power;
      if (lx + lw <= 0 || lx >= fw || ly + lh <= 0 || ly >= fh) continue;
      ctx.save();
      ctx.fillStyle = state.readDark ? '#23252d' : getPaperSurfaceColor(true);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = 6 * power;
      ctx.fillRect(lx, ly, lw, lh);
      ctx.restore();
    }

    const topCard = els.scsTopCard || els.singleCollectedStack;
    const sr = topCard.getBoundingClientRect();
    if (sr.width > 10 && sr.height > 10) {
      const dx = fw / 2 + (sr.left - lensCx) * power;
      const dy = fh / 2 + (sr.top - lensCy) * power;
      const dw = sr.width * power;
      const dh = sr.height * power;
      if (dx + dw > 0 && dx < fw && dy + dh > 0 && dy < fh) {
        drawMagPageContent(ctx, singleStackMeta.renderedIdx, dx, dy, dw, dh, dw * dpr, { drawHighlights: false });
      }
    }
    if (els.scsTabsRail?.children?.length) {
      drawMagProjectedEdgeTabs(ctx, els.scsTabsRail, true, fw, fh, lensCx, lensCy, power);
    }

    if (els.scsBadge && els.scsBadge.textContent) {
      const br = els.scsBadge.getBoundingClientRect();
      if (br.width > 4 && br.height > 4) {
        const bx = fw / 2 + (br.left - lensCx) * power;
        const by = fh / 2 + (br.top - lensCy) * power;
        const bw = br.width * power;
        const bh = br.height * power;
        if (bx + bw > 0 && bx < fw && by + bh > 0 && by < fh) {
          ctx.save();
          roundRectPathCustom(ctx, bx, by, bw, bh, [bh / 2, bh / 2, bh / 2, bh / 2]);
          ctx.fillStyle = 'rgba(15, 17, 22, 0.84)';
          ctx.fill();
          ctx.fillStyle = '#f3f5f8';
          ctx.font = `600 ${Math.max(6, 10 * power)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(els.scsBadge.textContent, bx + bw / 2, by + bh / 2 + 0.5);
          ctx.restore();
        }
      }
    }
  }

  if (!els.singleFlightLayer || !els.singleFlightLayer.children.length) return;
  const flightTabZoom = clamp((state.pageW * (state.committedZoom || 1)) / 460, 0.58, 4.5);
  for (const card of els.singleFlightLayer.children) {
    const pageIdx = Number(card.dataset.pageIdx);
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;
    if (!Number.isFinite(pageIdx) || !cardW || !cardH) continue;

    const cs = getComputedStyle(card);
    const op = parseFloat(cs.opacity);
    if (!Number.isFinite(op) || op <= 0.01) continue;

    const cr = card.getBoundingClientRect();
    if (cr.width < 2 || cr.height < 2) continue;

    let mat;
    try {
      mat = cs.transform && cs.transform !== 'none' ? new DOMMatrix(cs.transform) : new DOMMatrix();
    } catch {
      mat = new DOMMatrix();
    }

    const cx = fw / 2 + (cr.left + cr.width / 2 - lensCx) * power;
    const cy = fh / 2 + (cr.top + cr.height / 2 - lensCy) * power;
    const approxScale = Math.hypot(mat.a, mat.b) || 1;
    const desiredHiResW = cardW * approxScale * power * dpr;

    ctx.save();
    ctx.globalAlpha *= op;
    ctx.translate(cx, cy);
    ctx.scale(power, power);
    ctx.transform(mat.a, mat.b, mat.c, mat.d, 0, 0);
    drawMagPageContent(ctx, pageIdx, -cardW / 2, -cardH / 2, cardW, cardH, desiredHiResW, { drawHighlights: false });
    const fStops = state.readDark ? MAG_GRADIENTS.flightShadeDark : MAG_GRADIENTS.flightShadeLight;
    drawMagGradientRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cardW / 2, -cardW / 2, fStops, 1);
    drawMagTurningTabsForLeaf(ctx, card, -cardW / 2, -cardH / 2, cardW, cardH, flightTabZoom, false);
    ctx.restore();
  }
}

function drawMagnifierFrame() {
  state.magRedrawRaf = 0;
  if (!state.magEnabled || !state.pdfDoc || !els.magGlassFrame || !els.magCanvas) return;

  const frameRect = els.magGlassFrame.getBoundingClientRect();
  if (!frameRect.width || !frameRect.height) return;

  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
  const fw = frameRect.width;
  const fh = frameRect.height;
  const targetPxW = Math.max(1, Math.round(fw * dpr));
  const targetPxH = Math.max(1, Math.round(fh * dpr));
  if (els.magCanvas.width !== targetPxW || els.magCanvas.height !== targetPxH) {
    els.magCanvas.width = targetPxW;
    els.magCanvas.height = targetPxH;
  }

  const ctx = els.magCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, fw, fh);

  const lensCx = frameRect.left + fw / 2;
  const lensCy = frameRect.top + fh / 2;
  const power = state.magPower;

  if (state.scrollMode === 'scroll' || !state.pageFlip?.stage) {
    const visIndices = getMagnifierVisibleIndices(frameRect);
    for (const idx of visIndices) {
      const pageNode = state.pageNodes[idx];
      if (!pageNode) continue;
      const pr = pageNode.getBoundingClientRect();
      if (!pr.width || !pr.height) continue;

      const dx = fw / 2 + (pr.left - lensCx) * power;
      const dy = fh / 2 + (pr.top - lensCy) * power;
      const dw = pr.width * power;
      const dh = pr.height * power;
      if (dx + dw <= 0 || dx >= fw || dy + dh <= 0 || dy >= fh) continue;

      drawMagPageContent(ctx, idx, dx, dy, dw, dh, pr.width * power * dpr);
    }
    drawMagProjectedEdgeTabs(ctx, els.scrollTabsRail, false, fw, fh, lensCx, lensCy, power);
    return;
  }

  // 0. Physical stacked page edges & resting edge sticky tabs emerging from behind top pages
  drawMagBookStacks(ctx, fw, fh, lensCx, lensCy, power);
  drawMagProjectedEdgeTabs(ctx, els.bookEdgeTabsLeft, false, fw, fh, lensCx, lensCy, power);
  drawMagProjectedEdgeTabs(ctx, els.bookEdgeTabsRight, true, fw, fh, lensCx, lensCy, power);

  const pf = state.pageFlip;
  const stageW = pf.single ? pf.pageW : pf.pageW * 2;
  const stageRect = pf.stage.getBoundingClientRect();
  if (stageRect.width > 10 && stageRect.height > 10) {
    const stageScaleX = stageRect.width / Math.max(1, stageW);
    const stageScaleY = stageRect.height / Math.max(1, pf.pageH);
    const desiredHiResW = pf.pageW * power * stageScaleX * dpr;

    ctx.save();
    ctx.translate(
      fw / 2 + (stageRect.left - lensCx) * power,
      fh / 2 + (stageRect.top - lensCy) * power
    );
    ctx.scale(power * stageScaleX, power * stageScaleY);

    // 1. Static left & right slots (skip slots temporarily hidden during interactive peel/drag)
    const leftRaw = !pf.single ? pf.leftSlot?.firstElementChild?.dataset?.pageIndex : undefined;
    const rightRaw = pf.rightSlot?.firstElementChild?.dataset?.pageIndex;
    const leftIdx = leftRaw !== undefined ? Number(leftRaw) : null;
    const rightIdx = rightRaw !== undefined ? Number(rightRaw) : null;
    const leftVisible = Boolean(!pf.single && leftIdx !== null && Number.isFinite(leftIdx) && pf.leftSlot.style.visibility !== 'hidden');
    const rightVisible = Boolean(rightIdx !== null && Number.isFinite(rightIdx) && pf.rightSlot?.style?.visibility !== 'hidden');

    if (leftVisible) {
      drawMagPageContent(ctx, leftIdx, 0, 0, pf.pageW, pf.pageH, desiredHiResW);
    }
    if (rightVisible) {
      const rx = pf.single ? 0 : pf.pageW;
      const singleSlotOp = state.readDark ? 1 : (els.bookShell?.classList?.contains('has-left-stack') ? 1 : 0.7);
      drawMagPageContent(ctx, rightIdx, rx, 0, pf.pageW, pf.pageH, desiredHiResW, {
        innerSpine: pf.single ? 'singleSlot' : null,
        spineOpacity: singleSlotOp,
      });
    }

    // 2. Center book spine shadow (layered at stage z-index 3, above static slots and below flip layer)
    if (!pf.single) {
      drawMagCenterSpineShadow(ctx, stageW, pf.pageW, pf.pageH, leftVisible, rightVisible);
    }

    // 3. Active page-turning sheets, hard covers, attached turning sticky tabs, fold creases & shadows
    drawMagActiveFlipLayers(ctx, pf, desiredHiResW, stageScaleX);
    ctx.restore();
  }

  // 4. Single-page collected stack top card & WAAPI flying cards
  drawMagSingleStackLayers(ctx, fw, fh, dpr, lensCx, lensCy, power);

  // Keep drawing at 60fps during center-shift transitions or WAAPI single-stack flights
  const hasOngoingAnimation = Boolean(
    pf.flyingFlips?.length ||
    pf.interactiveFlip ||
    singleStackMeta.activeFlights > 0 ||
    els.singleFlightLayer?.children?.length > 0 ||
    (state.magAnimUntil && performance.now() < state.magAnimUntil)
  );
  if (hasOngoingAnimation) {
    scheduleMagnifierRedraw();
  }
}

function scheduleMagnifierRedraw() {
  if (!state.magEnabled || state.magRedrawRaf) return;
  state.magRedrawRaf = requestAnimationFrame(drawMagnifierFrame);
}

const CURTAIN_LINE_PRESETS = { 1: 32, 2: 54, 3: 78, 4: 104 };
const CURTAIN_TONES = [
  { id: 'clean', label: 'Tint: Clean' },
  { id: 'warm', label: 'Tint: Warm' },
  { id: 'deep', label: 'Tint: Deep' },
];

function getFocusCurtainBookRect() {
  if (!els.stage || !state.pdfDoc) return null;
  const sr = els.stage.getBoundingClientRect();
  if (sr.width <= 0 || sr.height <= 0) return null;

  let left = sr.right;
  let top = sr.bottom;
  let right = sr.left;
  let bottom = sr.top;

  if (state.scrollMode === 'scroll') {
    const wraps = els.scrollPages?.children;
    if (!wraps || !wraps.length) return null;
    let found = false;
    for (let i = 0; i < wraps.length; i++) {
      const r = wraps[i].getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.bottom <= sr.top || r.top >= sr.bottom) continue;
      found = true;
      if (r.left < left) left = r.left;
      if (r.top < top) top = r.top;
      if (r.right > right) right = r.right;
      if (r.bottom > bottom) bottom = r.bottom;
    }
    if (!found) {
      const fallback = wraps[clamp(state.currentIndex, 0, wraps.length - 1)] || wraps[0];
      const r = fallback.getBoundingClientRect();
      left = r.left;
      top = r.top;
      right = r.right;
      bottom = r.bottom;
    }
    const cl = Math.max(sr.left, left);
    const ct = Math.max(sr.top, top);
    const cr = Math.min(sr.right, right);
    const cb = Math.min(sr.bottom, bottom);
    const width = Math.max(0, cr - cl);
    const height = Math.max(0, cb - ct);
    if (width < 4 || height < 4) return null;
    return {
      left: cl - sr.left,
      top: ct - sr.top,
      width,
      height,
      clipPolygon: 'none',
    };
  }

  const bc = els.bookContainer?.getBoundingClientRect();
  if (!bc || bc.width <= 0 || bc.height <= 0) return null;
  let baseLeft = bc.left;
  let baseRight = bc.right;
  top = bc.top;
  bottom = bc.bottom;

  const visible = getVisibleIndices();
  const single = isEffectiveSingleMode() || state.orientation === 'portrait';
  const hasActiveFlip = Boolean(
    (state.pageFlip?.interactiveFlip && state.pageFlip.interactiveFlip.mode !== 'hover') ||
    state.pageFlip?.flyingFlips?.length
  );
  if (!single && visible.length === 1 && !hasActiveFlip) {
    if (state.showCover && visible[0] === 0) {
      baseLeft = bc.left + bc.width / 2;
    } else {
      baseRight = bc.left + bc.width / 2;
    }
  }

  left = baseLeft;
  right = baseRight;
  let taperLeftPx = 0;
  let taperRightPx = 0;

  if (els.bookStackLeft && !els.bookStackLeft.classList.contains('is-empty')) {
    const lr = els.bookStackLeft.getBoundingClientRect();
    if (lr.width > 0.5 && lr.left < left) {
      left = lr.left;
      const topInsetL = Math.max(0, lr.top - bc.top);
      taperLeftPx = topInsetL + (parseFloat(els.bookShell?.style.getPropertyValue('--stack-taper-left')) || 0);
    }
  }
  if (els.bookStackRight && !els.bookStackRight.classList.contains('is-empty')) {
    const rr = els.bookStackRight.getBoundingClientRect();
    if (rr.width > 0.5 && rr.right > right) {
      right = rr.right;
      const topInsetR = Math.max(0, rr.top - bc.top);
      taperRightPx = topInsetR + (parseFloat(els.bookShell?.style.getPropertyValue('--stack-taper-right')) || 0);
    }
  }

  const cl = Math.max(sr.left, left);
  const ct = Math.max(sr.top, top);
  const cr = Math.min(sr.right, right);
  const cb = Math.min(sr.bottom, bottom);
  const width = Math.max(0, cr - cl);
  const height = Math.max(0, cb - ct);
  if (width < 4 || height < 4) return null;

  const visLeftStackW = Math.max(0, Math.min(width, baseLeft - cl));
  const visRightStackW = Math.max(0, Math.min(width, cr - baseRight));
  const tL = visLeftStackW > 0.5 && cl <= left + 0.5 ? Math.max(0, taperLeftPx) : 0;
  const tR = visRightStackW > 0.5 && cr >= right - 0.5 ? Math.max(0, taperRightPx) : 0;
  const clipPolygon = (tL > 0 || tR > 0)
    ? `polygon(0px ${tL.toFixed(1)}px, ${visLeftStackW.toFixed(1)}px 0px, calc(100% - ${visRightStackW.toFixed(1)}px) 0px, 100% ${tR.toFixed(1)}px, 100% calc(100% - ${tR.toFixed(1)}px), calc(100% - ${visRightStackW.toFixed(1)}px) 100%, ${visLeftStackW.toFixed(1)}px 100%, 0px calc(100% - ${tL.toFixed(1)}px))`
    : 'none';

  return {
    left: cl - sr.left,
    top: ct - sr.top,
    width,
    height,
    clipPolygon,
  };
}

function getCurtainSlotGeometry(boxW, boxH, boxLeft, boxTop, cx = null, cy = null) {
  const h = clamp(Math.round(state.curtainHeight), 22, Math.min(360, Math.max(24, boxH - 4)));
  const rawY = Number.isFinite(cy) ? cy : (state.curtainY ?? boxTop + boxH * 0.42);
  const clampedCy = clamp(rawY, boxTop + h / 2, Math.max(boxTop + h / 2, boxTop + boxH - h / 2));
  const slotTop = clamp(Math.round(clampedCy - boxTop - h / 2), 0, Math.max(0, boxH - h));
  const slotBottom = slotTop + h;

  const pct = clamp(Math.round(state.curtainLengthPct), 20, 100);
  let w = boxW;
  let slotLeft = 0;
  let clampedCx = boxLeft + boxW * 0.5;
  if (pct < 100) {
    const minW = Math.min(boxW, 72);
    w = clamp(Math.round((pct / 100) * boxW), minW, boxW);
    const rawX = Number.isFinite(cx) ? cx : (state.curtainX ?? boxLeft + boxW * 0.5);
    clampedCx = clamp(rawX, boxLeft + w / 2, Math.max(boxLeft + w / 2, boxLeft + boxW - w / 2));
    slotLeft = clamp(Math.round(clampedCx - boxLeft - w / 2), 0, Math.max(0, boxW - w));
  }
  const slotRight = slotLeft + w;
  return { w, h, slotLeft, slotTop, slotRight, slotBottom, clampedCx, clampedCy };
}

function positionFocusCurtain(cy = null, cx = null) {
  if (!els.focusCurtainOverlay || !els.focusCurtainBookBox || !els.stage) return;
  const box = getFocusCurtainBookRect();
  if (!box) {
    els.focusCurtainBookBox.style.width = '0px';
    els.focusCurtainBookBox.style.height = '0px';
    return;
  }

  const boxLeft = Math.round(box.left);
  const boxTop = Math.round(box.top);
  const boxW = Math.round(box.width);
  const boxH = Math.round(box.height);
  const bs = els.focusCurtainBookBox.style;
  bs.left = `${boxLeft}px`;
  bs.top = `${boxTop}px`;
  bs.width = `${boxW}px`;
  bs.height = `${boxH}px`;
  bs.clipPath = box.clipPolygon || 'none';
  bs.webkitClipPath = box.clipPolygon || 'none';

  const g = getCurtainSlotGeometry(boxW, boxH, boxLeft, boxTop, cx, cy);
  state.curtainY = g.clampedCy;
  if (state.curtainLengthPct < 100) {
    state.curtainX = g.clampedCx;
  } else {
    state.curtainX = boxLeft + boxW * 0.5;
  }

  const toneBoost = state.curtainTone === 'deep' ? 12 : 0;
  const effectiveDim = clamp((state.curtainDim + toneBoost + (state.readDark ? 12 : 0)) / 100, 0.14, 0.85);
  if (els.focusCurtainOverlay) {
    els.focusCurtainOverlay.style.setProperty('--curtain-dim', effectiveDim.toFixed(2));
  }
  const r = clamp(Math.min(g.w < boxW - 1 ? 10 : 6, Math.floor(Math.min(g.w, g.h) / 3)), 0, 12);
  if (els.focusCurtainSvg && els.focusCurtainVeilPath) {
    els.focusCurtainSvg.setAttribute('viewBox', `0 0 ${boxW} ${boxH}`);
    const x = g.slotLeft;
    const y = g.slotTop;
    const w = g.w;
    const h = g.h;
    const d = r > 0
      ? `M 0 0 H ${boxW} V ${boxH} H 0 Z M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
      : `M 0 0 H ${boxW} V ${boxH} H 0 Z M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    els.focusCurtainVeilPath.setAttribute('d', d);
  }
  if (els.focusCurtainBand) {
    els.focusCurtainBand.classList.toggle('is-partial', g.w < boxW - 1);
    els.focusCurtainBand.style.setProperty('--curtain-radius', `${r}px`);
    els.focusCurtainBand.style.width = `${g.w}px`;
    els.focusCurtainBand.style.height = `${g.h}px`;
    els.focusCurtainBand.style.transform = `translate3d(${g.slotLeft}px, ${g.slotTop}px, 0)`;
  }
}

function scheduleCurtainBoundsSync(durationMs = 420) {
  if (!state.curtainEnabled) return;
  state.curtainAnimUntil = Math.max(state.curtainAnimUntil || 0, performance.now() + durationMs);
  positionFocusCurtain();
  if (state.curtainSyncRaf) return;
  const tick = () => {
    state.curtainSyncRaf = 0;
    if (!state.curtainEnabled) return;
    positionFocusCurtain();
    if (performance.now() < state.curtainAnimUntil) {
      state.curtainSyncRaf = requestAnimationFrame(tick);
    }
  };
  state.curtainSyncRaf = requestAnimationFrame(tick);
}

function updateFocusCurtainUi() {
  const active = Boolean(state.pdfDoc && state.curtainEnabled);
  if (els.btnFocusCurtain) {
    els.btnFocusCurtain.classList.toggle('active', active);
    els.btnFocusCurtain.setAttribute('aria-pressed', String(active));
  }
  if (els.focusCurtainOverlay) {
    els.focusCurtainOverlay.hidden = !active;
    els.focusCurtainOverlay.classList.toggle('tone-warm', state.curtainTone === 'warm');
    els.focusCurtainOverlay.classList.toggle('tone-deep', state.curtainTone === 'deep');
  }
  if (els.focusCurtainPill) {
    els.focusCurtainPill.hidden = !active;
    els.focusCurtainPill.classList.toggle('with-mag-pill', Boolean(state.magEnabled));
  }
  if (els.focusCurtainBand) {
    els.focusCurtainBand.classList.toggle('has-guides', Boolean(state.curtainGuide));
    els.focusCurtainBand.classList.toggle('is-placed', !state.curtainFollow);
    els.focusCurtainBand.classList.toggle('is-partial', state.curtainLengthPct < 100);
  }

  let matchedLines = null;
  let minDiff = Infinity;
  for (const [linesStr, px] of Object.entries(CURTAIN_LINE_PRESETS)) {
    const diff = Math.abs(state.curtainHeight - px);
    if (diff <= 5 && diff < minDiff) {
      minDiff = diff;
      matchedLines = Number(linesStr);
    }
  }
  const lineBtns = [els.btnCurtain1L, els.btnCurtain2L, els.btnCurtain3L, els.btnCurtain4L];
  for (const btn of lineBtns) {
    if (!btn) continue;
    const isMatch = Number(btn.dataset.curtainLines) === matchedLines;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-pressed', String(isMatch));
  }

  if (els.curtainHeightLabel) els.curtainHeightLabel.textContent = `${state.curtainHeight}px`;
  if (els.curtainLengthLabel) els.curtainLengthLabel.textContent = `${state.curtainLengthPct}%`;
  if (els.curtainDimLabel) els.curtainDimLabel.textContent = `${state.curtainDim}% dim`;
  if (els.btnCurtainTone) {
    const info = CURTAIN_TONES.find((t) => t.id === state.curtainTone) || CURTAIN_TONES[0];
    els.btnCurtainTone.textContent = info.label;
    els.btnCurtainTone.classList.toggle('active', state.curtainTone !== 'clean');
  }
  if (els.btnCurtainGuide) {
    els.btnCurtainGuide.classList.toggle('active', Boolean(state.curtainGuide));
    els.btnCurtainGuide.setAttribute('aria-pressed', String(Boolean(state.curtainGuide)));
  }
  if (els.btnCurtainFollow) {
    els.btnCurtainFollow.classList.toggle('active', Boolean(state.curtainFollow));
    els.btnCurtainFollow.setAttribute('aria-pressed', String(Boolean(state.curtainFollow)));
    els.btnCurtainFollow.textContent = state.curtainFollow ? 'Follow Cursor' : 'Place & Resize';
  }
}

function setFocusCurtainEnabled(enabled, { persist = false } = {}) {
  const next = Boolean(enabled && state.pdfDoc);
  state.curtainEnabled = next;
  if (!next) {
    state.curtainDragging = false;
    state.curtainResizing = null;
    els.focusCurtainBand?.classList.remove('is-dragging');
    if (state.curtainSyncRaf) {
      cancelAnimationFrame(state.curtainSyncRaf);
      state.curtainSyncRaf = 0;
    }
  }
  updateFocusCurtainUi();
  if (next) positionFocusCurtain();
  if (persist) schedulePersistState();
}

function toggleFocusCurtain() {
  if (!state.pdfDoc) return;
  setFocusCurtainEnabled(!state.curtainEnabled, { persist: true });
}

function setFocusCurtainHeight(px) {
  state.curtainHeight = clamp(Math.round(px), 22, 360);
  updateFocusCurtainUi();
  if (state.curtainEnabled) positionFocusCurtain();
  schedulePersistState();
}

function stepFocusCurtainHeight(dir) {
  setFocusCurtainHeight(state.curtainHeight + dir * 10);
}

function setFocusCurtainLength(pct) {
  state.curtainLengthPct = clamp(Math.round(pct), 20, 100);
  updateFocusCurtainUi();
  if (state.curtainEnabled) positionFocusCurtain();
  schedulePersistState();
}

function stepFocusCurtainLength(dir) {
  setFocusCurtainLength(state.curtainLengthPct + dir * 10);
}

function stepFocusCurtainDim(dir) {
  state.curtainDim = clamp(Math.round(state.curtainDim + dir * 5), 15, 75);
  updateFocusCurtainUi();
  if (state.curtainEnabled) positionFocusCurtain();
  schedulePersistState();
}

function cycleFocusCurtainTone() {
  const idx = CURTAIN_TONES.findIndex((t) => t.id === state.curtainTone);
  state.curtainTone = CURTAIN_TONES[(idx + 1) % CURTAIN_TONES.length].id;
  updateFocusCurtainUi();
  if (state.curtainEnabled) positionFocusCurtain();
  schedulePersistState();
}

function moveFocusCurtainByLines(deltaPx) {
  if (!state.curtainEnabled || !els.stage) return;
  const box = getFocusCurtainBookRect();
  const base = box ? box.top + box.height * 0.42 : (els.stage.clientHeight || 700) * 0.42;
  const cur = state.curtainY ?? base;
  positionFocusCurtain(cur + deltaPx);
}

function updateMagnifierUi() {
  const active = Boolean(state.pdfDoc && state.magEnabled);
  const powerStr = `${state.magPower.toFixed(1)}×`;
  const { w, h } = getMagnifierDimensions();

  if (els.btnMagnifier) {
    els.btnMagnifier.classList.toggle('active', active);
    els.btnMagnifier.setAttribute('aria-pressed', String(active));
  }
  if (els.magnifierOverlay) {
    els.magnifierOverlay.hidden = !active;
  }
  if (els.magLens) {
    els.magLens.hidden = false;
    els.magLens.classList.toggle('mag-shape-circle', state.magStyle === 'circle');
    els.magLens.classList.toggle('mag-shape-bar', state.magStyle === 'bar');
    els.magLens.classList.toggle('is-follow', state.magFollow);
    els.magLens.style.width = `${w}px`;
    els.magLens.style.height = `${h}px`;
  }
  if (els.btnMagShapeCircle) {
    const isCircle = state.magStyle === 'circle';
    els.btnMagShapeCircle.classList.toggle('active', isCircle);
    els.btnMagShapeCircle.setAttribute('aria-pressed', String(isCircle));
  }
  if (els.btnMagShapeBar) {
    const isBar = state.magStyle === 'bar';
    els.btnMagShapeBar.classList.toggle('active', isBar);
    els.btnMagShapeBar.setAttribute('aria-pressed', String(isBar));
  }
  if (els.magPowerLabel) {
    els.magPowerLabel.textContent = powerStr;
  }
  if (els.magSizeLabel) {
    els.magSizeLabel.textContent = state.magStyle === 'bar' ? `${w}×${h}` : `${w}px`;
  }
  if (els.btnMagFollow) {
    els.btnMagFollow.classList.toggle('active', state.magFollow);
    els.btnMagFollow.setAttribute('aria-pressed', String(state.magFollow));
    els.btnMagFollow.textContent = state.magFollow ? 'Following' : 'Drag & Place';
  }
  updateFocusCurtainUi();
}

function stepMagnifierSize(dir) {
  const stageW = els.stage?.clientWidth || window.innerWidth || 1000;
  const stageH = els.stage?.clientHeight || window.innerHeight || 700;
  if (state.magStyle === 'bar') {
    const maxBarW = Math.max(180, stageW - 24);
    const maxBarH = Math.max(60, Math.min(240, stageH - 90));
    state.magBarWidth = clamp(Math.round(Math.min(state.magBarWidth, maxBarW) + dir * 36), 180, maxBarW);
    state.magBarHeight = clamp(Math.round(Math.min(state.magBarHeight, maxBarH) + dir * 10), 48, maxBarH);
  } else {
    const maxCircle = Math.max(110, Math.min(420, Math.min(stageW, stageH) - 24));
    state.magCircleSize = clamp(Math.round(Math.min(state.magCircleSize, maxCircle) + dir * 24), 110, maxCircle);
  }
  updateMagnifierUi();
  if (state.magEnabled) {
    const sr = els.stage.getBoundingClientRect();
    positionMagnifier(state.magX ?? sr.width * 0.5, state.magY ?? sr.height * 0.48);
  }
  schedulePersistState();
}

function setMagnifierEnabled(enabled, { persist = false } = {}) {
  const next = Boolean(enabled && state.pdfDoc);
  state.magEnabled = next;
  if (!next) {
    state.magDragging = false;
    state.magResizing = null;
    els.magLens?.classList.remove('is-dragging', 'is-resizing');
    if (state.magRedrawRaf) {
      cancelAnimationFrame(state.magRedrawRaf);
      state.magRedrawRaf = 0;
    }
    clearMagnifierCache();
    updateMagnifierUi();
    if (persist) schedulePersistState();
    return;
  }
  updateMagnifierUi();
  if (state.magX === null || state.magY === null) {
    const def = getDefaultMagnifierCenter();
    positionMagnifier(def.x, def.y);
  } else {
    positionMagnifier(state.magX, state.magY);
  }
  if (persist) schedulePersistState();
}

function setMagnifierStyle(style) {
  state.magStyle = style === 'bar' ? 'bar' : 'circle';
  updateMagnifierUi();
  if (state.magEnabled) {
    const sr = els.stage.getBoundingClientRect();
    positionMagnifier(state.magX ?? sr.width * 0.5, state.magY ?? sr.height * 0.48);
  }
  schedulePersistState();
}

function setMagnifierPower(power) {
  const num = Number(power);
  if (!Number.isFinite(num)) return;
  state.magPower = clamp(Math.round(num * 10) / 10, 1.4, 4.5);
  updateMagnifierUi();
  if (state.magEnabled) scheduleMagnifierRedraw();
  schedulePersistState();
}

/* ---------- Paper Warmth Tint & Subtle Cellulose Fiber Texture ---------- */
const PAPER_WARM_STOPS = [
  [0, 255, 255, 255],
  [35, 251, 245, 232],
  [70, 245, 233, 206],
  [100, 234, 213, 174],
];

const PAPER_REVERSE_STOPS = [
  [0, 248, 247, 243],
  [50, 236, 223, 196],
  [100, 214, 193, 154],
];

const paperGrainTileCache = new Map(); // style -> { canvas, url, pattern }

function interpolatePaperRgb(stops, val) {
  const v = clamp(Number(val) || 0, 0, 100);
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ar, ag, ab] = stops[i];
    const [b, br, bg, bb] = stops[i + 1];
    if (v <= b) {
      const t = b > a ? (v - a) / (b - a) : 0;
      const r = Math.round(ar + (br - ar) * t);
      const g = Math.round(ag + (bg - ag) * t);
      const bl = Math.round(ab + (bb - ab) * t);
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  const [, lr, lg, lb] = stops[stops.length - 1];
  return `rgb(${lr}, ${lg}, ${lb})`;
}

function getPaperSurfaceColor(reverseBack = false) {
  return interpolatePaperRgb(reverseBack ? PAPER_REVERSE_STOPS : PAPER_WARM_STOPS, state.paperWarmth);
}

function createPrng(seedInit) {
  let seed = seedInit >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function strokeWrappedLine(gctx, size, x1, y1, x2, y2) {
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      gctx.beginPath();
      gctx.moveTo(x1 + ox, y1 + oy);
      gctx.lineTo(x2 + ox, y2 + oy);
      gctx.stroke();
    }
  }
}

function buildPaperGrainTile(styleKey) {
  const style = PAPER_GRAIN_STYLES.includes(styleKey) ? styleKey : 'cotton';
  if (paperGrainTileCache.has(style)) return paperGrainTileCache.get(style);

  const size = 160;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const gctx = c.getContext('2d');
  const rand = createPrng(
    style === 'linen' ? 0x2c1b4715 : style === 'parchment' ? 0x7f4a7c15 : style === 'kraft' ? 0x9e3779b9 : 0x517cc1b7
  );

  const img = gctx.createImageData(size, size);
  const data = img.data;
  const twoPi = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let tone = 248 + Math.floor(rand() * 8);
      if (style === 'linen') {
        const warp = Math.sin((x / 4) * twoPi) * 3.5;
        const weft = Math.sin((y / 4) * twoPi) * 3.5;
        const weave = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? warp : weft);
        tone = clamp(Math.round(249 + weave + (rand() - 0.5) * 6), 232, 255);
      } else if (style === 'parchment') {
        const cloud =
          Math.sin((x * twoPi) / size + Math.cos((y * twoPi) / size)) * 5.5 +
          Math.cos((y * twoPi * 2) / size - (x * twoPi) / size) * 4.0 +
          Math.sin(((x + y) * twoPi * 3) / size) * 2.5;
        tone = clamp(Math.round(247 + cloud + (rand() - 0.5) * 8), 224, 255);
      } else if (style === 'kraft') {
        tone = clamp(Math.round(238 + rand() * 17), 220, 255);
      } else {
        tone = 244 + Math.floor(rand() * 12);
      }
      data[idx] = tone;
      data[idx + 1] = clamp(tone - Math.floor(rand() * (style === 'kraft' ? 5 : 2)), 0, 255);
      data[idx + 2] = clamp(tone - Math.floor(rand() * (style === 'kraft' ? 10 : 4)), 0, 255);
      data[idx + 3] = 255;
    }
  }
  gctx.putImageData(img, 0, 0);

  if (style === 'linen') {
    gctx.lineWidth = 0.7;
    for (let y = 0; y < size; y += 5) {
      gctx.strokeStyle = 'rgba(186, 178, 162, 0.14)';
      strokeWrappedLine(gctx, size, 0, y, size, y);
    }
    for (let x = 0; x < size; x += 5) {
      gctx.strokeStyle = 'rgba(192, 184, 168, 0.12)';
      strokeWrappedLine(gctx, size, x, 0, x, size);
    }
  } else {
    const fiberCount = style === 'kraft' ? 270 : style === 'parchment' ? 120 : 175;
    gctx.lineWidth = style === 'kraft' ? 0.95 : 0.65;
    for (let i = 0; i < fiberCount; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = style === 'kraft' ? 4 + rand() * 12 : 3 + rand() * 8;
      const ang = rand() * Math.PI * 2;
      const shade = style === 'kraft' ? 175 + Math.floor(rand() * 44) : 208 + Math.floor(rand() * 28);
      const alpha = style === 'kraft' ? 0.28 : 0.22;
      gctx.strokeStyle = `rgba(${shade}, ${shade - 5}, ${shade - 12}, ${alpha})`;
      strokeWrappedLine(gctx, size, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    }
    if (style === 'kraft' || style === 'parchment') {
      const speckCount = style === 'kraft' ? 120 : 55;
      for (let i = 0; i < speckCount; i++) {
        const sx = rand() * size;
        const sy = rand() * size;
        const r = style === 'kraft' ? 0.65 + rand() * 0.9 : 0.55 + rand() * 0.7;
        gctx.fillStyle = style === 'kraft' ? 'rgba(155, 134, 108, 0.25)' : 'rgba(186, 165, 132, 0.18)';
        gctx.beginPath();
        gctx.arc(sx, sy, r, 0, Math.PI * 2);
        gctx.fill();
      }
    }
  }

  let url = '';
  try {
    url = `url("${c.toDataURL('image/png')}")`;
  } catch {
    url = '';
  }
  const entry = { canvas: c, url, pattern: null };
  paperGrainTileCache.set(style, entry);
  return entry;
}

let lastAppliedGrainUrlStyle = null;
let paperComfortRaf = 0;

function initPaperGrainTexture() {
  const entry = buildPaperGrainTile(state.paperGrainStyle);
  if (entry.url && lastAppliedGrainUrlStyle !== state.paperGrainStyle) {
    lastAppliedGrainUrlStyle = state.paperGrainStyle;
    document.documentElement.style.setProperty('--paper-grain-url', entry.url);
  }
  return entry.canvas;
}

function prewarmPaperGrainTiles() {
  let idx = 0;
  const next = () => {
    if (idx >= PAPER_GRAIN_STYLES.length) return;
    buildPaperGrainTile(PAPER_GRAIN_STYLES[idx++]);
    if (idx < PAPER_GRAIN_STYLES.length) setTimeout(next, 24);
  };
  setTimeout(next, 24);
}

function drawMagPaperGrain(ctx, x, y, w, h) {
  if (state.readDark || !state.paperGrain || w <= 0 || h <= 0) return;
  const entry = buildPaperGrainTile(state.paperGrainStyle);
  if (!entry.pattern) {
    try {
      entry.pattern = ctx.createPattern(entry.canvas, 'repeat');
    } catch {
      entry.pattern = null;
    }
  }
  if (!entry.pattern) return;
  const tilePx = clamp(Number(state.paperGrainScalePx) || 160, 90, 280);
  const scaleMult = tilePx / 160;
  if (typeof entry.pattern.setTransform === 'function') {
    entry.pattern.setTransform(new DOMMatrix().scale(scaleMult, scaleMult));
  }
  const strengthAlpha = (clamp(state.paperGrainStrength, 10, 100) / 100) * 0.85;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha *= strengthAlpha;
  ctx.fillStyle = entry.pattern;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function formatPaperWarmthLabel(val) {
  const v = Math.round(clamp(val, 0, 100));
  if (v <= 2) return 'Crisp';
  if (v < 40) return `Ivory · ${v}%`;
  if (v < 75) return `Cream · ${v}%`;
  return `Sepia · ${v}%`;
}

function formatPaperStyleName(style) {
  if (style === 'linen') return 'Linen';
  if (style === 'parchment') return 'Parchment';
  if (style === 'kraft') return 'Kraft';
  return 'Cotton';
}

function updatePaperComfortUi() {
  const v = clamp(Math.round(state.paperWarmth), 0, 100);
  const strength = clamp(Math.round(state.paperGrainStrength), 10, 100);
  const style = PAPER_GRAIN_STYLES.includes(state.paperGrainStyle) ? state.paperGrainStyle : 'cotton';
  const tilePx = clamp(Math.round(Number(state.paperGrainScalePx) || 160), 90, 280);

  const bg = interpolatePaperRgb(PAPER_WARM_STOPS, v);
  const revBg = interpolatePaperRgb(PAPER_REVERSE_STOPS, v);
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--paper-bg', bg);
  rootStyle.setProperty('--paper-reverse-bg', revBg);
  rootStyle.setProperty('--paper-warmth', (v / 100).toFixed(2));
  rootStyle.setProperty('--paper-grain-opacity', ((strength / 100) * 0.85).toFixed(3));
  rootStyle.setProperty('--paper-grain-size', `${tilePx}px`);

  if (state.paperGrain) initPaperGrainTexture();
  document.body.classList.toggle('has-warm-paper', v > 0);
  document.body.classList.toggle('has-paper-grain', !!state.paperGrain);

  if (els.valPaperWarmth) els.valPaperWarmth.textContent = formatPaperWarmthLabel(v);
  if (els.paperWarmthRange) els.paperWarmthRange.value = String(v);
  if (els.paperWarmthPresets) {
    els.paperWarmthPresets.querySelectorAll('.auto-pill').forEach((btn) => {
      btn.classList.toggle('active', Math.abs(Number(btn.dataset.warm) - v) <= 5);
    });
  }
  if (els.menuPaperGrain) {
    els.menuPaperGrain.classList.toggle('is-on', !!state.paperGrain);
    els.menuPaperGrain.setAttribute('aria-pressed', String(!!state.paperGrain));
  }
  if (els.valPaperGrain) {
    els.valPaperGrain.textContent = state.paperGrain ? `${formatPaperStyleName(style)} · ${strength}%` : '';
  }
  if (els.paperFiberControls) {
    els.paperFiberControls.classList.toggle('is-dimmed', !state.paperGrain);
  }
  if (els.paperGrainRange) els.paperGrainRange.value = String(strength);
  if (els.paperGrainInput && document.activeElement !== els.paperGrainInput) {
    els.paperGrainInput.value = String(strength);
  }
  if (els.paperGrainStylePills) {
    els.paperGrainStylePills.querySelectorAll('.auto-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });
  }
  if (els.valPaperScale) els.valPaperScale.textContent = `${tilePx}px`;
  if (els.paperGrainScaleRange) els.paperGrainScaleRange.value = String(tilePx);
  if (els.paperGrainScaleInput && document.activeElement !== els.paperGrainScaleInput) {
    els.paperGrainScaleInput.value = String(tilePx);
  }
  if (els.paperGrainScalePills) {
    els.paperGrainScalePills.querySelectorAll('.auto-pill').forEach((btn) => {
      const targetPx = Number(btn.dataset.scale);
      btn.classList.toggle('active', Math.abs(targetPx - tilePx) <= 10);
    });
  }
}

function schedulePaperComfortUiUpdate() {
  if (paperComfortRaf) return;
  paperComfortRaf = requestAnimationFrame(() => {
    paperComfortRaf = 0;
    updatePaperComfortUi();
    if (state.magEnabled) scheduleMagnifierRedraw();
  });
}

function setPaperWarmth(val, persist = true, coalesce = false) {
  const num = Number(val);
  state.paperWarmth = Number.isFinite(num) ? clamp(Math.round(num), 0, 100) : 0;
  if (coalesce) schedulePaperComfortUiUpdate();
  else {
    updatePaperComfortUi();
    if (state.magEnabled) scheduleMagnifierRedraw();
  }
  if (persist) schedulePersistState();
}

function setPaperGrain(enabled, persist = true) {
  state.paperGrain = !!enabled;
  updatePaperComfortUi();
  if (state.magEnabled) scheduleMagnifierRedraw();
  if (persist) schedulePersistState();
}

function setPaperGrainStrength(val, persist = true, coalesce = false) {
  const num = Number(val);
  state.paperGrainStrength = Number.isFinite(num) ? clamp(Math.round(num), 10, 100) : 50;
  state.paperGrain = true;
  if (coalesce) schedulePaperComfortUiUpdate();
  else {
    updatePaperComfortUi();
    if (state.magEnabled) scheduleMagnifierRedraw();
  }
  if (persist) schedulePersistState();
}

function setPaperGrainStyle(style, persist = true) {
  state.paperGrainStyle = PAPER_GRAIN_STYLES.includes(style) ? style : 'cotton';
  state.paperGrain = true;
  updatePaperComfortUi();
  if (state.magEnabled) scheduleMagnifierRedraw();
  if (persist) schedulePersistState();
}

function setPaperGrainScalePx(val, persist = true, coalesce = false) {
  const num = Number(val);
  state.paperGrainScalePx = Number.isFinite(num) ? clamp(Math.round(num), 90, 280) : 160;
  state.paperGrain = true;
  if (coalesce) schedulePaperComfortUiUpdate();
  else {
    updatePaperComfortUi();
    if (state.magEnabled) scheduleMagnifierRedraw();
  }
  if (persist) schedulePersistState();
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
    els.btnDarkRead.setAttribute('aria-pressed', String(state.readDark));
  }
  state.pageFlip?.refreshSnapshots?.();
  if (Number.isInteger(singleStackMeta.renderedIdx) && els.singleCollectedStack && !els.singleCollectedStack.hidden) {
    paintSingleStackTopCard(singleStackMeta.renderedIdx, { force: true });
  }
  if (state.readDark && state.scrollMode === 'flip' && state.zoom <= 1.05) {
    requestAnimationFrame(() => {
      for (const i of getVisibleIndices()) {
        const c = state.pageNodes[i]?.querySelector('canvas.fb-canvas');
        if (c) getBakedDarkCanvas(c);
      }
    });
  }
  if (state.magEnabled) {
    scheduleMagnifierRedraw();
  }
  if (state.curtainEnabled) {
    positionFocusCurtain();
  }
  if (persist) schedulePersistState();
}

function populateAmbientPresetSelect() {
  if (!els.ambientPresetSelect) return;
  els.ambientPresetSelect.innerHTML = '';
  for (const preset of AMBIENT_PRESETS) {
    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.textContent = preset.label;
    els.ambientPresetSelect.appendChild(opt);
  }
  updateAmbientSoundUi();
}

function updateAmbientSoundUi({ syncPreset = true, syncVolume = true } = {}) {
  const info = ambientSound.getPresetInfo(state.ambientPreset);
  state.ambientPreset = info.id;
  state.ambientVolume = clamp(Math.round(Number(state.ambientVolume) || 0), 0, 100);
  if (syncVolume) ambientSound.setVolume(state.ambientVolume);
  if (syncPreset) ambientSound.setPreset(state.ambientPreset);

  if (els.valAmbientSound) {
    els.valAmbientSound.textContent = info.label;
  }
  if (els.valAmbientVol) {
    els.valAmbientVol.textContent = `${state.ambientVolume}%`;
  }
  if (els.ambientVolRange) {
    els.ambientVolRange.value = String(state.ambientVolume);
  }
  if (els.ambientVolRow) {
    els.ambientVolRow.classList.toggle('is-dimmed', state.ambientPreset === 'off');
  }
  if (els.ambientPresetSelect) {
    els.ambientPresetSelect.value = state.ambientPreset;
  }
}

function setAmbientSoundPreset(presetId, persist = true) {
  state.ambientPreset = normalizeAmbientPresetId(presetId);
  updateAmbientSoundUi({ syncPreset: true, syncVolume: true });
  if (state.ambientPreset !== 'off' && !window.webkit?.messageHandlers?.flipbook) {
    ambientSound.unlock();
  }
  if (persist) schedulePersistState();
}

function setAmbientSoundVolume(vol, persist = true) {
  const v = Number(vol);
  if (!Number.isFinite(v)) return;
  state.ambientVolume = clamp(Math.round(v), 0, 100);
  updateAmbientSoundUi({ syncPreset: false, syncVolume: true });
  if (persist) schedulePersistState();
}

/** Toggle visibility on SVG icons where HTML `.hidden` IDL property does not reflect the attribute. */
function setSvgHidden(el, hidden) {
  if (!el) return;
  el.toggleAttribute('hidden', Boolean(hidden));
  el.style.display = hidden ? 'none' : '';
}

function updateSoundUi() {
  flipSound.setPreset(state.soundPreset);
  flipSound.setEnabled(state.soundEnabled);
  setSvgHidden(els.iconSoundOn, !state.soundEnabled);
  setSvgHidden(els.iconSoundOff, state.soundEnabled);

  const info = flipSound.getPresetInfo(state.soundPreset);
  state.soundPreset = info.id;
  if (els.valSoundPreset) {
    els.valSoundPreset.textContent = state.soundEnabled ? info.label : 'Muted';
  }
  if (els.btnSound) {
    els.btnSound.classList.toggle('active', state.soundEnabled);
    els.btnSound.classList.toggle('is-muted', !state.soundEnabled);
    els.btnSound.setAttribute('aria-pressed', String(state.soundEnabled));
    els.btnSound.title = state.soundEnabled
      ? `Page Turn Sound: ${info.fullName} (Click to mute, Right-click for presets)`
      : 'Page Turn Sound: Muted (Click to enable, Right-click for presets)';
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

  if (els.menuAutoFlip) {
    const autoFlipOn = Boolean(state.autoFlipEnabled);
    els.menuAutoFlip.classList.toggle('is-on', autoFlipOn);
    els.menuAutoFlip.setAttribute('aria-pressed', String(autoFlipOn));
  }
  if (els.valAutoFlip) {
    els.valAutoFlip.textContent = secLabel;
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

  if (els.menuAutoScrollToggle) {
    const autoScrollOn = Boolean(state.autoScrollEnabled);
    els.menuAutoScrollToggle.classList.toggle('is-on', autoScrollOn);
    els.menuAutoScrollToggle.setAttribute('aria-pressed', String(autoScrollOn));
  }
  if (els.valAutoScroll) {
    els.valAutoScroll.textContent = spdLabel;
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
    const showHud = Boolean(state.pdfDoc && ((isScroll && state.autoScrollEnabled) || (!isScroll && state.autoFlipEnabled)));
    els.autoPlaybackHud.hidden = !showHud;
    if (showHud) {
      const playing = isScroll ? state.autoScrollPlaying : (state.autoFlipEnabled && !state.autoFlipPaused);
      setSvgHidden(els.iconHudPlay, playing);
      setSvgHidden(els.iconHudPause, !playing);
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
        els.btnHudStop.title = isScroll ? 'Stop Auto-Scroll' : 'Stop Auto-Flip';
        els.btnHudStop.setAttribute('aria-label', els.btnHudStop.title);
      }
    }
  }
}

function updateMenuValues() {
  if (els.valScrollMode) {
    const isScroll = state.scrollMode === 'scroll';
    els.valScrollMode.textContent = isScroll ? 'Scroll' : 'Book Flip';
    els.menuScrollMode?.classList.toggle('is-alt', isScroll);
  }
  els.valPageMode.textContent = state.pageMode === 'single' ? 'Single' : state.pageMode === 'double' ? 'Double' : 'Auto (Double)';
  els.menuPageMode?.classList.toggle('is-alt', state.pageMode !== 'auto');

  els.menuHardCover?.classList.toggle('is-on', !!state.showCover);
  els.menuHardCover?.setAttribute('aria-pressed', String(!!state.showCover));

  els.valClickMode.textContent = state.clickMode === 'smart' ? 'Corner + Select' : 'Click Anywhere';
  els.menuClickMode?.classList.toggle('is-alt', state.clickMode !== 'smart');

  els.menuAutoHideBars?.classList.toggle('is-on', !!state.autoHideBars);
  els.menuAutoHideBars?.setAttribute('aria-pressed', String(!!state.autoHideBars));

  els.menuTwoFingerPan?.classList.toggle('is-on', !!state.twoFingerPan);
  els.menuTwoFingerPan?.setAttribute('aria-pressed', String(!!state.twoFingerPan));

  updatePaperComfortUi();
  updatePlaybackUi();
}

function toggleTwoFingerPan() {
  state.twoFingerPan = !state.twoFingerPan;
  updateMenuValues();
  schedulePersistState();
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

function isAtLastFlipSpread() {
  if (!state.pageFlip || !state.totalPages) return true;
  if (Array.isArray(state.pageFlip.spreads) && state.pageFlip.spreads.length) {
    return state.pageFlip.currentSpreadIndex >= state.pageFlip.spreads.length - 1;
  }
  const vis = getVisibleIndices();
  return (vis[vis.length - 1] ?? 0) >= state.totalPages - 1;
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
      if (isAtLastFlipSpread()) {
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
  if (isAtLastFlipSpread()) {
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
    state.autoScrollEnabled = false;
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
    if (maxScroll <= 0) {
      state.autoScrollPlaying = false;
      state.autoScrollEnabled = false;
      state.autoScrollRafId = 0;
      updatePlaybackUi();
      return;
    }
    if (Math.abs(sv.scrollTop - state.autoScrollPosY) > 3) {
      state.autoScrollPosY = sv.scrollTop;
    }
    const zoomFactor = 0.65 + 0.35 * clamp(state.zoom, 1, 3);
    const pxPerSec = clamp(state.autoScrollSpeed, 0.2, 5) * 48 * zoomFactor;
    state.autoScrollPosY = Math.min(maxScroll, state.autoScrollPosY + pxPerSec * dt);
    sv.scrollTop = state.autoScrollPosY;
    if (state.autoScrollPosY >= maxScroll - 0.5) {
      state.autoScrollPlaying = false;
      state.autoScrollEnabled = false;
      state.autoScrollRafId = 0;
      updatePlaybackUi();
      return;
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
    state.autoScrollEnabled = true;
    startAutoScrollLoop();
  } else {
    stopAutoScroll({ resetPlaying: false });
  }
}

function toggleAutoScrollPlay() {
  setAutoScrollPlaying(!state.autoScrollPlaying);
}

function toggleAutoScrollEnabled() {
  if (state.scrollMode !== 'scroll' || !state.pdfDoc) return;
  if (state.autoScrollEnabled) {
    stopAutoScroll({ resetPlaying: true });
  } else {
    setAutoScrollPlaying(true);
  }
}

function openDrawerTab(tabName) {
  const normalized = tabName === 'highlights' ? 'bookmarks' : tabName;
  if (tabName === 'highlights') {
    state.savesCategory = 'highlights';
  }
  els.sideDrawer.hidden = false;
  els.btnHighlightsTop?.classList.add('active');
  document.querySelectorAll('.drawer-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === normalized);
  });
  document.querySelectorAll('.drawer-pane').forEach((p) => p.classList.remove('active'));
  const targetMap = {
    toc: 'paneToc',
    search: 'paneSearch',
    bookmarks: 'paneBookmarks',
    text: 'paneText',
  };
  document.getElementById(targetMap[normalized])?.classList.add('active');
  if (normalized === 'search') {
    setTimeout(() => els.searchInput.focus(), 40);
  } else if (normalized === 'text') {
    refreshTextPane();
  } else if (normalized === 'bookmarks') {
    updateBookmarkUi();
    updateHighlightsUi();
  }
}

function syncFullscreenUi() {
  const isFull = Boolean(document.fullscreenElement || document.documentElement.classList.contains('mac-fullscreen'));
  if (els.btnFullscreen) {
    els.btnFullscreen.classList.toggle('active', isFull);
    els.btnFullscreen.setAttribute('aria-pressed', String(isFull));
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
    const endScsDrag = () => {
      if (!scsDrag) return;
      scsDrag = null;
      updateSingleDragPickup({ active: false });
    };
    window.addEventListener('blur', endScsDrag);
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
    if (!els.moreMenu.hidden) prewarmPaperGrainTiles();
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

  const openLibraryModal = () => {
    closeMarginNotePopover();
    closeStickyTabPopover();
    closePageContextMenu();
    hideHighlightPopover();
    els.moreMenu.hidden = true;
    fetchLibrary({ applySettings: false });
    els.libraryModal.hidden = false;
  };

  const openShortcutsModal = () => {
    closeMarginNotePopover();
    closeStickyTabPopover();
    closePageContextMenu();
    hideHighlightPopover();
    els.moreMenu.hidden = true;
    els.btnMore?.classList.remove('active');
    if (els.libraryModal) els.libraryModal.hidden = true;
    if (els.aboutModal) els.aboutModal.hidden = true;
    if (els.lookupModal) els.lookupModal.hidden = true;
    if (els.shortcutsModal) els.shortcutsModal.hidden = false;
  };
  els.btnShortcutsApp?.addEventListener('click', openShortcutsModal);
  els.btnCloseShortcuts?.addEventListener('click', () => {
    if (els.shortcutsModal) els.shortcutsModal.hidden = true;
  });
  els.shortcutsModal?.addEventListener('click', (e) => {
    if (e.target === els.shortcutsModal) els.shortcutsModal.hidden = true;
  });

  els.btnCloseLookup?.addEventListener('click', () => {
    if (els.lookupModal) els.lookupModal.hidden = true;
  });
  els.lookupModal?.addEventListener('click', (e) => {
    if (e.target === els.lookupModal) els.lookupModal.hidden = true;
  });

  const openAboutModal = () => {
    closeMarginNotePopover();
    closeStickyTabPopover();
    closePageContextMenu();
    hideHighlightPopover();
    els.moreMenu.hidden = true;
    els.btnMore?.classList.remove('active');
    if (els.libraryModal) els.libraryModal.hidden = true;
    if (els.shortcutsModal) els.shortcutsModal.hidden = true;
    if (els.lookupModal) els.lookupModal.hidden = true;
    if (els.aboutModal) els.aboutModal.hidden = false;
  };
  els.btnAboutApp?.addEventListener('click', openAboutModal);
  els.menuAboutCard?.addEventListener('click', openAboutModal);
  els.menuAboutCard?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAboutModal();
    }
  });
  els.btnCloseAbout?.addEventListener('click', () => {
    if (els.aboutModal) els.aboutModal.hidden = true;
  });
  els.aboutModal?.addEventListener('click', (e) => {
    if (e.target === els.aboutModal) els.aboutModal.hidden = true;
  });

  els.btnOpenTop.addEventListener('click', openLibraryModal);
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
    if (state.magEnabled) scheduleMagnifierRedraw();
  });
  els.btnMagnifier?.addEventListener('click', () => {
    setMagnifierEnabled(!state.magEnabled);
    els.btnMagnifier.blur();
  });
  els.btnFocusCurtain?.addEventListener('click', () => {
    toggleFocusCurtain();
    els.btnFocusCurtain.blur();
  });
  [els.btnCurtain1L, els.btnCurtain2L, els.btnCurtain3L, els.btnCurtain4L].forEach((btn) => {
    btn?.addEventListener('click', () => {
      const lines = Number(btn.dataset.curtainLines);
      if (CURTAIN_LINE_PRESETS[lines]) setFocusCurtainHeight(CURTAIN_LINE_PRESETS[lines]);
    });
  });
  els.btnCurtainHeightDec?.addEventListener('click', () => stepFocusCurtainHeight(-1));
  els.btnCurtainHeightInc?.addEventListener('click', () => stepFocusCurtainHeight(1));
  els.btnCurtainLengthDec?.addEventListener('click', () => stepFocusCurtainLength(-1));
  els.btnCurtainLengthInc?.addEventListener('click', () => stepFocusCurtainLength(1));
  els.btnCurtainDimDec?.addEventListener('click', () => stepFocusCurtainDim(-1));
  els.btnCurtainDimInc?.addEventListener('click', () => stepFocusCurtainDim(1));
  els.btnCurtainTone?.addEventListener('click', () => cycleFocusCurtainTone());
  els.btnCurtainGuide?.addEventListener('click', () => {
    state.curtainGuide = !state.curtainGuide;
    updateFocusCurtainUi();
    schedulePersistState();
    els.btnCurtainGuide.blur();
  });
  els.btnCurtainFollow?.addEventListener('click', () => {
    state.curtainFollow = !state.curtainFollow;
    updateFocusCurtainUi();
    schedulePersistState();
    els.btnCurtainFollow.blur();
  });
  els.btnCurtainClose?.addEventListener('click', () => setFocusCurtainEnabled(false, { persist: true }));

  // Direct edge-resize (N/S size, W/E length) and drag repositioning in Place & Resize mode
  let curtainDragState = null;
  let curtainResizeState = null;
  els.focusCurtainBand?.addEventListener('pointerdown', (e) => {
    if (!state.curtainEnabled || state.curtainFollow) return;
    if (e.button !== 0) return;
    const resizeKind = e.target?.closest?.('[data-curtain-resize]')?.dataset?.curtainResize;
    const sr = els.stage?.getBoundingClientRect();
    const box = getFocusCurtainBookRect();
    if (!sr || !box) return;
    e.preventDefault();
    e.stopPropagation();

    const boxLeft = Math.round(box.left);
    const boxTop = Math.round(box.top);
    const boxW = Math.round(box.width);
    const boxH = Math.round(box.height);
    const g = getCurtainSlotGeometry(boxW, boxH, boxLeft, boxTop);
    els.focusCurtainBand.setPointerCapture?.(e.pointerId);

    if (resizeKind) {
      state.curtainResizing = resizeKind;
      curtainResizeState = {
        kind: resizeKind,
        left: g.slotLeft,
        top: g.slotTop,
        right: g.slotRight,
        bottom: g.slotBottom,
        boxLeft,
        boxTop,
        boxW,
        boxH,
        srLeft: sr.left,
        srTop: sr.top,
      };
      return;
    }

    state.curtainDragging = true;
    els.focusCurtainBand.classList.add('is-dragging');
    curtainDragState = {
      dx: g.clampedCx - (e.clientX - sr.left),
      dy: g.clampedCy - (e.clientY - sr.top),
    };
  });
  els.focusCurtainBand?.addEventListener('pointermove', (e) => {
    if (state.curtainResizing && curtainResizeState) {
      const r = curtainResizeState;
      const localX = clamp((e.clientX - r.srLeft) - r.boxLeft, 0, r.boxW);
      const localY = clamp((e.clientY - r.srTop) - r.boxTop, 0, r.boxH);
      const minW = Math.min(r.boxW, Math.max(72, Math.round(r.boxW * 0.2)));
      const maxH = Math.min(360, Math.max(24, r.boxH - 4));
      let nextCx = state.curtainX;
      let nextCy = state.curtainY;

      if (r.kind === 'e') {
        const newRight = clamp(localX, r.left + minW, r.boxW);
        const nextPct = clamp(Math.round(((newRight - r.left) / r.boxW) * 100), 20, 100);
        const qW = clamp(Math.round((nextPct / 100) * r.boxW), minW, r.boxW - r.left);
        state.curtainLengthPct = nextPct;
        nextCx = r.boxLeft + r.left + qW / 2;
      } else if (r.kind === 'w') {
        const newLeft = clamp(localX, 0, r.right - minW);
        const nextPct = clamp(Math.round(((r.right - newLeft) / r.boxW) * 100), 20, 100);
        const qW = clamp(Math.round((nextPct / 100) * r.boxW), minW, r.right);
        state.curtainLengthPct = nextPct;
        nextCx = r.boxLeft + r.right - qW / 2;
      } else if (r.kind === 's') {
        const newBottom = clamp(localY, r.top + 22, Math.min(r.boxH, r.top + maxH));
        state.curtainHeight = clamp(Math.round(newBottom - r.top), 22, maxH);
        nextCy = r.boxTop + (r.top + newBottom) / 2;
      } else if (r.kind === 'n') {
        const newTop = clamp(localY, Math.max(0, r.bottom - maxH), r.bottom - 22);
        state.curtainHeight = clamp(Math.round(r.bottom - newTop), 22, maxH);
        nextCy = r.boxTop + (newTop + r.bottom) / 2;
      }
      updateFocusCurtainUi();
      positionFocusCurtain(nextCy, nextCx);
      return;
    }
    if (state.curtainDragging && curtainDragState) {
      const sr = els.stage?.getBoundingClientRect();
      if (!sr) return;
      positionFocusCurtain(
        (e.clientY - sr.top) + curtainDragState.dy,
        (e.clientX - sr.left) + curtainDragState.dx
      );
    }
  });
  const endCurtainPointer = (e) => {
    if (state.curtainResizing || state.curtainDragging) {
      state.curtainResizing = null;
      state.curtainDragging = false;
      curtainResizeState = null;
      curtainDragState = null;
      els.focusCurtainBand?.classList.remove('is-dragging');
      schedulePersistState();
      if (e?.pointerId !== undefined) {
        try { els.focusCurtainBand?.releasePointerCapture?.(e.pointerId); } catch {}
      }
    }
  };
  els.focusCurtainBand?.addEventListener('pointerup', endCurtainPointer);
  els.focusCurtainBand?.addEventListener('pointercancel', endCurtainPointer);
  els.focusCurtainBand?.addEventListener('lostpointercapture', endCurtainPointer);
  window.addEventListener('blur', () => endCurtainPointer(null));

  els.btnMagShapeCircle?.addEventListener('click', () => setMagnifierStyle('circle'));
  els.btnMagShapeBar?.addEventListener('click', () => setMagnifierStyle('bar'));
  els.btnMagPowerDec?.addEventListener('click', () => setMagnifierPower(state.magPower - 0.2));
  els.btnMagPowerInc?.addEventListener('click', () => setMagnifierPower(state.magPower + 0.2));
  els.btnMagSizeDec?.addEventListener('click', () => stepMagnifierSize(-1));
  els.btnMagSizeInc?.addEventListener('click', () => stepMagnifierSize(1));
  els.btnMagFollow?.addEventListener('click', () => {
    state.magFollow = !state.magFollow;
    updateMagnifierUi();
    els.btnMagFollow.blur();
  });
  els.btnMagClose?.addEventListener('click', () => setMagnifierEnabled(false));

  // Drag-and-Place on book + direct edge/corner resizing + wheel zoom power
  let magDragOffset = null;
  let magResizeStart = null;
  els.magLens?.addEventListener('pointerdown', (e) => {
    if (!state.magEnabled || state.magFollow) return;
    if (e.button !== 0) return;
    const resizeKind = e.target?.closest?.('[data-mag-resize]')?.dataset?.magResize;
    const sr = els.stage.getBoundingClientRect();
    e.preventDefault();
    e.stopPropagation();

    if (resizeKind) {
      const { w, h } = getMagnifierDimensions();
      const curX = state.magX ?? sr.width * 0.5;
      const curY = state.magY ?? sr.height * 0.48;
      state.magResizing = resizeKind;
      els.magLens.classList.add('is-resizing');
      els.magLens.setPointerCapture?.(e.pointerId);
      magResizeStart = {
        kind: resizeKind,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startW: w,
        startH: h,
        leftEdge: curX - w / 2,
        topEdge: curY - h / 2,
      };
      return;
    }

    state.magDragging = true;
    els.magLens.classList.add('is-dragging');
    els.magLens.setPointerCapture?.(e.pointerId);
    const curX = state.magX ?? sr.width * 0.5;
    const curY = state.magY ?? sr.height * 0.48;
    magDragOffset = { dx: curX - (e.clientX - sr.left), dy: curY - (e.clientY - sr.top) };
  });
  els.magLens?.addEventListener('pointermove', (e) => {
    if (state.magResizing && magResizeStart) {
      const dx = e.clientX - magResizeStart.startClientX;
      const dy = e.clientY - magResizeStart.startClientY;
      const stageW = els.stage?.clientWidth || window.innerWidth || 1000;
      const stageH = els.stage?.clientHeight || window.innerHeight || 700;
      if (state.magStyle === 'circle') {
        const delta = Math.max(dx, dy) === dx ? dx : dy;
        const avgDelta = (dx + dy) * 0.65;
        const maxCircle = Math.max(110, Math.min(420, Math.min(stageW, stageH) - 24));
        const newSize = clamp(Math.round(magResizeStart.startW + (Math.abs(dx) > Math.abs(dy) * 1.4 || Math.abs(dy) > Math.abs(dx) * 1.4 ? delta : avgDelta)), 110, maxCircle);
        state.magCircleSize = newSize;
        updateMagnifierUi();
        positionMagnifier(magResizeStart.leftEdge + newSize / 2, magResizeStart.topEdge + newSize / 2);
      } else {
        const maxBarW = Math.max(180, stageW - 24);
        const maxBarH = Math.max(60, Math.min(240, stageH - 90));
        const newW = magResizeStart.kind === 's'
          ? magResizeStart.startW
          : clamp(Math.round(magResizeStart.startW + dx), 180, maxBarW);
        const newH = magResizeStart.kind === 'e'
          ? magResizeStart.startH
          : clamp(Math.round(magResizeStart.startH + dy), 48, maxBarH);
        state.magBarWidth = newW;
        state.magBarHeight = newH;
        updateMagnifierUi();
        positionMagnifier(magResizeStart.leftEdge + newW / 2, magResizeStart.topEdge + newH / 2);
      }
      return;
    }
    if (!state.magDragging || !magDragOffset) return;
    const sr = els.stage.getBoundingClientRect();
    positionMagnifier((e.clientX - sr.left) + magDragOffset.dx, (e.clientY - sr.top) + magDragOffset.dy);
  });
  const endMagPointer = (e) => {
    if (state.magResizing) {
      state.magResizing = null;
      magResizeStart = null;
      els.magLens?.classList.remove('is-resizing');
      schedulePersistState();
      if (e?.pointerId !== undefined) {
        try { els.magLens?.releasePointerCapture?.(e.pointerId); } catch {}
      }
    }
    if (state.magDragging) {
      state.magDragging = false;
      magDragOffset = null;
      els.magLens?.classList.remove('is-dragging');
      if (e?.pointerId !== undefined) {
        try { els.magLens?.releasePointerCapture?.(e.pointerId); } catch {}
      }
    }
  };
  els.magLens?.addEventListener('pointerup', endMagPointer);
  els.magLens?.addEventListener('pointercancel', endMagPointer);
  els.magLens?.addEventListener('lostpointercapture', endMagPointer);
  window.addEventListener('blur', () => endMagPointer(null));
  els.magLens?.addEventListener('wheel', (e) => {
    if (!state.magEnabled || state.magFollow) return;
    e.preventDefault();
    e.stopPropagation();
    setMagnifierPower(state.magPower + (e.deltaY < 0 ? 0.2 : -0.2));
  }, { passive: false });
  els.btnHighlightsTop?.addEventListener('click', () => {
    if (!els.sideDrawer.hidden) {
      els.sideDrawer.hidden = true;
      els.btnHighlightsTop?.classList.remove('active');
      updateHighlightsUi();
    } else {
      const activeTab = document.querySelector('.drawer-tab.active')?.dataset.tab || 'bookmarks';
      openDrawerTab(activeTab);
    }
  });

  els.btnToggleCurrentBookmark.addEventListener('click', toggleBookmarkCurrent);
  els.btnAddStickyTabDrawer?.addEventListener('click', (e) => {
    e.stopPropagation();
    openStickyTabPopover();
  });
  els.btnAddMarginNoteDrawer?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.pdfDoc) return;
    const primary = (getVisibleIndices()[0] ?? 0) + 1;
    openMarginNotePopover({ page: primary, xPct: 8, yPct: 16 });
  });
  els.btnStickySideLeft?.addEventListener('click', () => {
    const visible = getVisibleIndices().map((i) => i + 1);
    if (visible[0]) syncStickyPopoverPageFields(visible[0]);
  });
  els.btnStickySideRight?.addEventListener('click', () => {
    const visible = getVisibleIndices().map((i) => i + 1);
    if (visible[1]) syncStickyPopoverPageFields(visible[1]);
  });
  els.stickyQuickChips?.querySelectorAll('.sticky-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (els.stickyTabLabelInput) {
        els.stickyTabLabelInput.value = chip.dataset.label || '';
        els.stickyTabLabelInput.focus();
      }
    });
  });
  els.stickyColorSwatches?.querySelectorAll('.sticky-color-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      state.stickyEditColor = dot.dataset.color || 'coral';
      els.stickyColorSwatches?.querySelectorAll('.sticky-color-dot').forEach((d) => {
        d.classList.toggle('active', d.dataset.color === state.stickyEditColor);
      });
    });
  });
  els.stickyTabLabelInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveStickyTabFromPopover();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeStickyTabPopover();
    }
  });
  els.btnStickyTabSave?.addEventListener('click', saveStickyTabFromPopover);
  els.btnStickyTabRemove?.addEventListener('click', () => {
    if (state.stickyEditPage) removeStickyTabForPage(state.stickyEditPage);
  });

  els.btnNavBack?.addEventListener('click', () => {
    jumpBackHistory();
    els.btnNavBack.blur();
  });
  els.btnNavBackDismiss?.addEventListener('click', clearNavHistory);
  els.btnCopySpreadText.addEventListener('click', async () => {
    const ok = await copyTextToClipboard(els.pageTextPreview.textContent || '');
    if (ok) {
      els.btnCopySpreadText.textContent = 'Copied!';
      setTimeout(() => { els.btnCopySpreadText.textContent = 'Copy Text'; }, 1200);
    }
  });

  const applyReadingLayout = (mode, { announce = false } = {}) => {
    const prevScroll = state.scrollMode;
    const prevPageMode = state.pageMode;

    if (mode === 'scroll') {
      stopAutoFlip();
      state.scrollMode = 'scroll';
      state.autoScrollEnabled = false;
      state.autoScrollPlaying = false;
    } else if (mode === 'flip') {
      stopAutoScroll({ resetPlaying: true });
      state.scrollMode = 'flip';
    } else if (mode === 'toggleScroll') {
      if (state.scrollMode === 'scroll') {
        stopAutoScroll({ resetPlaying: true });
        state.scrollMode = 'flip';
      } else {
        stopAutoFlip();
        state.scrollMode = 'scroll';
        state.autoScrollEnabled = false;
        state.autoScrollPlaying = false;
      }
    } else if (mode === 'double' || mode === 'single') {
      if (state.scrollMode === 'scroll') {
        stopAutoScroll({ resetPlaying: true });
        state.scrollMode = 'flip';
      }
      state.pageMode = mode;
    } else if (mode === 'togglePage') {
      const nextPageMode = isEffectiveSingleMode() ? 'double' : 'single';
      if (state.scrollMode === 'scroll') {
        stopAutoScroll({ resetPlaying: true });
        state.scrollMode = 'flip';
      }
      state.pageMode = nextPageMode;
    } else if (mode === 'cyclePage') {
      state.pageMode = state.pageMode === 'auto' ? 'single' : state.pageMode === 'single' ? 'double' : 'auto';
    } else {
      return;
    }

    updateMenuValues();
    schedulePersistState();
    const layoutChanged = state.scrollMode !== prevScroll || (state.scrollMode === 'flip' && state.pageMode !== prevPageMode) || mode === 'togglePage';
    if (state.pdfDoc && (state.scrollMode === 'flip' || state.scrollMode !== prevScroll || mode === 'cyclePage') && layoutChanged) {
      initReaderView(state.currentIndex);
    }
    if (announce) {
      const msg = state.scrollMode === 'scroll'
        ? 'View: Continuous Scroll'
        : state.pageMode === 'single'
          ? 'View: Single Page Flip'
          : state.pageMode === 'double'
            ? 'View: Double Page Flip'
            : 'View: Book Flip (Auto)';
      showToast(msg, { durationMs: 1400 });
      showBar('header', true, 1400);
    }
  };
  window.__flipbookApplyLayout = (mode) => applyReadingLayout(mode, { announce: true });

  // '+' More Menu items
  els.menuLibrary.addEventListener('click', openLibraryModal);
  els.menuScrollMode?.addEventListener('click', () => applyReadingLayout('toggleScroll'));
  els.menuPageMode.addEventListener('click', () => applyReadingLayout('cyclePage'));
  els.menuHardCover.addEventListener('click', () => {
    state.showCover = !state.showCover;
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc && state.scrollMode === 'flip') initReaderView(state.currentIndex);
  });
  els.menuClickMode.addEventListener('click', () => {
    state.clickMode = state.clickMode === 'smart' ? 'anywhere' : 'smart';
    updateMenuValues();
    schedulePersistState();
    if (state.pdfDoc && state.scrollMode === 'flip') initReaderView(state.currentIndex);
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

  els.menuAutoScrollToggle?.addEventListener('click', toggleAutoScrollEnabled);
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
  els.menuTwoFingerPan?.addEventListener('click', toggleTwoFingerPan);

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

  populateAmbientPresetSelect();
  els.ambientPresetSelect?.addEventListener('change', (e) => {
    setAmbientSoundPreset(e.target.value);
    e.target.blur();
  });
  els.btnAmbientVolDec?.addEventListener('click', () => setAmbientSoundVolume(state.ambientVolume - 5));
  els.btnAmbientVolInc?.addEventListener('click', () => setAmbientSoundVolume(state.ambientVolume + 5));
  els.ambientVolRange?.addEventListener('input', () => setAmbientSoundVolume(els.ambientVolRange.value));
  els.ambientVolRange?.addEventListener('change', () => els.ambientVolRange.blur());
  els.ambientVolRange?.addEventListener('pointerup', () => els.ambientVolRange.blur());

  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => setTheme(dot.dataset.theme));
  });

  els.btnPaperWarmDec?.addEventListener('click', () => setPaperWarmth(state.paperWarmth - 12));
  els.btnPaperWarmInc?.addEventListener('click', () => setPaperWarmth(state.paperWarmth + 12));
  els.paperWarmthRange?.addEventListener('input', () => setPaperWarmth(els.paperWarmthRange.value, true, true));
  els.paperWarmthRange?.addEventListener('change', () => els.paperWarmthRange.blur());
  els.paperWarmthRange?.addEventListener('pointerup', () => els.paperWarmthRange.blur());
  els.paperWarmthPresets?.querySelectorAll('.auto-pill').forEach((btn) => {
    btn.addEventListener('click', () => setPaperWarmth(Number(btn.dataset.warm)));
  });
  els.menuPaperGrain?.addEventListener('click', () => setPaperGrain(!state.paperGrain));
  els.btnPaperGrainDec?.addEventListener('click', () => setPaperGrainStrength(state.paperGrainStrength - 5));
  els.btnPaperGrainInc?.addEventListener('click', () => setPaperGrainStrength(state.paperGrainStrength + 5));
  els.paperGrainRange?.addEventListener('input', () => setPaperGrainStrength(els.paperGrainRange.value, true, true));
  els.paperGrainRange?.addEventListener('change', () => els.paperGrainRange.blur());
  els.paperGrainRange?.addEventListener('pointerup', () => els.paperGrainRange.blur());
  els.paperGrainInput?.addEventListener('input', () => {
    const v = Number(els.paperGrainInput.value);
    if (Number.isFinite(v) && v >= 10 && v <= 100) setPaperGrainStrength(v);
  });
  els.paperGrainInput?.addEventListener('change', () => setPaperGrainStrength(els.paperGrainInput.value));
  els.paperGrainInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      setPaperGrainStrength(els.paperGrainInput.value);
      els.paperGrainInput.blur();
    }
  });
  els.paperGrainStylePills?.querySelectorAll('.auto-pill').forEach((btn) => {
    btn.addEventListener('click', () => setPaperGrainStyle(btn.dataset.style));
  });
  els.btnPaperScaleDec?.addEventListener('click', () => setPaperGrainScalePx(state.paperGrainScalePx - 15));
  els.btnPaperScaleInc?.addEventListener('click', () => setPaperGrainScalePx(state.paperGrainScalePx + 15));
  els.paperGrainScaleRange?.addEventListener('input', () => setPaperGrainScalePx(els.paperGrainScaleRange.value, true, true));
  els.paperGrainScaleRange?.addEventListener('change', () => els.paperGrainScaleRange.blur());
  els.paperGrainScaleRange?.addEventListener('pointerup', () => els.paperGrainScaleRange.blur());
  els.paperGrainScaleInput?.addEventListener('input', () => {
    const v = Number(els.paperGrainScaleInput.value);
    if (Number.isFinite(v) && v >= 90 && v <= 280) setPaperGrainScalePx(v);
  });
  els.paperGrainScaleInput?.addEventListener('change', () => setPaperGrainScalePx(els.paperGrainScaleInput.value));
  els.paperGrainScaleInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      setPaperGrainScalePx(els.paperGrainScaleInput.value);
      els.paperGrainScaleInput.blur();
    }
  });
  els.paperGrainScalePills?.querySelectorAll('.auto-pill').forEach((btn) => {
    btn.addEventListener('click', () => setPaperGrainScalePx(Number(btn.dataset.scale)));
  });

  // Unified Page / Highlight Right-Click Context Menu
  els.stage?.addEventListener('contextmenu', (e) => {
    if (!state.pdfDoc) return;
    if (e.target.closest('#btnSound, .sticky-edge-tab, .fb-margin-note-pin, .ref-pin-card, .snip-result-card, .popover-panel, #moreMenu, .side-drawer, .nav-back-pill, .mag-controls-pill, .focus-curtain-pill, .auto-playback-hud')) {
      return;
    }
    const pageEl = e.target.closest('.fb-page');
    const hlHit = pageEl ? findHighlightAtClientPoint(pageEl, e.clientX, e.clientY) : null;
    if (hlHit) {
      e.preventDefault();
      closePageContextMenu();
      showHighlightPopover(hlHit.anchorRect, {
        mode: 'edit',
        id: hlHit.hl.id,
        color: hlHit.hl.color,
      });
      return;
    }
    const stackEl = e.target.closest('.book-shell, .scroll-page-wrap');
    if (!pageEl && !stackEl) return;
    e.preventDefault();
    hideHighlightPopover();
    const rawIdx = pageEl?.dataset?.pageIndex;
    const p = rawIdx !== undefined && Number.isFinite(Number(rawIdx))
      ? Number(rawIdx) + 1
      : (getVisibleIndices()[0] ?? 0) + 1;
    let coords = null;
    if (pageEl) {
      const pr = pageEl.getBoundingClientRect();
      if (pr.width > 0 && pr.height > 0) {
        coords = {
          xPct: clamp(((e.clientX - pr.left) / pr.width) * 100, 3, 97),
          yPct: clamp(((e.clientY - pr.top) / pr.height) * 100, 3, 97),
        };
      }
    }
    openPageContextMenu(e.clientX, e.clientY, p, coords);
  });
  els.ctxMarginNote?.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = state.ctxTargetPage || (getVisibleIndices()[0] ?? 0) + 1;
    const pos = state.ctxPos;
    const coords = state.ctxPageCoords;
    closePageContextMenu();
    openMarginNotePopover({
      page: p,
      xPct: coords?.xPct ?? 8,
      yPct: coords?.yPct ?? 14,
      clientX: pos?.x,
      clientY: pos?.y,
    });
  });
  els.ctxPinPage?.addEventListener('click', () => {
    const p = state.ctxTargetPage;
    closePageContextMenu();
    if (!p) return;
    const existing = state.pinnedRefs.find((r) => !r.crop && r.page === p);
    if (existing) removePinnedRef(existing.id);
    else pinReferenceCard({ page: p });
  });
  els.ctxSnipTool?.addEventListener('click', () => {
    closePageContextMenu();
    setSnipToolActive(true);
  });
  els.ctxStickyTab?.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = state.ctxTargetPage;
    const pos = state.ctxPos;
    closePageContextMenu();
    if (p) openStickyTabPopover(p, pos);
  });
  els.ctxStickyRemove?.addEventListener('click', () => {
    const p = state.ctxTargetPage;
    closePageContextMenu();
    if (p) removeStickyTabForPage(p);
  });
  els.ctxBookmark?.addEventListener('click', () => {
    const p = state.ctxTargetPage;
    closePageContextMenu();
    if (!p) return;
    if (state.bookmarks.includes(p)) {
      state.bookmarks = state.bookmarks.filter((b) => b !== p);
    } else {
      state.bookmarks.push(p);
    }
    updateBookmarkUi();
    schedulePersistState();
  });
  els.ctxLookUp?.addEventListener('click', () => {
    const txt = state.ctxActionText || window.getSelection()?.toString()?.trim() || '';
    const coords = state.ctxActionCoords || state.ctxPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    closePageContextMenu();
    if (!txt) return;
    performLookUpText(txt, coords.x, coords.y);
  });
  els.ctxTranslate?.addEventListener('click', () => {
    const txt = state.ctxActionText || window.getSelection()?.toString()?.trim() || '';
    const coords = state.ctxActionCoords || state.ctxPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    closePageContextMenu();
    if (!txt) return;
    performTranslateText(txt, coords.x, coords.y);
  });
  els.ctxCopyText?.addEventListener('click', async () => {
    const txt = window.getSelection()?.toString()?.trim() || '';
    closePageContextMenu();
    if (!txt) return;
    await copyTextToClipboard(txt);
  });

  // File Pickers & Drag-Drop
  els.btnWelcomePick.addEventListener('click', pickFileViaHost);
  els.btnModalPickPdf.addEventListener('click', pickFileViaHost);
  els.fileInputHidden.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        showToast('Please select a PDF (.pdf) file.', { isError: true });
      } else {
        openLocalFileBlob(file);
      }
    }
    els.fileInputHidden.value = '';
  });

  const isFileTransfer = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  window.addEventListener('dragover', (e) => {
    if (!isFileTransfer(e)) return;
    e.preventDefault();
    els.dropOverlay.hidden = false;
  });
  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) els.dropOverlay.hidden = true;
  });
  window.addEventListener('dragend', () => {
    els.dropOverlay.hidden = true;
  });
  window.addEventListener('drop', (e) => {
    if (!isFileTransfer(e)) return;
    e.preventDefault();
    els.dropOverlay.hidden = true;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      openLocalFileBlob(file);
    } else {
      showToast('Only PDF (.pdf) files can be opened here.', { isError: true });
    }
  });

  // Close popover when clicking outside, or edit existing highlight on click
  document.addEventListener('click', (e) => {
    if (!els.moreMenu.hidden && !e.target.closest('#moreMenu') && !e.target.closest('#btnMore')) {
      els.moreMenu.hidden = true;
      els.btnMore.classList.remove('active');
    }
    if (
      els.stickyTabPopover &&
      !els.stickyTabPopover.hidden &&
      !e.target.closest('#stickyTabPopover') &&
      !e.target.closest('#btnAddStickyTabDrawer')
    ) {
      closeStickyTabPopover();
    }
    if (els.pageContextMenu && !els.pageContextMenu.hidden && !e.target.closest('#pageContextMenu')) {
      closePageContextMenu();
    }
    if (
      els.marginNotePopover &&
      !els.marginNotePopover.hidden &&
      !e.target.closest('#marginNotePopover') &&
      !e.target.closest('.fb-margin-note-pin') &&
      !e.target.closest('#ctxMarginNote') &&
      !e.target.closest('#btnSnipAttachNote')
    ) {
      closeMarginNotePopover();
    }

    // Alt+Click directly drops a 3D Margin Sticky Note wherever you click on any page!
    if (e.altKey && state.pdfDoc && !state.snipActive) {
      const pageEl = e.target.closest('.fb-page');
      if (pageEl && !e.target.closest('.fb-margin-note-pin, .popover-panel')) {
        const idx = Number(pageEl.dataset.pageIndex);
        const pr = pageEl.getBoundingClientRect();
        if (Number.isFinite(idx) && pr.width > 0 && pr.height > 0) {
          e.preventDefault();
          e.stopPropagation();
          openMarginNotePopover({
            page: idx + 1,
            xPct: clamp(((e.clientX - pr.left) / pr.width) * 100, 3, 97),
            yPct: clamp(((e.clientY - pr.top) / pr.height) * 100, 3, 97),
            clientX: e.clientX,
            clientY: e.clientY,
          });
          return;
        }
      }
    }

    const sel = window.getSelection();
    const hasSelection = !!(sel && !sel.isCollapsed && sel.toString().trim());
    const clickedUiChrome = Boolean(e.target.closest('#topBar, #bottomBar, #sideDrawer, #moreMenu, #libraryModal, #aboutModal, #shortcutsModal, #lookupModal'));
    if (!e.target.closest('#hlPopover') && (!hasSelection || clickedUiChrome)) {
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

  // Margin Sticky Note Editor Popover handlers
  els.marginNotePopover?.addEventListener('mousedown', (e) => e.stopPropagation());
  els.marginNotePopover?.addEventListener('pointerdown', (e) => e.stopPropagation());
  els.marginNoteColors?.querySelectorAll('.sticky-color-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      if (!state.marginEditDraft) return;
      state.marginEditDraft.color = dot.dataset.color || 'yellow';
      els.marginNoteColors.querySelectorAll('.sticky-color-dot').forEach((d) => {
        d.classList.toggle('active', d.dataset.color === state.marginEditDraft.color);
      });
    });
  });
  els.btnMarginNoteSave?.addEventListener('click', saveMarginNoteFromPopover);
  els.btnMarginNoteDelete?.addEventListener('click', () => {
    if (state.marginEditDraft?.id) deleteMarginNoteById(state.marginEditDraft.id);
    else closeMarginNotePopover();
  });
  els.btnMarginNoteDetachSnip?.addEventListener('click', () => {
    if (!state.marginEditDraft) return;
    state.marginEditDraft.snipRect = null;
    if (els.marginNoteSnipPreviewWrap) els.marginNoteSnipPreviewWrap.hidden = true;
  });
  els.btnMarginNoteCopySnip?.addEventListener('click', async () => {
    const d = state.marginEditDraft;
    if (!d?.snipRect) return;
    const c = await renderPdfRegionToCanvas(d.page, d.snipRect, 340, 3);
    const ok = await copyCanvasPngToClipboard(c);
    if (els.btnMarginNoteCopySnip) {
      els.btnMarginNoteCopySnip.textContent = ok ? 'Copied 3×!' : 'Use Snip Save';
      setTimeout(() => { els.btnMarginNoteCopySnip.textContent = 'Copy 3× PNG'; }, 1300);
    }
  });
  els.marginNoteTextInput?.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      saveMarginNoteFromPopover();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMarginNotePopover();
    }
  });

  // 3x HD Snip Overlay drag-to-capture + actions
  let snipDrag = null;
  els.snipOverlay?.addEventListener('pointerdown', (e) => {
    if (!state.snipActive || e.button !== 0) return;
    if (e.target.closest('#snipHintPill, #snipResultCard')) return;
    e.preventDefault();
    e.stopPropagation();
    if (els.snipResultCard) els.snipResultCard.hidden = true;
    let pageEl = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.classList?.contains('fb-page'));
    if (!pageEl) {
      const near = findVisiblePageNodeAtClient(e.clientX, e.clientY);
      if (near) {
        const dx = Math.max(near.r.left - e.clientX, 0, e.clientX - near.r.right);
        const dy = Math.max(near.r.top - e.clientY, 0, e.clientY - near.r.bottom);
        if (Math.hypot(dx, dy) <= 24) pageEl = near.pageEl;
      }
    }
    if (!pageEl) return;
    const sr = els.stage.getBoundingClientRect();
    snipDrag = {
      pageEl,
      startX: e.clientX - sr.left,
      startY: e.clientY - sr.top,
      startClientX: e.clientX,
      startClientY: e.clientY,
      srLeft: sr.left,
      srTop: sr.top,
    };
    els.snipOverlay.setPointerCapture?.(e.pointerId);
  });
  els.snipOverlay?.addEventListener('pointermove', (e) => {
    if (!snipDrag || !els.snipSelectionBox) return;
    const curX = e.clientX - snipDrag.srLeft;
    const curY = e.clientY - snipDrag.srTop;
    const x = Math.min(snipDrag.startX, curX);
    const y = Math.min(snipDrag.startY, curY);
    const w = Math.abs(curX - snipDrag.startX);
    const h = Math.abs(curY - snipDrag.startY);
    els.snipSelectionBox.hidden = w < 6 || h < 6;
    els.snipSelectionBox.style.left = `${x}px`;
    els.snipSelectionBox.style.top = `${y}px`;
    els.snipSelectionBox.style.width = `${w}px`;
    els.snipSelectionBox.style.height = `${h}px`;
    if (els.snipSizeBadge) {
      els.snipSizeBadge.textContent = `${Math.round(w * 3)} × ${Math.round(h * 3)} px · 3× HD`;
    }
  });
  const endSnipDrag = async (e) => {
    if (!snipDrag) return;
    const drag = snipDrag;
    snipDrag = null;
    if (e?.pointerId !== undefined) {
      try { els.snipOverlay?.releasePointerCapture?.(e.pointerId); } catch {}
    }
    if (els.snipSelectionBox) els.snipSelectionBox.hidden = true;
    if (!e || e.type === 'pointercancel' || e.type === 'blur') return;
    const clientRect = {
      left: Math.min(drag.startClientX, e.clientX),
      top: Math.min(drag.startClientY, e.clientY),
      right: Math.max(drag.startClientX, e.clientX),
      bottom: Math.max(drag.startClientY, e.clientY),
    };
    if (clientRect.right - clientRect.left >= 12 && clientRect.bottom - clientRect.top >= 12) {
      await executeSnipCapture(drag.pageEl, clientRect);
    }
  };
  els.snipOverlay?.addEventListener('pointerup', endSnipDrag);
  els.snipOverlay?.addEventListener('pointercancel', endSnipDrag);
  els.snipOverlay?.addEventListener('lostpointercapture', endSnipDrag);
  window.addEventListener('blur', () => endSnipDrag({ type: 'blur' }));
  els.btnSnipCancel?.addEventListener('click', () => setSnipToolActive(false));
  els.btnSnipResultClose?.addEventListener('click', () => setSnipToolActive(false));
  els.btnSnipAgain?.addEventListener('click', () => {
    if (els.snipResultCard) els.snipResultCard.hidden = true;
    state.snipCapture = null;
  });
  els.btnSnipCopy?.addEventListener('click', async () => {
    if (!state.snipCapture?.canvas) return;
    const ok = await copyCanvasPngToClipboard(state.snipCapture.canvas);
    if (els.snipResultStatus) {
      els.snipResultStatus.textContent = ok ? 'Copied 3× HD Image to Clipboard!' : 'Clipboard prompt blocked — use Save PNG';
    }
  });
  els.btnSnipSave?.addEventListener('click', async () => {
    const cap = state.snipCapture;
    if (!cap?.canvas) return;
    const slug = (state.bookTitle || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32);
    const saved = await downloadCanvasPng(cap.canvas, `${slug}-p${cap.page}-3x.png`);
    if (els.snipResultStatus && saved) {
      els.snipResultStatus.textContent = 'Saved 3× HD PNG!';
    }
  });
  els.btnSnipPin?.addEventListener('click', () => {
    const cap = state.snipCapture;
    if (!cap) return;
    pinReferenceCard({ page: cap.page, label: `Diagram p. ${cap.page}`, crop: cap.rect });
    setSnipToolActive(false);
  });
  els.btnSnipAttachNote?.addEventListener('click', () => {
    const cap = state.snipCapture;
    if (!cap) return;
    const page = cap.page;
    const snipRect = { ...cap.rect };
    const xPct = clamp(cap.rect.l + cap.rect.w > 88 ? Math.max(3, cap.rect.l - 3) : cap.rect.l + cap.rect.w + 2, 3, 96);
    const yPct = clamp(cap.rect.t, 4, 95);
    setSnipToolActive(false);
    openMarginNotePopover({ page, xPct, yPct, color: 'yellow', snipRect });
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
    const md = formatStudyNotesMarkdown(getFilteredSortedHighlights(), getFilteredSortedMarginNotes());
    if (!md) return;
    const ok = await copyTextToClipboard(md);
    if (ok) {
      els.btnCopyPageNotes.textContent = 'Copied!';
      setTimeout(() => { els.btnCopyPageNotes.textContent = 'Copy MD'; }, 1200);
    }
  });
  els.btnExportMarkdown?.addEventListener('click', async () => {
    const md = formatStudyNotesMarkdown(getFilteredSortedHighlights(), getFilteredSortedMarginNotes());
    if (!md) return;
    const slug = (state.bookTitle || 'study-notes').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48);
    await saveTextFileNativeOrDownload(md, `${slug}-study-notes.md`, 'md');
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
    const hlTargets = new Set(getFilteredSortedHighlights().map((h) => h.id));
    const noteTargets = new Set(getFilteredSortedMarginNotes().map((n) => n.id));
    if (!hlTargets.size && !noteTargets.size) return;
    state.highlights = state.highlights.filter((h) => !hlTargets.has(h.id));
    state.marginNotes = state.marginNotes.filter((n) => !noteTargets.has(n.id));
    hideHighlightPopover();
    closeMarginNotePopover();
    repaintRenderedHighlights();
    repaintAllMarginNotes();
    if (Number.isInteger(singleStackMeta.renderedIdx)) {
      appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
    }
    state.pageFlip?.refreshSnapshots?.();
    updateHighlightsUi();
    schedulePersistState();
  });
  els.btnClearHighlights.addEventListener('click', () => {
    if (!state.highlights.length && !state.marginNotes.length) return;
    state.highlights = [];
    state.marginNotes = [];
    hideHighlightPopover();
    closeMarginNotePopover();
    repaintRenderedHighlights();
    repaintAllMarginNotes();
    if (Number.isInteger(singleStackMeta.renderedIdx)) {
      appendMiniPageOverlays(els.scsTopCard, singleStackMeta.renderedIdx, { tinyStack: true });
    }
    state.pageFlip?.refreshSnapshots?.();
    updateHighlightsUi();
    schedulePersistState();
  });

  // Scroll tracking & Preview-grade compositor buffering in Smooth Auto-Scroll mode
  let scrollFrameRaf = null;
  const runScrollUiFrame = () => {
    scrollFrameRaf = null;
    if (state.scrollMode !== 'scroll' || !state.totalPages || !els.scrollPages.children.length) return;
    if (state.magEnabled) scheduleMagnifierRedraw();
    if (state.curtainEnabled) positionFocusCurtain();
    syncEdgeTabsViewportBounds();
  };

  els.scrollViewport.addEventListener('scroll', () => {
    if (state.scrollMode !== 'scroll' || !state.totalPages || !els.scrollPages.children.length) return;
    const sv = els.scrollViewport;
    const now = performance.now();
    if (state.scrollPinchPreview && (state.nativePinchActive || now < (state.pinchLockScrollUntil || 0))) {
      if (sv.scrollTop !== state.scrollPinchPreview.scrollLockTop || sv.scrollLeft !== state.scrollPinchPreview.scrollLockLeft) {
        state.programmaticScrollUntil = now + 200;
        sv.scrollLeft = state.scrollPinchPreview.scrollLockLeft;
        sv.scrollTop = state.scrollPinchPreview.scrollLockTop;
      }
      return;
    }

    if (!state.isScrollingActive) {
      state.isScrollingActive = true;
      document.body.classList.add('is-scrolling');
    }
    hideHighlightPopover();
    if (!state.autoScrollRafId || now < state.autoScrollPauseUntil) {
      state.autoScrollPosY = sv.scrollTop;
    }
    if (now >= (state.programmaticScrollUntil || 0)) {
      const maxScroll = Math.max(0, sv.scrollHeight - sv.clientHeight);
      let estIdx;
      if (sv.scrollTop <= 2) {
        estIdx = 0;
      } else if (maxScroll > 0 && sv.scrollTop >= maxScroll - 2) {
        estIdx = state.totalPages - 1;
      } else {
        const itemStride = Math.round(state.pageH * (state.committedZoom || state.zoom || 1)) + 18;
        const centerOffset = sv.scrollTop + sv.clientHeight * 0.38 - 54;
        estIdx = clamp(Math.floor(centerOffset / Math.max(40, itemStride)), 0, state.totalPages - 1);
      }
      if (estIdx !== state.currentIndex) {
        state.currentIndex = estIdx;
        onSpreadChanged(false, 0, { withText: false, lightScroll: true });
      }
    }
    if (now - (state.autoScrollRenderTickAt || 0) >= 120) {
      state.autoScrollRenderTickAt = now;
      queueNearbyRenders(state.currentIndex, 0, { withText: false });
    }
    if (scrollFrameRaf === null && (state.magEnabled || state.curtainEnabled)) {
      scrollFrameRaf = requestAnimationFrame(runScrollUiFrame);
    }
    clearTimeout(state.scrollSyncTimer);
    state.scrollSyncTimer = setTimeout(() => {
      state.isScrollingActive = false;
      document.body.classList.remove('is-scrolling');
      onSpreadChanged(true, state.committedZoom > 1.2 ? 2 : 3, { withText: true });
    }, 120);
  }, { passive: true });
  els.scrollViewport.addEventListener('wheel', (e) => {
    if (state.scrollMode !== 'scroll' || e.ctrlKey || e.metaKey) return;
    if (state.nativePinchActive || performance.now() < (state.pinchLockScrollUntil || 0)) return;
    state.programmaticScrollUntil = 0;
    state.autoScrollPauseUntil = performance.now() + (e.deltaY < 0 ? 750 : 320);
  }, { passive: true });
  els.scrollViewport.addEventListener('touchstart', () => {
    if (state.scrollMode !== 'scroll') return;
    state.programmaticScrollUntil = 0;
    state.autoScrollPauseUntil = performance.now() + 900;
  }, { passive: true });
  els.scrollViewport.addEventListener('mousedown', (e) => {
    if (state.scrollMode !== 'scroll') return;
    state.programmaticScrollUntil = 0;
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
  window.addEventListener('blur', () => {
    state.scrollUserSelecting = false;
  });

  // Independent edge-triggered auto-hide for header (top) & footer (bottom)
  let wasInHeaderZone = false;
  let wasInFooterZone = false;
  window.addEventListener('mousemove', (e) => {
    state.lastBarPointer = { clientX: e.clientX, clientY: e.clientY };
    const inHeaderZone = e.clientY <= HEADER_WAKE_PX || state.hoveringTopBar;
    const onFloatingCornerOrHud = Boolean(e.target?.closest?.('.auto-playback-hud, .nav-back-pill'));
    const inFooterZone = (!onFloatingCornerOrHud && e.clientY >= window.innerHeight - FOOTER_WAKE_PX) || state.hoveringBottomBar;

    if (inHeaderZone) {
      if (!wasInHeaderZone || document.body.classList.contains('header-hidden')) showBar('header', false);
    } else if ((wasInHeaderZone || !state.headerHideTimer) && !document.body.classList.contains('header-hidden')) {
      scheduleHideBar('header', 420);
    }
    wasInHeaderZone = inHeaderZone;

    if (inFooterZone) {
      if (!wasInFooterZone || document.body.classList.contains('footer-hidden')) showBar('footer', false);
    } else if ((wasInFooterZone || !state.footerHideTimer) && !document.body.classList.contains('footer-hidden')) {
      scheduleHideBar('footer', 420);
    }
    wasInFooterZone = inFooterZone;
  }, { passive: true });
  window.addEventListener('touchstart', (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    const inHeaderZone = t.clientY <= HEADER_WAKE_PX;
    const onFloatingCornerOrHud = Boolean(e.target?.closest?.('.auto-playback-hud, .nav-back-pill'));
    const inFooterZone = !onFloatingCornerOrHud && t.clientY >= window.innerHeight - FOOTER_WAKE_PX;
    if (inHeaderZone || inFooterZone) {
      state.lastBarPointer = { clientX: t.clientX, clientY: t.clientY };
      if (inHeaderZone) showBar('header', true, 2200);
      if (inFooterZone) showBar('footer', true, 2200);
    }
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    state.lastBarPointer = null;
    state.hoveringTopBar = false;
    state.hoveringBottomBar = false;
    wasInHeaderZone = false;
    wasInFooterZone = false;
    if (state.pdfDoc) {
      scheduleHideBar('header', 420);
      scheduleHideBar('footer', 420);
    }
  });
  els.topBar?.addEventListener('mouseenter', () => { state.hoveringTopBar = true; showBar('header', false); });
  els.topBar?.addEventListener('mouseleave', () => { state.hoveringTopBar = false; scheduleHideBar('header', 420); });
  els.topBar?.addEventListener('focusin', () => {
    if (isBarInputFocused(els.topBar)) showBar('header', false);
  });
  els.topBar?.addEventListener('focusout', () => scheduleHideBar('header', 420));

  els.bottomBar?.addEventListener('mouseenter', () => { state.hoveringBottomBar = true; showBar('footer', false); });
  els.bottomBar?.addEventListener('mouseleave', () => { state.hoveringBottomBar = false; scheduleHideBar('footer', 420); });
  els.bottomBar?.addEventListener('focusin', () => {
    if (isBarInputFocused(els.bottomBar)) showBar('footer', false);
  });
  els.bottomBar?.addEventListener('focusout', () => scheduleHideBar('footer', 420));

  const syncOverlayButtons = () => {
    if (els.btnMore) {
      const moreOpen = !els.moreMenu?.hidden;
      els.btnMore.classList.toggle('active', moreOpen);
      els.btnMore.setAttribute('aria-pressed', String(moreOpen));
    }
    if (els.btnThumbs) {
      const thumbsOpen = !els.thumbnailsStrip?.hidden;
      els.btnThumbs.classList.toggle('active', thumbsOpen);
      els.btnThumbs.setAttribute('aria-pressed', String(thumbsOpen));
    }
  };
  const overlayObserver = new MutationObserver(() => {
    syncOverlayButtons();
    if (shouldKeepBarVisible('header')) showBar('header', false);
    else scheduleHideBar('header', 420);
    if (shouldKeepBarVisible('footer')) showBar('footer', false);
    else scheduleHideBar('footer', 420);
  });
  [els.moreMenu, els.thumbnailsStrip, els.libraryModal, els.aboutModal, els.shortcutsModal, els.lookupModal, els.stickyTabPopover]
    .filter(Boolean)
    .forEach((panel) => overlayObserver.observe(panel, { attributes: true, attributeFilter: ['hidden'] }));

  document.addEventListener('fullscreenchange', syncFullscreenUi);
  new MutationObserver(syncFullscreenUi).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  syncOverlayButtons();
  syncFullscreenUi();

  // Track pointer position inside stage so keyboard +/- zoom anchors at cursor & Follow modes track smoothly
  els.stage.addEventListener('mousemove', (e) => {
    state.lastStagePointer = { clientX: e.clientX, clientY: e.clientY };
    const onFloatingPill = Boolean(e.target?.closest?.('#magControlsPill, #focusCurtainPill'));
    if (state.curtainEnabled && state.curtainFollow && !onFloatingPill) {
      const prevY = state.lastCurtainPointerY;
      const prevX = state.lastCurtainPointerX;
      const movedY = prevY === null || Math.abs(e.clientY - prevY) >= 1;
      const movedX = state.curtainLengthPct < 100 && (prevX === null || Math.abs(e.clientX - prevX) >= 1);
      if (movedY || movedX) {
        state.lastCurtainPointerY = e.clientY;
        state.lastCurtainPointerX = e.clientX;
        const sr = els.stage.getBoundingClientRect();
        positionFocusCurtain(e.clientY - sr.top, state.curtainLengthPct < 100 ? e.clientX - sr.left : null);
      }
    }
    if (state.magEnabled && state.magFollow && !state.magDragging && !onFloatingPill) {
      const sr = els.stage.getBoundingClientRect();
      positionMagnifier(e.clientX - sr.left, e.clientY - sr.top);
    }
  });
  els.stage.addEventListener('mouseleave', () => {
    state.lastStagePointer = null;
    state.lastCurtainPointerX = null;
    state.lastCurtainPointerY = null;
  });

  // Smart Text Selection + Zoom Pan isolation inside bookContainer
  let isSelectingText = false;
  let lastNearTextCache = null;
  const isOuterEdgeClick = (clientX, clientY, onTextSpan) => {
    return !!state.pageFlip?.isPointInFlipZone?.(clientX, clientY, onTextSpan);
  };
  const guardPageFlipPointer = (e) => {
    if ((e.type === 'mousedown' || e.type === 'pointerdown') && e.button !== 0) return;
    if (e.target?.closest?.('.fb-margin-note-pin, .popover-panel')) {
      return;
    }
    if (e.altKey) {
      e.stopPropagation();
      return;
    }
    if (state.zoom > 1.01) {
      return;
    }
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const now = performance.now();
    let nearText;
    if (lastNearTextCache && now - lastNearTextCache.ts < 30 && Math.abs(lastNearTextCache.x - cx) < 2 && Math.abs(lastNearTextCache.y - cy) < 2 && lastNearTextCache.target === e.target) {
      nearText = lastNearTextCache.nearText;
    } else {
      nearText = isClientNearSelectableText(e.target, cx, cy);
      lastNearTextCache = { ts: now, x: cx, y: cy, target: e.target, nearText };
    }
    if (state.clickMode === 'smart' && nearText && !isOuterEdgeClick(cx, cy, true)) {
      // Allow clean text selection on words/inter-line gaps while outer edges/corners curl pages
      isSelectingText = true;
      e.stopPropagation();
    } else {
      isSelectingText = false;
    }
  };
  els.bookContainer.addEventListener('pointerdown', guardPageFlipPointer, true);
  els.bookContainer.addEventListener('mousedown', guardPageFlipPointer, true);
  els.bookContainer.addEventListener('touchstart', guardPageFlipPointer, true);
  const stopMoveIfSelecting = (e) => {
    if (state.zoom <= 1.01 && isSelectingText) {
      e.stopPropagation();
    }
  };
  const endTextSelecting = () => {
    isSelectingText = false;
  };
  els.bookContainer.addEventListener('pointermove', stopMoveIfSelecting, true);
  els.bookContainer.addEventListener('mousemove', stopMoveIfSelecting, true);
  window.addEventListener('pointerup', endTextSelecting, true);
  window.addEventListener('pointercancel', endTextSelecting, true);
  window.addEventListener('mouseup', endTextSelecting, true);
  window.addEventListener('blur', endTextSelecting);

  // Keep Web Audio unlocked & recover automatically after sleep, audio-route change, or focus loss
  const keepAudioActive = (e) => {
    const hasNative = Boolean(window.webkit?.messageHandlers?.flipbook);
    if (hasNative && e && e.type !== 'focus' && e.type !== 'visibilitychange') return;
    if (state.soundEnabled && (!flipSound.unlocked || (flipSound.ctx && flipSound.ctx.state !== 'running'))) {
      flipSound.unlock();
    }
    if (state.ambientPreset !== 'off') {
      const needsAmbientUnlock = hasNative
        ? (e?.type === 'focus' || e?.type === 'visibilitychange')
        : (ambientSound.ctx?.state === 'suspended' || ambientSound.htmlAudio?.paused || (!ambientSound.activeScene && !ambientSound.htmlAudio));
      if (needsAmbientUnlock) ambientSound.unlock();
    }
  };
  window.addEventListener('pointerdown', keepAudioActive, { capture: true, passive: true });
  window.addEventListener('keydown', keepAudioActive, { capture: true, passive: true });
  window.addEventListener('touchstart', keepAudioActive, { capture: true, passive: true });
  window.addEventListener('focus', keepAudioActive, { passive: true });
  document.addEventListener('visibilitychange', (e) => {
    if (!document.hidden) keepAudioActive(e);
  });

  // Two-finger double-click / trackpad Smart Zoom + panning when zoomed + text highlight selection trigger
  const handleTwoFingerZoomToggle = (clientX, clientY) => {
    if (!state.pdfDoc) return;
    const hitEl = Number.isFinite(clientX) && Number.isFinite(clientY)
      ? document.elementFromPoint(clientX, clientY)
      : null;
    const pinCard = hitEl?.closest?.('.ref-pin-card');
    if (pinCard && !pinCard.classList.contains('is-collapsed') && typeof pinCard.__pinZoomToggle === 'function') {
      pinCard.__pinZoomToggle(clientX, clientY);
      return;
    }
    if (hitEl?.closest?.('#moreMenu, .side-drawer, .bottom-bar, .top-bar, .thumbnails-strip, .modal-backdrop, .mag-controls-pill, .focus-curtain-pill')) {
      return;
    }
    setZoom(state.zoom > 1.05 ? 1 : 1.75, true, { clientX, clientY });
  };
  window.__flipbookHandleTwoFingerZoom = handleTwoFingerZoomToggle;

  let lastTwoFingerClick = null;
  let suppressCtxMenuUntil = 0;
  window.addEventListener('pointerdown', (e) => {
    if (!state.pdfDoc || e.button !== 2) return;
    if (e.target.closest?.('#moreMenu, .side-drawer, .bottom-bar, .top-bar, .thumbnails-strip, .modal-backdrop, .sticky-edge-tab, .fb-margin-note-pin')) {
      lastTwoFingerClick = null;
      return;
    }
    const now = performance.now();
    if (
      lastTwoFingerClick &&
      now - lastTwoFingerClick.time <= 420 &&
      Math.hypot(e.clientX - lastTwoFingerClick.x, e.clientY - lastTwoFingerClick.y) <= 36
    ) {
      lastTwoFingerClick = null;
      suppressCtxMenuUntil = now + 280;
      e.preventDefault();
      e.stopPropagation();
      closePageContextMenu();
      hideHighlightPopover();
      handleTwoFingerZoomToggle(e.clientX, e.clientY);
      return;
    }
    lastTwoFingerClick = { time: now, x: e.clientX, y: e.clientY };
  }, true);
  window.addEventListener('contextmenu', (e) => {
    if (performance.now() < suppressCtxMenuUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  let lastTwoTouchTap = null;
  let twoTouchTrack = null;
  els.stage?.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      twoTouchTrack = {
        startTime: performance.now(),
        moved: false,
        mx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        my: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length > 2) {
      twoTouchTrack = null;
    }
  }, { passive: true });
  els.stage?.addEventListener('touchmove', (e) => {
    if (!twoTouchTrack || e.touches.length !== 2) return;
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    if (Math.hypot(mx - twoTouchTrack.mx, my - twoTouchTrack.my) > 12) {
      twoTouchTrack.moved = true;
    }
  }, { passive: true });
  els.stage?.addEventListener('touchend', (e) => {
    if (!twoTouchTrack || e.touches.length > 0) return;
    const track = twoTouchTrack;
    twoTouchTrack = null;
    const now = performance.now();
    if (track.moved || now - track.startTime > 280) return;
    if (
      lastTwoTouchTap &&
      now - lastTwoTouchTap.time <= 400 &&
      Math.hypot(track.mx - lastTwoTouchTap.x, track.my - lastTwoTouchTap.y) <= 44
    ) {
      lastTwoTouchTap = null;
      handleTwoFingerZoomToggle(track.mx, track.my);
    } else {
      lastTwoTouchTap = { time: now, x: track.mx, y: track.my };
    }
  }, { passive: true });

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
    const clamped = clampZoomPan(e.clientX - state.panStart.x, e.clientY - state.panStart.y);
    state.panX = clamped.x;
    state.panY = clamped.y;
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
    if (panWasMoved) {
      setTimeout(() => { state.panMoved = false; }, 0);
    }
    if (e.button === 0 && !e.target?.closest?.('#hlPopover, #sideDrawer, #moreMenu, #libraryModal, .popover-panel, .top-bar, .bottom-bar, .fb-margin-note-pin')) {
      setTimeout(() => {
        if (panWasMoved || state.isFlipping) return;
        const draft = extractSelectionHighlightDraft();
        if (draft) {
          showHighlightPopover(draft.anchorRect, { mode: 'create', entries: draft.entries });
        }
      }, 0);
    }
  });
  window.addEventListener('blur', () => {
    if (state.isPanning) {
      state.isPanning = false;
      state.panStart = null;
      panDownPos = null;
      els.zoomViewport.classList.remove('is-panning');
    }
    state.panMoved = false;
  });

  // Trackpad two-finger drag pan + pinch/Ctrl+Wheel zoom coalesced per frame
  let pendingPinchDeltaY = 0;
  let pendingPinchAnchor = null;
  let pinchRafId = null;
  let nativePinchAnchor = null;
  let nativePinchWatchdog = null;
  let nativePinchPinCtrl = null;

  const resolvePinchTargetPin = (anchor) => {
    if (anchor && Number.isFinite(anchor.clientX) && Number.isFinite(anchor.clientY)) {
      const hitEl = document.elementFromPoint(anchor.clientX, anchor.clientY);
      const hitCard = hitEl?.closest?.('.ref-pin-card');
      if (hitCard?.__pinCtrl && !hitCard.__pinCtrl.pin?.collapsed) {
        return hitCard.__pinCtrl;
      }
    }
    if (activeHoveredPinCtrl?.card?.isConnected && !activeHoveredPinCtrl.pin?.collapsed) {
      return activeHoveredPinCtrl;
    }
    return null;
  };

  const commitNativePinch = () => {
    clearTimeout(nativePinchWatchdog);
    nativePinchWatchdog = null;
    if (nativePinchPinCtrl) {
      const targetPin = nativePinchPinCtrl;
      const anchor = nativePinchAnchor;
      nativePinchPinCtrl = null;
      nativePinchAnchor = null;
      state.nativePinchActive = false;
      state.pinchLockScrollUntil = performance.now() + 180;
      if (targetPin.card?.isConnected && !targetPin.pin?.collapsed) {
        targetPin.setZoom(targetPin.pin.zoom, anchor, true, { forceRepaint: true });
      }
      return;
    }
    if (!state.nativePinchActive && !state.scrollPinchPreview) return;
    state.nativePinchActive = false;
    state.pinchLockScrollUntil = performance.now() + 260;
    if (!state.pdfDoc) return;
    const anchor = nativePinchAnchor || getStageZoomAnchor();
    nativePinchAnchor = null;
    setZoom(state.zoom, true, anchor);
  };

  window.__flipbookHandleNativePinch = (phase, magnification, clientX, clientY) => {
    if (!state.pdfDoc) return;
    const anchor = (Number.isFinite(clientX) && Number.isFinite(clientY))
      ? { clientX, clientY }
      : (nativePinchAnchor || getStageZoomAnchor());

    if (phase === 'ended' || phase === 'cancelled') {
      nativePinchAnchor = anchor;
      commitNativePinch();
      return;
    }

    const wasActive = state.nativePinchActive;
    state.nativePinchActive = true;
    if (!wasActive) {
      nativePinchPinCtrl = resolvePinchTargetPin(anchor);
      nativePinchAnchor = anchor;
    } else if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      nativePinchAnchor = anchor;
    }
    state.lastStagePointer = nativePinchAnchor;

    clearTimeout(nativePinchWatchdog);
    nativePinchWatchdog = setTimeout(commitNativePinch, 850);

    const mag = Number.isFinite(magnification) ? clamp(magnification, -0.35, 0.35) : 0;
    if (nativePinchPinCtrl && nativePinchPinCtrl.card?.isConnected && !nativePinchPinCtrl.pin?.collapsed) {
      state.pinchLockScrollUntil = performance.now() + 220;
      const nextPinZoom = nativePinchPinCtrl.pin.zoom * Math.exp(mag);
      nativePinchPinCtrl.setZoom(nextPinZoom, nativePinchAnchor, false);
      return;
    }

    state.pinchLockScrollUntil = performance.now() + 500;
    const nextZoom = clamp(state.zoom * Math.exp(mag), 1, MAX_PAGE_ZOOM);
    setZoom(nextZoom, false, nativePinchAnchor);
    if (state.nativePinchActive) {
      clearTimeout(state.zoomRerenderTimer);
      state.zoomRerenderTimer = null;
    }
  };

  const flushPinchZoom = () => {
    pinchRafId = null;
    if (!pendingPinchDeltaY || !state.pdfDoc) {
      pendingPinchDeltaY = 0;
      return;
    }
    const dy = pendingPinchDeltaY;
    const anchor = pendingPinchAnchor;
    pendingPinchDeltaY = 0;
    const nextZoom = clamp(state.zoom * Math.exp(-dy * 0.003), 1, MAX_PAGE_ZOOM);
    setZoom(nextZoom, false, anchor);
  };

  window.addEventListener('blur', () => {
    commitNativePinch();
  });

  els.stage.addEventListener('wheel', (e) => {
    if (!state.pdfDoc) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.target.closest('#snipResultCard, #focusCurtainPill, #magControlsPill, #snipHintPill, #hlPopover')) return;
      e.preventDefault();
      state.pinchLockScrollUntil = performance.now() + 280;
      if (state.nativePinchActive || !e.deltaY) return;
      state.lastStagePointer = { clientX: e.clientX, clientY: e.clientY };
      pendingPinchDeltaY += e.deltaY;
      pendingPinchAnchor = { clientX: e.clientX, clientY: e.clientY };
      if (pinchRafId === null) {
        pinchRafId = requestAnimationFrame(flushPinchZoom);
      }
      return;
    }
    if (state.scrollMode === 'scroll' && (state.nativePinchActive || performance.now() < (state.pinchLockScrollUntil || 0))) {
      e.preventDefault();
      return;
    }
    if (state.twoFingerPan && state.zoom > 1.01 && state.scrollMode === 'flip') {
      if (e.target.closest('#sideDrawer, #thumbnailsStrip, #moreMenu, #libraryModal, #aboutModal, #snipResultCard, .ref-pin-card, .popover-panel')) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? Math.max(240, els.stage.clientHeight * 0.85) : 1;
      const dx = (e.deltaX || 0) * unit;
      const dy = (e.deltaY || 0) * unit;
      if (dx || dy) {
        panZoomBy(-dx, -dy);
      }
    }
  }, { passive: false });

  // Touchscreen two-finger drag pan when zoomed in Book Flip mode
  let touchPanMid = null;
  els.zoomViewport.addEventListener('touchstart', (e) => {
    if (!state.twoFingerPan || state.zoom <= 1.01 || state.scrollMode !== 'flip') return;
    if (e.touches.length === 2) {
      touchPanMid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else {
      touchPanMid = null;
    }
  }, { passive: true });
  els.zoomViewport.addEventListener('touchmove', (e) => {
    if (!state.twoFingerPan || state.zoom <= 1.01 || state.scrollMode !== 'flip') return;
    if (e.touches.length === 2) {
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (touchPanMid) {
        e.preventDefault();
        panZoomBy(mx - touchPanMid.x, my - touchPanMid.y);
      }
      touchPanMid = { x: mx, y: my };
    }
  }, { passive: false });
  els.zoomViewport.addEventListener('touchend', () => {
    touchPanMid = null;
  }, { passive: true });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const tag = activeEl?.tagName;
    const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(activeEl?.isContentEditable);

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
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && ['1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      if (!editing && els.libraryModal.hidden) {
        const modeMap = { '1': 'double', '2': 'single', '3': 'scroll' };
        window.__flipbookApplyLayout?.(modeMap[e.key]);
      }
      return;
    }

    if (e.key === 'Escape') {
      if (activeEl === els.pageInput) return; // handled by pageInput's own Escape handler
      if (editing) activeEl.blur?.();
      if (state.snipActive) setSnipToolActive(false);
      else if (els.marginNotePopover && !els.marginNotePopover.hidden) closeMarginNotePopover();
      else if (els.pageContextMenu && !els.pageContextMenu.hidden) closePageContextMenu();
      else if (els.stickyTabPopover && !els.stickyTabPopover.hidden) closeStickyTabPopover();
      else if (!els.hlPopover.hidden) hideHighlightPopover();
      else if (!els.moreMenu.hidden) {
        els.moreMenu.hidden = true;
        els.btnMore.classList.remove('active');
      } else if (els.lookupModal && !els.lookupModal.hidden) els.lookupModal.hidden = true;
      else if (els.shortcutsModal && !els.shortcutsModal.hidden) els.shortcutsModal.hidden = true;
      else if (els.aboutModal && !els.aboutModal.hidden) els.aboutModal.hidden = true;
      else if (!els.libraryModal.hidden) els.libraryModal.hidden = true;
      else if (!els.sideDrawer.hidden) {
        els.sideDrawer.hidden = true;
        els.btnHighlightsTop?.classList.remove('active');
      } else if (!els.thumbnailsStrip.hidden) {
        els.thumbnailsStrip.hidden = true;
        els.btnThumbs.classList.remove('active');
      } else if (state.magEnabled) setMagnifierEnabled(false);
      else if (state.curtainEnabled) setFocusCurtainEnabled(false, { persist: true });
      else if (state.zoom > 1) setZoom(1, true);
      return;
    }

    if (editing) return;

    const hasMod = e.metaKey || e.ctrlKey || e.altKey;
    if (e.key === 'ArrowLeft' && e.altKey && !e.metaKey && !e.ctrlKey) {
      if (state.pdfDoc && els.libraryModal.hidden) {
        e.preventDefault();
        jumpBackHistory();
      }
      return;
    }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && state.pdfDoc && els.libraryModal.hidden && state.curtainEnabled && !e.metaKey && !e.ctrlKey && (state.scrollMode === 'flip' || e.altKey || e.shiftKey)) {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? (e.shiftKey ? -44 : -20) : (e.shiftKey ? 44 : 20);
      moveFocusCurtainByLines(delta);
      return;
    }

    if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (els.shortcutsModal && !els.shortcutsModal.hidden) {
        els.shortcutsModal.hidden = true;
      } else {
        openShortcutsModal();
      }
      return;
    }

    if (hasMod) return;

    if ((e.key === 'l' || e.key === 'L') && !e.shiftKey) {
      if (els.aboutModal && !els.aboutModal.hidden) els.aboutModal.hidden = true;
      if (els.shortcutsModal && !els.shortcutsModal.hidden) els.shortcutsModal.hidden = true;
      if (els.lookupModal && !els.lookupModal.hidden) els.lookupModal.hidden = true;
      if (!els.libraryModal.hidden) {
        els.libraryModal.hidden = true;
      } else {
        openLibraryModal();
      }
      return;
    }
    if ((e.key === 'f' || e.key === 'F') && !e.shiftKey) {
      toggleFullscreen();
      return;
    }

    if (!state.pdfDoc || !els.libraryModal.hidden || (els.aboutModal && !els.aboutModal.hidden) || (els.shortcutsModal && !els.shortcutsModal.hidden) || (els.lookupModal && !els.lookupModal.hidden)) return;

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
      case 't':
      case 'T':
        els.btnThumbs.click();
        break;
      case 'b':
      case 'B':
        if (e.shiftKey) {
          openStickyTabPopover();
          break;
        }
        toggleBookmarkCurrent();
        showBar('header', true, 1400);
        break;
      case 'm':
      case 'M':
        setMagnifierEnabled(!state.magEnabled);
        break;
      case 'r':
      case 'R':
        toggleFocusCurtain();
        break;
      case 's':
      case 'S':
        toggleSnipTool();
        break;
      case 'p':
      case 'P':
        togglePinCurrentPage();
        break;
      case 'v':
      case 'V':
        window.__flipbookApplyLayout?.(e.shiftKey ? 'togglePage' : 'toggleScroll');
        break;
      case '1':
        window.__flipbookApplyLayout?.('double');
        break;
      case '2':
        window.__flipbookApplyLayout?.('single');
        break;
      case '3':
        window.__flipbookApplyLayout?.('scroll');
        break;
      case '+':
      case '=':
        if (activeHoveredPinCtrl && activeHoveredPinCtrl.card.isConnected && !activeHoveredPinCtrl.pin.collapsed) {
          activeHoveredPinCtrl.setZoom(activeHoveredPinCtrl.pin.zoom + 0.25, null, true);
        } else {
          setZoom(state.zoom + getZoomStepDelta(1), true, getStageZoomAnchor());
          showBar('header', true, 1400);
        }
        break;
      case '-':
        if (activeHoveredPinCtrl && activeHoveredPinCtrl.card.isConnected && !activeHoveredPinCtrl.pin.collapsed) {
          activeHoveredPinCtrl.setZoom(activeHoveredPinCtrl.pin.zoom - 0.25, null, true);
        } else {
          setZoom(state.zoom + getZoomStepDelta(-1), true, getStageZoomAnchor());
          showBar('header', true, 1400);
        }
        break;
      case '0':
        if (activeHoveredPinCtrl && activeHoveredPinCtrl.card.isConnected && !activeHoveredPinCtrl.pin.collapsed) {
          activeHoveredPinCtrl.resetZoom();
        } else {
          setZoom(1, true);
          showBar('header', true, 1400);
        }
        break;
    }
  });

  // Responsive Resize & Persistence Flush
  window.addEventListener('resize', () => {
    if (!state.pdfDoc) return;
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      initReaderView(state.currentIndex);
      clampRefPinsToStage();
      if (state.curtainEnabled) scheduleCurtainBoundsSync(240);
    }, 180);
  });
  window.addEventListener('pagehide', () => {
    flushPersistState({ keepalive: true });
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
