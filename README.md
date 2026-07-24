# 物理實驗室 · 台灣高中互動物理

依教育部 **108 課綱**（自然科學領域—物理）設計的高中物理互動模擬網站，涵蓋**必修物理**與**選修物理（加深加廣）**。全站繁體中文、原創程式與教材，**每一個實驗都附即時 canvas 互動模擬**。

- **12** 個學習模組 · **69** 個實驗主題 · **69** 個可即時操作的互動模擬（100% 互動）
- 精緻**深色實驗室風**介面（玻璃質感、極光背景、漸層與微動效），並附**淺色主題**
- **首頁模組總覽**＋實驗**上一個／下一個**導覽＋**鍵盤方向鍵**切換
- 公式以 **LaTeX（MathJax）** 專業排版
- 全站**搜尋**、**學習進度**記錄、**列印**友善
- **PWA**：可安裝到桌面／手機、支援離線使用
- 免登入、免安裝、可直接部署為靜態網站

---

## 快速開始

用瀏覽器打開 `index.html` 即可。互動模擬在本機直接雙擊（`file://`）也能操作；但公式排版（MathJax）與離線快取需在**線上（http/https）** 環境或部署後才會完整生效。

本機起一個簡單伺服器（擇一）：

```bash
python3 -m http.server 8080      # 然後開 http://localhost:8080
# 或
npx serve .
```

---

## 12 個模組 · 69 個互動實驗

| 模組 | 互動實驗 |
| --- | --- |
| 一 運動學 | 等加速度直線運動、自由落體、拋體運動、相對運動、運動圖形分析 |
| 二 牛頓運動定律與力 | 慣性、F=ma、斜面受力、靜／動摩擦、連接體與張力、牛頓第三定律 |
| 三 動量與碰撞 | 一維碰撞、動量守恆、衝量、二維碰撞、反衝與爆炸 |
| 四 功與能量 | 功與功率、功能定理、軌道力學能守恆、重力／彈性位能、保守力 |
| 五 圓周運動與萬有引力 | 等速圓周運動、向心力、萬有引力、行星軌道、人造衛星、角動量守恆 |
| 六 簡諧運動 | 彈簧振子、單擺、位移–時間關係、簡諧能量、共振 |
| 七 流體與熱學 | 浮力、白努利、理想氣體、氣體定律、熱平衡與比熱、熱力學第一定律 |
| 八 波動與聲音 | 橫波與縱波、波的疊加、弦上駐波、都卜勒效應、拍、共鳴管 |
| 九 光學 | 反射與折射、面鏡成像、透鏡成像、雙縫干涉、單狹縫繞射、偏振、色散 |
| 十 電場與電路 | 庫侖定律、電場線與等勢面、電位、歐姆定律、電阻串並聯、電容器充放電 |
| 十一 磁場與電磁感應 | 載流導線磁場、勞侖茲力、電磁感應、楞次定律、交流發電機、變壓器 |
| 十二 近代物理與宇宙學 | 光電效應、波耳模型、物質波、狹義相對論、放射性半衰期、哈伯定律 |

---

## 檔案結構

```
physics-lab/
├─ index.html                  # 主頁（含 SEO、PWA、MathJax）
├─ manifest.json               # PWA 設定
├─ sw.js                       # Service Worker（離線快取）
├─ .nojekyll                   # 讓 GitHub Pages 原樣提供檔案
├─ .github/workflows/deploy.yml# 自動部署到 Pages
├─ icons/                      # 圖示（SVG + PNG 192/512）
├─ css/style.css               # 深／淺色主題樣式
└─ js/
   ├─ curriculum.js            # 12 模組 × 69 實驗課程資料（LaTeX 公式）
   ├─ sim-core.js              # 模擬引擎：畫布、控制項、動畫迴圈、繪圖與 Graph 座標系
   ├─ app.js                   # 導覽、搜尋、進度、主題、PWA、鍵盤
   └─ experiments/             # 12 個模組檔，共 69 個互動模擬
      ├─ kinematics.js  newton.js     momentum.js
      ├─ energy.js      gravity.js    shm.js
      ├─ thermal.js     waves.js      optics.js
      └─ electric.js    magnetism.js  modern.js
```

---

## 如何新增一個互動實驗

1. 在 `js/curriculum.js` 對應模組的 `experiments` 陣列加入資料（`id`、`title`、`concept`、`formula`、`points`，並設 `interactive: true`）。

2. 在對應模組檔（例如 `js/experiments/optics.js`）用引擎註冊模擬：

```js
PhysicsLab.register("your-id", {
  build(root) {
    const L = PhysicsLab.ui.layout(root);
    const cv = PhysicsLab.canvas.create(L.canvasWrap, 0.6);   // 響應式高解析畫布
    const s = PhysicsLab.ui.slider(L.controls, { label: "參數", min: 0, max: 10, value: 5, onInput: draw });
    const r = PhysicsLab.ui.readout(L.readouts, { label: "輸出", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); PhysicsLab.draw.bg(cv);
      // …用 PhysicsLab.draw.* 與 PhysicsLab.graph() 繪圖…
      r.set(s.get());
    }
    const anim = PhysicsLab.loop(() => draw());   // 需要動畫時
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }
});
```

3. 若新增了檔案，記得在 `index.html` 加 `<script>`，並更新 `sw.js` 的 `ASSETS` 清單（離線快取）。

引擎提供的常用工具：`ui.layout / slider / select / checkbox / button / readout / note`、`canvas.create`、`draw.{grid,line,arrow,disc,ring,rect,text,spring,bg}`、`graph()`（自帶座標軸、格線、曲線、面積與游標）、`loop()`（動畫迴圈）與 `col() / fmt() / clamp() / lerp()`。

---

## 部署到 GitHub Pages

1. 在 GitHub 建立一個新的**公開**倉庫（例如 `senior-science`），**不要**勾選「Add a README」。

2. 推送本專案：

```bash
git init
git add -A
git commit -m "physics lab"
git branch -M main
git remote add origin https://github.com/Yu-0312/senior-science.git
git push -u origin main
```

3. 到倉庫 **Settings → Pages → Build and deployment**，把 **Source** 設為 **GitHub Actions**（本專案已附 `.github/workflows/deploy.yml`，推送後自動建置部署）。或選 **Deploy from a branch**，Branch 選 `main` / `/ (root)`（已附 `.nojekyll`）。

4. 上線後打開 `index.html`，把 `canonical` 與 `og:url` 兩處網址改成你實際的網址，SEO 與社群分享預覽才會正確。

---

## 說明

本站為配合台灣 108 課綱自製之開放教學工具，所有模擬程式與文字內容皆為原創。物理模型為**教學簡化版**，部分數值以概念示範為主（如以相對單位呈現），僅供教學與學習用途，不作為精確計算依據。

歡迎自由使用、修改與散布。
