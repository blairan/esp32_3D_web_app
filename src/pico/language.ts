export class PythonError extends Error {
 line:number;column:number;
 constructor(message:string,line:number,column=1){super(message);this.name='PythonError';this.line=line;this.column=column;}
}
export interface PythonStep {kind:'on'|'off'|'toggle'|'wait';milliseconds:number;line:number}
export interface PythonProgram {setup:PythonStep[];loop:PythonStep[];name:string;source:string}
export const picoScaffold=`from machine import Pin\nimport time\n\nled = Pin("LED", Pin.OUT)\n\nwhile True:\n    # 在這裡練習：開燈、等待、關燈、等待\n    pass\n`;
export const picoAnswer=`from machine import Pin\nimport time\n\nled = Pin("LED", Pin.OUT)\n\nwhile True:\n    led.on()\n    time.sleep(1)\n    led.off()\n    time.sleep(1)\n`;
// This is a deliberately small grammar, not a Python/JavaScript interpreter.
// Strip only comments outside strings; do not execute or rewrite learner code.
function withoutComment(line:string){let quote='';for(let i=0;i<line.length;i++){const c=line[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='#')return line.slice(0,i);}return line;}
const forbidden=new Set(['Pin','time','while','True','False','None','from','import','pass','print','exec','eval','open','__import__','for','if','else','class','def','return','try','except','break','continue','with','as','lambda','global','nonlocal','async','await','and','or','not','in','is','del','assert','raise','yield']);
export function parsePython(source:string):PythonProgram {
 if(source.length>12000||source.split('\n').length>400)throw new PythonError('程式最多12000字元、400行。',1);
 const setup:PythonStep[]=[],loop:PythonStep[]=[];let pinImport=false,timeImport=false,name='',inLoop=false,loopLine=1;let count=0;
 const lines=source.split('\n');
 for(let i=0;i<lines.length;i++){
  const raw=withoutComment(lines[i].replace(/\r$/,''));if(!raw.trim())continue;
  if(raw.includes('\t'))throw new PythonError('縮排請使用4個空白，不使用 Tab 字元。',i+1,raw.indexOf('\t')+1);
  const indent=raw.length-raw.trimStart().length,text=raw.trim(),line=i+1,column=indent+1;
  const error=(message:string):never=>{throw new PythonError(message,line,column);};
  if(++count>256)error('本課最多256個陳述。');
  if(!inLoop){
   if(indent!==0)error('while True 之前的匯入與初始化不需縮排。');
   if(text==='from machine import Pin'){if(pinImport)error('Pin 只需匯入一次。');pinImport=true;continue;}
   if(text==='import time'){if(timeImport)error('time 只需匯入一次。');timeImport=true;continue;}
   const declaration=text.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*(["'])LED\2\s*,\s*Pin\.OUT\s*\)$/);
   if(declaration){if(!pinImport)error('請先 from machine import Pin。');if(name)error('本課只接受一個板載 LED 物件。');if(forbidden.has(declaration[1])||declaration[1].startsWith('_'))error('此物件名稱為保留字，請重新命名。');name=declaration[1];continue;}
   if(text==='while True:'){if(!pinImport||!timeImport||!name)error('請先匯入 Pin、time 並建立 Pin("LED", Pin.OUT)。');inLoop=true;loopLine=line;continue;}
  }else if(indent!==4)error('while True 內每行請縮排4個空白；本課不支援巢狀迴圈或分支。');
  const body=inLoop?loop:setup;
  const call=text.match(/^([A-Za-z_]\w*)\.(on|off|toggle)\(\s*\)$/);
  const value=text.match(/^([A-Za-z_]\w*)\.value\(\s*([01])\s*\)$/);
  if(call||value){const object=(call??value)![1];if(!name||object!==name)error('請使用已建立的 LED 物件名稱。');body.push({kind:call?call[2] as 'on'|'off'|'toggle':value![2]==='1'?'on':'off',milliseconds:0,line});continue;}
  const wait=text.match(/^time\.(sleep|sleep_ms)\(\s*(\d+(?:\.\d+)?|\.\d+)\s*\)$/);
  if(wait){if(!timeImport)error('請先 import time。');const n=Number(wait[2]),ms=wait[1]==='sleep'?n*1000:n;if(!Number.isInteger(ms)||ms<0||ms>60000||(wait[1]==='sleep_ms'&&!Number.isInteger(n)))error('等待需為0～60000的整數毫秒；sleep() 可用秒的小數。');body.push({kind:'wait',milliseconds:ms,line});continue;}
  if(text==='pass')error('這是尚未完成的練習架構，請用自己的 LED 指令取代 pass。');
  error(/Pin\(\s*25\b/.test(text)?'Pico 2 W 的板載 LED 不在 GPIO25，請使用 Pin("LED", Pin.OUT)。':'本課僅支援 Pin("LED", Pin.OUT)、LED on/off/toggle/value 與 time.sleep/sleep_ms；此行尚未支援或語法不完整。');
 }
 if(!inLoop||loop.length===0)throw new PythonError('需要非空白的 while True:，請先完成自己的閃爍程式。',loopLine);
 if(!loop.some(s=>s.kind==='wait'&&s.milliseconds>0))throw new PythonError('迴圈至少需要一次大於0的等待，避免無等待的忙迴圈。',loopLine);
 if(!loop.some(s=>s.kind!=='wait'))throw new PythonError('迴圈需要 LED 控制指令。',loopLine);
 return {setup,loop,name,source};
}
export interface PythonSnapshot {timeMs:number;lit:boolean;line:number;operations:number;cycles:number}
export class PythonRuntime {
 program:PythonProgram;snapshot:PythonSnapshot={timeMs:0,lit:false,line:0,operations:0,cycles:0};private index=0;private readyAt=0;private setup=true;
 constructor(program:PythonProgram){this.program=program;}
 advanceTo(time:number):PythonSnapshot {
  if(!Number.isFinite(time)||time<this.snapshot.timeMs||time>86400000)throw new PythonError('虛擬時間超出0～24小時範圍，請重設。',this.snapshot.line||1);
  let budget=0;
  while(this.readyAt<=time){
   const body=this.setup?this.program.setup:this.program.loop;
   if(this.index>=body.length){this.index=0;if(this.setup)this.setup=false;else this.snapshot.cycles++;continue;}
   const step=body[this.index++];this.snapshot.line=step.line;
   if(++budget>500||++this.snapshot.operations>100000)throw new PythonError('已達本課執行預算，請停止或重設。',step.line);
   if(step.kind==='wait')this.readyAt+=step.milliseconds;else if(step.kind==='toggle')this.snapshot.lit=!this.snapshot.lit;else this.snapshot.lit=step.kind==='on';
  }
  this.snapshot.timeMs=time;return {...this.snapshot};
 }
}
export function exportPython(source:string){parsePython(source);return {filename:'main.py',code:'# Raspberry Pi Pico 2 W / MicroPython\n# Firmware: https://micropython.org/download/RPI_PICO2_W/\n# Install the board-specific UF2 first; upload main.py using Thonny.\n# This file contains your current practice, not an automatic answer.\n'+source+(source.endsWith('\n')?'':'\n')};}
