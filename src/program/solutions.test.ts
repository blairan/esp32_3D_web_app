import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solutions} from './solutions.ts';
import {parseProgram} from './language.ts';
import {ProgramRuntime} from './runtime.ts';
test('published Blink answer follows the explained 1000ms timing',()=>{
 const runtime=new ProgramRuntime(parseProgram(solutions.blink.code,'blink'));assert.equal(runtime.advanceTo(0).level,'HIGH');assert.equal(runtime.advanceTo(999).level,'HIGH');assert.equal(runtime.advanceTo(1000).level,'LOW');assert.equal(runtime.advanceTo(2000).level,'HIGH');
});
test('published button answer reads pull-up and responds on the explained 50ms poll',()=>{
 const runtime=new ProgramRuntime(parseProgram(solutions['button-led'].code,'button-led'),'HIGH');assert.equal(runtime.advanceTo(0).level,'LOW');runtime.setInput('LOW');assert.equal(runtime.advanceTo(49).level,'LOW');assert.equal(runtime.advanceTo(50).level,'HIGH');runtime.setInput('HIGH');assert.equal(runtime.advanceTo(100).level,'LOW');
});
