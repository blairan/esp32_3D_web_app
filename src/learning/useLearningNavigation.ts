import {useEffect,useState} from 'react';
import {learningHash,readLearningLocation,type LearningStep} from './navigation';
export default function useLearningNavigation(defaultExplore=false){
  const [location,setLocation]=useState(()=>readLearningLocation(window.location.hash,defaultExplore));
  useEffect(()=>{const read=()=>{if(!window.location.hash||/^#(intro|wiring|led|code|results|explore)$/.test(window.location.hash))setLocation(readLearningLocation(window.location.hash,defaultExplore));};window.addEventListener('hashchange',read);window.addEventListener('popstate',read);return()=>{window.removeEventListener('hashchange',read);window.removeEventListener('popstate',read);};},[defaultExplore]);
  const navigate=(step:LearningStep|'explore')=>{setLocation(readLearningLocation(learningHash(step)));const url=new URL(window.location.href);url.hash=learningHash(step);history.replaceState(null,'',url);};
  return {...location,navigate};
}
