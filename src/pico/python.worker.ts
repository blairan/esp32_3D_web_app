/// <reference lib="webworker" />
import {parsePython,PythonRuntime,PythonError} from './language';
import {initialPythonState,type PythonState,type PythonCommand} from './protocol';
let runtime:PythonRuntime|null=null,state:PythonState={...initialPythonState},timer:ReturnType<typeof setInterval>|undefined,base=0,started=0,input:0|1|null=1,adc:number|null=null;
const send=()=>postMessage(state);
const clear=()=>{if(timer!==undefined)clearInterval(timer);timer=undefined;};
const fail=(e:unknown)=>{clear();const err=e instanceof PythonError?e:new PythonError('MicroPython 教學執行失敗。',1);state={...state,status:'error',lit:false,duty:0,diagnostic:{message:err.message,line:err.line,column:err.column}};send();};
const tick=()=>{try{if(!runtime)return;const target=Math.min(base+Math.floor(performance.now()-started),state.timeMs+200);state={...state,...runtime.advanceTo(target,input,adc)};send();}catch(e){fail(e);}};
const run=()=>{base=state.timeMs;started=performance.now();state={...state,status:'running'};clear();timer=setInterval(tick,33);tick();};
onmessage=(event:MessageEvent<PythonCommand>)=>{try{const c=event.data;
 if(c.type==='start'){clear();runtime=null;state={...initialPythonState};const program=parsePython(c.source,c.lessonId);if(c.valid===false)throw new PythonError('接線錯誤：'+(c.message??'請先完成本課接線。'),program.loop[0]?.line??1);input=c.input===undefined?1:c.input;adc=c.adc??null;runtime=new PythonRuntime(program);run();}
 else if(c.type==='input'){input=c.input;adc=c.adc??null;if(!c.valid&&(state.status==='running'||state.status==='paused'))fail(new PythonError('接線錯誤：'+c.message,state.line||1));}
 else if(c.type==='pause'&&state.status==='running'){tick();clear();if(state.status==='running'){state={...state,status:'paused'};send();}}
 else if(c.type==='resume'&&state.status==='paused')run();
 else if(c.type==='reset'||c.type==='stop'){clear();runtime=null;state={...initialPythonState,status:c.type==='reset'?'idle':'stopped'};send();}
}catch(e){fail(e);}};
