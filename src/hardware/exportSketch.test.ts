import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildHardwareSketch} from './exportSketch.ts';
import {tokenizeSource,ProgramError} from '../program/language.ts';
import {solutions} from '../program/solutions.ts';
import {unoSolution} from '../uno/content.ts';
import type {LessonId} from '../lessons.ts';
const build=(source:string,lessonId:LessonId='blink',boardId:'esp32'|'uno-r3'='esp32')=>buildHardwareSketch({source,lessonId,boardId});
const program=(body:string,globals='',setup='')=>`${globals}\nvoid setup() { ${setup} }\nvoid loop() { ${body} }`;
const rejects=(source:string,lesson:LessonId,pattern:RegExp)=>assert.throws(()=>build(source,lesson),(e:unknown)=>e instanceof ProgramError&&e.line>0&&e.column>0&&pattern.test(e.message));
for(const boardId of ['uno-r3','esp32'] as const)for(const lessonId of Object.keys(solutions) as LessonId[])test(`${boardId}/${lessonId}: exports current reference source with exact native pins`,()=>{
 const source=boardId==='uno-r3'?unoSolution(lessonId).code:solutions[lessonId].code;
 const result=build(source,lessonId,boardId);assert.match(result.code,/#include <Arduino.h>/);assert.equal(result.target.fqbn,boardId==='uno-r3'?'arduino:avr:uno':'esp32:esp32:esp32');assert.match(result.filename,/^lab_.*\.ino$/);assert.ok(result.code.includes(boardId==='uno-r3'?'arduino:avr@1.8.8':'esp32:esp32@3.3.12'));
 if(lessonId==='oled-i2c')assert.ok(result.code.includes(boardId==='uno-r3'?'Wire.begin()':'Wire.begin(21, 22)'));
 if(lessonId==='servo-angle')assert.ok(result.code.includes(boardId==='uno-r3'?'#include <Servo.h>':'#include <ESP32Servo.h>'));
 if(lessonId==='seven-counter')assert.ok(result.code.includes(boardId==='uno-r3'?'digits(7,8)':'digits(22,21)'));
});
test('lexer source spans cover escaped strings and CRLF without counting comments as tokens',()=>{
 const source='// ignored\r\n  "a\\n\\\"b" /* ignored */ 23';const tokens=tokenizeSource(source,true);assert.equal(source.slice(tokens[0].start,tokens[0].end),'"a\\n\\\"b"');assert.equal(tokens[0].line,2);assert.equal(tokens[0].column,3);assert.equal(tokens[1].text,'23');
});
test('comments, names, formatting and non-answer source are preserved',()=>{
 const source=program('digitalWrite(customPin, HIGH); delay(123); // learner choice\n','// int pin = 2;\nint /* keep */ customPin = 23;','pinMode(customPin, OUTPUT);');const result=build(source);assert.ok(result.code.includes('// int pin = 2;'));assert.ok(result.code.includes('int32_t /* keep */ customPin = 23;'));assert.ok(result.code.includes('delay(123); // learner choice'));assert.ok(!result.code.includes('delay(1000);'));
});
test('all device objects can be renamed and helper prefix cannot collide',()=>{
 const source=solutions['environment-lab'].code.replaceAll('climate','weather').replace('Adafruit_SSD1306 display(', 'Adafruit_SSD1306 screen(').replaceAll('display.', 'screen.').replace('void setup','int labExport0Temperature = 9;\nvoid setup');const result=build(source,'environment-lab');assert.ok(result.code.includes('weather.readTemperature()'));assert.ok(result.code.includes('screen.begin('));assert.match(result.code,/labExport1ReadTemperature/);assert.ok(result.code.includes('int32_t labExport0Temperature = 9;'));
 const digits=build(solutions['seven-counter'].code.replaceAll('digits','counterDisplay'),'seven-counter');assert.ok(digits.code.includes('counterDisplay.showNumberDec(count)'));
});
test('unused libraries are not added; dependencies and versions are explicit',()=>{
 assert.deepEqual(build(solutions.blink.code).libraries,[]);const dht=build(solutions['climate-dht'].code,'climate-dht');assert.deepEqual(dht.libraries.map(l=>[l.name,l.version]),[['DHT sensor library','1.4.7'],['Adafruit Unified Sensor','1.1.15']]);assert.ok(!dht.code.includes('Wire.h'));assert.equal(build(solutions['servo-angle'].code,'servo-angle','uno-r3').libraries[0].version,'1.3.0');
});
test('time type inference follows aliases, scopes and later assignment; counters stay signed',()=>{
 const source=program('int now = millis(); int elapsed = now - last; last = now; if (elapsed >= 50) { count = count + 1; } delay(10);','int last = 0; int count = 0;');const code=build(source,'button-counter').code;assert.match(code,/uint32_t last = 0/);assert.match(code,/uint32_t now = millis/);assert.match(code,/uint32_t elapsed = now - last/);assert.match(code,/int32_t count = 0/);
});
test('unsigned subtraction survives rollover while signed negative temperature and PWM stay signed',()=>{
 const code=build(solutions['button-toggle'].code,'button-toggle').code;assert.ok(code.includes('uint32_t lastChange'));assert.ok(code.includes('uint32_t now'));const before=0xfffffff0,after=0x20;assert.equal((after-before)>>>0,48);assert.equal((((after-before)>>>0)>=50),false);assert.equal((0x22-before)>>>0,50);
 const negative=build(solutions['pwm-breathing'].code,'pwm-breathing','uno-r3').code;assert.ok(negative.includes('int32_t step'));assert.ok(negative.includes('step = 0L - 5L;'));
 const temp=build(solutions['climate-dht'].code.replace('>= 30','< -5'),'climate-dht').code;assert.ok(temp.includes('int32_t temperature'));assert.ok(temp.includes('< -5'));assert.ok(temp.indexOf('isnan(labExport0TempValue)')<temp.indexOf('static_cast<int32_t>(labExport0TempValue)'));assert.equal(Math.trunc(-5.9),-5);
});
test('widening integer arithmetic avoids AVR 16-bit intermediate overflow',()=>{const code=build(program('int total = 20000 + 20000; delay(10);'),'button-counter','uno-r3').code;assert.ok(code.includes('int32_t total = 20000L + 20000L;'));});
test('DHT guards NaN before conversion, caches both values, waits for warmup and halts cooperatively',()=>{
 const code=build(solutions['climate-dht'].code,'climate-dht').code;for(const text of ['Serial.begin(115200)','isnan(labExport0TempValue) || isnan(labExport0HumidityValue)','delay(2000UL - labExport0Elapsed)','digitalWrite(23, LOW)','while (true) { delay(1000); }','DhtBegun','HasSample','uint32_t(millis() -'])assert.ok(code.includes(text),text);
});
test('DHT call comments are retained, including line comments',()=>{
 const source=solutions['climate-dht'].code.replace('climate.readTemperature()','climate /* object */ . // method\n readTemperature(/* no args */)');const code=build(source,'climate-dht').code;for(const text of ['/* object */','// method\n','/* no args */'])assert.ok(code.includes(text));
});
test('OLED checks begin result, clears only initialized screen and never pulls I2C pins LOW',()=>{
 const only=build(solutions['oled-i2c'].code,'oled-i2c').code;assert.match(only,/if \(!\(display.begin\(/);assert.match(only,/if \(labExport0OledReady\)/);assert.ok(!only.includes('digitalWrite('));
 const combined=build(unoSolution('environment-lab').code,'environment-lab','uno-r3').code;assert.ok(combined.includes('digitalWrite(10, LOW)'));assert.ok(!combined.includes('digitalWrite(18, LOW)'));
});
test('scope analysis rejects unknown, duplicate and self-initialized variables with positions',()=>{
 rejects(program('delay(wait);'),'blink',/尚未/);rejects(program('delay(10);','int x = 1; int x = 2;'),'blink',/重複/);rejects(program('int x = x; delay(10);'),'blink',/自身/);rejects(program('delay(x);','','int x = 10;'),'blink',/尚未/);
 const code=build(program('int wait = 20; delay(wait);','int wait = 10;')).code;assert.ok(code.includes('int32_t wait = 20;'));
});
test('known Arduino, library and reserved implementation names report declaration position',()=>{
 for(const name of ['Serial','min','uint32_t','NAN','LED_BUILTIN','__helper','_Helper','PORTB','constexpr','and','SSD1306_LCDWIDTH'])rejects(`int ${name} = 0;\nvoid setup() {}\nvoid loop() { delay(1); }`,'blink',/衝突/);
 rejects(solutions['servo-angle'].code.replaceAll('arm','Serial'),'servo-angle',/衝突/);
});
test('ambiguous time/signed data, negative offsets, ordinary uses and timestamp ordering are blocked',()=>{
 rejects(program('int now = millis(); now = digitalRead(18); delay(1);'),'button-counter',/時間/);
 rejects(program('int now = millis(); int bad = now - 5; bad = -1; delay(1);'),'button-counter',/時間/);
 rejects(program('int now = millis(); digitalWrite(23, now); delay(1);'),'button-counter',/時間/);
 rejects(program('int now = millis(); if (now >= 1000) { delay(1); } delay(1);'),'button-counter',/回捲/);
});
test('empty scaffold, unsupported syntax, division by zero and syntax diagnostics block export',()=>{
 rejects('void setup() {}\nvoid loop() { /* TODO */ }','blink',/空白/);rejects(program('while (1) {}'),'blink',/while/);rejects(program('int n = 4 / 0; delay(1);'),'pot-dimming',/除數/);
 assert.throws(()=>build('void setup() {}\nvoid loop() {\n  delay(1)\n}'),(e:unknown)=>e instanceof ProgramError&&e.line===4&&e.column===1);
});

test('helper locals never shadow renamed learner device objects',()=>{
 const dht=build(solutions['climate-dht'].code.replaceAll('temperature','readingTemp').replaceAll('climate','temperature'),'climate-dht').code;assert.ok(dht.includes('temperature.readTemperature()'));assert.ok(!dht.includes('float temperature ='));
 const oled=build(solutions['oled-i2c'].code.replace('Adafruit_SSD1306 display(', 'Adafruit_SSD1306 message(').replaceAll('display.', 'message.'),'oled-i2c').code;assert.ok(oled.includes('message.clearDisplay()'));assert.ok(oled.includes('const __FlashStringHelper *labExport0Message'));
});

test('timestamp offsets and mixed timestamp/duration aliases are rejected; elapsed aliases remain safe',()=>{
 rejects(program('int mark = millis() - 5; if (mark >= 100) { delay(1); } delay(1);'),'button-counter',/回捲/);
 rejects(program('int mark = millis(); int elapsed = mark - last; mark = elapsed; delay(1);','int last = 0;'),'button-counter',/時間戳記/);
 const code=build(program('int now = millis(); int elapsed = now - last; int copy = elapsed; if (copy >= 50) { delay(1); } last = now; delay(1);','int last = 0;'),'button-counter').code;assert.ok(code.includes('uint32_t copy'));
});
