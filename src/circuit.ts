import { pins, pinById, titleFor } from './board.ts';

export type OutputLevel = 'HIGH' | 'LOW';
export interface CircuitWire { id: string; from: string; to: string }
export interface CircuitState {
  wires: CircuitWire[]; pending: string | null; level: OutputLevel;
  notice: string; nextWire: number;
}
export type CircuitAction =
  | { type: 'pick'; terminal: string }
  | { type: 'remove'; id: string }
  | { type: 'level'; level: OutputLevel }
  | { type: 'example' } | { type: 'clear' } | { type: 'cancel' };
export const lessonDefinition = {
  id: 'external-led-01', source: 'J3-02', resistorOhms: 220,
  groundIds: ['J3-01', 'J3-07', 'J2-14'],
  parts: { 'resistor:a': '電阻 A 端', 'resistor:b': '電阻 B 端', 'led:a': 'LED 正極 A+', 'led:k': 'LED 負極 K−' },
} as const;
export const initialCircuitState: CircuitState = { wires: [], pending: null, level: 'LOW', notice: '', nextWire: 1 };
export function isTerminal(id: string) { return pinById.has(id) || Object.hasOwn(lessonDefinition.parts, id); }
export function terminalLabel(id: string): string {
  const pin = pinById.get(id);
  if (pin) return `${titleFor(pin)} · ${id}`;
  return lessonDefinition.parts[id as keyof typeof lessonDefinition.parts] ?? '未知端點';
}
export function exampleWires(): CircuitWire[] {
  return [
    { id: 'example-1', from: 'J3-02', to: 'resistor:a' },
    { id: 'example-2', from: 'resistor:b', to: 'led:a' },
    { id: 'example-3', from: 'led:k', to: 'J3-01' },
  ];
}
export function wireError(wires: CircuitWire[], from: string, to: string): string | null {
  if (!isTerminal(from) || !isTerminal(to)) return '無法連接未知端點。';
  if (from === to) return '請選擇兩個不同端點。';
  if (wires.some(w => (w.from === from && w.to === to) || (w.to === from && w.from === to))) return '這兩個端點已經有導線，不需要重複接線。';
  if (wires.length >= 12) return '本課最多支援 12 條導線。請先刪除不需要的接線。';
  return null;
}
export function circuitReducer(state: CircuitState, action: CircuitAction): CircuitState {
  switch (action.type) {
    case 'pick': {
      if (!isTerminal(action.terminal)) return { ...state, notice: '無法選擇未知端點。' };
      if (state.pending === action.terminal) return { ...state, pending: null, notice: '已取消接線起點。' };
      if (!state.pending) return { ...state, pending: action.terminal, notice: `已選起點：${terminalLabel(action.terminal)}。請選擇終點。` };
      const error = wireError(state.wires, state.pending, action.terminal);
      if (error) return { ...state, pending: null, notice: error };
      return { ...state, pending: null, nextWire: state.nextWire + 1,
        wires: [...state.wires, { id: `wire-${state.nextWire}`, from: state.pending, to: action.terminal }], notice: '已新增一條導線。' };
    }
    case 'remove': return { ...state, wires: state.wires.filter(w => w.id !== action.id), pending: null, notice: '已刪除導線。' };
    case 'level': return { ...state, level: action.level, notice: `GPIO23 輸出已設為 ${action.level}。` };
    case 'example': return { ...state, wires: exampleWires(), pending: null, level: 'LOW', notice: '已載入正確接線範例，請使用輸出控制觀察 LED。' };
    case 'clear': return { ...initialCircuitState, nextWire: state.nextWire, notice: '已清空接線，輸出回到 LOW。' };
    case 'cancel': return { ...state, pending: null, notice: '已取消接線起點。' };
  }
}
export type CircuitCode = 'empty' | 'invalid' | 'unsupported' | 'short' | 'resistor_bypassed' | 'led_bypassed' | 'missing_resistor' | 'reversed' | 'open' | 'valid';
export interface CircuitAnalysis { code: CircuitCode; valid: boolean; lit: boolean; title: string; description: string }

/** Discrete rules for one GPIO23, one 220-ohm resistor and one LED. No analog solver. */
export function analyzeCircuit(wires: CircuitWire[], level: OutputLevel): CircuitAnalysis {
  const result = (code: CircuitCode, title: string, description: string): CircuitAnalysis => ({ code, valid: code === 'valid', lit: code === 'valid' && level === 'HIGH', title, description });
  if (!wires.length) return result('empty', '從第一條線開始', '先將 GPIO23 連到電阻 A 端，也可以載入範例再觀察。');
  const seen: CircuitWire[] = [];
  for (const wire of wires) {
    if (wireError(seen, wire.from, wire.to)) return result('invalid', '接線資料無效', '請移除未知、自連或重複的導線，再重新接線。');
    seen.push(wire);
  }
  const active = new Set(wires.flatMap(w => [w.from, w.to]));
  for (const id of active) {
    const pin = pinById.get(id);
    if (pin && pin.pinId !== lessonDefinition.source && pin.role !== 'ground') {
      const reason = pin.category === 'input' ? '此腳只能輸入，不能驅動 LED。' : pin.category === 'reserved' ? '此腳保留給 Flash，禁止接線。' : pin.role !== 'gpio' ? '這不是本課支援的 GPIO 輸出。' : '本課固定使用 GPIO23，其他 GPIO 尚未支援。';
      return result('unsupported', '使用了不支援的接腳', `${terminalLabel(id)}：${reason}`);
    }
  }
  const parent = new Map<string, string>();
  for (const id of [...pins.map(pin => pin.pinId), ...Object.keys(lessonDefinition.parts)]) parent.set(id, id);
  const root = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current)!;
    return current;
  };
  const union = (a: string, b: string) => parent.set(root(a), root(b));
  // Three distinct physical GND pins share one electrical reference.
  lessonDefinition.groundIds.forEach(id => union(id, 'J3-01'));
  wires.forEach(wire => union(wire.from, wire.to));
  const same = (a: string, b: string) => root(a) === root(b);
  const source = lessonDefinition.source, ground = 'J3-01';
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
  if (wire.from === lessonDefinition.source || wire.to === lessonDefinition.source) return '#079a76';
  return '#4385db';
}
