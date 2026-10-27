# GitHub Pages 試用版

使用者已授權公開發布試用版。程式透過 main 分支的 GitHub Actions 建置並部署；不使用 Codex Sites。

## 首次啟用

儲存庫 Settings → Pages → Build and deployment → Source 選擇 **GitHub Actions**。

接著在 Actions → Publish GitHub Pages → Run workflow → 選 main 執行。之後每次推送 main 都會自動測試、建置與部署。

流程依序執行 npm ci、npm test、npm run build，只有 build 成功才部署 dist；不提交 node_modules 或建置產物。

預期專案路徑為 https://blairan.github.io/esp32_3D_web_app/；只有部署成功且公開網址實際可讀取後，才能稱為可使用的試用網址。Vite base 採 ./，資產支援專案子目錄。

網站為公開的單板教學模型，沒有登入、資料庫、API key 或使用者資料上傳。實際接線與機構精度、Acer 實機效能及 LED/Blink 等仍依交接紀錄標記未驗收。
