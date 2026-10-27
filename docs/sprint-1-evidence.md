# Sprint 1 補充核對紀錄

> 歷史研究：現行板型已改為 ESP32-DevKitC V4／WROOM-32E（38 Pin）。請依 [v0.2 板型決策](board-decision-v0.2.md) 接續；本文件保留作變更理由與來源紀錄。

日期：2026-10-27（Asia/Taipei）。狀態：資料研究完成部分交叉核對，硬體關卡未通過。

## 新來源

### S4：Espressif 官方 ESP-IDF GPIO 文件

[固定提交文件](https://github.com/espressif/esp-idf/blob/fcae32885b0296b32044cb99ecbdc50d98dddb83/docs/en/api-reference/peripherals/gpio/esp32.inc)，版本 v5.5.1。實際讀取該 tag 的 raw 檔並解析遠端 tag 指向提交。

SHA-256：`cdacf70a69b8cb2bfe4f4abb3e9b37e9ca06509e71922e72c05982d4332fd66b`。

已確認的晶片層級限制：

- GPIO34–39 只能輸入，無軟體啟用的內部上拉／下拉。候選板引出 34、35、36、39。
- GPIO0、2、5、12、15 為 strapping pins；候選板排針引出 2、5、12、15。具體啟動電平與 GPIO12 電壓影響仍須資料表核對，不能只靠一般警示取代。
- GPIO1/3 為 TXD/RXD，通常用於燒錄與除錯。
- GPIO12–15 通常用於 JTAG，使用除錯器時須考慮衝突。
- GPIO6–11、16–17 常被模組 flash／PSRAM 占用；本文件不能單獨證明照片中 ESP-WROOM-32 的 16/17 可用性，仍需確定模組資料表。
- ADC2 與 Wi-Fi 存在使用限制；不在 MVP 模擬範圍，但不能將這些腳概括為無限制。
- GPIO23 在此文件中無特殊限制註記，僅支持保留作外接 LED 候選，不等於板型映射、接線與模擬已驗收。

### S5：DOIT 廠商 Wiki 與 30 Pin 原理圖

[廠商 Wiki](https://github.com/SmartArduino/SZDOITWiKi/wiki/ESP8266---ESP32)，本次透過其 Git wiki 讀取，HEAD `92460ef9a63f4c4bf1bb579d3910c1ebfb97991f`。頁面將原理圖下載指向 SmartArduino/ESPboard 的 esp32manual.rar。

[固定提交壓縮包](https://github.com/SmartArduino/ESPboard/blob/77e223f1d342a603493b24dc10bbaca3c7fc395b/esp32manual.rar)。本次從 master 讀取並記錄遠端 HEAD；不宣稱它與 S1 實板具有已證明的同一版次。

- RAR SHA-256：`18de1f6924d7289aff219ab6c9e5b438a5bd7ba7febb3a3f1af4d2c6ae4fdba6`。
- 包內 `esp32manual/esp32_Schematic Prints.pdf`，1 頁，SHA-256：`c83e0595336b1c6d4202bd01dfcfcec13a3af1928371bd6117d62fc9307e1f16`。
- 已用文字擷取及整頁渲染檢視。J1/J2 都是 THT_Male_P_1x15，電氣映射與 S1 候選表 30 列一致，對照見下表。
- 圖框卻標「ESP12E」、V0、2014-04-13，PDF metadata 建立日期為 2017-02-14。這些是來源內部的版次疑點，不能將圖框日期當作 ESP32 DevKit V1 已確認製造版次。
- 同包另有 ESP32V2.pdf，文字擷取顯示至少 18 腳的排針編號；不採作本專案 30 Pin 排列證據。
- 此原理圖有 USB→SS14→VIN 與 NCP1117→3V3 供電路徑、CP2102 UART 連線；仍不能推論所有同名板可安全外接任意 VIN 或回灌 3V3。
- 原理圖中的藍 LED 接 GPIO2，僅是該圖電路，繼續採外接 LED 教材，不將所有板載 LED 定義為 GPIO2。

## 30 列電氣對照

專案 L/R01 在天線端；原理圖接頭編號從 USB 端起，因此對應 `原理圖 pin = 16 − 專案位置序號`。這是 S1 照片與 S5 電氣清單之對照，不代替背面實物確認。

| pinId | S1 候選映射 | S5 接頭／網路 | 電氣對照 |
|---|---|---|---|
| L01 | EN / — | J1.15：EN | 一致，實物版次待確認 |
| L02 | VP / 36 | J1.14：VP → U3 GPIO36 | 一致，實物版次待確認 |
| L03 | VN / 39 | J1.13：VN → U3 GPIO39 | 一致，實物版次待確認 |
| L04 | D34 / 34 | J1.12：A6 → GPIO34 | 一致，實物版次待確認 |
| L05 | D35 / 35 | J1.11：A7 → GPIO35 | 一致，實物版次待確認 |
| L06 | D32 / 32 | J1.10：A4 → GPIO32 | 一致，實物版次待確認 |
| L07 | D33 / 33 | J1.9：A5 → GPIO33 | 一致，實物版次待確認 |
| L08 | D25 / 25 | J1.8：A8 → GPIO25 | 一致，實物版次待確認 |
| L09 | D26 / 26 | J1.7：A9 → GPIO26 | 一致，實物版次待確認 |
| L10 | D27 / 27 | J1.6：GPIO27 | 一致，實物版次待確認 |
| L11 | D14 / 14 | J1.5：GPIO14 | 一致，實物版次待確認 |
| L12 | D12 / 12 | J1.4：GPIO12 | 一致，實物版次待確認 |
| L13 | D13 / 13 | J1.3：GPIO13 | 一致，實物版次待確認 |
| L14 | GND / — | J1.2：GND | 一致，實物版次待確認 |
| L15 | VIN / — | J1.1：VIN | 一致，實物版次待確認 |
| R01 | D23 / 23 | J2.15：GPIO23 | 一致，實物版次待確認 |
| R02 | D22 / 22 | J2.14：GPIO22 | 一致，實物版次待確認 |
| R03 | TX0 / 1 | J2.13：TX0 → GPIO1 | 一致，實物版次待確認 |
| R04 | RX0 / 3 | J2.12：RX0 → GPIO3 | 一致，實物版次待確認 |
| R05 | D21 / 21 | J2.11：GPIO21 | 一致，實物版次待確認 |
| R06 | D19 / 19 | J2.10：GPIO19 | 一致，實物版次待確認 |
| R07 | D18 / 18 | J2.9：GPIO18 | 一致，實物版次待確認 |
| R08 | D5 / 5 | J2.8：GPIO5 | 一致，實物版次待確認 |
| R09 | D17 / 17 | J2.7：TX2 → GPIO17 | 一致，實物版次待確認 |
| R10 | D16 / 16 | J2.6：RX2 → GPIO16 | 一致，實物版次待確認 |
| R11 | D4 / 4 | J2.5：GPIO4 | 一致，實物版次待確認 |
| R12 | D2 / 2 | J2.4：GPIO2 | 一致，實物版次待確認 |
| R13 | D15 / 15 | J2.3：GPIO15 | 一致，實物版次待確認 |
| R14 | GND / — | J2.2：GND | 一致，實物版次待確認 |
| R15 | 3V3 / — | J2.1：VDD3V3 | 一致，實物版次待確認 |

## 網路與證據限制

本次對 www.espressif.com 的晶片／模組 PDF、randomnerdtutorials.com、playelek.com、docs.zoho.com 均遇到代理 Tunnel 403；並未讀到內容，不表示來源不存在。GitHub 官方文件及廠商原理圖提供了部分替代證據，沒有停用 TLS 或校驗。

若要讀取原始資料表與原始文章，可在環境設定檢查以上網域的網路權限。本次未改寫既有網路設定。

## 關卡與下一步

1. 30 筆候選映射已有 S1 與 S5 電氣對照；尚未確認兩者同一實板版次。
2. 仍缺同一候選板背面照片、明確版次及尺寸證據。不能用另一塊同名板照片拼接為正反面。
3. 仍缺已確認 ESP-WROOM-32 模組資料表與電源額定核對。
4. 素材只引用來源，不將外部照片／PDF 複製為產品資產；授權仍待核對。
5. 標準筆電與觸控測試裝置仍待指定。

因此 Sprint 1 尚未驗收，沒有啟動 Sprint 2。下一個可解鎖關卡的證據是同一參考板的正反面與版次資料，或另選有完整證據的公開 30 Pin 參考板（需記錄變更理由）。

原始下載與渲染檔僅在 /tmp 作研究暫存；本文件記錄可追溯連結與雜湊，不宣稱原始檔已在遠端保存。

## 第二輪補查：模組文件與機構候選值

### S6：廠商 Wiki 連結的 Espressif 模組資料表（舊版鏡像）

來源鏈：SmartArduino/SZDOITWiKi 的 `ESP32---ESP32` 頁面 → [ESPwifi 固定提交 PDF](https://github.com/SmartArduino/ESPwifi/blob/5ac6e1676f9eed0fe54bfd0f42f843d332d8d991/esp_wroom_32_datasheet_en.pdf)。本次實際讀取 master 的 PDF，並記錄遠端 HEAD。SHA-256：`0a46ef645b3a2f3f5fcc3c3c8ae8f830a50b106e267fd28f301d947f35e87b1c`。

文件自述 Espressif ESP-WROOM-32 Datasheet V1.5、2017.03；它是廠商提供的 Espressif 舊文件鏡像，並非已取得的最新官方版本，沒有與官方現行 PDF 比對雜湊。

- 第 2.2 節：模組 IO16/IO17 列為 I/O、UART2 等功能。
- 第 3.2 節：模組 4 MB flash 連 GPIO6–11，這六腳不可作一般 GPIO。對這個模組版本，資料支持 16/17 為可用 I/O 候選；仍不可外推到 WROVER 或其他帶 PSRAM 模組。
- 第 2.3 節／表 4：GPIO12（MTDI）在 reset 的預設下拉，低電平對應 VDD_SDIO 3.3 V，高電平對應 1.8 V。這是啟動時的供電設定，不能描述成單純 HIGH/LOW 顯示效果。GPIO2 在下載模式要求為低；GPIO15（MTDO）影響啟動 UART 訊息；GPIO5/15 亦有 SDIO 時序設定。
- 第 4.2 節／表 8：此舊版文件列模組 VDD 建議範圍 2.2–3.6 V、典型 3.3 V。這是該文件的模組規格，不是開發板 VIN 可用範圍；未確認最新文件前不將舊版下限寫成教材保證值。
- 第 4.3 節／表 9：輸入高電平上限列 VDD+0.3 V，不支持 GPIO 可直接接 5 V 的說法。教材先以 3.3 V 邏輯呈現，不宣稱 5 V 容忍。

### S7：30 Pin 社群 KiCad 封裝（尺寸候選，未實測）

[固定版本來源](https://github.com/syauqibilfaqih/ESP32-DevKit-V1-DOIT/tree/80365a4280304afcf2eb4fc615585154636d32ea)，檔案 `ESP32_Footprints.pretty/ESP32_30pin.kicad_mod`。

直接解析檔案得到：30 個通孔 pad；每側 15 個；同側針距 2.54 mm；兩排中心距 25.4 mm。F.SilkS 矩形座標對應 28.30 × 51.50 mm，但絲印輪廓不是已量測 PCB 外形。只能作建模尺寸候選，不可替代 S1 同板實測。

README 自述修正其他作者的 30 Pin 封裝，連到 KiCad 論壇；上游討論題名包含 CH340，與 S5 的 CP2102 證據不同。未查清原板一致性前，不能把此封裝的尺寸或渲染當成 S1 實板正反面證據。尚未匯入產品。

### 排除與未採用來源

- [davidkleymann/doit-esp32-devkit-kicad](https://github.com/davidkleymann/doit-esp32-devkit-kicad/tree/b2e04c1a098b96bd7f723cc8f78c61edc7eec676)：名稱為 DevKit v1，但檔案實際有 **36 個 pad**。已排除，不用其尺寸套用 30 Pin 候選板。
- [TronixLab/DOIT_ESP32_DevKit-v1_30P](https://github.com/TronixLab/DOIT_ESP32_DevKit-v1_30P/tree/9581bb9637874e17d89680768a509cce7f4c6853)：README 有正面實板照片外鏈及 pinout 檔，但未提供已確認同板背面。內文有 GPIO34–39 下拉與 strapping 清單等與 S4 不一致的敘述，不採其教學文字作限制依據。
- GitHub repository 搜尋可用；匿名 code 搜尋要求登入，未回傳可用結果，不將空結果當作資料不存在。
- 另查 kreier/ESP32 檔案清單，未找到明確標示背面／尺寸的來源；未宣稱全庫內容已核驗。

### 本輪仍受限的來源

`www.smartarduino.com` 原產品頁與正面圖片、`documentation.espressif.com` 模組／晶片 PDF、`startingelectronics.org` 的 ESP32-WROOM-testing 文章及已知正面圖片均遇代理 Tunnel 403。依命名猜測的 bottom 圖址也遭相同拒絕，不能證明該圖存在。

進一步研究所需的直接來源網域：`www.smartarduino.com`、`documentation.espressif.com`、`www.espressif.com`、`startingelectronics.org`。如需調整網路，應保留既有規則，只新增所需網域；本輪未變更環境網路設定。

### 本輪結論與交接

已補上舊版模組層級證據與可追溯尺寸候選，排除誤用 36 Pin 機構資料的風險。仍未取得 S1 同板背面與可靠製造版次，因此 **Sprint 1 未通過**，未進入 Sprint 2。下一步優先恢復上述直接來源存取，檢查廠商／原作者的完整照片與板版本資訊；若原來源也無法補足，再記錄原因並改選有正反面完整證據的公開 30 Pin 參考板。
