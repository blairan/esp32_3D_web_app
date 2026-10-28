import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCircuit, circuitReducer, exampleWires, initialCircuitState, wireError } from './circuit.ts';
import type { CircuitWire } from './circuit.ts';
const w = (pairs: string[][]): CircuitWire[] => pairs.map(([from, to], i) => ({id: String(i), from, to}));
test('correct series circuit lights only at HIGH and LOW remains a valid circuit', () => {
  assert.equal(analyzeCircuit(exampleWires(), 'HIGH').lit, true);
  assert.equal(analyzeCircuit(exampleWires(), 'LOW').lit, false);
  assert.equal(analyzeCircuit(exampleWires(), 'LOW').valid, true);
});
test('all three physical grounds work, including wire chains between distinct common grounds', () => {
  for (const ground of ['J3-01','J3-07','J2-14']) {
    const wires = exampleWires();wires[2].to = ground;
    assert.equal(analyzeCircuit(wires, 'HIGH').lit, true);
  }
  const wires = exampleWires();wires.push({id:'gnd',from:'J2-14',to:'J3-07'});
  assert.equal(analyzeCircuit(wires,'HIGH').lit,true);
});
test('resistor has no polarity; wire direction and creation order do not change circuit behavior', () => {
  const wires=w([['resistor:b','J3-02'],['led:a','resistor:a'],['J3-01','led:k']]).reverse();
  assert.equal(analyzeCircuit(wires,'HIGH').lit,true);
});
test('resistor may be before or after LED in a valid series circuit', () => {
  assert.equal(analyzeCircuit(w([['J3-02','led:a'],['led:k','resistor:b'],['resistor:a','J3-07']]),'HIGH').lit,true);
});
test('LED reverse polarity never lights and has a specific diagnosis', () => {
  const wires=exampleWires().map(wire=>({...wire,from:wire.from==='led:k'?'led:a':wire.from,to:wire.to==='led:a'?'led:k':wire.to}));
  const result=analyzeCircuit(wires,'HIGH');assert.equal(result.code,'reversed');assert.equal(result.lit,false);
});
test('LED directly across source and ground is rejected for a missing resistor', () => {
  assert.equal(analyzeCircuit(w([['J3-02','led:a'],['led:k','J3-01']]),'HIGH').code,'missing_resistor');
});
test('a short across source and ground overrides an otherwise correct circuit', () => {
  assert.equal(analyzeCircuit([...exampleWires(),{id:'short',from:'J3-02',to:'J3-07'}],'HIGH').code,'short');
});
test('bypassed resistor or LED are rejected instead of lighting', () => {
  assert.equal(analyzeCircuit([...exampleWires(),{id:'bypass',from:'resistor:a',to:'resistor:b'}],'HIGH').code,'resistor_bypassed');
  assert.equal(analyzeCircuit([...exampleWires(),{id:'bypass',from:'led:a',to:'led:k'}],'HIGH').code,'led_bypassed');
});
test('deleting any required wire opens the circuit immediately', () => {
  for (let i=0;i<3;i++) { const result=analyzeCircuit(exampleWires().filter((_,n)=>n!==i),'HIGH');assert.equal(result.code,'open');assert.equal(result.lit,false); }
});
test('input-only, reserved, power, control, and unconfigured GPIOs are explicitly unsupported', () => {
  for (const id of ['J2-03','J2-16','J2-01','J2-02','J3-03']) {
    const wires=exampleWires();wires[0].from=id;
    const result=analyzeCircuit(wires,'HIGH');assert.equal(result.code,'unsupported');assert.equal(result.lit,false);
  }
});
test('unknown, self and duplicate wires are rejected before graph analysis', () => {
  for (const pairs of [[['unknown','led:a']],[['led:a','led:a']],[['J3-02','led:a'],['led:a','J3-02']]]) assert.equal(analyzeCircuit(w(pairs),'HIGH').code,'invalid');
  assert.ok(wireError(exampleWires(),'resistor:a','J3-02'));
});
test('point-to-connect reducer adds, cancels, prevents duplicates and preserves endpoints', () => {
  let state=circuitReducer(initialCircuitState,{type:'pick',terminal:'J3-02'});assert.equal(state.pending,'J3-02');
  state=circuitReducer(state,{type:'pick',terminal:'resistor:a'});assert.equal(state.wires.length,1);assert.equal(state.pending,null);
  state=circuitReducer(state,{type:'pick',terminal:'resistor:a'});state=circuitReducer(state,{type:'pick',terminal:'J3-02'});assert.equal(state.wires.length,1);
  state=circuitReducer(state,{type:'pick',terminal:'led:a'});state=circuitReducer(state,{type:'pick',terminal:'led:a'});assert.equal(state.pending,null);
  state=circuitReducer(state,{type:'remove',id:state.wires[0].id});assert.equal(state.wires.length,0);
});
test('loading example and clearing reset output to LOW, without mutating shared state', () => {
  let state=circuitReducer(initialCircuitState,{type:'level',level:'HIGH'});
  state=circuitReducer(state,{type:'example'});assert.equal(state.level,'LOW');assert.equal(state.wires.length,3);
  state=circuitReducer(state,{type:'clear'});assert.equal(state.level,'LOW');assert.equal(state.wires.length,0);assert.equal(initialCircuitState.wires.length,0);
});
test('empty circuit cannot light even if HIGH was selected', () => {
  assert.equal(analyzeCircuit([],'HIGH').code,'empty');assert.equal(analyzeCircuit([],'HIGH').lit,false);
});

test('example toggle restores learner wiring for all lessons and clear discards the preview', () => {
  for (const lessonId of ['blink', 'button-led', 'dual-led'] as const) {
    let state = circuitReducer(initialCircuitState, {type:'lesson',lessonId});
    state = circuitReducer(state, {type:'pick',terminal:'J3-02'});
    state = circuitReducer(state, {type:'pick',terminal:'resistor:b'});
    const original = state.wires;
    state = circuitReducer(state, {type:'example'});
    assert.deepEqual(state.wires, exampleWires(lessonId));
    assert.deepEqual(state.exampleBackup, original);
    state = circuitReducer(state, {type:'level',level:'HIGH',gpio:22});
    state = circuitReducer(state, {type:'example'});
    assert.deepEqual(state.wires, original);
    assert.equal(state.exampleBackup, null);
    assert.equal(state.level2, 'LOW');
    state = circuitReducer(state, {type:'example'});
    state = circuitReducer(state, {type:'clear'});
    assert.equal(state.exampleBackup, null);
    state = circuitReducer(state, {type:'example'});
    state = circuitReducer(state, {type:'example'});
    assert.deepEqual(state.wires, []);
    state = circuitReducer(state, {type:'example'});
    state = circuitReducer(state, {type:'lesson',lessonId:'blink'});
    assert.equal(state.exampleBackup, null);
    assert.deepEqual(original, [{id:'wire-1',from:'J3-02',to:'resistor:b'}]);
  }
});
