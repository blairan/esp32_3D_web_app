import {useWiki} from './wiki/WikiProvider';
import LearningWorkbench,{StepSection} from './learning/LearningWorkbench';
import useLearningNavigation from './learning/useLearningNavigation';
import type {LearningStep} from './learning/navigation';
import RunnerToolbar from './learning/RunnerToolbar';
import LessonIntroduction from './learning/LessonIntroduction';
import {arduinoGuide} from './learning/courseGuide';
import {lessons} from './lessons';
import PracticeFiles from './components/PracticeFiles';
import {readDraft,defaults,nextWireNumber,type Practice} from './practice/storage';
import BoardSelector from './components/BoardSelector';
import LessonMenu from './components/LessonMenu';
import {readLesson,hasButton,type LessonId} from './lessons';
import useButtonInput from './useButtonInput';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Box, Info, Cpu } from 'lucide-react';
import { pinById } from './board';
import { analyzeCircuit, analyzeButton, analyzePot, analyzeLight, analyzeMotionRange, analyzeDeviceWires, circuitReducer, initialCircuitState } from './circuit';
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
  const navigation=useLearningNavigation(!new URLSearchParams(location.search).has('lesson')),mode=navigation.exploring?'explore':'code';
  const [manualMode,setManualMode]=useState(false);
  const [lessonId,setLessonId]=useState<LessonId>(()=>readLesson(new URLSearchParams(location.search).get('lesson')));
  const [boot]=useState(()=>readDraft('esp32',lessonId));
  const [loadError,setLoadError]=useState(boot.error);
  const button=useButtonInput();
  const [circuit,dispatch]=useReducer(circuitReducer,restoredCircuit(lessonId,boot.draft));
  const [source,setSource]=useState(()=>boot.draft?.source??scaffoldFor(lessonId));
  const input=useMemo(()=>analyzeButton(circuit.wires,button.pressed,lessonId),[circuit.wires,button.pressed,lessonId]);
  const potInput=useMemo(()=>analyzePot(circuit.wires,circuit.pot),[circuit.wires,circuit.pot]);
  const lightInput=useMemo(()=>analyzeLight(circuit.wires,circuit.light),[circuit.wires,circuit.light]);
  const sensorKind=lessonId==='ultrasonic-alert'||lessonId==='pir-delay'?lessonId:null;
  const sensorWiring=useMemo(()=>analyzeMotionRange(circuit.wires,sensorKind??'pir-delay'),[circuit.wires,sensorKind]);
  const distanceInput=sensorWiring.valid?(circuit.echo?circuit.distance:0):null;
  const deviceKind=(lessonId==='climate-dht'||String(lessonId)==='environment-lab')||(lessonId==='oled-i2c'||lessonId==='seven-counter'||String(lessonId)==='environment-lab')?lessonId:null;
  const deviceWiring=useMemo(()=>analyzeDeviceWires(circuit.wires,(deviceKind??'climate-dht') as 'climate-dht'|'oled-i2c'|'seven-counter'|'environment-lab'),[circuit.wires,deviceKind]);
  const deviceInputs=useMemo(()=>({climate:(lessonId==='climate-dht'||String(lessonId)==='environment-lab')&&deviceWiring.valid&&!circuit.climateFault?{temperature:circuit.temperature,humidity:circuit.humidity}:null,oledWired:(lessonId==='oled-i2c'||lessonId==='seven-counter'||String(lessonId)==='environment-lab')&&deviceWiring.valid}),[lessonId,deviceWiring.valid,circuit.climateFault,circuit.temperature,circuit.humidity]);
  const runner=useProgramRunner(lessonId,lessonId==='pir-delay'?(sensorWiring.valid?(circuit.motion?'HIGH':'LOW'):null):input.level,lessonId==='ldr-nightlight'?lightInput.value:lessonId==='pot-dimming'?potInput.value:0,lessonId==='ultrasonic-alert'?distanceInput:100,deviceInputs);
  const level=!manualMode?(runner.state.outputEnabled?runner.state.level:'LOW'):circuit.level;
  const level2=!manualMode?(runner.state.outputs[22]?.enabled?runner.state.outputs[22].level:'LOW'):circuit.level2;
  const level3=!manualMode?(runner.state.outputs[21]?.enabled?runner.state.outputs[21].level:'LOW'):circuit.level3;
  const duty=!manualMode?(runner.state.outputs[23]?.duty??(level==='HIGH'?255:0)):circuit.duty;
  const rgbValues:[number,number,number]=!manualMode?[23,22,21].map(gpio=>runner.state.outputs[gpio]?.duty??(runner.state.outputs[gpio]?.level==='HIGH'?255:0)) as [number,number,number]:circuit.rgb;
  const effectiveLevel=lessonId==='servo-angle'?(!manualMode?(runner.state.servo.attached?'HIGH':'LOW'):'HIGH'):lessonId==='rgb-mixing'?(rgbValues[0]>0?'HIGH':'LOW'):(lessonId==='pwm-breathing'||lessonId==='pot-dimming')?(duty>0?'HIGH':'LOW'):level;
  const changeSource=(value:string)=>{runner.reset();setSource(value);};
  const analysis=useMemo(()=>analyzeCircuit(circuit.wires,effectiveLevel,lessonId,lessonId==='rgb-mixing'?(rgbValues[1]>0?'HIGH':'LOW'):level2,lessonId==='rgb-mixing'?(rgbValues[2]>0?'HIGH':'LOW'):level3),[circuit.wires,effectiveLevel,lessonId,level2,level3,rgbValues[0],rgbValues[1],rgbValues[2]]);
  const lesson=useMemo(()=>({id:lessonId,oled:(lessonId==='oled-i2c'||lessonId==='seven-counter'||String(lessonId)==='environment-lab')&&analysis.valid?runner.state.oled:{begun:false,revision:0,glyphs:[]},rgb:rgbValues.map((v,i)=>analysis.channels?.[i]?.valid?v:0),potPosition:circuit.pot,lightPosition:circuit.light,distance:circuit.distance,motion:lessonId==='pir-delay'&&sensorWiring.valid&&circuit.motion,servoAngle:!manualMode?(runner.state.servo.angle??90):circuit.servoAngle,brightness:(lessonId==='pwm-breathing'||lessonId==='pot-dimming')?duty/255:1,pressed:button.pressed,lit3:analysis.channels?.[2]?.lit??false,lit2:analysis.channels?.[1].lit??false,wires:circuit.wires,lit:lessonId==='rgb-mixing'?(analysis.channels?.[0]?.lit??false):analysis.lit,pending:circuit.pending,playing:manualMode||runner.state.status==='running'}),[circuit.wires,analysis.valid,analysis.lit,analysis.channels?.[1].lit,analysis.channels?.[2]?.lit,circuit.pending,manualMode,runner.state.status,lessonId,button.pressed,duty,circuit.pot,circuit.light,circuit.servoAngle,runner.state.servo.angle,circuit.distance,circuit.motion,sensorWiring.valid,runner.state.oled.revision,runner.state.oled.begun,rgbValues[0],rgbValues[1],rgbValues[2]]);
  const displayedState=manualMode?{...runner.state,level,outputEnabled:true,outputs:Object.fromEntries([23,22,21].map((gpio,i)=>{const value=lessonId==='rgb-mixing'?circuit.rgb[i]:i===0&&(lessonId==='pwm-breathing'||lessonId==='pot-dimming')?circuit.duty:[level,level2,level3][i]==='HIGH'?255:0;return [gpio,{enabled:true,duty:value,level:value>0?'HIGH' as const:'LOW' as const}];})),servo:{attached:analysis.valid&&lessonId==='servo-angle',angle:circuit.servoAngle}}:runner.state;
  const selectPin=useCallback((id:string)=>{if(pinById.has(id))setSelectedId(id);},[]);
  const pickTerminal=useCallback((id:string)=>{if(pinById.has(id))setSelectedId(id);dispatch({type:'pick',terminal:id});},[]);
  const press3D=useCallback((down:boolean)=>button.setSource('3d-pointer',down),[button.setSource]);
  const switchLesson=(next:LessonId):boolean=>{if(next===lessonId){switchMode('intro');return true;}if((source!==scaffoldFor(lessonId)||circuit.wires.length||circuit.pending||circuit.level!=='LOW'||circuit.level2!=='LOW'||circuit.level3!=='LOW'||circuit.duty!==0||circuit.rgb.some(v=>v!==0)||circuit.pot!==2048||circuit.light!==3072||circuit.servoAngle!==90||circuit.distance!==100||!circuit.echo||circuit.motion||circuit.temperature!==25||circuit.humidity!==60||circuit.climateFault||button.pressed||runner.state.status!=='idle')&&!window.confirm('切換專題會停止程式，目前練習會自動保存並載入所選課草稿，是否繼續？'))return false;runner.reset();button.release();setLessonId(next);const loaded=readDraft('esp32',next);setLoadError(loaded.error);const draft=loaded.draft;dispatch({type:'restore',state:restoredCircuit(next,draft)});setSource(draft?.source??scaffoldFor(next));setSelectedId('J3-02');setManualMode(false);navigation.navigate('intro');const url=new URL(location.href);url.searchParams.set('lesson',next);url.hash='intro';history.replaceState(null,'',url);return true;};
  const resetManual=()=>{dispatch({type:'level',level:'LOW'});dispatch({type:'level',gpio:22,level:'LOW'});dispatch({type:'level',gpio:21,level:'LOW'});dispatch({type:'duty',duty:0});for(const index of [0,1,2] as const)dispatch({type:'rgb',index,value:0});};
  const switchMode=(value:LearningStep|'led'|'explore')=>{button.releaseMomentary();dispatch({type:'cancel'});navigation.navigate(value==='led'?'wiring':value);};
  const start=()=>{if(!analysis.valid){switchMode('wiring');return;}setManualMode(false);resetManual();if(runner.state.status==='paused'&&!manualMode)runner.resume();else runner.start(source);};
  const stop=()=>{runner.stop();resetManual();setManualMode(false);button.release();};
  useEffect(()=>{if(!analysis.valid&&['running','starting','paused'].includes(runner.state.status))runner.stop();},[analysis.valid,runner.state.status,runner.stop]);
 useEffect(()=>{button.releaseMomentary();},[navigation.step,navigation.exploring,button.releaseMomentary]);
  const guide=arduinoGuide(lessonId),openWiki=useWiki();
  useEffect(()=>{
    const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('.wiki-dialog[open]'))dispatch({type:'cancel'});};
    window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);
  },[]);
  return <>
    <a className="skip-link" href={mode!=='explore'?'#learning-step-content':'#pin-directory'}>跳至{mode!=='explore'?'接線工作區':'接腳清單'}</a>
    <header className="app-header"><div className="brand"><Box size={31} strokeWidth={1.6}/><span>3D Interactive Lab</span></div><div className="header-controls"><BoardSelector dirty={source!==scaffoldFor(lessonId)||circuit.wires.length>0||circuit.pending!==null||runner.state.status!=='idle'||circuit.level!=='LOW'||circuit.level2!=='LOW'||circuit.level3!=='LOW'||circuit.duty!==0||circuit.rgb.some(v=>v!==0)||circuit.pot!==2048||circuit.light!==3072||circuit.servoAngle!==90||circuit.distance!==100||!circuit.echo||circuit.motion||circuit.temperature!==25||circuit.humidity!==60||circuit.climateFault||button.pressed} onLeave={runner.stop}/><nav className="app-nav" aria-label="實驗模式"><button aria-pressed={mode==='explore'} onClick={()=>switchMode('explore')}><Cpu size={17}/>接腳探索</button><LessonMenu lessonId={lessonId} mode={mode} onWiring={()=>switchMode('led')} onLesson={switchLesson}/></nav><AppearanceControl appearance={appearance} onChange={patch=>setAppearance(value=>({...value,...patch}))}/></div></header>
    <main>
      <section className="intro"><h1>{mode==='explore'?'從一個接腳，認識 ESP32。':lessons[lessonId].title}</h1><p>{mode==='explore'?'旋轉開發板，點選接腳，探索每個 GPIO 的用途。':guide.goal}</p></section>
      <LearningWorkbench exploring={navigation.exploring} step={navigation.step} onStep={switchMode}
        viewer={<BoardViewer selectedId={selectedId} onSelect={mode!=='explore'?pickTerminal:selectPin} lesson={mode!=='explore'?lesson:undefined} accent={appearance.accent} flow={appearance.flow} reducedMotion={reducedMotion} onButtonPress={press3D} onToggleFlow={()=>setAppearance(value=>({...value,flow:!value.flow}))}/>} explorer={<><PinInspector pin={pinById.get(selectedId)!}/><div id="pin-directory"><PinDirectory selectedId={selectedId} onSelect={selectPin}/></div></>}
        controls={<RunnerToolbar status={runner.state.status} timeMs={runner.state.timeMs} manual={manualMode} onStart={start} onPause={runner.pause} onStop={stop} onReset={()=>{runner.reset();resetManual();setManualMode(false);button.release();}}/>}
        files={<PracticeFiles key={lessonId} initialError={loadError} practice={{format:'interactive-lab-practice',version:1,boardId:'esp32',lessonId,source,wires:circuit.wires,backup:circuit.exampleBackup,inputs:{adc:circuit.pot,light:circuit.light,temperature:circuit.temperature,humidity:circuit.humidity,distance:circuit.distance,echo:circuit.echo,motion:circuit.motion,fault:circuit.climateFault},savedAt:'2000-01-01T00:00:00.000Z'}} onBeforeImport={()=>{runner.stop();button.release();}}/>}>
        <StepSection when="intro"><LessonIntroduction goal={guide.goal} parts={guide.parts} expected={guide.expected}><button className="wiki-link" onClick={e=>openWiki(guide.topic,e.currentTarget)}>查看教學 Wiki</button><button className="guide-next" onClick={()=>switchMode('wiring')}>開始接線</button></LessonIntroduction></StepSection>
        <StepSection when="wiring"><h2>接線與元件</h2><p className="guide-note">依端點標籤完成接線；範例可再次按下還原自己的接線。程式執行中切換步驟不會停止。</p>
          <button className="wiki-link" onClick={e=>openWiki(lessonId==='blink'?'led-circuit':guide.topic,e.currentTarget)}>了解接線原理</button><ConnectionEditor state={circuit} dispatch={dispatch} onPick={pickTerminal}/>
          <section className="manual-mode"><h3>手動輸出檢查</h3><p>進入手動模式會停止程式並清除輸出。執行程式時會退出手動模式。</p><button aria-pressed={manualMode} onClick={()=>{stop();setManualMode(!manualMode);}}>{manualMode?'退出手動輸出':'進入手動輸出'}</button>
          {manualMode&&<LessonPanel buttonControl={hasButton(lessonId)?{pressed:button.pressed,held:button.held,onSource:button.setSource,onHeld:button.setHeld,input}:undefined} state={circuit} analysis={analysis} dispatch={dispatch}/>}</section>
        </StepSection>
        <ProgramPanel climateControl={(lessonId==='climate-dht'||String(lessonId)==='environment-lab')?{temperature:circuit.temperature,humidity:circuit.humidity,fault:circuit.climateFault,onTemperature:value=>dispatch({type:'temperature',value}),onHumidity:value=>dispatch({type:'humidity',value}),onFault:value=>dispatch({type:'climate-fault',value}),wiring:deviceWiring,reading:runner.state.climate}:undefined} sensorControl={sensorKind?{kind:sensorKind,distance:circuit.distance,echo:circuit.echo,motion:circuit.motion,onDistance:value=>dispatch({type:'distance',value}),onEcho:value=>dispatch({type:'echo',value}),onMotion:value=>dispatch({type:'motion',value}),wiring:sensorWiring,lastPulse:runner.state.lastPulse,lastRead:runner.state.lastRead}:undefined} potControl={lessonId==='ldr-nightlight'?{kind:'light',position:circuit.light,onChange:value=>dispatch({type:'light',value}),input:lightInput,lastRead:runner.state.lastAnalogRead}:lessonId==='pot-dimming'?{position:circuit.pot,onChange:value=>dispatch({type:'pot',value}),input:potInput,lastRead:runner.state.lastAnalogRead}:undefined} exampleVisible={circuit.exampleBackup!==null} lessonId={lessonId} buttonControl={hasButton(lessonId)?{pressed:button.pressed,held:button.held,onSource:button.setSource,onHeld:button.setHeld,input,lastRead:runner.state.lastRead,inputEnabled:runner.state.inputEnabled}:undefined} source={source} state={displayedState} analysis={analysis} onChange={changeSource} onShowCode={()=>switchMode('code')} onScaffold={()=>changeSource(scaffoldFor(lessonId))} onWiringExample={()=>dispatch({type:'example'})}/>
      </LearningWorkbench>
      <footer className="app-footer"><Info size={15}/><p>{mode!=='explore'?'這是教學用離散接線模擬，不代表精確電路行為；元件與導線為簡化模型，請勿直接據此連接真實硬體。':'這是教學用的簡化 3D 模型，接腳映射依官方文件整理；元件外觀與尺寸為示意，不作為實際接線或機械設計依據。'}</p></footer>
    </main>
  </>;
}

function restoredCircuit(lessonId:LessonId,draft:Practice|null){const i=draft?.inputs??defaults('esp32');return {...initialCircuitState,lessonId,wires:draft?.wires??[],exampleBackup:draft?.backup??null,nextWire:nextWireNumber(draft),pot:i.adc,light:i.light,temperature:i.temperature,humidity:i.humidity,distance:i.distance,echo:i.echo,motion:i.motion,climateFault:i.fault};}
