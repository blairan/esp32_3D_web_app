// Execute the actual generated C++ with small fake hardware adapters. This tests
// integer/rollover/error behavior; the Arduino CLI separately checks real headers.
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildHardwareSketch} from '../src/hardware/exportSketch.ts';
import {solutions} from '../src/program/solutions.ts';
import {unoSolution} from '../src/uno/content.ts';
const root=mkdtempSync(join(tmpdir(),'lab-sketch-runtime-'));
const write=(name,text)=>writeFileSync(join(root,name),text);
write('Arduino.h',`#pragma once
#include <stdint.h>
#include <cmath>
#include <cassert>
#include <string>
#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define INPUT 0
#define INPUT_PULLUP 2
#define F(x) reinterpret_cast<const __FlashStringHelper *>(x)
class __FlashStringHelper;
inline uint32_t testNow=0;
inline int testInput=0, testLevel=0, testWrites=0, testDuty=0, testClears=0, testFrames=0, testBaud=0;
inline bool testStopped=false, testOledOK=true;
inline float testTemperature=-5.9f, testHumidity=60;
inline std::string testMessage;
struct SerialAdapter { void begin(int baud) { testBaud=baud; } void println(const __FlashStringHelper *msg) { testMessage=reinterpret_cast<const char *>(msg);testStopped=true; } };
inline SerialAdapter Serial;
inline uint32_t millis() { return testNow; }
inline void delay(uint32_t ms) { if(testStopped) { assert(ms>0);throw 1; } testNow+=ms; }
inline void pinMode(int,int) {}
inline void digitalWrite(int,int v) { testLevel=v;testWrites++; }
inline int digitalRead(int) { return testInput; }
inline void analogWrite(int,int v) { testDuty=v; }
`);
write('DHT.h',`#pragma once
#define DHT22 22
class DHT { public: DHT(int,int) {} void begin() {} float readTemperature() { return testTemperature; } float readHumidity() { return testHumidity; } };
`);
write('Wire.h',`#pragma once
struct WireAdapter { void begin() {} void begin(int,int) {} }; inline WireAdapter Wire;
`);
write('Adafruit_GFX.h','#pragma once\n');
write('Adafruit_SSD1306.h',`#pragma once
#define SSD1306_SWITCHCAPVCC 2
#define SSD1306_WHITE 1
class Adafruit_SSD1306 { public: Adafruit_SSD1306(int,int,WireAdapter *,int) {} bool begin(int,int) { return testOledOK; } void clearDisplay() { testClears++; } void display() { testFrames++; } void setTextSize(int) {} void setTextColor(int) {} void setCursor(int,int) {} template<class T> void print(T) {} template<class T> void println(T) {} };
`);
const cases=[
 ['rollover','pir-delay',`setup();testNow=0xfffffff0U;testInput=HIGH;loop();assert(testLevel==HIGH);testInput=LOW;testNow=0x20;loop();assert(testLevel==HIGH);testNow=0xbc0;loop();assert(testLevel==LOW);`],
 ['negative-pwm','pwm-breathing',`setup();for(int i=0;i<53;i++) { loop();assert(testDuty>=0&&testDuty<=255); } assert(step==-5); assert(brightness==245);`],
 ['negative-temperature','climate-dht',`setup();loop();assert(testNow>=4000);assert(labExport0ReadTemperature()==-5);assert(testLevel==LOW);assert(testBaud==115200);`],
 ['dht-nan','climate-dht',`setup();testTemperature=NAN;testLevel=HIGH;bool stopped=false;try { loop(); } catch(int) { stopped=true; } assert(stopped);assert(testLevel==LOW);assert(testMessage.find("NaN")!=std::string::npos);assert(labExport0Temperature==0);`],
 ['oled-failure','oled-i2c',`testOledOK=false;bool stopped=false;try { setup(); } catch(int) { stopped=true; } assert(stopped);assert(testWrites==0);assert(testClears==0);assert(testMessage.find("OLED")!=std::string::npos);`],
 ['combined-failure','environment-lab',`setup();testHumidity=NAN;testLevel=HIGH;bool stopped=false;try { loop(); } catch(int) { stopped=true; } assert(stopped);assert(testLevel==LOW);assert(testClears==1);assert(testFrames==1);`],
];
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw new Error(`${cmd} failed: ${r.stdout}\n${r.stderr}`);};
try {
 for(const boardId of ['uno-r3','esp32'])for(const [name,lessonId,body] of cases){
  const source=boardId==='uno-r3'?unoSolution(lessonId).code:solutions[lessonId].code;
  const sketch=buildHardwareSketch({source,boardId,lessonId});write('generated.ino',sketch.code);write('test.cpp',`#include "generated.ino"\nint main() { ${body} return 0; }\n`);
  run('g++',['-std=c++17','-Wall','-Wextra','-I',root,join(root,'test.cpp'),'-o',join(root,'test')]);run(join(root,'test'),[]);console.log(`PASS generated C++ ${boardId}/${name}`);
 }
} finally { rmSync(root,{recursive:true,force:true}); }
