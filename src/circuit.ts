import {lessons,type LessonId} from './lessons.ts';
import { pins, pinById, titleFor } from './board.ts';

export type OutputLevel = 'HIGH' | 'LOW';
export interface CircuitWire { id: string; from: string; to: string }
export interface CircuitState {
  lessonId:LessonId; wires: CircuitWire[]; pending: string | null; level: OutputLevel;level2:OutputLevel;
  notice: string; nextWire: number; exampleBackup: CircuitWire[] | null;
}
export type CircuitAction =
  | { type: 'pick'; terminal: string }
  | { type: 'remove'; id: string }
  | { type: 'level'; level: OutputLevel;gpio?:23|22 }
  | {type:'lesson';lessonId:LessonId} | { type: 'example' } | { type: 'clear' } | { type: 'cancel' };
export const lessonDefinition = {
  id: 'external-led-01', source: 'J3-02', resistorOhms: 220,
  groundIds: ['J3-01', 'J3-07', 'J2-14'],
  parts: { 'resistor:a': '電阻 A 端', 'resistor:b': '電阻 B 端', 'led:a': 'LED 正極 A+', 'led:k': 'LED 負極 K−' },
} as const;
export const initialCircuitState: CircuitState = { lessonId:'blink', wires: [], pending: null, level: 'LOW',level2:'LOW', notice: '', nextWire: 1, exampleBackup: null };
export function isTerminal(id: string,lessonId:LessonId='blink') { return pinById.has(id) || Object.hasOwn(lessons[lessonId].parts, id); }
export function terminalLabel(id: string,lessonId:LessonId='blink'): string {
  const pin = pinById.get(id);
  if (pin) return `${titleFor(pin)} · ${id}`;
  return (lessons[lessonId].parts as Record<string,string>)[id]??(lessons['button-led'].parts as Record<string,string>)[id]??(lessons['dual-led'].parts as Record<string,string>)[id]??'未知端點';
}
export function exampleWires(lessonId:LessonId='blink'): CircuitWire[] {
  return [
    { id: 'example-1', from: 'J3-02', to: 'resistor:a' },
    { id: 'example-2', from: 'resistor:b', to: 'led:a' },
    { id: 'example-3', from: 'led:k', to: 'J3-07' },
    ...(lessonId==='dual-led'?[{id:'example-4',from:'J3-03',to:'resistor2:a'},{id:'example-5',from:'resistor2:b',to:'led2:a'},{id:'example-6',from:'led2:k',to:'J2-14'}]:[]),
    ...(lessonId==='button-led'?[{id:'example-4',from:'J3-09',to:'button:a1'},{id:'example-5',from:'button:b1',to:'J2-14'}]:[]),
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
    case 'level': return { ...state,...(action.gpio===22?{level2:action.level}:{level:action.level}), notice: `GPIO${action.gpio??23} 輸出已設為 ${action.level}。` };
    case 'example': return state.exampleBackup !== null
      ? { ...state, wires: state.exampleBackup, exampleBackup: null, pending: null, level: 'LOW', level2: 'LOW', notice: '已隱藏範例接線，恢復原本的接線。' }
      : { ...state, exampleBackup: state.wires, wires: exampleWires(state.lessonId), pending: null, level: 'LOW', level2: 'LOW', notice: '已顯示範例接線；再按一次可隱藏並恢復原本的接線。' };
    case 'lesson':return {...initialCircuitState,lessonId:action.lessonId};
    case 'clear': return { ...initialCircuitState,lessonId:state.lessonId, nextWire: state.nextWire, notice: '已清空接線，輸出回到 LOW。' };
    case 'cancel': return { ...state, pending: null, notice: '已取消接線起點。' };
  }
}
export type CircuitCode = 'empty' | 'invalid' | 'unsupported' | 'short' | 'resistor_bypassed' | 'led_bypassed' | 'missing_resistor' | 'reversed' | 'open' | 'valid';
export interface CircuitAnalysis {channels?:ChannelAnalysis[]; code: CircuitCode; valid: boolean; lit: boolean; title: string; description: string }

/** Discrete rules for one GPIO23, one 220-ohm resistor and one LED. No analog solver. */
export function analyzeCircuit(wires: CircuitWire[], level: OutputLevel,lessonId:LessonId='blink',secondaryLevel:OutputLevel='LOW'): CircuitAnalysis {
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
    if (pin && pin.pinId !== lessonDefinition.source && pin.role !== 'ground' && !(lessonId==='button-led'&&pin.gpio===18)) {
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
  if(lessonId==='button-led'){union('button:a1','button:a2');union('button:b1','button:b2');const input=analyzeButton(wires,false);if(input.code==='invalid')return result('unsupported',input.title,input.description);}
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
  if (wire.from === lessonDefinition.source || wire.to === lessonDefinition.source || wire.from==='J3-03'||wire.to==='J3-03') return '#3b67cf';
  return '#d88a39';
}

export interface CurrentSegment {id:string;kind:'wire'|'resistor'|'led';from:string;to:string}
/** Conventional current direction, not electron speed or an analog current estimate. */
export function currentPath(wires:CircuitWire[],level:OutputLevel,lessonId:LessonId='blink',secondaryLevel:OutputLevel='LOW'):CurrentSegment[]{
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
export function analyzeButton(wires:CircuitWire[],pressed:boolean):ButtonAnalysis{
 const invalid=(description:string):ButtonAnalysis=>({level:null,code:'invalid',title:'按鈕輸入無法判定',description});
 const seen:CircuitWire[]=[];for(const wire of wires){if(wireError(seen,wire.from,wire.to,'button-led'))return invalid('接線包含未知、重複或無效端點。');seen.push(wire);}
 for(const id of wires.flatMap(wire=>[wire.from,wire.to])){const pin=pinById.get(id);if(pin&&pin.role!=='ground'&&pin.gpio!==18&&pin.gpio!==23)return invalid('本課只支援 GPIO18 輸入、GPIO23 輸出及 GND，請移除其他接腳或電源連線。');}
 function grounded(down:boolean){
  const parent=new Map<string,string>();const root=(id:string):string=>{if(!parent.has(id))parent.set(id,id);let node=id;while(parent.get(node)!==node)node=parent.get(node)!;return node;};const union=(a:string,b:string)=>parent.set(root(a),root(b));
  for(const id of lessonDefinition.groundIds)union(id,'J3-01');union('button:a1','button:a2');union('button:b1','button:b2');if(down)union('button:a1','button:b1');for(const wire of wires)union(wire.from,wire.to);
  const same=(a:string,b:string)=>root(a)===root(b);
  const bad=same('J3-09','J3-02')||Object.keys(lessonDefinition.parts).some(id=>same('J3-09',id)&&!same(id,'J3-01'));
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
