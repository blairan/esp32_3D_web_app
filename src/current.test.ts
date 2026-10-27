import {test} from 'node:test';
import assert from 'node:assert/strict';
import {currentPath,exampleWires} from './circuit.ts';
test('current follows source, resistor, LED polarity and ground rather than wire creation direction',()=>{
 const wires=exampleWires().map(wire=>({...wire,from:wire.to,to:wire.from})).reverse();
 const path=currentPath(wires,'HIGH');assert.equal(path.length,5);
 assert.ok(path.some(segment=>segment.kind==='wire'&&segment.from==='J3-02'&&segment.to==='resistor:a'));
 assert.ok(path.some(segment=>segment.kind==='led'&&segment.from==='led:a'&&segment.to==='led:k'));
 assert.ok(path.some(segment=>segment.kind==='wire'&&segment.from==='led:k'&&segment.to==='J3-07'));
});
test('LOW, open, reversed and shorted circuits never show current',()=>{
 assert.deepEqual(currentPath(exampleWires(),'LOW'),[]);
 assert.deepEqual(currentPath(exampleWires().slice(0,2),'HIGH'),[]);
 const reversed=exampleWires().map(wire=>({...wire,from:wire.from==='led:k'?'led:a':wire.from,to:wire.to==='led:a'?'led:k':wire.to}));assert.deepEqual(currentPath(reversed,'HIGH'),[]);
 assert.deepEqual(currentPath([...exampleWires(),{id:'short',from:'J3-02',to:'J3-01'}],'HIGH'),[]);
});
test('resistor can reverse or follow LED while conventional current stays forward through LED',()=>{
 const wires=[{id:'1',from:'J3-02',to:'led:a'},{id:'2',from:'led:k',to:'resistor:b'},{id:'3',from:'resistor:a',to:'J2-14'}];
 const path=currentPath(wires,'HIGH');assert.equal(path.length,5);
 assert.ok(path.some(segment=>segment.kind==='resistor'&&segment.from==='resistor:b'&&segment.to==='resistor:a'));
});
test('parallel ground returns display both branches but not a redundant GND-to-GND wire',()=>{
 const wires=[...exampleWires(),{id:'return',from:'led:k',to:'J3-01'},{id:'common',from:'J2-14',to:'J3-01'}];
 const path=currentPath(wires,'HIGH');assert.ok(path.some(segment=>segment.id==='return'));assert.ok(!path.some(segment=>segment.id==='common'));
});
