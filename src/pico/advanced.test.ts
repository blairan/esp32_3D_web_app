import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {advancedIds,advancedExample,advancedAnalysis} from './advancedLessons.ts';
import {parseAdvanced,AdvancedRuntime,defaultAdvancedInputs,readAdvancedInputs} from './advancedEngine.ts';
import {picoCourses} from './courses.ts';
import {parsePython,PythonRuntime,exportPython,PythonError} from './language.ts';
import {makePicoDraft,parsePicoDraft,picoKey} from './storage.ts';
import {pythonCompletions} from './completion.ts';
const make=(id:typeof advancedIds[number],source=picoCourses[id].answer)=>new AdvancedRuntime(parseAdvanced(source,id));
for(const id of advancedIds){
 test(`${id}: Pico example validates every required wire and keeps GPIO native`,()=>{const w=advancedExample(id);assert.ok(advancedAnalysis(w,id,true,false,false).valid);assert.ok(w.every(w=>![w.from,w.to].some(t=>/^J[23]-|^uno:/.test(t))));for(let i=0;i<w.length;i++)assert.equal(advancedAnalysis(w.filter((_,j)=>j!==i),id,true,false,false).valid,false,`missing ${i}`);assert.equal(advancedAnalysis([...w,{id:'short',from:'pico:20',to:'pico:18'}],id,true,false,false).valid,false);});
 test(`${id}: source export is valid Python, own comments survive and scaffold stays incomplete`,()=>{const source=picoCourses[id].answer+'# own work\n',e=exportPython(source,id);assert.ok(e.code.endsWith(source));assert.throws(()=>exportPython(picoCourses[id].scaffold,id),PythonError);const p=spawnSync('python3',['-c','import ast,sys;ast.parse(sys.stdin.read())'],{input:e.code,encoding:'utf8'});assert.equal(p.status,0,p.stderr);});
 test(`${id}: standard answer runs bounded loops and retains independent JSON`,()=>{const r=make(id);for(let t=0;t<=6000;t+=50)r.advanceTo(t,id==='pir-delay'?0:1);const d=makePicoDraft(picoCourses[id].scaffold,id,advancedExample(id),[],2048,false,{...defaultAdvancedInputs,distance:12,temperature:-10});assert.deepEqual(parsePicoDraft(JSON.stringify(d)),d);assert.notEqual(picoKey(id),picoKey('blink'));assert.ok(pythonCompletions(picoCourses[id].scaffold,id).some(i=>i.topic===id));});
}
test('two LEDs and three traffic outputs follow actual independent transitions',()=>{const r=make('dual-led');assert.equal(r.advanceTo(0).outputs[15].value,65535);const s=r.advanceTo(1000);assert.equal(s.outputs[15].value,0);assert.equal(s.outputs[13].value,65535);const t=make('traffic-light');assert.equal(t.advanceTo(0).outputs[15].value,65535);assert.equal(t.advanceTo(3000).outputs[13].value,65535);assert.equal(t.advanceTo(4000).outputs[12].value,65535);assert.equal(t.advanceTo(7000).outputs[15].value,65535);});
test('counter and buzzer use active-low input without repeated long-press increments',()=>{const r=make('button-counter');r.advanceTo(0,1);assert.equal(r.advanceTo(50,0).variables.count,1);assert.equal(r.advanceTo(100,0).variables.count,1);r.advanceTo(150,1);assert.equal(r.advanceTo(200,0).variables.count,2);const b=make('buzzer-doorbell');assert.equal(b.advanceTo(0,1).lit,false);assert.equal(b.advanceTo(20,0).lit,true);assert.equal(b.advanceTo(40,1).lit,false);});
test('RGB retains 16-bit duty per channel, actual variable names and channel frequency',()=>{const r=make('rgb-mixing');const a=r.advanceTo(0);assert.deepEqual([15,13,12].map(p=>a.outputs[p].value),[65535,0,65535]);const b=r.advanceTo(1000);assert.deepEqual([15,13,12].map(p=>b.outputs[p].value),[0,65535,65535]);const s=picoCourses['rgb-mixing'].answer.replaceAll('red','warm');assert.equal(make('rgb-mixing',s).advanceTo(0).outputs[15].frequency,1000);for(const source of [s.replace('freq(1000)','freq(50)'),s.replace('duty_u16(65535)','duty_u16(65536)')])assert.throws(()=>parseAdvanced(source,'rgb-mixing'),PythonError);});
test('servo uses 50Hz nanosecond pulses and rejects wrong modes and ranges',()=>{const r=make('servo-angle');assert.equal(r.advanceTo(0).servo,0);assert.equal(r.advanceTo(1000).servo,90);assert.equal(r.advanceTo(2000).servo,180);for(const s of [picoCourses['servo-angle'].answer.replace('freq(50)','freq(1000)'),picoCourses['servo-angle'].answer.replace('duty_ns(500000)','duty_ns(499999)'),picoCourses['servo-angle'].answer.replaceAll('duty_ns','duty_u16')])assert.throws(()=>parseAdvanced(s,'servo-angle'),PythonError);});
test('ultrasonic requires 10 microsecond trigger and handles negative timeouts instead of zero cm',()=>{const a=make('ultrasonic-alert');assert.equal(a.advanceTo(1,1,null,{...defaultAdvancedInputs,distance:10}).outputs[15].value,65535);assert.equal(a.advanceTo(101,1,null,{...defaultAdvancedInputs,distance:0}).variables.distance,-1);assert.equal(a.advanceTo(201,1,null,{...defaultAdvancedInputs,distance:100}).outputs[15].value,0);assert.throws(()=>make('ultrasonic-alert',picoCourses['ultrasonic-alert'].answer.replace('sleep_us(10)','sleep_us(9)')).advanceTo(1),/觸發/);});
test('PIR delay resamples during its timeout and ticks_diff handles wrap',()=>{const r=make('pir-delay');r.advanceTo(0,1);for(let t=50;t<3000;t+=50)assert.equal(r.advanceTo(t,0).outputs[15].value,65535);assert.equal(r.advanceTo(3000,0).outputs[15].value,0);const s=picoCourses['pir-delay'].answer.replace('now = time.ticks_ms()','now = 20').replace('last_motion = time.ticks_ms()','last_motion = 1073741800').replace('>= 3000','>= 44');assert.equal(make('pir-delay',s).advanceTo(0,0).outputs[15].value,0);});
test('DHT samples cache for 2 seconds, retains signed temperatures, fails on error and initializes explicitly',()=>{const r=make('climate-dht');assert.equal(r.advanceTo(0,1,null,{...defaultAdvancedInputs,temperature:-12}).climate?.temperature,-12);assert.equal(r.advanceTo(1999,1,null,{...defaultAdvancedInputs,temperature:40}).climate?.temperature,-12);const hot=r.advanceTo(2000,1,null,{...defaultAdvancedInputs,temperature:40});assert.equal(hot.climate?.temperature,40);assert.equal(hot.outputs[15].value,65535);assert.throws(()=>r.advanceTo(4000,1,null,{...defaultAdvancedInputs,fault:true}),/DHT量測失敗/);assert.throws(()=>make('climate-dht',picoCourses['climate-dht'].answer.replace('    climate.measure()\n','')).advanceTo(0),/measure/);});
test('OLED buffers until show, permits device renames, supports four-digit number and rejects bounds',()=>{const r=make('oled-i2c',picoCourses['oled-i2c'].answer.replaceAll('display','screen').replace('    screen.show()\n',''));assert.equal(r.advanceTo(0).oled.begun,false);assert.equal(make('oled-i2c').advanceTo(0).oled.glyphs[0].text,'Pico 2 W');assert.equal(make('seven-counter',picoCourses['seven-counter'].answer.replace('count = 0','count = 9999')).advanceTo(1000).oled.glyphs.map(g=>g.text).join(''),'   0');assert.throws(()=>make('oled-i2c',picoCourses['oled-i2c'].answer.replace('"Pico 2 W", 0, 0','"Pico 2 W", 100, 0')).advanceTo(0),/畫面/);assert.throws(()=>make('oled-i2c').advanceTo(0,1,null,{...defaultAdvancedInputs,fault:true}),/OLED/);});
test('integration publishes the same sample as its LED threshold and display',()=>{const r=make('environment-lab');const s=r.advanceTo(0,1,null,{...defaultAdvancedInputs,temperature:38,humidity:88});assert.equal(s.variables.temperature,38);assert.equal(s.outputs[15].value,65535);assert.ok(s.oled.glyphs.some(g=>g.text==='38'));assert.ok(s.oled.glyphs.some(g=>g.text==='88'));});
test('unknown imports, arbitrary code, initialization errors, unsupported calls, missing waits and budgets are bounded',()=>{const base=picoCourses['dual-led'].answer;for(const source of ['import os\n'+base,base.replace('led.on()','exec("bad")'),base.replace('led.on()','x = led.on()'),base.replace('Pin(15','Pin(25'),base.replace('    led.on()','    x = unknown + 1'),base.replaceAll('time.sleep_ms(1000)','time.sleep_ms(0)')])assert.throws(()=>parseAdvanced(source,'dual-led'),PythonError);assert.throws(()=>make('dual-led',base.replaceAll('1000','1')).advanceTo(100000),/預算/);assert.throws(()=>make('dual-led').advanceTo(-1),/時間/);for(const input of [null,[],1,'bad',{distance:1},{temperature:100},{humidity:-1},{motion:1}])assert.throws(()=>readAdvancedInputs(input));});
test('legacy runtime remains isolated while advanced snapshots include independent outputs and inputs',()=>{assert.throws(()=>parsePython(picoCourses['dual-led'].answer,'external-led'),PythonError);const r=new PythonRuntime(parsePython(picoCourses['environment-lab'].answer,'environment-lab'));assert.ok(r.advanceTo(0).advanced?.oled.begun);assert.throws(()=>parsePython(picoCourses['environment-lab'].answer,'button-toggle'),PythonError);});
const harness=`import sys,types,json,ast,copy
class Done(Exception): pass
clock=[0];trace=[];outputs={};objects={};published=[None]
class Pin:
    OUT=1;IN=0;PULL_UP=2
    def __init__(self,n,mode=None,pull=None): self.n=n;self.mode=mode;self.pull=pull
    def on(self): outputs[self.n]={'value':65535,'frequency':None}
    def off(self): outputs[self.n]={'value':0,'frequency':None}
    def toggle(self): self.off() if outputs.get(self.n,{}).get('value',0) else self.on()
    def value(self,n=None):
        if n is not None: self.on() if n else self.off();return
        return (1 if self.pull==2 else 0) if self.mode==0 else int(bool(outputs.get(self.n,{}).get('value',0)))
class PWM:
    def __init__(self,p): self.pin=p.n;self.f=None
    def freq(self,n): self.f=n
    def duty_u16(self,n): outputs[self.pin]={'value':n,'frequency':self.f}
    def duty_ns(self,n): outputs[self.pin]={'value':round(n/20000000*65535),'frequency':self.f}
class I2C:
    def __init__(self,*a,**k): pass
class DHT22:
    def __init__(self,p): pass
    def measure(self): pass
    def temperature(self): return 25
    def humidity(self): return 60
class SSD1306_I2C:
    def __init__(self,*a): self.buffer=[]
    def fill(self,n): self.buffer=[]
    def text(self,text,x,y): self.buffer.append({"text":text,"x":x,"y":y,"size":1})
    def show(self): published[0]=copy.deepcopy(self.buffer)
class TM1637:
    def __init__(self,**k): pass
    def brightness(self,n): pass
    def number(self,n): published[0]=[{"text":text,"x":i*30,"y":0,"size":1} for i,text in enumerate(str(n).rjust(4))]
def sleep_ms(n):
    trace.append([clock[0]/1000,copy.deepcopy(outputs),copy.deepcopy(published[0])]);clock[0]+=n*1000
    if len(trace)>=10: raise Done()
def sleep_us(n): clock[0]+=n
def ticks_ms(): return clock[0]//1000%1073741824
def ticks_diff(a,b): return (a-b+536870912)%1073741824-536870912
machine=types.ModuleType('machine');machine.Pin=Pin;machine.PWM=PWM;machine.I2C=I2C;machine.time_pulse_us=lambda *a:5800
sys.modules['machine']=machine
for name,attr,obj in [('dht','DHT22',DHT22),('ssd1306','SSD1306_I2C',SSD1306_I2C),('tm1637','TM1637',TM1637)]:
    m=types.ModuleType(name);setattr(m,attr,obj);sys.modules[name]=m
t=types.ModuleType('time');t.sleep_ms=sleep_ms;t.sleep_us=sleep_us;t.sleep=lambda n:sleep_ms(n*1000);t.ticks_ms=ticks_ms;t.ticks_diff=ticks_diff;sys.modules['time']=t
s=sys.stdin.read();ast.parse(s)
try: exec(s,{})
except Done: pass
print(json.dumps(trace))
`;
for(const id of advancedIds)test(`${id}: exported Python output trace agrees with VM for ten real execution waits`,()=>{const p=spawnSync('python3',['-c',harness],{input:exportPython(picoCourses[id].answer,id).code,encoding:'utf8',timeout:5000});assert.equal(p.status,0,p.stderr);const trace=JSON.parse(p.stdout) as [number,Record<number,{value:number;frequency:number|null}>,unknown][];const r=make(id);for(const [t,outputs,published] of trace){const s=r.advanceTo(t,id==='pir-delay'?0:1);assert.deepEqual(s.outputs,outputs,`time ${t}`);if(published!==null)assert.deepEqual(s.oled.glyphs,published,`display at ${t}`);}});

test('Python reserved words and imported API names cannot become numeric variables',()=>{for(const name of ['def','return','class','and','except','import','pass','time_pulse_us']){const id=name==='time_pulse_us'?'ultrasonic-alert':'dual-led';assert.throws(()=>parseAdvanced(picoCourses[id].answer.replace('while True:',name+' = 1\nwhile True:'),id),PythonError);}});

test('bounded integer literals, restricted string escapes and explicit wait ranges reject incompatible exports',()=>{const base=picoCourses['oled-i2c'].answer;for(const s of [base.replace('count = 0','count = 2147483648'),base.replace('count = 0','count = -2147483649'),base.replace('time.sleep_ms(1000)','time.sleep_ms(60001)'),base.replace('"Pico 2 W"','"bad\\nline"')])assert.throws(()=>parseAdvanced(s,'oled-i2c'),PythonError);assert.doesNotThrow(()=>parseAdvanced(base.replace('count = 0','count = -2147483648'),'oled-i2c'));});

test('comparison results remain conditions and display strings cannot masquerade as integer states',()=>{const b=picoCourses['oled-i2c'].answer;for(const source of [b.replace('count = 0','count = 1 > 0'),b.replace('str(count)','str(count > 0)'),b.replace('str(count)','int("1")'),b.replace('count = 0','count = str(1)')])assert.throws(()=>parseAdvanced(source,'oled-i2c'),PythonError);});
