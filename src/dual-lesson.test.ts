import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProgram,ProgramError} from './program/language.ts';
import {ProgramRuntime} from './program/runtime.ts';
import {solutions} from './program/solutions.ts';
import {analyzeCircuit,exampleWires,currentPath,circuitReducer,initialCircuitState,terminalLabel} from './circuit.ts';
import {readLesson} from './lessons.ts';
import {scaffoldFor,suggestionsFor} from './program/completion.ts';
const wires=()=>exampleWires('dual-led');
const analyze=(w= wires(),a:'HIGH'|'LOW'='HIGH',b:'HIGH'|'LOW'='HIGH')=>analyzeCircuit(w,a,'dual-led',b);
test('dual lesson URL, six wires, distinct terminal labels and clean reset',()=>{
 assert.equal(readLesson('dual-led'),'dual-led');assert.equal(wires().length,6);assert.match(terminalLabel('led:a','dual-led'),/LED 1/);assert.match(terminalLabel('led2:a','dual-led'),/LED 2/);
 let state=circuitReducer(initialCircuitState,{type:'lesson',lessonId:'dual-led'});state=circuitReducer(state,{type:'example'});state=circuitReducer(state,{type:'level',gpio:22,level:'HIGH'});assert.equal(state.level,'LOW');assert.equal(state.level2,'HIGH');state=circuitReducer(state,{type:'example'});assert.equal(state.level2,'LOW');state=circuitReducer(state,{type:'clear'});assert.equal(state.wires.length,0);assert.equal(state.lessonId,'dual-led');
});
test('two independently valid branches show all four output combinations and any ground',()=>{
 for(const ground of ['J3-01','J3-07','J2-14'])for(const first of ['HIGH','LOW'] as const)for(const second of ['HIGH','LOW'] as const){const circuit=wires().map(w=>w.id==='example-6'?{...w,to:ground}:w),result=analyze(circuit,first,second);assert.ok(result.valid);assert.deepEqual(result.channels?.map(c=>c.lit),[first==='HIGH',second==='HIGH']);}
});
test('one open, reversed or resistor-less branch never borrows the other channel',()=>{
 const open=wires().filter(w=>w.id!=='example-5');assert.deepEqual(analyze(open).channels?.map(c=>c.lit),[true,false]);
 const reverse=wires().map(w=>w.id==='example-5'?{...w,to:'led2:k'}:w.id==='example-6'?{...w,from:'led2:a'}:w);assert.equal(analyze(reverse).channels?.[1].code,'reversed');assert.equal(analyze(reverse).channels?.[0].lit,true);
 const missing=[...wires().filter(w=>!['example-4','example-5'].includes(w.id)),{id:'direct',from:'J3-03',to:'led2:a'}];assert.equal(analyze(missing).channels?.[1].code,'missing_resistor');assert.equal(analyze(missing).channels?.[0].lit,true);
 const firstOpen=wires().filter(w=>w.id!=='example-2');assert.deepEqual(analyze(firstOpen).channels?.map(c=>c.lit),[false,true]);
});
test('crossed outputs, grounded outputs, shared resistor and illegal pins are explicit global faults',()=>{
 for(const [from,to] of [['J3-02','J3-03'],['J3-03','J3-01'],['resistor:b','led2:a'],['resistor:a','resistor2:a'],['J3-02','J3-08']]){const result=analyze([...wires(),{id:'bad',from,to}]);assert.equal(result.valid,false);assert.deepEqual(result.channels?.map(c=>c.lit),[false,false]);}
});
test('resistor orientation and placement remain unpolarized and wire direction independent',()=>{
 const reversed=wires().map(w=>({...w,from:w.to,to:w.from}));assert.ok(analyze(reversed).valid);
 const after=wires().map(w=>w.id==='example-4'?{...w,to:'led2:a'}:w.id==='example-5'?{...w,from:'led2:k',to:'resistor2:b'}:w.id==='example-6'?{...w,from:'resistor2:a'}:w);assert.ok(analyze(after).valid);
});
test('current only follows the lit channel, including second-only flow with correct IDs',()=>{
 const first=currentPath(wires(),'HIGH','dual-led','LOW');assert.ok(first.some(s=>s.id==='led'));assert.ok(!first.some(s=>s.id==='led2'||s.from==='J3-03'));
 const second=currentPath(wires(),'LOW','dual-led','HIGH');assert.ok(second.some(s=>s.id==='led2'&&s.from==='led2:a'));assert.ok(second.some(s=>s.from==='J3-03'));assert.ok(!second.some(s=>s.id==='led'));
 assert.equal(currentPath([...wires(),{id:'cross',from:'J3-03',to:'J3-02'}],'HIGH','dual-led','HIGH').length,0);
});
test('published dual answer alternates at exact timestamps and has per-GPIO trace',()=>{
 const runtime=new ProgramRuntime(parseProgram(solutions['dual-led'].code,'dual-led'));
 for(const [time,a,b] of [[0,'HIGH','LOW'],[999,'HIGH','LOW'],[1000,'LOW','HIGH'],[1999,'LOW','HIGH'],[2000,'HIGH','LOW']] as const){const snapshot=runtime.advanceTo(time);assert.equal(snapshot.outputs[23].level,a);assert.equal(snapshot.outputs[22].level,b);assert.equal(snapshot.outputs[22].enabled,true);assert.equal(snapshot.level,a);}
 assert.deepEqual(new Set(runtime.snapshot().trace.map(t=>t.gpio)),new Set([23,22]));
});
test('each GPIO requires its own OUTPUT; unsupported output and old lessons reject GPIO22',()=>{
 const src=(setup:string,body:string)=>`void setup(){${setup}} void loop(){${body} delay(100);}`;
 assert.throws(()=>new ProgramRuntime(parseProgram(src('pinMode(23,OUTPUT);','digitalWrite(22,HIGH);'),'dual-led')).advanceTo(0),/pinMode\(22/);
 for(const lesson of ['blink','button-led'] as const)assert.throws(()=>new ProgramRuntime(parseProgram(src('pinMode(22,OUTPUT);',''),lesson)).advanceTo(0),/只支援 GPIO23/);
 assert.throws(()=>new ProgramRuntime(parseProgram(src('pinMode(21,OUTPUT);',''),'dual-led')).advanceTo(0),/GPIO23、GPIO22/);
 assert.throws(()=>parseProgram(src('','if(1==1){}'),'dual-led'),ProgramError);
});
test('independent writes persist across delay, snapshots cannot mutate internal outputs',()=>{
 const runtime=new ProgramRuntime(parseProgram('void setup(){pinMode(23,OUTPUT);pinMode(22,OUTPUT);}void loop(){digitalWrite(22,HIGH);delay(100);}','dual-led'));const snapshot=runtime.advanceTo(0);assert.equal(snapshot.level,'LOW');assert.equal(snapshot.outputs[22].level,'HIGH');snapshot.outputs[22].level='LOW';assert.equal(runtime.snapshot().outputs[22].level,'HIGH');assert.equal(runtime.advanceTo(99).outputs[22].level,'HIGH');
});
test('dual exercise keeps a blank scaffold and the original output-only grammar suggestions',()=>{
 assert.equal(parseProgram(scaffoldFor('dual-led'),'dual-led').loop.length,0);assert.ok(!scaffoldFor('dual-led').includes('digitalWrite('));assert.ok(!suggestionsFor('dual-led').some(s=>s.label==='digitalRead'||s.label==='if'));assert.ok(suggestionsFor('dual-led').find(s=>s.label==='digitalWrite')?.detail.includes('GPIO22'));
});
