/*
 * lab-circuit.js — 自訂實驗室的直流電路求解
 *
 * 節點電壓法（MNA 的純電阻版）：每個接線柱是一個節點，元件與導線都當成電導。
 *   · 導線 0.002 Ω：不把兩端節點合併，才算得出每一條導線上的電流（畫流動光點要用），
 *     也讓「導線直接接電池兩極」算出真實的短路電流，而不是除以零
 *   · 電池用諾頓等效：E/r 的電流源並聯內阻 r，避開理想電壓源的矩陣擴充
 *   · 安培計 0.01 Ω、伏特計 10 MΩ、開關閉合 0.001 Ω／斷開不連
 *   · 每個節點對地加 1e-9 S：沒接好的懸空零件不會讓矩陣奇異
 * 跟電路工坊（circuit-sandbox）同一套假設，只是元件數量與接法完全由使用者決定。
 */
(function (root) {
  "use strict";
  const LAB = root.PhysicsLabLab = root.PhysicsLabLab || {};

  const R_WIRE = 0.002, R_AMMETER = 0.01, R_VOLTMETER = 1e7, R_SWITCH = 0.001, GMIN = 1e-9;

  /*
   * comps: [{ id, kind, t: [keyA, keyB], R?, E?, r?, closed? }]
   *   kind: battery（t[0] 為 +、t[1] 為 −）、resistor、bulb、ammeter、voltmeter、switch
   * wires: [[keyA, keyB], ...]
   * 回傳 { V: {key: volt}, comp: {id: {I, V, P}}, wire: [I...] }，
   * 元件電流 I 的方向：由 t[0] 經元件流向 t[1]（電池則是由 − 經電池內部流向 +，即放電電流）。
   */
  function solve(comps, wires) {
    const idx = new Map();
    const node = k => { if (!idx.has(k)) idx.set(k, idx.size); return idx.get(k); };
    comps.forEach(c => c.t.forEach(node));
    wires.forEach(w => { node(w[0]); node(w[1]); });
    const n = idx.size;
    const out = { V: {}, comp: {}, wire: [] };
    if (!n) return out;
    const Gm = Array.from({ length: n }, () => new Float64Array(n));
    const I = new Float64Array(n);
    const stamp = (a, b, g) => { Gm[a][a] += g; Gm[b][b] += g; Gm[a][b] -= g; Gm[b][a] -= g; };
    const condOf = c => {
      if (c.kind === "battery") return 1 / Math.max(0.01, c.r || 0.1);
      if (c.kind === "ammeter") return 1 / R_AMMETER;
      if (c.kind === "voltmeter") return 1 / R_VOLTMETER;
      if (c.kind === "switch") return c.closed ? 1 / R_SWITCH : 0;
      if (c.kind === "open") return 0;
      return 1 / Math.max(1e-4, c.R);
    };
    comps.forEach(c => {
      const a = node(c.t[0]), b = node(c.t[1]), g = condOf(c);
      if (g) stamp(a, b, g);
      if (c.kind === "battery") {
        // 諾頓：電流源 E/r 由 − 端流入電池、從 + 端流出
        const isrc = (c.E || 0) * g;
        I[a] += isrc; I[b] -= isrc;
      }
    });
    wires.forEach(w => stamp(node(w[0]), node(w[1]), 1 / R_WIRE));
    for (let i = 0; i < n; i++) Gm[i][i] += GMIN;

    // 高斯消去（部分選主元）
    const A = Gm.map(r => Array.from(r)), x = Array.from(I);
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      if (Math.abs(A[piv][col]) < 1e-18) continue;
      if (piv !== col) { [A[piv], A[col]] = [A[col], A[piv]]; [x[piv], x[col]] = [x[col], x[piv]]; }
      for (let r = col + 1; r < n; r++) {
        const f = A[r][col] / A[col][col];
        if (!f) continue;
        for (let k = col; k < n; k++) A[r][k] -= f * A[col][k];
        x[r] -= f * x[col];
      }
    }
    const V = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let s = x[r];
      for (let k = r + 1; k < n; k++) s -= A[r][k] * V[k];
      V[r] = Math.abs(A[r][r]) > 1e-18 ? s / A[r][r] : 0;
    }
    idx.forEach((i, k) => { out.V[k] = V[i]; });

    comps.forEach(c => {
      const va = V[node(c.t[0])], vb = V[node(c.t[1])], g = condOf(c);
      let i;
      if (c.kind === "battery") i = ((c.E || 0) - (va - vb)) * g;   // 放電電流（− → + 內部）
      else i = (va - vb) * g;
      const v = va - vb;
      out.comp[c.id] = { I: i, V: v, P: c.kind === "battery" ? (c.E || 0) * i - i * i / g : v * i };
    });
    out.wire = wires.map(w => (out.V[w[0]] - out.V[w[1]]) / R_WIRE);
    return out;
  }

  LAB.circuit = { solve, R_WIRE, R_AMMETER, R_VOLTMETER };
})(typeof window !== "undefined" ? window : globalThis);
