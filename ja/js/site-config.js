/*
 * site-config.js — 站台設定
 *
 * 站台完全公開，沒有密碼閘門。這裡只保留部署網址與版本號；
 * 靜態頁面產生器（tools/build-static.js）也讀這個設定。
 */
(function () {
  "use strict";

  window.PhysicsLabSite = {
    /*
     * 部署網址，供 sitemap 與 canonical 使用。
     *
     * 這裡只是「本機建置」的預設值。實際部署時 tools/build-static.js 會優先採用
     * SITE_URL 或 VERCEL_PROJECT_PRODUCTION_URL 環境變數（見 DEPLOY.md），
     * 所以接上自訂網域時不必回來改這一行——在 Vercel 後台設 SITE_URL 即可。
     *
     * 結尾的斜線要保留：canonical 是直接字串相接的。
     */
    siteUrl: "https://senior-science.vercel.app/ja/",

    /* 版本號：同時用於快取破壞與 Service Worker */
    build: "20261114-0944"
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
    console.info("%c物理実験室", "font-weight:700",
      "ビルド " + window.PhysicsLabSite.build +
      "（表示の不具合を報告するときは、この行も添えてください）");
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
        stamp.textContent = "ビルド " + window.PhysicsLabSite.build;
        stamp.title = "表示の不具合を報告するときは、このバージョン番号を添えてください。ブラウザに残った古い版を見ていないか確認できます";
        host.appendChild(stamp);
      });
    }
  } catch (e) { /* 沒有 DOM 的環境（建置工具沙箱）直接略過 */ }

})();
