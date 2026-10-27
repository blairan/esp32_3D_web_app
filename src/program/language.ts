export interface SourceLocation { line:number; column:number }
export interface ProgramDiagnostic extends SourceLocation { message:string }
export class ProgramError extends Error {
  line:number; column:number;
  constructor(message:string, at:SourceLocation) {super(message);this.name='ProgramError';this.line=at.line;this.column=at.column;}
}
export const limits = { source:12000, lines:400, tokens:4000, statements:256, delay:60000, operationsPerTick:500, totalOperations:100000, virtualTime:86400000 } as const;
interface Token extends SourceLocation { text:string; kind:'name'|'integer'|'punctuation'|'end' }
export type Expression = {kind:'integer';value:number;at:SourceLocation}|{kind:'variable';name:string;at:SourceLocation};
export type Statement =
 | {kind:'declare';name:string;value:Expression;at:SourceLocation}
 | {kind:'pinMode';pin:Expression;at:SourceLocation}
 | {kind:'write';pin:Expression;level:'HIGH'|'LOW';at:SourceLocation}
 | {kind:'delay';duration:Expression;at:SourceLocation};
export interface Program { globals:Extract<Statement,{kind:'declare'}>[];setup:Statement[];loop:Statement[];loopAt:SourceLocation }
const reserved=new Set(['int','void','setup','loop','pinMode','digitalWrite','delay','OUTPUT','HIGH','LOW','INPUT','INPUT_PULLUP','INPUT_PULLDOWN','const','for','while','if','else','do','return','break','continue','switch','case','default','bool','char','float','double','long','short','signed','unsigned','auto','true','false','class','struct','enum','namespace','using','new','delete','this','sizeof','static','volatile','void','public','private','protected','try','catch','throw','template','typedef','union','extern','inline','operator','virtual','nullptr']);
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
    if('(){};,=-'.includes(source[index])){add(step(),'punctuation',at);continue;}
    throw new ProgramError(source[index]==='#'?'本課不支援 #include、#define 或其他前置處理指令。':`不支援符號「${source[index]}」。僅接受白名單 Arduino 語法。`,at);
  }
  tokens.push({text:'',kind:'end',line,column});return tokens;
}
export function parseProgram(source:string):Program {
  const tokens=tokenize(source);let index=0,count=0;
  const peek=()=>tokens[index];const take=()=>tokens[index++];
  const expect=(text:string)=>{const token=take();if(token.text!==text)throw new ProgramError(`預期「${text}」${token.kind==='end'?'，但程式已結束。':`，目前是「${token.text}」。`}`,token);return token;};
  const expression=():Expression=>{
    let negative=false;let token=peek();if(token.text==='-'){negative=true;take();token=peek();}
    if(token.kind==='integer'){
      take();const value=Number(token.text)*(negative?-1:1);
      if(!Number.isSafeInteger(value)||value < -2147483648||value>2147483647)throw new ProgramError('整數必須在 32 位元有號整數範圍內。',token);
      return {kind:'integer',value,at:token};
    }
    if(!negative&&token.kind==='name'&&!reserved.has(token.text)){take();return {kind:'variable',name:token.text,at:token};}
    throw new ProgramError('此處只支援整數常值或已宣告的整數變數，不支援算式。',token);
  };
  const declaration=():Extract<Statement,{kind:'declare'}>=>{
    const at=expect('int');const name=take();
    if(name.kind!=='name'||reserved.has(name.text))throw new ProgramError('請使用非保留字的變數名稱。',name);
    expect('=');const value=expression();expect(';');return {kind:'declare',name:name.text,value,at};
  };
  const statement=():Statement=>{
    if(++count>limits.statements)throw new ProgramError(`程式最多 ${limits.statements} 個陳述。`,peek());
    if(peek().text==='int')return declaration();
    const at=take();
    if(!['pinMode','digitalWrite','delay'].includes(at.text))throw new ProgramError(`不支援「${at.text||'程式結尾'}」；本課僅接受 int 宣告、pinMode、digitalWrite、delay。`,at);
    expect('(');const value=expression();
    if(at.text==='delay'){expect(')');expect(';');return {kind:'delay',duration:value,at};}
    expect(',');const constant=take();
    if(at.text==='pinMode'){
      if(constant.text!=='OUTPUT')throw new ProgramError('pinMode 目前只支援 OUTPUT。',constant);
      expect(')');expect(';');return {kind:'pinMode',pin:value,at};
    }
    if(constant.text!=='HIGH'&&constant.text!=='LOW')throw new ProgramError('digitalWrite 的第二個參數只支援 HIGH 或 LOW。',constant);
    expect(')');expect(';');return {kind:'write',pin:value,level:constant.text,at};
  };
  const globals:Program['globals']=[];while(peek().text==='int') {if(++count>limits.statements)throw new ProgramError('宣告數量超過上限。',peek());globals.push(declaration());}
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
  return {globals,setup:functions.get('setup')!,loop:functions.get('loop')!,loopAt};
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
