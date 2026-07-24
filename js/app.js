/*
 * app.js — 主程式
 * 目錄、路由、實驗載入、首頁總覽、上一個/下一個、搜尋、進度、主題、PWA。
 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  const Lab = window.PhysicsLab;
  let activeSim = null;
  let current = null;              // { m, e }
  const flat = [];                 // 全部實驗的線性清單
  const PROGRESS_KEY = "pl-progress";
  let progress = loadProgress();

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    C.modules.forEach((mod, mi) => mod.experiments.forEach((exp, ei) => flat.push({ m: mi, e: ei })));
    buildTopbar(); buildSidebar(); buildHome();
    startClock(); setupMobile(); setupSearch(); setupTheme(); setupProgressReset();
    updateProgressUI(); registerSW(); setupInstall(); setupNav();
    showHome();
  }

  // ---------- 頂端列 ----------
  function buildTopbar() {
    document.getElementById("stat-modules").textContent = C.totalModules;
    document.getElementById("stat-exp").textContent = C.totalExperiments;
    document.getElementById("stat-int").textContent = C.totalInteractive;
  }
  function startClock() {
    const el = document.getElementById("clock");
    function tick() {
      const d = new Date(), p = n => String(n).padStart(2, "0");
      el.textContent = d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate()) +
        " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
    }
    tick(); setInterval(tick, 1000);
  }

  // ---------- 首頁總覽 ----------
  function buildHome() {
    document.getElementById("hero-stats").innerHTML =
      chip(C.totalModules, "學習模組") + chip(C.totalExperiments, "實驗主題") + chip(C.totalInteractive, "互動模擬");
    const grid = document.getElementById("module-grid");
    grid.innerHTML = "";
    C.modules.forEach((mod, mi) => {
      const nInt = mod.experiments.filter(e => e.interactive).length;
      const card = document.createElement("div");
      card.className = "mcard"; card.style.setProperty("--m-color", mod.color);
      card.setAttribute("role", "button"); card.tabIndex = 0;
      card.innerHTML =
        '<div class="mcard-top"><span class="mcard-no">' + mod.no + '</span><span class="mcard-track">' + mod.track + '</span></div>' +
        '<div class="mcard-title">' + mod.title + '</div>' +
        '<div class="mcard-intro">' + mod.intro + '</div>' +
        '<div class="mcard-meta">' + mod.experiments.length + ' 實驗 · <b>' + nInt + ' 互動</b></div>';
      const go = () => selectExperiment(mi, 0);
      card.addEventListener("click", go);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      grid.appendChild(card);
    });
    document.getElementById("hero-start").addEventListener("click", () => selectExperiment(0, 0));
    document.getElementById("hero-random").addEventListener("click", randomInteractive);
  }
  function chip(n, label) { return '<div class="hstat"><div class="hstat-n">' + n + '</div><div class="hstat-l">' + label + '</div></div>'; }
  function randomInteractive() {
    const pool = flat.filter(f => C.modules[f.m].experiments[f.e].interactive);
    const r = pool[Math.floor(Math.random() * pool.length)];
    selectExperiment(r.m, r.e);
  }

  function showHome() {
    document.getElementById("home-view").style.display = "block";
    document.getElementById("exp-view").style.display = "none";
    if (activeSim && activeSim.stop) { try { activeSim.stop(); } catch (e) {} }
    activeSim = null;
    document.querySelectorAll(".exp-item").forEach(x => x.classList.remove("active"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function showExp() {
    document.getElementById("home-view").style.display = "none";
    document.getElementById("exp-view").style.display = "block";
  }

  // ---------- 側邊目錄 ----------
  function buildSidebar() {
    const nav = document.getElementById("module-nav");
    nav.innerHTML = "";
    C.modules.forEach((mod, mi) => {
      const wrap = document.createElement("div");
      wrap.className = "module"; wrap.style.setProperty("--m-color", mod.color); wrap.dataset.mi = mi;
      const head = document.createElement("div");
      head.className = "module-head";
      head.innerHTML =
        '<span class="module-no">' + mod.no + '</span>' +
        '<span class="module-title">' + mod.title + '<span class="track">' + mod.track + '</span></span>' +
        '<span class="module-caret">▶</span>';
      head.addEventListener("click", () => toggleModule(mi));
      const list = document.createElement("div");
      list.className = "exp-list";
      mod.experiments.forEach((exp, ei) => {
        const item = document.createElement("div");
        item.className = "exp-item" + (isViewed(mi, ei) ? " viewed" : "");
        item.dataset.mi = mi; item.dataset.ei = ei;
        item.dataset.search = (exp.title + " " + mod.title).toLowerCase();
        item.innerHTML =
          '<span class="idx">' + (ei + 1) + '</span>' +
          '<span class="exp-name">' + exp.title + '</span>' +
          '<span class="check">✓</span>' +
          (exp.interactive ? '<span class="tag-int">互動</span>' : '');
        item.addEventListener("click", () => selectExperiment(mi, ei));
        list.appendChild(item);
      });
      wrap.appendChild(head); wrap.appendChild(list); nav.appendChild(wrap);
    });
  }
  function toggleModule(mi) { document.querySelector('.module[data-mi="' + mi + '"]').classList.toggle("open"); }
  function openModule(mi, on) {
    const el = document.querySelector('.module[data-mi="' + mi + '"]');
    if (el) el.classList[on ? "add" : "remove"]("open");
  }

  // ---------- 載入實驗 ----------
  function selectExperiment(mi, ei) {
    showExp();
    current = { m: mi, e: ei };
    const mod = C.modules[mi], exp = mod.experiments[ei];
    document.querySelectorAll(".exp-item").forEach(x => x.classList.remove("active"));
    const item = document.querySelector('.exp-item[data-mi="' + mi + '"][data-ei="' + ei + '"]');
    if (item) { item.classList.add("active"); item.scrollIntoView({ block: "nearest" }); }
    openModule(mi, true);

    if (activeSim && activeSim.stop) { try { activeSim.stop(); } catch (e) {} }
    activeSim = null;

    const view = document.getElementById("exp-view");
    view.classList.remove("fade-in"); void view.offsetWidth; view.classList.add("fade-in");

    document.getElementById("main").style.setProperty("--m-color", mod.color);
    document.getElementById("crumb").innerHTML = '<b>' + mod.no + '　' + mod.title + '</b>　·　' + mod.track;
    document.getElementById("exp-title").textContent = exp.title;
    document.getElementById("exp-lead").textContent = exp.concept;

    const simRoot = document.getElementById("sim-root");
    simRoot.innerHTML = "";
    if (exp.interactive && Lab.get(exp.id)) {
      try { activeSim = Lab.get(exp.id).build(simRoot) || null; }
      catch (err) { showError(simRoot, err); }
    } else {
      simRoot.innerHTML =
        '<div class="placeholder-sim"><div class="big">🧪</div>' +
        '<div class="msg">此實驗的互動模擬尚在建置中</div>' +
        '<div class="note">下方為完整概念、公式與重點整理，可作為教材使用</div></div>';
    }

    buildGuide(exp);
    updateNav();
    markViewed(mi, ei);
    closeMobile();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildGuide(exp) {
    const g = document.getElementById("guide-body");
    let html = '<div><h4>概念</h4><p>' + exp.concept + '</p></div>';
    if (exp.formula) html += '<div><h4>關鍵公式</h4><div class="formula-box">' + exp.formula + '</div></div>';
    if (exp.points && exp.points.length) {
      html += '<div><h4>重點整理</h4><ul class="points">';
      exp.points.forEach(p => html += '<li>' + p + '</li>');
      html += '</ul></div>';
    }
    g.innerHTML = html; typeset(g);
  }
  function typeset(el) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetClear && window.MathJax.typesetClear([el]);
      window.MathJax.typesetPromise([el]).catch(function () {});
    }
  }
  function showError(root, err) {
    root.innerHTML = '<div class="placeholder-sim"><div class="big">⚠️</div><div class="msg">模擬載入失敗</div><div class="note">' + (err && err.message) + '</div></div>';
  }

  // ---------- 上一個 / 下一個 ----------
  function posOf(mi, ei) { for (let i = 0; i < flat.length; i++) if (flat[i].m === mi && flat[i].e === ei) return i; return 0; }
  function setupNav() {
    document.getElementById("prev-btn").addEventListener("click", () => step(-1));
    document.getElementById("next-btn").addEventListener("click", () => step(1));
    document.getElementById("home-btn").addEventListener("click", showHome);
    const gh = document.getElementById("go-home");
    gh.addEventListener("click", showHome);
    gh.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showHome(); } });
    document.addEventListener("keydown", function (e) {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (document.getElementById("exp-view").style.display === "none") return;
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });
  }
  function step(d) {
    if (!current) return;
    const pos = posOf(current.m, current.e) + d;
    if (pos < 0 || pos >= flat.length) return;
    selectExperiment(flat[pos].m, flat[pos].e);
  }
  function updateNav() {
    const pos = posOf(current.m, current.e);
    const prev = document.getElementById("prev-btn"), next = document.getElementById("next-btn");
    const pt = document.getElementById("prev-title"), nt = document.getElementById("next-title");
    if (pos > 0) { prev.style.visibility = "visible"; pt.textContent = C.modules[flat[pos - 1].m].experiments[flat[pos - 1].e].title; }
    else prev.style.visibility = "hidden";
    if (pos < flat.length - 1) { next.style.visibility = "visible"; nt.textContent = C.modules[flat[pos + 1].m].experiments[flat[pos + 1].e].title; }
    else next.style.visibility = "hidden";
  }

  // ---------- 搜尋 ----------
  function setupSearch() {
    const box = document.getElementById("search");
    box.addEventListener("input", function () {
      const q = box.value.trim().toLowerCase();
      document.querySelectorAll(".module").forEach(m => {
        let any = false;
        m.querySelectorAll(".exp-item").forEach(it => {
          const hit = !q || it.dataset.search.indexOf(q) >= 0;
          it.style.display = hit ? "" : "none"; if (hit) any = true;
        });
        m.style.display = any ? "" : "none";
        if (q) m.classList.add("open");
      });
    });
  }

  // ---------- 進度 ----------
  function loadProgress() { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { return {}; } }
  function saveProgress() { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) {} }
  function keyOf(mi, ei) { return C.modules[mi].id + ":" + ei; }
  function isViewed(mi, ei) { return !!progress[keyOf(mi, ei)]; }
  function markViewed(mi, ei) {
    const k = keyOf(mi, ei);
    if (!progress[k]) { progress[k] = 1; saveProgress(); }
    const item = document.querySelector('.exp-item[data-mi="' + mi + '"][data-ei="' + ei + '"]');
    if (item) item.classList.add("viewed");
    updateProgressUI();
  }
  function updateProgressUI() {
    const done = Object.keys(progress).length, total = C.totalExperiments;
    document.getElementById("progress-text").textContent = done + " / " + total;
    document.getElementById("progress-fill").style.width = (total ? (done / total * 100) : 0) + "%";
  }
  function setupProgressReset() {
    document.getElementById("reset-progress").addEventListener("click", function () {
      progress = {}; saveProgress();
      document.querySelectorAll(".exp-item.viewed").forEach(x => x.classList.remove("viewed"));
      updateProgressUI();
    });
  }

  // ---------- 主題 ----------
  function setupTheme() {
    const btn = document.getElementById("theme-btn");
    function apply(t) {
      document.documentElement.setAttribute("data-theme", t);
      btn.textContent = t === "light" ? "☀️" : "🌙";
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", t === "light" ? "#f4f6fb" : "#0d1117");
    }
    apply(document.documentElement.getAttribute("data-theme") || "dark");
    btn.addEventListener("click", function () {
      const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(cur); try { localStorage.setItem("pl-theme", cur); } catch (e) {}
    });
  }

  // ---------- 手機選單 ----------
  function setupMobile() {
    const toggle = document.getElementById("menu-toggle"), scrim = document.getElementById("scrim");
    toggle.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("open");
      scrim.classList.toggle("show");
    });
    scrim.addEventListener("click", closeMobile);
  }
  function closeMobile() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("scrim").classList.remove("show");
  }

  // ---------- PWA ----------
  function registerSW() {
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0)
      window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
  function setupInstall() {
    let deferred = null;
    const btn = document.getElementById("install-btn");
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; btn.style.display = ""; });
    btn.addEventListener("click", function () {
      if (!deferred) return; deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; btn.style.display = "none"; });
    });
    window.addEventListener("appinstalled", function () { btn.style.display = "none"; });
  }
})();
