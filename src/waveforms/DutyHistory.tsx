import {useState} from 'react';
import {dutySegments,type SignalHistory} from './signals';
export default function DutyHistory({width,active,history,channel,maximum,timeMs,manual}:{width:number;active:boolean;history:SignalHistory;channel:number;maximum:number;timeMs:number;manual:boolean}){
 const [windowMs,setWindowMs]=useState(5000);
 if(!active)return null;
 const end=Math.max(1,timeMs),start=Math.max(0,end-windowMs),left=52,right=width-18,plot=right-left;
 const segments=manual?[]:dutySegments(history,channel,start,timeMs,maximum),x=(t:number)=>left+(t-start)/(end-start)*plot,y=(v:number)=>144-v*1.12;
 let previous:typeof segments[number]|undefined;
 const path=segments.map(s=>{const d=previous&&previous.to===s.from?`M${x(s.from)} ${y(previous.value)}V${y(s.value)}H${x(s.to)}`:`M${x(s.from)} ${y(s.value)}H${x(s.to)}`;previous=s;return d;}).join('');
 const ticks=width<360?[0,1]:[0,.5,1];
 return <div className="duty-history">
  {segments.length&&timeMs>0?<svg className="waveform-chart duty-chart" viewBox={`0 0 ${width} 206`} role="img" aria-label={`程式PWM佔空比變化，${start}至${timeMs}毫秒，縱軸0至100%，虛線為目前程式時間`} data-duty-history-path={path}>
   {[100,50,0].map(v=><g key={v}><text x="2" y={y(v)+5}>{v}%</text><path className="waveform-grid" d={`M${left} ${y(v)}H${right}`}/></g>)}
   {ticks.map(t=><g key={t}><path className="waveform-grid" d={`M${left+t*plot} 26V150`}/><text x={left+t*plot} y="172" textAnchor={t===0?'start':t===1?'end':'middle'}>{Number((start+t*(end-start)).toPrecision(6))}</text></g>)}
   <path className="waveform-line" d={path}/><path className="waveform-cursor" d={`M${x(timeMs)} 24V150`}/><text x={right} y="190" textAnchor="end">目前程式時間（ms）</text>
  </svg>:<p className="waveform-empty">尚無 PWM 寫入記錄；請完成接線並執行自己的程式。</p>}
  <p className="waveform-notice">依程式寫入的 PWM 佔空比繪製；呈現平均亮度的教學趨勢，不代表實測光強或類比電壓。</p>
  <label className="waveform-choice">顯示範圍<select aria-label="佔空比曲線時間範圍" value={windowMs} onChange={e=>setWindowMs(Number(e.target.value))}>{[2000,5000,10000].map(ms=><option key={ms} value={ms}>最近 {ms/1000} 秒</option>)}</select></label>
  {segments.length?<p className="waveform-latest">最近記錄：<strong data-duty-history-latest>{Number(segments.at(-1)!.value.toPrecision(6))}%</strong></p>:null}
  <p className="waveform-notice">每個數值保持到下一次寫入，不將離散命令平滑成正弦波。固定加減步長的呼吸燈會呈階梯狀的三角形趨勢；沒有已知狀態的區段留白。暫停保留，停止、錯誤、重設或重新執行清空。</p>
 </div>;
}
