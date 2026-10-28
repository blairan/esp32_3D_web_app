
import {activeBoard,pageBoardId} from './boards/registry.ts';
import type {Pin,PinCategory} from './boards/types.ts';
export type {Pin,PinCategory} from './boards/types.ts';
export const categories: Record<PinCategory, { label: string; color: string }> = {
  gpio: { label: '一般 GPIO', color: '#3563e9' },
  input: { label: '只能輸入', color: '#c55260' },
  power: { label: '電源', color: '#3978c4' },
  ground: { label: '接地', color: '#64748b' },
  special: { label: '特殊功能', color: '#b87a12' },
  reserved: { label: pageBoardId==='uno-r3'?'保留未接':'Flash 保留', color: '#8360ae' },
};
export function categoryFor(pin: {role: string; gpio: number | null; restrictions: string}): PinCategory {
  if (pin.role === 'power') return 'power';
  if (pin.role === 'ground') return 'ground';
  if (pin.role === 'flash_reserved') return 'reserved';
  if ([34, 35, 36, 39].includes(pin.gpio ?? -1)) return 'input';
  if (pin.role === 'enable' || /啟動|UART|JTAG/.test(pin.restrictions)) return 'special';
  return 'gpio';
}
// Teaching geometry: pin order is verified; pitch and placement are illustrative, not manufacturing CAD.
export const pins:Pin[]=activeBoard.pins;
export const pinById=new Map(pins.map(pin=>[pin.pinId,pin]));
export const board=activeBoard;
export function titleFor(pin: Pin) { return pageBoardId==='uno-r3'?pin.silkscreen:pin.gpio === null ? pin.silkscreen : `GPIO ${pin.gpio}`; }
export function functionFor(pin: Pin) {
  if(pageBoardId==='uno-r3')return pin.role==='ground'?'共同電位參考／接地':pin.role==='power'?pin.silkscreen+' 電源／參考':pin.role==='gpio'?(pin.gpio!>=14?'類比輸入／數位 I/O':'數位輸入／輸出'):'特殊用途，詳見提醒';
  if (pin.role === 'enable') return '晶片使能 / 重設';
  if (pin.role === 'power') return `${pin.silkscreen === '3V3' ? '3.3' : '5'} V 電源`;
  if (pin.role === 'ground') return '共同電位參考 / 接地';
  if (pin.category === 'input') return '數位輸入（不支援輸出）';
  if (pin.category === 'reserved') return 'SPI Flash 內部通訊';
  return '數位輸入 / 數位輸出';
}
export function descriptionFor(pin: Pin) {
  if(pageBoardId==='uno-r3')return pin.role==='ground'?'三個主要排針 GND 電氣共地，各位置獨立選取。':pin.role==='power'?'供電端不是 GPIO；IOREF 為5V參考，VIN 為供電輸入。不可把不同電源直接互接。':pin.role==='gpio'?'UNO R3 採5V邏輯。數位腳 D0～D13，類比 A0～A5；ADC 0～1023。請核對模組供電及訊號相容性。':pin.restrictions;
  if (pin.category === 'reserved') return '這個接腳連接模組內部的 Flash 記憶體。可以查看資訊，但請勿連接外部元件或用作一般 GPIO，以免影響程式執行。';
  if (pin.category === 'input') return '這個接腳只能讀取訊號，不能驅動 LED。它沒有可由軟體啟用的內部上拉或下拉，實際接線需要合適的外部電路。';
  if (pin.role === 'power') return '這是電源接腳，不是 GPIO。Micro USB、5V 接腳與 3V3 接腳供電必須擇一，不可同時接入多組電源。';
  if (pin.role === 'ground') return 'GND 是電路共同的電位參考。這塊板有三個 GND 接腳，電氣上共地，但在模型中各自保有獨立位置。';
  if (pin.role === 'enable') return 'EN 控制晶片使能與重設。拉低會重設晶片，並非可用來控制外部元件的一般 GPIO。';
  if ([0, 2, 5, 12, 15].includes(pin.gpio ?? -1)) return pin.gpio === 12 ? 'GPIO12 是啟動綁定腳；重設時的電平會影響 Flash 供電設定。初學接線請優先選用一般 GPIO，避免影響開機。' : '這是啟動綁定腳。上電或重設時，外部電路的電平可能影響啟動設定；它並非在所有情況下都能任意接線。';
  if ([1, 3].includes(pin.gpio ?? -1)) return '這個接腳與 UART0 燒錄、啟動訊息及除錯通訊共用。連接外部元件前，請先考慮 USB 序列通訊的影響。';
  if ([16, 17].includes(pin.gpio ?? -1)) return '在本實驗室選定的 WROOM 模組上可作一般 I/O。其他搭載 WROVER 的板型可能將此腳留給內部記憶體，不能直接套用。';
  return '一般用途的輸入／輸出接腳，可用來讀取數位訊號或控制外部元件。ESP32 採 3.3 V 邏輯，請勿將 GPIO 視為可直接承受 5 V。';
}
