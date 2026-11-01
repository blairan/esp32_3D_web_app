import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sineReference} from './sine.ts';
import {dutySegments,SignalRecorder} from './signals.ts';
import {PythonRuntime,parsePython} from '../pico/language.ts';
import {picoCourses} from '../pico/courses.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('sine reference has the expected zero crossings, signed peaks and period in milliseconds',()=>{
 const s=sineReference({frequency:1,amplitude:1,windowMs:1000});
 const at=(t:number)=>s.points.find(p=>p.timeMs===t)!.value;
 near(at(0),0);near(at(250),1);near(at(500),0);near(at(750),-1);near(at(1000),0);
 assert.equal(s.periodMs,1000);assert.equal(s.peakToPeak,2);assert.equal(s.cycles,1);
});
test('reference frequency and amplitude change the mathematical signal independently',()=>{
 const s=sineReference({frequency:2,amplitude:2,windowMs:1000});
 near(s.points.find(p=>p.timeMs===125)!.value,2);near(s.points.find(p=>p.timeMs===375)!.value,-2);
 assert.equal(s.periodMs,500);assert.equal(s.peakToPeak,4);assert.equal(s.cycles,2);
});
test('zero amplitude is flat and the slow frequency reference retains the correct period',()=>{
 const s=sineReference({frequency:.5,amplitude:0,windowMs:2000});assert.equal(s.periodMs,2000);assert.ok(s.points.every(p=>p.value===0));assert.equal(s.peakToPeak,0);
});
test('all supported sine ranges have bounded, ordered sampling with finite values',()=>{
 for(const frequency of [.5,1,5,10])for(const windowMs of [200,500,1000,2000]){
  const s=sineReference({frequency,amplitude:2,windowMs});
  assert.ok(s.points.length>=121&&s.points.length<=961);assert.equal(s.points[0].timeMs,0);assert.equal(s.points.at(-1)!.timeMs,windowMs);
  s.points.forEach((p,i)=>{assert.ok(Number.isFinite(p.value)&&Math.abs(p.value)<=2);if(i)assert.ok(p.timeMs>s.points[i-1].timeMs);});
 }
});
test('sine references reject unsupported or nonfinite parameter ranges',()=>{
 const p={frequency:1,amplitude:1,windowMs:1000};
 for(const frequency of [0,-1,NaN,Infinity,.1,20])assert.throws(()=>sineReference({...p,frequency}));
 for(const amplitude of [-1,NaN,Infinity,3])assert.throws(()=>sineReference({...p,amplitude}));
 for(const windowMs of [0,1,3000,NaN])assert.throws(()=>sineReference({...p,windowMs}));
});
test('PWM history normalizes native 8/16-bit commands and holds values until the next command',()=>{
 const r=new SignalRecorder();r.record({channel:10,timeMs:100,kind:'pwm',value:128});r.record({channel:10,timeMs:200,kind:'pwm',value:255});
 assert.deepEqual(dutySegments(r.snapshot(),10,150,250,255),[{from:150,to:200,value:128/255*100},{from:200,to:250,value:100}]);
 const p=new SignalRecorder();p.record({channel:15,timeMs:0,kind:'pwm',value:32768});near(dutySegments(p.snapshot(),15,0,50,65535)[0].value,32768/65535*100);
});
test('PWM history leaves uninitialized and intervening digital intervals blank',()=>{
 const r=new SignalRecorder();r.record({channel:23,timeMs:10,kind:'pwm',value:64});r.record({channel:23,timeMs:20,kind:'digital',value:1});r.record({channel:23,timeMs:40,kind:'pwm',value:255});
 assert.deepEqual(dutySegments(r.snapshot(),23,0,50,255),[{from:10,to:20,value:64/255*100},{from:40,to:50,value:100}]);assert.deepEqual(dutySegments(r.snapshot(),22,0,50,255),[]);
});
test('actual Pico breathing commands keep their rising and falling triangle trend',()=>{
 const r=new PythonRuntime(parsePython(picoCourses['pwm-breathing'].answer,'pwm-breathing'));
 let s=r.advanceTo(0);for(let t=20;t<=2560;t+=20)s=r.advanceTo(t);
 const values=dutySegments(s.waveform,15,0,2560,65535);
 assert.equal(values[0].value,0);assert.equal(values.find(v=>v.from===1280)!.value,100);assert.equal(values.at(-1)!.value,0);
 assert.ok(values.filter(v=>v.from>0&&v.from<1280).every(v=>v.value>0&&v.value<100));
});
