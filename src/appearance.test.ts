import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accentTokens,contrast,defaultAppearance,readAppearance} from './appearance.ts';
test('appearance preferences validate unknown storage values and recover safely',()=>{
 for(const raw of [null,'bad JSON','{}','{"accent":"url(evil)","flow":"yes"}'])assert.deepEqual(readAppearance(raw),defaultAppearance);
 assert.deepEqual(readAppearance('{"accent":"#AABBCC","flow":false}'),{accent:'#aabbcc',flow:false});
});
test('custom theme colors retain accessible text contrast, including white and yellow',()=>{
 for(const accent of ['#3563e9','#7954d6','#d96c24','#ffffff','#ffff00','#000000','#12ddaa','#ff66cc']){
  const tokens=accentTokens(accent);assert.equal(tokens['--accent'],accent);
  assert.ok(contrast(tokens['--accent'],tokens['--accent-on'])>=4.5,accent);
  assert.ok(contrast(tokens['--accent-ink'],tokens['--accent-soft'])>=4.5,accent);
  assert.ok(contrast(tokens['--accent-ink'],'#ffffff')>=4.5,accent);
 }
});
