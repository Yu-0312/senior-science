/*
 * extension-registry.js — 可持續擴充的課程目錄
 *
 * 每個擴充檔可呼叫 PhysicsLabCurriculum.extendCatalog(source, additions)。
 * additions 是 { moduleId: [experiment, ...] }，沒有數量上限；統計資料會
 * 自動重新計算，並在載入 app.js 前成為搜尋、導覽與進度的一部分。
 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  if (!C || C.extendCatalog) return;

  const sources = [];
  const total = () => C.modules.reduce((sum, module) => sum + module.experiments.length, 0);
  const interactive = () => C.modules.reduce((sum, module) => sum + module.experiments.filter(experiment => experiment.interactive).length, 0);

  function refreshTotals() {
    C.totalModules = C.modules.length;
    C.totalExperiments = total();
    C.totalInteractive = interactive();
  }

  function validateExperiment(experiment, moduleId, knownIds) {
    if (!experiment || typeof experiment !== "object") throw new Error(moduleId + " に無効な実験データがあります。");
    if (!experiment.id || typeof experiment.id !== "string") throw new Error(moduleId + " の実験に id がありません。");
    if (knownIds.has(experiment.id)) throw new Error("実験 id が重複しています：" + experiment.id);
    ["title", "concept", "formula"].forEach(key => {
      if (!experiment[key] || typeof experiment[key] !== "string") throw new Error(experiment.id + " に次の項目がありません：" + key + "。");
    });
    if (!Array.isArray(experiment.points) || !experiment.points.length) throw new Error(experiment.id + " に学習のポイントがありません。");
    knownIds.add(experiment.id);
  }

  C.extendCatalog = function extendCatalog(source, additions) {
    if (!source || typeof source !== "string") throw new Error("追加データには名前が必要です。");
    if (!additions || typeof additions !== "object") throw new Error("追加データは単元 id ごとに分けてください。");
    const knownIds = new Set(C.modules.flatMap(module => module.experiments.map(experiment => experiment.id)));
    const staged = [];

    Object.entries(additions).forEach(([moduleId, experiments]) => {
      const module = C.modules.find(item => item.id === moduleId);
      if (!module) throw new Error("単元が見つかりません：" + moduleId);
      if (!Array.isArray(experiments)) throw new Error(moduleId + " の追加データは配列にしてください。");
      experiments.forEach(experiment => {
        validateExperiment(experiment, moduleId, knownIds);
        staged.push({ module, experiment: Object.assign({ interactive: true }, experiment) });
      });
    });

    staged.forEach(({ module, experiment }) => module.experiments.push(experiment));
    refreshTotals();
    sources.push({ source, experiments: staged.length, total: C.totalExperiments });
    return { source, added: staged.length, total: C.totalExperiments, interactive: C.totalInteractive };
  };

  C.recalculateTotals = refreshTotals;
  C.catalogExtensions = () => sources.slice();
  refreshTotals();
})();
