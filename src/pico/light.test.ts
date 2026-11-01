import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {picoCourses} from './courses.ts';
import {parsePython,PythonRuntime,PythonError,exportPython} from './language.ts';
import {picoExamples,analyzePicoCircuit,partsFor} from './circuit.ts';
import {hasPicoADC,hasPicoPWM,adcToU16} from './types.ts';
import {makePicoDraft,parsePicoDraft,picoKey} from './storage.ts';
import {pythonCompletions} from './completion.ts';
const id='ldr-nightlight',course=picoCourses[id],wires=picoExamples(id);
const run=(source=course.answer)=>new PythonRuntime(parsePython(source,id));
test('nightlight thresholds preserve prior output throughout the inclusive middle interval',()=>{
 const r=run();let t=0;
 for(const [adc,lit] of [[30000,false],[23999,true],[24000,true],[30000,true],[35200,true],[35201,false],[35200,false],[24000,false],[0,true],[65535,false]] as const){const s=r.advanceTo(t,1,adc);assert.equal(s.lit,lit,`ADC ${adc} at ${t}`);assert.equal(s.lastAnalogRead,adc);assert.equal(s.variables.reading,adc);assert.equal(s.frequency,null);t+=50;}
});
test('nightlight read_u16 samples only at the learner interval and emits digital transitions',()=>{
 const r=run();assert.equal(r.advanceTo(0,1,0).lit,true);assert.equal(r.advanceTo(49,1,65535).lastAnalogRead,0);const s=r.advanceTo(50,1,65535);assert.equal(s.lit,false);assert.ok(s.waveform.events.some(e=>e.timeMs===50&&e.kind==='digital'&&e.value===0));assert.ok(!s.waveform.events.some(e=>e.kind==='pwm'));
});
test('nightlight raw ADC endpoints and teaching thresholds use the 16-bit API scale',()=>{
 const r=run();assert.equal(r.advanceTo(0,1,adcToU16(1499)).lit,true);assert.equal(r.advanceTo(50,1,adcToU16(1500)).lit,true);assert.equal(r.advanceTo(100,1,adcToU16(2200)).lit,false);assert.equal(adcToU16(2048),32776);
 for(const adc of [null,-1,65536,NaN,1.5])assert.throws(()=>run().advanceTo(0,1,adc),/ADC/);
});
test('nightlight preserves renamed objects, variables, comments and learner threshold choices',()=>{
 const source=course.answer.replaceAll('led','lamp').replaceAll('light','sensor').replaceAll('reading','sample').replace('24000','20000')+'# my thresholds\n';const r=run(source);assert.equal(r.advanceTo(0,1,21000).lit,false);assert.equal(r.advanceTo(50,1,19999).lit,true);const exported=exportPython(source,id);assert.ok(exported.code.endsWith(source));assert.equal(exported.filename,'main.py');assert.equal(spawnSync('python3',['-c','import ast,sys;ast.parse(sys.stdin.read())'],{input:exported.code,encoding:'utf8'}).status,0);
});
test('nightlight incomplete scaffolds and unsupported ADC/PWM/object conflicts retain diagnostic locations',()=>{
 for(const source of [course.scaffold,course.answer.replace('Pin, ADC','Pin'),course.answer.replace('Pin(26)','Pin(27)'),course.answer.replace('light = ADC','led = ADC'),course.answer.replace('light = ADC','ADC = ADC'),course.answer.replace('light.read_u16()','other.read_u16()'),course.answer.replace('led.on()','led.duty_u16(30000)'),course.answer.replace('reading = light.read_u16()','reading = unknown'),course.answer.replace('time.sleep_ms(50)','pass')])assert.throws(()=>exportPython(source,id),(e:unknown)=>e instanceof PythonError&&e.line>0&&e.column>0);
 assert.throws(()=>parsePython(course.answer.replace('led = Pin(15, Pin.OUT)\nled.off()\nlight = ADC(Pin(26))','light = ADC(Pin(26))\nlight = Pin(15, Pin.OUT)'),id),/重複/);
});
test('nightlight ADC numeric support does not enable PWM or change earlier digital courses',()=>{
 assert.ok(hasPicoADC(id));assert.equal(hasPicoPWM(id),false);for(const lesson of ['blink','external-led','button-led','pwm-breathing'] as const)assert.throws(()=>parsePython(course.answer,lesson),PythonError);
 assert.throws(()=>parsePython(picoCourses['external-led'].answer.replace('    led.on()','    x = 1\n    led.on()'),'external-led'),PythonError);
});
test('nightlight requires every divider wire and keeps sensor branches out of LED current flow',()=>{
 assert.equal(wires.length,7);const a=analyzePicoCircuit(wires,id,true);assert.ok(a.valid&&a.lightValid&&a.lit);assert.deepEqual(a.flowWires,['pico-example-0','pico-example-1','pico-example-2']);for(let i=0;i<wires.length;i++)assert.equal(analyzePicoCircuit(wires.filter((_,j)=>j!==i),id,true).valid,false);
});
test('nightlight passive components allow reversed endpoints and all ground pins',()=>{
 for(const prefix of ['p-ldr','p-divider','p-res']){const swap=(s:string)=>s===prefix+':a'?prefix+':b':s===prefix+':b'?prefix+':a':s;assert.ok(analyzePicoCircuit(wires.map(w=>({...w,from:swap(w.from),to:swap(w.to)})),id).valid);}
 for(const g of [3,8,13,18,23,28,33,38])assert.ok(analyzePicoCircuit(wires.map(w=>w.from==='p-divider:b'?{...w,to:'pico:'+g}:w),id).valid);
});
test('nightlight rejects 5V, other ADC pins, bypasses, reversed divider topology and LED errors',()=>{
 const cases=[wires.map(w=>w.from==='pico:36'?{...w,from:'pico:40'}:w),wires.map(w=>({...w,from:w.from==='pico:31'?'pico:32':w.from,to:w.to==='pico:31'?'pico:32':w.to})),wires.map(w=>({...w,from:w.from.startsWith('p-ldr:')?w.from.replace('p-ldr:','p-divider:'):w.from.startsWith('p-divider:')?w.from.replace('p-divider:','p-ldr:'):w.from,to:w.to.startsWith('p-ldr:')?w.to.replace('p-ldr:','p-divider:'):w.to.startsWith('p-divider:')?w.to.replace('p-divider:','p-ldr:'):w.to})),wires.map(w=>({...w,from:w.from==='p-led:k'?'p-led:a':w.from,to:w.to==='p-led:a'?'p-led:k':w.to}))];
 for(const [from,to] of [['pico:31','pico:3'],['pico:31','pico:36'],['pico:31','pico:20'],['pico:36','pico:20'],['pico:36','pico:3'],['p-res:a','p-res:b'],['p-ldr:a','p-ldr:b'],['p-divider:a','p-divider:b']])cases.push([...wires,{id:'short',from,to}]);
 for(const w of cases){const a=analyzePicoCircuit(w,id,true);assert.equal(a.valid,false);assert.ok(a.message.length>10);}
});
test('nightlight JSON and independent key preserve learner input, wires and hidden-example backup',()=>{
 const draft=makePicoDraft(course.answer,id,wires,[],1234);assert.deepEqual(parsePicoDraft(JSON.stringify(draft)),draft);assert.notEqual(picoKey(id),picoKey('pot-dimming'));assert.ok(partsFor(id)['p-ldr:a']);assert.equal(partsFor('pot-dimming')['p-ldr:a'],undefined);assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,lessonId:'pot-dimming'})),/端點/);
});
test('nightlight completion follows ADC/LED renames and links its own concept without a full answer',()=>{
 const items=pythonCompletions(course.answer.replaceAll('light','sensor').replaceAll('led','lamp'),id);assert.ok(items.some(i=>i.label==='sensor.read_u16'&&i.topic==='light'));assert.ok(items.some(i=>i.label==='lamp.on'));assert.ok(items.some(i=>i.label==='reading'));assert.ok(!items.some(i=>i.label.includes('duty_u16')||i.label==='PWM'));assert.ok(items.every(i=>!i.template.includes('while True:')||!i.template.includes('read_u16')));
});
test('nightlight exported Python and teaching VM agree through both hysteresis directions',()=>{
 const inputs=[30000,23999,24000,30000,35200,35201,30000,24000,0,65535];
 const script=`import sys,types,json\nclass Done(Exception): pass\nvalues=${JSON.stringify(inputs)}\ntrace=[]\nclock=[0]\nclass Pin:\n    OUT=1\n    def __init__(self,n,mode=None): self.n=n; self.lit=True\n    def on(self): self.lit=True\n    def off(self): self.lit=False\nclass ADC:\n    def __init__(self,p): assert p.n==26\n    def read_u16(self): return values[clock[0]]\ndef sleep_ms(n):\n    assert n==50\n    trace.append(scope['led'].lit)\n    clock[0]+=1\n    if clock[0]>=len(values): raise Done()\nm=types.ModuleType('machine');m.Pin=Pin;m.ADC=ADC\nt=types.ModuleType('time');t.sleep_ms=sleep_ms\nsys.modules['machine']=m;sys.modules['time']=t\nscope={}\ntry: exec(sys.stdin.read(),scope)\nexcept Done: pass\nprint(json.dumps(trace))\n`;
 const p=spawnSync('python3',['-c',script],{input:exportPython(course.answer,id).code,encoding:'utf8',timeout:5000});assert.equal(p.status,0,p.stderr);const r=run();assert.deepEqual(JSON.parse(p.stdout),inputs.map((v,i)=>r.advanceTo(i*50,1,v).lit));
});
