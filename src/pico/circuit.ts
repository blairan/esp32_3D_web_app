import {picoPins,picoPinById} from './board.ts';
import type {PicoLessonId} from './types.ts';
import type {CircuitWire} from '../circuit.ts';
export const picoParts={'p-res:a':'220 Ω 電阻 A','p-res:b':'220 Ω 電阻 B','p-led:a':'LED 正極 A+','p-led:k':'LED 負極 K−','p-button:a1':'按鈕 A1','p-button:a2':'按鈕 A2','p-button:b1':'按鈕 B1','p-button:b2':'按鈕 B2'};
export function partsFor(id:PicoLessonId):Record<string,string>{return id==='blink'?{}:Object.fromEntries(Object.entries(picoParts).filter(([key])=>id==='button-led'||!key.startsWith('p-button:')));}
export function picoTerminalLabel(key:string){const p=picoPinById.get(key);return p?`${p.silkscreen}（實體${p.position}）`:picoParts[key as keyof typeof picoParts]??key;}
export function picoExamples(id:PicoLessonId):CircuitWire[]{if(id==='blink')return [];return [['pico:20','p-res:a'],['p-res:b','p-led:a'],['p-led:k','pico:18'],...(id==='button-led'?[['pico:19','p-button:a1'],['p-button:b1','pico:3']]:[])].map(([from,to],i)=>({id:`pico-example-${i}`,from,to}));}
export interface PicoAnalysis {valid:boolean;ledValid:boolean;buttonValid:boolean;lit:boolean;input:0|1|null;message:string;flowWires:string[];flowDirections?:Record<string,boolean>}
export function analyzePicoCircuit(wires:CircuitWire[],id:PicoLessonId,level=false,pressed=false):PicoAnalysis {
 if(id==='blink')return {valid:true,ledValid:true,buttonValid:true,lit:level,input:null,message:'板載 LED 不需外接線。',flowWires:[]};
 const parts=partsFor(id),allowed=new Set([...picoPins.map(p=>p.pinId),...Object.keys(parts)]),parent=new Map<string,string>();
 const root=(x:string):string=>{if(!parent.has(x))parent.set(x,x);const p=parent.get(x)!;if(p!==x)parent.set(x,root(p));return parent.get(x)!;};
 const join=(a:string,b:string)=>parent.set(root(a),root(b));
 const grounds=picoPins.filter(p=>p.role==='ground').map(p=>p.pinId);grounds.forEach(g=>join(g,grounds[0]));
 if(id==='button-led'){join('p-button:a1','p-button:a2');join('p-button:b1','p-button:b2');}
 const bad=(message:string):PicoAnalysis=>({valid:false,ledValid:false,buttonValid:false,lit:false,input:null,message,flowWires:[]});
 const pairs=new Set<string>();
 for(const w of wires){const pair=[w.from,w.to].sort().join('|');if(!allowed.has(w.from)||!allowed.has(w.to)||w.from===w.to||pairs.has(pair))return bad('接線包含未知端點、自連或重複導線。');pairs.add(pair);
  for(const t of [w.from,w.to]){const p=picoPinById.get(t);if(p&&p.role!=='ground'&&t!=='pico:20'&&!(id==='button-led'&&t==='pico:19'))return bad('本課只使用 GP15（實體20）'+(id==='button-led'?'、GP14 按鈕輸入（實體19）':'')+'與 GND；不可改接電源或其他 GPIO。');}
  join(w.from,w.to);
 }
 const s=root('pico:20'),g=root(grounds[0]),a=root('p-res:a'),b=root('p-res:b'),anode=root('p-led:a'),cathode=root('p-led:k');
 if(s===g)return bad('GP15 與 GND 短路，請先移除直接接地的導線。');
 const resistor=(from:string,to:string)=>(a===from&&b===to||b===from&&a===to)&&a!==b;
 const before=resistor(s,anode)&&cathode===g&&new Set([s,anode,g]).size===3;
 const after=anode===s&&resistor(cathode,g)&&new Set([s,cathode,g]).size===3;
 const ledValid=before||after;
 let ledMessage='LED 路徑未完成：GP15 → 220 Ω → LED A+／K− → GND。';
 if(a===b)ledMessage='電阻兩端被導線旁路，無法提供限流，請移除短接。';
 else if(anode===s&&cathode===g)ledMessage='缺少串聯限流電阻，不可直接將 LED 接在 GP15 與 GND。';
 else if(anode===g||cathode===s)ledMessage='LED 極性反接：A+ 朝 GP15，K− 朝 GND，中間串聯220 Ω。';
 else if(anode===cathode)ledMessage='LED 兩端短接，請分開正負極的接線。';
 let buttonValid=true,input:0|1|null=null,buttonMessage='';
 if(id==='button-led'){
  const button=root('pico:19'),sideA=root('p-button:a1'),sideB=root('p-button:b1');
  buttonValid=sideA!==sideB&&button!==g&&button!==s&&button!==anode&&button!==cathode&&((sideA===button&&sideB===g)||(sideB===button&&sideA===g));
  if(buttonValid)input=pressed?0:1;
  buttonMessage=button===g||sideA===sideB?'按鈕接在同側或輸入已短接 GND；A1/A2 同組，B1/B2 同組，請跨 A／B 兩側。':'按鈕路徑未完成：GP14 接按鈕一側，另一側接 GND，程式使用 Pin.PULL_UP。';
 }
 // Find the directed validated source→resistor→LED→GND path, independent
 // of the order in which the learner clicked each end of a wire.
 const edges=new Map<string,{to:string;id?:string;forward?:boolean}[]>();
 const edge=(from:string,to:string,id?:string,forward?:boolean)=>edges.set(from,[...(edges.get(from)??[]),{to,id,forward}]);
 wires.forEach(w=>{edge(w.from,w.to,w.id,true);edge(w.to,w.from,w.id,false);});edge('p-res:a','p-res:b');edge('p-res:b','p-res:a');edge('p-led:a','p-led:k');
 const queue=['pico:20'],seen=new Set(queue),previous=new Map<string,{from:string;id?:string;forward?:boolean}>();let target:string|undefined;
 while(ledValid&&queue.length){const n=queue.shift()!;if(grounds.includes(n)){target=n;break;}for(const e of edges.get(n)??[]){if(!seen.has(e.to)){seen.add(e.to);previous.set(e.to,{from:n,id:e.id,forward:e.forward});queue.push(e.to);}}}
 const flowWires:string[]=[],flowDirections:Record<string,boolean>=Object.create(null);while(target&&target!=='pico:20'){const e=previous.get(target)!;if(e.id){flowWires.unshift(e.id);flowDirections[e.id]=e.forward!;}target=e.from;}
 return {valid:ledValid&&buttonValid,ledValid,buttonValid,lit:ledValid&&level,input,message:!ledValid?ledMessage:!buttonValid?buttonMessage:'接線正確。'+(id==='button-led'?'按下讀0，放開讀1；理想按鈕，不含機械彈跳模擬。':'電阻可放在LED之前或之後。'),flowWires,flowDirections};
}
