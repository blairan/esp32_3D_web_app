# Pico 2 W with headers · MicroPython 首課

目前已擴充為3課，新增外接LED及按鈕控制；最新契約見 [外接LED／按鈕課](pico-external-button.md)。以下保留首版基準與驗證歷史。

核對與實作日期：2026-10-31。第三種板型採 **Raspberry Pi Pico 2 W with headers**，入口 `?board=pico-2-w&lesson=blink#code`，接腳探索 `?board=pico-2-w#explore`。

## 板型決策與來源

Raspberry Pi 官方文件目前列兩代 Pico；反向時間排序的型號表首項為 Pico 2 W with headers，接著 Pico 2 with headers、Pico 2 W、Pico 2。官方第二代使用「with headers」，沒有將這個選定型號縮寫成 Pico 2 WH。

採 RP2350、520kB SRAM、4MB Flash、3.3V GPIO；40個主排針位置、26個可用GPIO。with headers 與未焊排針的 Pico 2 W 使用相同腳位及 MicroPython 韌體。這是微控制器板，不執行 Raspberry Pi OS／Linux。

固定官方證據：

- [官方型號、第二代規格與無線板配置](https://github.com/raspberrypi/documentation/blob/7376533ab86ea07acc77ef6a9f3c3e57fcff833d/documentation/asciidoc/microcontrollers/pico-series/about_pico.adoc)：型號表為 reverse chronological order；無線板 LED 由 WL_GPIO0 控制。
- [官方 Pico 2 W pinout](https://github.com/raspberrypi/documentation/blob/7376533ab86ea07acc77ef6a9f3c3e57fcff833d/documentation/asciidoc/microcontrollers/pico-series/images/pico2w-pinout.svg)：USB朝上，左排由1往下至20；右排底端21往上至40。40筆逐一對照，含8個分開的GND／AGND位置。第33腳標示GND，另有AGND用途。
- [MicroPython Pico 2 W 腳位別名](https://github.com/micropython/micropython/blob/321fba0d16fac669d39528ea1be6aefb5cd267c5/ports/rp2/boards/RPI_PICO2_W/pins.csv)：`LED,EXT_GPIO0`，與 WL_GPIO0 同一輸出。板載 LED 不在40個主排針中，也不是 GP25。
- [板型專用 MicroPython 韌體下載](https://micropython.org/download/RPI_PICO2_W/)：UF2／BOOTSEL 安裝流程。網站不下載或安裝韌體。
- 對照表：[pico-2-w-pins.csv](pico-2-w-pins.csv)；程式資料：`src/pico/board.ts`。

官方產品／文件主站與 datasheets 網址在本環境回403；改查官方 GitHub 文件與圖，固定上述版本後核對。MicroPython 官方下載及文件來源可直接使用。沒有引用第三方接腳圖。

3D 為自行建立的簡化幾何，呈現 Micro USB、BOOTSEL、RP2350、CYW43439、天線、LED及40個獨立接腳。尺寸、孔位及細節不是製造CAD；SWD僅作外觀，不當作主排針或一般GPIO。沿用旋轉、平移、縮放、簡化、重設及WebGL失敗後重試。

## 第一版範圍

- 右上板型選單加入 Pico 2 W · MicroPython，原 UNO／ESP32 Arduino 18課各自保留。
- 板載 LED 閃爍首課，不需外接線；不是把36份Arduino答案或匯出器轉成Python。
- 預設只有匯入、Pin建立與 `while True:`／pass 架構。學習者自己完成亮1秒、滅1秒；提示、可展開標準答案及複製保留。
- Python CodeMirror語法著色、4空白縮排、Ctrl+Space／Enter補全、參數占位及補全解說入口；裝置物件改名後提示跟隨名稱。
- 4篇繁中Wiki：入門、Pin／LED與接腳、時間與迴圈、UF2／Thonny上傳。均有短例子、常見錯誤、思考題及官方來源；目錄、返回、Esc、焦點還原及手機全螢幕。
- Worker虛擬時間執行、暫停／繼續、停止／重設、目前行與錯誤行列、3D LED及狀態指示。閱讀與匯出不重建編輯器或模型，不停止或重設程式。
- 自動保存獨立Pico草稿；首頁接續、JSON備份／匯入與錯誤保護。與Arduino備份格式分開，避免錯用語言或板型。還原不自動執行，不宣稱跨裝置同步；換電腦要帶走JSON。
- `main.py`預覽／下載使用自己當前的程式，保留原內容，只加板型及上傳說明註解。空架構、語法錯誤或不支援的寫法顯示行列並停用下載；JSON仍可備份未完成程式。

## 語法與執行契約

只接受：

```python
from machine import Pin
import time
# 一個可自行改名的板載 LED 物件
led = Pin("LED", Pin.OUT)
# 一個 while True: 區塊，內部4空白縮排
```

支援該物件的 `on()`、`off()`、`toggle()`、`value(0或1)` 及 `time.sleep(秒)`、`time.sleep_ms(整數毫秒)`；可在迴圈前作初始化控制。sleep秒數可用小數，但換算後須為整數毫秒，單次0～60000ms；每圈至少一次正值等待及LED指令。

逐行白名單解析為有限指令，不使用 eval、Function 或任意Python／JavaScript執行；不接受其他import、數字GPIO、變數算式、if／for、巢狀while、自訂函式、網路或感測器。每個指令保留原始行號；最多12000字元、400行、256陳述、每次推進500操作、總100000操作、24小時虛擬時間。錯誤關燈並停止，無等待迴圈在解析階段拒絕。

這是首課教學模擬，不是完整MicroPython直譯器、RP2350 CPU或精確電路模擬。Pico 2 W具無線硬體，但本版沒有Wi-Fi／Bluetooth課程或模擬。

## 實板流程

1. 從上述官方頁選 Pico 2 W 的穩定版 MicroPython UF2（with headers 相同），先備份板上舊檔案。
2. 按住 BOOTSEL 插入USB資料線，將UF2複製到出現的USB磁碟，等待重新啟動。
3. 使用Thonny選 MicroPython（Raspberry Pi Pico）及正確USB連接埠，開啟匯出的 `main.py`，先執行測試，再存入板上作啟動程式。Ctrl+C／停止可中斷迴圈。
4. `.py`是原始程式，`.uf2`是安裝直譯器韌體，`.json`是平台練習備份。網站不提供編譯後端或直接燒錄，也未替使用者程式進行實板驗證。

## 驗證與交接

- 原245項保留，新增14項，**259／259**單元測試通過：40個位置、GPIO／電源與GND角色、方向、LED時序、改名／註解／小數等待、錯誤行列、不支援語法、極端輸入與操作預算、當前程式匯出、JSON隔離及4篇Wiki。
- 匯出語法以Python 3 `ast.parse`檢查；這不是在真實MicroPython韌體上執行。`npm test`因此另需Python 3；CI的Ubuntu環境已有。
- `npm run test:hardware-runtime`：既有兩板12項產生後C++行為檢查通過；Arduino36份編譯仍由既有Pages gate檢查。
- `npm run build`通過，Pico頁、Python編輯器與Worker分別輸出獨立檔案；保留既有主要bundle大於500kB提示。
- Browser plugin not available；使用既有Playwright／Chromium。1440×1000及1280×900桌面、390／320px：頁面身分、非空、無框架錯誤overlay、無未處理瀏覽器例外、截圖及操作檢查。
- 首課空架構阻擋、Worker閃爍、暫停時間不變、繼續／停止／重設、Wiki目錄／返回、匯出逐字相等、補全接受、4空白縮排、讀取／匯出時原編輯器與canvas節點保留、JSON另瀏覽器匯入、錯誤格式、首頁接續、板型切換取消與返回草稿皆通過。
- 40腳清單逐一選取與面板對照、真正3D raycast、兩種平移不誤選、縮放及立即重設、WebGL失敗後保留功能與重試、深色面板搭配淺色頁面、手機全螢幕面板與焦點返回檢查通過。UNO及ESP32原匯出／執行／320及390px流程回歸通過。

下一個最小步驟：使用者試用第一課；後續可加入外接LED、按鈕與PWM。尚未進行Acer Aspire 5效能驗收或實體Pico 2 W燒錄與周邊測試；不將軟體檢查宣稱為硬體驗收。
