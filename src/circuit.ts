import {lessons,hasButton,type LessonId} from './lessons.ts';
import { pins, pinById, titleFor } from './board.ts';

export type OutputLevel = 'HIGH' | 'LOW';
export interface CircuitWire { id: string; from: string; to: string }
export interface CircuitState {
  lessonId:LessonId; wires: CircuitWire[]; pending: string | null; level: OutputLevel;level2:OutputLevel;level3:OutputLevel;duty:number;rgb:[number,number,number];pot:number;
  notice: string; nextWire: number; exampleBackup: CircuitWire[] | null;
}
export type CircuitAction =
  | {type:'rgb';index:0|1|2;value:number}|{type:'pot';value:number}
  | {type:'duty';duty:number}
  | { type: 'pick'; terminal: string }
  | { type: 'remove'; id: string }
  | { type: 'level'; level: OutputLevel;gpio?:23|22|21 }
  | {type:'lesson';lessonId:LessonId} | { type: 'example' } | { type: 'clear' } | { type: 'cancel' };
export const lessonDefinition = {
  id: 'external-led-01', source: 'J3-02', resistorOhms: 220,
  groundIds: ['J3-01', 'J3-07', 'J2-14'],
  parts: { 'resistor:a': '電阻 A 端', 'resistor:b': '電阻 B 端', 'led:a': 'LED 正極 A+', 'led:k': 'LED 負極 K−' },
} as const;
export const initialCircuitState: CircuitState = { lessonId:'blink', wires: [], pending: null, level: 'LOW',level2:'LOW',level3:'LOW',duty:0,rgb:[0,0,0],pot:2048, notice: '', nextWire: 1, exampleBackup: null };
export function isTerminal(id: string,lessonId:LessonId='blink') { return pinById.has(id) || Object.hasOwn(lessons[lessonId].parts, id); }
export function terminalLabel(id: string,lessonId:LessonId='blink'): string {
  const pin = pinById.get(id);
  if (pin) return `${titleFor(pin)} · ${id}`;
  return (lessons[lessonId].parts as Record<string,string>)[id]??(lessons['button-led'].parts as Record<string,string>)[id]??(lessons['dual-led'].parts as Record<string,string>)[id]??'未知端點';
}
export function exampleWires(lessonId:LessonId='blink'): CircuitWire[] {
  if(lessonId==='rgb-mixing')return [{id:'example-1',from:'J3-02',to:'resistor:a'},{id:'example-2',from:'resistor:b',to:'rgb:r'},{id:'example-3',from:'J3-03',to:'resistor2:a'},{id:'example-4',from:'resistor2:b',to:'rgb:g'},{id:'example-5',from:'J3-06',to:'resistor3:a'},{id:'example-6',from:'resistor3:b',to:'rgb:b'},{id:'example-7',from:'rgb:k',to:'J3-07'}];
  if(lessonId==='buzzer-doorbell')return [{id:'example-1',from:'J3-02',to:'buzzer:s'},{id:'example-2',from:'J2-01',to:'buzzer:vcc'},{id:'example-3',from:'buzzer:gnd',to:'J3-07'},{id:'example-4',from:'J3-09',to:'button:a1'},{id:'example-5',from:'button:b1',to:'J2-14'}];
  return [
    { id: 'example-1', from: 'J3-02', to: 'resistor:a' },
    { id: 'example-2', from: 'resistor:b', to: 'led:a' },
    { id: 'example-3', from: 'led:k', to: 'J3-07' },
    ...((lessonId==='dual-led'||lessonId==='traffic-light')?[{id:'example-4',from:'J3-03',to:'resistor2:a'},{id:'example-5',from:'resistor2:b',to:'led2:a'},{id:'example-6',from:'led2:k',to:'J2-14'}]:[]),
    ...(lessonId==='traffic-light'?[{id:'example-7',from:'J3-06',to:'resistor3:a'},{id:'example-8',from:'resistor3:b',to:'led3:a'},{id:'example-9',from:'led3:k',to:'J3-01'}]:[]),
    ...(lessonId==='pot-dimming'?[{id:'example-4',from:'J2-01',to:'pot:vcc'},{id:'example-5',from:'pot:w',to:'J2-05'},{id:'example-6',from:'pot:gnd',to:'J2-14'}]:[]),
    ...(hasButton(lessonId)?[{id:'example-4',from:'J3-09',to:'button:a1'},{id:'example-5',from:'button:b1',to:'J2-14'}]:[]),
  ];
}
export function wireError(wires: CircuitWire[], from: string, to: string,lessonId:LessonId='blink'): string | null {
  if (!isTerminal(from,lessonId) || !isTerminal(to,lessonId)) return '無法連接未知端點。';
  if (from === to) return '請選擇兩個不同端點。';
  if (wires.some(w => (w.from === from && w.to === to) || (w.to === from && w.from === to))) return '這兩個端點已經有導線，不需要重複接線。';
  if (wires.length >= 12) return '本課最多支援 12 條導線。請先刪除不需要的接線。';
  return null;
}
export function circuitReducer(state: CircuitState, action: CircuitAction): CircuitState {
  switch (action.type) {
    case 'pot':return Number.isInteger(action.value)&&action.value>=0&&action.value<=4095?{...state,pot:action.value}:state;
    case 'rgb':{if(!Number.isInteger(action.value)||action.value<0||action.value>255)return state;const rgb:[number,number,number]=[...state.rgb];rgb[action.index]=action.value;return {...state,rgb};}
    case 'duty':return Number.isInteger(action.duty)&&action.duty>=0&&action.duty<=255?{...state,duty:action.duty,pending:null}:state;
    case 'pick': {
      if (!isTerminal(action.terminal,state.lessonId)) return { ...state, notice: '無法選擇未知端點。' };
      if (state.pending === action.terminal) return { ...state, pending: null, notice: '已取消接線起點。' };
      if (!state.pending) return { ...state, pending: action.terminal, notice: `已選起點：${terminalLabel(action.terminal,state.lessonId)}。請選擇終點。` };
      const error = wireError(state.wires, state.pending, action.terminal,state.lessonId);
      if (error) return { ...state, pending: null, notice: error };
      return { ...state, pending: null, nextWire: state.nextWire + 1,
        wires: [...state.wires, { id: `wire-${state.nextWire}`, from: state.pending, to: action.terminal }], notice: '已新增一條導線。' };
    }
    case 'remove': return { ...state, wires: state.wires.filter(w => w.id !== action.id), pending: null, notice: '已刪除導線。' };
    case 'level': return { ...state,...(action.gpio===21?{level3:action.level}:action.gpio===22?{level2:action.level}:{level:action.level}), notice: `GPIO${action.gpio??23} 輸出已設為 ${action.level}。` };
    case 'example': return state.exampleBackup !== null
      ? { ...state, wires: state.exampleBackup, exampleBackup: null, pending: null, level: 'LOW', level2: 'LOW', level3: 'LOW', duty:0,rgb:[0,0,0],pot:2048, notice: '已隱藏範例接線，恢復原本的接線。' }
      : { ...state, exampleBackup: state.wires, wires: exampleWires(state.lessonId), pending: null, level: 'LOW', level2: 'LOW', level3: 'LOW', duty:0,rgb:[0,0,0],pot:2048, notice: '已顯示範例接線；再按一次可隱藏並恢復原本的接線。' };
    case 'lesson':return {...initialCircuitState,lessonId:action.lessonId};
    case 'clear': return { ...initialCircuitState,lessonId:state.lessonId, nextWire: state.nextWire, notice: '已清空接線，輸出回到 LOW。' };
    case 'cancel': return { ...state, pending: null, notice: '已取消接線起點。' };
  }
}
export type CircuitCode = 'empty' | 'invalid' | 'unsupported' | 'short' | 'resistor_bypassed' | 'led_bypassed' | 'missing_resistor' | 'reversed' | 'open' | 'valid';
export interface CircuitAnalysis {channels?:ChannelAnalysis[]; code: CircuitCode; valid: boolean; lit: boolean; title: string; description: string }

/** Discrete rules for one GPIO23, one 220-ohm resistor and one LED. No analog solver. */
export function analyzeCircuit(wires: CircuitWire[], level: OutputLevel,lessonId:LessonId='blink',secondaryLevel:OutputLevel='LOW',thirdLevel:OutputLevel='LOW'): CircuitAnalysis {
  if(lessonId==='rgb-mixing')return analyzeRGB(wires,[level,secondaryLevel,thirdLevel]);
  if(lessonId==='pot-dimming'){const input=analyzePot(wires,0);if(!input.valid)return {code:input.code,title:'電位器接線無法判定',description:input.description,valid:false,lit:false};return analyzeCircuit(potLedWires(wires),level,'pwm-breathing');}
  if(lessonId==='pwm-breathing'){const result=analyzeCircuit(wires,level);return result.valid?{...result,description:level==='HIGH'?'接線有效；LED 以正值 PWM 佔空比呈現平均亮度，不是固定 HIGH 或類比電壓。':'接線有效；佔空比目前為零，LED 熄滅。'}:result;}
  if(lessonId==='buzzer-doorbell')return analyzeBuzzer(wires,level);
  if(lessonId==='traffic-light')return analyzeTrafficCircuit(wires,level,secondaryLevel,thirdLevel);
  if(lessonId==='dual-led')return analyzeDualCircuit(wires,level,secondaryLevel);
  const result = (code: CircuitCode, title: string, description: string): CircuitAnalysis => ({ code, valid: code === 'valid', lit: code === 'valid' && level === 'HIGH', title, description });
  if (!wires.length) return result('empty', '從第一條線開始', '先將 GPIO23 連到電阻 A 端，也可以載入範例再觀察。');
  const seen: CircuitWire[] = [];
  for (const wire of wires) {
    if (wireError(seen, wire.from, wire.to,lessonId)) return result('invalid', '接線資料無效', '請移除未知、自連或重複的導線，再重新接線。');
    seen.push(wire);
  }
  const active = new Set(wires.flatMap(w => [w.from, w.to]));
  for (const id of active) {
    const pin = pinById.get(id);
    if (pin && pin.pinId !== lessonDefinition.source && pin.role !== 'ground' && !(hasButton(lessonId)&&pin.gpio===18)) {
      const reason = pin.category === 'input' ? '此腳只能輸入，不能驅動 LED。' : pin.category === 'reserved' ? '此腳保留給 Flash，禁止接線。' : pin.role !== 'gpio' ? '這不是本課支援的 GPIO 輸出。' : '本課固定使用 GPIO23，其他 GPIO 尚未支援。';
      return result('unsupported', '使用了不支援的接腳', `${terminalLabel(id)}：${reason}`);
    }
  }
  const parent = new Map<string, string>();
  for (const id of [...pins.map(pin => pin.pinId), ...Object.keys(lessons[lessonId].parts)]) parent.set(id, id);
  const root = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current)!;
    return current;
  };
  const union = (a: string, b: string) => parent.set(root(a), root(b));
  // Three distinct physical GND pins share one electrical reference.
  lessonDefinition.groundIds.forEach(id => union(id, 'J3-01'));
  wires.forEach(wire => union(wire.from, wire.to));
  if(hasButton(lessonId)){union('button:a1','button:a2');union('button:b1','button:b2');const input=analyzeButton(wires,false);if(input.code==='invalid')return result('unsupported',input.title,input.description);}
  const same = (a: string, b: string) => root(a) === root(b);
  const source = lessons[lessonId].source, ground = 'J3-01';
  if (same(source, ground)) return result('short', 'GPIO23 與 GND 短路', '輸出腳不能直接接地。請刪除旁路導線，讓路徑依序經過電阻與 LED。');
  if (same('resistor:a', 'resistor:b')) return result('resistor_bypassed', '電阻被導線繞過', '電阻兩端被直接相連，無法限流。請移除跨接電阻的導線。');
  if (same('led:a', 'led:k')) return result('led_bypassed', 'LED 兩端被短接', '正極與負極不能接在同一條電氣路徑上，請檢查導線。');
  const forwardDirect = same(source, 'led:a') && same('led:k', ground);
  const reverseDirect = same(source, 'led:k') && same('led:a', ground);
  if (forwardDirect || reverseDirect) return result('missing_resistor', '缺少串聯限流電阻', '請讓 220 Ω 電阻與 LED 串聯，不能把 LED 直接接在 GPIO23 與 GND 之間。');
  const seriesPath = (anode: string, cathode: string) => {
    return [['resistor:a', 'resistor:b'], ['resistor:b', 'resistor:a']].some(([a, b]) =>
      (same(source, a) && same(b, anode) && same(cathode, ground)) ||
      (same(source, anode) && same(cathode, a) && same(b, ground)));
  };
  if (seriesPath('led:a', 'led:k')) return result('valid', '接線正確', level === 'HIGH' ? 'GPIO23 為 HIGH，電流路徑經過電阻與 LED；LED 亮起。' : '電路已接通。輸出目前為 LOW，LED 熄滅；按 HIGH 試試。');
  if (seriesPath('led:k', 'led:a')) return result('reversed', 'LED 極性接反', 'A+ 是正極，應朝向 GPIO23；K− 是負極，應朝向 GND。請交換 LED 的兩條接線。');
  return result('open', '電路尚未接通', '檢查 GPIO23 → 電阻 → LED 正極 A+ → LED 負極 K− → GND 是否形成完整串聯路徑。');
}
export function wireColor(wire: CircuitWire): string {
  if ([wire.from, wire.to].some(id => pinById.get(id)?.role === 'ground')) return '#536477';
  if (wire.from === lessonDefinition.source || wire.to === lessonDefinition.source || wire.from==='J3-03'||wire.to==='J3-03'||wire.from==='J3-06'||wire.to==='J3-06') return '#3b67cf';
  return '#d88a39';
}

export interface CurrentSegment {id:string;kind:'wire'|'resistor'|'led';from:string;to:string}
/** Conventional current direction, not electron speed or an analog current estimate. */
export function currentPath(wires:CircuitWire[],level:OutputLevel,lessonId:LessonId='blink',secondaryLevel:OutputLevel='LOW',thirdLevel:OutputLevel='LOW'):CurrentSegment[]{
  if(lessonId==='pot-dimming')return analyzePot(wires,0).valid?currentPath(potLedWires(wires),level):[];
  if(lessonId==='rgb-mixing'){const analysis=analyzeRGB(wires,[level,secondaryLevel,thirdLevel]);return analysis.channels!.flatMap((c,i)=>c.lit?currentPath(rgbBranch(wires,i),i===0?level:i===1?secondaryLevel:thirdLevel).map(p=>({...p,id:p.kind==='wire'?p.id:p.kind==='resistor'?(i?'resistor'+(i+1):'resistor'):'rgb-'+i,from:rgbFrom(p.from,i),to:rgbFrom(p.to,i)})):[]);}
  if(lessonId==='buzzer-doorbell')return analyzeBuzzer(wires,level).lit?wires.filter(w=>[w.from,w.to].some(id=>id==='buzzer:vcc'||id==='buzzer:gnd')).map(w=>({...w,kind:'wire' as const,from:w.from==='buzzer:vcc'||w.to==='buzzer:gnd'?w.to:w.from,to:w.from==='buzzer:vcc'||w.to==='buzzer:gnd'?w.from:w.to})):[];
  if(lessonId==='traffic-light'){const analysis=analyzeTrafficCircuit(wires,level,secondaryLevel,thirdLevel);return trafficBranches.flatMap((branch,i)=>{return analysis.channels![i].lit?currentPath(trafficBranch(wires,i),[level,secondaryLevel,thirdLevel][i]).map(segment=>({...segment,id:segment.kind==='wire'?segment.id:branch.prefix[segment.id as 'resistor'|'led']??segment.id,from:trafficFrom(segment.from,i),to:trafficFrom(segment.to,i)})):[];});}
  if(lessonId==='dual-led'){const analysis=analyzeDualCircuit(wires,level,secondaryLevel);return analysis.channels!.flatMap((channel,index)=>channel.lit?currentPath(dualBranch(wires,index===1),index===1?secondaryLevel:level).map(segment=>({...segment,id:segment.kind==='wire'?segment.id:index===1?segment.id+'2':segment.id,from:index===1?fromCanonical(segment.from):segment.from,to:index===1?fromCanonical(segment.to):segment.to})):[]);}
  if(!analyzeCircuit(wires,level,lessonId).lit)return [];
  const edges:CurrentSegment[]=[...wires.map(wire=>({...wire,kind:'wire' as const})),{id:'resistor',kind:'resistor',from:'resistor:a',to:'resistor:b'},{id:'led',kind:'led',from:'led:a',to:'led:k'}];
  const result=new Map<string,CurrentSegment>();
  function visit(node:string,seen:Set<string>,path:CurrentSegment[]){
    if(pinById.get(node)?.role==='ground'){path.forEach(segment=>result.set(`${segment.kind}:${segment.id}`,segment));return;}
    for(const edge of edges){
      const next=edge.from===node?edge.to:edge.to===node&&edge.kind!=='led'?edge.from:null;
      if(!next||seen.has(next))continue;
      visit(next,new Set([...seen,next]),[...path,{...edge,from:node,to:next}]);
    }
  }
  visit(lessonDefinition.source,new Set([lessonDefinition.source]),[]);return [...result.values()];
}

export interface ButtonAnalysis {level:OutputLevel|null;code:'ready'|'open'|'grounded'|'invalid';title:string;description:string}
export function analyzeButton(wires:CircuitWire[],pressed:boolean,lessonId:LessonId='button-led'):ButtonAnalysis{
 const invalid=(description:string):ButtonAnalysis=>({level:null,code:'invalid',title:'按鈕輸入無法判定',description});
 const seen:CircuitWire[]=[];for(const wire of wires){if(wireError(seen,wire.from,wire.to,lessonId))return invalid('接線包含未知、重複或無效端點。');seen.push(wire);}
 for(const id of wires.flatMap(wire=>[wire.from,wire.to])){const pin=pinById.get(id);if(pin&&pin.role!=='ground'&&pin.gpio!==18&&pin.gpio!==23&&!(lessonId==='buzzer-doorbell'&&id==='J2-01'))return invalid('本課只支援 GPIO18 輸入、GPIO23 輸出及 GND，請移除其他接腳或電源連線。');}
 function grounded(down:boolean){
  const parent=new Map<string,string>();const root=(id:string):string=>{if(!parent.has(id))parent.set(id,id);let node=id;while(parent.get(node)!==node)node=parent.get(node)!;return node;};const union=(a:string,b:string)=>parent.set(root(a),root(b));
  for(const id of lessonDefinition.groundIds)union(id,'J3-01');union('button:a1','button:a2');union('button:b1','button:b2');if(down)union('button:a1','button:b1');for(const wire of wires)union(wire.from,wire.to);
  const same=(a:string,b:string)=>root(a)===root(b);
  const bad=same('J3-09','J3-02')||[...Object.keys(lessonDefinition.parts),...(lessonId==='buzzer-doorbell'?['buzzer:s','buzzer:vcc','J2-01']:[])].some(id=>same('J3-09',id)&&!same(id,'J3-01'));
  return {low:same('J3-09','J3-01'),bad};
 }
 const up=grounded(false),down=grounded(true);if(up.bad||down.bad)return invalid('GPIO18 或按鈕連到輸出／LED 支路；本課輸入只允許透過按鈕連至 GND。');
 if(up.low)return {level:'LOW',code:'grounded',title:'輸入持續接地',description:'GPIO18 沒有經過開關就已接地，可能使用同側兩腳或有旁路；讀值固定 LOW，按放不會改變。'};
 if(!down.low)return {level:'HIGH',code:'open',title:'按鈕回路尚未接通',description:'INPUT_PULLUP 下開路讀為 HIGH。請將 GPIO18 接按鈕一側、另一側接 GND。'};
 return {level:pressed?'LOW':'HIGH',code:'ready',title:'按鈕接線正確',description:'INPUT_PULLUP：放開 HIGH，按下 LOW；A1/A2 同側相通，B1/B2 同側相通。'};
}

export interface ChannelAnalysis {gpio:number;label:string;lit:boolean;valid:boolean;code:CircuitCode;title:string;description:string}
const secondAliases:Record<string,string>={'J3-03':'J3-02','resistor2:a':'resistor:a','resistor2:b':'resistor:b','led2:a':'led:a','led2:k':'led:k'};
const firstIds=['J3-02','resistor:a','resistor:b','led:a','led:k'];
const secondIds=Object.keys(secondAliases);
function fromCanonical(id:string){return Object.entries(secondAliases).find(([,canonical])=>canonical===id)?.[0]??id;}
function dualBranch(wires:CircuitWire[],second:boolean):CircuitWire[]{
 const allowed=new Set<string>([...(second?secondIds:firstIds),...lessonDefinition.groundIds]);
 return wires.filter(w=>allowed.has(w.from)&&allowed.has(w.to)).map(w=>({...w,from:second?secondAliases[w.from]??w.from:w.from,to:second?secondAliases[w.to]??w.to:w.to}));
}
export function analyzeDualCircuit(wires:CircuitWire[],firstLevel:OutputLevel,secondLevel:OutputLevel):CircuitAnalysis{
 const fail=(code:CircuitCode,title:string,description:string):CircuitAnalysis=>({code,title,description,valid:false,lit:false,channels:[23,22].map((gpio,i)=>({gpio,label:'LED '+(i+1),code,title,description,valid:false,lit:false}))});
 const seen:CircuitWire[]=[];for(const wire of wires){if(wireError(seen,wire.from,wire.to,'dual-led'))return fail('invalid','接線資料無效','移除未知、重複、自連或超過上限的接線。');seen.push(wire);}
 for(const id of wires.flatMap(w=>[w.from,w.to])){const pin=pinById.get(id);if(pin&&pin.role!=='ground'&&pin.gpio!==23&&pin.gpio!==22)return fail('unsupported','使用不支援的接腳',terminalLabel(id)+'：本課只支援 GPIO23、GPIO22 與 GND。');}
 const parent=new Map<string,string>();const root=(id:string):string=>{if(!parent.has(id))parent.set(id,id);let node=id;while(parent.get(node)!==node)node=parent.get(node)!;return node;};const union=(a:string,b:string)=>parent.set(root(a),root(b));for(const id of lessonDefinition.groundIds)union(id,'J3-01');for(const wire of wires)union(wire.from,wire.to);
 const same=(a:string,b:string)=>root(a)===root(b);
 if(same('J3-02','J3-03')||same('J3-02','J3-01')||same('J3-03','J3-01'))return fail('short','輸出腳發生短接','兩個輸出不可直接相連，也不可直接接 GND；請先移除短接線。');
 if(firstIds.some(a=>secondIds.some(b=>same(a,b)&&!same(a,'J3-01'))))return fail('unsupported','兩條 LED 支路互相跨接','LED 1 與 LED 2 各使用自己的 GPIO、電阻與 LED；只有 GND 可以共用。');
 const channels=[false,true].map((second,index)=>{const result=analyzeCircuit(dualBranch(wires,second),second?secondLevel:firstLevel);return {...result,gpio:second?22:23,label:'LED '+(index+1),description:second?result.description.replaceAll('GPIO23','GPIO22'):result.description};});
 const valid=channels.every(c=>c.valid),bad=channels.find(c=>!c.valid);
 return {channels,code:bad?.code??'valid',valid,lit:channels[0].lit,title:valid?'兩條 LED 接線正確':'檢查兩條 LED 支路',description:channels.map(c=>`${c.label}（GPIO${c.gpio}）：${c.description}`).join(' ')};
}

const trafficBranches=[
 {gpio:23,source:'J3-02',label:'紅燈',prefix:{resistor:'resistor',led:'led'}},
 {gpio:22,source:'J3-03',label:'黃燈',prefix:{resistor:'resistor2',led:'led2'}},
 {gpio:21,source:'J3-06',label:'綠燈',prefix:{resistor:'resistor3',led:'led3'}},
];
function trafficFrom(id:string,index:number):string{const branch=trafficBranches[index];if(id==='J3-02')return branch.source;return id.replace(/^(resistor|led)(?=:|$)/,key=>branch.prefix[key as 'resistor'|'led']);}
function trafficIds(index:number){return ['J3-02','resistor:a','resistor:b','led:a','led:k'].map(id=>trafficFrom(id,index));}
function trafficBranch(wires:CircuitWire[],index:number){const canonical=['J3-02','resistor:a','resistor:b','led:a','led:k'],ids=trafficIds(index),allowed=new Set([...ids,...lessonDefinition.groundIds]);const back=(id:string)=>canonical[ids.indexOf(id)]??id;return wires.filter(w=>allowed.has(w.from)&&allowed.has(w.to)).map(w=>({...w,from:back(w.from),to:back(w.to)}));}
export function analyzeTrafficCircuit(wires:CircuitWire[],red:OutputLevel,yellow:OutputLevel,green:OutputLevel):CircuitAnalysis{
 const fail=(code:CircuitCode,title:string,description:string):CircuitAnalysis=>({code,title,description,lit:false,valid:false,channels:trafficBranches.map(b=>({...b,code,title,description,lit:false,valid:false}))});
 const seen:CircuitWire[]=[];for(const wire of wires){if(wireError(seen,wire.from,wire.to,'traffic-light'))return fail('invalid','接線資料無效','請移除未知、重複或超過上限的導線。');seen.push(wire);}
 for(const id of wires.flatMap(w=>[w.from,w.to])){const pin=pinById.get(id);if(pin&&pin.role!=='ground'&&![23,22,21].includes(pin.gpio??-1))return fail('unsupported','使用不支援的接腳','本課只支援 GPIO23、GPIO22、GPIO21 與 GND。');}
 const parent=new Map<string,string>();const root=(id:string):string=>{if(!parent.has(id))parent.set(id,id);let node=id;while(parent.get(node)!==node)node=parent.get(node)!;return node;};const union=(a:string,b:string)=>parent.set(root(a),root(b));for(const id of lessonDefinition.groundIds)union(id,'J3-01');for(const w of wires)union(w.from,w.to);
 const same=(a:string,b:string)=>root(a)===root(b);
 if(trafficBranches.some((b,i)=>same(b.source,'J3-01')||trafficBranches.slice(i+1).some(c=>same(b.source,c.source))))return fail('short','輸出腳發生短接','三個輸出不可直接互接或直接接 GND。');
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if(trafficIds(i).some(a=>trafficIds(j).some(b=>same(a,b)&&!same(a,'J3-01'))))return fail('unsupported','LED 支路互相跨接','三顆燈各用自己的 GPIO、電阻與 LED，只有 GND 可共用。');
 const levels=[red,yellow,green];const channels=trafficBranches.map((b,i)=>{const result=analyzeCircuit(trafficBranch(wires,i),levels[i]);return {...result,gpio:b.gpio,label:b.label,description:result.description.replaceAll('GPIO23','GPIO'+b.gpio)};});const bad=channels.find(c=>!c.valid);
 return {channels,code:bad?.code??'valid',valid:!bad,lit:channels[0].lit,title:bad?'檢查三條 LED 支路':'三條 LED 接線正確',description:channels.map(c=>c.label+'：'+c.description).join(' ')};
}

/** Three-pin teaching module with an on-board driver; GPIO is signal only. */
export function analyzeBuzzer(wires:CircuitWire[],level:OutputLevel):CircuitAnalysis{
 const result=(code:CircuitCode,title:string,description:string):CircuitAnalysis=>({code,title,description,valid:code==='valid',lit:code==='valid'&&level==='HIGH'});
 const seen:CircuitWire[]=[];for(const w of wires){if(wireError(seen,w.from,w.to,'buzzer-doorbell'))return result('invalid','接線資料無效','請移除未知、重複或無效端點。');seen.push(w);}
 const allowed=new Set(['J3-02','J3-09','J2-01',...lessonDefinition.groundIds,...Object.keys(lessons['buzzer-doorbell'].parts)]);
 if(wires.some(w=>!allowed.has(w.from)||!allowed.has(w.to)))return result('unsupported','使用不支援的端點','本課只使用 GPIO23 訊號、GPIO18 按鈕、3V3 與 GND。');
 const buttonTerminal=(id:string)=>id.startsWith('button:');const controlEnd=(id:string)=>buttonTerminal(id)||id==='J3-09'||lessonDefinition.groundIds.some(g=>g===id);if(wires.some(w=>(buttonTerminal(w.from)&&!controlEnd(w.to))||(buttonTerminal(w.to)&&!controlEnd(w.from))))return result('unsupported','按鈕跨接模組或供電','按鈕僅可連 GPIO18、GND 與同課按鈕端點。');
 const parent=new Map<string,string>();const root=(id:string):string=>{if(!parent.has(id))parent.set(id,id);let node=id;while(parent.get(node)!==node)node=parent.get(node)!;return node;};const union=(a:string,b:string)=>parent.set(root(a),root(b));lessonDefinition.groundIds.forEach(g=>union(g,'J3-01'));wires.forEach(w=>union(w.from,w.to));const same=(a:string,b:string)=>root(a)===root(b);
 const domains=['J3-02','J2-01','J3-01'];if(domains.some((a,i)=>domains.slice(i+1).some(b=>same(a,b))))return result('short','訊號或供電短接','GPIO23、3V3 與 GND 不可直接相連。');
 const parts=['buzzer:s','buzzer:vcc','buzzer:gnd'];if(parts.some((a,i)=>parts.slice(i+1).some(b=>same(a,b))))return result('short','模組端點短接','S、VCC、GND 必須分開。');
 const input=analyzeButton(wires,false,'buzzer-doorbell');if(input.code==='invalid')return result('unsupported',input.title,input.description);
 if(!same('buzzer:s','J3-02')||!same('buzzer:vcc','J2-01')||!same('buzzer:gnd','J3-01'))return result('open','檢查模組三條接線','GPIO23 → S；3V3（J2-01）→ VCC；GND → 模組 GND，不可互換。');
 return result('valid','模組接線正確',level==='HIGH'?'訊號 HIGH：主動式模組發聲。':'訊號 LOW：主動式模組安靜。');
}

const rgbSources=['J3-02','J3-03','J3-06'],rgbAnodes=['rgb:r','rgb:g','rgb:b'];
function rgbFrom(id:string,i:number){return id==='J3-02'?rgbSources[i]:id==='led:a'?rgbAnodes[i]:id==='led:k'?'rgb:k':id.replace(/^resistor/,i?'resistor'+(i+1):'resistor');}
function rgbBranch(wires:CircuitWire[],i:number){const canonical=['J3-02','resistor:a','resistor:b','led:a','led:k'],ids=canonical.map(id=>rgbFrom(id,i)),allowed=new Set([...ids,...lessonDefinition.groundIds]);return wires.filter(w=>allowed.has(w.from)&&allowed.has(w.to)).map(w=>({...w,from:canonical[ids.indexOf(w.from)]??w.from,to:canonical[ids.indexOf(w.to)]??w.to}));}
function wireRoots(wires:CircuitWire[]){const parent=new Map<string,string>();const root=(id:string):string=>{if(!parent.has(id))parent.set(id,id);let node=id;while(parent.get(node)!==node)node=parent.get(node)!;return node;};const union=(a:string,b:string)=>parent.set(root(a),root(b));lessonDefinition.groundIds.forEach(g=>union(g,'J3-01'));wires.forEach(w=>union(w.from,w.to));return (a:string,b:string)=>root(a)===root(b);}
export function analyzeRGB(wires:CircuitWire[],levels:OutputLevel[]):CircuitAnalysis{
 const fail=(code:CircuitCode,description:string):CircuitAnalysis=>({code,title:'RGB 接線需修正',description,valid:false,lit:false,channels:[23,22,21].map((gpio,i)=>({gpio,label:['紅 R','綠 G','藍 B'][i],code,title:'RGB 接線需修正',description,lit:false,valid:false}))});
 const seen:CircuitWire[]=[];for(const w of wires){if(wireError(seen,w.from,w.to,'rgb-mixing'))return fail('invalid','移除未知或重複端點。');seen.push(w);}
 if(wires.some(w=>[w.from,w.to].some(id=>{const pin=pinById.get(id);return pin&&pin.role!=='ground'&&![23,22,21].includes(pin.gpio??-1);})))return fail('unsupported','本課只使用 GPIO23、22、21 與 GND。');
 const same=wireRoots(wires);if(rgbSources.some((a,i)=>same(a,'J3-01')||rgbSources.slice(i+1).some(b=>same(a,b))))return fail('short','輸出不可互接或直接接地。');
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const ids=(n:number)=>['J3-02','resistor:a','resistor:b','led:a'].map(id=>rgbFrom(id,n));if(ids(i).some(a=>ids(j).some(b=>same(a,b)&&!same(a,'J3-01'))))return fail('unsupported','三色各用一顆電阻，只有共陰極 K 與 GND 共用。');}
 const channels=[23,22,21].map((gpio,i)=>{const result=analyzeCircuit(rgbBranch(wires,i),levels[i]);return {...result,gpio,label:['紅 R','綠 G','藍 B'][i],description:result.valid?'此色接線有效；亮度由 PWM 佔空比控制。':result.description.replaceAll('GPIO23','GPIO'+gpio)};});const bad=channels.find(c=>!c.valid);return {channels,code:bad?.code??'valid',title:bad?'檢查各色支路':'RGB 接線正確',description:'共陰極 RGB，每色各自限流；混色為教學示意。',valid:!bad,lit:channels.some(c=>c.lit)};
}
export interface PotAnalysis {valid:boolean;value:number|null;code:CircuitCode;description:string}
function potLedWires(wires:CircuitWire[]){const allowed=new Set(['J3-02',...lessonDefinition.groundIds,...Object.keys(lessonDefinition.parts)]);return wires.filter(w=>allowed.has(w.from)&&allowed.has(w.to));}
export function analyzePot(wires:CircuitWire[],value:number):PotAnalysis{
 const fail=(code:CircuitCode,description:string):PotAnalysis=>({valid:false,value:null,code,description});const seen:CircuitWire[]=[];for(const w of wires){if(wireError(seen,w.from,w.to,'pot-dimming'))return fail('invalid','移除未知、重複或無效接線。');seen.push(w);}
 const allowed=new Set(['J3-02','J2-01','J2-05',...lessonDefinition.groundIds,...Object.keys(lessons['pot-dimming'].parts)]);if(wires.some(w=>!allowed.has(w.from)||!allowed.has(w.to)))return fail('unsupported','只使用 GPIO23 輸出、GPIO34 ADC、3V3 與 GND。');
 const same=wireRoots(wires),domains=['J3-02','J2-01','J2-05','J3-01'];if(domains.some((a,i)=>domains.slice(i+1).some(b=>same(a,b))))return fail('short','供電、ADC、輸出與 GND 不可直接短接。');
 for(const w of wires){const potEnd=w.from.startsWith('pot:')?w.from:w.to.startsWith('pot:')?w.to:null;if(potEnd){const other=w.from===potEnd?w.to:w.from;const expected=potEnd==='pot:vcc'?'J2-01':potEnd==='pot:w'?'J2-05':null;if(expected?other!==expected:!lessonDefinition.groundIds.some(g=>g===other))return fail('unsupported','電位器固定 VCC → 3V3、W → GPIO34、GND → GND，不接受互換。');}}
 if(wires.some(w=>(w.from==='J2-01'&&w.to!=='pot:vcc')||(w.to==='J2-01'&&w.from!=='pot:vcc')||(w.from==='J2-05'&&w.to!=='pot:w')||(w.to==='J2-05'&&w.from!=='pot:w')))return fail('unsupported','供電與 ADC 僅可連到電位器指定端點，不可跨接 LED 支路。');
 if(!same('pot:vcc','J2-01')||!same('pot:w','J2-05')||!same('pot:gnd','J3-01'))return fail('open','請完成電位器的 VCC、W 與 GND 三條線；不猜測浮接 ADC。');
 if(!Number.isInteger(value)||value<0||value>4095)return fail('invalid','ADC 教學值應在 0～4095。');return {valid:true,value,code:'valid',description:'理想 ADC 輸入有效，讀值範圍 0～4095。'};
}
