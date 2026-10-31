import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {analyzePicoCircuit,picoExamples,partsFor} from './circuit.ts';
import {picoCourses} from './courses.ts';
import {parsePython,PythonRuntime,PythonError,exportPython} from './language.ts';
import {picoKey,makePicoDraft,parsePicoDraft,picoDraftKey} from './storage.ts';
import {pythonCompletions} from './completion.ts';
import type {PicoLessonId} from './types.ts';
import type {CircuitWire} from '../circuit.ts';
const wire=(from:string,to:string,id=from+to):CircuitWire=>({id,from,to});
const external=picoExamples('external-led'),button=picoExamples('button-led');
for(const id of ['blink','external-led','button-led'] as PicoLessonId[])test(`${id}: reference exports valid Python and scaffold stays incomplete`,()=>{
 const course=picoCourses[id],result=exportPython(course.answer,id);assert.ok(result.code.endsWith(course.answer));assert.equal(result.filename,'main.py');const r=spawnSync('python3',['-c','import ast,sys;ast.parse(sys.stdin.read())'],{input:result.code,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.throws(()=>exportPython(course.scaffold,id),/尚未完成/);
});
test('GP15 external LED follows HIGH/LOW only through a valid series branch',()=>{assert.equal(analyzePicoCircuit(external,'external-led',true).lit,true);assert.equal(analyzePicoCircuit(external,'external-led',false).lit,false);const r=new PythonRuntime(parsePython(picoCourses['external-led'].answer,'external-led'));assert.equal(r.advanceTo(999).lit,true);assert.equal(r.advanceTo(1000).lit,false);assert.equal(r.advanceTo(2000).lit,true);});
test('all eight physical grounds are accepted independently',()=>{
 for(const ground of [3,8,13,18,23,28,33,38]){const wires=external.map(w=>w.to==='pico:18'?{...w,to:'pico:'+ground}:w);assert.equal(analyzePicoCircuit(wires,'external-led',true).valid,true);}
});
test('resistor orientation and placement before or after LED are supported',()=>{
 const reversed=external.map(w=>({id:w.id,from:w.from.replace('p-res:a','temp').replace('p-res:b','p-res:a').replace('temp','p-res:b'),to:w.to.replace('p-res:a','temp').replace('p-res:b','p-res:a').replace('temp','p-res:b')}));assert.ok(analyzePicoCircuit(reversed,'external-led',true).lit);
 const after=[wire('pico:20','p-led:a'),wire('p-led:k','p-res:b'),wire('p-res:a','pico:38')];assert.ok(analyzePicoCircuit(after,'external-led',true).lit);
});
test('missing resistor, reversed LED, opens and bypasses never light',()=>{
 const cases:[CircuitWire[],RegExp][]=[[[wire('pico:20','p-led:a'),wire('p-led:k','pico:18')],/缺少/],[external.map(w=>({...w,from:w.from==='p-led:k'?'p-led:a':w.from,to:w.to==='p-led:a'?'p-led:k':w.to})),/極性/],[external.slice(0,2),/未完成/],[[...external,wire('p-res:a','p-res:b')],/旁路/]];
 for(const [wires,re] of cases){const a=analyzePicoCircuit(wires,'external-led',true);assert.equal(a.lit,false);assert.equal(a.valid,false);assert.match(a.message,re);}
});
test('shorted GPIO, power terminals, unsupported GPIO and duplicates are diagnosed',()=>{
 for(const wires of [[...external,wire('pico:20','pico:18')],[...external,wire('pico:40','p-led:a')],[...external,wire('pico:1','p-led:a')],[...external,{...external[0],id:'duplicate'}]]){const a=analyzePicoCircuit(wires,'external-led',true);assert.equal(a.valid,false);assert.equal(a.lit,false);assert.equal(a.flowWires.length,0);}
});
test('button cross-side pull-up reads 1 released and 0 pressed; same-side never valid',()=>{
 assert.equal(analyzePicoCircuit(button,'button-led',false,false).input,1);assert.equal(analyzePicoCircuit(button,'button-led',false,true).input,0);
 const same=button.map(w=>w.from==='p-button:b1'?{...w,from:'p-button:a2'}:w),a=analyzePicoCircuit(same,'button-led',true,true);assert.equal(a.buttonValid,false);assert.equal(a.input,null);assert.match(a.message,/同側/);
});
test('either button terminal within a side and swapped A/B wiring work',()=>{
 const other=button.map(w=>({...w,from:w.from==='p-button:b1'?'p-button:b2':w.from,to:w.to==='p-button:a1'?'p-button:a2':w.to}));assert.equal(analyzePicoCircuit(other,'button-led',false,true).input,0);
 const swapped=button.map(w=>({...w,from:w.from==='p-button:b1'?'p-button:a1':w.from,to:w.to==='p-button:a1'?'p-button:b1':w.to}));assert.equal(analyzePicoCircuit(swapped,'button-led').input,1);
});
test('flow direction starts at GP15 and excludes button wires regardless of click order',()=>{
 const reversed=button.map(w=>({id:w.id,from:w.to,to:w.from})),a=analyzePicoCircuit(reversed,'button-led',true,true);assert.deepEqual(a.flowWires,['pico-example-0','pico-example-1','pico-example-2']);for(const id of a.flowWires)assert.equal(a.flowDirections?.[id],false);
});
test('button loop samples exactly at 20ms boundaries and preserves previous output while waiting',()=>{
 const r=new PythonRuntime(parsePython(picoCourses['button-led'].answer,'button-led'));assert.equal(r.advanceTo(0,1).lit,false);assert.equal(r.advanceTo(19,0).lit,false);assert.equal(r.advanceTo(20,0).lit,true);assert.equal(r.snapshot.lastRead,0);assert.equal(r.advanceTo(39,1).lit,true);assert.equal(r.advanceTo(40,1).lit,false);assert.equal(r.snapshot.lastRead,1);
});
test('button names may change; waiting inside both branches is valid',()=>{
 const source=picoCourses['button-led'].answer.replaceAll('button','switchInput').replaceAll('led','lamp').replace('        lamp.on()','        lamp.on()\n        time.sleep_ms(10)').replace('        lamp.off()','        lamp.off()\n        time.sleep_ms(10)').replace('    time.sleep_ms(20)\n','');const r=new PythonRuntime(parsePython(source,'button-led'));assert.equal(r.advanceTo(0,0).lit,true);assert.equal(r.advanceTo(10,1).lit,false);
});
test('every branch must wait; nested syntax, missing bodies and other conditions fail at source positions',()=>{
 const base=picoCourses['button-led'].answer;for(const source of [base.replace('    time.sleep_ms(20)',''),base.replace('        led.on()','        time.sleep_ms(20)').replace('    time.sleep_ms(20)',''),base.replace('        led.on()',''),base.replace('if button.value() == 0:','if button.value() > 0:'),base.replace('        led.on()','        if button.value() == 0:')])assert.throws(()=>parsePython(source,'button-led'),(e:unknown)=>e instanceof PythonError&&e.line>0&&e.column>0);
});
test('lesson-scoped pin declarations prevent wrong output, input writes and name conflicts',()=>{
 for(const source of [picoCourses['external-led'].answer.replace('Pin(15','Pin(14'),picoCourses['external-led'].answer.replace('15','"LED"')])assert.throws(()=>parsePython(source,'external-led'),PythonError);
 for(const source of [picoCourses['button-led'].answer.replace('led.on()','button.on()'),picoCourses['button-led'].answer.replace('button =','led ='),picoCourses['button-led'].answer.replace('Pin.PULL_UP','Pin.PULL_DOWN')])assert.throws(()=>parsePython(source,'button-led'),PythonError);
 assert.throws(()=>parsePython(picoCourses['button-led'].answer,'blink'),PythonError);
});
test('indeterminate button input is rejected when the branch is evaluated',()=>{const r=new PythonRuntime(parsePython(picoCourses['button-led'].answer,'button-led'));assert.throws(()=>r.advanceTo(0,null),/接線未確認/);});
test('export does not depend on simulated wiring and keeps learner timings/comments',()=>{const source=picoCourses['button-led'].answer.replace('20','37')+'# my comment\n',e=exportPython(source,'button-led');assert.ok(e.code.endsWith(source));assert.ok(e.code.includes('sleep_ms(37)'));assert.ok(e.code.includes('# my comment'));});
test('old blink JSON migrates without losing source; per-course keys and wire backups stay separate',()=>{
 const old={format:'pico-micropython-practice',version:1,boardId:'pico-2-w',lessonId:'blink',source:'unfinished',savedAt:'2026-10-31T00:00:00Z'};const upgraded=parsePicoDraft(JSON.stringify(old));assert.equal(upgraded.source,'unfinished');assert.deepEqual(upgraded.wires,[]);assert.equal(upgraded.backup,null);assert.equal(picoKey('blink'),picoDraftKey);assert.notEqual(picoKey('external-led'),picoKey('button-led'));
 const draft=makePicoDraft(picoCourses['button-led'].scaffold,'button-led',button,[]);assert.deepEqual(parsePicoDraft(JSON.stringify(draft)),draft);
});
test('JSON rejects foreign terminals, duplicate wires, wrong lesson backups and oversize wire sets',()=>{
 const draft=makePicoDraft('', 'external-led',external);for(const wires of [[wire('pico:20','p-button:a1')],[wire('pico:20','unknown')],[...external,{...external[0],id:'other'}],Array(13).fill(external[0])])assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,wires})),/接線/);
 assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,lessonId:'unknown'})),/格式/);assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,backup:[wire('pico:20','p-button:a1')]})),/接線/);assert.equal(Object.keys(partsFor('blink')).length,0);
});
test('completion follows output/input renames and exposes condition/input only for button lesson',()=>{
 const items=pythonCompletions(picoCourses['button-led'].answer.replaceAll('led','lamp').replaceAll('button','key'),'button-led');assert.ok(items.some(x=>x.label==='lamp.on'));assert.ok(items.some(x=>x.label==='key.value'));assert.ok(items.find(x=>x.label==='if')!.template.includes('key.value()'));assert.ok(!pythonCompletions(picoCourses['external-led'].answer,'external-led').some(x=>x.label==='if'));
});
