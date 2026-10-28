import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exampleWires,analyzeDeviceWires,analyzeCircuit,currentPath,circuitReducer,initialCircuitState} from './circuit.ts';
import {pinById} from './board.ts';
import {parseProgram} from './program/language.ts';
import {ProgramRuntime} from './program/runtime.ts';
import {TeachingPeripherals} from './program/peripherals.ts';
import {solutions} from './program/solutions.ts';
import {scaffoldFor,deviceSuggestions} from './program/completion.ts';
const at={line:7,column:3};
const healthy={climate:{temperature:25,humidity:60},oledWired:true};
const dht=(body:string,setup='probe.begin();',pin=4)=>`DHT probe(${pin}, DHT22); void setup() {${setup}} void loop() {${body} delay(100);}`;
const oled=(body:string,setup='Wire.begin(21,22); screen.begin(SSD1306_SWITCHCAPVCC,0x3C);')=>`Adafruit_SSD1306 screen(128,64,&Wire,-1); void setup() {${setup}} void loop() {${body} delay(100);}`;
const text=(r:ProgramRuntime)=>r.snapshot().oled.glyphs.map(g=>g.text).join('');
function advance(r:ProgramRuntime,ms:number){while(r.snapshot().timeMs+50<ms)r.advanceTo(r.snapshot().timeMs+50);return r.advanceTo(ms);}
test('DHT and OLED physical maps use GPIO4, 21 and 22 with separate supply/ground',()=>{
 assert.equal(pinById.get('J3-13')?.gpio,4);assert.equal(pinById.get('J3-06')?.gpio,21);assert.equal(pinById.get('J3-03')?.gpio,22);
 for(const [id,n] of [['climate-dht',6],['oled-i2c',4]] as const){const ws=exampleWires(id);assert.equal(ws.length,n);assert.ok(analyzeDeviceWires(ws,id).valid);assert.ok(analyzeCircuit(ws,'LOW',id).valid);for(const w of ws.filter(w=>w.from.startsWith('dht:')||w.to.startsWith('dht:')||id==='oled-i2c'))assert.ok(!analyzeDeviceWires(ws.filter(x=>x.id!==w.id),id).valid);}
});
test('device wiring rejects swapped signals, 5V, shorts, LED cross connections and unknown terminals',()=>{
 for(const id of ['climate-dht','oled-i2c'] as const){const ws=exampleWires(id),prefix=id==='climate-dht'?'dht':'oled';for(const bad of [{id:'bad',from:'J2-19',to:prefix+':vcc'},{id:'bad',from:'J2-01',to:prefix+':gnd'},{id:'bad',from:prefix+':vcc',to:prefix+(prefix==='dht'?':data':':sda')},{id:'bad',from:prefix+':gnd',to:'led:a'},{id:'bad',from:'unknown',to:prefix+':vcc'}])assert.ok(!analyzeDeviceWires([...ws,bad],id).valid);}
 const swapped=exampleWires('oled-i2c').map(w=>({...w,from:w.from==='J3-06'?'J3-03':w.from==='J3-03'?'J3-06':w.from}));assert.ok(!analyzeDeviceWires(swapped,'oled-i2c').valid);
 const ws=exampleWires('climate-dht');assert.ok(analyzeCircuit(ws,'HIGH','climate-dht').lit);assert.ok(currentPath(ws,'HIGH','climate-dht').length>0);assert.deepEqual(currentPath(exampleWires('oled-i2c'),'HIGH','oled-i2c'),[]);
});
test('DHT temperature and humidity share a cache for exactly 2000 virtual milliseconds',()=>{
 const model=new TeachingPeripherals(healthy);assert.throws(()=>model.readDht(false,0,at),/begin/);model.beginDht();assert.equal(model.readDht(false,0,at),25);model.setInputs({climate:{temperature:40,humidity:90},oledWired:true});assert.equal(model.readDht(true,1999,at),60);assert.equal(model.readDht(true,2000,at),90);assert.equal(model.readDht(false,2000,at),40);assert.equal(model.snapshot().climate?.timeMs,2000);
 const copied=model.snapshot();copied.climate!.humidity=1;assert.equal(model.snapshot().climate?.humidity,90);
});
test('DHT invalid input or disconnected refresh diagnoses without inventing a sample',()=>{
 const model=new TeachingPeripherals(healthy);model.beginDht();model.readDht(false,0,at);model.setInputs({climate:null,oledWired:true});assert.equal(model.readDht(false,1999,at),25);assert.throws(()=>model.readDht(false,2000,at),/讀取失敗/);for(const c of [{temperature:-41,humidity:60},{temperature:81,humidity:60},{temperature:0,humidity:101},{temperature:0,humidity:-1},{temperature:1.5,humidity:60}])assert.throws(()=>model.setInputs({climate:c,oledWired:true}),/整數/);
});
test('DHT reference gates LED at inclusive temperature or humidity thresholds',()=>{
 for(const [t,h,level] of [[29,79,'LOW'],[30,79,'HIGH'],[29,80,'HIGH'],[-40,0,'LOW'],[80,100,'HIGH']] as const){const r=new ProgramRuntime(parseProgram(solutions['climate-dht'].code,'climate-dht'),'HIGH',0,100,{climate:{temperature:t,humidity:h},oledWired:false});assert.equal(r.advanceTo(0).level,level);r.setDevices({climate:{temperature:25,humidity:60},oledWired:false});assert.equal(advance(r,1999).level,level);assert.equal(advance(r,2000).level,'LOW');}
});
test('DHT requires initialization and bound literal pin, fails when missing and keeps names isolated',()=>{
 for(const [code,re] of [[dht('int n = probe.readHumidity();',''),/begin/],[dht('int n = probe.readHumidity();','probe.begin();',18),/GPIO4/]] as const)assert.throws(()=>new ProgramRuntime(parseProgram(code,'climate-dht')).advanceTo(0),re);
 assert.throws(()=>new ProgramRuntime(parseProgram(dht('int n = probe.readHumidity();'),'climate-dht'),'HIGH',0,100,{climate:null,oledWired:false}).advanceTo(0),/讀取失敗/);
 for(const code of [dht('probe.readHumidity();'),dht('int probe = 1;'),'int pin=4; DHT probe(pin,DHT22); void setup() {} void loop(){delay(1);}',dht('int n=probe.readTemperature(true);'),dht('int n=probe.__proto__();')])assert.throws(()=>parseProgram(code,'climate-dht'));
});
test('OLED writes buffer only until display, clear does not reset cursor or front frame',()=>{
 const r=new ProgramRuntime(parseProgram(oled('screen.print("A"); screen.display(); delay(100); screen.clearDisplay(); screen.print("B"); delay(100); screen.display(); delay(500);'),'oled-i2c'));
 r.advanceTo(0);assert.equal(text(r),'A');r.advanceTo(100);assert.equal(text(r),'A');r.advanceTo(200);assert.equal(text(r),'B');assert.equal(r.snapshot().oled.glyphs[0].x,6);
 const snap=r.snapshot();snap.oled.glyphs[0].text='X';assert.equal(text(r),'B');
});
test('OLED reference publishes increasing counter frames each second',()=>{
 const r=new ProgramRuntime(parseProgram(solutions['oled-i2c'].code,'oled-i2c'));assert.equal(r.advanceTo(0).oled.begun,true);assert.equal(text(r),'ESP32 LabCount: 0');assert.equal(advance(r,999).oled.revision,2);advance(r,1000);assert.equal(text(r),'ESP32 LabCount: 1');assert.equal(r.snapshot().variables.count,2);advance(r,2000);assert.equal(text(r),'ESP32 LabCount: 2');
});
test('OLED initialization rejects missing bus, wrong SDA/SCL, address, wiring and uninitialized calls',()=>{
 for(const [setup,re] of [['screen.begin(SSD1306_SWITCHCAPVCC,0x3C);',/Wire.begin/],['Wire.begin(22,21); screen.begin(SSD1306_SWITCHCAPVCC,0x3C);',/SDA 21/],['Wire.begin(21,22); screen.begin(SSD1306_SWITCHCAPVCC,0x3D);',/0x3C/],['',/begin/]] as const)assert.throws(()=>new ProgramRuntime(parseProgram(oled('screen.display();',setup),'oled-i2c')).advanceTo(0),re);
 const r=new ProgramRuntime(parseProgram(oled('screen.display();'),'oled-i2c'));r.advanceTo(0);r.setDevices({climate:null,oledWired:false});assert.throws(()=>r.advanceTo(100),/接線/);
 assert.throws(()=>new ProgramRuntime(parseProgram(oled(''),'oled-i2c'),'HIGH',0,100,{climate:null,oledWired:false}).advanceTo(0),/接線/);
});
test('OLED cursor, size, wrap, newline, clipping and buffer limits are bounded',()=>{
 const model=new TeachingPeripherals(healthy);model.wireBegin(21,22,at);model.oledCall('begin',[60],at);model.oledCall('setCursor',[120,0],at);model.oledCall('print',['AB\nC'],at);model.oledCall('display',[],at);assert.deepEqual(model.snapshot().oled.glyphs.map(({text,x,y})=>({text,x,y})),[{text:'A',x:120,y:0},{text:'B',x:0,y:8},{text:'C',x:0,y:16}]);
 for(const [method,args] of [['setTextSize',[0]],['setTextSize',[3]],['setCursor',[-1,0]],['setCursor',[128,0]],['setCursor',[0,64]]] as [string,number[]][])assert.throws(()=>model.oledCall(method,args,at));
 model.oledCall('clearDisplay',[],at);model.oledCall('setCursor',[0,63],at);model.oledCall('println',['A'],at);model.oledCall('print',['B'],at);model.oledCall('display',[],at);assert.equal(model.snapshot().oled.glyphs.map(g=>g.text).join(''),'A');
 model.oledCall('clearDisplay',[],at);for(let i=0;i<256;i++){model.oledCall('setCursor',[0,0],at);model.oledCall('print',['a'],at);}assert.throws(()=>model.oledCall('print',['a'],at),/256/);
});
test('OLED accepts escaped ASCII and decimal address but rejects arbitrary strings/methods/constructors',()=>{
 const r=new ProgramRuntime(parseProgram(oled('screen.print("Hi\\n\\\"\\\\"); screen.println(-7); screen.display();','Wire.begin(21,22); screen.begin(SSD1306_SWITCHCAPVCC,60);'),'oled-i2c'));r.advanceTo(0);assert.equal(text(r),'Hi"\\-7');
 for(const body of ['screen.print("中文");','screen.print("\\t");','screen.print("'+ 'a'.repeat(81)+'");','screen.print("unterminated);','screen.print(1,2);','screen.printf("A");','screen.__proto__();','screen.begin("SSD1306_SWITCHCAPVCC",60);','screen.setTextColor("SSD1306_WHITE");','"Wire".begin(21,22);','screen."display"();','screen "." display();','int n = 0; n "=" 1;','int x = "HIGH";','int x = "millis"();','int x = 1 "+" 2;','if (1 "==" 1) {}'])assert.throws(()=>parseProgram(oled(body),'oled-i2c'),body);
 for(const code of [oled('').replace('128,64','128,32'),oled('').replace('&Wire','&other'),oled('').replace('-1','4'),oled('').replace('void setup','Adafruit_SSD1306 other(128,64,&Wire,-1); void setup'),oled('').replace('void setup','void "setup"'),oled('').replace('Adafruit_SSD1306','"Adafruit_SSD1306"')])assert.throws(()=>parseProgram(code,'oled-i2c'));
});
test('new peripheral syntax remains scoped and cannot bypass runtime budgets',()=>{
 for(const id of ['blink','button-led','servo-angle','pir-delay'] as const){assert.throws(()=>parseProgram(dht(''),id));assert.throws(()=>parseProgram(oled(''),id));}
 assert.throws(()=>parseProgram(oled('digitalWrite(21,HIGH);'),'oled-i2c'));
 assert.throws(()=>new ProgramRuntime(parseProgram(oled('screen.display();').replace('delay(100);',''),'oled-i2c')).advanceTo(0),/正值 delay/);
 assert.throws(()=>new ProgramRuntime(parseProgram(dht('delay(60001);'),'climate-dht')).advanceTo(0),/60000/);
});
test('device completions follow renamed objects and initial exercises remain incomplete',()=>{
 assert.ok(deviceSuggestions('DHT weather(4,DHT22);','climate-dht').some(s=>s.label==='weather.readHumidity'&&s.template.startsWith('weather.')));assert.ok(deviceSuggestions('Adafruit_SSD1306 oled(128,64,&Wire,-1);','oled-i2c').some(s=>s.label==='oled.display'));
 for(const id of ['climate-dht','oled-i2c'] as const){assert.ok(!scaffoldFor(id).includes('.begin('));let s=circuitReducer(initialCircuitState,{type:'lesson',lessonId:id});s=circuitReducer(s,{type:'example'});s=circuitReducer(s,{type:'temperature',value:40});s=circuitReducer(s,{type:'humidity',value:90});s=circuitReducer(s,{type:'climate-fault',value:true});s=circuitReducer(s,{type:'example'});assert.deepEqual(s.wires,[]);assert.equal(s.temperature,25);assert.equal(s.humidity,60);assert.equal(s.climateFault,false);}
});
