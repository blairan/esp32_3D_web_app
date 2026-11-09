import {isAdvanced,type AdvancedId} from './advancedLessons.ts';
import {hasPicoButton,hasPicoPWM,type PicoLessonId} from './types.ts';
import type {PicoArticleId} from './content.ts';
export interface PythonCompletion {label:string;template:string;detail:string;topic:PicoArticleId}
export function pythonCompletions(source:string,id:PicoLessonId):PythonCompletion[]{
 if(isAdvanced(id))return advancedCompletions(source,id);
 const pwm=hasPicoPWM(id);
 const name=source.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*(?:["']LED["']|15)\s*,\s*Pin\.OUT\s*\)/m)?.[1]??source.match(/^([A-Za-z_]\w*)\s*=\s*PWM\(\s*Pin\(\s*15\s*\)\s*\)/m)?.[1]??'led',input=source.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*14\s*,\s*Pin\.IN\s*,\s*Pin\.PULL_UP\s*\)/m)?.[1]??'button';
 const topic:PicoArticleId=id==='blink'?'pin':'external';
 const options:PythonCompletion[]=[{label:'Pin',template:id==='blink'?'Pin("LED", Pin.OUT)':'Pin(15, Pin.OUT)',detail:id==='blink'?'建立板載 LED 輸出':'建立GP15（實體20）外接LED輸出',topic},{label:'while',template:'while True:\n\t${指令}',detail:'4空白縮排的重複區塊',topic:'intro'},...[['on','開啟 LED'],['off','關閉 LED'],['toggle','反轉 LED']].map<PythonCompletion>(([method,detail])=>({label:name+'.'+method,template:name+'.'+method+'()',detail,topic})),{label:name+'.value',template:name+'.value(${0})',detail:'設定輸出：0關、1開',topic},{label:'time.sleep',template:'time.sleep(${1})',detail:'等待秒數，可用小數秒',topic:'timing'},{label:'time.sleep_ms',template:'time.sleep_ms(${1000})',detail:'等待整數毫秒',topic:'timing'}];
 if(id==='ldr-nightlight'){
  const sensor=source.match(/^([A-Za-z_]\w*)\s*=\s*ADC\(\s*Pin\(\s*26\s*\)\s*\)/m)?.[1]??'light';
  options.push({label:'ADC',template:'ADC(Pin(26))',detail:'GP26／實體31，3.3V光敏分壓',topic:'light'},{label:sensor+'.read_u16',template:sensor+'.read_u16()',detail:'讀取0～65535；越亮讀值越高',topic:'light'},{label:'if',template:'if \${reading} < \${24000}:\n\t\${指令}',detail:'單一門檻比較；中間區間保持原狀',topic:'light'});
  for(const n of new Set([...source.matchAll(/^\s*([A-Za-z_]\w*)\s*=/gm)].map(m=>m[1]).filter(n=>n!==name&&n!==sensor)))options.push({label:n,template:n,detail:'已宣告整數變數',topic:'light'});
 }
 if(id==='pir-led'){
  const sensor=source.match(/^([A-Za-z_]\w*)\s*=\s*Pin\(\s*14\s*,\s*Pin\.IN\s*\)/m)?.[1]??'pir';
  options.push({label:sensor+'.value',template:sensor+'.value()',detail:'讀GP14：活動1，沒有活動0',topic:'pir'},{label:'if',template:`if ${sensor}.value() == \${1}:\n\t\${指令}\nelse:\n\t\${指令}`,detail:'PIR條件；分支內8個空白',topic:'pir'},{label:'Pin.IN',template:'Pin.IN',detail:'PIR的3.3V數位輸入，不加上拉',topic:'pir'});
 }
 if(hasPicoButton(id))options.push({label:input+'.value',template:input+'.value()',detail:'讀GP14：按下0，放開1',topic:'button'},{label:'if',template:`if ${input}.value() == \${0}:\n\t\${指令}\nelse:\n\t\${指令}`,detail:'按鈕條件；分支內8個空白',topic:'button'},{label:'Pin.IN',template:'Pin.IN, Pin.PULL_UP',detail:'輸入模式與內建上拉',topic:'button'});
 if(id==='button-toggle'){const branch=options.find(o=>o.label==='if')!;Object.assign(branch,{label:'if',template:'if \${reading} < \${previous}:\n\t\${指令}',detail:'下降邊緣比較；只在1變0時處理',topic:'toggle'});const read=options.find(o=>o.label===input+'.value');if(read)read.topic='toggle';for(const n of new Set([...source.matchAll(/^\s*([A-Za-z_]\w*)\s*=/gm)].map(m=>m[1]).filter(n=>n!==name&&n!==input)))options.push({label:n,template:n,detail:'已宣告整數狀態',topic:'toggle'});}
 if(pwm){const knob=source.match(/^([A-Za-z_]\w*)\s*=\s*ADC\(\s*Pin\(\s*26\s*\)\s*\)/m)?.[1]??'knob';
  const digital=options.filter(o=>!o.label.startsWith(name+'.')&&o.label!=='Pin');
  digital.push({label:'PWM',template:'PWM(Pin(15))',detail:'GP15 PWM物件，需先匯入PWM',topic:'pwm'},{label:name+'.freq',template:name+'.freq(\${1000})',detail:'設定PWM頻率1～20000Hz',topic:'pwm'},{label:name+'.duty_u16',template:name+'.duty_u16(\${brightness})',detail:'16位元佔空比0～65535',topic:'pwm'},{label:'if',template:'if \${brightness} >= \${65535}:\n\t\${指令}',detail:'單層整數比較；分支內8個空白',topic:'pwm'});
  const variables=new Set([...source.matchAll(/^\s*([A-Za-z_]\w*)\s*=/gm)].map(m=>m[1]).filter(n=>n!==name&&n!==knob));for(const n of variables)digital.push({label:n,template:n,detail:'已宣告整數變數',topic:'pwm'});
  if(id==='pot-dimming')digital.push({label:'ADC',template:'ADC(Pin(26))',detail:'GP26／實體31，12位元ADC輸入',topic:'adc'},{label:knob+'.read_u16',template:knob+'.read_u16()',detail:'讀取後縮放為0～65535，非16位元硬體精度',topic:'adc'});return digital;
 }
 return options;
}

function advancedCompletions(source:string,id:AdvancedId):PythonCompletion[]{
 const options:PythonCompletion[]=[];const add=(label:string,template:string,detail:string)=>options.push({label,template,detail,topic:id});
 const objects=[...source.matchAll(/^([A-Za-z_]\w*)\s*=\s*(Pin|PWM|DHT22|I2C|SSD1306_I2C|TM1637)\((.*)$/gm)];
 for(const [,name,type,args] of objects){
  if(type==='Pin'){if(args.includes('Pin.IN'))add(name+'.value',name+'.value()','讀取數位輸入；不是實體腳號');else for(const method of ['on','off','toggle'])add(name+'.'+method,name+'.'+method+'()','獨立控制這個GPIO');}
  if(type==='PWM'){add(name+'.freq',name+'.freq('+ (id==='servo-angle'?'50':'1000') +')','本課PWM頻率');add(name+(id==='servo-angle'?'.duty_ns':'.duty_u16'),name+(id==='servo-angle'?'.duty_ns(\${1500000})':'.duty_u16(\${65535})'),id==='servo-angle'?'脈寬500000～2500000奈秒':'16位元佔空比0～65535');}
  if(type==='DHT22')for(const method of ['measure','temperature','humidity'])add(name+'.'+method,name+'.'+method+'()',method==='measure'?'更新樣本，至少2秒間隔':'取得上次量測，整數練習可用int()');
  if(type==='SSD1306_I2C'){add(name+'.fill',name+'.fill(0)','清除緩衝');add(name+'.text',name+'.text("\${Pico}", \${0}, \${0})','ASCII文字、x、y；需要show提交');add(name+'.show',name+'.show()','提交緩衝到顯示器');}
  if(type==='TM1637'){add(name+'.number',name+'.number(\${count})','顯示0～9999');add(name+'.brightness',name+'.brightness(\${7})','亮度0～7');}
 }
 add('if','if \${reading} > \${0}:\n\t\${指令}','單一比較；最多三層分支');add('time.sleep_ms','time.sleep_ms(\${100})','每條while路徑需要正值等待');add('int','int(\${reading})','轉成整數');add('str','str(\${count})','整數轉ASCII字串');
 if(id==='pir-delay'){add('time.ticks_ms','time.ticks_ms()','可回捲的毫秒時鐘');add('time.ticks_diff','time.ticks_diff(\${now}, \${last_motion})','以前後時間計算有號差值');}
 if(id==='ultrasonic-alert'){const echo=objects.find(m=>m[2]==='Pin'&&m[3].startsWith('26'))?.[1]??'echo';add('time.sleep_us','time.sleep_us(\${10})','微秒等待，用於TRIG脈波');add('time_pulse_us',`time_pulse_us(${echo}, 1, 30000)`,'負值表示逾時，不是0cm');}
 const names=new Set(objects.map(m=>m[1]));for(const m of source.matchAll(/^\s*([A-Za-z_]\w*)\s*=/gm))if(!names.has(m[1])&&!options.some(o=>o.label===m[1]))add(m[1],m[1],'已初始化狀態變數');return options;
}
