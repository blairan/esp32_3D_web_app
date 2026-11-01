export interface SignalEvent {channel:number;timeMs:number;kind:'digital'|'pwm';value:number;frequency?:number}
export interface SignalHistory {events:SignalEvent[];dropped:number;baseline?:SignalEvent[]}
export const signalLimit=512;
export function emptySignals():SignalHistory{return {events:[],dropped:0};}
/** Record transitions at VM statement time, independently of Worker/UI sampling. */
export class SignalRecorder {
 private ring:SignalEvent[]=[];private head=0;private dropped=0;
 private last=new Map<number,SignalEvent>();private baseline=new Map<number,SignalEvent>();
 record(event:SignalEvent){
  const previous=this.last.get(event.channel);
  if(previous&&previous.kind===event.kind&&previous.value===event.value&&previous.frequency===event.frequency)return;
  event={...event};this.last.set(event.channel,event);
  if(this.ring.length<signalLimit)this.ring.push(event);
  else {const removed=this.ring[this.head];this.baseline.set(removed.channel,removed);this.ring[this.head]=event;this.head=(this.head+1)%signalLimit;this.dropped++;}
 }
 snapshot():SignalHistory{return {events:[...this.ring.slice(this.head),...this.ring.slice(0,this.head)].map(e=>({...e})),dropped:this.dropped,baseline:[...this.baseline.values()].map(e=>({...e}))};}
}
export interface SignalSegment {from:number;to:number;value:number}
/** No state is invented before the earliest retained transition for this channel. */
export function signalSegments(history:SignalHistory,channel:number,start:number,end:number,kind:SignalEvent['kind']):SignalSegment[]{
 const result:SignalSegment[]=[];let current:SignalEvent|undefined;
 for(const event of [...(history.baseline??[]),...history.events]){
  if(event.channel!==channel)continue;
  if(event.timeMs>end)break;
  if(current?.kind===kind&&event.timeMs>=start)result.push({from:Math.max(start,current.timeMs),to:event.timeMs,value:current.value});
  current=event;
 }
 if(current?.kind===kind)result.push({from:Math.max(start,current.timeMs),to:end,value:current.value});
 return result.filter(s=>s.to>=s.from);
}
export function digitalSegments(history:SignalHistory,channel:number,start:number,end:number){return signalSegments(history,channel,start,end,'digital');}
export function dutySegments(history:SignalHistory,channel:number,start:number,end:number,maximum:number){
 return signalSegments(history,channel,start,end,'pwm').map(s=>({...s,value:s.value/maximum*100}));
}
export function pwmTiming(ratio:number,frequency:number){
 if(!Number.isFinite(ratio)||ratio<0||ratio>1||!Number.isFinite(frequency)||frequency<=0)throw new Error('Invalid PWM reference');
 const period=1000/frequency;return {period,high:period*ratio,low:period*(1-ratio)};
}
export function pwmPath(ratio:number,cycles=3,width=600,high=20,low=82):string {
 if(ratio===0)return `M0 ${low}H${width}`;
 if(ratio===1)return `M0 ${high}H${width}`;
 const period=width/cycles;let path=`M0 ${high}`;
 for(let i=0;i<cycles;i++){const x=i*period;path+=`H${x+period*ratio}V${low}H${x+period}`;if(i<cycles-1)path+=`V${high}`;}
 return path;
}
