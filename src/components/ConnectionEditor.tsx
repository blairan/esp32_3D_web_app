import { memo, useState } from 'react';
import { Cable, Cpu, Lightbulb, Trash2, ArrowRight, X, CircuitBoard } from 'lucide-react';
import { pins, titleFor } from '../board';
import { terminalLabel, wireColor } from '../circuit';
import type { CircuitState, CircuitAction } from '../circuit';
interface Props {state:CircuitState;dispatch:(action:CircuitAction)=>void;onPick:(terminal:string)=>void}
function ConnectionEditor({state,dispatch,onPick}:Props) {
  const [otherPin,setOtherPin]=useState('J2-03');
  const terminal=(id:string,label:string)=> <button className={`terminal-button${state.pending===id?' pending':''}`} aria-pressed={state.pending===id} aria-label={`接線端點 ${terminalLabel(id)}`} onClick={()=>onPick(id)} key={id}><i/>{label}</button>;
  return <section className="connection-editor" aria-labelledby="connection-title">
    <div className="connection-heading"><div><h2 id="connection-title"><Cable size={20}/>接線工作區</h2><p>先選起點，再選終點；可點 3D 模型，或用下方端點接線。</p></div><span className="wire-count">{state.wires.length} 條接線</span></div>
    <div className="connection-body"><div className="terminal-groups">
      <section><h3><Cpu size={17}/>開發板</h3><div className="terminal-buttons">{terminal('J3-02','GPIO23')}{terminal('J3-01','GND · J3-01')}{terminal('J3-07','GND · J3-07')}{terminal('J2-14','GND · J2-14')}</div></section>
      <section><h3><CircuitBoard size={17}/>220 Ω 電阻</h3><div className="terminal-buttons">{terminal('resistor:a','A 端')}{terminal('resistor:b','B 端')}</div><p>電阻沒有極性，A／B 可互換。</p></section>
      <section><h3><Lightbulb size={17}/>LED</h3><div className="terminal-buttons">{terminal('led:a','正極 A+')}{terminal('led:k','負極 K−')}</div><p>A+ 朝向輸出，K− 朝向接地。</p></section>
      <details className="other-pins"><summary>試試其他接腳</summary><div><label htmlFor="other-pin">選擇開發板接腳</label><select id="other-pin" value={otherPin} onChange={event=>setOtherPin(event.target.value)}>{pins.map(pin=><option value={pin.pinId} key={pin.pinId}>{titleFor(pin)} · {pin.pinId}</option>)}</select><button onClick={()=>onPick(otherPin)}>選為端點</button></div><p>本課只支援 GPIO23 與 GND；其他接腳會顯示原因。</p></details>
    </div><section className="wire-list" aria-label="目前接線"><h3>目前接線 <span>({state.wires.length})</span></h3>{state.wires.length?<ul>{state.wires.map(wire=><li key={wire.id}><i style={{background:wireColor(wire)}}/><span>{terminalLabel(wire.from)}<ArrowRight size={13}/>{terminalLabel(wire.to)}</span><button aria-label={`刪除接線 ${terminalLabel(wire.from)} 至 ${terminalLabel(wire.to)}`} onClick={()=>dispatch({type:'remove',id:wire.id})}><Trash2 size={15}/></button></li>)}</ul>:<p className="empty-wires">還沒有導線。選擇兩個端點，或按「載入範例」開始。</p>}</section></div>
    <div className={`connection-notice${state.pending?' choosing':''}`} role="status"><span>{state.notice||'接線尚未開始。載入範例後，也可以刪除導線看看會發生什麼。'}</span>{state.pending&&<button onClick={()=>dispatch({type:'cancel'})}><X size={13}/>取消接線</button>}</div>
  </section>;
}

export default memo(ConnectionEditor);
