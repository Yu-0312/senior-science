/*
 * sim-record.js — 實驗記錄表
 *
 * 做實驗的基本動作是「改一個條件、記一行數據、再改、再記」，最後從表格裡找規律。
 * 原本只有「匯出讀數」一次存一個瞬間，學生得自己抄在紙上。這裡在讀數下方加一張表：
 *   記一行   把目前的滑桿值與數值讀數存成一列
 *   套用     點某一列，滑桿回到當時的設定（等於「保存參數」）
 *   清空／下載 CSV
 * 紀錄存在學生自己的瀏覽器（localStorage，每個實驗一份），換頁回來還在。
 * 教師演示版與演示模式不顯示（CSS 已把非實驗台區塊收起），不改動那兩種版面。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL || !PL._hooks) return;
  const el = PL.el;
  const MAX_ROWS = 60, MAX_SLIDERS = 3, MAX_READOUTS = 3;

  const load = key => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const save = (key, rows) => { try { localStorage.setItem(key, JSON.stringify(rows)); } catch (e) {} };
  /*
   * 讀數算不出來時 number 是 null（畫面顯示「—」）。isFinite(null) 會是 true（null 轉成 0），
   * 以前因此把 null 交給 fmt 而整頁報錯；一律先確認是數字。
   */
  const isNum = v => typeof v === "number" && isFinite(v);
  const num = (v, d) => (isNum(v) ? PL.fmt(v, d) : "—");

  function build(context) {
    const root = context.root;
    const sliders = (context.sliders || []).slice(0, MAX_SLIDERS);
    const readouts = (context.readouts || []).filter(r => r.number != null).slice(0, MAX_READOUTS);
    if (!sliders.length || !readouts.length || root.querySelector(":scope > .sim-record")) return;

    const key = "pl-record-" + context.id;
    let rows = load(key).filter(r => r && Array.isArray(r.s) && Array.isArray(r.r));
    const cols = sliders.map(s => ({ label: s.label, unit: s.unit, digits: s.digits }))
      .concat(readouts.map(r => ({ label: r.label, unit: r.unit, digits: 3 })));
    // 實驗改版、欄位變了，舊紀錄就對不上了：直接作廢，免得數字錯欄
    const sig = cols.map(c => c.label).join("|");
    rows = rows.filter(r => r.sig === sig);

    const panel = el("section", "sim-record");
    panel.setAttribute("aria-label", "実験の記録表");
    const head = el("div", "sim-record-head", panel);
    const title = el("span", "sim-panel-title", head); title.textContent = "実験の記録";
    const count = el("span", "sim-panel-hint", head);
    const acts = el("div", "sim-record-actions", panel);
    const btn = (text, cls, fn, title) => { const b = el("button", "sim-record-btn" + (cls ? " " + cls : ""), acts); b.type = "button"; b.textContent = text; if (title) b.title = title; b.addEventListener("click", fn); return b; };
    btn("1 行記録", "primary", add, "いまのパラメータと測定値を 1 行に保存します");
    const undoBtn = btn("最後の行を消す", "", () => { rows.pop(); commit(); });
    const clearBtn = btn("消す", "", () => { rows = []; commit(); });
    const csvBtn = btn("CSV", "", download, "CSV でダウンロードして、表計算ソフトでグラフを作れます");
    const hint = el("p", "sim-record-hint", panel);
    hint.textContent = "パラメータを決めたら「1 行記録」を押し、条件を変えてまた記録します。表の行をクリックすると、スライダーがそのときの設定に戻ります。";
    const wrap = el("div", "sim-record-table", panel);
    const table = el("table", null, wrap);
    const thead = el("thead", null, table), tr = el("tr", null, thead);
    el("th", null, tr).textContent = "#";
    cols.forEach((c, i) => {
      const th = el("th", i < sliders.length ? "is-param" : null, tr);
      th.textContent = c.label + (c.unit ? "（" + c.unit + "）" : "");
      th.scope = "col";
    });
    const tbody = el("tbody", null, table);

    function add() {
      const row = { sig, s: sliders.map(s => s.read()), r: readouts.map(r => r.number) };
      rows.push(row);
      if (rows.length > MAX_ROWS) rows.shift();
      commit();
      const last = tbody.lastElementChild;
      if (last && last.scrollIntoView) last.scrollIntoView({ block: "nearest" });
    }
    function apply(row) {
      // 套用參數：逐根滑桿寫回（write 會觸發實驗自己的 onInput，畫面與讀數跟著更新）
      sliders.forEach((s, i) => { if (isNum(row.s[i])) s.write(row.s[i]); });
    }
    function commit() { save(key, rows); render(); }
    function render() {
      tbody.innerHTML = "";
      rows.forEach((row, i) => {
        const r = el("tr", null, tbody);
        r.tabIndex = 0;
        r.title = "クリックでスライダーをこの行の設定に戻す";
        el("td", "idx", r).textContent = String(i + 1);
        row.s.forEach((v, k) => { el("td", "is-param", r).textContent = num(v, cols[k].digits); });
        row.r.forEach((v, k) => { el("td", null, r).textContent = num(v, 3); });
        r.addEventListener("click", () => apply(row));
        r.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apply(row); } });
      });
      count.textContent = rows.length ? rows.length + " 行" : "まだ記録していない";
      wrap.hidden = !rows.length;
      hint.hidden = rows.length > 0;
      undoBtn.disabled = clearBtn.disabled = csvBtn.disabled = !rows.length;
    }
    function download() {
      const q = v => '"' + String(v).replace(/"/g, '""') + '"';
      const lines = [["#"].concat(cols.map(c => c.label + (c.unit ? " (" + c.unit + ")" : ""))).map(q).join(",")];
      rows.forEach((row, i) => lines.push([i + 1].concat(row.s, row.r).map(v => q(v == null ? "" : v)).join(",")));
      const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "physics-lab-" + context.id + "-records.csv";
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    render();

    // 排在結果圖後面（CSS 用 order 定位）：有了幾列數據，往上看一眼曲線就能對照
    root.appendChild(panel);
  }

  PL._hooks.onBuilt(context => {
    // 讀數在建置當下還是「—」，第一幀畫完才有數字；等一下再決定哪些欄位是數值
    let tries = 0;
    const attempt = () => {
      if (!context.root.isConnected && tries > 0) return;
      const ready = (context.readouts || []).some(r => r.number != null);
      if (!ready && ++tries < 6) { setTimeout(attempt, 400); return; }
      try { build(context); } catch (e) { console.warn("実験の記録表の作成に失敗", e); }
    };
    setTimeout(attempt, 0);
  });
})();
