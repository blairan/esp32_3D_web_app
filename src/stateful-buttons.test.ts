import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProgram} from './program/language.ts';
import {ProgramRuntime} from './program/runtime.ts';
import {solutions} from './program/solutions.ts';
import {lessons,readLesson} from './lessons.ts';
import {exampleWires,analyzeCircuit,analyzeButton,circuitReducer,initialCircuitState} from './circuit.ts';
import {suggestionsFor,scaffoldFor} from './program/completion.ts';
const ids=['button-toggle','button-counter'] as const;
function runtime(id:typeof ids[number]){return new ProgramRuntime(parseProgram(solutions[id].code,id));}
function advance(r:ProgramRuntime,time:number){while(r.snapshot().timeMs+50<time)r.advanceTo(r.snapshot().timeMs+50);return r.advanceTo(time);}
function at(r:ProgramRuntime,time:number,input:'HIGH'|'LOW'){advance(r,time-1);r.setInput(input);return advance(r,time);}
function program(loop:string,globals='',setup=''){return `int value = 0; ${globals} void setup() { ${setup} } void loop() { ${loop} delay(10); }`;}
test('new button lessons keep GPIO18 input, GPIO23 output and five valid wires',()=>{
 for(const id of ids){assert.equal(readLesson(id),id);assert.equal(lessons[id].inputGPIO,18);const wires=exampleWires(id);assert.equal(wires.length,5);assert.ok(analyzeCircuit(wires,'HIGH',id).lit);assert.equal(analyzeButton(wires,true).level,'LOW');assert.equal(analyzeButton(wires,false).level,'HIGH');let state=circuitReducer(initialCircuitState,{type:'lesson',lessonId:id});state=circuitReducer(state,{type:'example'});assert.equal(state.wires.length,5);state=circuitReducer(state,{type:'example'});assert.deepEqual(state.wires,[]);}
});
test('50ms stable press toggles once; holding/releasing keeps LED and next press toggles off',()=>{
 const r=runtime('button-toggle');advance(r,100);r.setInput('LOW');assert.equal(advance(r,110).level,'LOW');assert.equal(advance(r,159).level,'LOW');assert.equal(advance(r,160).level,'HIGH');assert.equal(advance(r,800).level,'HIGH');r.setInput('HIGH');assert.equal(advance(r,900).level,'HIGH');r.setInput('LOW');assert.equal(advance(r,960).level,'LOW');
});
test('counter counts stable falling edges only, not loop iterations or release',()=>{
 const r=runtime('button-counter');assert.equal(advance(r,100).variables.count,0);r.setInput('LOW');assert.equal(advance(r,160).variables.count,1);assert.equal(advance(r,900).variables.count,1);r.setInput('HIGH');assert.equal(advance(r,1000).variables.count,1);r.setInput('LOW');assert.equal(advance(r,1060).variables.count,2);assert.equal(advance(r,1600).variables.count,2);
});
test('press and release bounce reset stable timer; short taps do not trigger',()=>{
 for(const id of ids){const r=runtime(id);advance(r,0);for(const [time,input] of [[10,'LOW'],[30,'HIGH'],[50,'LOW'],[70,'HIGH'],[90,'LOW']] as const){at(r,time,input);}
 assert.equal(advance(r,139).variables[id==='button-toggle'?'ledState':'count'],0);assert.equal(advance(r,140).variables[id==='button-toggle'?'ledState':'count'],1);
 for(const [time,input] of [[160,'HIGH'],[180,'LOW'],[200,'HIGH']] as const){at(r,time,input);}advance(r,250);r.setInput('LOW');advance(r,260);r.setInput('HIGH');assert.equal(advance(r,400).variables[id==='button-toggle'?'ledState':'count'],1);}
});
test('new execution starts at zero; snapshot is detached; virtual time advances only on request',()=>{
 const r=runtime('button-counter');r.setInput('LOW');const snap=advance(r,60);assert.equal(snap.variables.count,1);snap.variables.count=99;assert.equal(r.snapshot().variables.count,1);assert.equal(r.snapshot().timeMs,60);assert.equal(runtime('button-counter').advanceTo(0).variables.count,0);
});
test('assignment resolves nearest scope and globals persist across loop iterations',()=>{
 const r=new ProgramRuntime(parseProgram(program('value = value + 1; if (value >= 2) { int local = 8; local = local - 1; }'),'button-counter'));assert.equal(advance(r,20).variables.value,3);
 const shadow=new ProgramRuntime(parseProgram(program('if (1 == 1) { int value = 5; value = value + 1; } value = value + 1;'),'button-counter'));assert.equal(shadow.advanceTo(0).variables.value,1);
});
test('runtime rejects unknown assignment, self-reference, overflow and invalid output level',()=>{
 for(const body of ['missing = 1;','value = 2147483647 + 1;','int local = local + 1;','if (1 == 1) { int value = value + 1; }'])assert.throws(()=>new ProgramRuntime(parseProgram(program(body),'button-toggle')).advanceTo(0));
 assert.throws(()=>new ProgramRuntime(parseProgram(program('digitalWrite(23, 2);','','pinMode(23, OUTPUT);'),'button-toggle')).advanceTo(0),/0／1/);
});
test('millis returns virtual time; subtraction and comparisons obey boundaries',()=>{
 const r=new ProgramRuntime(parseProgram(program('value = millis(); if (value - 10 >= 10) { value = value + 1; }'),'button-counter'));assert.equal(advance(r,19).variables.value,10);assert.equal(advance(r,20).variables.value,21);
 for(const [op,result] of [['>',false],['<',false],['>=',true],['<=',true],['==',true],['!=',false]] as const){const rt=new ProgramRuntime(parseProgram(program(`if (1 ${op} 1) { value = 1; }`),'button-toggle'));assert.equal(rt.advanceTo(0).variables.value,result?1:0);}
});
test('advanced grammar is bounded and old lessons reject the new forms',()=>{
 for(const id of ['blink','button-led','dual-led','traffic-light'] as const){for(const body of ['value = 1;','int now = millis();','int sum = 1 + 2;'])assert.throws(()=>parseProgram(program(body),id));}
 for(const body of ['value++;','value = 1--2;','value = 2 * 3;','if (1 == 1 && 2 == 2) {}','while (1) {}','value = (1 + 2);','if (1 == 1) {} else if (1 == 1) {}',`value = ${Array(33).fill('1').join(' + ')};`, 'if (1 == 1) {'.repeat(5)+'delay(10);'+'}'.repeat(5)])assert.throws(()=>parseProgram(program(body),'button-toggle'));
 assert.throws(()=>new ProgramRuntime(parseProgram('void setup() {} void loop() { int now = millis(); }','button-toggle')).advanceTo(0),/正值 delay/);
});
test('new exercise scaffold stays blank; completion offers millis only to advanced lessons',()=>{
 for(const id of ids){assert.ok(!scaffoldFor(id).includes('digitalWrite('));assert.ok(!scaffoldFor(id).includes('count ='));assert.ok(suggestionsFor(id).some(s=>s.label==='millis'));}
 assert.ok(!suggestionsFor('button-led').some(s=>s.label==='millis'));
});
