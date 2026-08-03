/*
 * harness.js — 在 Node 裡把整個模擬引擎跑起來的最小 DOM 替身
 *
 * 為什麼放在 repo 裡而不是暫存目錄：
 * 這份 harness 原本寫在 /tmp，結果暫存區被清掉，二十幾個測試檔一次全部消失。
 * 測試是驗證程式正確性的唯一憑據，把它放在會被清空的地方等於沒有測試。
 * 現在跟著程式一起進版控，任何人 clone 下來都能立刻執行。
 *
 * 用法：
 *   node tools/tests/<某個測試>.js          （在專案根目錄執行）
 *
 * 這不是完整的 DOM 實作，只做到「能讓實驗建置起來並產生繪圖呼叫」的程度。
 * 因此它驗得了「程式邏輯與繪圖指令」，驗不了「畫面看起來對不對」——
 * 版面、重疊、實際像素一律要人打開瀏覽器看。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = process.env.PL_ROOT || process.cwd();

/* ---------------- canvas context 替身 ---------------- */
function ctxStub() {
  const c = {
    canvas: null,
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, lineCap: "butt", lineJoin: "miter",
    font: "10px sans-serif", textAlign: "start", textBaseline: "alphabetic",
    globalAlpha: 1, globalCompositeOperation: "source-over",
    shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {},
    moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, ellipse() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {},
    translate() {}, scale() {}, rotate() {}, setTransform() {}, resetTransform() {},
    setLineDash() {}, getLineDash() { return []; },
    drawImage() {},
    measureText(t) { return { width: String(t).length * 6 }; },
    getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createPattern() { return null; },
    getImageData() { return { data: new Uint8ClampedArray(4) }; },
    putImageData() {}
  };
  return c;
}

/* ---------------- 元素替身 ---------------- */
function makeEl(tag) {
  const classes = new Set();
  const e = {
    tagName: String(tag || "div").toUpperCase(),
    style: {
      _v: {},
      setProperty(k, v) { this._v[k] = v; },
      getPropertyValue(k) { return this._v[k] || ""; },
      removeProperty(k) { delete this._v[k]; }
    },
    dataset: {},
    children: [],
    attributes: {},
    parentNode: null,
    _listeners: {},
    _text: "",
    _html: "",
    width: 0, height: 0,

    get classList() {
      return {
        add(...c) { c.forEach(x => x && classes.add(x)); },
        remove(...c) { c.forEach(x => classes.delete(x)); },
        toggle(c, f) { const on = f === undefined ? !classes.has(c) : !!f; on ? classes.add(c) : classes.delete(c); return on; },
        contains(c) { return classes.has(c); }
      };
    },
    get className() { return [...classes].join(" "); },
    set className(v) { classes.clear(); String(v || "").split(/\s+/).forEach(x => x && classes.add(x)); },

    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    insertBefore(c, ref) {
      const i = ref ? this.children.indexOf(ref) : -1;
      if (i >= 0) this.children.splice(i, 0, c); else this.children.push(c);
      c.parentNode = this; return c;
    },
    removeChild(c) {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
      if (c) c.parentNode = null;
      return c;
    },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    replaceChildren() { this.children.length = 0; },
    get nextSibling() {
      const p = this.parentNode; if (!p) return null;
      const i = p.children.indexOf(this);
      return i >= 0 ? (p.children[i + 1] || null) : null;
    },
    get firstChild() { return this.children[0] || null; },

    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); },

    addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); },
    removeEventListener(t, fn) {
      const a = this._listeners[t]; if (!a) return;
      const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
    },
    /*
     * 事件要往上冒泡。
     *
     * 原本只呼叫自己身上的監聽器，於是任何「掛在容器上、靠冒泡收事件」的程式
     * 在測試裡等於不存在——引擎「暫停時拉滑桿要重畫」就是掛在實驗根節點上的。
     * 少了冒泡，測試會把 41 個其實正常的實驗全部報成壞的，
     * 而且報出來的樣子和真的壞掉一模一樣。
     *
     * 真實瀏覽器裡 input / change / click 都會冒泡；只有明確標 bubbles: false 才不會。
     */
    dispatch(t, ev, origin) {
      const target = origin || this;
      (this._listeners[t] || []).slice().forEach(fn => {
        fn(Object.assign({ preventDefault() {}, stopPropagation() {}, pointerId: 1 },
          ev, { target, currentTarget: this }));
      });
      if (ev && ev.bubbles === false) return;
      if (this.parentNode && typeof this.parentNode.dispatch === "function") {
        this.parentNode.dispatch(t, ev, target);
      }
    },
    dispatchEvent(ev) { this.dispatch(ev && ev.type, ev); return true; },

    getContext() { if (!this._ctx) { this._ctx = ctxStub(); this._ctx.canvas = this; } return this._ctx; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 640, bottom: 400, width: 640, height: 400 }; },
    setPointerCapture() {}, releasePointerCapture() {},
    focus() {}, blur() {}, click() { this.dispatch("click", {}); }, scrollIntoView() {},
    toDataURL() { return "data:,"; },

    /*
     * 真實 DOM 裡設了 innerHTML 之後 textContent 讀得到裡面的文字。
     * 引擎有不少地方用 innerHTML 塞純文字標籤（chipGroup 的按鈕就是），
     * 若替身不同步，測試會找不到那些按鈕而誤判成「元件沒建出來」。
     * 這裡把標籤剝掉存成文字，涵蓋純文字與含少量標籤這兩種常見用法。
     */
    set innerHTML(v) {
      this._html = String(v);
      this._text = String(v).replace(/<[^>]*>/g, "");
      this.children.length = 0;
    },
    get innerHTML() { return this._html; },
    set textContent(v) { this._text = String(v); this.children.length = 0; },
    get textContent() {
      if (this.children.length) return this.children.map(c => c.textContent).join("");
      return this._text;
    },

    closest(sel) {
      let n = this;
      while (n) {
        if (matches(n, sel)) return n;
        n = n.parentNode;
      }
      return null;
    },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    /*
     * 支援逗號分隔的選擇器群組。
     *
     * 原本直接用 split(/\s+/) 拆，於是 ".a, .b" 被當成「.a, 底下的 .b」這種後代選擇器，
     * 回傳 0 筆。這在測試裡的表現是「找不到任何節點」，
     * 和「這些節點真的不存在」完全分不出來——實際害一支稽核把 28 支正常的滑桿
     * 判成沒反應。選擇器引擎自己有 bug 是最難察覺的一種。
     */
    querySelectorAll(sel) {
      const collect = (node, acc) => {
        (node.children || []).forEach(c => { acc.push(c); collect(c, acc); });
        return acc;
      };
      const all = collect(this, []);
      const out = [], seen = new Set();
      String(sel).split(",").forEach(group => {
        const parts = group.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return;
        let pool = all;
        parts.forEach((p, i) => {
          if (i === 0) pool = pool.filter(n => matches(n, p));
          else {
            const next = [];
            pool.forEach(n => collect(n, []).forEach(d => { if (matches(d, p)) next.push(d); }));
            pool = next;
          }
        });
        pool.forEach(n => { if (!seen.has(n)) { seen.add(n); out.push(n); } });
      });
      // 依文件順序回傳，和真實 DOM 一致
      out.sort((a, b) => all.indexOf(a) - all.indexOf(b));
      return out;
    }
  };
  return e;
}
function matches(node, sel) {
  if (!node || !sel) return false;
  return sel.split(",").some(one => {
    one = one.trim();
    if (one.startsWith(".")) return node.classList && node.classList.contains(one.slice(1));
    if (one.startsWith("#")) return node.attributes && node.attributes.id === one.slice(1);
    return node.tagName === one.toUpperCase();
  });
}

/* ---------------- document / window ---------------- */
const documentElement = makeEl("html");
const body = makeEl("body");
const head = makeEl("head");

const document = {
  documentElement, body, head,
  hidden: false,
  createElement: makeEl,
  createElementNS: (ns, t) => makeEl(t),
  createTextNode(t) { const e = makeEl("#text"); e.textContent = t; return e; },
  createDocumentFragment() { return makeEl("#fragment"); },
  getElementById: () => null,
  querySelector(sel) { return body.querySelector(sel); },
  querySelectorAll(sel) { return body.querySelectorAll(sel); },
  addEventListener() {}, removeEventListener() {},
  _listeners: {}
};

const cssStub = () => ({ getPropertyValue: () => "" });

/* 畫布用 ResizeObserver 監看容器尺寸；Node 沒有這個 API，
   替身只要「能被 new、有 observe/disconnect」就夠了，測試不需要真的觸發。 */
class ResizeObserverStub {
  constructor(cb) { this._cb = cb; }
  observe() {} unobserve() {} disconnect() {}
}
class IntersectionObserverStub {
  constructor(cb) { this._cb = cb; }
  observe() {} unobserve() {} disconnect() {}
}

/* 排隊中的影格 callback；只有 flushFrames() 會把它們跑掉。 */
const rafQueue = [];

const window = {
  document, documentElement,
  innerWidth: 1280, innerHeight: 900, devicePixelRatio: 1,
  location: { href: "http://localhost/", hash: "", search: "", pathname: "/" },
  history: { replaceState() {}, pushState() {} },
  navigator: { userAgent: "node", onLine: true, serviceWorker: undefined, clipboard: undefined },
  localStorage: (function () {
    const m = new Map();
    return {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k),
      clear: () => m.clear()
    };
  })(),
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  getComputedStyle: cssStub,
  /*
   * requestAnimationFrame 原本是 () => 1，也就是排進去的 callback 永遠不會被執行。
   * 這對「不想讓動畫自己跑起來」是對的，但也讓任何把工作延到下一格的程式
   * 在測試裡等於不存在——例如引擎「暫停時拉滑桿要重畫一次」的那段。
   * 現在改成排進佇列，只有測試明確呼叫 flushFrames() 才執行，
   * 兩件事就都成立：不會自己跑，但測得到。
   */
  requestAnimationFrame: cb => rafQueue.push(cb),
  cancelAnimationFrame: id => { const i = id - 1; if (i >= 0 && i < rafQueue.length) rafQueue[i] = null; },
  setTimeout, clearTimeout, setInterval, clearInterval,
  addEventListener() {}, removeEventListener() {},
  performance: { now: () => Date.now() },
  console
};
window.window = window;
window.self = window;

/* 這些必須同時放上 global：程式碼裡是用裸名稱呼叫（getComputedStyle(...)），
   只改 window.xxx 不會生效——這個坑實際踩過，導致整組稽核測到的都是 fallback 值。 */
/* Node 22 起 globalThis.navigator 是唯讀的 getter，直接指派會丟 TypeError，
   因此一律改用 defineProperty，並且只在該名稱尚未被定義成唯讀時才覆寫。 */
function def(name, value) {
  try {
    Object.defineProperty(global, name, { value, writable: true, configurable: true });
  } catch (e) { /* 真的動不了就跳過，測試會在斷言階段發現 */ }
}
def("window", window);
def("document", document);
def("documentElement", documentElement);
def("navigator", window.navigator);
def("location", window.location);
def("localStorage", window.localStorage);
def("getComputedStyle", cssStub);
def("matchMedia", window.matchMedia);
def("requestAnimationFrame", window.requestAnimationFrame);
def("cancelAnimationFrame", window.cancelAnimationFrame);

/*
 * 執行目前排隊中的影格 callback。
 * 只處理呼叫當下的快照：frame() 會把自己再排一次，若連新排進來的也一起跑
 * 就會變成無窮迴圈。
 */
function flushFrames(times) {
  for (let i = 0; i < (times || 1); i++) {
    const batch = rafQueue.splice(0, rafQueue.length);
    batch.forEach(cb => { if (cb) { try { cb(Date.now()); } catch (e) { /* 由測試自行斷言 */ } } });
  }
}
def("flushFrames", flushFrames);
window.flushFrames = flushFrames;
def("MathJax", undefined);
def("ResizeObserver", ResizeObserverStub);
def("IntersectionObserver", IntersectionObserverStub);
window.ResizeObserver = ResizeObserverStub;
window.IntersectionObserver = IntersectionObserverStub;

/* ---------------- 依序載入站台程式 ---------------- */
const CORE_ORDER = [
  "js/site-config.js",
  "js/curriculum.js",
  "js/advanced-curriculum.js",
  "js/comprehensive-curriculum.js",
  "js/extension-registry.js",
  "js/open-curriculum.js",
  "js/school-curriculum.js",
  "js/question-bank.js",
  "js/sim-core.js",
  "js/sim-tools.js",
  "js/sim-insight.js",
  "js/sim-a11y.js",
  "js/teaching-notes.js",
  "js/experiment-manifest.js"
];

function run(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return;
  const code = fs.readFileSync(file, "utf8");
  try {
    vm.runInThisContext(code, { filename: rel });
  } catch (e) {
    console.error("載入失敗：" + rel + " → " + e.message);
    throw e;
  }
}

CORE_ORDER.forEach(run);

/* 實驗檔全部載入（正式站是延遲載入，測試裡一次載完比較簡單） */
const expDir = path.join(ROOT, "js/experiments");
if (fs.existsSync(expDir)) {
  fs.readdirSync(expDir).filter(f => f.endsWith(".js")).sort().forEach(f => run("js/experiments/" + f));
}

module.exports = { window, document, makeEl, ctxStub, ROOT };
