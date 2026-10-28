import sourcePins from '../pins.json' with {type:'json'};
import unoPins from './uno-pins.json' with {type:'json'};
import type {BoardId,BoardDefinition,Pin,PinCategory} from './types.ts';
export type {BoardId,BoardDefinition,Pin,PinCategory} from './types.ts';
export function readBoard(value:string|null|undefined):BoardId{return value==='uno-r3'?'uno-r3':'esp32';}
// A board is fixed for one page lifetime. Switching navigates after confirming loss of work.
export const pageBoardId=readBoard(typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('board'));
const espPins:Pin[]=sourcePins.map(p=>({...p,x:p.header==='J2'?-12.7:12.7,y:(10-p.position)*2.54,category:(p.role==='power'?'power':p.role==='ground'?'ground':p.role==='flash_reserved'?'reserved':[34,35,36,39].includes(p.gpio??-1)?'input':p.role==='enable'||/啟動|UART|JTAG/.test(p.restrictions)?'special':'gpio') as PinCategory}));
export const boards:Record<BoardId,BoardDefinition>={
 esp32:{id:'esp32-devkitc-v4-wroom-32e',key:'esp32',name:'ESP32-DevKitC V4',module:'ESP32-WROOM-32E',source:'https://github.com/espressif/esp-dev-kits/blob/bd4d4ac18657e73583af3d7c0b0a23c3cddf3735/docs/en/esp32-devkitc/user_guide.rst',logicVoltage:3.3,adcMax:4095,pwmPins:[23,22,21],pins:espPins},
 'uno-r3':{id:'uno-r3',key:'uno-r3',name:'Arduino UNO R3',module:'ATmega328P · 5V',source:'https://github.com/arduino/docs-content/blob/3c68978c438b31198e3e33b21477f4513c1e09f4/content/hardware/uno/boards/uno-rev3/downloads/A000066-full-pinout.pdf',logicVoltage:5,adcMax:1023,pwmPins:[3,5,6,9,10,11],pins:unoPins as Pin[]},
};
export const activeBoard=boards[pageBoardId];
export function getBoard(id:BoardId='esp32'){return boards[id];}
export function unoPin(gpio:number){return 'uno:'+(gpio>=14?'A'+(gpio-14):'D'+gpio);}
