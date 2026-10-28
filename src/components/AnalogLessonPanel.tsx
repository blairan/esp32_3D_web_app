import {BookOpen,Trash2} from 'lucide-react';
import type {CircuitState,CircuitAnalysis,CircuitAction} from '../circuit';
import {analyzePot} from '../circuit';
import {useWiki} from '../wiki/WikiProvider';
import RgbStatus from './RgbStatus';
import PotControl from './PotControl';
export default function AnalogLessonPanel({state,analysis,dispatch}:{state:CircuitState;analysis:CircuitAnalysis;dispatch:(action:CircuitAction)=>void}){
 const rgb=state.lessonId==='rgb-mixing',wiki=useWiki();return <aside className="inspector lesson-inspector"><p className="lesson-index"><span>{rgb?'09':'10'}</span> / {rgb?'RGB 混色':'電位器調光'}</p><h2>{rgb?'讓三種光，混出新顏色。':'轉動旋鈕，讀取再調光。'}</h2><p className="lesson-intro">{rgb?'紅 GPIO23、綠 GPIO22、藍 GPIO21，各經一顆 220 Ω 接 RGB 的 R／G／B；共陰極 K 接 GND。':'電位器 VCC 接 3V3、W 接 GPIO34（J2-05）、GND 接 GND；LED 沿用 GPIO23 → 220 Ω → LED → GND。'}</p><button className="wiki-link" onClick={e=>wiki(rgb?'rgb-mixing':'pot-dimming',e.currentTarget)}><BookOpen size={16}/>了解接線與原理</button>{rgb?<RgbStatus analysis={analysis} values={state.rgb} dispatch={dispatch}/>:<><PotControl position={state.pot} input={analyzePot(state.wires,state.pot)} onChange={value=>dispatch({type:'pot',value})}/><p>此頁只檢查接線與輸入；調光程式請到「程式練習」完成。</p></>}<p>{analysis.title}：{analysis.description}</p><div className="lesson-actions"><button aria-pressed={state.exampleBackup!==null} onClick={()=>dispatch({type:'example'})}>{state.exampleBackup!==null?'隱藏接線範例':'顯示接線範例'}</button><button onClick={()=>dispatch({type:'clear'})}><Trash2 size={16}/>清空接線</button></div></aside>;
}
