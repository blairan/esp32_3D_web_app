import {loadExercise} from './loadExercises';
import {buttonExercise} from './buttonExercises';
import LessonMenu from './components/LessonMenu';
import {readLesson,hasButton,type LessonId} from './lessons';
import useButtonInput from './useButtonInput';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Box, Info, Cpu, Code2 } from 'lucide-react';
import { pinById } from './board';
import { analyzeCircuit, analyzeButton, analyzePot, analyzeLight, analyzeMotionRange, circuitReducer, initialCircuitState } from './circuit';
import BoardViewer from './components/BoardViewer';
import PinInspector from './components/PinInspector';
import PinDirectory from './components/PinDirectory';
import LessonPanel from './components/LessonPanel';
import ConnectionEditor from './components/ConnectionEditor';
import ProgramPanel from './components/ProgramPanel';
import useProgramRunner from './program/useProgramRunner';
import AppearanceControl from './components/AppearanceControl';
import {accentTokens,backgroundTokens,appearanceKey,readAppearance,defaultAppearance} from './appearance';
import { scaffoldFor } from './program/completion';
export default function App() {
  const [selectedId,setSelectedId]=useState('J3-02');
  const [appearance,setAppearance]=useState(()=>{try{return readAppearance(localStorage.getItem(appearanceKey));}catch{return {...defaultAppearance};}});
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{for(const [key,value] of Object.entries({...accentTokens(appearance.accent),...backgroundTokens(appearance)}))document.documentElement.style.setProperty(key,value);try{localStorage.setItem(appearanceKey,JSON.stringify(appearance));}catch{/* Preferences still work when storage is disabled. */}},[appearance]);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReducedMotion(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  const [mode,setMode]=useState<'explore'|'led'|'code'>(()=>window.location.hash==='#code'?'code':window.location.hash==='#led'?'led':'explore');
  const [lessonId,setLessonId]=useState<LessonId>(()=>readLesson(new URLSearchParams(location.search).get('lesson')));
  const exercise=buttonExercise(lessonId)??loadExercise(lessonId);
  const button=useButtonInput();
  const [circuit,dispatch]=useReducer(circuitReducer,{...initialCircuitState,lessonId});
  const [source,setSource]=useState(()=>scaffoldFor(lessonId));
  const input=useMemo(()=>analyzeButton(circuit.wires,button.pressed,lessonId),[circuit.wires,button.pressed,lessonId]);
  const potInput=useMemo(()=>analyzePot(circuit.wires,circuit.pot),[circuit.wires,circuit.pot]);
  const lightInput=useMemo(()=>analyzeLight(circuit.wires,circuit.light),[circuit.wires,circuit.light]);
  const sensorKind=lessonId==='ultrasonic-alert'||lessonId==='pir-delay'?lessonId:null;
  const sensorWiring=useMemo(()=>analyzeMotionRange(circuit.wires,sensorKind??'pir-delay'),[circuit.wires,sensorKind]);
  const distanceInput=sensorWiring.valid?(circuit.echo?circuit.distance:0):null;
  const runner=useProgramRunner(lessonId,lessonId==='pir-delay'?(sensorWiring.valid?(circuit.motion?'HIGH':'LOW'):null):input.level,lessonId==='ldr-nightlight'?lightInput.value:lessonId==='pot-dimming'?potInput.value:0,lessonId==='ultrasonic-alert'?distanceInput:100);
  const level=mode==='code'?(runner.state.outputEnabled?runner.state.level:'LOW'):circuit.level;
  const level2=mode==='code'?(runner.state.outputs[22]?.enabled?runner.state.outputs[22].level:'LOW'):circuit.level2;
  const level3=mode==='code'?(runner.state.outputs[21]?.enabled?runner.state.outputs[21].level:'LOW'):circuit.level3;
  const duty=mode==='code'?(runner.state.outputs[23]?.duty??(level==='HIGH'?255:0)):circuit.duty;
  const rgbValues:[number,number,number]=mode==='code'?[23,22,21].map(gpio=>runner.state.outputs[gpio]?.duty??(runner.state.outputs[gpio]?.level==='HIGH'?255:0)) as [number,number,number]:circuit.rgb;
  const effectiveLevel=lessonId==='servo-angle'?(mode==='code'?(runner.state.servo.attached?'HIGH':'LOW'):'HIGH'):lessonId==='rgb-mixing'?(rgbValues[0]>0?'HIGH':'LOW'):(lessonId==='pwm-breathing'||lessonId==='pot-dimming')?(duty>0?'HIGH':'LOW'):level;
  const changeSource=(value:string)=>{runner.reset();setSource(value);};
  const analysis=useMemo(()=>analyzeCircuit(circuit.wires,effectiveLevel,lessonId,lessonId==='rgb-mixing'?(rgbValues[1]>0?'HIGH':'LOW'):level2,lessonId==='rgb-mixing'?(rgbValues[2]>0?'HIGH':'LOW'):level3),[circuit.wires,effectiveLevel,lessonId,level2,level3,rgbValues[0],rgbValues[1],rgbValues[2]]);
  const lesson=useMemo(()=>({id:lessonId,rgb:rgbValues.map((v,i)=>analysis.channels?.[i]?.valid?v:0),potPosition:circuit.pot,lightPosition:circuit.light,distance:circuit.distance,motion:lessonId==='pir-delay'&&sensorWiring.valid&&circuit.motion,servoAngle:mode==='code'?(runner.state.servo.angle??90):circuit.servoAngle,brightness:(lessonId==='pwm-breathing'||lessonId==='pot-dimming')?duty/255:1,pressed:button.pressed,lit3:analysis.channels?.[2]?.lit??false,lit2:analysis.channels?.[1].lit??false,wires:circuit.wires,lit:lessonId==='rgb-mixing'?(analysis.channels?.[0]?.lit??false):analysis.lit,pending:circuit.pending,playing:mode!=='code'||runner.state.status==='running'}),[circuit.wires,analysis.lit,analysis.channels?.[1].lit,analysis.channels?.[2]?.lit,circuit.pending,mode,runner.state.status,lessonId,button.pressed,duty,circuit.pot,circuit.light,circuit.servoAngle,runner.state.servo.angle,circuit.distance,circuit.motion,sensorWiring.valid,rgbValues[0],rgbValues[1],rgbValues[2]]);
  const selectPin=useCallback((id:string)=>{if(pinById.has(id))setSelectedId(id);},[]);
  const pickTerminal=useCallback((id:string)=>{if(pinById.has(id))setSelectedId(id);dispatch({type:'pick',terminal:id});},[]);
  const press3D=useCallback((down:boolean)=>button.setSource('3d-pointer',down),[button.setSource]);
  const switchLesson=(next:LessonId):boolean=>{if(next===lessonId){switchMode('code');return true;}if((source!==scaffoldFor(lessonId)||circuit.wires.length||circuit.pending||circuit.level!=='LOW'||circuit.level2!=='LOW'||circuit.level3!=='LOW'||circuit.duty!==0||circuit.rgb.some(v=>v!==0)||circuit.pot!==2048||circuit.light!==3072||circuit.servoAngle!==90||circuit.distance!==100||!circuit.echo||circuit.motion||button.pressed||runner.state.status!=='idle')&&!window.confirm('切換專題會停止程式並清除目前程式與接線，是否繼續？'))return false;runner.reset();button.release();setLessonId(next);dispatch({type:'lesson',lessonId:next});setSource(scaffoldFor(next));setSelectedId('J3-02');setMode('code');const url=new URL(location.href);url.searchParams.set('lesson',next);url.hash='code';history.replaceState(null,'',url);return true;};
  const switchMode=(value:'explore'|'led'|'code')=>{if(value!==mode)button.release();if(mode==='code'&&value!=='code')runner.stop();if(mode!=='code'&&value==='code'){runner.reset();dispatch({type:'level',level:'LOW'});}if(value==='code'&&mode!=='code'){dispatch({type:'level',gpio:22,level:'LOW'});dispatch({type:'level',gpio:21,level:'LOW'});dispatch({type:'duty',duty:0});for(const index of [0,1,2] as const)dispatch({type:'rgb',index,value:0});}setMode(value);const url=new URL(location.href);url.hash=value;window.history.replaceState(null,'',url);};
  useEffect(()=>{
    const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('.wiki-dialog[open]'))dispatch({type:'cancel'});};
    window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);
  },[]);
  return <>
    <a className="skip-link" href={mode!=='explore'?'#connection-title':'#pin-directory'}>跳至{mode!=='explore'?'接線工作區':'接腳清單'}</a>
    <header className="app-header"><div className="brand"><Box size={31} strokeWidth={1.6}/><span>ESP32 <span className="brand-rest">Interactive Lab</span></span></div><div className="header-controls"><nav className="app-nav" aria-label="實驗模式"><button aria-pressed={mode==='explore'} onClick={()=>switchMode('explore')}><Cpu size={17}/>接腳探索</button><LessonMenu lessonId={lessonId} mode={mode} onWiring={()=>switchMode('led')} onLesson={switchLesson}/><button aria-pressed={mode==='code'} onClick={()=>switchMode('code')}><Code2 size={17}/>程式練習</button></nav><AppearanceControl appearance={appearance} onChange={patch=>setAppearance(value=>({...value,...patch}))}/></div></header>
    <main>
      <section className="intro"><h1>{mode==='code'?(exercise?exercise.title:lessonId==='traffic-light'?'紅黃綠，依序通行。':hasButton(lessonId)?'按住按鈕，點亮 LED。':lessonId==='dual-led'?'讓兩顆 LED，輪流亮起。':'用程式，讓 LED 開始閃爍。'):mode==='led'?(loadExercise(lessonId)?.title??(lessonId==='traffic-light'?'接好三條獨立號誌支路。':hasButton(lessonId)?'先接線，再觀察按鈕。':lessonId==='dual-led'?'接好兩條獨立 LED 支路。':'讓第一顆 LED 亮起來。')):'從一個接腳，認識 ESP32。'}</h1><p>{mode==='code'?(exercise?exercise.goal:lessonId==='traffic-light'?'設定三個輸出，安排紅、綠、黃的順序與等待時間。':hasButton(lessonId)?'從基本架構開始，讀取按鈕電位，用條件控制 LED。':lessonId==='dual-led'?'獨立設定兩個輸出，用動作順序與等待時間完成交替。':'從基本架構開始，用虛擬時間觀察每一次亮滅。'):mode==='led'?(loadExercise(lessonId)?.goal??(lessonId==='traffic-light'?'三條支路各自限流，完成後逐一測試紅、黃、綠燈。':'連接兩個端點，完成你的第一個電路。')):'旋轉開發板，點選接腳，探索每個 GPIO 的用途。'}</p></section>
      <div className={`workbench${mode!=='explore'?' lesson-workbench':''}${mode==='code'?' code-workbench':''}`}>
        <BoardViewer selectedId={selectedId} onSelect={mode!=='explore'?pickTerminal:selectPin} lesson={mode!=='explore'?lesson:undefined} accent={appearance.accent} flow={appearance.flow} reducedMotion={reducedMotion} onButtonPress={press3D} onToggleFlow={()=>setAppearance(value=>({...value,flow:!value.flow}))}/>
        {mode==='code'?<ProgramPanel sensorControl={sensorKind?{kind:sensorKind,distance:circuit.distance,echo:circuit.echo,motion:circuit.motion,onDistance:value=>dispatch({type:'distance',value}),onEcho:value=>dispatch({type:'echo',value}),onMotion:value=>dispatch({type:'motion',value}),wiring:sensorWiring,lastPulse:runner.state.lastPulse,lastRead:runner.state.lastRead}:undefined} potControl={lessonId==='ldr-nightlight'?{kind:'light',position:circuit.light,onChange:value=>dispatch({type:'light',value}),input:lightInput,lastRead:runner.state.lastAnalogRead}:lessonId==='pot-dimming'?{position:circuit.pot,onChange:value=>dispatch({type:'pot',value}),input:potInput,lastRead:runner.state.lastAnalogRead}:undefined} exampleVisible={circuit.exampleBackup!==null} lessonId={lessonId} buttonControl={hasButton(lessonId)?{pressed:button.pressed,held:button.held,onSource:button.setSource,onHeld:button.setHeld,input,lastRead:runner.state.lastRead,inputEnabled:runner.state.inputEnabled}:undefined} source={source} state={runner.state} analysis={analysis} onChange={changeSource} onStart={()=>runner.start(source)} onPause={runner.pause} onResume={runner.resume} onStop={runner.stop} onReset={runner.reset} onScaffold={()=>changeSource(scaffoldFor(lessonId))} onWiringExample={()=>dispatch({type:'example'})}/>:mode==='led'?<LessonPanel buttonControl={hasButton(lessonId)?{pressed:button.pressed,held:button.held,onSource:button.setSource,onHeld:button.setHeld,input}:undefined} state={circuit} analysis={analysis} dispatch={dispatch}/>:<PinInspector pin={pinById.get(selectedId)!}/>}
      </div>
      {mode!=='explore'?<ConnectionEditor state={circuit} dispatch={dispatch} onPick={pickTerminal}/>:<div id="pin-directory"><PinDirectory selectedId={selectedId} onSelect={selectPin}/></div>}
      <footer className="app-footer"><Info size={15}/><p>{mode!=='explore'?'這是教學用離散接線模擬，不代表精確電路行為；元件與導線為簡化模型，請勿直接據此連接真實硬體。':'這是教學用的簡化 3D 模型，接腳映射依官方文件整理；元件外觀與尺寸為示意，不作為實際接線或機械設計依據。'}</p></footer>
    </main>
  </>;
}
