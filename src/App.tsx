import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Box, Info, Cpu, Lightbulb, Code2 } from 'lucide-react';
import { pinById } from './board';
import { analyzeCircuit, circuitReducer, initialCircuitState } from './circuit';
import BoardViewer from './components/BoardViewer';
import PinInspector from './components/PinInspector';
import PinDirectory from './components/PinDirectory';
import LessonPanel from './components/LessonPanel';
import ConnectionEditor from './components/ConnectionEditor';
import ProgramPanel from './components/ProgramPanel';
import useProgramRunner from './program/useProgramRunner';
import AppearanceControl from './components/AppearanceControl';
import {accentTokens,backgroundTokens,appearanceKey,readAppearance,defaultAppearance} from './appearance';
import { blinkExample } from './program/language';
export default function App() {
  const [selectedId,setSelectedId]=useState('J3-02');
  const [appearance,setAppearance]=useState(()=>{try{return readAppearance(localStorage.getItem(appearanceKey));}catch{return {...defaultAppearance};}});
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{for(const [key,value] of Object.entries({...accentTokens(appearance.accent),...backgroundTokens(appearance)}))document.documentElement.style.setProperty(key,value);try{localStorage.setItem(appearanceKey,JSON.stringify(appearance));}catch{/* Preferences still work when storage is disabled. */}},[appearance]);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReducedMotion(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  const [mode,setMode]=useState<'explore'|'led'|'code'>(()=>window.location.hash==='#code'?'code':window.location.hash==='#led'?'led':'explore');
  const [circuit,dispatch]=useReducer(circuitReducer,initialCircuitState);
  const [source,setSource]=useState(blinkExample);
  const runner=useProgramRunner();
  const level=mode==='code'?(runner.state.outputEnabled?runner.state.level:'LOW'):circuit.level;
  const changeSource=(value:string)=>{runner.reset();setSource(value);};
  const analysis=useMemo(()=>analyzeCircuit(circuit.wires,level),[circuit.wires,level]);
  const lesson=useMemo(()=>({wires:circuit.wires,lit:analysis.lit,pending:circuit.pending,playing:mode!=='code'||runner.state.status==='running'}),[circuit.wires,analysis.lit,circuit.pending,mode,runner.state.status]);
  const selectPin=useCallback((id:string)=>{if(pinById.has(id))setSelectedId(id);},[]);
  const pickTerminal=useCallback((id:string)=>{if(pinById.has(id))setSelectedId(id);dispatch({type:'pick',terminal:id});},[]);
  const switchMode=(value:'explore'|'led'|'code')=>{if(mode==='code'&&value!=='code')runner.stop();if(mode!=='code'&&value==='code'){runner.reset();dispatch({type:'level',level:'LOW'});}setMode(value);window.history.replaceState(null,'',`#${value}`);};
  useEffect(()=>{
    const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape')dispatch({type:'cancel'});};
    window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);
  },[]);
  return <>
    <a className="skip-link" href={mode!=='explore'?'#connection-title':'#pin-directory'}>跳至{mode!=='explore'?'接線工作區':'接腳清單'}</a>
    <header className="app-header"><div className="brand"><Box size={31} strokeWidth={1.6}/><span>ESP32 <span className="brand-rest">Interactive Lab</span></span></div><div className="header-controls"><nav className="app-nav" aria-label="實驗模式"><button aria-pressed={mode==='explore'} onClick={()=>switchMode('explore')}><Cpu size={17}/>接腳探索</button><button aria-pressed={mode==='led'} onClick={()=>switchMode('led')}><Lightbulb size={17}/>LED 接線</button><button aria-pressed={mode==='code'} onClick={()=>switchMode('code')}><Code2 size={17}/>程式練習</button></nav><AppearanceControl appearance={appearance} onChange={patch=>setAppearance(value=>({...value,...patch}))}/></div></header>
    <main>
      <section className="intro"><h1>{mode==='code'?'用程式，讓 LED 開始閃爍。':mode==='led'?'讓第一顆 LED 亮起來。':'從一個接腳，認識 ESP32。'}</h1><p>{mode==='code'?'修改 Blink 範例，用虛擬時間觀察每一次亮滅。':mode==='led'?'連接兩個端點，完成你的第一個電路。':'旋轉開發板，點選接腳，探索每個 GPIO 的用途。'}</p></section>
      <div className={`workbench${mode!=='explore'?' lesson-workbench':''}${mode==='code'?' code-workbench':''}`}>
        <BoardViewer selectedId={selectedId} onSelect={mode!=='explore'?pickTerminal:selectPin} lesson={mode!=='explore'?lesson:undefined} accent={appearance.accent} flow={appearance.flow} reducedMotion={reducedMotion} onToggleFlow={()=>setAppearance(value=>({...value,flow:!value.flow}))}/>
        {mode==='code'?<ProgramPanel source={source} state={runner.state} analysis={analysis} onChange={changeSource} onStart={()=>runner.start(source)} onPause={runner.pause} onResume={runner.resume} onStop={runner.stop} onReset={runner.reset} onExample={()=>changeSource(blinkExample)} onWiringExample={()=>dispatch({type:'example'})}/>:mode==='led'?<LessonPanel state={circuit} analysis={analysis} dispatch={dispatch}/>:<PinInspector pin={pinById.get(selectedId)!}/>}
      </div>
      {mode!=='explore'?<ConnectionEditor state={circuit} dispatch={dispatch} onPick={pickTerminal}/>:<div id="pin-directory"><PinDirectory selectedId={selectedId} onSelect={selectPin}/></div>}
      <footer className="app-footer"><Info size={15}/><p>{mode!=='explore'?'這是教學用離散接線模擬，不代表精確電路行為；元件與導線為簡化模型，請勿直接據此連接真實硬體。':'這是教學用的簡化 3D 模型，接腳映射依官方文件整理；元件外觀與尺寸為示意，不作為實際接線或機械設計依據。'}</p></footer>
    </main>
  </>;
}
