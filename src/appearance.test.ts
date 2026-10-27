import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accentTokens,backgroundTokens,contrast,defaultAppearance,readAppearance} from './appearance.ts';
test('appearance preferences validate unknown storage values and recover safely',()=>{
 for(const raw of [null,'bad JSON','{}','{"accent":"url(evil)","flow":"yes"}'])assert.deepEqual(readAppearance(raw),defaultAppearance);
 assert.deepEqual(readAppearance('{"accent":"#AABBCC","flow":false}'),{...defaultAppearance,accent:'#aabbcc',flow:false});
});
test('custom theme colors retain accessible text contrast, including white and yellow',()=>{
 for(const accent of ['#3563e9','#7954d6','#d96c24','#ffffff','#ffff00','#000000','#12ddaa','#ff66cc']){
  const tokens=accentTokens(accent);assert.equal(tokens['--accent'],accent);
  assert.ok(contrast(tokens['--accent'],tokens['--accent-on'])>=4.5,accent);
  assert.ok(contrast(tokens['--accent-ink'],tokens['--accent-soft'])>=4.5,accent);
  assert.ok(contrast(tokens['--accent-ink'],'#ffffff')>=4.5,accent);
 }
});

test('background preferences migrate and validate independently with readable foregrounds',()=>{
 const old=readAppearance('{"accent":"#7954d6","flow":false}');assert.equal(old.panel,'#ffffff');
 const prefs=readAppearance('{"page":"#000000","panel":"#ABCDEF","canvas":"invalid"}');
 assert.equal(prefs.page,'#000000');assert.equal(prefs.panel,'#abcdef');assert.equal(prefs.canvas,defaultAppearance.canvas);
 for(const color of ['#000000','#ffffff','#888888','#cc3377']){
  const tokens=backgroundTokens({...defaultAppearance,page:color,panel:color,canvas:color});
  for(const key of ['page','panel','canvas'])assert.ok(contrast(tokens[`--${key}-bg`],tokens[`--${key}-ink`])>=4.5);
 }
});
