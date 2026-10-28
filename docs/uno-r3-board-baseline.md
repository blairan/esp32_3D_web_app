# UNO R3 資料基準 v0.3

2026-10-28（Asia/Taipei）。依已確認的 UNO R3／全部18課規劃新增第二種板型，保留既有 ESP32 DevKitC V4／WROOM-32E。不是 UNO R4，也不是 UNO R3 SMD 版本。

## 官方來源與核對

Arduino docs-content 官方庫固定版本 `3c68978c438b31198e3e33b21477f4513c1e09f4`：

- [A000066 full pinout](https://github.com/arduino/docs-content/blob/3c68978c438b31198e3e33b21477f4513c1e09f4/content/hardware/uno/boards/uno-rev3/downloads/A000066-full-pinout.pdf)
- [A000066 schematic](https://github.com/arduino/docs-content/blob/3c68978c438b31198e3e33b21477f4513c1e09f4/content/hardware/uno/boards/uno-rev3/downloads/A000066-schematics.pdf)
- [官方資料表](https://github.com/arduino/docs-content/blob/3c68978c438b31198e3e33b21477f4513c1e09f4/content/hardware/uno/boards/uno-rev3/datasheet/en-datasheet.md) 與同目錄 boardTopology.png。
- [ArduinoCore-avr standard pins](https://github.com/arduino/ArduinoCore-avr/blob/11b9130371e8447920edb65a75706a6c951e51fc/variants/standard/pins_arduino.h)：交叉核對 A0=14、A4/SDA=18、A5/SCL=19、PWM D3／5／6／9／10／11。

本環境 docs.arduino.cc HTTP 被代理403拒絕，因此從官方 GitHub 版本庫取得原始檔。已讀取 PDF 文字、檢視 pinout 圖與板件位置圖，核對四組主排針次序、供電／地、A4／SDA及A5／SCL別名，再與 AVR core 對照。未以第三方同名板照片代替官方資料。

取得的檔案 SHA-256：

- Pinout：`088b4d7d776abf443cb050c31875221aa5fc7f0533470b33e035c249cf240007`
- Schematic：`2c1041200352485393108e03c5117a07d4ea03954654485526c2c56cd01f7a42`
- pins_arduino.h：`d313845f9916c1f21c8ba9848d40806f5caab52529ad510e81b3f15318441631`

## 32 個主排針端點

以 USB／DC 插座朝上、元件面朝前為教學視角：

| 排針組 | 由上往下 | 位置 |
|---|---|---|
| DIGITAL-HIGH | SCL、SDA、AREF、GND、D13、D12、D11、D10、D9、D8 | 右上 |
| DIGITAL-LOW | D7、D6、D5、D4、D3、D2、D1、D0 | 右下 |
| POWER | NC、IOREF、RESET、3V3、5V、GND、GND、VIN | 左上 |
| ANALOG | A0、A1、A2、A3、A4、A5 | 左下 |

資料存 [uno-r3-pins.csv](uno-r3-pins.csv) 及 src/boards/uno-pins.json。每個物理位置有獨立 `uno:` pinId，GND 三位置保留。A4／SDA及A5／SCL各自保持兩個可選物件，接線分析將別名合併為同一訊號。畫面標籤依官方 pinout 正規化，不保證與各批次板上字樣逐字一致；NC為保留端。

ICSP 與 USB 介面 ICSP 只呈現外觀，不在32個互動端點中；不得宣稱所有板上焊點均已開放。USB-B、DC插座與排針方向依參考資料呈現，但尺寸／間距／元件精細位置為簡化示意，不是製造CAD，也未量測實板。

D0／D1與USB序列通訊共用；D10～D13涉及SPI；AREF／IOREF／RESET／VIN／NC有獨立說明，不能當一般GPIO。UNO邏輯5V，ADC10位元0～1023；板上3.3V供電腳並未變成5V腳。實板仍須核對電流額定、供電與負載能力。

## 素材與來源

模型為本專案自行建立的簡化幾何，沒有匯入第三方 GLB、CAD 或官方圖像。官方圖像與PDF只作本次核對，未放入網站資產。Arduino pinout 原件標示 CC BY-SA 4.0；此表及對應 UNO 接腳資料的整理標示來源並依同一授權提供，並註明新增中文說明及示意座標。參見 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。不藉此更改其他程式碼的授權或宣稱 Arduino 背書。
