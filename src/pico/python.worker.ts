/// <reference lib="webworker" />
import {parsePython,PythonRuntime,PythonError} from './language';
import {initialPythonState,type PythonState,type PythonCommand} from './protocol';
let runtime:PythonRuntime|null=null,state:PythonState={...initialPythonState},timer:ReturnType<typeof setInterval>|undefined,base=0,started=0;
const send=()=>postMessage(state);
const clear=()=>{if(timer!==undefined)clearInterval(timer);timer=undefined;};
const fail=(e:unknown)=>{clear();const err=e instanceof PythonError?e:new PythonError('MicroPython 教學執行失敗。',1);state={...state,status:'error',lit:false,diagnostic:{message:err.message,line:err.line,column:err.column}};send();};
const tick=()=>{try{if(!runtime)return;state={...state,...runtime.advanceTo(base+Math.floor(performance.now()-started))};send();}catch(e){fail(e);}};
const run=()=>{base=state.timeMs;started=performance.now();state={...state,status:'running'};clear();timer=setInterval(tick,33);tick();};
onmessage=(event:MessageEvent<PythonCommand>)=>{try{const c=event.data;
 if(c.type==='start'){clear();runtime=null;state={...initialPythonState};runtime=new PythonRuntime(parsePython(c.source));run();}
 else if(c.type==='pause'&&state.status==='running'){tick();clear();if(state.status==='running'){state={...state,status:'paused'};send();}}
 else if(c.type==='resume'&&state.status==='paused')run();
 else if(c.type==='reset'||c.type==='stop'){clear();runtime=null;state={...initialPythonState,status:c.type==='reset'?'idle':'stopped'};send();}
}catch(e){fail(e);}};
