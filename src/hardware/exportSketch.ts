import {parseProgram,tokenizeSource,ProgramError,type Expression,type Statement,type SourceLocation,type Token} from '../program/language.ts';
import type {BoardId} from '../boards/types.ts';
import {lessons,type LessonId} from '../lessons.ts';
import {lessonPins} from '../boards/lessonProfiles.ts';
import {libraries,targets,type Library} from './targets.ts';
export interface SketchInput {boardId:BoardId;lessonId:LessonId;source:string}
export interface SketchChange {line:number;column:number;reason:string;before:string;after:string}
export interface HardwareSketch {filename:string;code:string;changes:SketchChange[];libraries:Library[];target:typeof targets[BoardId];notes:string[]}
interface Edit {start:number;end:number;text:string;reason:string;at:SourceLocation}
interface Binding {name:string;declaration:Extract<Statement,{kind:'declare'}>;values:Expression[];time:boolean}
// Names supplied by the selected cores, headers, C/C++ runtime and Arduino macros.
const conflicts=new Set(('Serial Serial0 Serial1 Serial2 Serial3 SerialUSB USB CDC ESP AVR LED_BUILTIN LED_BUILTIN_RX LED_BUILTIN_TX F PROGMEM PSTR FPSTR RAMEND B1 B0 min max abs round constrain map bit bitRead bitWrite bitSet bitClear bitClear bitValue lowByte highByte word byte boolean String Print Stream HardwareSerial TwoWire SPI NULL NAN INFINITY PI HALF_PI TWO_PI DEG_TO_RAD RAD_TO_DEG EULER DEC HEX OCT BIN LSBFIRST MSBFIRST CHANGE FALLING RISING NOT_AN_INTERRUPT DEFAULT EXTERNAL INTERNAL INTERNAL1V1 INTERNAL2V56 INTERNAL2V56_EXT int32_t uint32_t int8_t uint8_t int16_t uint16_t int64_t uint64_t size_t ptrdiff_t malloc calloc realloc free memcpy memset memmove strlen strcmp strcpy printf snprintf sprintf puts isnan isinf sqrt pow sin cos tan random randomSeed yield init main exit abort attachInterrupt detachInterrupt interrupts noInterrupts analogReference analogReadResolution analogWriteResolution analogWriteFrequency shiftIn shiftOut tone noTone micros delayMicroseconds F_CPU ARDUINO ARDUINO_ARCH_AVR ARDUINO_ARCH_ESP32 INPUT_PULLDOWN D0 D1 D2 D3 D4 D5 D6 D7 D8 D9 D10 D11 D12 D13 A6 A7 SDA SCL SS MOSI MISO SCK DAC1 DAC2 T0 T1 T2 T3 T4 T5 T6 T7 T8 T9 DHT11 DHT21 AM2301 SSD1306_BLACK SSD1306_INVERSE BLACK WHITE DISPLAY_HEIGHT DISPLAY_WIDTH').split(' '));
export function buildHardwareSketch({boardId,lessonId,source}:SketchInput):HardwareSketch {
 const program=parseProgram(source,lessonId,boardId),tokens=tokenizeSource(source,true),edits:Edit[]=[];
 const atToken=(at:SourceLocation)=>{const t=tokens.find(t=>t.line===at.line&&t.column===at.column);if(!t)throw new Error('Missing source position');return t;};
 const fail=(message:string,at:SourceLocation):never=>{throw new ProgramError(message,at);};
 const edit=(start:number,end:number,text:string,reason:string,at:SourceLocation)=>{edits.push({start,end,text,reason,at});};
 const names=tokens.filter(t=>t.kind==='name').map(t=>t.text);
 let prefix='labExport0';while(names.some(n=>n.startsWith(prefix)))prefix='labExport'+(Number(prefix.slice(9))+1);
 const checkedName=(token:Token)=>{if(conflicts.has(token.text)||/^__|^_[A-Z]|^ARDUINO_|^ESP_|^CONFIG_|^PORT[A-Z]$|^DDR[A-Z]$|^PIN[A-Z]$|^P[BCDEFGHJKL][0-7]$|^digitalPinTo|^portOutputRegister$|^portInputRegister$|^portModeRegister$/.test(token.text))fail(`「${token.text}」與 Arduino／函式庫符號衝突，請重新命名。`,token);};
 const bindings:Binding[]=[],refs=new Map<Expression,Binding>(),allExpressions:Expression[]=[],ordinaryUses:Expression[]=[],conditions:Extract<Statement,{kind:'if'}>[]=[];
 type Scope=Map<string,Binding>;
 const resolve=(expr:Expression,scope:Scope):void=>{
  allExpressions.push(expr);
  if(expr.kind==='variable'){const binding=scope.get(expr.name);if(!binding)fail(`變數「${expr.name}」尚未在此範圍宣告。`,expr.at);refs.set(expr,binding!);}
  else if(expr.kind==='binary'){resolve(expr.left,scope);resolve(expr.right,scope);}
  else if(expr.kind==='read'||expr.kind==='analog')resolve(expr.pin,scope);
  else if(expr.kind==='pulse'){resolve(expr.pin,scope);resolve(expr.timeout,scope);}
 };
 const declare=(s:Extract<Statement,{kind:'declare'}>,scope:Scope,own:Set<string>)=>{
  const token=tokens[tokens.indexOf(atToken(s.at))+1];checkedName(token);
  if(own.has(s.name)||[program.servoName,program.dht?.name,program.oledName,program.digitsName].includes(s.name))fail(`名稱「${s.name}」重複；請改用不同名稱。`,token);
  // Reject self-initialization even when an outer scope has the same name.
  const self=(e:Expression):boolean=>e.kind==='variable'?e.name===s.name:e.kind==='binary'?self(e.left)||self(e.right):false;
  if(self(s.value))fail('不支援使用自身名稱初始化；請拆開變數。',s.value.at);
  resolve(s.value,scope);const binding:Binding={name:s.name,declaration:s,values:[s.value],time:false};bindings.push(binding);scope.set(s.name,binding);own.add(s.name);
 };
 const global:Scope=new Map();const globalNames=new Set<string>();program.globals.forEach(s=>declare(s,global,globalNames));
 for(const name of [program.servoName,program.dht?.name,program.oledName,program.digitsName])if(name){const token=tokens.find(t=>t.kind==='name'&&t.text===name)!;checkedName(token);if(globalNames.has(name))fail(`裝置名稱「${name}」重複。`,token);globalNames.add(name);}
 const walk=(body:Statement[],parent:Scope)=>{
  const scope=new Map(parent),own=new Set<string>();
  for(const s of body){
   if(s.kind==='declare'){declare(s,scope,own);continue;}
   if(s.kind==='assign'){const b=scope.get(s.name);if(!b)fail(`變數「${s.name}」尚未在此範圍宣告。`,s.at);resolve(s.value,scope);b!.values.push(s.value);continue;}
   if(s.kind==='if'){resolve(s.left,scope);resolve(s.right,scope);conditions.push(s);walk(s.then,scope);walk(s.otherwise,scope);continue;}
   const expressions:Expression[]=s.kind==='wire-begin'?[s.sda,s.scl]:s.kind==='oled-call'?s.args.filter((a):a is Expression=>typeof a!=='string'):s.kind==='servo-attach'?[s.pin]:s.kind==='servo-write'?[s.angle]:s.kind==='pinMode'?[s.pin]:s.kind==='write'?[s.pin,...(typeof s.level==='string'?[]:[s.level])]:s.kind==='pwm'?[s.pin,s.duty]:s.kind==='delay'||s.kind==='microdelay'?[s.duration]:[];
   for(const e of expressions){resolve(e,scope);if(s.kind!=='delay'&&!(s.kind==='oled-call'&&['print','println'].includes(s.method)))ordinaryUses.push(e);}
  }
 };
 walk(program.setup,global);walk(program.loop,global);
 if(program.loop.length===0)fail('loop() 仍是空白練習架構，請先完成自己的程式。',program.loopAt);
 const containsTime=(e:Expression):boolean=>e.kind==='millis'||(e.kind==='variable'&&refs.get(e)!.time)||(e.kind==='binary'&&(containsTime(e.left)||containsTime(e.right)));
 const mark=(e:Expression):boolean=>{if(e.kind==='variable'){const b=refs.get(e)!;if(!b.time){b.time=true;return true;}}else if(e.kind==='binary')return [mark(e.left),mark(e.right)].some(Boolean);return false;};
 // Fixed point across assignments and operands, including zero-initialized timestamp globals.
 for(let changed=true;changed;){changed=false;for(const b of bindings){if(b.time||b.values.some(containsTime)){if(!b.time){b.time=true;changed=true;}for(const v of b.values)if(mark(v))changed=true;}}for(const e of allExpressions)if(e.kind==='binary'&&containsTime(e))if(mark(e))changed=true;}
 const constant=(e:Expression,seen=new Set<Binding>()):number|undefined=>{
  if(e.kind==='integer')return e.value;
  if(e.kind==='variable'){const b=refs.get(e)!;if(b.values.length!==1||seen.has(b))return;return constant(b.values[0],new Set([...seen,b]));}
  if(e.kind==='binary'){const l=constant(e.left,seen),r=constant(e.right,seen);if(l===undefined||r===undefined)return;return e.operator==='+'?l+r:e.operator==='-'?l-r:r===0?undefined:Math.trunc(l/r);}
 };
 const timeSafe=(e:Expression):boolean=>{
  if(e.kind==='millis'||e.kind==='variable'&&refs.get(e)!.time)return true;
  const n=constant(e);if(n!==undefined)return n>=0&&n<=2147483647;
  return e.kind==='binary'&&e.operator!=='/'&&timeSafe(e.left)&&timeSafe(e.right);
 };
 for(const b of bindings)if(b.time)for(const e of b.values)if(!timeSafe(e))fail(`時間變數「${b.name}」混用負數、感測值或一般整數；請拆開變數後再匯出。`,e.at);
 for(const e of allExpressions){
  if(e.kind==='binary'&&containsTime(e)&&!timeSafe(e))fail('時間算式混用有號數值，無法安全轉換；請拆開變數。',e.at);
  if(e.kind==='binary'&&e.operator==='/'&&constant(e.right)===0)fail('除數不可為 0。',e.right.at);
 }
 for(const e of ordinaryUses)if(containsTime(e))fail('時間變數不可同時作為接腳、電位或感測數值；請拆開變數。',e.at);
 // Distinguish elapsed durations from timestamps, including aliases. A clock
 // offset (millis() - 5) remains a timestamp and cannot be ordered at rollover.
 type TimeRole='scalar'|'stamp'|'duration'|'unknown'|'mixed';
 const role=(e:Expression,seen=new Set<Binding>()):TimeRole=>{
  if(e.kind==='millis')return 'stamp';
  if(e.kind==='variable'){
   const b=refs.get(e)!;if(!b.time)return 'scalar';if(seen.has(b))return 'unknown';
   const values=b.values.map(v=>role(v,new Set([...seen,b]))).filter(r=>r!=='scalar'&&r!=='unknown');
   return values.length===0?'stamp':values.every(r=>r===values[0])?values[0]:'mixed';
  }
  if(e.kind!=='binary')return 'scalar';
  const l=role(e.left,seen),r=role(e.right,seen);
  if(l==='mixed'||r==='mixed')return 'mixed';
  if(l==='stamp'&&r==='stamp')return e.operator==='-'?'duration':'mixed';
  if(r==='stamp')return e.operator==='+'&&l!=='stamp'?'stamp':'mixed';
  if(l==='stamp')return 'stamp';
  return l==='duration'||r==='duration'?'duration':l==='unknown'||r==='unknown'?'unknown':'scalar';
 };
 for(const b of bindings)if(b.time){const roles=b.values.map(v=>role(v)).filter(r=>r!=='scalar'&&r!=='unknown');if(roles.includes('mixed')||new Set(roles).size>1)fail(`時間變數「${b.name}」混用時間戳記與時間差；請拆開變數。`,b.declaration.at);}
 for(const s of conditions)if((containsTime(s.left)||containsTime(s.right))){
  if((s.operator!=='=='&&s.operator!=='!=')&&[s.left,s.right].some(e=>containsTime(e)&&role(e)!=='duration'))fail('直接比較時間戳記無法安全處理 millis() 回捲；請先計算時間差再比較。',s.at);
  for(const e of [s.left,s.right])if(!timeSafe(e)||role(e)==='mixed')fail('時間比較混用一般變數；請拆開時間與一般數值。',e.at);
 }
 for(const b of bindings){const t=atToken(b.declaration.at);edit(t.start,t.end,b.time?'uint32_t':'int32_t',b.time?'millis() 時間／時間差使用 uint32_t，減法依 32 位元回捲。':'一般整數使用 int32_t，保留 UNO 上的 32 位元整數語意。',t);}
 // AVR int literals are 16-bit. Widen literals inside learner arithmetic before evaluation.
 const widened=new Set<number>();
 for(const e of allExpressions)if(e.kind==='binary'){
  const widen=(v:Expression)=>{if(v.kind==='integer'){const t=atToken(v.at);if(t.kind==='integer'&&!widened.has(t.start)){widened.add(t.start);edit(t.start,t.end,t.text+(containsTime(e)?'UL':'L'),'算式常數提升至 32 位元，避免 UNO 的 16 位元中間運算。',t);}}else if(v.kind==='binary'){widen(v.left);widen(v.right);}};widen(e);
 }
 const needed:Library[]=[];if(program.servoName)needed.push(boardId==='esp32'?libraries.espServo:libraries.servo);if(program.dht)needed.push(libraries.dht,libraries.sensor);if(program.oledName)needed.push(libraries.gfx,libraries.oled,libraries.bus);if(program.digitsName)needed.push(libraries.digits);
 const headers=['Arduino.h','stdint.h',...(program.dht?['math.h']:[]),...(program.oledName?['Wire.h']:[]),...needed.flatMap(l=>'header' in l&&l.header?[l.header]:[])];
 const notes=['使用目前編輯器內容，不使用標準答案；接腳與接線沿用所選板型。','瀏覽器只產生原始程式，未編譯這份使用者程式。編譯通過也不代表實際電路已驗證。'];
 const statementSpan=(at:SourceLocation)=>{const start=atToken(at),i=tokens.indexOf(start),end=tokens.slice(i).find(t=>t.text===';');if(!end)throw new Error('Missing statement end');return {start:start.start,end:end.end};};
 let helpers='';
 if(program.dht||program.oledName){
  const oled=program.oledName,dht=program.dht?.name,warning=(lessonId==='climate-dht'||lessonId==='environment-lab')?lessonPins(boardId,lessonId).primary:null;
  helpers=`\n// 實板錯誤處理：不繼續使用失敗的感測／顯示資料。\n${oled?`static bool ${prefix}OledReady = false;\n`:''}static void ${prefix}Fail(const __FlashStringHelper *${prefix}Message);\nstatic void ${prefix}Fail(const __FlashStringHelper *${prefix}Message) {\n${warning!==null?`  pinMode(${warning}, OUTPUT);\n  digitalWrite(${warning}, LOW);\n`:''}  Serial.println(${prefix}Message);\n${oled?`  if (${prefix}OledReady) { ${oled}.clearDisplay(); ${oled}.display(); }\n`:''}  while (true) { delay(1000); }\n}\n`;
  if(dht){
   helpers+=`\nstatic bool ${prefix}DhtBegun = false;\nstatic bool ${prefix}HasSample = false;\nstatic uint32_t ${prefix}DhtStarted = 0;\nstatic uint32_t ${prefix}SampleAt = 0;\nstatic int32_t ${prefix}Temperature = 0;\nstatic int32_t ${prefix}Humidity = 0;\nstatic void ${prefix}Sample(void);\nstatic int32_t ${prefix}ReadTemperature(void);\nstatic int32_t ${prefix}ReadHumidity(void);\nstatic void ${prefix}Sample(void) {\n  if (!${prefix}DhtBegun) { ${prefix}Fail(F("DHT: begin() has not run")); }\n  if (!${prefix}HasSample) {\n    uint32_t ${prefix}Elapsed = uint32_t(millis() - ${prefix}DhtStarted);\n    if (${prefix}Elapsed < 2000UL) { delay(2000UL - ${prefix}Elapsed); }\n  }\n  if (!${prefix}HasSample || uint32_t(millis() - ${prefix}SampleAt) >= 2000UL) {\n    float ${prefix}TempValue = ${dht}.readTemperature();\n    float ${prefix}HumidityValue = ${dht}.readHumidity();\n    if (isnan(${prefix}TempValue) || isnan(${prefix}HumidityValue)) { ${prefix}Fail(F("DHT: read failed (NaN); check wiring and power")); }\n    ${prefix}Temperature = static_cast<int32_t>(${prefix}TempValue);\n    ${prefix}Humidity = static_cast<int32_t>(${prefix}HumidityValue);\n    ${prefix}SampleAt = millis();\n    ${prefix}HasSample = true;\n  }\n}\nstatic int32_t ${prefix}ReadTemperature(void) { ${prefix}Sample(); return ${prefix}Temperature; }\nstatic int32_t ${prefix}ReadHumidity(void) { ${prefix}Sample(); return ${prefix}Humidity; }\n`;
   notes.push('DHT22 首次讀取等待啟動滿 2000ms；溫溼度共用每 2000ms 更新的樣本，檢查 NaN 後向零截斷為整數。');
   for(const e of allExpressions)if(e.kind==='dht-read'){
    const t=atToken(e.at),i=tokens.indexOf(t),last=tokens[i+4];
    // Keep comment/whitespace gaps from all tokens inside the replaced call.
    const gaps=tokens.slice(i,i+4).map((v,j)=>source.slice(v.end,tokens[i+j+1].start)).join('');
    edit(t.start,last.end,`${prefix}Read${e.humidity?'Humidity':'Temperature'}(${gaps})`,'DHT 讀值先檢查 NaN，成功後才轉為整數。',t);
   }
  }
  const guardWalk=(body:Statement[])=>{for(const s of body){
   if(s.kind==='if'){guardWalk(s.then);guardWalk(s.otherwise);}
   if(s.kind==='dht-begin'){
    const span=statementSpan(s.at),raw=source.slice(span.start,span.end);
    edit(span.start,span.end,`{ ${raw}\n  ${prefix}DhtBegun = true; ${prefix}DhtStarted = millis(); ${prefix}HasSample = false; }`,'記錄 DHT 初始化及取樣時間。',s.at);
   }
   if(s.kind==='oled-call'&&s.method==='begin'){
    const span=statementSpan(s.at),raw=source.slice(span.start,span.end-1);
    edit(span.start,span.end,`{ ${prefix}OledReady = false;\n  if (!(${raw})) { ${prefix}Fail(F("OLED: initialization failed; check power, address and memory")); }\n  ${prefix}OledReady = true; }`,'檢查 OLED begin() 回傳值；失敗時以序列訊息說明並停止。',s.at);
   }
  }};guardWalk(program.setup);guardWalk(program.loop);
  const setupIndex=tokens.findIndex((t,i)=>t.text==='void'&&tokens[i+1]?.text==='setup');const brace=tokens[setupIndex+4];
  edit(brace.end,brace.end,'\n  Serial.begin(115200);','啟用 115200 baud 序列診斷。',brace);
  const firstFunction=tokens.find(t=>t.text==='void')!;edit(firstFunction.start,firstFunction.start,helpers+'\n','加入不與使用者名稱衝突的感測器／顯示器保護函式。',firstFunction);
  notes.push('DHT／OLED 失敗時停止本課警示 LED（如有），以 115200 baud 輸出原因，使用含 delay 的停止流程。');
 }
 // Disallow overlapping edits instead of silently dropping learner code.
 const ordered=[...edits].sort((a,b)=>a.start-b.start||a.end-b.end);for(let i=1;i<ordered.length;i++)if(ordered[i].start<ordered[i-1].end)fail('此寫法的轉換範圍重疊，請將初始化／運算拆開後再匯出。',ordered[i].at);
 let code=source;for(const e of [...ordered].reverse())code=code.slice(0,e.start)+e.text+code.slice(e.end);
 const target=targets[boardId],filename=`lab_${target.slug}_${lessonId.replaceAll('-','_')}.ino`;
 const metadata=`/*\n * ${target.label} / ${lessons[lessonId].title}\n * Target: ${target.fqbn}\n * Core: ${target.core}\n * Libraries: ${needed.map(l=>`${l.name}@${l.version}`).join(', ')||'none (Arduino core only)'}\n * Arduino IDE: save in a folder matching the .ino filename; install the core\n * and libraries above, select the board and USB port, Verify, then Upload.\n * Serial Monitor: 115200 baud (DHT / OLED diagnostics).\n * Source export only: check wiring, voltage and power before connecting hardware.\n */\n`;
 code=metadata+headers.map(h=>`#include <${h}>`).join('\n')+'\n\n'+code+'\n';
 return {filename,code,target,libraries:needed,notes,changes:ordered.map(e=>({line:e.at.line,column:e.at.column,reason:e.reason,before:source.slice(e.start,e.end),after:e.text}))};
}
