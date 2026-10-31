import {unoText} from '../boards/lessonProfiles.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readLearningLocation,learningHash,learningSteps} from './navigation.ts';
import {arduinoGuide} from './courseGuide.ts';
import {lessons} from '../lessons.ts';
import {readAppearance,defaultAppearance,backgroundTokens,contrast} from '../appearance.ts';

test('saved teaching URLs and new result URLs open the intended step',()=>{
 for(const [hash,step] of [['#led','wiring'],['#wiring','wiring'],['#code','code'],['#intro','intro'],['#results','results']] as const){
  assert.deepEqual(readLearningLocation(hash,true),{exploring:false,step});
  assert.deepEqual(readLearningLocation(hash,false),{exploring:false,step});
 }
 for(const step of learningSteps)assert.equal(readLearningLocation(learningHash(step.id)).step,step.id);
});
test('exploration remains distinct from lesson steps with safe legacy entry defaults',()=>{
 assert.deepEqual(readLearningLocation('#explore'),{exploring:true,step:'intro'});
 assert.equal(readLearningLocation('',true).exploring,true);
 assert.equal(readLearningLocation('',false).exploring,false);
 assert.equal(readLearningLocation('#unknown').step,'intro');
 assert.equal(learningHash('explore'),'#explore');
});
test('all 36 Arduino introductions have their own goal, phenomenon, materials and Wiki',()=>{
 for(const id of Object.keys(lessons) as (keyof typeof lessons)[]){
  for(const uno of [false,true]){const guide=arduinoGuide(id,uno);assert.ok(guide.goal&&guide.expected&&guide.topic,id);assert.ok(guide.parts.length>0,id);assert.equal(new Set(guide.parts).size,guide.parts.length);}
 }
 assert.match(arduinoGuide('blink',true).goal,/D10/);
 assert.match(arduinoGuide('blink').goal,/GPIO23/);
 assert.ok(!arduinoGuide('ultrasonic-alert',true).parts.some(p=>/分壓/.test(p)));
 assert.ok(arduinoGuide('ultrasonic-alert').parts.some(p=>/分壓/.test(p)));
 for(const id of ['ultrasonic-alert','pir-delay'] as const)assert.ok(!arduinoGuide(id,true).parts.includes('外部 5V 電源'));
 assert.ok(arduinoGuide('servo-angle',true).parts.includes('外部 5V 電源'));
 assert.ok(arduinoGuide('seven-counter').parts.includes('TM1637 四位數顯示器'));
});
test('the new manual palette is a default, existing background and accent selections survive',()=>{
 assert.equal(defaultAppearance.accent,'#bd632f');
 const old={accent:'#3563e9',flow:false,page:'#111111',panel:'#333333',canvas:'#555555'};
 assert.deepEqual(readAppearance(JSON.stringify(old)),old);
 assert.equal(readAppearance('{"accent":"#7954d6"}').accent,'#7954d6');
});

test('both code languages retain readable semantic colors on light, dark and midtone panels',()=>{
 for(const panel of ['#ffffff','#17212b','#888888','#cc3377','#fff4b0']){
  const tokens=backgroundTokens({...defaultAppearance,panel});
  for(const key of ['--code-keyword','--code-string','--code-number','--code-comment'])assert.ok(contrast(tokens[key],panel)>=4.5,panel+' '+key);
  assert.ok(contrast(tokens['--panel-accent-ink'],panel)>=4.5);assert.ok(contrast(tokens['--panel-accent-ink'],tokens['--panel-accent-soft'])>=4.5);
 }
});

test('UNO teaching comments translate GPIO names before formatting native digital and analog labels',()=>{
 assert.equal(unoText('GPIO23 LED / GPIO18 BUTTON / GPIO34 ADC','pot-dimming'),'D10 LED / D2 BUTTON / A0 ADC');
 assert.equal(unoText('// 設定 GPIO23 輸出','pwm-breathing'),'// 設定 D10 輸出');
 assert.equal(unoText('GPIO21 SDA / GPIO22 SCL','oled-i2c'),'A4 SDA / A5 SCL');
 assert.equal(unoText('analogWrite(23, duty);','pwm-breathing'),'analogWrite(10, duty);');
});
