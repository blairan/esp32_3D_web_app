import {BookOpen,Trash2} from 'lucide-react';
import type {CircuitState,CircuitAnalysis,CircuitAction} from '../circuit';
import {analyzeLight} from '../circuit';
import {loadExercise} from '../loadExercises';
import {useWiki} from '../wiki/WikiProvider';
import PotControl from './PotControl';
import ServoStatus from './ServoStatus';
export default function EnvironmentLessonPanel({state,analysis,dispatch}:{state:CircuitState;analysis:CircuitAnalysis;dispatch:(action:CircuitAction)=>void}){
 const light=state.lessonId==='ldr-nightlight',exercise=loadExercise(state.lessonId)!,wiki=useWiki();return <aside className="inspector lesson-inspector"><p className="lesson-index"><span>{exercise.number}</span> / {light?'光敏電阻夜燈':'伺服馬達角度控制'}</p><h2>{exercise.title}</h2><p className="lesson-intro">{light?'3V3 → 光阻 → 分壓點／GPIO34（J2-05）→ 10 kΩ → GND；LED 沿用 GPIO23 與 220 Ω。':'GPIO23 → SIG、外部 5V → VCC、外部 GND → 伺服 GND，另與開發板 GND 共地。'}</p><button className="wiki-link" onClick={e=>wiki(light?'ldr-nightlight':'servo-angle',e.currentTarget)}><BookOpen size={16}/>了解接線與原理</button>{light?<><PotControl kind="light" position={state.light} input={analyzeLight(state.wires,state.light)} onChange={value=>dispatch({type:'light',value})}/><p>此頁檢查輸入；夜燈的門檻與開關邏輯由程式練習完成。</p></>:<><label className="duty-slider">手動角度 · {state.servoAngle}°<input type="range" min={0} max={180} value={state.servoAngle} aria-label="手動伺服角度" onChange={e=>dispatch({type:'servo-angle',angle:Number(e.target.value)})}/></label><ServoStatus attached angle={state.servoAngle} valid={analysis.valid}/></>}<p>{analysis.title}：{analysis.description}</p><div className="lesson-actions"><button aria-pressed={state.exampleBackup!==null} onClick={()=>dispatch({type:'example'})}>{state.exampleBackup!==null?'隱藏接線範例':'顯示接線範例'}</button><button onClick={()=>dispatch({type:'clear'})}><Trash2 size={16}/>清空接線</button></div></aside>;
}
