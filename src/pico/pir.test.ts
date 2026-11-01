import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {picoCourses} from './courses.ts';
import {parsePython,PythonRuntime,PythonError,exportPython} from './language.ts';
import {picoExamples,analyzePicoCircuit,partsFor} from './circuit.ts';
import {picoKey,makePicoDraft,parsePicoDraft} from './storage.ts';
import {pythonCompletions} from './completion.ts';
const id='pir-led',course=picoCourses[id],wires=picoExamples(id);
const run=(source=course.answer)=>new PythonRuntime(parsePython(source,id));
test('PIR samples HIGH as activity and LOW as no activity at the learner interval',()=>{
 const r=run();assert.equal(r.advanceTo(0,0).lit,false);const waiting=r.advanceTo(49,1);assert.equal(waiting.lastRead,0);assert.equal(waiting.lit,false);assert.equal(r.advanceTo(50,1).lit,true);assert.equal(r.advanceTo(99,0).lastRead,1);const off=r.advanceTo(100,0);assert.equal(off.lastRead,0);assert.equal(off.lit,false);assert.equal(off.frequency,null);assert.equal(off.lastAnalogRead,null);assert.ok(off.waveform.events.some(e=>e.timeMs===50&&e.kind==='digital'&&e.value===1));
});
test('PIR follows the learner condition, output order, object names and waiting interval',()=>{
 const source=course.answer.replaceAll('led','lamp').replaceAll('pir','sensor').replace('== 1','== 0').replace('50','75');const r=run(source);assert.equal(r.advanceTo(0,0).lit,true);assert.equal(r.advanceTo(74,1).lit,true);assert.equal(r.advanceTo(75,1).lit,false);assert.equal(parsePython(source,id).buttonName,'sensor');
});
test('PIR requires Pin.IN while button retains PULL_UP and its active-low input',()=>{
 assert.throws(()=>parsePython(course.answer.replace('Pin(14, Pin.IN)','Pin(14, Pin.IN, Pin.PULL_UP)'),id),/PULL_UP/);
 assert.throws(()=>parsePython(picoCourses['button-led'].answer.replace(', Pin.PULL_UP',''),'button-led'),/輸入模式/);
 for(const lesson of ['blink','external-led','button-led','pwm-breathing','pot-dimming','ldr-nightlight'] as const)assert.throws(()=>parsePython(course.answer,lesson),PythonError);
 const button=analyzePicoCircuit(picoExamples('button-led'),'button-led',false,true);assert.equal(button.input,0);
});
test('PIR scaffolds, wrong GPIO, missing input, wrong names and unsupported APIs report locations',()=>{
 for(const source of [course.scaffold,course.answer.replace('Pin(14','Pin(19'),course.answer.replace('pir = Pin(14, Pin.IN)\n',''),course.answer.replace('pir.value()','other.value()'),course.answer.replace('led.on()','pir.on()'),course.answer.replace('pir = Pin','led = Pin'),course.answer.replace('led.on()','led.duty_u16(1000)'),course.answer.replace('pir.value()','pir.read_u16()'),course.answer.replace('== 1','> 0')])assert.throws(()=>exportPython(source,id),(e:unknown)=>e instanceof PythonError&&e.line>0&&e.column>0);
 assert.throws(()=>run().advanceTo(0,null),/PIR接線/);
});
test('PIR branches still require a positive wait on every path and prohibit nested loops',()=>{
 assert.throws(()=>parsePython(course.answer.replace('    time.sleep_ms(50)\n',''),id),/等待/);assert.throws(()=>parsePython(course.answer.replace('        led.on()','        while True:'),id),PythonError);assert.throws(()=>parsePython(course.answer.replace('time.sleep_ms(50)','time.sleep_ms(0)'),id),/等待/);
});
test('PIR complete wiring separates USB 5V from GPIO and only records the LED current branch',()=>{
 assert.equal(wires.length,6);for(const motion of [false,true]){const a=analyzePicoCircuit(wires,id,true,false,motion);assert.ok(a.valid&&a.pirValid&&a.lit);assert.equal(a.input,motion?1:0);assert.deepEqual(a.flowWires,['pico-example-0','pico-example-1','pico-example-2']);}
 for(let n=0;n<wires.length;n++){const a=analyzePicoCircuit(wires.filter((_,i)=>i!==n),id);assert.equal(a.valid,false);if(n>=3)assert.equal(a.input,null);}
});
test('PIR rejects wrong supply, wrong signal, swapped polarity, GPIO shorts and LED errors',()=>{
 const cases=[wires.map(w=>w.from==='pico:40'?{...w,from:'pico:36'}:w),wires.map(w=>w.to==='pico:19'?{...w,to:'pico:31'}:w),wires.map(w=>({...w,from:w.from==='p-pir:gnd'?'p-pir:vcc':w.from,to:w.to==='p-pir:vcc'?'p-pir:gnd':w.to})),wires.map(w=>({...w,from:w.from==='p-led:k'?'p-led:a':w.from,to:w.to==='p-led:a'?'p-led:k':w.to}))];
 for(const [from,to] of [['pico:40','pico:19'],['pico:40','pico:20'],['pico:40','pico:3'],['pico:40','p-led:a'],['pico:19','pico:3'],['pico:19','pico:20'],['p-pir:out','p-pir:vcc'],['p-res:a','p-res:b']])cases.push([...wires,{id:'short',from,to}]);
 for(const w of cases){const a=analyzePicoCircuit(w,id,true,false,true);assert.equal(a.valid,false);assert.equal(a.lit,false);assert.ok(a.message.length>8);}
});
test('PIR allows all common grounds and reversed clicked wire endpoints without changing current direction',()=>{
 for(const n of [3,8,13,18,23,28,33,38])assert.ok(analyzePicoCircuit(wires.map(w=>w.from==='p-pir:gnd'?{...w,to:'pico:'+n}:w),id).valid);
 const a=analyzePicoCircuit(wires.map(w=>({...w,from:w.to,to:w.from})),id,true);assert.ok(a.valid);assert.ok(Object.values(a.flowDirections!).every(v=>v===false));assert.equal(partsFor('button-led')['p-pir:out'],undefined);
});
test('PIR JSON v1 preserves input and example backup while old six payloads do not gain fields',()=>{
 const draft=makePicoDraft(course.answer,id,wires,[],2048,true);assert.deepEqual(parsePicoDraft(JSON.stringify(draft)),draft);const {motion,...old}=draft;assert.equal(motion,true);assert.equal(parsePicoDraft(JSON.stringify(old)).motion,false);assert.notEqual(picoKey(id),picoKey('button-led'));
 for(const value of [null,0,1,'true',{}])assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,motion:value})),/活動輸入/);
 for(const lesson of ['blink','external-led','button-led','pwm-breathing','pot-dimming','ldr-nightlight'] as const){const d=makePicoDraft(picoCourses[lesson].scaffold,lesson);assert.equal(Object.hasOwn(d,'motion'),false);assert.deepEqual(parsePicoDraft(JSON.stringify(d)),d);}
 assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,lessonId:'button-led'})),/端點/);
});
test('PIR completion follows the renamed sensor and offers HIGH logic without PULL_UP or a whole answer',()=>{
 const items=pythonCompletions(course.answer.replaceAll('pir','motion').replaceAll('led','lamp'),id);assert.ok(items.some(i=>i.label==='motion.value'&&i.topic==='pir'));assert.ok(items.some(i=>i.label==='lamp.on'));assert.ok(items.some(i=>i.label==='Pin.IN'&&i.template==='Pin.IN'));assert.ok(items.find(i=>i.label==='if')?.template.includes('motion.value()'));assert.ok(items.every(i=>!i.template.includes('PULL_UP')&&!i.template.includes('PWM')&&!i.template.includes('read_u16')));
});
test('PIR main.py export preserves own source/comments and parses as Python without simulated wiring',()=>{
 const source=course.answer.replace('50','120')+'# my own PIR\n',e=exportPython(source,id);assert.equal(e.filename,'main.py');assert.ok(e.code.endsWith(source));const p=spawnSync('python3',['-c','import ast,sys;ast.parse(sys.stdin.read())'],{input:e.code,encoding:'utf8'});assert.equal(p.status,0,p.stderr);
});
test('PIR exported Python agrees with the VM over sustained, changing and inverted inputs',()=>{
 const inputs=[0,1,1,0,0,1,0,1];
 const harness=`import sys,types,json\nclass Done(Exception): pass\ninputs=${JSON.stringify(inputs)}\ntrace=[]\nclock=[0]\nclass Pin:\n    OUT=1; IN=0\n    def __init__(self,n,mode): self.n=n;self.lit=True\n    def on(self): assert self.n==15;self.lit=True\n    def off(self): assert self.n==15;self.lit=False\n    def value(self): assert self.n==14;return inputs[clock[0]]\ndef sleep_ms(n):\n    assert n==50\n    trace.append(scope['led'].lit);clock[0]+=1\n    if clock[0]>=len(inputs): raise Done()\nm=types.ModuleType('machine');m.Pin=Pin\nt=types.ModuleType('time');t.sleep_ms=sleep_ms\nsys.modules['machine']=m;sys.modules['time']=t\nscope={}\ntry: exec(sys.stdin.read(),scope)\nexcept Done: pass\nprint(json.dumps(trace))\n`;
 for(const source of [course.answer,course.answer.replace('== 1','== 0')]){const p=spawnSync('python3',['-c',harness],{input:exportPython(source,id).code,encoding:'utf8',timeout:5000});assert.equal(p.status,0,p.stderr);const r=run(source);assert.deepEqual(JSON.parse(p.stdout),inputs.map((v,i)=>r.advanceTo(i*50,v as 0|1).lit));}
});
