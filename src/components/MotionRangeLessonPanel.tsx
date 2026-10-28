import {BookOpen,Trash2} from 'lucide-react';
import type {CircuitState,CircuitAnalysis,CircuitAction} from '../circuit';
import {analyzeMotionRange} from '../circuit';
import {useWiki} from '../wiki/WikiProvider';
import MotionRangeControl from './MotionRangeControl';
import {loadExercise} from '../loadExercises';
export default function MotionRangeLessonPanel({state,analysis,dispatch}:{state:CircuitState;analysis:CircuitAnalysis;dispatch:(action:CircuitAction)=>void}){
 const kind=state.lessonId==='ultrasonic-alert'?'ultrasonic-alert':'pir-delay',ultra=kind==='ultrasonic-alert',exercise=loadExercise(kind)!,wiki=useWiki();return <aside className="inspector lesson-inspector"><p className="lesson-index"><span>{exercise.number}</span> / {ultra?'超音波測距警示':'PIR 人體感測延遲燈'}</p><h2>{exercise.title}</h2><p className="lesson-intro">{ultra?'外部 5V 供電並共地，GPIO22 接 TRIG；ECHO 經 1 kΩ／2 kΩ 分壓接 GPIO34。LED 使用 GPIO23 與 220 Ω。':'外部 5V 供電並共地，3.3V 邏輯 OUT 接 GPIO27；LED 使用 GPIO23 與 220 Ω。'}</p><button className="wiki-link" onClick={e=>wiki(kind,e.currentTarget)}><BookOpen size={16}/>了解接線與原理</button><MotionRangeControl kind={kind} distance={state.distance} echo={state.echo} motion={state.motion} onDistance={value=>dispatch({type:'distance',value})} onEcho={value=>dispatch({type:'echo',value})} onMotion={value=>dispatch({type:'motion',value})} wiring={analyzeMotionRange(state.wires,kind)}/><p>此頁只檢查接線與原始輸入；警示與延遲邏輯請到程式練習完成。</p><p>{analysis.title}：{analysis.description}</p><div className="lesson-actions"><button aria-pressed={state.exampleBackup!==null} onClick={()=>dispatch({type:'example'})}>{state.exampleBackup!==null?'隱藏接線範例':'顯示接線範例'}</button><button onClick={()=>dispatch({type:'clear'})}><Trash2 size={16}/>清空接線</button></div></aside>;
}
