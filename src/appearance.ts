export interface Appearance {accent:string;flow:boolean}
export const defaultAppearance:Appearance={accent:'#3563e9',flow:true};
export const appearanceKey='esp32lab-appearance-v1';
export const themePresets=[{name:'深藍',color:'#3563e9'},{name:'紫羅蘭',color:'#7954d6'},{name:'暖橙',color:'#d96c24'},{name:'石墨',color:'#526075'}];
export function validColor(value:unknown):value is string{return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);}
export function readAppearance(raw:string|null):Appearance {
 try{const value=JSON.parse(raw??'null');return {accent:validColor(value?.accent)?value.accent.toLowerCase():defaultAppearance.accent,flow:typeof value?.flow==='boolean'?value.flow:true};}catch{return {...defaultAppearance};}
}
function rgb(hex:string){return [1,3,5].map(index=>parseInt(hex.slice(index,index+2),16));}
function hex(values:number[]){return '#'+values.map(value=>Math.round(value).toString(16).padStart(2,'0')).join('');}
export function mixColor(color:string,target:string,amount:number){const from=rgb(color),to=rgb(target);return hex(from.map((value,index)=>value*(1-amount)+to[index]*amount));}
export function contrast(a:string,b:string){
 const luminance=(color:string)=>rgb(color).map(value=>{const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
 const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);
}
export function accentTokens(value:string):Record<string,string>{
 const accent=validColor(value)?value:defaultAppearance.accent;
 const soft=mixColor(accent,'#ffffff',.92),border=mixColor(accent,'#ffffff',.73);
 let ink=accent;for(let i=0;i<20&&Math.min(contrast(ink,'#ffffff'),contrast(ink,soft))<4.5;i++)ink=mixColor(ink,'#17243b',.18);
 return {'--accent':accent,'--accent-ink':ink,'--accent-on':contrast(accent,'#ffffff')>=contrast(accent,'#000000')?'#ffffff':'#000000','--accent-soft':soft,'--accent-border':border,'--accent-glow':mixColor(accent,'#ffffff',.5)};
}
