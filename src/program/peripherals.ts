import {ProgramError,type SourceLocation} from './language.ts';
import type {ClimateReading,DeviceInputs,OledGlyph,OledState} from './peripheralTypes.ts';
/** Explicit teaching models; these never load or execute native Arduino libraries. */
export class TeachingPeripherals {
 private inputs:DeviceInputs={climate:null,oledWired:false};private dhtReady=false;private climate:ClimateReading|null=null;
 private wireReady=false;private oled:OledState={begun:false,revision:0,glyphs:[]};private buffer:OledGlyph[]=[];private cursor={x:0,y:0};private size=1;
 constructor(inputs:DeviceInputs){this.setInputs(inputs);}
 setInputs(inputs:DeviceInputs){const c=inputs.climate;if(c!==null&&(!Number.isInteger(c.temperature)||c.temperature< -40||c.temperature>80||!Number.isInteger(c.humidity)||c.humidity<0||c.humidity>100))throw new ProgramError('溫溼度教學值須為整數：-40～80°C、0～100%RH。',{line:1,column:1});if(typeof inputs.oledWired!=='boolean')throw new ProgramError('OLED 接線狀態無效。',{line:1,column:1});this.inputs={climate:c?{...c}:null,oledWired:inputs.oledWired};}
 beginDht(){this.dhtReady=true;this.climate=null;}
 readDht(humidity:boolean,time:number,at:SourceLocation){if(!this.dhtReady)throw new ProgramError('請先呼叫 DHT 物件的 begin()。',at);if(!this.climate||time-this.climate.timeMs>=2000){if(!this.inputs.climate)throw new ProgramError('DHT22 讀取失敗；請檢查供電、DATA、接地或模擬失敗設定。',at);this.climate={...this.inputs.climate,timeMs:time};}return humidity?this.climate.humidity:this.climate.temperature;}
 wireBegin(sda:number,scl:number,at:SourceLocation){if(sda!==21||scl!==22)throw new ProgramError('本課 Wire.begin 只接受 SDA 21、SCL 22。',at);this.wireReady=true;}
 oledCall(method:string,args:(number|string)[],at:SourceLocation){
  if(method==='begin'){
   if(!this.wireReady)throw new ProgramError('請先 Wire.begin(21,22)，再初始化 OLED。',at);
   if(args[0]!==60)throw new ProgramError('此 OLED 模型固定 I²C 位址 0x3C（60）。',at);
   if(!this.inputs.oledWired)throw new ProgramError('OLED 供電、接地、SDA 或 SCL 接線無效。',at);
   this.oled={begun:true,revision:this.oled.revision+1,glyphs:[]};this.buffer=[];this.cursor={x:0,y:0};this.size=1;return;
  }
  if(!this.oled.begun)throw new ProgramError('請先呼叫 OLED 物件的 begin(SSD1306_SWITCHCAPVCC,0x3C)。',at);
  if(!this.inputs.oledWired)throw new ProgramError('OLED 接線失效，已停止更新。',at);
  if(method==='clearDisplay'){this.buffer=[];return;}
  if(method==='display'){this.oled={begun:true,revision:this.oled.revision+1,glyphs:this.buffer.map(g=>({...g}))};return;}
  if(method==='setTextSize'){if(args[0]!==1&&args[0]!==2)throw new ProgramError('本課文字大小只支援 1 或 2。',at);this.size=args[0] as number;return;}
  if(method==='setTextColor')return;
  if(method==='setCursor'){const [x,y]=args as number[];if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>127||y<0||y>63)throw new ProgramError('setCursor 只接受 x 0～127、y 0～63 整數。',at);this.cursor={x,y};return;}
  if(method==='print'||method==='println'){
   const text=args.length?String(args[0]):'';
   for(const char of text){if(char==='\n'){this.cursor.x=0;this.cursor.y+=8*this.size;continue;}if(this.cursor.x+6*this.size>128){this.cursor.x=0;this.cursor.y+=8*this.size;}if(this.cursor.y<64){if(this.buffer.length>=256)throw new ProgramError('文字緩衝區已達 256 字元，請 clearDisplay 後重畫。',at);this.buffer.push({text:char,...this.cursor,size:this.size});}this.cursor.x+=6*this.size;}
   if(method==='println'){this.cursor.x=0;this.cursor.y+=8*this.size;}return;
  }
  throw new ProgramError('不支援的 OLED 方法。',at);
 }
 snapshot(){return {climate:this.climate?{...this.climate}:null,oled:{...this.oled,glyphs:this.oled.glyphs.map(g=>({...g}))}};}
}
