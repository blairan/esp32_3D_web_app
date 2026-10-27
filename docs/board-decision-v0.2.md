# 板型決策 ADR-001：改採 ESP32-DevKitC V4

日期：2026-10-27（Asia/Taipei）。規劃基準更新 v0.2。

## 決策與理由

使用者表示「換成別的版型也可以」，授權調整板型。選擇 **Espressif ESP32-DevKitC V4，ESP32-WROOM-32E 模組、雙列公排針，38 Pin／每側 19 腳**。不包含 WROVER、SOLO、V2 或未確認的同名仿板。

原 DOIT DevKit V1 30 Pin 缺少同板正反面與可靠版次證據，且資料來源有版次疑點。新板可在官方同一版本資料庫取得 V4 正面、背面尺寸圖及接腳表，符合教學資料可追溯需求。

ESP32-S3/C3 等系列改變晶片能力與接腳編號，增加教材重新核對成本；本次選擇保留經典 ESP32 的 DevKitC V4，可繼續使用 GPIO23 作外接 LED 候選。這是範圍取捨，並未完成其他系列全部板型評估。

## 對 v0.1 的精確變更

- 指定板型及所有「30 Pin、兩側各 15、30 筆逐腳驗收」改為上述 V4／WROOM-32E、38 Pin、兩側各 19、38 筆驗收。
- boardId 固定為 `esp32-devkitc-v4-wroom-32e`；pinId 用官方接頭 `J2-01` 至 `J2-19`、`J3-01` 至 `J3-19`。不能沿用舊板 L/R 編號對應，也不能直接搬用舊板座標。
- 三個 GND 分別為 J2-14、J3-01、J3-07，保持獨立選取物件。
- 新板引出 flash 專用 GPIO6–11，必須可選取查看限制，但禁止用作後續一般接線及 OUTPUT 模擬；「所有接腳可選」不等於「所有接腳可當 GPIO」。
- 後續 GPIO23 外接 LED 對應 J3-02。維持限流電阻及 GND 規則，不採板載電源 LED 作 Blink 教材。
- 四個 Sprint 的排序、React/TypeScript/Three.js 技術方向、MVP 功能、可及性、效能目標、限定模擬範圍及發布規則均維持 v0.1。
- 先前 sprint-1.md 與 sprint-1-evidence.md 改作 DOIT 歷史研究，不是現行開發板定義。

## 官方證據與核對

本次官方來源提交：`bd4d4ac18657e73583af3d7c0b0a23c3cddf3735`。

- B1：[V4 官方使用指南](https://github.com/espressif/esp-dev-kits/blob/bd4d4ac18657e73583af3d7c0b0a23c3cddf3735/docs/en/esp32-devkitc/user_guide.rst)：已讀取；列出 ESP32-WROOM-32E、Micro USB、J2/J3 各 19 筆及供電限制。
- B2：[V4 正面照片](https://github.com/espressif/esp-dev-kits/blob/bd4d4ac18657e73583af3d7c0b0a23c3cddf3735/docs/_static/esp32-devkitc/esp32-devkitc-v4-functional-overview.png)：已取得並視覺檢視，照片可辨 ESP32-WROOM-32E 模組與兩側絲印。
- B3：[V4 接腳圖](https://github.com/espressif/esp-dev-kits/blob/bd4d4ac18657e73583af3d7c0b0a23c3cddf3735/docs/_static/esp32-devkitc/esp32_devkitC_v4_pinlayout.png)：已取得並視覺檢視，方向與 J2/J3 清單逐列對照一致；圖上模組名稱較泛化，模組型號依 B1/B2 鎖定，不用圖代替模組規格。
- B4：[V4 背面尺寸照片](https://github.com/espressif/esp-dev-kits/blob/bd4d4ac18657e73583af3d7c0b0a23c3cddf3735/docs/_static/esp32-devkitc/esp32-devkitc-v4-dimensions-back.jpg)：已取得並視覺檢視，背面可見 ESP32_DevKitC_V4 字樣、接腳絲印與尺寸標註。這是同一官方 V4 文件集的參考圖，不宣稱為 B2 那一塊實物的連續拍攝。

### 方向與模型規約

從元件正面看，天線向上、USB 向下；J2 為左列，J3 為右列，兩列均由天線端 01 至 USB 端 19。B2/B4 是橫向照片，核對時按 USB 與天線定向；背面要鏡像，pinId 不變。

B4 標示長方向 54.4 mm、短方向 27.9 mm，另有 48.2 mm 區段。建模時保留這些原始標註，細分 PCB／模組伸出與 USB 邊界前，不能只憑照片像素反推精密尺寸。針距、排距、孔位與元件精確座標仍需官方尺寸／PCB 檔確認。簡化模型不承諾機械加工精度。

### 38 個實體接腳

完整資料見 [CSV](esp32-devkitc-v4-pins.csv)。以下絲印依照片／圖採數字，官方名稱 IOxx 另保留於 CSV；TX/RX 與 GPIO1/3 分開。

| pinId | 絲印 | GPIO／角色 | 限制 |
|---|---|---|---|
| J2-01 | 3V3 | power | 供電選項互斥；非 GPIO |
| J2-02 | EN | enable | 晶片使能／重設；非一般 GPIO |
| J2-03 | VP | 36 | 只能輸入；無內部上拉下拉 |
| J2-04 | VN | 39 | 只能輸入；無內部上拉下拉 |
| J2-05 | 34 | 34 | 只能輸入；無內部上拉下拉 |
| J2-06 | 35 | 35 | 只能輸入；無內部上拉下拉 |
| J2-07 | 32 | 32 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J2-08 | 33 | 33 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J2-09 | 25 | 25 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J2-10 | 26 | 26 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J2-11 | 27 | 27 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J2-12 | 14 | 14 | JTAG 功能共用 |
| J2-13 | 12 | 12 | 啟動綁定腳；reset 電平可能影響啟動；JTAG 功能共用 |
| J2-14 | GND | ground | 非 GPIO |
| J2-15 | 13 | 13 | JTAG 功能共用 |
| J2-16 | D2 | 9 | flash 專用；禁止一般接線與輸出模擬 |
| J2-17 | D3 | 10 | flash 專用；禁止一般接線與輸出模擬 |
| J2-18 | CMD | 11 | flash 專用；禁止一般接線與輸出模擬 |
| J2-19 | 5V | power | 供電選項互斥；非 GPIO |
| J3-01 | GND | ground | 非 GPIO |
| J3-02 | 23 | 23 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J3-03 | 22 | 22 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J3-04 | TX | 1 | UART0 燒錄／除錯共用 |
| J3-05 | RX | 3 | UART0 燒錄／除錯共用 |
| J3-06 | 21 | 21 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J3-07 | GND | ground | 非 GPIO |
| J3-08 | 19 | 19 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J3-09 | 18 | 18 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J3-10 | 5 | 5 | 啟動綁定腳；reset 電平可能影響啟動 |
| J3-11 | 17 | 17 | 限已選 WROOM 模組；不可外推 WROVER |
| J3-12 | 16 | 16 | 限已選 WROOM 模組；不可外推 WROVER |
| J3-13 | 4 | 4 | 一般 I/O；仍受 3.3 V 電氣規格限制 |
| J3-14 | 0 | 0 | 啟動綁定腳；reset 電平可能影響啟動 |
| J3-15 | 2 | 2 | 啟動綁定腳；reset 電平可能影響啟動 |
| J3-16 | 15 | 15 | 啟動綁定腳；reset 電平可能影響啟動；JTAG 功能共用 |
| J3-17 | D1 | 8 | flash 專用；禁止一般接線與輸出模擬 |
| J3-18 | D0 | 7 | flash 專用；禁止一般接線與輸出模擬 |
| J3-19 | CLK | 6 | flash 專用；禁止一般接線與輸出模擬 |

### 能力與限制證據

晶片層級限制沿用已核驗的官方 ESP-IDF v5.5.1 ESP32 GPIO 文件（舊研究 S4）；板級資訊以 B1 為準。GPIO34–39 無內部上拉下拉、GPIO0/2/5/12/15 為啟動綁定腳；GPIO16/17 對 WROOM 可用，WROVER 則保留內用。GPIO6–11 的 flash 占用由 B1 明確確認。

B1 明確要求 Micro USB、5V+GND、3V3+GND 三種供電方式只能擇一。選取電源腳時呈現電源角色，不能作一般 GPIO。板載 LED 是 5V Power On LED，不定義為任意可程式控制 LED。

B1 另提早期 V4 的 C15 可能影響 GPIO0／下載模式：在版本註記保留此差異，不宣稱所有 V4 實板電路完全相同。MVP 不模擬上電、燒錄或 C15；圖像不宣稱完整電路復刻。

## 尚未完成與 Sprint 1 狀態

已完成：替代板型決策；官方正面／背面／pinout 證據；38 筆官方接腳表與圖像對照；唯一 pinId、19+19、三個 GND、六個 flash 專用腳的結構檢查。

未完成：

1. B1 連結的官方 schematic、PCB layout、dimensions PDF 均因 `dl.espressif.com` 代理 Tunnel 403 未讀取。需核對細部尺寸及機構規約；這不否定已取得的 B4 尺寸照片。
2. ESP32-WROOM-32E 的現行模組資料表仍未取得，不把舊 ESP-WROOM-32 V1.5 的電壓範圍直接套用到 32E。
3. 自建幾何可免外部模型，但官方圖片僅作研究來源；不匯入產品資產。若將照片用於教材，須另查圖片使用授權。
4. 簡化模型細部座標與測試筆電／觸控裝置清單尚未凍結，操作草圖沿用 v0.1。

**Sprint 1 尚未整體驗收；尚未啟動 Sprint 2。** 不因更換板型而將未完成項目標為已通過。下一個最小步驟：核對官方尺寸／PCB 文件與 WROOM-32E 規格，凍結簡化模型規約及實際測試裝置。

## 保存與交接

目前為雲端工作區文件，尚未 commit、推送或部署。來源影像暫存 /tmp；以下提供來源雜湊，不能取代遠端版本保存。後續實作以此板型作為單板 MVP 基準，舊 30 Pin 文件不再驅動新模型。

| 來源檔 | SHA-256 |
|---|---|
| devkitc-guide.rst | `a6e89080a3a5f9b99f33e63e7a0d9788fa858ad11cd25feffbb9e4df15229f1b` |
| esp32-devkitc-v4-functional-overview.png | `e078f94904c5396ac7475c1e2349b368b31db7bb4d2716954bc3f72fdad7ab3c` |
| esp32_devkitC_v4_pinlayout.png | `e3217229b995ec7e1b5c525ffd93eced3b3a17827806907dd25a1609667283e2` |
| esp32-devkitc-v4-dimensions-back.jpg | `52d81d696ebdb0c804d30b5d5361f1eaabca886cafc16b14edf48abdc0de02f1` |

進度更新：已建立 [模型與驗收工作稿](model-and-validation-spec.md)，並保存官方來源網域的環境設定草稿；官方 PDF 尚未解鎖，裝置資訊待提供，關卡狀態維持未通過。
