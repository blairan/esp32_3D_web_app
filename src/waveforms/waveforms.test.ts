import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SignalRecorder,digitalSegments,pwmTiming,pwmPath,signalLimit} from './signals.ts';
import {parseProgram,blinkExample} from '../program/language.ts';
import {ProgramRuntime} from '../program/runtime.ts';
import {parsePython,PythonRuntime} from '../pico/language.ts';
import {picoCourses} from '../pico/courses.ts';

test('Arduino digital waveforms retain exact transitions inside a single Worker interval',()=>{
 const r=new ProgramRuntime(parseProgram('void setup(){pinMode(23, OUTPUT);} void loop(){digitalWrite(23,HIGH);delay(1);digitalWrite(23,LOW);delay(1);}'));
 const s=r.advanceTo(50);assert.equal(s.trace.length,8);assert.equal(s.waveform.events.length,52);
 assert.deepEqual(s.waveform.events.slice(0,5).map(e=>[e.timeMs,e.value]),[[0,0],[0,1],[1,0],[2,1],[3,0]]);
 assert.equal(s.waveform.events.at(-1)?.timeMs,50);
});
test('Blink waveform holds during waits and matches virtual transition boundaries',()=>{
 const r=new ProgramRuntime(parseProgram(blinkExample));const old=r.advanceTo(0).waveform;
 const s=r.advanceTo(3000);assert.deepEqual(s.waveform.events.map(e=>[e.timeMs,e.value]),[[0,0],[0,1],[1000,0],[2000,1],[3000,0]]);
 assert.equal(old.events.length,2);assert.equal(r.advanceTo(3500).waveform.events.length,5);
});
test('Pico timestamps use the scheduled statement time, not the UI polling time',()=>{
 const r=new PythonRuntime(parsePython(picoCourses.blink.answer));
 assert.deepEqual(r.advanceTo(2100).waveform.events.map(e=>[e.channel,e.timeMs,e.value]),[[-1,0,1],[-1,1000,0],[-1,2000,1]]);
 const p=new PythonRuntime(parsePython(picoCourses['external-led'].answer,'external-led'));assert.equal(p.advanceTo(0).waveform.events[0].channel,15);
});
test('Pico PWM preserves actual duty and frequency changes with signed-step timing',()=>{
 const r=new PythonRuntime(parsePython(picoCourses['pwm-breathing'].answer,'pwm-breathing'));
 const events=r.advanceTo(100).waveform.events;
 assert.equal(events[0].frequency,1000);assert.equal(events[0].kind,'pwm');
 assert.deepEqual(events.map(e=>[e.timeMs,e.value]),[[0,0],[20,1024],[40,2048],[60,3072],[80,4096],[100,5120]]);
});
test('native UNO PWM recording uses D10 and keeps the existing 8-bit duty range',()=>{
 const s=new ProgramRuntime(parseProgram('void setup(){pinMode(10,OUTPUT);} void loop(){analogWrite(10,128);delay(20);}','pwm-breathing','uno-r3')).advanceTo(50);
 assert.deepEqual(s.waveform.events.map(e=>[e.channel,e.kind,e.value]),[[10,'digital',0],[10,'pwm',128]]);
 assert.equal(s.waveform.events[1].frequency,undefined);
});
test('recording has a fixed memory bound and snapshots cannot mutate future history',()=>{
 const r=new SignalRecorder();for(let i=0;i<700;i++)r.record({channel:23,timeMs:i,kind:'digital',value:i%2});
 const s=r.snapshot();assert.equal(s.events.length,signalLimit);assert.equal(s.dropped,700-signalLimit);assert.equal(s.events[0].timeMs,188);
 s.events[0].value=99;assert.notEqual(r.snapshot().events[0].value,99);
 r.record({channel:23,timeMs:701,kind:'digital',value:1});assert.equal(r.snapshot().dropped,s.dropped); // no new transition
});
test('digital reconstruction preserves earlier known state, unknown gaps and simultaneous changes',()=>{
 const r=new SignalRecorder();r.record({channel:1,timeMs:10,kind:'digital',value:1});r.record({channel:1,timeMs:20,kind:'digital',value:0});
 assert.deepEqual(digitalSegments(r.snapshot(),1,0,15),[{from:10,to:15,value:1}]);
 assert.deepEqual(digitalSegments(r.snapshot(),1,15,30),[{from:15,to:20,value:1},{from:20,to:30,value:0}]);
 r.record({channel:1,timeMs:25,kind:'pwm',value:128});r.record({channel:1,timeMs:30,kind:'digital',value:1});
 assert.deepEqual(digitalSegments(r.snapshot(),1,20,35),[{from:20,to:20,value:1},{from:20,to:25,value:0},{from:30,to:35,value:1}]);
 assert.deepEqual(digitalSegments(r.snapshot(),2,0,100),[]);
});
test('PWM reference timing and endpoints are exact, independent of raw duty resolution',()=>{
 assert.deepEqual(pwmTiming(.5,1000),{period:1,high:.5,low:.5});assert.deepEqual(pwmTiming(.25,2000),{period:.5,high:.125,low:.375});
 assert.deepEqual(pwmTiming(0,1000),{period:1,high:0,low:1});assert.deepEqual(pwmTiming(1,1000),{period:1,high:1,low:0});
 assert.equal(pwmPath(0),'M0 82H600');assert.equal(pwmPath(1),'M0 20H600');
 for(const ratio of [.25,.5,.75,128/255,32768/65535])assert.ok(pwmPath(ratio).includes('V82'));
 for(const [ratio,freq] of [[NaN,1000],[-1,1000],[2,1000],[.5,0]])assert.throws(()=>pwmTiming(ratio,freq));
});

test('a steady channel retains its last known boundary while another channel fills the ring',()=>{
 const r=new SignalRecorder();r.record({channel:23,timeMs:0,kind:'digital',value:1});
 for(let i=1;i<=700;i++)r.record({channel:22,timeMs:i,kind:'digital',value:i%2});
 const h=r.snapshot();assert.equal(h.events.length,512);assert.ok((h.baseline?.length??0)<=2);
 assert.deepEqual(digitalSegments(h,23,600,700),[{from:600,to:700,value:1}]);
 assert.ok(digitalSegments(h,22,0,700)[0].from>0); // dropped oscillations are not reconstructed
});
