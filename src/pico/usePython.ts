import {useCallback,useEffect,useRef,useState} from 'react';
import {initialPythonState,type PythonCommand,type PythonState} from './protocol';
export function usePython(){
 const [state,setState]=useState<PythonState>({...initialPythonState});const worker=useRef<Worker|null>(null);
 useEffect(()=>{let w:Worker;try{w=new Worker(new URL('./python.worker.ts',import.meta.url),{type:'module'});}catch{setState({...initialPythonState,status:'error',diagnostic:{message:'無法啟動教學 Worker，請重新整理。',line:1,column:1}});return;}worker.current=w;w.onmessage=(e:MessageEvent<PythonState>)=>setState(e.data);w.onerror=()=>{w.terminate();worker.current=null;setState({...initialPythonState,status:'error',diagnostic:{message:'教學 Worker 發生錯誤，請重新整理。',line:1,column:1}});};return()=>{w.terminate();worker.current=null;};},[]);
 const send=useCallback((c:PythonCommand)=>{if(worker.current){if(c.type==='start')setState({...initialPythonState,status:'starting'});worker.current.postMessage(c);}else setState({...initialPythonState,status:'error',diagnostic:{message:'Worker 尚未就緒，請重新整理後重試。',line:1,column:1}});},[]);
 return {state,send};
}
