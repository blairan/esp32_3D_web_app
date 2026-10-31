import type {PicoLessonId} from './types.ts';
export class PythonError extends Error {
 line:number;column:number;
 constructor(message:string,line:number,column=1){super(message);this.name='PythonError';this.line=line;this.column=column;}
}
export type PythonStep={kind:'on'|'off'|'toggle'|'wait';milliseconds:number;line:number}|{kind:'if';equals:0|1;then:PythonStep[];otherwise:PythonStep[];line:number}
export interface PythonProgram {setup:PythonStep[];loop:PythonStep[];name:string;source:string;lessonId:PicoLessonId;buttonName?:string}
export const picoScaffold=`from machine import Pin\nimport time\n\nled = Pin("LED", Pin.OUT)\n\nwhile True:\n    # 在這裡練習：開燈、等待、關燈、等待\n    pass\n`;
export const picoAnswer=`from machine import Pin\nimport time\n\nled = Pin("LED", Pin.OUT)\n\nwhile True:\n    led.on()\n    time.sleep(1)\n    led.off()\n    time.sleep(1)\n`;
// This is a deliberately small grammar, not a Python/JavaScript interpreter.
// Strip only comments outside strings; do not execute or rewrite learner code.
function withoutComment(line:string){let quote='';for(let i=0;i<line.length;i++){const c=line[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='#')return line.slice(0,i);}return line;}
const forbidden=new Set(['Pin','time','while','True','False','None','from','import','pass','print','exec','eval','open','__import__','for','if','elif','else','finally','class','def','return','try','except','break','continue','with','as','lambda','global','nonlocal','async','await','and','or','not','in','is','del','assert','raise','yield']);
export function parsePython(source:string,lessonId:PicoLessonId='blink'):PythonProgram {
 if(source.length>12000||source.split('\n').length>400)throw new PythonError('程式最多12000字元、400行。',1);
 const rows=source.split('\n').map((s,i)=>{const raw=withoutComment(s.replace(/\r$/,''));if(raw.includes('\t'))throw new PythonError('縮排請使用4個空白，不使用 Tab 字元。',i+1,raw.indexOf('\t')+1);return {text:raw.trim(),indent:raw.length-raw.trimStart().length,line:i+1};}).filter(r=>r.text);
 const setup:PythonStep[]=[],loop:PythonStep[]=[];let pinImport=false,timeImport=false,name='',buttonName='',index=0,count=0,loopLine=1;
 const error=(message:string,row=rows[index]):never=>{throw new PythonError(message,row?.line??source.split('\n').length,(row?.indent??0)+1);};
 const checkCount=()=>{if(++count>256)error('本課最多256個陳述。');};
 const simple=():PythonStep=>{
  const r=rows[index],text=r.text;checkCount();
  const call=text.match(/^([A-Za-z_]\w*)\.(on|off|toggle)\(\s*\)$/),value=text.match(/^([A-Za-z_]\w*)\.value\(\s*([01])\s*\)$/);
  if(call||value){if((call??value)![1]!==name||!name)error('請使用已建立的 LED 物件名稱；輸入腳不可當輸出。');index++;return {kind:call?call[2] as 'on'|'off'|'toggle':value![2]==='1'?'on':'off',milliseconds:0,line:r.line};}
  const wait=text.match(/^time\.(sleep|sleep_ms)\(\s*(\d+(?:\.\d+)?|\.\d+)\s*\)$/);
  if(wait){if(!timeImport)error('請先 import time。');const n=Number(wait[2]),ms=wait[1]==='sleep'?n*1000:n;if(!Number.isInteger(ms)||ms<0||ms>60000||(wait[1]==='sleep_ms'&&!Number.isInteger(n)))error('等待需為0～60000的整數毫秒；sleep() 可用秒的小數。');index++;return {kind:'wait',milliseconds:ms,line:r.line};}
  if(text==='pass')error('這是尚未完成的練習架構，請用自己的 LED 指令取代 pass。');
  return error('此行尚未支援或語法不完整；請依本課使用 LED 指令、等待及允許的按鈕 if／else。');
 };
 while(index<rows.length){const r=rows[index],text=r.text;if(r.indent!==0)error('while True 之前的匯入與初始化不需縮排。');
  if(text==='while True:'){if(!pinImport||!timeImport||!name||(lessonId==='button-led'&&!buttonName))error('請先匯入 Pin、time，並建立本課的 LED／按鈕物件。');loopLine=r.line;index++;break;}
  if(text==='from machine import Pin'||text==='import time'){checkCount();if(text.startsWith('from')){if(pinImport)error('Pin 只需匯入一次。');pinImport=true;}else{if(timeImport)error('time 只需匯入一次。');timeImport=true;}index++;continue;}
  const output=text.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*(["'])LED\2\s*,\s*Pin\.OUT\s*\)$/),external=text.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*15\s*,\s*Pin\.OUT\s*\)$/),input=text.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*14\s*,\s*Pin\.IN\s*,\s*Pin\.PULL_UP\s*\)$/);
  const declaration=output??external??input;
  if(declaration){checkCount();if(!pinImport)error('請先 from machine import Pin。');const n=declaration[1];if(forbidden.has(n)||n.startsWith('_'))error('此物件名稱為保留字，請重新命名。');if(n===name||n===buttonName)error('物件名稱重複，請使用不同名稱。');
   if(input){if(lessonId!=='button-led')error('此課不支援按鈕輸入。');if(buttonName)error('本課只接受一個按鈕物件。');buttonName=n;}
   else {if((lessonId==='blink')!==Boolean(output))error(lessonId==='blink'?'板載課使用 Pin("LED", Pin.OUT)，不支援外接 GPIO。':'外接課請使用 Pin(15, Pin.OUT)，不是板載 LED。');if(name)error('本課只接受一個 LED 物件。');name=n;}
   index++;continue;
  }
  if(/Pin\(\s*25\b/.test(text))error('Pico 2 W 的板載 LED 不在 GPIO25，請使用 Pin("LED", Pin.OUT)。');
  if(/\bPin\s*\(/.test(text))error(lessonId==='blink'?'本課僅支援 Pin("LED", Pin.OUT)。':'本課僅支援LED的 Pin(15, Pin.OUT)'+(lessonId==='button-led'?'及按鈕的 Pin(14, Pin.IN, Pin.PULL_UP)':'')+'；數字為GPIO編號，不是實體腳號。');
  setup.push(simple());
 }
 while(index<rows.length){const r=rows[index];if(r.indent!==4)error('while True 內每行請縮排4個空白；不支援巢狀迴圈。');
  if(r.text.startsWith('if ')){
   if(lessonId!=='button-led')error('此課不支援 if 分支。');
   const condition=r.text.match(/^if ([A-Za-z_]\w*)\.value\(\s*\)\s*==\s*([01]):$/);if(!condition||condition[1]!==buttonName)error('條件僅支援 if 已建立的按鈕.value() == 0或1:。');checkCount();index++;
   const branch=()=>{const body:PythonStep[]=[];while(index<rows.length&&rows[index].indent>4){if(rows[index].indent!==8)error('if／else 內請使用8個空白；不支援巢狀分支。');body.push(simple());}if(!body.length)error('分支不可留白，請完成 LED 指令。');return body;};
   const then=branch();let otherwise:PythonStep[]=[];if(rows[index]?.text==='else:'&&rows[index].indent===4){index++;otherwise=branch();}
   loop.push({kind:'if',equals:Number(condition![2]) as 0|1,then,otherwise,line:r.line});
  }else loop.push(simple());
 }
 if(!loop.length)throw new PythonError('需要非空白的 while True:，請先完成自己的閃爍程式。',loopLine);
 const waits=(body:PythonStep[]):boolean=>body.some(s=>s.kind==='wait'&&s.milliseconds>0||s.kind==='if'&&waits(s.then)&&waits(s.otherwise));
 const controls=(body:PythonStep[]):boolean=>body.some(s=>s.kind==='if'?controls(s.then)||controls(s.otherwise):s.kind!=='wait');
 if(!waits(loop))throw new PythonError('迴圈每條執行路徑至少需要一次大於0的等待，避免忙迴圈。',loopLine);
 if(!controls(loop))throw new PythonError('迴圈需要 LED 控制指令。',loopLine);
 return {setup,loop,name,buttonName:buttonName||undefined,lessonId,source};
}
export interface PythonSnapshot {timeMs:number;lit:boolean;line:number;operations:number;cycles:number;lastRead:0|1|null}
export class PythonRuntime {
 program:PythonProgram;snapshot:PythonSnapshot={timeMs:0,lit:false,line:0,operations:0,cycles:0,lastRead:null};private index=0;private readyAt=0;private setup=true;private branch:PythonStep[]=[];
 constructor(program:PythonProgram){this.program=program;}
 advanceTo(time:number,input:0|1|null=1):PythonSnapshot {
  if(!Number.isFinite(time)||time<this.snapshot.timeMs||time>86400000)throw new PythonError('虛擬時間超出0～24小時範圍，請重設。',this.snapshot.line||1);
  let budget=0;
  while(this.readyAt<=time){
   const body=this.setup?this.program.setup:this.program.loop;
   if(!this.branch.length&&this.index>=body.length){this.index=0;if(this.setup)this.setup=false;else this.snapshot.cycles++;continue;}
   const step=this.branch.length?this.branch.shift()!:body[this.index++];this.snapshot.line=step.line;
   if(++budget>500||++this.snapshot.operations>100000)throw new PythonError('已達本課執行預算，請停止或重設。',step.line);
   if(step.kind==='if'){if(input===null)throw new PythonError('按鈕接線未確認，無法讀取GP14。',step.line);this.snapshot.lastRead=input;this.branch=[...(input===step.equals?step.then:step.otherwise)];}
   else if(step.kind==='wait')this.readyAt+=step.milliseconds;else if(step.kind==='toggle')this.snapshot.lit=!this.snapshot.lit;else this.snapshot.lit=step.kind==='on';
  }
  this.snapshot.timeMs=time;return {...this.snapshot};
 }
}
export function exportPython(source:string,lessonId:PicoLessonId='blink'){parsePython(source,lessonId);return {filename:'main.py',code:'# Raspberry Pi Pico 2 W / MicroPython\n# Firmware: https://micropython.org/download/RPI_PICO2_W/\n# Install the board-specific UF2 first; upload main.py using Thonny.\n# This file contains your current practice, not an automatic answer.\n'+source+(source.endsWith('\n')?'':'\n')};}
