# 第十三、十四課：超音波測距警示與 PIR 延遲燈

2026-10-28（Asia/Taipei）。沿用 38 腳 DevKitC V4／WROOM-32E、一次兩項與 GitHub Pages 試用流程。

## 超音波 ultrasonic-alert

- HC-SR04 教學模型：外部 5V 供電、與板共地、GPIO22（J3-03）接 TRIG；ECHO 為 5V，必須經 1 kΩ → 分壓點／GPIO34（J2-05）→ 2 kΩ → GND。LED 另用 GPIO23＋220 Ω。共 11 條範例線。
- 兩個分壓電阻無極性，各自可交換兩端，但 1 kΩ 在上段、2 kΩ 在下段。禁止直接 Echo、旁路分壓、供電短接、LED 跨接或缺共地。
- 距離滑桿 2～400cm，另可設定無回波；只是理想輸入，不求解聲波傳播、溫度、反射材質、角度、盲區、串音或真實電阻誤差。
- 僅本課新增 `delayMicroseconds(us)`（0～10000）與 `pulseIn(34, HIGH, timeout)`（timeout 1～30000μs），以及整數除法。各腳須設定指定 OUTPUT／INPUT。
- 每次 pulseIn 須新的 TRIG：由 LOW 變 HIGH 並維持至少 10μs，再回 LOW。HIGH 寬度按虛擬時間計算，不是主機計時。pulseIn 每次消耗一次觸發。
- 理想脈寬為 cm×58；逾時或無回波回 0，接線未確認則診斷，不猜值。0 不是零距離。參考解法僅在有效且小於 20cm 時亮燈。
- microdelay 會推進虛擬時間；pulseIn 立即回傳教學值，不阻塞等待實際脈寬。loop 仍必須有正值毫秒 delay（範例 60ms），微秒等待不能代替；操作與總時間預算保留。
- 3D 呈現外部電源、雙探頭及獨立 Echo 分壓電阻，文字與原生可鍵盤操作滑桿提供完整替代入口。

## PIR pir-delay

- 外部 5V 供電、3.3V 邏輯 OUT 的 PIR 教學模組；OUT 接 GPIO27（J2-11）、GND 與開發板共地。LED 另用 GPIO23＋220 Ω。共 7 條線。
- 模擬開關只設定理想 OUT HIGH／LOW，不使用鏡頭、不模擬預熱、靈敏度、紅外線、內建延遲或真實人體；靜止的人不等於持續活動。實物供電與輸出規格須核對。
- GPIO27 INPUT，digitalRead 讀到 HIGH 時亮燈並刷新全域 lastMotion=millis()；LOW 時距最後讀到 HIGH 達 3000ms 才關燈。再次讀到 HIGH 會重新計時。
- 參考程式每 50ms 輪詢，停止活動到熄燈約 2950～3000ms；判準是最後 HIGH 的虛擬時間，而非真實牆鐘或感測器內建保持時間。
- 暫停可改原始輸入，上次讀值、時間、輸出不變；繼續使用最新輸入並重新讀取。停止／重設熄燈並清除觀察資料，重跑從初始化開始。
- PIR 課單獨開放 GPIO27 的 digitalRead、INPUT、受限狀態與 millis，不更動原按鈕課 GPIO18／INPUT_PULLUP 的限制。補全與參數提示會直接連本課 Wiki，避免誤讀舊課腳位。

## 共用教學行為

兩課都保留空架構、課程補全、參數 Wiki、可展開完整答案、範例顯示／隱藏與原接線恢復。原始輸入不會自動控制 LED，程式與接線診斷分開。Wiki 共 22 篇，引用 Arduino pulseIn／delayMicroseconds／Blink Without Delay 與 Espressif GPIO 文件；本次只驗證連結格式及站內對照，未做外部官方網址 HTTP 可用性驗證。

## 驗證與下一步

- 138 項單元測試通過，新增 12 項：接腳／拓撲、分壓互換與旁路、直接 5V Echo、觸發寬度／重用、無回波／timeout 邊界、GPIO 模式、微秒預算、距離界限、PIR 3000ms 邊界／再次活動、輸入未確認、舊課語法隔離及範例重設。
- TypeScript／Vite 正式建置通過，既有大型 chunk 提示仍在。
- Browser plugin not available：Playwright Chromium、軟體 WebGL 與正式子路徑產物。兩課實際 Worker、2／19／20／400cm、無回波、分壓／觸發診斷、PIR 延遲與重新計時、暫停原始輸入與讀值差異、Wiki、停止／重設／重跑、課程切換、補全／參數提示、1280／390／320px、原十二課載入接線回歸，無應用程式 console error 或未處理例外。
- 未量測實物感測器、5V 電氣介面、Acer Aspire5 FPS、真實手機或安全／人體辨識性能。模擬不能取代實板規格與測試。
- 下一項為溫溼度感測；尚未開始。
