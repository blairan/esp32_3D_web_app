# ESP32 Interactive Lab

繁體中文瀏覽器 3D 教學實驗室，支援 **ESP32-DevKitC V4／WROOM-32E（38 Pin）** 與 **Arduino UNO R3／ATmega328P（32個主要排針端點）**；ESP32／UNO各有18項Arduino專題；新增 **Pico 2 W with headers／RP2350** 與3項MicroPython專題。

## 開發與驗證

需要 Node.js 22.12+（本環境使用 24）與 npm。

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

`npm run dev` 啟動 Vite 開發伺服器；`npm run preview` 檢查 dist 靜態產物。雲端任務已隔離，直接使用現有 checkout，不需另建 Git worktree。沒有 API key、後端、資料庫或帳號需求；執行時不載入外部模型、字型或 CDN。

## 已有功能

- 真正的 Three.js 簡化幾何模型；滑鼠拖曳旋轉、右鍵或 Shift＋拖曳平移、滾輪／筆電觸控板捲動縮放、重設固定視角；亦提供可由鍵盤操作的放大／縮小按鈕。
- 38 個獨立接腳的 3D 點選、高亮、資訊面板及同步清單。
- 清單可用 Tab 與 Enter／Space 操作，提供可見焦點與跳至清單連結。
- 電源、EN、3 個 GND、輸入專用、啟動／UART／JTAG 及 6 個 flash 保留腳分別說明。
- 簡化模式、響應式版面；WebGL 初始化失敗或 context lost 時，接腳清單與資訊仍可使用，並可只重試 3D 模型而保留選取與簡化模式。

## 資料與模型範圍

`src/pins.json` 從已核對的 `docs/esp32-devkitc-v4-pins.csv` 建立；3D、清單與面板共用此資料。資料測試會對照 CSV 全部 38 筆並檢查特殊腳分類。

**外觀、針距、排距與細部元件是教學示意，不是製造 CAD。** 正式機構 PDF 與現行模組額定尚待補核；不將示意座標宣稱為已量測。原始 30 Pin DOIT 研究保留作歷史，現行定義依 v0.2 決策。

已加入 LED 接線教學：點選端點接線、刪線、固定 220 Ω 電阻與單顆 LED、接線診斷及 HIGH／LOW 亮滅。切換右上方「LED 接線」，或使用網址 `#led` 進入。課程與規則詳見 [LED 教學契約](docs/led-lesson.md)。已加入「程式練習」（網址 `#code`）：限定 Arduino Blink 編輯器、虛擬時鐘、Worker 解譯、執行／暫停／停止／重設與行列錯誤。完整語法與限制見 [程式教學契約](docs/program-lesson.md)。使用者已授權 GitHub Pages 試用版部署；設定與首次啟用方式見 [部署說明](docs/github-pages.md)。Codex Sites 未建立。

## 驗證狀態

193 項資料／電路／程式／外觀測試與 TypeScript／Vite production build 通過。已用 Playwright + Chromium（軟體 WebGL）驗證 38 腳選取、真實 3D raycast、拖曳不誤觸、重設、縮放、鍵盤、簡化模式、1280×720 與窄螢幕，以及 WebGL 初始化失敗／context lost 的降級操作。

這不代表 Acer Aspire 5／Windows 11／Chrome 的實機效能驗收通過。實體筆電觸控板、Edge 與手機多指手勢未實測；不需另外購買觸控裝置才可接續。原規劃至少 30 FPS 仍是待實機量測目標。主要建置資產含自帶字體，包含按需載入的編輯器，壓縮傳輸約 0.6 MB，低於 5 MB 目標。

來源與變更理由見 `docs/board-decision-v0.2.md`；接續狀態見 `docs/development-handoff.md`。原始碼與文件已推送 GitHub 的 main 分支；GitHub Pages 已啟用；每次發布的結果以 GitHub Actions 為準。

## 外觀與電流指示

右上「外觀」可選深藍、紫羅蘭、暖橙、石墨或自訂主色；預設藍色。有效 HIGH 接線會出現慣用電流方向亮點與箭頭，LOW／錯接不顯示。可關閉電流效果，減少動態效果與簡化模式使用靜態箭頭。程式暫停時亮點也會停止。外觀及各板型／課程的練習會分別記住在此瀏覽器；換電腦可匯出／匯入練習JSON檔。詳見 [外觀與電流紀錄](docs/appearance-current.md)。

程式練習現預設空白 setup／loop 基本架構，沒有預填完整答案。CodeMirror 編輯器提供單行白名單補全、參數提示、語法上色與括號／縮排；輸入名稱或 Ctrl＋Space 查看建議，Enter 接受、Tab 跳參數。可自行完成後執行與觀察 LED。

## 教學 Wiki

程式練習「查看教學 Wiki」、接線「了解接線原理」及編輯器提示「查閱解說」可開啟對應繁中教學。目前 26 篇內建文章涵蓋 GPIO、LED／電阻、程式結構、感測器與顯示器等主題，只提供概念短例子，不提供完整 Blink 解答。桌面側邊閱讀、手機全螢幕；關閉後保留原程式、接線、視角與執行狀態。設計與驗證限制見 [教學 Wiki 紀錄](docs/teaching-wiki.md)。

## 第二組專題：按鈕控制 LED

從右上「學習專題」下拉選單選擇按鈕課，或開啟 `?lesson=button-led#code`。GPIO18 使用 INPUT_PULLUP、四腳常開按鈕接 GND，LED 沿用 GPIO23 與 220 Ω。支援按住／保持按下、digitalRead 與受限 if／else；請自行完成按住亮、放開滅。切換專題前會保護未保存工作，原閃爍課仍可選。補全與 Wiki 隨課程提供對應提示，Wiki 共九篇。契約、限制與驗證見 [按鈕課程](docs/button-lesson.md)。

右上導覽依序為接腳探索、學習專題與程式練習；「LED 接線」已收進學習專題下拉選單，會開啟目前所選專題的接線頁。

程式練習的練習目標下方新增「查看標準答案」，預設收合。三課都可主動查看完整可執行參考程式、重點解說並複製；不會自動填入編輯器或改變執行狀態，預設仍是基本架構。

## 第三組專題：雙 LED 交替閃爍

右上「學習專題」新增第三課，網址 `?lesson=dual-led#code`。GPIO23 對應 LED 1、GPIO22 對應 LED 2，各使用一顆 220 Ω 電阻，支援六條範例接線、獨立手動輸出／診斷／電流，以及程式交替控制。預設仍為空架構，可查看第三課標準答案；Wiki 共十篇。詳見 [雙 LED 課程與驗證](docs/dual-led-lesson.md)。

第四課：[紅黃綠交通號誌](https://blairan.github.io/esp32_3D_web_app/?lesson=traffic-light#code)（紅 GPIO23、黃 GPIO22、綠 GPIO21）。九線範例、三輸出、3／3／1 秒時序、練習架構、主動展開標準答案與第 11 篇 Wiki。詳見 [課程契約與驗證](docs/traffic-light-lesson.md)。該課完成時資料與執行測試共 82 項。

第五課：[按一次切換 LED](https://blairan.github.io/esp32_3D_web_app/?lesson=button-toggle#code)；第六課：[按鈕計數器](https://blairan.github.io/esp32_3D_web_app/?lesson=button-counter#code)。加入 50ms 穩定判斷、下降邊緣、全域變數觀察區，以及僅兩課開放的 millis／整數狀態語法。初始仍為練習架構；目前 92 項測試與 14 篇 Wiki，詳見 [課程契約與驗證](docs/stateful-button-lessons.md)。

第七課：[主動式蜂鳴器門鈴](https://blairan.github.io/esp32_3D_web_app/?lesson=buzzer-doorbell#code)；第八課：[PWM 呼吸燈](https://blairan.github.io/esp32_3D_web_app/?lesson=pwm-breathing#code)。前者採訊號／供電分離的三腳模組，示意音預設關閉；後者限定 analogWrite(23, 0～255)，提供平均亮度與手動滑桿。最新共 102 項測試、16 篇 Wiki；詳見 [教學契約與驗證](docs/buzzer-pwm-lessons.md)。

第九課：[RGB 混色](https://blairan.github.io/esp32_3D_web_app/?lesson=rgb-mixing#code)；第十課：[電位器調光](https://blairan.github.io/esp32_3D_web_app/?lesson=pot-dimming#code)。共陰極 RGB 七線、GPIO34（J2-05）ADC 六線；空白架構、課程補全、Wiki 與標準答案。最新共 114 項測試、18 篇 Wiki，詳見 [教學契約與驗證](docs/rgb-pot-lessons.md)。

第十一課：[光敏電阻夜燈](https://blairan.github.io/esp32_3D_web_app/?lesson=ldr-nightlight#code)；第十二課：[伺服馬達角度控制](https://blairan.github.io/esp32_3D_web_app/?lesson=servo-angle#code)。光敏分壓 ADC＋遲滯門檻、外部供電與單一 Servo 物件；最新共 126 項測試、20 篇 Wiki。詳見 [教學契約與驗證](docs/light-servo-lessons.md)。

第十三課：[超音波測距警示](https://blairan.github.io/esp32_3D_web_app/?lesson=ultrasonic-alert#code)；第十四課：[PIR 人體感測延遲燈](https://blairan.github.io/esp32_3D_web_app/?lesson=pir-delay#code)。Echo 分壓、理想回波與無回波、PIR 虛擬延遲／重新計時；最新共 138 項測試、22 篇 Wiki。詳見 [教學契約與驗證](docs/motion-range-lessons.md)。

第十五課：[溫溼度感測](https://blairan.github.io/esp32_3D_web_app/?lesson=climate-dht#code)；第十六課：[OLED 顯示（I²C）](https://blairan.github.io/esp32_3D_web_app/?lesson=oled-i2c#code)。DHT22 整數與兩秒共用取樣、警示門檻；SSD1306 ASCII／整數文字、緩衝與畫面提交。最新共 151 項測試、24 篇 Wiki。詳見 [教學契約與驗證](docs/climate-oled-lessons.md)。原定 18 項尚餘七段顯示器與整合專題。

第十七課：[七段顯示器計數](https://blairan.github.io/esp32_3D_web_app/?lesson=seven-counter#code)；第十八課：[環境監測整合](https://blairan.github.io/esp32_3D_web_app/?lesson=environment-lab#code)。四位 TM1637 與 DHT22／OLED／LED 整合，第一輪 18 項均已實作；目前 157 項測試、26 篇 Wiki。詳見 [契約與驗證](docs/final-two-lessons.md)。

## Arduino UNO R3

右上「開發板」切換ESP32／UNO；舊網址仍預設ESP32。[UNO接腳探索](https://blairan.github.io/esp32_3D_web_app/?board=uno-r3)、[UNO第一課](https://blairan.github.io/esp32_3D_web_app/?board=uno-r3&lesson=blink#code)、[UNO環境監測整合](https://blairan.github.io/esp32_3D_web_app/?board=uno-r3&lesson=environment-lab#code)。切換前確認未保存工作，確認後清空練習並停止Worker，外觀保留。

UNO使用5V邏輯、10位ADC、原生D／A接腳與A4／A5 I²C；18課都有接線、空架構、補全、Wiki與標準答案。186項測試通過，UNO 28篇教學／ESP32 26篇；兩板共36份答案經瀏覽器Worker檢查。官方資料與來源授權見 [板型基準](docs/uno-r3-board-baseline.md)，課程配置與驗證限制見 [UNO交接](docs/uno-r3-lessons.md)。ICSP僅外觀；沒有完整CPU、任意C++編譯、硬體連線或跨裝置進度同步。

## 練習保存與換電腦接續

每塊板、每課自動保存程式、接線、範例備份與輸入設定。重新整理還原草稿，重開首頁接續上次保存的板型／課程，保持未執行狀態。標題下方按「匯出練習」下載目前課程JSON；在另一台電腦開網站按「匯入練習」，確認後載入對應板型／課程。沒有登入或雲端同步，清除瀏覽器資料會刪除本機草稿，請按需匯出備份。193項測試與建置通過；細節見 [保存契約與驗證](docs/practice-storage.md)。

## 匯出到 Arduino IDE

標題下方「匯出 Arduino 程式（.ino）」可預覽並下載目前自己寫的 UNO／ESP32 程式，包含課程所需標頭、實板適配差異、板型與函式庫版本。原 `.json` 匯出／匯入仍用於恢復平台練習。網站不編譯或直接燒錄，請用 Arduino IDE 選板型與連接埠，先驗證再上傳。

驗證：`npm run test:hardware-runtime`；安裝 Arduino CLI 後，`npm run compile:sketches -- uno-r3 --install` 與 `npm run compile:sketches -- esp32 --install` 各編譯18課。固定版本、行為與硬體限制見 [Arduino 匯出說明](docs/arduino-export.md)。

## Pico 2 W · MicroPython

第三板型為 **Raspberry Pi Pico 2 W with headers（RP2350）**。右上選單切換，或開啟 `?board=pico-2-w#code`。目前提供40個獨立主排針、3D探索、板載LED、外接LED閃爍及按鈕控制LED三課、Python補全、6篇Wiki及答案；由自己寫的程式匯出 `main.py`，用Thonny上傳到已安裝對應MicroPython UF2的板上。`Pin("LED")`走無線晶片，不是GP25。

Pico草稿與Arduino練習分開保存，跨電腦請使用Pico `.json`備份。這是受限語法教學，沒有任意Python、Wi-Fi／Bluetooth或直接燒錄；外接課支援3D／清單接線、範例顯示／還原、錯接診斷及分課保存。`npm test`另需Python 3檢查匯出語法。板型來源、40腳表見 [Pico 2 W 說明](docs/pico-2-w-micropython.md)；新課接線、語法與驗證見 [外接LED／按鈕課](docs/pico-external-button.md)。
