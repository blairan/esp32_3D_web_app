export interface SineParameters {frequency:number;amplitude:number;windowMs:number}
/** Independent, dimensionless teaching signal. Never sent to the lesson VM. */
export function sineReference({frequency,amplitude,windowMs}:SineParameters){
 if(!Number.isFinite(frequency)||frequency<.5||frequency>10||!Number.isFinite(amplitude)||amplitude<0||amplitude>2||![200,500,1000,2000].includes(windowMs))throw new Error('Invalid sine reference parameters');
 const count=Math.max(120,Math.ceil(frequency*windowMs/1000*48));
 const points=Array.from({length:count+1},(_,i)=>{const timeMs=windowMs*i/count;return {timeMs,value:amplitude*Math.sin(2*Math.PI*frequency*timeMs/1000)};});
 return {points,periodMs:1000/frequency,peakToPeak:amplitude*2,cycles:frequency*windowMs/1000};
}
