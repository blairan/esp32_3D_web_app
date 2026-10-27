import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pins, categoryFor, descriptionFor, titleFor } from './board.ts';

test('all 38 physical pins match the independently reviewed CSV, preserving GPIO aliases', () => {
  const rows = readFileSync(new URL('../docs/esp32-devkitc-v4-pins.csv', import.meta.url), 'utf8').trim().split(/\r?\n/).slice(1).map(row => row.split(','));
  assert.equal(pins.length, 38);
  assert.equal(new Set(pins.map(pin => pin.pinId)).size, 38);
  for (const row of rows) {
    const pin = pins.find(pin => pin.pinId === row[1]); assert.ok(pin);
    assert.equal(pin.silkscreen, row[4]);
    assert.equal(pin.gpio, row[6] === '' ? null : Number(row[6]));
    assert.equal(pin.role, row[7]);
  }
  for (const header of ['J2', 'J3']) assert.deepEqual(pins.filter(pin => pin.header === header).map(pin => pin.position), Array.from({length:19}, (_, i) => i + 1));
});
test('reserved flash pins, input-only pins and non-GPIO roles never receive a generic GPIO explanation', () => {
  assert.deepEqual(pins.filter(pin => pin.category === 'reserved').map(pin => pin.gpio).sort((a,b) => a! - b!), [6,7,8,9,10,11]);
  assert.deepEqual(pins.filter(pin => pin.category === 'input').map(pin => pin.gpio).sort((a,b) => a! - b!), [34,35,36,39]);
  for (const pin of pins.filter(pin => pin.category === 'reserved')) assert.match(descriptionFor(pin), /請勿連接外部元件/);
  for (const pin of pins.filter(pin => pin.category === 'input')) assert.match(descriptionFor(pin), /不能驅動 LED/);
  for (const pin of pins.filter(pin => ['power','ground','enable'].includes(pin.role))) assert.equal(pin.gpio, null);
  assert.equal(categoryFor({gpio:0,role:'gpio',restrictions:'啟動綁定腳'}), 'special');
});
test('all three GND locations remain independently selectable; USB-facing labels do not alias GPIO numbers', () => {
  assert.deepEqual(pins.filter(pin => pin.role === 'ground').map(pin => pin.pinId), ['J2-14','J3-01','J3-07']);
  assert.equal(pins.find(pin => pin.pinId === 'J3-02')?.gpio, 23);
  assert.equal(pins.find(pin => pin.silkscreen === 'D2')?.gpio, 9);
  assert.equal(pins.find(pin => pin.silkscreen === 'D0')?.gpio, 7);
  assert.equal(titleFor(pins.find(pin => pin.silkscreen === 'EN')!), 'EN');
});
test('model positions preserve official header order without overlapping physical pin centers', () => {
  assert.equal(new Set(pins.map(pin => `${pin.x},${pin.y}`)).size, 38);
  for (const pin of pins) assert.equal(pin.x < 0, pin.header === 'J2');
  assert.ok(pins.find(pin => pin.pinId === 'J2-01')!.y > pins.find(pin => pin.pinId === 'J2-19')!.y);
});
