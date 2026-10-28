import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exampleWires,analyzeCircuit,currentPath,circuitReducer,initialCircuitState} from './circuit.ts';
import {lessons,readLesson} from './lessons.ts';
import {pinById} from './board.ts';
import {solutions} from './program/solutions.ts';
import {parseProgram} from './program/language.ts';
import {ProgramRuntime} from './program/runtime.ts';
import {scaffoldFor,suggestionsFor} from './program/completion.ts';
const wires=()=>exampleWires('traffic-light');
const analyze=(ws=wires(),r:'HIGH'|'LOW'='HIGH',y:'HIGH'|'LOW'='HIGH',g:'HIGH'|'LOW'='HIGH')=>analyzeCircuit(ws,r,'traffic-light',y,g);
test('traffic lesson uses three confirmed output pins and nine separate wires',()=>{
 assert.equal(readLesson('traffic-light'),'traffic-light');assert.deepEqual(lessons['traffic-light'].outputGPIOs,[23,22,21]);assert.equal(pinById.get('J3-06')?.gpio,21);assert.equal(wires().length,9);
 for(const r of ['LOW','HIGH'] as const)for(const y of ['LOW','HIGH'] as const)for(const g of ['LOW','HIGH'] as const){const result=analyze(wires(),r,y,g);assert.ok(result.valid);assert.deepEqual(result.channels?.map(c=>c.lit),[r==='HIGH',y==='HIGH',g==='HIGH']);}
});
test('traffic single-branch faults preserve healthy branches',()=>{
 assert.deepEqual(analyze(wires().filter(w=>w.id!=='example-8')).channels?.map(c=>c.lit),[true,true,false]);
 const reversed=wires().map(w=>w.id==='example-8'?{...w,to:'led3:k'}:w.id==='example-9'?{...w,from:'led3:a'}:w);assert.equal(analyze(reversed).channels?.[2].code,'reversed');assert.deepEqual(analyze(reversed).channels?.map(c=>c.lit),[true,true,false]);
 const missing=wires().filter(w=>!['example-7','example-8'].includes(w.id));missing.push({id:'direct',from:'J3-06',to:'led3:a'});assert.equal(analyze(missing).channels?.[2].code,'missing_resistor');
});
test('traffic shorts, shared resistor paths and unsupported pins block all current',()=>{
 for(const extra of [{id:'s',from:'J3-06',to:'J3-03'},{id:'s',from:'J3-06',to:'J3-01'},{id:'s',from:'resistor3:b',to:'resistor:b'},{id:'s',from:'J3-09',to:'led3:a'}]){const ws=[...wires(),extra];assert.deepEqual(analyze(ws).channels?.map(c=>c.lit),[false,false,false]);assert.deepEqual(currentPath(ws,'HIGH','traffic-light','HIGH','HIGH'),[]);}
});
test('traffic third channel current follows its physical wire and part IDs',()=>{
 const path=currentPath(wires(),'LOW','traffic-light','LOW','HIGH');assert.equal(path.length,5);assert.ok(path.some(p=>p.kind==='resistor'&&p.id==='resistor3'));assert.ok(path.some(p=>p.from==='J3-06'));assert.ok(!path.some(p=>p.id==='example-1'));
});
test('reference signal is red 3s, green 3s, yellow 1s and repeats at 7s',()=>{
 const runtime=new ProgramRuntime(parseProgram(solutions['traffic-light'].code,'traffic-light'));
 for(const [ms,expected] of [[0,['HIGH','LOW','LOW']],[2999,['HIGH','LOW','LOW']],[3000,['LOW','LOW','HIGH']],[5999,['LOW','LOW','HIGH']],[6000,['LOW','HIGH','LOW']],[6999,['LOW','HIGH','LOW']],[7000,['HIGH','LOW','LOW']]] as const){const state=runtime.advanceTo(ms);assert.deepEqual([23,22,21].map(g=>state.outputs[g]?.level),expected);}
});
test('traffic each output requires its own mode and old lessons still reject GPIO21',()=>{
 const code='void setup() { pinMode(23, OUTPUT); } void loop() { digitalWrite(21, HIGH); delay(10); }';assert.throws(()=>new ProgramRuntime(parseProgram(code,'traffic-light')).advanceTo(0),/pinMode\(21/);
 for(const lesson of ['blink','dual-led','button-led'] as const)assert.throws(()=>new ProgramRuntime(parseProgram('void setup() { pinMode(21, OUTPUT); } void loop() { delay(10); }',lesson)).advanceTo(0),/尚未接入/);
 assert.throws(()=>parseProgram('void setup() {} void loop() { if (1 == 1) { delay(1); } }','traffic-light'));
});
test('traffic scaffold has no answer and completion only exposes supported output grammar',()=>{
 assert.ok(!scaffoldFor('traffic-light').includes('digitalWrite('));const choices=suggestionsFor('traffic-light');assert.ok(choices.find(s=>s.label==='pinMode')?.detail.includes('GPIO21'));assert.ok(!choices.some(s=>s.label==='digitalRead'||s.label==='if'));
});
test('traffic sample hide restores original wiring and clears all manual levels',()=>{
 let state=circuitReducer(initialCircuitState,{type:'lesson',lessonId:'traffic-light'});state=circuitReducer(state,{type:'example'});assert.equal(state.wires.length,9);state=circuitReducer(state,{type:'level',gpio:21,level:'HIGH'});assert.equal(state.level3,'HIGH');state=circuitReducer(state,{type:'example'});assert.deepEqual(state.wires,[]);assert.equal(state.level3,'LOW');assert.equal(state.exampleBackup,null);
});
test('traffic ground alternatives and resistor reversal retain valid series paths',()=>{
 for(const ground of ['J3-01','J3-07','J2-14']){const ws=wires().map(w=>w.id==='example-7'?{...w,to:'resistor3:b'}:w.id==='example-8'?{...w,from:'resistor3:a'}:w.id==='example-9'?{...w,to:ground}:w);assert.ok(analyze(ws).valid);}
 const ws=wires().map(w=>w.id==='example-7'?{...w,to:'led3:a'}:w.id==='example-8'?{...w,from:'led3:k',to:'resistor3:a'}:w.id==='example-9'?{...w,from:'resistor3:b'}:w);assert.ok(analyze(ws).valid);
});
