import type {LessonId} from '../lessons';
import type {InputLevel} from './runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import { initialProgramState } from './runtime';
import type { ProgramState } from './runtime';
import type { WorkerCommand, WorkerEvent } from './protocol';
export default function useProgramRunner(lessonId:LessonId='blink',input:InputLevel='HIGH'){
  const inputRef=useRef(input);inputRef.current=input;
  const [state,setState]=useState<ProgramState>(initialProgramState);
  const stateRef=useRef(state),workerRef=useRef<Worker|null>(null),revisionRef=useRef(0),watchdog=useRef<number|null>(null);
  const update=useCallback((patch:Partial<ProgramState>)=>{stateRef.current={...stateRef.current,...patch};setState(stateRef.current);},[]);
  const dispose=useCallback(()=>{revisionRef.current++;workerRef.current?.terminate();workerRef.current=null;if(watchdog.current!==null)window.clearTimeout(watchdog.current);watchdog.current=null;},[]);
  useEffect(()=>dispose,[dispose]);
  const start=useCallback((source:string)=>{
    dispose();update({...initialProgramState,status:'starting'});
    try{
      const worker=new Worker(new URL('./program.worker.ts',import.meta.url),{type:'module'});workerRef.current=worker;
      const revision=revisionRef.current;
      const fail=(message:string)=>{dispose();update({status:'error',inputEnabled:false,outputEnabled:false,outputs:{},variables:{},level:'LOW',diagnostic:{message,line:1,column:1}});};
      watchdog.current=window.setTimeout(()=>{if(workerRef.current===worker)fail('執行器未回應，已安全停止。請重試。');},5000);
      worker.onmessage=({data}:MessageEvent<WorkerEvent>)=>{
        if(workerRef.current!==worker)return;
        if(data.revision!==revisionRef.current)return;
        if(watchdog.current!==null)window.clearTimeout(watchdog.current);watchdog.current=null;
        if(data.type==='error'){dispose();update({status:'error',inputEnabled:false,outputEnabled:false,outputs:{},variables:{},level:'LOW',line:data.diagnostic.line,diagnostic:data.diagnostic});return;}
        if(stateRef.current.status==='running'||stateRef.current.status==='starting')update({...data.snapshot,status:'running',diagnostic:null});
      };
      worker.onerror=event=>{event.preventDefault();if(workerRef.current===worker)fail('無法載入程式執行器。請確認瀏覽器支援 Worker，或重新載入頁面。');};
      const command:WorkerCommand={type:'start',source,revision,lessonId,input:inputRef.current};worker.postMessage(command);
    }catch{dispose();update({status:'error',inputEnabled:false,outputEnabled:false,outputs:{},variables:{},level:'LOW',diagnostic:{message:'這個瀏覽器無法啟動 Worker，請改用現行 Chrome 或 Edge。',line:1,column:1}});}
  },[dispose,update,lessonId]);
  const pause=useCallback(()=>{
    if(stateRef.current.status!=='running'||!workerRef.current)return;
    const revision=++revisionRef.current;update({status:'paused'});workerRef.current.postMessage({type:'pause',revision} satisfies WorkerCommand);
  },[update]);
  const resume=useCallback(()=>{
    if(stateRef.current.status!=='paused'||!workerRef.current)return;
    const revision=++revisionRef.current;update({status:'running'});workerRef.current.postMessage({type:'resume',revision,input:inputRef.current} satisfies WorkerCommand);
  },[update]);
  const stop=useCallback(()=>{dispose();update({status:'stopped',inputEnabled:false,outputEnabled:false,outputs:{},variables:{},level:'LOW',line:0});},[dispose,update]);
  const reset=useCallback(()=>{dispose();update(initialProgramState);},[dispose,update]);
  useEffect(()=>{workerRef.current?.postMessage({type:'input',revision:revisionRef.current,input} satisfies WorkerCommand);},[input]);
  return {state,start,pause,resume,stop,reset};
}
