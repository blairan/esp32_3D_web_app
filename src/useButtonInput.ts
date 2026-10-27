import {useCallback,useEffect,useRef,useState} from 'react';
export default function useButtonInput(){
 const sources=useRef(new Set<string>());const [momentary,setMomentary]=useState(false),[held,setHeld]=useState(false);
 const setSource=useCallback((source:string,down:boolean)=>{if(down)sources.current.add(source);else sources.current.delete(source);setMomentary(sources.current.size>0);},[]);
 const release=useCallback(()=>{sources.current.clear();setMomentary(false);setHeld(false);},[]);
 useEffect(()=>{const hidden=()=>{if(document.hidden)release();};window.addEventListener('blur',release);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',hidden);};},[release]);
 return {pressed:momentary||held,held,setHeld,setSource,release};
}
