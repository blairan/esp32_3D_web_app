import {test} from 'node:test';
import assert from 'node:assert/strict';
import {declaredVariables,lessonSuggestions,programScaffold} from './completion.ts';
import {parseProgram} from './language.ts';
test('practice starts with structure and no completed LED solution',()=>{
 const program=parseProgram(programScaffold);assert.equal(program.setup.length,0);assert.equal(program.loop.length,0);
 assert.ok(!/digitalWrite|pinMode|delay\(/.test(programScaffold));
});
test('suggested statements obey the runtime grammar without suggesting unsupported APIs',()=>{
 assert.deepEqual(lessonSuggestions.map(item=>item.label),['pinMode','digitalWrite','delay','int','OUTPUT','HIGH','LOW']);
 const statements=lessonSuggestions.filter(item=>item.type==='function'||item.label==='int').map(item=>item.template.replace(/\$\{\d+:([^}]+)\}/g,'$1')).join('\n');
 assert.doesNotThrow(()=>parseProgram(`void setup() { ${statements} } void loop() { delay(1); }`));
});
test('variable suggestions ignore comments, future declarations and other function locals',()=>{
 assert.deepEqual(declaredVariables('int ledPin = 23; // int fake = 1;\nvoid setup() { int local = 1; }\nvoid loop() { int waitMs = 1000;'),['ledPin','waitMs']);
 assert.deepEqual(declaredVariables('void setup() { /* int fake=1; */ int local=1;'),['local']);
});
