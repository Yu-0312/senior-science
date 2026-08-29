/*
 * sim-insight.js — 自動探測引擎與學習鷹架
 *
 * 要解決的問題：
 *   學生打開一個實驗、把滑桿拉一拉，畫面確實會動，但他不知道「應該看什麼」，
 *   也不知道「怎樣算做完了」。原本的任務導讀與實驗流程只有 8 種版本在服務
 *   245 個實驗，同一個模組裡看到的文字一模一樣，等於沒有指引。
 *
 * 解法的關鍵觀察：
 *   模擬本身就知道答案。每個實驗都有滑桿（自變量）與讀數（應變量），
 *   只要程式化地掃描滑桿並記錄讀數，就能量出這個實驗真正的物理關係——
 *   包括「哪個變因影響最大」「是幾次方關係」「哪個變因根本沒有影響」。
 *   這些全部由模型自己算出來，不需要為 245 個實驗逐一撰寫答案。
 *
 * 建立在探測結果上的三個功能：
 *   1. 先預測再操作（POE）：先問學生方向，再用真實數據揭曉。
 *      「先承諾一個預測」是物理教育研究中證據最強的介入之一。
 *   2. 可驗證的挑戰：自動產生具體目標並自動判定達成。
 *   3. 關係摘要：直接列出 T ∝ √L 這類冪次關係與「不影響」的變因。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL || !PL._hooks) return;

  const el = PL.el;

  /* =======================================================================
     探測引擎
     ======================================================================= */

  const SAMPLES = 5;                 // 每個滑桿取樣點數
  const FLAT_THRESHOLD = 0.015;      // 相對變化小於 1.5% 視為「沒有影響」
  const MAX_SLIDERS = 6;             // 超過就只測前幾個，避免建置變慢

  // 讀數存的是格式化字串（"1.42"、"—"、"超量程"），取出可用的數值
  function numeric(text) {
    if (typeof text === "number") return isFinite(text) ? text : null;
    if (typeof text !== "string") return null;
    const m = text.replace(/,/g, "").match(/-?\d+(\.\d+)?([eE][+-]?\d+)?/);
    if (!m) return null;
    const v = Number(m[0]);
    return isFinite(v) ? v : null;
  }

  /*
   * 以 log–log 迴歸求冪次律指數：y ∝ x^n。
   * 只有在兩軸都為正、且擬合度極高時才回報，避免把巧合當成定律。
   */
  function powerLaw(points) {
    const usable = points.filter(p => p.x > 1e-9 && p.y > 1e-9);
    if (usable.length < 3) return null;
    const n = usable.length;
    let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
    usable.forEach(p => {
      const lx = Math.log(p.x), ly = Math.log(p.y);
      sx += lx; sy += ly; sxy += lx * ly; sxx += lx * lx; syy += ly * ly;
    });
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-12) return null;
    const slope = (n * sxy - sx * sy) / denom;
    const varY = n * syy - sy * sy;
    if (varY <= 1e-12) return null;
    const r2 = Math.pow(n * sxy - sx * sy, 2) / (denom * varY);
    return { exponent: slope, r2 };
  }

  // 把 0.5、-0.5、1、2、-1、-2、3 這些常見指數說成人話
  function describeExponent(n) {
    const named = [
      [1, "成正比"], [2, "與平方成正比"], [3, "與立方成正比"],
      [0.5, "與平方根成正比"], [-1, "成反比"], [-2, "與平方成反比"], [-0.5, "與平方根成反比"]
    ];
    for (const [value, text] of named) {
      if (Math.abs(n - value) < 0.06) return text;
    }
    return null;
  }

  function formatExponent(n) {
    const rounded = [1, 2, 3, 0.5, -1, -2, -0.5, -3].find(v => Math.abs(n - v) < 0.06);
    if (rounded === 0.5) return "√";
    if (rounded === -0.5) return "1/√";
    if (rounded != null) return rounded === 1 ? "" : "^" + rounded;
    return "^" + n.toFixed(2);
  }

  /*
   * 掃描一個實驗，量出每個滑桿對每個讀數的影響。
   * 注意：探測會暫時改動滑桿，結束後一定要還原，否則學生一進來看到的
   * 就不是實驗設計者安排的初始狀態。
   */
  /*
   * 把一組滑桿寫回指定值。
   *
   * 為什麼要跑兩輪
   * --------------
   * 由來：氣體實驗的「分子數」滑桿在 onInput 裡重新灑點，而灑點的範圍
   * 由「活塞位置」滑桿決定。單輪還原是照滑桿順序寫回去的，分子數若排在
   * 活塞前面，重新灑點時活塞還停在掃描的最後一個值（0.98），分子就被灑到
   * 活塞右側；接著活塞才被還原成 0.78，那些分子便落在活塞外面。
   *
   * 這不是氣體實驗特有的問題：只要有任何一支滑桿的 onInput 讀取另一支
   * 滑桿的狀態，還原順序就會決定結果對不對，而探測引擎會掃過每一支滑桿，
   * 等於必定會踩到。第二輪重寫時所有滑桿都已在原位，任何跨滑桿的重算
   * 都會拿到一致的狀態。
   *
   * write() 每次都會觸發 onInput（即使值沒變），所以第二輪確實會重算。
   */
  function restoreSliders(sliders, values, rerender) {
    for (let pass = 0; pass < 2; pass += 1) {
      sliders.forEach((s, i) => { try { s.write(values[i]); } catch (err) {} });
    }
    if (rerender) { try { rerender(); } catch (e) {} }
  }

  function probe(context, api) {
    const sliders = context.sliders.slice(0, MAX_SLIDERS);
    const readouts = context.readouts;
    if (!sliders.length || !readouts.length) return null;
    const rerender = api && typeof api.rerender === "function" ? api.rerender : null;
    if (!rerender) return null;

    // 優先用未格式化的原始數值，讀不到才退回解析顯示字串
    const snapshot = () => readouts.map(r => (r.number != null ? r.number : numeric(r.value)));
    const relations = [];

    // 先記住每個滑桿的原始值，最後整批還原
    const originals = sliders.map(s => s.read());

    function readAt(slider, value) {
      slider.write(value);
      rerender();
      // 回讀實際值：滑桿有 step，寫入 475 可能被吸附成 480。
      return { x: slider.read(), values: snapshot() };
    }

    try {
      // 基準：確認哪些讀數是「同樣輸入會得到同樣輸出」的（排除隨時間變動的讀數）
      const baseA = snapshot();
      rerender();
      const baseB = snapshot();
      const deterministic = readouts.map((r, i) =>
        baseA[i] != null && baseB[i] != null &&
        (baseA[i] === baseB[i] || Math.abs(baseA[i] - baseB[i]) <= Math.abs(baseA[i]) * 1e-6));

      sliders.forEach((slider, si) => {
        if (!isFinite(slider.min) || !isFinite(slider.max) || slider.max <= slider.min) return;
        const xs = [], series = readouts.map(() => []);
        for (let i = 0; i < SAMPLES; i += 1) {
          const target = slider.min + (slider.max - slider.min) * (i / (SAMPLES - 1));
          const sample = readAt(slider, target);
          xs.push(sample.x);
          sample.values.forEach((v, ri) => series[ri].push(v));
        }
        // 掃完就把這支滑桿放回原位。否則下一支滑桿會在「上一支停在最大值」的
        // 狀態下量測，等於每次的工作點都不同，量出來的關係會受掃描順序影響。
        slider.write(originals[si]);

        readouts.forEach((readout, ri) => {
          if (!deterministic[ri]) return;
          const ys = series[ri];
          if (ys.some(v => v == null)) return;
          const first = ys[0], last = ys[ys.length - 1];
          const span = Math.max(...ys) - Math.min(...ys);
          const scale = Math.max(...ys.map(Math.abs));
          if (scale < 1e-12) return;
          const relative = span / scale;

          // 單調性：相鄰差值是否維持同一個方向
          let up = 0, down = 0;
          for (let i = 1; i < ys.length; i += 1) {
            const d = ys[i] - ys[i - 1];
            if (d > Math.abs(ys[i - 1]) * 1e-6) up += 1;
            else if (d < -Math.abs(ys[i - 1]) * 1e-6) down += 1;
          }
          let direction;
          if (relative < FLAT_THRESHOLD) direction = "flat";
          else if (down === 0 && up > 0) direction = "up";
          else if (up === 0 && down > 0) direction = "down";
          else direction = "peak";                   // 非單調：有極大或極小值

          const fit = direction === "up" || direction === "down"
            ? powerLaw(xs.map((x, i) => ({ x, y: ys[i] }))) : null;

          relations.push({
            slider, readout, direction, relative,
            first, last,
            min: Math.min(...ys), max: Math.max(...ys),
            xs: xs.slice(), ys: ys.slice(),
            // 只有擬合極好才敢說是幾次方關係
            exponent: fit && fit.r2 > 0.995 ? fit.exponent : null,
            r2: fit ? fit.r2 : null
          });
        });
      });
    } catch (e) {
      console.warn("模型探測失敗", e);
    } finally {
      /*
       * 還原要跑兩輪，不是一輪。
       *
       * 由來：氣體實驗的「分子數」滑桿在 onInput 裡重新灑點，而灑點的範圍
       * 由「活塞位置」滑桿決定。單輪還原是照滑桿順序寫回去的，分子數排在
       * 活塞前面——所以重新灑點時活塞還停在掃描的最後一個值（0.98），
       * 分子被灑到活塞右側；接著活塞才被還原成 0.78，那些分子就落在活塞外面。
       *
       * 這不是氣體實驗特有的問題：只要有任何一支滑桿的 onInput 讀取另一支
       * 滑桿的狀態，還原順序就會決定結果對不對。第二輪重寫時所有滑桿都已
       * 在原位，任何跨滑桿的重算都會拿到一致的狀態。
       *
       * write() 每次都會觸發 onInput（即使值沒變），所以第二輪確實會重算。
       */
      restoreSliders(sliders, originals, rerender);
    }

    if (!relations.length) return null;

    /*
     * 過濾一：讀數只是把滑桿數值原樣顯示出來
     * 例如「低溫 T𝚌」滑桿配上「低溫 T𝚌」讀數，會產生
     * 「低溫 T𝚌 增加時 低溫 T𝚌 變大」這種毫無資訊的敘述。
     */
    const useful = relations.filter(r => {
      const echo = r.xs.every((x, i) => Math.abs(r.ys[i] - x) <= Math.abs(x) * 1e-6 + 1e-9);
      return !echo;
    });
    if (!useful.length) return null;

    /*
     * 過濾二：把「夾在上下限」誤判成物理定律
     *
     * 探測時其他滑桿都停在預設值。如果模型在這個工作點剛好飽和
     * （例如浮力實驗裡物體已經完全沒入，沒入比例卡在 100%），
     * 掃描另一個滑桿就會看到「完全沒有變化」，於是被當成
     * 「這個變因不影響結果」——但那其實是被夾住，不是物理無關。
     *
     * 因此對每一個「沒有變化」的組合，換一個工作點再驗證一次：
     * 把其他滑桿移到行程的 35% 與 70% 各重測，三個工作點都平坦
     * 才承認它是真正的不變性。
     */
    const flats = useful.filter(r => r.direction === "flat");
    if (flats.length) {
      const originalsNow = sliders.map(s => s.read());
      try {
        [0.35, 0.7].forEach(fraction => {
          sliders.forEach(s => s.write(s.min + (s.max - s.min) * fraction));
          flats.forEach(r => {
            if (r.confirmedFlat === false) return;
            const ys = [];
            for (let i = 0; i < SAMPLES; i += 1) {
              const x = r.slider.min + (r.slider.max - r.slider.min) * (i / (SAMPLES - 1));
              ys.push(readAt(r.slider, x).values[readouts.indexOf(r.readout)]);
            }
            if (ys.some(v => v == null)) { r.confirmedFlat = false; return; }
            const scale = Math.max(...ys.map(Math.abs));
            const rel = scale < 1e-12 ? 0 : (Math.max(...ys) - Math.min(...ys)) / scale;
            if (rel >= FLAT_THRESHOLD) r.confirmedFlat = false;
            else if (r.confirmedFlat !== false) r.confirmedFlat = true;
          });
        });
      } catch (e) {
        flats.forEach(r => { r.confirmedFlat = false; });
      } finally {
        restoreSliders(sliders, originalsNow, rerender);
      }
      // 沒通過複驗的，降級成「在目前設定下沒有變化」，不當成定律陳述
      flats.forEach(r => { if (!r.confirmedFlat) r.direction = "clamped"; });
    }

    // 主關係：變化幅度最大、且是單調的那一組，最適合拿來出預測題
    const monotonic = useful.filter(r => r.direction === "up" || r.direction === "down");
    const primary = (monotonic.length ? monotonic : useful)
      .slice().sort((a, b) => b.relative - a.relative)[0];

    /*
     * 有教學價值的不變性：這個讀數對「別的」變因有明顯反應，卻獨獨對這一個沒有。
     * 若某個讀數對所有變因都沒反應，多半只是常數顯示，講出來反而干擾。
     */
    const strength = new Map();
    useful.forEach(r => {
      if (r.direction !== "up" && r.direction !== "down") return;
      strength.set(r.readout, Math.max(strength.get(r.readout) || 0, r.relative));
    });
    const invariants = useful
      .filter(r => r.direction === "flat" && (strength.get(r.readout) || 0) > 0.25)
      // 該讀數對別的變因反應越強，「唯獨這一個沒有影響」就越值得指出
      .sort((a, b) => (strength.get(b.readout) || 0) - (strength.get(a.readout) || 0))
      .slice(0, 2);

    return { relations: useful, primary, invariants, sliders, readouts };
  }

  /* =======================================================================
     介面
     ======================================================================= */

  const fmtValue = (v, digits) => PL.fmt(v, digits == null ? 2 : digits);

  function describeRelation(r) {
    const x = r.slider.label, y = r.readout.label;
    const unit = r.readout.unit ? " " + r.readout.unit : "";
    if (r.direction === "flat") {
      return y + " 幾乎不受 " + x + " 影響（全程維持在 " + fmtValue(r.first) + unit + "）";
    }
    if (r.direction === "clamped") {
      return y + " 在目前的其他設定下沒有變化（停在 " + fmtValue(r.first) + unit +
        "，換個工作點就會變，屬於範圍限制而非物理無關）";
    }
    if (r.direction === "peak") {
      return y + " 隨 " + x + " 先後變化方向不同，中間出現極值（最大 " + fmtValue(r.max) + unit + "）";
    }
    const word = r.direction === "up" ? "變大" : "變小";
    const named = r.exponent != null ? describeExponent(r.exponent) : null;
    const tail = named ? "（" + y + " " + named + "）" : "";
    return x + " 增加時 " + y + " " + word +
      "：" + fmtValue(r.first) + unit + " → " + fmtValue(r.last) + unit + tail;
  }

  /* ---------------- 1. 先預測再操作（POE） ---------------- */
  function buildPredictPanel(context, insight) {
    const r = insight.primary;
    if (!r || r.direction === "peak" || r.direction === "clamped") return null;

    const storeKey = "pl-predict-" + context.id;
    let answered = null;
    try { answered = JSON.parse(localStorage.getItem(storeKey)); } catch (e) {}

    const panel = el("section", "sim-predict");
    const head = el("div", "sim-predict-head", panel);
    const kicker = el("span", "sim-predict-kicker", head);
    kicker.textContent = "動手前先預測";
    const note = el("span", "sim-predict-note", head);
    note.textContent = "先承諾一個答案，操作時才會真的在「檢查」";

    const question = el("p", "sim-predict-question", panel);
    question.textContent = "把「" + r.slider.label + "」從 " +
      fmtValue(r.slider.min, r.slider.digits) + " 調到 " + fmtValue(r.slider.max, r.slider.digits) +
      (r.slider.unit ? " " + r.slider.unit : "") +
      "，「" + r.readout.label + "」會怎麼變？";

    const options = [
      { key: "up", text: "變大" },
      { key: "down", text: "變小" },
      { key: "flat", text: "幾乎不變" }
    ];
    const choices = el("div", "sim-predict-choices", panel);
    const result = el("div", "sim-predict-result", panel);
    result.hidden = true;

    function reveal(picked) {
      const correct = picked === r.direction;
      result.hidden = false;
      result.innerHTML = "";
      result.classList.toggle("is-correct", correct);
      const verdict = el("strong", null, result);
      verdict.textContent = correct ? "預測正確。" : "和實際不同。";
      const detail = el("span", null, result);
      const unit = r.readout.unit ? " " + r.readout.unit : "";
      const change = r.first !== 0 ? Math.abs((r.last - r.first) / r.first) * 100 : null;
      detail.textContent = "實際上 " + r.readout.label + " 從 " + fmtValue(r.first) + unit +
        " 變成 " + fmtValue(r.last) + unit +
        (change != null && isFinite(change) && r.direction !== "flat"
          ? "（" + (r.direction === "up" ? "增加" : "減少") + " " + change.toFixed(0) + "%）" : "") + "。";
      if (r.exponent != null) {
        const law = el("span", "sim-predict-law", result);
        const named = describeExponent(r.exponent);
        law.textContent = named
          ? r.readout.label + " " + named + "於 " + r.slider.label +
            "（" + r.readout.label + " ∝ " + formatExponent(r.exponent) + r.slider.label + "）"
          : r.readout.label + " ∝ " + r.slider.label + formatExponent(r.exponent);
      }
      const cta = el("p", "sim-predict-cta", result);
      cta.textContent = "現在自己拉一次滑桿，確認畫面上的變化和這個數字一致。";
      Array.from(choices.children).forEach(b => {
        b.disabled = true;
        if (b.dataset.key === r.direction) b.classList.add("is-correct");
        else if (b.dataset.key === picked) b.classList.add("is-wrong");
      });
    }

    options.forEach(opt => {
      const b = el("button", "sim-predict-choice", choices);
      b.type = "button";
      b.textContent = opt.text;
      b.dataset.key = opt.key;
      b.addEventListener("click", () => {
        if (b.disabled) return;
        try { localStorage.setItem(storeKey, JSON.stringify(opt.key)); } catch (e) {}
        reveal(opt.key);
      });
    });

    // 已經預測過就直接顯示結果，不用再問一次
    if (answered === "up" || answered === "down" || answered === "flat") reveal(answered);

    return panel;
  }

  /* ---------------- 2. 可驗證的挑戰任務 ---------------- */
  function buildChallenge(context, insight) {
    const r = insight.primary;
    if (!r) return null;

    const unit = r.readout.unit ? " " + r.readout.unit : "";
    let target, describe, test;

    if (r.direction === "peak") {
      // 非單調：找極大值最有意思
      target = r.max;
      describe = "調整「" + r.slider.label + "」，讓「" + r.readout.label + "」達到最大值（約 " +
        fmtValue(target) + unit + "）";
      test = value => value >= target * 0.97;
    } else if (r.direction === "flat" || r.direction === "clamped") {
      return null;                       // 沒有可達成的目標
    } else {
      // 取行程中段附近的一個「好看的數字」當目標，避免剛好落在滑桿兩端
      const lo = Math.min(r.first, r.last), hi = Math.max(r.first, r.last);
      const raw = lo + (hi - lo) * 0.62;
      const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)) - 1);
      target = Math.round(raw / mag) * mag;
      if (target <= lo || target >= hi) target = raw;
      describe = "調整「" + r.slider.label + "」，讓「" + r.readout.label + "」達到 " +
        fmtValue(target) + unit + "（容差 ±3%）";
      test = value => Math.abs(value - target) <= Math.abs(target) * 0.03;
    }

    const storeKey = "pl-challenge-" + context.id;
    let cleared = false;
    try { cleared = !!JSON.parse(localStorage.getItem(storeKey)); } catch (e) {}

    const panel = el("section", "sim-challenge" + (cleared ? " is-cleared" : ""));
    const head = el("div", "sim-challenge-head", panel);
    const kicker = el("span", "sim-challenge-kicker", head);
    kicker.textContent = "挑戰任務";
    const state = el("span", "sim-challenge-state", head);
    state.textContent = cleared ? "已達成" : "未達成";

    const text = el("p", "sim-challenge-text", panel);
    text.textContent = describe;

    const meter = el("div", "sim-challenge-meter", panel);
    const meterFill = el("div", "sim-challenge-fill", meter);
    const live = el("p", "sim-challenge-live", panel);
    live.setAttribute("aria-live", "polite");

    function update() {
      const value = r.readout.number != null ? r.readout.number : numeric(r.readout.value);
      if (value == null) { live.textContent = "目前讀數：—"; return; }
      const ok = test(value);
      live.textContent = "目前「" + r.readout.label + "」= " + fmtValue(value) + unit +
        (ok ? "　✓ 達成" : "");
      panel.classList.toggle("is-hit", ok);
      // 進度條：離目標越近越滿
      let ratio = 0;
      if (r.direction === "peak") ratio = Math.max(0, Math.min(1, value / (r.max || 1)));
      else {
        const err = Math.abs(value - target) / (Math.abs(target) || 1);
        ratio = Math.max(0, Math.min(1, 1 - err / 0.6));
      }
      meterFill.style.width = (ratio * 100).toFixed(1) + "%";
      if (ok && !cleared) {
        cleared = true;
        panel.classList.add("is-cleared");
        state.textContent = "已達成";
        try { localStorage.setItem(storeKey, JSON.stringify(true)); } catch (e) {}
      }
    }

    // 學生每次動滑桿就重新判定
    context.sliders.forEach(s => s.el.addEventListener("input", update));
    panel._labUpdate = update;
    update();
    return panel;
  }

  /* ---------------- 3.「找出無關變因」謎題 ----------------
     PhET 的設計文件說：學生遇到看不懂的小機關，會一直玩到自己弄懂為止。
     探測引擎已經知道「哪一個變因對某個讀數完全沒有影響」，
     那正是一個有標準答案、又需要真的動手試才答得出來的謎題，
     同時它練的就是控制變因——只改一個、其他固定。
     ---------------------------------------------------------- */
  function buildPuzzle(context, insight) {
    const invariant = insight.invariants[0];
    if (!invariant) return null;
    // 只有兩個選項的話不算謎題
    if (insight.sliders.length < 3) return null;

    const storeKey = "pl-puzzle-" + context.id;
    let solved = false;
    try { solved = !!JSON.parse(localStorage.getItem(storeKey)); } catch (e) {}

    const panel = el("section", "sim-puzzle" + (solved ? " is-solved" : ""));
    const head = el("div", "sim-puzzle-head", panel);
    const kicker = el("span", "sim-puzzle-kicker", head);
    kicker.textContent = "小謎題";
    const state = el("span", "sim-puzzle-state", head);
    state.textContent = solved ? "已解開" : "未解開";

    const question = el("p", "sim-puzzle-question", panel);
    question.textContent = "這些參數當中，有一個不管怎麼調，「" + invariant.readout.label +
      "」都完全不會變。是哪一個？";

    const choices = el("div", "sim-puzzle-choices", panel);
    const result = el("p", "sim-puzzle-result", panel);
    result.hidden = !solved;
    if (solved) {
      result.classList.add("is-correct");
      result.textContent = "答案是「" + invariant.slider.label + "」。" + explain(invariant);
    }

    function explain(rel) {
      const others = insight.relations
        .filter(r => r.readout === rel.readout && (r.direction === "up" || r.direction === "down"))
        .slice(0, 2)
        .map(r => "「" + r.slider.label + "」");
      return others.length
        ? "同一個讀數對 " + others.join("、") + " 有明顯反應，唯獨對它沒有——這代表它不在這個物理關係裡。"
        : "在這個模型裡，它與該讀數沒有關係。";
    }

    insight.sliders.forEach(slider => {
      const b = el("button", "sim-puzzle-choice", choices);
      b.type = "button";
      b.textContent = slider.label;
      if (solved) {
        b.disabled = true;
        if (slider === invariant.slider) b.classList.add("is-correct");
      }
      b.addEventListener("click", () => {
        if (b.disabled) return;
        const right = slider === invariant.slider;
        result.hidden = false;
        result.classList.toggle("is-correct", right);
        if (right) {
          solved = true;
          try { localStorage.setItem(storeKey, JSON.stringify(true)); } catch (e) {}
          panel.classList.add("is-solved");
          state.textContent = "已解開";
          result.textContent = "答對了。" + explain(invariant);
          Array.from(choices.children).forEach(x => {
            x.disabled = true;
            if (x.textContent === invariant.slider.label) x.classList.add("is-correct");
          });
          // 解開後才把答案併入關係摘要
          if (context.revealInvariant) context.revealInvariant();
        } else {
          b.classList.add("is-wrong");
          b.disabled = true;
          result.textContent = "「" + slider.label + "」其實會影響「" + invariant.readout.label +
            "」。動手把它從最小拉到最大，看讀數有沒有變，再回來選一次。";
        }
      });
    });

    context.puzzleAnswer = invariant;
    context.puzzleSolved = () => solved;
    return panel;
  }

  /* ---------------- 4. 關係摘要 ---------------- */
  function buildSummary(context, insight) {
    const panel = el("section", "sim-relations");
    const head = el("details", "sim-relations-details", panel);
    const summary = el("summary", null, head);
    summary.textContent = "這個實驗量到的關係（由模型實測）";
    const list = el("ul", "sim-relations-list", head);

    // 依影響幅度排序，最重要的放最前面
    // 排序：先真正的不變性（最有教學價值），再依影響幅度，最後才是被夾住的組合
    const rank = r => r.direction === "flat" ? 3 : r.direction === "clamped" ? 0 : 2;
    const shown = insight.relations
      .slice()
      .filter(r => r.direction !== "flat" || insight.invariants.indexOf(r) >= 0)
      .sort((a, b) => (rank(b) - rank(a)) || (b.relative - a.relative))
      .slice(0, 6);

    /*
     * 謎題的答案就藏在這份摘要裡，因此在解開之前先把那一行遮住，
     * 否則學生只要展開摘要就能直接看到答案，謎題就沒有意義了。
     */
    const secret = context.puzzleAnswer;
    const rows = [];
    shown.forEach(r => {
      const li = el("li", "sim-relation" + (r.direction === "flat" ? " is-flat" : r.direction === "clamped" ? " is-clamped" : ""), list);
      if (secret && r === secret && !(context.puzzleSolved && context.puzzleSolved())) {
        li.classList.add("is-hidden-answer");
        li.textContent = "（有一個變因對「" + r.readout.label + "」沒有影響——先自己找找看，解開上面的小謎題就會顯示）";
      } else {
        li.textContent = describeRelation(r);
      }
      rows.push({ li, rel: r });
    });
    context.revealInvariant = () => {
      rows.forEach(({ li, rel }) => {
        if (secret && rel === secret) {
          li.classList.remove("is-hidden-answer");
          li.textContent = describeRelation(rel);
        }
      });
    };

    if (insight.invariants.length) {
      const foot = el("p", "sim-relations-foot", head);
      foot.textContent = "「幾乎不受影響」的組合特別值得注意——它告訴你哪些變因在這個模型裡是無關的。";
    }
    return panel;
  }

  /* ---------------- 具體化的任務導讀 ---------------- */
  function refineBrief(context, insight) {
    const root = context.root;
    const r = insight.primary;
    if (!r) return;
    // 「怎麼做」原本是依模組產生的通則，換成點名該動哪一個滑桿
    const steps = root.querySelectorAll(".sim-learning-step dd");
    if (steps && steps.length >= 1) {
      steps[0].textContent = "先只動「" + r.slider.label + "」這一個滑桿，從 " +
        fmtValue(r.slider.min, r.slider.digits) + " 拉到 " + fmtValue(r.slider.max, r.slider.digits) +
        (r.slider.unit ? " " + r.slider.unit : "") + "，其他都不要碰。";
    }
    if (steps && steps.length >= 2) {
      steps[1].textContent = "盯住讀數「" + r.readout.label + "」，看它往哪個方向變、變了多少倍。";
    }
  }

  /* =======================================================================
     掛載
     ======================================================================= */
  /* =======================================================================
     因果面板（自動生成）

     全站盤點發現有 88 個實驗的課綱條目明確在講因果與依賴關係
     （「與質量無關」「與√高度成正比」「由負載決定」），
     但畫面上完全沒有呈現這件事——學生只能自己從讀數猜。

     這裡不套模板寫空話，而是直接用探測引擎**實測出來的**關係生成：
     哪根滑桿讓這個讀數變大、變小、是幾次方、以及哪一根完全不影響。
     實測結果是這個模擬自己的行為，因此每一句都具體且為真。

     只有「話值得說」才會出現：至少要有兩條有效關係，
     或者有一個值得指出的不變性（該讀數明明對別的變因很敏感，唯獨這一個沒反應）。
     ======================================================================= */
  function buildCausality(context, insight) {
    /*
     * insight.primary 是「影響最大的那一條關係」，不是讀數本身。
     * 第一版把它當成讀數，filter 全部落空，面板一列都沒生成——
     * 而且不會報錯，只是安靜地什麼都不做。
     */
    /*
     * 實驗自己已經寫了因果面板就不要再加一個。
     * 手寫的那幾個（變壓器的「誰決定誰」、圓環的「兩個條件要分開看」）
     * 講的是自動探測看不出來的東西——例如電流的因果是副邊決定原邊，
     * 這不是量滑桿量得出來的。兩個面板並排只會互相稀釋。
     */
    if (context.root && context.root.querySelector &&
        context.root.querySelector(".sim-causality")) return null;

    const primary = insight.primary && insight.primary.readout;
    if (!primary) return null;

    const related = (insight.relations || []).filter(r => r.readout === primary);
    const drivers = related.filter(r => r.direction === "up" || r.direction === "down");
    const flats = related.filter(r => r.direction === "flat");
    const peaks = related.filter(r => r.direction === "peak");
    if (drivers.length + flats.length + peaks.length < 2) return null;
    if (drivers.length === 0) return null;

    // 影響最大的排前面：學生該先知道「主要由誰決定」
    drivers.sort((a, b) => b.relative - a.relative);

    const rows = [];
    drivers.slice(0, 3).forEach((r, i) => {
      rows.push({
        name: r.slider.label,
        tone: i === 0 ? "a" : "",
        note: (i === 0 ? "影響最大：" : "") +
          "把「" + r.slider.label + "」調大，「" + primary.label + "」" +
          (r.direction === "up" ? "跟著變大" : "反而變小") +
          (r.exponent != null ? "（" + describeExponent(r.exponent) + "）" : "") + "。"
      });
    });
    peaks.slice(0, 1).forEach(r => {
      rows.push({
        name: r.slider.label,
        tone: "c",
        note: "非單調：「" + primary.label + "」在中間出現極值，不是一路變大或變小——" +
          "這種變因要找的是極值位置，不是趨勢。"
      });
    });
    flats.slice(0, 2).forEach(r => {
      rows.push({
        name: r.slider.label,
        tone: "b",
        note: "完全不影響：不管怎麼調，「" + primary.label + "」都不變。" +
          "「沒有關係」本身就是結論，不是實驗做壞了。"
      });
    });
    if (rows.length < 2) return null;

    const wrap = el("div", "sim-insight-block");
    const api = PL.ui.causality(wrap, {
      title: "誰決定「" + primary.label + "」（由模擬實測）",
      rows
    });
    // 把量測到的數值填進去，讓面板不只有文字還有實際範圍
    let k = 0;
    drivers.slice(0, 3).forEach(r => {
      api.set(k++, r.slider.label + " " + PL.fmt(r.slider.min, 2) + " → " + PL.fmt(r.slider.max, 2) +
        "　得 " + primary.label + " " + PL.fmt(r.first, 3) + " → " + PL.fmt(r.last, 3));
    });
    peaks.slice(0, 1).forEach(r => {
      api.set(k++, "範圍內 " + primary.label + " 介於 " + PL.fmt(r.min, 3) + " ～ " + PL.fmt(r.max, 3));
    });
    flats.slice(0, 2).forEach(r => {
      api.set(k++, r.slider.label + " 全範圍　" + primary.label + " 固定為 " + PL.fmt(r.first, 3));
    });
    return wrap;
  }

  /* =======================================================================
     情境預設（自動生成）

     學生面對五根滑桿時最常見的行為是亂拉一通，然後什麼結論都沒得到。
     這裡用探測結果挑出「值得一看的操作點」，每一個都對應一個具體問題：

       主要變因拉到兩端 → 看清楚趨勢的兩個極端
       把不影響的變因拉到極端 → 親手驗證「它真的不影響」
       回到預設 → 隨時能回到設計者安排的起點

     第三個特別重要：不變性是最容易被當成「實驗做壞了」的結果，
     讓學生自己動手把那根滑桿推到底、看著讀數紋風不動，
     比在說明文字裡寫一句「與此無關」有說服力得多。
     ======================================================================= */
  function buildPresets(context, insight) {
    // 實驗自己已經安排了預設就不要再加，設計者的選擇優先
    if (context.root && context.root.querySelector &&
        context.root.querySelector(".sim-presets")) return null;

    const primary = insight.primary;
    if (!primary || !primary.slider) return null;
    const sliders = insight.sliders || [];
    if (sliders.length < 2) return null;

    const originals = sliders.map(s => s.read());
    const opts = [];

    const setOnly = (target, value) => () => {
      const ti = sliders.indexOf(target);
      restoreSliders(sliders, originals.map((v, i) => (i === ti ? value : v)));
    };

    opts.push({
      label: primary.slider.label + " 最小",
      hint: "把影響最大的變因推到下限，看趨勢的一端",
      apply: setOnly(primary.slider, primary.slider.min)
    });
    opts.push({
      label: primary.slider.label + " 最大",
      hint: "把影響最大的變因推到上限，和上一個對照",
      apply: setOnly(primary.slider, primary.slider.max)
    });

    const inv = (insight.invariants || [])[0];
    if (inv && inv.slider) {
      opts.push({
        label: "驗證「" + inv.slider.label + "」無關",
        hint: "把它推到上限——「" + inv.readout.label + "」應該完全不動",
        apply: setOnly(inv.slider, inv.slider.max)
      });
    }

    opts.push({
      label: "回到預設",
      hint: "回到設計者安排的起始狀態",
      apply: () => { restoreSliders(sliders, originals); }
    });

    const wrap = el("div", "sim-insight-block");
    PL.ui.presets(wrap, { label: "值得一看的操作點", options: opts });
    return wrap;
  }

  PL._hooks.onBuilt((context, api) => {
    let insight = null;
    try {
      insight = probe(context, api);
    } catch (e) {
      console.warn("學習鷹架建立失敗", e);
      return;
    }
    if (!insight) return;
    context.insight = insight;

    const host = el("div", "sim-insight");
    const predict = buildPredictPanel(context, insight);
    if (predict) host.appendChild(predict);
    const challenge = buildChallenge(context, insight);
    if (challenge) host.appendChild(challenge);
    const puzzle = buildPuzzle(context, insight);
    if (puzzle) host.appendChild(puzzle);
    host.appendChild(buildSummary(context, insight));
    const causal = buildCausality(context, insight);
    if (causal) host.appendChild(causal);
    const presets = buildPresets(context, insight);
    if (presets) host.appendChild(presets);

    // 放在任務導讀之後、實驗台之前：先知道要看什麼，再開始操作
    const brief = context.root.querySelector(".sim-learning-brief");
    if (brief && brief.parentNode) brief.parentNode.insertBefore(host, brief.nextSibling);
    else context.root.appendChild(host);

    refineBrief(context, insight);

    // 動畫每一格也更新挑戰判定（有些讀數會隨模擬時間改變）
    const previousTick = context.onTick;
    let acc = 0;
    context.onTick = (dt, t) => {
      if (previousTick) previousTick(dt, t);
      acc += dt;
      if (acc >= 0.2) { acc = 0; if (challenge && challenge._labUpdate) challenge._labUpdate(); }
    };
  });

  // 對外公開，方便測試與除錯
  window.PhysicsLabInsight = { probe, powerLaw, describeExponent, numeric };
})();
