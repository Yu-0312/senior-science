/*
 * site-config.js — 站台設定
 *
 * ★ 合作試用結束後，只要把 accessGate 改成 false 就全站公開。★
 *
 * 這個檔案存在的理由：
 * 密碼閘門原本寫死在 app.js 裡，而且和「搜尋引擎能不能收錄」綁在一起——
 * 閘門開著的時候，爬蟲抓到的首頁會顯示「0 個實驗、0 個互動模擬」，
 * 因為所有內容都要解鎖後才由 JavaScript 生成。若在這個狀態下被索引，
 * Google 記住的就是一個空站，之後就算開放也要很久才會重新評估。
 *
 * 因此這裡把兩件事綁在同一個開關上：
 *   accessGate = true  → 需要密碼 ＋ 自動加上 noindex（不讓搜尋引擎收錄空殼）
 *   accessGate = false → 完全公開 ＋ 開放索引 ＋ 靜態頁面全部生效
 *
 * 靜態頁面產生器（tools/build-static.js）也讀這個設定，
 * 所以翻牌之後重新建置一次，SEO 就會整套上線，不需要改其他程式。
 */
(function () {
  "use strict";

  window.PhysicsLabSite = {
    /* ------------------------------------------------------------------
       合作試用期間：true
       合作結束、準備公開推廣時：改成 false，然後重新部署即可
       ------------------------------------------------------------------ */
    accessGate: false,

    /* 密碼的 SHA-256 陣列（可放多組，輸入任一組都能解鎖）。
       要新增密碼時，在瀏覽器主控台執行：
         crypto.subtle.digest("SHA-256", new TextEncoder().encode("新密碼"))
           .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("")))
       算出雜湊後，加進下面陣列即可，不用刪掉舊的（除非要讓舊密碼失效）。

       注意：這是靜態網站的輕量閘門，用來區分「有給連結的合作對象」與
       「隨手點進來的人」，不是伺服器端的存取控制。雜湊寫在前端就一定
       可以被離線暴力破解，因此不要用它保護真正敏感的東西。 */
    accessHashes: [
      "faf16b5c720233e537cc50efe380a2170b2a2fd339ae6f9f3f74465cef67e8cd",
      "18b1965e109cf0aacadf3d81883a8e9fd0da68df964e5c543cc60a93050d1f89",
      "599a6c9facc00fa5acee2723d961b0fa48c14817c90bac8aaa29d6b756fdeafc"
    ],

    /*
     * 部署網址，供 sitemap 與 canonical 使用。
     *
     * 這裡只是「本機建置」的預設值。實際部署時 tools/build-static.js 會優先採用
     * SITE_URL 或 VERCEL_PROJECT_PRODUCTION_URL 環境變數（見 DEPLOY.md），
     * 所以接上自訂網域時不必回來改這一行——在 Vercel 後台設 SITE_URL 即可。
     *
     * 結尾的斜線要保留：canonical 是直接字串相接的。
     */
    siteUrl: "https://senior-science.vercel.app/",

    /* 版本號：同時用於快取破壞與 Service Worker */
    build: "20260905-6"
  };

  /*
   * 建置版本標記
   *
   * 由來：修好一個畫面問題之後，使用者重新整理仍然看到舊畫面，
   * 於是回報「沒修好」——實際上瀏覽器給的是快取的舊版。
   * 沒有辦法分辨「修正無效」和「看到的是舊版」，會浪費雙方很多時間。
   *
   * 因此把版本號印在頁尾，並在 console 印一行。
   * 回報畫面問題時附上這個字串，就能立刻判斷是不是同一份程式。
   */
  try {
    console.info("%c物理實驗室", "font-weight:700",
      "建置版本 " + window.PhysicsLabSite.build +
      "（回報畫面問題時請附上這一行）");
  } catch (e) { /* 沒有 console 也不該讓網站掛掉 */ }

  /*
   * 這支設定檔也會被 tools/build-static.js 在沙箱裡執行以取得站台設定，
   * 那個環境沒有完整的 document。任何 DOM 操作都必須是可有可無的，
   * 否則會讓靜態頁建置整個失敗。
   */
  try {
    if (document && typeof document.addEventListener === "function") {
      document.addEventListener("DOMContentLoaded", function () {
        var host = document.querySelector && document.querySelector(".disclaimer");
        if (!host) return;
        var stamp = document.createElement("p");
        stamp.className = "build-stamp";
        stamp.textContent = "建置版本 " + window.PhysicsLabSite.build;
        stamp.title = "回報畫面問題時請附上這個版本號，可用來確認看到的不是瀏覽器快取的舊版";
        host.appendChild(stamp);
      });
    }
  } catch (e) { /* 沒有 DOM 的環境（建置工具沙箱）直接略過 */ }

  /*
   * 閘門開著時才鎖住畫面。
   *
   * body 原本硬寫 class="access-locked"，靠 app.js 在載入後移除。
   * 但腳本在 body 末尾才跑，翻成公開之後每個訪客進站瞬間仍會先閃一下密碼框——
   * 正是首頁 <head> 那段 inline script 特地為主題色解決過的同一種閃爍。
   *
   * 改由這裡（設定的唯一來源、且早於 app.js）決定：閘門開著才加上 access-locked。
   * 公開狀態完全不閃；翻回試用模式時，這支腳本仍會把畫面鎖上。
   * 兩種狀態都只由 accessGate 一個開關決定，維持「改一行就切換」的設計。
   */
  if (window.PhysicsLabSite.accessGate) {
    var robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    if (document.body) document.body.classList.add("access-locked");
  }
})();
