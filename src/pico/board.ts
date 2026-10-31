import type {Pin} from '../boards/types.ts';
export const picoBoard={key:'pico-2-w',name:'Raspberry Pi Pico 2 W',variant:'with headers · RP2350',logicVoltage:3.3,ramKB:520,flashMB:4,source:'https://github.com/raspberrypi/documentation/blob/7376533ab86ea07acc77ef6a9f3c3e57fcff833d/documentation/asciidoc/microcontrollers/pico-series/about_pico.adoc#models',firmware:'https://micropython.org/download/RPI_PICO2_W/'} as const;
const labels=['GP0','GP1','GND','GP2','GP3','GP4','GP5','GND','GP6','GP7','GP8','GP9','GND','GP10','GP11','GP12','GP13','GND','GP14','GP15','GP16','GP17','GND','GP18','GP19','GP20','GP21','GND','GP22','RUN','GP26','GP27','GND','GP28','ADC_VREF','3V3(OUT)','3V3_EN','GND','VSYS','VBUS'];
export const picoPins:Pin[]=labels.map((silkscreen,index)=>{
 const position=index+1,gpio=silkscreen.startsWith('GP')?Number(silkscreen.slice(2)):null;
 const ground=['GND','AGND'].includes(silkscreen),special=['RUN','3V3_EN'].includes(silkscreen);
 const restrictions=gpio!==null?(gpio>=26?`GPIO${gpio}／ADC${gpio-26}，3.3V 輸入／輸出；ADC 使用範圍 0～3.3V。`:`GPIO${gpio}，3.3V 數位輸入／輸出；不是實體腳號 ${position}。`):ground?(position===33?'類比接地，與板上 GND 共地。':'共同接地；每個實體 GND 可分別點選。'):silkscreen==='VBUS'?'USB 5V 電源，非 GPIO，不可接至 3.3V 訊號腳。':silkscreen==='VSYS'?'系統供電端，非 GPIO；外部供電請先核對官方供電規則。':silkscreen==='3V3(OUT)'?'穩壓 3.3V 輸出，非 GPIO；不要直接接入外部 5V。':silkscreen==='ADC_VREF'?'ADC 參考電壓，非一般電源或 GPIO。':silkscreen==='RUN'?'晶片重設／啟用端，拉低會重設；非一般 GPIO。':'3.3V 穩壓器啟用控制端，非一般 GPIO。';
 return {pinId:`pico:${position}`,header:position<=20?'LEFT':'RIGHT',position,silkscreen,officialName:position===33?'GND / AGND':silkscreen,gpio,role:gpio!==null?'gpio':ground?'ground':special?'enable':'power',restrictions,category:gpio!==null?'gpio':ground?'ground':special?'special':'power',x:position<=20?-8.89:8.89,y:(9.5-(position<=20?index:40-position))*2.54};
});
export const picoPinById=new Map(picoPins.map(p=>[p.pinId,p]));
