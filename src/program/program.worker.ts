import { parseProgram, ProgramError } from './language';
import { ProgramRuntime } from './runtime';
import type { WorkerCommand, WorkerEvent } from './protocol';
const scope=self as unknown as {postMessage:(message:WorkerEvent)=>void;onmessage:((event:MessageEvent<WorkerCommand>)=>void)|null};
let runtime:ProgramRuntime|null=null,timer:ReturnType<typeof setTimeout>|null=null,revision=0,running=false;
function cancelTimer(){if(timer!==null)clearTimeout(timer);timer=null;}
function fail(error:unknown){
  running=false;cancelTimer();runtime=null;
  const diagnostic=error instanceof ProgramError?{message:error.message.slice(0,500),line:error.line,column:error.column}:{message:'執行器無法繼續，請停止後重新執行。',line:1,column:1};
  scope.postMessage({type:'error',revision,diagnostic});
}
function tick(){
  if(!runtime||!running)return;
  try{scope.postMessage({type:'snapshot',revision,snapshot:runtime.advanceTo(runtime.snapshot().timeMs+50)});timer=setTimeout(tick,50);}catch(error){fail(error);}
}
scope.onmessage=({data})=>{
  if(data.revision<revision)return;revision=data.revision;
  try{
    if(data.type==='analog-input'){runtime?.setAnalogInput(data.value);return;}
    if(data.type==='input'){runtime?.setInput(data.input);return;}
    if(data.type==='pause'){running=false;cancelTimer();return;}
    if(data.type==='resume'){
      if(!runtime||running)return;runtime.setInput(data.input);runtime.setAnalogInput(data.analogInput??null);running=true;
      scope.postMessage({type:'snapshot',revision,snapshot:runtime.snapshot()});timer=setTimeout(tick,50);return;
    }
    running=false;cancelTimer();runtime=new ProgramRuntime(parseProgram(data.source,data.lessonId),data.input,data.analogInput??null);
    const snapshot=runtime.advanceTo(0);running=true;scope.postMessage({type:'snapshot',revision,snapshot});timer=setTimeout(tick,50);
  }catch(error){fail(error);}
};
