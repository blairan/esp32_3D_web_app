import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readLesson} from './lessons.ts';
import {analyzeCircuit,analyzeButton,exampleWires,circuitReducer,initialCircuitState,currentPath} from './circuit.ts';
import {parseProgram,ProgramError,limits} from './program/language.ts';
import {ProgramRuntime} from './program/runtime.ts';
import {suggestionsFor,scaffoldFor,declaredVariables} from './program/completion.ts';
const wires=()=>exampleWires('button-led');
const setup='pinMode(23, OUTPUT); pinMode(18, INPUT_PULLUP);';
const code=(body:string,init=setup)=>`void setup(){${init}} void loop(){${body}}`;
const program=(body:string,init=setup)=>parseProgram(code(body,init),'button-led');
const body='if (digitalRead(18) == LOW) {digitalWrite(23,HIGH);} else {digitalWrite(23,LOW);} delay(50);';
test('lesson URLs and reducers retain backward defaults and isolate parts',()=>{
 assert.equal(readLesson(null),'blink');assert.equal(readLesson('unknown'),'blink');assert.equal(readLesson('button-led'),'button-led');
 let state=circuitReducer(initialCircuitState,{type:'lesson',lessonId:'button-led'});state=circuitReducer(state,{type:'example'});assert.equal(state.wires.length,5);
 state=circuitReducer(state,{type:'clear'});assert.equal(state.lessonId,'button-led');assert.equal(state.wires.length,0);
 assert.equal(circuitReducer(initialCircuitState,{type:'pick',terminal:'button:a1'}).pending,null);
});
test('proper pull-up button reads HIGH released and LOW pressed with any ground and paired legs',()=>{
 for(const ground of ['J3-01','J3-07','J2-14'])for(const a of ['a1','a2'])for(const b of ['b1','b2']){
  const circuit=[...wires().slice(0,3),{id:'input',from:'J3-09',to:'button:'+a},{id:'ground',from:'button:'+b,to:ground}];
  assert.equal(analyzeButton(circuit,false).level,'HIGH');assert.equal(analyzeButton(circuit,true).level,'LOW');assert.equal(analyzeButton(circuit,false).code,'ready');
  assert.equal(analyzeCircuit(circuit,'HIGH','button-led').lit,true);
 }
});
test('open pull-up, direct grounding and same-side mistakes have deterministic diagnostics',()=>{
 assert.equal(analyzeButton(wires().slice(0,4),true).code,'open');assert.equal(analyzeButton([],true).level,'HIGH');
 const direct=[...wires(),{id:'bypass',from:'J3-09',to:'J3-07'}];assert.equal(analyzeButton(direct,false).code,'grounded');assert.equal(analyzeButton(direct,false).level,'LOW');
 const same=wires().map(w=>w.id==='example-5'?{...w,from:'button:a2'}:w);assert.equal(analyzeButton(same,false).code,'grounded');
});
test('unsafe input crosses and illegal pins never guess a level or light LED',()=>{
 for(const end of ['J3-02','J2-01','resistor:a','led:a','J3-08']){
  const circuit=[...wires(),{id:'bad',from:'J3-09',to:end}];assert.equal(analyzeButton(circuit,false).level,null,end);assert.equal(analyzeCircuit(circuit,'HIGH','button-led').lit,false,end);
 }
 const pressedFault=[...wires().slice(0,4),{id:'bad',from:'button:b1',to:'J3-02'}];assert.equal(analyzeButton(pressedFault,false).level,null);
});
test('new input wiring does not weaken LED protection or add imaginary input current effects',()=>{
 const circuit=wires();assert.equal(currentPath(circuit,'HIGH','button-led').filter(s=>s.id==='example-4'||s.id==='example-5').length,0);
 assert.equal(currentPath(circuit,'LOW','button-led').length,0);
 assert.equal(analyzeCircuit(circuit.map(w=>w.id==='example-2'?{...w,to:'led:k'}:w.id==='example-3'?{...w,from:'led:a'}:w),'HIGH','button-led').code,'reversed');
 assert.equal(analyzeCircuit([...circuit,{id:'short',from:'J3-02',to:'J3-01'}],'HIGH','button-led').lit,false);
});
test('direct digitalRead condition responds only on the next scheduled read',()=>{
 const runtime=new ProgramRuntime(program(body),'HIGH');assert.equal(runtime.advanceTo(0).level,'LOW');runtime.setInput('LOW');assert.equal(runtime.advanceTo(49).level,'LOW');assert.equal(runtime.advanceTo(50).level,'HIGH');runtime.setInput('HIGH');assert.equal(runtime.advanceTo(100).level,'LOW');assert.equal(runtime.snapshot().lastRead,'HIGH');assert.equal(runtime.snapshot().inputEnabled,true);
});
test('input variables, constants and != comparisons work without reassignment',()=>{
 const runtime=new ProgramRuntime(program('int state=digitalRead(18); if (state != HIGH) {digitalWrite(23,HIGH);} else {digitalWrite(23,LOW);} delay(10);'),'LOW');assert.equal(runtime.advanceTo(0).level,'HIGH');runtime.setInput('HIGH');assert.equal(runtime.advanceTo(10).level,'LOW');
 const constant=new ProgramRuntime(program('if (1 == HIGH) {digitalWrite(23,HIGH);} delay(10);'));assert.equal(constant.advanceTo(0).level,'HIGH');
});
test('branches resume after delay with correct block scope and fresh loop locals',()=>{
 const runtime=new ProgramRuntime(program('int wait=10; if (digitalRead(18)==LOW) {int wait=20; digitalWrite(23,HIGH); delay(wait); digitalWrite(23,LOW);} else {delay(wait);} delay(10);'),'LOW');assert.equal(runtime.advanceTo(19).level,'HIGH');assert.equal(runtime.advanceTo(20).level,'LOW');assert.equal(runtime.advanceTo(30).level,'HIGH');
 assert.throws(()=>new ProgramRuntime(program('if (1==1) {int hidden=1;} delay(hidden);')).advanceTo(0),/未知變數/);
});
test('input pin mode, output-only pin and indeterminate input fail with locations',()=>{
 assert.throws(()=>new ProgramRuntime(program(body,'pinMode(23,OUTPUT);')).advanceTo(0),/INPUT_PULLUP/);
 for(const statement of ['pinMode(18,OUTPUT);','pinMode(23,INPUT_PULLUP);','pinMode(34,INPUT_PULLUP);'])assert.throws(()=>new ProgramRuntime(program('delay(50);',statement)).advanceTo(0),ProgramError);
 assert.throws(()=>new ProgramRuntime(program(body),null).advanceTo(0),/無法判定/);
 assert.throws(()=>new ProgramRuntime(program('int value=digitalRead(19); delay(10);')).advanceTo(0),/GPIO18/);
 assert.throws(()=>new ProgramRuntime(parseProgram('int pin=18;'+code('int pin=digitalRead(pin);delay(50);'),'button-led')).advanceTo(0),/自己的初始值/);
});
test('new grammar rejects nested branches, else-if, arithmetic, assignment and unsupported reads',()=>{
 for(const text of ['if(1==1){if(1==1){delay(1);}}','if(1==1){} else if(1==1){}','if(1==1 && 2==2){}','if(1>0){}','if(1=1){}','int x=0;x=1;','delay(digitalRead(18));','digitalRead(18);'])assert.throws(()=>program(text),ProgramError,text);
 assert.throws(()=>parseProgram('int value=digitalRead(18);'+code(body),'button-led'),ProgramError);
 assert.throws(()=>parseProgram(code(body,'pinMode(23,OUTPUT);')),/不支援 if/);
 assert.throws(()=>parseProgram(code('delay(50);')),/OUTPUT/);
});
test('each actually executed loop path must wait and all branch statements consume budgets',()=>{
 const source=program('if(digitalRead(18)==LOW){delay(1);}');assert.throws(()=>new ProgramRuntime(source,'HIGH').advanceTo(0),/正值 delay/);
 assert.throws(()=>new ProgramRuntime(program('if(1==1){delay(0);}')).advanceTo(0),/正值 delay/);
 assert.throws(()=>new ProgramRuntime(program('if(1==1){delay(1);}')).advanceTo(10000),/預算/);
 assert.throws(()=>program('if(1==1){'+'delay(1);'.repeat(limits.statements)+'}'),/陳述/);
});
test('button exercise keeps empty scaffold and lesson-scoped suggestions and variables',()=>{
 assert.ok(!scaffoldFor('button-led').includes('digitalRead('));assert.ok(!suggestionsFor('blink').some(s=>s.label==='digitalRead'));
 for(const name of ['digitalRead','INPUT_PULLUP','if'])assert.ok(suggestionsFor('button-led').some(s=>s.label===name));
 assert.deepEqual(declaredVariables('int pin=18; void loop(){int state=1;if(state==1){int local=1;} '),['pin','state']);
});
