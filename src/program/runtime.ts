import {lessons} from '../lessons.ts';
import { pins } from '../board.ts';
import { limits, ProgramError } from './language.ts';
import type { Program, Statement, Expression, SourceLocation, ProgramDiagnostic } from './language.ts';
export type InputLevel='HIGH'|'LOW'|null;
export interface TraceEntry {timeMs:number;level:'HIGH'|'LOW';line:number}
export interface ProgramSnapshot {timeMs:number;outputEnabled:boolean;inputEnabled:boolean;lastRead:InputLevel;level:'HIGH'|'LOW';line:number;loopCount:number;trace:TraceEntry[]}
export type RunStatus='idle'|'starting'|'running'|'paused'|'stopped'|'error';
export interface ProgramState extends ProgramSnapshot {status:RunStatus;diagnostic:ProgramDiagnostic|null}
export const initialProgramState:ProgramState={timeMs:0,outputEnabled:false,inputEnabled:false,lastRead:null,level:'LOW',line:0,loopCount:0,trace:[],status:'idle',diagnostic:null};
const gpioPins=new Map(pins.filter(pin=>pin.gpio!==null).map(pin=>[pin.gpio!,pin]));
interface Frame {body:Statement[];pc:number;locals:Map<string,number>}
export class ProgramRuntime {
 private program:Program;private globals=new Map<string,number>();private frames:Frame[]=[];
 private phase:'setup'|'loop'='setup';private time=0;private waitingUntil:number|null=null;private loopStart=0;
 private outputEnabled=false;private inputEnabled=false;private input:InputLevel='HIGH';private lastRead:InputLevel=null;
 private level:'HIGH'|'LOW'='LOW';private line=0;private loopCount=0;private operations=0;private trace:TraceEntry[]=[];
 constructor(program:Program,input:InputLevel='HIGH'){this.program=program;this.input=input;for(const statement of program.globals)this.declareVariable(statement,this.globals);this.frames=[this.frame(program.setup)];}
 private frame(body:Statement[]):Frame{return {body,pc:0,locals:new Map()};}
 setInput(input:InputLevel){this.input=input;}
 private value(expression:Expression):number {
  if(expression.kind==='integer')return expression.value;
  if(expression.kind==='read'){
   this.checkPin(expression.pin,expression.at,'input');if(!this.inputEnabled)throw new ProgramError('請先執行 pinMode(18, INPUT_PULLUP)，才能 digitalRead。',expression.at);
   if(this.input===null)throw new ProgramError('GPIO18 輸入接線無法判定；請移除輸出、電源或不支援的跨接。',expression.at);
   this.lastRead=this.input;return this.input==='HIGH'?1:0;
  }
  for(let i=this.frames.length-1;i>=0;i--){const value=this.frames[i].locals.get(expression.name);if(value!==undefined)return value;}
  const value=this.globals.get(expression.name);if(value===undefined)throw new ProgramError(`未知變數「${expression.name}」，請先用 int 宣告。`,expression.at);return value;
 }
 private declareVariable(statement:Extract<Statement,{kind:'declare'}>,scope:Map<string,number>){
  if((statement.value.kind==='variable'&&statement.value.name===statement.name)||(statement.value.kind==='read'&&statement.value.pin.kind==='variable'&&statement.value.pin.name===statement.name))throw new ProgramError('變數不能在自己的初始值中引用自己。',statement.at);
  if(scope.has(statement.name))throw new ProgramError(`變數「${statement.name}」在同一作用域重複宣告。`,statement.at);
  scope.set(statement.name,this.value(statement.value));
 }
 private checkPin(expression:Expression,at:SourceLocation,direction:'input'|'output'='output'){
  const gpio=this.value(expression),pin=gpioPins.get(gpio);
  if(!pin)throw new ProgramError(`GPIO${gpio} 未知或未在這塊板引出。`,at);
  if(pin.category==='reserved')throw new ProgramError(`GPIO${gpio} 是 Flash 保留腳，禁止輸出。`,at);
  if(direction==='input'){
   if(lessons[this.program.lessonId].inputGPIO===null||gpio!==lessons[this.program.lessonId].inputGPIO)throw new ProgramError('本課僅支援 GPIO18 的 INPUT_PULLUP 輸入。',at);
  }else{
   if(pin.category==='input')throw new ProgramError(`GPIO${gpio} 只能輸入，不能設定輸出或驅動 LED。`,at);
   if(gpio!==lessons[this.program.lessonId].outputGPIO)throw new ProgramError(`本課目前只支援 GPIO23 輸出，GPIO${gpio} 尚未接入模擬。`,at);
  }
 }
 snapshot():ProgramSnapshot{return {timeMs:this.time,outputEnabled:this.outputEnabled,inputEnabled:this.inputEnabled,lastRead:this.lastRead,level:this.level,line:this.line,loopCount:this.loopCount,trace:[...this.trace]};}
 advanceTo(target:number):ProgramSnapshot {
  if(!Number.isSafeInteger(target)||target<this.time||target>limits.virtualTime)throw new ProgramError('虛擬時間超過上限，請重設後再執行。',this.program.loopAt);
  let tickOperations=0;const started=performance.now();
  while(true){
   if(this.waitingUntil!==null){if(this.waitingUntil>target){this.time=target;return this.snapshot();}this.time=this.waitingUntil;this.waitingUntil=null;}
   const frame=this.frames.at(-1);
   if(!frame){
    if(this.phase==='loop'&&this.time===this.loopStart)throw new ProgramError('loop 沒有正值 delay，已停止以避免忙迴圈。請至少加入 delay(1)。',this.program.loopAt);
    this.phase='loop';this.loopStart=this.time;this.loopCount++;
    if(!this.program.loop.length)throw new ProgramError('loop 不能為空；請加入練習陳述與正值 delay。',this.program.loopAt);
    this.frames=[this.frame(this.program.loop)];continue;
   }
   if(frame.pc===frame.body.length){this.frames.pop();continue;}
   const statement=frame.body[frame.pc++];this.line=statement.at.line;
   if(++tickOperations>limits.operationsPerTick||++this.operations>limits.totalOperations||performance.now()-started>20)throw new ProgramError('執行預算已用完，程式已停止。請增加 delay 或縮短程式。',statement.at);
   switch(statement.kind){
    case 'declare':this.declareVariable(statement,frame.locals);break;
    case 'pinMode':this.checkPin(statement.pin,statement.at,statement.mode==='INPUT_PULLUP'?'input':'output');if(statement.mode==='INPUT_PULLUP')this.inputEnabled=true;else this.outputEnabled=true;break;
    case 'write':
     this.checkPin(statement.pin,statement.at);if(!this.outputEnabled)throw new ProgramError('請先執行 pinMode(23, OUTPUT)，才能 digitalWrite。',statement.at);
     this.level=statement.level;this.trace.push({timeMs:this.time,level:this.level,line:this.line});this.trace=this.trace.slice(-8);break;
    case 'if':{
     const equal=this.value(statement.left)===this.value(statement.right);const body=(statement.operator==='=='?equal:!equal)?statement.then:statement.otherwise;
     this.frames.push(this.frame(body));break;
    }
    case 'delay':{
     const duration=this.value(statement.duration);if(duration<0||duration>limits.delay)throw new ProgramError(`delay 必須是 0 到 ${limits.delay} 的整數毫秒。`,statement.at);
     this.waitingUntil=this.time+duration;break;
    }
   }
  }
 }
}
