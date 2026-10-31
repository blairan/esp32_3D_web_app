import {Play,Pause,Square,RotateCcw} from 'lucide-react';
type Status='idle'|'starting'|'running'|'paused'|'stopped'|'error';
const labels:Record<Status,string>={idle:'尚未執行',starting:'正在啟動',running:'執行中',paused:'已暫停',stopped:'已停止',error:'執行錯誤'};
export default function RunnerToolbar({status,timeMs,python=false,manual,onStart,onPause,onStop,onReset}:{status:Status;timeMs:number;python?:boolean;manual:boolean;onStart:()=>void;onPause:()=>void;onStop:()=>void;onReset:()=>void}){
  return <><div className="program-toolbar" aria-label="程式執行控制"><button className="run-button" disabled={status==='running'||status==='starting'} onClick={onStart}><Play size={17}/>{status==='paused'?'繼續':'執行'}</button><button disabled={status!=='running'} onClick={onPause}><Pause size={17}/>暫停</button><button disabled={!manual&&!['running','starting','paused'].includes(status)} onClick={onStop}><Square size={15}/>停止</button><button onClick={onReset}><RotateCcw size={17}/>重設</button></div>
    <div className="runtime-summary"><span data-run-status={python?undefined:status} data-python-status={python?status:undefined}>{manual?'手動輸出模式':labels[status]}</span><span>虛擬時間 <strong data-virtual-time={python?undefined:timeMs} data-python-time={python?'':undefined}>{timeMs.toLocaleString()} ms</strong></span></div></>;
}
