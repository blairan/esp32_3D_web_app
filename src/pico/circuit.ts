import {picoPins,picoPinById} from './board.ts';
import {hasPicoButton,hasPicoADC,hasPicoDigitalInput,type PicoLessonId} from './types.ts';
import type {CircuitWire} from '../circuit.ts';
export const picoParts={'p-res:a':'220 Ω 電阻 A','p-res:b':'220 Ω 電阻 B','p-led:a':'LED 正極 A+','p-led:k':'LED 負極 K−','p-button:a1':'按鈕 A1','p-button:a2':'按鈕 A2','p-button:b1':'按鈕 B1','p-button:b2':'按鈕 B2','p-pot:vcc':'電位器 VCC（3.3V）','p-pot:w':'電位器 W（滑動端）','p-pot:gnd':'電位器 GND','p-ldr:a':'光敏電阻 A','p-ldr:b':'光敏電阻 B','p-divider:a':'10kΩ 分壓電阻 A','p-divider:b':'10kΩ 分壓電阻 B','p-pir:vcc':'PIR VCC（5V）','p-pir:out':'PIR OUT（3.3V）','p-pir:gnd':'PIR GND'};
export function partsFor(id:PicoLessonId):Record<string,string>{return id==='blink'?{}:Object.fromEntries(Object.entries(picoParts).filter(([key])=>(!key.startsWith('p-button:')||hasPicoButton(id))&&(!key.startsWith('p-pir:')||id==='pir-led')&&(!key.startsWith('p-pot:')||id==='pot-dimming')&&(!key.startsWith('p-ldr:')&&!key.startsWith('p-divider:')||id==='ldr-nightlight')));}
export function picoTerminalLabel(key:string){const p=picoPinById.get(key);return p?`${p.silkscreen}（實體${p.position}）`:picoParts[key as keyof typeof picoParts]??key;}
export function picoExamples(id:PicoLessonId):CircuitWire[]{if(id==='blink')return [];return [['pico:20','p-res:a'],['p-res:b','p-led:a'],['p-led:k','pico:18'],...(hasPicoButton(id)?[['pico:19','p-button:a1'],['p-button:b1','pico:3']]:id==='pot-dimming'?[['pico:36','p-pot:vcc'],['p-pot:w','pico:31'],['p-pot:gnd','pico:3']]:id==='ldr-nightlight'?[['pico:36','p-ldr:a'],['p-ldr:b','pico:31'],['pico:31','p-divider:a'],['p-divider:b','pico:3']]:id==='pir-led'?[['pico:40','p-pir:vcc'],['p-pir:out','pico:19'],['p-pir:gnd','pico:3']]:[])].map(([from,to],i)=>({id:`pico-example-${i}`,from,to}));}
export interface PicoAnalysis {valid:boolean;ledValid:boolean;buttonValid:boolean;potValid?:boolean;lightValid?:boolean;pirValid?:boolean;lit:boolean;input:0|1|null;message:string;flowWires:string[];flowDirections?:Record<string,boolean>}
export function analyzePicoCircuit(wires:CircuitWire[],id:PicoLessonId,level=false,pressed=false,motion=false):PicoAnalysis {
 if(id==='blink')return {valid:true,ledValid:true,buttonValid:true,lit:level,input:null,message:'板載 LED 不需外接線。',flowWires:[]};
 const parts=partsFor(id),allowed=new Set([...picoPins.map(p=>p.pinId),...Object.keys(parts)]),parent=new Map<string,string>();
 const root=(x:string):string=>{if(!parent.has(x))parent.set(x,x);const p=parent.get(x)!;if(p!==x)parent.set(x,root(p));return parent.get(x)!;};
 const join=(a:string,b:string)=>parent.set(root(a),root(b));
 const grounds=picoPins.filter(p=>p.role==='ground').map(p=>p.pinId);grounds.forEach(g=>join(g,grounds[0]));
 if(hasPicoButton(id)){join('p-button:a1','p-button:a2');join('p-button:b1','p-button:b2');}
 const bad=(message:string):PicoAnalysis=>({valid:false,ledValid:false,buttonValid:false,lit:false,input:null,message,flowWires:[]});
 const pairs=new Set<string>();
 for(const w of wires){const pair=[w.from,w.to].sort().join('|');if(!allowed.has(w.from)||!allowed.has(w.to)||w.from===w.to||pairs.has(pair))return bad('接線包含未知端點、自連或重複導線。');pairs.add(pair);
  for(const t of [w.from,w.to]){const p=picoPinById.get(t);if(p&&p.role!=='ground'&&t!=='pico:20'&&!(hasPicoDigitalInput(id)&&t==='pico:19')&&!(id==='pir-led'&&t==='pico:40')&&!(hasPicoADC(id)&&['pico:31','pico:36'].includes(t)))return bad('本課只使用 GP15（實體20）'+(hasPicoDigitalInput(id)?'、GP14 輸入（實體19）':'')+(id==='pir-led'?'、VBUS（實體40）只供PIR的VCC，GPIO訊號仍為3.3V':'')+(hasPicoADC(id)?'、GP26（實體31）、3V3(OUT)（實體36）':'')+'與 GND；不可將5V接入GPIO或改接其他腳。');}
  join(w.from,w.to);
 }
 const s=root('pico:20'),g=root(grounds[0]),a=root('p-res:a'),b=root('p-res:b'),anode=root('p-led:a'),cathode=root('p-led:k');
 if(s===g)return bad('GP15 與 GND 短路，請先移除直接接地的導線。');
 if(hasPicoADC(id)&&(root('pico:36')===g||root('pico:36')===s))return bad('3V3供電與GND／GP15直接短接，請先移除短路。');
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
 if(hasPicoButton(id)){
  const button=root('pico:19'),sideA=root('p-button:a1'),sideB=root('p-button:b1');
  buttonValid=sideA!==sideB&&button!==g&&button!==s&&button!==anode&&button!==cathode&&((sideA===button&&sideB===g)||(sideB===button&&sideA===g));
  if(buttonValid)input=pressed?0:1;
  buttonMessage=button===g||sideA===sideB?'按鈕接在同側或輸入已短接 GND；A1/A2 同組，B1/B2 同組，請跨 A／B 兩側。':'按鈕路徑未完成：GP14 接按鈕一側，另一側接 GND，程式使用 Pin.PULL_UP。';
 }
 let potValid=true,potMessage='';
 if(id==='pot-dimming'){
  const supply=root('pico:36'),signal=root('pico:31'),high=root('p-pot:vcc'),low=root('p-pot:gnd'),wiper=root('p-pot:w');
  const ledNets=new Set([s,g,a,b,anode,cathode]);potValid=high===supply&&low===g&&wiper===signal&&signal!==supply&&!ledNets.has(signal)&&!ledNets.has(supply);
  potMessage=signal===g||signal===supply?'電位器W／GP26不可直接短接GND或3V3，請將滑動端W單獨接到GP26。':high===g&&low===supply?'本課約定VCC接3V3、GND接GND；交換兩端會反轉旋鈕方向，請依標示接線。':'電位器未正確接線：VCC→3V3(OUT)、W→GP26（實體31）、GND→GND。';
 }
 let lightValid=true,lightMessage='';
 if(id==='ldr-nightlight'){
  const supply=root('pico:36'),signal=root('pico:31');
  const spans=(prefix:string,from:string,to:string)=>{const x=root(prefix+':a'),y=root(prefix+':b');return x!==y&&(x===from&&y===to||x===to&&y===from);};
  const ledNets=new Set([s,g,a,b,anode,cathode]);
  lightValid=spans('p-ldr',supply,signal)&&spans('p-divider',signal,g)&&signal!==supply&&!ledNets.has(signal)&&!ledNets.has(supply);
  lightMessage=signal===g||signal===supply?'GP26不可直接短接GND或3V3，需接在LDR與10kΩ電阻之間。':'光敏分壓未完成：3V3(OUT) → LDR → GP26（實體31）→ 10kΩ → GND；LED另用220Ω限流。';
 }
 let pirValid=true,pirMessage='';
 if(id==='pir-led'){
  const supply=root('pico:40'),signal=root('pico:19'),vcc=root('p-pir:vcc'),out=root('p-pir:out'),ground=root('p-pir:gnd');
  const ledNets=new Set([s,g,a,b,anode,cathode]);
  pirValid=vcc===supply&&ground===g&&out===signal&&signal!==supply&&!ledNets.has(signal)&&!ledNets.has(supply);
  if(pirValid)input=motion?1:0;
  pirMessage=supply===signal||ledNets.has(supply)?'VBUS 5V只能接PIR VCC，不可直接接GND、GP14或LED／GPIO支路。':'PIR接線未完成：VCC→VBUS（USB 5V，實體40）、OUT（3.3V）→GP14（實體19）、GND→GND。';
 }
 // Find the directed validated source→resistor→LED→GND path, independent
 // of the order in which the learner clicked each end of a wire.
 const edges=new Map<string,{to:string;id?:string;forward?:boolean}[]>();
 const edge=(from:string,to:string,id?:string,forward?:boolean)=>edges.set(from,[...(edges.get(from)??[]),{to,id,forward}]);
 wires.forEach(w=>{edge(w.from,w.to,w.id,true);edge(w.to,w.from,w.id,false);});edge('p-res:a','p-res:b');edge('p-res:b','p-res:a');edge('p-led:a','p-led:k');
 const queue=['pico:20'],seen=new Set(queue),previous=new Map<string,{from:string;id?:string;forward?:boolean}>();let target:string|undefined;
 while(ledValid&&queue.length){const n=queue.shift()!;if(grounds.includes(n)){target=n;break;}for(const e of edges.get(n)??[]){if(!seen.has(e.to)){seen.add(e.to);previous.set(e.to,{from:n,id:e.id,forward:e.forward});queue.push(e.to);}}}
 const flowWires:string[]=[],flowDirections:Record<string,boolean>=Object.create(null);while(target&&target!=='pico:20'){const e=previous.get(target)!;if(e.id){flowWires.unshift(e.id);flowDirections[e.id]=e.forward!;}target=e.from;}
 return {valid:ledValid&&buttonValid&&potValid&&lightValid&&pirValid,ledValid,buttonValid,potValid,lightValid,pirValid,lit:ledValid&&potValid&&lightValid&&pirValid&&level,input,message:!ledValid?ledMessage:!buttonValid?buttonMessage:!potValid?potMessage:!lightValid?lightMessage:!pirValid?pirMessage:'接線正確。'+(hasPicoButton(id)?'按下讀0，放開讀1；理想按鈕，不含機械彈跳模擬。':'電阻可放在LED之前或之後。'),flowWires,flowDirections};
}
