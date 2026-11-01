import {useEffect,useId,useRef,useState} from 'react';
import {digitalSegments,pwmPath,pwmTiming,type SignalHistory} from './signals';
export interface WaveformChannel {id:number;label:string;pwm:boolean;maximum?:number;duty?:number;frequency?:number|null;frequencyFromProgram?:boolean}
interface Props {channels:WaveformChannel[];history:SignalHistory;timeMs:number;line:number;manual:boolean;status:string}
const format=(value:number)=>Number(value.toPrecision(6)).toLocaleString('en-US',{maximumFractionDigits:6});
export default function SignalWaveforms({channels,history,timeMs,line,manual,status}:Props){
 const [channelId,setChannelId]=useState(channels[0].id),[windowMs,setWindowMs]=useState(5000),[reference,setReference]=useState('program');const id=useId(),host=useRef<HTMLElement>(null);const [width,setWidth]=useState(600);
 useEffect(()=>{const observer=new ResizeObserver(entries=>{const measured=entries[0].contentRect.width;if(measured>0)setWidth(Math.max(180,Math.floor(measured)));});if(host.current)observer.observe(host.current);return()=>observer.disconnect();},[]);
 const left=56,right=width-18,plot=right-left,ticks=width<360?[0,1]:width<540?[0,.5,1]:[0,.25,.5,.75,1];
 const channel=channels.find(c=>c.id===channelId)??channels[0],end=Math.max(1,timeMs),start=Math.max(0,end-windowMs),span=end-start;
 const events=manual?[]:[...(history.baseline??[]),...history.events].filter(e=>e.channel===channel.id&&e.kind==='digital'),segments=manual?[]:digitalSegments(history,channel.id,start,timeMs);
 const x=(time:number)=>left+(time-start)/span*plot,y=(value:number)=>value?36:98;
 let previous:typeof segments[number]|undefined;
 const path=segments.map(s=>{const d=previous&&previous.to===s.from?`M${x(s.from)} ${y(previous.value)}V${y(s.value)}H${x(s.to)}`:`M${x(s.from)} ${y(s.value)}H${x(s.to)}`;previous=s;return d;}).join('');
 const available=!manual&&['running','paused'].includes(status)&&channel.duty!==undefined,ratio=reference==='program'?(available?channel.duty!/(channel.maximum??255):null):Number(reference)/100;
 const frequency=channel.frequency??1000,timing=ratio===null?null:pwmTiming(ratio,frequency),latest=events.at(-1);
 return <section ref={host} className="signal-waveforms" aria-labelledby={id} data-waveform-channel={channel.id} data-waveform-status={status}>
  <div className="waveform-heading"><h3 id={id}>{channel.pwm?'PWM 參考波形':'LED 數位波形'}</h3>{channels.length>1?<label>觀察通道<select aria-label="波形通道" value={channel.id} onChange={e=>setChannelId(Number(e.target.value))}>{channels.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>:<strong>{channel.label}</strong>}</div>
  <p className="waveform-position" data-waveform-time={timeMs}>程式位置：{line>0?`第 ${line} 行`:'尚未執行'} · 虛擬時間 {format(timeMs)} ms</p>
  {manual?<p className="waveform-notice">手動模式不記錄程式波形；執行自己的程式後才開始記錄。</p>:null}
  {channel.pwm?<>
   <label className="waveform-choice">佔空比來源<select aria-label="PWM 波形來源" value={reference} onChange={e=>setReference(e.target.value)}><option value="program">跟隨目前程式</option>{[25,50,75].map(v=><option key={v} value={v}>{v}% 參考</option>)}</select></label>
   {timing&&ratio!==null?<>
    <svg className="waveform-chart" viewBox={`0 0 ${width} 150`} role="img" aria-label={`${channel.label} 理想PWM參考，佔空比${format(ratio*100)}%，頻率${format(frequency)}Hz，顯示三個週期`} data-pwm-ratio={ratio}>
     <text x="2" y="41">HIGH</text><text x="8" y="103">LOW</text>
     {[0,1,2,3].map(i=><g key={i}><path className="waveform-grid" d={`M${left+i*plot/3} 24V112`}/><text x={left+i*plot/3} y="138" textAnchor={i===0?'start':i===3?'end':'middle'}>{width<360&&i>0&&i<3?'':format(i*timing.period)}</text></g>)}
     <path className="waveform-grid" d={`M${left} 112H${right}`}/><path className="waveform-line" d={pwmPath(ratio,3,plot,36,98)} transform={`translate(${left} 0)`}/>
     <text x={right} y="22" textAnchor="end">時間（ms）</text>
    </svg>
    <dl className="waveform-metrics"><div><dt>佔空比</dt><dd data-waveform-duty>{format(ratio*100)}%</dd></div><div><dt>週期 T</dt><dd>{format(timing.period)} ms</dd></div><div><dt>HIGH 時間</dt><dd>{format(timing.high)} ms</dd></div><div><dt>LOW 時間</dt><dd>{format(timing.low)} ms</dd></div></dl>
   </>:<p className="waveform-empty">尚未取得程式 PWM 輸出；可先選 25%、50% 或 75% 查看參考。</p>}
   <p className="waveform-notice">{channel.frequency!=null?`理想頻率依目前程式設定 ${format(frequency)} Hz。`:channel.frequencyFromProgram?'尚未取得程式頻率，先以 1000 Hz 作參考。':'使用 1000 Hz 參考頻率，並非此板 analogWrite 的實際時脈。'}這是此刻佔空比的三週期放大示意，不逐一模擬脈衝，也不表示實板相位、電壓或示波器量測。選參考值不會改動程式或 LED。</p>
  </>:<>
   <label className="waveform-choice">顯示範圍<select aria-label="數位波形時間範圍" value={windowMs} onChange={e=>setWindowMs(Number(e.target.value))}><option value={2000}>最近 2 秒</option><option value={5000}>最近 5 秒</option><option value={10000}>最近 10 秒</option></select></label>
   {segments.length&&timeMs>0?<svg className="waveform-chart" viewBox={`0 0 ${width} 164`} role="img" aria-label={`${channel.label} 數位輸出，${format(start)}至${format(timeMs)}毫秒，橘線為目前程式時間`} data-digital-path={path}>
    <text x="2" y="41">HIGH</text><text x="8" y="103">LOW</text>
    {ticks.map(i=><g key={i}><path className="waveform-grid" d={`M${left+i*plot} 24V112`}/><text x={left+i*plot} y="138" textAnchor={i===0?'start':i===1?'end':'middle'}>{format(start+span*i)}</text></g>)}
    <path className="waveform-grid" d={`M${left} 112H${right}`}/><path className="waveform-line" d={path}/><path className="waveform-cursor" d={`M${x(timeMs)} 16V112`}/><text x={right} y="158" textAnchor="end">目前程式時間（ms）</text>
   </svg>:<p className="waveform-empty">尚無可顯示的數位輸出；請完成接線並執行自己的程式。</p>}
   <p className="waveform-notice">依虛擬時間中的輸出變化繪製；不表示 LED 電流或實板電壓。{latest?`最近輸出：${latest.value?'HIGH':'LOW'}（${format(latest.timeMs)} ms）。`:''}最多保留 512 筆跨通道變化與各通道的邊界狀態；{history.dropped>0?'較早資料已捨棄，沒有已知狀態的區段留白。':'未設定輸出前的區段留白。'}暫停保留，停止、錯誤、重設或重新執行清空。</p>
   {events.length?<details className="waveform-records"><summary>查看最近輸出數值</summary><table><thead><tr><th>虛擬時間（ms）</th><th>邏輯電位</th></tr></thead><tbody>{events.slice(-6).reverse().map((e,i)=><tr key={i}><td>{format(e.timeMs)}</td><td>{e.value?'HIGH':'LOW'}</td></tr>)}</tbody></table></details>:null}
  </>}
 </section>;
}
