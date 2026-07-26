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
      // 還原所有滑桿並重畫，確保學生看到的是原本設計的初始狀態
      sliders.forEach((s, i) => { try { s.write(originals[i]); } catch (err) {} });
      try { rerender(); } catch (e) {}
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
        sliders.forEach((s, i) => { try { s.write(originalsNow[i]); } catch (err) {} });
        try { rerender(); } catch (e) {}
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

  /* ---------------- 3. 關係摘要 ---------------- */
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

    shown.forEach(r => {
      const li = el("li", "sim-relation" + (r.direction === "flat" ? " is-flat" : r.direction === "clamped" ? " is-clamped" : ""), list);
      li.textContent = describeRelation(r);
    });

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
    host.appendChild(buildSummary(context, insight));

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
