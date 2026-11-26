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
 * Exact FlipHTML5 fold geometry solver.
 * Coordinates are spine-centered: x in [-pageW, +pageW], y in [0, pageH].
 * fromPoint (ex, ey) is the grabbed point on the outer edge (ex = +pageW or -pageW).
 * curPoint (fx, fy) is the live interpolated pointer/curl position.
 */
function computeFoldGeometry(pageW, pageH, maskSize, fromPoint, curPoint) {
  if (!fromPoint || !curPoint) {
    return { rotate: 0, pageTranX: 0, maskTranX: 0, maskTranY: 0, frontShadowDistance: 0, shadowRate: 0 };
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
    };
  }

  // Spine binding constraint 1: bottom spine corner (0, pageH)
  const rBot = Math.hypot(ex, ey - pageH);
  if (Math.hypot(fx, fy - pageH) > rBot) {
    const a = Math.atan((fy - pageH) / (fx === 0 ? 1e-6 : fx));
    const k = Math.abs(Math.cos(a) * rBot);
    fy = pageH - Math.abs(Math.sin(a) * rBot);
    fx = fx > 0 ? k : -k;
  }

  // Spine binding constraint 2: top spine corner (0, 0)
  const rTop = Math.hypot(ex, ey);
  if (Math.hypot(fx, fy) > rTop) {
    const a = Math.atan(fy / (fx === 0 ? 1e-6 : fx));
    const k = Math.abs(Math.cos(a) * rTop);
    fy = Math.abs(Math.sin(a) * rTop);
    fx = fx > 0 ? k : -k;
  }

  if (Math.abs(fx - ex) < 0.25) {
    return {
      rotate: ex < 0 ? 180 : 0,
      pageTranX: 0,
      maskTranX: ex,
      maskTranY: 0,
      frontShadowDistance: 0,
      shadowRate: 0,
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
  };
}

function cloneCanvasSnapshot(pageNode, pageW, pageH) {
  const wrap = document.createElement('div');
  wrap.className = 'fh-snap';
  const srcCanvas = pageNode?.querySelector('canvas.fb-canvas');
  if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
    const snap = document.createElement('canvas');
    snap.className = 'fh-snap-canvas';
    snap.width = srcCanvas.width;
    snap.height = srcCanvas.height;
    const ctx = snap.getContext('2d', { alpha: false });
    ctx.drawImage(srcCanvas, 0, 0);
    wrap.appendChild(snap);
    const userHl = pageNode.querySelector('.fb-user-highlights');
    if (userHl && userHl.children.length > 0) {
      wrap.appendChild(userHl.cloneNode(true));
    }
  } else {
    const ph = document.createElement('div');
    ph.className = 'fb-page-num-placeholder';
    const rawIdx = pageNode ? Number(pageNode.dataset.pageIndex) : NaN;
    const num = Number.isFinite(rawIdx) ? rawIdx + 1 : '';
    ph.textContent = String(num);
    wrap.appendChild(ph);
    if (Number.isFinite(rawIdx)) {
      wrap.dataset.pendingPageIdx = String(rawIdx);
    }
  }
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
    this.pointerMoved = false;
    this.pointerDownPos = null;
    this.lastMovePos = null;
    this.moveVelX = 0;
    this.interactionDisabled = false;

    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);
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
    this.interactiveFlip = null;
    this.flyingFlips = [];
    this.host.innerHTML = '';
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
    slotEl.innerHTML = '';
    if (pageIdx !== null && pageIdx !== undefined && this.pageNodes[pageIdx]) {
      const node = this.pageNodes[pageIdx];
      node.style.cssText = 'display:block;position:relative;width:100%;height:100%;';
      slotEl.appendChild(node);
      slotEl.style.visibility = 'visible';
    } else {
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
    this.stage.addEventListener('mousedown', this._onMouseDown);
    this.stage.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd);
  }

  _detachEvents() {
    if (this.stage) {
      this.stage.removeEventListener('mousedown', this._onMouseDown);
      this.stage.removeEventListener('touchstart', this._onTouchStart);
    }
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
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

  isPointInFlipZone(clientX, clientY) {
    const bp = this._clientToBook(clientX, clientY);
    return !!this._hitEdgeSide(bp);
  }

  _hitEdgeSide(bp) {
    const totalW = this.single ? this.pageW : this.pageW * 2;
    if (bp.y <= 0 || bp.y >= this.pageH) return null;
    const edgeBand = Math.min(this.pageW * 0.24, Math.max(76, this.pageW * 0.16));

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
    const absX = this.single ? Math.max(0, sp.x) : Math.abs(sp.x);
    if (absX > w - 1 || absX < 0.84 * w) return null;
    if (bp.y > 0.16 * h && bp.y < 0.84 * h) return null;

    const maxY = Math.sqrt(Math.max(0, Math.pow(0.16 * h, 2) - Math.pow(((w - absX) * h) / w, 2)));
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

  _handleMouseDown(e) {
    if (this.interactionDisabled) return;
    if (e.button !== 0) return;
    if (['A', 'BUTTON', 'INPUT'].includes(e.target?.tagName)) return;
    const bp = this._clientToBook(e.clientX, e.clientY);
    const side = this._hitEdgeSide(bp);
    if (this.settings.disableFlipByClick && !side) return;
    if (bp.y < 0 || bp.y > this.pageH || bp.x < 0 || bp.x > (this.single ? this.pageW : this.pageW * 2)) return;

    e.preventDefault();
    this.isPointerDown = true;
    this.pointerMoved = false;
    this.pointerDownPos = bp;
    this.lastMovePos = bp;
    this.moveVelX = 0;

    const chosenSide = side || (this.single ? (bp.x < this.pageW / 2 ? 'left' : 'right') : bp.x < this.pageW ? 'left' : 'right');
    if (this.flyingFlips.length) {
      this._settleAllFlyingFlips();
    }
    if (this.interactiveFlip && this.interactiveFlip.side === chosenSide) {
      // Grabbed already-curled hover/fallback corner seamlessly -> anchor to actual cursor point
      this.interactiveFlip.mode = 'drag';
      this.interactiveFlip.from.y = clamp(bp.y + (bp.y > this.pageH / 2 ? 6 : -6), 6, this.pageH - 6);
      this.interactiveFlip.target = this._bookToSpine(bp);
      this._setState('user_fold');
    } else {
      if (this.interactiveFlip) this._cancelInteractiveFlipImmediate();
      this._beginInteractiveTurn(chosenSide, bp, 'drag');
    }
  }

  _handleMouseMove(e) {
    if (this.interactionDisabled && !this.isPointerDown) return;
    const bp = this._clientToBook(e.clientX, e.clientY);

    if (this.isPointerDown && this.interactiveFlip && this.interactiveFlip.mode === 'drag') {
      const dx = bp.x - this.pointerDownPos.x;
      const dy = bp.y - this.pointerDownPos.y;
      if (Math.hypot(dx, dy) > 5) this.pointerMoved = true;

      if (this.lastMovePos) {
        this.moveVelX = bp.x - this.lastMovePos.x;
      }
      this.lastMovePos = bp;
      this.interactiveFlip.target = this._bookToSpine(bp);
      this._ensureRaf();
      return;
    }

    // Hover corner-tip curl only (FlipHTML5 aroundCorner behavior)
    if (!this.settings.showPageCorners || this.isPointerDown) return;
    if (this.flyingFlips.length > 0) return;

    const side = this._hitHoverCorner(bp);
    if (side) {
      const w = this.pageW;
      const h = this.pageH;
      const isBottom = bp.y > h / 2;
      const peekX = side === 'right' ? w - 24 : -w + 24;
      const peekY = isBottom ? h - 22 : 22;

      if (!this.interactiveFlip) {
        this._beginInteractiveTurn(side, bp, 'hover');
        if (this.interactiveFlip) this.interactiveFlip.target = { x: peekX, y: peekY };
      } else if (this.interactiveFlip.mode === 'hover' || this.interactiveFlip.mode === 'fallback') {
        if (this.interactiveFlip.side !== side) {
          this._cancelInteractiveFlipImmediate();
          this._beginInteractiveTurn(side, bp, 'hover');
          if (this.interactiveFlip) this.interactiveFlip.target = { x: peekX, y: peekY };
        } else {
          this.interactiveFlip.mode = 'hover';
          this.interactiveFlip.target = { x: peekX, y: peekY };
          this._ensureRaf();
        }
      }
    } else if (this.interactiveFlip && this.interactiveFlip.mode === 'hover') {
      // Smoothly spring back to flat when cursor leaves the corner tip
      this.interactiveFlip.mode = 'fallback';
      this.interactiveFlip.target = { ...this.interactiveFlip.from };
      this._ensureRaf();
    }
  }

  _handleMouseUp(e) {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    const bp = this._clientToBook(e.clientX, e.clientY);

    if (!this.interactiveFlip) return;

    if (!this.pointerMoved) {
      // Simple click on edge -> trigger full animated page turn!
      this._finishTurnAnimated();
      return;
    }

    const sp = this._bookToSpine(bp);
    const dir = this.interactiveFlip.side === 'right' ? 1 : -1; // +1 forward, -1 back
    const midX = this.single ? this.pageW / 2 : 0;
    const crossedCenter = dir === 1 ? sp.x < midX : sp.x > midX;
    const flicked = dir === 1 ? this.moveVelX < -4 && sp.x < this.pageW * 0.72 : this.moveVelX > 4 && sp.x > (this.single ? this.pageW * 0.25 : -this.pageW * 0.65);

    if (crossedCenter || flicked) {
      this._finishTurnAnimated();
    } else {
      // Release early -> smoothly spring back!
      this.interactiveFlip.mode = 'fallback';
      this.interactiveFlip.target = { ...this.interactiveFlip.from };
      this._ensureRaf();
    }
  }

  _handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    this._handleMouseDown({ button: 0, clientX: t.clientX, clientY: t.clientY, target: e.target, preventDefault() {} });
  }

  _handleTouchMove(e) {
    if (!this.isPointerDown || e.touches.length !== 1) return;
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    this._handleMouseMove({ clientX: t.clientX, clientY: t.clientY });
  }

  _handleTouchEnd(e) {
    if (!this.isPointerDown) return;
    const t = e.changedTouches[0];
    this._handleMouseUp({ clientX: t.clientX, clientY: t.clientY });
  }

  /* ---------- Interactive Flip Construction & rAF Spring Loop ---------- */
  _createFlipDom({ side, isHard, fromIdx, toIdx, underIdx, withUnder, seq }) {
    const els = [];
    let underEl = null;

    if (withUnder) {
      underEl = document.createElement('div');
      underEl.className = `fh-under ${this.single ? 'fh-under-single' : side === 'right' ? 'fh-under-right' : 'fh-under-left'}`;
      underEl.style.width = `${this.pageW}px`;
      underEl.style.height = `${this.pageH}px`;
      if (underIdx !== null && underIdx !== undefined) {
        underEl.appendChild(cloneCanvasSnapshot(this.pageNodes[underIdx], this.pageW, this.pageH));
      } else {
        underEl.style.display = 'none';
      }
      this.flipLayer.appendChild(underEl);
      els.push(underEl);
    }

    const frontZ = String(2000 - seq * 4);
    const castZ = String(2000 - seq * 4 - 1);
    const flapDropZ = String(3000 + seq * 4);
    const backZ = String(3000 + seq * 4 + 1);

    if (isHard) {
      const hardCard = document.createElement('div');
      hardCard.className = `fh-hard-card ${this.single ? 'fh-hard-left' : side === 'right' ? 'fh-hard-right' : 'fh-hard-left'}`;
      if (this.single && side === 'left') {
        hardCard.style.left = '0';
        hardCard.style.transformOrigin = '0% 50%';
      }
      hardCard.style.width = `${this.pageW}px`;
      hardCard.style.height = `${this.pageH}px`;
      hardCard.style.zIndex = frontZ;

      const hardFront = document.createElement('div');
      hardFront.className = 'fh-hard-face fh-hard-front';
      if (fromIdx !== null && fromIdx !== undefined) {
        hardFront.appendChild(cloneCanvasSnapshot(this.pageNodes[fromIdx], this.pageW, this.pageH));
      }

      const hardBack = document.createElement('div');
      hardBack.className = 'fh-hard-face fh-hard-back';
      if (toIdx !== null && toIdx !== undefined) {
        hardBack.appendChild(cloneCanvasSnapshot(this.pageNodes[toIdx], this.pageW, this.pageH));
      }

      const hardShade = document.createElement('div');
      hardShade.className = 'fh-hard-shade';

      hardCard.appendChild(hardFront);
      hardCard.appendChild(hardBack);
      hardCard.appendChild(hardShade);
      this.flipLayer.appendChild(hardCard);
      els.push(hardCard);

      return { isHard: true, seq, underEl, underIdx, hardCard, hardShade, els };
    }

    let underShadow = null;
    let underSpine = null;
    if (underEl) {
      if (!this.single && underIdx !== null && underIdx !== undefined) {
        underSpine = document.createElement('div');
        underSpine.className = `fh-inner-spine ${side === 'right' ? 'fh-inner-spine-right' : 'fh-inner-spine-left'}`;
        underEl.appendChild(underSpine);
      }
      underShadow = document.createElement('div');
      underShadow.className = 'fh-under-shadow';
      underEl.appendChild(underShadow);
    }

    // Cast shadow falling from the fold crease onto the revealed underlying page
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

    // downMask: clips turning page front side
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
    if (fromIdx !== null && fromIdx !== undefined) {
      downSide.appendChild(cloneCanvasSnapshot(this.pageNodes[fromIdx], this.pageW, this.pageH));
    }
    if (!this.single) {
      const downSpine = document.createElement('div');
      downSpine.className = `fh-inner-spine ${side === 'right' ? 'fh-inner-spine-right' : 'fh-inner-spine-left'}`;
      downSide.appendChild(downSpine);
    }

    const lightW = this.maskSize;
    const lightH = this.maskSize * 2;
    const frontHighlight = document.createElement('div');
    frontHighlight.className = 'fh-crease-lighting fh-front-sheen';
    frontHighlight.style.width = `${lightW}px`;
    frontHighlight.style.height = `${lightH}px`;
    frontHighlight.style.margin = `${-lightH / 2}px 0 0 ${-lightW}px`;
    downSide.appendChild(frontHighlight);
    downMask.appendChild(downSide);

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
    if (toIdx !== null && toIdx !== undefined) {
      upSide.appendChild(cloneCanvasSnapshot(this.pageNodes[toIdx], this.pageW, this.pageH));
    }

    const backShade = document.createElement('div');
    backShade.className = 'fh-crease-lighting fh-back-sheen';
    backShade.style.width = `${lightW}px`;
    backShade.style.height = `${lightH}px`;
    backShade.style.margin = `${-lightH / 2}px 0 0 ${-lightW}px`;
    upSide.appendChild(backShade);
    upMask.appendChild(upSide);

    this.flipLayer.appendChild(castBounds);
    this.flipLayer.appendChild(downMask);
    this.flipLayer.appendChild(flapDropBounds);
    this.flipLayer.appendChild(upMask);
    els.push(castBounds, downMask, flapDropBounds, upMask);

    return {
      isHard: false,
      seq,
      underEl,
      underIdx,
      underSpine,
      castBounds,
      castMask,
      castGradient,
      flapDropBounds,
      flapDropMask,
      flapCaster,
      downMask,
      downSide,
      upMask,
      upSide,
      underShadow,
      frontHighlight,
      backShade,
      els,
    };
  }

  _isHardSpreadStep(prevSpread, nextSpread, side) {
    return (
      (this.single && side === 'left') ||
      (this.settings.showCover &&
        !this.single &&
        (prevSpread === 0 ||
          nextSpread === 0 ||
          prevSpread === this.spreads.length - 1 ||
          nextSpread === this.spreads.length - 1))
    );
  }

  _getFlipIndices(prevSpread, nextSpread, side) {
    const curSlots = this._getSpreadSlots(prevSpread);
    const nextSlots = this._getSpreadSlots(nextSpread);
    const fromIdx = this.single ? curSlots.right : side === 'right' ? curSlots.right : curSlots.left;
    const toIdx = this.single ? nextSlots.right : side === 'right' ? nextSlots.left : nextSlots.right;
    const underIdx = this.single ? nextSlots.right : side === 'right' ? nextSlots.right : nextSlots.left;
    return { fromIdx, toIdx, underIdx };
  }

  _beginInteractiveTurn(side, bookPos, mode) {
    const dir = side === 'right' ? 1 : -1;
    const prevSpread = this.currentSpreadIndex;
    const nextSpread = prevSpread + dir;
    if (nextSpread < 0 || nextSpread >= this.spreads.length) return false;

    const isHard = this._isHardSpreadStep(prevSpread, nextSpread, side);
    const { fromIdx, toIdx, underIdx } = this._getFlipIndices(prevSpread, nextSpread, side);

    const startX = this.single ? (side === 'right' ? this.pageW : 0) : side === 'right' ? this.pageW : -this.pageW;
    const clampedY =
      mode === 'hover'
        ? bookPos.y > this.pageH / 2
          ? this.pageH - 4
          : 4
        : clamp(bookPos.y + (bookPos.y > this.pageH / 2 ? 6 : -6), 6, this.pageH - 6);
    const fromPoint = { x: startX, y: clampedY };

    const seq = ++this.flipSeq;
    const dom = this._createFlipDom({ side, isHard, fromIdx, toIdx, underIdx, withUnder: true, seq });

    if (this.single || side === 'right') this.rightSlot.style.visibility = 'hidden';
    else this.leftSlot.style.visibility = 'hidden';

    this.interactiveFlip = {
      ...dom,
      side,
      dir,
      prevSpread,
      nextSpread,
      mode,
      from: fromPoint,
      coord: { ...fromPoint },
      target: this._bookToSpine(bookPos),
    };

    this._setState(mode === 'hover' ? 'fold_corner' : 'user_fold');
    this._ensureRaf();
    return true;
  }

  _applyFlipFrame(f, coord) {
    if (!f) return;
    f.coord = coord;

    if (f.isHard) {
      const span = this.single ? this.pageW : 2 * this.pageW;
      const progress = clamp(Math.abs(coord.x - f.from.x) / span, 0, 1);
      const deg = f.side === 'right' ? -180 * progress : 180 * progress;
      f.hardCard.style.transform = `perspective(3600px) rotateY(${deg}deg)`;
      if (f.seq) {
        f.hardCard.style.zIndex = String(progress <= 0.5 ? 2000 - f.seq * 4 : 3000 + f.seq * 4 + 1);
      }
      const shadeAlpha = Math.sin(progress * Math.PI) * 0.24;
      f.hardShade.style.opacity = String(shadeAlpha);
      return;
    }

    const g = computeFoldGeometry(this.pageW, this.pageH, this.maskSize, f.from, coord);
    const distCenter = g.pageTranX + this.pageW / 2;

    const maskTx = `translate3d(${g.maskTranX}px, ${g.maskTranY}px, 0px) rotate(${g.rotate}deg)`;
    f.downMask.style.transform = maskTx;
    f.upMask.style.transform = maskTx;
    f.castMask.style.transform = maskTx;
    f.flapDropMask.style.transform = maskTx;

    f.downSide.style.transform = `translate3d(${-g.pageTranX}px, 0px, 0px) rotate(${-g.rotate}deg)`;
    f.upSide.style.transform = `translate3d(${g.pageTranX}px, 0px, 0px) rotate(${g.rotate}deg)`;
    f.flapCaster.style.transform = `translate3d(${g.pageTranX}px, 0px, 0px) rotate(${g.rotate}deg)`;

    // Align cylindrical curl highlight & trough strictly parallel to the diagonal fold crease
    f.frontHighlight.style.transform = `rotate(${g.rotate}deg) translate3d(${distCenter}px, 0px, 0px)`;
    f.backShade.style.transform = `rotate(${-g.rotate}deg) translate3d(${-distCenter}px, 0px, 0px)`;

    // Dynamic curl shadow envelope (FlipHTML5 PageHighlightsFlipShadow profile)
    const rate = g.shadowRate;
    const travel = clamp(Math.abs(coord.x - f.from.x) / (2 * this.pageW), 0, 1);
    f.travel = travel;
    const travelFade = travel > 0.78 ? clamp((0.93 - travel) / 0.15, 0, 1) : 1;
    const edgeFade = (rate > 0.85 ? clamp((0.97 - rate) / 0.12, 0, 1) : rate < 0.08 ? rate / 0.08 : 1) * travelFade;
    const liftBell = (rate < 0.5 ? rate * 2 : (1 - rate) * 2) * travelFade;
    const widthScale = clamp(g.frontShadowDistance / 160, 0.18, 1.35);

    f.castGradient.style.transform = `scaleX(${widthScale})`;
    f.castGradient.style.opacity = String(clamp(edgeFade * 0.9, 0, 0.88));
    f.flapCaster.style.opacity = String(clamp(liftBell * 0.95, 0, 0.92));
    if (f.underShadow) {
      f.underShadow.style.opacity = String(clamp(liftBell * 0.18, 0, 0.12));
    }
    f.frontHighlight.style.opacity = String(clamp(edgeFade * 0.92, 0, 0.88));
    f.backShade.style.opacity = String(clamp(edgeFade * 0.95, 0, 0.92));
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
    this.currentSpreadIndex = f.nextSpread;
    this.currentPageIndex = (this.spreads[f.nextSpread] || [0])[0];

    const targetSlot = this.single || f.side === 'right' ? this.rightSlot : this.leftSlot;
    this._setSlotPage(targetSlot, f.underIdx);

    const targetX = f.side === 'right' ? -this.pageW : this.pageW;
    const remainingRatio = clamp(Math.abs(targetX - f.coord.x) / (2 * this.pageW), 0.2, 1);
    const dur = Math.max(170, this.settings.flippingTime * remainingRatio);

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
    f.arcMode = false;
    f.reversed = false;

    this.flyingFlips.push(f);
    this._emit('flipStart', { from: fromPage, page: this.currentPageIndex, side: f.side });
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

  _refreshPendingSnapshots() {
    if (!this.flipLayer) return;
    const pending = this.flipLayer.querySelectorAll('.fh-snap[data-pending-page-idx]');
    if (!pending.length) return;
    for (const wrap of pending) {
      const idx = Number(wrap.dataset.pendingPageIdx);
      const srcCanvas = Number.isFinite(idx) ? this.pageNodes[idx]?.querySelector('canvas.fb-canvas') : null;
      if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
        const snap = document.createElement('canvas');
        snap.className = 'fh-snap-canvas';
        snap.width = srcCanvas.width;
        snap.height = srcCanvas.height;
        snap.getContext('2d', { alpha: false }).drawImage(srcCanvas, 0, 0);
        wrap.innerHTML = '';
        wrap.appendChild(snap);
        delete wrap.dataset.pendingPageIdx;
      }
    }
  }

  _removeFlipDom(f) {
    if (!f?.els) return;
    for (const el of f.els) el.remove();
  }

  _loop(now) {
    this.rafId = null;
    const dt = this._lastLoopTime !== null ? clamp(now - this._lastLoopTime, 1, 48) : 16.67;
    this._lastLoopTime = now;

    if (this.flyingFlips.length || this.interactiveFlip) {
      this._refreshPendingSnapshots();
    }

    // Step all concurrent cascading animated flips independently (continuous dt integration)
    if (this.flyingFlips.length) {
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
          const arc = 0.05 * Math.sqrt(Math.max(0, this.pageW * this.pageW - nx * nx));
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
          this._emit('flip', this.currentPageIndex);
        } else {
          // Update the trailing slot to the page just landed underneath remaining flying sheets
          const lastDone = finished[finished.length - 1];
          const slots = this._getSpreadSlots(lastDone.nextSpread);
          if (!this.single) {
            if (lastDone.dir === 1) this._setSlotPage(this.leftSlot, slots.left);
            else this._setSlotPage(this.rightSlot, slots.right);
          }
        }
      }
    }

    // Step interactive corner hover / drag / release fallback spring (0.22 lerp)
    let keepInteractive = false;
    const activeI = this.interactiveFlip;
    if (activeI) {
      const lerp = 0.22;
      const dx = activeI.target.x - activeI.coord.x;
      const dy = activeI.target.y - activeI.coord.y;
      const nx = activeI.coord.x + dx * lerp;
      const ny = activeI.coord.y + dy * lerp;

      if (activeI.mode === 'fallback' && Math.hypot(dx, dy) < 1.5) {
        this._cancelInteractiveFlipImmediate();
      } else {
        this._applyFlipFrame(activeI, { x: nx, y: ny });
        keepInteractive = activeI.mode === 'fallback' || Math.hypot(dx, dy) >= 0.15;
      }
    }

    this._updateLandingSpineBlend();

    if (this.flyingFlips.length > 0 || keepInteractive) {
      this._ensureRaf();
    } else {
      this._lastLoopTime = null;
    }
  }

  _updateLandingSpineBlend() {
    let blend = 0;
    if (!this.single) {
      const candidates = [];
      for (const f of this.flyingFlips) {
        if (!f.isHard && f.delayMs <= 0) candidates.push(f.travel || 0);
      }
      if (this.interactiveFlip && !this.interactiveFlip.isHard) {
        candidates.push(this.interactiveFlip.travel || 0);
      }
      if (candidates.length > 0) {
        const minTravel = Math.min(...candidates);
        if (minTravel > 0.78) {
          blend = clamp((minTravel - 0.78) / 0.14, 0, 1);
        }
      }
    }
    if (this.interactiveFlip?.underSpine) {
      this.interactiveFlip.underSpine.style.opacity = String(1 - blend);
    }
    if (blend !== this._lastSpineBlend) {
      this._lastSpineBlend = blend;
      this._emit('spineBlend', blend);
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
    this._emit('flip', this.currentPageIndex);
  }

  _cancelInteractiveFlipImmediate() {
    if (!this.interactiveFlip) return;
    this._removeFlipDom(this.interactiveFlip);
    this.interactiveFlip = null;
    this._updateLandingSpineBlend();
    if (!this.flyingFlips.length) {
      this._renderStaticSpread();
      this._setState('read');
    }
  }

  _cancelAllFlipsImmediate() {
    this._stopRaf();
    this.flipLayer.innerHTML = '';
    this.interactiveFlip = null;
    this.flyingFlips = [];
    this._renderStaticSpread();
    this._updateLandingSpineBlend();
    this._setState('read');
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
        const backFrac = clamp(Math.abs(rev.animToX - rev.coord.x) / (2 * this.pageW), 0.18, 1);
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

    // Bound simultaneous active DOM flip sheets cleanly while advancing at full speed
    if (this.flyingFlips.length >= 6) {
      const oldest = this.flyingFlips.shift();
      this._removeFlipDom(oldest);
      if (!this.single) {
        const landedSlots = this._getSpreadSlots(oldest.nextSpread);
        if (oldest.dir === 1) this._setSlotPage(this.leftSlot, landedSlots.left);
        else this._setSlotPage(this.rightSlot, landedSlots.right);
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
    } else {
      this._setSlotPage(this.rightSlot, nextSlots.right);
    }

    const seq = ++this.flipSeq;
    const dom = this._createFlipDom({ side, isHard, fromIdx, toIdx, underIdx, withUnder: false, seq });

    const baseDuration = isCascading ? Math.max(200, this.settings.flippingTime * 0.85) : this.settings.flippingTime;
    const baseRate = 1 / baseDuration;

    const flipObj = {
      ...dom,
      side,
      dir,
      prevSpread,
      nextSpread,
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
    this._setState('flipping');
    this._ensureRaf();
  }

  flipNext(corner = 'bottom') {
    this._startSerialFlip(1, corner);
  }

  flipPrev(corner = 'bottom') {
    this._startSerialFlip(-1, corner);
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
