import {BookOpen,Trash2} from 'lucide-react';
import type {CircuitAnalysis,CircuitState,CircuitAction} from '../circuit';
import {loadExercise} from '../loadExercises';
import {useWiki} from '../wiki/WikiProvider';
import LoadStatus from './LoadStatus';
import ButtonControl,{type ButtonControlProps} from './ButtonControl';
export default function LoadLessonPanel({state,analysis,dispatch,buttonControl}:{state:CircuitState;analysis:CircuitAnalysis;dispatch:(action:CircuitAction)=>void;buttonControl?:ButtonControlProps}){
 const exercise=loadExercise(state.lessonId)!;const wiki=useWiki();const pwm=state.lessonId==='pwm-breathing';
 return <aside className="inspector lesson-inspector"><p className="lesson-index"><span>{exercise.number}</span> / {pwm?'PWM 呼吸燈':'主動式蜂鳴器門鈴'}</p><h2>{exercise.title}</h2><p className="lesson-intro">{pwm?'GPIO23 → 220 Ω → LED A+；LED K− → GND。沿用單 LED 接線。':'GPIO23 → 模組 S；3V3（J2-01）→ VCC；GND → 模組 GND。GPIO18 接按鈕 A 側，B 側接 GND。'}</p><button className="wiki-link" onClick={e=>wiki(exercise.topic,e.currentTarget)}><BookOpen size={16}/>了解接線與原理</button><p>{analysis.title}：{analysis.description}</p>
 {pwm?<label className="duty-slider">手動 PWM 佔空比 <output>{state.duty} / 255</output><input aria-label="手動 PWM 佔空比" type="range" min={0} max={255} value={state.duty} onChange={e=>dispatch({type:'duty',duty:Number(e.target.value)})}/></label>:<div className="level-switch" role="group" aria-label="蜂鳴器訊號電位">{(['HIGH','LOW'] as const).map(level=><button key={level} aria-pressed={state.level===level} onClick={()=>dispatch({type:'level',level})}>{level}</button>)}</div>}
 <LoadStatus key={state.lessonId} lessonId={state.lessonId} analysis={analysis} duty={state.duty}/><div className="lesson-actions"><button aria-pressed={state.exampleBackup!==null} onClick={()=>dispatch({type:'example'})}>{state.exampleBackup!==null?'隱藏接線範例':'顯示接線範例'}</button><button onClick={()=>dispatch({type:'clear'})}><Trash2 size={16}/>清空接線</button></div>{buttonControl?<ButtonControl {...buttonControl}/>:null}<p className="lesson-disclaimer">此頁手動檢查接線；請到程式練習自行完成動作與時序。只做離散教學規則。</p></aside>;
}
