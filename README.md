# 物理實驗室 · 台灣高中互動物理

依教育部 **108 課綱**自然科學領域物理設計的高中物理互動模擬網站。全站繁體中文，涵蓋必修物理與選修物理加深加廣內容，提供 **12 個學習模組、120 個實驗主題、120 個即時 Canvas 互動模擬**。

**線上網站：** [https://yu-0312.github.io/senior-science/](https://yu-0312.github.io/senior-science/)  
**GitHub Repository：** [https://github.com/Yu-0312/senior-science](https://github.com/Yu-0312/senior-science)

---

## 專案特色

- **100% 互動模擬**：120 個實驗全部可即時操作，不只是文字教材或靜態插圖。
- **完整實驗工作台**：每個主題都具備實驗參數、即時量測、專題化 Canvas 場景、資料／圖表，以及可展開的實驗流程。
- **符合台灣高中物理脈絡**：依 108 課綱整理力學、熱學、波動、光學、電磁學、近代物理與宇宙學。
- **即時參數控制**：每個實驗提供滑桿、選單、按鈕或讀數面板，讓使用者直接觀察物理量變化。
- **Canvas 動態視覺化**：以自製模擬引擎繪製軌跡、向量、圖形、波形、場線、能階與機械結構。
- **公式與概念並重**：每個實驗附核心概念、LaTeX 公式與學習重點，公式由 MathJax 排版。
- **完整學習介面**：首頁模組總覽、側欄目錄、搜尋、上一個/下一個實驗、鍵盤方向鍵切換、實驗指南、分步演示、專注模式與全螢幕。
- **實驗紀錄工具**：可匯出當前即時讀數為 CSV，並截取主實驗畫面。
- **重新開啟即驗證的存取閘門**：進入網站前須輸入授權密碼；重新整理或另開分頁時會再次驗證。
- **學習進度記錄**：使用瀏覽器 localStorage 保存已讀進度。
- **深色/淺色主題**：預設精緻深色實驗室風，支援一鍵切換淺色主題。
- **PWA 支援**：可安裝到桌面或手機，並透過 Service Worker 快取主要資源。
- **靜態網站部署**：不需要後端、資料庫或登入系統，可直接部署到 GitHub Pages。

---

## 快速開始

### 線上使用

直接開啟 GitHub Pages：

[https://yu-0312.github.io/senior-science/](https://yu-0312.github.io/senior-science/)

網站每次開啟或重新整理都會先顯示存取閘門。這是為 GitHub Pages 靜態網站提供的輕量前端保護；它可以避免一般訪客直接使用，但不是伺服器端身分驗證。若需要真正的帳號權限控管，請改用具備登入與後端驗證的部署方式。

### 本機使用

下載或 clone 專案後，可直接用瀏覽器打開 `index.html`。互動模擬本身可在 `file://` 環境執行，但 MathJax 公式排版與 PWA 離線快取在 `http://` 或 `https://` 環境下會更完整。

建議用簡單本機伺服器執行：

```bash
python3 -m http.server 8080
```

然後開啟：

```text
http://localhost:8080
```

也可以使用：

```bash
npx serve .
```

---

## 課程內容

本專案目前包含 **12 個學習模組**，共 **120 個互動實驗**。第二批擴充將課本常被併在章節段落中的量測、向量、實驗設計、應用與延伸概念，拆成獨立的互動量測台。

| 編號 | 模組 | 實驗數 | 互動實驗 |
| --- | --- | ---: | --- |
| 一 | 運動學 | 9 | 原有運動學實驗，加上向量分解、路程與位移、量測與不確定度 |
| 二 | 牛頓運動定律與力 | 12 | 原有受力實驗，加上力的分解、超重與失重、彈簧串並聯 |
| 三 | 動量與碰撞 | 9 | 原有碰撞實驗，加上質心、力—時間曲線、火箭推進 |
| 四 | 功與能量 | 8 | 原有能量實驗，加上功與夾角、功率與效率、摩擦耗散 |
| 五 | 圓周運動與萬有引力 | 11 | 原有重力實驗，加上傾斜彎道、衛星能量、逃逸速度 |
| 六 | 簡諧運動 | 8 | 原有振動實驗，加上阻尼、相位關係、耦合振子 |
| 七 | 流體與熱學 | 9 | 原有熱流體實驗，加上液體壓力、相變、熱機效率 |
| 八 | 波動與聲音 | 9 | 原有波動實驗，加上邊界反射、聲強分貝、空氣柱共鳴 |
| 九 | 光學 | 11 | 原有光學實驗，加上全反射、平行玻璃板、光學儀器 |
| 十 | 電場與電路 | 12 | 原有電路實驗，加上基爾霍夫定律、電表負載、靜電屏蔽 |
| 十一 | 磁場與電磁感應 | 11 | 原有電磁實驗，加上安培力、動生電動勢、線圈力矩 |
| 十二 | 近代物理與宇宙學 | 11 | 原有近代物理實驗，加上核反應、宇宙紅移、黑體輻射 |

---

## 使用者功能

### 首頁總覽

首頁以模組卡片呈現完整課程地圖，使用者可以從模組進入對應實驗，也可以透過搜尋快速找到主題。

### 實驗頁

每個實驗頁包含：

- 專題化 Canvas 實驗台與可調參數控制項
- 實驗指南與分步演示
- 即時讀數、趨勢圖表與資料解讀
- 專注模式、全螢幕、讀數 CSV 匯出與主畫面截圖
- 核心概念說明
- 關鍵公式
- 學習重點
- 上一個/下一個實驗導覽

### 搜尋與導覽

搜尋功能會比對實驗名稱、概念、公式與重點文字。鍵盤方向鍵可快速切換前後實驗，適合課堂展示或自學瀏覽。

### 主題與進度

主題偏好與學習進度會儲存在瀏覽器 localStorage。重設進度按鈕可清除目前裝置上的學習記錄。

---

## 技術架構

本專案是純前端靜態網站，不使用框架、不需要 build step。

主要技術：

- HTML
- CSS
- JavaScript
- Canvas 2D
- MathJax
- Service Worker
- Web App Manifest
- GitHub Pages / GitHub Actions

### 檔案結構

```text
senior-science/
├─ index.html
├─ README.md
├─ manifest.json
├─ sw.js
├─ .nojekyll
├─ .github/
│  └─ workflows/
│     └─ deploy.yml
├─ css/
│  └─ style.css
├─ icons/
│  ├─ icon.svg
│  ├─ icon-192.png
│  ├─ icon-512.png
│  └─ icon-maskable-512.png
└─ js/
   ├─ app.js
   ├─ curriculum.js
   ├─ sim-core.js
   └─ experiments/
      ├─ kinematics.js
      ├─ newton.js
      ├─ momentum.js
      ├─ energy.js
      ├─ gravity.js
      ├─ shm.js
      ├─ thermal.js
      ├─ waves.js
      ├─ optics.js
      ├─ electric.js
      ├─ magnetism.js
      ├─ modern.js
      └─ extended.js
```

### 核心檔案說明

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 網站入口，載入樣式、課程資料、模擬引擎與各模組實驗 |
| `css/style.css` | 深色/淺色主題、首頁、側欄、卡片、互動區與列印樣式 |
| `js/curriculum.js` | 12 模組、120 實驗的教材資料、公式與學習重點 |
| `js/sim-core.js` | 自製模擬引擎，提供 UI、canvas、繪圖、graph、動畫 loop 等工具 |
| `js/app.js` | 網站導覽、搜尋、進度、主題、PWA 安裝與頁面狀態管理 |
| `js/experiments/*.js` | 各模組的互動模擬註冊檔 |
| `manifest.json` | PWA 名稱、圖示、顯示模式與啟動設定 |
| `sw.js` | Service Worker，負責主要靜態資源快取 |
| `.github/workflows/deploy.yml` | GitHub Pages 自動部署流程 |

---

## 模擬引擎概念

互動實驗透過 `PhysicsLab.register(id, definition)` 註冊。每個實驗通常會使用：

- `PhysicsLab.ui.layout()` 建立控制區、讀數區與 canvas 區
- `PhysicsLab.ui.slider()` 建立可調參數
- `PhysicsLab.ui.select()` 建立模式選單
- `PhysicsLab.ui.checkbox()` 建立顯示/隱藏選項
- `PhysicsLab.ui.readout()` 顯示即時計算結果
- `PhysicsLab.canvas.create()` 建立響應式高解析 canvas
- `PhysicsLab.draw.*` 繪製線段、箭頭、圓、文字、彈簧、背景等
- `PhysicsLab.graph()` 繪製座標軸、曲線、面積與游標
- `PhysicsLab.loop()` 管理動畫迴圈

範例：

```js
PhysicsLab.register("your-id", {
  build(root) {
    const L = PhysicsLab.ui.layout(root);
    const cv = PhysicsLab.canvas.create(L.canvasWrap, 0.6);

    const slider = PhysicsLab.ui.slider(L.controls, {
      label: "參數",
      min: 0,
      max: 10,
      value: 5,
      onInput: draw
    });

    const output = PhysicsLab.ui.readout(L.readouts, {
      label: "輸出",
      unit: ""
    });

    function draw() {
      cv.clear();
      PhysicsLab.draw.bg(cv);
      output.set(slider.get());
    }

    cv.onResize(draw);
    draw();

    return {
      stop() {
        cv.destroy();
      },
      rerender: draw
    };
  }
});
```

---

## 新增實驗流程

1. 在 `js/curriculum.js` 對應模組中新增一筆實驗資料。
2. 設定 `id`、`title`、`interactive`、`concept`、`formula`、`points`。
3. 在對應的 `js/experiments/*.js` 檔案中使用同一個 `id` 註冊模擬。
4. 若新增新的 JavaScript 檔案，需在 `index.html` 加入 `<script>`。
5. 若希望離線可用，需同步更新 `sw.js` 的 `ASSETS` 快取清單。
6. 執行語法檢查，確認沒有 JavaScript 語法錯誤。

可用以下方式檢查所有 JavaScript 檔案：

```bash
find js -name '*.js' -exec node --check {} \;
```

也可檢查課程統計：

```bash
node -e "global.window={}; require('./js/curriculum.js'); console.log(window.PhysicsLabCurriculum)"
```

---

## 部署到 GitHub Pages

本 repository 已部署於 GitHub Pages：

[https://yu-0312.github.io/senior-science/](https://yu-0312.github.io/senior-science/)

若要在自己的 GitHub 帳號部署：

1. 建立公開 repository。
2. 將專案推送到 `main` 分支。
3. 到 repository 的 **Settings → Pages**。
4. 將 **Build and deployment → Source** 設為 **GitHub Actions**。
5. 推送後 GitHub Actions 會自動部署。

本專案也可以使用分支根目錄部署：

1. 到 **Settings → Pages**。
2. Source 選 **Deploy from a branch**。
3. Branch 選 `main`。
4. Folder 選 `/ (root)`。

專案已包含 `.nojekyll`，GitHub Pages 會原樣提供靜態檔案。

---

## PWA 與離線快取

本專案包含：

- `manifest.json`
- `sw.js`
- 多尺寸 icon
- apple touch icon
- theme color

使用者在支援 PWA 的瀏覽器中可以將網站安裝到桌面或手機。Service Worker 會快取首頁、樣式、腳本、圖示與主要靜態資源。MathJax CDN 屬於外部資源，仍需網路連線才會完整載入公式排版。

若更新資源檔名或新增實驗檔，記得同步更新 `sw.js` 的快取清單與 cache 版本名稱。

---

## 適用情境

- 高中物理課堂展示
- 學生自學與複習
- 108 課綱自然科學探究課程
- 教師製作互動教材
- GitHub Pages 靜態教材範例
- Canvas 物理模擬教學專案

---

## 教學聲明

本站為配合台灣 108 課綱自製之開放教學工具。所有模擬程式與文字內容皆為原創。物理模型為教學簡化版，部分數值以概念示範為主，適合用於理解現象、探索趨勢與輔助學習，不作為精密工程或正式科學計算依據。

---

## 授權與使用

歡迎自由使用、修改與散布本專案內容。若用於教學、課程網站或再開發，建議保留原專案連結，方便學生與教師追蹤新版。
