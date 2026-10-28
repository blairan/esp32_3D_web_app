import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readLesson,lessons} from './lessons.ts';
import {pinById} from './board.ts';
import {analyzeCircuit,analyzeButton,currentPath,exampleWires,circuitReducer,initialCircuitState} from './circuit.ts';
import {parseProgram} from './program/language.ts';
import {ProgramRuntime} from './program/runtime.ts';
import {solutions} from './program/solutions.ts';
import {scaffoldFor,suggestionsFor} from './program/completion.ts';
const buzzer=()=>exampleWires('buzzer-doorbell');
const analyze=(w=buzzer(),level:'HIGH'|'LOW'='HIGH')=>analyzeCircuit(w,level,'buzzer-doorbell');
const program=(body:string,setup='pinMode(23, OUTPUT);')=>`void setup() { ${setup} } void loop() { ${body} delay(30); }`;
function advance(r:ProgramRuntime,ms:number){while(r.snapshot().timeMs+50<ms)r.advanceTo(r.snapshot().timeMs+50);return r.advanceTo(ms);}
test('buzzer uses confirmed 3V3 and signal pin with five wires and no naked load',()=>{
 assert.equal(readLesson('buzzer-doorbell'),'buzzer-doorbell');assert.equal(pinById.get('J2-01')?.silkscreen,'3V3');assert.equal(buzzer().length,5);assert.ok(!Object.keys(lessons['buzzer-doorbell'].parts).includes('led:a'));assert.ok(analyze().lit);assert.ok(!analyze(buzzer(),'LOW').lit);assert.equal(analyzeButton(buzzer(),true,'buzzer-doorbell').level,'LOW');assert.equal(analyzeButton(buzzer(),false,'buzzer-doorbell').level,'HIGH');
});
test('buzzer power, ground or signal open and swapped terminals block sound',()=>{
 for(const id of ['example-1','example-2','example-3'])assert.ok(!analyze(buzzer().filter(w=>w.id!==id)).lit);
 const swapped=buzzer().map(w=>w.id==='example-1'?{...w,to:'buzzer:vcc'}:w.id==='example-2'?{...w,to:'buzzer:s'}:w);assert.ok(!analyze(swapped).valid);
});
test('buzzer supply shorts, wrong supply and control cross-wiring are diagnosed',()=>{
 for(const w of [{id:'bad',from:'J2-01',to:'J3-07'},{id:'bad',from:'J3-02',to:'J2-01'},{id:'bad',from:'J3-09',to:'buzzer:s'},{id:'bad',from:'button:b2',to:'buzzer:vcc'}])assert.ok(!analyze([...buzzer(),w]).valid);
 assert.ok(!analyze(buzzer().map(w=>w.id==='example-2'?{...w,from:'J2-19'}:w)).valid);
});
test('buzzer current indication is on module supply wires, not a GPIO load model',()=>{
 const path=currentPath(buzzer(),'HIGH','buzzer-doorbell');assert.deepEqual(path.map(p=>p.id),['example-2','example-3']);assert.equal(path[0].from,'J2-01');assert.deepEqual(currentPath(buzzer(),'LOW','buzzer-doorbell'),[]);
 const reversed=buzzer().map(w=>({...w,from:w.to,to:w.from}));const reverse=currentPath(reversed,'HIGH','buzzer-doorbell');assert.equal(reverse[0].from,'J2-01');assert.equal(reverse[1].to,'J3-07');
});
test('buzzer reference follows actual input on 20ms poll without tone support',()=>{
 const r=new ProgramRuntime(parseProgram(solutions['buzzer-doorbell'].code,'buzzer-doorbell'));assert.equal(r.advanceTo(0).level,'LOW');r.setInput('LOW');assert.equal(r.advanceTo(19).level,'LOW');assert.equal(r.advanceTo(20).level,'HIGH');r.setInput('HIGH');assert.equal(r.advanceTo(40).level,'LOW');assert.throws(()=>parseProgram(program('tone(23, 2000);'),'buzzer-doorbell'));
});
test('PWM writes 0 128 and 255 independently of integer HIGH/LOW output',()=>{
 assert.equal(readLesson('pwm-breathing'),'pwm-breathing');for(const duty of [0,1,128,255]){const r=new ProgramRuntime(parseProgram(program(`analogWrite(23, ${duty});`),'pwm-breathing'));const snap=r.advanceTo(0);assert.equal(snap.outputs[23].duty,duty);assert.equal(snap.level,duty?'HIGH':'LOW');assert.equal(snap.trace[0].duty,duty);}
});
test('PWM rejects duty overflow, uninitialized mode, reserved/input/other GPIO',()=>{
 for(const duty of [-1,256,2147483647])assert.throws(()=>new ProgramRuntime(parseProgram(program(`analogWrite(23, ${duty});`),'pwm-breathing')).advanceTo(0),/0 到 255/);
 assert.throws(()=>new ProgramRuntime(parseProgram(program('analogWrite(23, 128);',''),'pwm-breathing')).advanceTo(0),/pinMode/);
 for(const gpio of [22,6,34])assert.throws(()=>new ProgramRuntime(parseProgram(program(`analogWrite(${gpio}, 128);`,`pinMode(${gpio}, OUTPUT);`),'pwm-breathing')).advanceTo(0));
});
test('PWM output follows 0 to 255 to 0 ramp at reference virtual times',()=>{
 const r=new ProgramRuntime(parseProgram(solutions['pwm-breathing'].code,'pwm-breathing'));
 for(const [ms,duty] of [[0,0],[30,5],[1500,250],[1530,255],[1560,250],[3030,5],[3060,0],[3090,5]])assert.equal(advance(r,ms).outputs[23].duty,duty);
});
test('PWM shares validated LED graph and manual duty resets when example hides',()=>{
 const wires=exampleWires('pwm-breathing');assert.equal(wires.length,3);assert.ok(analyzeCircuit(wires,'HIGH','pwm-breathing').lit);assert.ok(!analyzeCircuit(wires.slice(0,2),'HIGH','pwm-breathing').lit);
 let state=circuitReducer(initialCircuitState,{type:'lesson',lessonId:'pwm-breathing'});state=circuitReducer(state,{type:'example'});state=circuitReducer(state,{type:'duty',duty:128});assert.equal(state.duty,128);assert.equal(circuitReducer(state,{type:'duty',duty:256}).duty,128);state=circuitReducer(state,{type:'example'});assert.equal(state.duty,0);assert.deepEqual(state.wires,[]);
});
test('new lesson syntax is scoped and editor starts without full solution',()=>{
 for(const id of ['blink','button-led','dual-led','traffic-light','button-toggle','button-counter','buzzer-doorbell'] as const)assert.throws(()=>parseProgram(program('analogWrite(23,128);'),id));
 assert.throws(()=>parseProgram(program('int input = digitalRead(18);'),'pwm-breathing'));assert.throws(()=>parseProgram(program('ledcWrite(23,128);'),'pwm-breathing'));
 for(const id of ['buzzer-doorbell','pwm-breathing'] as const){assert.ok(!scaffoldFor(id).includes('digitalWrite('));assert.ok(!scaffoldFor(id).includes('analogWrite('));}
 assert.ok(suggestionsFor('pwm-breathing').some(s=>s.label==='analogWrite'));assert.ok(!suggestionsFor('buzzer-doorbell').some(s=>s.label==='analogWrite'));
});
