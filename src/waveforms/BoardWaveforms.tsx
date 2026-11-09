import {isAdvanced} from '../pico/advancedLessons';
import type {BoardId} from '../boards/types';
import {lessonPins} from '../boards/lessonProfiles';
import {hasPWM,type LessonId} from '../lessons';
import type {ProgramState} from '../program/runtime';
import type {PythonState} from '../pico/protocol';
import {hasPicoPWM,type PicoLessonId} from '../pico/types';
import SignalWaveforms from './SignalWaveforms';
export function ArduinoWaveforms({boardId,lessonId,state,manual}:{boardId:BoardId;lessonId:LessonId;state:ProgramState;manual:boolean}){
 if(['servo-angle','buzzer-doorbell','oled-i2c','seven-counter'].includes(lessonId))return null;
 const profile=lessonPins(boardId,lessonId),pwm=hasPWM(lessonId),pins=['ultrasonic-alert','environment-lab'].includes(lessonId)?[profile.primary]:profile.outputs;
 const channels=pins.map(pin=>({id:pin,label:(boardId==='uno-r3'?'D':'GPIO')+pin,pwm,maximum:255,duty:state.outputs[pin]?.duty}));
 return <SignalWaveforms key={lessonId} channels={channels} history={state.waveform} timeMs={state.timeMs} line={state.line} manual={manual} status={state.status}/>;
}
export function PicoWaveforms({lessonId,state,manual}:{lessonId:PicoLessonId;state:PythonState;manual:boolean}){
 if(isAdvanced(lessonId)){if(['servo-angle','buzzer-doorbell','oled-i2c','seven-counter'].includes(lessonId))return null;const pins=lessonId==='traffic-light'||lessonId==='rgb-mixing'?[15,13,12]:lessonId==='dual-led'?[15,13]:[15];return <SignalWaveforms key={lessonId} channels={pins.map(id=>({id,label:'GP'+id,pwm:lessonId==='rgb-mixing',maximum:65535,duty:state.advanced?.outputs[id]?.value,frequency:state.advanced?.outputs[id]?.frequency,frequencyFromProgram:true}))} history={state.waveform} timeMs={state.timeMs} line={state.line} manual={manual} status={state.status}/>;}
 const pwm=hasPicoPWM(lessonId),channel=lessonId==='blink'?-1:15;
 return <SignalWaveforms key={lessonId} channels={[{id:channel,label:channel===-1?'板載 LED（WL_GPIO0）':'GP15（實體20）',pwm,maximum:65535,duty:state.frequency===null?undefined:state.duty,frequency:state.frequency,frequencyFromProgram:true}]} history={state.waveform} timeMs={state.timeMs} line={state.line} manual={manual} status={state.status}/>;
}
