台灣高中物理實驗室
依教育部 108 課綱（自然科學領域—物理）設計的高中物理互動模擬網站，涵蓋必修物理與選修物理（加深加廣），全站繁體中文、原創程式與教材。


* 12 個學習模組 · 61 個實驗主題 · 22 個可即時操作的互動模擬
* 公式以 LaTeX（MathJax） 專業排版
* 全站搜尋、學習進度記錄、深／淺色主題切換
* PWA：可安裝到桌面／手機、支援離線使用
* 免登入、免安裝、可直接部署為靜態網站
快速開始
用瀏覽器打開 index.html 即可。公式與離線功能在**線上（http/https）**環境才完整；直接雙擊本機檔案（file://）也能操作模擬，但 MathJax 與離線快取需連網或部署後才會生效。
22 個互動模擬
模組
	互動實驗
	一 運動學
	拋體運動、自由落體
	二 牛頓運動定律
	斜面受力
	三 動量與碰撞
	一維碰撞
	四 功與能量
	軌道能量守恆
	五 圓周運動與萬有引力
	行星軌道、等速圓周運動
	六 簡諧運動
	彈簧振子、單擺
	七 流體與熱學
	理想氣體、浮力
	八 波動與聲音
	弦上駐波、都卜勒效應
	九 光學
	雙縫干涉、司乃耳折射、透鏡成像
	十 電場與電路
	電場線與等勢面、歐姆定律電路
	十一 磁場與電磁感應
	電磁感應、勞侖茲力
	十二 近代物理
	光電效應、波耳原子模型
	

其餘 39 個實驗主題為「概念＋公式＋重點」教材頁，可依相同架構逐步加入互動模擬。
部署到 GitHub Pages（公開）
本資料夾已初始化為 Git 倉庫並完成第一次 commit，照以下步驟即可上線。
步驟
1. 在 GitHub 建立一個新的公開倉庫（Public），例如命名 senior-science。不要勾選「Add a README」。


2. 推送本專案（在本資料夾內開啟終端機）：


git remote add origin https://github.com/你的帳號/senior-science.git


git branch -M main


git push -u origin main


3. 開啟 Pages：到倉庫的 Settings → Pages → Build and deployment，把 Source 設為 GitHub Actions。本專案已附 .github/workflows/deploy.yml，推送後會自動建置並部署。


4. 稍候一分鐘，網址會出現在 Pages 設定頁，通常是： https://你的帳號.github.io/senior-science/


也可以用最簡單的方式：Settings → Pages → Source 選 Deploy from a branch，Branch 選 main / / (root)。本專案已含 .nojekyll，可正常載入所有檔案。
上線後建議修改
打開 index.html，把兩處 https://REPLACE_ME.github.io/senior-science/（canonical 與 og:url）改成你實際的網址，SEO 與社群分享預覽才會正確。
檔案結構
台灣高中物理實驗室/


├─ index.html               # 主頁（含 SEO、PWA、MathJax）


├─ manifest.json            # PWA 設定


├─ sw.js                    # Service Worker（離線快取）


├─ .nojekyll                # 讓 GitHub Pages 原樣提供檔案


├─ .github/workflows/deploy.yml   # 自動部署到 Pages


├─ icons/                   # 圖示（SVG + PNG 192/512）


├─ css/style.css            # 深／淺色主題樣式


└─ js/


   ├─ curriculum.js         # 12 模組 × 61 實驗課程資料（LaTeX 公式）


   ├─ sim-core.js           # 模擬引擎：畫布、滑桿、按鈕、讀數、動畫迴圈


   ├─ app.js                # 導覽、搜尋、進度、主題、PWA


   └─ experiments/          # 22 個互動模擬（各自向引擎註冊）
如何新增一個互動實驗
1. 在 js/experiments/ 新增檔案：


PhysicsLab.register("your-id", {


  build: function (root) {


    const L = PhysicsLab.ui.layout(root);


    const cv = PhysicsLab.canvas.create(L.canvasWrap, 680, 400);


    // …滑桿、讀數、繪圖、動畫迴圈…


    return { stop: function () { /* 停止動畫 */ } };


  }


});


2. 在 index.html 加 <script src="js/experiments/your-id.js"></script>。


3. 在 curriculum.js 對應實驗加上 id: "your-id" 與 interactive: true。


4. 更新 sw.js 的 ASSETS 清單（離線快取）。
說明
本站為配合台灣 108 課綱自製之開放教學工具，所有模擬程式與文字內容皆為原創，物理模型為教學簡化版，數值以概念示範為主，僅供教學與學習用途。