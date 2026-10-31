import {test} from 'node:test';
import assert from 'node:assert/strict';
import {picoPins,picoBoard} from './board.ts';
import {parsePython,PythonRuntime,PythonError,picoScaffold,picoAnswer,exportPython} from './language.ts';
import {parsePicoDraft,makePicoDraft} from './storage.ts';
import {picoArticles,picoLimits} from './content.ts';
import {selectedBoard} from '../boards/selection.ts';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const program=(body:string)=>`from machine import Pin\nimport time\nled = Pin("LED", Pin.OUT)\nwhile True:\n${body}\n`;
const rejects=(s:string,re:RegExp)=>assert.throws(()=>parsePython(s),(e:unknown)=>e instanceof PythonError&&e.line>=1&&e.column>=1&&re.test(e.message));
test('official Pico 2 W physical mapping has 40 unique pins, 26 GPIO, top USB orientation and separate grounds',()=>{
 const expected=[0,1,null,2,3,4,5,null,6,7,8,9,null,10,11,12,13,null,14,15,16,17,null,18,19,20,21,null,22,null,26,27,null,28,null,null,null,null,null,null];
 const csv=readFileSync(new URL('../../docs/pico-2-w-pins.csv',import.meta.url),'utf8').trim().split('\n').slice(1);assert.equal(csv.length,40);for(let i=0;i<40;i++){const p=picoPins[i];assert.deepEqual(csv[i].split(','),[String(p.position),p.pinId,p.silkscreen,p.gpio===null?'':String(p.gpio),p.role]);}
 assert.equal(picoPins.length,40);assert.deepEqual(picoPins.map(p=>p.gpio),expected);assert.equal(new Set(picoPins.map(p=>p.pinId)).size,40);assert.equal(picoPins.filter(p=>p.gpio!==null).length,26);assert.equal(picoPins.filter(p=>p.role==='ground').length,8);
 assert.equal(picoPins[0].y,picoPins[39].y);assert.equal(picoPins[19].y,picoPins[20].y);assert.ok(picoPins[0].y>picoPins[19].y);assert.ok(picoPins[0].x<0&&picoPins[39].x>0);
 assert.deepEqual([30,33,35,36,37,38,39,40].map(n=>picoPins[n-1].silkscreen),['RUN','GND','ADC_VREF','3V3(OUT)','3V3_EN','GND','VSYS','VBUS']);assert.match(picoPins[32].restrictions,/類比接地/);assert.equal(picoBoard.logicVoltage,3.3);assert.ok(!picoPins.some(p=>p.gpio===25));
});
test('board selection recognizes Pico without expanding the Arduino board union or falling into UNO',()=>{assert.equal(selectedBoard('pico-2-w'),'pico-2-w');assert.equal(selectedBoard('uno-r3'),'uno-r3');assert.equal(selectedBoard('esp32'),'esp32');assert.equal(selectedBoard('invalid'),'esp32');});
test('reference blink follows exact millisecond boundaries and 2-second cycles',()=>{
 const r=new PythonRuntime(parsePython(picoAnswer));for(const [t,lit] of [[0,true],[999,true],[1000,false],[1999,false],[2000,true],[3000,false]] as const)assert.equal(r.advanceTo(t).lit,lit);assert.equal(r.snapshot.cycles,1);
});
test('value, toggle, setup commands, decimal seconds and renamed objects work',()=>{
 const source=program('    led.value(1)\n    time.sleep(.25)\n    led.toggle()\n    time.sleep_ms(750)').replaceAll('led','status').replace('while True:','status.off()\nwhile True:');const r=new PythonRuntime(parsePython(source));assert.equal(r.advanceTo(0).lit,true);assert.equal(r.advanceTo(249).lit,true);assert.equal(r.advanceTo(250).lit,false);assert.equal(r.advanceTo(1000).lit,true);
});
test('comments with delimiters are ignored and CRLF does not affect positions',()=>{const s=picoAnswer.replace('"LED"','"LED" # not valid here');rejects(s,/支援/);const r=new PythonRuntime(parsePython('# " # comment\r\n'+picoAnswer.replaceAll('\n','\r\n')));assert.equal(r.advanceTo(0).lit,true);});
test('scaffold and empty / pass loops are blocked, no complete answer is used implicitly',()=>{rejects(picoScaffold,/尚未完成/);rejects('from machine import Pin\nimport time\nled=Pin("LED",Pin.OUT)\nwhile True:\n#TODO',/非空白/);assert.throws(()=>exportPython(picoScaffold),PythonError);assert.ok(!picoScaffold.includes('led.on()'));});
test('indentation, tabs and syntax errors report original line and column',()=>{
 assert.throws(()=>parsePython(program('  led.on()\n    time.sleep(1)')),(e:unknown)=>e instanceof PythonError&&e.line===5&&e.column===3);
 rejects(program('\tled.on()\n\ttime.sleep(1)'),/4個空白/);rejects(picoAnswer.replace('while True:','while True'),/語法不完整/);
});
test('wrong board LED mapping and uninitialized / mismatched objects are diagnosed',()=>{
 rejects(picoAnswer.replace('"LED"','25'),/GPIO25/);rejects(picoAnswer.replace('led.on()','lamp.on()'),/物件名稱/);rejects(picoAnswer.replace('from machine import Pin\n',''),/先/);const keywords=JSON.parse(spawnSync('python3',['-c','import json,keyword;print(json.dumps(keyword.kwlist))'],{encoding:'utf8'}).stdout) as string[];for(const name of ['time','Pin',...keywords])rejects(picoAnswer.replace('led =',name+' ='),/保留字/);
});
test('arbitrary Python, other imports, assignments, nested loops, branches and external GPIO are rejected',()=>{
 for(const body of ['    exec("print(1)")','    eval("1")','    __import__("os")','    import os','    for i in range(2):','    while True:','    if True:','    count = 1','    led.value(2)','    led.value(1); led.off()'])rejects(program(body+'\n    time.sleep(1)'),/支援|縮排/);
 rejects(picoAnswer.replace('"LED"','0'),/支援/);
});
test('negative, oversized, fractional millisecond and zero-wait loops cannot execute',()=>{
 for(const wait of ['-1','61','0.0001','1e9','float("nan")'])rejects(program(`    led.on()\n    time.sleep(${wait})`),/等待|支援/);
 rejects(program('    led.on()\n    time.sleep_ms(1.5)'),/整數毫秒/);rejects(program('    led.on()\n    time.sleep(0)'),/正值|大於0/);
});
test('limits and runtime budgets stop extreme inputs without blocking the caller',()=>{
 rejects('#'+'a'.repeat(12000),/最多/);rejects(program(Array(257).fill('    led.on()').join('\n')),/256/);
 const r=new PythonRuntime(parsePython(program('    led.toggle()\n    time.sleep_ms(1)')));assert.throws(()=>r.advanceTo(100000),/預算/);const other=new PythonRuntime(parsePython(picoAnswer));assert.throws(()=>other.advanceTo(-1),/時間/);assert.throws(()=>other.advanceTo(86400001),/時間/);
});
test('main.py export preserves current learner code/comments and matches valid Python syntax',()=>{
 const source=program('    led.on() # my timing\n    time.sleep_ms(123)\n    led.off()\n    time.sleep_ms(321)');const e=exportPython(source);assert.equal(e.filename,'main.py');assert.ok(e.code.endsWith(source));assert.ok(e.code.includes('time.sleep_ms(123)'));assert.ok(!e.code.includes('time.sleep(1)'));const py=spawnSync('python3',['-c','import ast,sys; ast.parse(sys.stdin.read())'],{input:e.code,encoding:'utf8'});assert.equal(py.status,0,py.stderr);
});
test('separate JSON schema preserves incomplete drafts and rejects Arduino backups / mismatched boards',()=>{
 const draft=makePicoDraft(picoScaffold);assert.deepEqual(parsePicoDraft(JSON.stringify(draft)),draft);assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,boardId:'uno-r3'})),/格式/);assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,format:'interactive-lab-practice'})),/格式/);assert.throws(()=>parsePicoDraft(JSON.stringify({...draft,source:'a'.repeat(12001)})),/格式/);assert.throws(()=>parsePicoDraft('null'),/格式/);assert.throws(()=>parsePicoDraft('{'),/JSON/);
});
test('all Pico Wiki articles have beginner explanations, short examples, thought questions and official references',()=>{
 assert.equal(Object.keys(picoArticles).length,6);for(const a of Object.values(picoArticles)){assert.ok(a.sections.length>=2);assert.ok(a.mistake&&a.question&&a.example);assert.match(a.url,/^https:\/\/(docs\.micropython\.org|micropython\.org)\//);assert.ok(!a.example.includes('led.on()\n    time.sleep(1)\n    led.off()'));}assert.match(picoLimits,/不執行任意 Python/);
});
