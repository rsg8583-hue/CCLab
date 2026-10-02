// Plastic Waste in Our Oceans
// CCLab mini project, Ryan Gao
//
// Positions are canvas pixels and are rescaled proportionally when the canvas resizes.
// Velocities are fractions of the canvas width per second. All motion, spawning and the
// year counter run on elapsed time (deltaTime), so the pace is the same on any device.
//
// Growth bound: the water holds at most MAX_IN_WATER plastic objects. Once full, years keep
// passing but nothing new spawns, which keeps long sessions responsive.

const ASPECT = 5 / 8; // the original 800 × 500 canvas
const START_YEAR = new Date().getFullYear(); // the visitor's current year
const INITIAL_PER_TYPE = 10;
const SECONDS_PER_YEAR = 1;
// Converting plastic to a degradable alternative slows new plastic production; recycling does not.
const BASE_PRODUCTION = 3; // objects per year, one of each type
const CONVERSIONS_TO_STOP = 60;
const MAX_IN_WATER = 200;
// Illustrative scale: the 30 starting objects equal the estimated 5.25 trillion plastic pieces
// floating at the ocean surface (Eriksen et al., PLOS ONE, 2014).
const ESTIMATED_PIECES = 5.25e12;
const PIECES_PER_OBJECT = ESTIMATED_PIECES / (INITIAL_PER_TYPE * 3);
const DRIFT_MIN = 0.05;
const DRIFT_MAX = 0.14;
const MAX_DT = 0.1; // ignore long gaps, e.g. after switching tabs

const FADE_TIME = 1.4;
const RECYCLE_TIME = 0.3;
const FLASH_TIME = 0.6;
const TOAST_TIME = 1.1;

const ASSET_DIR = "assets/trashPhotos/";
const CANVAS_FONT = "Inter,system-ui,-apple-system,sans-serif"; // no spaces, so p5 won't quote it
const TYPES = [
  { key: "bottle", plastic: "plasticbottle.png", paper: "paperBottle.png" },
  { key: "bag", plastic: "plasticBag.png", paper: "paperBag.png" },
  { key: "straw", plastic: "plasticStraws.png", paper: "paperStraw.png" },
];

const TEAL = [60, 201, 184];
const SAND = [217, 185, 138];
const INK = [230, 239, 245];

const images = {};
const ui = {};
const lastShown = {};
let sprites = {};
let zones = null;
let oceanSprite = null;

let items = [];
let initialLayout = [];
let toasts = [];
let year = START_YEAR;
let yearClock = 0;
let recycledCount = 0;
let convertedCount = 0;
let offscreenCount = 0; // plastic that arrived after the display cap was reached
let productionClock = 0; // fractional objects owed by the current production rate
let nextType = 0;
let stopAnnounced = false;

let playing = true;
let speed = 1;
let soundOn = false;
let oceanSound = null;
let cleanupSound = null;

// Dragging sweeps up every piece of plastic the pointer passes over, like the original sketch.
let dragging = false;
let held = []; // objects following the pointer
let heldTouchId = null;
let dragX = 0;
let dragY = 0;
let hovered = null;
let pointerInside = false;
let pointerX = 0;
let pointerY = 0;
let lastCursor = "";

let canvasEl = null;
let containerEl = null;
let itemSize = 50;
let hitRadius = 30;

// ---------------------------------------------------------------- loading

function preload() {
  for (const type of TYPES) {
    images[`plastic-${type.key}`] = loadOptionalImage(type.plastic);
    images[`paper-${type.key}`] = loadOptionalImage(type.paper);
  }
  images.ocean = loadOptionalImage("ocean.jpg");
  images.recycle = loadOptionalImage("recycle.png");
  images.converter = loadOptionalImage("converter.avif");
}

// A failure callback lets preload finish even if an asset is missing; we draw a fallback instead.
function loadOptionalImage(file) {
  const img = loadImage(ASSET_DIR + file, undefined, () => {
    img.failed = true;
    console.warn(`Could not load ${file}; using a fallback shape.`);
  });
  return img;
}

function isUsable(img) {
  return img && !img.failed && img.width > 1;
}

function loadSounds() {
  if (typeof loadSound !== "function") {
    disableSound();
    return;
  }
  let failures = 0;
  const onError = () => {
    failures++;
    if (failures === 2) disableSound();
  };
  loadSound(ASSET_DIR + "ocean.mp3", (sound) => {
    oceanSound = sound;
    oceanSound.setVolume(0.45);
    syncSound();
  }, onError);
  loadSound(ASSET_DIR + "trash.mp3", (sound) => {
    cleanupSound = sound;
    cleanupSound.setVolume(0.6);
  }, onError);
}

// ---------------------------------------------------------------- setup

function setup() {
  containerEl = document.getElementById("p5-canvas-container");
  pixelDensity(Math.min(2, displayDensity()));
  const [w, h] = containerSize();
  const canvas = createCanvas(w, h);
  canvas.parent(containerEl);
  canvasEl = canvas.elt;
  canvasEl.setAttribute("role", "img");
  canvasEl.setAttribute("aria-label", "Ocean simulation with floating plastic. Drag plastic onto the Recycle or Convert zone.");
  document.getElementById("canvas-placeholder")?.remove();
  textFont(CANVAS_FONT);

  layout();
  initialLayout = makeInitialLayout();

  bindControls();
  bindPointer();
  loadSounds();
  resetSimulation();

  new ResizeObserver(fitCanvas).observe(containerEl);
}

function containerSize() {
  const w = Math.max(280, Math.floor(containerEl.clientWidth));
  return [w, Math.round(w * ASPECT)];
}

function fitCanvas() {
  const [w, h] = containerSize();
  if (w === width && h === height) return;
  const sx = w / width;
  const sy = h / height;
  for (const it of items) {
    it.x *= sx;
    it.y *= sy;
    it.fromX *= sx;
    it.fromY *= sy;
  }
  for (const toast of toasts) {
    toast.x *= sx;
    toast.y *= sy;
  }
  resizeCanvas(w, h);
  layout();
}

// Everything that depends on the canvas size.
function layout() {
  itemSize = constrain(width * 0.0625, 34, 56);
  hitRadius = Math.max(itemSize * 0.6, 22);

  const zw = constrain(width * 0.15, 72, 128);
  const zh = constrain(height * 0.5, 120, 230);
  const margin = Math.max(8, width * 0.015);
  const y = (height - zh) / 2;
  if (!zones) {
    zones = {
      recycle: { kind: "recycle", label: "Recycle", caption: "Remove plastic", color: TEAL, img: images.recycle, fit: "contain", flash: 0 },
      convert: { kind: "convert", label: "Convert", caption: "Swap for paper", color: SAND, img: images.converter, fit: "cover", flash: 0 },
    };
  }
  setZoneRect(zones.recycle, margin, y, zw, zh);
  setZoneRect(zones.convert, width - margin - zw, y, zw, zh);

  const pd = pixelDensity();
  oceanSprite = isUsable(images.ocean) ? renderSprite(images.ocean, width, height, "cover", pd, "rgba(3, 18, 36, 0.22)") : null;
  sprites = {};
  for (const type of TYPES) {
    for (const material of ["plastic", "paper"]) {
      const key = `${material}-${type.key}`;
      // Rendered slightly larger than itemSize so the lifted (scaled-up) state stays sharp.
      sprites[key] = isUsable(images[key]) ? renderSprite(images[key], itemSize * 1.15, itemSize * 1.15, "contain", pd) : null;
    }
  }
}

function setZoneRect(zone, x, y, w, h) {
  const pad = Math.max(6, w * 0.07);
  zone.labelSize = constrain(width * 0.017, 11, 14);
  zone.showCaption = width >= 560;
  const textBlock = zone.labelSize * 1.5 + (zone.showCaption ? zone.labelSize * 1.25 : 0);
  Object.assign(zone, { x, y, w, h, pad });
  zone.tile = { x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 3 - textBlock };
  zone.cx = zone.tile.x + zone.tile.w / 2;
  zone.cy = zone.tile.y + zone.tile.h / 2;
  zone.sprite = isUsable(zone.img)
    ? renderSprite(zone.img, zone.tile.w, zone.tile.h, zone.fit, pixelDensity(), null, zone.fit === "contain" ? "#e9eef2" : null)
    : null;
}

// Pre-scales an image once so draw() doesn't resample large source files every frame.
function renderSprite(img, boxW, boxH, fit, pd, overlay, fillColor) {
  const scale = fit === "cover"
    ? Math.max(boxW / img.width, boxH / img.height)
    : Math.min(boxW / img.width, boxH / img.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(boxW * pd));
  canvas.height = Math.max(1, Math.ceil(boxH * pd));
  const ctx = canvas.getContext("2d");
  ctx.scale(pd, pd);
  ctx.imageSmoothingQuality = "high";
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, boxW, boxH);
  }
  const dw = img.width * scale;
  const dh = img.height * scale;
  const inset = fit === "contain" && fillColor ? 0.86 : 1; // breathing room on light tiles
  ctx.drawImage(img.canvas, (boxW - dw * inset) / 2, (boxH - dh * inset) / 2, dw * inset, dh * inset);
  if (overlay) {
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, boxW, boxH);
  }
  return { canvas, boxW, boxH };
}

// ---------------------------------------------------------------- simulation state

function makeInitialLayout() {
  const layoutList = [];
  for (let i = 0; i < INITIAL_PER_TYPE; i++) {
    for (let t = 0; t < TYPES.length; t++) {
      const p = spawnPoint();
      const [vx, vy] = randomVelocity();
      layoutList.push({ t, u: p.x / width, v: p.y / height, vx, vy });
    }
  }
  return layoutList;
}

function spawnPoint() {
  const r = itemSize / 2;
  return {
    x: constrain(random(width), r, width - r),
    y: constrain(random(height), r, height - r),
  };
}

function randomVelocity() {
  const angle = random(TWO_PI);
  const s = random(DRIFT_MIN, DRIFT_MAX);
  return [Math.cos(angle) * s, Math.sin(angle) * s];
}

function makeItem(typeIndex, x, y, vx, vy) {
  return {
    type: TYPES[typeIndex],
    material: "plastic", // "plastic" | "paper"
    state: "floating", // "floating" | "held" | "recycling" | "fading"
    x, y, vx, vy,
    fromX: 0,
    fromY: 0,
    t: 0,
  };
}

function resetSimulation() {
  items = initialLayout.map((s) => makeItem(s.t, s.u * width, s.v * height, s.vx, s.vy));
  toasts = [];
  year = START_YEAR;
  yearClock = 0;
  recycledCount = 0;
  convertedCount = 0;
  offscreenCount = 0;
  productionClock = 0;
  nextType = 0;
  stopAnnounced = false;
  dragging = false;
  held = [];
  heldTouchId = null;
  hovered = null;
  zones.recycle.flash = 0;
  zones.convert.flash = 0;
  setPlaying(true);
  updateStats();
}

function isInWater(it) {
  return it.material === "plastic" && (it.state === "floating" || it.state === "held");
}

function isGrabbable(it) {
  return it.material === "plastic" && it.state === "floating";
}

function countInWater() {
  let n = 0;
  for (const it of items) if (isInWater(it)) n++;
  return n;
}

// Plastic keeps arriving every year. Past the display cap it is still counted, just not drawn.
function spawnYear() {
  let inWater = countInWater();
  // Plastic counted off screen comes into view first as space frees up, so the water can
  // only truly clear once production has stopped.
  while (offscreenCount > 0 && inWater < MAX_IN_WATER) {
    spawnObject();
    offscreenCount--;
    inWater++;
  }
  productionClock += productionRate();
  while (productionClock >= 1) {
    productionClock -= 1;
    if (inWater < MAX_IN_WATER) {
      spawnObject();
      inWater++;
    } else {
      offscreenCount++;
    }
  }
}

function spawnObject() {
  const p = spawnPoint();
  const [vx, vy] = randomVelocity();
  items.push(makeItem(nextType, p.x, p.y, vx, vy));
  nextType = (nextType + 1) % TYPES.length;
}

// Objects per year. Each conversion takes an equal share off until production reaches zero.
function productionRate() {
  return BASE_PRODUCTION * Math.max(0, 1 - convertedCount / CONVERSIONS_TO_STOP);
}

function dispose(it, kind) {
  it.t = 0;
  if (kind === "recycle") {
    it.state = "recycling";
    it.fromX = it.x;
    it.fromY = it.y;
    recycledCount++;
  } else {
    it.state = "fading";
    it.material = "paper";
    convertedCount++;
  }
}

function confirmCleanup(kind, count) {
  const zone = zones[kind];
  zone.flash = 1;
  toasts.push({ x: zone.x + zone.w / 2, y: zone.y - 10, text: `+${count} ${kind === "recycle" ? "recycled" : "converted"}`, color: zone.color, t: 0 });
  if (soundOn && cleanupSound) cleanupSound.play();
  const pieces = count === 1 ? "1 piece" : `${count} pieces`;
  announce(kind === "recycle" ? `Recycled ${pieces} of plastic.` : `Converted ${pieces} of plastic to paper.`);
}

// ---------------------------------------------------------------- draw loop

function draw() {
  const dt = Math.min(deltaTime / 1000, MAX_DT);
  const simDt = playing ? dt * speed : 0;

  yearClock += simDt;
  while (yearClock >= SECONDS_PER_YEAR) {
    yearClock -= SECONDS_PER_YEAR;
    year++;
    spawnYear();
  }

  if (dragging) gatherAndFollow();
  updateItems(dt, simDt);
  updateHover();
  render();
  updateStats();
}

function updateItems(dt, simDt) {
  for (const it of items) {
    if (it.state === "floating") {
      drift(it, simDt);
    } else if (it.state === "recycling") {
      it.t += dt / RECYCLE_TIME;
      const e = easeInOut(Math.min(1, it.t));
      it.x = lerp(it.fromX, zones.recycle.cx, e);
      it.y = lerp(it.fromY, zones.recycle.cy, e);
    } else if (it.state === "fading") {
      drift(it, simDt);
      it.t += dt / FADE_TIME;
    }
  }
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if ((it.state === "recycling" || it.state === "fading") && it.t >= 1) items.splice(i, 1);
  }

  zones.recycle.flash = Math.max(0, zones.recycle.flash - dt / FLASH_TIME);
  zones.convert.flash = Math.max(0, zones.convert.flash - dt / FLASH_TIME);
  for (let i = toasts.length - 1; i >= 0; i--) {
    toasts[i].t += dt / TOAST_TIME;
    if (toasts[i].t >= 1) toasts.splice(i, 1);
  }
}

function drift(it, simDt) {
  if (simDt === 0) return;
  const r = itemSize / 2;
  it.x += it.vx * width * simDt;
  it.y += it.vy * width * simDt;
  if (it.x < r) { it.x = r; it.vx = Math.abs(it.vx); }
  else if (it.x > width - r) { it.x = width - r; it.vx = -Math.abs(it.vx); }
  if (it.y < r) { it.y = r; it.vy = Math.abs(it.vy); }
  else if (it.y > height - r) { it.y = height - r; it.vy = -Math.abs(it.vy); }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function updateHover() {
  hovered = !dragging && pointerInside ? itemAt(pointerX, pointerY) : null;
  const cursor = dragging ? "grabbing" : hovered ? "grab" : "default";
  if (cursor !== lastCursor) {
    canvasEl.style.cursor = cursor;
    lastCursor = cursor;
  }
}

function render() {
  if (oceanSprite) drawingContext.drawImage(oceanSprite.canvas, 0, 0, width, height);
  else background(14, 74, 102);

  // Drop zones are "armed" while plastic is being carried.
  const armed = held.length > 0;
  const target = armed ? zoneAt(dragX, dragY) : null;
  drawZone(zones.recycle, armed, target === zones.recycle);
  drawZone(zones.convert, armed, target === zones.convert);

  for (const it of items) if (it.state !== "held") drawItem(it);
  for (const it of held) drawItem(it);

  drawToasts();
  drawOverlay();
}

function drawItem(it) {
  let scale = 1;
  let alpha = 1;
  if (it.state === "held") scale = 1.12;
  else if (it.state === "recycling") {
    const t = Math.min(1, it.t);
    scale = 1 - 0.75 * t;
    alpha = 1 - t;
  } else if (it.state === "fading") alpha = 1 - Math.min(1, it.t);

  const highlight = it.state === "held";
  if (highlight || it === hovered) {
    push();
    noFill();
    strokeWeight(2);
    stroke(highlight ? color(...TEAL, 230) : color(...INK, 150));
    circle(it.x, it.y, hitRadius * 2 * scale);
    pop();
  }

  const ctx = drawingContext;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (it.state === "held") {
    ctx.shadowColor = "rgba(0, 12, 28, 0.45)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
  }
  const sprite = sprites[`${it.material}-${it.type.key}`];
  if (sprite) {
    const k = (itemSize / sprite.boxW) * scale;
    const w = sprite.boxW * k;
    const h = sprite.boxH * k;
    ctx.drawImage(sprite.canvas, it.x - w / 2, it.y - h / 2, w, h);
  } else {
    ctx.fillStyle = it.material === "plastic" ? "rgba(200, 228, 245, 0.9)" : "rgba(217, 185, 138, 0.95)";
    ctx.beginPath();
    ctx.arc(it.x, it.y, (itemSize / 2.6) * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawZone(zone, armed, active) {
  const ctx = drawingContext;
  const [r, g, b] = zone.color;
  push();

  noStroke();
  fill(5, 21, 38, active ? 225 : 185);
  rect(zone.x, zone.y, zone.w, zone.h, 10);

  noFill();
  strokeWeight(active ? 2 : 1.5);
  stroke(r, g, b, active ? 255 : armed ? 210 : 90);
  if (armed && !active) ctx.setLineDash([6, 5]);
  rect(zone.x, zone.y, zone.w, zone.h, 10);
  ctx.setLineDash([]);

  if (zone.flash > 0) {
    const grow = (1 - zone.flash) * 8;
    strokeWeight(2);
    stroke(r, g, b, 200 * zone.flash);
    rect(zone.x - grow, zone.y - grow, zone.w + grow * 2, zone.h + grow * 2, 10 + grow);
  }

  const tile = zone.tile;
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(tile.x, tile.y, tile.w, tile.h, 6);
  else ctx.rect(tile.x, tile.y, tile.w, tile.h);
  ctx.clip();
  if (zone.sprite) ctx.drawImage(zone.sprite.canvas, tile.x, tile.y, tile.w, tile.h);
  else {
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
    ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
  }
  if (active) {
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
    ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
  }
  ctx.restore();

  const cx = zone.x + zone.w / 2;
  let ty = tile.y + tile.h + zone.pad;
  noStroke();
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(zone.labelSize);
  fill(...INK);
  text(active ? "Release" : zone.label, cx, ty);
  if (zone.showCaption) {
    ty += zone.labelSize * 1.45;
    textStyle(NORMAL);
    textSize(zone.labelSize * 0.86);
    fill(r, g, b);
    text(active ? `to ${zone.kind}` : zone.caption, cx, ty);
  }
  pop();
}

function drawToasts() {
  if (toasts.length === 0) return;
  push();
  noStroke();
  textAlign(CENTER, BOTTOM);
  textStyle(BOLD);
  textSize(constrain(width * 0.017, 11, 14));
  for (const toast of toasts) {
    const a = toast.t < 0.15 ? toast.t / 0.15 : 1 - (toast.t - 0.15) / 0.85;
    fill(...toast.color, 255 * a);
    text(toast.text, toast.x, toast.y - toast.t * 16);
  }
  pop();
}

function drawOverlay() {
  let top = null;
  if (!playing) top = "Paused";
  else if (productionRate() === 0) top = countInWater() + offscreenCount === 0 ? "The water is clear" : "Plastic production has stopped";
  if (top) drawPill(top);
}

function drawPill(message) {
  push();
  const size = constrain(width * 0.017, 11, 13);
  textSize(size);
  textStyle(BOLD);
  const w = textWidth(message) + size * 2;
  const h = size * 2.2;
  const x = (width - w) / 2;
  const y = size;
  noStroke();
  fill(5, 21, 38, 210);
  rect(x, y, w, h, h / 2);
  fill(...INK);
  textAlign(CENTER, CENTER);
  text(message, width / 2, y + h / 2 + 1);
  pop();
}

// ---------------------------------------------------------------- hit testing

function itemAt(x, y) {
  // Last drawn is on top, so search from the end.
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (isGrabbable(it) && dist(it.x, it.y, x, y) <= hitRadius) return it;
  }
  return null;
}

function zoneAt(x, y) {
  const slack = 6;
  for (const zone of [zones.recycle, zones.convert]) {
    if (x >= zone.x - slack && x <= zone.x + zone.w + slack && y >= zone.y - slack && y <= zone.y + zone.h + slack) {
      return zone;
    }
  }
  return null;
}

function toCanvas(clientX, clientY) {
  const rect = canvasEl.getBoundingClientRect();
  return [(clientX - rect.left) * (width / rect.width), (clientY - rect.top) * (height / rect.height)];
}

// ---------------------------------------------------------------- pointer input

function startDrag(x, y) {
  dragging = true;
  dragX = x;
  dragY = y;
  gatherAndFollow();
}

function moveDrag(x, y) {
  dragX = constrain(x, 0, width);
  dragY = constrain(y, 0, height);
  gatherAndFollow();
}

// Picks up any free plastic near the pointer, then moves the whole pile with it.
// Offsets are halved on pickup so the pile stays clustered under the pointer.
function gatherAndFollow() {
  const reach = Math.max(hitRadius, itemSize);
  for (const it of items) {
    if (!isGrabbable(it) || dist(it.x, it.y, dragX, dragY) > reach) continue;
    it.state = "held";
    it.dx = (it.x - dragX) * 0.5;
    it.dy = (it.y - dragY) * 0.5;
    held.push(it);
  }
  for (const it of held) {
    it.x = constrain(dragX + it.dx, 0, width);
    it.y = constrain(dragY + it.dy, 0, height);
  }
}

function release(cancelled) {
  const zone = cancelled ? null : zoneAt(dragX, dragY);
  for (const it of held) {
    if (zone) dispose(it, zone.kind);
    else it.state = "floating";
  }
  if (zone && held.length > 0) confirmCleanup(zone.kind, held.length);
  dragging = false;
  held = [];
  heldTouchId = null;
}

function bindPointer() {
  // Mouse: press on the canvas, but track movement and release on the window so a drag
  // that leaves the canvas still ends cleanly.
  // A mouse sweep can start anywhere on the water, as in the original sketch.
  canvasEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || dragging) return;
    e.preventDefault();
    const [x, y] = toCanvas(e.clientX, e.clientY);
    startDrag(x, y);
  });
  window.addEventListener("mousemove", (e) => {
    const [x, y] = toCanvas(e.clientX, e.clientY);
    pointerX = x;
    pointerY = y;
    pointerInside = e.target === canvasEl;
    if (dragging && heldTouchId === null) moveDrag(x, y);
  });
  window.addEventListener("mouseup", () => {
    if (dragging && heldTouchId === null) release(false);
  });
  canvasEl.addEventListener("mouseleave", () => {
    pointerInside = false;
  });

  // Touch: only claim the gesture (and block scrolling) when it starts on an object,
  // so swiping over empty water or anywhere else on the page still scrolls.
  canvasEl.addEventListener("touchstart", (e) => {
    if (dragging) return;
    const touch = e.changedTouches[0];
    const [x, y] = toCanvas(touch.clientX, touch.clientY);
    if (itemAt(x, y)) {
      e.preventDefault();
      heldTouchId = touch.identifier;
      startDrag(x, y);
    }
  }, { passive: false });
  canvasEl.addEventListener("touchmove", (e) => {
    const touch = findTouch(e.changedTouches);
    if (!touch) return;
    e.preventDefault();
    const [x, y] = toCanvas(touch.clientX, touch.clientY);
    moveDrag(x, y);
  }, { passive: false });
  canvasEl.addEventListener("touchend", (e) => {
    if (findTouch(e.changedTouches)) release(false);
  });
  canvasEl.addEventListener("touchcancel", (e) => {
    if (findTouch(e.changedTouches)) release(true);
  });

  window.addEventListener("blur", () => {
    if (dragging) release(true);
  });
}

function findTouch(touchList) {
  if (heldTouchId === null || !dragging) return null;
  for (const touch of touchList) if (touch.identifier === heldTouchId) return touch;
  return null;
}

// ---------------------------------------------------------------- controls

function setPlaying(value) {
  playing = value;
  ui.play.classList.toggle("is-paused", !playing);
  ui.playLabel.textContent = playing ? "Pause" : "Play";
}

function bindControls() {
  ui.play = document.getElementById("play-toggle");
  ui.playLabel = ui.play.querySelector(".btn-label");
  ui.sound = document.getElementById("sound-toggle");
  ui.soundLabel = ui.sound.querySelector(".btn-label");
  ui.announcer = document.getElementById("announcer");
  ui.year = document.getElementById("year-display");
  ui.plastic = document.getElementById("plastic-count");
  ui.plasticObjects = document.getElementById("plastic-objects");
  ui.recycled = document.getElementById("recycled-count");
  ui.converted = document.getElementById("converted-count");
  ui.capNote = document.getElementById("cap-note");
  ui.production = document.getElementById("production");

  ui.play.addEventListener("click", () => setPlaying(!playing));
  document.getElementById("reset").addEventListener("click", () => {
    resetSimulation();
    announce(`Simulation reset to ${START_YEAR}.`);
  });
  for (const radio of document.querySelectorAll('input[name="speed"]')) {
    radio.addEventListener("change", () => {
      if (radio.checked) speed = parseFloat(radio.value);
    });
  }
  ui.sound.addEventListener("click", toggleSound);
  document.addEventListener("visibilitychange", syncSound);
}

// ---------------------------------------------------------------- sound

// Audio never starts on its own: the Sound button is the user gesture that unlocks it.
function toggleSound() {
  if (ui.sound.disabled) return;
  soundOn = !soundOn;
  if (soundOn && typeof userStartAudio === "function") userStartAudio();
  syncSound();
}

function syncSound() {
  ui.sound.setAttribute("aria-pressed", String(soundOn));
  ui.soundLabel.textContent = soundOn ? "Sound on" : "Sound off";
  if (!oceanSound) return;
  const shouldPlay = soundOn && document.visibilityState === "visible";
  if (shouldPlay && !oceanSound.isPlaying()) oceanSound.loop();
  else if (!shouldPlay && oceanSound.isPlaying()) oceanSound.pause();
}

function disableSound() {
  soundOn = false;
  ui.sound.disabled = true;
  ui.sound.setAttribute("aria-pressed", "false");
  ui.soundLabel.textContent = "Sound unavailable";
}

// ---------------------------------------------------------------- DOM output

// Only touches the DOM when a value actually changes.
function updateStats() {
  const visible = countInWater();
  const plastic = visible + offscreenCount;
  show("year", year, String);
  show("plastic", plastic, formatPieces);
  show("plasticObjects", plastic);
  show("recycled", recycledCount);
  show("converted", convertedCount);
  const rate = productionRate();
  show("production", rate, formatProduction);
  if (rate === 0 && !stopAnnounced) {
    stopAnnounced = true;
    announce("Plastic production has stopped. No new plastic will enter the water.");
  }
  const full = visible >= MAX_IN_WATER || offscreenCount > 0;
  if (lastShown.full !== full) {
    ui.capNote.hidden = !full;
    lastShown.full = full;
  }
}

function show(key, value, format = (n) => n.toLocaleString()) {
  if (lastShown[key] === value) return;
  ui[key].textContent = format(value);
  lastShown[key] = value;
}

function formatProduction(rate) {
  return rate === 0 ? "No new plastic" : `+${formatPieces(rate)} pieces / yr`;
}

function formatPieces(objects) {
  const pieces = objects * PIECES_PER_OBJECT;
  if (pieces >= 1e12) return `${+(pieces / 1e12).toFixed(2)} trillion`;
  if (pieces >= 1e9) return `${+(pieces / 1e9).toFixed(0)} billion`;
  return "0";
}

function announce(message) {
  ui.announcer.textContent = "";
  // A fresh text node makes screen readers repeat identical messages.
  setTimeout(() => {
    ui.announcer.textContent = message;
  }, 30);
}
