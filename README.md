# 物理實驗室 · 台灣中學互動物理

從國中自然的生活物理銜接到教育部 **108 課綱**自然科學領域物理的互動模擬網站。全站繁體中文，涵蓋國中基礎、必修物理與選修物理加深加廣內容，提供 **12 個學習模組、210 個實驗主題、210 個即時 Canvas 互動模擬**。

**線上網站：** [https://yu-0312.github.io/senior-science/](https://yu-0312.github.io/senior-science/)  
**GitHub Repository：** [https://github.com/Yu-0312/senior-science](https://github.com/Yu-0312/senior-science)

---

## 專案特色

- **100% 互動模擬**：210 個實驗全部可即時操作，不只是文字教材或靜態插圖。
- **完整實驗工作台**：每個主題都具備實驗參數、即時量測、專題化 Canvas 場景、資料／圖表，以及可展開的實驗流程。
- **國中到高中一條學習線**：以國中自然的生活物理為起點，銜接 108 課綱的力學、熱學、波動、光學、電磁學、近代物理與宇宙學。
- **台灣教材用語**：統一使用資料、變因、機率、訊號、光屏、雷射等台灣課堂常用寫法。
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

本專案目前包含 **12 個學習模組**，共 **210 個互動實驗**。除了核心課綱、量測延伸與進階應用，第四批將國中銜接、生活科技、工程裝置與各單元的關鍵概念拆成獨立的互動量測台。

| 編號 | 模組 | 實驗數 | 互動實驗 |
| --- | --- | ---: | --- |
| 一 | 運動學 | 17 | 單位換算、感測器、反應時間、向量、運動圖像、終端速度、資料擬合與量綱分析 |
| 二 | 牛頓運動定律與力 | 24 | 受力、斜面外力、牆面與疊放摩擦、桌面—懸掛連接體、垂落繩、輸送帶、兩繩平衡、張力、槓桿、滑輪、壓力、桁架、超重失重與彈簧 |
| 三 | 動量與碰撞 | 13 | 碰撞、衝量、質心、水火箭、緩衝結構、滑板推進、火箭方程式與多級火箭分離 |
| 四 | 功與能量 | 12 | 功、功率、效率、能量形式、簡單機械、水力發電、風力發電與摩擦耗散 |
| 五 | 圓周運動與萬有引力 | 18 | 向心力、轉動、衛星、卡文迪許實驗、行星重量、重力場、逃逸與潮汐／洛希極限 |
| 六 | 簡諧運動 | 11 | 彈簧、單擺、物理擺、扭擺、能量、共振、阻尼、相位與耦合振子 |
| 七 | 流體與熱學 | 19 | 密度、大氣壓力、表面張力、彈簧秤量浮力、量熱、溫室效應、流體、氣體、相變、熱機與熱傳遞 |
| 八 | 波動與聲音 | 14 | 繩波波速、聲音三要素、回聲與超音波、地震波、干涉、駐波、都卜勒與共鳴管 |
| 九 | 光學 | 20 | 影子與針孔、RGB 混色、光纖、人眼、相機曝光、反射折射、透鏡位移法、干涉繞射、偏振與光速量測 |
| 十 | 電場與電路 | 21 | 伏安法量電阻、靜電感應、焦耳熱、家庭電路、RLC 共振、電場、電容、基爾霍夫定律、整流、LED 與示波器 |
| 十一 | 磁場與電磁感應 | 19 | 指南針與磁場、電磁鐵、直流馬達、感應、發電、霍爾效應、電流天平、渦電流與天線共振 |
| 十二 | 近代物理與宇宙學 | 22 | 陰極射線、光譜、太陽能電池、量子能階、相對論、核物理、系外行星、赫羅圖與宇宙距離梯 |

### 第三批擴充焦點

- **完整實驗方法**：最小平方法、殘差、變因控制、不確定度傳遞與量綱分析，讓使用者不只看到結果，也能練習如何相信一組資料。
- **工程與現代應用**：終端速度、多級火箭、滾動、熱傳遞、液壓機、整流、LED、示波器、霍爾效應、渦電流與天線共振。
- **延伸探索**：薄膜干涉、斐索光速量測、霍曼轉移、潮汐力、量子波包、雙生子、輻射屏蔽、束縛能、系外行星與赫羅圖。

### 第四批擴充：國中銜接與完整實驗鏈

- **從日常現象建立模型**：加入單位換算、反應時間、槓桿、滑輪、壓力、密度、大氣壓力、表面張力、影子、針孔成像、RGB 混色與家庭電路。
- **把裝置與資料連在一起**：新增運動感測器、水火箭、緩衝結構、桁架、量熱、繩波、超音波、卡文迪許扭秤、靜電感應、電磁鐵與太陽能電池。
- **每個新主題都有自己的互動場景**：例如滑輪組、風力機、重力場地圖、物理擺、光纖、相機、RLC 電路、直流馬達、陰極射線與光譜儀，而非共用一張靜態示意圖。
- **常見受力題型量測台**：新增斜面外力、牆面靜摩擦、疊放物體、桌面—懸掛連接體、桌邊垂落繩、兩繩懸掛與輸送帶七種互動題型；每個都有可調變因、力圖、即時判讀與關係圖。
- **跨領域量測題型**：新增伏安法量電阻與 U-I 作圖、彈簧秤量浮力，以及凸透鏡位移法量焦距；三者均提供儀器配置、量測紀錄與由資料反推物理量的流程。

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
   ├─ advanced-curriculum.js
   ├─ comprehensive-curriculum.js
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
      ├─ extended.js
      ├─ advanced.js
      └─ comprehensive.js
```

### 核心檔案說明

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 網站入口，載入樣式、課程資料、模擬引擎與各模組實驗 |
| `css/style.css` | 深色/淺色主題、首頁、側欄、卡片、互動區與列印樣式 |
| `js/curriculum.js` | 核心與第二批 120 個實驗的教材資料、公式與學習重點 |
| `js/advanced-curriculum.js` | 第三批 36 個進階知識點的教材資料與課程統計更新 |
| `js/comprehensive-curriculum.js` | 第四批 44 個國中銜接、生活應用與單元深化主題的教材資料與課程統計更新 |
| `js/sim-core.js` | 自製模擬引擎，提供 UI、canvas、繪圖、graph、動畫 loop 等工具 |
| `js/app.js` | 網站導覽、搜尋、進度、主題、PWA 安裝與頁面狀態管理 |
| `js/experiments/*.js` | 各模組的互動模擬註冊檔；`comprehensive.js` 對應第四批 44 個專題場景 |
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

1. 在對應的課程資料檔中新增一筆實驗資料；核心主題放在 `js/curriculum.js`，延伸主題可集中在 `js/comprehensive-curriculum.js`。
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
