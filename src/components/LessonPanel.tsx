import DualLessonPanel from './DualLessonPanel';
import ButtonControl,{type ButtonControlProps} from './ButtonControl';
import {useWiki} from '../wiki/WikiProvider';
import {topicArticles} from '../wiki/articles';
import { BookOpen, CheckCircle2, Trash2, Lightbulb, TriangleAlert, ArrowRight } from 'lucide-react';
import type { CircuitAction, CircuitAnalysis, CircuitState } from '../circuit';
interface Props {buttonControl?:ButtonControlProps;state:CircuitState;analysis:CircuitAnalysis;dispatch:(action:CircuitAction)=>void}
export default function LessonPanel({buttonControl,state,analysis,dispatch}:Props) {
  const openWiki=useWiki();
  if(state.lessonId==='dual-led')return <DualLessonPanel state={state} analysis={analysis} dispatch={dispatch}/>;
  return <aside className="inspector lesson-inspector" aria-label="LED 教學與輸出控制">
    <p className="lesson-index"><span>01</span> / 外接 LED</p>
    <h2>{buttonControl?'接好 LED 與按鈕':'完成第一個電路'}</h2><p className="lesson-intro">依照步驟接線，再用 HIGH／LOW 控制亮滅。</p>
    <button type="button" className="wiki-link lesson-wiki-link" onClick={event=>openWiki(buttonControl?topicArticles.button:topicArticles.led,event.currentTarget)}><BookOpen size={14}/>了解接線原理</button>
    <div className="circuit-flow" aria-label="GPIO23 經 220 歐姆電阻、LED 連接 GND"><span>GPIO23</span><ArrowRight size={14}/><span>220 Ω</span><ArrowRight size={14}/><Lightbulb size={23}/><ArrowRight size={14}/><span>GND</span></div>
    <ol className="lesson-steps"><li><span>將 GPIO23 連到電阻的 <strong>A 端</strong>。</span></li><li><span>將電阻 <strong>B 端</strong>連到 LED <strong>正極 A+</strong>。</span></li><li><span>將 LED <strong>負極 K−</strong>連到任一 <strong>GND</strong>。</span></li></ol>
    {buttonControl?<ol className="lesson-steps button-wiring-steps"><li><span>GPIO18（J3-09）接按鈕 <strong>A1 或 A2</strong>。</span></li><li><span>按鈕 <strong>B1 或 B2</strong>接任一 GND；不可兩條都接同側。</span></li></ol>:null}
    <div className={`circuit-feedback ${analysis.valid?'valid':analysis.code==='empty'?'empty':'invalid'}`} aria-live="polite" aria-atomic="true" data-circuit-code={analysis.code}>
      {analysis.valid?<CheckCircle2 size={21}/>:analysis.code==='empty'?<Lightbulb size={21}/>:<TriangleAlert size={21}/>}
      <div><h3>{analysis.title}</h3><p>{analysis.description}</p></div>
    </div>
    <section className="output-control" aria-label="GPIO23 輸出控制"><div className="output-heading"><h3>GPIO23 輸出控制</h3><span>OUTPUT</span></div>
      <div className="level-switch" role="group" aria-label="輸出電位"><button aria-pressed={state.level==='HIGH'} onClick={()=>dispatch({type:'level',level:'HIGH'})}>HIGH <span>高電位</span></button><button aria-pressed={state.level==='LOW'} onClick={()=>dispatch({type:'level',level:'LOW'})}>LOW <span>低電位</span></button></div>
      <div className="led-status" data-led-lit={String(analysis.lit)}><span><Lightbulb size={17}/>LED 狀態</span><strong className={analysis.lit?'lit':''}><i/>{analysis.lit?'亮起':'熄滅'}</strong></div>
    </section>
    <div className="lesson-actions"><button aria-pressed={state.exampleBackup!==null} onClick={()=>dispatch({type:'example'})}><BookOpen size={16}/>{state.exampleBackup!==null?'隱藏接線範例':'顯示接線範例'}</button><button onClick={()=>dispatch({type:'clear'})} disabled={!state.wires.length&&!state.pending&&state.level==='LOW'}><Trash2 size={15}/>清空接線</button></div>
    {buttonControl?<ButtonControl {...buttonControl}/>:null}
    <p className="lesson-disclaimer">固定 GPIO23、220 Ω 與單顆 LED 的離散教學規則；不執行 Arduino 程式，也不計算真實電流。重新整理頁面會清空接線。</p>
  </aside>;
}
