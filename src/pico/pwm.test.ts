import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {picoCourses} from './courses.ts';
import {parsePython,PythonRuntime,PythonError,exportPython} from './language.ts';
import {picoExamples,analyzePicoCircuit} from './circuit.ts';
import {adcToU16} from './types.ts';
import {makePicoDraft,parsePicoDraft,picoKey} from './storage.ts';
import {pythonCompletions} from './completion.ts';
const pwm=picoCourses['pwm-breathing'].answer,pot=picoCourses['pot-dimming'].answer;
const run=(s=pwm)=>new PythonRuntime(parsePython(s,'pwm-breathing'));
for(const id of ['pwm-breathing','pot-dimming'] as const)test(`${id}: own-source export is valid Python; default remains an incomplete scaffold`,()=>{
 const s=picoCourses[id],exported=exportPython(s.answer,id);assert.ok(exported.code.endsWith(s.answer));assert.throws(()=>exportPython(s.scaffold,id),/尚未完成/);const r=spawnSync('python3',['-c','import ast,sys;ast.parse(sys.stdin.read())'],{input:exported.code,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('breathing cycle clamps both endpoints and keeps signed negative step',()=>{
 const r=run(),samples:number[]=[];for(let i=0;i<=256;i++){const s=r.advanceTo(i*20);assert.ok(s.duty>=0&&s.duty<=65535);samples.push(s.duty);if(i===63)assert.equal(s.variables.step,-1024);if(i===127)assert.equal(s.variables.step,1024);}
 assert.equal(samples[0],0);assert.equal(samples[1],1024);assert.equal(samples[63],64512);assert.equal(samples[64],65535);assert.equal(samples[65],64511);assert.equal(samples[127],1023);assert.equal(samples[128],0);assert.equal(samples[192],65535);assert.equal(samples[256],0);
});
test('PWM output reflects learner statement order, not a canned animation',()=>{
 const r=run(pwm.replace('    led.duty_u16(brightness)\n    brightness = brightness + step','    brightness = brightness + step\n    led.duty_u16(brightness)'));assert.equal(r.advanceTo(0).duty,1024);assert.equal(r.advanceTo(20).duty,2048);
});
test('renamed PWM variables, unary inversion and simple signed arithmetic execute faithfully',()=>{
 const s=pwm.replaceAll('led','lamp').replaceAll('brightness','amount').replaceAll('step','delta').replace('delta = -1024','delta = -delta');const r=run(s);for(let t=0;t<=1280;t+=20)r.advanceTo(t);assert.equal(r.snapshot.duty,65535);assert.equal(r.snapshot.variables.delta,-1024);
});
test('PWM frequency, integer and duty boundaries are enforced',()=>{
 for(const s of [pwm.replace('freq(1000)','freq(0)'),pwm.replace('freq(1000)','freq(20001)'),pwm.replace('freq(1000)','freq(-1)'),pwm.replace('led.freq(1000)\n',''),pwm.replace('duty_u16(brightness)','duty_u16(65536)'),pwm.replace('duty_u16(brightness)','duty_u16(-1)')])assert.throws(()=>parsePython(s,'pwm-breathing'),PythonError);
 assert.equal(run(pwm.replace('freq(1000)','freq(20000)')).advanceTo(0).frequency,20000);
 assert.throws(()=>run(pwm.replace('brightness = 0','brightness = -1')).advanceTo(0),/0～65535/);
 assert.throws(()=>run(pwm.replace('brightness = 0','brightness = 2147483647').replace('led.duty_u16(brightness)','led.duty_u16(0)')).advanceTo(0),/32位元/);
});
test('classes, pin numbers, methods and constructor names remain lesson scoped',()=>{
 for(const s of [pwm.replace('Pin(15)','Pin(14)'),pwm.replace('Pin, PWM','Pin'),pwm.replace('led = PWM','PWM = PWM'),pwm.replace('duty_u16(brightness)','on()')])assert.throws(()=>parsePython(s,'pwm-breathing'),PythonError);
 for(const s of [pot.replace('Pin(26)','Pin(27)'),pot.replace('Pin, PWM, ADC','Pin, PWM'),pot.replace('knob.read_u16()','other.read_u16()')])assert.throws(()=>parsePython(s,'pot-dimming'),PythonError);
 assert.doesNotThrow(()=>parsePython(pot.replace('Pin, PWM, ADC','ADC, Pin, PWM'),'pot-dimming'));
 assert.throws(()=>parsePython(pwm,'external-led'),PythonError);assert.throws(()=>parsePython(pot,'pwm-breathing'),PythonError);
});
test('undefined variables, self-reference, branch-only initialization and unsupported operations give locations',()=>{
 for(const s of [pwm.replace('brightness = 0','brightness = brightness'),pwm.replace('brightness = brightness + step','brightness = unknown + step'),pwm.replace('brightness = 65535','branchOnly = 65535'),pwm.replace('brightness + step','brightness * step'),pwm.replace('brightness + step','eval("1")'),pwm.replace('brightness + step','brightness // 2')])assert.throws(()=>parsePython(s,'pwm-breathing'),(e:unknown)=>e instanceof PythonError&&e.line>0&&e.column>0);
});
test('single-level numeric branches still require waiting on every path and reject nesting',()=>{
 assert.throws(()=>parsePython(pwm.replace('    time.sleep_ms(20)\n',''),'pwm-breathing'),/等待/);assert.throws(()=>parsePython(pwm.replace('        brightness = 65535','        if brightness > 1:'),'pwm-breathing'),PythonError);
});
test('ADC conversion matches RP2 12-bit to 16-bit bit expansion, including endpoints',()=>{
 assert.equal(adcToU16(0),0);assert.equal(adcToU16(2048),32776);assert.equal(adcToU16(4095),65535);assert.equal(new Set(Array.from({length:4096},(_,n)=>adcToU16(n))).size,4096);
 for(const n of [-1,4096,NaN,1.5])assert.throws(()=>adcToU16(n),RangeError);
});
test('pot read_u16 samples at the learner interval and reuses the old sample while waiting',()=>{
 const r=new PythonRuntime(parsePython(pot,'pot-dimming'));assert.equal(r.advanceTo(0,1,0).duty,0);assert.equal(r.advanceTo(49,1,65535).lastAnalogRead,0);const full=r.advanceTo(50,1,65535);assert.equal(full.duty,65535);assert.equal(full.variables.reading,65535);assert.equal(r.advanceTo(99,1,32776).duty,65535);assert.equal(r.advanceTo(100,1,32776).duty,32776);
});
test('direct ADC expressions, inversions and renamed ADC objects preserve learner logic',()=>{
 const s=pot.replaceAll('knob','dial').replaceAll('led','lamp').replace('    reading = dial.read_u16()\n    lamp.duty_u16(reading)','    lamp.duty_u16(65535 - dial.read_u16())');const r=new PythonRuntime(parsePython(s,'pot-dimming'));assert.equal(r.advanceTo(0,1,0).duty,65535);assert.equal(r.advanceTo(50,1,65535).duty,0);
 for(const n of [null,-1,65536,NaN,1.5])assert.throws(()=>new PythonRuntime(parsePython(pot,'pot-dimming')).advanceTo(0,1,n),/ADC/);
});
test('pot example has separate 3V3, GP26 and ground and excludes sensor wires from LED flow',()=>{
 const wires=picoExamples('pot-dimming');assert.equal(wires.length,6);const a=analyzePicoCircuit(wires,'pot-dimming',true);assert.ok(a.valid&&a.potValid&&a.lit);assert.deepEqual(a.flowWires,['pico-example-0','pico-example-1','pico-example-2']);
 for(const g of [3,8,13,18,23,28,33,38])assert.ok(analyzePicoCircuit(wires.map(w=>w.from==='p-pot:gnd'?{...w,to:'pico:'+g}:w),'pot-dimming').valid);
});
test('pot rail errors, wrong ADC, wiper shorts and incomplete connections cannot start a valid lesson',()=>{
 const wires=picoExamples('pot-dimming');
 const cases=[wires.filter(w=>w.from!=='p-pot:w'),wires.map(w=>w.from==='pico:36'?{...w,from:'pico:40'}:w),wires.map(w=>w.to==='pico:31'?{...w,to:'pico:32'}:w),[...wires,{id:'short',from:'pico:31',to:'pico:3'}],[...wires,{id:'short',from:'pico:36',to:'pico:20'}],[...wires,{id:'short',from:'pico:36',to:'pico:3'}]];
 for(const w of cases)assert.equal(analyzePicoCircuit(w,'pot-dimming',true).valid,false);
 assert.ok(analyzePicoCircuit(picoExamples('pwm-breathing'),'pwm-breathing',true).valid);
});
test('ADC position persists per lesson; old JSON migrates without changing legacy keys or source',()=>{
 const draft=makePicoDraft(pot,'pot-dimming',picoExamples('pot-dimming'),[],4095);assert.deepEqual(parsePicoDraft(JSON.stringify(draft)),draft);const {adc,...old}=makePicoDraft('old code');assert.equal(adc,2048);const migrated=parsePicoDraft(JSON.stringify(old));assert.equal(migrated.adc,2048);assert.equal(migrated.source,'old code');assert.notEqual(picoKey('pwm-breathing'),picoKey('pot-dimming'));
 for(const adc of [-1,4096,null,'1000',1.5])assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,adc})),/ADC/);
});
test('new API suggestions follow device renames and do not advertise digital writes on PWM',()=>{
 const items=pythonCompletions(pot.replaceAll('led','light').replaceAll('knob','dial'),'pot-dimming');assert.ok(items.some(i=>i.label==='light.duty_u16'));assert.ok(items.some(i=>i.label==='dial.read_u16'));assert.ok(!items.some(i=>i.label==='light.on'));assert.ok(!pythonCompletions(pwm,'pwm-breathing').some(i=>i.label.endsWith('read_u16')));
});
test('export keeps learner-selected frequency, delay and comments without requiring simulated wiring',()=>{
 const s=pot.replace('1000','2000').replace('50','75')+'# my own program\n',e=exportPython(s,'pot-dimming');assert.ok(e.code.endsWith(s));assert.ok(e.code.includes('freq(2000)'));assert.ok(e.code.includes('sleep_ms(75)'));
});

test('generated PWM and ADC Python traces agree with the teaching VM on controlled fake hardware',()=>{
 const root=mkdtempSync(join(tmpdir(),'pico-python-trace-'));
 const harness=`import sys,types,runpy,json
class Done(Exception): pass
clock=[0]
trace=[]
class Pin:
    def __init__(self,n): self.n=n
class PWM:
    def __init__(self,p): assert p.n==15
    def freq(self,n): assert n==1000
    def duty_u16(self,n):
        assert 0<=n<=65535
        trace.append([clock[0],n])
class ADC:
    def __init__(self,p): assert p.n==26
    def read_u16(self): return [0,32776,65535][int(clock[0]/50)%3]
def sleep_ms(n):
    clock[0]+=n
    if len(trace)>=130: raise Done()
machine=types.ModuleType("machine");machine.Pin=Pin;machine.PWM=PWM;machine.ADC=ADC
time=types.ModuleType("time");time.sleep_ms=sleep_ms
sys.modules["machine"]=machine;sys.modules["time"]=time
try: runpy.run_path(sys.argv[1])
except Done: pass
print(json.dumps(trace))
`;
 try{for(const id of ['pwm-breathing','pot-dimming'] as const){const source=exportPython(picoCourses[id].answer,id).code,path=join(root,'main.py');writeFileSync(path,source);const p=spawnSync('python3',['-c',harness,path],{encoding:'utf8',timeout:5000});assert.equal(p.status,0,p.stderr);const python=JSON.parse(p.stdout) as [number,number][];const r=new PythonRuntime(parsePython(picoCourses[id].answer,id)),expected=python.map(([t])=>[t,r.advanceTo(t,1,[0,32776,65535][Math.floor(t/50)%3]).duty]);assert.deepEqual(python,expected);}}finally{rmSync(root,{recursive:true,force:true});}
});
