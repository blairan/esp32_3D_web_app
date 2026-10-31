import type {PicoLessonId} from './types.ts';
import {hasPicoPWM} from './types.ts';
import {PythonError} from './pythonError.ts';
import {parseExpression,type PythonExpression} from './expressions.ts';
export {PythonError} from './pythonError.ts';
export type PythonStep={kind:'on'|'off'|'toggle'|'wait';milliseconds:number;line:number}|{kind:'if';equals:0|1;then:PythonStep[];otherwise:PythonStep[];line:number}|{kind:'compare';left:PythonExpression;right:PythonExpression;operator:'=='|'!='|'>'|'<'|'>='|'<=';then:PythonStep[];otherwise:PythonStep[];line:number}|{kind:'assign';name:string;value:PythonExpression;line:number}|{kind:'freq'|'duty';value:PythonExpression;line:number};
export interface PythonProgram {setup:PythonStep[];loop:PythonStep[];name:string;source:string;lessonId:PicoLessonId;buttonName?:string;adcName?:string;pwm:boolean}
function isBranch(s:PythonStep):s is Extract<PythonStep,{kind:'if'|'compare'}>{return s.kind==='if'||s.kind==='compare';}
export const picoScaffold=`from machine import Pin\nimport time\n\nled = Pin("LED", Pin.OUT)\n\nwhile True:\n    # 在這裡練習：開燈、等待、關燈、等待\n    pass\n`;
export const picoAnswer=`from machine import Pin\nimport time\n\nled = Pin("LED", Pin.OUT)\n\nwhile True:\n    led.on()\n    time.sleep(1)\n    led.off()\n    time.sleep(1)\n`;
// This is a deliberately small grammar, not a Python/JavaScript interpreter.
// Strip only comments outside strings; do not execute or rewrite learner code.
function withoutComment(line:string){let quote='';for(let i=0;i<line.length;i++){const c=line[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='#')return line.slice(0,i);}return line;}
const forbidden=new Set(['Pin','time','while','True','False','None','from','import','pass','print','exec','eval','open','__import__','for','if','elif','else','finally','class','def','return','try','except','break','continue','with','as','lambda','global','nonlocal','async','await','and','or','not','in','is','del','assert','raise','yield']);
export function parsePython(source:string,lessonId:PicoLessonId='blink'):PythonProgram {
 if(source.length>12000||source.split('\n').length>400)throw new PythonError('程式最多12000字元、400行。',1);
 const rows=source.split('\n').map((s,i)=>{const raw=withoutComment(s.replace(/\r$/,''));if(raw.includes('\t'))throw new PythonError('縮排請使用4個空白，不使用 Tab 字元。',i+1,raw.indexOf('\t')+1);return {text:raw.trim(),indent:raw.length-raw.trimStart().length,line:i+1};}).filter(r=>r.text);
 const setup:PythonStep[]=[],loop:PythonStep[]=[];let pinImport=false,timeImport=false,name='',buttonName='',adcName='',frequencySet=false,index=0,count=0,loopLine=1;
 const pwm=hasPicoPWM(lessonId),imported=new Set<string>(),variables=new Set<string>();
 const error=(message:string,row=rows[index]):never=>{throw new PythonError(message,row?.line??source.split('\n').length,(row?.indent??0)+1);};
 const checkCount=()=>{if(++count>256)error('本課最多256個陳述。');};
 const simple=(branch=false):PythonStep=>{
  const r=rows[index],text=r.text;checkCount();
  if(pwm){
   const method=text.match(/^([A-Za-z_]\w*)\.(freq|duty_u16)\(\s*(.*?)\s*\)$/);
   if(method){if(method[1]!==name||!name)error('請使用已建立的PWM物件名稱。');const value=parseExpression(method[3],variables,adcName||undefined,r.line,r.indent+1);
    if(method[2]==='freq'){if(value.kind!=='integer'||value.value<1||value.value>20000)error('本課freq需為1～20000Hz的整數常值。');frequencySet=true;}
    else {if(!frequencySet)error('請先設定PWM freq()再寫入duty。');if(value.kind==='integer'&&(value.value<0||value.value>65535))error('duty_u16需為0～65535。');}
    index++;return {kind:method[2]==='freq'?'freq':'duty',value,line:r.line};
   }
   const assign=text.match(/^([A-Za-z_]\w*)\s*=\s*([^=].*)$/);
   if(assign){const n=assign[1];if(forbidden.has(n)||imported.has(n)||n.startsWith('_')||[name,buttonName,adcName].includes(n))error('此變數名稱與保留字或物件衝突。');if(branch&&!variables.has(n))error('請先在分支外初始化變數，避免未宣告的路徑。');const value=parseExpression(assign[2],variables,adcName||undefined,r.line,r.indent+1);variables.add(n);index++;return {kind:'assign',name:n,value,line:r.line};}
  }
  const call=text.match(/^([A-Za-z_]\w*)\.(on|off|toggle)\(\s*\)$/),value=text.match(/^([A-Za-z_]\w*)\.value\(\s*([01])\s*\)$/);
  if(call||value){if(pwm)error('PWM物件請用freq()與duty_u16()，不使用數位on／off。');if((call??value)![1]!==name||!name)error('請使用已建立的 LED 物件名稱；輸入腳不可當輸出。');index++;return {kind:call?call[2] as 'on'|'off'|'toggle':value![2]==='1'?'on':'off',milliseconds:0,line:r.line};}
  const wait=text.match(/^time\.(sleep|sleep_ms)\(\s*(\d+(?:\.\d+)?|\.\d+)\s*\)$/);
  if(wait){if(!timeImport)error('請先 import time。');const n=Number(wait[2]),ms=wait[1]==='sleep'?n*1000:n;if(!Number.isInteger(ms)||ms<0||ms>60000||(wait[1]==='sleep_ms'&&!Number.isInteger(n)))error('等待需為0～60000的整數毫秒；sleep() 可用秒的小數。');index++;return {kind:'wait',milliseconds:ms,line:r.line};}
  if(text==='pass')error('這是尚未完成的練習架構，請用自己的 LED 指令取代 pass。');
  return error('此行尚未支援或語法不完整；請依本課使用 LED 指令、等待及允許的按鈕 if／else。');
 };
 while(index<rows.length){const r=rows[index],text=r.text;if(r.indent!==0)error('while True 之前的匯入與初始化不需縮排。');
  if(text==='while True:'){if(!pinImport||!timeImport||!name||(lessonId==='button-led'&&!buttonName)||(lessonId==='pot-dimming'&&!adcName))error('請先匯入 Pin、time，並建立本課的 LED／按鈕物件。');if(pwm&&!frequencySet)error('請先在迴圈前設定PWM freq()。');loopLine=r.line;index++;break;}
  if(text.startsWith('from machine import ')||text==='import time'){checkCount();if(text.startsWith('from')){if(pinImport)error('Pin 只需匯入一次。');const names=text.slice(20).split(',').map(n=>n.trim());const allowed=pwm?lessonId==='pot-dimming'?['Pin','PWM','ADC']:['Pin','PWM']:['Pin'];if(names.length!==new Set(names).size||!names.includes('Pin')||names.some(n=>!allowed.includes(n)))error('此課不支援這個匯入清單。');names.forEach(n=>imported.add(n));pinImport=true;}else{if(timeImport)error('time 只需匯入一次。');timeImport=true;}index++;continue;}
  const pwmDeclaration=text.match(/^([A-Za-z_]\w*)\s*=\s*PWM\(\s*Pin\(\s*15\s*\)\s*\)$/),adcDeclaration=text.match(/^([A-Za-z_]\w*)\s*=\s*ADC\(\s*Pin\(\s*26\s*\)\s*\)$/);
  if(pwmDeclaration||adcDeclaration){checkCount();const n=(pwmDeclaration??adcDeclaration)![1];if(!pwm||!pinImport||!imported.has(pwmDeclaration?'PWM':'ADC')||adcDeclaration&&lessonId!=='pot-dimming')error('本課未支援或未匯入此PWM／ADC類別。');if(forbidden.has(n)||imported.has(n)||n.startsWith('_')||variables.has(n)||[name,buttonName,adcName].includes(n))error('此物件名稱為保留字或已重複，請重新命名。');if(pwmDeclaration){if(name)error('只接受一個GP15 PWM物件。');name=n;}else{if(adcName)error('只接受一個GP26 ADC物件。');adcName=n;}index++;continue;}
  const output=text.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*(["'])LED\2\s*,\s*Pin\.OUT\s*\)$/),external=text.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*15\s*,\s*Pin\.OUT\s*\)$/),input=text.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*14\s*,\s*Pin\.IN\s*,\s*Pin\.PULL_UP\s*\)$/);
  const declaration=output??external??input;
  if(declaration){checkCount();if(pwm)error('本課輸出需使用PWM(Pin(15))，輸入用ADC(Pin(26))。');if(!pinImport)error('請先 from machine import Pin。');const n=declaration[1];if(forbidden.has(n)||n.startsWith('_'))error('此物件名稱為保留字，請重新命名。');if(n===name||n===buttonName)error('物件名稱重複，請使用不同名稱。');
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
   if(lessonId!=='button-led'&&!pwm)error('此課不支援 if 分支。');
   const condition=r.text.match(/^if ([A-Za-z_]\w*)\.value\(\s*\)\s*==\s*([01]):$/),comparison=pwm?r.text.match(/^if (.*?)\s*(==|!=|>=|<=|>|<)\s*(.*):$/):null;
   if(!pwm&&(!condition||condition[1]!==buttonName))error('條件僅支援 if 已建立的按鈕.value() == 0或1:。');
   if(pwm&&!comparison)error('條件僅支援單一整數比較，不支援其他Python語法。');
   const left=comparison?parseExpression(comparison[1],variables,adcName||undefined,r.line,r.indent+1):null,right=comparison?parseExpression(comparison[3],variables,adcName||undefined,r.line,r.indent+1):null;
   checkCount();index++;
   const branch=()=>{const body:PythonStep[]=[];while(index<rows.length&&rows[index].indent>4){if(rows[index].indent!==8)error('if／else 內請使用8個空白；不支援巢狀分支。');body.push(simple(true));}if(!body.length)error('分支不可留白，請完成 LED 指令。');return body;};
   const then=branch();let otherwise:PythonStep[]=[];if(rows[index]?.text==='else:'&&rows[index].indent===4){index++;otherwise=branch();}
   loop.push(comparison?{kind:'compare',left:left!,right:right!,operator:comparison[2] as Extract<PythonStep,{kind:'compare'}>['operator'],then,otherwise,line:r.line}:{kind:'if',equals:Number(condition![2]) as 0|1,then,otherwise,line:r.line});
  }else loop.push(simple());
 }
 if(!loop.length)throw new PythonError('需要非空白的 while True:，請先完成自己的閃爍程式。',loopLine);
 const waits=(body:PythonStep[]):boolean=>body.some(s=>s.kind==='wait'&&s.milliseconds>0||isBranch(s)&&waits(s.then)&&waits(s.otherwise));
 const controls=(body:PythonStep[]):boolean=>body.some(s=>isBranch(s)?controls(s.then)||controls(s.otherwise):['on','off','toggle','duty'].includes(s.kind));
 if(!waits(loop))throw new PythonError('迴圈每條執行路徑至少需要一次大於0的等待，避免忙迴圈。',loopLine);
 if(!controls(loop))throw new PythonError('迴圈需要 LED 控制指令。',loopLine);
 return {setup,loop,name,buttonName:buttonName||undefined,lessonId,source,adcName:adcName||undefined,pwm};
}
export interface PythonSnapshot {timeMs:number;lit:boolean;line:number;operations:number;cycles:number;lastRead:0|1|null;duty:number;frequency:number|null;lastAnalogRead:number|null;variables:Record<string,number>}
export class PythonRuntime {
 program:PythonProgram;snapshot:PythonSnapshot={timeMs:0,lit:false,line:0,operations:0,cycles:0,lastRead:null,duty:0,frequency:null,lastAnalogRead:null,variables:{}};private index=0;private readyAt=0;private setup=true;private branch:PythonStep[]=[];private vars=new Map<string,number>();
 constructor(program:PythonProgram){this.program=program;}
 advanceTo(time:number,input:0|1|null=1,adc:number|null=null):PythonSnapshot {
  if(!Number.isFinite(time)||time<this.snapshot.timeMs||time>86400000)throw new PythonError('虛擬時間超出0～24小時範圍，請重設。',this.snapshot.line||1);
  let budget=0;
  const spend=(line:number)=>{if(++budget>500||++this.snapshot.operations>100000)throw new PythonError('已達本課執行預算，請停止或重設。',line);};
  const evaluate=(e:PythonExpression,line:number):number=>{spend(line);let value:number;
   if(e.kind==='integer')value=e.value;
   else if(e.kind==='variable'){if(!this.vars.has(e.name))throw new PythonError(`變數「${e.name}」尚未初始化。`,line);value=this.vars.get(e.name)!;}
   else if(e.kind==='adc'){if(adc===null||!Number.isInteger(adc)||adc<0||adc>65535)throw new PythonError('電位器接線或ADC讀值未確認，請檢查GP26及3.3V供電。',line);this.snapshot.lastAnalogRead=adc;value=adc;}
   else {const l=evaluate(e.left,line),r=evaluate(e.right,line);value=e.operator==='+'?l+r:l-r;}
   if(!Number.isSafeInteger(value)||value < -2147483648||value>2147483647)throw new PythonError('整數算式超出本教學32位元範圍。',line);return value;
  };
  while(this.readyAt<=time){
   const body=this.setup?this.program.setup:this.program.loop;
   if(!this.branch.length&&this.index>=body.length){this.index=0;if(this.setup)this.setup=false;else this.snapshot.cycles++;continue;}
   const step=this.branch.length?this.branch.shift()!:body[this.index++];this.snapshot.line=step.line;spend(step.line);
   if(isBranch(step)){let result:boolean;if(step.kind==='if'){if(input===null)throw new PythonError('按鈕接線未確認，無法讀取GP14。',step.line);this.snapshot.lastRead=input;result=input===step.equals;}else{const l=evaluate(step.left,step.line),r=evaluate(step.right,step.line);result=step.operator==='=='?l===r:step.operator==='!='?l!==r:step.operator==='>'?l>r:step.operator==='<'?l<r:step.operator==='>='?l>=r:l<=r;}this.branch=[...(result?step.then:step.otherwise)];}
   else if(step.kind==='assign')this.vars.set(step.name,evaluate(step.value,step.line));
   else if(step.kind==='freq')this.snapshot.frequency=evaluate(step.value,step.line);
   else if(step.kind==='duty'){const duty=evaluate(step.value,step.line);if(this.snapshot.frequency===null||duty<0||duty>65535)throw new PythonError('PWM需先設定頻率，且duty_u16須介於0～65535。',step.line);this.snapshot.duty=duty;this.snapshot.lit=duty>0;}
   else if(step.kind==='wait')this.readyAt+=step.milliseconds;
   else {this.snapshot.lit=step.kind==='toggle'?!this.snapshot.lit:step.kind==='on';this.snapshot.duty=this.snapshot.lit?65535:0;}
  }
  this.snapshot.timeMs=time;this.snapshot.variables=Object.fromEntries(this.vars);return {...this.snapshot,variables:{...this.snapshot.variables}};
 }
}
export function exportPython(source:string,lessonId:PicoLessonId='blink'){parsePython(source,lessonId);return {filename:'main.py',code:'# Raspberry Pi Pico 2 W / MicroPython\n# Firmware: https://micropython.org/download/RPI_PICO2_W/\n# Install the board-specific UF2 first; upload main.py using Thonny.\n# This file contains your current practice, not an automatic answer.\n'+source+(source.endsWith('\n')?'':'\n')};}
