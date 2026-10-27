import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProgram,blinkExample,ProgramError,limits} from './language.ts';
import {ProgramRuntime} from './runtime.ts';
const source=(body:string,setup='pinMode(23, OUTPUT);')=>`void setup() { ${setup} }\nvoid loop() { ${body} }`;
const run=(code:string,time=0)=>new ProgramRuntime(parseProgram(code)).advanceTo(time);
test('Blink follows exact virtual timestamps and retains waiting output',()=>{
 const runtime=new ProgramRuntime(parseProgram(blinkExample));
 assert.equal(runtime.advanceTo(0).level,'HIGH');assert.equal(runtime.advanceTo(999).level,'HIGH');
 assert.equal(runtime.advanceTo(1000).level,'LOW');assert.equal(runtime.advanceTo(1999).level,'LOW');assert.equal(runtime.advanceTo(2000).level,'HIGH');
 assert.deepEqual(runtime.advanceTo(3000).trace.map(({timeMs,level})=>[timeMs,level]),[[0,'HIGH'],[1000,'LOW'],[2000,'HIGH'],[3000,'LOW']]);
});
test('global variables and initialized function locals resolve without executing JavaScript',()=>{
 const runtime=new ProgramRuntime(parseProgram('int pin = 23;\nint wait = 250;\n'+source('int duration = wait; digitalWrite(pin, HIGH); delay(duration); digitalWrite(pin, LOW); delay(duration);','pinMode(pin, OUTPUT);')));
 assert.equal(runtime.advanceTo(0).level,'HIGH');assert.equal(runtime.advanceTo(250).level,'LOW');assert.equal(runtime.advanceTo(500).level,'HIGH');
});
test('local declarations are recreated on each loop and setup locals do not leak',()=>{
 assert.equal(run(source('int pin = 23; digitalWrite(pin, HIGH); delay(100);'),500).level,'HIGH');
 assert.throws(()=>run(source('digitalWrite(pin, HIGH); delay(10);','int pin = 23; pinMode(pin, OUTPUT);')),/未知變數/);
});
test('single-line and multiline comments, CRLF, and either function order are accepted',()=>{
 const code='/* start\ncomment */\r\nvoid loop() { digitalWrite(23, HIGH); delay(10); }\r\n// setup\r\nvoid setup() { pinMode(23, OUTPUT); }';assert.equal(run(code).level,'HIGH');
});
test('unsupported loops include line and column diagnostics',()=>{
 try{parseProgram('void setup() {}\nvoid loop() {\n  while (1) {}\n}');assert.fail('must reject');}catch(error){assert.ok(error instanceof ProgramError);assert.equal(error.line,3);assert.equal(error.column,3);assert.match(error.message,/while/);}
});
test('functions, for, Serial, includes, arrays, arithmetic and reassignment are rejected',()=>{
 for(const body of ['for (;;) {}','Serial.println(1);','foo();','int a = 1 + 2;','int a[3];','int a = 1; a = 2;'])assert.throws(()=>parseProgram(source(body)),ProgramError);
 assert.throws(()=>parseProgram('#include <Arduino.h>\n'+source('delay(1);')),/#include/);
 assert.throws(()=>parseProgram(source('delay(1);')+'\nvoid foo() {}'),/setup.*loop/);
});
test('setup and loop are required once, without parameters or nested blocks',()=>{
 for(const code of ['void setup() {}','void loop() {}','void setup() {} void setup() {} void loop() {}','void setup(int n) {} void loop() {}',source('{ delay(1); }')])assert.throws(()=>parseProgram(code),ProgramError);
});
test('missing semicolon, unterminated block/comment and invalid constants have diagnostics',()=>{
 for(const code of [source('delay(1)'),source('delay(1);').slice(0,-1),'/* missing',source('digitalWrite(23, 1);'),source('delay(1);','pinMode(23, INPUT);')])assert.throws(()=>parseProgram(code),ProgramError);
});
test('unknown, input-only, reserved, and other unconfigured GPIOs are diagnosed',()=>{
 for(const [pin,message] of [[99,'未知'],[34,'只能輸入'],[9,'Flash'],[22,'只支援 GPIO23']] as const)assert.throws(()=>run(source(`digitalWrite(${pin}, HIGH); delay(1);`,`pinMode(${pin}, OUTPUT);`)),new RegExp(message));
});
test('digitalWrite requires prior OUTPUT configuration',()=>{assert.throws(()=>run(source('digitalWrite(23, HIGH); delay(100);','')),/pinMode/);});
test('delay accepts zero but rejects negative and excessive durations',()=>{
 assert.equal(run(source('delay(0); digitalWrite(23, HIGH); delay(1);')).level,'HIGH');
 for(const duration of [-1,60001])assert.throws(()=>run(source(`delay(${duration});`)),/delay 必須/);
 assert.equal(run(source('delay(60000);')).timeMs,0);
});
test('loops without positive delay, including zero-delay loops, stop with a useful diagnostic',()=>{
 for(const body of ['','digitalWrite(23, HIGH);','delay(0);'])assert.throws(()=>run(source(body)),/loop/);
});
test('source, token, statement and integer limits fail closed',()=>{
 assert.throws(()=>parseProgram(' '.repeat(limits.source+1)),/字元/);
 assert.throws(()=>parseProgram('\n'.repeat(limits.lines)),/最多.*行/);
 assert.throws(()=>parseProgram(source('delay(1);'.repeat(257))),/陳述/);
 assert.throws(()=>parseProgram(source('int x = 2147483648; delay(1);')),/32 位元/);
 assert.throws(()=>parseProgram('a '.repeat(4001)),/過長/);
});
test('high-frequency programs respect per-tick operation budget',()=>{
 const runtime=new ProgramRuntime(parseProgram(source('digitalWrite(23, HIGH); delay(1); digitalWrite(23, LOW); delay(1);')));
 assert.throws(()=>runtime.advanceTo(10000),/預算/);
});
test('virtual time cannot run backward or exceed the documented limit',()=>{
 const runtime=new ProgramRuntime(parseProgram(blinkExample));runtime.advanceTo(50);
 assert.throws(()=>runtime.advanceTo(0),/虛擬時間/);assert.throws(()=>runtime.advanceTo(limits.virtualTime+1),/虛擬時間/);
});
test('trace is bounded and fresh runtimes reset clock, GPIO and globals',()=>{
 const runtime=new ProgramRuntime(parseProgram(blinkExample));runtime.advanceTo(12000);assert.equal(runtime.snapshot().trace.length,8);
 const fresh=new ProgramRuntime(parseProgram(blinkExample));assert.equal(fresh.snapshot().timeMs,0);assert.equal(fresh.snapshot().outputEnabled,false);assert.equal(fresh.snapshot().level,'LOW');
});
test('duplicate, unknown, uninitialized and self-referencing variables are rejected',()=>{
 assert.throws(()=>run(source('int x = 1; int x = 2; delay(1);')),/重複宣告/);
 assert.throws(()=>run(source('delay(missing);')),/未知變數/);
 assert.throws(()=>parseProgram(source('int x; delay(1);')),/預期/);
 assert.throws(()=>parseProgram(source('int while = 1; delay(1);')),/保留字/);
 assert.throws(()=>run('int x = 23;\n'+source('int x = x; delay(1);')),/引用自己/);
});
test('no arbitrary JavaScript, prototype access or dynamic code calls are accepted',()=>{
 for(const body of ['eval(1);','Function(1);','fetch(1);','self.postMessage(1);','__proto__.x = 1;','digitalWrite.constructor(1);'])assert.throws(()=>parseProgram(source(body)),ProgramError);
});
