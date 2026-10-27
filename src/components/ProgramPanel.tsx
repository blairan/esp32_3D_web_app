import {useWiki} from '../wiki/WikiProvider';
import {topicArticles} from '../wiki/articles';
import { useRef,lazy,Suspense } from 'react';
import { Play, Pause, Square, RotateCcw, FileCode2, CheckCircle2, TriangleAlert, Lightbulb, BookOpen } from 'lucide-react';
import type {ProgramEditorHandle} from './ProgramEditor';
const ProgramEditor=lazy(()=>import('./ProgramEditor'));
import type { ProgramState } from '../program/runtime';
import type { CircuitAnalysis } from '../circuit';
interface Props {
  source:string;state:ProgramState;analysis:CircuitAnalysis;
  onChange:(source:string)=>void;onStart:()=>void;onPause:()=>void;onResume:()=>void;onStop:()=>void;onReset:()=>void;onScaffold:()=>void;onWiringExample:()=>void;
}
const statusLabels={idle:'尚未執行',starting:'準備中',running:'執行中',paused:'已暫停',stopped:'已停止',error:'需要修正'};
export default function ProgramPanel({source,state,analysis,onChange,onStart,onPause,onResume,onStop,onReset,onScaffold,onWiringExample}:Props){
  const openWiki=useWiki();
  const editor=useRef<ProgramEditorHandle>(null);
  const active=['starting','running','paused'].includes(state.status);
  const jumpToError=()=>{
    if(!state.diagnostic||!editor.current)return;
    editor.current.jump(state.diagnostic.line,state.diagnostic.column);
  };
  return <aside className="inspector program-panel" aria-label="Arduino 程式編輯與執行">
    <div className="program-title"><div><h2><FileCode2 size={20}/>Arduino 程式練習</h2><p>限定語法 · 只控制本課 GPIO23</p></div><button disabled={active} onClick={()=>{if(window.confirm('要清除目前程式，重新建立 setup / loop 架構嗎？'))onScaffold();}}>重建架構</button></div>
    <Suspense fallback={<p>正在載入程式編輯器…</p>}><ProgramEditor ref={editor} source={source} readOnly={active} line={state.line} error={state.status==='error'} onChange={onChange}/></Suspense>
    <div className="practice-goal"><div className="practice-heading"><strong>練習目標</strong><button type="button" className="wiki-link" onClick={event=>openWiki(topicArticles.structure,event.currentTarget)}><BookOpen size={14}/>查看教學 Wiki</button></div><p>在 setup 設定 GPIO23 輸出，在 loop 讓 LED 亮、等待、熄滅、再等待。請自己完成程式。</p><details><summary>需要一點提示？</summary><p>先宣告接腳變數；設定模式用 pinMode，改變電位用 digitalWrite，等待用 delay。loop 至少要有一次大於 0 的等待。</p></details></div>
    <div className="program-toolbar"><button className="run-button" onClick={state.status==='paused'?onResume:onStart} disabled={state.status==='running'||state.status==='starting'}><Play size={15}/>{state.status==='paused'?'繼續':'執行'}</button><button onClick={onPause} disabled={state.status!=='running'}><Pause size={15}/>暫停</button><button onClick={onStop} disabled={!active}><Square size={13}/>停止</button><button onClick={onReset}><RotateCcw size={15}/>重設</button></div>
    <p id="program-help" className="program-help">{active?'執行或暫停時鎖定編輯；停止後可修改。':'輸入名稱自動顯示建議；Ctrl＋Space 開啟補全，Enter 接受、Tab 跳參數、Esc 關閉。'}</p>
    <div className="runtime-summary"><span className={`run-status status-${state.status}`} aria-live="polite" data-run-status={state.status}>{statusLabels[state.status]}</span><span>虛擬時間 <strong data-virtual-time={state.timeMs}>{state.timeMs.toLocaleString()} ms</strong></span></div>
    <div className="gpio-readout"><span>GPIO23 <strong data-pin-mode={state.outputEnabled?'OUTPUT':'INPUT'}>{state.outputEnabled?'OUTPUT':'INPUT'}</strong> <b data-pin-level={state.level}>{state.level}</b></span><span className={`code-led${analysis.lit?' lit':''}`} data-led-lit={String(analysis.lit)}><Lightbulb size={17}/>{analysis.lit?'LED 亮起':'LED 熄滅'}</span></div>
    {state.diagnostic?<div className="program-error" role="alert"><TriangleAlert size={18}/><div><strong>第 {state.diagnostic.line} 行，第 {state.diagnostic.column} 欄</strong><p>{state.diagnostic.message}</p><button onClick={jumpToError}>跳至錯誤位置</button></div></div>:null}
    <div className={`program-wiring ${analysis.valid?'valid':''}`} data-circuit-code={analysis.code}>{analysis.valid?<CheckCircle2 size={19}/>:<TriangleAlert size={19}/>}<div><strong>{analysis.valid?'接線正確':analysis.title}</strong><p>{analysis.valid?'LED 跟隨程式輸出；暫停保留狀態，停止會熄燈。':analysis.description}</p></div><button onClick={onWiringExample}><BookOpen size={14}/>載入接線範例</button></div>
    <details className="program-syntax"><summary>支援語法與限制</summary><p><code>int name = 23;</code>、<code>void setup()</code>、<code>void loop()</code>、<code>pinMode(pin, OUTPUT)</code>、<code>digitalWrite(pin, HIGH/LOW)</code>、<code>delay(ms)</code>。參數可使用整數常值或已宣告變數，支援 // 與 /* */ 註解。</p><p>不支援算式、變數重新賦值、for/while、自訂函式、函式庫、Serial、PWM 或網路。程式上限 12,000 字元、400 行；delay 上限 60,000 ms，loop 需有正值 delay。</p></details>
    <details className="program-trace"><summary>訊號紀錄（最近 {state.trace.length} 筆）</summary>{state.trace.length?<ol>{[...state.trace].reverse().map((entry,index)=><li key={`${entry.timeMs}-${entry.line}-${index}`}><span>{entry.timeMs.toLocaleString()} ms</span><strong>{entry.level}</strong><span>第 {entry.line} 行</span></li>)}</ol>:<p>執行後會顯示每次 digitalWrite 的虛擬時間。</p>}</details>
    <p className="program-disclaimer">白名單教學模擬，不編譯任意 C/C++。離開此分頁會停止；重新整理會還原基本架構並清空接線。</p>
  </aside>;
}
