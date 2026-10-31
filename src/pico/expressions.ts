import {PythonError} from './pythonError.ts';
export type PythonExpression={kind:'integer';value:number}|{kind:'variable';name:string}|{kind:'adc'}|{kind:'binary';operator:'+'|'-';left:PythonExpression;right:PythonExpression};
export function parseExpression(source:string,variables:Set<string>,adcName:string|undefined,line:number,column:number):PythonExpression {
 const tokens:string[]=[];let offset=0;const pattern=/\s*(\d+|[A-Za-z_]\w*|[().+\-])/y;
 while(offset<source.trimEnd().length){pattern.lastIndex=offset;const match=pattern.exec(source);if(!match)throw new PythonError('算式僅支援整數、已宣告變數、加減與本課read_u16()。',line,column+offset);tokens.push(match[1]);offset=pattern.lastIndex;}
 let i=0,terms=0;
 const error=(message:string):never=>{throw new PythonError(message,line,column);};
 const atom=():PythonExpression=>{
  if(++terms>32)error('每個算式最多32項。');
  let negative=false;if(tokens[i]==='-'){negative=true;i++;}const t=tokens[i++];if(!t)error('算式不完整。');
  let e:PythonExpression;
  if(/^\d+$/.test(t)){const value=Number(t)*(negative?-1:1);if(!Number.isSafeInteger(value)||value < -2147483648||value>2147483647)error('教學整數需在32位元有號範圍內。');return {kind:'integer',value};}
  if(t===adcName&&tokens[i]==='.'){
   const rest=tokens.slice(i,i+4).join('');if(rest!=='.read_u16()')error('ADC只支援read_u16()。');i+=4;e={kind:'adc'};
  }else {if(!variables.has(t))error(`變數「${t}」尚未宣告，或不是本課支援的算式。`);e={kind:'variable',name:t};}
  return negative?{kind:'binary',operator:'-',left:{kind:'integer',value:0},right:e}:e;
 };
 let result=atom();while(i<tokens.length){const op=tokens[i++];if(op!=='+'&&op!=='-')error('算式僅支援加減，不支援任意函式呼叫。');result={kind:'binary',operator:op as '+'|'-',left:result,right:atom()};}return result;
}
