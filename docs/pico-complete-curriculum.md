# Pico 全部基礎專題補齊

2026-11-09（Asia/Taipei）。使用者授權「其它專題全部做完」。以既有ESP32／UNO十八個基礎主題為對照，補齊Pico剩餘十二課；既有八課保留，因此Pico現有20課、23篇Wiki，三板型共56課。兩個額外入門課（板載／外接LED、PIR基本／延遲）皆保留，不刪除使用者草稿。

## 新課清單與實際配置

| 課 | ID | 內容與接腳 |
|---|---|---|
| 09 | dual-led | GP15／13，各220Ω與LED，交替1秒 |
| 10 | traffic-light | GP15紅／13黃／12綠，各220Ω，3／1／3秒 |
| 11 | button-counter | GP14 PULL_UP，下降邊緣計數，GP15提示，50ms理想取樣 |
| 12 | buzzer-doorbell | GP14按鈕，GP15控制3.3V相容主動蜂鳴器模組S，模組另供3V3／GND；無音效播放 |
| 13 | rgb-mixing | GP15 R／13 G／12 B，共陰極、每色220Ω，1000Hz、duty_u16 0～65535 |
| 14 | servo-angle | GP15 PWM 50Hz，duty_ns 500000／1500000／2500000示意0／90／180°；外部5V、共地 |
| 15 | ultrasonic-alert | GP13 TRIG、GP26 ECHO，外部5V，Echo經1kΩ／2kΩ分壓；GP15 LED，小於20cm警示 |
| 16 | pir-delay | GP14 INPUT、PIR外部5V／3.3V OUT、共地，GP15 LED，最後活動後約3秒熄燈 |
| 17 | climate-dht | GP16 DATA，3.3V內建上拉DHT22模組，每2秒樣本；GP15溫度警示 |
| 18 | oled-i2c | I2C0 GP12 SDA／13 SCL、400kHz、3.3V SSD1306 128×64，預設0x3C |
| 19 | seven-counter | 3.3V相容TM1637，GP13 CLK／12 DIO，0～9999循環；不是I²C |
| 20 | environment-lab | GP16 DHT22、GP12／13 OLED、GP15 LED，整合量測、提交顯示與門檻 |

課程網址沿用 `?board=pico-2-w&lesson=ID#intro`；原01～08的ID與草稿鍵不變。選單依課號排列。

## 教學流程與實作

全部課提供四步、元件／端點、可鍵盤操作接線、範例顯示及原接線還原、空架構與pass、可展開答案、跟隨物件改名的補全、對應繁中Wiki、實際輸出／變數／感測樣本、main.py預覽／下載與JSON備份。答案不自動填入編輯器，Wiki只提供單一概念例子。新課以程式控制多路輸出，沒有套用舊單LED的手動開關；既有八課手動模式保留。

新增獨立的受限MicroPython AST與虛擬時間引擎。原八課仍走原解析器，不擴張舊課白名單。新引擎支援本課指定Pin／PWM／I2C／DHT22／SSD1306_I2C／TM1637物件、32位元整數狀態、加減乘／整數除法／餘數、單一比較及最多三層分支、int與str、sleep_ms／sleep_us／整數秒sleep、ticks_ms／ticks_diff、time_pulse_us。比較只作if條件，顯示字串不當成數值。硬體物件只在while之前建立；分支外先初始化狀態，輸出／量測／等待呼叫獨立一行。

不使用eval、Function、任意Python或使用者迴圈／函式／標頭／網路。最多12000字元、400行、256陳述、單算式128符號／32層、每次推進500操作、總100000操作、24小時虛擬時間。每條while路徑需正值常數等待；無進展或超界會停止。錯誤附原始行列。

接線共用既有可驗證的離散元件規則，以明確資料映射Pico的實際GPIO／40腳及3.3V電源；畫面與JSON始終使用pico端點。內部元件圖的對照ID不出現在使用者接線資料中。3D共用現有元件幾何，以Pico接腳座標注入；整合課擴大取景以納入OLED。原ESP32／UNO預設渲染配置保留。

## 狀態與感測

- 四步、Wiki、匯出不重建編輯器、Worker或3D；暫停保留虛擬時間、樣本、輸出及顯示。改理想輸入後於繼續取樣才生效。
- DHT輸入為−40～80°C、0～100%整數教學值；measure更新快取，兩秒內保留同一樣本。fault在下一次裝置操作時診斷停止。
- OLED fill／text僅改緩衝，show才提交；字串限ASCII、每次32字元、最多32段，檢查128×64邊界。TM1637僅brightness 0～7與number 0～9999，數值更新提交顯示。
- 超音波需先GP13 HIGH至少10µs再LOW，GP26 HIGH讀取以30000µs逾時。理想距離2～400cm，0代表無回波，回傳負值；距離近似pulse // 58。不模擬真實聲學、Echo連續波形或讀脈衝的阻塞時間。
- PIR理想OUT高電位代表活動，不等於持續人體存在；ticks_diff以RP2的2³⁰刻度處理回捲。Servo僅教學脈寬／角度映射，需依實物規格校正；不計算扭力、電源電流或運動物理。
- LED數位波形與RGB PWM參考／佔空比曲線使用實際輸出命令。Servo、OLED、七段及蜂鳴器不填入假的LED圖表或儀表；停止、錯誤及重設清除輸出與已提交畫面。

## 檔案、實板與驅動

JSON保留v1。僅新課加入可選inputs：distance、temperature、humidity、fault、motion；缺欄位使用預設，拒絕錯型別與超界。舊八課檔案內容／鍵不變；不同課獨立保存，跨課匯入保護離開課的草稿，不自動執行。

main.py保留目前使用者程式與註解，只加課程、板型、驅動與上傳說明；不將完整答案替換進來，不要求模擬接線完成。仍需Pico 2 W專用MicroPython UF2與Thonny。SSD1306／TM1637需把對應驅動另存實板，預覽提供來源連結：

- [MicroPython SSD1306驅動](https://github.com/micropython/micropython-lib/tree/master/micropython/drivers/display/ssd1306)
- [TM1637驅動](https://github.com/mcauser/micropython-tm1637)
- [Pin](https://docs.micropython.org/en/latest/library/machine.Pin.html)、[PWM](https://docs.micropython.org/en/latest/library/machine.PWM.html)、[I2C](https://docs.micropython.org/en/latest/library/machine.I2C.html)、[time](https://docs.micropython.org/en/latest/library/time.html)、[time_pulse_us](https://docs.micropython.org/en/latest/library/machine.html#machine.time_pulse_us)

網站故障會停止／清除輸出；實板的DHT／I2C例外、Ctrl+C、PWM殘留狀態仍須自行加入例外處理與安全復原。供電、模組腳位、上拉、馬達脈寬與GPIO電壓需按實物核對。不新增編譯後端、UF2產生、直接燒錄或任意MicroPython能力；未驗證實板與Acer效能。

## 驗證證據

- `npm test`：原354項保留、Wiki數量更新，新增62項，共416通過。涵蓋十二課每條範例線缺失、多路時序、按鈕計數、PWM／Servo範圍、TRIG／逾時、PIR回捲、DHT快取／負溫度／故障、OLED緩衝／邊界、七段回零、整合輸出、名稱／語法／預算、JSON與補全。
- 十二課匯出均以Python ast.parse檢查；實際Python在受控Pin／PWM／I2C／DHT／SSD1306／TM1637／time模組下各執行10次等待，逐筆比對VM輸出及已提交字元／座標。這是軟體行為對照，不是MicroPython韌體或硬體編譯／量測。
- `npm run build`、既有 `npm run test:hardware-runtime` 十二項C++行為通過。保留現有bundle大小提示，新增內容仍低於首版5MB傳輸目標。
- Browser插件未提供；以既有Playwright／Chromium軟體WebGL驗證十二課1440px、1280×720、390／320px的四步、接線、執行／暫停、DOM狀態、Wiki／預覽、輸入／樣本與無水平溢位，無頁面或主控台錯誤。
- 補做DHT故障／接線中斷清輸出、暫停改輸入、改名補全、逐字main.py下載、驅動連結、JSON輸入還原／跨課保護及Pico GP13真實raycast接線／範例還原；原Pico八課與ESP32／UNO各四個代表課（RGB／Servo／OLED／整合）的共用3D及執行回歸通過。

發布沿既有main→GitHub Pages，兩板36份Arduino編譯仍為gate；公開版需再驗證。下一步為使用者逐課試用與實板核對，本輪基礎課程清單已補齊，不自動擴張Wi-Fi／藍牙或其它硬體範圍。
