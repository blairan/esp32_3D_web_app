import { pins } from '../board.ts';
import { limits, ProgramError } from './language.ts';
import type { Program, Statement, Expression, SourceLocation, ProgramDiagnostic } from './language.ts';
export interface TraceEntry {timeMs:number;level:'HIGH'|'LOW';line:number}
export interface ProgramSnapshot {timeMs:number;outputEnabled:boolean;level:'HIGH'|'LOW';line:number;loopCount:number;trace:TraceEntry[]}
export type RunStatus='idle'|'starting'|'running'|'paused'|'stopped'|'error';
export interface ProgramState extends ProgramSnapshot {status:RunStatus;diagnostic:ProgramDiagnostic|null}
export const initialProgramState:ProgramState={timeMs:0,outputEnabled:false,level:'LOW',line:0,loopCount:0,trace:[],status:'idle',diagnostic:null};
const gpioPins=new Map(pins.filter(pin=>pin.gpio!==null).map(pin=>[pin.gpio!,pin]));
export class ProgramRuntime {
  private program:Program;private globals=new Map<string,number>();private locals=new Map<string,number>();
  private phase:'setup'|'loop'='setup';private pc=0;private time=0;private waitingUntil:number|null=null;private loopStart=0;
  private outputEnabled=false;private level:'HIGH'|'LOW'='LOW';private line=0;private loopCount=0;private operations=0;private trace:TraceEntry[]=[];
  constructor(program:Program){this.program=program;for(const statement of program.globals)this.declareVariable(statement,this.globals);}
  private value(expression:Expression):number {
    if(expression.kind==='integer')return expression.value;
    const value=this.locals.get(expression.name)??this.globals.get(expression.name);
    if(value===undefined)throw new ProgramError(`未知變數「${expression.name}」，請先用 int 宣告。`,expression.at);return value;
  }
  private declareVariable(statement:Extract<Statement,{kind:'declare'}>,scope:Map<string,number>){
    if(statement.value.kind==='variable'&&statement.value.name===statement.name)throw new ProgramError('變數不能在自己的初始值中引用自己。',statement.at);
    if(scope.has(statement.name))throw new ProgramError(`變數「${statement.name}」在同一作用域重複宣告。`,statement.at);
    scope.set(statement.name,this.value(statement.value));
  }
  private checkPin(expression:Expression,at:SourceLocation){
    const gpio=this.value(expression),pin=gpioPins.get(gpio);
    if(!pin)throw new ProgramError(`GPIO${gpio} 未知或未在這塊板引出。`,at);
    if(pin.category==='input')throw new ProgramError(`GPIO${gpio} 只能輸入，不能設定輸出或驅動 LED。`,at);
    if(pin.category==='reserved')throw new ProgramError(`GPIO${gpio} 是 Flash 保留腳，禁止輸出。`,at);
    if(gpio!==23)throw new ProgramError(`本課目前只支援 GPIO23 輸出，GPIO${gpio} 尚未接入模擬。`,at);
  }
  snapshot():ProgramSnapshot{return {timeMs:this.time,outputEnabled:this.outputEnabled,level:this.level,line:this.line,loopCount:this.loopCount,trace:[...this.trace]};}
  advanceTo(target:number):ProgramSnapshot {
    if(!Number.isSafeInteger(target)||target<this.time||target>limits.virtualTime)throw new ProgramError('虛擬時間超過上限，請重設後再執行。',this.program.loopAt);
    let tickOperations=0;const started=performance.now();
    while(true){
      if(this.waitingUntil!==null){
        if(this.waitingUntil>target){this.time=target;return this.snapshot();}
        this.time=this.waitingUntil;this.waitingUntil=null;
      }
      const body=this.program[this.phase];
      if(this.pc===body.length){
        if(this.phase==='loop'&&this.time===this.loopStart)throw new ProgramError('loop 沒有正值 delay，已停止以避免忙迴圈。請至少加入 delay(1)。',this.program.loopAt);
        this.phase='loop';this.pc=0;this.locals.clear();this.loopStart=this.time;this.loopCount++;
        if(!this.program.loop.length)throw new ProgramError('loop 不能為空；請加入 Blink 陳述與正值 delay。',this.program.loopAt);
        continue;
      }
      const statement=body[this.pc++];this.line=statement.at.line;
      if(++tickOperations>limits.operationsPerTick||++this.operations>limits.totalOperations||performance.now()-started>20)throw new ProgramError('執行預算已用完，程式已停止。請增加 delay 或縮短程式。',statement.at);
      switch(statement.kind){
        case 'declare':this.declareVariable(statement,this.locals);break;
        case 'pinMode':this.checkPin(statement.pin,statement.at);this.outputEnabled=true;break;
        case 'write':
          this.checkPin(statement.pin,statement.at);
          if(!this.outputEnabled)throw new ProgramError('請先執行 pinMode(23, OUTPUT)，才能 digitalWrite。',statement.at);
          this.level=statement.level;this.trace.push({timeMs:this.time,level:this.level,line:this.line});this.trace=this.trace.slice(-8);break;
        case 'delay':{
          const duration=this.value(statement.duration);
          if(duration<0||duration>limits.delay)throw new ProgramError(`delay 必須是 0 到 ${limits.delay} 的整數毫秒。`,statement.at);
          this.waitingUntil=this.time+duration;break;
        }
      }
    }
  }
}
