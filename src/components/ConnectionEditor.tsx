import {hasButton} from '../lessons';
import { memo, useState } from 'react';
import { Cable, Cpu, Lightbulb, Trash2, ArrowLeftRight, X, CircuitBoard } from 'lucide-react';
import { pins, titleFor } from '../board';
import { terminalLabel, wireColor } from '../circuit';
import type { CircuitState, CircuitAction } from '../circuit';
interface Props {state:CircuitState;dispatch:(action:CircuitAction)=>void;onPick:(terminal:string)=>void}
function ConnectionEditor({state,dispatch,onPick}:Props) {
  const [otherPin,setOtherPin]=useState('J2-03');
  const terminal=(id:string,label:string)=> <button className={`terminal-button${state.pending===id?' pending':''}`} aria-pressed={state.pending===id} aria-label={`接線端點 ${terminalLabel(id,state.lessonId)}`} onClick={()=>onPick(id)} key={id}><i/>{label}</button>;
  return <section className="connection-editor" aria-labelledby="connection-title">
    <div className="connection-heading"><div><h2 id="connection-title"><Cable size={20}/>接線工作區</h2><p>先選起點，再選終點；可點 3D 模型，或用下方端點接線。</p></div><span className="wire-count">{state.wires.length} 條接線</span></div>
    <div className="connection-body"><div className="terminal-groups">
      <section><h3><Cpu size={17}/>開發板</h3><div className="terminal-buttons">{terminal('J3-02','GPIO23')}{hasButton(state.lessonId)?terminal('J3-09','GPIO18'):null}{(state.lessonId==='dual-led'||state.lessonId==='traffic-light')?terminal('J3-03','GPIO22'):null}{state.lessonId==='traffic-light'?terminal('J3-06','GPIO21'):null}{terminal('J3-01','GND · J3-01')}{terminal('J3-07','GND · J3-07')}{terminal('J2-14','GND · J2-14')}</div></section>
      <section><h3><CircuitBoard size={17}/>220 Ω 電阻{(state.lessonId==='dual-led'||state.lessonId==='traffic-light')?' 1':''}</h3><div className="terminal-buttons">{terminal('resistor:a','A 端')}{terminal('resistor:b','B 端')}</div><p>電阻沒有極性，A／B 可互換。</p></section>
      <section><h3><Lightbulb size={17}/>{state.lessonId==='traffic-light'?'紅燈 · GPIO23':'LED'}{state.lessonId==='dual-led'?' 1':''}</h3><div className="terminal-buttons">{terminal('led:a','正極 A+')}{terminal('led:k','負極 K−')}</div><p>A+ 朝向輸出，K− 朝向接地。</p></section>
      {(state.lessonId==='dual-led'||state.lessonId==='traffic-light')?<><section><h3><CircuitBoard size={17}/>220 Ω 電阻 2</h3><div className="terminal-buttons">{terminal('resistor2:a','A 端')}{terminal('resistor2:b','B 端')}</div><p>每顆 LED 各用一顆電阻。</p></section><section><h3><Lightbulb size={17}/>{state.lessonId==='traffic-light'?'黃燈 · GPIO22':'LED 2'}</h3><div className="terminal-buttons">{terminal('led2:a','正極 A+')}{terminal('led2:k','負極 K−')}</div><p>{state.lessonId==='traffic-light'?'GPIO22 控制黃燈，A+ 朝向輸出。':'GPIO22 控制 LED 2，A+ 朝向輸出。'}</p></section></>:null}
      {state.lessonId==='traffic-light'?<><section><h3><CircuitBoard size={17}/>220 Ω 電阻 3</h3><div className="terminal-buttons">{terminal('resistor3:a','A 端')}{terminal('resistor3:b','B 端')}</div><p>綠燈獨立限流。</p></section><section><h3><Lightbulb size={17}/>綠燈 · GPIO21</h3><div className="terminal-buttons">{terminal('led3:a','正極 A+')}{terminal('led3:k','負極 K−')}</div><p>A+ 朝向輸出，K− 朝向接地。</p></section></>:null}
      {hasButton(state.lessonId)?<section><h3><CircuitBoard size={17}/>常開按鈕</h3><div className="terminal-buttons">{terminal('button:a1','A1')}{terminal('button:a2','A2')}{terminal('button:b1','B1')}{terminal('button:b2','B2')}</div><p>A1/A2 同側相通；B1/B2 同側相通。按下才連通兩側。</p></section>:null}
      <details className="other-pins"><summary>試試其他接腳</summary><div><label htmlFor="other-pin">選擇開發板接腳</label><select id="other-pin" value={otherPin} onChange={event=>setOtherPin(event.target.value)}>{pins.map(pin=><option value={pin.pinId} key={pin.pinId}>{titleFor(pin)} · {pin.pinId}</option>)}</select><button onClick={()=>onPick(otherPin)}>選為端點</button></div><p>{state.lessonId==='traffic-light'?'本課只支援 GPIO23、GPIO22、GPIO21 與 GND；三支路不可跨接。':state.lessonId==='dual-led'?'本課只支援 GPIO23、GPIO22 與 GND；兩個輸出不可跨接。':hasButton(state.lessonId)?'本課只支援 GPIO23 輸出、GPIO18 輸入與 GND。':'本課只支援 GPIO23 與 GND；其他接腳會顯示原因。'}</p></details>
    </div><section className="wire-list" aria-label="目前接線"><h3>目前接線 <span>({state.wires.length})</span></h3>{state.wires.length?<ul>{state.wires.map(wire=><li key={wire.id}><i style={{background:wireColor(wire)}}/><span>{terminalLabel(wire.from,state.lessonId)}<ArrowLeftRight size={13}/>{terminalLabel(wire.to,state.lessonId)}</span><button aria-label={`刪除接線 ${terminalLabel(wire.from,state.lessonId)} 至 ${terminalLabel(wire.to,state.lessonId)}`} onClick={()=>dispatch({type:'remove',id:wire.id})}><Trash2 size={15}/></button></li>)}</ul>:<p className="empty-wires">還沒有導線。選擇兩個端點，或按「顯示接線範例」開始。</p>}</section></div>
    <div className={`connection-notice${state.pending?' choosing':''}`} role="status"><span>{state.notice||'接線尚未開始。載入範例後，也可以刪除導線看看會發生什麼。'}</span>{state.pending&&<button onClick={()=>dispatch({type:'cancel'})}><X size={13}/>取消接線</button>}</div>
  </section>;
}

export default memo(ConnectionEditor);
