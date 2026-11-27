// Native FlipHTML5-style GPU page-curl & spring physics engine
// Uses dual overflow-hidden rotating masks + 0.22 rAF spring interpolation + hard-cover 3D perspective turns.

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function easeOutSine(t) {
  return Math.sin((t * Math.PI) / 2);
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Constrain folded corner position (fx, fy) to the two rigid paper circles
 * anchored at top spine (0, 0) and bottom spine (0, pageH), using continuous
 * radial scaling so dragging off-page onto the dark background never sign-flips.
 */
function constrainToBindingCircles(fx, fy, ex, ey, pageH) {
  let x = fx;
  let y = fy;
  const rBot = Math.hypot(ex, ey - pageH);
  const dBot = Math.hypot(x, y - pageH);
  if (dBot > rBot && dBot > 1e-6) {
    const k = rBot / dBot;
    x *= k;
    y = pageH + (y - pageH) * k;
  }
  const rTop = Math.hypot(ex, ey);
  const dTop = Math.hypot(x, y);
  if (dTop > rTop && dTop > 1e-6) {
    const k = rTop / dTop;
    x *= k;
    y *= k;
  }
  return { fx: x, fy: y };
}

/**
 * Exact FlipHTML5 fold geometry solver.
 * Coordinates are spine-centered: x in [-pageW, +pageW], y in [0, pageH].
 * fromPoint (ex, ey) is the grabbed point on the outer edge (ex = +pageW or -pageW).
 * curPoint (fx, fy) is the live interpolated pointer/curl position.
 */
function computeFoldGeometry(pageW, pageH, maskSize, fromPoint, curPoint) {
  if (!fromPoint || !curPoint) {
    return {
      rotate: 0,
      pageTranX: 0,
      maskTranX: 0,
      maskTranY: 0,
      frontShadowDistance: 0,
      shadowRate: 0,
      isFlat: true,
      fx: 0,
      fy: 0,
      ex: 0,
      ey: 0,
      mx: 0,
      my: 0,
      vx: 0,
      vy: 0,
    };
  }

  const ex = fromPoint.x;
  const ey = fromPoint.y;
  let fx = clamp(curPoint.x, -pageW, pageW);
  let fy = curPoint.y;

  if (Math.abs(fx - ex) < 0.25) {
    return {
      rotate: ex < 0 ? 180 : 0,
      pageTranX: 0,
      maskTranX: ex,
      maskTranY: 0,
      frontShadowDistance: 0,
      shadowRate: 0,
      isFlat: true,
      fx: ex,
      fy: ey,
      ex,
      ey,
      mx: ex,
      my: ey,
      vx: 0,
      vy: 0,
    };
  }

  ({ fx, fy } = constrainToBindingCircles(fx, fy, ex, ey, pageH));

  if (Math.abs(fx - ex) < 0.25) {
    return {
      rotate: ex < 0 ? 180 : 0,
      pageTranX: 0,
      maskTranX: ex,
      maskTranY: 0,
      frontShadowDistance: 0,
      shadowRate: 0,
      isFlat: true,
      fx: ex,
      fy: ey,
      ex,
      ey,
      mx: ex,
      my: ey,
      vx: 0,
      vy: 0,
    };
  }

  const slope = (fy - ey) / (fx - ex);
  const rad = Math.atan(slope);
  let deg = (180 * rad) / Math.PI;

  const mx = (fx + ex) / 2;
  const my = (fy + ey) / 2;
  let centerX = pageW / 2;
  const centerY = pageH / 2;

  if (ex < 0) {
    deg += 180;
    centerX = -pageW / 2;
  }

  const halfPull = Math.hypot(ey - fy, ex - fx) / 2;
  const frontShadowDistance =
    deg >= 0 && deg < 180
      ? Math.abs((pageH - Math.abs(ey)) * Math.sin(rad)) + halfPull
      : Math.abs(ey * Math.sin(rad)) + halfPull;

  const diagAngle = Math.atan(pageW / pageH) + Math.abs(rad);
  const denom = Math.sin(diagAngle) * maskSize;
  const shadowRate = denom > 0 ? Math.min(1, Math.abs(frontShadowDistance / denom)) : 0;

  const projY = ((mx - centerX) * slope + centerY + slope * slope * my) / (1 + slope * slope);
  const projX = slope * (my - projY) + mx;
  let distCenter = Math.hypot(centerX - projX, centerY - projY);
  if (Math.abs(projX) < Math.abs(centerX)) {
    distCenter = -distCenter;
  }

  return {
    frontShadowDistance,
    shadowRate,
    rotate: deg,
    pageTranX: distCenter - pageW / 2,
    maskTranX: projX,
    maskTranY: projY - pageH / 2,
    isFlat: false,
    fx,
    fy,
    ex,
    ey,
    mx,
    my,
    vx: fx - ex,
    vy: fy - ey,
  };
}

const MONO_DARK_LUT = new Uint8Array(256);
for (let v = 0; v < 256; v++) {
  const inv = 229.5 - 0.8 * v;
  MONO_DARK_LUT[v] = clamp(Math.round(((inv - 127.5) * 0.93 + 127.5) * 0.98), 0, 255);
}

const darkBakedCanvasCache = new WeakMap();
let canvasFilterDarkSupported = null;

function canUseCanvasDarkFilter() {
  if (canvasFilterDarkSupported !== null) return canvasFilterDarkSupported;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const tctx = c.getContext('2d');
    if (!tctx || typeof tctx.filter !== 'string') {
      canvasFilterDarkSupported = false;
      return false;
    }
    tctx.filter = 'invert(1)';
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, 1, 1);
    canvasFilterDarkSupported = tctx.getImageData(0, 0, 1, 1).data[0] < 32;
  } catch {
    canvasFilterDarkSupported = false;
  }
  return canvasFilterDarkSupported;
}

/** Apply CSS-equivalent dark inversion (invert 0.90 hue-rotate 180deg contrast 0.93 brightness 0.98) directly to pixels. */
export function bakeDarkCanvasInPlace(canvas) {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return canvas;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (canUseCanvasDarkFilter()) {
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tctx = tmp.getContext('2d', { alpha: false });
    tctx.filter = 'invert(0.90) hue-rotate(180deg) contrast(0.93) brightness(0.98)';
    tctx.drawImage(canvas, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    tmp.width = 0;
    tmp.height = 0;
    return canvas;
  }
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (r === g && g === b) {
      const m = MONO_DARK_LUT[r];
      d[i] = m;
      d[i + 1] = m;
      d[i + 2] = m;
    } else {
      const ir = 229.5 - 0.8 * r;
      const ig = 229.5 - 0.8 * g;
      const ib = 229.5 - 0.8 * b;
      const twoL = Math.max(ir, ig, ib) + Math.min(ir, ig, ib);
      d[i] = clamp(((twoL - ir - 127.5) * 0.93 + 127.5) * 0.98, 0, 255);
      d[i + 1] = clamp(((twoL - ig - 127.5) * 0.93 + 127.5) * 0.98, 0, 255);
      d[i + 2] = clamp(((twoL - ib - 127.5) * 0.93 + 127.5) * 0.98, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Return a cached dark-baked offscreen copy of srcCanvas (GPU-accelerated via ctx.filter when available). */
export function getBakedDarkCanvas(srcCanvas) {
  if (!srcCanvas || srcCanvas.width <= 0 || srcCanvas.height <= 0) return srcCanvas;
  const cached = darkBakedCanvasCache.get(srcCanvas);
  if (cached && cached.width === srcCanvas.width && cached.height === srcCanvas.height) {
    return cached;
  }
  const dc = document.createElement('canvas');
  dc.width = srcCanvas.width;
  dc.height = srcCanvas.height;
  const dctx = dc.getContext('2d', { alpha: false });
  if (canUseCanvasDarkFilter()) {
    dctx.filter = 'invert(0.90) hue-rotate(180deg) contrast(0.93) brightness(0.98)';
    dctx.drawImage(srcCanvas, 0, 0);
  } else {
    dctx.drawImage(srcCanvas, 0, 0);
    bakeDarkCanvasInPlace(dc);
  }
  darkBakedCanvasCache.set(srcCanvas, dc);
  return dc;
}

function releaseCanvasesIn(root) {
  if (!root?.querySelectorAll) return;
  for (const c of root.querySelectorAll('canvas')) {
    c.width = 0;
    c.height = 0;
  }
}

function populateSnapshotWrap(wrap, pageNode, reverseBack = false, darkMode = false, pageW = 0, pageH = 0) {
  releaseCanvasesIn(wrap);
  wrap.innerHTML = '';
  const rawIdx = pageNode ? Number(pageNode.dataset.pageIndex) : NaN;
  if (Number.isFinite(rawIdx)) {
    wrap.dataset.pageIdx = String(rawIdx);
  }
  const srcCanvas = pageNode?.querySelector('canvas.fb-canvas');
  if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
    const snap = document.createElement('canvas');
    snap.className = 'fh-snap-canvas';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const maxSnapW = pageW > 0 ? Math.max(240, Math.round(pageW * dpr)) : srcCanvas.width;
    const maxSnapDim = 1600;
    const maxSnapArea = 2_000_000;
    const maxDim = Math.max(srcCanvas.width, srcCanvas.height);
    const area = srcCanvas.width * srcCanvas.height;
    const ratio = Math.min(
      1,
      maxSnapW / srcCanvas.width,
      maxSnapDim / maxDim,
      Math.sqrt(maxSnapArea / Math.max(1, area))
    );
    snap.width = Math.max(1, Math.round(srcCanvas.width * ratio));
    snap.height = Math.max(1, Math.round(srcCanvas.height * ratio));
    const snapCtx = snap.getContext('2d', { alpha: false });
    if (snapCtx) {
      if (darkMode) {
        const cachedDark = darkBakedCanvasCache.get(srcCanvas);
        if (cachedDark && cachedDark.width === srcCanvas.width && cachedDark.height === srcCanvas.height) {
          snapCtx.drawImage(cachedDark, 0, 0, snap.width, snap.height);
        } else if (canUseCanvasDarkFilter()) {
          snapCtx.filter = 'invert(0.90) hue-rotate(180deg) contrast(0.93) brightness(0.98)';
          snapCtx.drawImage(srcCanvas, 0, 0, snap.width, snap.height);
          snapCtx.filter = 'none';
        } else {
          snapCtx.drawImage(srcCanvas, 0, 0, snap.width, snap.height);
          bakeDarkCanvasInPlace(snap);
        }
        snap.dataset.darkBaked = '1';
      } else {
        snapCtx.drawImage(srcCanvas, 0, 0, snap.width, snap.height);
      }
    }
    wrap.appendChild(snap);
    delete wrap.dataset.pendingPageIdx;
    if (!reverseBack) {
      const userHl = pageNode.querySelector('.fb-user-highlights');
      if (userHl && userHl.children.length > 0) {
        wrap.appendChild(userHl.cloneNode(true));
      }
      const marginNotes = pageNode.querySelector('.fb-margin-notes');
      if (marginNotes && marginNotes.children.length > 0) {
        const clonedNotes = marginNotes.cloneNode(true);
        clonedNotes.querySelectorAll('.fb-margin-note-pin').forEach((p) => {
          p.disabled = true;
          p.tabIndex = -1;
          p.classList.remove('is-dragging');
        });
        wrap.appendChild(clonedNotes);
      }
    }
  } else {
    if (!reverseBack) {
      const ph = document.createElement('div');
      ph.className = 'fb-page-num-placeholder';
      const num = Number.isFinite(rawIdx) ? rawIdx + 1 : '';
      ph.textContent = String(num);
      wrap.appendChild(ph);
      if (Number.isFinite(rawIdx)) {
        wrap.dataset.pendingPageIdx = String(rawIdx);
      }
    }
  }
}

function cloneCanvasSnapshot(pageNode, pageW, pageH, reverseBack = false, darkMode = false) {
  const wrap = document.createElement('div');
  wrap.className = reverseBack ? 'fh-snap fh-snap-reverse' : 'fh-snap';
  populateSnapshotWrap(wrap, pageNode, reverseBack, darkMode, pageW, pageH);
  wrap.style.width = `${pageW}px`;
  wrap.style.height = `${pageH}px`;
  return wrap;
}

export class FlipBookEngine {
  constructor(host, settings) {
    this.host = host;
    this.settings = {
      width: 400,
      height: 550,
      usePortrait: false,
      startPage: 0,
      flippingTime: 300,
      showCover: true,
      showPageCorners: true,
      disableFlipByClick: true,
      hasCollectedStack: null,
      onRenderSheetTabs: null,
      ...settings,
    };

    this.events = new Map();
    this.pageNodes = [];
    this.spreads = [];
    this.currentSpreadIndex = 0;
    this.currentPageIndex = 0;
    this.state = 'read'; // 'read' | 'fold_corner' | 'user_fold' | 'flipping'

    this.pageW = this.settings.width;
    this.pageH = this.settings.height;
    this.single = !!this.settings.usePortrait;

    // Mask geometry
    let m = Math.ceil(Math.hypot(this.pageW, this.pageH));
    if ((m - this.pageH) % 2 !== 0) m += 1;
    this.maskSize = m;
    this.sideTop = (m - this.pageH) / 2;

    // Active flip state (interactive curl separated from concurrent serial flips)
    this.interactiveFlip = null;
    this.flyingFlips = [];
    this.flipSeq = 0;
    this.rafId = null;
    this._lastLoopTime = null;
    this._lastSpineBlend = 0;
    this.isPointerDown = false;
    this.activePointerId = null;
    this.pointerMoved = false;
    this._pointerMovedResetTimer = null;
    this.pointerDownPos = null;
    this.lastMovePos = null;
    this.lastClientPos = null;
    this.moveVelX = 0;
    this.interactionDisabled = false;
    this._handledPointerEv = null;

    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onPointerCancel = this._handlePointerCancel.bind(this);
    this._onLostPointerCapture = this._handleLostPointerCapture.bind(this);
    this._onWindowBlur = this._handleWindowBlur.bind(this);
    this._tick = this._loop.bind(this);
  }

  on(name, cb) {
    if (!this.events.has(name)) this.events.set(name, []);
    this.events.get(name).push(cb);
    return this;
  }

  _emit(name, data) {
    const list = this.events.get(name);
    if (!list) return;
    for (const cb of list) cb({ data, object: this });
  }

  _setState(next) {
    if (this.state !== next) {
      this.state = next;
      this._emit('changeState', next);
    }
  }

  getState() {
    return this.state;
  }

  getOrientation() {
    return this.single ? 'portrait' : 'landscape';
  }

  getPageCount() {
    return this.pageNodes.length;
  }

  getCurrentPageIndex() {
    return this.currentPageIndex;
  }

  getBoundsRect() {
    const w = this.single ? this.pageW : this.pageW * 2;
    return {
      left: 0,
      top: 0,
      width: w,
      height: this.pageH,
      pageWidth: this.pageW,
    };
  }

  loadFromHTML(items) {
    this.pageNodes = Array.from(items);
    this._buildSpreads();
    this._buildDom();
    this._attachEvents();

    const startSpread = this._findSpreadByPage(this.settings.startPage);
    this.currentSpreadIndex = startSpread >= 0 ? startSpread : 0;
    this._renderStaticSpread();

    setTimeout(() => {
      this._emit('init', { page: this.currentPageIndex, mode: this.getOrientation() });
    }, 0);
  }

  destroy() {
    this._stopRaf();
    this._detachEvents();
    clearTimeout(this._pointerMovedResetTimer);
    this._pointerMovedResetTimer = null;
    this.pointerMoved = false;
    this._releaseActivePointer();
    releaseCanvasesIn(this.flipLayer);
    this.interactiveFlip = null;
    this.flyingFlips = [];
    this.host.innerHTML = '';
    this.stage = null;
    this.leftSlot = null;
    this.rightSlot = null;
    this.flipLayer = null;
    this.events.clear();
    this.pageNodes = [];
  }

  resize(newPageW, newPageH) {
    this.pageW = Math.max(120, Math.round(newPageW));
    this.pageH = Math.max(160, Math.round(newPageH));
    let m = Math.ceil(Math.hypot(this.pageW, this.pageH));
    if ((m - this.pageH) % 2 !== 0) m += 1;
    this.maskSize = m;
    this.sideTop = (m - this.pageH) / 2;

    if (this.interactiveFlip || this.flyingFlips.length) this._cancelAllFlipsImmediate();

    const totalW = this.single ? this.pageW : this.pageW * 2;
    if (this.stage) {
      this.stage.style.width = `${totalW}px`;
      this.stage.style.height = `${this.pageH}px`;
    }
    if (this.leftSlot) {
      this.leftSlot.style.width = `${this.pageW}px`;
      this.leftSlot.style.height = `${this.pageH}px`;
    }
    if (this.rightSlot) {
      this.rightSlot.style.width = `${this.pageW}px`;
      this.rightSlot.style.height = `${this.pageH}px`;
    }
  }

  _buildSpreads() {
    this.spreads = [];
    const n = this.pageNodes.length;
    if (!n) return;

    if (this.single) {
      for (let i = 0; i < n; i++) this.spreads.push([i]);
      return;
    }

    let start = 0;
    if (this.settings.showCover) {
      this.spreads.push([0]);
      start = 1;
    }
    for (let i = start; i < n; i += 2) {
      if (i + 1 < n) this.spreads.push([i, i + 1]);
      else this.spreads.push([i]);
    }
  }

  _findSpreadByPage(pageIdx) {
    for (let s = 0; s < this.spreads.length; s++) {
      if (this.spreads[s].includes(pageIdx)) return s;
    }
    return 0;
  }

  _buildDom() {
    const totalW = this.single ? this.pageW : this.pageW * 2;
    this.host.innerHTML = '';
    this.stage = document.createElement('div');
    this.stage.className = `stf__block fh-stage ${this.single ? 'fh-single' : 'fh-double'}`;
    this.stage.style.width = `${totalW}px`;
    this.stage.style.height = `${this.pageH}px`;

    this.leftSlot = document.createElement('div');
    this.leftSlot.className = 'fh-slot fh-slot-left';
    this.leftSlot.style.width = `${this.pageW}px`;
    this.leftSlot.style.height = `${this.pageH}px`;

    this.rightSlot = document.createElement('div');
    this.rightSlot.className = 'fh-slot fh-slot-right';
    this.rightSlot.style.width = `${this.pageW}px`;
    this.rightSlot.style.height = `${this.pageH}px`;

    this.flipLayer = document.createElement('div');
    this.flipLayer.className = 'fh-flip-layer';

    if (!this.single) {
      this.stage.appendChild(this.leftSlot);
    }
    this.stage.appendChild(this.rightSlot);
    this.stage.appendChild(this.flipLayer);
    this.host.appendChild(this.stage);
  }

  _getSpreadSlots(spreadIdx) {
    const sp = this.spreads[spreadIdx] || [0];
    if (this.single) return { left: null, right: sp[0] };
    if (sp.length === 2) return { left: sp[0], right: sp[1] };
    const idx = sp[0];
    if (this.settings.showCover && idx === 0) return { left: null, right: 0 };
    return { left: idx, right: null };
  }

  _setSlotPage(slotEl, pageIdx) {
    if (!slotEl) return;
    if (pageIdx !== null && pageIdx !== undefined && this.pageNodes[pageIdx]) {
      const node = this.pageNodes[pageIdx];
      if (node.parentElement === slotEl && slotEl.childElementCount === 1) {
        slotEl.style.visibility = 'visible';
        return;
      }
      slotEl.innerHTML = '';
      node.style.cssText = 'display:block;position:relative;width:100%;height:100%;';
      slotEl.appendChild(node);
      slotEl.style.visibility = 'visible';
    } else {
      if (slotEl.childElementCount > 0) slotEl.innerHTML = '';
      slotEl.style.visibility = 'hidden';
    }
  }

  _renderStaticSpread() {
    const slots = this._getSpreadSlots(this.currentSpreadIndex);
    if (!this.single) {
      this._setSlotPage(this.leftSlot, slots.left);
    }
    this._setSlotPage(this.rightSlot, slots.right);

    const sp = this.spreads[this.currentSpreadIndex] || [0];
    this.currentPageIndex = sp[0];
  }

  /* ---------- Event Handling ---------- */
  _attachEvents() {
    this.stage.addEventListener('pointerdown', this._onPointerDown);
    this.stage.addEventListener('pointermove', this._onPointerMove);
    this.stage.addEventListener('pointerup', this._onPointerUp);
    this.stage.addEventListener('pointercancel', this._onPointerCancel);
    this.stage.addEventListener('lostpointercapture', this._onLostPointerCapture);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerCancel);
    window.addEventListener('blur', this._onWindowBlur);
  }

  _detachEvents() {
    if (this.stage) {
      this.stage.removeEventListener('pointerdown', this._onPointerDown);
      this.stage.removeEventListener('pointermove', this._onPointerMove);
      this.stage.removeEventListener('pointerup', this._onPointerUp);
      this.stage.removeEventListener('pointercancel', this._onPointerCancel);
      this.stage.removeEventListener('lostpointercapture', this._onLostPointerCapture);
    }
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
    window.removeEventListener('blur', this._onWindowBlur);
  }

  _clientToBook(clientX, clientY) {
    const rect = this.stage.getBoundingClientRect();
    const scaleX = rect.width > 0 ? (this.single ? this.pageW : this.pageW * 2) / rect.width : 1;
    const scaleY = rect.height > 0 ? this.pageH / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  _bookToSpine(bookPos) {
    if (this.single) {
      return { x: bookPos.x, y: bookPos.y };
    }
    return { x: bookPos.x - this.pageW, y: bookPos.y };
  }

  isPointInFlipZone(clientX, clientY, onTextSpan = false) {
    const bp = this._clientToBook(clientX, clientY);
    const side = this._hitEdgeSide(bp);
    if (!side) return false;
    if (!onTextSpan) return true;
    // When clicking directly on a text glyph span, only treat the outermost rim (<= 24px) as a flip grab
    // so paragraph words near corners/margins remain selectable for highlighting.
    const totalW = this.single ? this.pageW : this.pageW * 2;
    const strictRim = Math.min(26, this.pageW * 0.05);
    return side === 'left' ? bp.x <= strictRim : bp.x >= totalW - strictRim;
  }

  _hitEdgeSide(bp) {
    const totalW = this.single ? this.pageW : this.pageW * 2;
    if (bp.y <= 0 || bp.y >= this.pageH) return null;
    const inCornerBand = bp.y < 0.16 * this.pageH || bp.y > 0.84 * this.pageH;
    const edgeBand = inCornerBand
      ? Math.min(this.pageW * 0.22, Math.max(68, this.pageW * 0.15))
      : Math.min(48, Math.max(32, this.pageW * 0.085));

    if (this.single) {
      if (bp.x < 0 || bp.x > this.pageW) return null;
      if (bp.x < edgeBand && this.currentSpreadIndex > 0) return 'left';
      if (bp.x > this.pageW - edgeBand && this.currentSpreadIndex < this.spreads.length - 1) return 'right';
      return null;
    }

    const slots = this._getSpreadSlots(this.currentSpreadIndex);
    if (bp.x > 0 && bp.x < edgeBand && slots.left !== null && this.currentSpreadIndex > 0) return 'left';
    if (bp.x > totalW - edgeBand && bp.x < totalW && slots.right !== null && this.currentSpreadIndex < this.spreads.length - 1) {
      return 'right';
    }
    return null;
  }

  /**
   * Exact FlipHTML5 aroundCorner() curved corner-tip hit test for passive mouse hover.
   * Only triggers at the 4 actual corner tips (never along the middle outer edges).
   */
  _hitHoverCorner(bp) {
    const side = this._hitEdgeSide(bp);
    if (!side) return null;

    const sp = this._bookToSpine(bp);
    const w = this.pageW;
    const h = this.pageH;
    const distIn = this.single ? (side === 'right' ? w - sp.x : sp.x) : w - Math.abs(sp.x);
    if (distIn < 1 || distIn > 0.16 * w) return null;
    if (bp.y > 0.16 * h && bp.y < 0.84 * h) return null;

    const maxY = Math.sqrt(Math.max(0, Math.pow(0.16 * h, 2) - Math.pow((distIn * h) / w, 2)));
    if (bp.y < maxY || bp.y > h - maxY) {
      return side;
    }
    return null;
  }

  setInteractionDisabled(disabled) {
    this.interactionDisabled = !!disabled;
    if (this.interactionDisabled && this.interactiveFlip && !this.isPointerDown) {
      this._cancelInteractiveFlipImmediate();
    }
  }

  _clampDragTarget(bp, fromPoint, side, grabStartPos = null) {
    const sp = this._bookToSpine(bp);
    if (this.single && side === 'left') {
      let tx = clamp(sp.x, 0, this.pageW);
      if (grabStartPos && grabStartPos.x > 32) {
        const dx = bp.x - grabStartPos.x;
        tx = clamp(22 + Math.max(0, dx) * 1.45, 0, this.pageW);
      }
      let ty = clamp(sp.y, 0, this.pageH);
      const edgeGuardSpan = Math.min(48, this.pageW * 0.14);
      if (tx < edgeGuardSpan) {
        const safeSlope = Math.min(0.65, (this.pageW * 0.72) / Math.max(1, this.pageH));
        const maxDy = tx * safeSlope;
        ty = fromPoint.y + clamp(ty - fromPoint.y, -maxDy, maxDy);
      }
      return { x: tx, y: ty };
    }

    let tx = clamp(sp.x, -this.pageW, this.pageW);
    let ty = sp.y;
    if (this.single && side === 'right' && grabStartPos) {
      const dx = bp.x - grabStartPos.x;
      const dy = bp.y - grabStartPos.y;
      if (grabStartPos.x < this.pageW - 32) {
        const pullDist = Math.max(0, -dx) * 1.45 + (dx <= 16 ? Math.max(0, -dy) * 0.55 : 0);
        tx = clamp(this.pageW - 22 - pullDist + Math.max(0, dx) * 0.35, -this.pageW, this.pageW - 4);
      } else if (dx <= 8 && dy < -14) {
        const upBoost = Math.max(0, -dy) * 0.42;
        tx = clamp(tx - upBoost, -this.pageW, this.pageW);
      }
    }
    if (side === 'right' && tx > fromPoint.x) tx = fromPoint.x;
    if (side === 'left' && tx < fromPoint.x) tx = fromPoint.x;

    // Near the outer edge (before dragging deeply into the page), bound vertical tilt proportionally
    // to horizontal pull so clicking or resting at the outer edge never slices the page horizontally.
    const pull = Math.abs(tx - fromPoint.x);
    const edgeGuardSpan = Math.min(48, this.pageW * 0.14);
    if (pull < edgeGuardSpan) {
      const safeSlope = Math.min(0.65, (this.pageW * 0.72) / Math.max(1, this.pageH));
      const maxDy = pull * safeSlope;
      ty = fromPoint.y + clamp(ty - fromPoint.y, -maxDy, maxDy);
    }

    const constrained = constrainToBindingCircles(tx, ty, fromPoint.x, fromPoint.y, this.pageH);
    return { x: constrained.fx, y: constrained.fy };
  }

  _handlePointerDown(e) {
    if (this.interactionDisabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.isPrimary === false) return;
    if (['A', 'BUTTON', 'INPUT'].includes(e.target?.tagName)) return;
    const bp = this._clientToBook(e.clientX, e.clientY);
    const side = this._hitEdgeSide(bp);
    if (this.settings.disableFlipByClick && !side) return;
    if (bp.y < 0 || bp.y > this.pageH || bp.x < 0 || bp.x > (this.single ? this.pageW : this.pageW * 2)) return;

    let chosenSide = side;
    if (!chosenSide) {
      if (this.single) {
        if (bp.x < this.pageW * 0.25 && this.currentSpreadIndex > 0) chosenSide = 'left';
        else if (this.currentSpreadIndex < this.spreads.length - 1) chosenSide = 'right';
        else if (this.currentSpreadIndex > 0) chosenSide = 'left';
        else return;
      } else {
        chosenSide = bp.x < this.pageW ? 'left' : 'right';
      }
    }

    e.preventDefault();
    clearTimeout(this._pointerMovedResetTimer);
    this._pointerMovedResetTimer = null;
    this.isPointerDown = true;
    this.activePointerId = e.pointerId ?? null;
    this.pointerMoved = false;
    this.pointerDownPos = bp;
    this.lastMovePos = bp;
    this.lastClientPos = { x: e.clientX, y: e.clientY };
    this.moveVelX = 0;

    if (e.pointerId !== undefined && e.pointerId !== null) {
      try {
        this.stage?.setPointerCapture?.(e.pointerId);
      } catch {}
    }

    if (this.flyingFlips.length) {
      this._settleAllFlyingFlips();
    }
    if (this.interactiveFlip && this.interactiveFlip.side === chosenSide) {
      // Grabbed already-curled hover/fallback corner cleanly without sudden angle jump
      this.interactiveFlip.mode = 'drag';
      this.interactiveFlip.fromDragFallback = false;
      this.interactiveFlip.fallbackDur = 0;
      this.interactiveFlip.fallbackElapsed = 0;
      this.interactiveFlip.wasDragged = true;
      this.interactiveFlip.downMask?.classList.remove('is-hover-curl');
      this.interactiveFlip.upMask?.classList.remove('is-hover-curl');
      this.interactiveFlip.downTabs?.classList.remove('is-hover-curl');
      this.interactiveFlip.upTabsWrap?.classList.remove('is-hover-curl');
      this.interactiveFlip.hardCard?.classList.remove('is-hover-curl');
      this.interactiveFlip.grabStartPos = { ...bp };
      this.interactiveFlip.lastClientX = e.clientX;
      this.interactiveFlip.lastClientY = e.clientY;
      this.interactiveFlip.stackBackedPrev = !!(
        this.interactiveFlip.singlePrev &&
        this.settings.hasCollectedStack?.()
      );
      this.interactiveFlip.stackBackedNext = !!(
        this.single &&
        chosenSide === 'right' &&
        this.settings.hasCollectedStack?.()
      );
      if (!this.interactiveFlip.singlePrev) {
        this.interactiveFlip.from.y = clamp(bp.y, 0, this.pageH);
      }
      this.interactiveFlip.target = this._clampDragTarget(bp, this.interactiveFlip.from, chosenSide, this.interactiveFlip.grabStartPos);
      const coordAsBook = this.single ? { ...this.interactiveFlip.coord } : { x: this.interactiveFlip.coord.x + this.pageW, y: this.interactiveFlip.coord.y };
      this.interactiveFlip.coord = this._clampDragTarget(coordAsBook, this.interactiveFlip.from, chosenSide);
      this._setState('user_fold');
      this._emit('activeFlipsChange');
    } else {
      if (this.interactiveFlip) this._cancelInteractiveFlipImmediate();
      const began = this._beginInteractiveTurn(chosenSide, bp, 'drag', { x: e.clientX, y: e.clientY });
      if (!began) {
        this._releaseActivePointer();
      }
    }
  }

  _handlePointerMove(e) {
    if (this._handledPointerEv === e) return;
    this._handledPointerEv = e;
    if (this.interactionDisabled && !this.isPointerDown) return;

    if (this.isPointerDown) {
      if (this.activePointerId !== null && e.pointerId !== undefined && e.pointerId !== this.activePointerId) {
        return;
      }
      if (e.pointerType === 'mouse' && typeof e.buttons === 'number' && (e.buttons & 1) === 0) {
        this._handlePointerUp(e);
        return;
      }
    }

    const bp = this._clientToBook(e.clientX, e.clientY);

    if (this.isPointerDown && this.interactiveFlip && this.interactiveFlip.mode === 'drag') {
      const dx = bp.x - this.pointerDownPos.x;
      const dy = bp.y - this.pointerDownPos.y;
      if (Math.hypot(dx, dy) > 5) this.pointerMoved = true;

      if (this.lastMovePos) {
        this.moveVelX = bp.x - this.lastMovePos.x;
      }
      this.lastMovePos = bp;
      this.lastClientPos = { x: e.clientX, y: e.clientY };
      this.interactiveFlip.lastClientX = e.clientX;
      this.interactiveFlip.lastClientY = e.clientY;
      this.interactiveFlip.target = this._clampDragTarget(
        bp,
        this.interactiveFlip.from,
        this.interactiveFlip.side,
        this.interactiveFlip.grabStartPos
      );
      this._ensureRaf();
      return;
    }

    // Hover corner-tip curl only (FlipHTML5 aroundCorner behavior)
    if (!this.settings.showPageCorners || this.isPointerDown) return;
    if (this.flyingFlips.length > 0) return;
    if (e.target && e.target !== this.stage && e.target.closest?.('.more-menu, .side-drawer, .bottom-bar, .top-bar, .sticky-edge-tab, .popover-panel, .thumbnails-strip, .modal-backdrop, .nav-back-pill, .auto-playback-hud, .mag-controls-pill, .mag-lens, .focus-curtain-band, .focus-curtain-pill, .ref-pin-card, .snip-overlay, .page-context-menu')) {
      if (this.interactiveFlip && this.interactiveFlip.mode === 'hover') {
        this._beginFallback(this.interactiveFlip, false);
      }
      return;
    }

    const side = this._hitHoverCorner(bp);
    if (side) {
      const w = this.pageW;
      const h = this.pageH;
      const isBottom = bp.y > h / 2;
      const peekX = side === 'right' ? w - 24 : (this.single ? 26 : -w + 24);
      const peekY = (this.single && side === 'left') ? (isBottom ? h - 120 : 120) : (isBottom ? h - 22 : 22);

      if (!this.interactiveFlip) {
        this._beginInteractiveTurn(side, bp, 'hover');
        if (this.interactiveFlip) this.interactiveFlip.target = { x: peekX, y: peekY };
      } else if (
        this.interactiveFlip.mode === 'hover' ||
        (this.interactiveFlip.mode === 'fallback' && !this.interactiveFlip.fromDragFallback)
      ) {
        if (this.interactiveFlip.side !== side) {
          this._cancelInteractiveFlipImmediate();
          this._beginInteractiveTurn(side, bp, 'hover');
          if (this.interactiveFlip) this.interactiveFlip.target = { x: peekX, y: peekY };
        } else {
          this.interactiveFlip.mode = 'hover';
          this.interactiveFlip.fromDragFallback = false;
          this.interactiveFlip.target = { x: peekX, y: peekY };
          this._ensureRaf();
        }
      }
    } else if (this.interactiveFlip && this.interactiveFlip.mode === 'hover') {
      // Smoothly spring back to flat when cursor leaves the corner tip
      this._beginFallback(this.interactiveFlip, false);
    }
  }

  _releaseActivePointer() {
    const releasedId = this.activePointerId;
    this.isPointerDown = false;
    this.activePointerId = null;
    if (releasedId !== null) {
      try {
        if (this.stage?.hasPointerCapture?.(releasedId)) {
          this.stage.releasePointerCapture(releasedId);
        }
      } catch {}
    }
  }

  _schedulePointerMovedReset() {
    clearTimeout(this._pointerMovedResetTimer);
    this._pointerMovedResetTimer = setTimeout(() => {
      this._pointerMovedResetTimer = null;
      this.pointerMoved = false;
    }, 0);
  }

  _handlePointerUp(e) {
    if (this._handledPointerEv === e) return;
    this._handledPointerEv = e;
    if (!this.isPointerDown) return;
    if (this.activePointerId !== null && e.pointerId !== undefined && e.pointerId !== this.activePointerId) {
      return;
    }
    this._releaseActivePointer();
    this._schedulePointerMovedReset();

    const cx = Number.isFinite(e?.clientX) ? e.clientX : (this.lastClientPos?.x ?? 0);
    const cy = Number.isFinite(e?.clientY) ? e.clientY : (this.lastClientPos?.y ?? 0);
    const bp = this._clientToBook(cx, cy);

    if (!this.interactiveFlip) return;

    if (!this.pointerMoved) {
      // Simple click anywhere -> trigger full animated page turn!
      this._finishTurnAnimated();
      return;
    }

    const sp = this._bookToSpine(bp);
    const f = this.interactiveFlip;
    const dir = f.side === 'right' ? 1 : -1; // +1 forward, -1 back
    const midX = this.single ? this.pageW / 2 : 0;
    let shouldTurn = false;
    if (this.single) {
      const grabX = f.grabStartPos?.x ?? (dir === 1 ? this.pageW : 0);
      const grabY = f.grabStartPos?.y ?? bp.y;
      if (dir === 1) {
        const dragTravel = (f.from.x - f.coord.x) / (2 * this.pageW);
        shouldTurn =
          dragTravel > 0.24 ||
          sp.x < midX ||
          (this.moveVelX < -3.5 && sp.x < this.pageW * 0.85) ||
          bp.x < grabX - 45 ||
          (bp.y < grabY - 52 && bp.x <= grabX + 18);
      } else {
        const dragTravel = f.coord.x / Math.max(1, this.pageW);
        shouldTurn =
          dragTravel > 0.28 ||
          sp.x > midX ||
          (this.moveVelX > 3.5 && sp.x > this.pageW * 0.15) ||
          bp.x > grabX + 45;
      }
    } else {
      const crossedCenter = dir === 1 ? sp.x < midX : sp.x > midX;
      const flicked = dir === 1 ? this.moveVelX < -4 && sp.x < this.pageW * 0.72 : this.moveVelX > 4 && sp.x > -this.pageW * 0.65;
      shouldTurn = crossedCenter || flicked;
    }

    if (shouldTurn) {
      this._finishTurnAnimated();
    } else {
      // Release early -> crisp dt-eased return with no creeping asymptotic tail
      this._beginFallback(this.interactiveFlip, true);
    }
  }

  _handlePointerCancel(e) {
    if (!this.isPointerDown) return;
    if (this.activePointerId !== null && e?.pointerId !== undefined && e.pointerId !== this.activePointerId) {
      return;
    }
    this._releaseActivePointer();
    this._schedulePointerMovedReset();
    if (!this.interactiveFlip) return;
    if (this.interactiveFlip.mode === 'hover') {
      this._cancelInteractiveFlipImmediate();
    } else {
      this._beginFallback(this.interactiveFlip, Boolean(this.interactiveFlip.wasDragged));
    }
  }

  _handleLostPointerCapture(e) {
    // Keep drag alive across capture loss on stage unless button was already released;
    // window listener continues tracking inside viewport and will finish on pointerup.
    if (!this.isPointerDown) return;
    if (e?.pointerId !== undefined && this.activePointerId !== null && e.pointerId !== this.activePointerId) {
      return;
    }
    if (e?.pointerType === 'mouse' && typeof e.buttons === 'number' && (e.buttons & 1) === 0) {
      this._handlePointerUp({
        pointerId: this.activePointerId,
        clientX: this.lastClientPos?.x ?? 0,
        clientY: this.lastClientPos?.y ?? 0,
      });
    }
  }

  _handleWindowBlur() {
    if (!this.isPointerDown) return;
    if (!this.pointerMoved && this.interactiveFlip) {
      this._releaseActivePointer();
      this._schedulePointerMovedReset();
      this._beginFallback(this.interactiveFlip, false);
      return;
    }
    this._handlePointerUp({
      pointerId: this.activePointerId,
      clientX: this.lastClientPos?.x ?? 0,
      clientY: this.lastClientPos?.y ?? 0,
    });
  }

  /* ---------- Interactive Flip Construction & rAF Spring Loop ---------- */
  _createSnap(pageIdx, reverseBack = false) {
    const isDark = Boolean(this.settings.isDarkMode?.());
    return cloneCanvasSnapshot(this.pageNodes[pageIdx], this.pageW, this.pageH, reverseBack, isDark);
  }

  _createFlipDom({
    side,
    isHard,
    fromIdx,
    toIdx,
    underIdx,
    withUnder,
    seq,
    fromHasSpine = !this.single,
    toHasSpine = !this.single,
    singlePrev = false,
  }) {
    const els = [];
    let underEl = null;

    if (withUnder) {
      underEl = document.createElement('div');
      underEl.className = `fh-under ${this.single ? 'fh-under-single' : side === 'right' ? 'fh-under-right' : 'fh-under-left'}`;
      underEl.style.width = `${this.pageW}px`;
      underEl.style.height = `${this.pageH}px`;
      if (underIdx !== null && underIdx !== undefined) {
        underEl.appendChild(this._createSnap(underIdx));
      } else {
        underEl.style.display = 'none';
      }
      this.flipLayer.appendChild(underEl);
      els.push(underEl);
    }

    const baseUp = singlePrev ? 4000 + seq * 4 : 2000 - seq * 4;
    const frontZ = String(baseUp);
    const castZ = String(baseUp - 1);
    const flapDropZ = String(singlePrev ? baseUp - 2 : 3000 + seq * 4);
    const backZ = String(singlePrev ? baseUp + 1 : 3000 + seq * 4 + 1);

    if (isHard) {
      const hardCard = document.createElement('div');
      hardCard.className = `fh-hard-card ${this.single ? 'fh-hard-left' : side === 'right' ? 'fh-hard-right' : 'fh-hard-left'}`;
      hardCard.style.width = `${this.pageW}px`;
      hardCard.style.height = `${this.pageH}px`;
      hardCard.style.zIndex = frontZ;

      const hardFront = document.createElement('div');
      hardFront.className = 'fh-hard-face fh-hard-front';
      if (fromIdx !== null && fromIdx !== undefined) {
        hardFront.appendChild(this._createSnap(fromIdx));
      }

      const hardBack = document.createElement('div');
      hardBack.className = 'fh-hard-face fh-hard-back';
      if (toIdx !== null && toIdx !== undefined) {
        hardBack.appendChild(this._createSnap(toIdx));
      }

      const hardShade = document.createElement('div');
      hardShade.className = 'fh-hard-shade';

      hardCard.appendChild(hardFront);
      hardCard.appendChild(hardBack);
      hardCard.appendChild(hardShade);
      this.settings.onRenderSheetTabs?.({
        isHard: true,
        singlePrev,
        side,
        fromIdx,
        toIdx,
        hardFront,
        hardBack,
      });
      this.flipLayer.appendChild(hardCard);
      els.push(hardCard);

      return { isHard: true, singlePrev, seq, underEl, underIdx, fromIdx, toIdx, fromHasSpine: !!fromHasSpine, toHasSpine: !!toHasSpine, underSpine: false, hardCard, hardShade, els };
    }

    let underShadow = null;
    let underSpine = null;
    if (underEl) {
      if (toHasSpine && underIdx !== null && underIdx !== undefined) {
        underSpine = document.createElement('div');
        underSpine.className = this.single
          ? 'fh-single-spine-left'
          : `fh-inner-spine ${side === 'right' ? 'fh-inner-spine-right' : 'fh-inner-spine-left'}`;
        underEl.appendChild(underSpine);
      }
      underShadow = document.createElement('div');
      underShadow.className = 'fh-under-shadow';
      underEl.appendChild(underShadow);
    }

    // Cast shadow falling from the fold crease onto the revealed/covered underlying page
    const castBounds = document.createElement('div');
    castBounds.className = 'fh-cast-bounds';
    castBounds.style.zIndex = castZ;

    const castMask = document.createElement('div');
    castMask.className = `fh-cast-mask ${this.single ? 'fh-mask-single' : 'fh-mask-double'}`;
    castMask.style.width = `${this.maskSize}px`;
    castMask.style.height = `${this.maskSize}px`;
    castMask.style.marginTop = `${-this.maskSize / 2}px`;

    const castGradient = document.createElement('div');
    castGradient.className = 'fh-cast-gradient';
    castMask.appendChild(castGradient);
    castBounds.appendChild(castMask);

    // downMask: clips active front sheet (departing front sheet in Next / unfurling sheet in singlePrev)
    const downMask = document.createElement('div');
    downMask.className = `fh-mask ${this.single ? 'fh-mask-single' : 'fh-mask-double'}`;
    downMask.style.width = `${this.maskSize}px`;
    downMask.style.height = `${this.maskSize}px`;
    downMask.style.marginTop = `${-this.maskSize / 2}px`;
    downMask.style.zIndex = frontZ;

    const downSide = document.createElement('div');
    downSide.className = 'fh-down-side';
    downSide.style.width = `${this.pageW}px`;
    downSide.style.height = `${this.pageH}px`;
    downSide.style.top = `${this.sideTop}px`;
    const downPageIdx = singlePrev ? toIdx : fromIdx;
    if (downPageIdx !== null && downPageIdx !== undefined) {
      downSide.appendChild(this._createSnap(downPageIdx));
    }
    if (singlePrev || fromHasSpine) {
      const downSpine = document.createElement('div');
      downSpine.className = this.single
        ? 'fh-single-spine-left'
        : `fh-inner-spine ${side === 'right' ? 'fh-inner-spine-right' : 'fh-inner-spine-left'}`;
      downSide.appendChild(downSpine);
    }

    const lightW = this.maskSize;
    const lightH = this.maskSize * 2;
    const frontHighlight = document.createElement('div');
    frontHighlight.className = singlePrev ? 'fh-crease-lighting fh-unfurl-sheen' : 'fh-crease-lighting fh-front-sheen';
    frontHighlight.style.width = `${lightW}px`;
    frontHighlight.style.height = `${lightH}px`;
    frontHighlight.style.margin = `${-lightH / 2}px 0 0 ${-lightW}px`;
    downSide.appendChild(frontHighlight);
    downMask.appendChild(downSide);

    const downTabs = document.createElement('div');
    downTabs.className = 'fh-down-side fh-side-tabs';
    downTabs.style.width = `${this.pageW}px`;
    downTabs.style.height = `${this.pageH}px`;
    downTabs.style.top = `${this.sideTop}px`;
    downMask.appendChild(downTabs);

    if (singlePrev) {
      this.settings.onRenderSheetTabs?.({
        isHard: false,
        singlePrev: true,
        side,
        fromIdx,
        toIdx,
        downTabs,
        upTabs: null,
      });
      this.flipLayer.appendChild(castBounds);
      this.flipLayer.appendChild(downMask);
      els.push(castBounds, downMask);

      return {
        isHard: false,
        singlePrev: true,
        seq,
        underEl,
        underIdx,
        fromIdx,
        toIdx,
        fromHasSpine: true,
        toHasSpine: !!toHasSpine,
        underSpine: !!underSpine,
        upSpine: null,
        castBounds,
        castMask,
        castGradient,
        flapDropBounds: null,
        flapDropMask: null,
        flapCaster: null,
        downMask,
        downSide,
        downTabs,
        upMask: null,
        upSide: null,
        upTabs: null,
        underShadow,
        frontHighlight,
        backShade: null,
        els,
      };
    }

    // Flap drop shadow cast by floating curled flap onto underlying stack
    const flapDropBounds = document.createElement('div');
    flapDropBounds.className = 'fh-cast-bounds fh-cast-bounds-flap';
    flapDropBounds.style.zIndex = flapDropZ;

    const flapDropMask = document.createElement('div');
    flapDropMask.className = `fh-flap-drop-mask ${this.single ? 'fh-mask-single' : 'fh-mask-double'}`;
    flapDropMask.style.width = `${this.maskSize}px`;
    flapDropMask.style.height = `${this.maskSize}px`;
    flapDropMask.style.marginTop = `${-this.maskSize / 2}px`;

    const flapCaster = document.createElement('div');
    flapCaster.className = 'fh-flap-caster';
    flapCaster.style.width = `${this.pageW}px`;
    flapCaster.style.height = `${this.pageH}px`;
    flapCaster.style.top = `${this.sideTop}px`;
    flapDropMask.appendChild(flapCaster);
    flapDropBounds.appendChild(flapDropMask);

    // upMask: clips curled-over back side of the turning sheet
    const upMask = document.createElement('div');
    upMask.className = `fh-mask fh-up-mask ${this.single ? 'fh-mask-single' : 'fh-mask-double'}`;
    upMask.style.width = `${this.maskSize}px`;
    upMask.style.height = `${this.maskSize}px`;
    upMask.style.marginTop = `${-this.maskSize / 2}px`;
    upMask.style.zIndex = backZ;

    const upSide = document.createElement('div');
    upSide.className = 'fh-up-side';
    upSide.style.width = `${this.pageW}px`;
    upSide.style.height = `${this.pageH}px`;
    upSide.style.top = `${this.sideTop}px`;
    if (this.single && fromIdx !== null && fromIdx !== undefined) {
      upSide.appendChild(this._createSnap(fromIdx, true));
    } else if (toIdx !== null && toIdx !== undefined) {
      upSide.appendChild(this._createSnap(toIdx));
    }

    let upSpine = null;
    if (toHasSpine && toIdx !== null && toIdx !== undefined) {
      upSpine = document.createElement('div');
      upSpine.className = `fh-inner-spine ${side === 'right' ? 'fh-inner-spine-left' : 'fh-inner-spine-right'}`;
      upSpine.style.opacity = '0';
      upSide.appendChild(upSpine);
    }

    const backShade = document.createElement('div');
    backShade.className = 'fh-crease-lighting fh-back-sheen';
    backShade.style.width = `${lightW}px`;
    backShade.style.height = `${lightH}px`;
    backShade.style.margin = `${-lightH / 2}px 0 0 ${-lightW}px`;
    upSide.appendChild(backShade);
    upMask.appendChild(upSide);

    const upTabsWrap = document.createElement('div');
    upTabsWrap.className = `fh-mask-unclipped ${this.single ? 'fh-mask-single' : 'fh-mask-double'}`;
    upTabsWrap.style.width = `${this.maskSize}px`;
    upTabsWrap.style.height = `${this.maskSize}px`;
    upTabsWrap.style.marginTop = `${-this.maskSize / 2}px`;
    upTabsWrap.style.zIndex = backZ;

    const upTabs = document.createElement('div');
    upTabs.className = 'fh-up-side fh-side-tabs fh-side-tabs-up';
    upTabs.style.width = `${this.pageW}px`;
    upTabs.style.height = `${this.pageH}px`;
    upTabs.style.top = `${this.sideTop}px`;
    upTabsWrap.appendChild(upTabs);

    // Replace masked downTabs with an unclipped flat page-overlay sibling inside flipLayer
    // so sticky tabs on uncurled regions never bend or slice before the crease reaches them.
    downTabs.remove();
    downTabs.className = 'fh-down-tabs fh-side-tabs';
    downTabs.style.width = `${this.pageW}px`;
    downTabs.style.height = `${this.pageH}px`;
    downTabs.style.top = '0px';
    downTabs.style.left = (!this.single && side === 'right') ? '50%' : '0px';
    downTabs.style.zIndex = frontZ;

    this.settings.onRenderSheetTabs?.({
      isHard: false,
      singlePrev: false,
      side,
      fromIdx,
      toIdx,
      downTabs,
      upTabs,
    });
    for (const child of upTabs.children) child.hidden = true;

    this.flipLayer.appendChild(castBounds);
    this.flipLayer.appendChild(downMask);
    this.flipLayer.appendChild(downTabs);
    this.flipLayer.appendChild(flapDropBounds);
    this.flipLayer.appendChild(upMask);
    this.flipLayer.appendChild(upTabsWrap);
    els.push(castBounds, downMask, downTabs, flapDropBounds, upMask, upTabsWrap);

    return {
      isHard: false,
      singlePrev: false,
      seq,
      underEl,
      underIdx,
      fromIdx,
      toIdx,
      fromHasSpine: !!fromHasSpine,
      toHasSpine: !!toHasSpine,
      underSpine: !!underSpine,
      upSpine,
      castBounds,
      castMask,
      castGradient,
      flapDropBounds,
      flapDropMask,
      flapCaster,
      downMask,
      downSide,
      downTabs,
      unfurlLip: null,
      upMask,
      upSide,
      upTabsWrap,
      upTabs,
      underShadow,
      frontHighlight,
      backShade,
      els,
    };
  }

  _isHardSpreadStep(prevSpread, nextSpread, side) {
    return (
      !this.single &&
      this.settings.showCover &&
      (prevSpread === 0 ||
        nextSpread === 0 ||
        prevSpread === this.spreads.length - 1 ||
        nextSpread === this.spreads.length - 1)
    );
  }

  _getFlipIndices(prevSpread, nextSpread, side) {
    const curSlots = this._getSpreadSlots(prevSpread);
    const nextSlots = this._getSpreadSlots(nextSpread);
    const fromIdx = this.single ? curSlots.right : side === 'right' ? curSlots.right : curSlots.left;
    const toIdx = this.single ? nextSlots.right : side === 'right' ? nextSlots.left : nextSlots.right;
    const underIdx = this.single
      ? (side === 'left' ? curSlots.right : nextSlots.right)
      : side === 'right'
        ? nextSlots.right
        : nextSlots.left;
    return { fromIdx, toIdx, underIdx };
  }

  _beginInteractiveTurn(side, bookPos, mode, clientPos = null) {
    const dir = side === 'right' ? 1 : -1;
    const prevSpread = this.currentSpreadIndex;
    const nextSpread = prevSpread + dir;
    if (nextSpread < 0 || nextSpread >= this.spreads.length) return false;

    const singlePrev = this.single && side === 'left';
    const isHard = this._isHardSpreadStep(prevSpread, nextSpread, side);
    const { fromIdx, toIdx, underIdx } = this._getFlipIndices(prevSpread, nextSpread, side);

    const startX = this.single ? (side === 'right' ? this.pageW : 0) : side === 'right' ? this.pageW : -this.pageW;
    const clampedY =
      mode === 'hover'
        ? bookPos.y > this.pageH / 2
          ? this.pageH - 4
          : 4
        : clamp(bookPos.y, 4, Math.max(4, this.pageH - 4));
    const fromPoint = { x: startX, y: clampedY };

    const seq = ++this.flipSeq;
    const fromHasSpine = !this.single && (this.spreads[prevSpread]?.length === 2);
    const toHasSpine = this.single || (this.spreads[nextSpread]?.length === 2);
    const dom = this._createFlipDom({
      side,
      isHard,
      fromIdx,
      toIdx,
      underIdx,
      withUnder: true,
      seq,
      fromHasSpine,
      toHasSpine,
      singlePrev,
    });
    if (mode === 'hover') {
      dom.downMask?.classList.add('is-hover-curl');
      dom.upMask?.classList.add('is-hover-curl');
      dom.downTabs?.classList.add('is-hover-curl');
      dom.upTabsWrap?.classList.add('is-hover-curl');
      dom.hardCard?.classList.add('is-hover-curl');
    }

    if (this.single || side === 'right') this.rightSlot.style.visibility = 'hidden';
    else this.leftSlot.style.visibility = 'hidden';

    const grabStartPos = mode === 'drag' ? { x: bookPos.x, y: bookPos.y } : null;
    const stackBackedPrev = !!(singlePrev && this.settings.hasCollectedStack?.() && mode !== 'hover');
    const stackBackedNext = !!(this.single && side === 'right' && this.settings.hasCollectedStack?.() && mode !== 'hover');
    this.interactiveFlip = {
      ...dom,
      side,
      dir,
      prevSpread,
      nextSpread,
      mode,
      wasDragged: mode === 'drag',
      stackBackedPrev,
      stackBackedNext,
      grabStartPos,
      lastClientX: clientPos?.x ?? 0,
      lastClientY: clientPos?.y ?? 0,
      singleDragLifting: false,
      from: fromPoint,
      coord: { ...fromPoint },
      target: this._clampDragTarget(bookPos, fromPoint, side, grabStartPos),
    };

      this._setState(mode === 'hover' ? 'fold_corner' : 'user_fold');
    this._applyFlipFrame(this.interactiveFlip, fromPoint);
    this._emit('activeFlipsChange');
    this._ensureRaf();
    return true;
  }

  _applySinglePrevFrame(f, coord) {
    const cx = clamp(coord.x, 0, this.pageW);
    const t = clamp(cx / Math.max(1, this.pageW), 0, 1);

    if (f.stackBackedPrev && f.mode !== 'hover') {
      f.downMask.style.opacity = '0';
      f.castBounds.style.opacity = '0';
      let underOp = 0;
      if (f.mode === 'drag' || f.mode === 'fallback') {
        const liftRatio = clamp(t * 1.15, 0, 1);
        f.singleDragLifting = liftRatio > 0.02;
        underOp = clamp(Math.sin(t * Math.PI) * 0.16, 0, 0.14);
        if (f.underShadow) {
          f.underShadow.style.opacity = String(underOp);
        }
        this._emit('dragLift', {
          active: f.singleDragLifting,
          side: 'left',
          fromIdx: f.fromIdx,
          toIdx: f.toIdx,
          liftRatio,
          clientX: f.lastClientX || 0,
          clientY: f.lastClientY || 0,
        });
      } else {
        underOp = clamp(Math.sin(t * Math.PI) * 0.18, 0, 0.16);
        if (f.underShadow) {
          f.underShadow.style.opacity = String(underOp);
        }
      }
      f.frameGeom = { kind: 'singlePrevHidden', layerOpacity: 0, underShadowOpacity: underOp };
      return;
    }

    f.downMask.style.opacity = '1';
    f.castBounds.style.opacity = '1';

    let deg = 0;
    const cornerSign = f.from.y < this.pageH / 2 ? 1 : -1;
    if (f.mode === 'animate' && !f.reversed) {
      const ramp = Math.min(1, t * 4.5 + 0.35);
      deg = cornerSign * (1 - t) * 16 * ramp;
    } else if (t > 0.005) {
      const dyNorm = cornerSign > 0
        ? clamp(coord.y / Math.max(1, this.pageH * 0.55), 0.18, 1)
        : clamp((this.pageH - coord.y) / Math.max(1, this.pageH * 0.55), 0.18, 1);
      deg = cornerSign * dyNorm * 24 * (1 - t * 0.55);
    }

    const rad = (deg * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    const centerX = this.pageW / 2;
    const centerY = this.pageH / 2;

    // Anchor fold crease near the grabbed corner when t is small so corner hovers stay local,
    // blending smoothly toward vertical mid-page as the sheet sweeps across.
    const cornerLineY = f.from.y < centerY ? this.pageH * 0.12 : this.pageH * 0.88;
    const blendMid = clamp(t / 0.35, 0, 1);
    const lineY = cornerLineY + (centerY - cornerLineY) * blendMid;

    const dCenter = (centerX - cx) * cosR + (centerY - lineY) * sinR;
    const projX = centerX - dCenter * cosR;
    const projY = centerY - dCenter * sinR;
    const maskTranX = projX;
    const maskTranY = projY - centerY;
    const pageTranX = -dCenter - centerX;
    const distCenter = pageTranX + centerX;

    const fmtPx = (v) => (Math.abs(v) < 0.005 ? 0 : +v.toFixed(2));
    const fmtDeg = (v) => (Math.abs(v) < 0.0005 ? 0 : +v.toFixed(3));
    const maskTx = `translate3d(${fmtPx(maskTranX)}px, ${fmtPx(maskTranY)}px, 0px) rotate(${fmtDeg(deg)}deg)`;
    f.downMask.style.transform = maskTx;
    f.castMask.style.transform = maskTx;
    const downSideTx = `translate3d(${fmtPx(-pageTranX)}px, 0px, 0px) rotate(${fmtDeg(-deg)}deg)`;
    f.downSide.style.transform = downSideTx;
    if (f.downTabs) f.downTabs.style.transform = downSideTx;
    f.frontHighlight.style.transform = `rotate(${fmtDeg(deg)}deg) translate3d(${fmtPx(distCenter)}px, 0px, 0px)`;

    const appear = t < 0.06 ? t / 0.06 : 1;
    const settleFade = t > 0.84 ? clamp((1 - t) / 0.16, 0, 1) : 1;
    const env = clamp(appear * settleFade, 0, 1);
    const castScale = clamp(0.32 + Math.sin(t * Math.PI) * 0.72, 0.28, 1.04);
    const frontOpacity = clamp(env * 0.94, 0, 0.94);
    const castOpacity = clamp(env * 0.86, 0, 0.86);
    const underShadowOpacity = clamp(Math.sin(t * Math.PI) * 0.12, 0, 0.12);

    f.frontHighlight.style.opacity = String(frontOpacity);
    f.castGradient.style.transform = `scaleX(${castScale})`;
    f.castGradient.style.opacity = String(castOpacity);
    if (f.underShadow) {
      f.underShadow.style.opacity = String(underShadowOpacity);
    }
    f.frameGeom = {
      kind: 'singlePrev',
      layerOpacity: 1,
      deg,
      maskTranX,
      maskTranY,
      pageTranX,
      distCenter,
      castScale,
      castOpacity,
      frontOpacity,
      underShadowOpacity,
    };
  }

  _applyFlipFrame(f, coord) {
    if (!f) return;
    f.coord = coord;

    if (f.singlePrev) {
      this._applySinglePrevFrame(f, coord);
      return;
    }

    if (f.isHard) {
      const span = this.single ? this.pageW : 2 * this.pageW;
      const progress = clamp(Math.abs(coord.x - f.from.x) / span, 0, 1);
      const deg = f.side === 'right' ? -180 * progress : 180 * progress;
      f.hardCard.style.transform = `perspective(3600px) rotateY(${deg}deg)`;
      const zIdx = progress <= 0.5 ? 2000 - (f.seq || 0) * 4 : 3000 + (f.seq || 0) * 4 + 1;
      if (f.seq) {
        f.hardCard.style.zIndex = String(zIdx);
      }
      const shadeAlpha = Math.sin(progress * Math.PI) * 0.24;
      f.hardShade.style.opacity = String(shadeAlpha);
      f.frameGeom = { kind: 'hard', progress, deg, shadeAlpha, zIndex: zIdx };
      return;
    }

    const g = computeFoldGeometry(this.pageW, this.pageH, this.maskSize, f.from, coord);
    const distCenter = g.pageTranX + this.pageW / 2;

    const fmtPx = (v) => (Math.abs(v) < 0.005 ? 0 : +v.toFixed(2));
    const fmtDeg = (v) => (Math.abs(v) < 0.0005 ? 0 : +v.toFixed(3));
    const mTx = fmtPx(g.maskTranX);
    const mTy = fmtPx(g.maskTranY);
    const rDeg = fmtDeg(g.rotate);
    const pTx = fmtPx(g.pageTranX);
    const dCx = fmtPx(distCenter);

    const maskTx = `translate3d(${mTx}px, ${mTy}px, 0px) rotate(${rDeg}deg)`;
    f.downMask.style.transform = maskTx;
    f.upMask.style.transform = maskTx;
    if (f.upTabsWrap) f.upTabsWrap.style.transform = maskTx;
    f.castMask.style.transform = maskTx;
    f.flapDropMask.style.transform = maskTx;

    const downSideTx = `translate3d(${fmtPx(-g.pageTranX)}px, 0px, 0px) rotate(${fmtDeg(-g.rotate)}deg)`;
    const upSideTx = `translate3d(${pTx}px, 0px, 0px) rotate(${rDeg}deg)`;
    f.downSide.style.transform = downSideTx;
    f.upSide.style.transform = upSideTx;
    if (f.upTabs) f.upTabs.style.transform = upSideTx;
    f.flapCaster.style.transform = upSideTx;

    // Show each sticky tab flat on the uncurled departing page until the fold crease crosses
    // its outer-edge attachment point (ex, tabY), then transfer seamlessly onto the curled flap.
    const updateSplitTabVisibility = (container, wantCurled) => {
      if (!container) return;
      for (const el of container.children) {
        const topPct = Number(el.dataset.topPct);
        const tabY = Number.isFinite(topPct) ? (topPct / 100) * this.pageH : this.pageH * 0.5;
        const hasCurled = !g.isFlat && ((g.ex - g.mx) * g.vx + (tabY - g.my) * g.vy) < 0;
        el.hidden = wantCurled ? !hasCurled : hasCurled;
      }
    };
    updateSplitTabVisibility(f.downTabs, false);
    updateSplitTabVisibility(f.upTabs, true);

    // Align cylindrical curl highlight & trough strictly parallel to the diagonal fold crease
    f.frontHighlight.style.transform = `rotate(${rDeg}deg) translate3d(${dCx}px, 0px, 0px)`;
    f.backShade.style.transform = `rotate(${fmtDeg(-g.rotate)}deg) translate3d(${fmtPx(-distCenter)}px, 0px, 0px)`;

    // Dynamic curl shadow envelope (FlipHTML5 PageHighlightsFlipShadow profile)
    const rate = g.shadowRate;
    const travel = clamp(Math.abs(coord.x - f.from.x) / (2 * this.pageW), 0, 1);
    f.travel = travel;
    const travelFade = travel > 0.78 ? clamp((0.93 - travel) / 0.15, 0, 1) : 1;
    const edgeFade = (rate > 0.85 ? clamp((0.97 - rate) / 0.12, 0, 1) : rate < 0.08 ? rate / 0.08 : 1) * travelFade;
    const liftBell = (rate < 0.5 ? rate * 2 : (1 - rate) * 2) * travelFade;
    const widthScale = clamp(g.frontShadowDistance / 160, 0.18, 1.35);

    const castOpacity = clamp(edgeFade * 0.9, 0, 0.88);
    const flapOpacity = clamp(liftBell * 0.95, 0, 0.92);
    const underShadowOpacity = clamp(liftBell * 0.18, 0, 0.12);
    const frontOpacity = clamp(edgeFade * 0.92, 0, 0.88);
    const backOpacity = clamp(edgeFade * 0.95, 0, 0.92);
    const spineAppear = f.upSpine ? (travel > 0.78 ? clamp((travel - 0.78) / 0.18, 0, 1) : 0) : 0;

    f.castGradient.style.transform = `scaleX(${widthScale})`;
    f.castGradient.style.opacity = String(castOpacity);
    f.flapCaster.style.opacity = String(flapOpacity);
    if (f.underShadow) {
      f.underShadow.style.opacity = String(underShadowOpacity);
    }
    f.frontHighlight.style.opacity = String(frontOpacity);
    f.backShade.style.opacity = String(backOpacity);
    if (f.upSpine) {
      f.upSpine.style.opacity = String(spineAppear);
    }

    let layerOpacity = 1;
    if (this.single && f.side === 'right' && f.stackBackedNext) {
      if (f.mode === 'drag' || f.mode === 'fallback') {
        const liftRatio = travel <= 0.22 ? 0 : clamp((travel - 0.22) / 0.44, 0, 1);
        layerOpacity = 1 - clamp((travel - 0.24) / 0.30, 0, 1);
        f.downMask.style.opacity = String(layerOpacity);
        f.upMask.style.opacity = String(layerOpacity);
        if (f.downTabs) f.downTabs.style.opacity = String(layerOpacity);
        if (f.upTabsWrap) f.upTabsWrap.style.opacity = String(layerOpacity);
        f.castBounds.style.opacity = String(layerOpacity);
        f.flapDropBounds.style.opacity = String(layerOpacity);
        f.singleDragLifting = liftRatio > 0.01;
        this._emit('dragLift', {
          active: f.singleDragLifting,
          fromIdx: f.fromIdx,
          toIdx: f.toIdx,
          liftRatio,
          clientX: f.lastClientX || 0,
          clientY: f.lastClientY || 0,
        });
      } else if (f.mode === 'animate') {
        if (!f.reversed && travel >= 0.34 && !f.singleNextLiftFired) {
          f.singleNextLiftFired = true;
          this._emit('nextLiftStart', { fromIdx: f.fromIdx, toIdx: f.toIdx });
        }
        layerOpacity = f.reversed ? 1 : 1 - clamp((travel - 0.34) / 0.08, 0, 1);
        f.downMask.style.opacity = String(layerOpacity);
        f.upMask.style.opacity = String(layerOpacity);
        if (f.downTabs) f.downTabs.style.opacity = String(layerOpacity);
        if (f.upTabsWrap) f.upTabsWrap.style.opacity = String(layerOpacity);
        f.castBounds.style.opacity = String(layerOpacity);
        f.flapDropBounds.style.opacity = String(layerOpacity);
      }
    } else if (this.single && f.side === 'right') {
      f.downMask.style.opacity = '1';
      f.upMask.style.opacity = '1';
      if (f.downTabs) f.downTabs.style.opacity = '1';
      if (f.upTabsWrap) f.upTabsWrap.style.opacity = '1';
      f.castBounds.style.opacity = '1';
      f.flapDropBounds.style.opacity = '1';
      if (f.singleDragLifting) {
        f.singleDragLifting = false;
        this._emit('dragLift', { active: false });
      }
    }

    f.frameGeom = {
      kind: 'fold',
      deg: g.rotate,
      maskTranX: g.maskTranX,
      maskTranY: g.maskTranY,
      pageTranX: g.pageTranX,
      distCenter,
      widthScale,
      castOpacity,
      flapOpacity,
      underShadowOpacity,
      frontOpacity,
      backOpacity,
      spineAppear,
      layerOpacity,
    };
  }

  _finishTurnAnimated() {
    const f = this.interactiveFlip;
    if (!f) return;
    this.interactiveFlip = null;

    // Promote interactive curl to flying queue so rapid follow-ups cascade smoothly instead of snapping back
    if (f.underEl) {
      f.underEl.remove();
      f.els = f.els.filter((el) => el !== f.underEl);
      f.underEl = null;
    }

    const fromPage = this.currentPageIndex;
    const fromDragLift = !!(this.single && f.singleDragLifting);
    this.currentSpreadIndex = f.nextSpread;
    this.currentPageIndex = (this.spreads[f.nextSpread] || [0])[0];

    const targetSlot = this.single || f.side === 'right' ? this.rightSlot : this.leftSlot;
    this._setSlotPage(targetSlot, f.singlePrev ? f.fromIdx : f.underIdx);

    const targetX = f.side === 'right' ? -this.pageW : this.pageW;
    const denomW = f.singlePrev ? this.pageW : 2 * this.pageW;
    const remainingRatio = clamp(Math.abs(targetX - f.coord.x) / Math.max(1, denomW), 0.2, 1);
    const dur = f.stackBackedPrev
      ? (fromDragLift ? 270 : 415)
      : Math.max(170, this.settings.flippingTime * remainingRatio);

    f.mode = 'animate';
    f.animStartX = f.coord.x;
    f.animStartY = f.coord.y;
    f.animToX = targetX;
    f.animToY = f.from.y;
    f.progress = 0;
    f.delayMs = 0;
    f.elapsedMs = 0;
    f.rate = 1 / dur;
    f.baseRate = f.rate;
    f.arcMode = f.singlePrev;
    f.reversed = false;
    f.singleDragLifting = false;

    this.flyingFlips.push(f);
    this._emit('flipStart', { from: fromPage, page: this.currentPageIndex, side: f.side, fromDragLift });
    this._emit('activeFlipsChange');
    this._setState('flipping');
    this._ensureRaf();
  }

  _ensureRaf() {
    if (this.rafId === null) {
      this._lastLoopTime = performance.now();
      this.rafId = requestAnimationFrame(this._tick);
    }
  }

  _stopRaf() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this._lastLoopTime = null;
  }

  _beginFallback(f, fromDrag = false) {
    if (!f) return;
    const dx = f.from.x - f.coord.x;
    const dy = f.from.y - f.coord.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.25) {
      this._cancelInteractiveFlipImmediate();
      return;
    }
    const span = f.singlePrev ? this.pageW : this.pageW * 2;
    const pullFrac = clamp(dist / Math.max(1, span), 0, 1);
    f.mode = 'fallback';
    f.fromDragFallback = Boolean(fromDrag);
    f.target = { ...f.from };
    f.fallbackStartX = f.coord.x;
    f.fallbackStartY = f.coord.y;
    f.fallbackDur = fromDrag
      ? Math.round(clamp(165 + pullFrac * 145, 165, 290))
      : Math.round(clamp(135 + pullFrac * 110, 135, 220));
    f.fallbackElapsed = 0;
    this._ensureRaf();
  }

  refreshPendingSnapshots() {
    this._refreshPendingSnapshots();
  }

  refreshSnapshots() {
    if (!this.flipLayer) return;
    const isDark = Boolean(this.settings.isDarkMode?.());
    const wraps = this.flipLayer.querySelectorAll('.fh-snap[data-page-idx]');
    for (const wrap of wraps) {
      const idx = Number(wrap.dataset.pageIdx);
      if (!Number.isFinite(idx) || !this.pageNodes[idx]) continue;
      populateSnapshotWrap(wrap, this.pageNodes[idx], wrap.classList.contains('fh-snap-reverse'), isDark, this.pageW, this.pageH);
    }
    this._emit('frame');
  }

  _refreshPendingSnapshots() {
    if (!this.flipLayer) return;
    const pending = this.flipLayer.querySelectorAll('.fh-snap[data-pending-page-idx]');
    if (!pending.length) return;
    const isDark = Boolean(this.settings.isDarkMode?.());
    let resolvedAny = false;
    for (const wrap of pending) {
      const idx = Number(wrap.dataset.pendingPageIdx);
      const node = Number.isFinite(idx) ? this.pageNodes[idx] : null;
      const srcCanvas = node?.querySelector('canvas.fb-canvas');
      if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
        populateSnapshotWrap(wrap, node, wrap.classList.contains('fh-snap-reverse'), isDark, this.pageW, this.pageH);
        resolvedAny = true;
      }
    }
    if (resolvedAny) {
      this._emit('frame');
    }
  }

  _removeFlipDom(f) {
    if (!f?.els) return;
    for (const el of f.els) {
      releaseCanvasesIn(el);
      el.remove();
    }
  }

  _loop(now) {
    this.rafId = null;
    const dt = this._lastLoopTime !== null ? clamp(now - this._lastLoopTime, 1, 48) : 16.67;
    this._lastLoopTime = now;
    let didAnimateFrame = false;

    if (this.flyingFlips.length || this.interactiveFlip) {
      this._refreshPendingSnapshots();
    }

    // Step all concurrent cascading animated flips independently (continuous dt integration)
    if (this.flyingFlips.length) {
      didAnimateFrame = true;
      const finished = [];
      for (const f of this.flyingFlips) {
        f.elapsedMs += dt;
        let activeDt = dt;
        if (f.delayMs > 0) {
          const used = Math.min(f.delayMs, dt);
          f.delayMs -= used;
          activeDt = dt - used;
        }
        if (activeDt > 0) {
          f.progress = Math.min(1, f.progress + activeDt * f.rate);
        }

        const ease = f.arcMode ? easeInOutSine(f.progress) : easeOutSine(f.progress);
        const nx = f.animStartX + (f.animToX - f.animStartX) * ease;
        let ny = f.animStartY + (f.animToY - f.animStartY) * ease;

        if (f.arcMode && !f.isHard && !f.reversed) {
          const arc = f.singlePrev
            ? Math.sin(ease * Math.PI) * 0.055 * this.pageW
            : 0.05 * Math.sqrt(Math.max(0, this.pageW * this.pageW - nx * nx));
          ny = f.from.y === 0 ? arc : this.pageH - arc;
        }

        const coord = f.delayMs > 0 ? f.from : { x: nx, y: ny };
        this._applyFlipFrame(f, coord);
        if (f.progress >= 1) finished.push(f);
      }

      if (finished.length) {
        for (const f of finished) {
          this._removeFlipDom(f);
        }
        const doneSet = new Set(finished);
        this.flyingFlips = this.flyingFlips.filter((f) => !doneSet.has(f));

        if (this.flyingFlips.length === 0) {
          this._renderStaticSpread();
          if (!this.interactiveFlip) {
            this._setState('read');
          }
          this._emit('activeFlipsChange');
          this._emit('flip', this.currentPageIndex);
        } else {
          // Update the trailing slot to the page just landed underneath remaining flying sheets
          const lastDone = finished[finished.length - 1];
          const slots = this._getSpreadSlots(lastDone.nextSpread);
          if (!this.single) {
            if (lastDone.dir === 1) this._setSlotPage(this.leftSlot, slots.left);
            else this._setSlotPage(this.rightSlot, slots.right);
          } else if (lastDone.singlePrev) {
            this._setSlotPage(this.rightSlot, slots.right);
          }
          this._emit('activeFlipsChange');
        }
      }
    }

    // Step interactive drag/hover follow (dt-normalized) & timed ease-out fallback return
    let keepInteractive = false;
    const activeI = this.interactiveFlip;
    if (activeI) {
      didAnimateFrame = true;
      if (activeI.mode === 'fallback') {
        activeI.fallbackElapsed = (activeI.fallbackElapsed || 0) + dt;
        const dur = Math.max(1, activeI.fallbackDur || 200);
        const t = clamp(activeI.fallbackElapsed / dur, 0, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const sx = activeI.fallbackStartX ?? activeI.coord.x;
        const sy = activeI.fallbackStartY ?? activeI.coord.y;
        const nx = sx + (activeI.from.x - sx) * ease;
        const ny = sy + (activeI.from.y - sy) * ease;
        if (t >= 1 || Math.hypot(activeI.from.x - nx, activeI.from.y - ny) < 0.25) {
          this._cancelInteractiveFlipImmediate();
        } else {
          this._applyFlipFrame(activeI, { x: nx, y: ny });
          keepInteractive = true;
        }
      } else {
        const followLerp = 1 - Math.pow(1 - 0.24, dt / 16.67);
        const dx = activeI.target.x - activeI.coord.x;
        const dy = activeI.target.y - activeI.coord.y;
        const nx = activeI.coord.x + dx * followLerp;
        const ny = activeI.coord.y + dy * followLerp;
        this._applyFlipFrame(activeI, { x: nx, y: ny });
        keepInteractive = Math.hypot(dx, dy) >= 0.15;
      }
    }

    this._updateLandingSpineBlend();
    if (didAnimateFrame) {
      this._emit('frame');
    }

    if (this.flyingFlips.length > 0 || keepInteractive) {
      this._ensureRaf();
    } else {
      this._lastLoopTime = null;
    }
  }

  _updateLandingSpineBlend() {
    // Spine seam for turning sheets now travels inside upSide (f.upSpine) on the page's real
    // inner binding edge, so we never overlay a static spine stripe above .fh-flip-layer.
    if (this._lastSpineBlend !== 0) {
      this._lastSpineBlend = 0;
      this._emit('spineBlend', 0);
    }
  }

  _settleAllFlyingFlips() {
    if (!this.flyingFlips.length) return;
    for (const f of this.flyingFlips) {
      this._removeFlipDom(f);
    }
    this.flyingFlips = [];
    this._renderStaticSpread();
    this._updateLandingSpineBlend();
    if (!this.interactiveFlip) {
      this._setState('read');
    }
    this._emit('activeFlipsChange');
    this._emit('flip', this.currentPageIndex);
  }

  _cancelInteractiveFlipImmediate() {
    if (!this.interactiveFlip) return;
    if (this.interactiveFlip.singleDragLifting) {
      this._emit('dragLift', { active: false });
    }
    this._removeFlipDom(this.interactiveFlip);
    this.interactiveFlip = null;
    if (!this.isPointerDown) {
      this._schedulePointerMovedReset();
    }
    this._updateLandingSpineBlend();
    if (!this.flyingFlips.length) {
      this._renderStaticSpread();
      this._setState('read');
    }
    this._emit('activeFlipsChange');
  }

  _cancelAllFlipsImmediate() {
    this._stopRaf();
    this._releaseActivePointer();
    this._schedulePointerMovedReset();
    this._emit('dragLift', { active: false });
    releaseCanvasesIn(this.flipLayer);
    this.flipLayer.innerHTML = '';
    this.interactiveFlip = null;
    this.flyingFlips = [];
    this._renderStaticSpread();
    this._updateLandingSpineBlend();
    this._setState('read');
    this._emit('activeFlipsChange');
  }

  /* ---------- Public Navigation API ---------- */
  turnToPage(pageIdx) {
    this._cancelAllFlipsImmediate();
    const targetSpread = this._findSpreadByPage(clamp(pageIdx, 0, Math.max(0, this.pageNodes.length - 1)));
    this.currentSpreadIndex = targetSpread;
    this._renderStaticSpread();
    this._emit('flip', this.currentPageIndex);
  }

  turnToNextPage() {
    this._settleAllFlyingFlips();
    if (this.currentSpreadIndex < this.spreads.length - 1) {
      this._cancelInteractiveFlipImmediate();
      const fromPage = this.currentPageIndex;
      this.currentSpreadIndex++;
      this._renderStaticSpread();
      this._emit('flipStart', { from: fromPage, page: this.currentPageIndex, side: 'right' });
      this._emit('flip', this.currentPageIndex);
    }
  }

  turnToPrevPage() {
    this._settleAllFlyingFlips();
    if (this.currentSpreadIndex > 0) {
      this._cancelInteractiveFlipImmediate();
      const fromPage = this.currentPageIndex;
      this.currentSpreadIndex--;
      this._renderStaticSpread();
      this._emit('flipStart', { from: fromPage, page: this.currentPageIndex, side: 'left' });
      this._emit('flip', this.currentPageIndex);
    }
  }

  _startSerialFlip(dir, corner = 'bottom') {
    const side = dir === 1 ? 'right' : 'left';
    this._cancelInteractiveFlipImmediate();

    // Smoothly reverse a single opposite mid-flight sheet instead of snapping back
    if (this.flyingFlips.some((f) => f.dir !== dir || f.reversed)) {
      if (this.flyingFlips.length === 1 && !this.flyingFlips[0].reversed && this.flyingFlips[0].progress < 0.72) {
        const rev = this.flyingFlips[0];
        const fromPage = this.currentPageIndex;
        const targetSpread = rev.prevSpread;
        rev.reversed = true;
        rev.dir = dir;
        rev.prevSpread = this.currentSpreadIndex;
        rev.nextSpread = targetSpread;
        rev.animStartX = rev.coord.x;
        rev.animStartY = rev.coord.y;
        rev.animToX = rev.from.x;
        rev.animToY = rev.from.y;
        rev.arcMode = false;
        rev.delayMs = 0;
        rev.progress = 0;
        const revSpan = rev.singlePrev ? this.pageW : 2 * this.pageW;
        const backFrac = clamp(Math.abs(rev.animToX - rev.coord.x) / Math.max(1, revSpan), 0.18, 1);
        const dur = Math.max(150, this.settings.flippingTime * backFrac);
        rev.rate = 1 / dur;
        rev.baseRate = rev.rate;
        this.currentSpreadIndex = targetSpread;
        this.currentPageIndex = (this.spreads[targetSpread] || [0])[0];
        this._emit('flipStart', { from: fromPage, page: this.currentPageIndex, side, reversed: true });
        this._setState('flipping');
        this._ensureRaf();
        return;
      }
      this._settleAllFlyingFlips();
    }

    const prevSpread = this.currentSpreadIndex;
    const nextSpread = prevSpread + dir;
    if (nextSpread < 0 || nextSpread >= this.spreads.length) return;

    // Bound simultaneous active DOM flip sheets cleanly while advancing at full speed;
    // when zoomed (wide pageW or interactionDisabled), cap at 2 to prevent stacked GPU clip-path layers
    const maxConcurrentFlips = (this.pageW > 850 || this.interactionDisabled) ? 2 : 6;
    while (this.flyingFlips.length >= maxConcurrentFlips) {
      const oldest = this.flyingFlips.shift();
      this._removeFlipDom(oldest);
      const landedSlots = this._getSpreadSlots(oldest.nextSpread);
      if (!this.single) {
        if (oldest.dir === 1) this._setSlotPage(this.leftSlot, landedSlots.left);
        else this._setSlotPage(this.rightSlot, landedSlots.right);
      } else if (oldest.singlePrev) {
        this._setSlotPage(this.rightSlot, landedSlots.right);
      }
    }

    let delayMs = 0;
    const isCascading = this.flyingFlips.length > 0;
    if (isCascading) {
      const newest = this.flyingFlips[this.flyingFlips.length - 1];
      const minGap = 68;
      delayMs = newest.delayMs > 0 ? newest.delayMs + minGap : Math.max(0, minGap - newest.elapsedMs);
      for (const old of this.flyingFlips) {
        old.rate = Math.max(old.rate, (old.baseRate || old.rate) * 1.38);
      }
    }

    const fromPage = this.currentPageIndex;
    this.currentSpreadIndex = nextSpread;
    this.currentPageIndex = (this.spreads[nextSpread] || [0])[0];

    const singlePrev = this.single && dir === -1;
    const stackBackedPrev = !!(singlePrev && this.settings.hasCollectedStack?.());
    const stackBackedNext = !!(this.single && dir === 1 && this.settings.hasCollectedStack?.());
    const cornerY = corner === 'top' ? 0 : this.pageH;
    const startX = this.single ? (side === 'right' ? this.pageW : 0) : side === 'right' ? this.pageW : -this.pageW;
    const targetX = side === 'right' ? -this.pageW : this.pageW;
    const fromPoint = { x: startX, y: cornerY };
    const initCoord = {
      x: startX + (side === 'right' ? -2 : 2),
      y: corner === 'top' ? 2 : this.pageH - 2,
    };

    const isHard = this._isHardSpreadStep(prevSpread, nextSpread, side);
    const { fromIdx, toIdx, underIdx } = this._getFlipIndices(prevSpread, nextSpread, side);
    const prevSlots = this._getSpreadSlots(prevSpread);
    const nextSlots = this._getSpreadSlots(nextSpread);

    // Keep trailing slot on the first departing spread until oldest leaf lands; reveal leading slot immediately
    if (!this.single) {
      if (!isCascading) {
        if (dir === 1) this._setSlotPage(this.leftSlot, prevSlots.left);
        else this._setSlotPage(this.rightSlot, prevSlots.right);
      }
      if (dir === 1) this._setSlotPage(this.rightSlot, nextSlots.right);
      else this._setSlotPage(this.leftSlot, nextSlots.left);
    } else if (singlePrev) {
      if (!isCascading) {
        this._setSlotPage(this.rightSlot, prevSlots.right);
      }
    } else {
      this._setSlotPage(this.rightSlot, nextSlots.right);
    }

    const seq = ++this.flipSeq;
    const fromHasSpine = !this.single && (this.spreads[prevSpread]?.length === 2);
    const toHasSpine = this.single || (this.spreads[nextSpread]?.length === 2);
    const dom = this._createFlipDom({
      side,
      isHard,
      fromIdx,
      toIdx,
      underIdx,
      withUnder: false,
      seq,
      fromHasSpine,
      toHasSpine,
      singlePrev,
    });

    const baseDuration = stackBackedPrev
      ? (isCascading ? 320 : 415)
      : (isCascading ? Math.max(200, this.settings.flippingTime * 0.85) : this.settings.flippingTime);
    const baseRate = 1 / baseDuration;

    const flipObj = {
      ...dom,
      side,
      dir,
      prevSpread,
      nextSpread,
      stackBackedPrev,
      stackBackedNext,
      mode: 'animate',
      from: fromPoint,
      coord: delayMs > 0 ? { ...fromPoint } : { ...initCoord },
      animStartX: initCoord.x,
      animStartY: initCoord.y,
      animToX: targetX,
      animToY: cornerY,
      progress: 0,
      delayMs,
      elapsedMs: 0,
      rate: baseRate,
      baseRate,
      arcMode: !isHard,
      reversed: false,
    };

    this.flyingFlips.push(flipObj);
    this._applyFlipFrame(flipObj, delayMs > 0 ? fromPoint : initCoord);
    this._emit('flipStart', { from: fromPage, page: this.currentPageIndex, side });
    this._emit('activeFlipsChange');
    this._setState('flipping');
    this._ensureRaf();
  }

  flipNext(corner = 'bottom') {
    this._startSerialFlip(1, corner);
  }

  flipPrev(corner = 'bottom') {
    this._startSerialFlip(-1, corner);
  }

  flipPrevFromStackDrag(dur = 275) {
    if (!this.single) {
      this.flipPrev('bottom');
      return;
    }
    this._cancelInteractiveFlipImmediate();
    if (this.flyingFlips.length) this._settleAllFlyingFlips();
    const prevSpread = this.currentSpreadIndex;
    const nextSpread = prevSpread - 1;
    if (nextSpread < 0) return;

    const fromPage = this.currentPageIndex;
    this.currentSpreadIndex = nextSpread;
    this.currentPageIndex = (this.spreads[nextSpread] || [0])[0];
    const prevSlots = this._getSpreadSlots(prevSpread);
    this._setSlotPage(this.rightSlot, prevSlots.right);

    const dom = this._createFlipDom({
      side: 'left',
      isHard: false,
      fromIdx: prevSlots.right,
      toIdx: this.currentPageIndex,
      underIdx: prevSlots.right,
      withUnder: false,
      seq: ++this.flipSeq,
      fromHasSpine: false,
      toHasSpine: true,
      singlePrev: true,
    });
    const safeDur = Math.max(120, dur);
    const flipObj = {
      ...dom,
      side: 'left',
      dir: -1,
      prevSpread,
      nextSpread,
      stackBackedPrev: true,
      mode: 'animate',
      from: { x: 0, y: this.pageH },
      coord: { x: 0, y: this.pageH },
      animStartX: 0,
      animStartY: this.pageH,
      animToX: this.pageW,
      animToY: this.pageH,
      progress: 0,
      delayMs: 0,
      elapsedMs: 0,
      rate: 1 / safeDur,
      baseRate: 1 / safeDur,
      arcMode: false,
      reversed: false,
    };
    this.flyingFlips.push(flipObj);
    this._applyFlipFrame(flipObj, flipObj.coord);
    this._emit('flipStart', { from: fromPage, page: this.currentPageIndex, side: 'left', fromDragLift: true });
    this._emit('activeFlipsChange');
    this._setState('flipping');
    this._ensureRaf();
  }

  flip(pageIdx, corner = 'bottom') {
    const targetSpread = this._findSpreadByPage(clamp(pageIdx, 0, Math.max(0, this.pageNodes.length - 1)));
    if (targetSpread === this.currentSpreadIndex) return;
    this._settleAllFlyingFlips();
    if (targetSpread > this.currentSpreadIndex) {
      this.currentSpreadIndex = targetSpread - 1;
      this.flipNext(corner);
    } else {
      this.currentSpreadIndex = targetSpread + 1;
      this.flipPrev(corner);
    }
  }
}
