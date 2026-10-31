export type LearningStep = 'intro' | 'wiring' | 'code' | 'results';
export interface LearningLocation {exploring:boolean;step:LearningStep}
export const learningSteps:ReadonlyArray<{id:LearningStep;title:string}> = [
  {id:'intro',title:'認識專題'}, {id:'wiring',title:'接線'},
  {id:'code',title:'寫程式'}, {id:'results',title:'觀察結果'},
];
export function readLearningLocation(hash:string,defaultExplore=false):LearningLocation {
  if(hash==='#explore')return {exploring:true,step:'intro'};
  if(hash==='#led'||hash==='#wiring')return {exploring:false,step:'wiring'};
  const step=learningSteps.find(s=>'#'+s.id===hash)?.id;
  return {exploring:!step&&defaultExplore,step:step??'intro'};
}
export function learningHash(step:LearningStep|'explore'){return '#'+step;}
