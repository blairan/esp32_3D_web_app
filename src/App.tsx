import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Box, Info, Cpu, Lightbulb } from 'lucide-react';
import { pinById } from './board';
import { analyzeCircuit, circuitReducer, initialCircuitState } from './circuit';
import BoardViewer from './components/BoardViewer';
import PinInspector from './components/PinInspector';
import PinDirectory from './components/PinDirectory';
import LessonPanel from './components/LessonPanel';
import ConnectionEditor from './components/ConnectionEditor';
export default function App() {
  const [selectedId,setSelectedId]=useState('J3-02');
  const [mode,setMode]=useState<'explore'|'led'>(()=>window.location.hash==='#led'?'led':'explore');
  const [circuit,dispatch]=useReducer(circuitReducer,initialCircuitState);
  const analysis=useMemo(()=>analyzeCircuit(circuit.wires,circuit.level),[circuit.wires,circuit.level]);
  const lesson=useMemo(()=>({wires:circuit.wires,lit:analysis.lit,pending:circuit.pending}),[circuit.wires,analysis.lit,circuit.pending]);
  const selectPin=useCallback((id:string)=>{if(pinById.has(id))setSelectedId(id);},[]);
  const pickTerminal=useCallback((id:string)=>{if(pinById.has(id))setSelectedId(id);dispatch({type:'pick',terminal:id});},[]);
  const switchMode=(value:'explore'|'led')=>{setMode(value);window.history.replaceState(null,'',`#${value}`);};
  useEffect(()=>{
    const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape')dispatch({type:'cancel'});};
    window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);
  },[]);
  return <>
    <a className="skip-link" href={mode==='led'?'#connection-title':'#pin-directory'}>跳至{mode==='led'?'接線工作區':'接腳清單'}</a>
    <header className="app-header"><div className="brand"><Box size={31} strokeWidth={1.6}/><span>ESP32 <span className="brand-rest">Interactive Lab</span></span></div><nav className="app-nav" aria-label="實驗模式"><button aria-pressed={mode==='explore'} onClick={()=>switchMode('explore')}><Cpu size={17}/>接腳探索</button><button aria-pressed={mode==='led'} onClick={()=>switchMode('led')}><Lightbulb size={17}/>LED 接線</button></nav></header>
    <main>
      <section className="intro"><h1>{mode==='led'?'讓第一顆 LED 亮起來。':'從一個接腳，認識 ESP32。'}</h1><p>{mode==='led'?'連接兩個端點，完成你的第一個電路。':'旋轉開發板，點選接腳，探索每個 GPIO 的用途。'}</p></section>
      <div className={`workbench${mode==='led'?' lesson-workbench':''}`}>
        <BoardViewer selectedId={selectedId} onSelect={mode==='led'?pickTerminal:selectPin} lesson={mode==='led'?lesson:undefined}/>
        {mode==='led'?<LessonPanel state={circuit} analysis={analysis} dispatch={dispatch}/>:<PinInspector pin={pinById.get(selectedId)!}/>}
      </div>
      {mode==='led'?<ConnectionEditor state={circuit} dispatch={dispatch} onPick={pickTerminal}/>:<div id="pin-directory"><PinDirectory selectedId={selectedId} onSelect={selectPin}/></div>}
      <footer className="app-footer"><Info size={15}/><p>{mode==='led'?'這是教學用離散接線模擬，不代表精確電路行為；元件與導線為簡化模型，請勿直接據此連接真實硬體。':'這是教學用的簡化 3D 模型，接腳映射依官方文件整理；元件外觀與尺寸為示意，不作為實際接線或機械設計依據。'}</p></footer>
    </main>
  </>;
}
