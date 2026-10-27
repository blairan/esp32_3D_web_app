import {BookOpen,Trash2} from 'lucide-react';
import DualOutputs from './DualOutputs';
import {useWiki} from '../wiki/WikiProvider';
import {topicArticles} from '../wiki/articles';
import type {CircuitAnalysis,CircuitState,CircuitAction} from '../circuit';
export default function DualLessonPanel({state,analysis,dispatch}:{state:CircuitState;analysis:CircuitAnalysis;dispatch:(action:CircuitAction)=>void}){
 const wiki=useWiki();return <aside className="inspector lesson-inspector" aria-label="雙 LED 接線與輸出控制"><p className="lesson-index"><span>03</span> / 雙 LED 交替閃爍</p><h2>兩條支路，獨立控制。</h2><p className="lesson-intro">LED 1 使用 GPIO23，LED 2 使用 GPIO22。兩顆 LED 各自串聯一顆 220 Ω 電阻，再回到 GND。</p><button className="wiki-link lesson-wiki-link" onClick={event=>wiki(topicArticles.dual,event.currentTarget)}><BookOpen size={16}/>了解雙 LED 接線原理</button><ol className="lesson-steps"><li><span>GPIO23 → 電阻 1 → LED 1 的 A+，K− → GND。</span></li><li><span>GPIO22（J3-03）→ 電阻 2 → LED 2 的 A+，K− → GND。</span></li><li><span>可共用 GND，不能共用一顆限流電阻或把兩個輸出接在一起。</span></li></ol><DualOutputs analysis={analysis} manual={state} dispatch={dispatch}/><div className="lesson-actions"><button onClick={()=>dispatch({type:'example'})}><BookOpen size={16}/>載入範例</button><button onClick={()=>dispatch({type:'clear'})} disabled={!state.wires.length&&!state.pending&&state.level==='LOW'&&state.level2==='LOW'}><Trash2 size={16}/>清空接線</button></div><p className="lesson-disclaimer">這裡的 HIGH／LOW 僅供獨立測試接線；交替順序需到程式練習自行完成。只做離散教學規則，不計算真實電流。</p></aside>;
}
