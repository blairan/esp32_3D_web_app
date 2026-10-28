import {boards,unoPin} from '../boards/registry.ts';
import {unoLesson,lessonPins} from '../boards/lessonProfiles.ts';
import type {LessonId} from '../lessons.ts';
import type {CircuitWire,CircuitAnalysis,CurrentSegment,ChannelAnalysis} from '../circuit.ts';
const pins=new Map(boards['uno-r3'].pins.map(p=>[p.pinId,p]));
export function unoExamples(id:LessonId):CircuitWire[]{
 const pairs:[string,string][]=[];const p=lessonPins('uno-r3',id);const add=(a:string,b:string)=>pairs.push([a,b]);
 const display=id==='oled-i2c'||id==='seven-counter',servo=id==='servo-angle',buzzer=id==='buzzer-doorbell';
 const count=id==='dual-led'?2:id==='traffic-light'||id==='rgb-mixing'?3:1;
 if(!display&&!servo&&!buzzer)for(let i=0;i<count;i++){const suffix=i?String(i+1):'',source=unoPin([10,9,6][i]);add(source,'resistor'+suffix+':a');add('resistor'+suffix+':b',id==='rgb-mixing'?['rgb:r','rgb:g','rgb:b'][i]:'led'+suffix+':a');if(id!=='rgb-mixing')add('led'+suffix+':k','uno:GND1');}if(id==='rgb-mixing')add('rgb:k','uno:GND1');
 if(p.button){add('uno:D2','button:a1');add('button:b1','uno:GND2');}
 if(buzzer){add('uno:D10','buzzer:s');add('uno:5V','buzzer:vcc');add('buzzer:gnd','uno:GND1');}
 if(id==='pot-dimming'){add('uno:5V','pot:vcc');add('uno:A0','pot:w');add('pot:gnd','uno:GND2');}
 if(id==='ldr-nightlight'){add('uno:5V','ldr:a');add('ldr:b','uno:A0');add('uno:A0','divider:a');add('divider:b','uno:GND2');}
 if(servo||id==='ultrasonic-alert'||id==='pir-delay'){const prefix=servo?'servo':id==='pir-delay'?'pir':'ultra';add('supply:plus',prefix+':vcc');add(prefix+':gnd','supply:minus');add('supply:minus','uno:GND2');if(servo)add('uno:D9','servo:s');else if(id==='pir-delay')add('pir:out','uno:D2');else {add('uno:D7','ultra:trig');add('ultra:echo','uno:D8');}}
 if(id==='climate-dht'||id==='environment-lab'){add('uno:5V','dht:vcc');add('uno:D4','dht:data');add('dht:gnd','uno:GND2');}
 if(display||id==='environment-lab'){add('uno:5V','oled:vcc');add('oled:gnd','uno:GND3');add(unoPin(id==='seven-counter'?8:18),'oled:sda');add(unoPin(id==='seven-counter'?7:19),'oled:scl');}
 return pairs.map(([from,to],i)=>({id:'example-'+(i+1),from,to}));
}
export function unoLabel(id:string,lesson:LessonId){return pins.get(id)?.silkscreen??unoLesson(lesson).parts[id]??'未知端點';}
function graph(wires:CircuitWire[],pressed=false){const parent=new Map<string,string>();const root=(id:string):string=>{if(!parent.has(id))parent.set(id,id);let p=id;while(parent.get(p)!==p)p=parent.get(p)!;return p;};const union=(a:string,b:string)=>parent.set(root(a),root(b));for(const p of pins.values()){if(p.role==='ground')union(p.pinId,'uno:GND1');if(p.gpio!==null)union(p.pinId,unoPin(p.gpio));}union('button:a1','button:a2');union('button:b1','button:b2');if(pressed)union('button:a1','button:b1');wires.forEach(w=>union(w.from,w.to));return (a:string,b:string)=>root(a)===root(b);}
export function unoInput(wires:CircuitWire[],id:LessonId,pressed:boolean):'HIGH'|'LOW'|null{
 const p=lessonPins('uno-r3',id);if(p.input===null)return 'HIGH';const analysis=unoAnalyze(wires,id,[]);if(!analysis.valid)return null;if(!p.button)return pressed?'HIGH':'LOW';return graph(wires,pressed)(unoPin(p.input),'uno:GND1')?'LOW':'HIGH';
}
export function unoAnalyze(wires:CircuitWire[],id:LessonId,levels:('HIGH'|'LOW')[]):CircuitAnalysis{
 const lesson=unoLesson(id),profile=lessonPins('uno-r3',id),same=graph(wires),grounds=['uno:GND1','uno:GND2','uno:GND3'];
 const fail=(code:CircuitAnalysis['code'],description:string):CircuitAnalysis=>({valid:false,lit:false,code,title:'檢查 UNO 接線',description});
 if(!wires.length)return fail('empty','先選兩個端點接線，或顯示本課接線範例。');
 if(wires.length>12)return fail('invalid','最多支援12條導線。');
 const allowed=new Set([...Object.keys(lesson.parts),...grounds,...profile.outputs.map(unoPin),...(profile.input===null?[]:[unoPin(profile.input)]),'uno:5V']);
 // SDA/SCL duplicate header locations share their electrical net with A4/A5.
 if(profile.outputs.includes(18))allowed.add('uno:SDA');if(profile.outputs.includes(19))allowed.add('uno:SCL');
 const seen=new Set<string>();for(const w of wires){const key=[w.from,w.to].sort().join('|');if(w.from===w.to||seen.has(key))return fail('invalid','端點不能自連或重複接線。');seen.add(key);if(!allowed.has(w.from)||!allowed.has(w.to))return fail('unsupported','只可使用本課指定接腳與元件；5V、3V3、VIN 與 IOREF 不能互換。');}
 const signalTargets:Record<string,string[]>={'pot:w':['uno:A0'],'buzzer:s':['uno:D10'],'servo:s':['uno:D9'],'ultra:trig':['uno:D7'],'ultra:echo':['uno:D8'],'pir:out':['uno:D2'],'dht:data':['uno:D4'],'oled:sda':id==='seven-counter'?['uno:D8']:['uno:A4','uno:SDA'],'oled:scl':id==='seven-counter'?['uno:D7']:['uno:A5','uno:SCL']};
 const external=id==='servo-angle'?'servo':id==='ultrasonic-alert'?'ultra':id==='pir-delay'?'pir':null;
 const vcc=Object.keys(lesson.parts).filter(p=>p.endsWith(':vcc')),gnd=Object.keys(lesson.parts).filter(p=>p.endsWith(':gnd'));
 for(const wire of wires)for(const [port,other] of [[wire.from,wire.to],[wire.to,wire.from]]){
  if(signalTargets[port]&&!signalTargets[port].includes(other))return fail('unsupported','模組訊號僅可連到指定接腳，不可跨接元件支路。');
  if(port.endsWith(':vcc')&&!(external&&port===external+':vcc'?other==='supply:plus':other==='uno:5V'||vcc.includes(other)&&other!==external+':vcc'))return fail('unsupported','模組VCC只連本課指定5V供電，不可跨接訊號或LED。');
  if(port.endsWith(':gnd')&&!grounds.includes(other)&&!gnd.includes(other)&&other!=='supply:minus')return fail('unsupported','模組GND只連接地，不可跨接訊號或LED。');
 }
 const domains=[...new Set([...profile.outputs,...(profile.input!==null?[profile.input]:[])])].map(unoPin).concat(['uno:5V','uno:GND1','supply:plus']);
 for(let i=0;i<domains.length;i++)for(let j=i+1;j<domains.length;j++)if(same(domains[i],domains[j]))return fail('short','供電、接地與各訊號不可直接短接。');
 const connected=(a:string,b:string)=>same(a,b),need=(a:string,b:string)=>{if(!connected(a,b))throw new Error(`${unoLabel(a,id)} → ${unoLabel(b,id)} 尚未接通。`);};
 try{
  if(profile.button){const up=graph(wires),down=graph(wires,true);if(up('uno:D2','uno:GND1')||!down('uno:D2','uno:GND1'))return fail('open','D2 接按鈕 A 側，B 側接 GND；不可接同側或旁路按鈕。');for(const endpoint of Object.keys(lesson.parts).filter(t=>!t.startsWith('button:')))if(up('uno:D2',endpoint)||down('uno:D2',endpoint)&&!down(endpoint,'uno:GND1'))return fail('short','按鈕訊號不可跨接輸出支路。');}
  if(id==='pot-dimming'){need('uno:5V','pot:vcc');need('uno:A0','pot:w');need('uno:GND1','pot:gnd');}
  if(id==='ldr-nightlight'){const between=(a:string,b:string,x:string,y:string)=>(same(a,x)&&same(b,y))||(same(a,y)&&same(b,x));if(same('ldr:a','ldr:b')||same('divider:a','divider:b'))return fail('resistor_bypassed','光阻或10kΩ電阻不可被旁路。');if(!between('ldr:a','ldr:b','uno:5V','uno:A0')||!between('divider:a','divider:b','uno:A0','uno:GND1'))return fail('open','5V → 光阻 → A0 分壓點 → 10kΩ → GND。');}
  if(id==='buzzer-doorbell'){need('uno:D10','buzzer:s');need('uno:5V','buzzer:vcc');need('uno:GND1','buzzer:gnd');}
  if(id==='servo-angle'||id==='ultrasonic-alert'||id==='pir-delay'){const prefix=id==='servo-angle'?'servo':id==='pir-delay'?'pir':'ultra';need('supply:plus',prefix+':vcc');need('supply:minus',prefix+':gnd');need('supply:minus','uno:GND1');if(id==='servo-angle')need('uno:D9','servo:s');else if(id==='pir-delay')need('uno:D2','pir:out');else {need('uno:D7','ultra:trig');need('uno:D8','ultra:echo');}}
  if(id==='climate-dht'||id==='environment-lab'){need('uno:5V','dht:vcc');need('uno:D4','dht:data');need('uno:GND1','dht:gnd');}
  if(id==='oled-i2c'||id==='seven-counter'||id==='environment-lab'){need('uno:5V','oled:vcc');need('uno:GND1','oled:gnd');need(unoPin(id==='seven-counter'?8:18),'oled:sda');need(unoPin(id==='seven-counter'?7:19),'oled:scl');}
 }catch(error){return fail('open',(error as Error).message);}
 // All powered module ports must stay separate, except their intended common ground.
 for(const prefix of ['pot','buzzer','servo','ultra','pir','dht','oled']){const ports=Object.keys(lesson.parts).filter(t=>t.startsWith(prefix+':'));for(let i=0;i<ports.length;i++)for(let j=i+1;j<ports.length;j++)if(same(ports[i],ports[j]))return fail('short','模組端點不可互相短接。');}
 const display=id==='oled-i2c'||id==='seven-counter',noLed=display||id==='servo-angle'||id==='buzzer-doorbell';
 const channels:ChannelAnalysis[]=[];
 if(!noLed){const count=id==='dual-led'?2:id==='traffic-light'||id==='rgb-mixing'?3:1;for(let i=0;i<count;i++){const suffix=i?String(i+1):'',r='resistor'+suffix,a=id==='rgb-mixing'?['rgb:r','rgb:g','rgb:b'][i]:'led'+suffix+':a',k=id==='rgb-mixing'?'rgb:k':'led'+suffix+':k',source=unoPin([10,9,6][i]);let code:CircuitAnalysis['code']='valid',description='此支路接線有效。';
 if(same(r+':a',r+':b')){code='resistor_bypassed';description='220Ω電阻不可旁路。';}else if(same(a,k)){code='led_bypassed';description='LED兩端不可短接。';}else {const series=(x:string,y:string)=>[[r+':a',r+':b'],[r+':b',r+':a']].some(([ra,rb])=>(same(source,ra)&&same(rb,x)&&same(y,'uno:GND1'))||(same(source,x)&&same(y,ra)&&same(rb,'uno:GND1')));if(series(k,a)){code='reversed';description='LED極性接反。';}else if(!series(a,k)){code=same(source,a)&&same(k,'uno:GND1')?'missing_resistor':'open';description='請完成獨立的 GPIO → 220Ω → LED → GND 支路。';}}
 channels.push({gpio:[10,9,6][i],label:id==='traffic-light'?['紅','黃','綠'][i]:id==='rgb-mixing'?['R','G','B'][i]:'LED '+(i+1),valid:code==='valid',code,title:code==='valid'?'接線正確':'支路需修正',description,lit:code==='valid'&&levels[i]==='HIGH'});
 }
 // Only the common cathode/ground may join different LED branches.
 for(let i=0;i<channels.length;i++)for(let j=i+1;j<channels.length;j++){const r=(n:number)=>'resistor'+(n?String(n+1):'');for(const a of [r(i)+':a',r(i)+':b'])for(const b of [r(j)+':a',r(j)+':b'])if(same(a,b)&&!same(a,'uno:GND1'))return fail('short','LED／RGB 各支路只能共地，不可共用限流電阻或跨接。');}
 }
 const bad=channels.find(c=>!c.valid);return {valid:!bad,code:bad?.code??'valid',title:bad?'檢查 LED 支路':'UNO 接線正確',description:bad?.description??'使用本課指定的5V相容教學元件；訊號由程式控制。',channels:channels.length?channels:undefined,lit:noLed&&!display?levels[0]==='HIGH':channels[0]?.lit??false};
}
export function unoCurrentPath(wires:CircuitWire[],id:LessonId,levels:('HIGH'|'LOW')[]):CurrentSegment[]{const a=unoAnalyze(wires,id,levels);if(!a.valid)return [];const result:CurrentSegment[]=[];
 if(id==='servo-angle'||id==='buzzer-doorbell'){if(!a.lit)return [];const prefix=id==='servo-angle'?'servo':'buzzer';return wires.filter(w=>[w.from,w.to].some(p=>p===prefix+':vcc'||p===prefix+':gnd')).map(w=>({...w,kind:'wire',from:w.to===prefix+':vcc'?w.from:w.to,to:w.to===prefix+':vcc'?w.to:w.from}));}
 for(const [i,c] of (a.channels??[]).entries()){if(!c.lit)continue;const suffix=i?String(i+1):'',r='resistor'+suffix,l='led'+suffix,anode=id==='rgb-mixing'?['rgb:r','rgb:g','rgb:b'][i]:l+':a',cathode=id==='rgb-mixing'?'rgb:k':l+':k';const edges:CurrentSegment[]=[...wires.map(w=>({...w,kind:'wire' as const})),{id:r,kind:'resistor',from:r+':a',to:r+':b'},{id:id==='rgb-mixing'?'rgb-'+i:l,kind:'led',from:anode,to:cathode}];const visit=(node:string,seen:Set<string>,path:CurrentSegment[])=>{if(pins.get(node)?.role==='ground'){result.push(...path);return;}for(const e of edges){const next=e.from===node?e.to:e.to===node&&e.kind!=='led'?e.from:null;if(next&&!seen.has(next))visit(next,new Set([...seen,next]),[...path,{...e,from:node,to:next}]);}};const source=unoPin(c.gpio);visit(source,new Set([source]),[]);}
 return [...new Map(result.map(p=>[p.kind+':'+p.id,p])).values()];}
