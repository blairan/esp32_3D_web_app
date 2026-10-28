import type {CircuitAnalysis,CircuitState,CircuitAction} from '../circuit';
import type {ProgramState} from '../program/runtime';
export default function DualOutputs({analysis,program,manual,dispatch}:{analysis:CircuitAnalysis;program?:ProgramState;manual?:CircuitState;dispatch?:(action:CircuitAction)=>void}){
 return <div className={`dual-outputs${analysis.channels?.length===3?' traffic-outputs':''}`} aria-label="LED 獨立輸出">{analysis.channels?.map((channel,index)=>{const level=manual?([manual.level,manual.level2,manual.level3][index]):program?.outputs[channel.gpio]?.level??'LOW';const enabled=manual?true:program?.outputs[channel.gpio]?.enabled??false;return <section key={channel.gpio} className="dual-channel" data-channel-code={channel.code} data-channel-gpio={channel.gpio} data-channel-lit={String(channel.lit)} data-channel-level={level}>
 <div className="dual-channel-heading"><strong><i className={`channel-dot channel-${index+1}${channel.lit?' lit':''}`}/>{channel.label} · GPIO{channel.gpio}</strong><span>{enabled?'OUTPUT':'INPUT'} · {level}</span></div>
 {manual&&dispatch?<div className="level-switch" role="group" aria-label={`GPIO${channel.gpio} 輸出電位`}><button aria-pressed={level==='HIGH'} onClick={()=>dispatch({type:'level',gpio:channel.gpio as 23|22|21,level:'HIGH'})}>HIGH <span>高電位</span></button><button aria-pressed={level==='LOW'} onClick={()=>dispatch({type:'level',gpio:channel.gpio as 23|22|21,level:'LOW'})}>LOW <span>低電位</span></button></div>:null}
 <p>{channel.valid?(channel.lit?'接線正確 · LED 亮起':'接線正確 · LED 熄滅'):channel.title+'：'+channel.description}</p>
 </section>;})}</div>;
}
