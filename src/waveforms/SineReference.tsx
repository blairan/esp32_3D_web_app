import {memo,useMemo,useState} from 'react';
import {sineReference} from './sine';
export default memo(function SineReference({width,active}:{width:number;active:boolean}){
 const [frequency,setFrequency]=useState(1),[amplitude,setAmplitude]=useState(1),[windowMs,setWindowMs]=useState(2000);
 const data=useMemo(()=>sineReference({frequency,amplitude,windowMs}),[frequency,amplitude,windowMs]);
 const left=52,right=width-18,plot=right-left,zero=88,scale=28;
 const path=useMemo(()=>data.points.map((p,i)=>`${i?'L':'M'}${(left+p.timeMs/windowMs*plot).toFixed(3)} ${(zero-p.value*scale).toFixed(3)}`).join(''),[data,left,plot,windowMs]);
 if(!active)return null;
 const ticks=width<360?[0,1]:[0,.5,1];
 return <div className="sine-reference" data-sine-frequency={frequency} data-sine-amplitude={amplitude} data-sine-window={windowMs}>
  <p className="waveform-notice">獨立參考，不連動接腳。調整下方參數即更新，無需執行程式。</p>
  <svg className="waveform-chart sine-chart" viewBox={`0 0 ${width} 204`} role="img" aria-label={`正弦波教學參考，頻率${frequency}Hz，振幅${amplitude}，範圍0至${windowMs}毫秒；縱軸為無單位的相對值`} data-sine-path={path}>
   {[2,0,-2].map(v=><g key={v}><text x="5" y={zero-v*scale+5}>{v>0?'+':''}{v}</text><path className="waveform-grid" d={`M${left} ${zero-v*scale}H${right}`}/></g>)}
   {ticks.map(t=><g key={t}><path className="waveform-grid" d={`M${left+t*plot} 26V150`}/><text x={left+t*plot} y="172" textAnchor={t===0?'start':t===1?'end':'middle'}>{t*windowMs}</text></g>)}
   <text x={right} y="20" textAnchor="end">相對值（無單位）</text><text x={right} y="188" textAnchor="end">時間（ms）</text>
   <path className="waveform-line" d={path}/>
  </svg>
  <div className="sine-controls">
  <label className="sine-control">頻率 f · {frequency} Hz<input type="range" aria-label="正弦波頻率" min={.5} max={10} step={.5} value={frequency} onChange={e=>setFrequency(Number(e.target.value))}/></label>
  <label className="sine-control">振幅 A · {amplitude}（無單位）<input type="range" aria-label="正弦波振幅" min={0} max={2} step={.25} value={amplitude} onChange={e=>setAmplitude(Number(e.target.value))}/></label>
  </div>
  <label className="waveform-choice">時間範圍<select aria-label="正弦波時間範圍" value={windowMs} onChange={e=>setWindowMs(Number(e.target.value))}>{[200,500,1000,2000].map(ms=><option value={ms} key={ms}>{ms} ms（{ms/1000} 秒）</option>)}</select></label>

  <dl className="waveform-metrics"><div><dt>週期 T = 1000 ÷ f</dt><dd data-sine-period>{Number(data.periodMs.toPrecision(6))} ms</dd></div><div><dt>峰對峰值 2A</dt><dd>{data.peakToPeak}（無單位）</dd></div></dl>
  <p className="waveform-notice">y(t) = A × sin(2π × f × t)，公式中的 t 以秒計，圖中的 t = 0 不對應程式虛擬時間。縮短時間範圍可放大單一週期。這是數學示意，並非接腳電壓、LED 亮度或實板示波器量測；調整這裡不會改動程式、接線或執行狀態。</p>
 </div>;
});
