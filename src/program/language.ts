import {hasButton,hasExtendedSyntax,hasPWM,hasADC,hasDigitalRead,hasInputMode,type LessonId} from '../lessons.ts';
export interface SourceLocation { line:number; column:number }
export interface ProgramDiagnostic extends SourceLocation { message:string }
export class ProgramError extends Error {
  line:number; column:number;
  constructor(message:string, at:SourceLocation) {super(message);this.name='ProgramError';this.line=at.line;this.column=at.column;}
}
export const limits = { source:12000, lines:400, tokens:4000, statements:256, delay:60000, operationsPerTick:500, totalOperations:100000, virtualTime:86400000 } as const;
interface Token extends SourceLocation { text:string; kind:'name'|'integer'|'punctuation'|'end' }
export type Expression = {kind:'pulse';pin:Expression;timeout:Expression;at:SourceLocation}| {kind:'analog';pin:Expression;at:SourceLocation}| {kind:'millis';at:SourceLocation}|{kind:'binary';left:Expression;right:Expression;operator:'+'|'-'|'/';at:SourceLocation}| {kind:'integer';value:number;at:SourceLocation}|{kind:'variable';name:string;at:SourceLocation}|{kind:'read';pin:Expression;at:SourceLocation};
export type Statement =
 | {kind:'servo-attach';pin:Expression;at:SourceLocation}
 | {kind:'servo-write';angle:Expression;at:SourceLocation}
 | {kind:'assign';name:string;value:Expression;at:SourceLocation}
 | {kind:'declare';name:string;value:Expression;at:SourceLocation}
 | {kind:'pinMode';pin:Expression;mode:'OUTPUT'|'INPUT_PULLUP'|'INPUT';at:SourceLocation}
 | {kind:'pwm';pin:Expression;duty:Expression;at:SourceLocation}
 | {kind:'write';pin:Expression;level:'HIGH'|'LOW'|Expression;at:SourceLocation}
 | {kind:'microdelay';duration:Expression;at:SourceLocation}
 | {kind:'delay';duration:Expression;at:SourceLocation}
 | {kind:'if';left:Expression;right:Expression;operator:'=='|'!='|'>'|'<'|'>='|'<=';then:Statement[];otherwise:Statement[];at:SourceLocation};
export interface Program { lessonId:LessonId;servoName?:string;globals:Extract<Statement,{kind:'declare'}>[];setup:Statement[];loop:Statement[];loopAt:SourceLocation }
const reserved=new Set(['pulseIn','delayMicroseconds','Servo','analogRead','analogWrite','millis','int','void','setup','loop','pinMode','digitalWrite','digitalRead','delay','OUTPUT','HIGH','LOW','INPUT','INPUT_PULLUP','INPUT_PULLDOWN','const','for','while','if','else','do','return','break','continue','switch','case','default','bool','char','float','double','long','short','signed','unsigned','auto','true','false','class','struct','enum','namespace','using','new','delete','this','sizeof','static','volatile','void','public','private','protected','try','catch','throw','template','typedef','union','extern','inline','operator','virtual','nullptr']);
function tokenize(source:string):Token[] {
  if(source.length>limits.source)throw new ProgramError(`程式最多 ${limits.source} 個字元。`,{line:1,column:1});
  if(source.split('\n').length>limits.lines)throw new ProgramError(`程式最多 ${limits.lines} 行。`,{line:limits.lines+1,column:1});
  const tokens:Token[]=[];let index=0,line=1,column=1;
  const step=()=>{const c=source[index++];if(c==='\n'){line++;column=1;}else column++;return c;};
  const add=(text:string,kind:Token['kind'],at:SourceLocation)=>{
    tokens.push({text,kind,...at});if(tokens.length>limits.tokens)throw new ProgramError('程式過長，請縮短範例。',at);
  };
  while(index<source.length) {
    if(/\s/.test(source[index])){step();continue;}
    const at={line,column};
    if(source.startsWith('//',index)){while(index<source.length&&source[index]!=='\n')step();continue;}
    if(source.startsWith('/*',index)){
      step();step();while(index<source.length&&!source.startsWith('*/',index))step();
      if(index===source.length)throw new ProgramError('多行註解缺少 */。',at);step();step();continue;
    }
    if(/[A-Za-z_]/.test(source[index])){let value='';while(index<source.length&&/[A-Za-z_0-9]/.test(source[index]))value+=step();add(value,'name',at);continue;}
    if(/[0-9]/.test(source[index])){let value='';while(index<source.length&&/[0-9]/.test(source[index]))value+=step();add(value,'integer',at);continue;}
    if(source.startsWith('++',index)||source.startsWith('--',index))throw new ProgramError('本課不支援 ++ 或 --；請使用明確賦值與加減。',at);
    if(source.startsWith('==',index)||source.startsWith('!=',index)||source.startsWith('>=',index)||source.startsWith('<=',index)){add(step()+step(),'punctuation',at);continue;}
    if('(){};,=-+<>/.'.includes(source[index])){add(step(),'punctuation',at);continue;}
    throw new ProgramError(source[index]==='#'?'本課不支援 #include、#define 或其他前置處理指令。':`不支援符號「${source[index]}」。僅接受白名單 Arduino 語法。`,at);
  }
  tokens.push({text:'',kind:'end',line,column});return tokens;
}
export function parseProgram(source:string,lessonId:LessonId='blink'):Program {
  const advanced=hasExtendedSyntax(lessonId);
  const tokens=tokenize(source);let index=0,count=0;let servoName:string|undefined;
  const peek=()=>tokens[index];const take=()=>tokens[index++];
  const expect=(text:string)=>{const token=take();if(token.text!==text)throw new ProgramError(`預期「${text}」${token.kind==='end'?'，但程式已結束。':`，目前是「${token.text}」。`}`,token);return token;};
  const atom=(allowRead=false,allowConstants=false):Expression=>{
    let negative=false;let token=peek();if(token.text==='-'){negative=true;take();token=peek();}
    if(token.kind==='integer'){
      take();const value=Number(token.text)*(negative?-1:1);
      if(!Number.isSafeInteger(value)||value < -2147483648||value>2147483647)throw new ProgramError('整數必須在 32 位元有號整數範圍內。',token);
      return {kind:'integer',value,at:token};
    }
    if(!negative&&allowConstants&&(token.text==='HIGH'||token.text==='LOW')){take();return {kind:'integer',value:token.text==='HIGH'?1:0,at:token};}
    if(!negative&&allowRead&&hasDigitalRead(lessonId)&&token.text==='digitalRead'){take();expect('(');const pin=expression();expect(')');return {kind:'read',pin,at:token};}
    if(!negative&&allowRead&&lessonId==='ultrasonic-alert'&&token.text==='pulseIn'){take();expect('(');const pin=expression();expect(',');expect('HIGH');expect(',');const timeout=expression();expect(')');return {kind:'pulse',pin,timeout,at:token};}
    if(!negative&&allowRead&&hasADC(lessonId)&&token.text==='analogRead'){take();expect('(');const pin=expression();expect(')');return {kind:'analog',pin,at:token};}
    if(!negative&&advanced&&allowRead&&token.text==='millis'){take();expect('(');expect(')');return {kind:'millis',at:token};}
    if(!negative&&token.kind==='name'&&!reserved.has(token.text)){take();return {kind:'variable',name:token.text,at:token};}
    throw new ProgramError('此處只支援整數常值或已宣告的整數變數，不支援算式。',token);
  };
  const expression=(allowRead=false,allowConstants=false):Expression=>{
    let terms=1;const limit=(at:SourceLocation)=>{if(++terms>32)throw new ProgramError('每個算式最多 32 項。',at);};
    const term=():Expression=>{let left=atom(allowRead,allowConstants);while((lessonId==='pot-dimming'||lessonId==='ultrasonic-alert')&&peek().text==='/'){const op=take();limit(op);left={kind:'binary',left,right:atom(allowRead,allowConstants),operator:'/',at:op};}return left;};
    let left=term();while(advanced&&(peek().text==='+'||peek().text==='-')){const op=take();limit(op);left={kind:'binary',left,right:term(),operator:op.text as '+'|'-',at:op};}return left;
  };
  const declaration=(allowRead=false):Extract<Statement,{kind:'declare'}>=>{
    const at=expect('int');const name=take();
    if(name.kind!=='name'||reserved.has(name.text)||name.text===servoName)throw new ProgramError('請使用非保留字的變數名稱。',name);
    expect('=');const value=expression(allowRead,advanced);expect(';');return {kind:'declare',name:name.text,value,at};
  };
  const statement=(depth=0):Statement=>{
    if(++count>limits.statements)throw new ProgramError(`程式最多 ${limits.statements} 個陳述。`,peek());
    if(peek().text==='int')return declaration(true);
    const at=take();
    if(lessonId==='servo-angle'&&at.text===servoName&&peek().text==='.'){
      take();const method=take();if(method.text!=='attach'&&method.text!=='write')throw new ProgramError('伺服物件只支援 attach(pin) 與 write(angle)。',method);expect('(');const value=expression();expect(')');expect(';');return method.text==='attach'?{kind:'servo-attach',pin:value,at}:{kind:'servo-write',angle:value,at};
    }
    if(at.text==='if'){
      if(!hasButton(lessonId)&&!advanced)throw new ProgramError('此專題不支援 if；請切換按鈕控制 LED。',at);
      if((!advanced&&depth>0)||depth>=4)throw new ProgramError(advanced?'if 最多四層；不支援 else if。':'本課不支援巢狀 if 或 else if。',at);
      expect('(');const left=expression(true,true),operator=take();if(!(advanced?['==','!=','>','<','>=','<=']:['==','!=']).includes(operator.text))throw new ProgramError(advanced?'條件只支援單一 == != > < >= <= 比較。':'條件只支援單一 == 或 != 比較。',operator);
      const right=expression(true,true);expect(')');
      const branch=()=>{expect('{');const body:Statement[]=[];while(peek().text!=='}'){if(peek().kind==='end')throw new ProgramError('分支缺少結尾的 }。',peek());body.push(statement(depth+1));}expect('}');return body;};
      const then=branch();let otherwise:Statement[]=[];if(peek().text==='else'){take();otherwise=branch();}return {kind:'if',left,right,operator:operator.text as Extract<Statement,{kind:'if'}>['operator'],then,otherwise,at};
    }
    if(advanced&&at.kind==='name'&&!reserved.has(at.text)&&peek().text==='='){take();const value=expression(true,true);expect(';');return {kind:'assign',name:at.text,value,at};}
    if(![...(lessonId==='servo-angle'?[]:['pinMode','digitalWrite']),'delay',...(hasPWM(lessonId)?['analogWrite']:[]),...(lessonId==='ultrasonic-alert'?['delayMicroseconds']:[])].includes(at.text))throw new ProgramError(`不支援「${at.text||'程式結尾'}」；本課僅接受 int 宣告、pinMode、digitalWrite、delay。`,at);
    expect('(');const value=expression(advanced,advanced);
    if(at.text==='delayMicroseconds'){expect(')');expect(';');return {kind:'microdelay',duration:value,at};}
    if(at.text==='delay'){expect(')');expect(';');return {kind:'delay',duration:value,at};}
    expect(',');
    if(at.text==='analogWrite'){const duty=expression(true,true);expect(')');expect(';');return {kind:'pwm',pin:value,duty,at};}
    if(at.text==='digitalWrite'&&advanced){const level=expression(true,true);expect(')');expect(';');return {kind:'write',pin:value,level,at};}
    const constant=take();
    if(at.text==='pinMode'){
      if(constant.text!=='OUTPUT'&&!(hasButton(lessonId)&&constant.text==='INPUT_PULLUP')&&!(hasInputMode(lessonId)&&constant.text==='INPUT'))throw new ProgramError(lessonId==='pir-delay'?'pinMode 只支援 GPIO27 INPUT 與 GPIO23 OUTPUT。':lessonId==='ultrasonic-alert'?'pinMode 只支援 GPIO34 INPUT、GPIO22／23 OUTPUT。':hasADC(lessonId)?'pinMode 只支援 GPIO34 INPUT 與 GPIO23 OUTPUT。':hasButton(lessonId)?'pinMode 只支援 GPIO23 OUTPUT 與 GPIO18 INPUT_PULLUP。':'pinMode 目前只支援 OUTPUT。',constant);
      expect(')');expect(';');return {kind:'pinMode',pin:value,mode:constant.text as 'OUTPUT'|'INPUT_PULLUP'|'INPUT',at};
    }
    if(constant.text!=='HIGH'&&constant.text!=='LOW')throw new ProgramError('digitalWrite 的第二個參數只支援 HIGH 或 LOW。',constant);
    expect(')');expect(';');return {kind:'write',pin:value,level:constant.text,at};
  };
  const globals:Program['globals']=[];while(peek().text==='int'||(lessonId==='servo-angle'&&peek().text==='Servo')) {
    if(++count>limits.statements)throw new ProgramError('宣告數量超過上限。',peek());
    if(peek().text==='int'){globals.push(declaration());continue;}
    const at=take(),name=take();if(servoName||name.kind!=='name'||reserved.has(name.text)||globals.some(g=>g.name===name.text))throw new ProgramError('本課只接受一個名稱不重複的 Servo 全域物件。',at);servoName=name.text;expect(';');
  }
  const functions=new Map<string,Statement[]>();let loopAt:SourceLocation={line:1,column:1};
  while(peek().kind!=='end'){
    expect('void');const name=take();
    if(name.text!=='setup'&&name.text!=='loop')throw new ProgramError('只支援固定的 void setup() 與 void loop()。',name);
    if(functions.has(name.text))throw new ProgramError(`${name.text} 不能重複定義。`,name);
    if(name.text==='loop')loopAt=name;
    expect('(');expect(')');expect('{');const body:Statement[]=[];
    while(peek().text!=='}') {if(peek().kind==='end')throw new ProgramError('函式缺少結尾的 }。',peek());body.push(statement());}
    expect('}');functions.set(name.text,body);
  }
  if(!functions.has('setup')||!functions.has('loop'))throw new ProgramError('需要同時定義 void setup() 與 void loop()。',peek());
  return {lessonId,servoName,globals,setup:functions.get('setup')!,loop:functions.get('loop')!,loopAt};
}
export const blinkExample = `// GPIO23 → 220 Ω → LED → GND
int ledPin = 23;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(1000);
  digitalWrite(ledPin, LOW);
  delay(1000);
}
`;
